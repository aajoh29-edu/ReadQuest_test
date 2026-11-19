import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { questRepository } from '../services/repository';
import {
  AdaptiveRecommendation,
  Learner,
  LearnerProfile,
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

interface WelcomeViewProps {
  profile?: LearnerProfile | null;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ profile }) => {
  const navigate = useNavigate();

  const [learner, setLearner] = useState<Learner | null>(null);
  const [progressSummary, setProgressSummary] = useState<ReadingProgressSummary | null>(null);
  const [readingLevels, setReadingLevels] = useState<ReadingLevel[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [learnerSessions, setLearnerSessions] = useState<SessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [adaptiveRec, setAdaptiveRec] = useState<AdaptiveRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLandingData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const currentLearner = await questRepository.getLearner();
      const [
        summary,
        levels,
        cats,
        allLessons,
        sessions,
        active,
        recLesson,
        adaptRec,
      ] = await Promise.all([
        questRepository.getProgressSummary(currentLearner.id),
        questRepository.getReadingLevels(),
        questRepository.getCategories(),
        questRepository.getAllLessons(),
        questRepository.getLearnerSessions(currentLearner.id),
        questRepository.getActiveSession(),
        questRepository.getRecommendedLesson(currentLearner.id),
        questRepository.getAdaptiveRecommendation(currentLearner.id),
      ]);

      setLearner(currentLearner);
      setProgressSummary(summary);
      setReadingLevels(levels);
      setCategories(cats);
      setLessons(allLessons);
      setLearnerSessions(sessions);
      setActiveSession(active);
      setRecommendedLesson(recLesson);
      setAdaptiveRec(adaptRec);
    } catch (err) {
      setLoadError('Unable to load your reading adventure right now. Please try refreshing.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLandingData();
  }, [loadLandingData, profile?.id, profile?.name, profile?.avatar, profile?.readingLevelId, profile?.starsEarned]);

  const handleStartAdventure = () => {
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
    navigate(`/activity/${lessonId}`);
  };

  const handleExploreCategory = (categoryId: SkillCategoryId) => {
    navigate(`/library?category=${categoryId}`);
  };

  const handleViewAllAchievements = () => {
    navigate('/progress');
  };

  if (isLoading && !learner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#7C65E8] border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-extrabold text-[#171B3A]">
          Preparing your reading adventure...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-white border border-[#DED5FF] rounded-3xl p-8 shadow-xs space-y-3">
          <h1 className="text-xl font-black text-[#171B3A]">Oops! Something went wrong</h1>
          <p className="text-sm font-medium text-[#5C5E7B]">{loadError}</p>
          <button
            type="button"
            onClick={loadLandingData}
            className="px-5 py-2.5 bg-[#7C65E8] text-white font-extrabold rounded-2xl text-sm cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasAnyHistory =
    (progressSummary?.totalLessonsCompleted ?? 0) > 0 ||
    (progressSummary?.totalQuestionsAnswered ?? 0) > 0 ||
    Boolean(activeSession);

  const starterLessons = lessons.filter((l) => l.readingLevelId === 'level-1');

  return (
    <div className="pb-12">
      {/* 1. Immersive Split Hero Section */}
      <HeroSection
        learner={learner}
        recommendedLesson={recommendedLesson}
        adaptiveRec={adaptiveRec}
        activeSession={activeSession}
        completedQuestsCount={progressSummary?.totalLessonsCompleted ?? 0}
        onStartAdventure={handleStartAdventure}
        onExploreLibrary={handleExploreLibrary}
      />

      {/* 2. Personalized Learning Dashboard ("Your Adventure So Far") */}
      <LearningStats
        learner={learner}
        progressSummary={progressSummary}
        readingLevels={readingLevels}
      />

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

      {/* 6. Achievement Preview + Quill Reading Buddy */}
      <AchievementPreview
        learner={learner}
        onViewAllAchievements={handleViewAllAchievements}
      />

      {/* 7. Parent & Educator Value Section */}
      <ParentBenefits />
    </div>
  );
};
