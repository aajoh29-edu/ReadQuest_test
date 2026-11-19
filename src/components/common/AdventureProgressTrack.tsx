import React from 'react';
import { RewardStarIcon } from '../icons/ReadQuestIcons';

interface AdventureProgressTrackProps {
  value: number;
  max: number;
  label?: string;
  accent?: 'purple' | 'mint' | 'sky' | 'peach';
  showMilestones?: boolean;
  showStarEndpoint?: boolean;
  height?: 'sm' | 'md';
  className?: string;
}

/**
 * Custom ReadQuest Adventure Progress Track
 * Smooth rounded track with optional milestone markers and custom star endpoint.
 */
export const AdventureProgressTrack: React.FC<AdventureProgressTrackProps> = ({
  value,
  max,
  label,
  accent = 'purple',
  showMilestones = false,
  showStarEndpoint = true,
  height = 'md',
  className = '',
}) => {
  const safeMax = Math.max(1, max);
  const clampedValue = Math.max(0, Math.min(safeMax, value));
  const percent = Math.round((clampedValue / safeMax) * 100);

  const fillStyles = {
    purple: 'from-[#7C65E8] to-[#9A87F5]',
    mint: 'from-[#3EC79B] to-[#65D7B2]',
    sky: 'from-[#3CAEEB] to-[#72C7F5]',
    peach: 'from-[#F58F56] to-[#FFAE80]',
  };

  const trackHeight = height === 'sm' ? 'h-2.5' : 'h-3.5';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative flex-1 ${trackHeight} bg-[#EEE9FF] rounded-full overflow-hidden p-0.5`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label || `${clampedValue} of ${safeMax}`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillStyles[accent]} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
          style={{ width: `${clampedValue > 0 ? Math.max(8, percent) : 0}%` }}
        />

        {/* Subtle Milestone Markers */}
        {showMilestones && (
          <div
            className="absolute inset-0 flex items-center justify-evenly pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-1 h-1 rounded-full bg-[#171B3A]/15" />
            <span className="w-1 h-1 rounded-full bg-[#171B3A]/15" />
            <span className="w-1 h-1 rounded-full bg-[#171B3A]/15" />
          </div>
        )}
      </div>

      {showStarEndpoint && (
        <RewardStarIcon
          size={height === 'sm' ? 18 : 22}
          variant={percent >= 100 ? 'color' : clampedValue > 0 ? 'color' : 'monochrome'}
          className={`shrink-0 transition-transform duration-300 ${
            percent >= 100 ? 'scale-110 text-[#171B3A]' : clampedValue > 0 ? 'opacity-85' : 'text-[#C4B8F5]'
          }`}
        />
      )}
    </div>
  );
};
