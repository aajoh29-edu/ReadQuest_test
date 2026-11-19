import {
  Activity,
  AdaptiveRecommendation,
  Assignment,
  Attempt,
  EvidenceStatus,
  Learner,
  Lesson,
  MasteryBand,
  MasteryComponents,
  PriorityTier,
  Reward,
  SessionRecord,
  Skill,
  SkillCategoryId,
  SkillMasteryRecord,
} from '../types';

export type ClockFn = () => Date;

export interface ScoredAttemptWithSession extends Attempt {
  sessionId: string;
}

export interface AdaptiveEngineConfig {
  version: string;
  windowSize: number;
  weightAccuracy: number;
  weightRecency: number;
  weightConsistency: number;
  recencyHalfLifeDays: number;
  minAttemptsForProvisional: number;
  minAttemptsForConfirmed: number;
  minSessionsForConfirmed: number;
  bandNeedsFocusThreshold: number; // < 60
  bandDevelopingThreshold: number; // 60 to < 75
  bandProficientThreshold: number; // 75 to < 90
  normalReviewIntervalDays: number; // 3 days
  masteredReviewIntervalDays: number; // 7 days
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveEngineConfig = {
  version: '1.0.0',
  windowSize: 10,
  weightAccuracy: 0.6,
  weightRecency: 0.2,
  weightConsistency: 0.2,
  recencyHalfLifeDays: 14,
  minAttemptsForProvisional: 1,
  minAttemptsForConfirmed: 5,
  minSessionsForConfirmed: 2,
  bandNeedsFocusThreshold: 60,
  bandDevelopingThreshold: 75,
  bandProficientThreshold: 90,
  normalReviewIntervalDays: 3,
  masteredReviewIntervalDays: 7,
};

export interface RecommendationContext {
  learner: Learner;
  skills: Skill[];
  lessons: Lesson[];
  allAttempts: ScoredAttemptWithSession[];
  sessions: SessionRecord[];
  assignments?: Assignment[];
  activeSession?: SessionRecord | null;
}

/**
 * Deterministic Adaptive Engine
 * Implements COSC 512 mastery scoring, review scheduling, and recommendation policies.
 */
export class AdaptiveEngine {
  private config: AdaptiveEngineConfig;
  private defaultClock: ClockFn;

  constructor(config: Partial<AdaptiveEngineConfig> = {}, clock?: ClockFn) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.defaultClock = clock || (() => new Date());
  }

  public getConfig(): AdaptiveEngineConfig {
    return { ...this.config };
  }

  // ==========================================
  // 1. Mastery Formula Components
  // ==========================================

  /**
   * Accuracy: Number of correct answers in window / total attempts in window (0..1)
   */
  public calculateAccuracy(windowAttempts: Attempt[]): number {
    if (!windowAttempts || windowAttempts.length === 0) return 0;
    const correctCount = windowAttempts.filter((a) => a.isCorrect).length;
    return correctCount / windowAttempts.length;
  }

  /**
   * Recency: Sum(correctness * 2^(-days_since / 14)) / number of attempts (0..1)
   */
  public calculateRecency(windowAttempts: Attempt[], clock: ClockFn = this.defaultClock): number {
    if (!windowAttempts || windowAttempts.length === 0) return 0;

    const nowMs = clock().getTime();
    let weightedSum = 0;

    for (const att of windowAttempts) {
      const attTimeMs = new Date(att.timestamp).getTime();
      const diffMs = Math.max(0, nowMs - attTimeMs);
      const daysSince = diffMs / (1000 * 60 * 60 * 24);
      const decayWeight = Math.pow(2, -daysSince / this.config.recencyHalfLifeDays);
      const correctness = att.isCorrect ? 1.0 : 0.0;
      weightedSum += correctness * decayWeight;
    }

    return weightedSum / windowAttempts.length;
  }

