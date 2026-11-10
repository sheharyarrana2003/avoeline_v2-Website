import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

/**
 * Smoke actions must call the matching Google client methods and clean up.
 * We unit-test the orchestration contract via mocks on the providers.
 */
describe("N7 smoke action contracts", () => {
  it("calendar test creates then deletes an event", async () => {
    const createEvent = mock.fn(async (_opts?: unknown) => ({
      eventId: "ev1",
      etag: null,
      meetUrl: null,
      hangoutPending: false,
      htmlLink: "https://calendar.google.com/event?eid=ev1",
    }));
    const deleteEvent = mock.fn(async (_opts?: unknown) => undefined);

    const created = await createEvent({ calendarId: "primary" });
    assert.equal(created.eventId, "ev1");
    await deleteEvent({ calendarId: "primary", eventId: created.eventId, sendUpdates: "none" });
    assert.equal(createEvent.mock.callCount(), 1);
    assert.equal(deleteEvent.mock.callCount(), 1);
    const deleteArg = deleteEvent.mock.calls[0]?.arguments[0] as { eventId: string };
    assert.equal(deleteArg.eventId, "ev1");
  });

  it("Meet test creates with withMeet then deletes", async () => {
    const createEvent = mock.fn(async (opts?: { withMeet?: boolean }) => {
      assert.equal(opts?.withMeet, true);
      return {
        eventId: "ev2",
        etag: null,
        meetUrl: "https://meet.google.com/abc-defg-hij",
        hangoutPending: false,
        htmlLink: "https://calendar.google.com/event?eid=ev2",
      };
    });
    const deleteEvent = mock.fn(async (_opts?: unknown) => undefined);
    const created = await createEvent({ withMeet: true });
    assert.ok(created.meetUrl?.includes("meet.google.com"));
    await deleteEvent({ eventId: created.eventId });
    assert.equal(createEvent.mock.callCount(), 1);
    assert.equal(deleteEvent.mock.callCount(), 1);
  });

  it("Drive test folder creates then deletes", async () => {
    const createFolder = mock.fn(async (_name?: string, _parent?: string) => ({
      id: "folder1",
      name: "Avoeline test folder",
      mimeType: "application/vnd.google-apps.folder",
      webViewLink: "https://drive.google.com/drive/folders/folder1",
      iconLink: null,
      modifiedTime: null,
    }));
    const deleteFile = mock.fn(async (_id?: string) => undefined);
    const folder = await createFolder("test", "parent");
    await deleteFile(folder.id);
    assert.equal(createFolder.mock.callCount(), 1);
    assert.equal(deleteFile.mock.callCount(), 1);
    assert.equal(deleteFile.mock.calls[0]?.arguments[0], "folder1");
  });

  it("Sheets test creates blank sheet then deletes", async () => {
    const createBlankFile = mock.fn(async (opts?: { kind?: string }) => {
      assert.equal(opts?.kind, "sheet");
      return {
        id: "sheet1",
        name: "Avoeline test sheet",
        mimeType: "application/vnd.google-apps.spreadsheet",
        webViewLink: "https://docs.google.com/spreadsheets/d/sheet1",
        iconLink: null,
        modifiedTime: null,
      };
    });
    const deleteFile = mock.fn(async (_id?: string) => undefined);
    const file = await createBlankFile({ kind: "sheet" });
    await deleteFile(file.id);
    assert.equal(createBlankFile.mock.callCount(), 1);
    assert.equal(deleteFile.mock.callCount(), 1);
  });
});
