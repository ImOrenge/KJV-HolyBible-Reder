revoke execute on function public.search_bible_verses_ko(text, text, text, text, int, int, text) from public;

grant execute on function public.search_bible_verses_ko(text, text, text, text, int, int, text)
  to anon, authenticated, service_role;
