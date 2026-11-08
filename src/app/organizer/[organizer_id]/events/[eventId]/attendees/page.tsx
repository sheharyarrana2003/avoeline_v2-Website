import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  eventIsHackathon,
  listTeamsOfEvent,
  listTracks,
} from "@/src/features/hackathon/hackathon.service";
import { AssignLeftoverTeams } from "@/src/features/hackathon/components/AssignLeftoverTeams";
import { hackathonDashPath } from "@/src/features/hackathon/kinds";
import {
  AttendeeService,
  emptyAttendeeForUser,
  userFromRegistration,
} from "@/src/features/event_attendee/attendee.service";
import {
  AttendeeClientSide,
  AttendeeClientSideProp,
} from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { EventService } from "@/src/services/event.service";
import { UserService } from "@/src/services/user.service";
import { Registration } from "@/src/services/models/reg.type";
import {
  getSignedUrlsByPath,
  CERTIFICATES_BUCKET,
  PAYMENT_SCREENSHOTS_BUCKET,
} from "@/data/supabase";
import {
  fieldsToCustomForm,
  listAllFields,
} from "@/src/features/registration/forms/formFields.service";
import { exportEventSheetAction } from "@/src/features/exports/actions/exportEventSheet.action";
import { promoteFromWaitlist } from "@/src/features/access/actions/registrationDecision.action";
import { maybeRevealHackathonAccessCodes } from "@/src/features/hackathon/accessCodes.service";
import {
  maybeAutoEventEmail,
  listEventEmailTemplates,
} from "@/src/features/event_attendee/eventEmail.service";
import {
  occupyingGroupRegs,
  occupyingHackathonRegs,
} from "@/src/features/registration/registration.service";
import { assertEventActor } from "@/src/features/events/ownership";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import { teamFeeDisplay } from "@/src/features/event_attendee/roster";
import { trackDueAmount } from "@/src/features/hackathon/types";
import { hasActiveOrganizerEmailConnection } from "@/src/features/email/organizerEmailConnection.service";
import { AttendeeImportPanel } from "@/src/features/event_attendee/import/AttendeeImportPanel";
import { parseScheduleDateTime } from "@/src/lib/datetime";
import { listConnections } from "@/src/features/connections/server/connections.service";
import { DriveHealthBanner } from "@/src/features/files/components/DriveHealthBanner";
import { RegistrationQuestionsCard } from "@/src/features/registration/forms/components/RegistrationQuestionsCard";
import { getSheetSyncForEvent } from "@/src/features/connections/server/sheetSync.service";
import { listPhasesForEvent } from "@/src/features/hackathon/tasks.service";
import { joinCodeValidUntilIso } from "@/src/features/hackathon/joinCodeValidity";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const resolvedParams = await params;
  const event_id = resolvedParams.eventId;
  const organizer_id = resolvedParams.organizer_id;

  // Needed only for its access settings, which decide where a paid registration
  // lands once payment clears.
  const eventForAccess = await EventService.getEventByID(event_id);
  if (!eventForAccess) {
    notFound();
  }
  if (eventForAccess.requiresRegistration === false) {
    redirect(
      (await eventIsHackathon(eventForAccess))
        ? hackathonDashPath(eventForAccess.organizerId, event_id)
        : `/organizer/${eventForAccess.organizerId}/events/${event_id}`,
    );
  }

  const eventEndsAtIso =
    parseScheduleDateTime(
      eventForAccess.schedule?.endDate ?? eventForAccess.schedule?.startDate,
      eventForAccess.schedule?.endTime,
    )?.toISOString() ?? null;

  // Overlap ACL with the registration list (independent reads; unauthorized
  // callers still fail before any client payload is built).
  const [owned, regs, sheetConnected] = await Promise.all([
    assertEventActor(event_id, "attendees"),
    RegService.getRegsOfEvent(event_id),
    (async () => {
      const conns = await listConnections({
        ownerType: "user",
        ownerId: eventForAccess.organizerId,
      });
      const drive = conns.some((c) =>
        c.capabilities.some((cap) => cap.capability === "drive.files" && cap.enabled),
      );
      if (!drive) return false;
      const syncs = await getSheetSyncForEvent(event_id);
      return syncs.length > 0;
    })(),
  ]);
  if (!owned) {
    redirect("/access-denied?reason=unauthorized_attendee_list");
  }

  let attendeesWithUsers: AttendeeClientSideProp[] = [];
  if (regs.length) {
    const userIds = regs.map((r) => r.userId).filter(Boolean);
    const [usersById, attendeesByUser] = await Promise.all([
      UserService.getUsersByIds(userIds),
      AttendeeService.getAttendeeProfilesByUserIds(userIds),
    ]);

    // O1: file:{uuid} → /api/files; legacy Supabase paths still signed.
    const proofPaths = regs.map((r) => r.payment?.proofPath).filter((p): p is string => !!p);
    const legacyProofs = proofPaths.filter(
      (p) =>
        !p.startsWith("registration/") &&
        !p.startsWith("file:") &&
        !p.startsWith("drive:") &&
        !p.startsWith("/api/files/") &&
        !p.includes("drive.google.com/"),
    );
    const regProofs = proofPaths.filter((p) => p.startsWith("registration/"));
    const [signedLegacy, signedReg] = await Promise.all([
      getSignedUrlsByPath(CERTIFICATES_BUCKET, legacyProofs),
      getSignedUrlsByPath(PAYMENT_SCREENSHOTS_BUCKET, regProofs),
    ]);
    const proofUrls = new Map<string, string>();
    for (const r of regs) {
      const path = r.payment?.proofPath;
      if (!path) continue;
      if (path.startsWith("file:")) {
        proofUrls.set(r.registrationId, `/api/files/${path.slice("file:".length)}`);
        continue;
      }
      if (path.startsWith("/api/files/")) {
        proofUrls.set(r.registrationId, path);
        continue;
      }
      // Legacy drive: refs are not publicly viewable — organizers open via Files tab / re-upload.
      if (path.startsWith("drive:") || path.includes("drive.google.com/")) {
        continue;
      }
      const url = signedReg.get(path) ?? signedLegacy.get(path);
      if (url) proofUrls.set(r.registrationId, url);
    }

    attendeesWithUsers = regs.map((register) => ({
      a:
        attendeesByUser.get(String(register.userId)) ??
        emptyAttendeeForUser(String(register.userId)),
      // No `!` here: a public registration has no account to find, and a
      // deleted user resolves to nothing either. Both used to hand the list
      // `undefined` and crash it on the first property access.
      user: usersById.get(String(register.userId)) ?? userFromRegistration(register),
      register,
      proofUrl: proofUrls.get(register.registrationId) ?? null,
    }));
  }

  const handle_reg_status = async (registeration: Registration) => {
    "use server";
    if (!(await assertEventActor(event_id, "attendees"))) {
      throw new Error("You cannot update registrations for that event.");
    }
    await RegService.updateReg(registeration);

    // Cancelling or rejecting releases a seat, and there are no background
    // jobs here, so promotion has to be a consequence of the write that made
    // room. Never throws -- a failed promotion must not look like a failed
    // status change.
    if (registeration.status === "cancelled" || registeration.status === "rejected") {
      await promoteFromWaitlist(event_id);
    }

    await maybeRevealHackathonAccessCodes(registeration.registrationId);
    await maybeAutoEventEmail(registeration.registrationId);
    revalidatePath(`/organizer/${eventForAccess.organizerId}/events/${event_id}/attendees`);
    revalidatePath(`/organizer/${eventForAccess.organizerId}/events/${event_id}`);
  };

  // No padding and no event title here: the event layout renders both, and this
  // page's job is the Attendees section of it.
  // Bound here so the client never sees an event id it could swap; the action
  // re-checks ownership regardless.
  const handle_export = async () => {
    "use server";
    return exportEventSheetAction({ eventId: event_id, kind: "attendees", format: "xlsx" });
  };

  const isHackathon = await eventIsHackathon(eventForAccess);
  const groupRegistration = !isHackathon && !!eventForAccess.registration?.groupRegistration;
  const [hackTracks, hackTeams, regGroups, emailTemplates, allFormFields, emailConnected, phases] =
    await Promise.all([
      isHackathon ? listTracks(event_id) : Promise.resolve([]),
      isHackathon ? listTeamsOfEvent(event_id) : Promise.resolve([]),
      groupRegistration ? listRegistrationGroups(event_id) : Promise.resolve([]),
      listEventEmailTemplates(event_id),
      listAllFields(event_id).catch(() => []),
      hasActiveOrganizerEmailConnection(eventForAccess.organizerId),
      isHackathon ? listPhasesForEvent(event_id).catch(() => []) : Promise.resolve([]),
    ]);
  const joinValidUntilIso = joinCodeValidUntilIso({
    eventEndsAtIso,
    phaseCloses: phases.map((p) => p.closes_at || p.ends_at || null),
  });
  const checkInActorIds = [
    ...new Set(
      regs
        .map((r) => r.checkIn?.checkedInBy)
        .filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];
  const checkInActors = checkInActorIds.length
    ? await UserService.getUsersByIds(checkInActorIds)
    : new Map();
  const checkInByNames: Record<string, string> = {};
  for (const id of checkInActorIds) {
    const u = checkInActors.get(id);
    const name = u?.profile?.fullName || u?.email || "";
    if (name) checkInByNames[id] = name;
  }
  const keysWithData = new Set<string>();
  for (const r of regs) {
    const answers = r.customResponses || {};
    for (const [k, v] of Object.entries(answers)) {
      if (v != null && String(v).trim() !== "") keysWithData.add(k);
    }
  }
  const formQuestions =
    allFormFields.length > 0
      ? fieldsToCustomForm(
          allFormFields.filter((f) => {
            if (["name", "email", "phone"].includes(f.key)) return false;
            if (!f.archivedAt) return true;
            return keysWithData.has(f.key);
          }),
        )
      : (eventForAccess.registration?.customForm ?? []);

  // Signed downloads for file-type custom answers (incl archived fields with data).
  const fileKeys = new Set(
    allFormFields
      .filter((f) => f.type === "file" && (!f.archivedAt || keysWithData.has(f.key)))
      .map((f) => f.key),
  );
  const answerFilePaths: string[] = [];
  for (const r of regs) {
    const answers = r.customResponses || {};
    for (const key of fileKeys) {
      const val = answers[key];
      if (typeof val === "string" && val.startsWith("registration/")) answerFilePaths.push(val);
    }
  }
  const answerFileUrls = await getSignedUrlsByPath(PAYMENT_SCREENSHOTS_BUCKET, answerFilePaths);
  const answerFilesByReg = new Map<string, Record<string, string>>();
  for (const r of regs) {
    const answers = r.customResponses || {};
    const map: Record<string, string> = {};
    for (const key of fileKeys) {
      const val = answers[key];
      if (typeof val === "string" && answerFileUrls.has(val)) map[key] = answerFileUrls.get(val)!;
    }
    if (Object.keys(map).length) answerFilesByReg.set(r.registrationId, map);
  }
  attendeesWithUsers = attendeesWithUsers.map((row) => ({
    ...row,
    answerFileUrls: answerFilesByReg.get(row.register.registrationId) ?? null,
  }));
  const teamedIds = new Set(hackTeams.flatMap((t) => t.members.map((m) => m.registrationId)));
  const leftover = attendeesWithUsers.filter((row) => !teamedIds.has(row.register.registrationId));
  const assignReturn = hackathonDashPath(eventForAccess.organizerId, event_id, "attendees");

  const extraProofPaths = [
    ...regGroups.map((g) => g.paymentProofPath).filter((p): p is string => !!p),
    ...hackTeams.map((t) => t.feeProofPath).filter((p): p is string => !!p),
  ];
  const extraSigned = await getSignedUrlsByPath(CERTIFICATES_BUCKET, extraProofPaths);

  const groups = groupRegistration
    ? regGroups.map((g) => {
        const members = attendeesWithUsers.filter((row) =>
          g.memberIds.includes(row.register.registrationId),
        );
        const lead =
          members.find((m) => m.register.registrationId === g.leadRegistrationId) ?? members[0];
        const proofUrl =
          lead?.proofUrl ??
          (g.paymentProofPath ? (extraSigned.get(g.paymentProofPath) ?? null) : null);
        const fee = teamFeeDisplay({
          leadAmount: lead?.register.finalPrice,
          leadPayment: lead?.register.payment?.paymentStatus ?? g.paymentStatus,
        });
        return {
          id: g.id,
          name: g.groupName,
          members,
          payment: fee.payment,
          accessCode: undefined,
          amount: fee.amount,
          currency: lead?.register.payment?.currency || "PKR",
          proofUrl,
        };
      })
    : undefined;

  const teams = isHackathon
    ? hackTeams.map((t) => {
        const leadId =
          t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId ?? null;
        const lead = attendeesWithUsers.find((row) => row.register.registrationId === leadId);
        const path = t.feeProofPath || lead?.register.payment?.proofPath;
        const proofUrl = path ? (extraSigned.get(path) ?? lead?.proofUrl ?? null) : null;
        const track = hackTracks.find((tr) => tr.id === t.trackId);
        const fee = teamFeeDisplay({
          feeStatus: t.feeStatus,
          trackFee: track ? trackDueAmount(track) : 0,
          leadAmount: lead?.register.finalPrice,
          leadPayment: lead?.register.payment?.paymentStatus,
        });
        return {
          id: t.id,
          name: t.name,
          trackName: track?.name ?? "Competition",
          accessCode: t.accessCode,
          joinCode: t.joinCode || null,
          memberIds: t.memberRegistrationIds,
          leadId,
          payment: fee.payment,
          feeStatus: t.feeStatus,
          amount: fee.amount,
          currency: lead?.register.payment?.currency || "PKR",
          proofUrl,
          trackId: t.trackId,
          eliminated: t.eliminatedAtRound != null,
          joinCodeRevoked: Boolean(t.joinCodeRevoked),
        };
      })
    : undefined;

  return (
    <>
      <DriveHealthBanner
        organizerId={eventForAccess.organizerId}
        eventId={event_id}
        connectionsHref={`/organizer/${organizer_id}/connections`}
      />
      <AttendeeClientSide
        attendees={attendeesWithUsers}
        handle_reg_status={handle_reg_status}
        onExport={handle_export}
        occupyingCount={
          isHackathon
            ? occupyingHackathonRegs(regs, hackTeams).length
            : groupRegistration
              ? occupyingGroupRegs(regs, regGroups).length
              : undefined
        }
        defaultGrouped={isHackathon || groupRegistration}
        groups={groups}
        requiresApproval={!!eventForAccess?.access?.requiresApproval}
        eventId={event_id}
        organizerId={eventForAccess.organizerId}
        emailTemplates={emailTemplates}
        questions={formQuestions}
        teams={teams}
        isFree={
          eventForAccess.pricing?.isFree === true || Number(eventForAccess.PriceOfTicket ?? 0) <= 0
        }
        emailConnectionMissing={!emailConnected}
        sheetsConnected={sheetConnected}
        exportsHref={`/organizer/${organizer_id}/events/${event_id}/exports`}
        eventEndsAtIso={joinValidUntilIso || eventEndsAtIso}
        checkInByNames={checkInByNames}
        registrationForm={<RegistrationQuestionsCard eventId={event_id} bare />}
        extra={
          <>
            <AttendeeImportPanel eventId={event_id} />
            {isHackathon ? (
              <AssignLeftoverTeams
                eventId={event_id}
                returnTo={assignReturn}
                leftover={leftover}
                tracks={hackTracks.map((t) => ({
                  id: t.id,
                  name: t.name,
                  maxTeamSize: t.maxTeamSize,
                }))}
                teams={hackTeams.map((t) => ({
                  id: t.id,
                  name: t.name,
                  trackId: t.trackId,
                  size: t.members.length,
                  maxTeamSize: t.maxTeamSize,
                }))}
              />
            ) : null}
          </>
        }
      />
    </>
  );
}
