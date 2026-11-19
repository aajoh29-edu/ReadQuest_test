import React, { useState, useEffect } from 'react';
import {
  Heart,
  TrendingUp,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Calendar,
  Sparkles,
  RefreshCw,
  Target,
  ArrowRight,
  BookOpen,
  Info,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DateFilterOption,
  Learner,
  Mastery,
  ParentProfile,
  ReadingProgressSummary,
  SessionRecord,
  SkillCategory,
} from '../types';
import { questRepository, downloadCSV } from '../services/repository';
import { Button } from '../components/common/Button';

export const ParentDashboardView: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<Learner[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('learner-demo-1');
  const [activeChild, setActiveChild] = useState<Learner | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('7d');

  // Child data
  const [masteryList, setMasteryList] = useState<Mastery[]>([]);
  const [progressSummary, setProgressSummary] = useState<ReadingProgressSummary | null>(null);
  const [weeklyPractice, setWeeklyPractice] = useState<
    { date: string; dayLabel: string; activeMinutes: number; questionsAnswered: number; accuracy: number }[]
  >([]);
  const [recentAttempts, setRecentAttempts] = useState<
    { attempt: any; session: SessionRecord; skillName: string; categoryName: string; lessonTitle: string }[]
  >([]);
  const [adaptiveRec, setAdaptiveRec] = useState<any>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [practiceGoalMinutes, setPracticeGoalMinutes] = useState(15);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [parentProfile, parentLearners, cats] = await Promise.all([
        questRepository.getParentProfile(),
        questRepository.getParentLearners(),
        questRepository.getCategories(),
      ]);

      setParent(parentProfile);
      setChildren(parentLearners);
      setCategories(cats);
      setPracticeGoalMinutes(parentProfile.practiceGoalMinutesPerDay || 15);

      const targetId =
        parentLearners.find((c) => c.id === selectedChildId)?.id ||
        parentLearners[0]?.id ||
        'learner-demo-1';
      setSelectedChildId(targetId);

      await loadChildData(targetId, dateFilter);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChildData = async (childId: string, filter: DateFilterOption) => {
    const [child, masteries, progress, weekly, recent, rec] = await Promise.all([
      questRepository.getLearnerById(childId),
      questRepository.getMasterySummary(childId),
      questRepository.getProgressSummary(childId),
      questRepository.getLearnerWeeklyPractice(childId, 7),
      questRepository.getLearnerRecentAttempts(childId, 25, filter),
      questRepository.getAdaptiveRecommendation(childId),
    ]);

    setActiveChild(child);
    setMasteryList(masteries);
    setProgressSummary(progress);
    setWeeklyPractice(weekly);
    setRecentAttempts(recent);
    setAdaptiveRec(rec);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectChild = async (childId: string) => {
    setSelectedChildId(childId);
    await loadChildData(childId, dateFilter);
  };

  const handleDateFilterChange = async (filter: DateFilterOption) => {
    setDateFilter(filter);
    await loadChildData(selectedChildId, filter);
  };

  const handleSaveGoal = async (minutes: number) => {
    if (parent) {
      const updated = await questRepository.updateParentProfile(parent.id, {
        practiceGoalMinutesPerDay: minutes,
      });
      setParent(updated);
      setPracticeGoalMinutes(minutes);
      setShowGoalModal(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeChild) return;
    setIsExporting(true);
    try {
      const csvContent = await questRepository.exportParentProgressCSV(
        activeChild.id,
        dateFilter
      );
      const filename = `ReadQuest_${activeChild.name.replace(/\s+/g, '_')}_Progress_${dateFilter}.csv`;
      downloadCSV(filename, csvContent);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper metrics
  const totalPracticeMinutes = progressSummary
    ? Math.round(progressSummary.totalActivePracticeSeconds / 60)
    : 0;

  // Calculate practice minutes today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayStats = weeklyPractice.find((d) => d.date === todayDateStr);
  const todayMinutes = todayStats ? Math.round(todayStats.activeMinutes) : 0;
  const goalProgressPct = Math.min(100, Math.round((todayMinutes / practiceGoalMinutes) * 100));

  // Strengths (highest scores, at least provisional or confirmed)
  const strengths = masteryList
    .filter((m) => m.score !== null && m.score >= 75)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  // Suggested practice (needs focus, developing, or review due)
  const suggestedPractice = masteryList
    .filter((m) => (m.score !== null && m.score < 75) || m.isReviewDue)
    .sort((a, b) => (a.score || 0) - (b.score || 0));

  // Filter skills by category tab
  const filteredMasteries =
    selectedCategoryTab === 'all'
      ? masteryList
      : masteryList.filter((m) => m.categoryId === selectedCategoryTab);

  if (isLoading || !activeChild) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-base font-bold text-[#171B37]">Loading Parent Portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#DED5FF]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#8274D8] mb-1">
            <Heart className="w-3.5 h-3.5 fill-[#8274D8]" />
            <span>Parent & Family Companion</span>
            <span>•</span>
            <span className="text-[#6B6E8A]">Connected Account: {parent?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#171B37]">
            Learning & Mastery Insights
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F2EEFF] text-[#171B37] border-2 border-[#DED5FF] px-3.5 py-2 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer focus-visible:outline-3 focus-visible:outline-[#8274D8]"
            title="Export authorized progress data to CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-[#8274D8]" />
            <span>{isExporting ? 'Exporting...' : 'Export Progress CSV'}</span>
          </button>

          {/* Practice Goal Button */}
          <button
            onClick={() => setShowGoalModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#FFF3E8] hover:bg-[#FFE5CC] text-[#171B37] border-2 border-[#FFC38E] px-3.5 py-2 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer"
          >
            <Target className="w-4 h-4 text-[#FFC38E] stroke-[2.5]" />
            <span>Goal: {practiceGoalMinutes}m/day</span>
          </button>
        </div>
      </div>

      {/* Child Selector & Filter Controls Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Child Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-[#6B6E8A] mr-1">Learner:</span>
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#171B37] text-white shadow-xs scale-102'
                    : 'bg-[#F2EEFF] text-[#34364B] hover:bg-[#DED5FF]/60'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-base select-none">{child.avatar}</span>
                <span>{child.name}</span>
                <span className="text-[10px] font-bold opacity-80">({child.gradeLevel})</span>
              </button>
            );
          })}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 bg-[#F2EEFF] p-1 rounded-2xl">
          <span className="text-[11px] font-extrabold text-[#6B6E8A] px-2 hidden sm:inline">
            <Calendar className="w-3 h-3 inline mr-1" />
            Window:
          </span>
          {(['7d', '30d', 'all'] as DateFilterOption[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleDateFilterChange(tab)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                dateFilter === tab
                  ? 'bg-white text-[#171B37] shadow-xs'
                  : 'text-[#6B6E8A] hover:text-[#171B37]'
              }`}
            >
              {tab === '7d' ? 'Last 7 Days' : tab === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Accuracy */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#8274D8] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Average Accuracy
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {progressSummary?.averageAccuracy ?? 0}%
          </div>
          <div className="text-[11px] text-[#6B6E8A] mt-1 font-bold">
            {progressSummary?.totalCorrectAnswers ?? 0} of{' '}
            {progressSummary?.totalQuestionsAnswered ?? 0} activities correct
          </div>
        </div>

        {/* Active Practice Time */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#8274D8] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Active Practice
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {totalPracticeMinutes}{' '}
            <span className="text-sm font-extrabold text-[#6B6E8A]">mins</span>
          </div>
          <div className="text-[11px] text-[#6B6E8A] mt-1 font-bold">
            Excludes paused or idle time
          </div>
        </div>

        {/* Daily Goal Status */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#FFC38E] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Today's Goal
            </span>
            <Target className="w-4 h-4 text-[#FFC38E] stroke-[2.5]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {todayMinutes} / {practiceGoalMinutes}{' '}
            <span className="text-sm font-extrabold text-[#6B6E8A]">m</span>
          </div>
          <div className="w-full bg-[#F2EEFF] h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#FFC38E] h-full rounded-full transition-all"
              style={{ width: `${goalProgressPct}%` }}
            />
          </div>
        </div>

        {/* Completed Quests */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-center justify-between text-[#34D399] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#6B6E8A]">
              Quests Completed
            </span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#171B37]">
            {progressSummary?.totalLessonsCompleted ?? 0}
          </div>
          <div className="text-[11px] text-[#6B6E8A] mt-1 font-bold">
            Current streak: {activeChild.currentStreakDays} days 🔥
          </div>
        </div>
      </div>

      {/* Weekly Practice Bar Chart (Accessible & Visual) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#DED5FF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#171B37]">
              Weekly Practice Distribution
            </h2>
            <p className="text-xs text-[#6B6E8A]">
              Active practice minutes per day over the last 7 calendar days
            </p>
          </div>
          <div className="text-xs font-extrabold text-[#8274D8] bg-[#F2EEFF] px-3 py-1 rounded-xl self-start sm:self-auto">
            Target: {practiceGoalMinutes} min/day
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 pb-2 border-b border-[#DED5FF]">
          {weeklyPractice.map((day) => {
            const maxMin = Math.max(practiceGoalMinutes, 20);
            const heightPct = Math.min(100, Math.round((day.activeMinutes / maxMin) * 100));
            const metGoal = day.activeMinutes >= practiceGoalMinutes;

            return (
              <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] sm:text-xs font-bold text-[#6B6E8A] mb-1 group-hover:text-[#171B37]">
                  {day.activeMinutes > 0 ? `${day.activeMinutes}m` : '-'}
                </div>
                <div
                  className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
                    day.activeMinutes === 0
                      ? 'bg-[#F2EEFF] h-1.5'
                      : metGoal
                      ? 'bg-[#8274D8] group-hover:bg-[#171B37]'
                      : 'bg-[#FFC38E] group-hover:bg-[#ffb06e]'
                  }`}
                  style={{ height: day.activeMinutes === 0 ? '6px' : `${Math.max(12, heightPct)}%` }}
                  title={`${day.dayLabel} (${day.date}): ${day.activeMinutes} min active, ${day.questionsAnswered} activities answered, ${day.accuracy}% accuracy`}
                />
                <span className="text-[11px] font-black text-[#171B37] mt-2 select-none">
                  {day.dayLabel}
                </span>
                <span className="text-[9px] text-[#6B6E8A] select-none">
                  {day.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Accessible Fallback Data Table for Screen Readers */}
        <div className="sr-only">
          <table aria-label="Weekly practice summary data table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Active Minutes</th>
                <th>Activities Answered</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPractice.map((d) => (
                <tr key={d.date}>
                  <td>{d.dayLabel}</td>
                  <td>{d.date}</td>
                  <td>{d.activeMinutes} min</td>
                  <td>{d.questionsAnswered}</td>
                  <td>{d.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adaptive Recommendation Explanation Banner */}
      {adaptiveRec && (
        <div className="bg-[#EAF5F7] rounded-3xl p-5 border-2 border-[#DED5FF] shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#8274D8] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-[#8274D8]">
                  Adaptive Engine Next Step
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-[#171B37] border border-[#DED5FF]">
                  Priority: {adaptiveRec.priorityLabel.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base font-black text-[#171B37]">
                Recommended Quest: {adaptiveRec.lessonTitle}
              </h3>
              <p className="text-xs text-[#34364B] leading-relaxed">
                <strong>Why this quest:</strong> {adaptiveRec.adultFacingExplanation}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/activity/${adaptiveRec.lessonId}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#8274D8] hover:text-[#171B37] underline cursor-pointer"
                >
                  <span>Launch this quest with {activeChild.name.split(' ')[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strengths & Practice Needs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-white rounded-3xl p-5 border-2 border-[#DED5FF] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
            <h3 className="text-base font-black text-[#171B37]">Confirmed Strengths</h3>
          </div>
          <p className="text-xs text-[#6B6E8A]">
            Skills where {activeChild.name.split(' ')[0]} has demonstrated steady proficiency (≥75%)
          </p>

          {strengths.length === 0 ? (
            <div className="bg-[#F2EEFF] rounded-2xl p-4 text-center text-xs text-[#6B6E8A] font-bold">
              Not enough practice yet to confirm mastery strengths. Complete a few more quests to unlock confirmed status!
            </div>
          ) : (
            <div className="space-y-2">
              {strengths.map((s) => (
                <div
                  key={s.skillId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#EAF5F7] border border-[#DED5FF]"
                >
                  <div>
                    <div className="text-xs font-black text-[#171B37]">{s.skillName}</div>
                    <div className="text-[10px] text-[#6B6E8A] font-bold">
                      {s.totalAttemptCount} attempts · {s.sessionCount} sessions · {s.evidenceStatus}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                      {s.score !== null ? `${Math.round(s.score)}%` : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Practice Needs & Review */}
        <div className="bg-white rounded-3xl p-5 border-2 border-[#DED5FF] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5 text-amber-600 stroke-[2.5]" />
            <h3 className="text-base font-black text-[#171B37]">Suggested Practice Focus</h3>
          </div>
          <p className="text-xs text-[#6B6E8A]">
            Skills with developing accuracy or scheduled for spaced review
          </p>

          {suggestedPractice.length === 0 ? (
            <div className="bg-[#F2EEFF] rounded-2xl p-4 text-center text-xs text-[#6B6E8A] font-bold">
              All practiced skills are currently strong! Keep up the daily reading habit.
            </div>
          ) : (
            <div className="space-y-2">
              {suggestedPractice.slice(0, 3).map((s) => (
                <div
                  key={s.skillId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF3E8] border border-[#FFC38E]/50"
                >
                  <div>
                    <div className="text-xs font-black text-[#171B37]">{s.skillName}</div>
                    <div className="text-[10px] text-[#6B6E8A] font-bold">
                      {s.isReviewDue ? (
                        <span className="text-amber-800 font-black">Spaced Review Due ⏰</span>
                      ) : (
                        `Score: ${s.score !== null ? Math.round(s.score) + '%' : 'Provisional'} (${s.band})`
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-[#171B37] bg-white px-2.5 py-1 rounded-xl border border-[#FFC38E]">
                    {s.band === 'needs_focus' ? 'Needs Focus' : s.band === 'developing' ? 'Developing' : 'Review'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Skills Mastery Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#DED5FF] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#171B37]">
              Curriculum Mastery & Evidence Breakdown
            </h3>
            <p className="text-xs text-[#6B6E8A]">
              Adaptive scores computed across recent 10 attempts (60% Accuracy, 20% Recency, 20% Consistency)
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategoryTab('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryTab === 'all'
                  ? 'bg-[#171B37] text-white'
                  : 'bg-[#F2EEFF] text-[#6B6E8A] hover:text-[#171B37]'
              }`}
            >
              All Skills
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryTab(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryTab === c.id
                    ? 'bg-[#171B37] text-white'
                    : 'bg-[#F2EEFF] text-[#6B6E8A] hover:text-[#171B37]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Informative Callout for Provisional Scores */}
        <div className="bg-[#F2EEFF] rounded-2xl p-3 text-xs text-[#34364B] flex items-start gap-2 border border-[#DED5FF]">
          <Info className="w-4 h-4 text-[#8274D8] shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong>Understanding Evidence Status:</strong> Scores marked{' '}
            <span className="font-extrabold text-[#8274D8]">Provisional</span> have fewer than 5
            attempts. ReadQuest requires at least 5 attempts across at least 2 distinct sessions
            before conferring a <span className="font-extrabold text-emerald-700">Confirmed Mastered</span> label.
          </div>
        </div>

        {/* Mastery Cards Grid (Accessible & Responsive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMasteries.map((m) => {
            const hasAttempts = m.totalAttemptCount > 0;
            const isConfirmed = m.isConfirmedMastered;
            const isProvisional = m.evidenceStatus === 'provisional';
            const isUnknown = m.evidenceStatus === 'unknown';

            return (
              <div
                key={m.skillId}
                className="p-4 rounded-2xl border-2 border-[#DED5FF] bg-white hover:border-[#8274D8]/50 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#8274D8]">
                      {m.code}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-[#171B37] leading-snug">
                      {m.skillName}
                    </h4>
                  </div>
                  {/* Status Badge with text label alongside color */}
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      isConfirmed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isProvisional
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isUnknown
                        ? 'bg-gray-100 text-gray-700 border border-gray-300'
                        : 'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}
                  >
                    {isConfirmed
                      ? 'Mastered'
                      : isProvisional
                      ? 'Provisional'
                      : isUnknown
                      ? 'Not Started'
                      : m.band === 'developing'
                      ? 'Developing'
                      : 'Needs Focus'}
                  </span>
                </div>

                {/* Score Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-black mb-1">
                    <span className="text-[#6B6E8A]">Adaptive Score:</span>
                    <span className="text-[#171B37]">
                      {m.score !== null ? `${Math.round(m.score)} / 100` : 'Not enough practice yet'}
                    </span>
                  </div>
                  <div className="w-full bg-[#F2EEFF] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (m.score || 0) >= 90
                          ? 'bg-emerald-500'
                          : (m.score || 0) >= 75
                          ? 'bg-[#8274D8]'
                          : (m.score || 0) >= 60
                          ? 'bg-[#FFC38E]'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${m.score !== null ? Math.round(m.score) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Evidence Metrics */}
                <div className="text-[10px] text-[#6B6E8A] flex items-center justify-between pt-1 border-t border-[#F2EEFF]">
                  <span>
                    Evidence: <strong>{m.totalAttemptCount}</strong> attempts ({m.sessionCount} sessions)
                  </span>
                  {m.isReviewDue && (
                    <span className="text-amber-700 font-black">Review due ⏰</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Attempts Activity Log */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#DED5FF] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#171B37]">
              Recent Activity & Attempt Log
            </h3>
            <p className="text-xs text-[#6B6E8A]">
              Live updates as {activeChild.name.split(' ')[0]} completes questions
            </p>
          </div>
          <span className="text-xs font-bold text-[#8274D8] bg-[#F2EEFF] px-2.5 py-1 rounded-xl">
            {recentAttempts.length} attempts recorded
          </span>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="bg-[#F2EEFF] rounded-2xl p-6 text-center text-xs text-[#6B6E8A] font-bold">
            No activity attempts recorded for this time window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Recent activity attempts log">
              <thead>
                <tr className="border-b-2 border-[#DED5FF] text-[#6B6E8A] font-black uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Lesson / Quest</th>
                  <th className="py-2.5 px-3">Skill</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3 text-right">Active Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEFF]">
                {recentAttempts.map((item, idx) => (
                  <tr key={`${item.attempt.idempotencyKey}-${idx}`} className="hover:bg-[#F2EEFF]/40">
                    <td className="py-2.5 px-3 text-[#6B6E8A] font-semibold whitespace-nowrap">
                      {new Date(item.attempt.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#171B37]">
                      {item.lessonTitle}
                    </td>
                    <td className="py-2.5 px-3 text-[#34364B]">
                      {item.skillName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-full text-[10px] ${
                          item.attempt.isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.attempt.isCorrect ? 'Correct ✓' : 'Practice Needed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#6B6E8A] font-bold">
                      {item.attempt.activeDurationSeconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Practice Goal Edit Modal */}
      {showGoalModal && (
        <div
          className="fixed inset-0 z-50 bg-[#171B37]/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border-2 border-[#DED5FF] shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 id="goal-modal-title" className="text-lg font-black text-[#171B37]">
              Set Daily Practice Goal
            </h3>
            <p className="text-xs text-[#6B6E8A]">
              Choose how many active practice minutes {activeChild.name.split(' ')[0]} aims for each day.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 20, 25, 30, 40].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setPracticeGoalMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-2 ${
                    practiceGoalMinutes === mins
                      ? 'bg-[#171B37] text-white border-[#171B37]'
                      : 'bg-[#F2EEFF] text-[#171B37] border-[#DED5FF] hover:border-[#8274D8]'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DED5FF]">
              <button
                onClick={() => setShowGoalModal(false)}
                className="px-3 py-1.5 text-xs font-extrabold text-[#6B6E8A] hover:text-[#171B37] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveGoal(practiceGoalMinutes)}
              >
                Save Goal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
