import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  Award,
  Star,
  Flame,
  CheckCircle2,
  Play,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import { questRepository } from '../services/repository';
import {
  AdaptiveRecommendation,
  Assignment,
  LearnerProfile,
  Lesson,
  ReadingProgressSummary,
  SessionRecord,
  SkillCategory,
} from '../types';
import {
  Trophy3DIllustration,
  ShortcutIcon,
  ReadingGroupVignette,
} from '../components/illustrations/ReadingIllustrations';
import { Button } from '../components/common/Button';

interface DashboardViewProps {
  profile: LearnerProfile | null;
  onRefreshProfile: () => Promise<void>;
  onOpenProfileModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  onRefreshProfile,
  onOpenProfileModal,
}) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [currentRecommendation, setCurrentRecommendation] = useState<AdaptiveRecommendation | null>(null);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [progressSummary, setProgressSummary] = useState<ReadingProgressSummary | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [showAdultExplanation, setShowAdultExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const learnerId = profile.id;
      const [cats, rec, active, summary, lessons, adaptRec, assignments] = await Promise.all([
        questRepository.getCategories(),
        questRepository.getRecommendedLesson(learnerId),
        questRepository.getActiveSession(),
        questRepository.getProgressSummary(learnerId),
        questRepository.getAllLessons(),
        questRepository.getAdaptiveRecommendation(learnerId),
        questRepository.getAssignments(undefined, learnerId),
      ]);
      setCategories(cats);
      setRecommendedLesson(rec);
      setActiveSession(active);
      setProgressSummary(summary);
      setAllLessons(lessons);
      setCurrentRecommendation(adaptRec);
      setPendingAssignments(
        assignments.filter((a) => !a.completedLearnerIds.includes(learnerId))
      );
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoadError('Unable to load your reading dashboard right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const handleStartLesson = (lessonId: string) => {
    navigate(`/activity/${lessonId}`);
  };

  const handleShortcutClick = (shortcutId: string) => {
    if (shortcutId === 'discover') {
      navigate('/library');
      return;
    }
    const catLesson = allLessons.find((l) => l.categoryId === shortcutId);
    if (catLesson) {
      navigate(`/activity/${catLesson.id}`);
    } else {
      navigate('/library');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 text-center space-y-4">
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-8 shadow-xs space-y-3">
          <h1 className="text-2xl font-black text-[#171B37]">Add a Child Reader Profile</h1>
          <p className="text-sm font-semibold text-[#6B6E8A]">
            Create a parent-managed reader profile to start quests, earn badges, and track reading progress.
          </p>
          <Button variant="peach" size="md" onClick={() => navigate('/account')}>
            Go to Account Settings
          </Button>
        </div>
      </div>
    );
  }

  if (loadError || !progressSummary) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 text-center space-y-4">
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-8 shadow-xs space-y-3">
          <h1 className="text-xl font-black text-[#171B37]">Unable to Load Quests</h1>
          <p className="text-sm font-semibold text-[#6B6E8A]">
            {loadError || 'Progress details could not be loaded.'}
          </p>
          <Button variant="primary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const overallProgressPercent = Math.min(
    100,
    Math.round((progressSummary.totalLessonsCompleted / 12) * 100)
  );
  const activeMinutes = Math.floor((progressSummary.totalActivePracticeSeconds || 0) / 60);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6 pb-28 md:pb-12">
      {/* 1. Top Header Row matching Reference Middle Screen */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Avatar + Greeting + Progress */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfileModal}
            className="w-12 h-12 rounded-full bg-[#EAF5F7] border-2 border-[#DED5FF] flex items-center justify-center text-2xl shadow-xs hover:scale-105 transition-transform cursor-pointer"
            title="Edit learner profile"
            aria-label={`Current avatar ${profile.avatarName}. Click to edit.`}
          >
            {profile.avatar}
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171B37] leading-tight">
              Hello, {profile.name.split(' ')[0]}
            </h1>
            <p className="text-xs font-bold text-[#6B6E8A] flex items-center gap-1.5">
              <span>⏱️</span>
              <span>{activeMinutes > 0 ? `${activeMinutes}m active practice` : 'Ready to read'}</span>
              <span>•</span>
              <span className="text-[#8274D8]">{profile.gradeLevel}</span>
            </p>
          </div>
        </div>

        {/* Right: Streak + Notification Bell */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-[#DED5FF] px-3 py-1.5 rounded-full text-xs font-extrabold text-[#171B37] shadow-xs">
            <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-500" />
            <span>{profile.currentStreakDays}d</span>
          </div>

          <button
            onClick={onOpenProfileModal}
            className="w-10 h-10 rounded-full bg-white border border-[#DED5FF] flex items-center justify-center text-[#171B37] hover:bg-[#F2EEFF] transition-colors relative cursor-pointer shadow-xs"
            aria-label="View notifications and profile"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#FFC38E] absolute top-2.5 right-2.5 ring-2 ring-white" />
          </button>
        </div>
      </div>

      {/* 2. Purple Quest Progress Panel matching Reference */}
      <div className="bg-purple-panel text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-md flex-1">
            <span className="inline-block text-xs font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              Level 1 · Seedling Stage
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              This is your first step to greatness!
            </h2>

            {/* Slider bar with circular thumb from reference */}
            <div className="pt-2">
              <div className="relative w-full bg-white/25 h-2.5 rounded-full">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(8, overallProgressPercent)}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FFC38E] border-2 border-white shadow-sm transition-all duration-500"
                  style={{ left: `calc(${Math.max(8, overallProgressPercent)}% - 10px)` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-[#DED5FF] mt-2">
                <span>{progressSummary.totalLessonsCompleted} of 12 Quests Completed</span>
                <span>{profile.starsEarned} Stars</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Trophy3DIllustration className="w-20 h-20 sm:w-24 sm:h-24" />
          </div>
        </div>
      </div>

      {/* 3. Circular Category Shortcuts Row matching Reference */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'letter-sounds', label: 'Sounds', type: 'sounds' as const },
            { id: 'phonics-blending', label: 'Phonics', type: 'phonics' as const },
            { id: 'sight-words', label: 'Sight Words', type: 'sight-words' as const },
            { id: 'comprehension', label: 'Stories', type: 'stories' as const },
            { id: 'discover', label: 'Discover', type: 'discover' as const },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleShortcutClick(item.id)}
              className="group flex flex-col items-center gap-1.5 min-w-[62px] sm:flex-1 cursor-pointer"
            >
              <ShortcutIcon type={item.type} className="w-12 h-12 sm:w-14 sm:h-14" />
              <span className="text-xs font-extrabold text-[#171B37] group-hover:text-[#8274D8] transition-colors">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Teacher Assigned Quests (if any pending) */}
      {pendingAssignments.length > 0 && (
        <div className="bg-[#FFF3E8] border-2 border-[#FFC38E] rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FFC38E] text-[#171B37] flex items-center justify-center font-black text-lg shadow-xs">
                🎒
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-white/80 px-2 py-0.5 rounded-full border border-[#FFC38E]">
                  Teacher Assignment
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#171B37] mt-0.5">
                  {pendingAssignments[0].title}
                </h3>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStartLesson(pendingAssignments[0].lessonId)}
              className="inline-flex items-center gap-2 shadow-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Assignment</span>
            </Button>
          </div>

          {pendingAssignments[0].instructions && (
            <p className="text-xs text-[#34364B] bg-white/70 p-2.5 rounded-2xl border border-[#FFC38E]/50 font-medium leading-relaxed">
              <strong>Teacher Note:</strong> {pendingAssignments[0].instructions}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] font-extrabold text-[#6B6E8A] pt-1">
            <span>Quest: {pendingAssignments[0].lessonTitle}</span>
            {pendingAssignments[0].dueDate && (
              <span className="text-amber-900 font-black">
                Due: {pendingAssignments[0].dueDate}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Prominent "Your Next Quest" Card matching Reference Card 1 */}
      {recommendedLesson && (
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2EEFF] flex items-center justify-center text-[#8274D8]">
                <BookOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-[#8274D8] uppercase tracking-wider block">
                  Your Next Quest · Adaptive Pick
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#171B37]">
                  {recommendedLesson.title}
                </h3>
              </div>
            </div>

            <button
              onClick={() => handleStartLesson(recommendedLesson.id)}
              className="w-11 h-11 rounded-full bg-[#171B37] text-white flex items-center justify-center hover:bg-[#252C55] transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              aria-label={`Open quest: ${recommendedLesson.title}`}
            >
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Child-Friendly Adaptive Rationale */}
          {currentRecommendation?.childFriendlyReason && (
            <div className="bg-[#FAF8FD] border border-[#DED5FF] rounded-2xl p-3 text-xs sm:text-sm font-bold text-[#171B37] flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#8274D8] shrink-0" />
              <span>{currentRecommendation.childFriendlyReason}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-3 max-w-md">
              <p className="text-xs sm:text-sm font-semibold text-[#6B6E8A] leading-relaxed">
                {recommendedLesson.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#171B37]">
                <span className="bg-[#EAF5F7] px-2.5 py-1 rounded-xl text-[#8274D8]">
                  {recommendedLesson.categoryName}
                </span>
                <span>•</span>
                <span>{recommendedLesson.totalActivities ?? recommendedLesson.totalQuestions ?? 5} Activities</span>
                <span>•</span>
                <span className="text-amber-600">🏆 {recommendedLesson.badgeReward}</span>
              </div>

              {/* Adult / Educator Explanation Accordion */}
              <div className="pt-0.5">
                <button
                  onClick={() => setShowAdultExplanation(!showAdultExplanation)}
                  className="text-[11px] font-bold text-[#8274D8] hover:text-[#171B37] flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    {showAdultExplanation
                      ? 'Hide Educator Explanation'
                      : 'Why this quest? (Adult / Educator Explanation)'}
                  </span>
                  {showAdultExplanation ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {showAdultExplanation && currentRecommendation && (
                  <div className="mt-2 p-3.5 bg-[#FAF8FD] border border-[#DED5FF] rounded-2xl text-xs space-y-2 text-[#34364B]">
                    <div className="flex flex-wrap items-center gap-2 font-bold text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-[#EAF5F7] text-[#171B37]">
                        Tier {currentRecommendation.priorityTier} ({currentRecommendation.priorityLabel})
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#8274D8]">
                        Evidence: {currentRecommendation.evidenceStatus}
                      </span>
                      {currentRecommendation.masteryScore !== null && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          Score: {currentRecommendation.masteryScore.toFixed(1)}% ({currentRecommendation.band})
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-[#4A3B69] leading-relaxed">
                      {currentRecommendation.adultFacingExplanation}
                    </p>
                    <p className="text-[10px] text-[#6B6E8A] italic">
                      The adaptive engine continuously recalculates across the 10-attempt rolling window. (Note: Not every individual answer changes the target focus quest).
                    </p>
                  </div>
                )}
              </div>

              {activeSession && activeSession.lessonId === recommendedLesson.id && !activeSession.isCompleted && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold inline-block">
                  Paused at Question {activeSession.currentQuestionIndex + 1} of 5
                </div>
              )}

              <div className="pt-1">
                <Button
                  variant="peach"
                  size="md"
                  onClick={() => handleStartLesson(recommendedLesson.id)}
                  icon={
                    activeSession && activeSession.lessonId === recommendedLesson.id && !activeSession.isCompleted ? (
                      <Play className="w-4 h-4 fill-current" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                    )
                  }
                  iconPosition="right"
                >
                  {activeSession && activeSession.lessonId === recommendedLesson.id && !activeSession.isCompleted
                    ? 'Resume Quest'
                    : 'Start Quest'}
                </Button>
              </div>
            </div>

            <div className="shrink-0 flex justify-center sm:justify-end">
              <ReadingGroupVignette className="w-36 h-28 sm:w-44 sm:h-32" />
            </div>
          </div>
        </div>
      )}

      {/* 5. Quick Skill Grid / Continue-Learning Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-[#171B37]">
            Active Reading Quests
          </h3>
          <button
            onClick={() => navigate('/library')}
            className="text-xs font-extrabold text-[#8274D8] hover:underline cursor-pointer"
          >
            View All ({allLessons.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const lesson = cat.lessons[0];
            const catProgress = progressSummary.categoriesProgress[cat.id];
            const isDone = Boolean(catProgress?.completed);

            return (
              <div
                key={cat.id}
                className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs hover:border-[#8274D8] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF5F7] flex items-center justify-center text-xl shrink-0">
                    {cat.id === 'letter-sounds' && '🦁'}
                    {cat.id === 'phonics-blending' && '🧩'}
                    {cat.id === 'sight-words' && '⭐'}
                    {cat.id === 'comprehension' && '📖'}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#171B37]">
                      {cat.name}
                    </h4>
                    <p className="text-xs font-semibold text-[#6B6E8A]">
                      {isDone ? `Mastered (${catProgress.bestScore}/5)` : 'Ready to explore'}
                    </p>
                  </div>
                </div>

                {lesson && (
                  <Button
                    variant={isDone ? 'outline' : 'peach'}
                    size="sm"
                    onClick={() => handleStartLesson(lesson.id)}
                    className="shrink-0 px-3 py-1 text-xs"
                  >
                    {isDone ? 'Replay' : 'Start'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
