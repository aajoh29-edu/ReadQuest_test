import React from 'react';

export interface ReadQuestIconProps {
  size?: 24 | 32 | 48 | 64 | number;
  active?: boolean;
  variant?: 'color' | 'monochrome' | 'high-contrast';
  className?: string;
  'aria-hidden'?: boolean;
}

/**
 * Custom ReadQuest Icon Geometry Tokens:
 * - Unified logical viewBox="0 0 48 48"
 * - Coherent rounded stroke caps & joins
 * - Top-left inner highlight + controlled bottom-right shadow depth
 */

export const ReadQuestLogoMark: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="44" height="44" rx="14" fill="#7C65E8" />
    <path
      d="M2 16C2 8.268 8.268 2 16 2H32C39.732 2 46 8.268 46 16V18C34 12 14 12 2 18V16Z"
      fill="#FFFFFF"
      opacity="0.16"
    />
    {/* Open Storybook Base */}
    <path
      d="M11 19C16 17.2 21 18.2 24 20.5C27 18.2 32 17.2 37 19V34.5C32 32.8 27 33.8 24 36C21 33.8 16 32.8 11 34.5V19Z"
      fill="#FFFFFF"
      stroke="#171B3A"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M24 20.5V35.5" stroke="#5843C4" strokeWidth="2" strokeLinecap="round" />
    {/* Rising Quest North Star */}
    <path
      d="M24 8.5L25.9 13.1L30.5 15L25.9 16.9L24 21.5L22.1 16.9L17.5 15L22.1 13.1L24 8.5Z"
      fill="#FFD76A"
      stroke="#171B3A"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * NAVIGATION 1: Quests Icon
 * Stylized adventure map with winding dotted trail & destination star.
 * Active state subtly unfolds pages & brightens the destination star.
 */
