import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Lesson, SessionRecord } from '../../types';
import {
  IconButton,
  QuestButton,
  QuestButtonTheme,
  SecondaryButton,
} from '../common/ReadQuestButtons';
import {
  ArrowActionIcon,
  CompletedQuestIcon,
  LockedQuestIcon,
  StoryReadingIcon,
} from '../icons/ReadQuestIcons';
import { LANDING_ARTWORK, ResilientArtwork } from './ResilientArtwork';

interface LibraryPreviewProps {
  lessons: Lesson[];
  sessions: SessionRecord[];
  onReadStory: (lessonId: string) => void;
  onViewAllStories: () => void;
}

const COVER_PALETTES: Array<{
  bg: string;
  spine: string;
  artwork: string;
  theme: QuestButtonTheme;
}> = [
  {
    bg: 'from-[#65D7B2]/35 via-[#EAFBF5] to-white',
    spine: 'bg-[#189B73]',
    artwork: LANDING_ARTWORK.phonicsForest,
    theme: 'mint',
  },
  {
    bg: 'from-[#72C7F5]/35 via-[#EDF7FE] to-white',
    spine: 'bg-[#0284C7]',
    artwork: LANDING_ARTWORK.blendingBeach,
    theme: 'sky',
  },
  {
    bg: 'from-[#7C65E8]/30 via-[#EEE9FF] to-white',
    spine: 'bg-[#5843C4]',
    artwork: LANDING_ARTWORK.sightWordGalaxy,
    theme: 'purple',
  },
  {
    bg: 'from-[#FFAE80]/35 via-[#FFF4EC] to-white',
    spine: 'bg-[#C25E28]',
    artwork: LANDING_ARTWORK.storybookKingdom,
    theme: 'peach',
  },
];

