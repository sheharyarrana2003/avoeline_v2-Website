"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import type { ActionResult } from "@/src/lib/action";
import { saveExternalVendorAction } from "../actions/externalVendors.action";
import { EXTERNAL_VENDOR_STATUSES, type EventExternalVendor } from "../types";

export function AddOwnVendorModal({
  eventId,
  editing,
}: {
  eventId: string;
  editing?: EventExternalVendor | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult | null, FormData>(
    saveExternalVendorAction,
    null,
  );

  return (
    <>
      <button
        type="button"
        className={buttonClass(editing ? "secondary" : "primary", "sm")}
        onClick={() => setOpen(true)}
      >
        {editing ? "Edit" : "Add my own vendor"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit vendor" : "Add my own vendor"}
        description="Track vendors you hire outside the marketplace. Free on every plan."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton form="own-vendor-form" className={buttonClass("primary", "sm")}>
              Save
            </SubmitButton>
          </div>
        }
      >
        <form id="own-vendor-form" action={action} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          {state?.error ? <FormFeedback error={state.error} /> : null}
          {state?.success ? <FormFeedback success="Saved." /> : null}
          <div>
            <label className={labelClass} htmlFor="ov-name">
              Name
            </label>
            <input
              id="ov-name"
              name="name"
              required
              defaultValue={editing?.name}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ov-type">
                Type
              </label>
              <input
                id="ov-type"
                name="vendorType"
                defaultValue={editing?.vendorType}
                className={`${fieldClass} mt-1`}
                placeholder="Catering, AV…"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ov-status">
                Status
              </label>
              <select
                id="ov-status"
                name="status"
                defaultValue={editing?.status || "planned"}
                className={`${fieldClass} mt-1`}
              >
                {EXTERNAL_VENDOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="ov-budget">
              Budget (optional)
            </label>
            <input
              id="ov-budget"
              name="budget"
              inputMode="decimal"
              defaultValue={editing?.budget ?? ""}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ov-contact">
              Contact
            </label>
            <input
              id="ov-contact"
              name="contact"
              defaultValue={editing?.contact}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ov-desc">
              Description
            </label>
            <textarea
              id="ov-desc"
              name="description"
              rows={3}
              defaultValue={editing?.description}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
