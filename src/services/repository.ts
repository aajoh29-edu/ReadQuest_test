import {
  Activity,
  AdaptiveRecommendation,
  Assignment,
  Attempt,
  Classroom,
  DateFilterOption,
  DemoRole,
  GradedAnswer,
  Learner,
  LearnerProfile,
  Lesson,
  Mastery,
  ParentProfile,
  ReadingLevel,
  ReadingLevelId,
  ReadingProgressSummary,
  Recommendation,
  Session,
  SessionRecord,
  Skill,
  SkillCategory,
  SkillCategoryId,
  TeacherProfile,
} from '../types';
import { GradingService } from './gradingService';
import {
  defaultAdaptiveEngine,
  ScoredAttemptWithSession,
} from './adaptiveEngine';
import {
  INITIAL_LEARNER,
  READING_LEVELS,
  REWARDS_CATALOG,
  SYNTHETIC_CATEGORIES,
  SYNTHETIC_LESSONS,
  SYNTHETIC_SKILLS,
} from './data/syntheticCurriculum';
import {
  DEMO_CLASSROOMS,
  DEMO_PARENTS,
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  INITIAL_ASSIGNMENTS,
  SEED_SESSIONS,
} from './data/syntheticUserAccounts';

const STORAGE_KEYS = {
  PROFILE: 'readquest_demo_profile_v2',
  SESSIONS: 'readquest_demo_sessions_v2',
  ACTIVE_SESSION: 'readquest_demo_active_session_v2',
  LEARNERS: 'readquest_demo_learners_v2',
  PARENT: 'readquest_demo_parent_v2',
  TEACHER: 'readquest_demo_teacher_v2',
  CLASSROOMS: 'readquest_demo_classrooms_v2',
  ASSIGNMENTS: 'readquest_demo_assignments_v2',
  ACTIVE_ROLE: 'readquest_demo_active_role_v2',
};

export interface LessonFilterOptions {
  categoryId?: SkillCategoryId | 'all';
  readingLevelId?: ReadingLevelId | 'all';
  searchQuery?: string;
}

export interface RoleContextState {
  role: DemoRole;
  learnerId: string;
  parentId: string;
  teacherId: string;
  classId: string;
}

export interface IReadingQuestRepository {
  // Learner profile methods
  getLearner(): Promise<Learner>;
  getLearnerProfile(): Promise<LearnerProfile>;
  updateLearner(updates: Partial<Learner>): Promise<Learner>;
  updateLearnerProfile(updates: Partial<LearnerProfile>): Promise<LearnerProfile>;
  getAllLearners(): Promise<Learner[]>;
  getLearnerById(id: string): Promise<Learner | null>;
  selectActiveLearner(learnerId: string): Promise<Learner>;

  // Curriculum methods
  getReadingLevels(): Promise<ReadingLevel[]>;
  getSkills(): Promise<Skill[]>;
  getCategories(): Promise<SkillCategory[]>;
  getAllLessons(filters?: LessonFilterOptions): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | null>;
  getRecommendedLesson(learnerId?: string): Promise<Lesson>;
  getRecommendations(learnerId?: string): Promise<Recommendation[]>;
  getAdaptiveRecommendation(learnerId?: string): Promise<AdaptiveRecommendation>;

  // Session & activity methods
  getActiveSession(lessonId?: string): Promise<SessionRecord | null>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  getAllSessions(): Promise<SessionRecord[]>;
  getLearnerSessions(learnerId: string): Promise<SessionRecord[]>;
  startOrCreateSession(lessonId: string): Promise<SessionRecord>;
  submitAnswer(
    sessionId: string,
    activityId: string,
    selectedOptionId: string,
    idempotencyKey?: string,
    activeDurationSeconds?: number
  ): Promise<{ session: SessionRecord; gradedAnswer: GradedAnswer }>;
  advanceSessionQuestion(sessionId: string): Promise<SessionRecord>;
  completeSession(sessionId: string): Promise<SessionRecord>;

  // Mastery & progress summaries
  getMasterySummary(learnerId?: string): Promise<Mastery[]>;
  getProgressSummary(learnerId?: string): Promise<ReadingProgressSummary>;
  getLearnerRecentAttempts(
    learnerId: string,
    limit?: number,
    dateFilter?: DateFilterOption
  ): Promise<{
    attempt: Attempt;
    session: SessionRecord;
    skillName: string;
    categoryName: string;
    lessonTitle: string;
  }[]>;
  getLearnerWeeklyPractice(
    learnerId: string,
    days?: number
  ): Promise<{
    date: string;
    dayLabel: string;
    activeMinutes: number;
    questionsAnswered: number;
    accuracy: number;
  }[]>;

  // Parent methods
  getParentProfile(parentId?: string): Promise<ParentProfile>;
  updateParentProfile(parentId: string, updates: Partial<ParentProfile>): Promise<ParentProfile>;
  getParentLearners(parentId?: string): Promise<Learner[]>;

