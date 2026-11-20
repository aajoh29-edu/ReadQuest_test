import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw } from 'lucide-react';
import { questRepository } from '../services/repository';
import { useAuth } from '../contexts/AuthContext';
import {
  AdaptiveRecommendation,
  Lesson,
  ReadingLevel,
  ReadingProgressSummary,
  SessionRecord,
  SkillCategory,
  SkillCategoryId,
} from '../types';
import { HeroSection } from '../components/landing/HeroSection';
import { LearningStats } from '../components/landing/LearningStats';
import { ContinueReadingCard } from '../components/landing/ContinueReadingCard';
import { QuestExplorer } from '../components/landing/QuestExplorer';
import { LibraryPreview } from '../components/landing/LibraryPreview';
import { AchievementPreview } from '../components/landing/AchievementPreview';
import { ParentBenefits } from '../components/landing/ParentBenefits';
import { SecondaryButton } from '../components/common/ReadQuestButtons';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const WelcomeView: React.FC = () => {
  const navigate = useNavigate();
  const { status, activeChild } = useAuth();

  // Public curriculum catalog state (independent of authentication)
  const [readingLevels, setReadingLevels] = useState<ReadingLevel[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isFetchingCurriculumRef = useRef(false);

  // Authenticated learner personalization state (strictly isolated from public landing)
  const [progressSummary, setProgressSummary] = useState<ReadingProgressSummary | null>(null);
  const [learnerSessions, setLearnerSessions] = useState<SessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [adaptiveRec, setAdaptiveRec] = useState<AdaptiveRecommendation | null>(null);

  const isAuthenticated = status === 'authenticated';

  const loadCurriculum = useCallback(async () => {
    if (isFetchingCurriculumRef.current) return;
    isFetchingCurriculumRef.current = true;
    setIsCurriculumLoading(true);
    setCurriculumError(null);

    try {
      const [levels, cats, allLessons] = await Promise.all([
        questRepository.getReadingLevels(),
        questRepository.getCategories(),
        questRepository.getAllLessons(),
      ]);

      setReadingLevels(levels);
      setCategories(cats);
      setLessons(allLessons);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[WelcomeView] Public curriculum fetch failed:', err);
      }
      setCurriculumError('Reading adventures are temporarily unavailable. Please try again later.');
    } finally {
      isFetchingCurriculumRef.current = false;
      setIsCurriculumLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  useEffect(() => {
    let isCancelled = false;

    if (!isAuthenticated || !activeChild) {
      setProgressSummary(null);
      setLearnerSessions([]);
      setActiveSession(null);
      setAdaptiveRec(null);
      setRecommendedLesson(lessons[0] || null);
      return;
    }

    const loadPersonalization = async () => {
      try {
        const [summary, sessions, active, recLesson, adaptRec] = await Promise.all([
          questRepository.getProgressSummary(activeChild.id).catch(() => null),
          questRepository.getLearnerSessions(activeChild.id).catch(() => []),
          questRepository.getActiveSession().catch(() => null),
          questRepository.getRecommendedLesson(activeChild.id).catch(() => lessons[0] || null),
          questRepository.getAdaptiveRecommendation(activeChild.id).catch(() => null),
        ]);

        if (isCancelled) return;
        setProgressSummary(summary);
        setLearnerSessions(sessions);
        setActiveSession(active);
        setRecommendedLesson(recLesson || lessons[0] || null);
        setAdaptiveRec(adaptRec);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[WelcomeView] Personalized progress load failed:', err);
        }
      }
    };

    loadPersonalization();
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeChild, lessons]);

  const handleRetryCurriculum = () => {
    if (isCurriculumLoading) return;
    setRetryCount((prev) => prev + 1);
    loadCurriculum();
  };

  const handleStartAdventure = () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    if (!activeChild) {
      navigate('/account');
      return;
    }
    if (activeSession) {
      navigate(`/activity/${activeSession.lessonId}`);
      return;
    }
    if (recommendedLesson) {
      navigate(`/activity/${recommendedLesson.id}`);
      return;
    }
    navigate('/dashboard');
  };

  const handleExploreLibrary = () => {
    navigate('/library');
  };

  const handleLaunchLesson = (lessonId: string) => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(`/activity/${lessonId}`)}`);
      return;
    }
    if (!activeChild) {
      navigate('/account');
      return;
    }
    navigate(`/activity/${lessonId}`);
  };

  const handleExploreCategory = (categoryId: SkillCategoryId) => {
    navigate(`/library?category=${categoryId}`);
  };

  const handleViewAllAchievements = () => {
    navigate(isAuthenticated ? '/progress' : '/login?returnTo=%2Fprogress');
  };

  const hasAnyHistory =
    Boolean(isAuthenticated && activeChild) &&
    ((progressSummary?.totalLessonsCompleted ?? 0) > 0 ||
      (progressSummary?.totalQuestionsAnswered ?? 0) > 0 ||
      Boolean(activeSession));

  const starterLessons = lessons.filter((l) => l.readingLevelId === 'level-1');

  return (
    <div className="pb-12">
      {/* 1. Immersive Split Hero Section (Always renders immediately without blocking on auth/API) */}
      <HeroSection
        learner={isAuthenticated ? activeChild : null}
        recommendedLesson={recommendedLesson}
        adaptiveRec={adaptiveRec}
        activeSession={activeSession}
        completedQuestsCount={progressSummary?.totalLessonsCompleted ?? 0}
        onStartAdventure={handleStartAdventure}
        onExploreLibrary={handleExploreLibrary}
      />

      {/* 2. Personalized Learning Overview ("Your Adventure So Far") */}
      <LearningStats
        learner={isAuthenticated ? activeChild : null}
        progressSummary={progressSummary}
        readingLevels={readingLevels}
      />

      {/* 3–5. Public Curriculum Preview Sections (Localized loading / error / retry boundary) */}
      <ErrorBoundary
        fallbackTitle="Curriculum Preview Unavailable"
        fallbackMessage="Reading adventures could not be displayed right now. The rest of ReadQuest remains available."
        onReset={handleRetryCurriculum}
      >
        {isCurriculumLoading ? (
          <section
            aria-label="Loading reading adventures"
            className="py-10 sm:py-12"
          >
            <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white/85 border border-[#DED5FF] rounded-[28px] p-8 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-9 h-9 border-4 border-[#7C65E8] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-extrabold text-[#171B3A]">
                  Loading reading adventures...
                </p>
              </div>
            </div>
          </section>
        ) : curriculumError ? (
          <section
            aria-label="Reading adventures status"
            className="py-8 sm:py-10"
          >
            <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white border border-[#DED5FF] rounded-[28px] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEE9FF] text-[#5843C4] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-[#171B3A]">
                      Curriculum Preview Unavailable
                    </h2>
                    <p className="text-sm font-semibold text-[#5C5E7B]">
                      {curriculumError}
                    </p>
                  </div>
                </div>
                <SecondaryButton
                  size="sm"
                  disabled={isCurriculumLoading || retryCount >= 5}
                  onClick={handleRetryCurriculum}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  {retryCount >= 5 ? 'Please Refresh Later' : 'Try Again'}
                </SecondaryButton>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* 3. Continue Your Adventure / First Adventure Starter */}
            <ContinueReadingCard
              activeSession={activeSession}
              recommendedLesson={recommendedLesson}
              adaptiveRec={adaptiveRec}
              starterLessons={starterLessons}
              hasAnyHistory={hasAnyHistory}
              onLaunchLesson={handleLaunchLesson}
            />

            {/* 4. Themed Quest Worlds Explorer */}
            <QuestExplorer
              categories={categories}
              sessions={learnerSessions}
              onStartLesson={handleLaunchLesson}
              onExploreCategory={handleExploreCategory}
            />

            {/* 5. Storybook Library Showcase Carousel */}
            <LibraryPreview
              lessons={lessons}
              sessions={learnerSessions}
              onReadStory={handleLaunchLesson}
              onViewAllStories={handleExploreLibrary}
            />
          </>
        )}
      </ErrorBoundary>

      {/* 6. Achievement Preview + Quill Reading Buddy */}
      <AchievementPreview
        learner={isAuthenticated ? activeChild : null}
        onViewAllAchievements={handleViewAllAchievements}
      />

      {/* 7. Parent & Educator Value Section */}
      <ParentBenefits />
    </div>
  );
};
