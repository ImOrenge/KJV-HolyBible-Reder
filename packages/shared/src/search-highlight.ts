const searchHighlightSeparatorPattern = /[\s.,;:!?'"“”‘’()[\]{}<>·ㆍ,，。;；:：!?！?—–-]+/u;
const searchHighlightSplitPattern = /[\s.,;:!?'"“”‘’()[\]{}<>·ㆍ,，。;；:：!?！?—–-]+/u;

export type TextRange = {
  start: number;
  end: number;
};

export function isSearchHighlightSeparator(value: string) {
  return searchHighlightSeparatorPattern.test(value);
}

export function compactSearchHighlightTerm(value: string) {
  return Array.from(value.normalize("NFKC"))
    .filter((char) => !isSearchHighlightSeparator(char))
    .join("");
}

export function getSearchHighlightTerms(query: string) {
  const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/g, " ");
  const compactQuery = compactSearchHighlightTerm(normalizedQuery);

  if (compactQuery.length < 2) {
    return [];
  }

  const terms = [normalizedQuery, compactQuery, ...normalizedQuery.split(searchHighlightSplitPattern)];
  const seen = new Set<string>();

  return terms
    .map((term) => term.trim())
    .filter((term) => compactSearchHighlightTerm(term).length >= 2)
    .filter((term) => {
      const key = compactSearchHighlightTerm(term).toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => compactSearchHighlightTerm(b).length - compactSearchHighlightTerm(a).length);
}

export function collectSearchHighlightRanges(text: string, query: string): TextRange[] {
  const terms = getSearchHighlightTerms(query);
  const ranges: TextRange[] = [];
  const lowerText = text.normalize("NFKC").toLocaleLowerCase();

  for (const term of terms) {
    const lowerTerm = term.normalize("NFKC").toLocaleLowerCase();
    let start = lowerText.indexOf(lowerTerm);

    while (start !== -1) {
      ranges.push({ start, end: start + lowerTerm.length });
      start = lowerText.indexOf(lowerTerm, start + lowerTerm.length);
    }
  }

  const compactChars: Array<{ value: string; start: number; end: number }> = [];
  let offset = 0;

  for (const char of Array.from(text)) {
    const start = offset;
    const end = start + char.length;
    offset = end;

    if (!isSearchHighlightSeparator(char)) {
      compactChars.push({ value: char.normalize("NFKC").toLocaleLowerCase(), start, end });
    }
  }

  const compactText = compactChars.map((char) => char.value).join("");

  for (const term of terms) {
    const compactTerm = compactSearchHighlightTerm(term).toLocaleLowerCase();
    const compactLength = Array.from(compactTerm).length;
    let compactStart = compactText.indexOf(compactTerm);

    while (compactStart !== -1) {
      const compactEnd = compactStart + compactLength - 1;
      const firstChar = compactChars[compactStart];
      const lastChar = compactChars[compactEnd];

      if (firstChar && lastChar) {
        ranges.push({ start: firstChar.start, end: lastChar.end });
      }

      compactStart = compactText.indexOf(compactTerm, compactStart + compactLength);
    }
  }

  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<TextRange[]>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (!previous || range.start >= previous.end) {
        merged.push(range);
      }
      return merged;
    }, []);
}
