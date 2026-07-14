import assert from "node:assert/strict";
import {
  createReaderSpeechQueue,
  findReaderVerseAtLine,
  getReaderSpeechIndex,
  resolveReaderTargetVerse,
  selectReaderVerseRange,
  shouldAutoScrollReader,
} from "../packages/shared/src/reader-orchestration";
import type { ReadingProgress, Verse } from "../packages/shared/src/types";

const verses: Verse[] = [1, 2, 3].map((verse) => ({
  id: `gen-1-${verse}`,
  bookId: "gen",
  chapter: 1,
  verse,
  text: `Verse ${verse}`,
  textKo: verse === 2 ? "둘째 절" : null,
  translation: "KJV",
}));

const progress: ReadingProgress = {
  userId: "reader-test",
  bookId: "gen",
  chapter: 1,
  verse: 2,
  scrollPosition: 0,
  lastReadAt: "2026-07-14T00:00:00.000Z",
};

assert.equal(resolveReaderTargetVerse(verses, "gen-1-3", progress, "gen", 1)?.verse, 3);
assert.equal(resolveReaderTargetVerse(verses, null, progress, "gen", 1)?.verse, 2);
assert.equal(resolveReaderTargetVerse(verses, null, progress, "exo", 1)?.verse, 1);
assert.deepEqual(selectReaderVerseRange(verses, "gen-1-3", "gen-1-1"), ["gen-1-1", "gen-1-2", "gen-1-3"]);

const layouts = new Map([
  ["gen-1-1", { y: 0, height: 80 }],
  ["gen-1-2", { y: 80, height: 120 }],
  ["gen-1-3", { y: 200, height: 90 }],
]);
assert.equal(findReaderVerseAtLine(verses, layouts, 145)?.id, "gen-1-2");
assert.equal(findReaderVerseAtLine(verses, layouts, 400)?.id, "gen-1-3");

assert.equal(shouldAutoScrollReader(true, false), true);
assert.equal(shouldAutoScrollReader(true, true), false);
assert.equal(shouldAutoScrollReader(false, false), false);

const speechQueue = createReaderSpeechQueue(verses, (verse) => `창 1:${verse.verse}`, (verse) => verse.textKo ?? "");
assert.deepEqual(speechQueue, [{ id: "gen-1-2", label: "창 1:2", text: "둘째 절" }]);
assert.equal(getReaderSpeechIndex(3, 1, 1), 2);
assert.equal(getReaderSpeechIndex(3, 2, 1), 2);
assert.equal(getReaderSpeechIndex(0, 0, 1), -1);

console.log("Reader orchestration validation passed.");
