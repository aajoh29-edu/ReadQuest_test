import React from 'react';
import { Clock } from 'lucide-react';
import { AdaptiveRecommendation, Lesson, SessionRecord } from '../../types';
import { AdventureButton, QuestButton } from '../common/ReadQuestButtons';
import { AdventureProgressTrack } from '../common/AdventureProgressTrack';
import {
  ArrowActionIcon,
  ContinueReadingIcon,
  SparkleAccentIcon,
} from '../icons/ReadQuestIcons';
import { AchievementBadge } from '../icons/AchievementBadges';
import { LANDING_ARTWORK, ResilientArtwork } from './ResilientArtwork';
import { ReadQuestMascot } from './ReadQuestMascot';

interface ContinueReadingCardProps {
  activeSession: SessionRecord | null;
  recommendedLesson: Lesson | null;
  adaptiveRec: AdaptiveRecommendation | null;
  starterLessons: Lesson[];
  hasAnyHistory: boolean;
  onLaunchLesson: (lessonId: string) => void;
}

export const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({
  activeSession,
  recommendedLesson,
  adaptiveRec,
  starterLessons,
  hasAnyHistory,
  onLaunchLesson,
}) => {
  // Determine artwork based on category
  const getCategoryArt = (categoryId?: string) => {
    switch (categoryId) {
      case 'letter-sounds':
        return LANDING_ARTWORK.phonicsForest;
      case 'phonics-blending':
        return LANDING_ARTWORK.blendingBeach;
      case 'sight-words':
        return LANDING_ARTWORK.sightWordGalaxy;
      case 'comprehension':
      default:
        return LANDING_ARTWORK.storybookKingdom;
    }
  };

  // New user empty state: "Choose Your First Adventure!"
  if (!hasAnyHistory && !activeSession) {
    const starterOptions = starterLessons.slice(0, 3);
    return (
      <section aria-labelledby="continue-heading" className="py-6 sm:py-8">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#EEE9FF]/65 rounded-[28px] p-6 sm:p-8 border border-[#DED5FF] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 id="continue-heading" className="text-2xl sm:text-3xl font-black text-[#171B3A]">
                  Choose Your First Adventure!
                </h2>
                <p className="text-sm sm:text-base font-semibold text-[#5C5E7B] mt-1">
                  Pick a friendly starter quest below to begin earning stars and badges.
                </p>
              </div>
              <ReadQuestMascot
                size="sm"
                message="Pick any adventure to begin — I’ll cheer you on at every step!"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {starterOptions.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-[22px] p-5 border border-[#DED5FF] shadow-xs flex flex-col justify-between gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs font-extrabold text-[#5843C4]">
                      {lesson.categoryName} · {lesson.readingLevelName}
                    </div>
                    <h3 className="text-lg font-black text-[#171B3A] leading-snug">
                      {lesson.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-[#5C5E7B] line-clamp-2">
                      {lesson.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#F0ECFF]">
                    <span className="text-xs font-bold text-[#5C5E7B]">
                      ~{lesson.estimatedMinutes} mins · {lesson.totalActivities} steps
                    </span>
                    <QuestButton
                      theme="purple"
                      size="sm"
                      onClick={() => onLaunchLesson(lesson.id)}
                      icon={<ArrowActionIcon size={16} />}
                      iconPosition="right"
                    >
                      Start Quest
                    </QuestButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Returning learner state: show Active Session OR Recommended Next Lesson
  const targetLesson = recommendedLesson;
  if (!targetLesson) return null;

  const isResume = Boolean(activeSession);
  const lessonTitle = activeSession ? activeSession.lessonTitle : targetLesson.title;
  const lessonId = activeSession ? activeSession.lessonId : targetLesson.id;
  const categoryName = activeSession
    ? targetLesson.categoryName
    : adaptiveRec?.categoryName || targetLesson.categoryName;
  const categoryId = activeSession ? activeSession.categoryId : targetLesson.categoryId;

  const totalSteps = activeSession
    ? activeSession.totalActivities
    : targetLesson.totalActivities || 5;
  const completedSteps = activeSession ? activeSession.attempts.length : 0;

  return (
    <section aria-labelledby="continue-heading" className="py-6 sm:py-8">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#EEE9FF]/75 rounded-[28px] p-6 sm:p-8 border border-[#DED5FF] shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Illustration Column */}
            <div className="lg:col-span-5">
              <div className="rounded-[22px] overflow-hidden aspect-[4/3] bg-white border border-[#DED5FF] shadow-sm">
                <ResilientArtwork
                  src={getCategoryArt(categoryId)}
                  alt={`${categoryName} adventure illustration`}
                  fallbackTitle={lessonTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Activity Info & Continue Action */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#5843C4]">
                {isResume ? (
                  <ContinueReadingIcon size={20} className="shrink-0" />
                ) : (
                  <SparkleAccentIcon size={18} className="shrink-0" />
                )}
                <span>{isResume ? 'Saved Progress Ready' : 'Adaptive Next Step'}</span>
              </div>

              <h2 id="continue-heading" className="text-2xl sm:text-3xl font-black text-[#171B3A]">
                {isResume ? 'Pick Up Where You Left Off' : 'Your Recommended Next Quest'}
              </h2>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-[#171B3A]">
                  {lessonTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold text-[#5C5E7B]">
                  <span className="text-[#5843C4]">{categoryName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{targetLesson.readingLevelName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{targetLesson.estimatedMinutes} mins
                  </span>
                </div>
                <p className="text-sm font-medium text-[#34364B] leading-relaxed max-w-2xl pt-1">
                  {adaptiveRec?.childFriendlyReason || targetLesson.description}
                </p>
              </div>

              {/* Custom Adventure Progress Track */}
              <div className="bg-white rounded-2xl p-4 border border-[#DED5FF] space-y-2.5 max-w-xl">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-[#171B3A]">
                    {isResume ? 'Quest Progress' : 'Ready to Begin'}
                  </span>
                  <span className="text-[#5843C4] tabular-nums">
                    {completedSteps} of {totalSteps} activities completed
                  </span>
                </div>
                <AdventureProgressTrack
                  value={completedSteps}
                  max={totalSteps}
                  label={`${completedSteps} of ${totalSteps} activities completed`}
                  accent="purple"
                  showStarEndpoint
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-4">
                <AdventureButton
                  size="lg"
                  onClick={() => onLaunchLesson(lessonId)}
                  icon={isResume ? <ContinueReadingIcon size={22} /> : undefined}
                  iconPosition="left"
                  showArrow
                >
                  {isResume ? 'Continue Quest' : 'Start Next Quest'}
                </AdventureButton>

                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#5C5E7B]">
                  <AchievementBadge kind="first-story" state="unlocked" size={26} />
                  <span>Reward badge: {targetLesson.badgeReward}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
