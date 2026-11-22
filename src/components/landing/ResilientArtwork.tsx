import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

import heroArtwork from '../../assets/images/hero_reading_adventure_1795046657309.webp';
import phonicsForestArtwork from '../../assets/images/quest_phonics_forest_1795046657223.webp';
import blendingBeachArtwork from '../../assets/images/quest_blending_beach_1795046658152.webp';
import sightWordGalaxyArtwork from '../../assets/images/quest_sight_word_galaxy_1795046658135.webp';
import storybookKingdomArtwork from '../../assets/images/quest_storybook_kingdom_1795046659843.webp';
import quillMascotArtwork from '../../assets/images/mascot_quill_buddy_1795046659465.webp';

export const LANDING_ARTWORK = {
  hero: heroArtwork,
  phonicsForest: phonicsForestArtwork,
  blendingBeach: blendingBeachArtwork,
  sightWordGalaxy: sightWordGalaxyArtwork,
  storybookKingdom: storybookKingdomArtwork,
  quillMascot: quillMascotArtwork,
};

interface ResilientArtworkProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  fallbackBgClass?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export const ResilientArtwork: React.FC<ResilientArtworkProps> = ({
  src,
  alt,
  fallbackTitle,
  fallbackBgClass = 'bg-gradient-to-br from-[#EEE9FF] via-[#FAF9FF] to-[#EAF5F7]',
  className = 'w-full h-full object-cover',
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 text-center ${fallbackBgClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center text-[#7C65E8] shadow-xs mb-2">
          <BookOpen className="w-6 h-6" />
        </div>
        <span className="text-xs font-extrabold text-[#171B3A] max-w-[16ch] leading-snug">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
