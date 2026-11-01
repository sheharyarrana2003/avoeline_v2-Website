export type AnnouncementAudience =
  "all_clubs" | "selected_clubs" | "presidents_only" | "all_members";

export type AnnouncementChannel = "in_app" | "email";

export type DeptEventScope = "all" | "department" | string;

export type OrgTenureRow = {
  id: string;
  orgId: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};
