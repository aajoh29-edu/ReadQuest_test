import React, { useState } from 'react';
import { ArrowActionIcon, RewardStarIcon } from '../icons/ReadQuestIcons';

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const SIZE_MAP = {
  sm: 'text-xs sm:text-sm px-4 py-2 min-h-[42px] gap-2 rounded-2xl',
  md: 'text-sm sm:text-base px-5 py-2.5 min-h-[46px] gap-2.5 rounded-2xl',
  lg: 'text-base sm:text-lg px-7 py-3.5 min-h-[54px] gap-2.5 rounded-[18px]',
  xl: 'text-lg sm:text-xl px-8 py-4 min-h-[60px] gap-3 rounded-[20px]',
};

const COMMON_INTERACTION =
  'group inline-flex items-center justify-center font-extrabold tracking-wide whitespace-nowrap shrink-0 select-none cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-3 focus-visible:outline-[#7C65E8] focus-visible:outline-offset-3 disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:translate-y-0';

/**
 * A. PRIMARY ADVENTURE BUTTON
 * Rich purple with subtle upper light, lower tactile lip, -2px hover lift, and trailing icon nudge.
 */
export const AdventureButton: React.FC<
  BaseButtonProps & { showArrow?: boolean }
> = ({
  children,
  size = 'lg',
  icon,
  iconPosition = 'left',
  showArrow = true,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => (
  <button
    disabled={disabled || isLoading}
    className={`${COMMON_INTERACTION} ${SIZE_MAP[size]} bg-gradient-to-b from-[#8670F0] to-[#725BE0] text-white border border-[#5B44C8] shadow-[0_6px_16px_-4px_rgba(124,101,232,0.45),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-3px_0_rgba(88,67,196,0.9)] hover:-translate-y-0.5 hover:from-[#8E79F4] hover:to-[#7963E5] hover:shadow-[0_10px_22px_-4px_rgba(124,101,232,0.52),inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-3px_0_rgba(88,67,196,0.95)] active:translate-y-[1px] active:shadow-[0_2px_8px_-2px_rgba(124,101,232,0.35),inset_0_-1px_0_rgba(88,67,196,0.9)] ${className}`}
    {...props}
  >
    {isLoading ? (
      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : (
      icon &&
      iconPosition === 'left' && (
        <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
          {icon}
        </span>
      )
    )}
    <span>{children}</span>
    {!isLoading && icon && iconPosition === 'right' ? (
      <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true">
        {icon}
      </span>
    ) : !isLoading && showArrow && iconPosition !== 'right' ? (
      <ArrowActionIcon
        size={size === 'sm' ? 16 : 19}
        className="transition-transform duration-200 group-hover:translate-x-[3px] shrink-0"
      />
    ) : null}
  </button>
);

/**
 * B. SECONDARY STORYBOOK BUTTON
 * Soft lavender/white background, subtle purple hairline border, deep-purple typography.
 */
export const SecondaryButton: React.FC<BaseButtonProps> = ({
  children,
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => (
  <button
    disabled={disabled || isLoading}
    className={`${COMMON_INTERACTION} ${SIZE_MAP[size]} bg-white hover:bg-[#EEE9FF] text-[#5843C4] border-[1.5px] border-[#D4C9FB] hover:border-[#7C65E8] shadow-[0_3px_10px_-3px_rgba(23,27,58,0.08),inset_0_-2px_0_rgba(222,213,255,0.85)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_-3px_rgba(124,101,232,0.18),inset_0_-2px_0_rgba(205,193,250,0.9)] active:translate-y-[1px] active:shadow-xs ${className}`}
    {...props}
  >
    {isLoading ? (
      <span className="inline-block w-4 h-4 border-2 border-[#5843C4] border-t-transparent rounded-full animate-spin" />
    ) : (
      icon &&
      iconPosition === 'left' && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      )
    )}
    <span>{children}</span>
    {!isLoading && icon && iconPosition === 'right' && (
      <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true">
        {icon}
      </span>
    )}
  </button>
);

/**
 * C. QUEST CARD BUTTON
 * Unified compact tactile game button using category accents (mint, sky, purple, peach) with strong contrast.
 */
export type QuestButtonTheme = 'mint' | 'sky' | 'purple' | 'peach';

const QUEST_THEMES: Record<QuestButtonTheme, string> = {
  mint: 'bg-[#65D7B2] hover:bg-[#53CCA5] text-[#171B3A] border-[#42B892] shadow-[0_4px_12px_-3px_rgba(101,215,178,0.45),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(48,168,129,0.85)]',
  sky: 'bg-[#72C7F5] hover:bg-[#5BBAF0] text-[#171B3A] border-[#4AA6DC] shadow-[0_4px_12px_-3px_rgba(114,199,245,0.45),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(52,150,208,0.85)]',
  purple:
    'bg-[#7C65E8] hover:bg-[#6A53DA] text-white border-[#5843C4] shadow-[0_4px_12px_-3px_rgba(124,101,232,0.45),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-3px_0_rgba(88,67,196,0.9)]',
  peach:
    'bg-[#FFAE80] hover:bg-[#FB9D68] text-[#171B3A] border-[#E88D58] shadow-[0_4px_12px_-3px_rgba(255,174,128,0.45),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(218,125,73,0.8)]',
};

export const QuestButton: React.FC<
  BaseButtonProps & { theme?: QuestButtonTheme }
> = ({
  children,
  theme = 'purple',
  size = 'sm',
  icon,
  iconPosition = 'right',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => (
  <button
    disabled={disabled || isLoading}
    className={`${COMMON_INTERACTION} ${SIZE_MAP[size]} border ${QUEST_THEMES[theme]} hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-xs ${className}`}
    {...props}
  >
    {icon && iconPosition === 'left' && (
      <span className="inline-flex shrink-0" aria-hidden="true">
        {icon}
      </span>
    )}
    <span>{children}</span>
    {icon && iconPosition === 'right' && (
      <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true">
        {icon}
      </span>
    )}
  </button>
);

/**
 * D. ICON-ONLY BUTTON
 * Strictly >= 44px touch target, accessible aria-label required, consistent tactile states.
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'surface' | 'lavender' | 'navy';
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  variant = 'surface',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const styles =
    variant === 'navy'
      ? 'bg-[#171B3A] hover:bg-[#252C55] text-white border-[#171B3A]'
      : variant === 'lavender'
      ? 'bg-[#EEE9FF] hover:bg-[#E1D8FD] text-[#5843C4] border-[#D4C9FB]'
      : 'bg-white hover:bg-[#FAF9FF] text-[#171B3A] border-[#DED5FF]';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl border shadow-xs cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-[1px] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline-3 focus-visible:outline-[#7C65E8] focus-visible:outline-offset-2 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * E. REWARD BUTTON
 * Tied strictly to real achievement/progress status; offers celebratory feedback on real click without faking rewards on hover.
 */
interface RewardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isEarned: boolean;
  celebrationText?: string;
}

export const RewardButton: React.FC<RewardButtonProps> = ({
  children,
  isEarned,
  celebrationText = 'Reward Collected!',
  onClick,
  className = '',
  disabled,
  ...props
}) => {
  const [celebrating, setCelebrating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isEarned) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 1800);
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      type="button"
      disabled={disabled || !isEarned}
      onClick={handleClick}
      className={`${COMMON_INTERACTION} ${SIZE_MAP.sm} ${
        isEarned
          ? 'bg-gradient-to-b from-[#FFE28A] to-[#FFD76A] text-[#171B3A] border border-[#E5B83B] shadow-[0_4px_12px_-3px_rgba(255,215,106,0.55),inset_0_-2px_0_rgba(220,168,36,0.85)] hover:-translate-y-0.5 active:translate-y-[1px]'
          : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
      } ${className}`}
      {...props}
    >
      <RewardStarIcon
        size={18}
        variant={isEarned ? 'color' : 'monochrome'}
        className={celebrating ? 'motion-safe:scale-125 transition-transform duration-200' : ''}
      />
      <span>{celebrating ? celebrationText : children}</span>
    </button>
  );
};
