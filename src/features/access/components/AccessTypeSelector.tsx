"use client";

import React from "react";
import { Globe, Lock, Mail, Crown, Layers, KeyRound, Plus, Trash2, HelpCircle } from "lucide-react";
import type { AccessType } from "../accessEngine.types";
import { CsvWhitelistUploader } from "./CsvWhitelistUploader";
import { fieldClass, labelClass } from "@/src/lib/ui";

export interface AccessTypeSelectorProps {
  accessType: AccessType;
  whitelistEmails: string[];
  accessCode: string;
  inviteEmails?: string[];
  eventTiers?: Array<{ id?: string; name: string; description: string; order: number }>;
  gatedTiers?: string[];
  onChange: (patch: {
    accessType?: AccessType;
    whitelistEmails?: string[];
    accessCode?: string;
    inviteEmails?: string[];
    eventTiers?: Array<{ id?: string; name: string; description: string; order: number }>;
    gatedTiers?: string[];
  }) => void;
  disabled?: boolean;
}

const ACCESS_TYPE_OPTIONS: Array<{
  id: AccessType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "public",
    label: "Public",
    description: "Listed on Browse Events. Anyone can discover and register.",
    icon: Globe,
  },
  {
    id: "private",
    label: "Private",
    description: "Direct link only. Gated by an email whitelist and/or access code.",
    icon: Lock,
  },
  {
    id: "invite_only",
    label: "Invite-Only",
    description: "Direct link with unique single-use or trackable token per attendee.",
    icon: Mail,
  },
  {
    id: "vip_tiered",
    label: "VIP / Tiered",
    description: "Publicly visible. Attendees belong to specific tiers (VIP, Speaker, Sponsor).",
    icon: Crown,
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Public event with selected premium or VIP tiers gated behind a code/whitelist.",
    icon: Layers,
  },
];

const DEFAULT_VIP_TIERS = [
  { name: "General", description: "Standard conference and keynotes access", order: 1 },
  {
    name: "Premium",
    description: "Full conference with workshops and networking dinner",
    order: 2,
  },
  {
    name: "VIP",
    description: "All-access pass with backstage lounge and speakers dinner",
    order: 3,
  },
  { name: "Speaker", description: "Designated pass for presenters and keynotes", order: 4 },
  { name: "Sponsor", description: "Partner and exhibit booth pass", order: 5 },
];

