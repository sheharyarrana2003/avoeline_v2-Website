import assert from "node:assert/strict";
import { eventLifecycle, isActiveLifecycle } from "./eventState";

function d(iso: string) {
  return new Date(iso);
}

{
  const now = d("2026-06-15T12:00:00.000Z");
  assert.equal(eventLifecycle("draft", { startDate: "2026-07-01" }, now), "draft");
  assert.equal(eventLifecycle("cancelled", { startDate: "2026-07-01" }, now), "cancelled");
  assert.equal(
    eventLifecycle("published", { startDate: "2026-07-01", startTime: "09:00" }, now),
    "upcoming",
  );
  assert.equal(
    eventLifecycle(
      "published",
      { startDate: "2026-06-01", endDate: "2026-06-30", startTime: "09:00", endTime: "17:00" },
      now,
    ),
    "ongoing",
  );
  assert.equal(
    eventLifecycle(
      "published",
      { startDate: "2026-01-01", endDate: "2026-01-02", startTime: "09:00", endTime: "17:00" },
      now,
    ),
    "completed",
  );
  assert.equal(isActiveLifecycle("upcoming"), true);
  assert.equal(isActiveLifecycle("completed"), false);
  console.log("eventState.test.ts: ok");
}