  /**
   * Consistency: Fraction of adjacent attempt pairs where both answers are correct (0..1)
   * For 1 attempt: use correctness as provisional value.
   */
  public calculateConsistency(windowAttempts: Attempt[]): number {
    if (!windowAttempts || windowAttempts.length === 0) return 0;
    if (windowAttempts.length === 1) {
      return windowAttempts[0].isCorrect ? 1.0 : 0.0;
    }

    let pairsBothCorrect = 0;
    const pairCount = windowAttempts.length - 1;

    for (let i = 0; i < pairCount; i++) {
      if (windowAttempts[i].isCorrect && windowAttempts[i + 1].isCorrect) {
        pairsBothCorrect += 1;
      }
    }

    return pairsBothCorrect / pairCount;
  }

  /**
   * Calculates unrounded mastery score (0..100) from accuracy, recency, and consistency.
   */
  public computeRawScore(components: MasteryComponents): number {
    const raw =
      100 *
      (this.config.weightAccuracy * components.accuracy +
        this.config.weightRecency * components.recency +
        this.config.weightConsistency * components.consistency);
    return Math.max(0, Math.min(100, raw));
  }

  // ==========================================
  // 2. Skill Mastery Evaluation
  // ==========================================

  /**
   * Evaluates a single skill given all chronological attempts with session IDs.
   */
  public calculateSkillMastery(
    skill: Skill,
    attempts: ScoredAttemptWithSession[],
    clock: ClockFn = this.defaultClock
  ): SkillMasteryRecord {
    const now = clock();
    const calculatedAt = now.toISOString();

    // Cold start check: 0 attempts
    if (!attempts || attempts.length === 0) {
      return {
        skillId: skill.id,
        skillName: skill.name,
        categoryId: skill.categoryId,
        readingLevelId: skill.targetReadingLevel,
        score: null, // Unknown, NOT zero
        band: 'unknown',
        evidenceStatus: 'unknown',
        isConfirmedMastered: false,
        components: { accuracy: 0, recency: 0, consistency: 0 },
        windowAttemptCount: 0,
        totalAttemptCount: 0,
        sessionCount: 0,
        lastAttemptAt: null,
        nextReviewDueDate: null,
        reviewIntervalDays: 0,
        isReviewDue: true, // unstarted skills are ready for practice
        configVersion: this.config.version,
        calculatedAt,
      };
    }

    // Sort attempts chronologically ascending
    const sortedAttempts = [...attempts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Most recent 10 attempts
    const windowAttempts = sortedAttempts.slice(-this.config.windowSize);

    // Compute components
    const accuracy = this.calculateAccuracy(windowAttempts);
    const recency = this.calculateRecency(windowAttempts, clock);
    const consistency = this.calculateConsistency(windowAttempts);
    const components: MasteryComponents = { accuracy, recency, consistency };

    // Raw unrounded score
    const score = this.computeRawScore(components);

    // Evidence status
    const totalAttemptCount = sortedAttempts.length;
    const uniqueSessionIds = new Set(sortedAttempts.map((a) => a.sessionId));
    const sessionCount = uniqueSessionIds.size;

    let evidenceStatus: EvidenceStatus;
    if (totalAttemptCount < this.config.minAttemptsForConfirmed) {
      evidenceStatus = 'provisional';
    } else if (sessionCount < this.config.minSessionsForConfirmed) {
      evidenceStatus = 'insufficient_sessions';
    } else {
      evidenceStatus = 'confirmed';
    }

    // Mastery band classification (using unrounded score)
    let band: MasteryBand;
    if (score < this.config.bandNeedsFocusThreshold) {
      band = 'needs_focus';
    } else if (score < this.config.bandDevelopingThreshold) {
      band = 'developing';
    } else if (score < this.config.bandProficientThreshold) {
      band = 'proficient';
    } else {
      band = 'mastered';
    }

    // Review intervals
    let reviewIntervalDays = 0;
    if (band === 'proficient') {
      reviewIntervalDays = this.config.normalReviewIntervalDays; // 3 days
    } else if (band === 'mastered') {
      reviewIntervalDays = this.config.masteredReviewIntervalDays; // 7 days
    } else {
      reviewIntervalDays = 0; // Immediate review for developing / needs_focus
    }

    const lastAttempt = sortedAttempts[sortedAttempts.length - 1];
    const lastAttemptAt = lastAttempt.timestamp;
    const lastAttemptMs = new Date(lastAttemptAt).getTime();
    const daysSinceLast = Math.max(0, (now.getTime() - lastAttemptMs) / (1000 * 60 * 60 * 24));

    let nextReviewDueDate: string | null = null;
    let isReviewDue = false;

    if (reviewIntervalDays > 0) {
      const dueDate = new Date(lastAttemptMs + reviewIntervalDays * 24 * 60 * 60 * 1000);
      nextReviewDueDate = dueDate.toISOString();
      isReviewDue = daysSinceLast >= reviewIntervalDays;
    } else {
      isReviewDue = true;
    }

    // Confirmation gate: confirmed mastered requires score >= 90 AND confirmed evidence status
    const isConfirmedMastered = band === 'mastered' && evidenceStatus === 'confirmed';

    return {
      skillId: skill.id,
      skillName: skill.name,
      categoryId: skill.categoryId,
      readingLevelId: skill.targetReadingLevel,
      score,
      band,
      evidenceStatus,
      isConfirmedMastered,
      components,
      windowAttemptCount: windowAttempts.length,
      totalAttemptCount,
      sessionCount,
      lastAttemptAt,
      nextReviewDueDate,
      reviewIntervalDays,
      isReviewDue,
      configVersion: this.config.version,
      calculatedAt,
    };
  }

  // ==========================================
  // 3. Recommendation Generation Policy
  // ==========================================

  /**
   * Generates next best activity recommendation based on priority rules, anti-repetition, and tie-breaking.
   */
  public generateRecommendation(
    context: RecommendationContext,
    clock: ClockFn = this.defaultClock
  ): AdaptiveRecommendation {
    const {
      learner,
      skills,
      lessons,
      allAttempts,
      sessions,
      assignments = [],
      activeSession,
    } = context;

    const now = clock();
    const calculatedAt = now.toISOString();

    // 0. Active in-progress session check (immediate resume)
    if (activeSession && !activeSession.isCompleted) {
      const activeLesson = lessons.find((l) => l.id === activeSession.lessonId);
      if (activeLesson) {
        const nextActivityIndex = Math.min(
          activeSession.currentActivityIndex ?? 0,
          activeLesson.activities.length - 1
        );
        const activity = activeLesson.activities[nextActivityIndex];
        const skill = skills.find((s) => s.id === activity?.primarySkillId);

        return {
          id: `rec-resume-${activeSession.id}`,
          activityId: activity?.id,
          activityPrompt: activity?.prompt,
          activityType: activity?.type,
          targetDifficulty: activity?.difficulty || 'beginner',
          lessonId: activeLesson.id,
          lessonTitle: activeLesson.title,
          skillId: skill?.id,
          skillName: skill?.name,
          categoryId: activeLesson.categoryId,
          categoryName: activeLesson.categoryName,
          readingLevelId: activeLesson.readingLevelId,
          masteryScore: null,
          band: 'unknown',
          evidenceStatus: 'provisional',
          childFriendlyReason: `Resume your adventure in ${activeLesson.title}! (Activity ${nextActivityIndex + 1} of ${activeLesson.activities.length})`,
          adultFacingExplanation: `Prioritized in-progress session to maintain continuity before starting new practice sequences.`,
          priorityTier: 1,
          priorityLabel: 'urgent',
          isAssignment: false,
          isResume: true,
          configVersion: this.config.version,
          calculatedAt,
        };
      }
    }

    // 1. Calculate mastery for all skills
    const masteryMap = new Map<string, SkillMasteryRecord>();
    for (const skill of skills) {
      const skillAttempts = allAttempts.filter((att) => {
        const act = lessons.flatMap((l) => l.activities).find((a) => a.id === att.activityId);
        return act?.primarySkillId === skill.id;
      });
      masteryMap.set(skill.id, this.calculateSkillMastery(skill, skillAttempts, clock));
    }

    // 2. Check eligible assignments (Anti-crowding guard: skip if completed or practiced in active session)
    const pendingAssignment = assignments.find((asg) => asg.status !== 'completed');
    if (pendingAssignment) {
      const assignedLesson = lessons.find((l) => l.id === pendingAssignment.lessonId);
      if (assignedLesson) {
        // Guard against permanent crowding: verify learner hasn't attempted this assigned lesson recently in current turn
        const recentAssignedAttempts = allAttempts
          .slice(-5)
          .some((att) => assignedLesson.activities.some((a) => a.id === att.activityId));

        if (!recentAssignedAttempts) {
          const firstAct = assignedLesson.activities[0];
          const skill = skills.find((s) => s.id === firstAct?.primarySkillId);
          return {
            id: `rec-assign-${pendingAssignment.id}`,
            activityId: firstAct?.id,
            activityPrompt: firstAct?.prompt,
            activityType: firstAct?.type,
            targetDifficulty: firstAct?.difficulty || 'beginner',
            lessonId: assignedLesson.id,
            lessonTitle: assignedLesson.title,
            skillId: skill?.id,
            skillName: skill?.name,
            categoryId: assignedLesson.categoryId,
            categoryName: assignedLesson.categoryName,
            readingLevelId: assignedLesson.readingLevelId,
            masteryScore: null,
            band: 'unknown',
            evidenceStatus: 'provisional',
            childFriendlyReason: `Special assignment waiting for you: ${assignedLesson.title}! 🌟`,
            adultFacingExplanation: `Assigned curriculum item takes precedence over spontaneous adaptive selection.`,
            priorityTier: 1,
            priorityLabel: 'urgent',
            isAssignment: true,
            isResume: false,
            assignmentId: pendingAssignment.id,
            configVersion: this.config.version,
            calculatedAt,
          };
        }
      }
    }

    // 3. Classify candidate skills into priority queues
    // Priority Tier 1: Needs Focus (<60) or Overdue Review
    // Priority Tier 2: Unstarted skills in learner's reading level
    // Priority Tier 3: Developing skills (60 to <75)
    // Priority Tier 4: Proficient/Mastered skills maintenance

    interface ScoredCandidate {
      skill: Skill;
      mastery: SkillMasteryRecord;
      tier: PriorityTier;
      overdueDays: number;
    }

    const candidates: ScoredCandidate[] = [];

    for (const skill of skills) {
      const mastery = masteryMap.get(skill.id)!;
      let tier: PriorityTier = 4;
      let overdueDays = 0;

      if (mastery.lastAttemptAt) {
        const lastMs = new Date(mastery.lastAttemptAt).getTime();
        const daysSince = Math.max(0, (now.getTime() - lastMs) / (1000 * 60 * 60 * 24));
        overdueDays = daysSince - mastery.reviewIntervalDays;
      }

      if (mastery.evidenceStatus === 'unknown') {
        // Tier 3: Unstarted skill introduction
        tier = 3;
      } else if (mastery.band === 'needs_focus') {
        // Tier 1: Critical practice needed
        tier = 1;
        overdueDays += 10; // high boost
      } else if (mastery.isReviewDue) {
        // Tier 1: Spaced review is overdue
        tier = 1;
      } else if (mastery.band === 'developing') {
        // Tier 2: Developing skill
        tier = 2;
      } else {
        // Tier 4: Proficient / Mastered on track
        tier = 4;
      }

      candidates.push({ skill, mastery, tier, overdueDays });
    }

    // Sort candidates deterministically:
    // 1. Tier ASC
    // 2. Overdue days DESC
    // 3. Skill ID alphabetical ASC
    candidates.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (Math.abs(b.overdueDays - a.overdueDays) > 0.001) {
        return b.overdueDays - a.overdueDays;
      }
      return a.skill.id.localeCompare(b.skill.id);
    });

