"use client";

import { ConfirmButton } from "@/src/shared_components/ui/ConfirmDialog";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { TaxonomyEntry } from "@/src/features/taxonomy/types";
import type { SuperCategoryDoc, EventFormatDoc, CategoryFieldSetDoc } from "@/src/features/taxonomy/categoryEngine.types";
import { useMemo, useState, useTransition } from "react";
import { EventFormData } from "@/src/services/models/event.model";
import { BasicStep } from "./steps/BasicStep";
import { ScheduleLocationStep } from "./steps/ScheduleLocationStep";
import { HackathonTracksStep } from "./steps/HackathonTracksStep";
import { RegistrationStep } from "./steps/RegistrationStep";
import { ReviewStep } from "./steps/ReviewStep";
import { emptyTrack } from "./wizardUtils";

const INITIAL_FORM: EventFormData = {
  eventType: "",
  eventTitle: "",
  description: "",
  category: "",
  superCategoryId: "",
  eventFormatId: "",
  categorySuperId: "",
  categoryFormatId: "",
  categoryFields: {},
  customFieldValues: {},
  shortDescription: "",
  tags: [],
  bannerImage: null,
  galleryImages: [],
  videoUrl: "",

  startDate: "",
  endDate: "",
  startTime: "10:00",
  endTime: "17:00",
  isAllDay: false,
  timezone: "Pakistan Standard Time (PKT, UTC+5)",
  isRecurring: false,
  recurrenceType: "daily",
  locationType: "physical",
  venueName: "",
  address: "",
  city: "Lahore",
  postalCode: "",
  coordinates: { lat: 31.5204, lng: 74.3587 },
  mapUrl: "",
  meetingLink: "",
  totalSeats: 100,
  reservedSeats: 10,
  enableWaitingList: false,
  waitingListCapacity: 0,

  ticketType: "paid",
  ticketTiers: [
    { id: "1", name: "Early Bird Pass", price: 4500, seatsAvailable: 100, availableUntil: "", description: "VIP Lounge Access" },
  ],
  studentDiscount: false,
  studentDiscountPercent: 15,
  groupDiscount: false,
  groupDiscountPercent: 10,
  groupRegistration: false,
  groupMinSize: 2,
  groupMaxSize: 8,
  isHackathon: false,
  promoCodes: [],
  customFields: [],
  requiresRegistration: true,
  multiTrack: false,
  wizardTracks: [emptyTrack({ id: "main", name: "Main" })],
  requiresApproval: false,
  registrationOpenDate: "",
  registrationCloseDate: "",
  PriceOfTicket: 0,
  minSizeForGroupDiscounts: 5,
  maxTicketsPerPerson: 4,

  visibility: "public",
  accessType: "public",
  whitelistEmails: [],
  accessCode: "",
  waitlistEnabled: false,
  approvalRequired: false,
  eventTiers: [],
  gatedTiers: [],
  publishImmediately: true,
  agreeToTerms: false,
  confirmRights: false,
  isDraft: false,
};

