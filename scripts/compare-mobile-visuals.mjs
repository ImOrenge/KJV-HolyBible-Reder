import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import sharp from "sharp";

const defaults = {
  height: 844,
  mobileBottomCrop: 0,
  mobileTopCrop: 0,
  threshold: 0.28,
  webBottomCrop: 0,
  webTopCrop: 0,
  width: 390,
};

function parseArgs(argv) {
  const options = { ...defaults };
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, rawValue = "true"] = arg.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const numericKeys = new Set([
      "height",
      "mobileBottomCrop",
      "mobileTopCrop",
      "threshold",
      "webBottomCrop",
      "webTopCrop",
      "width",
    ]);
    options[key] = numericKeys.has(key) ? Number(rawValue) : rawValue;
  }
  return options;
}

function requirePath(options, key) {
  const value = options[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)} option.`);
  }
  return resolve(value);
}

async function normalizeImage(filePath, { bottomCrop, height, topCrop, width }) {
  const input = sharp(filePath);
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read image dimensions: ${filePath}`);
  }

  const top = Math.round(metadata.height * topCrop);
  const bottom = Math.round(metadata.height * bottomCrop);
  const cropHeight = Math.max(1, metadata.height - top - bottom);

  return input
    .extract({ height: cropHeight, left: 0, top, width: metadata.width })
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
}

function comparePixels(left, right) {
  if (left.length !== right.length) {
    throw new Error("Normalized image buffers have different sizes.");
  }

  const diff = Buffer.alloc(left.length);
  let total = 0;
  let max = 0;
  let changed = 0;

  for (let index = 0; index < left.length; index += 3) {
    const red = Math.abs(left[index] - right[index]);
    const green = Math.abs(left[index + 1] - right[index + 1]);
    const blue = Math.abs(left[index + 2] - right[index + 2]);
    const pixelDiff = (red + green + blue) / (255 * 3);
    const value = Math.round(pixelDiff * 255);
    diff[index] = value;
    diff[index + 1] = value;
    diff[index + 2] = value;
    total += pixelDiff;
    max = Math.max(max, pixelDiff);
    if (pixelDiff > 0.08) {
      changed += 1;
    }
  }

  const pixels = left.length / 3;
  return {
    changedRatio: changed / pixels,
    diff,
    maxDiff: max,
    meanDiff: total / pixels,
    pixels,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const webPath = requirePath(options, "web");
  const mobilePath = requirePath(options, "mobile");
  const outPath = options.out ? resolve(String(options.out)) : null;
  const jsonPath = options.json ? resolve(String(options.json)) : null;

  const [web, mobile] = await Promise.all([
    normalizeImage(webPath, {
      bottomCrop: options.webBottomCrop,
      height: options.height,
      topCrop: options.webTopCrop,
      width: options.width,
    }),
    normalizeImage(mobilePath, {
      bottomCrop: options.mobileBottomCrop,
      height: options.height,
      topCrop: options.mobileTopCrop,
      width: options.width,
    }),
  ]);

  const result = comparePixels(web, mobile);
  const triptychPath =
    outPath && outPath.endsWith("-diff.png")
      ? outPath.replace(/-diff\.png$/, "-triptych.png")
      : null;
  const report = {
    changedRatio: Number(result.changedRatio.toFixed(4)),
    maxDiff: Number(result.maxDiff.toFixed(4)),
    meanDiff: Number(result.meanDiff.toFixed(4)),
    mobile: mobilePath,
    passed: result.meanDiff <= options.threshold,
    threshold: options.threshold,
    triptych: triptychPath,
    web: webPath,
  };

  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    const diffPng = await sharp(result.diff, { raw: { channels: 3, height: options.height, width: options.width } }).png().toBuffer();
    await writeFile(outPath, diffPng);
    if (triptychPath) {
      await sharp({
        create: {
          background: "#ffffff",
          channels: 3,
          height: options.height,
          width: options.width * 3,
        },
      })
        .composite([
          { input: webPath, left: 0, top: 0 },
          { input: mobilePath, left: options.width, top: 0 },
          { input: diffPng, left: options.width * 2, top: 0 },
        ])
        .png()
        .toFile(triptychPath);
    }
  }

  if (jsonPath) {
    await mkdir(dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
