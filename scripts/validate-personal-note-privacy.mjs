import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePaths = [
  "apps/mobile/App.tsx",
  "apps/web/src/app/api/me/notes/route.ts",
  "apps/web/src/app/api/me/notes/[noteId]/route.ts",
  "apps/web/src/lib/personal-note-server.ts",
  "packages/shared/src/personal-note-client.ts",
];
const sources = await Promise.all(sourcePaths.map(async (path) => [path, await readFile(path, "utf8")]));

for (const [path, source] of sources) {
  assert.doesNotMatch(source, /console\.(?:debug|info|log|warn|error)\s*\(/, `${path} must not log personal-note data`);
}

const mobileSource = sources.find(([path]) => path === "apps/mobile/App.tsx")[1];
const statusCalls = [...mobileSource.matchAll(/set(?:CopyStatus|PersonalNoteDraftMessage|PersonalNoteRemoteMessage)\(([^\n]*)/g)];
for (const match of statusCalls) {
  assert.doesNotMatch(match[1], /bodyMarkdown|bodyText|personalNoteDocument|personalNoteTitle/, "note content must not be used as a UI status message");
}

const clientSource = sources.find(([path]) => path === "packages/shared/src/personal-note-client.ts")[1];
assert.match(clientSource, /body:\s*input \? JSON\.stringify\(toPayload\(input\)\)/);
assert.doesNotMatch(clientSource, /resolveApiUrl\([^\n]*(?:bodyMarkdown|bodyText|bodyDocument|title)/);
assert.doesNotMatch(clientSource, /encodeURIComponent\(input\.note\.(?:bodyMarkdown|bodyText|title)/);

console.log("Personal note privacy validation passed.");
