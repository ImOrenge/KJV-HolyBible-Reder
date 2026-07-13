drop policy if exists "Members can submit own reading completion evidence"
on public.reading_completion_evidence;

create policy "Members can submit valid own reading evidence"
on public.reading_completion_evidence for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.bible_books book
    where book.id = reading_completion_evidence.book_id
      and reading_completion_evidence.chapter <= book.chapter_count
  )
);
