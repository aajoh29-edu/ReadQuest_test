import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Flame, Award, BookOpen, CheckCircle2, ArrowRight, Clock, Sparkles, Cpu, AlertCircle } from 'lucide-react';
import { questRepository } from '../services/repository';
import { Learner, Mastery, ReadingLevel, ReadingProgressSummary, Reward, SkillCategory } from '../types';
import { Trophy3DIllustration } from '../components/illustrations/ReadingIllustrations';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';
import { AdaptiveDiagnosticModal } from '../components/adaptive/AdaptiveDiagnosticModal';

export const ProgressView: React.FC = () => {
  const navigate = useNavigate();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [progress, setProgress] = useState<ReadingProgressSummary | null>(null);
  const [masteryList, setMasteryList] = useState<Mastery[]>([]);
  const [readingLevels, setReadingLevels] = useState<ReadingLevel[]>([]);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      questRepository.getLearner(),
      questRepository.getProgressSummary(),
      questRepository.getMasterySummary(),
      questRepository.getReadingLevels(),
    ]).then(([l, prog, mastery, levels]) => {
      setLearner(l);
      setProgress(prog);
      setMasteryList(mastery);
      setReadingLevels(levels);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !learner || !progress) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeMinutes = Math.floor((progress.totalActivePracticeSeconds || 0) / 60);
  const activeSecondsRemainder = (progress.totalActivePracticeSeconds || 0) % 60;

  const allPossibleBadges = [
    { title: 'Star Scout', category: 'Milestone', desc: 'Completed your very first reading quest (+10 stars)', icon: '🌟' },
    { title: 'Trail Trekker', category: 'Milestone', desc: 'Completed 3 unique reading quests (+15 stars)', icon: '🥾' },
    { title: 'Master Explorer', category: 'Milestone', desc: 'Completed 5 reading quests (+25 stars)', icon: '🗺️' },
    { title: 'Reading Champion', category: 'Milestone', desc: 'Completed all 12 curriculum quests (+50 stars)', icon: '👑' },
    { title: 'Sharp Eye', category: 'Milestone', desc: 'Achieved 100% accuracy on a complete quest (+15 stars)', icon: '🎯' },
    { title: 'Story Adventurer', category: 'Milestone', desc: 'Practiced 25 activities (+20 stars)', icon: '📚' },
    { title: 'Bookworm Legend', category: 'Milestone', desc: 'Practiced 50 activities (+30 stars)', icon: '🐛' },
    { title: 'Safari Sound Master', category: 'Letter Sounds', desc: 'Completed Lesson 1: Initial consonant sound cues', icon: '🦁' },
    { title: 'Vowel Valley Scout', category: 'Letter Sounds', desc: 'Mastered Lesson 2: Short vowel sound patterns', icon: '🌈' },
    { title: 'Digraph Detective', category: 'Letter Sounds', desc: 'Mastered Lesson 3: Consonant digraph teams', icon: '🔍' },
    { title: 'Master Word Builder', category: 'Phonics Blending', desc: 'Completed Lesson 4: CVC short vowel blending', icon: '🧩' },
    { title: 'Blend Artisan', category: 'Phonics Blending', desc: 'Completed Lesson 6: Consonant blends and clusters', icon: '⚙️' },
    { title: 'Sight Word Ranger', category: 'Sight Words', desc: 'Completed Lesson 7: High-frequency anchor words', icon: '⭐' },
    { title: 'Story Word Sage', category: 'Sight Words', desc: 'Completed Lesson 9: Relational story words', icon: '📖' },
    { title: 'Master Story Sleuth', category: 'Comprehension', desc: 'Completed Lesson 10: Story recall and details', icon: '📚' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-8">
      {/* Page Title & Diagnostics Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#171B37] tracking-tight">
            Explorer Progress & Mastery
          </h1>
          <p className="text-sm font-semibold text-[#6B6E8A]">
            Track active practice time, 12 reading quests, and adaptive evidence.
          </p>
        </div>
        <button
          onClick={() => setShowDiagnosticModal(true)}
          className="flex items-center gap-2 self-start sm:self-auto bg-white hover:bg-[#FAF8FD] border-2 border-[#8274D8] px-4 py-2 rounded-2xl text-xs font-black text-[#8274D8] shadow-xs cursor-pointer transition-all"
        >
          <Cpu className="w-4 h-4" />
          <span>Engine Diagnostics & Live Tests</span>
        </button>
      </div>

      {/* Purple Level Progress Card */}
      <div className="bg-purple-panel text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <span className="text-xs font-black tracking-wider uppercase bg-white/20 text-white px-3 py-1 rounded-full">
              Curriculum Mastery Overview
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Greatness in the Making!
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#DED5FF]">
              You have answered {progress.totalQuestionsAnswered} activities across 12 lessons with {progress.averageAccuracy}% accuracy.
            </p>

            <div className="pt-2">
              <div className="flex justify-between text-xs font-black text-white mb-1.5">
                <span>Quests Completed</span>
                <span>{progress.totalLessonsCompleted} of 12 Finished</span>
              </div>
              <div className="w-full bg-white/25 rounded-full h-3 p-0.5">
                <div
                  className="bg-[#FFC38E] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(6, (progress.totalLessonsCompleted / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex justify-center sm:justify-end">
            <Trophy3DIllustration className="w-24 h-24 sm:w-28 sm:h-28" />
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-[#171B37]">
            <Clock className="w-5 h-5 text-[#8274D8]" />
            <span>{activeMinutes}m {activeSecondsRemainder}s</span>
          </div>
          <span className="text-[11px] font-bold text-[#6B6E8A] uppercase mt-1 block">
            Active Practice Time
          </span>
        </div>

        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-[#171B37]">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            <span>{learner.starsEarned}</span>
          </div>
          <span className="text-[11px] font-bold text-[#6B6E8A] uppercase mt-1 block">
            Stars Earned
          </span>
        </div>

        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <span>{progress.totalCorrectAnswers}</span>
          </div>
          <span className="text-[11px] font-bold text-[#6B6E8A] uppercase mt-1 block">
            Correct Answers
          </span>
        </div>

        <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-2xl font-black text-orange-500">
            <Flame className="w-5 h-5 fill-orange-400" />
            <span>{learner.currentStreakDays}d</span>
          </div>
          <span className="text-[11px] font-bold text-[#6B6E8A] uppercase mt-1 block">
            Daily Streak
          </span>
        </div>
      </div>

      {/* Reading Levels Progress Breakdown */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <h3 className="text-xl font-black text-[#171B37]">
            Reading Levels Breakdown
          </h3>
          <p className="text-xs font-semibold text-[#6B6E8A]">
            Configurable progression independent of chronological age or school grade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {readingLevels.map((lvl) => {
            const count = progress.levelsProgress[lvl.id]?.completedCount || 0;
            const total = progress.levelsProgress[lvl.id]?.totalCount || 4;
            const pct = Math.round((count / total) * 100);

            return (
              <div
                key={lvl.id}
                className="bg-[#FAF8FD] border-2 border-[#DED5FF] rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#8274D8]">
                    {lvl.name.split('·')[0]}
                  </span>
                  <span className="text-xs font-black text-[#171B37]">
                    {count}/{total} Quests
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#171B37]">
                  {lvl.stageName}
                </h4>
                <p className="text-[11px] font-medium text-[#6B6E8A] leading-snug">
                  {lvl.description}
                </p>
                <ProgressBar
                  value={count}
                  max={total}
                  color={lvl.id === 'level-1' ? 'emerald' : lvl.id === 'level-2' ? 'purple' : 'peach'}
                  height="sm"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills Mastery Grid with Evidence Status and Review Timers */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-black text-[#171B37]">
              Specific Skill Mastery & Evidence
            </h3>
            <p className="text-xs font-semibold text-[#6B6E8A]">
              Deterministic rolling-10 window: 60% Accuracy, 20% Recency (14d decay), 20% Consistency.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#8274D8] bg-[#F2EEFF] px-3 py-1 rounded-full self-start sm:self-auto">
            Requires ≥5 attempts & ≥2 sessions for Confirmed Mastered
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {masteryList.map((m) => {
            const scoreLabel = m.score === null ? 'Unknown' : `${m.score.toFixed(1)}%`;
            return (
              <div
                key={m.skillId}
                className="p-4 rounded-2xl border-2 border-[#DED5FF] bg-white space-y-2.5 shadow-xs hover:border-[#8274D8] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-[#8274D8]">
                      {m.categoryId}
                    </span>
                    <h4 className="text-sm font-black text-[#171B37] leading-tight">
                      {m.skillName}
                    </h4>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-[#171B37]">{scoreLabel}</div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap inline-block ${
                        m.isConfirmedMastered
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.evidenceStatus === 'provisional'
                          ? 'bg-amber-100 text-amber-900'
                          : m.evidenceStatus === 'insufficient_sessions'
                          ? 'bg-purple-100 text-[#8274D8]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.isConfirmedMastered
                        ? 'Confirmed Mastered'
                        : m.evidenceStatus === 'insufficient_sessions'
                        ? 'Provisional (1 Session)'
                        : m.evidenceStatus === 'provisional'
                        ? 'Provisional (<5 Attempts)'
                        : 'Not Started'}
                    </span>
                  </div>
                </div>

                {/* Component Breakdown Mini Bar */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#FAF8FD] p-2 rounded-xl text-center text-[10px] font-bold text-[#6B6E8A]">
                  <div>
                    <span className="text-[8px] uppercase block">Accuracy (60%)</span>
                    <span className="text-[11px] font-black text-[#171B37]">
                      {(m.components.accuracy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase block">Recency (20%)</span>
                    <span className="text-[11px] font-black text-[#171B37]">
                      {(m.components.recency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase block">Consistency (20%)</span>
                    <span className="text-[11px] font-black text-[#171B37]">
                      {(m.components.consistency * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Footer details: attempts and review due */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B6E8A] pt-1 border-t border-[#DED5FF]/50">
                  <span>
                    {m.totalAttemptCount > 0
                      ? `${m.totalAttemptCount} attempts (${m.sessionCount} sess)`
                      : 'No attempts yet'}
                  </span>
                  {m.reviewIntervalDays > 0 && (
                    <span
                      className={`font-bold ${
                        m.isReviewDue ? 'text-amber-700 font-extrabold flex items-center gap-1' : 'text-[#8274D8]'
                      }`}
                    >
                      {m.isReviewDue ? (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Review Due Now
                        </>
                      ) : (
                        `Review due in ${m.reviewIntervalDays}d`
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Collection */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-[#171B37]">
              Badges & Milestones
            </h3>
            <p className="text-xs font-semibold text-[#6B6E8A]">
              Earn badges by scoring 60% or higher on each quest.
            </p>
          </div>
          <span className="text-xs font-extrabold bg-[#F2EEFF] text-[#8274D8] px-3 py-1 rounded-full">
            {learner.badges.length} of {allPossibleBadges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allPossibleBadges.map((badge) => {
            const isUnlocked = learner.badges.includes(badge.title);
            return (
              <div
                key={badge.title}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all ${
                  isUnlocked
                    ? 'bg-[#F2EEFF]/60 border-[#DED5FF]'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                    isUnlocked ? 'bg-white shadow-xs' : 'bg-gray-200'
                  }`}
                >
                  {isUnlocked ? badge.icon : '🔒'}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-[#171B37]">
                    {badge.title}
                  </h4>
                  <p className="text-xs text-[#6B6E8A] font-semibold leading-snug">
                    {badge.desc}
                  </p>
                  <span className="text-[10px] font-bold text-[#8274D8] block">
                    {badge.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue Learning CTA */}
      <div className="text-center pt-2">
        <Button
          variant="peach"
          size="lg"
          onClick={() => navigate('/library')}
          icon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
          iconPosition="right"
          className="shadow-md"
        >
          Pick Your Next Reading Quest
        </Button>
      </div>

      {/* Adaptive Engine Diagnostics Modal */}
      <AdaptiveDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        onDataUpdated={loadData}
      />
    </div>
  );
};
