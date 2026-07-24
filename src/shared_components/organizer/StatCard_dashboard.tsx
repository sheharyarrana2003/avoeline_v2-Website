import type { ReactNode } from "react";

interface StatCardDashboardProps {
  title: string;
  value: string;
  icon: ReactNode;
}

export function StatCard_dashboard({ title, value, icon }: StatCardDashboardProps) {
  return (
    <div className="bg-[#F5F5F5] rounded-2xl border border-gray-300/60 p-5 shadow-xs flex items-center justify-between transition-all hover:border-gray-400">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
          {title}
        </p>
        <h4 className="text-2xl font-extrabold text-gray-900 leading-tight">
          {value}
        </h4>
      </div>
      <div className="w-11 h-11 rounded-xl bg-white border border-gray-300/70 flex items-center justify-center text-gray-900 shadow-xs shrink-0">
        {icon}
      </div>
    </div>
  );
}
