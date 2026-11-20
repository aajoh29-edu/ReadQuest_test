import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, CheckCircle2, Play, ArrowRight, Info, BookOpen } from 'lucide-react';
import { questRepository } from '../services/repository';
import { useAuth } from '../contexts/AuthContext';
import { Lesson, ReadingLevel, ReadingLevelId, SessionRecord, SkillCategoryId } from '../types';
import { ReadingGroupVignette } from '../components/illustrations/ReadingIllustrations';
import { Button } from '../components/common/Button';

export const LibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { status: authStatus, activeChild } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCat = (searchParams.get('category') as 'all' | SkillCategoryId) || 'all';
  const initialLvl = (searchParams.get('level') as 'all' | ReadingLevelId) || 'all';

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [readingLevels, setReadingLevels] = useState<ReadingLevel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | SkillCategoryId>(initialCat);
  const [selectedLevel, setSelectedLevel] = useState<'all' | ReadingLevelId>(initialLvl);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const cat = searchParams.get('category') as 'all' | SkillCategoryId | null;
    if (cat) setSelectedCategory(cat);
    const lvl = searchParams.get('level') as 'all' | ReadingLevelId | null;
    if (lvl) setSelectedLevel(lvl);
  }, [searchParams]);

  const loadCatalog = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [allLessons, levels] = await Promise.all([
        questRepository.getAllLessons(),
        questRepository.getReadingLevels(),
      ]);
      setLessons(allLessons);
      setReadingLevels(levels);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[LibraryView] Failed to load public curriculum:', err);
      }
      setLessons([]);
      setLoadError('Reading adventures are temporarily unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeChild) {
      setSessions([]);
      return;
    }
    questRepository
      .getLearnerSessions(activeChild.id)
      .then((allSessions) => setSessions(allSessions))
      .catch(() => setSessions([]));
  }, [authStatus, activeChild]);

  const handleOpenQuest = (lessonId: string) => {
    if (authStatus !== 'authenticated') {
      navigate(`/login?returnTo=${encodeURIComponent(`/activity/${lessonId}`)}`);
      return;
    }
    if (!activeChild) {
      navigate('/account');
      return;
    }
    navigate(`/activity/${lessonId}`);
  };

  const getLessonSessionState = (lessonId: string) => {
    const completedSession = sessions.find((s) => s.lessonId === lessonId && s.isCompleted);
    if (completedSession) {
      return { status: 'completed' as const, session: completedSession };
    }
    const inProgressSession = sessions.find((s) => s.lessonId === lessonId && !s.isCompleted);
    if (inProgressSession) {
      return { status: 'in-progress' as const, session: inProgressSession };
    }
    return { status: 'not-started' as const, session: null };
  };

  const isPrerequisiteMet = (prereqId?: string) => {
    if (!prereqId) return true;
    return sessions.some((s) => s.lessonId === prereqId && s.isCompleted);
  };

  const categoryTabs = [
    { id: 'all', label: 'All Quests' },
    { id: 'letter-sounds', label: 'Letter Sounds' },
    { id: 'phonics-blending', label: 'Phonics Blending' },
    { id: 'sight-words', label: 'Sight Words' },
    { id: 'comprehension', label: 'Comprehension' },
  ];

  const levelTabs = [
    { id: 'all', label: 'All Levels' },
    { id: 'level-1', label: 'Level 1: Seedling' },
    { id: 'level-2', label: 'Level 2: Sprout' },
    { id: 'level-3', label: 'Level 3: Bloom' },
  ];

  const filteredLessons = lessons.filter((lesson) => {
    const matchesCategory = selectedCategory === 'all' || lesson.categoryId === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || lesson.readingLevelId === selectedLevel;
    const matchesSearch =
      searchQuery.trim() === '' ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.readingLevelName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesLevel && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-12">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-[#171B37] tracking-tight">
          Pick Your Next{' '}
          <span className="italic font-serif font-normal text-[#8274D8]">Reading</span>{' '}
          Quest
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#6B6E8A]">
          12 structured quests across 4 essential reading pillars and 3 configurable reading levels.
        </p>
      </div>

      {/* 2. Search Bar + Clear Action */}
      <div className="flex items-center gap-3 bg-white border-2 border-[#DED5FF] px-4 py-3 rounded-3xl shadow-xs">
        <Search className="w-5 h-5 text-[#8274D8] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by sound, word, story, or reading level..."
          className="flex-1 bg-transparent text-sm font-bold text-[#171B37] placeholder-[#6B6E8A] focus:outline-hidden"
          aria-label="Search lessons"
        />
        {(searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedLevel('all');
            }}
            className="text-xs font-bold text-[#8274D8] hover:underline cursor-pointer shrink-0"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 3. Skill Category Filters */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase text-[#6B6E8A] tracking-wider block">
          Skill Categories:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by skill category">
          {categoryTabs.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#171B37] text-white shadow-xs'
                    : 'bg-white text-[#171B37] border border-[#DED5FF] hover:bg-[#F2EEFF]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Reading Level Filters */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase text-[#6B6E8A] tracking-wider block">
          Reading Levels:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by reading level">
          {levelTabs.map((tab) => {
            const isActive = selectedLevel === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedLevel(tab.id as any)}
                className={`px-4 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#8274D8] text-white shadow-xs'
                    : 'bg-[#EAF5F7] text-[#171B37] hover:bg-[#DED5FF]/50 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Lessons List */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-8 text-center space-y-3">
          <p className="font-bold text-[#171B37]">{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadCatalog}>
            Try Again
          </Button>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-8 text-center space-y-2">
          <p className="font-bold text-[#171B37]">No reading quests match the selected criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedLevel('all');
            }}
            className="text-xs font-bold text-[#8274D8] hover:underline cursor-pointer"
          >
            Clear all filters and show all 12 quests
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-extrabold text-[#6B6E8A]">
            Showing {filteredLessons.length} of {lessons.length} Quests
          </div>

          {filteredLessons.map((lesson, idx) => {
            const { status, session } = getLessonSessionState(lesson.id);
            const scoreCount = session ? session.score : 0;
            const completionLabel = `${scoreCount}/${lesson.totalActivities}`;
            const prereqMet = isPrerequisiteMet(lesson.prerequisiteLessonId);

            return (
              <div
                key={lesson.id}
                className="bg-white border-2 border-[#DED5FF] rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Column: Title, Subtitle, Description */}
                  <div className="space-y-1.5 max-w-xl flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase text-[#8274D8] tracking-wider">
                        Quest {idx + 1} · {lesson.categoryName}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EAF5F7] text-[#171B37]">
                        {lesson.readingLevelName}
                      </span>
                      {status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Mastered
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#171B37] leading-snug">
                      {lesson.title}
                    </h2>

                    <p className="text-xs sm:text-sm font-semibold text-[#6B6E8A] leading-relaxed">
                      {lesson.description}
                    </p>

                    {/* Real Prerequisite Note (No Decorative Lock) */}
                    {lesson.prerequisiteExplanation && (
                      <div className="bg-[#FAF8FD] border border-[#DED5FF] rounded-2xl p-2.5 text-xs text-[#4A3B69] flex items-start gap-2 mt-2">
                        <Info className="w-4 h-4 text-[#8274D8] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#171B37]">Prerequisite guidance: </strong>
                          <span>{lesson.prerequisiteExplanation}</span>
                          {prereqMet ? (
                            <span className="text-emerald-700 font-bold ml-1.5">(Completed ✓)</span>
                          ) : (
                            <span className="text-[#8274D8] font-bold ml-1.5">(Recommended first)</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Button
                        variant={status === 'in-progress' ? 'peach' : status === 'completed' ? 'outline' : 'peach'}
                        size="md"
                        onClick={() => handleOpenQuest(lesson.id)}
                        icon={
                          status === 'in-progress' ? (
                            <Play className="w-4 h-4 fill-current" />
                          ) : (
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                          )
                        }
                        iconPosition="right"
                        className="px-6 py-2.5 text-xs sm:text-sm shadow-xs"
                      >
                        {status === 'in-progress'
                          ? 'Continue'
                          : status === 'completed'
                          ? 'Practice Again'
                          : 'Start Quest'}
                      </Button>

                      <span className="text-xs font-bold text-[#6B6E8A]">
                        ~{lesson.estimatedMinutes} mins · {lesson.totalActivities} activities
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Circular Progress Badge (0/5) */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-xs ${
                        status === 'completed'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : status === 'in-progress'
                          ? 'border-[#8274D8] bg-[#F2EEFF] text-[#8274D8]'
                          : 'border-[#171B37] bg-white text-[#171B37]'
                      }`}
                      title={`Completed: ${completionLabel} activities`}
                    >
                      {completionLabel}
                    </div>

                    <div className="hidden sm:block">
                      <ReadingGroupVignette className="w-24 h-18" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