export const QuestIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  active = false,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-200 ${active ? 'scale-105' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Map Tri-fold Silhouette */}
      <path
        d={
          active
            ? 'M6 12.5L17.5 8.5L30.5 13L42 9V35.5L30.5 39.5L17.5 35L6 39V12.5Z'
            : 'M8 13.5L18.5 9.5L29.5 13.5L40 9.5V34.5L29.5 38.5L18.5 34.5L8 38.5V13.5Z'
        }
        fill={isMono ? 'currentColor' : active ? '#EEE9FF' : '#FAF9FF'}
        fillOpacity={isMono ? 0.14 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Middle Fold Panel */}
      <path
        d="M18.5 10V34.5L29.5 38.5V13.5L18.5 10Z"
        fill={isMono ? 'currentColor' : '#DED5FF'}
        fillOpacity={isMono ? 0.16 : 0.75}
      />
      {/* Winding Exploration Trail */}
      <path
        d="M13 30C16 25 21 26 24 22C26.5 18.8 29 19 31.5 17.5"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="3.5 3.5"
      />
      {/* Destination Star */}
      <path
        d="M34.5 11.5L36.1 14.8L39.8 15.3L37.1 17.9L37.7 21.5L34.5 19.8L31.3 21.5L31.9 17.9L29.2 15.3L32.9 14.8L34.5 11.5Z"
        fill={isMono ? 'currentColor' : active ? '#FFD76A' : '#FFAE80'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * NAVIGATION 2: Library Icon
 * Open storybook with gently curved pages and a soft bookmark ribbon.
 * Active state opens pages slightly wider and lowers the bookmark ribbon.
 */
export const LibraryIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  active = false,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-200 ${active ? 'scale-105' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Hardcover Back */}
      <rect
        x="6"
        y="12"
        width="36"
        height="27"
        rx="6"
        fill={isMono ? 'currentColor' : active ? '#7C65E8' : '#9B89EE'}
        fillOpacity={isMono ? 0.2 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
      />
      {/* Left Curved Page */}
      <path
        d={
          active
            ? 'M9 12C15 9.5 21 10.5 24 14V35.5C20 32.5 14 32 9 34.5V12Z'
            : 'M9.5 13C15 11 20.5 12 24 15V35.5C20 33 14.5 32.5 9.5 34.5V13Z'
        }
        fill={isMono ? 'none' : '#FFFFFF'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Right Curved Page */}
      <path
        d={
          active
            ? 'M39 12C33 9.5 27 10.5 24 14V35.5C28 32.5 34 32 39 34.5V12Z'
            : 'M38.5 13C33 11 27.5 12 24 15V35.5C28 33 33.5 32.5 38.5 34.5V13Z'
        }
        fill={isMono ? 'none' : '#FAF9FF'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Subtle Text Lines */}
      <path
        d="M13.5 19H19.5M13.5 24H19M28.5 19H34.5"
        stroke={isMono ? 'currentColor' : '#B7ACEC'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Dangling Peach Bookmark */}
      <path
        d={
          active
            ? 'M29.5 12.5H34.5V27.5L32 25L29.5 27.5V12.5Z'
            : 'M29.5 12.5H34.5V24.5L32 22.3L29.5 24.5V12.5Z'
        }
        fill={isMono ? 'currentColor' : '#FFAE80'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * NAVIGATION 3: Progress Icon
 * Rising journey path with 3 achievement stars.
 * Active state illuminates stars sequentially and brightens the peak star.
 */
export const ProgressIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  active = false,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-200 ${active ? 'scale-105' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Rising Stepping Hill Silhouette */}
      <path
        d="M7 37C12 37 15 30 21 30C27 30 29 22 36 22C39 22 41 24 41 24V39H7V37Z"
        fill={isMono ? 'currentColor' : '#65D7B2'}
        fillOpacity={isMono ? 0.16 : 0.4}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Connecting Rising Arc */}
      <path
        d="M12 29C17.5 28 21 21 25 18.5C28.5 16.5 32.5 14 36 11"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Small Star 1 */}
      <circle
        cx="13"
        cy="23"
        r="3.2"
        fill={isMono ? 'currentColor' : active ? '#FFD76A' : '#EEE9FF'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.8"
      />
      {/* Medium Star 2 */}
      <circle
        cx="24.5"
        cy="17"
        r="3.8"
        fill={isMono ? 'currentColor' : active ? '#FFAE80' : '#DED5FF'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.8"
      />
      {/* Peak Achievement Star 3 */}
      <path
        d="M36 6L37.8 9.8L42 10.4L39 13.3L39.7 17.5L36 15.5L32.3 17.5L33 13.3L30 10.4L34.2 9.8L36 6Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * NAVIGATION 4: Profile Avatar Frame
 * Custom circular lavender & sunlit frame integrating the child's selected avatar.
 */
export const ProfileAvatarFrame: React.FC<{
  avatar?: string;
  avatarName?: string;
  size?: number;
  active?: boolean;
  className?: string;
}> = ({ avatar = '🦊', avatarName = 'Explorer', size = 28, active = false, className = '' }) => (
  <span
    style={{ width: size, height: size }}
    className={`relative inline-flex items-center justify-center rounded-full shrink-0 transition-all duration-200 ${
      active
        ? 'bg-[#EEE9FF] ring-2 ring-[#7C65E8] shadow-xs'
        : 'bg-[#FAF9FF] ring-2 ring-[#DED5FF]'
    } ${className}`}
    role="img"
    aria-label={avatarName}
  >
    <span style={{ fontSize: Math.round(size * 0.62) }} className="leading-none select-none">
      {avatar}
    </span>
  </span>
);

/**
 * ACTIVITY 1: Letter Sounds Icon
 * Friendly alphabet block with a smooth sound-wave accent.
 */
export const LetterSoundsIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Rounded Wood-Toy Block */}
      <rect
        x="6"
        y="10"
        width="25"
        height="28"
        rx="7"
        fill={isMono ? 'currentColor' : '#65D7B2'}
        fillOpacity={isMono ? 0.16 : 0.35}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.4"
      />
      <rect
        x="9"
        y="13"
        width="19"
        height="22"
        rx="4"
        fill={isMono ? 'none' : '#FFFFFF'}
      />
      {/* Letter A Glyph */}
      <path
        d="M14.5 29.5L18.5 18.5L22.5 29.5M16 26H21"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sound Waves */}
      <path
        d="M35 19C37.2 21.5 37.2 26.5 35 29"
        stroke={isMono ? 'currentColor' : '#189B73'}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M39.5 15C43 19.5 43 28.5 39.5 33"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 2: Word Blending Icon
 * Two colorful letter tiles interlocking like puzzle pieces.
 */
export const WordBlendingIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left Puzzle Tile */}
      <path
        d="M6 15C6 12.2 8.2 10 11 10H22V19C24.5 19 26 21 26 23.5C26 26 24.5 28 22 28V36H11C8.2 36 6 33.8 6 31V15Z"
        fill={isMono ? 'currentColor' : '#72C7F5'}
        fillOpacity={isMono ? 0.18 : 0.45}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Right Puzzle Tile */}
      <path
        d="M22 12H37C39.8 12 42 14.2 42 17V33C42 35.8 39.8 38 37 38H22V28C24.5 28 26 26 26 23.5C26 21 24.5 19 22 19V12Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        fillOpacity={isMono ? 0.1 : 0.65}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Tiny Connector Letters */}
      <path
        d="M15.5 19.5C13 19.5 11.5 21.3 11.5 23.5C11.5 25.7 13 27.5 15.5 27.5"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M31 29L33.5 21L36 29M32 26.5H35"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 3: Sight Words Icon
 * Small open book with a featured glowing word tile above.
 */
