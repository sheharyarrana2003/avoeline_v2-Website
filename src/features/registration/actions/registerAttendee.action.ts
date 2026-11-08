"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { ActionResult, fail } from "@/src/lib/action";
import { rateLimit } from "@/src/lib/rateLimit";
import { createPublicRegistration, getPublicEvent, isPaidEvent } from "../registration.service";
import { getTrack, listTracks } from "@/src/features/hackathon/hackathon.service";
import { createHackathonTeamWithMembers } from "@/src/features/hackathon/teamWrite";
import { joinCodeTaken } from "@/src/features/hackathon/hackathon.service";
import { makeJoinCode } from "@/src/features/hackathon/types";
import { trackDueAmount } from "@/src/features/hackathon/types";
import { maybeAutoEventEmail } from "@/src/features/event_attendee/eventEmail.service";
import type { RegistrationRefusal } from "@/src/features/registration/types";
import { AuthService } from "@/src/features/auth/authService";
import {
  attachRegistrationsToGroup,
  createRegistrationGroup,
} from "@/src/features/registration_groups/groups.service";
import { listActiveFields } from "../forms/formFields.service";
import {
  buildMemberRegistrationSchema,
  buildRegistrationSchema,
} from "../forms/buildRegistrationSchema";
import { registrationUploadExists } from "./requestRegistrationUpload.action";
import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { EventFormField } from "../forms/formFields.types";
import { assertOrganizerDriveAndGmail } from "@/src/features/connections/server/assertOrganizerDriveAndGmail";

const REFUSAL_MESSAGE: Record<RegistrationRefusal, string> = {
  event_not_found: "This event is no longer open for registration.",
  event_closed: "Registration for this event has closed.",
  event_full: "This event is fully booked.",
  already_registered: "That email address is already registered for this event.",
  needs_code: "This is a private event. Enter the access code to register.",
  bad_code: "That access code is not right.",
  needs_invite: "This event is invite only. Please use the link you were sent.",
  invite_expired: "That invitation has expired.",
  invite_used: "That invitation has already been used.",
  not_whitelisted: "That email address cannot register for this event.",
  tier_locked: "That ticket tier needs the access code for this event.",
  tier_unavailable: "That ticket tier is sold out or no longer available.",
  track_required: "Choose a competition to enter.",
  track_ended: "That competition has ended. Choose another one.",
};

const SYSTEM_KEYS = new Set(["name", "email", "phone", "payment_screenshot"]);

function readFieldValue(formData: FormData, field: EventFormField, prefix = ""): unknown {
  const name = `${prefix}${field.key}`;
  if (field.type === "checkbox") {
    if ((field.options ?? []).length) {
      return formData
        .getAll(`${name}[]`)
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
    return formData.get(name) !== null;
  }
  if (field.type === "file") {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as { path?: string; bucket?: string };
      if (parsed?.path) return { path: parsed.path, bucket: parsed.bucket };
    } catch {
      /* plain path */
      return { path: raw };
    }
    return undefined;
  }
  const text = String(formData.get(name) ?? "").trim();
  if (field.type === "number") return text === "" ? undefined : Number(text);
  return text;
}

function answersFromFields(
  formData: FormData,
  fields: EventFormField[],
  prefix = "",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    out[field.key] = readFieldValue(formData, field, prefix);
  }
  return out;
}

function splitSystemAnswers(answers: Record<string, unknown>) {
  const name = String(answers.name ?? "").trim();
  const email = String(answers.email ?? "").trim();
  const phone = String(answers.phone ?? "").trim();
  const custom: Record<string, string | number | boolean> = {};
  let proofPath: string | null = null;
  for (const [key, value] of Object.entries(answers)) {
    if (SYSTEM_KEYS.has(key) && key !== "payment_screenshot") continue;
    if (key === "website") continue;
    if (key === "payment_screenshot") {
      if (value && typeof value === "object" && "path" in value) {
        proofPath = String((value as { path: string }).path);
      }
      continue;
    }
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object" && value !== null && "path" in value) {
      custom[key] = String((value as { path: string }).path);
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") custom[key] = value;
    else if (Array.isArray(value)) custom[key] = value.join(", ");
    else custom[key] = String(value);
  }
  return { name, email, phone, custom, proofPath };
}

async function verifyFileAnswers(answers: Record<string, unknown>, fields: EventFormField[]) {
  for (const field of fields) {
    if (field.type !== "file") continue;
    const value = answers[field.key];
    if (!value) {
      if (field.required) return `${field.label} is required.`;
      continue;
    }
    const path =
      typeof value === "object" && value && "path" in value
        ? String((value as { path: string }).path)
        : String(value);
    if (!(await registrationUploadExists(path))) {
      return `${field.label} upload could not be verified. Please upload again.`;
    }
  }
  return null;
}

