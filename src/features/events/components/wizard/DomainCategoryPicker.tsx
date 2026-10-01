"use client";

import React, { useState } from "react";
import {
  Code2,
  Terminal,
  Trophy,
  Users,
  Sparkles,
  Briefcase,
  Music,
  Video,
  Presentation,
  Award,
  Gamepad2,
  GraduationCap,
  Flame,
  CheckCircle2,
  Cpu,
  Layers,
  Calendar,
} from "lucide-react";
import type { TaxonomyEntry } from "@/src/features/taxonomy/types";
import { slugifyId } from "@/src/features/taxonomy/types";

export interface DomainCategoryPickerProps {
  selectedSuperId: string;
  selectedFormatId: string;
  entries: TaxonomyEntry[];
  onSelect: (superId: string, superName: string, formatId: string, formatName: string) => void;
}

export interface FormatOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  isHackathon?: boolean;
  features?: string[];
}

export interface DomainGroup {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  accentColor: string;
  formats: FormatOption[];
}

export const DOMAIN_GROUPS: DomainGroup[] = [
  {
    id: "technology",
    name: "Technology & Engineering",
    tagline: "Coding competitions, developer conferences, tech summits and hacker arenas",
    icon: Code2,
    accentColor: "from-blue-600 to-indigo-600",
    formats: [
      {
        id: "hackathon",
        name: "Hackathon & CTF Challenge",
        description: "Competitive multi-track build and hacking sprint with CTF engine, sandboxes & live scoring.",
        icon: Terminal,
        badge: "CTF Engine Ready",
        isHackathon: true,
        features: [
          "Multi-Track & Independent Rules",
          "Static & Dynamic CTF Flags",
          "Strict Phase Progression",
          "Live Scoreboard & Multi-Round",
          "Docker Sandboxing (Premium)",
          "Anti-Cheat Anomaly Detection",
        ],
      },
      {
        id: "conference",
        name: "Tech Conference",
        description: "Multi-track developer conference with keynotes, technical breakouts, and workshops.",
        icon: Layers,
        badge: "Multi-Track",
        features: ["Speaker Management", "Multi-Track Agenda", "Sponsor Tiers"],
      },
      {
        id: "seminar",
        name: "Seminar & Tech Talk",
        description: "Focused expert talk and Q&A session with industry pioneers.",
        icon: Presentation,
        features: ["Single Track", "Q&A Session", "Slide Decks"],
      },
      {
        id: "technical-session",
        name: "Technical Session / Meetup",
        description: "Community developer meetup, fireside chat, or panel discussion.",
        icon: Users,
        features: ["Community RSVP", "Lightning Talks", "Networking"],
      },
      {
        id: "summit",
        name: "Tech Summit",
        description: "High-level technology leadership summit for founders, CTOs, and innovators.",
        icon: Cpu,
        badge: "Executive",
        features: ["VIP Passes", "Roundtables", "Keynote Stream"],
      },
      {
        id: "workshop",
        name: "Hands-on Workshop",
        description: "Interactive coding lab with instructor-guided hands-on exercises.",
        icon: Code2,
        features: ["Prerequisite Guides", "Resource Sharing", "Live Mentorship"],
      },
      {
        id: "webinar",
        name: "Webinar / Virtual Session",
        description: "Broadcast virtual presentation with global live streaming.",
        icon: Video,
        features: ["Stream Link", "Chat Moderation", "Recording Access"],
      },
    ],
  },
  {
    id: "entertainment",
    name: "Festivals, Culture & Entertainment",
    tagline: "Live entertainment, music festivals, cultural showcases, and award galas",
    icon: Music,
    accentColor: "from-pink-600 to-rose-600",
    formats: [
      {
        id: "cultural-festival",
        name: "Music & Cultural Festival",
        description: "Multi-day festival with live performances, food stalls, and artist stages.",
        icon: Flame,
        badge: "Multi-Day",
        features: ["Stage Lineups", "Gate Scanning", "Vendor Marketplace"],
      },
      {
        id: "award-ceremony",
        name: "Award Ceremony & Gala",
        description: "Prestigious recognition gala with red carpet, nomination tiers, and trophies.",
        icon: Award,
        badge: "Gala Event",
        features: ["Nomination Voting", "Seating Tables", "Run of Show"],
      },
      {
        id: "concert",
        name: "Concert & Performance",
        description: "Live musical concert, theater production, or artist showcase.",
        icon: Music,
        features: ["Tiered Ticketing", "Venue Floorplan", "Artist Lineup"],
      },
      {
        id: "exhibition",
        name: "Exhibition & Showcase",
        description: "Art exhibition, craft showcase, or interactive cultural installations.",
        icon: Sparkles,
        features: ["Floorplan Map", "Exhibitor Booths", "Digital Catalog"],
      },
    ],
  },
  {
    id: "corporate",
    name: "Corporate & Business",
    tagline: "Executive summits, product launches, corporate galas, and networking mixers",
    icon: Briefcase,
    accentColor: "from-amber-600 to-orange-600",
    formats: [
      {
        id: "business-summit",
        name: "Executive Business Summit",
        description: "Strategic executive summit, B2B industry forum, and leadership conference.",
        icon: Briefcase,
        features: ["Corporate Passes", "VIP Lounges", "Panel Moderation"],
      },
      {
        id: "product-launch",
        name: "Product Launch Event",
        description: "Exclusive unveil of new technology, products, or brand campaigns.",
        icon: Sparkles,
        features: ["Press Credentials", "Embargo Materials", "Live Stream"],
      },
      {
        id: "networking-mixer",
        name: "Networking Mixer",
        description: "Structured professional networking, cocktail receptions, and speed-meeting.",
        icon: Users,
        features: ["Name Badge Check-in", "Digital Exchange", "Icebreakers"],
      },
    ],
  },
  {
    id: "sports",
    name: "Sports & Esports Tournaments",
    tagline: "Bracketed competitions, gaming tournaments, athletics, and league matches",
    icon: Trophy,
    accentColor: "from-emerald-600 to-teal-600",
    formats: [
      {
        id: "esports-tournament",
        name: "Esports Championship",
        description: "Competitive gaming tournament with brackets, streaming, and prize pools.",
        icon: Gamepad2,
        badge: "Esports",
        features: ["Brackets & Rosters", "Discord Integration", "Prize Pools"],
      },
      {
        id: "sports-tournament",
        name: "Sports Tournament / Match",
        description: "League fixtures, athletic competitions, and tournament brackets.",
        icon: Trophy,
        features: ["Team Rosters", "Match Schedule", "Leaderboards"],
      },
    ],
  },
  {
    id: "education",
    name: "Academic & Education",
    tagline: "University conferences, research symposiums, and training bootcamps",
    icon: GraduationCap,
    accentColor: "from-purple-600 to-violet-600",
    formats: [
      {
        id: "symposium",
        name: "Academic Symposium",
        description: "Research paper presentations, academic peer review sessions, and keynote talks.",
        icon: GraduationCap,
        features: ["Paper Submissions", "Peer Review", "Certificates"],
      },
      {
        id: "bootcamp",
        name: "Training Bootcamp",
        description: "Intensive multi-day or multi-week skills bootcamp with cohort tracking.",
        icon: Calendar,
        features: ["Attendance Tracking", "Curriculum Milestones", "Graduation Pass"],
      },
    ],
  },
];

