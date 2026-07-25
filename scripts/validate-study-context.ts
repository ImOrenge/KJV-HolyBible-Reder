import assert from "node:assert/strict";

import {
  parseStudyContextQuery,
  parseStudyContextPanel,
  parseStudyUiCommunityRoute,
  parseStudyUiDictionaryRoute,
  parseStudyUiRoute,
  parseStudyUiWebView,
  buildLegacyStudyAppUrl,
  buildStudyUiCommunityUrl,
  buildStudyUiDictionaryUrl,
  buildStudyUiPersonalNoteUrl,
  buildStudyUiTargetUrl,
  createStudyUiReaderRoute,
  createStudyUiNavigationEvent,
  getStudyUiReaderVerseNumber,
  getStudyUiAreaForView,
  resolveStudyUiFeatureFlags,
  serializeStudyContextQuery,
  STUDY_UI_COLOR_TOKENS,
  STUDY_UI_LAYOUT_TOKENS,
  validateStudyContext,
  type StudyContext,
} from "../packages/shared/src/study-ui";
import {
  canPopMobileStudyRoute,
  createMobileStudyNavigationState,
  createMobileStudyRoute,
  getActiveMobileStudyRoute,
  getMobileReaderLocation,
  popMobileStudyRoute,
  pushMobileStudyRoute,
  selectMobileStudyTab,
} from "../packages/shared/src/mobile-study-navigation";

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
assert.equal(parseStudyUiWebView("dictionary"), "dictionary");
assert.equal(parseStudyUiWebView("unknown"), "dashboard");
assert.equal(buildLegacyStudyAppUrl("dashboard"), "/app");
assert.equal(buildLegacyStudyAppUrl("notes"), "/app?view=notes");
assert.equal(buildStudyUiTargetUrl("notes"), "/app/study/notes");
assert.equal(buildStudyUiPersonalNoteUrl(), "/app/study/notes");
assert.equal(buildStudyUiPersonalNoteUrl({ noteId: "personal-note-123" }), "/app/study/notes/personal-note-123");
assert.throws(() => buildStudyUiPersonalNoteUrl({ noteId: "../private" }));
assert.equal(buildStudyUiTargetUrl("highlights"), "/app/library?section=highlights");
assert.equal(buildStudyUiCommunityUrl({ tab: "feed" }), "/app/community");
assert.equal(buildStudyUiCommunityUrl({ tab: "participating" }), "/app/community?tab=participating");
assert.equal(buildStudyUiCommunityUrl({ tab: "ranking" }), "/app/community?tab=ranking");
assert.equal(buildStudyUiCommunityUrl({ tab: "settings" }), "/app/community?tab=settings");
assert.deepEqual(parseStudyUiCommunityRoute(new URLSearchParams()), {});
assert.deepEqual(parseStudyUiCommunityRoute(new URLSearchParams("tab=feed")), {});
assert.deepEqual(parseStudyUiCommunityRoute(new URLSearchParams("tab=participating")), { tab: "participating" });
assert.deepEqual(parseStudyUiCommunityRoute(new URLSearchParams("tab=ranking")), { tab: "ranking" });
assert.deepEqual(parseStudyUiCommunityRoute(new URLSearchParams("tab=settings")), { tab: "settings" });
assert.equal(parseStudyUiCommunityRoute(new URLSearchParams("tab=private")), null);
const dictionaryUrl = buildStudyUiDictionaryUrl({
  query: "reshith",
  entryKey: "reshith",
  alphabet: "R",
  themeId: "genesis-primeval",
  bookId: "gen",
  sort: "canonical",
});
assert.equal(dictionaryUrl, "/app/study/dictionary?q=reshith&entry=reshith&alphabet=R&theme=genesis-primeval&book=gen&sort=canonical");
assert.deepEqual(parseStudyUiDictionaryRoute(new URLSearchParams(dictionaryUrl.split("?")[1])), {
  query: "reshith",
  entryKey: "reshith",
  alphabet: "R",
  themeId: "genesis-primeval",
  bookId: "gen",
  sort: "canonical",
});
const readerRoute = createStudyUiReaderRoute({ bookId: "gen", chapter: 1, verse: 10, panel: "note" });
assert.equal(readerRoute.primaryVerseKey, "GEN.1.10");
assert.equal(getStudyUiReaderVerseNumber(readerRoute), 10);
assert.equal(buildStudyUiTargetUrl("reader", readerRoute), "/app/read/gen/1?verse=GEN.1.10&panel=note");
assert.deepEqual(parseStudyUiRoute("/app/today"), { view: "dashboard" });
assert.deepEqual(parseStudyUiRoute("/app/community"), { view: "community" });
assert.deepEqual(parseStudyUiRoute("/app/community", new URLSearchParams("tab=ranking")), {
  view: "community",
  community: { tab: "ranking" },
});
assert.equal(parseStudyUiRoute("/app/community", new URLSearchParams("tab=private")), null);
assert.deepEqual(parseStudyUiRoute("/app/library", new URLSearchParams("section=highlights")), { view: "highlights" });
assert.deepEqual(parseStudyUiRoute("/app/study/dictionary"), { view: "dictionary" });
assert.deepEqual(parseStudyUiRoute("/app/study/notes"), { view: "notes" });
assert.deepEqual(parseStudyUiRoute("/app/study/notes/personal-note-123"), {
  view: "notes",
  personalNote: { noteId: "personal-note-123" },
});
assert.equal(parseStudyUiRoute("/app/study/notes/private%2Fnote"), null);
assert.deepEqual(parseStudyUiRoute("/app/study/dictionary", new URLSearchParams("entry=reshith&theme=genesis-primeval")), {
  view: "dictionary",
  dictionary: { entryKey: "reshith", themeId: "genesis-primeval" },
});
assert.equal(parseStudyUiRoute("/app/study/dictionary", new URLSearchParams("entry=%2Fprivate")), null);
assert.deepEqual(parseStudyUiRoute("/app/read/gen/1", new URLSearchParams("verse=GEN.1.10&panel=note")), {
  view: "reader",
  reader: { bookId: "gen", chapter: 1, primaryVerseKey: "GEN.1.10", panel: "note" },
});
assert.equal(parseStudyUiRoute("/app/read/gen/51"), null);
assert.equal(parseStudyUiRoute("/app/read/exo/1", new URLSearchParams("verse=GEN.1.10")), null);
assert.throws(() => createStudyUiReaderRoute({ bookId: "gen", chapter: 51 }));
assert.equal(getStudyUiAreaForView("highlights"), "library");
assert.equal(getStudyUiAreaForView("community"), "today");
assert.deepEqual(
  createStudyUiNavigationEvent({ source: "read", destination: "study", bookId: "gen", chapter: 1, verseCount: 2 }),
  { name: "study_navigation", source: "read", destination: "study", bookId: "gen", chapter: 1, verseCount: 2 },
);
assert.equal("selectedText" in createStudyUiNavigationEvent({ source: "read", destination: "study" }), false);

