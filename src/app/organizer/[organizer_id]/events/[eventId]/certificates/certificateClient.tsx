"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type {
  CertificateGenerationAttendeeResult,
  CertificateGenerationResult,
  CertificateRow,
} from "@/src/features/certificates/types";
import { CERTIFICATE_ROLES } from "@/src/features/certificates/types";
import { formatDateMedium } from "@/src/lib/datetime";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ConfirmButton } from "@/src/shared_components/ui/ConfirmDialog";
import { DownloadCertificate } from "@/src/features/certificates/components/DownloadCertificate";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { CapacityStrip } from "@/src/features/connections/components/CapacityStrip";
import { SenderPicker } from "@/src/features/connections/components/SenderPicker";
import { buttonClass, fieldClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { Award, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface AttendeeCertProp {
  registrationId: string;
  name: string;
  email: string;
  checkedIn: boolean;
  certStatus: CertificateRow | null;
}

interface CertificateIssuanceClientProps {
  attendees: AttendeeCertProp[];
  eventId: string;
  organizerId: string;
  driveConnected?: boolean;
  onGenerateCertificates: (
    selectedAttendeeIds: string[],
    roles: Record<string, string>,
    opts?: { archiveToDrive?: boolean },
  ) => Promise<CertificateGenerationResult>;
  onEmailCertificates: (
    resend: boolean,
    opts?: { includeDriveLink?: boolean; acknowledgeDriveShareWarning?: boolean },
  ) => Promise<{
    success: boolean;
    error?: string;
    sent?: number;
    skipped?: number;
    queued?: number;
    message?: string;
  }>;
}

const ITEMS_PER_PAGE = 10;

export default function CertificateIssuanceClient({
  attendees,
  eventId,
  organizerId,
  driveConnected = false,
  onGenerateCertificates,
  onEmailCertificates,
}: CertificateIssuanceClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [issuedPage, setIssuedPage] = useState(1);
  const [isGenerating, startGenerating] = useTransition();
  const [generationResultsByUserId, setGenerationResultsByUserId] = useState<
    Record<string, CertificateGenerationAttendeeResult>
  >({});
  const [generationSummary, setGenerationSummary] = useState<string | null>(null);
  const [isEmailing, startEmailing] = useTransition();
  const [emailSummary, setEmailSummary] = useState<string | null>(null);
  const [senderConnectionId, setSenderConnectionId] = useState<string | null>(null);
  const [archiveToDrive, setArchiveToDrive] = useState(driveConnected);
  const [includeDriveLink, setIncludeDriveLink] = useState(false);

  const pathName = usePathname();

  const issuedAttendees = useMemo(
    () => attendees.filter((a) => a.certStatus?.status === "issued"),
    [attendees],
  );

  const pendingAttendees = useMemo(
    () => attendees.filter((a) => !a.certStatus || a.certStatus.status === "revoked"),
    [attendees],
  );

  const totalAttendees = attendees.length;

  const unsentCount = useMemo(
    () =>
      attendees.filter(
        (a) =>
          a.certStatus && a.certStatus.status !== "revoked" && !a.certStatus.emailedAt && a.email,
      ).length,
    [attendees],
  );
  const sentCount = useMemo(
    () => attendees.filter((a) => a.certStatus?.emailedAt).length,
    [attendees],
  );
  const sendableCount = useMemo(
    () =>
      attendees.filter((a) => a.certStatus && a.certStatus.status !== "revoked" && a.email).length,
    [attendees],
  );

  const filteredPendingAttendees = useMemo(() => {
    if (!searchQuery) return pendingAttendees;
    const q = searchQuery.toLowerCase();
    return pendingAttendees.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q),
    );
  }, [pendingAttendees, searchQuery]);

  const filteredIssuedAttendees = useMemo(() => {
    if (!searchQuery) return issuedAttendees;
    const q = searchQuery.toLowerCase();
    return issuedAttendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.certStatus?.verificationCode?.toLowerCase().includes(q),
    );
  }, [issuedAttendees, searchQuery]);

  const pendingTotalPages = Math.max(
    1,
    Math.ceil(filteredPendingAttendees.length / ITEMS_PER_PAGE),
  );
  const paginatedPendingAttendees = filteredPendingAttendees.slice(
    (pendingPage - 1) * ITEMS_PER_PAGE,
    pendingPage * ITEMS_PER_PAGE,
  );

  const issuedTotalPages = Math.max(1, Math.ceil(filteredIssuedAttendees.length / ITEMS_PER_PAGE));
  const paginatedIssuedAttendees = filteredIssuedAttendees.slice(
    (issuedPage - 1) * ITEMS_PER_PAGE,
    issuedPage * ITEMS_PER_PAGE,
  );

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAttendees(new Set());
      setSelectAll(false);
    } else {
      setSelectedAttendees(new Set(filteredPendingAttendees.map((a) => a.registrationId)));
      setSelectAll(true);
    }
  };

  const handleSelectCheckedIn = () => {
    const ids = filteredPendingAttendees.filter((a) => a.checkedIn).map((a) => a.registrationId);
    setSelectedAttendees(new Set(ids));
    setSelectAll(ids.length > 0 && ids.length === filteredPendingAttendees.length);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectAll(
        next.size === filteredPendingAttendees.length && filteredPendingAttendees.length > 0,
      );
      return next;
    });
  };

  const handleGenerate = () => {
    const selected = Array.from(selectedAttendees);
    if (!selected.length) {
      setGenerationSummary("Select at least one registrant.");
      return;
    }
    startGenerating(async () => {
      setGenerationSummary(null);
      const result = await onGenerateCertificates(selected, roles, {
        archiveToDrive: driveConnected && archiveToDrive,
      });
      setGenerationSummary(result.message);
      const byReg: Record<string, CertificateGenerationAttendeeResult> = {};
      for (const r of result.results) byReg[r.registrationId] = r;
      setGenerationResultsByUserId(byReg);
      if (result.success && result.count > 0) {
        setSelectedAttendees(new Set());
        setSelectAll(false);
      }
    });
  };

  const handleEmail = (resend: boolean) => {
    startEmailing(async () => {
      setEmailSummary(null);
      const result = await onEmailCertificates(resend, {
        includeDriveLink: includeDriveLink && driveConnected,
        acknowledgeDriveShareWarning: includeDriveLink && driveConnected,
      });
      if (!result.success) {
        setEmailSummary(result.error || "Could not send emails.");
        return;
      }
      setEmailSummary(
        result.message ||
          `Queued ${result.queued ?? result.sent ?? 0} email${
            (result.queued ?? result.sent ?? 0) === 1 ? "" : "s"
          }${result.skipped ? ` (${result.skipped} without address)` : ""}.`,
      );
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-ink">Certificates</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Issue digital certificates, email verify/download links, and open the template editor.
          </p>
        </div>
        <Link href={`${pathName}/making-template`} className={buttonClass("secondary", "sm")}>
          Edit template
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Registrants" value={String(totalAttendees)} icon={<Users size={16} />} />
        <MetricTile
          label="Issued"
          value={String(issuedAttendees.length)}
          icon={<Award size={16} />}
        />
        <MetricTile label="Not emailed yet" value={String(unsentCount)} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Pending issuance</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPendingPage(1);
                setIssuedPage(1);
              }}
              placeholder="Search name or email"
              className={fieldClass}
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleSelectCheckedIn}>
              Select checked-in
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll}>
              {selectAll ? "Clear selection" : "Select all"}
            </Button>
            <ConfirmButton
              title="Issue certificates"
              description="Creates certificate records only. PDFs render on demand. Drive archive (if enabled) runs in the background."
              confirmLabel={isGenerating ? "Issuing…" : `Issue (${selectedAttendees.size})`}
              onConfirm={handleGenerate}
              disabled={isGenerating || selectedAttendees.size === 0}
              className={buttonClass("primary", "sm")}
            >
              {isGenerating ? "Issuing…" : `Issue (${selectedAttendees.size})`}
            </ConfirmButton>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={archiveToDrive && driveConnected}
            disabled={!driveConnected}
            onChange={(e) => setArchiveToDrive(e.target.checked)}
          />
          <span>
            Save a copy to my Drive{" "}
            <span className="text-ink-soft">
              (Certificates folder; private archive
              {driveConnected ? "; default on" : " — connect Drive to enable"})
            </span>
          </span>
        </label>

        {generationSummary ? <p className="text-sm text-ink-soft">{generationSummary}</p> : null}

        {paginatedPendingAttendees.length === 0 ? (
          <EmptyState
            title="No pending registrants"
            description="Everyone eligible already has a certificate, or the list is empty."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className={tableRow}>
                  <th className={tableHead}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      aria-label="Select all pending"
                    />
                  </th>
                  <th className={tableHead}>Name</th>
                  <th className={tableHead}>Email</th>
                  <th className={tableHead}>Role</th>
                  <th className={tableHead}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPendingAttendees.map((a) => (
                  <tr key={a.registrationId} className={tableRow}>
                    <td className={tableCell}>
                      <input
                        type="checkbox"
                        checked={selectedAttendees.has(a.registrationId)}
                        onChange={() => toggleAttendee(a.registrationId)}
                        aria-label={`Select ${a.name}`}
                      />
                    </td>
                    <td className={tableCell}>{a.name}</td>
                    <td className={tableCell}>{a.email || "—"}</td>
                    <td className={tableCell}>
                      <select
                        className={fieldClass}
                        value={roles[a.registrationId] || "Attendee"}
                        onChange={(e) =>
                          setRoles((prev) => ({ ...prev, [a.registrationId]: e.target.value }))
                        }
                      >
                        {CERTIFICATE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tableCell}>
                      {generationResultsByUserId[a.registrationId]?.error ? (
                        <span className="text-xs text-red-600">
                          {generationResultsByUserId[a.registrationId]?.error}
                        </span>
                      ) : (
                        <StatusBadge status="pending" size="sm" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendingTotalPages > 1 ? (
          <Pager page={pendingPage} total={pendingTotalPages} onChange={setPendingPage} />
        ) : null}
      </section>

      <section className="space-y-3">
        <CapacityStrip ownerId={organizerId} kind="certificate" eventId={eventId} />
        <SenderPicker
          eventId={eventId}
          value={senderConnectionId}
          onChange={setSenderConnectionId}
        />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={includeDriveLink && driveConnected}
            disabled={!driveConnected}
            onChange={(e) => setIncludeDriveLink(e.target.checked)}
          />
          <span>
            Include Drive link in email{" "}
            <span className="text-ink-soft">
              (requires share-by-link — anyone with that link can view the file)
            </span>
          </span>
        </label>
        {includeDriveLink && driveConnected ? (
          <p className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs text-ink-soft">
            Warning: anyone with the Google Drive link can view that file. Website certificate links
            stay access-controlled by code and work even if Drive is down.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Issued</h2>
          <div className="flex flex-wrap gap-2">
            <ConfirmButton
              title="Email certificates"
              description={`Queue website certificate links for ${unsentCount} recipient${unsentCount === 1 ? "" : "s"} (docs/18 capacity).${
                includeDriveLink
                  ? " Drive share links will be included — anyone with those links can view the files."
                  : ""
              }`}
              confirmLabel={isEmailing ? "Queuing…" : `Email new (${unsentCount})`}
              onConfirm={() => handleEmail(false)}
              disabled={isEmailing || unsentCount === 0}
              className={buttonClass("primary", "sm")}
            >
              {isEmailing ? "Queuing…" : `Email new (${unsentCount})`}
            </ConfirmButton>
            <ConfirmButton
              title="Resend all certificate emails"
              description={`Resend links to all ${sendableCount} issued certificates with an email address (${sentCount} were emailed before).`}
              confirmLabel={isEmailing ? "Queuing…" : "Resend all"}
              onConfirm={() => handleEmail(true)}
              disabled={isEmailing || sendableCount === 0}
              className={buttonClass("secondary", "sm")}
            >
              {isEmailing ? "Queuing…" : "Resend all"}
            </ConfirmButton>
          </div>
        </div>

        {emailSummary ? <p className="text-sm text-ink-soft">{emailSummary}</p> : null}

        {paginatedIssuedAttendees.length === 0 ? (
          <EmptyState
            title="No certificates issued yet"
            description="Select registrants above and issue certificates."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className={tableRow}>
                  <th className={tableHead}>Name</th>
                  <th className={tableHead}>Verification code</th>
                  <th className={tableHead}>Issued</th>
                  <th className={tableHead}>Email</th>
                  <th className={tableHead}>Downloads</th>
                  <th className={tableHead} />
                </tr>
              </thead>
              <tbody>
                {paginatedIssuedAttendees.map((a) => {
                  const cert = a.certStatus!;
                  return (
                    <tr key={a.registrationId} className={tableRow}>
                      <td className={tableCell}>
                        <div className="font-medium text-ink">{a.name}</div>
                        <div className="text-xs text-ink-soft">{cert.data.role || "Attendee"}</div>
                      </td>
                      <td className={tableCell}>
                        <span className="font-mono text-xs">{cert.verificationCode}</span>
                      </td>
                      <td className={tableCell}>
                        {formatDateMedium(cert.issuedAt || cert.createdAt)}
                      </td>
                      <td className={tableCell}>
                        {cert.emailedAt ? (
                          <span className="text-xs text-ink-soft">
                            Sent {formatDateMedium(cert.emailedAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-faint">Not sent</span>
                        )}
                      </td>
                      <td className={tableCell}>{cert.downloadCount}</td>
                      <td className={tableCell}>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/verify/${cert.verificationCode}`}
                            className={buttonClass("secondary", "sm")}
                            target="_blank"
                          >
                            Verify
                          </Link>
                          <DownloadCertificate
                            verificationCode={cert.verificationCode}
                            label="PDF"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {issuedTotalPages > 1 ? (
          <Pager page={issuedPage} total={issuedTotalPages} onChange={setIssuedPage} />
        ) : null}
      </section>
    </div>
  );
}

function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={14} />
      </Button>
      <span className="text-xs text-ink-soft">
        {page} / {total}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
