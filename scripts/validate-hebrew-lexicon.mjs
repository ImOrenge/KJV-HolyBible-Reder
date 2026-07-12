import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const lexiconDir = join(root, "data", "lexicon", "hebrew");
const strongPattern = /^H\d+$/;
const verseKeyPattern = /^[1-3]?[A-Z]{2,3}\.\d+\.\d+$/;
const appBookIds = new Set(["gen", "exo", "lev", "num", "deu", "jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "ezr", "neh", "est", "job", "psa", "pro", "ecc", "sng", "isa", "jer", "lam", "ezk", "dan", "hos", "jol", "amo", "oba", "jon", "mic", "nam", "hab", "zep", "hag", "zec", "mal"]);

function readJsonl(fileName) {
  const filePath = join(lexiconDir, fileName);
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line)
    .map(({ line, lineNumber }) => {
      try {
        return { lineNumber, value: JSON.parse(line) };
      } catch (error) {
        throw new Error(`${fileName}:${lineNumber} invalid JSON: ${error.message}`);
      }
    });
}

function requireText(record, field, label) {
  if (typeof record[field] !== "string" || !record[field].trim()) {
    throw new Error(`${label} missing required text field: ${field}`);
  }
}

const entries = readJsonl("entries.jsonl");
const occurrences = readJsonl("occurrences.jsonl");
const themeEntries = readJsonl("theme-entries.jsonl");
const keys = new Set();

for (const { lineNumber, value } of entries) {
  const label = `entries.jsonl:${lineNumber}`;
  for (const field of [
    "normalizedKey",
    "strongNumber",
    "lemmaHe",
    "lemmaHeNormalized",
    "transliteration",
    "pronunciationSymbol",
    "pronunciationKo",
    "glossEn",
    "glossKo",
    "definitionEn",
    "definitionKo",
    "sourceName",
    "sourceLicense",
  ]) {
    requireText(value, field, label);
  }
  if (keys.has(value.normalizedKey)) {
    throw new Error(`${label} duplicate normalizedKey: ${value.normalizedKey}`);
  }
  keys.add(value.normalizedKey);
  if (!strongPattern.test(value.strongNumber)) {
    throw new Error(`${label} invalid strongNumber: ${value.strongNumber}`);
  }
  if (!Array.isArray(value.themeIds) || !value.themeIds.length) {
    throw new Error(`${label} themeIds must be a non-empty array`);
  }
  if (value.status === "published" && (!value.sourceName || !value.sourceLicense)) {
    throw new Error(`${label} published entry requires sourceName/sourceLicense`);
  }
}

for (const { lineNumber, value } of occurrences) {
  const label = `occurrences.jsonl:${lineNumber}`;
  for (const field of ["normalizedKey", "verseKey", "appBookId", "surfaceHe", "transliteration"]) {
    requireText(value, field, label);
  }
  if (!keys.has(value.normalizedKey)) {
    throw new Error(`${label} unknown normalizedKey: ${value.normalizedKey}`);
  }
  if (!verseKeyPattern.test(value.verseKey)) {
    throw new Error(`${label} invalid verseKey: ${value.verseKey}`);
  }
  if (!appBookIds.has(value.appBookId)) {
    throw new Error(`${label} appBookId must be an OT app book id: ${value.appBookId}`);
  }
  if (!Number.isInteger(value.bookOrder) || value.bookOrder < 1 || value.bookOrder > 39) {
    throw new Error(`${label} bookOrder must be 1-39`);
  }
  if (!Number.isInteger(value.chapter) || value.chapter < 1 || !Number.isInteger(value.verse) || value.verse < 1) {
    throw new Error(`${label} chapter/verse must be positive integers`);
  }
}

for (const { lineNumber, value } of themeEntries) {
  const label = `theme-entries.jsonl:${lineNumber}`;
  for (const field of ["themeId", "normalizedKey", "reasonKo"]) {
    requireText(value, field, label);
  }
  if (!keys.has(value.normalizedKey)) {
    throw new Error(`${label} unknown normalizedKey: ${value.normalizedKey}`);
  }
}

console.log(`Hebrew lexicon validation passed: ${entries.length} entries, ${occurrences.length} occurrences, ${themeEntries.length} theme links.`);
