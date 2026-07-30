begin;
set local role postgres;

create temporary table smoke_community_users on commit drop as
select id, row_number() over (order by created_at, id) as position
from auth.users
order by created_at, id
limit 3;

do $$
begin
  if (select count(*) from smoke_community_users) < 3 then
    raise exception 'Three existing auth users are required for the community v2 SQL smoke test.';
  end if;
  if not has_column_privilege('anon', 'public.community_posts', 'search_text_normalized', 'select')
     or not has_column_privilege('anon', 'public.user_public_profiles', 'search_text_normalized', 'select') then
    raise exception 'Anonymous community search column grants are missing.';
  end if;
  if has_column_privilege('anon', 'public.user_public_profiles', 'honorific', 'select')
     or has_column_privilege('anon', 'public.user_public_profiles', 'show_honorific', 'select') then
    raise exception 'Anonymous profile access exposes private honorific controls.';
  end if;
  if not has_column_privilege('authenticated', 'public.user_public_profiles', 'public_enabled', 'insert')
     or not has_column_privilege('authenticated', 'public.user_public_profiles', 'handle', 'update')
     or not has_column_privilege('authenticated', 'public.user_public_profiles', 'bio', 'update')
     or not has_column_privilege('authenticated', 'public.user_public_profiles', 'public_enabled', 'update')
     or not has_column_privilege('authenticated', 'public.user_public_profiles', 'show_honorific', 'update') then
    raise exception 'Authenticated Community V2 profile mutation grants are missing.';
  end if;
  if has_column_privilege('authenticated', 'public.user_public_profiles', 'status', 'update')
     or has_column_privilege('authenticated', 'public.user_public_profiles', 'follower_count', 'update')
     or has_column_privilege('authenticated', 'public.user_public_profiles', 'post_count', 'update') then
    raise exception 'Authenticated profile mutation grants expose server-managed columns.';
  end if;
  if not has_table_privilege('authenticated', 'public.discussion_threads', 'select')
     or not has_table_privilege('authenticated', 'public.discussion_comments', 'select')
     or not has_table_privilege('authenticated', 'public.discussion_reactions', 'select')
     or not has_table_privilege('authenticated', 'public.discussion_reports', 'select')
     or not has_table_privilege('authenticated', 'public.reading_completion_evidence', 'select')
     or not has_table_privilege('authenticated', 'public.community_point_ledger', 'select')
     or not has_table_privilege('authenticated', 'public.community_point_balances', 'select')
     or not has_table_privilege('authenticated', 'public.community_level_definitions', 'select') then
    raise exception 'Legacy community graceful-read grants are missing.';
  end if;
  if has_table_privilege('authenticated', 'public.discussion_threads', 'insert')
     or has_table_privilege('authenticated', 'public.discussion_comments', 'insert')
     or has_table_privilege('authenticated', 'public.discussion_reactions', 'insert')
     or has_table_privilege('authenticated', 'public.discussion_reports', 'insert')
     or has_table_privilege('authenticated', 'public.reading_completion_evidence', 'insert')
     or has_table_privilege('authenticated', 'public.community_point_ledger', 'insert')
     or has_table_privilege('authenticated', 'public.community_point_balances', 'update')
     or has_table_privilege('authenticated', 'public.community_level_definitions', 'update') then
    raise exception 'Legacy community mutation privileges are still exposed.';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in (
        'discussion_threads', 'discussion_comments', 'discussion_reactions',
        'discussion_reports', 'reading_completion_evidence',
        'community_point_ledger', 'community_point_balances',
        'community_level_definitions'
      )
  ) then
    raise exception 'Legacy community RLS policies still expose archived rows.';
  end if;
end;
$$;

create temporary table smoke_community_context (
  user_a uuid not null,
  user_b uuid not null,
  user_m uuid not null,
  post_id uuid not null,
  quote_id uuid not null,
  comment_id uuid not null,
  reply_id uuid not null,
  report_id uuid not null
) on commit drop;

