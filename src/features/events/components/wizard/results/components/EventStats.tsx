interface EventStatsProps {
  capacity: number;
  price: number;
  date: string;
}

export default function EventStats({ capacity, price, date }: EventStatsProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-8 py-6">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
            CAPACITY
          </p>
          <p className="font-bold text-xl text-gray-900">{capacity}</p>
        </div>
        
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
            PRICE
          </p>
          <p className="font-bold text-xl text-gray-900">
            PKR {price.toLocaleString()}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
            DATE
          </p>
          <p className="font-bold text-xl text-gray-900">{date}</p>
        </div>
      </div>
    </div>
  );
}