const mobileReaderRoute = createMobileStudyRoute({
  view: "reader",
  context: {
    source: "search",
    bookId: "gen",
    chapter: 1,
    verseKeys: ["GEN.1.10"],
    primaryVerseKey: "GEN.1.10",
    returnTarget: { route: "/search", scrollAnchor: "result-GEN.1.10" },
  },
});
assert.equal(mobileReaderRoute.path, "/read/gen/1?verse=GEN.1.10&source=search&return=%2Fsearch&anchor=result-GEN.1.10");
assert.equal(mobileReaderRoute.path.includes("selectedText"), false);
assert.deepEqual(getMobileReaderLocation(mobileReaderRoute), { bookId: "gen", chapter: 1, primaryVerseKey: "GEN.1.10" });

const mobileNoteRoute = createMobileStudyRoute({
  view: "notes",
  noteId: "note-1",
  context: {
    source: "reader",
    bookId: "gen",
    chapter: 1,
    verseKeys: ["GEN.1.10"],
    primaryVerseKey: "GEN.1.10",
    returnTarget: { route: mobileReaderRoute.path, scrollAnchor: "verse-GEN.1.10" },
  },
});
assert.equal(mobileNoteRoute.path.startsWith("/notes/note-1?"), true);
assert.equal(createMobileStudyRoute({ view: "community" }).path, "/community");

let communityNavigation = createMobileStudyNavigationState();
communityNavigation = pushMobileStudyRoute(communityNavigation, createMobileStudyRoute({ view: "community" }));
assert.equal(getActiveMobileStudyRoute(communityNavigation).view, "community");
assert.equal(canPopMobileStudyRoute(communityNavigation), true);
communityNavigation = popMobileStudyRoute(communityNavigation);
assert.equal(getActiveMobileStudyRoute(communityNavigation).view, "dashboard");

let mobileNavigation = createMobileStudyNavigationState();
mobileNavigation = pushMobileStudyRoute(mobileNavigation, mobileReaderRoute);
mobileNavigation = pushMobileStudyRoute(mobileNavigation, mobileNoteRoute);
assert.equal(getActiveMobileStudyRoute(mobileNavigation).view, "notes");
assert.equal(canPopMobileStudyRoute(mobileNavigation), true);
mobileNavigation = popMobileStudyRoute(mobileNavigation);
assert.equal(getActiveMobileStudyRoute(mobileNavigation).path, mobileReaderRoute.path);
mobileNavigation = selectMobileStudyTab(mobileNavigation, "library");
assert.equal(getActiveMobileStudyRoute(mobileNavigation).view, "favorites");
assert.equal(canPopMobileStudyRoute(mobileNavigation), false);

console.log("study UI contract validation passed: context, web/mobile routes, stack return, event privacy, flags, semantic tokens");
