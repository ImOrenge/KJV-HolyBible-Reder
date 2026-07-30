import type { SupabaseClient } from "@supabase/supabase-js";

const COMMUNITY_MEDIA_BUCKET = "community-post-media";

export async function deleteCommunityUserData(client: SupabaseClient, userId: string) {
  const [{ data: posts, error: postLookupError }, { data: comments, error: commentLookupError }, { data: media, error: mediaError }] = await Promise.all([
    client.from("community_posts").select("id").eq("author_id", userId),
    client.from("community_comments").select("id").eq("author_id", userId),
    client.from("community_post_media").select("storage_path").eq("author_id", userId),
  ]);
  if (postLookupError || commentLookupError || mediaError) {
    throw new Error(`커뮤니티 삭제 대상 조회 실패: ${postLookupError?.message ?? commentLookupError?.message ?? mediaError?.message}`);
  }

  const paths = (media ?? []).map((row) => row.storage_path).filter(Boolean);
  const postIds = (posts ?? []).map((row) => row.id);
  const commentIds = (comments ?? []).map((row) => row.id);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage.from(COMMUNITY_MEDIA_BUCKET).remove(paths.slice(index, index + 100));
    if (error) throw new Error(`커뮤니티 이미지 삭제 실패: ${error.message}`);
  }

  if (commentIds.length) {
    const { error: mentionError } = await client.from("community_comment_mentions").delete().in("comment_id", commentIds);
    if (mentionError) throw new Error(`커뮤니티 댓글 멘션 삭제 실패: ${mentionError.message}`);
    const { error: commentError } = await client.from("community_comments").update({
      body: "삭제된 댓글입니다.",
      deleted_at: new Date().toISOString(),
      idempotency_key: null,
      status: "deleted",
    }).in("id", commentIds);
    if (commentError) throw new Error(`커뮤니티 댓글 삭제 실패: ${commentError.message}`);
    const { error: revisionError } = await client.from("community_comment_revisions").delete().in("comment_id", commentIds);
    if (revisionError) throw new Error(`커뮤니티 댓글 수정 이력 삭제 실패: ${revisionError.message}`);
  }

  if (postIds.length) {
    const { data: tagLinks, error: tagLookupError } = await client.from("community_post_hashtags").select("hashtag_id").in("post_id", postIds);
    if (tagLookupError) throw new Error(`커뮤니티 해시태그 조회 실패: ${tagLookupError.message}`);
    const cleanupResults = await Promise.all([
      client.from("community_post_media").delete().in("post_id", postIds),
      client.from("community_post_verses").delete().in("post_id", postIds),
      client.from("community_post_hashtags").delete().in("post_id", postIds),
      client.from("community_post_mentions").delete().in("post_id", postIds),
    ]);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) throw new Error(`커뮤니티 게시물 연결 데이터 삭제 실패: ${cleanupError.message}`);

    const { error: postError } = await client.from("community_posts").update({
      body: "삭제된 QT 나눔입니다.",
      deleted_at: new Date().toISOString(),
      idempotency_key: null,
      status: "deleted",
      title: null,
    }).in("id", postIds);
    if (postError) throw new Error(`커뮤니티 게시물 삭제 실패: ${postError.message}`);
    const { error: revisionError } = await client.from("community_post_revisions").delete().in("post_id", postIds);
    if (revisionError) throw new Error(`커뮤니티 게시물 수정 이력 삭제 실패: ${revisionError.message}`);

    for (const hashtagId of [...new Set((tagLinks ?? []).map((row) => row.hashtag_id))]) {
      const { count } = await client.from("community_post_hashtags").select("post_id", { count: "exact", head: true }).eq("hashtag_id", hashtagId);
      await client.from("community_hashtags").update({ post_count: count ?? 0 }).eq("id", hashtagId);
    }
  }
}
