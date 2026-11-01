/**
 * Live DB smoke: free plan → complete; paid → reject → approve.
 * Loads `.env.local`, then runs the node:test suite with SMOKE_ONBOARDING=1.
 *
 * Usage: npm run test:smoke:onboarding
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.local");
const args = [
  ...(existsSync(envFile) ? [`--env-file=${envFile}`] : []),
  "--import",
  "tsx",
  "--test",
  "src/features/onboarding/__tests__/onboarding.flow.test.ts",
];

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, SMOKE_ONBOARDING: "1" },
});

process.exit(result.status ?? 1);
