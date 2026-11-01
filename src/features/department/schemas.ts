import { z } from "zod";

export const createClubSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(1, "Club name is required.").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  logoUrl: z.string().trim().max(2000).optional().default(""),
  presidentName: z.string().trim().min(1, "President name is required.").max(120),
  email: z.string().trim().email("President email is required."),
  modules: z.array(z.string()).optional().default([]),
});

export const setClubAccessSchema = z.object({
  departmentId: z.string().uuid(),
  orgId: z.string().uuid().optional().or(z.literal("")),
  applyAll: z.boolean().optional().default(false),
  modules: z.array(z.string()).optional().default([]),
});

export const startTenureSchema = z.object({
  departmentId: z.string().uuid(),
  clubId: z.string().uuid(),
  label: z.string().trim().min(1, "Label is required.").max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date required."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date required."),
  copyRoster: z.boolean().optional().default(false),
});

export const postAnnouncementSchema = z.object({
  departmentId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8000),
  audience: z.enum(["all_clubs", "selected_clubs", "presidents_only", "all_members"]),
  channels: z.array(z.enum(["in_app", "email"])).min(1),
  clubIds: z.array(z.string().uuid()).optional().default([]),
});
