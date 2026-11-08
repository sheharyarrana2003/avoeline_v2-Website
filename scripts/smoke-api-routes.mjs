/**
 * Smoke-test all documented Route Handlers.
 * Usage: node scripts/smoke-api-routes.mjs [baseUrl]
 * Loads CRON_SECRET from .env.local when present (never prints it).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const base = (process.argv[2] || "https://avoeline-website.vercel.app").replace(/\/$/, "");

function loadCronSecret() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return process.env.CRON_SECRET || "";
  const raw = readFileSync(envPath, "utf8");
  const m = raw.match(/^CRON_SECRET=(.+)$/m);
  return (m?.[1] || process.env.CRON_SECRET || "").trim().replace(/^["']|["']$/g, "");
}

const cronSecret = loadCronSecret();

async function hit(name, path, opts = {}) {
  const { method = "GET", headers = {}, expectStatus, expectRedirect, body } = opts;
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (err) {
    return {
      name,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  const loc = res.headers.get("location") || "";
  let detail = "";
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const j = await res.json();
      detail = JSON.stringify(j).slice(0, 180);
    } catch {
      detail = "(invalid json)";
    }
  } else if (res.status >= 300 && res.status < 400) {
    detail = `→ ${loc.slice(0, 120)}`;
  } else {
    detail = (await res.text().catch(() => "")).slice(0, 120);
  }

  // Static HTML 404 (undeployed / missing route) must not count as a handler 404.
  const looksLikeApp404 =
    res.status === 404 &&
    ct.includes("text/html") &&
    !detail.includes('"error"') &&
    !detail.includes('"ok"');

  let ok = true;
  if (typeof expectStatus === "number") ok = res.status === expectStatus;
  else if (Array.isArray(expectStatus)) ok = expectStatus.includes(res.status);
  if (expectRedirect && ok) {
    ok = res.status >= 300 && res.status < 400 && Boolean(loc);
    if (typeof expectRedirect === "string") ok = ok && loc.includes(expectRedirect);
  }
  if (looksLikeApp404 && (expectStatus === 404 || expectStatus === 401 || expectStatus === 400)) {
    ok = false;
    detail = `HTML 404 (route missing on host) ${detail}`;
  }
  return { name, ok, status: res.status, ms: Date.now() - started, detail };
}

const cases = [
  {
    name: "certificates fake id → 404",
    path: "/api/certificates/00000000-0000-0000-0000-000000000000",
    expectStatus: 404,
  },
  {
    name: "certificate download fake code → 404",
    path: "/certificate/VCODE-missing/download",
    expectStatus: 404,
  },
  {
    name: "picker-token unauthenticated → 401",
    path: "/api/connections/google/picker-token?connectionId=00000000-0000-0000-0000-000000000000",
    expectStatus: 401,
  },
  {
    name: "oauth start unsupported provider → 400",
    path: "/api/connections/foo/start",
    expectStatus: 400,
  },
  {
    name: "oauth start google unauth → redirect",
    path: "/api/connections/google/start?capability=email.send",
    expectRedirect: true,
  },
  {
    name: "oauth callback google unauth → redirect signin",
    path: "/api/connections/google/callback",
    expectRedirect: "/auth/signin",
  },
  {
    name: "legacy email callback → redirect connections callback",
    path: "/api/email/google/callback?code=x&state=y",
    expectRedirect: "/api/connections/google/callback",
  },
  {
    name: "auth callback → redirect or 3xx",
    path: "/auth/callback",
    expectStatus: [302, 303, 307, 308, 400],
  },
];

const cronPaths = [
  "/api/cron/plan-expiry",
  "/api/cron/email-outbox",
  "/api/cron/linked-files",
  "/api/cron/sheet-syncs",
  "/api/cron/connections-health",
  "/api/cron/feature-override-expiry",
];

for (const p of cronPaths) {
  cases.push({ name: `${p} unauthorized → 401`, path: p, expectStatus: 401 });
  if (cronSecret) {
    cases.push({
      name: `${p} authorized GET`,
      path: p,
      headers: { Authorization: `Bearer ${cronSecret}` },
      expectStatus: [200, 500], // 500 = infra misconfig; still authenticated
    });
  }
}

const results = [];
for (const c of cases) {
  results.push(await hit(c.name, c.path, c));
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${r.status}  ${r.ms}ms  ${r.name}${r.detail ? `  ${r.detail}` : ""}`);
}
console.log(
  `\n${results.length - failed.length}/${results.length} passed` +
    (cronSecret ? " (CRON_SECRET loaded)" : " (no CRON_SECRET — authorized cron tests skipped)"),
);
process.exit(failed.length ? 1 : 0);
