import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredInputs = [
  "data/crosswire/kjv/raw/KJV.zip",
  "data/crosswire/kjv/raw/kjv.conf",
  "data/crosswire/kjv/raw/kjv.osis.xml",
  "data/crosswire/kjv/source-metadata.json",
  "data/crosswire/kjv/book-map.json",
];

const missing = requiredInputs.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error("Missing required CrossWire KJV input files:");
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

const result = spawnSync(process.execPath, ["scripts/normalize-kjv.mjs"], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
