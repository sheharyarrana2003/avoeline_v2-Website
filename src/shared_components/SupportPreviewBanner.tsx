import Link from "next/link";

/** Shown when a platform admin is looking at another tenant's dashboard. */
export function SupportPreviewBanner({ label }: { label: string }) {
  return (
    <div className="border-b border-line bg-muted px-4 py-2 text-sm text-ink sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          Viewing as support
          {label ? (
            <>
              {" "}
              · <span className="font-medium">{label}</span>
            </>
          ) : null}
        </p>
        <Link href="/admin" className="font-medium text-ink underline-offset-2 hover:underline">
          Back to admin
        </Link>
      </div>
    </div>
  );
}
