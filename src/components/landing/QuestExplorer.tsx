import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lesson, SessionRecord, SkillCategory, SkillCategoryId } from '../../types';
import { AdventureProgressTrack } from '../common/AdventureProgressTrack';
import { QuestButton, QuestButtonTheme } from '../common/ReadQuestButtons';
import {
  ArrowActionIcon,
  CompletedQuestIcon,
  LetterSoundsIcon,
  SightWordsIcon,
  StoryReadingIcon,
  WordBlendingIcon,
} from '../icons/ReadQuestIcons';
import { LANDING_ARTWORK, ResilientArtwork } from './ResilientArtwork';

interface QuestExplorerProps {
  categories: SkillCategory[];
  sessions: SessionRecord[];
  onStartLesson: (lessonId: string) => void;
  onExploreCategory: (categoryId: SkillCategoryId) => void;
}

interface WorldTheme {
  categoryId: SkillCategoryId;
  worldTitle: string;
  skillLabel: string;
  description: string;
  artwork: string;
  surfaceTint: string;
  accentHex: string;
  buttonTheme: QuestButtonTheme;
  progressAccent: 'mint' | 'sky' | 'purple' | 'peach';
  renderIcon: () => React.ReactNode;
}

const QUEST_WORLDS: WorldTheme[] = [
  {
    categoryId: 'letter-sounds',
    worldTitle: 'Phonics Forest',
    skillLabel: 'Letter Recognition & Sounds',
    description: 'Listen for initial sounds, short vowels, and letter teams with friendly woodland explorers.',
    artwork: LANDING_ARTWORK.phonicsForest,
    surfaceTint: 'bg-[#F0FBF7]',
    accentHex: '#189B73',
    buttonTheme: 'mint',
    progressAccent: 'mint',
    renderIcon: () => <LetterSoundsIcon size={24} className="shrink-0" />,
  },
  {
    categoryId: 'phonics-blending',
    worldTitle: 'Blending Beach',
    skillLabel: 'Sound Blending & Word Building',
    description: 'Snap letter tiles together along the sunny shore to form everyday words like cat, frog, and star.',
    artwork: LANDING_ARTWORK.blendingBeach,
    surfaceTint: 'bg-[#EEF8FE]',
    accentHex: '#0284C7',
    buttonTheme: 'sky',
    progressAccent: 'sky',
    renderIcon: () => <WordBlendingIcon size={24} className="shrink-0" />,
  },
  {
    categoryId: 'sight-words',
    worldTitle: 'Sight Word Galaxy',
    skillLabel: 'Instant Word Fluency',
    description: 'Spot high-frequency words among stars and planets to unlock smoother, faster sentence reading.',
    artwork: LANDING_ARTWORK.sightWordGalaxy,
    surfaceTint: 'bg-[#F4F0FF]',
    accentHex: '#5843C4',
    buttonTheme: 'purple',
    progressAccent: 'purple',
    renderIcon: () => <SightWordsIcon size={24} className="shrink-0" />,
  },
  {
    categoryId: 'comprehension',
    worldTitle: 'Storybook Kingdom',
    skillLabel: 'Stories & Comprehension',
    description: 'Journey through castle tales, trace story events, and discover why characters feel and act as they do.',
    artwork: LANDING_ARTWORK.storybookKingdom,
    surfaceTint: 'bg-[#FFF5EE]',
    accentHex: '#C25E28',
    buttonTheme: 'peach',
    progressAccent: 'peach',
    renderIcon: () => <StoryReadingIcon size={24} className="shrink-0" />,
  },
];