export function DomainCategoryPicker({
  selectedSuperId,
  selectedFormatId,
  entries,
  onSelect,
}: DomainCategoryPickerProps) {
  const [activeDomainId, setActiveDomainId] = useState<string>(() => {
    // If already chosen, locate domain, else default to 'technology'
    const found = DOMAIN_GROUPS.find(
      (d) => d.id === selectedSuperId || d.formats.some((f) => f.id === selectedFormatId)
    );
    return found?.id ?? "technology";
  });

  const currentDomain = DOMAIN_GROUPS.find((d) => d.id === activeDomainId) || DOMAIN_GROUPS[0];

  const handlePick = (format: FormatOption) => {
    // Check if entry exists in database taxonomy, or slugify
    const matchedSuper = entries.find(
      (e) => e.kind === "super" && (e.id === currentDomain.id || slugifyId(e.name) === currentDomain.id)
    );
    const matchedFormat = entries.find(
      (e) => e.kind === "format" && (e.id === format.id || slugifyId(e.name) === format.id)
    );

    const superId = matchedSuper?.id || currentDomain.id;
    const superName = matchedSuper?.name || currentDomain.name;
    const formatId = matchedFormat?.id || format.id;
    const formatName = matchedFormat?.name || format.name;

    onSelect(superId, superName, formatId, formatName);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
            <Layers size={18} />
          </span>
          <h2 className="text-xl font-bold tracking-tight text-ink">Choose Event Category & Domain</h2>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Select your event&apos;s domain to automatically load tailored workflows, checklists, and specialized engines.
        </p>
      </div>

      {/* Domain navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {DOMAIN_GROUPS.map((domain) => {
          const Icon = domain.icon;
          const isActive = domain.id === activeDomainId;
          const hasSelectedChild =
            domain.id === selectedSuperId || domain.formats.some((f) => f.id === selectedFormatId);

          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => setActiveDomainId(domain.id)}
              className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-ink text-white shadow-sm ring-1 ring-ink"
                  : "bg-surface text-ink hover:bg-muted"
              }`}
            >
              <Icon
                size={16}
                className={isActive ? "text-white" : "text-ink-soft group-hover:text-ink"}
              />
              <span>{domain.name}</span>
              {hasSelectedChild && !isActive ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active selection" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Domain banner */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-line bg-muted/40 p-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-ink">{currentDomain.name}</h3>
          <p className="text-xs text-ink-soft">{currentDomain.tagline}</p>
        </div>
        <span className="text-xs font-medium text-ink-soft">
          {currentDomain.formats.length} formats available
        </span>
      </div>

      {/* Format cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentDomain.formats.map((format) => {
          const Icon = format.icon;
          const isSelected = selectedFormatId === format.id;
          const isHack = format.isHackathon;

          return (
            <div
              key={format.id}
              onClick={() => handlePick(format)}
              className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all duration-200 ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/30 dark:border-indigo-500 dark:bg-indigo-950/20"
                  : isHack
                  ? "border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/20 hover:border-indigo-400 hover:shadow-md dark:border-indigo-900/60 dark:from-surface dark:to-indigo-950/10"
                  : "border-line bg-paper hover:border-ink/30 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isHack
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-muted text-ink"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {format.badge ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          isHack
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                            : "bg-muted text-ink-soft"
                        }`}
                      >
                        {format.badge}
                      </span>
                    ) : null}

                    {isSelected ? (
                      <CheckCircle2 size={20} className="text-indigo-600 dark:text-indigo-400" />
                    ) : null}
                  </div>
                </div>

                <div className="mt-3.5">
                  <h4 className="font-semibold text-ink">{format.name}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{format.description}</p>
                </div>

                {/* Features list */}
                {format.features && format.features.length > 0 ? (
                  <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
                    {format.features.map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-2xs font-medium text-ink-soft"
                      >
                        <span className="h-1 w-1 rounded-full bg-ink-faint" />
                        {feat}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePick(format);
                  }}
                  className={`w-full rounded-xl py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                      : "bg-muted text-ink hover:bg-ink hover:text-white"
                  }`}
                >
                  {isSelected ? "Selected Format" : `Select ${format.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
