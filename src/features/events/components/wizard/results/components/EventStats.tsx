interface EventStatsProps {
  capacity: number;
  date: string;
}

export default function EventStats({ capacity, date }: EventStatsProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center bg-muted rounded-2xl px-8 py-6">
        <div className="text-center">
          <p className="text-[10px] text-ink-soft uppercase tracking-wider mb-1.5 font-medium">
            CAPACITY
          </p>
          <p className="font-bold text-xl text-ink">{capacity}</p>
        </div>
        
        
        
        <div className="text-center">
          <p className="text-[10px] text-ink-soft uppercase tracking-wider mb-1.5 font-medium">
            DATE
          </p>
          <p className="font-bold text-xl text-ink">{date}</p>
        </div>
      </div>
    </div>
  );
}