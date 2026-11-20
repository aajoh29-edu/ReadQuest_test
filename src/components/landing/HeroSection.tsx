import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AdaptiveRecommendation, Learner, Lesson, SessionRecord } from '../../types';
import { AdventureButton, SecondaryButton } from '../common/ReadQuestButtons';
import {
  ArrowActionIcon,
  LibraryIcon,
  ProfileAvatarFrame,
  RewardStarIcon,
  SparkleAccentIcon,
  StreakFlameIcon,
} from '../icons/ReadQuestIcons';
import { LANDING_ARTWORK, ResilientArtwork } from './ResilientArtwork';

interface HeroSectionProps {
  learner: Learner | null;
  recommendedLesson: Lesson | null;
  adaptiveRec: AdaptiveRecommendation | null;
  activeSession: SessionRecord | null;
  completedQuestsCount: number;
  onStartAdventure: () => void;
  onExploreLibrary: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  learner,
  recommendedLesson,
  adaptiveRec,
  activeSession,
  completedQuestsCount,
  onStartAdventure,
  onExploreLibrary,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const firstName = learner?.name ? learner.name.split(' ')[0] : null;
  const hasReturned =
    Boolean(learner) &&
    ((learner?.starsEarned ?? 0) > 0 || completedQuestsCount > 0 || Boolean(activeSession));

  const primaryCtaLabel = activeSession
    ? 'Continue My Adventure'
    : 'Start My Adventure';

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-8 pb-10 sm:pt-12 sm:pb-14 lg:pt-16 lg:pb-18"
    >
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Welcome, Headline, Supporting Copy, and Primary/Secondary Actions */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-5 sm:space-y-6 text-left"
          >
            {/* Personalized greeting when a child profile is active */}
            {firstName && hasReturned ? (
              <div className="flex items-center gap-2.5 text-sm font-extrabold text-[#5843C4]">
                <ProfileAvatarFrame
                  avatar={learner?.avatar}
                  avatarName={learner?.avatarName || 'Avatar'}
                  size={30}
                  active
                />
                <span>
                  Welcome back, {firstName}! Ready for your next reading adventure?
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black tracking-wider text-[#5843C4]">
                <SparkleAccentIcon size={20} className="shrink-0" />
                <span>YOUR READING ADVENTURE STARTS HERE</span>
              </div>
            )}

            {/* Main Hero Headline */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-[#171B3A] leading-[1.1] tracking-tight"
            >
              Little Readers.{' '}
              <span className="relative inline-block text-[#7C65E8]">
                Big Adventures.
                <svg
                  viewBox="0 0 260 14"
                  fill="none"
                  className="absolute -bottom-1.5 left-0 w-full h-3 text-[#FFD76A]"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10C65 3 195 3 257 10"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Friendly Supporting Description */}
            <p className="text-base sm:text-lg font-semibold text-[#34364B] leading-relaxed max-w-xl">
              Discover magical stories, master new sounds, unlock exciting quests, and build reading confidence — one adventure at a time.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <AdventureButton
                size="lg"
                onClick={onStartAdventure}
                icon={<SparkleAccentIcon size={20} />}
                iconPosition="left"
                showArrow
                className="w-full sm:w-auto justify-center"
              >
                {primaryCtaLabel}
              </AdventureButton>

              <SecondaryButton
                size="lg"
                onClick={onExploreLibrary}
                icon={<LibraryIcon size={22} />}
                iconPosition="left"
                className="w-full sm:w-auto justify-center"
              >
                Explore the Library
              </SecondaryButton>
            </div>

            {/* Quiet Next-Pick Preview Metadata (Unboxed, Real State Only) */}
            {recommendedLesson && (
              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-bold text-[#5C5E7B]">
                <span className="text-[#5843C4]">
                  {activeSession ? 'In Progress:' : 'Recommended Next:'}
                </span>
                <span className="text-[#171B3A]">{recommendedLesson.title}</span>
                <span aria-hidden="true">·</span>
                <span>{recommendedLesson.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span>~{recommendedLesson.estimatedMinutes} mins</span>
              </div>
            )}
          </motion.div>

          {/* Right Column: Layered Storybook Adventure Scene with Tasteful Real Floating Cards */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            {/* Soft Ambient Backdrop */}
            <div
              className="absolute -inset-3 sm:-inset-5 rounded-[36px] bg-gradient-to-tr from-[#EEE9FF] via-[#EAF6FD] to-[#FFF3E8] -z-10 opacity-90"
              aria-hidden="true"
            />

            {/* Main Illustrated Artwork Frame */}
            <div className="relative rounded-[28px] overflow-hidden bg-white shadow-xl shadow-[#7C65E8]/12 border border-[#DED5FF]/80 aspect-[4/3]">
              <ResilientArtwork
                src={LANDING_ARTWORK.hero}
                alt="A cheerful young child explorer reading an open glowing book next to stacked storybooks and floating alphabet letters"
                fallbackTitle="Little Readers. Big Adventures."
                loading="eager"
                className="w-full h-full object-cover"
              />

              {/* Subtle Bottom Contrast Overlay only behind floating corner indicator */}
              <div
                className="hidden sm:block absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#171B3A]/20 to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* Floating Real Data Indicator 1: Active Explorer Stars & Streak OR Starter Callout */}
            {learner ? (
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                }
                className="hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-[#DED5FF] rounded-2xl px-4 py-2.5 shadow-lg shadow-[#171B3A]/8 absolute -bottom-4 left-4 sm:left-6"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FFF6D6] flex items-center justify-center">
                  <RewardStarIcon size={24} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#171B3A] tabular-nums">
                    {learner.starsEarned} Stars Earned
                  </div>
                  <div className="text-[11px] font-bold text-[#5C5E7B] flex items-center gap-1.5 tabular-nums">
                    <StreakFlameIcon size={14} />
                    <span>{learner.currentStreakDays} day reading streak</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                }
                className="hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-[#DED5FF] rounded-2xl px-4 py-2.5 shadow-lg shadow-[#171B3A]/8 absolute -bottom-4 left-4 sm:left-6"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FFF6D6] flex items-center justify-center">
                  <RewardStarIcon size={24} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#171B3A]">
                    12 Guided Quests · 60 Activities
                  </div>
                  <div className="text-[11px] font-bold text-[#5C5E7B]">
                    Parent-managed accounts for early readers
                  </div>
                </div>
              </motion.div>
            )}

            {/* Floating Real Data Indicator 2: Next Quest Progress */}
            {recommendedLesson && (
              <motion.button
                type="button"
                onClick={onStartAdventure}
                animate={shouldReduceMotion ? undefined : { y: [0, 5, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }
                }
                className="group hidden sm:flex items-center gap-2.5 bg-[#171B3A] hover:bg-[#252C55] text-white rounded-2xl px-4 py-2.5 min-h-[44px] shadow-lg shadow-[#171B3A]/20 absolute -top-3 right-4 sm:right-6 cursor-pointer transition-colors focus-visible:outline-3 focus-visible:outline-[#FFD76A]"
                aria-label={`Jump into ${recommendedLesson.title}`}
              >
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[#FFD76A]">
                    {adaptiveRec?.categoryName || recommendedLesson.categoryName}
                  </div>
                  <div className="text-xs font-extrabold text-white max-w-[170px] truncate">
                    {recommendedLesson.title}
                  </div>
                </div>
                <ArrowActionIcon
                  size={16}
                  className="text-[#FFAE80] shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                />
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
