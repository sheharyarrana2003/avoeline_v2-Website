"use server";

import {
  deliverSheet,
  deliverWorkbook,
  isSheetFormat,
  type SheetFormat,
} from "@/src/features/exports/writeSheet";
import {
  attendeeColumns,
  attendeeLeadColumns,
  attendeeMemberColumns,
  checkInColumns,
  checkInRows,
  financialColumns,
  financialRows,
  hackathonTeamMemberColumns,
  hackathonTeamSummaryColumns,
  isSheetKind,
  sponsorColumns,
  staffColumns,
  SHEET_META,
  type AttendeeLeadSheetRow,
  type AttendeeMemberSheetRow,
  type AttendeeRow,
  type SheetKind,
} from "@/src/features/exports/eventSheets";
import { listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import { absoluteUrl } from "@/src/lib/appUrl";
import { answerText } from "@/src/lib/customFields";
import { isCheckedIn } from "@/src/features/event_attendee/roster";
import type { CsvColumn } from "@/src/lib/csv";
import { assertEventActor } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { APPLICANT_STATUS_LABEL } from "@/src/features/teams/teamEngine.types";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import type { RegistrationStatus } from "@/src/services/models/reg.type";
import type { ExportResult } from "@/src/features/exports/types";

/** `"all"` rather than an empty string, so an unset filter cannot read as a status. */
export type StatusFilter = RegistrationStatus | "all";

export type SheetRequest = {
  eventId: string;
  kind: SheetKind;
  format: SheetFormat;
  /** Attendee export only; ignored by the other three. */
  status?: StatusFilter;
};

/**
 * Build one of the four event exports and hand back a download link.
 *
 * One action for all four rather than four actions, because everything except
 * the columns is shared: the ownership check, the registration read, the
 * name-and-email join, and the delivery path. Splitting it would copy the
 * authorization four times, and an export that skipped it hands out attendee
 * phone numbers.
 *
 * The arguments are validated rather than trusted even though they come from
 * this app's own UI -- a Server Action is a public endpoint, so `kind` and
 * `format` are checked against their unions before either is used to pick a
 * code path or build a filename.
 */
export async function exportEventSheetAction(request: SheetRequest): Promise<ExportResult> {
  try {
    const { eventId } = request;
    const kind: SheetKind = isSheetKind(request.kind) ? request.kind : "attendees";
    const format: SheetFormat = isSheetFormat(request.format) ? request.format : "csv";

    // Every one of these sheets is confidential -- attendee contact details,
    // takings, sponsor contract values -- so ownership is checked first and
    // nothing is read before it passes.
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return { success: false, error: "You cannot export data for that event." };

    const title = event.title || eventId;
    const base = `${SHEET_META[kind].basename}-${title}`;

    if (kind === "staff") {
      const advanced = await hasModuleAccess(event.organizerId, "teams_advanced_roles");
      const teams = await TeamEngineService.getTeamsByContext({
        contextType: "event_staff",
        eventId,
      });
      const rows = [];
      for (const team of teams) {
        const [members, positions, applicants] = await Promise.all([
          TeamEngineService.getTeamMembers(team.id),
          advanced ? TeamEngineService.listPositions(team.id) : Promise.resolve([]),
          advanced ? TeamEngineService.listApplicants(team.id) : Promise.resolve([]),
        ]);
        const titleById = new Map(positions.map((p) => [p.id, p.title]));
        for (const m of members) {
          rows.push({
            roster: team.name,
            name: m.user?.name || "",
            email: m.user?.email || "",
            role: m.role,
            lead: m.role === "lead" ? "Yes" : "No",
            position: m.positionId ? titleById.get(m.positionId) || "" : "",
            pipelineStatus: "",
          });
        }
        if (advanced) {
          for (const a of applicants) {
            rows.push({
              roster: team.name,
              name: String(a.responses.name || ""),
              email: a.email,
              role: "applicant",
              lead: "No",
              position: a.positionId ? titleById.get(a.positionId) || "" : "",
              pipelineStatus: APPLICANT_STATUS_LABEL[a.status] || a.status,
            });
          }
        }
      }
      return deliver(await deliverSheet(base, format, rows, staffColumns, SHEET_META[kind].label));
    }

    if (kind === "hackathon_teams") {
      const [teams, tracks] = await Promise.all([listTeamsOfEvent(eventId), listTracks(eventId)]);
      const summary = teams.map((t) => ({
        teamName: t.name,
        trackName: tracks.find((tr) => tr.id === t.trackId)?.name ?? "",
        leadName: t.members.find((m) => m.isOwner)?.name ?? t.members[0]?.name ?? "",
        memberCount: t.members.length,
        paymentStatus: t.feeStatus || "",
        accessCode: t.accessCode || "",
      }));
      const memberRegs = await RegService.getRegsByIds(
        teams.flatMap((t) => t.memberRegistrationIds || t.members.map((m) => m.registrationId)),
      );
      const shortById = new Map(memberRegs.map((r) => [r.registrationId, r.shortCode] as const));
      const members = teams.flatMap((t) =>
        t.members.map((m) => ({
          teamName: t.name,
          memberName: m.name,
          email: m.email || "",
          role: m.isOwner ? "lead" : "member",
          shortCode: shortById.get(m.registrationId) || "",
        })),
      );
      if (format === "xlsx") {
        return deliver(
          await deliverWorkbook(base, [
            {
              name: "Teams",
              rows: summary,
              columns: hackathonTeamSummaryColumns as CsvColumn<unknown>[],
            },
            {
              name: "Members",
              rows: members,
              columns: hackathonTeamMemberColumns as CsvColumn<unknown>[],
            },
          ]),
        );
      }
      return deliver(
        await deliverSheet(base, format, summary, hackathonTeamSummaryColumns, "Teams"),
      );
    }

    if (kind === "sponsors") {
      const orgs = await getEventOrganizations(eventId);
      return deliver(
        await deliverSheet(base, format, orgs, sponsorColumns, SHEET_META[kind].label),
      );
    }

    const regs = await RegService.getRegsOfEvent(eventId);
    const usersById = regs.length
      ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
      : new Map();

    const { registrantIdentity } = await import("@/src/features/event_attendee/registrantIdentity");
    const rows: AttendeeRow[] = regs.map((reg) => {
      const user = usersById.get(String(reg.userId));
      const id = registrantIdentity(reg, user);
      return {
        reg,
        name: id.name === "Unknown" ? "" : id.name,
        email: id.email,
      };
    });

    if (kind === "checkin") {
      return deliver(
        await deliverSheet(base, format, checkInRows(rows), checkInColumns, SHEET_META[kind].label),
      );
    }

    if (kind === "financial") {
      const orgs = await getEventOrganizations(eventId);
      const currency = event.pricing?.currency || "PKR";
      return deliver(
        await deliverSheet(
          base,
          format,
          financialRows(rows, orgs),
          financialColumns(currency),
          SHEET_META[kind].label,
        ),
      );
    }

    const status = request.status ?? "all";
    const filtered = status === "all" ? rows : rows.filter((r) => r.reg.status === status);
    const name = status === "all" ? base : `${SHEET_META[kind].basename}-${status}-${title}`;
    const { listAllFields, fieldsToCustomForm } =
      await import("@/src/features/registration/forms/formFields.service");
    const allFields = await listAllFields(eventId).catch(() => []);
    const ticketUrlFor = async (registrationId: string) =>
      absoluteUrl(`/events/${eventId}/ticket/${registrationId}`);

    const [hackTeams, tracks, groups] = await Promise.all([
      listTeamsOfEvent(eventId),
      listTracks(eventId),
      listRegistrationGroups(eventId),
    ]);
    const hasGroups = hackTeams.length > 0 || groups.length > 0;

    // Active fields + archived only when at least one export row still has an answer.
    const keysWithData = new Set<string>();
    for (const r of filtered) {
      const answers = r.reg.customResponses || {};
      for (const [k, v] of Object.entries(answers)) {
        if (v != null && String(v).trim() !== "") keysWithData.add(k);
      }
    }
    const questions =
      allFields.length > 0
        ? fieldsToCustomForm(
            allFields
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .filter((f) => {
                if (["name", "email", "phone"].includes(f.key)) return false;
                if (!f.archivedAt) return true;
                return keysWithData.has(f.key);
              }),
          )
        : (event.registration?.customForm ?? []);

    if (hasGroups && format === "xlsx") {
      const byId = new Map(filtered.map((r) => [r.reg.registrationId, r]));
      const leadRows: AttendeeLeadSheetRow[] = [];
      const memberRows: AttendeeMemberSheetRow[] = [];

      const pushTeam = async (input: {
        name: string;
        competition: string;
        leadId: string | null;
        memberIds: string[];
        payment: string;
        accessCode: string;
      }) => {
        const members = input.memberIds
          .map((id) => byId.get(id))
          .filter((r): r is AttendeeRow => Boolean(r));
        const lead = (input.leadId ? byId.get(input.leadId) : null) ?? members[0];
        const checked = members.filter((m) => isCheckedIn(m.reg)).length;
        leadRows.push({
          teamName: input.name,
          competition: input.competition,
          leadName: lead?.name ?? "",
          leadEmail: lead?.email ?? "",
          leadPhone: lead?.reg.attendee?.phone ?? "",
          memberCount: members.length,
          checkedInCount: checked,
          paymentStatus: input.payment || lead?.reg.payment?.paymentStatus || "",
          amount: Number(lead?.reg.finalPrice ?? 0),
          ticketUrl: lead ? await ticketUrlFor(lead.reg.registrationId) : "",
          registrationStatus: lead?.reg.status ?? "",
          accessCode: input.accessCode,
        });
        for (const m of members) {
          const answers: Record<string, string> = {};
          for (const q of questions) answers[q.fieldId] = answerText(q, m.reg.customResponses);
          memberRows.push({
            name: m.name,
            email: m.email,
            phone: m.reg.attendee?.phone ?? "",
            role:
              m.reg.registrationId === (input.leadId || lead?.reg.registrationId)
                ? "lead"
                : "member",
            team: input.name,
            competition: input.competition,
            checkedIn: isCheckedIn(m.reg) ? "Yes" : "No",
            shortCode: m.reg.shortCode || "",
            ticketUrl: await ticketUrlFor(m.reg.registrationId),
            answers,
          });
        }
      };

      for (const t of hackTeams) {
        const leadId =
          t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId ?? null;
        await pushTeam({
          name: t.name,
          competition: tracks.find((tr) => tr.id === t.trackId)?.name ?? "",
          leadId,
          memberIds: t.memberRegistrationIds,
          payment: t.feeStatus || "",
          accessCode: t.accessCode || "",
        });
      }
      for (const g of groups) {
        await pushTeam({
          name: g.groupName,
          competition: "",
          leadId: g.leadRegistrationId,
          memberIds: g.memberIds,
          payment: g.paymentStatus || "",
          accessCode: "",
        });
      }

      const teamed = new Set([
        ...hackTeams.flatMap((t) => t.memberRegistrationIds),
        ...groups.flatMap((g) => g.memberIds),
      ]);
      for (const row of filtered.filter((r) => !teamed.has(r.reg.registrationId))) {
        const answers: Record<string, string> = {};
        for (const q of questions) answers[q.fieldId] = answerText(q, row.reg.customResponses);
        memberRows.push({
          name: row.name,
          email: row.email,
          phone: row.reg.attendee?.phone ?? "",
          role: "solo",
          team: "",
          competition: "",
          checkedIn: isCheckedIn(row.reg) ? "Yes" : "No",
          shortCode: row.reg.shortCode || "",
          ticketUrl: await ticketUrlFor(row.reg.registrationId),
          answers,
        });
      }

      const memberTotal = leadRows.reduce((n, r) => n + Number(r.memberCount || 0), 0);
      const checkTotal = leadRows.reduce((n, r) => n + Number(r.checkedInCount || 0), 0);
      const amountTotal = leadRows.reduce((n, r) => n + Number(r.amount || 0), 0);
      leadRows.push({
        teamName: "TOTAL",
        competition: "",
        leadName: "",
        leadEmail: "",
        leadPhone: "",
        memberCount: memberTotal,
        checkedInCount: checkTotal,
        paymentStatus: "",
        amount: amountTotal,
        ticketUrl: "",
        registrationStatus: `${leadRows.length - 0} teams`,
        accessCode: "",
      });

      return deliver(
        await deliverWorkbook(name, [
          { name: "Teams", rows: leadRows, columns: attendeeLeadColumns as CsvColumn<unknown>[] },
          {
            name: "Members",
            rows: memberRows,
            columns: attendeeMemberColumns(questions) as CsvColumn<unknown>[],
          },
        ]),
      );
    }

    const urls = new Map<string, string>();
    for (const row of filtered) {
      urls.set(row.reg.registrationId, await ticketUrlFor(row.reg.registrationId));
    }

    const { paymentProofPlatformUrl, storedFileIdFromProofPath } =
      await import("@/src/features/event_attendee/approveDisabledReason");
    const { getStoredFileById } = await import("@/src/features/files/storedFiles.repo");
    const driveByReg = new Map<string, string>();
    const fileIds = [
      ...new Set(
        filtered
          .map((r) => storedFileIdFromProofPath(r.reg.payment?.proofPath))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    await Promise.all(
      fileIds.map(async (fid) => {
        const row = await getStoredFileById(fid).catch(() => null);
        const web = row?.provider === "drive" ? String(row.extra?.webUrl || "") : "";
        if (!web) return;
        for (const r of filtered) {
          if (storedFileIdFromProofPath(r.reg.payment?.proofPath) === fid) {
            driveByReg.set(r.reg.registrationId, web);
          }
        }
      }),
    );

    const origin = (await absoluteUrl("/")).replace(/\/$/, "");
    return deliver(
      await deliverSheet(
        name,
        format,
        filtered,
        attendeeColumns(questions, {
          ticketUrl: (r) => urls.get(r.reg.registrationId) ?? "",
          proofPlatformUrl: (r) => {
            const path = paymentProofPlatformUrl(r.reg.payment?.proofPath);
            return path ? `${origin}${path}` : "";
          },
          proofDriveUrl: (r) => driveByReg.get(r.reg.registrationId) ?? "",
          checkInWho: (r) => r.reg.checkIn?.checkedInBy ?? "",
        }),
        SHEET_META[kind].label,
      ),
    );
  } catch (err) {
    console.error("[exportEventSheetAction]", err);
    return { success: false, error: "Could not build the export. Please try again." };
  }
}

function deliver(result: Awaited<ReturnType<typeof deliverSheet>>): ExportResult {
  if (!result.success) return { success: false, error: result.error };
  return { success: true, url: result.url, filename: result.filename };
}