    const chosenCandidate = candidates[0] || {
      skill: skills[0],
      mastery: masteryMap.get(skills[0].id)!,
      tier: 3,
      overdueDays: 0,
    };

    const targetSkill = chosenCandidate.skill;
    const targetMastery = chosenCandidate.mastery;

    // 4. Select Lesson & Activity matching target skill
    const relevantLessons = lessons.filter((l) =>
      l.activities.some((a) => a.primarySkillId === targetSkill.id)
    );
    const chosenLesson = relevantLessons[0] || lessons[0];

    // Filter activities for this skill
    const skillActivities = chosenLesson.activities.filter(
      (a) => a.primarySkillId === targetSkill.id
    );
    const pool = skillActivities.length > 0 ? skillActivities : chosenLesson.activities;

    // 5. Match Difficulty to Performance
    let targetDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (targetMastery.score === null || targetMastery.score < 60) {
      targetDifficulty = 'beginner';
    } else if (targetMastery.score < 75) {
      targetDifficulty = 'intermediate';
    } else {
      targetDifficulty = 'advanced';
    }

    // 6. Anti-Repetition Guard: avoid immediately repeating the most recent activity
    const recentAttemptedActIds = allAttempts.slice(-3).map((a) => a.activityId);
    const mostRecentActId = recentAttemptedActIds[recentAttemptedActIds.length - 1];