do $$
declare
  user_a uuid := (select id from smoke_community_users where position = 1);
  user_b uuid := (select id from smoke_community_users where position = 2);
  user_m uuid := (select id from smoke_community_users where position = 3);
  suffix text := substring(md5(random()::text), 1, 10);
  v_post_id uuid := gen_random_uuid();
  v_quote_id uuid := gen_random_uuid();
  v_comment_id uuid := gen_random_uuid();
  v_reply_id uuid := gen_random_uuid();
  v_report_id uuid := gen_random_uuid();
  tag_id uuid := gen_random_uuid();
  visible_count integer;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform public.complete_user_onboarding('sql-a-' || suffix, 'SQL 사용자 A', '목사님', null);
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform public.complete_user_onboarding('sql-b-' || suffix, 'SQL 사용자 B', '성도님', null);
  perform set_config('request.jwt.claim.sub', user_m::text, true);
  perform public.complete_user_onboarding('sql-m-' || suffix, 'SQL 운영자', '장로님', null);

  update public.user_public_profiles
  set handle = 'sqla_' || suffix, public_enabled = true, show_honorific = true, status = 'active'
  where user_id = user_a;
  update public.user_public_profiles
  set handle = 'sqlb_' || suffix, public_enabled = true, status = 'active'
  where user_id = user_b;
  update public.user_public_profiles
  set handle = 'sqlm_' || suffix, public_enabled = true, status = 'active'
  where user_id = user_m;

  if not exists (
    select 1 from public.user_public_profiles
    where user_id = user_a and display_name = 'sql-a-' || suffix and honorific = '목사님'
  ) then
    raise exception 'Onboarding identity did not synchronize to the community profile.';
  end if;

  insert into public.community_posts(id, author_id, idempotency_key, title, body, primary_verse_key)
  values (v_post_id, user_a, 'sql-post-' || suffix, 'SQL QT 나눔', '말씀을 삶에서 실천하는 공개 QT 나눔입니다.', 'JHN.3.16');
  insert into public.community_post_verses(post_id, verse_key, position, is_primary, kjv_text_snapshot, ko_text_snapshot)
  values
    (v_post_id, 'JHN.3.16', 0, true, 'For God so loved the world.', '하나님이 세상을 이처럼 사랑하사'),
    (v_post_id, 'GEN.1.1', 1, false, 'In the beginning God created.', '태초에 하나님이 창조하시니라');
  insert into public.community_hashtags(id, tag, normalized_tag, post_count)
  values (tag_id, 'sqltag_' || suffix, 'sqltag_' || suffix, 1);
  insert into public.community_post_hashtags(post_id, hashtag_id, position)
  values (v_post_id, tag_id, 0);
  insert into public.community_post_mentions(post_id, mentioned_user_id) values (v_post_id, user_b);

  insert into public.community_follows(follower_id, followed_id) values (user_b, user_a);
  insert into public.community_mutes(user_id, muted_user_id) values (user_b, user_a);
  insert into public.community_likes(user_id, target_type, post_id) values (user_b, 'post', v_post_id);
  insert into public.community_reposts(user_id, post_id) values (user_b, v_post_id);
  insert into public.community_comments(id, post_id, author_id, body)
  values (v_comment_id, v_post_id, user_b, '말씀의 사랑을 오늘 실천하겠습니다.');
  insert into public.community_comments(id, post_id, author_id, parent_comment_id, body)
  values (v_reply_id, v_post_id, user_a, v_comment_id, '함께 실천하며 기도하겠습니다.');
  insert into public.community_likes(user_id, target_type, comment_id) values (user_a, 'comment', v_comment_id);
  insert into public.community_comment_mentions(comment_id, mentioned_user_id) values (v_reply_id, user_b);

  insert into public.community_posts(id, author_id, body, post_kind, quoted_post_id, primary_verse_key)
  values (v_quote_id, user_b, '원문 출처를 유지한 인용 QT 나눔입니다.', 'quote', v_post_id, 'JHN.3.16');
  insert into public.community_post_verses(post_id, verse_key, position, is_primary, kjv_text_snapshot)
  values (v_quote_id, 'JHN.3.16', 0, true, 'For God so loved the world.');

  insert into public.community_reports(id, reporter_id, target_type, post_id, reason, details)
  values (v_report_id, user_b, 'post', v_post_id, 'other', 'SQL 운영 검증');
  insert into public.community_moderation_events(
    moderator_id, target_type, post_id, report_id, action, reason_code, note
  ) values (user_m, 'post', v_post_id, v_report_id, 'hide', 'sql_smoke', 'SQL 감사 로그');
  insert into public.community_user_restrictions(user_id, restriction_type, reason_code, ends_at, created_by)
  values (user_b, 'restricted', 'sql_smoke', now() + interval '1 hour', user_m);

  update public.community_posts set body = body || ' 수정' where id = v_post_id;
  update public.community_comments set body = body || ' 수정' where id = v_comment_id;

  if (select like_count from public.community_posts where id = v_post_id) <> 1
     or (select repost_count from public.community_posts where id = v_post_id) <> 1
     or (select quote_count from public.community_posts where id = v_post_id) <> 1
     or (select comment_count from public.community_posts where id = v_post_id) <> 2 then
    raise exception 'Community post counters did not reconcile.';
  end if;
  if (select follower_count from public.user_public_profiles where user_id = user_a) < 1
     or (select following_count from public.user_public_profiles where user_id = user_b) < 1 then
    raise exception 'Community follow counters did not reconcile.';
  end if;
  if not exists (select 1 from public.community_post_revisions revision where revision.post_id = v_post_id)
     or not exists (select 1 from public.community_comment_revisions revision where revision.comment_id = v_comment_id) then
    raise exception 'Community edit revisions were not preserved.';
  end if;
  select count(distinct event_type) into visible_count
  from public.community_notification_outbox
  where post_id in (v_post_id, v_quote_id) or comment_id in (v_comment_id, v_reply_id)
     or (recipient_id = user_a and actor_id = user_b)
     or (recipient_id = user_b and actor_id = user_a);
  if visible_count < 8 then
    raise exception 'Community notification outbox is incomplete: % event types.', visible_count;
  end if;

  insert into public.community_notifications(user_id, actor_id, event_type, post_id)
  values (user_a, user_m, 'moderation', v_post_id);

  insert into public.community_blocks(blocker_id, blocked_id) values (user_b, user_a);
  if exists (
    select 1 from public.community_follows
    where (follower_id = user_b and followed_id = user_a)
       or (follower_id = user_a and followed_id = user_b)
  ) or exists (
    select 1 from public.community_mutes where user_id = user_b and muted_user_id = user_a
  ) then
    raise exception 'Block did not remove follow and mute relations.';
  end if;

  insert into smoke_community_context values (user_a, user_b, user_m, v_post_id, v_quote_id, v_comment_id, v_reply_id, v_report_id);
