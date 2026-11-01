"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { AuthService } from "@/src/features/auth/authService";
import { can } from "@/src/features/permissions/can";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import {
  deliverSheet,
  deliverWorkbook,
  isSheetFormat,
  type SheetFormat,
} from "@/src/features/exports/writeSheet";
import type { CsvColumn } from "@/src/lib/csv";
import type { TeamDoc } from "@/src/features/teams/teamEngine.types";
import { APPLICANT_STATUS_LABEL } from "@/src/features/teams/teamEngine.types";

const MEMBER_COLUMN_KEYS = [
  "teamName",
  "lead",
  "name",
  "email",
  "role",
  "position",
  "access",
  "source",
  "joined",
] as const;

const APPLICANT_COLUMN_KEYS = [
  "formTitle",
  "teamName",
  "name",
  "email",
  "status",
  "appliedAt",
  "position",
] as const;

const inputSchema = z.object({
  teamIds: z.array(z.string().uuid()).max(100).optional(),
  formId: z.string().uuid().optional(),
  scope: z.enum(["all", "selected", "form"]).default("all"),
  organizerId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
  columns: z.array(z.string()).max(40).optional(),
});

type MemberRow = {
  teamName: string;
  lead: string;
  name: string;
  email: string;
  role: string;
  position: string;
  access: string;
  source: string;
  joined: string;
};

type ApplicantRow = {
  formTitle: string;
  teamName: string;
  name: string;
  email: string;
  status: string;
  appliedAt: string;
  position: string;
};

type TeamRow = {
  teamName: string;
  type: string;
  lead: string;
  memberCount: number;
};

