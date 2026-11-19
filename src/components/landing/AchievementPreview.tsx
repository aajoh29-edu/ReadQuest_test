import React from 'react';
import { Learner } from '../../types';
import { RewardButton, SecondaryButton } from '../common/ReadQuestButtons';
import {
  ArrowActionIcon,
  CompletedQuestIcon,
  LockedQuestIcon,
  RewardStarIcon,
} from '../icons/ReadQuestIcons';
import { AchievementBadge, BadgeKind } from '../icons/AchievementBadges';
import { ReadQuestMascot } from './ReadQuestMascot';

interface AchievementPreviewProps {
  learner: Learner | null;
  onViewAllAchievements: () => void;
}

const ACHIEVEMENT_CATEGORIES: Array<{
  badgeKey: string;
  fallbackTitle: string;
  desc: string;
  kind: BadgeKind;
}> = [
  {
    badgeKey: 'Star Scout',
    fallbackTitle: 'First Story Completed',
    desc: 'Finish your first reading quest to earn this starter badge.',
    kind: 'first-story',
  },
  {
    badgeKey: 'Safari Sound Master',
    fallbackTitle: 'Sound Explorer',
    desc: 'Master initial letter sounds and phonetic cues.',
    kind: 'sound-explorer',
  },
  {
    badgeKey: 'Master Word Builder',
    fallbackTitle: 'Word Wizard',
    desc: 'Blend letter sound tiles together into full words.',
    kind: 'word-wizard',
  },
  {
    badgeKey: 'Reading Champion',
    fallbackTitle: 'Reading Champion',
    desc: 'Complete all 12 adventures across Seedling, Sprout, and Bloom.',
    kind: 'reading-champion',
  },
  {
    badgeKey: 'Story Adventurer',
    fallbackTitle: 'Story Adventurer',
    desc: 'Practice 25 reading activities across stories and quests.',
    kind: 'story-adventurer',
  },
];

export const AchievementPreview: React.FC<AchievementPreviewProps> = ({
  learner,
  onViewAllAchievements,
}) => {
  const earnedBadges = learner?.badges || [];
  const hasEarnedAny = earnedBadges.length > 0;

  return (
    <section aria-labelledby="achievements-heading" className="py-10 sm:py-14">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header + Quill Celebration */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 id="achievements-heading" className="text-2xl sm:text-4xl font-black text-[#171B3A]">
              Every Little Win Counts!
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#5C5E7B]">
              {hasEarnedAny
                ? `You have unlocked ${earnedBadges.length} reading badge${earnedBadges.length === 1 ? '' : 's'} so far — keep exploring to collect them all!`
                : 'Complete reading quests and practice activities to unlock real achievement badges.'}
            </p>
          </div>

          <ReadQuestMascot
            mood={hasEarnedAny ? 'celebrating' : 'encouraging'}
            message={
              hasEarnedAny
                ? `Awesome job! You already unlocked ${earnedBadges.length} ${earnedBadges.length === 1 ? 'badge' : 'badges'}!`
                : 'Your very first reading quest unlocks a Star Scout celebration!'
            }
          />
        </div>

        {/* Achievement Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ACHIEVEMENT_CATEGORIES.map((item) => {
            const isEarned =
              earnedBadges.includes(item.badgeKey) ||
              earnedBadges.includes(item.fallbackTitle);

            return (
              <div
                key={item.badgeKey}
                className={`rounded-[22px] p-5 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isEarned
                    ? 'bg-white border-[#7C65E8] shadow-sm hover:-translate-y-0.5'
                    : 'bg-white/75 border-[#E5E0FA] hover:border-[#DED5FF]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <AchievementBadge
                      kind={item.kind}
                      state={isEarned ? 'unlocked' : 'locked'}
                      size={58}
                    />
                    {isEarned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#189B73]">
                        <CompletedQuestIcon size={18} />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6B6E8A]">
                        <LockedQuestIcon size={16} />
                        <span>Goal</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-[#171B3A] leading-snug">
                      {isEarned ? item.badgeKey : item.fallbackTitle}
                    </h3>
                    <p className="text-xs font-medium text-[#5C5E7B] mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {isEarned && (
                  <RewardButton
                    isEarned
                    celebrationText="Yay! Badge Earned!"
                    className="w-full justify-center"
                  >
                    Celebrate Badge
                  </RewardButton>
                )}
              </div>
            );
          })}
        </div>

        {/* View Full Progress Bar Link */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9FF] border border-[#E5E0FA] rounded-[22px] p-5">
          <div className="flex items-center gap-3">
            <RewardStarIcon size={26} className="shrink-0" />
            <span className="text-sm font-bold text-[#171B3A]">
              Explore your complete collection of milestone badges and skill progress.
            </span>
          </div>
          <SecondaryButton
            size="sm"
            onClick={onViewAllAchievements}
            icon={<ArrowActionIcon size={16} />}
            iconPosition="right"
          >
            View All Progress
          </SecondaryButton>
        </div>
      </div>
    </section>
  );
};
