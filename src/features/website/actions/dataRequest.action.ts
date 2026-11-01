"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { sendPlatformEmail } from "@/src/lib/email/resend";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { hashIp } from "../consent.logic";
import { isContactHoneypotTripped, sanitizeContactHeader } from "../contact.shared";

export const submitDataRequestAction = safeAction({
  input: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email().max(320),
    requestType: z.enum(["access", "deletion"]),
    message: z.string().trim().max(5000).optional().default(""),
    website: z.string().optional(), // honeypot
  }),
  async run(input) {
    if (isContactHoneypotTripped(input.website ?? "")) {
      return safeOk({ ticketId: "ok" });
    }

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "anon";
    const ipHash = hashIp(ip);
    const limited = rateLimit(`dsar:${ipHash}`, 5, 3600);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", "Too many requests. Try again later.");
    }

    const name = sanitizeContactHeader(input.name);
    const subject =
      input.requestType === "access" ? "Data request: access" : "Data request: deletion";
    const body = [
      `Type: ${input.requestType}`,
      `Name: ${name}`,
      `Email: ${input.email}`,
      input.message ? `Message:\n${input.message}` : "",
      `IP hash: ${ipHash}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data, error } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .insert({
        subject,
        body,
        from_email: input.email,
        from_role: "public",
        status: "open",
        extra: {
          kind: "data_request",
          requestType: input.requestType,
          ip_hash: ipHash,
        },
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return safeFail("SAVE_FAILED", error?.message ?? "Could not create request.");
    }

    void sendPlatformEmail({
      lane: "support",
      to: "info@aroxes.com",
      subject: `[DSAR] ${subject}`,
      text: body,
      replyTo: input.email,
    });

    return safeOk({ ticketId: data.id });
  },
});
