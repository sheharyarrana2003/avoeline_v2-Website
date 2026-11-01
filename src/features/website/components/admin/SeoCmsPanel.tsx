"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { updatePageSeoAction } from "../../actions/website.action";
import { JsonSettingsPanel } from "./JsonSettingsPanel";

export type SeoPageRow = {
  id: string;
  slug: string;
  title: string;
  seo: { title?: string; description?: string; ogImage?: string };
};

export function SeoCmsPanel({ pages, seoDefaults }: { pages: SeoPageRow[]; seoDefaults: unknown }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(pages);

  return (
    <div className="space-y-8">
      <JsonSettingsPanel
        title="Site-wide SEO defaults"
        settingKey="seo_defaults"
        initialValue={seoDefaults}
        hint="Fallback title/description/share image when a page leaves fields blank."
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {rows.map((page) => (
        <div key={page.id} className="space-y-3 rounded-2xl border border-line p-4">
          <h3 className="font-semibold text-ink">
            {page.title} <span className="text-ink-soft">/{page.slug}</span>
          </h3>
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={fieldClass}
              value={page.seo.title ?? ""}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === page.id ? { ...r, seo: { ...r.seo, title: e.target.value } } : r,
                  ),
                )
              }
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={fieldClass}
              value={page.seo.description ?? ""}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === page.id ? { ...r, seo: { ...r.seo, description: e.target.value } } : r,
                  ),
                )
              }
            />
          </div>
          <div>
            <label className={labelClass}>Share image URL</label>
            <input
              className={fieldClass}
              value={page.seo.ogImage ?? ""}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === page.id ? { ...r, seo: { ...r.seo, ogImage: e.target.value } } : r,
                  ),
                )
              }
            />
          </div>
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updatePageSeoAction({
                  pageId: page.id,
                  title: page.seo.title,
                  description: page.seo.description,
                  ogImage: page.seo.ogImage,
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setError(null);
                  router.refresh();
                }
              })
            }
          >
            Save {page.slug}
          </button>
        </div>
      ))}
    </div>
  );
}
