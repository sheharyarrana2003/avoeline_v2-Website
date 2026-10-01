"use client";

import React from "react";
import {
  Globe,
  Lock,
  Mail,
  Crown,
  Layers,
  KeyRound,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react";
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
  { name: "Premium", description: "Full conference with workshops and networking dinner", order: 2 },
  { name: "VIP", description: "All-access pass with backstage lounge and speakers dinner", order: 3 },
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
    patch: Partial<{ name: string; description: string; order: number }>
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
                className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <input
                    type="radio"
                    name="accessType"
                    value={opt.id}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onChange({ accessType: opt.id })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700"
                  />
                </div>

                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  {opt.label}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {opt.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* CONDITIONAL SECTION 1: Private -> CSV Whitelist + Access Code */}
      {accessType === "private" && (
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-5 animate-fadeIn">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-600" />
              <span>Private Access Settings</span>
            </h4>
            <p className="text-xs text-neutral-500">
              Control who can access this private event using an email whitelist, access code, or direct link.
            </p>
          </div>

          {/* Access Code Input */}
          <div className="space-y-1.5">
            <label htmlFor="private-access-code" className={labelClass}>
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
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
            <p className="text-[11px] text-neutral-400">
              If set, visitors must enter this code to access the event page unless their email is whitelisted.
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
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4 animate-fadeIn">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary-600" />
              <span>Invite-Only Settings</span>
            </h4>
            <p className="text-xs text-neutral-500">
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
            <p className="text-[11px] text-neutral-400 mt-1">
              Invite links will be generated automatically once the event is created.
            </p>
          </div>
        </div>
      )}

      {/* CONDITIONAL SECTION 3: VIP / Tiered -> Repeatable Event Tiers */}
      {accessType === "vip_tiered" && (
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Define Event Tiers</span>
              </h4>
              <p className="text-xs text-neutral-500">
                Configure tiers for designated privileges, passes, and custom agenda access.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleAddTier}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-3">
            {currentTiers.map((tier, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <div className="w-8 text-xs font-bold text-neutral-400 text-center">
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
                <div className="flex-1 w-full">
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
                  className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg transition disabled:opacity-30"
                  title="Remove tier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONDITIONAL SECTION 4: Hybrid -> Public with Gated Tiers */}
      {accessType === "hybrid" && (
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4 animate-fadeIn">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-600" />
              <span>Hybrid Gated Tier Settings</span>
            </h4>
            <p className="text-xs text-neutral-500">
              The event is publicly visible, but the selected tiers require passcode or whitelist approval.
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isGated
                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                        : "bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-primary-400"
                    }`}
                  >
                    {isGated ? "🔒 " : "🔓 "}
                    {tier.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-400">
              Tiers marked with 🔒 will be hidden or locked for general public registrations.
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
