import assert from "node:assert/strict";

import {
  parseStudyContextQuery,
  parseStudyContextPanel,
  resolveStudyUiFeatureFlags,
  serializeStudyContextQuery,
  STUDY_UI_COLOR_TOKENS,
  STUDY_UI_LAYOUT_TOKENS,
  validateStudyContext,
  type StudyContext,
} from "../packages/shared/src/study-ui";

const validContext: StudyContext = {
  source: "reader",
  bookId: "gen",
  chapter: 1,
  verseKeys: ["GEN.1.10", "GEN.1.11", "GEN.1.10"],
  primaryVerseKey: "GEN.1.10",
  selectedText: "하나님이 뭍을 땅이라 부르셨고",
  dictionaryEntryId: "lex-bara",
  returnTarget: { route: "/app/read/gen/1", scrollAnchor: "verse-GEN.1.10" },
};

const validated = validateStudyContext(validContext);
assert.equal(validated.valid, true);
assert.deepEqual(validated.valid ? validated.context.verseKeys : [], ["GEN.1.10", "GEN.1.11"]);

const query = serializeStudyContextQuery(validated.valid ? validated.context : validContext, {
  panel: "dictionary",
  word: "lex-bara",
});
assert.equal(query.get("verse"), "GEN.1.10");
assert.equal(query.get("verses"), "GEN.1.10,GEN.1.11");
assert.equal(query.get("panel"), "dictionary");
assert.equal(query.get("word"), "lex-bara");
assert.equal(query.has("selectedText"), false);

const parsed = parseStudyContextQuery({
  source: "search",
  bookId: "gen",
  chapter: 1,
  params: query,
  returnTarget: { route: "/app/search", scrollAnchor: "result-GEN.1.10" },
});
assert.equal(parsed.valid, true);
assert.equal(parsed.valid ? parsed.context.primaryVerseKey : undefined, "GEN.1.10");
assert.equal(parsed.valid ? parsed.context.dictionaryEntryId : undefined, "lex-bara");
assert.equal(parseStudyContextPanel(query), "dictionary");

assert.equal(validateStudyContext({ ...validContext, bookId: "unknown" }).valid, false);
assert.equal(validateStudyContext({ ...validContext, chapter: 51 }).valid, false);
assert.equal(validateStudyContext({ ...validContext, verseKeys: ["EXO.1.1"] }).valid, false);
assert.equal(validateStudyContext({ ...validContext, returnTarget: { route: "https://example.com" } }).valid, false);

assert.deepEqual(
  resolveStudyUiFeatureFlags({ uiShellV2: "true", readerV2: "0", notesV2: 1 }),
  { uiShellV2: true, readerV2: false, notesV2: true },
);
assert.equal(STUDY_UI_LAYOUT_TOKENS.minTouchTarget, 44);
assert.equal(STUDY_UI_LAYOUT_TOKENS.scriptureMaxWidth, 760);
assert.notEqual(STUDY_UI_COLOR_TOKENS.light.actionPrimary, STUDY_UI_COLOR_TOKENS.light.actionStudy);

console.log("study UI contract validation passed: context, query privacy, flags, semantic tokens");