export const exportTeamsAction = safeAction({
  input: inputSchema,
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const allowed =
      (await can(user, "exports:run", {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orgId: input.orgId,
      })) ||
      (await can(user, "teams:manage", {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orgId: input.orgId,
      }));
    if (!allowed) return safeFail("FORBIDDEN", "Not allowed to export teams.");

    const format: SheetFormat = isSheetFormat(input.format) ? input.format : "xlsx";

    if (input.scope === "form" || input.formId) {
      if (!input.formId) return safeFail("VALIDATION", "Pick a recruitment form.");
      const form = await TeamEngineService.getRecruitmentForm(input.formId);
      if (!form) return safeFail("NOT_FOUND", "Form not found.");
      if (input.organizerId) {
        const owns = await TeamEngineService.organizerOwnsStaffTeam(input.organizerId, form.teamId);
        if (!owns) return safeFail("FORBIDDEN", "Not allowed.");
      }
      const team = await TeamEngineService.getTeam(form.teamId);
      const byTeam = await TeamEngineService.listApplicantsForTeams([form.teamId]);
      const applicants = (byTeam.get(form.teamId) ?? []).filter((a) => a.formId === form.id);
      const positions = await TeamEngineService.listPositionsForTeams([form.teamId]);
      const posList = positions.get(form.teamId) ?? [];

      const rows: ApplicantRow[] = applicants.map((a) => ({
        formTitle: form.title,
        teamName: team?.name || "",
        name: String(a.responses.name || ""),
        email: a.email,
        status: APPLICANT_STATUS_LABEL[a.status] || a.status,
        appliedAt: a.appliedAt,
        position: posList.find((p) => p.id === a.positionId)?.title || "",
      }));

      const wanted = new Set(
        (input.columns?.length ? input.columns : [...APPLICANT_COLUMN_KEYS]).filter((c) =>
          (APPLICANT_COLUMN_KEYS as readonly string[]).includes(c),
        ),
      );
      const allCols: CsvColumn<ApplicantRow>[] = [
        { header: "Form", value: (r) => r.formTitle },
        { header: "Team", value: (r) => r.teamName },
        { header: "Name", value: (r) => r.name },
        { header: "Email", value: (r) => r.email },
        { header: "Status", value: (r) => r.status },
        { header: "Applied", value: (r) => r.appliedAt },
        { header: "Position", value: (r) => r.position },
      ];
      const keyToHeader: Record<string, string> = {
        formTitle: "Form",
        teamName: "Team",
        name: "Name",
        email: "Email",
        status: "Status",
        appliedAt: "Applied",
        position: "Position",
      };
      const cols = allCols.filter((c) => [...wanted].some((k) => keyToHeader[k] === c.header));

      const file = await deliverSheet("applicants-export", format, rows, cols, "Applicants");
      if (!file.success) return safeFail("EXPORT", file.error || "Export failed.");
      return safeOk({ url: file.url, filename: file.filename });
    }

    const teamIds = input.teamIds ?? [];
    if (!teamIds.length) return safeFail("VALIDATION", "Select at least one team.");

    const docs: TeamDoc[] = [];
    for (const id of teamIds) {
      const t = await TeamEngineService.getTeam(id);
      if (t) docs.push(t);
    }
    const teams = await TeamEngineService.getTeamsWithMembers(docs);
    const positions = await TeamEngineService.listPositionsForTeams(teams.map((t) => t.id));

    const teamRows: TeamRow[] = teams.map((t) => {
      const lead = t.members.find((m) => m.role === "lead");
      return {
        teamName: t.name,
        type: t.contextType,
        lead: lead?.displayName || lead?.email || lead?.user?.name || "",
        memberCount: t.members.length,
      };
    });

    const memberRows: MemberRow[] = teams.flatMap((t) => {
      const posList = positions.get(t.id) ?? [];
      const lead = t.members.find((m) => m.role === "lead");
      const leadLabel = lead?.displayName || lead?.email || lead?.user?.name || "";
      return t.members.map((m) => {
        const pos = posList.find((p) => p.id === m.positionId);
        return {
          teamName: t.name,
          lead: leadLabel,
          name: m.displayName || m.user?.name || "",
          email: m.email || m.user?.email || "",
          role: m.role,
          position: pos?.title || "",
          access: (pos?.permissions || []).join("; "),
          source: m.source || "manual",
          joined: m.joinedAt || "",
        };
      });
    });

    const wanted = new Set(
      (input.columns?.length ? input.columns : [...MEMBER_COLUMN_KEYS]).filter((c) =>
        (MEMBER_COLUMN_KEYS as readonly string[]).includes(c),
      ),
    );

    const memberColsAll: { key: (typeof MEMBER_COLUMN_KEYS)[number]; col: CsvColumn<MemberRow> }[] =
      [
        { key: "teamName", col: { header: "Team", value: (r) => r.teamName } },
        { key: "lead", col: { header: "Lead", value: (r) => r.lead } },
        { key: "name", col: { header: "Name", value: (r) => r.name } },
        { key: "email", col: { header: "Email", value: (r) => r.email } },
        { key: "role", col: { header: "Role", value: (r) => r.role } },
        { key: "position", col: { header: "Position", value: (r) => r.position } },
        { key: "access", col: { header: "Access", value: (r) => r.access } },
        { key: "source", col: { header: "Source", value: (r) => r.source } },
        { key: "joined", col: { header: "Joined", value: (r) => r.joined } },
      ];
    const memberCols = memberColsAll.filter((c) => wanted.has(c.key)).map((c) => c.col);

    const teamCols: CsvColumn<TeamRow>[] = [
      { header: "Team", value: (r) => r.teamName },
      { header: "Type", value: (r) => r.type },
      { header: "Lead", value: (r) => r.lead },
      { header: "Members", value: (r) => r.memberCount },
    ];

    if (format === "csv") {
      const file = await deliverSheet("teams-members", "csv", memberRows, memberCols, "Members");
      if (!file.success) return safeFail("EXPORT", file.error || "Export failed.");
      return safeOk({ url: file.url, filename: file.filename });
    }

    const file = await deliverWorkbook("teams-export", [
      { name: "Teams", rows: teamRows as unknown[], columns: teamCols as CsvColumn<unknown>[] },
      {
        name: "Members",
        rows: memberRows as unknown[],
        columns: memberCols as CsvColumn<unknown>[],
      },
    ]);
    if (!file.success) return safeFail("EXPORT", file.error || "Export failed.");
    return safeOk({ url: file.url, filename: file.filename });
  },
});