export async function registerAttendeeAction(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limited = rateLimit(`register:${eventId}:${ip}`, 8, 60);
    if (!limited.ok) return fail("Too many registrations from this network. Please wait a minute.");

    // Honeypot
    if (String(formData.get("website") ?? "").trim()) {
      return fail("Registration could not be completed.");
    }

    const legalAccepted =
      formData.get("legalAccepted") === "1" || formData.get("legalAccepted") === "on";
    const communityOptIn =
      formData.get("communityOptIn") === "1" || formData.get("communityOptIn") === "on";
    if (!legalAccepted) {
      return fail("You must accept the Terms and Privacy Policy to register.");
    }

    const attempt = {
      token: String(formData.get("inviteToken") ?? "").trim() || null,
      code: String(formData.get("accessCode") ?? "").trim() || null,
    };
    const promoCode = String(formData.get("promoCode") ?? "").trim();
    const ticketTierId = String(formData.get("ticketTierId") ?? "").trim();
    const tier = String(formData.get("tier") ?? "").trim();
    const trackId = String(formData.get("trackId") ?? "").trim();

    const event = await getPublicEvent(eventId);
    if (!event) return fail(REFUSAL_MESSAGE.event_not_found);

    const fields = await listActiveFields(event.id);
    if (!fields.length) return fail("This event has no registration form configured yet.");

    const tracks = await listTracks(event.id);
    let amountDue = isPaidEvent(event) ? 1 : 0;
    const needsDriveGmail =
      amountDue > 0 ||
      fields.some((f) => f.type === "file" || f.key === "payment_screenshot") ||
      tracks.length > 0;
    if (needsDriveGmail) {
      const gate = await assertOrganizerDriveAndGmail(event.organizerId);
      if (!gate.ok) return fail(gate.error);
    }
    if (tracks.length) {
      const track =
        tracks.find((t) => t.id === trackId) ?? (trackId ? await getTrack(trackId) : null);
      if (!track || track.eventId !== event.id) return fail(REFUSAL_MESSAGE.track_required);
      if (track.status === "ended") return fail(REFUSAL_MESSAGE.track_ended);
      amountDue = trackDueAmount(track);
    }

    const groupRegister =
      formData.get("groupRegister") === "1" &&
      !!event.registration?.groupRegistration &&
      !tracks.length;

    const perGroupFields = fields.filter((f) => f.scope === "per_group");
    const perMemberFields = fields.filter((f) => f.scope === "per_member");
    const leadSchemaFields =
      groupRegister || tracks.length ? [...perMemberFields, ...perGroupFields] : fields;

    const leadAnswers = answersFromFields(formData, leadSchemaFields);
    leadAnswers.website = String(formData.get("website") ?? "");
    const leadParsed = buildRegistrationSchema(leadSchemaFields).safeParse(leadAnswers);
    if (!leadParsed.success) {
      return fail(leadParsed.error.issues[0]?.message || "Please check your answers.");
    }

    const fileErr = await verifyFileAnswers(leadAnswers, leadSchemaFields);
    if (fileErr) return fail(fileErr);

    const { name, email, phone, custom, proofPath } = splitSystemAnswers(leadAnswers);
    if (!email) return fail("Email is required.");

    const teamName = String(formData.get("teamName") ?? "").trim();
    const memberPeople: {
      name: string;
      email: string;
      phone: string;
      customResponses: Record<string, string | number | boolean>;
    }[] = [];

    if (tracks.length || groupRegister) {
      if (!teamName)
        return fail(groupRegister ? "Give your group a name." : "Give your team a name.");
      const track = tracks.length
        ? (tracks.find((t) => t.id === trackId) ?? (await getTrack(trackId)))
        : null;
      const maxTeam = groupRegister
        ? (event.registration?.groupMaxSize ?? 8)
        : (track?.maxTeamSize ?? 1);
      const minTeam = groupRegister ? (event.registration?.groupMinSize ?? 2) : 1;
      const extraCount = Math.max(
        0,
        Math.min(Number(formData.get("memberCount") ?? 0) || 0, Math.max(0, maxTeam - 1)),
      );
      if (groupRegister && extraCount + 1 < minTeam) {
        return fail(`This event needs groups of at least ${minTeam}.`);
      }
      const seen = new Set([email.toLowerCase()]);
      const memberSchema = buildMemberRegistrationSchema(perMemberFields);
      for (let i = 0; i < extraCount; i += 1) {
        const memberAnswers = answersFromFields(formData, perMemberFields, `member_${i}_`);
        const parsed = memberSchema.safeParse(memberAnswers);
        if (!parsed.success) {
          return fail(parsed.error.issues[0]?.message || `Please check member ${i + 2}'s answers.`);
        }
        const split = splitSystemAnswers(memberAnswers);
        if (!split.email) return fail("Each team member needs an email address.");
        if (seen.has(split.email.toLowerCase())) {
          return fail("Each team member needs a different email address.");
        }
        seen.add(split.email.toLowerCase());
        memberPeople.push({
          name: split.name,
          email: split.email,
          phone: split.phone,
          customResponses: split.custom,
        });
      }
    }

    // Prefer payment_screenshot field path; legacy paymentProof no longer used.
    let finalProof = proofPath;
    if (finalProof && !(await registrationUploadExists(finalProof))) {
      return fail("Payment screenshot could not be verified. Please upload again.");
    }

    const signedIn = await AuthService.getCurrentUser().catch(() => null);
    const metadata = {
      ipAddress: ip,
      userAgent: headerList.get("user-agent") ?? "",
      deviceType: /mobile|android|iphone/i.test(headerList.get("user-agent") ?? "")
        ? "mobile"
        : "desktop",
    };

    const result = await createPublicRegistration(
      eventId,
      {
        name,
        email,
        phone,
        tier,
        customResponses: custom,
        promoCode,
        ticketTierId,
        trackId,
      },
      {
        proofPath: finalProof,
        userId: signedIn?.userId ?? null,
        metadata,
        hackathonRole: tracks.length ? "team_lead" : undefined,
        groupRole: groupRegister ? "lead" : undefined,
        deferPromoRedeem: groupRegister,
      },
      attempt,
    );

    if (!result.ok) {
      if (result.refusal === "already_registered") {
        return fail("That email address is already registered for this event.");
      }
      return fail(REFUSAL_MESSAGE[result.refusal]);
    }

    const teamMembers = [{ registrationId: result.registrationId, name, email, isOwner: true }];

    for (const person of memberPeople) {
      const extra = await createPublicRegistration(
        eventId,
        {
          name: person.name,
          email: person.email,
          phone: person.phone,
          customResponses: person.customResponses,
          trackId,
        },
        {
          userId: null,
          metadata,
          holdForTeamPayment: amountDue > 0,
          skipCapacity: true,
          hackathonRole: tracks.length ? "participant" : undefined,
          groupRole: groupRegister ? "member" : undefined,
        },
        attempt,
      );
      if (!extra.ok) {
        if (extra.refusal === "already_registered") {
          return fail(`${person.email} is already registered for this event.`);
        }
        return fail(REFUSAL_MESSAGE[extra.refusal]);
      }
      teamMembers.push({
        registrationId: extra.registrationId,
        name: person.name,
        email: person.email,
        isOwner: false,
      });
    }

    if (groupRegister) {
      const group = await createRegistrationGroup({
        eventId: event.id,
        groupName: teamName,
        leadRegistrationId: result.registrationId,
        paymentStatus: amountDue > 0 ? "pending" : "completed",
        paymentProofPath: finalProof,
      });
      await attachRegistrationsToGroup(
        group.id,
        teamMembers.map((m) => m.registrationId),
      );

      if (result.promoId && result.listPrice > 0) {
        const redeemed = await TicketingService.redeemPromo({
          promoId: result.promoId,
          eventId: event.id,
          trackId: result.chosenTrackId,
          email,
          listPrice: result.listPrice,
          registrationId: null,
          groupId: group.id,
        });
        if ("total" in redeemed) {
          await supabaseAdmin
            .from(TABLES.REGISTRATIONS)
            .update({
              final_price: redeemed.total,
              amount_paid: redeemed.total,
              promo_code_used: redeemed.code,
              payment_proof_path: finalProof,
              updated_at: new Date().toISOString(),
            })
            .eq("id", result.registrationId);
        }
      }
    }

    if (tracks.length) {
      const track = tracks.find((t) => t.id === trackId) ?? (await getTrack(trackId));
      const team = await createHackathonTeamWithMembers({
        eventId: event.id,
        organizerId: event.organizerId,
        trackId,
        name: teamName,
        members: teamMembers,
        maxTeamSize: track?.maxTeamSize ?? teamMembers.length,
        fee: amountDue,
        feeProofPath: finalProof,
        allocateJoinCode: async () => {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const candidate = makeJoinCode();
            if (!(await joinCodeTaken(candidate))) return candidate;
          }
          return null;
        },
      });
      if (!team.ok) return fail(team.error);
    }

    if (finalProof) {
      await supabaseAdmin
        .from(TABLES.REGISTRATIONS)
        .update({
          payment_proof_path: finalProof,
          updated_at: new Date().toISOString(),
        })
        .eq("id", result.registrationId);
    }

    const ticketPath = `/events/${eventId}/ticket/${result.registrationId}`;
    await maybeAutoEventEmail(result.registrationId);

    try {
      const { recordLegalAcceptance, grantMarketingConsent } =
        await import("@/src/features/website/consent.service");
      const { hashIp } = await import("@/src/features/website/consent.logic");
      const ipHash = hashIp(ip);
      await recordLegalAcceptance({
        userId: signedIn?.userId ?? null,
        email,
        context: "event_registration",
        ipHash,
      });
      if (communityOptIn) {
        await grantMarketingConsent({
          email,
          userId: signedIn?.userId ?? null,
          source: "event_registration",
        });
      }
    } catch (consentErr) {
      console.error("[registerAttendeeAction] consent", consentErr);
    }

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(eventId, tracks.length ? ["attendees", "hackathon_teams"] : ["attendees"]);

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);
    redirect(ticketPath);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[registerAttendeeAction]", err);
    return fail("Something went wrong while registering you. Please try again.");
  }
}
