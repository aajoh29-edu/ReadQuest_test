import React from 'react';
import { Learner, ReadingLevel, ReadingProgressSummary } from '../../types';
import { AdventureProgressTrack } from '../common/AdventureProgressTrack';
import { formatAccuracy } from '../../utils/formatAccuracy';
import {
  CompletedQuestIcon,
  ReadingIcon,
  RewardStarIcon,
  StreakFlameIcon,
} from '../icons/ReadQuestIcons';

interface LearningStatsProps {
  learner: Learner | null;
  progressSummary: ReadingProgressSummary | null;
  readingLevels: ReadingLevel[];
}

export const LearningStats: React.FC<LearningStatsProps> = ({
  learner,
  progressSummary,
  readingLevels,
}) => {
  const currentLevelObj = readingLevels.find((l) => l.id === learner?.readingLevelId);
  const readingLevelName = currentLevelObj
    ? currentLevelObj.name.split('·')[1]?.trim() || currentLevelObj.name
    : 'Seedling';
  const readingStageLabel = currentLevelObj
    ? currentLevelObj.name.split('·')[0]?.trim()
    : 'Level 1';

  const starsEarned = learner?.starsEarned ?? 0;
  const streakDays = learner?.currentStreakDays ?? 0;
  const completedQuests = progressSummary?.totalLessonsCompleted ?? 0;
  const totalCurriculumQuests = 12;

  const milestonePercent = Math.min(
    100,
    Math.round((completedQuests / totalCurriculumQuests) * 100)
  );

  const cards = [
    {
      id: 'reading-level',
      label: 'Reading Level',
      value: readingLevelName,
      helper: readingStageLabel,
      icon: <ReadingIcon size={28} />,
      iconBg: 'bg-[#EEE9FF]',
      borderHover: 'hover:border-[#7C65E8]',
    },
    {
      id: 'stars-earned',
      label: 'Stars Earned',
      value: `${starsEarned}`,
      helper: starsEarned > 0 ? 'Keep shining bright' : 'Earn stars on every quest',
      icon: <RewardStarIcon size={28} />,
      iconBg: 'bg-[#FFF7DC]',
      borderHover: 'hover:border-[#FFD76A]',
    },
    {
      id: 'reading-streak',
      label: 'Reading Streak',
      value: `${streakDays} ${streakDays === 1 ? 'Day' : 'Days'}`,
      helper: streakDays > 0 ? 'Great daily habit' : 'Start your streak today',
      icon: <StreakFlameIcon size={28} />,
      iconBg: 'bg-[#FFF0E6]',
      borderHover: 'hover:border-[#FFAE80]',
    },
    {
      id: 'quests-completed',
      label: 'Quests Completed',
      value: `${completedQuests} / ${totalCurriculumQuests}`,
      helper: completedQuests > 0 ? `${milestonePercent}% of journey complete` : 'Your first quest awaits',
      icon: <CompletedQuestIcon size={28} />,
      iconBg: 'bg-[#E3F9F1]',
      borderHover: 'hover:border-[#65D7B2]',
    },
  ];

  return (
    <section aria-labelledby="stats-heading" className="py-8 sm:py-10">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 id="stats-heading" className="text-2xl sm:text-3xl font-black text-[#171B3A]">
              Your Adventure So Far
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#5C5E7B] mt-1">
              Look how far you’ve come, superstar!
            </p>
          </div>
          {progressSummary && progressSummary.totalQuestionsAnswered > 0 && (
            <div className="text-xs sm:text-sm font-bold text-[#5843C4] tabular-nums">
              {progressSummary.totalQuestionsAnswered} activities practiced · {formatAccuracy(progressSummary.averageAccuracy)} accuracy
            </div>
          )}
        </div>

        {/* Four Compact Equal-Height Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-white rounded-[22px] p-5 border border-[#E5E0FA] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.borderHover} flex items-start gap-4`}
            >
              <div
                className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center shrink-0`}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-[#5C5E7B] block">
                  {card.label}
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#171B3A] tabular-nums leading-tight mt-0.5 truncate">
                  {card.value}
                </div>
                <span className="text-xs font-semibold text-[#6B6E8A] block mt-1 truncate">
                  {card.helper}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Polished Milestone Progress Track */}
        <div className="bg-white rounded-[22px] p-5 border border-[#E5E0FA] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-extrabold text-[#171B3A]">
              Next Reading Milestone: Complete all {totalCurriculumQuests} ReadQuest Adventures
            </span>
            <span className="text-xs sm:text-sm font-black text-[#5843C4] tabular-nums">
              {completedQuests} of {totalCurriculumQuests} quests ({milestonePercent}%)
            </span>
          </div>
          <AdventureProgressTrack
            value={completedQuests}
            max={totalCurriculumQuests}
            label={`Completed ${completedQuests} of ${totalCurriculumQuests} reading quests`}
            accent="purple"
            showMilestones
            showStarEndpoint
          />
        </div>
      </div>
    </section>
  );
};
