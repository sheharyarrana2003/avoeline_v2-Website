export type StaffAssignmentInput = {
  teamId: string;
  memberIds: string[];
  leadMemberId?: string | null;
};

export type StaffAssignmentRow = {
  event_id: string;
  team_id: string;
  member_ids: string[];
  lead_member_id: string | null;
};

/** Map UI assignment rows → insert payload (lead must be on the selected subset or whole roster). */
export function mapAssignmentsForInsert(
  eventId: string,
  rows: StaffAssignmentInput[],
): StaffAssignmentRow[] {
  return rows.map((r) => {
    const memberIds = r.memberIds.filter(Boolean);
    const lead = r.leadMemberId?.trim() || null;
    const leadOk = lead && (!memberIds.length || memberIds.includes(lead)) ? lead : null;
    return {
      event_id: eventId,
      team_id: r.teamId,
      member_ids: memberIds,
      lead_member_id: leadOk,
    };
  });
}

export function mapAssignmentFromRow(row: {
  team_id: string;
  member_ids: unknown;
  lead_member_id?: string | null;
}): { teamId: string; memberIds: string[]; leadMemberId: string | null } {
  return {
    teamId: String(row.team_id),
    memberIds: Array.isArray(row.member_ids) ? row.member_ids.map(String) : [],
    leadMemberId: row.lead_member_id ? String(row.lead_member_id) : null,
  };
}
