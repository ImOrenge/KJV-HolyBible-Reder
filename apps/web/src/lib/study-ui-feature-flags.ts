import { resolveStudyUiFeatureFlags } from "@kjv/shared/study-ui";

export const studyUiFeatureFlags = resolveStudyUiFeatureFlags({
  uiShellV2: process.env.NEXT_PUBLIC_UI_SHELL_V2,
  readerV2: process.env.NEXT_PUBLIC_READER_V2,
  notesV2: process.env.NEXT_PUBLIC_NOTES_V2,
});