export const QuestExplorer: React.FC<QuestExplorerProps> = ({
  categories,
  sessions,
  onStartLesson,
  onExploreCategory,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const completedLessonIds = new Set(
    sessions.filter((s) => s.isCompleted).map((s) => s.lessonId)
  );
  const inProgressSessionMap = new Map(
    sessions.filter((s) => !s.isCompleted).map((s) => [s.lessonId, s])
  );

  return (
    <section aria-labelledby="quest-explorer-heading" className="py-10 sm:py-14">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2
              id="quest-explorer-heading"
              className="text-2xl sm:text-4xl font-black text-[#171B3A]"
            >
              Choose Your Next Quest
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#5C5E7B] mt-1">
              Every adventure helps you become a stronger reader.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onExploreCategory('letter-sounds')}
            className="group text-sm font-extrabold text-[#5843C4] hover:text-[#171B3A] inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap shrink-0 py-1.5"
          >
            <span>Browse all 12 quests</span>
            <ArrowActionIcon
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-[3px]"
            />
          </button>
        </div>

        {/* 4 Distinctive Themed Quest World Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUEST_WORLDS.map((world) => {
            const cat = categories.find((c) => c.id === world.categoryId);
            const lessonsInCat: Lesson[] = cat?.lessons || [];
            const totalInCat = lessonsInCat.length || 3;
            const completedCount = lessonsInCat.filter((l) =>
              completedLessonIds.has(l.id)
            ).length;

            // Find in-progress or next uncompleted lesson in this world
            const activeLesson = lessonsInCat.find((l) => inProgressSessionMap.has(l.id));
            const nextLesson =
              activeLesson ||
              lessonsInCat.find((l) => !completedLessonIds.has(l.id)) ||
              lessonsInCat[0];

            const isAllDone = completedCount >= totalInCat;

            return (
              <motion.article
                key={world.categoryId}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`group ${world.surfaceTint} rounded-[28px] border border-[#E2DCFB] shadow-xs hover:shadow-lg transition-shadow overflow-hidden flex flex-col justify-between`}
              >
                {/* Illustrated Header Visual with Subtle Artwork Hover Depth */}
                <div className="p-4 sm:p-5 pb-0">
                  <div className="relative rounded-[20px] overflow-hidden aspect-[16/9] bg-white border border-black/5">
                    <ResilientArtwork
                      src={world.artwork}
                      alt={`${world.worldTitle} — ${world.skillLabel}`}
                      fallbackTitle={world.worldTitle}
                      className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                  <div className="space-y-2.5">
                    {/* Unboxed 1-line Skill Indicator */}
                    <div
                      className="flex items-center justify-between text-xs font-extrabold gap-2"
                      style={{ color: world.accentHex }}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        {world.renderIcon()}
                        <span className="truncate">{world.skillLabel}</span>
                      </span>
                      <span className="text-[#171B3A] tabular-nums shrink-0">
                        {isAllDone ? (
                          <span className="inline-flex items-center gap-1.5 text-[#189B73]">
                            <CompletedQuestIcon size={18} />
                            <span>All {totalInCat} Complete</span>
                          </span>
                        ) : (
                          `${completedCount} of ${totalInCat} Completed`
                        )}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#171B3A]">
                      {world.worldTitle}
                    </h3>

                    <p className="text-sm font-medium text-[#34364B] leading-relaxed">
                      {world.description}
                    </p>

                    {/* Custom Adventure Progress Track */}
                    <div className="pt-1">
                      <AdventureProgressTrack
                        value={completedCount}
                        max={totalInCat}
                        label={`${world.worldTitle}: ${completedCount} of ${totalInCat} completed`}
                        accent={world.progressAccent}
                        height="sm"
                        showStarEndpoint
                      />
                    </div>
                  </div>

                  {/* Interactive Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5">
                    <QuestButton
                      theme={world.buttonTheme}
                      size="sm"
                      onClick={() =>
                        nextLesson
                          ? onStartLesson(nextLesson.id)
                          : onExploreCategory(world.categoryId)
                      }
                      icon={<ArrowActionIcon size={16} />}
                      iconPosition="right"
                    >
                      {activeLesson
                        ? 'Resume Quest'
                        : isAllDone
                        ? 'Practice Again'
                        : 'Enter World'}
                    </QuestButton>

                    <button
                      type="button"
                      onClick={() => onExploreCategory(world.categoryId)}
                      className="text-xs sm:text-sm font-extrabold text-[#34364B] hover:text-[#5843C4] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0 py-2"
                    >
                      View {totalInCat} lessons
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
