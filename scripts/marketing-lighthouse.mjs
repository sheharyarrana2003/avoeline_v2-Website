#!/usr/bin/env node
/**
 * Local marketing Lighthouse gate (docs/19 §2 / W5).
 * Requires a running production server: `npm run build && npm run start`
 * then `npm run report:marketing`.
 *
 * Writes JSON + HTML under reports/marketing/. Exit 1 if any category < 95.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "reports", "marketing");

const BASE = (process.env.MARKETING_LH_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const PATHS = ["/", "/plans", "/about", "/partners", "/contact", "/privacy", "/terms"];
const THRESHOLD = Number(process.env.MARKETING_LH_THRESHOLD || 95);
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

function scoreOf(lhr, id) {
  const cat = lhr.categories?.[id];
  if (!cat || typeof cat.score !== "number") return null;
  return Math.round(cat.score * 100);
}

async function runOne(chrome, pathname) {
  const url = `${BASE}${pathname}`;
  const result = await lighthouse(url, {
    port: chrome.port,
    output: ["json", "html"],
    logLevel: "error",
    onlyCategories: CATEGORIES,
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      disabled: false,
    },
  });
  return { url, pathname, lhr: result.lhr, report: result.report };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const summary = [];
  let failed = false;

  try {
    for (const pathname of PATHS) {
      const slug = pathname === "/" ? "home" : pathname.slice(1).replace(/\//g, "-");
      process.stderr.write(`Lighthouse ${pathname} …\n`);
      const { url, lhr, report } = await runOne(chrome, pathname);
      const scores = Object.fromEntries(CATEGORIES.map((id) => [id, scoreOf(lhr, id)]));
      const jsonPath = path.join(outDir, `${slug}.json`);
      const htmlPath = path.join(outDir, `${slug}.html`);
      const reports = Array.isArray(report) ? report : [report];
      await writeFile(
        jsonPath,
        typeof reports[0] === "string" ? reports[0] : JSON.stringify(lhr, null, 2),
      );
      if (reports[1]) await writeFile(htmlPath, reports[1]);

      const row = { path: pathname, url, scores };
      summary.push(row);
      const bad = CATEGORIES.filter((id) => (scores[id] ?? 0) < THRESHOLD);
      if (bad.length) {
        failed = true;
        process.stderr.write(
          `  FAIL ${pathname}: ${bad.map((id) => `${id}=${scores[id]}`).join(", ")}\n`,
        );
      } else {
        process.stderr.write(
          `  OK   ${pathname}: ${CATEGORIES.map((id) => `${id}=${scores[id]}`).join(" ")}\n`,
        );
      }
    }
  } finally {
    await chrome.kill();
  }

  await writeFile(
    path.join(outDir, "summary.json"),
    JSON.stringify({ threshold: THRESHOLD, summary }, null, 2),
  );
  console.log(JSON.stringify({ threshold: THRESHOLD, summary }, null, 2));
  if (failed) {
    process.stderr.write(`\nOne or more scores were below ${THRESHOLD}. See reports/marketing/\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.stderr.write(
    "\nHint: start the app with `npm run build && npm run start`, then re-run `npm run report:marketing`.\n",
  );
  process.exit(1);
});
