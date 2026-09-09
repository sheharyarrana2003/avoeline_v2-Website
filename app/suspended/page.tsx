import Link from "next/link";
import { Ban } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";

export const metadata = { title: "Account suspended — Avoeline" };

/**
 * Where a suspended organizer lands (spec 9.3).
 *
 * Its own route rather than an inline message in the organizer layout, because
 * the layout redirects here — a layout cannot both refuse and render. It says
 * plainly what has happened and where to ask about it, which is the difference
 * between a suspension and a broken app.
 */
export default function SuspendedPage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 self-start rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <Card tone="raised">
                <CardBody>
                    <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-ink">
                            <Ban className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="font-display text-lg text-ink">This account is suspended</h1>
                            <p className="mt-1 text-sm text-ink-soft">
                                An administrator has suspended it, so your dashboard and your public events are
                                hidden while that stands. Your data has not been deleted.
                            </p>
                        </div>
                    </div>
                    <p className="mt-6 flex flex-wrap gap-2">
                        <Link href="/support" className={buttonClass("primary", "sm")}>
                            Contact support
                        </Link>
                        <Link href="/" className={buttonClass("secondary", "sm")}>
                            Back to Avoeline
                        </Link>
                    </p>
                </CardBody>
            </Card>
        </main>
    );
}
