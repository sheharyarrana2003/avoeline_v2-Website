"use client";
import { useRef, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { fieldClass } from "@/src/lib/ui";
import { statusMeta } from "@/src/lib/status";

const PILL_SELECT =
  "w-auto max-w-full shrink-0 rounded-full border border-line bg-paper py-1.5 pl-3 pr-8 text-xs text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";

const FILTER_KEYS = ["status", "payment", "checkin", "track"] as const;

const CHECKIN_CHIP: Record<string, string> = {
  yes: "Checked in",
  no: "Not checked in",
};

const PAYMENT_CHIP: Record<string, string> = {
  pending: "Payment pending",
  completed: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export function AttendeeInput({
  tracks = [],
  hidePayment = false,
}: {
  tracks?: string[];
  hidePayment?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = searchParams.get("value") ?? "";
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDraft(value);
    if (value === "") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      replaceParams((params) => params.delete("value"));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      replaceParams((params) => params.set("value", value));
    }, 300);
  };

  const setFilter = (key: string, value: string) => {
    replaceParams((params) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
  };

  const chips = FILTER_KEYS.flatMap((key) => {
    const value = searchParams.get(key);
    if (!value || value === "all") return [];
    const label =
      key === "track"
        ? value
        : key === "checkin"
          ? (CHECKIN_CHIP[value] ?? value)
          : key === "payment"
            ? (PAYMENT_CHIP[value] ?? statusMeta(value).label)
            : statusMeta(value).label;
    return [{ key, value, label }];
  });

  const clearFilters = () => {
    replaceParams((params) => {
      FILTER_KEYS.forEach((key) => params.delete(key));
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative flex items-center w-full">
        <Search
          className="pointer-events-none absolute left-3 text-ink-faint"
          size={16}
          aria-hidden="true"
        />
        <input
          type="search"
          value={draft}
          onChange={handleOnChange}
          aria-label="Search attendees"
          placeholder="Search name, email, id, team, competition…"
          className={`${fieldClass} pl-9 pr-10`}
        />
        {draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              replaceParams((p) => p.delete("value"));
            }}
            className="absolute right-2 rounded-md p-1 text-ink-soft hover:text-ink"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key, "all")}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2.5 py-0.5 text-2xs font-bold uppercase text-ink"
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}
              <X size={11} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Registration status"
          className={PILL_SELECT}
          value={searchParams.get("status") ?? "all"}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="all">Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="checked_in">Checked in</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {!hidePayment ? (
          <select
            aria-label="Payment status"
            className={PILL_SELECT}
            value={searchParams.get("payment") ?? "all"}
            onChange={(e) => setFilter("payment", e.target.value)}
          >
            <option value="all">Payment</option>
            <option value="pending">Payment pending</option>
            <option value="completed">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        ) : null}
        <select
          aria-label="Check-in"
          className={PILL_SELECT}
          value={searchParams.get("checkin") ?? "all"}
          onChange={(e) => setFilter("checkin", e.target.value)}
        >
          <option value="all">Check-in</option>
          <option value="yes">Checked in</option>
          <option value="no">Not checked in</option>
        </select>
        {tracks.length ? (
          <select
            aria-label="Competition"
            className={PILL_SELECT}
            value={searchParams.get("track") ?? "all"}
            onChange={(e) => setFilter("track", e.target.value)}
          >
            <option value="all">Competition</option>
            {tracks.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
