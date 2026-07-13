import { parseVerseReferenceQuery, formatShortBibleReference, createVerseKey } from "@kjv/shared";
import { NextResponse } from "next/server";

import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type VerseRow = { verse: number; verse_key: string; text_en: string };
type KoRow = { verse_key: string; text_ko: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? "").trim().slice(0, 50);
  const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit")) || 8));
  const query = rawQuery.startsWith("#") ? rawQuery.slice(1) : rawQuery;
  const parsed = parseVerseReferenceQuery(query);

  if (!parsed.book || !parsed.chapter) {
    return NextResponse.json({
      query: rawQuery,
      kind: "book",
      suggestions: parsed.bookCandidates.slice(0, limit).map((book) => ({
        kind: "book",
        bookId: book.appBookId,
        displayReference: book.shortNameKo,
        displayText: `${book.nameKo} · ${book.nameEn} · ${book.chapterCount}장`,
      })),
    });
  }

  if (parsed.chapter < 1 || parsed.chapter > parsed.book.chapterCount) {
    return NextResponse.json({ query: rawQuery, kind: "verse", suggestions: [] });
  }

  const verseFilter = parsed.verse ? `&verse=eq.${parsed.verse}` : "";
  try {
    const rows = await supabaseRestGet<VerseRow[]>([
      "bible_verses_en?select=verse,verse_key,text_en",
      `app_book_id=eq.${encodeFilterValue(parsed.book.appBookId)}`,
      `chapter=eq.${parsed.chapter}`,
      verseFilter.replace(/^&/, ""),
      "order=verse.asc",
      `limit=${limit}`,
    ].filter(Boolean).join("&"));
    const keys = rows.map((row) => row.verse_key);
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
      suggestions: rows.map((row) => ({
        kind: "verse",
        bookId: parsed.book!.appBookId,
        chapter: parsed.chapter,
        verse: row.verse,
        verseKey: row.verse_key || createVerseKey(parsed.book!, parsed.chapter!, row.verse),
        displayReference: formatShortBibleReference(parsed.book!, parsed.chapter!, row.verse),
        displayText: (koByKey.get(row.verse_key) ?? row.text_en).slice(0, 140),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "구절 후보를 불러오지 못했습니다." }, { status: 500 });
  }
}
