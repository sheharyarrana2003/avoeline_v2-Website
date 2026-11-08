import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HACKATHON_CONFIG_KEYS } from "../configKeys";
import {
  activityIntervalMinutes,
  allowResubmission,
  antiCheatLoggingOn,
  attendanceHeartbeatOn,
  categoryFilterActive,
  ctfFlagAccepted,
  hackathonTimerOpen,
  hintRevealAllowed,
  linkSubmissionRequired,
  liveScoreboardVisible,
  phaseWindowAllowsWork,
  phasedTaskVisible,
  randomTasksVisible,
  rejectWhenConfigOff,
  timerStartRequired,
} from "../settingsEnforcement.logic";

const enforced = HACKATHON_CONFIG_KEYS.filter((k) => !k.toggleOnly);

describe("settingsEnforcement — every non-toggleOnly key", () => {
  it("catalog lists only stubs as toggleOnly", () => {
    const stubs = HACKATHON_CONFIG_KEYS.filter((k) => k.toggleOnly).map((k) => k.key);
    assert.deepEqual(stubs.sort(), [
      "daily_shifts",
      "day_wise_calendar",
      "docker_sandboxing",
      "team_collaboration",
    ]);
    assert.ok(enforced.some((k) => k.key === "allow_resubmission"));
  });

  it("live_scoreboard — hides board when off", () => {
    assert.equal(liveScoreboardVisible(false), false);
    assert.equal(liveScoreboardVisible(true), true);
  });

  it("ctf_flags — rejects when off", () => {
    assert.equal(ctfFlagAccepted(false, true), false);
    assert.equal(ctfFlagAccepted(true, true), true);
    const gate = rejectWhenConfigOff(false, "This task doesn't take flags.");
    assert.equal(gate.ok, false);
  });

  it("task_hints — rejects when off", () => {
    assert.equal(hintRevealAllowed(false, true), false);
    assert.equal(hintRevealAllowed(true, true), true);
  });

  it("per_task_timer — start required when on", () => {
    assert.equal(timerStartRequired(true, false), false);
    assert.equal(timerStartRequired(true, true), true);
    assert.equal(timerStartRequired(false, false), true);
  });

  it("hackathon_timer — refuses after end", () => {
    assert.equal(hackathonTimerOpen(true, "2026-11-08T12:00:00Z", "2026-11-08T11:00:00Z"), false);
    assert.equal(hackathonTimerOpen(true, "2026-11-08T10:00:00Z", "2026-11-08T11:00:00Z"), true);
    assert.equal(hackathonTimerOpen(false, "2026-11-08T12:00:00Z", "2026-11-08T11:00:00Z"), true);
  });

  it("random_tasks — undealt random hidden", () => {
    assert.equal(randomTasksVisible(true, true, false), false);
    assert.equal(randomTasksVisible(true, true, true), true);
    assert.equal(randomTasksVisible(false, true, false), true);
  });

  it("task_categories — filter active only when on", () => {
    assert.equal(categoryFilterActive(false), false);
    assert.equal(categoryFilterActive(true), true);
  });

  it("day_wise_tasks / phased_structure — closed phase hides", () => {
    assert.equal(phasedTaskVisible(true, true, false), false);
    assert.equal(phasedTaskVisible(true, true, true), true);
    assert.equal(phasedTaskVisible(false, true, false), true);
  });

  it("link_submissions — requires link when on", () => {
    assert.equal(linkSubmissionRequired(true, false), false);
    assert.equal(linkSubmissionRequired(true, true), true);
    assert.equal(linkSubmissionRequired(false, false), true);
  });

  it("team_attendance — heartbeat only when on", () => {
    assert.equal(attendanceHeartbeatOn(false), false);
    assert.equal(attendanceHeartbeatOn(true), true);
  });

  it("activity_check_interval — minutes when on", () => {
    assert.equal(activityIntervalMinutes(true, 3), 3);
    assert.equal(activityIntervalMinutes(false, 3, 5), 5);
  });

  it("anti_cheat_tab_close — logging only when on", () => {
    assert.equal(antiCheatLoggingOn(false), false);
    assert.equal(antiCheatLoggingOn(true), true);
  });

  it("phase_lock_no_revisit — phase window still gates work", () => {
    assert.equal(phaseWindowAllowsWork(false, true), false);
    assert.equal(phaseWindowAllowsWork(true, true), true);
    assert.equal(phaseWindowAllowsWork(false, false), true);
  });

  it("allow_resubmission — default on; off blocks second row", () => {
    assert.equal(allowResubmission(true, 1), true);
    assert.equal(allowResubmission(false, 0), true);
    assert.equal(allowResubmission(false, 1), false);
  });

  it("covers every non-toggleOnly catalog key", () => {
    const tested = new Set([
      "live_scoreboard",
      "ctf_flags",
      "task_hints",
      "per_task_timer",
      "hackathon_timer",
      "random_tasks",
      "task_categories",
      "day_wise_tasks",
      "link_submissions",
      "team_attendance",
      "activity_check_interval",
      "anti_cheat_tab_close",
      "phased_structure",
      "phase_lock_no_revisit",
      "allow_resubmission",
    ]);
    for (const k of enforced) {
      assert.ok(tested.has(k.key), `missing enforcement test for ${k.key}`);
    }
  });
});
