const punctuationPattern = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~“”‘’《》〈〉「」『』…·ㆍ—–―]+/gu;

export type BibleSearchLanguage = "ko" | "en" | "all";
export type BibleSearchSort = "canonical" | "relevance";

export function normalizeKoreanSearchText(value: string, options: { compact?: boolean } = {}) {
  const text = value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(punctuationPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return options.compact ? text.replace(/\s+/gu, "") : text;
}

export function normalizeBibleSearchQuery(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function normalizeBibleSearchLanguage(value: string | null): BibleSearchLanguage {
  return value === "en" || value === "all" ? value : "ko";
}

export function normalizeBibleSearchSort(value: string | null): BibleSearchSort {
  return value === "relevance" ? "relevance" : "canonical";
}

export function clampSearchLimit(value: string | null, fallback = 50) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

export function clampSearchOffset(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
}

export function normalizeTestamentFilter(value: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized === "OT" || normalized === "NT" ? normalized : null;
}

export function normalizeBookFilter(value: string | null) {
  const normalized = value?.trim().toLocaleLowerCase("en-US");
  return normalized && normalized !== "all" ? normalized : null;
}
