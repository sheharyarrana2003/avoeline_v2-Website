"use client";

import React, { useState } from "react";
import { Plus, X, Send, Sparkles } from "lucide-react";
import { requestCategoryAction } from "../actions/categoryEngine.action";
import type { CategoryRequestType } from "../categoryEngine.types";
import { useToast } from "@/src/shared_components/ui/Toast";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

interface RequestCategoryModalProps {
  onRequested?: () => void;
  className?: string;
}

export const RequestCategoryModal: React.FC<RequestCategoryModalProps> = ({
  onRequested,
  className = "",
}) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryRequestType>("superCategory");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for the category.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await requestCategoryAction(name.trim(), type);
      if (res.success) {
        toast.success(
          `Request for "${name.trim()}" submitted! Admins will review it shortly.`
        );
        setName("");
        setType("superCategory");
        setIsOpen(false);
        onRequested?.();
      } else {
        setError(res.error || "Failed to submit request.");
        toast.error(res.error || "Failed to submit category request.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      toast.error(err?.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-ink hover:underline transition ${className}`}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Request a new category</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted text-ink flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">
                      Request New Category
                    </h3>
                    <p className="text-xs text-ink-soft">
                      Can&apos;t find your category? Submit it for admin approval.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-ink-soft hover:text-ink hover:text-ink transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg text-xs border border-danger-line bg-danger-soft text-danger">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Category Type</label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setType("superCategory")}
                      className={`p-3 rounded-xl border text-left text-xs transition ${
                        type === "superCategory"
                          ? "border-ink bg-muted text-ink font-semibold"
                          : "border-line text-ink-soft hover:bg-muted"
                      }`}
                    >
                      Super Category
                      <span className="block text-[11px] font-normal text-ink-soft mt-0.5">
                        Domain/Industry theme
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("eventFormat")}
                      className={`p-3 rounded-xl border text-left text-xs transition ${
                        type === "eventFormat"
                          ? "border-ink bg-muted text-ink font-semibold"
                          : "border-line text-ink-soft hover:bg-muted"
                      }`}
                    >
                      Event Format
                      <span className="block text-[11px] font-normal text-ink-soft mt-0.5">
                        Delivery/Event style
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Suggested Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      type === "superCategory"
                        ? "e.g. Esports & Gaming, Agriculture"
                        : "e.g. Masterclass, Pitch Competition"
                    }
                    className={fieldClass}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-muted">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className={buttonClass("ghost", "sm")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={buttonClass("primary", "sm")}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
