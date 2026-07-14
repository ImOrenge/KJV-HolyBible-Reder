import { resolveStudyUiFeatureFlags } from "@kjv/shared/study-ui";

export const studyUiFeatureFlags = resolveStudyUiFeatureFlags({
  uiShellV2: process.env.NEXT_PUBLIC_UI_SHELL_V2 ?? "true",
  readerV2: process.env.NEXT_PUBLIC_READER_V2 ?? "true",
  notesV2: process.env.NEXT_PUBLIC_NOTES_V2 ?? "true",
});
