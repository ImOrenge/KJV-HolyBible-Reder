import { parseVerseReferenceQuery, formatShortBibleReference, createVerseKey } from "@kjv/shared";
import { NextResponse } from "next/server";

import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type VerseRow = { chapter: number; verse: number; verse_key: string; text_en: string };
type KoRow = { verse_key: string; text_ko: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? "").trim().slice(0, 50);
  const chapterTableMode = url.searchParams.get("mode") === "chapter-table";
  const limit = Math.min(chapterTableMode ? 200 : 12, Math.max(1, Number(url.searchParams.get("limit")) || (chapterTableMode ? 200 : 8)));
  const offset = chapterTableMode ? Math.max(0, Number(url.searchParams.get("offset")) || 0) : 0;
  const query = rawQuery.startsWith("#") ? rawQuery.slice(1) : rawQuery;
  const parsed = parseVerseReferenceQuery(query);

  if (!parsed.book || (!parsed.chapter && !chapterTableMode)) {
    return NextResponse.json({
      query: rawQuery,
      kind: "book",
      suggestions: parsed.bookCandidates.slice(0, limit).map((book) => ({
        kind: "book",
        bookId: book.appBookId,
        displayReference: book.shortNameKo,
        displayText: `${book.nameKo} · ${book.nameEn} · ${book.chapterCount}장`,
        queryValue: book.nameKo,
      })),
    });
  }

  const bookScope = chapterTableMode && !parsed.chapter;
  const chapter = parsed.chapter ?? 1;
  if (!bookScope && (chapter < 1 || chapter > parsed.book.chapterCount)) {
    return NextResponse.json({ query: rawQuery, kind: "verse", suggestions: [] });
  }

  const verseFilter = parsed.verse && !chapterTableMode ? `&verse=eq.${parsed.verse}` : "";
  try {
    const rows = await supabaseRestGet<VerseRow[]>([
      "bible_verses_en?select=chapter,verse,verse_key,text_en",
      `app_book_id=eq.${encodeFilterValue(parsed.book.appBookId)}`,
      bookScope ? "" : `chapter=eq.${chapter}`,
      verseFilter.replace(/^&/, ""),
      bookScope ? "order=chapter.asc,verse.asc" : "order=verse.asc",
      `limit=${bookScope ? limit + 1 : limit}`,
      bookScope ? `offset=${offset}` : "",
    ].filter(Boolean).join("&"));
    const hasMore = bookScope && rows.length > limit;
    const visibleRows = hasMore ? rows.slice(0, limit) : rows;
    const orderedRows = chapterTableMode && parsed.verse
      ? [...visibleRows].sort((left, right) => left.verse === parsed.verse ? -1 : right.verse === parsed.verse ? 1 : left.verse - right.verse)
      : visibleRows;
    const keys = orderedRows.map((row) => row.verse_key);
    const koRows = keys.length ? await supabaseRestGet<KoRow[]>([
      "bible_verses_ko?select=verse_key,text_ko",
      `verse_key=in.(${keys.map(encodeFilterValue).join(",")})`,
      "translation_status=eq.approved",
      "is_public=eq.true",
    ].join("&")) : [];
    const koByKey = new Map(koRows.map((row) => [row.verse_key, row.text_ko]));
    return NextResponse.json({
      query: rawQuery,
      kind: "verse",
      context: {
        chapter: bookScope ? null : chapter,
        chapterCount: parsed.book.chapterCount,
        displayName: parsed.book.nameKo,
        scope: bookScope ? "book" : "chapter",
      },
      nextOffset: hasMore ? offset + limit : null,
      suggestions: orderedRows.map((row) => ({
        kind: "verse",
        bookId: parsed.book!.appBookId,
        chapter: row.chapter,
        verse: row.verse,
        verseKey: row.verse_key || createVerseKey(parsed.book!, row.chapter, row.verse),
        displayReference: formatShortBibleReference(parsed.book!, row.chapter, row.verse),
        displayText: (koByKey.get(row.verse_key) ?? row.text_en).slice(0, 140),
        isInputMatch: chapterTableMode && parsed.verse === row.verse,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "구절 후보를 불러오지 못했습니다." }, { status: 500 });
  }
}
