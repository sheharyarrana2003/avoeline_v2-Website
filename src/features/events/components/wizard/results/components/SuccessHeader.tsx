interface SuccessHeaderProps {
  eventTitle: string;
  message: string;
}

export default function SuccessHeader({ eventTitle, message }: SuccessHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl text-gray-900 font-bold mb-3 leading-tight">
        Event Published<br />Successfully!
      </h1>
      <p className="text-gray-600 text-base">
        {eventTitle} {message}
      </p>
    </div>
  );
}