    let chosenActivity: Activity;
    const unrepeatedPool = pool.filter((a) => a.id !== mostRecentActId);
    const candidatesToPick = unrepeatedPool.length > 0 ? unrepeatedPool : pool;

    // Prefer matching target difficulty if available, otherwise pick deterministic tie-breaker (Activity ID ASC)
    const matchingDifficulty = candidatesToPick.filter((a) => a.difficulty === targetDifficulty);
    if (matchingDifficulty.length > 0) {
      matchingDifficulty.sort((a, b) => a.id.localeCompare(b.id));
      chosenActivity = matchingDifficulty[0];
    } else {
      candidatesToPick.sort((a, b) => a.id.localeCompare(b.id));
      chosenActivity = candidatesToPick[0];
    }

    // 7. Compose child-friendly reason and adult-facing explanation
    let childReason = '';
    let adultExplanation = '';

    if (targetMastery.evidenceStatus === 'unknown') {
      childReason = `Start a brand new reading skill: ${targetSkill.name}! 🌟`;
      adultExplanation = `Cold start introduction for unpracticed skill '${targetSkill.name}'. Selected Difficulty 1 activity to establish baseline diagnostic evidence.`;
    } else if (targetMastery.band === 'needs_focus') {
      childReason = `Let's practice ${targetSkill.name} together to build your confidence! 💪`;
      adultExplanation = `High-Priority Practice triggered: Score is ${targetMastery.score?.toFixed(1)}% (< 60.0 threshold). Serving scaffolded Difficulty ${chosenActivity.difficulty} item (${chosenActivity.id}) to remediate misconceptions.`;
    } else if (targetMastery.isReviewDue) {
      const interval = targetMastery.reviewIntervalDays;
      childReason = `Time for your ${interval}-day power review of ${targetSkill.name}! ⏰`;
      adultExplanation = `Spaced review interval (${interval} days) reached. Reviewing '${targetSkill.name}' to maintain long-term phonemic retention.`;
    } else if (targetMastery.band === 'developing') {
      childReason = `You're growing faster every day in ${targetSkill.name}! Keep climbing! 🚀`;
      adultExplanation = `Additional practice recommended: Score is ${targetMastery.score?.toFixed(1)}% (developing band 60-74.9). Difficulty ${chosenActivity.difficulty} reinforces accuracy and consistency.`;
    } else {
      childReason = `Keep your reading superpowers sharp in ${targetSkill.name}! ✨`;
      adultExplanation = `Maintenance practice for proficient skill '${targetSkill.name}' (Score: ${targetMastery.score?.toFixed(1)}%, Evidence: ${targetMastery.evidenceStatus}).`;
    }

