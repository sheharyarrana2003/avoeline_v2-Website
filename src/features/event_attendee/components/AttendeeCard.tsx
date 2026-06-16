interface AttendeeCardProps {
    title: string;
    value: string | number;}

export function AttendeeCard({ title, value,}: AttendeeCardProps) {
    return (
        <div className="bg-white border border-slate-200/60 rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-between h-[110px]">
            
            {/* 1. The Title (Uses whitespace-pre-line so we can force line breaks like "TOTAL\nREGISTERED") */}
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-pre-line leading-tight">
                {title}
            </h3>

            {/* 2. The Values Box */}
            <div className="flex items-baseline mt-auto">
                {/* Main Value */}
                <span className={`text-[28px] font-black tracking-tight `}>
                    {value}
                </span>
                
                
            </div>

        </div>
    );
}