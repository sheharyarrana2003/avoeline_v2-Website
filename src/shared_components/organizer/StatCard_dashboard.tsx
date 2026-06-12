import type { ReactNode } from "react";

interface StatCard_dashboard_props {
    title: string;
    value: string;
    icon: ReactNode;

}

export function StatCard_dashboard({ title, value, icon }: StatCard_dashboard_props) {
    return (
        <div className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
            <div className="mb-5 flex justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/80">
                    {icon}
                </div>
            </div>

            <div>
                <h4 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    {title}
                </h4>
                <p className="text-3xl font-extrabold leading-none text-slate-950">
                    {value}
                </p>
            </div>
        </div>
    )

}
