import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAssignmentFromRow, mapAssignmentsForInsert } from "../eventStaffAssignment.logic";

describe("eventStaffAssignment.logic", () => {
  it("round-trips lead_member_id on insert mapping", () => {
    const rows = mapAssignmentsForInsert("e1", [
      { teamId: "t1", memberIds: ["m1", "m2"], leadMemberId: "m2" },
      { teamId: "t2", memberIds: [], leadMemberId: "m9" },
    ]);
    assert.deepEqual(rows[0], {
      event_id: "e1",
      team_id: "t1",
      member_ids: ["m1", "m2"],
      lead_member_id: "m2",
    });
    assert.equal(rows[1]!.lead_member_id, "m9");
  });

  it("clears lead when not in member subset", () => {
    const rows = mapAssignmentsForInsert("e1", [
      { teamId: "t1", memberIds: ["m1"], leadMemberId: "m2" },
    ]);
    assert.equal(rows[0]!.lead_member_id, null);
  });

  it("maps DB row including lead", () => {
    assert.deepEqual(
      mapAssignmentFromRow({
        team_id: "t1",
        member_ids: ["a", "b"],
        lead_member_id: "b",
      }),
      { teamId: "t1", memberIds: ["a", "b"], leadMemberId: "b" },
    );
  });
});
