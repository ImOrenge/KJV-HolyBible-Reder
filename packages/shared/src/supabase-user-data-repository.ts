import type {
  CompletedChapter,
  FavoriteList,
  FavoriteVerse,
  Highlight,
  ReadingPlan,
  ReadingProgress,
  StudyNote,
  Tag,
  UserDataState,
} from "./types";
import { createInitialUserData, defaultFavoriteListId, defaultSettings, normalizeUserData } from "./user-data-repository";

type RpcError = {
  message?: string;
};

type RpcResponse<T> = {
  data: T | null;
  error: RpcError | null;
};

export type UserDataRpcClient = {
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): PromiseLike<RpcResponse<T>>;
};

function asUserDataSnapshot(value: unknown): Partial<UserDataState> {
  return value && typeof value === "object" ? (value as Partial<UserDataState>) : {};
}

function toErrorMessage(error: RpcError | null, fallback: string) {
  return error?.message || fallback;
}

function timeValue(value: string | undefined) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function newerBy<T>(left: T | undefined, right: T, getDate: (item: T) => string | undefined) {
  if (!left) {
    return right;
  }

  return timeValue(getDate(right)) >= timeValue(getDate(left)) ? right : left;
}

function withUser<T extends { userId: string }>(item: T, userId: string): T {
  return {
    ...item,
    userId,
  };
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function mergeCompletedChapters(remote: CompletedChapter[], local: CompletedChapter[], userId: string) {
  const merged = new Map<string, CompletedChapter>();
  for (const item of [...remote, ...local]) {
    const key = `${item.bookId}:${item.chapter}`;
    merged.set(key, newerBy(merged.get(key), withUser(item, userId), (chapter) => chapter.completedAt));
  }

  return [...merged.values()].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

function mergeRecentReads(remote: ReadingProgress[], local: ReadingProgress[], userId: string) {
  const merged = new Map<string, ReadingProgress>();
  for (const item of [...remote, ...local]) {
    const key = `${item.bookId}:${item.chapter}`;
    merged.set(key, newerBy(merged.get(key), withUser(item, userId), (read) => read.lastReadAt));
  }

  return [...merged.values()].sort((left, right) => right.lastReadAt.localeCompare(left.lastReadAt)).slice(0, 10);
}

function mergeHighlights(remote: Highlight[], local: Highlight[], userId: string) {
  const merged = new Map<string, Highlight>();
  for (const item of [...remote, ...local]) {
    merged.set(item.verseId, newerBy(merged.get(item.verseId), withUser(item, userId), (highlight) => highlight.updatedAt));
  }

  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function mergeTags(remote: Tag[], local: Tag[], userId: string) {
  const merged: Tag[] = [];
  const idMap = new Map<string, string>();
  const byName = new Map<string, Tag>();

  for (const tag of remote) {
    const next = withUser(tag, userId);
    merged.push(next);
    byName.set(normalizeName(next.name), next);
    idMap.set(tag.id, next.id);
  }

  for (const tag of local) {
    const existing = byName.get(normalizeName(tag.name));
    if (existing) {
      idMap.set(tag.id, existing.id);
      continue;
    }

    const next = withUser(tag, userId);
    merged.push(next);
    byName.set(normalizeName(next.name), next);
    idMap.set(tag.id, next.id);
  }

  return { tags: merged, tagIdMap: idMap };
}

function mergeFavoriteLists(remote: FavoriteList[], local: FavoriteList[], userId: string) {
  const merged: FavoriteList[] = [];
  const idMap = new Map<string, string>();
  const byName = new Map<string, FavoriteList>();
  const byId = new Map<string, FavoriteList>();

  for (const list of remote) {
    const next = withUser(list, userId);
    merged.push(next);
    byId.set(next.id, next);
    byName.set(normalizeName(next.name), next);
    idMap.set(list.id, next.id);
  }

  for (const list of local) {
    const existing = byId.get(list.id) ?? byName.get(normalizeName(list.name));
    if (existing) {
      idMap.set(list.id, existing.id);
      continue;
    }

    const next = withUser(list, userId);
    merged.push(next);
    byId.set(next.id, next);
    byName.set(normalizeName(next.name), next);
    idMap.set(list.id, next.id);
  }

  if (!merged.length) {
    const initial = createInitialUserData(userId).favoriteLists[0];
    merged.push(initial);
    idMap.set(defaultFavoriteListId, initial.id);
  }

  return { favoriteLists: merged, listIdMap: idMap };
}

function mapRelationIds(ids: string[], idMap: Map<string, string>) {
  return uniqueValues(ids.map((id) => idMap.get(id) ?? id));
}

function mergeFavoriteVerses(
  remote: FavoriteVerse[],
  local: FavoriteVerse[],
  userId: string,
  tagIdMap: Map<string, string>,
  listIdMap: Map<string, string>,
) {
  const merged = new Map<string, FavoriteVerse>();

  for (const item of [...remote, ...local]) {
    const mapped = withUser(
      {
        ...item,
        listIds: mapRelationIds(item.listIds, listIdMap),
        tagIds: mapRelationIds(item.tagIds, tagIdMap),
      },
      userId,
    );
    const existing = merged.get(mapped.verseId);
    const selected = newerBy(existing, mapped, (favorite) => favorite.updatedAt);
    merged.set(mapped.verseId, {
      ...selected,
      listIds: uniqueValues([...(existing?.listIds ?? []), ...mapped.listIds, ...selected.listIds]),
      tagIds: uniqueValues([...(existing?.tagIds ?? []), ...mapped.tagIds, ...selected.tagIds]),
      usageCount: Math.max(existing?.usageCount ?? 0, mapped.usageCount, selected.usageCount),
    });
  }

  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function studyNoteKey(note: StudyNote) {
  return note.id || [note.scope, note.bookId, note.chapter, note.verse ?? "", note.verseId ?? ""].join(":");
}

function mergeStudyNotes(remote: StudyNote[], local: StudyNote[], userId: string) {
  const merged = new Map<string, StudyNote>();
  for (const item of [...remote, ...local]) {
    const key = studyNoteKey(item);
    merged.set(key, newerBy(merged.get(key), withUser(item, userId), (note) => note.updatedAt));
  }

  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function pickLatestProgress(remote: ReadingProgress | null, local: ReadingProgress | null, userId: string) {
  const selected = newerBy(remote ? withUser(remote, userId) : undefined, local ? withUser(local, userId) : null, (progress) =>
    progress?.lastReadAt,
  );
  return selected ?? null;
}

function pickReadingPlan(remote: ReadingPlan | null, local: ReadingPlan | null, userId: string) {
  if (!remote && !local) {
    return null;
  }

  if (!remote) {
    return local ? withUser(local, userId) : null;
  }

  if (!local) {
    return withUser(remote, userId);
  }

  return withUser(timeValue(local.updatedAt) >= timeValue(remote.updatedAt) ? local : remote, userId);
}

export async function loadRemoteUserData(client: UserDataRpcClient, userId: string) {
  const { data, error } = await client.rpc<unknown>("get_user_data_snapshot");
  if (error) {
    throw new Error(toErrorMessage(error, "서버 데이터를 불러오지 못했습니다."));
  }

  return normalizeUserData(asUserDataSnapshot(data), userId);
}

export async function saveRemoteUserData(client: UserDataRpcClient, userId: string, data: UserDataState) {
  const snapshot = normalizeUserData(data, userId);
  const { data: savedData, error } = await client.rpc<unknown>("replace_user_data_snapshot", { snapshot });
  if (error) {
    throw new Error(toErrorMessage(error, "서버 데이터를 저장하지 못했습니다."));
  }

  return normalizeUserData(asUserDataSnapshot(savedData ?? snapshot), userId);
}

export function hasImportableUserData(data: UserDataState) {
  const initial = createInitialUserData(data.progress?.userId ?? "guest-reader");
  return Boolean(
    data.progress ||
      data.activeReadingPlan ||
      data.recentReads.length ||
      data.completedChapters.length ||
      data.highlights.length ||
      data.studyNotes.length ||
      data.favoriteVerses.length ||
      data.tags.length ||
      data.favoriteLists.some((list) => list.id !== defaultFavoriteListId || list.name !== "기본 목록") ||
      JSON.stringify(data.settings) !== JSON.stringify(initial.settings) ||
      JSON.stringify(data.settings) !== JSON.stringify(defaultSettings),
  );
}

export function mergeUserDataForImport(remoteData: UserDataState, localData: UserDataState, userId: string): UserDataState {
  const remote = normalizeUserData(remoteData, userId);
  const local = normalizeUserData(localData, userId);
  const { tags, tagIdMap } = mergeTags(remote.tags, local.tags, userId);
  const { favoriteLists, listIdMap } = mergeFavoriteLists(remote.favoriteLists, local.favoriteLists, userId);

  return normalizeUserData(
    {
      activeReadingPlan: pickReadingPlan(remote.activeReadingPlan, local.activeReadingPlan, userId),
      completedChapters: mergeCompletedChapters(remote.completedChapters, local.completedChapters, userId),
      favoriteLists,
      favoriteVerses: mergeFavoriteVerses(remote.favoriteVerses, local.favoriteVerses, userId, tagIdMap, listIdMap),
      highlights: mergeHighlights(remote.highlights, local.highlights, userId),
      progress: pickLatestProgress(remote.progress, local.progress, userId),
      recentReads: mergeRecentReads(remote.recentReads, local.recentReads, userId),
      settings: local.settings,
      studyNotes: mergeStudyNotes(remote.studyNotes, local.studyNotes, userId),
      tags,
    },
    userId,
  );
}
