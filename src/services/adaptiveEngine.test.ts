import {
  AdaptiveEngine,
  DEFAULT_ADAPTIVE_CONFIG,
  ScoredAttemptWithSession,
} from './adaptiveEngine';
import { Learner, Lesson, SessionRecord, Skill } from '../types';

export interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  timestamp: string;
  tests: TestCaseResult[];
}

/**
 * Deterministic test runner for ReadQuest Adaptive Engine.
 * Executable in both CLI and directly in the browser diagnostic panel.
 */
export function runAdaptiveEngineTests(): TestSuiteResult {
  const tests: TestCaseResult[] = [];

  function assert(
    id: string,
    category: string,
    name: string,
    condition: boolean,
    expected: any,
    actual: any,
    details?: string
  ) {
    tests.push({
      id,
      category,
      name,
      passed: Boolean(condition),
      expected: String(expected),
      actual: String(actual),
      details,
    });
  }

  // Fixed Anchor Clock for Deterministic Time Tests
  // 2026-10-28T12:00:00.000Z
  const BASE_TIME = new Date('2026-10-28T12:00:00.000Z');
  const fixedClock = () => BASE_TIME;

  const engine = new AdaptiveEngine(DEFAULT_ADAPTIVE_CONFIG, fixedClock);

  const mockSkill: Skill = {
    id: 'skill-ls-consonants',
    name: 'Initial Consonants',
    categoryId: 'letter-sounds',
    code: 'LS.INIT.01',
    description: 'Letter sounds',
    targetReadingLevel: 'level-1',
  };

  // -------------------------------------------------------------
  // Suite 1: Mathematical Formulas (Accuracy, Recency, Consistency)
  // -------------------------------------------------------------
  {
    // Test 1.1: Accuracy
    const attemptsMixed = [
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
      { isCorrect: true },
    ] as any;
    const acc = engine.calculateAccuracy(attemptsMixed);
    assert(
      'F1_ACCURACY',
      'Formulas',
      'Accuracy calculation (3/4 = 0.75)',
      Math.abs(acc - 0.75) < 0.0001,
      '0.75',
      acc.toFixed(2)
    );

    // Test 1.2: Consistency for single attempt (provisional value)
    const singleCorrect = [{ isCorrect: true }] as any;
    const singleIncorrect = [{ isCorrect: false }] as any;
    assert(
      'F2_CONSISTENCY_SINGLE',
      'Formulas',
      'Consistency for 1 attempt defaults to correctness (1.0)',
      engine.calculateConsistency(singleCorrect) === 1.0 &&
        engine.calculateConsistency(singleIncorrect) === 0.0,
      '1.0 / 0.0',
      `${engine.calculateConsistency(singleCorrect)} / ${engine.calculateConsistency(singleIncorrect)}`
    );

    // Test 1.3: Consistency adjacent pairs [1, 1, 0, 1, 1]
    // Pairs: (1,1)->1, (1,0)->0, (0,1)->0, (1,1)->1 => 2 / 4 = 0.50
    const sequenceAttempts = [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
      { isCorrect: true },
    ] as any;
    const consistency = engine.calculateConsistency(sequenceAttempts);
    assert(
      'F3_CONSISTENCY_PAIRS',
      'Formulas',
      'Consistency evaluates adjacent pairs correctly (2/4 = 0.50)',
      Math.abs(consistency - 0.5) < 0.0001,
      '0.50',
      consistency.toFixed(2)
    );

    // Test 1.4: Recency Decay at exact 14-day half-life (weight = 0.5)
    const nowMs = BASE_TIME.getTime();
    const t0 = new Date(nowMs).toISOString(); // 0 days ago (decay = 1.0)
    const t14 = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days ago (decay = 0.5)
    const t28 = new Date(nowMs - 28 * 24 * 60 * 60 * 1000).toISOString(); // 28 days ago (decay = 0.25)

    const recencyAttempts = [
      { isCorrect: true, timestamp: t0 },
      { isCorrect: true, timestamp: t14 },
    ] as any;
    // (1.0*1.0 + 1.0*0.5) / 2 = 1.5 / 2 = 0.75
    const recencyVal = engine.calculateRecency(recencyAttempts, fixedClock);
    assert(
      'F4_RECENCY_DECAY',
      'Formulas',
      'Recency decay adheres to 14-day half-life (1.0 + 0.5) / 2 = 0.75',
      Math.abs(recencyVal - 0.75) < 0.001,
      '0.750',
      recencyVal.toFixed(3)
    );

    // Test 1.5: Mastery Weighted Formula
    // Accuracy = 1.0, Recency = 1.0, Consistency = 1.0 => 100.0
    const perfectScore = engine.computeRawScore({ accuracy: 1.0, recency: 1.0, consistency: 1.0 });
    assert(
      'F5_WEIGHTED_SCORE_PERFECT',
      'Formulas',
      'Mastery formula calculates 100.0 for all 1.0 components',
      perfectScore === 100.0,
      '100.0',
      perfectScore.toFixed(1)
    );

    // Accuracy = 0.5, Recency = 0.5, Consistency = 0.5 => 100 * (0.6*0.5 + 0.2*0.5 + 0.2*0.5) = 50.0
    const halfScore = engine.computeRawScore({ accuracy: 0.5, recency: 0.5, consistency: 0.5 });
    assert(
      'F6_WEIGHTED_SCORE_HALF',
      'Formulas',
      'Mastery formula calculates 50.0 for all 0.5 components',
      halfScore === 50.0,
      '50.0',
      halfScore.toFixed(1)
    );
  }

  // -------------------------------------------------------------
  // Suite 2: Cold Start & Limited Evidence
  // -------------------------------------------------------------
  {
    // Test 2.1: Cold Start (0 attempts)
    const coldStartResult = engine.calculateSkillMastery(mockSkill, [], fixedClock);
    assert(
      'C1_COLD_START_SCORE_NULL',
      'Cold Start & Evidence',
      '0 attempts yields null score (unknown, not zero)',
      coldStartResult.score === null && coldStartResult.evidenceStatus === 'unknown',
      'score: null, evidence: unknown',
      `score: ${coldStartResult.score}, evidence: ${coldStartResult.evidenceStatus}`
    );

    // Test 2.2: Provisional Score (< 5 attempts)
    const fourAttempts: ScoredAttemptWithSession[] = [1, 2, 3, 4].map((i) => ({
      activityId: `act-1-q${i}`,
      sessionId: 'session-1',
      selectedOptionId: 'opt-1',
      isCorrect: true,
      correctOptionId: 'opt-1',
      explanation: 'Great!',
      timestamp: BASE_TIME.toISOString(),
      activeDurationSeconds: 12,
      attemptNumber: i,
      idempotencyKey: `idem_${i}`,
    }));
    const provisionalResult = engine.calculateSkillMastery(mockSkill, fourAttempts, fixedClock);
    assert(
      'C2_PROVISIONAL_EVIDENCE',
      'Cold Start & Evidence',
      '4 attempts marks evidence status as provisional',
      provisionalResult.evidenceStatus === 'provisional' && provisionalResult.score !== null,
      'evidenceStatus: provisional',
      `evidenceStatus: ${provisionalResult.evidenceStatus}`
    );

    // Test 2.3: 5 attempts in a single session (gate prevents confirmed mastered)
    const fiveSingleSessionAttempts: ScoredAttemptWithSession[] = [1, 2, 3, 4, 5].map((i) => ({
      activityId: `act-1-q${i}`,
      sessionId: 'session-single',
      selectedOptionId: 'opt-1',
      isCorrect: true,
      correctOptionId: 'opt-1',
      explanation: 'Great!',
      timestamp: BASE_TIME.toISOString(),
      activeDurationSeconds: 12,
      attemptNumber: i,
      idempotencyKey: `idem_single_${i}`,
    }));
    const singleSessionResult = engine.calculateSkillMastery(
      mockSkill,
      fiveSingleSessionAttempts,
      fixedClock
    );
    assert(
      'C3_INSUFFICIENT_SESSIONS_GATE',
      'Cold Start & Evidence',
      '5 attempts in 1 session cannot be confirmed mastered (insufficient_sessions)',
      singleSessionResult.evidenceStatus === 'insufficient_sessions' &&
        !singleSessionResult.isConfirmedMastered,
      'evidence: insufficient_sessions, isConfirmedMastered: false',
      `evidence: ${singleSessionResult.evidenceStatus}, isConfirmedMastered: ${singleSessionResult.isConfirmedMastered}`
    );

    // Test 2.4: 5 attempts across 2 sessions (confirmed mastered)
    const fiveTwoSessionAttempts: ScoredAttemptWithSession[] = [
      ...fiveSingleSessionAttempts.slice(0, 3).map((a) => ({ ...a, sessionId: 'session-A' })),
      ...fiveSingleSessionAttempts.slice(3, 5).map((a) => ({ ...a, sessionId: 'session-B' })),
    ];
    const twoSessionsResult = engine.calculateSkillMastery(
      mockSkill,
      fiveTwoSessionAttempts,
      fixedClock
    );
    assert(
      'C4_CONFIRMED_EVIDENCE',
      'Cold Start & Evidence',
      '5 attempts across 2 sessions unlocks confirmed evidence and confirmed mastered',
      twoSessionsResult.evidenceStatus === 'confirmed' && twoSessionsResult.isConfirmedMastered,
      'evidence: confirmed, isConfirmedMastered: true',
      `evidence: ${twoSessionsResult.evidenceStatus}, isConfirmedMastered: ${twoSessionsResult.isConfirmedMastered}`
    );
  }

  // -------------------------------------------------------------
  // Suite 3: Score Boundaries & Bands
  // -------------------------------------------------------------
  {
    // Needs focus (< 60) vs Developing (60 to < 75)
    // 59.9 should be needs_focus
    const score599 = engine.computeRawScore({ accuracy: 0.599, recency: 0.599, consistency: 0.599 });
    const score600 = engine.computeRawScore({ accuracy: 0.60, recency: 0.60, consistency: 0.60 });
    const score749 = engine.computeRawScore({ accuracy: 0.749, recency: 0.749, consistency: 0.749 });
    const score750 = engine.computeRawScore({ accuracy: 0.75, recency: 0.75, consistency: 0.75 });
    const score899 = engine.computeRawScore({ accuracy: 0.899, recency: 0.899, consistency: 0.899 });
    const score900 = engine.computeRawScore({ accuracy: 0.90, recency: 0.90, consistency: 0.90 });

    assert(
      'B1_BOUNDARY_599_NEEDS_FOCUS',
      'Bands & Boundaries',
      'Score 59.9 classifies as needs_focus',
      score599 < 60,
      '< 60.0',
      score599.toFixed(1)
    );

    assert(
      'B2_BOUNDARY_600_DEVELOPING',
      'Bands & Boundaries',
      'Score 60.0 classifies as developing',
      score600 >= 60 && score600 < 75,
      '[60.0, 75.0)',
      score600.toFixed(1)
    );

    assert(
      'B3_BOUNDARY_750_PROFICIENT',
      'Bands & Boundaries',
      'Score 75.0 classifies as proficient',
      score750 >= 75 && score750 < 90,
      '[75.0, 90.0)',
      score750.toFixed(1)
    );

    assert(
      'B4_BOUNDARY_900_MASTERED',
      'Bands & Boundaries',
      'Score 90.0 classifies as mastered',
      score900 >= 90,
      '>= 90.0',
      score900.toFixed(1)
    );
  }

  // -------------------------------------------------------------
  // Suite 4: Review Intervals & Spaced Timing
  // -------------------------------------------------------------
  {
    // 6 attempts [true, true, true, true, false, true] 2 days ago produces ~77.1% score (proficient band 75-89.9)
    const twoDaysAgo = new Date(BASE_TIME.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const proficientAttempts: ScoredAttemptWithSession[] = [
      { activityId: 'act-1', sessionId: 'sess-1', selectedOptionId: 'o1', isCorrect: true, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 1, idempotencyKey: 'idem_p_1' },
      { activityId: 'act-2', sessionId: 'sess-1', selectedOptionId: 'o1', isCorrect: true, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 2, idempotencyKey: 'idem_p_2' },
      { activityId: 'act-3', sessionId: 'sess-1', selectedOptionId: 'o1', isCorrect: true, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 3, idempotencyKey: 'idem_p_3' },
      { activityId: 'act-4', sessionId: 'sess-2', selectedOptionId: 'o1', isCorrect: true, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 4, idempotencyKey: 'idem_p_4' },
      { activityId: 'act-5', sessionId: 'sess-2', selectedOptionId: 'o2', isCorrect: false, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 5, idempotencyKey: 'idem_p_5' },
      { activityId: 'act-6', sessionId: 'sess-2', selectedOptionId: 'o1', isCorrect: true, correctOptionId: 'o1', explanation: '', timestamp: twoDaysAgo, activeDurationSeconds: 12, attemptNumber: 6, idempotencyKey: 'idem_p_6' },
    ];

    const profResult2Days = engine.calculateSkillMastery(mockSkill, proficientAttempts, fixedClock);
    assert(
      'R1_PROFICIENT_INTERVAL_3D',
      'Review Timing',
      'Proficient review interval is set to 3 days (Score in 75-89.9 range)',
      profResult2Days.band === 'proficient' && profResult2Days.reviewIntervalDays === 3,
      'band: proficient, reviewInterval: 3 days',
      `band: ${profResult2Days.band}, score: ${profResult2Days.score?.toFixed(1)}, reviewInterval: ${profResult2Days.reviewIntervalDays} days`
    );

    assert(
      'R2_REVIEW_NOT_DUE_AT_2D',
      'Review Timing',
      'Proficient skill practiced 2 days ago is not yet review due',
      !profResult2Days.isReviewDue,
      'isReviewDue: false',
      `isReviewDue: ${profResult2Days.isReviewDue}`
    );

    // Fast-forward clock to 3.5 days later (2 + 1.5 = 3.5 days elapsed)
    const clockAfter3Point5Days = () =>
      new Date(BASE_TIME.getTime() + 1.5 * 24 * 60 * 60 * 1000);
    const profResult3Point5Days = engine.calculateSkillMastery(
      mockSkill,
      proficientAttempts,
      clockAfter3Point5Days
    );
    assert(
      'R3_REVIEW_DUE_AFTER_3D',
      'Review Timing',
      'Proficient skill practiced 3.5 days ago triggers review due',
      profResult3Point5Days.isReviewDue,
      'isReviewDue: true',
      `isReviewDue: ${profResult3Point5Days.isReviewDue}`
    );

    // Verify Mastered skill (>= 90) has 7-day review interval
    const masteredAttempts: ScoredAttemptWithSession[] = [1, 2, 3, 4, 5].map((i) => ({
      activityId: `act-m-${i}`,
      sessionId: i <= 3 ? 'sess-m1' : 'sess-m2',
      selectedOptionId: 'o1',
      isCorrect: true,
      correctOptionId: 'o1',
      explanation: '',
      timestamp: twoDaysAgo,
      activeDurationSeconds: 12,
      attemptNumber: i,
      idempotencyKey: `idem_m_${i}`,
    }));
    const masteredResult = engine.calculateSkillMastery(mockSkill, masteredAttempts, fixedClock);
    assert(
      'R4_MASTERED_INTERVAL_7D',
      'Review Timing',
      'Mastered skill review interval is set to 7 days',
      masteredResult.band === 'mastered' && masteredResult.reviewIntervalDays === 7,
      'band: mastered, reviewInterval: 7 days',
      `band: ${masteredResult.band}, reviewInterval: ${masteredResult.reviewIntervalDays} days`
    );
  }

  // -------------------------------------------------------------
  // Suite 5: Recommendation Stability & Deterministic Anti-Repetition
  // -------------------------------------------------------------
  {
    const mockLesson: Lesson = {
      id: 'lesson-1',
      categoryId: 'letter-sounds',
      categoryName: 'Letter Sounds',
      readingLevelId: 'level-1',
      readingLevelName: 'Seedling',
      title: 'Sound Explorers',
      subtitle: 'Learn initial letters',
      description: 'Phonemic awareness',
      estimatedMinutes: 5,
      totalActivities: 3,
      badgeReward: 'Sound Badge',
      iconName: 'book',
      themeColor: {
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-800',
        border: 'border-purple-200',
        accent: 'bg-purple-600',
      },
      publicationStatus: 'published',
      activities: [
        {
          id: 'act-a1',
          lessonId: 'lesson-1',
          primarySkillId: 'skill-ls-consonants',
          type: 'multiple-choice-sound',
          difficulty: 'beginner',
          order: 1,
          prompt: 'Find /b/ sound',
          options: [{ id: 'opt-b', label: 'Bat', isCorrect: true }],
          explanation: 'Good',
          encouragementSuccess: 'Great',
          encouragementRetry: 'Try again',
          publicationStatus: 'published',
          estimatedDurationSeconds: 20,
        },
        {
          id: 'act-a2',
          lessonId: 'lesson-1',
          primarySkillId: 'skill-ls-consonants',
          type: 'multiple-choice-sound',
          difficulty: 'beginner',
          order: 2,
          prompt: 'Find /m/ sound',
          options: [{ id: 'opt-m', label: 'Mat', isCorrect: true }],
          explanation: 'Good',
          encouragementSuccess: 'Great',
          encouragementRetry: 'Try again',
          publicationStatus: 'published',
          estimatedDurationSeconds: 20,
        },
      ],
    };

    const mockLearner: Learner = {
      id: 'learner-1',
      name: 'Marion',
      avatar: 'avatar1',
      avatarName: 'Explorer',
      readingLevelId: 'level-1',
      gradeLevel: 'Kindergarten',
      starsEarned: 10,
      currentStreakDays: 1,
      badges: [],
      totalActivePracticeSeconds: 100,
    };

    // If learner just attempted 'act-a1', anti-repetition must pick 'act-a2'
    const recentAttempts: ScoredAttemptWithSession[] = [
      {
        activityId: 'act-a1',
        sessionId: 'sess-1',
        selectedOptionId: 'opt-b',
        isCorrect: true,
        correctOptionId: 'opt-b',
        explanation: '',
        timestamp: BASE_TIME.toISOString(),
        activeDurationSeconds: 15,
        attemptNumber: 1,
        idempotencyKey: 'idem_a1',
      },
    ];

    const recContext = {
      learner: mockLearner,
      skills: [mockSkill],
      lessons: [mockLesson],
      allAttempts: recentAttempts,
      sessions: [],
    };

    const rec1 = engine.generateRecommendation(recContext, fixedClock);
    assert(
      'A1_ANTI_REPETITION',
      'Recommendation Policy',
      'Anti-repetition avoids recently attempted act-a1 and picks alternative act-a2',
      rec1.activityId === 'act-a2',
      'act-a2',
      String(rec1.activityId)
    );

    // Stability: Repeating same call returns deterministic identical recommendation
    const rec2 = engine.generateRecommendation(recContext, fixedClock);
    assert(
      'A2_DETERMINISTIC_STABILITY',
      'Recommendation Policy',
      'Consecutive identical evaluations return deterministic identical activity',
      rec1.activityId === rec2.activityId && rec1.priorityTier === rec2.priorityTier,
      `${rec1.activityId} (tier ${rec1.priorityTier})`,
      `${rec2.activityId} (tier ${rec2.priorityTier})`
    );
  }

  // -------------------------------------------------------------
  // Suite 6: Milestone Rewards (Deduplicated, Speed Neutral)
  // -------------------------------------------------------------
  {
    const learnerWithoutBadges: Learner = {
      id: 'learner-test',
      name: 'Marion',
      avatar: 'avatar1',
      avatarName: 'Explorer',
      readingLevelId: 'level-1',
      gradeLevel: 'Kindergarten',
      starsEarned: 0,
      currentStreakDays: 1,
      badges: [],
      totalActivePracticeSeconds: 120,
    };

    const mockCompletedSession: SessionRecord = {
      id: 'sess-c1',
      lessonId: 'lesson-1',
      lessonTitle: 'Sound Explorers',
      categoryId: 'letter-sounds',
      readingLevelId: 'level-1',
      startedAt: BASE_TIME.toISOString(),
      updatedAt: BASE_TIME.toISOString(),
      completedAt: BASE_TIME.toISOString(),
      currentActivityIndex: 4,
      currentQuestionIndex: 4,
      attempts: [],
      answers: [],
      isCompleted: true,
      score: 5,
      totalActivities: 5,
      totalQuestions: 5,
      accuracy: 100,
      totalActiveDurationSeconds: 120,
    };

    const eval1 = engine.evaluateMilestoneRewards(
      learnerWithoutBadges,
      [mockCompletedSession],
      new Array(5).fill({ isCorrect: true }) as any
    );

    assert(
      'M1_FIRST_QUEST_MILESTONE',
      'Milestone Rewards',
      'First quest completion grants Star Scout badge and 10 stars',
      eval1.newlyEarnedBadges.includes('Star Scout') && eval1.newlyEarnedStars >= 10,
      'Includes Star Scout badge and >=10 stars',
      `Badges: ${eval1.newlyEarnedBadges.join(', ')}, Stars: ${eval1.newlyEarnedStars}`
    );

    // Second evaluation with badge already in learner.badges should yield 0 new stars and 0 new badges
    const learnerWithBadge: Learner = {
      ...learnerWithoutBadges,
      badges: [...eval1.newlyEarnedBadges],
      starsEarned: eval1.newlyEarnedStars,
    };

    const eval2 = engine.evaluateMilestoneRewards(
      learnerWithBadge,
      [mockCompletedSession],
      new Array(5).fill({ isCorrect: true }) as any
    );

    assert(
      'M2_NO_DUPLICATE_REWARDS',
      'Milestone Rewards',
      'Duplicate reward evaluation strictly grants 0 duplicate badges and 0 duplicate stars',
      eval2.newlyEarnedBadges.length === 0 && eval2.newlyEarnedStars === 0,
      '0 new badges, 0 new stars',
      `${eval2.newlyEarnedBadges.length} new badges, ${eval2.newlyEarnedStars} new stars`
    );
  }

  const passedCount = tests.filter((t) => t.passed).length;

  return {
    total: tests.length,
    passed: passedCount,
    failed: tests.length - passedCount,
    timestamp: new Date().toISOString(),
    tests,
  };
}
