interface AttendeeCardProps {
    title: string;
    value: string | number;
    subValue?: string;
}

export function AttendeeCard({ title, value, subValue }: AttendeeCardProps) {
    return (
        <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[110px]">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-pre-line leading-tight">
                {title}
            </h3>
            <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-[28px] font-bold text-gray-900 tracking-tight">
                    {value}
                </span>
                {subValue && (
                    <span className="text-xs font-bold text-gray-500">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}