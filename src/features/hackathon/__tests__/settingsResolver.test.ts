import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HACKATHON_CONFIG_KEYS, configKeyMeta } from "../configKeys";

describe("hackathon settings resolver metadata", () => {
  it("lists stub keys as toggleOnly / not active", () => {
    const docker = configKeyMeta("docker_sandboxing");
    const shifts = configKeyMeta("daily_shifts");
    assert.ok(docker?.toggleOnly);
    assert.ok(shifts?.toggleOnly);
  });

  it("every key has an effect string for Active rules", () => {
    for (const k of HACKATHON_CONFIG_KEYS) {
      assert.ok(k.key.length > 0);
      assert.ok(k.effect.length > 0, k.key);
    }
  });

  it("per_task_timer documents latePolicy field", () => {
    const meta = configKeyMeta("per_task_timer");
    assert.ok(meta?.fields?.some((f) => f.name === "latePolicy"));
  });

  it("link_submissions has allowlist field", () => {
    const meta = configKeyMeta("link_submissions");
    assert.ok(meta?.fields?.some((f) => f.name === "allowedDomains" || f.name.includes("domain")));
  });

  it("anti_cheat documents monitoring-only (no OS lockdown)", () => {
    const meta = configKeyMeta("anti_cheat_tab_close");
    assert.ok(
      meta?.effect.toLowerCase().includes("lockdown") ||
        meta?.effect.toLowerCase().includes("monitoring"),
    );
    assert.ok(
      meta?.effect.toLowerCase().includes("not") || meta?.effect.toLowerCase().includes("never"),
    );
  });
});
