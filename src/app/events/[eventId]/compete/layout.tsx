import { leaveCompeteAction } from "@/src/features/hackathon/actions/enterCompete.action";
import { buttonClass } from "@/src/lib/ui";

export default async function CompeteLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;
    const signOut = leaveCompeteAction.bind(null, eventId);

    return (
        <div>
            <div className="border-b border-line">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Participant dashboard</p>
                    <form action={signOut}>
                        <button type="submit" className={buttonClass("ghost", "sm")}>
                            Sign out
                        </button>
                    </form>
                </div>
            </div>
            {children}
        </div>
    );
}
