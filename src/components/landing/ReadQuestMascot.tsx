import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LANDING_ARTWORK, ResilientArtwork } from './ResilientArtwork';

interface ReadQuestMascotProps {
  message: string;
  title?: string;
  mood?: 'cheerful' | 'celebrating' | 'encouraging';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Quill — The Reading Buddy
 * Friendly original ReadQuest storybook mascot providing short, supportive literacy encouragement.
 */
export const ReadQuestMascot: React.FC<ReadQuestMascotProps> = ({
  message,
  title = 'Quill the Reading Buddy',
  mood = 'cheerful',
  size = 'md',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sizeMap = {
    sm: 'w-12 h-12 rounded-2xl',
    md: 'w-16 h-16 rounded-2xl',
    lg: 'w-20 h-20 rounded-3xl',
  };

  const bubbleBg =
    mood === 'celebrating'
      ? 'bg-[#FFF9E6] border-[#FFD76A]'
      : mood === 'encouraging'
      ? 'bg-[#EAF9F4] border-[#65D7B2]/60'
      : 'bg-white border-[#EEE9FF]';

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <motion.div
        whileHover={shouldReduceMotion ? undefined : { scale: 1.06, rotate: -3 }}
        transition={{ duration: 0.2 }}
        className={`${sizeMap[size]} overflow-hidden border-2 border-[#DED5FF] bg-[#FAF9FF] shadow-xs shrink-0 select-none`}
      >
        <ResilientArtwork
          src={LANDING_ARTWORK.quillMascot}
          alt="Quill the Reading Buddy, a smiling open storybook holding a golden feather quill"
          fallbackTitle="Quill"
          className="w-full h-full object-cover"
        />
      </motion.div>

      <div
        className={`relative px-4 py-3 rounded-2xl border shadow-xs ${bubbleBg}`}
      >
        <span className="block text-[11px] font-extrabold text-[#5843C4] tracking-wide mb-0.5">
          {title}
        </span>
        <p className="text-xs sm:text-sm font-bold text-[#171B3A] leading-snug">
          {message}
        </p>
      </div>
    </div>
  );
};