  // Teacher methods
  getTeacherProfile(teacherId?: string): Promise<TeacherProfile>;
  getTeacherClasses(teacherId?: string): Promise<Classroom[]>;
  getClassLearners(classId: string): Promise<Learner[]>;
  getClassMasteryMatrix(classId: string): Promise<{
    learner: Learner;
    skillsMastery: Record<string, Mastery>;
    overallAccuracy: number;
    totalQuestsCompleted: number;
    totalActiveMinutes: number;
  }[]>;

  // Assignments
  getAssignments(classId?: string, learnerId?: string): Promise<Assignment[]>;
  createAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'completedLearnerIds'>
  ): Promise<Assignment>;
  markAssignmentCompleted(assignmentId: string, learnerId: string): Promise<Assignment>;

  // Role switching
  getActiveRole(): RoleContextState;
  setActiveRole(role: DemoRole, updates?: Partial<RoleContextState>): void;

  // Exports
  exportParentProgressCSV(learnerId: string, dateFilter?: DateFilterOption): Promise<string>;
  exportTeacherClassCSV(classId: string): Promise<string>;

  // Demo reset
  resetDemoData(): Promise<void>;
}

export class LocalStorageReadingQuestRepository implements IReadingQuestRepository {
  private memoryLearners: Learner[];
  private memoryLearner: Learner;
  private memorySessions: SessionRecord[] = [];
  private memoryParent: ParentProfile;
  private memoryTeacher: TeacherProfile;
  private memoryClassrooms: Classroom[];
  private memoryAssignments: Assignment[];
  private memoryRoleState: RoleContextState;

  constructor() {
    this.memoryLearners = this.loadLearners();
    this.memoryLearner = this.loadActiveLearner();
    this.memorySessions = this.loadSessions();
    this.memoryParent = this.loadParent();
    this.memoryTeacher = this.loadTeacher();
    this.memoryClassrooms = this.loadClassrooms();
    this.memoryAssignments = this.loadAssignments();
    this.memoryRoleState = this.loadRoleState();
  }

  // --- Persistence Helpers ---
  private loadLearners(): Learner[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LEARNERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    this.persistLearners(DEMO_STUDENTS);
    return [...DEMO_STUDENTS];
  }

  private persistLearners(learners: Learner[]) {
    this.memoryLearners = learners;
    try {
      localStorage.setItem(STORAGE_KEYS.LEARNERS, JSON.stringify(learners));
    } catch (e) {
      console.warn('Failed to persist learners to localStorage', e);
    }
  }

  private loadActiveLearner(): Learner {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    const defaultLearner = this.memoryLearners[0] || INITIAL_LEARNER;
    this.persistLearner(defaultLearner);
    return { ...defaultLearner };
  }