export const SightWordsIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Featured Word Tile */}
      <rect
        x="11"
        y="7"
        width="26"
        height="14"
        rx="5"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        fillOpacity={isMono ? 0.2 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
      />
      <path
        d="M17 14H31"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Open Storybook Base */}
      <path
        d="M8 25C14 23 20 24 24 27C28 24 34 23 40 25V39C34 37 28 38 24 41C20 38 14 37 8 39V25Z"
        fill={isMono ? 'currentColor' : '#EEE9FF'}
        fillOpacity={isMono ? 0.14 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M24 27V40.5" stroke={isMono ? 'currentColor' : '#7C65E8'} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * ACTIVITY 4: Story Reading Icon
 * Illustrated storybook with a tiny shooting star rising from its pages.
 */
export const StoryReadingIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Book Silhouette */}
      <path
        d="M7 22C13 19.5 20 20.5 24 24C28 20.5 35 19.5 41 22V38.5C35 36.2 28 37.2 24 40.5C20 37.2 13 36.2 7 38.5V22Z"
        fill={isMono ? 'currentColor' : '#FFAE80'}
        fillOpacity={isMono ? 0.16 : 0.4}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path
        d="M24 24V40"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Shooting Star Trail */}
      <path
        d="M21 20C22 15.5 25 12.5 30 10.5"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M34 5.5L35.4 8.5L38.7 9L36.3 11.3L36.9 14.5L34 13L31.1 14.5L31.7 11.3L29.3 9L32.6 8.5L34 5.5Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 5: Comprehension Icon
 * Storybook paired with a rounded question bubble.
 */
export const ComprehensionIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="7"
        y="17"
        width="25"
        height="24"
        rx="5"
        fill={isMono ? 'currentColor' : '#EEE9FF'}
        fillOpacity={isMono ? 0.15 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
      />
      <path
        d="M12.5 25H26M12.5 31H22"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Question Bubble */}
      <circle
        cx="33.5"
        cy="15.5"
        r="9.5"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        fillOpacity={isMono ? 0.22 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
      />
      <path
        d="M31.3 13C31.3 11.6 32.3 10.7 33.7 10.7C35 10.7 35.9 11.5 35.9 12.7C35.9 13.8 34.8 14.3 33.7 15.1V16.2"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="33.7" cy="19.2" r="1.2" fill={isMono ? 'currentColor' : '#171B3A'} />
    </svg>
  );
};

/**
 * ACTIVITY 6: Listening Practice Icon
 * Friendly cushioned headphones with a small sound sparkle.
 */
export const ListeningIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 26V22C10 14.3 16.3 8 24 8C31.7 8 38 14.3 38 22V26"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="7"
        y="24"
        width="8"
        height="14"
        rx="4"
        fill={isMono ? 'currentColor' : '#72C7F5'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
      />
      <rect
        x="33"
        y="24"
        width="8"
        height="14"
        rx="4"
        fill={isMono ? 'currentColor' : '#72C7F5'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
      />
      {/* Sound Sparkle */}
      <path
        d="M24 18L25.3 21.2L28.5 22.5L25.3 23.8L24 27L22.7 23.8L19.5 22.5L22.7 21.2L24 18Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 7: Pronunciation Icon
 * Soft speech bubble with illustrated gentle voice wave motif.
 */
export const PronunciationIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 14C8 10.7 10.7 8 14 8H34C37.3 8 40 10.7 40 14V28C40 31.3 37.3 34 34 34H20L12 40V34H14C10.7 34 8 31.3 8 28V14Z"
        fill={isMono ? 'currentColor' : '#FFB5D2'}
        fillOpacity={isMono ? 0.16 : 0.45}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path
        d="M17 21V21.1M21.5 16.5V25.5M26 14V28M30.5 18V24"
        stroke={isMono ? 'currentColor' : '#5843C4'}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 8: Completed Quest Icon
 * Pennant flag planted on a soft adventure hill with a celebration star above.
 */
export const CompletedQuestIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hill */}
      <path
        d="M8 40C12 31 36 31 40 40H8Z"
        fill={isMono ? 'currentColor' : '#65D7B2'}
        fillOpacity={isMono ? 0.2 : 0.85}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Flag Pole */}
      <path
        d="M21 33V12"
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Pennant */}
      <path
        d="M21 13L36 18.5L21 24V13Z"
        fill={isMono ? 'currentColor' : '#7C65E8'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Star Above */}
      <path
        d="M15 7L16 9.3L18.5 9.6L16.7 11.4L17.1 13.8L15 12.6L12.9 13.8L13.3 11.4L11.5 9.6L14 9.3L15 7Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 9: Locked Quest Icon
 * Stylized storybook clasp with restrained lock emblem.
 */
