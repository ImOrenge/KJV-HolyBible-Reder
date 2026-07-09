import { getBooks, getChapters, getBook } from "./bible-repository";
import type { ReadingPlan, ReadingPlanTemplate } from "./types";

export type PlanChapter = {
  bookId: string;
  chapter: number;
};

export type ReadingPlanOption = {
  template: ReadingPlanTemplate;
  name: string;
  description: string;
  scope: ReadingPlan["scope"];
  totalDays: number;
};

export const readingPlanOptions: ReadingPlanOption[] = [
  {
    template: "one-year",
    name: "1년 통독",
    description: "하루 3-4장",
    scope: "whole-bible",
    totalDays: 365,
  },
  {
    template: "six-month",
    name: "6개월 통독",
    description: "하루 6-7장",
    scope: "whole-bible",
    totalDays: 180,
  },
  {
    template: "ninety-day",
    name: "90일 통독",
    description: "하루 13-14장",
    scope: "whole-bible",
    totalDays: 90,
  },
  {
    template: "new-testament-thirty-day",
    name: "신약 30일",
    description: "하루 8-9장",
    scope: "new-testament",
    totalDays: 30,
  },
];

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysBetween(startDate: string, endDate: string) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((parseLocalDateKey(endDate).getTime() - parseLocalDateKey(startDate).getTime()) / dayMs);
}

export function percent(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

export function getPlanOption(template: ReadingPlanTemplate) {
  return readingPlanOptions.find((option) => option.template === template) ?? readingPlanOptions[0];
}

export function createReadingPlan(userId: string, template: ReadingPlanTemplate, date = new Date()): ReadingPlan {
  const option = getPlanOption(template);
  const now = date.toISOString();

  return {
    id: `plan-${template}-${date.getTime()}`,
    userId,
    template,
    name: option.name,
    scope: option.scope,
    startDate: getLocalDateKey(date),
    totalDays: option.totalDays,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildPlanChapters(scope: ReadingPlan["scope"]): PlanChapter[] {
  const planBooks = scope === "new-testament" ? getBooks("new") : getBooks();
  return planBooks.flatMap((book) =>
    getChapters(book.id).map((chapter) => ({
      bookId: book.id,
      chapter,
    })),
  );
}

export function getReadingPlanDay(plan: ReadingPlan, date = new Date()) {
  const chapters = buildPlanChapters(plan.scope);
  const elapsedDays = daysBetween(plan.startDate, getLocalDateKey(date));
  const dayNumber = Math.min(Math.max(elapsedDays + 1, 1), plan.totalDays);
  const startIndex = Math.floor(((dayNumber - 1) * chapters.length) / plan.totalDays);
  const endIndex = Math.min(chapters.length, Math.max(startIndex + 1, Math.floor((dayNumber * chapters.length) / plan.totalDays)));

  return {
    dayNumber,
    totalDays: plan.totalDays,
    chapters: chapters.slice(startIndex, endIndex),
  };
}

export function formatPlanChapters(chapters: PlanChapter[]) {
  const groups: Array<{ bookId: string; start: number; end: number }> = [];

  for (const chapter of chapters) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === chapter.bookId && last.end + 1 === chapter.chapter) {
      last.end = chapter.chapter;
    } else {
      groups.push({ bookId: chapter.bookId, start: chapter.chapter, end: chapter.chapter });
    }
  }

  return groups
    .map((group) => {
      const book = getBook(group.bookId);
      const chapterLabel = group.start === group.end ? `${group.start}장` : `${group.start}-${group.end}장`;
      return `${book?.nameKo ?? "성경"} ${chapterLabel}`;
    })
    .join(", ");
}
