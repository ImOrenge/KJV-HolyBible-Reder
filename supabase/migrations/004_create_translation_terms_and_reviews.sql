create table if not exists public.translation_terms (
  id uuid primary key default gen_random_uuid(),
  kjv_term text not null,
  ko_term text not null,
  category text,
  description text,
  rule_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(kjv_term, ko_term)
);

drop trigger if exists set_translation_terms_updated_at on public.translation_terms;
create trigger set_translation_terms_updated_at
before update on public.translation_terms
for each row
execute function public.set_updated_at();

create table if not exists public.translation_reviews (
  id uuid primary key default gen_random_uuid(),
  ko_verse_id uuid not null references public.bible_verses_ko(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  previous_text text,
  revised_text text not null,
  review_status text not null
    check (review_status in ('commented', 'revised', 'approved', 'rejected')),
  comment text,
  created_at timestamptz not null default now()
);

comment on table public.translation_terms is
  'KJV-to-Korean glossary for consistent project-owned translation.';

comment on table public.translation_reviews is
  'Translation review and revision history for Korean verse rows.';
