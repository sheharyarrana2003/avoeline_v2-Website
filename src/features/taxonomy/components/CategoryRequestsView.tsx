"use client";

import React, { useState } from "react";
import { Check, X, Clock, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import type { CategoryRequestDoc } from "../categoryEngine.types";
import { decideCategoryRequestAction } from "../actions/categoryEngine.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { formatDate } from "@/src/lib/datetime";

interface CategoryRequestsViewProps {
  requests: CategoryRequestDoc[];
}

export const CategoryRequestsView: React.FC<CategoryRequestsViewProps> = ({ requests }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayedRequests =
    filter === "pending"
      ? requests.filter((r) => r.status === "pending")
      : requests;

  const handleApprove = async (id: string) => {
    setError(null);
    setActionLoading(id);
    try {
      const res = await decideCategoryRequestAction(id, "approve");
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "Failed to approve request.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    setError(null);
    setActionLoading(rejectingId);
    try {
      const res = await decideCategoryRequestAction(
        rejectingId,
        "reject",
        adminNote.trim() || undefined
      );
      if (res.success) {
        setRejectingId(null);
        setAdminNote("");
        router.refresh();
      } else {
        setError(res.error || "Failed to reject request.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Counters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="inline-flex rounded-xl p-1 bg-muted">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === "pending"
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Review</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-warning-soft text-warning font-semibold">
              {requests.filter((r) => r.status === "pending").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>All Requests</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-ink font-semibold">
              {requests.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl text-xs border border-danger-line bg-danger-soft text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted border-b border-line text-ink-soft text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Category Name</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Requested By</th>
                <th className="px-6 py-3.5">Submitted</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {displayedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-soft">
                    {filter === "pending"
                      ? "No pending category requests. All caught up!"
                      : "No category requests recorded yet."}
                  </td>
                </tr>
              ) : (
                displayedRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:hover:bg-muted transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">
                        {req.name}
                      </div>
                      {req.adminNote && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-soft mt-1">
                          <MessageSquare className="w-3 h-3 text-ink-soft" />
                          <span>Note: {req.adminNote}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          req.type === "superCategory"
                            ? "bg-muted text-ink"
                            : "bg-muted text-ink-soft"
                        }`}
                      >
                        {req.type === "superCategory" ? "Super Category" : "Event Format"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-ink text-xs font-medium">
                        {req.requestedByName || "Organizer"}
                      </div>
                      <div className="text-[11px] text-ink-soft font-mono">
                        {req.requestedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-soft">
                      {req.createdAt ? formatDate(req.createdAt) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={req.status}
                        label={
                          req.status === "approved"
                            ? "Approved"
                            : req.status === "rejected"
                            ? "Rejected"
                            : "Pending"
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={actionLoading === req.id}
                            onClick={() => handleApprove(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === req.id}
                            onClick={() => {
                              setRejectingId(req.id);
                              setAdminNote("");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-danger-line bg-danger-soft text-danger hover:bg-muted transition disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-soft italic">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal with optional adminNote */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleReject}>
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-base font-semibold text-ink">
                  Reject Category Request
                </h3>
                <p className="text-xs text-ink-soft">
                  Provide an optional reason or note for the rejection.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>Admin Note (Optional)</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. This is already covered under Technology > Conference..."
                    className={fieldClass}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-muted">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  disabled={actionLoading === rejectingId}
                  className={buttonClass("ghost", "sm")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectingId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading === rejectingId ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
