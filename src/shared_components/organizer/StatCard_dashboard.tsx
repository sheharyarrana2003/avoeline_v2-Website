import type { ReactNode } from "react";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";

/**
 * @deprecated Use `MetricTile` from `@/src/shared_components/ui/MetricTile`.
 *
 * Kept as a delegating shim so the eleven existing call sites keep working while
 * they are migrated screen by screen. It also lived under `organizer/` while the
 * vendor pages used it heavily, which was the wrong home; MetricTile sits in `ui/`.
 *
 * Nothing new should import this. It renders one label and one number, and that
 * missing context is exactly what MetricTile exists to add.
 */
export function StatCard_dashboard({ title, value, icon }: { title: string; value: string; icon?: ReactNode }) {
    return <MetricTile label={title} value={value} icon={icon} />;
}