export const LibraryPreview: React.FC<LibraryPreviewProps> = ({
  lessons,
  sessions,
  onReadStory,
  onViewAllStories,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Feature comprehension stories & signature reading quests first so Storybook showcase feels rich
  const prioritizedBooks = [
    ...lessons.filter((l) => l.categoryId === 'comprehension'),
    ...lessons.filter((l) => l.categoryId !== 'comprehension').slice(0, 4),
  ].slice(0, 6);

  const completedIds = new Set(sessions.filter((s) => s.isCompleted).map((s) => s.lessonId));

  const getBookState = (lesson: Lesson) => {
    const completed = sessions.find((s) => s.lessonId === lesson.id && s.isCompleted);
    const inProgress = sessions.find((s) => s.lessonId === lesson.id && !s.isCompleted);
    const prereqReady = !lesson.prerequisiteLessonId || completedIds.has(lesson.prerequisiteLessonId);

    if (completed) {
      return {
        label: 'Completed',
        actionText: 'Read Again',
        pct: 100,
        prereqReady: true,
        isCompleted: true,
      };
    }
    if (inProgress) {
      const done = inProgress.attempts.length;
      const total = inProgress.totalActivities || 5;
      return {
        label: `${done}/${total} steps done`,
        actionText: 'Continue Story',
        pct: Math.round((done / total) * 100),
        prereqReady,
        isCompleted: false,
      };
    }
    return {
      label: prereqReady ? 'Ready to read' : 'Recommended after prerequisite',
      actionText: 'Read Story',
      pct: 0,
      prereqReady,
      isCompleted: false,
    };
  };

  const getPalette = (categoryId: string) => {
    switch (categoryId) {
      case 'letter-sounds':
        return COVER_PALETTES[0];
      case 'phonics-blending':
        return COVER_PALETTES[1];
      case 'sight-words':
        return COVER_PALETTES[2];
      case 'comprehension':
      default:
        return COVER_PALETTES[3];
    }
  };

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === 'next' ? 300 : -300,
      behavior: 'smooth',
    });
  };

  return (
    <section
      aria-labelledby="library-showcase-heading"
      className="py-10 sm:py-14 bg-white/85 border-y border-[#EEE9FF]"
    >
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2
              id="library-showcase-heading"
              className="text-2xl sm:text-4xl font-black text-[#171B3A]"
            >
              A World of Stories Awaits
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#5C5E7B] mt-1">
              Discover amazing characters, explore exciting worlds, and find your next favorite book.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="hidden md:flex items-center gap-2 mr-1">
              <IconButton
                label="Scroll stories left"
                variant="surface"
                onClick={() => scrollCarousel('prev')}
              >
                <ChevronLeft className="w-5 h-5" />
              </IconButton>
              <IconButton
                label="Scroll stories right"
                variant="surface"
                onClick={() => scrollCarousel('next')}
              >
                <ChevronRight className="w-5 h-5" />
              </IconButton>
            </div>

            <SecondaryButton
              size="md"
              onClick={onViewAllStories}
              icon={<ArrowActionIcon size={16} />}
              iconPosition="right"
            >
              View All Stories
            </SecondaryButton>
          </div>
        </div>

        {/* Horizontal Storybook Carousel with Scroll Snap on Mobile */}
        <div
          ref={carouselRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth no-scrollbar"
          role="region"
          aria-label="Storybook Library Showcase Carousel"
        >
          {prioritizedBooks.map((book) => {
            const palette = getPalette(book.categoryId);
            const state = getBookState(book);

            return (
              <article
                key={book.id}
                className="group snap-start shrink-0 w-[260px] sm:w-[275px] bg-[#FAF9FF] rounded-[24px] border border-[#E5E0FA] p-4 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-4"
              >
                {/* Storybook Cover (Consistent 3:4 Portrait Aspect Ratio with Spine Detail) */}
                <div className="space-y-3">
                  <div
                    className={`relative aspect-[4/3] sm:aspect-[3/4] rounded-[18px] overflow-hidden bg-gradient-to-br ${palette.bg} border border-[#DED5FF] shadow-sm flex flex-col justify-between`}
                  >
                    {/* Tactile Book Spine Edge */}
                    <div
                      className={`absolute inset-y-0 left-0 w-2.5 ${palette.spine} opacity-85 z-10`}
                      aria-hidden="true"
                    />

                    {/* Illustrated Cover Image */}
                    <div className="h-[58%] w-full overflow-hidden">
                      <ResilientArtwork
                        src={palette.artwork}
                        alt={`Cover artwork for ${book.title}`}
                        fallbackTitle={book.title}
                        className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                    </div>

                    {/* Cover Title Typography */}
                    <div className="p-3.5 pl-5 bg-white/95 backdrop-blur-xs flex-1 flex flex-col justify-between border-t border-[#EEE9FF]">
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold text-[#5843C4] block">
                          {book.readingLevelName}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-[#171B3A] leading-snug line-clamp-2">
                          {book.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5C5E7B] pt-1">
                        <span>{book.categoryName}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {book.estimatedMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description & Progress */}
                  <p className="text-xs font-medium text-[#34364B] leading-relaxed line-clamp-2 px-1">
                    {book.description}
                  </p>
                </div>

                {/* Progress Indicator & Read Story Button */}
                <div className="space-y-2.5 pt-2 border-t border-[#EEE9FF]">
                  <div className="flex items-center justify-between text-xs font-bold px-1">
                    <span className="inline-flex items-center gap-1.5 text-[#34364B]">
                      {state.isCompleted ? (
                        <CompletedQuestIcon size={18} />
                      ) : !state.prereqReady ? (
                        <LockedQuestIcon size={18} />
                      ) : (
                        <StoryReadingIcon size={18} />
                      )}
                      <span>{state.label}</span>
                    </span>
                    {state.pct > 0 && (
                      <span className="text-[#5843C4] tabular-nums">{state.pct}%</span>
                    )}
                  </div>

                  <QuestButton
                    theme={state.isCompleted ? 'mint' : palette.theme}
                    size="sm"
                    onClick={() => onReadStory(book.id)}
                    className="w-full justify-center"
                    icon={<ArrowActionIcon size={16} />}
                    iconPosition="right"
                  >
                    {state.actionText}
                  </QuestButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
