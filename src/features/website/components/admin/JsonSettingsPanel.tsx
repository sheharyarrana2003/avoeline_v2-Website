"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { upsertSiteSettingAction } from "../../actions/settings.action";

type SettingKey = "nav" | "footer" | "social" | "contact" | "announcement" | "seo_defaults";

export function JsonSettingsPanel({
  title,
  settingKey,
  initialValue,
  hint,
}: {
  title: string;
  settingKey: SettingKey;
  initialValue: unknown;
  hint?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [raw, setRaw] = useState(() => JSON.stringify(initialValue ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
      </div>
      <label className={labelClass} htmlFor={`setting-${settingKey}`}>
        JSON
      </label>
      <textarea
        id={`setting-${settingKey}`}
        className={`${fieldClass} min-h-56 font-mono text-xs`}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        className={buttonClass("primary", "md")}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw);
            } catch {
              setError("Invalid JSON");
              return;
            }
            const res = await upsertSiteSettingAction({
              key: settingKey,
              value: parsed as Record<string, unknown>,
            });
            if (!res.ok) setError(res.error.message);
            else {
              setError(null);
              router.refresh();
            }
          })
        }
      >
        Save {title}
      </button>
    </div>
  );
}