    const priorityLabels: Record<PriorityTier, 'urgent' | 'high' | 'recommended' | 'review'> = {
      1: targetMastery.band === 'needs_focus' ? 'urgent' : 'review',
      2: 'high',
      3: 'recommended',
      4: 'recommended',
    };

    return {
      id: `rec-adapt-${targetSkill.id}-${chosenActivity.id}`,
      activityId: chosenActivity.id,
      activityPrompt: chosenActivity.prompt,
      activityType: chosenActivity.type,
      targetDifficulty: chosenActivity.difficulty,
      lessonId: chosenLesson.id,
      lessonTitle: chosenLesson.title,
      skillId: targetSkill.id,
      skillName: targetSkill.name,
      categoryId: chosenLesson.categoryId,
      categoryName: chosenLesson.categoryName,
      readingLevelId: chosenLesson.readingLevelId,
      masteryScore: targetMastery.score,
      band: targetMastery.band,
      evidenceStatus: targetMastery.evidenceStatus,
      childFriendlyReason: childReason,
      adultFacingExplanation: adultExplanation,
      priorityTier: chosenCandidate.tier,
      priorityLabel: priorityLabels[chosenCandidate.tier],
      isAssignment: false,
      isResume: false,
      configVersion: this.config.version,
      calculatedAt,
    };
  }

  // ==========================================
  // 4. Milestone Rewards System (Deduplicated, Speed Neutral)
  // ==========================================

  /**
   * Evaluates milestone rewards based strictly on completion and effort/accuracy criteria.
   * Speed is never rewarded. Duplicate awards are strictly prevented.
   */
  public evaluateMilestoneRewards(
    learner: Learner,
    sessions: SessionRecord[],
    allAttempts: Attempt[]
  ): {
    unlockedRewards: Reward[];
    newlyEarnedStars: number;
    newlyEarnedBadges: string[];
  } {
    const existingBadges = new Set(learner.badges || []);
    const completedSessions = sessions.filter((s) => s.isCompleted);
    const uniqueCompletedLessonIds = new Set(completedSessions.map((s) => s.lessonId));
    const totalCompletedQuests = uniqueCompletedLessonIds.size;
    const totalActivitiesCompleted = allAttempts.length;

    const newlyEarnedBadges: string[] = [];
    let newlyEarnedStars = 0;
    const unlockedRewards: Reward[] = [];

    const milestones = [
      {
        id: 'badge-first-quest',
        title: 'Star Scout',
        badgeName: 'Star Scout',
        description: 'Completed your very first reading quest!',
        icon: '🌟',
        stars: 10,
        condition: totalCompletedQuests >= 1,
      },
      {
        id: 'badge-3-quests',
        title: 'Trail Trekker',
        badgeName: 'Trail Trekker',
        description: 'Completed 3 unique reading quests!',
        icon: '🥾',
        stars: 15,
        condition: totalCompletedQuests >= 3,
      },
      {
        id: 'badge-5-quests',
        title: 'Master Explorer',
        badgeName: 'Master Explorer',
        description: 'Completed 5 reading quests on your journey!',
        icon: '🗺️',
        stars: 25,
        condition: totalCompletedQuests >= 5,
      },
      {
        id: 'badge-all-12',
        title: 'Reading Champion',
        badgeName: 'Reading Champion',
        description: 'Completed all 12 curriculum reading quests!',
        icon: '👑',
        stars: 50,
        condition: totalCompletedQuests >= 12,
      },
      {
        id: 'badge-perfect-quest',
        title: 'Sharp Eye',
        badgeName: 'Sharp Eye',
        description: 'Achieved 100% accuracy on a complete 5-question quest!',
        icon: '🎯',
        stars: 15,
        condition: completedSessions.some((s) => s.accuracy === 100),
      },
      {
        id: 'badge-25-activities',
        title: 'Story Adventurer',
        badgeName: 'Story Adventurer',
        description: 'Practiced 25 reading activities!',
        icon: '📚',
        stars: 20,
        condition: totalActivitiesCompleted >= 25,
      },
      {
        id: 'badge-50-activities',
        title: 'Bookworm Legend',
        badgeName: 'Bookworm Legend',
        description: 'Practiced 50 reading activities!',
        icon: '🐛',
        stars: 30,
        condition: totalActivitiesCompleted >= 50,
      },
    ];

    for (const m of milestones) {
      if (m.condition && !existingBadges.has(m.badgeName)) {
        existingBadges.add(m.badgeName);
        newlyEarnedBadges.push(m.badgeName);
        newlyEarnedStars += m.stars;
        unlockedRewards.push({
          id: m.id,
          type: 'badge',
          title: m.title,
          description: m.description,
          icon: m.icon,
          isUnlocked: true,
          earnedAt: new Date().toISOString(),
          milestoneCriterion: m.description,
        });
      }
    }

    return {
      unlockedRewards,
      newlyEarnedStars,
      newlyEarnedBadges,
    };
  }
}

export const defaultAdaptiveEngine = new AdaptiveEngine();
