import { z } from "zod";

export const enterCompeteSchema = z.object({
  eventId: z.string().uuid("Invalid event."),
  code: z.string().trim().min(4, "Enter your access code.").max(64),
});

export const submitFlagSchema = z.object({
  challengeId: z.string().min(1),
  eventId: z.string().uuid(),
  trackId: z.string().min(1),
  teamId: z.string().min(1),
  teamName: z.string().trim().max(120).default(""),
  registrationId: z.string().min(1),
  flagCandidate: z.string().trim().min(1, "Please enter a flag.").max(200),
});

export type EnterCompeteInput = z.infer<typeof enterCompeteSchema>;
export type SubmitFlagInput = z.infer<typeof submitFlagSchema>;
