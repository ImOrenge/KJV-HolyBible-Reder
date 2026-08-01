import { jsonWithCors, optionsWithCors, publicContentCacheHeaders } from "@/lib/api/cors";
import { getPublicBibleChapter } from "@/lib/public-bible-server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    bookId: string;
    chapter: string;
  }>;
};

export function OPTIONS() {
  return optionsWithCors();
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { bookId, chapter: chapterParam } = await context.params;
    const chapter = Number(chapterParam);

    if (!bookId || !Number.isInteger(chapter) || chapter < 1) {
      return jsonWithCors({ error: "Invalid book or chapter." }, { status: 400 });
    }

    const response = await getPublicBibleChapter(bookId, chapter);
    if (!response) {
      return jsonWithCors({ error: "Bible chapter not found." }, { status: 404 });
    }

    return jsonWithCors(response, { headers: publicContentCacheHeaders });
  } catch (error) {
    return jsonWithCors(
      { error: error instanceof Error ? error.message : "Failed to load Bible chapter." },
      { status: 500 },
    );
  }
}
