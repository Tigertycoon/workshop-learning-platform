interface Props {
  value: number; // 0-1
  className?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ value, className = '', showLabel = true }: Props) {
  const percent = Math.round(value * 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1">{percent}%</span>
      )}
    </div>
  );
}
