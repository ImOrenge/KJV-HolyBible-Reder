import { readFile } from "node:fs/promises";
import process from "node:process";

const colorMap = {
  accent: "accent",
  background: "bg",
  border: "line",
  danger: "danger",
  muted: "muted",
  surface: "surface",
  surfaceStrong: "surface-2",
  text: "text",
  warning: "accent-3",
};

function parseCssVariables(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) {
    throw new Error(`Cannot find CSS selector: ${selector}`);
  }

  return Object.fromEntries(
    [...match[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map(([, key, value]) => [
      key,
      value.toLowerCase(),
    ]),
  );
}

function parseMobileColors(source, objectName) {
  const match = source.match(new RegExp(`const\\s+${objectName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) {
    throw new Error(`Cannot find mobile color object: ${objectName}`);
  }

  return Object.fromEntries(
    [...match[1].matchAll(/([a-zA-Z][a-zA-Z0-9]*):\s*"(#[0-9a-f]{3,8})"/gi)].map(([, key, value]) => [
      key,
      value.toLowerCase(),
    ]),
  );
}

function compareTheme({ css, mobile, themeName }) {
  const mismatches = [];

  for (const [mobileKey, cssKey] of Object.entries(colorMap)) {
    if (mobile[mobileKey] !== css[cssKey]) {
      mismatches.push({
        cssKey,
        cssValue: css[cssKey] ?? null,
        mobileKey,
        mobileValue: mobile[mobileKey] ?? null,
        theme: themeName,
      });
    }
  }

  return mismatches;
}

async function main() {
  const [cssSource, mobileSource] = await Promise.all([
    readFile("apps/web/src/app/globals.css", "utf8"),
    readFile("apps/mobile/App.tsx", "utf8"),
  ]);

  const rootCss = parseCssVariables(cssSource, ":root");
  const darkCss = parseCssVariables(cssSource, ".theme-dark");
  const lightMobile = parseMobileColors(mobileSource, "lightColors");
  const darkMobile = parseMobileColors(mobileSource, "darkColors");
  const mismatches = [
    ...compareTheme({ css: rootCss, mobile: lightMobile, themeName: "light" }),
    ...compareTheme({ css: darkCss, mobile: darkMobile, themeName: "dark" }),
  ];

  if (mismatches.length) {
    console.error(JSON.stringify({ mismatches, passed: false }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ checked: Object.keys(colorMap), passed: true }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
