import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
  RefreshCw,
  Cpu,
  FastForward,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { runAdaptiveEngineTests, TestCaseResult, TestSuiteResult } from '../../services/adaptiveEngine.test';
import { questRepository } from '../../services/repository';
import { AdaptiveRecommendation, Mastery, Skill } from '../../types';
import { Button } from '../common/Button';

interface AdaptiveDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const AdaptiveDiagnosticModal: React.FC<AdaptiveDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'skills' | 'recommendation'>('tests');
  const [testSuite, setTestSuite] = useState<TestSuiteResult | null>(null);
  const [masteries, setMasteries] = useState<Mastery[]>([]);
  const [currentRec, setCurrentRec] = useState<AdaptiveRecommendation | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const loadEngineState = async () => {
    try {
      const [mList, rec] = await Promise.all([
        questRepository.getMasterySummary(),
        questRepository.getAdaptiveRecommendation(),
      ]);
      setMasteries(mList);
      setCurrentRec(rec);
    } catch (err) {
      console.error('Failed to load engine state:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Run tests on open
      const results = runAdaptiveEngineTests();
      setTestSuite(results);
      loadEngineState();
    }
  }, [isOpen]);

  const handleRerunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = runAdaptiveEngineTests();
      setTestSuite(results);
      setIsRunningTests(false);
    }, 200);
  };

  const handleSimulateAttempt = async (isCorrect: boolean) => {
    setIsSimulating(true);
    setSimMessage(null);
    try {
      // Use active recommendation or first lesson activity
      const rec = currentRec || (await questRepository.getAdaptiveRecommendation());
      const sessions = await questRepository.getAllSessions();
      let targetSession = sessions.find((s) => !s.isCompleted && s.lessonId === rec.lessonId);

      if (!targetSession) {
        targetSession = await questRepository.startOrCreateSession(rec.lessonId);
      }

      const lesson = await questRepository.getLesson(rec.lessonId);
      const activityId =
        rec.activityId || lesson?.activities[targetSession.currentActivityIndex]?.id || 'act-ls1-q1';
      const targetAct = lesson?.activities.find((a) => a.id === activityId);
      const chosenOptionId = isCorrect
        ? targetAct?.options[0]?.id || 'opt-1'
        : targetAct?.options[targetAct.options.length - 1]?.id || 'opt-2';

      await questRepository.submitAnswer(
        targetSession.id,
        activityId,
        chosenOptionId,
        `sim_${Date.now()}_${activityId}`,
        15
      );

      setSimMessage(
        `Recorded ${isCorrect ? 'Correct (✓)' : 'Incorrect (✗)'} attempt on ${activityId}. Mastery recalculated!`
      );
      await loadEngineState();
      onDataUpdated?.();
    } catch (err: any) {
      setSimMessage(`Simulation error: ${err.message || 'Unknown'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateFiveAttemptsTwoSessions = async () => {
    setIsSimulating(true);
    setSimMessage(null);
    try {
      // Create session 1 with 3 correct answers
      const s1 = await questRepository.startOrCreateSession('lesson-ls-1');
      const l1 = await questRepository.getLesson('lesson-ls-1');
      if (l1) {
        for (let i = 0; i < 3; i++) {
          const act = l1.activities[i];
          await questRepository.submitAnswer(
            s1.id,
            act.id,
            act.options[0].id,
            `sim_multi_s1_${i}_${Date.now()}`,
            12
          );
        }
        await questRepository.completeSession(s1.id);
      }

      // Create session 2 with 2 correct answers
      const s2 = await questRepository.startOrCreateSession('lesson-ls-1');
      if (l1) {
        for (let i = 3; i < 5; i++) {
          const act = l1.activities[i];
          await questRepository.submitAnswer(
            s2.id,
            act.id,
            act.options[0].id,
            `sim_multi_s2_${i}_${Date.now()}`,
            14
          );
        }
        await questRepository.completeSession(s2.id);
      }

      setSimMessage(
        'Simulated 5 attempts across 2 sessions on Lesson 1! Confirmed evidence unlocked.'
      );
      await loadEngineState();
      onDataUpdated?.();
    } catch (err: any) {
      setSimMessage(`Multi-session simulation error: ${err.message || 'Unknown'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#171B37]/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border-2 border-[#8274D8]/30 overflow-hidden">
        {/* Header */}
        <div className="bg-[#171B37] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8274D8] flex items-center justify-center text-white shadow-inner">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Adaptive Engine Diagnostics</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#8274D8]/30 text-[#DED5FF] border border-[#8274D8]/50">
                  Adaptive Engine · v1.0
                </span>
              </div>
              <p className="text-xs text-[#DED5FF]/80 font-medium">
                Deterministic mastery calculations, time-decay recency, adjacent consistency, & live tests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close diagnostic panel"
            className="p-2 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#FAF8FD] border-b border-[#DED5FF] px-6 pt-3 flex gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'tests'
                ? 'border-[#8274D8] text-[#171B37]'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#8274D8]" />
            Unit & Parity Tests
            {testSuite && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {testSuite.passed}/{testSuite.total} Passed
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'skills'
                ? 'border-[#8274D8] text-[#171B37]'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#FF8A65]" />
            Live Mastery States ({masteries.length})
          </button>

          <button
            onClick={() => setActiveTab('recommendation')}
            className={`pb-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'recommendation'
                ? 'border-[#8274D8] text-[#171B37]'
                : 'border-transparent text-[#6B6E8A] hover:text-[#171B37]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#7C3AED]" />
            Current Recommendation Rationale
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {simMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-between">
              <span>{simMessage}</span>
              <button onClick={() => setSimMessage(null)} className="text-amber-700 hover:text-amber-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: Tests */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EAF5F7] p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-black text-[#171B37]">Deterministic Parity Suite</h3>
                  <p className="text-xs text-[#34364B] font-medium">
                    Verified with fixed-clock injection (2026-10-28T12:00:00Z). Exactly matches the target Python specification.
                  </p>
                </div>
                <Button
                  variant="peach"
                  size="sm"
                  onClick={handleRerunTests}
                  disabled={isRunningTests}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />}
                >
                  {isRunningTests ? 'Verifying...' : 'Re-Run All Tests'}
                </Button>
              </div>

              {testSuite && (
                <div className="space-y-2">
                  {testSuite.tests.map((test) => (
                    <div
                      key={test.id}
                      className="p-3.5 bg-white border border-[#DED5FF] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#8274D8] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {test.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <span className="text-xs font-extrabold text-[#171B37]">{test.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FAF8FD] text-[#8274D8] border border-[#DED5FF]">
                            {test.category}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#6B6E8A] pl-6">
                          ID: <span className="font-bold">{test.id}</span> • Expected: {test.expected} • Got: {test.actual}
                        </div>
                      </div>

                      <div className="pl-6 sm:pl-0">
                        <span
                          className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
                            test.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {test.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Skills & Formulas */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="bg-[#FAF8FD] border border-[#DED5FF] p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-[#8274D8] tracking-wider">
                    Formula Breakdown
                  </span>
                </div>
                <div className="font-mono text-xs bg-white p-3 rounded-xl border border-[#DED5FF] text-[#171B37] space-y-1">
                  <div>Mastery = 100 × (0.60 × Accuracy + 0.20 × Recency + 0.20 × Consistency)</div>
                  <div className="text-[11px] text-[#6B6E8A]">
                    • Window: Most recent 10 attempts • Recency half-life: 14 days • Gate: 5 attempts across 2 sessions
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {masteries.map((m) => {
                  const scoreDisplay = m.score === null ? 'Unknown' : `${m.score.toFixed(1)}%`;
                  const bandLabels: Record<string, string> = {
                    needs_focus: 'High-Priority Practice (<60)',
                    developing: 'Additional Practice (60-74)',
                    proficient: 'Normal Review (75-89)',
                    mastered: 'Mastered (90-100)',
                    unknown: 'Not Started',
                  };

                  return (
                    <div
                      key={m.skillId}
                      className="bg-white border-2 border-[#DED5FF] p-4 rounded-2xl space-y-2.5 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#8274D8]">
                            {m.categoryId}
                          </span>
                          <h4 className="text-sm font-black text-[#171B37] leading-tight">{m.skillName}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-[#171B37]">{scoreDisplay}</div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              m.isConfirmedMastered
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.evidenceStatus === 'provisional'
                                ? 'bg-amber-100 text-amber-800'
                                : m.evidenceStatus === 'insufficient_sessions'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {m.isConfirmedMastered
                              ? 'Confirmed Mastered'
                              : m.evidenceStatus === 'insufficient_sessions'
                              ? 'Provisional (1 Session)'
                              : m.evidenceStatus === 'provisional'
                              ? 'Provisional (<5 Attempts)'
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Component Gauges */}
                      <div className="grid grid-cols-3 gap-2 bg-[#FAF8FD] p-2.5 rounded-xl text-center text-[10px] font-bold text-[#6B6E8A]">
                        <div>
                          <div className="text-[9px] uppercase">Accuracy (60%)</div>
                          <div className="text-xs font-black text-[#171B37]">
                            {(m.components.accuracy * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase">Recency (20%)</div>
                          <div className="text-xs font-black text-[#171B37]">
                            {(m.components.recency * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase">Consistency (20%)</div>
                          <div className="text-xs font-black text-[#171B37]">
                            {(m.components.consistency * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold text-[#6B6E8A] pt-1 border-t border-[#DED5FF]/60">
                        <span>
                          Attempts: {m.windowAttemptCount} in window ({m.totalAttemptCount} total, {m.sessionCount} sess)
                        </span>
                        {m.reviewIntervalDays > 0 && (
                          <span className={m.isReviewDue ? 'text-amber-700 font-bold' : ''}>
                            {m.isReviewDue ? 'Review Due Now' : `Review due in ${m.reviewIntervalDays}d`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Recommendation Rationale */}
          {activeTab === 'recommendation' && (
            <div className="space-y-4">
              {currentRec ? (
                <div className="bg-white border-2 border-[#8274D8] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DED5FF] pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-[#8274D8] tracking-wider">
                        Active Policy Selection · Tier {currentRec.priorityTier} ({currentRec.priorityLabel})
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#171B37]">
                        {currentRec.lessonTitle}
                      </h3>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#EAF5F7] text-[#171B37]">
                      {currentRec.categoryName} · {currentRec.readingLevelId}
                    </span>
                  </div>

                  {/* Child Reason */}
                  <div className="bg-[#FAF8FD] border border-[#DED5FF] p-4 rounded-2xl space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-[#8274D8]">
                      Child-Facing Rationale:
                    </span>
                    <p className="text-sm sm:text-base font-bold text-[#171B37]">
                      "{currentRec.childFriendlyReason}"
                    </p>
                  </div>

                  {/* Adult Explanation */}
                  <div className="bg-[#EAF5F7] border border-[#DED5FF] p-4 rounded-2xl space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-[#171B37]">
                      Adult / Educator Explanation:
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-[#34364B] leading-relaxed">
                      {currentRec.adultFacingExplanation}
                    </p>
                  </div>

                  {/* Activity Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-bold text-[#6B6E8A] pt-2">
                    <div className="bg-white border border-[#DED5FF] p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase">Activity ID</div>
                      <div className="text-xs font-black text-[#171B37] font-mono">{currentRec.activityId || 'N/A'}</div>
                    </div>
                    <div className="bg-white border border-[#DED5FF] p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase">Difficulty</div>
                      <div className="text-xs font-black text-[#171B37] capitalize">{currentRec.targetDifficulty}</div>
                    </div>
                    <div className="bg-white border border-[#DED5FF] p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase">Mastery Score</div>
                      <div className="text-xs font-black text-[#171B37]">
                        {currentRec.masteryScore === null ? 'Unknown' : `${currentRec.masteryScore.toFixed(1)}%`}
                      </div>
                    </div>
                    <div className="bg-white border border-[#DED5FF] p-2.5 rounded-xl">
                      <div className="text-[10px] uppercase">Evidence Status</div>
                      <div className="text-xs font-black text-[#171B37] capitalize">{currentRec.evidenceStatus}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-sm font-semibold text-[#6B6E8A]">
                  Loading recommendation...
                </div>
              )}

              {/* Simulation Sandbox */}
              <div className="bg-[#FAF8FD] border border-[#DED5FF] p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#8274D8]" />
                  <h4 className="text-xs font-black uppercase text-[#171B37] tracking-wider">
                    Interactive Simulation Sandbox
                  </h4>
                </div>
                <p className="text-xs text-[#6B6E8A] font-medium">
                  Trigger deterministic events to witness live recalculations of the 10-attempt rolling window and recommendation priorities:
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Button
                    variant="peach"
                    size="sm"
                    disabled={isSimulating}
                    onClick={() => handleSimulateAttempt(true)}
                  >
                    + Simulate 1 Correct Attempt (✓)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSimulating}
                    onClick={() => handleSimulateAttempt(false)}
                  >
                    + Simulate 1 Incorrect Attempt (✗)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSimulating}
                    onClick={handleSimulateFiveAttemptsTwoSessions}
                  >
                    + Simulate 5 Attempts Across 2 Sessions
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF8FD] border-t border-[#DED5FF] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-medium text-[#6B6E8A]">
            Rules fully documented in <code className="bg-white px-1.5 py-0.5 rounded border border-[#DED5FF] text-[#171B37]">docs/ADAPTIVE_ENGINE_SPEC.md</code>
          </div>
          <Button variant="peach" size="sm" onClick={onClose}>
            Close Diagnostics
          </Button>
        </div>
      </div>
    </div>
  );
};
