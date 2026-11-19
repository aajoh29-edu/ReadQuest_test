import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100 or current count
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'peach' | 'purple' | 'emerald' | 'blue';
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = 'peach',
  height = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightClasses = {
    sm: 'h-2.5',
    md: 'h-4',
    lg: 'h-6',
  };

  const fillColors = {
    peach: 'bg-[#FF8A65]',
    purple: 'bg-[#8B5CF6]',
    emerald: 'bg-[#10B981]',
    blue: 'bg-[#3B82F6]',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5 text-sm font-semibold text-[#1A2249]">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-[#E5DFEF] rounded-full overflow-hidden p-0.5 shadow-inner ${heightClasses[height]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Lesson progress'}
      >
        <div
          className={`${fillColors[color]} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
