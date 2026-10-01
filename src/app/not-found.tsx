import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import { RouteMessage, routeMessageButton } from "@/src/shared_components/ui/RouteMessage";

export default function RootNotFound() {
    return (
        <RouteMessage
            tone="neutral"
            icon={<SearchX className="h-6 w-6" />}
            title="Page not found"
            description="That link doesn't lead anywhere. It may have been moved, or the address may have a typo."
            actions={
                <Link href="/" className={routeMessageButton}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to home
                </Link>
            }
        />
    );
}