  private persistLearner(learner: Learner) {
    this.memoryLearner = learner;
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(learner));
    } catch (e) {
      console.warn('Failed to persist learner to localStorage', e);
    }
  }

  private loadSessions(): SessionRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (stored) {
        const parsed: SessionRecord[] = JSON.parse(stored);
        // Ensure every session has a learnerId (default to first student if missing)
        return parsed.map((s) => ({
          ...s,
          learnerId: s.learnerId || 'learner-demo-1',
        }));
      }
    } catch {
      // fallback
    }
    this.persistSessions(SEED_SESSIONS);
    return [...SEED_SESSIONS];
  }

  private persistSessions(sessions: SessionRecord[]) {
    this.memorySessions = sessions;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to persist sessions to localStorage', e);
    }
  }

  private loadParent(): ParentProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARENT);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    this.persistParent(DEMO_PARENTS[0]);
    return { ...DEMO_PARENTS[0] };
  }

  private persistParent(parent: ParentProfile) {
    this.memoryParent = parent;
    try {
      localStorage.setItem(STORAGE_KEYS.PARENT, JSON.stringify(parent));
    } catch (e) {
      console.warn('Failed to persist parent to localStorage', e);
    }
  }

  private loadTeacher(): TeacherProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEACHER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    this.persistTeacher(DEMO_TEACHERS[0]);
    return { ...DEMO_TEACHERS[0] };
  }

  private persistTeacher(teacher: TeacherProfile) {
    this.memoryTeacher = teacher;
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(teacher));
    } catch (e) {
      console.warn('Failed to persist teacher to localStorage', e);
    }
  }

  private loadClassrooms(): Classroom[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    this.persistClassrooms(DEMO_CLASSROOMS);
    return [...DEMO_CLASSROOMS];
  }

  private persistClassrooms(classes: Classroom[]) {
    this.memoryClassrooms = classes;
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classes));
    } catch (e) {
      console.warn('Failed to persist classrooms to localStorage', e);
    }
  }

  private loadAssignments(): Assignment[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    this.persistAssignments(INITIAL_ASSIGNMENTS);
    return [...INITIAL_ASSIGNMENTS];
  }

  private persistAssignments(assignments: Assignment[]) {
    this.memoryAssignments = assignments;
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    } catch (e) {
      console.warn('Failed to persist assignments to localStorage', e);
    }
  }

  private loadRoleState(): RoleContextState {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    const defaultState: RoleContextState = {
      role: 'child',
      learnerId: 'learner-demo-1',
      parentId: 'parent-eleanor-vance',
      teacherId: 'teacher-clara-martinez',
      classId: 'class-room-104',
    };
    return defaultState;
  }

  private persistRoleState(state: RoleContextState) {
    this.memoryRoleState = state;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist role state to localStorage', e);
    }
  }

  private adaptAttempt(attempt: Attempt): GradedAnswer {
    return {
      ...attempt,
      questionId: attempt.activityId,
    };
  }

  // --- Learner Profile Methods ---
  public async getLearner(): Promise<Learner> {
    return { ...this.memoryLearner };
  }

  public async getLearnerProfile(): Promise<LearnerProfile> {
    return this.getLearner();
  }

  public async updateLearner(updates: Partial<Learner>): Promise<Learner> {
    const updated = {
      ...this.memoryLearner,
      ...updates,
    };
    this.persistLearner(updated);

    // Also update in memoryLearners list
    const index = this.memoryLearners.findIndex((l) => l.id === updated.id);
    if (index !== -1) {
      const nextLearners = [...this.memoryLearners];
      nextLearners[index] = updated;
      this.persistLearners(nextLearners);
    }

    return { ...updated };
  }

  public async updateLearnerProfile(updates: Partial<LearnerProfile>): Promise<LearnerProfile> {
    return this.updateLearner(updates);
  }

  public async getAllLearners(): Promise<Learner[]> {
    return [...this.memoryLearners];
  }

  public async getLearnerById(id: string): Promise<Learner | null> {
    const found = this.memoryLearners.find((l) => l.id === id);
    return found ? { ...found } : null;
  }

  public async selectActiveLearner(learnerId: string): Promise<Learner> {
    const found = this.memoryLearners.find((l) => l.id === learnerId);
    if (!found) {
      throw new Error(`Learner with ID '${learnerId}' not found.`);
    }
    this.persistLearner(found);
    this.setActiveRole(this.memoryRoleState.role, { learnerId });
    return { ...found };
  }

  // --- Curriculum Methods ---
  public async getReadingLevels(): Promise<ReadingLevel[]> {
    return [...READING_LEVELS];
  }

  public async getSkills(): Promise<Skill[]> {
    return [...SYNTHETIC_SKILLS];
  }

  public async getCategories(): Promise<SkillCategory[]> {
    const all = await this.getAllLessons();
    return SYNTHETIC_CATEGORIES.map((cat) => ({
      ...cat,
      lessons: all.filter((l) => l.categoryId === cat.id),
    }));
  }

  public async getAllLessons(filters?: LessonFilterOptions): Promise<Lesson[]> {
    let list = SYNTHETIC_LESSONS.map((l) => GradingService.sanitizeLesson(l));

    if (!filters) {
      return list;
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      list = list.filter((l) => l.categoryId === filters.categoryId);
    }

    if (filters.readingLevelId && filters.readingLevelId !== 'all') {
      list = list.filter((l) => l.readingLevelId === filters.readingLevelId);
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.subtitle.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.categoryName.toLowerCase().includes(q) ||
          l.readingLevelName.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public async getLesson(id: string): Promise<Lesson | null> {
    const found = SYNTHETIC_LESSONS.find((l) => l.id === id);
    if (!found) return null;
    return GradingService.sanitizeLesson(found);
  }

  public async getAdaptiveRecommendation(learnerId?: string): Promise<AdaptiveRecommendation> {
    const targetLearnerId = learnerId || this.memoryLearner.id;
    const learner = (await this.getLearnerById(targetLearnerId)) || this.memoryLearner;
    const skills = await this.getSkills();
    const lessons = SYNTHETIC_LESSONS;

    const learnerSessions = this.memorySessions.filter((s) => (s.learnerId || 'learner-demo-1') === targetLearnerId);
    const allAttempts: ScoredAttemptWithSession[] = learnerSessions.flatMap((s) =>
      s.attempts.map((a) => ({
        ...a,
        sessionId: s.id,
      }))
    );
    const active = learnerSessions.find((s) => !s.isCompleted);

    return defaultAdaptiveEngine.generateRecommendation({
      learner,
      skills,
      lessons,
      allAttempts,
      sessions: learnerSessions,
      activeSession: active || null,
    });
  }

  public async getRecommendedLesson(learnerId?: string): Promise<Lesson> {
    const adaptRec = await this.getAdaptiveRecommendation(learnerId);
    const targetLesson = await this.getLesson(adaptRec.lessonId);
    if (targetLesson) return targetLesson;

    const all = await this.getAllLessons();
    return all[0];
  }

  public async getRecommendations(learnerId?: string): Promise<Recommendation[]> {
    const targetLearnerId = learnerId || this.memoryLearner.id;
    const adaptRec = await this.getAdaptiveRecommendation(targetLearnerId);
    const all = await this.getAllLessons();
    const learnerSessions = this.memorySessions.filter((s) => (s.learnerId || 'learner-demo-1') === targetLearnerId);
    const completedIds = new Set(
      learnerSessions.filter((s) => s.isCompleted).map((s) => s.lessonId)
    );

    const primaryRec: Recommendation = {
      ...adaptRec,
      reason: adaptRec.childFriendlyReason,
      priority: adaptRec.priorityLabel === 'urgent' ? 'high' : 'medium',
      isResume: adaptRec.isResume,
    };

    const recommendations: Recommendation[] = [primaryRec];

    // Add alternate candidates
    all
      .filter((l) => l.id !== adaptRec.lessonId && !completedIds.has(l.id))
      .slice(0, 2)
      .forEach((lesson) => {
        recommendations.push({
          id: `rec-alt-${lesson.id}`,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          categoryName: lesson.categoryName,
          readingLevelId: lesson.readingLevelId,
          reason: lesson.prerequisiteExplanation || `Practice quest in ${lesson.readingLevelName}`,
          priority: 'low',
          isResume: false,
        });
      });

    return recommendations;
  }

  // --- Session & Activity Methods ---
  public async getActiveSession(lessonId?: string): Promise<SessionRecord | null> {
    const activeLearnerId = this.memoryLearner.id;
    const sessions = this.memorySessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === activeLearnerId
    );
    if (lessonId) {
      return sessions.find((s) => s.lessonId === lessonId && !s.isCompleted) || null;
    }
    return sessions.find((s) => !s.isCompleted) || null;
  }

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    const found = this.memorySessions.find((s) => s.id === sessionId);
    return found ? { ...found } : null;
  }

  public async getAllSessions(): Promise<SessionRecord[]> {
    return [...this.memorySessions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  public async getLearnerSessions(learnerId: string): Promise<SessionRecord[]> {
    return this.memorySessions
      .filter((s) => (s.learnerId || 'learner-demo-1') === learnerId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public async startOrCreateSession(lessonId: string): Promise<SessionRecord> {
    const lesson = SYNTHETIC_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Curriculum error: Lesson with ID '${lessonId}' was not found.`);
    }

    const currentLearnerId = this.memoryLearner.id;

    // Check if an uncompleted session already exists for this lesson and learner
    const existing = this.memorySessions.find(
      (s) =>
        s.lessonId === lessonId &&
        (s.learnerId || 'learner-demo-1') === currentLearnerId &&
        !s.isCompleted
    );
    if (existing) {
      return { ...existing };
    }

    const newSession: SessionRecord = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      learnerId: currentLearnerId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      categoryId: lesson.categoryId,
      readingLevelId: lesson.readingLevelId,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentActivityIndex: 0,
      currentQuestionIndex: 0,
      attempts: [],
      answers: [],
      isCompleted: false,
      score: 0,
      totalActivities: lesson.activities.length,
      totalQuestions: lesson.activities.length,
      accuracy: 0,
      totalActiveDurationSeconds: 0,
    };

    const nextSessions = [newSession, ...this.memorySessions];
    this.persistSessions(nextSessions);
    return { ...newSession };
  }

  public async submitAnswer(
    sessionId: string,
    activityId: string,
    selectedOptionId: string,
    idempotencyKey?: string,
    activeDurationSeconds: number = 15
  ): Promise<{ session: SessionRecord; gradedAnswer: GradedAnswer }> {
    const sessionIndex = this.memorySessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const session = { ...this.memorySessions[sessionIndex] };

    // Idempotency check: if an attempt with this idempotency key already exists, return existing!
    if (idempotencyKey) {
      const existingByIdempotency = session.attempts.find((a) => a.idempotencyKey === idempotencyKey);
      if (existingByIdempotency) {
        return {
          session,
          gradedAnswer: this.adaptAttempt(existingByIdempotency),
        };
      }
    }

    // Double submission prevention: if this activity was already answered in this session, return existing
    const existingAttempt = session.attempts.find((a) => a.activityId === activityId);
    if (existingAttempt) {
      return {
        session,
        gradedAnswer: this.adaptAttempt(existingAttempt),
      };
    }

    const key = idempotencyKey || `${sessionId}_${activityId}_${selectedOptionId}_${Date.now()}`;

    // Perform isolated grading
    const gradedAttempt = GradingService.evaluateActivity(
      {
        activityId,
        selectedOptionId,
        idempotencyKey: key,
        activeDurationSeconds,
      },
      session.attempts.length + 1
    );

    const nextAttempts = [...session.attempts, gradedAttempt];
    const { score, accuracy, totalActiveSeconds } = GradingService.calculateSessionScore(
      nextAttempts,
      session.totalActivities
    );

    const adaptedGradedAnswer = this.adaptAttempt(gradedAttempt);
    const nextAnswers = [...session.answers, adaptedGradedAnswer];

    const updatedSession: SessionRecord = {
      ...session,
      attempts: nextAttempts,
      answers: nextAnswers,
      score,
      accuracy,
      totalActiveDurationSeconds: totalActiveSeconds,
      updatedAt: new Date().toISOString(),
    };

    const nextSessions = [...this.memorySessions];
    nextSessions[sessionIndex] = updatedSession;
    this.persistSessions(nextSessions);

    return { session: updatedSession, gradedAnswer: adaptedGradedAnswer };
  }

  public async advanceSessionQuestion(sessionId: string): Promise<SessionRecord> {
    const sessionIndex = this.memorySessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const session = { ...this.memorySessions[sessionIndex] };
    const nextIndex = session.currentActivityIndex + 1;

    const updatedSession: SessionRecord = {
      ...session,
      currentActivityIndex: nextIndex,
      currentQuestionIndex: nextIndex,
      updatedAt: new Date().toISOString(),
    };

    const nextSessions = [...this.memorySessions];
    nextSessions[sessionIndex] = updatedSession;
    this.persistSessions(nextSessions);

    return updatedSession;
  }

  public async completeSession(sessionId: string): Promise<SessionRecord> {
    const sessionIndex = this.memorySessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    const session = { ...this.memorySessions[sessionIndex] };
    const lesson = SYNTHETIC_LESSONS.find((l) => l.id === session.lessonId);
    const { score, accuracy, totalActiveSeconds } = GradingService.calculateSessionScore(
      session.attempts,
      session.totalActivities
    );

    const earnedBadge = accuracy >= 60 ? lesson?.badgeReward : undefined;

    const completedSession: SessionRecord = {
      ...session,
      isCompleted: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      score,
      accuracy,
      totalActiveDurationSeconds: totalActiveSeconds,
      earnedBadge,
    };

    const nextSessions = [...this.memorySessions];
    nextSessions[sessionIndex] = completedSession;
    this.persistSessions(nextSessions);

    // Update Learner stats: active practice time, stars, streak, badges
    const currentLearner =
      (await this.getLearnerById(session.learnerId || this.memoryLearner.id)) ||
      this.memoryLearner;
    const starsGained = score * 3 + (accuracy === 100 ? 5 : 0);

    const learnerSessions = nextSessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === currentLearner.id
    );
    const allLearnerAttempts = learnerSessions.flatMap((s) => s.attempts);

    const rewardEvaluation = defaultAdaptiveEngine.evaluateMilestoneRewards(
      currentLearner,
      learnerSessions,
      allLearnerAttempts
    );

    const currentBadges = new Set(currentLearner.badges);
    if (earnedBadge) {
      currentBadges.add(earnedBadge);
    }
    for (const b of rewardEvaluation.newlyEarnedBadges) {
      currentBadges.add(b);
    }

    const totalStarsToAdd = starsGained + rewardEvaluation.newlyEarnedStars;

    await this.updateLearner({
      id: currentLearner.id,
      starsEarned: currentLearner.starsEarned + totalStarsToAdd,
      badges: Array.from(currentBadges),
      totalActivePracticeSeconds:
        (currentLearner.totalActivePracticeSeconds || 0) + totalActiveSeconds,
      lastActiveLessonId: session.lessonId,
    });

    // Check if any assignments for this lesson and learner can be marked completed!
    const matchingAssignments = this.memoryAssignments.filter(
      (a) =>
        a.lessonId === session.lessonId &&
        a.assignedLearnerIds.includes(currentLearner.id) &&
        !a.completedLearnerIds.includes(currentLearner.id)
    );

    if (matchingAssignments.length > 0) {
      const nextAssignments = this.memoryAssignments.map((a) => {
        if (
          a.lessonId === session.lessonId &&
          a.assignedLearnerIds.includes(currentLearner.id) &&
          !a.completedLearnerIds.includes(currentLearner.id)
        ) {
          return {
            ...a,
            completedLearnerIds: [...a.completedLearnerIds, currentLearner.id],
          };
        }
        return a;
      });
      this.persistAssignments(nextAssignments);
    }

    return completedSession;
  }

  // --- Mastery & Progress Summaries ---
  public async getMasterySummary(learnerId?: string): Promise<Mastery[]> {
    const targetLearnerId = learnerId || this.memoryLearner.id;
    const allSkills = await this.getSkills();
    const allLessons = SYNTHETIC_LESSONS;

    const learnerSessions = this.memorySessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === targetLearnerId
    );

    const allAttemptsWithSession: ScoredAttemptWithSession[] = learnerSessions.flatMap((s) =>
      s.attempts.map((att) => ({
        ...att,
        sessionId: s.id,
      }))
    );

    return allSkills.map((skill) => {
      const skillActivities = allLessons
        .flatMap((l) => l.activities)
        .filter((a) => a.primarySkillId === skill.id);
      const skillActIds = new Set(skillActivities.map((a) => a.id));
      const skillAttempts = allAttemptsWithSession.filter((a) => skillActIds.has(a.activityId));

      const record = defaultAdaptiveEngine.calculateSkillMastery(skill, skillAttempts);

      return {
        ...record,
        code: skill.code,
        status: record.isConfirmedMastered
          ? 'mastered'
          : record.evidenceStatus === 'unknown'
          ? 'not-started'
          : 'in-progress',
        accuracy: record.components.accuracy ? Math.round(record.components.accuracy * 100) : 0,
        activitiesAttempted: record.totalAttemptCount,
        activitiesCorrect: Math.round(record.components.accuracy * record.windowAttemptCount),
        lastPracticedAt: record.lastAttemptAt || '',
      };
    });
  }

  public async getProgressSummary(learnerId?: string): Promise<ReadingProgressSummary> {
    const targetLearnerId = learnerId || this.memoryLearner.id;
    const sessions = this.memorySessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === targetLearnerId
    );
    const completedSessions = sessions.filter((s) => s.isCompleted);

    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalActiveSeconds = 0;

    sessions.forEach((s) => {
      totalQuestions += s.attempts.length;
      totalCorrect += s.attempts.filter((a) => a.isCorrect).length;
      totalActiveSeconds += s.totalActiveDurationSeconds || 0;
    });

    const averageAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const categoriesProgress: Record<
      SkillCategoryId,
      { completed: boolean; bestScore: number; attempts: number }
    > = {
      'letter-sounds': { completed: false, bestScore: 0, attempts: 0 },
      'phonics-blending': { completed: false, bestScore: 0, attempts: 0 },
      'sight-words': { completed: false, bestScore: 0, attempts: 0 },
      comprehension: { completed: false, bestScore: 0, attempts: 0 },
    };

    sessions.forEach((s) => {
      if (s.categoryId in categoriesProgress) {
        const cat = categoriesProgress[s.categoryId];
        cat.attempts += 1;
        if (s.isCompleted) {
          cat.completed = true;
          cat.bestScore = Math.max(cat.bestScore, s.score);
        }
      }
    });

    const levelsProgress: Record<ReadingLevelId, { completedCount: number; totalCount: number }> = {
      'level-1': { completedCount: 0, totalCount: 4 },
      'level-2': { completedCount: 0, totalCount: 4 },
      'level-3': { completedCount: 0, totalCount: 4 },
    };

    completedSessions.forEach((s) => {
      if (s.readingLevelId && s.readingLevelId in levelsProgress) {
        levelsProgress[s.readingLevelId].completedCount += 1;
      }
    });

    return {
      totalLessonsCompleted: completedSessions.length,
      totalQuestionsAnswered: totalQuestions,
      totalCorrectAnswers: totalCorrect,
      averageAccuracy,
      totalActivePracticeSeconds: totalActiveSeconds,
      categoriesProgress,
      levelsProgress,
    };
  }

  public async getLearnerRecentAttempts(
    learnerId: string,
    limit: number = 20,
    dateFilter: DateFilterOption = 'all'
  ): Promise<{
    attempt: Attempt;
    session: SessionRecord;
    skillName: string;
    categoryName: string;
    lessonTitle: string;
  }[]> {
    const learnerSessions = this.memorySessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === learnerId
    );

    const now = Date.now();
    const filterMs =
      dateFilter === '7d'
        ? 7 * 86400000
        : dateFilter === '30d'
        ? 30 * 86400000
        : Infinity;

    const allSkills = await this.getSkills();
    const skillMap = new Map(allSkills.map((s) => [s.id, s]));

    const flattened: {
      attempt: Attempt;
      session: SessionRecord;
      skillName: string;
      categoryName: string;
      lessonTitle: string;
    }[] = [];

    for (const session of learnerSessions) {
      for (const attempt of session.attempts) {
        const attemptTime = new Date(attempt.timestamp).getTime();
        if (now - attemptTime <= filterMs) {
          // Find skill
          const activity = SYNTHETIC_LESSONS.flatMap((l) => l.activities).find(
            (a) => a.id === attempt.activityId
          );
          const skill = activity ? skillMap.get(activity.primarySkillId) : undefined;

          flattened.push({
            attempt,
            session,
            skillName: skill?.name || 'General Reading Skill',
            categoryName: session.categoryId,
            lessonTitle: session.lessonTitle,
          });
        }
      }
    }

    return flattened
      .sort((a, b) => new Date(b.attempt.timestamp).getTime() - new Date(a.attempt.timestamp).getTime())
      .slice(0, limit);
  }

  public async getLearnerWeeklyPractice(
    learnerId: string,
    days: number = 7
  ): Promise<{
    date: string;
    dayLabel: string;
    activeMinutes: number;
    questionsAnswered: number;
    accuracy: number;
  }[]> {
    const learnerSessions = this.memorySessions.filter(
      (s) => (s.learnerId || 'learner-demo-1') === learnerId
    );

    const result: {
      date: string;
      dayLabel: string;
      activeMinutes: number;
      questionsAnswered: number;
      accuracy: number;
    }[] = [];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 86400000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayLabel = dayNames[targetDate.getDay()];

      let activeSeconds = 0;
      let questionsAnswered = 0;
      let correctAnswers = 0;

      for (const session of learnerSessions) {
        for (const attempt of session.attempts) {
          if (attempt.timestamp.startsWith(dateStr)) {
            questionsAnswered++;
            activeSeconds += attempt.activeDurationSeconds || 0;
            if (attempt.isCorrect) correctAnswers++;
          }
        }
      }

      result.push({
        date: dateStr,
        dayLabel,
        activeMinutes: Math.round((activeSeconds / 60) * 10) / 10,
        questionsAnswered,
        accuracy: questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0,
      });
    }

    return result;
  }

  // --- Parent Experience Methods ---
  public async getParentProfile(parentId?: string): Promise<ParentProfile> {
    const id = parentId || this.memoryRoleState.parentId;
    if (this.memoryParent.id === id) {
      return { ...this.memoryParent };
    }
    const found = DEMO_PARENTS.find((p) => p.id === id);
    return found ? { ...found } : { ...this.memoryParent };
  }

  public async updateParentProfile(
    parentId: string,
    updates: Partial<ParentProfile>
  ): Promise<ParentProfile> {
    const updated = {
      ...this.memoryParent,
      ...updates,
    };
    this.persistParent(updated);
    return { ...updated };
  }

  public async getParentLearners(parentId?: string): Promise<Learner[]> {
    const parent = await this.getParentProfile(parentId);
    // Relationship check: ensure we only return learners in parent's authorized childrenIds
    // Production Note: In production with FastAPI / PostgreSQL, relational constraints and RBAC ensure
    // a parent only accesses authorized learner IDs linked via the parent_children table.
    return this.memoryLearners.filter((l) => parent.childrenIds.includes(l.id));
  }

  // --- Teacher Experience Methods ---
  public async getTeacherProfile(teacherId?: string): Promise<TeacherProfile> {
    const id = teacherId || this.memoryRoleState.teacherId;
    if (this.memoryTeacher.id === id) {
      return { ...this.memoryTeacher };
    }
    const found = DEMO_TEACHERS.find((t) => t.id === id);
    return found ? { ...found } : { ...this.memoryTeacher };
  }

  public async getTeacherClasses(teacherId?: string): Promise<Classroom[]> {
    const teacher = await this.getTeacherProfile(teacherId);
    // Relationship check: return only classes assigned to this teacher
    // Production Note: In production, teacher access to student data is enforced via class_enrollment
    // and school-level authorization policies.
    return this.memoryClassrooms.filter((c) => teacher.classIds.includes(c.id));
  }

  public async getClassLearners(classId: string): Promise<Learner[]> {
    const classroom = this.memoryClassrooms.find((c) => c.id === classId);
    if (!classroom) return [];
    return this.memoryLearners.filter((l) => classroom.studentIds.includes(l.id));
  }

  public async getClassMasteryMatrix(classId: string): Promise<{
    learner: Learner;
    skillsMastery: Record<string, Mastery>;
    overallAccuracy: number;
    totalQuestsCompleted: number;
    totalActiveMinutes: number;
  }[]> {
    const students = await this.getClassLearners(classId);

    const matrix: {
      learner: Learner;
      skillsMastery: Record<string, Mastery>;
      overallAccuracy: number;
      totalQuestsCompleted: number;
      totalActiveMinutes: number;
    }[] = [];

    for (const student of students) {
      const [masteries, progress] = await Promise.all([
        this.getMasterySummary(student.id),
        this.getProgressSummary(student.id),
      ]);

      const skillsMap: Record<string, Mastery> = {};
      for (const m of masteries) {
        skillsMap[m.skillId] = m;
      }

      matrix.push({
        learner: student,
        skillsMastery: skillsMap,
        overallAccuracy: progress.averageAccuracy,
        totalQuestsCompleted: progress.totalLessonsCompleted,
        totalActiveMinutes: Math.round(progress.totalActivePracticeSeconds / 60),
      });
    }

    return matrix;
  }

  // --- Assignments ---
  public async getAssignments(classId?: string, learnerId?: string): Promise<Assignment[]> {
    let list = [...this.memoryAssignments];

    if (classId) {
      list = list.filter((a) => a.classId === classId);
    }

    if (learnerId) {
      list = list.filter((a) => a.assignedLearnerIds.includes(learnerId));
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async createAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'completedLearnerIds'>
  ): Promise<Assignment> {
    const newAssignment: Assignment = {
      ...assignment,
      id: `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      completedLearnerIds: [],
      status: 'pending',
    };

    const nextAssignments = [newAssignment, ...this.memoryAssignments];
    this.persistAssignments(nextAssignments);
    return newAssignment;
  }

  public async markAssignmentCompleted(
    assignmentId: string,
    learnerId: string
  ): Promise<Assignment> {
    const index = this.memoryAssignments.findIndex((a) => a.id === assignmentId);
    if (index === -1) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    const current = this.memoryAssignments[index];
    const completedSet = new Set(current.completedLearnerIds);
    completedSet.add(learnerId);

    const updated: Assignment = {
      ...current,
      completedLearnerIds: Array.from(completedSet),
      status: completedSet.size >= current.assignedLearnerIds.length ? 'completed' : 'in-progress',
    };

    const nextAssignments = [...this.memoryAssignments];
    nextAssignments[index] = updated;
    this.persistAssignments(nextAssignments);
    return updated;
  }

  // --- Role State ---
  public getActiveRole(): RoleContextState {
    return { ...this.memoryRoleState };
  }

  public setActiveRole(role: DemoRole, updates?: Partial<RoleContextState>): void {
    const nextState: RoleContextState = {
      ...this.memoryRoleState,
      role,
      ...updates,
    };
    this.persistRoleState(nextState);

    // If switching learner, also update active learner
    if (updates?.learnerId && updates.learnerId !== this.memoryLearner.id) {
      const found = this.memoryLearners.find((l) => l.id === updates.learnerId);
      if (found) {
        this.persistLearner(found);
      }
    }
  }

  // --- CSV Exports ---
  public async exportParentProgressCSV(
    learnerId: string,
    dateFilter: DateFilterOption = 'all'
  ): Promise<string> {
    const learner = await this.getLearnerById(learnerId);
    const attempts = await this.getLearnerRecentAttempts(learnerId, 100, dateFilter);
    const masteryList = await this.getMasterySummary(learnerId);

    const lines: string[] = [];
    lines.push(`ReadQuest Child Progress Report - Authorized Export`);
    lines.push(`Learner Name,${learner?.name || learnerId}`);
    lines.push(`Reading Level,${learner?.readingLevelId || 'level-1'}`);
    lines.push(`Exported At,${new Date().toISOString()}`);
    lines.push(`Filter Window,${dateFilter}`);
    lines.push('');

    // Summary section
    lines.push('--- SKILL MASTERY SUMMARY ---');
    lines.push('Skill Code,Skill Name,Category,Mastery Score (0-100),Band,Evidence Status,Confirmed Mastered,Review Due');
    for (const m of masteryList) {
      lines.push(
        `"${m.code}","${m.skillName}","${m.categoryId}",${m.score !== null ? m.score.toFixed(1) : 'N/A'},"${m.band}","${m.evidenceStatus}",${m.isConfirmedMastered},${m.isReviewDue}`
      );
    }
    lines.push('');

    // Recent attempts log
    lines.push('--- RECENT LEARNING ATTEMPTS ---');
    lines.push('Timestamp,Lesson Title,Skill,Prompt Summary,Result,Active Time (seconds)');
    for (const item of attempts) {
      const sanitizedPrompt = item.attempt.explanation.replace(/"/g, '""');
      lines.push(
        `"${item.attempt.timestamp}","${item.lessonTitle}","${item.skillName}","${sanitizedPrompt}","${item.attempt.isCorrect ? 'Correct' : 'Needs Practice'}",${item.attempt.activeDurationSeconds}`
      );
    }

    return lines.join('\n');
  }

  public async exportTeacherClassCSV(classId: string): Promise<string> {
    const classroom = this.memoryClassrooms.find((c) => c.id === classId);
    const matrix = await this.getClassMasteryMatrix(classId);
    const skills = await this.getSkills();

    const lines: string[] = [];
    lines.push(`ReadQuest Classroom Mastery & Roster Export`);
    lines.push(`Class Name,${classroom?.name || classId}`);
    lines.push(`Grade,${classroom?.grade || '1st Grade'}`);
    lines.push(`Exported At,${new Date().toISOString()}`);
    lines.push(`Notice,"Authorized educator data export under institutional FERPA compliance policy."`);
    lines.push('');

    // Table Header
    const skillHeaders = skills.map((s) => `"${s.name} (${s.code})"`).join(',');
    lines.push(`Student ID,Student Name,Grade,Reading Level,Quests Completed,Total Active Mins,Average Accuracy %,${skillHeaders}`);

    // Table Rows
    for (const row of matrix) {
      const skillValues = skills
        .map((s) => {
          const m = row.skillsMastery[s.id];
          if (!m || m.evidenceStatus === 'unknown') return '"Unstarted"';
          return `"${m.band.toUpperCase()} (${m.score !== null ? Math.round(m.score) + '%' : 'Prov.'})"`;
        })
        .join(',');

      lines.push(
        `"${row.learner.id}","${row.learner.name}","${row.learner.gradeLevel}","${row.learner.readingLevelId}",${row.totalQuestsCompleted},${row.totalActiveMinutes},${row.overallAccuracy}%,${skillValues}`
      );
    }

    return lines.join('\n');
  }

  // --- Reset Demo Data ---
  public async resetDemoData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      localStorage.removeItem(STORAGE_KEYS.LEARNERS);
      localStorage.removeItem(STORAGE_KEYS.PARENT);
      localStorage.removeItem(STORAGE_KEYS.TEACHER);
      localStorage.removeItem(STORAGE_KEYS.CLASSROOMS);
      localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
    } catch {
      // ignore
    }

    this.memoryLearners = [...DEMO_STUDENTS];
    this.memoryLearner = { ...DEMO_STUDENTS[0] };
    this.memorySessions = [...SEED_SESSIONS];
    this.memoryParent = { ...DEMO_PARENTS[0] };
    this.memoryTeacher = { ...DEMO_TEACHERS[0] };
    this.memoryClassrooms = [...DEMO_CLASSROOMS];
    this.memoryAssignments = [...INITIAL_ASSIGNMENTS];
    this.memoryRoleState = {
      role: 'child',
      learnerId: 'learner-demo-1',
      parentId: 'parent-eleanor-vance',
      teacherId: 'teacher-clara-martinez',
      classId: 'class-room-104',
    };

    this.persistLearners(this.memoryLearners);
    this.persistLearner(this.memoryLearner);
    this.persistSessions(this.memorySessions);
    this.persistParent(this.memoryParent);
    this.persistTeacher(this.memoryTeacher);
    this.persistClassrooms(this.memoryClassrooms);
    this.persistAssignments(this.memoryAssignments);
    this.persistRoleState(this.memoryRoleState);
  }
}

// Export singleton instance conforming to IReadingQuestRepository
export const questRepository: IReadingQuestRepository = new LocalStorageReadingQuestRepository();

/**
 * Universal browser helper to download generated CSV files
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
