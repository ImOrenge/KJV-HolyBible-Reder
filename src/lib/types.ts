export type Testament = "old" | "new";

export type Book = {
  id: string;
  testament: Testament;
  order: number;
  nameKo: string;
  nameEn: string;
  chapterCount: number;
};

export type Verse = {
  id: string;
  verseKey?: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  textEn?: string;
  textKo?: string | null;
  translation: string;
  translationName?: string | null;
  translationStatus?: string | null;
  sourceName?: string;
  sourceModule?: string;
  sourceModuleVersion?: string | null;
};

export type ReadingProgress = {
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  scrollPosition: number;
  lastReadAt: string;
};

export type ReadingPlanTemplate = "one-year" | "six-month" | "ninety-day" | "new-testament-thirty-day";

export type ReadingPlan = {
  id: string;
  userId: string;
  template: ReadingPlanTemplate;
  name: string;
  scope: "whole-bible" | "new-testament";
  startDate: string;
  totalDays: number;
  createdAt: string;
  updatedAt: string;
};

export type CompletedChapter = {
  id: string;
  userId: string;
  bookId: string;
  chapter: number;
  completedAt: string;
};

export type HighlightColor = "yellow" | "blue" | "green" | "red" | "purple";

export type Highlight = {
  id: string;
  userId: string;
  verseId: string;
  bookId: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyNote = {
  id: string;
  userId: string;
  scope: "chapter" | "verse";
  bookId: string;
  chapter: number;
  verse?: number;
  verseId?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteVerse = {
  id: string;
  userId: string;
  verseId: string;
  bookId: string;
  chapter: number;
  verse: number;
  title: string;
  memo: string;
  usageCount: number;
  tagIds: string[];
  listIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FavoriteList = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type ThemeMode = "light" | "dark";
export type ReadingMode = "normal" | "verse-numbers" | "focus";
export type TranslationLanguage = "en" | "ko";

export type UserSettings = {
  fontSize: number;
  lineHeight: number;
  theme: ThemeMode;
  readingMode: ReadingMode;
  defaultTranslation: TranslationLanguage;
  ttsVoice: string;
  ttsSpeed: number;
  ttsRepeat: boolean;
  ttsAutoScroll: boolean;
};

export type UserDataState = {
  progress: ReadingProgress | null;
  activeReadingPlan: ReadingPlan | null;
  recentReads: ReadingProgress[];
  completedChapters: CompletedChapter[];
  highlights: Highlight[];
  studyNotes: StudyNote[];
  favoriteVerses: FavoriteVerse[];
  favoriteLists: FavoriteList[];
  tags: Tag[];
  settings: UserSettings;
};

export type MockUser = {
  id: string;
  email: string;
  displayName: string;
};