end;
$$;

grant select on smoke_community_context to anon, authenticated;

set local role anon;
do $$
declare
  target_post uuid := (select post_id from smoke_community_context);
begin
  if (select count(*) from public.community_posts where id = target_post) <> 1 then
    raise exception 'Anonymous public post projection was not readable.';
  end if;
  begin
    execute format('select idempotency_key from public.community_posts where id = %L', target_post);
    raise exception 'Anonymous read exposed idempotency_key.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.community_reports limit 1;
    raise exception 'Anonymous read exposed reports.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', (select user_b::text from smoke_community_context), true);

do $$
declare
  target_post uuid := (select post_id from smoke_community_context);
  user_a uuid := (select user_a from smoke_community_context);
  changed_rows integer;
begin
  if (select count(*) from public.community_posts where id = target_post) <> 0 then
    raise exception 'Blocked author remained visible to the authenticated viewer.';
  end if;
  if (select count(*) from public.community_notifications where user_id = user_a) <> 0 then
    raise exception 'Cross-account notification read was not isolated.';
  end if;
  begin
    update public.community_posts set body = '다른 사용자의 변조 시도입니다.' where id = target_post;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 0 then
      raise exception 'Authenticated user unexpectedly updated another account post.';
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role postgres;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and (table_name like 'community_dm%' or table_name like 'community_group%')
  ) then
    raise exception 'Excluded DM or group tables were added.';
  end if;
  raise notice 'remote community v2 smoke passed: onboarding-match=true, posts=true, verses=2, comments-and-replies=true, likes=true, repost-and-quote=true, follow-mute-block=true, notifications=true, moderation=true, revisions=true, rls=true, dm-groups-absent=true';
end;
$$;

rollback;
