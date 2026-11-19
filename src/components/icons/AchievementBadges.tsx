import React from 'react';

export type BadgeKind =
  | 'first-story'
  | 'sound-explorer'
  | 'word-wizard'
  | 'reading-champion'
  | 'story-adventurer';

export type BadgeVisualState = 'locked' | 'unlocked' | 'newly-earned';

interface AchievementBadgeProps {
  kind: BadgeKind;
  state?: BadgeVisualState;
  size?: number;
  className?: string;
}

/**
 * Custom ReadQuest Achievement Artwork Family
 * Consistent rounded shield seal silhouette, top-left rim lighting, inner border construction,
 * and three authentic visual states: locked, unlocked, newly-earned.
 */
export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  kind,
  state = 'locked',
  size = 64,
  className = '',
}) => {
  const isLocked = state === 'locked';
  const isNew = state === 'newly-earned';

  const paletteMap: Record<
    BadgeKind,
    { ring: string; fill: string; highlight: string }
  > = {
    'first-story': { ring: '#F4B400', fill: '#FFF6D6', highlight: '#FFE58F' },
    'sound-explorer': { ring: '#189B73', fill: '#E3F9F1', highlight: '#A7F0D6' },
    'word-wizard': { ring: '#0284C7', fill: '#E6F5FD', highlight: '#B5E3FA' },
    'reading-champion': { ring: '#5843C4', fill: '#EEE9FF', highlight: '#D5C9FB' },
    'story-adventurer': { ring: '#C25E28', fill: '#FFF1E6', highlight: '#FFD1B5' },
  };

  const palette = paletteMap[kind];
  const outerRingColor = isLocked ? '#CBD5E1' : palette.ring;
  const innerSurfaceColor = isLocked ? '#F1F5F9' : palette.fill;
  const accentShade = isLocked ? '#E2E8F0' : palette.highlight;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        isNew ? 'motion-safe:animate-[badge-pop_0.45s_cubic-bezier(0.16,1,0.3,1)]' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Soft Ground Shadow */}
        <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#171B3A" opacity={isLocked ? 0.08 : 0.14} />

        {/* Consistent Rounded Shield / Seal Silhouette */}
        <path
          d="M32 6L52 14.5V31.5C52 43.2 43.5 52.8 32 56.5C20.5 52.8 12 43.2 12 31.5V14.5L32 6Z"
          fill={outerRingColor}
          stroke={isLocked ? '#94A3B8' : '#171B3A'}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Inner Badge Plate */}
        <path
          d="M32 10.5L47.5 17.2V31.2C47.5 40.5 40.8 48.2 32 51.5C23.2 48.2 16.5 40.5 16.5 31.2V17.2L32 10.5Z"
          fill={innerSurfaceColor}
        />

        {/* Top-Left Rim Lighting Arc */}
        <path
          d="M17.5 29V18L31.5 12"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity={isLocked ? 0.5 : 0.85}
        />

        {/* Bottom Accent Band */}
        <path
          d="M18.5 35C22.5 39 27 42 32 43.5C37 42 41.5 39 45.5 35V31C42.5 36.5 37.5 40.5 32 42.5C26.5 40.5 21.5 36.5 18.5 31V35Z"
          fill={accentShade}
        />

        {/* Badge Artwork by Kind */}
        <g opacity={isLocked ? 0.45 : 1}>
          {kind === 'first-story' && (
            <g>
              {/* Open Book */}
              <path
                d="M21 29C25 27.5 29 28 32 30.5C35 28 39 27.5 43 29V40C39 38.5 35 39 32 41.5C29 39 25 38.5 21 40V29Z"
                fill="#FFFFFF"
                stroke="#171B3A"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M32 30.5V41" stroke="#7C65E8" strokeWidth="1.8" />
              {/* Golden Star Above Book */}
              <path
                d="M32 16.5L34.2 21.1L39.2 21.8L35.6 25.3L36.4 30.2L32 27.9L27.6 30.2L28.4 25.3L24.8 21.8L29.8 21.1L32 16.5Z"
                fill={isLocked ? '#CBD5E1' : '#FFD76A'}
                stroke="#171B3A"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </g>
          )}

          {kind === 'sound-explorer' && (
            <g>
              {/* Mini Alphabet Tile */}
              <rect
                x="20"
                y="21"
                width="17"
                height="20"
                rx="4.5"
                fill="#FFFFFF"
                stroke="#171B3A"
                strokeWidth="2"
              />
              <path
                d="M25.5 35.5L28.5 26.5L31.5 35.5M26.5 33H30.5"
                stroke="#171B3A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Sound Waves */}
              <path
                d="M40.5 26C42.3 28.2 42.3 32.8 40.5 35"
                stroke={isLocked ? '#94A3B8' : '#189B73'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M44 22.5C47 26.5 47 34.5 44 38.5"
                stroke={isLocked ? '#94A3B8' : '#7C65E8'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          )}

          {kind === 'word-wizard' && (
            <g>
              {/* Two Connecting Tiles */}
              <rect
                x="19.5"
                y="26"
                width="12"
                height="13"
                rx="3.5"
                fill={isLocked ? '#E2E8F0' : '#72C7F5'}
                stroke="#171B3A"
                strokeWidth="1.9"
              />
              <rect
                x="32.5"
                y="23"
                width="12"
                height="13"
                rx="3.5"
                fill={isLocked ? '#E2E8F0' : '#FFD76A'}
                stroke="#171B3A"
                strokeWidth="1.9"
              />
              {/* Magical Wand Crossing Tiles */}
              <path
                d="M21 40L39 19"
                stroke="#171B3A"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M39 14L40.4 17L43.5 17.5L41.2 19.7L41.8 22.8L39 21.3L36.2 22.8L36.8 19.7L34.5 17.5L37.6 17L39 14Z"
                fill={isLocked ? '#CBD5E1' : '#FFD76A'}
                stroke="#171B3A"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
          )}

          {kind === 'reading-champion' && (
            <g>
              {/* Handles */}
              <path
                d="M23 23C19 23 19 30 23 30.5M41 23C45 23 45 30 41 30.5"
                stroke="#171B3A"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              {/* Trophy Cup incorporating open book top */}
              <path
                d="M23 20C26.5 18.5 29.5 19.5 32 21.5C34.5 19.5 37.5 18.5 41 20V29C41 34 37 37.5 32 37.5C27 37.5 23 34 23 29V20Z"
                fill={isLocked ? '#CBD5E1' : '#FFD76A'}
                stroke="#171B3A"
                strokeWidth="2.1"
                strokeLinejoin="round"
              />
              {/* Stem & Base */}
              <path d="M32 37.5V42" stroke="#171B3A" strokeWidth="2.6" strokeLinecap="round" />
              <rect
                x="26"
                y="41.5"
                width="12"
                height="4"
                rx="2"
                fill="#7C65E8"
                stroke="#171B3A"
                strokeWidth="1.7"
              />
            </g>
          )}

          {kind === 'story-adventurer' && (
            <g>
              {/* Compass Outer Ring */}
              <circle
                cx="32"
                cy="30"
                r="12"
                fill="#FFFFFF"
                stroke="#171B3A"
                strokeWidth="2.2"
              />
              {/* Tiny Open Book Inside Compass */}
              <path
                d="M25.5 26C28 25 30.2 25.5 32 27C33.8 25.5 36 25 38.5 26V34.5C36 33.5 33.8 34 32 35.5C30.2 34 28 33.5 25.5 34.5V26Z"
                fill={isLocked ? '#E2E8F0' : '#FFAE80'}
                stroke="#171B3A"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M32 27V35" stroke="#171B3A" strokeWidth="1.6" />
              {/* Compass Needle Top */}
              <path
                d="M32 14.5L34 18.5H30L32 14.5Z"
                fill={isLocked ? '#94A3B8' : '#7C65E8'}
              />
            </g>
          )}
        </g>

        {/* Small Lock Emblem when Locked */}
        {isLocked && (
          <g transform="translate(40, 39)">
            <circle cx="9" cy="9" r="8" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.6" />
            <path d="M6.5 8V6.5C6.5 5.1 7.6 4 9 4C10.4 4 11.5 5.1 11.5 6.5V8" stroke="#64748B" strokeWidth="1.5" />
            <rect x="5" y="8" width="8" height="6" rx="1.8" fill="#64748B" />
          </g>
        )}
      </svg>
    </div>
  );
};