export const LockedQuestIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17 21V15.5C17 11.6 20.1 8.5 24 8.5C27.9 8.5 31 11.6 31 15.5V21"
        stroke={isMono ? 'currentColor' : '#5843C4'}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <rect
        x="11"
        y="21"
        width="26"
        height="19"
        rx="6"
        fill={isMono ? 'currentColor' : '#EEE9FF'}
        fillOpacity={isMono ? 0.16 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
      />
      <circle cx="24" cy="29.5" r="2.6" fill={isMono ? 'currentColor' : '#7C65E8'} />
      <path
        d="M24 31.5V34.5"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * ACTIVITY 10: Continue Reading Icon
 * Open storybook with ribbon bookmark and gentle forward-motion accent.
 */
export const ContinueReadingIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 14C12 12 18 13 21 16V37C17 34.5 12 34 7 36V14Z"
        fill={isMono ? 'currentColor' : '#EEE9FF'}
        fillOpacity={isMono ? 0.14 : 1}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path
        d="M35 14C30 12 24 13 21 16V37C25 34.5 30 34 35 36V14Z"
        fill={isMono ? 'none' : '#FFFFFF'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path
        d="M25 14.5H30V26L27.5 23.8L25 26V14.5Z"
        fill={isMono ? 'currentColor' : '#FFAE80'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="1.7"
      />
      {/* Forward Motion Chevron */}
      <path
        d="M39 20L43 24L39 28"
        stroke={isMono ? 'currentColor' : '#7C65E8'}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * SIGNATURE REWARD STAR: Custom ReadQuest softly rounded star with inner facet highlight.
 */
export const RewardStarIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 6.5C25.1 6.5 26 7.1 26.5 8.1L30.2 15.6L38.5 16.8C40.7 17.1 41.6 19.9 40 21.4L34 27.2L35.4 35.5C35.8 37.7 33.4 39.4 31.4 38.4L24 34.5L16.6 38.4C14.6 39.4 12.2 37.7 12.6 35.5L14 27.2L8 21.4C6.4 19.9 7.3 17.1 9.5 16.8L17.8 15.6L21.5 8.1C22 7.1 22.9 6.5 24 6.5Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Soft Top-Left Facet Highlight */}
      <path
        d="M24 11L20.5 17.5L13.5 18.6L18 23.2"
        stroke={isMono ? 'none' : '#FFF7DC'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * SIGNATURE STREAK FLAME: Layered warm-orange/sunshine shapes replacing generic emoji flames.
 */
export const StreakFlameIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Warm Flame */}
      <path
        d="M24.5 6C24.5 6 36 14.5 36 27C36 34.5 30.8 40 24 40C17.2 40 12 34.5 12 27C12 21.5 15.5 17 17.8 14.5C18.2 18 20.5 19.5 21.5 18C20.5 12.5 24.5 6 24.5 6Z"
        fill={isMono ? 'currentColor' : '#FFAE80'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Inner Sunshine Core */}
      <path
        d="M24 21C24 21 29.5 25 29.5 31C29.5 34.3 27 36.8 24 36.8C21 36.8 18.5 34.3 18.5 31C18.5 27.5 21.5 24 24 21Z"
        fill={isMono ? 'none' : '#FFD76A'}
      />
    </svg>
  );
};

/**
 * Reading Level Book Emblem: Rounded open tome for Reading Level KPI.
 */
export const ReadingIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => (
  <LibraryIcon size={size} variant={variant} className={className} />
);

/**
 * Phonics Alias cleanly exported for naming consistency
 */
export const PhonicsIcon = WordBlendingIcon;
export const SoundIcon = LetterSoundsIcon;
export const StoryIcon = StoryReadingIcon;

/**
 * Custom Sparkle Accent Icon
 */
export const SparkleAccentIcon: React.FC<ReadQuestIconProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isMono = variant !== 'color';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M22 7L25.5 17.5L36 21L25.5 24.5L22 35L18.5 24.5L8 21L18.5 17.5L22 7Z"
        fill={isMono ? 'currentColor' : '#FFD76A'}
        stroke={isMono ? 'currentColor' : '#171B3A'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M36.5 29L38 33L42 34.5L38 36L36.5 40L35 36L31 34.5L35 33L36.5 29Z"
        fill={isMono ? 'currentColor' : '#7C65E8'}
      />
    </svg>
  );
};

/**
 * Custom Directional Arrow Icon for Tactile Buttons
 */
export const ArrowActionIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M5 12H18.5M18.5 12L13 6.5M18.5 12L13 17.5"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