export const AccessTypeSelector: React.FC<AccessTypeSelectorProps> = ({
  accessType = "public",
  whitelistEmails = [],
  accessCode = "",
  inviteEmails = [],
  eventTiers = DEFAULT_VIP_TIERS,
  gatedTiers = [],
  onChange,
  disabled = false,
}) => {
  const currentTiers = eventTiers && eventTiers.length > 0 ? eventTiers : DEFAULT_VIP_TIERS;

  const handleAddTier = () => {
    const newTier = {
      name: "",
      description: "",
      order: currentTiers.length + 1,
    };
    onChange({ eventTiers: [...currentTiers, newTier] });
  };

  const handleUpdateTier = (
    index: number,
    patch: Partial<{ name: string; description: string; order: number }>,
  ) => {
    const updated = [...currentTiers];
    updated[index] = { ...updated[index], ...patch };
    onChange({ eventTiers: updated });
  };

  const handleRemoveTier = (index: number) => {
    const updated = currentTiers.filter((_, i) => i !== index);
    onChange({ eventTiers: updated });
  };

  const handleToggleGatedTier = (tierName: string) => {
    const next = gatedTiers.includes(tierName)
      ? gatedTiers.filter((t) => t !== tierName)
      : [...gatedTiers, tierName];
    onChange({ gatedTiers: next });
  };

  return (
    <div className="space-y-6">
      {/* 5-Option Access Type Cards */}
      <div>
        <label className={labelClass}>Event Access &amp; Visibility *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {ACCESS_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = accessType === opt.id;

            return (
              <label
                key={opt.id}
                className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? "border-ink bg-muted ring-1 ring-ink/10"
                    : "border-line bg-paper hover:border-line-loud"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      isSelected ? "bg-ink text-paper" : "bg-canvas text-ink-soft"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <input
                    type="radio"
                    name="accessType"
                    value={opt.id}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onChange({ accessType: opt.id })}
                    className="h-4 w-4 accent-current"
                  />
                </div>

                <span className="text-sm font-semibold text-ink">{opt.label}</span>
                <span className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {opt.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* CONDITIONAL SECTION 1: Private -> CSV Whitelist + Access Code */}
      {accessType === "private" && (
        <div className="space-y-5 rounded-2xl border border-line bg-paper p-5">
          <div className="border-b border-line pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Lock className="h-4 w-4 text-ink-soft" />
              <span>Private Access Settings</span>
            </h4>
            <p className="text-xs text-ink-soft">
              Control who can access this private event using an email whitelist, access code, or
              direct link.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="private-access-code" className={labelClass}>
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-ink-faint" />
                <span>Access Passcode (Optional)</span>
              </span>
            </label>
            <input
              id="private-access-code"
              type="text"
              value={accessCode}
              disabled={disabled}
              placeholder="e.g. VIP-SUMMIT-2024"
              onChange={(e) => onChange({ accessCode: e.target.value })}
              className={fieldClass}
            />
            <p className="text-[11px] text-ink-faint">
              If set, visitors must enter this code to access the event page unless their email is
              whitelisted.
            </p>
          </div>

          {/* CSV Whitelist Upload */}
          <div className="pt-2">
            <label className={labelClass}>Allowed Emails (Whitelist)</label>
            <CsvWhitelistUploader
              emails={whitelistEmails}
              onChange={(emails) => onChange({ whitelistEmails: emails })}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* CONDITIONAL SECTION 2: Invite-Only -> Email List */}
      {accessType === "invite_only" && (
        <div className="space-y-4 rounded-2xl border border-line bg-paper p-5">
          <div className="border-b border-line pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Mail className="h-4 w-4 text-ink-soft" />
              <span>Invite-Only Settings</span>
            </h4>
            <p className="text-xs text-ink-soft">
              Each invitee receives a personalized, secure link with token tracking.
            </p>
          </div>

          <div>
            <label className={labelClass}>Add Invitees (Emails)</label>
            <textarea
              rows={4}
              disabled={disabled}
              value={inviteEmails.join("\n")}
              placeholder="Paste attendee emails (one per line):&#10;sarah@company.com&#10;alex@startup.org"
              onChange={(e) =>
                onChange({
                  inviteEmails: e.target.value
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className={`${fieldClass} font-mono text-xs`}
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              Invite links will be generated automatically once the event is created.
            </p>
          </div>
        </div>
      )}

      {/* CONDITIONAL SECTION 3: VIP / Tiered -> Repeatable Event Tiers */}
      {accessType === "vip_tiered" && (
        <div className="space-y-4 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Crown className="h-4 w-4 text-ink-soft" />
                <span>Define Event Tiers</span>
              </h4>
              <p className="text-xs text-ink-soft">
                Configure tiers for designated privileges, passes, and custom agenda access.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleAddTier}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-3">
            {currentTiers.map((tier, idx) => (
              <div
                key={idx}
                className="flex flex-col items-start gap-3 rounded-xl border border-line bg-canvas/40 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="w-8 text-center text-xs font-bold text-ink-faint">
                  #{tier.order || idx + 1}
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Tier Name (e.g. VIP)"
                    value={tier.name}
                    onChange={(e) => handleUpdateTier(idx, { name: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="w-full flex-1">
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Description (e.g. Backstage access)"
                    value={tier.description}
                    onChange={(e) => handleUpdateTier(idx, { description: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  disabled={disabled || currentTiers.length <= 1}
                  onClick={() => handleRemoveTier(idx)}
                  className="rounded-lg p-2 text-ink-faint transition hover:text-red-700 disabled:opacity-30"
                  title="Remove tier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONDITIONAL SECTION 4: Hybrid -> Public with Gated Tiers */}
      {accessType === "hybrid" && (
        <div className="space-y-4 rounded-2xl border border-line bg-paper p-5">
          <div className="border-b border-line pb-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Layers className="h-4 w-4 text-ink-soft" />
              <span>Hybrid Gated Tier Settings</span>
            </h4>
            <p className="text-xs text-ink-soft">
              The event is publicly visible, but the selected tiers require passcode or whitelist
              approval.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Select Gated Tiers</label>
            <div className="flex flex-wrap gap-2">
              {currentTiers.map((tier) => {
                const isGated = gatedTiers.includes(tier.name);
                return (
                  <button
                    key={tier.name}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleGatedTier(tier.name)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      isGated
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-canvas text-ink-soft hover:border-line-loud"
                    }`}
                  >
                    {tier.name}
                    {isGated ? " (gated)" : ""}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-faint">
              Gated tiers stay locked for general public registrations until a code or whitelist
              unlock.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <label htmlFor="hybrid-access-code" className={labelClass}>
              Passcode for Gated Tiers (Optional)
            </label>
            <input
              id="hybrid-access-code"
              type="text"
              value={accessCode}
              disabled={disabled}
              placeholder="e.g. UNLOCK-VIP"
              onChange={(e) => onChange({ accessCode: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
      )}
    </div>
  );
};
