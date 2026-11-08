import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupSessionTitlesBySpeaker,
  joinRowsForAgendaSpeakers,
  joinRowsForSpeakerSessions,
} from "../agendaSpeakers.logic";

describe("agendaSpeakers.logic", () => {
  it("builds unique agenda→speaker join rows", () => {
    assert.deepEqual(joinRowsForAgendaSpeakers("a1", ["s1", "s1", "", "s2"]), [
      { agenda_item_id: "a1", speaker_id: "s1" },
      { agenda_item_id: "a1", speaker_id: "s2" },
    ]);
    assert.deepEqual(joinRowsForAgendaSpeakers("", ["s1"]), []);
  });

  it("builds unique speaker→session join rows", () => {
    assert.deepEqual(joinRowsForSpeakerSessions("s1", ["a1", "a1", "a2"]), [
      { agenda_item_id: "a1", speaker_id: "s1" },
      { agenda_item_id: "a2", speaker_id: "s1" },
    ]);
  });

  it("groups session titles by speaker", () => {
    const titles = new Map([
      ["a1", "Opening"],
      ["a2", "Panel"],
    ]);
    const map = groupSessionTitlesBySpeaker(
      [
        { agenda_item_id: "a1", speaker_id: "s1" },
        { agenda_item_id: "a2", speaker_id: "s1" },
        { agenda_item_id: "a1", speaker_id: "s2" },
      ],
      titles,
      ["s1", "s2", "s3"],
    );
    assert.deepEqual(map.get("s1"), ["Opening", "Panel"]);
    assert.deepEqual(map.get("s2"), ["Opening"]);
    assert.deepEqual(map.get("s3"), []);
  });
});