export default function CreateEventPage({
  handle_submission,
  entries = [],
  superCategories = [],
  eventFormats = [],
  fieldSets = [],
  initialIsHackathon = false,
  canHackathon = false,
}: {
  handle_submission: (data: EventFormData) => Promise<{ success?: boolean; error?: string } | void>;
  entries?: TaxonomyEntry[];
  superCategories?: SuperCategoryDoc[];
  eventFormats?: EventFormatDoc[];
  fieldSets?: CategoryFieldSetDoc[];
  initialIsHackathon?: boolean;
  canHackathon?: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>(() =>
    initialIsHackathon
      ? {
          ...INITIAL_FORM,
          isHackathon: true,
          eventType: "Hackathon",
          eventFormatId: "hackathon",
          categoryFormatId: "hackathon",
          superCategoryId: "technology",
          categorySuperId: "technology",
          category: "Technology",
        }
      : INITIAL_FORM,
  );
  const [isPublishing, startPublishing] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const hackathon = formData.isHackathon;
  const steps = useMemo(() => {
    const list = [
      { id: 1, key: "basic", label: "Basic Information" },
      { id: 2, key: "schedule", label: "Schedule & Location" },
    ];
    if (hackathon) list.push({ id: 3, key: "tracks", label: "Competitions" });
    list.push(
      { id: hackathon ? 4 : 3, key: "registration", label: "Registration" },
      { id: hackathon ? 5 : 4, key: "review", label: "Review & Publish" },
    );
    return list;
  }, [hackathon]);

  const lastStep = steps.length;
  const safeStep = Math.min(currentStep, lastStep);
  const currentKey = steps[safeStep - 1]?.key ?? "basic";

  const handling_submission_client = (payload: EventFormData) => {
    if (isPublishing) return;
    startPublishing(async () => {
      try {
        const response = await handle_submission(payload);
        if (response && !response.success) {
          setServerError(response.error || "Could not save this event.");
        }
      } catch {
        setServerError("Network error. Please check your connection and try again.");
      }
    });
  };

  const updateForm = (field: keyof EventFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const patchForm = (patch: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const nextStep = () => {
    const from = Math.min(currentStep, lastStep);
    if (from < lastStep) setCurrentStep(from + 1);
  };
  const prevStep = () => {
    const from = Math.min(currentStep, lastStep);
    if (from > 1) setCurrentStep(from - 1);
  };
  const goToStep = (step: number) => {
    if (step <= currentStep) setCurrentStep(step);
  };

  const completionPercent = Math.round((safeStep / lastStep) * 100);
  const step1Incomplete =
    currentStep === 1 &&
    (formData.isHackathon
      ? !String(formData.eventTitle || "").trim()
      : !(formData.superCategoryId || formData.categorySuperId) || !(formData.eventFormatId || formData.categoryFormatId));
  const missingSchedule = !String(formData.startDate || "").trim();
  const cannotPublish = !formData.agreeToTerms || !formData.confirmRights || missingSchedule || isPublishing;

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 md:h-16 md:flex-nowrap md:py-0">
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-ink-soft">
                Step {safeStep} of {lastStep}
              </p>
              <h1 className="text-lg font-bold text-ink">{steps[safeStep - 1]?.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  {i > 0 ? <div className={`mx-1 h-0.5 w-6 ${i < safeStep ? "bg-ink" : "bg-muted-strong"}`} /> : null}
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      step.id <= safeStep ? "bg-ink text-ink-invert" : "bg-muted-strong text-ink-soft"
                    }`}
                  >
                    {step.id < safeStep ? "✓" : step.id}
                  </button>
                </div>
              ))}
            </div>
            <div className="ml-auto shrink-0 text-right">
              <p className="text-sm font-bold text-ink">{completionPercent}% Complete</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {serverError ? <FormFeedback error={serverError} className="mb-6" /> : null}
        {currentKey === "review" && missingSchedule ? (
          <FormFeedback
            error="This event has no start date yet. Add one under Schedule & Location before publishing — you can still save it as a draft."
            className="mb-6"
          />
        ) : null}

        {currentKey === "basic" ? (
          <BasicStep
            formData={formData}
            updateForm={updateForm}
            patchForm={patchForm}
            entries={entries}
            superCategories={superCategories}
            eventFormats={eventFormats}
            fieldSets={fieldSets}
            hideHackathonFormats
            skipCategory={formData.isHackathon}
            canHackathon={canHackathon}
          />
        ) : null}
        {currentKey === "schedule" ? <ScheduleLocationStep formData={formData} updateForm={updateForm} /> : null}
        {currentKey === "tracks" ? <HackathonTracksStep formData={formData} updateForm={updateForm} /> : null}
        {currentKey === "registration" ? (
          <RegistrationStep formData={formData} updateForm={updateForm} hideGroupToggle={formData.isHackathon} />
        ) : null}
        {currentKey === "review" ? (
          <ReviewStep formData={formData} updateForm={updateForm} patchForm={patchForm} goToStep={goToStep} />
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-paper md:left-52">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <ConfirmButton
              tone="default"
              title="Save as draft?"
              description="Your event will be saved but not published. You can come back and finish it later."
              confirmLabel="Save as draft"
              disabled={isPublishing}
              onConfirm={() => handling_submission_client({ ...formData, isDraft: true, publishImmediately: false })}
              className="text-sm text-ink-soft transition hover:text-ink disabled:opacity-50"
            >
              Save as Draft
            </ConfirmButton>
            {safeStep > 1 ? (
              <button type="button" onClick={prevStep} className="text-sm text-ink-soft hover:text-ink">
                Back
              </button>
            ) : null}
          </div>

          {safeStep < lastStep ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={step1Incomplete}
              title={step1Incomplete ? (formData.isHackathon ? "Give the hackathon a title first" : "Choose a category and an event format first") : undefined}
              className="flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert disabled:pointer-events-none disabled:opacity-50"
            >
              Next: {steps[safeStep]?.label}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handling_submission_client(formData)}
              disabled={cannotPublish}
              title={missingSchedule ? "Set a start date on Schedule & Location first" : undefined}
              aria-busy={isPublishing}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? "Publishing…" : formData.isHackathon ? "Publish hackathon" : "Publish Event"}
            </button>
          )}
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
}
