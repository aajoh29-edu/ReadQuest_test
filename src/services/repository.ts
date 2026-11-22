import {
  AdaptiveRecommendation,
  Assignment,
  Attempt,
  BookDetail,
  BookListResponse,
  BookProgress,
  ReadAloudActivity,
  ReadAloudRecommendation,
  VoiceAttemptResult,
  VoiceProgress,
  Classroom,
  DateFilterOption,
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
  SessionRecord,
  Skill,
  SkillCategory,
  SkillCategoryId,
  TeacherProfile,
} from '../types';
import { API_ENDPOINTS, ApiClientError, apiFetch } from './apiConfig';
import { GradingService } from './gradingService';
import {
  READING_LEVELS,
  SYNTHETIC_CATEGORIES,
  SYNTHETIC_LESSONS,
  SYNTHETIC_SKILLS,
} from './data/syntheticCurriculum';
import { sanitizeCsvCell } from '../utils/security';

export interface LessonFilterOptions {
  categoryId?: SkillCategoryId | 'all';
  readingLevelId?: ReadingLevelId | 'all';
  searchQuery?: string;
}

export interface IReadingQuestRepository {
  // Active in-memory child synchronization (managed by AuthContext)
  setActiveChildCache(learner: Learner | null): void;
  getActiveChildId(): string | null;

  // Learner profile methods
  getLearner(): Promise<Learner | null>;
  getLearnerProfile(): Promise<LearnerProfile | null>;
  updateLearner(updates: Partial<Learner>): Promise<Learner>;
  updateLearnerProfile(updates: Partial<LearnerProfile>): Promise<LearnerProfile>;
  getAllLearners(): Promise<Learner[]>;
  getLearnerById(id: string): Promise<Learner | null>;
  selectActiveLearner(learnerId: string): Promise<Learner>;

  // Curriculum catalog methods (public read-only, answer keys stripped)
  getReadingLevels(): Promise<ReadingLevel[]>;
  getSkills(): Promise<Skill[]>;
  getCategories(): Promise<SkillCategory[]>;
  getAllLessons(filters?: LessonFilterOptions): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | null>;
  getRecommendedLesson(learnerId?: string): Promise<Lesson | null>;
  getRecommendations(learnerId?: string): Promise<Recommendation[]>;
  getAdaptiveRecommendation(learnerId?: string): Promise<AdaptiveRecommendation | null>;
  getBooks(options?: {
    level?: number;
    category?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<BookListResponse>;
  getBook(bookId: string): Promise<BookDetail | null>;
  updateBookProgress(
    bookId: string,
    update: {
      status: 'started' | 'finished' | 'favorite';
      last_page: number;
      minutes_read: number;
    }
  ): Promise<BookProgress>;
  setVoiceConsent(granted: boolean): Promise<void>;
  getReadAloudActivity(activityId: string): Promise<ReadAloudActivity>;
  submitReadAloud(
    activityId: string,
    transcript: string,
    wordConfidences: number[],
    durationSeconds: number
  ): Promise<VoiceAttemptResult>;
  getVoiceProgress(): Promise<VoiceProgress>;
  getReadAloudRecommendation(): Promise<ReadAloudRecommendation>;

  // Session & activity methods (authenticated only)
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
  ): Promise<
    {
      attempt: Attempt;
      session: SessionRecord;
      skillName: string;
      categoryName: string;
      lessonTitle: string;
    }[]
  >;
  getLearnerWeeklyPractice(
    learnerId: string,
    days?: number
  ): Promise<
    {
      date: string;
      dayLabel: string;
      activeMinutes: number;
      questionsAnswered: number;
      accuracy: number;
    }[]
  >;

  // Parent methods
  getParentProfile(parentId?: string): Promise<ParentProfile>;
  updateParentProfile(parentId: string, updates: Partial<ParentProfile>): Promise<ParentProfile>;
  getParentLearners(parentId?: string): Promise<Learner[]>;

  // Teacher methods
  getTeacherProfile(teacherId?: string): Promise<TeacherProfile>;
  getTeacherClasses(teacherId?: string): Promise<Classroom[]>;
  getClassLearners(classId: string): Promise<Learner[]>;
  getClassMasteryMatrix(classId: string): Promise<
    {
      learner: Learner;
      skillsMastery: Record<string, Mastery>;
      overallAccuracy: number;
      totalQuestsCompleted: number;
      totalActiveMinutes: number;
    }[]
  >;

  // Assignments
  getAssignments(classId?: string, learnerId?: string): Promise<Assignment[]>;
  createAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'completedLearnerIds'>
  ): Promise<Assignment>;
  markAssignmentCompleted(assignmentId: string, learnerId: string): Promise<Assignment>;

  // Exports
  exportParentProgressCSV(learnerId: string, dateFilter?: DateFilterOption): Promise<string>;
  exportTeacherClassCSV(classId: string): Promise<string>;
}

function isServiceFallbackError(err: unknown): boolean {
  return (
    err instanceof ApiClientError &&
    (err.code === 'SERVICE_UNAVAILABLE' || err.code === 'NETWORK_ERROR')
  );
}

/**
 * Production API-backed repository.
 * - Never persists user profiles, sessions, or credentials in localStorage/sessionStorage.
 * - Public catalog routes fall back gracefully to the sanitized curriculum bundle only when no backend API is mounted.
 * - All private learner, parent, session, and educator methods fail closed against the authenticated backend API.
 */
export class ApiReadingQuestRepository implements IReadingQuestRepository {
  private activeChildCache: Learner | null = null;

  public setActiveChildCache(learner: Learner | null): void {
    this.activeChildCache = learner ? { ...learner } : null;
  }

  public getActiveChildId(): string | null {
    return this.activeChildCache?.id ?? null;
  }

  private requireChildId(explicitLearnerId?: string): string {
    const id = explicitLearnerId || this.activeChildCache?.id;
    if (!id) {
      throw new ApiClientError(
        'Please select or create a child reader profile before starting a reading activity.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return id;
  }

  // --- Learner Profile Methods ---
  public async getLearner(): Promise<Learner | null> {
    if (this.activeChildCache) {
      return { ...this.activeChildCache };
    }
    const list = await this.getAllLearners();
    if (list.length > 0) {
      this.activeChildCache = { ...list[0] };
      return { ...list[0] };
    }
    return null;
  }

  public async getLearnerProfile(): Promise<LearnerProfile | null> {
    return this.getLearner();
  }

  public async updateLearner(updates: Partial<Learner>): Promise<Learner> {
    const learnerId = this.requireChildId(updates.id);
    const updated = await apiFetch<Learner>(API_ENDPOINTS.CHILD_PROFILE_BY_ID(learnerId), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (this.activeChildCache?.id === updated.id) {
      this.activeChildCache = { ...updated };
    }
    return updated;
  }

  public async updateLearnerProfile(updates: Partial<LearnerProfile>): Promise<LearnerProfile> {
    return this.updateLearner(updates);
  }

  public async getAllLearners(): Promise<Learner[]> {
    return apiFetch<Learner[]>(API_ENDPOINTS.CHILD_PROFILES, { method: 'GET' });
  }

  public async getLearnerById(id: string): Promise<Learner | null> {
    return apiFetch<Learner | null>(API_ENDPOINTS.CHILD_PROFILE_BY_ID(id), { method: 'GET' });
  }

  public async selectActiveLearner(learnerId: string): Promise<Learner> {
    const chosen = await apiFetch<Learner>(API_ENDPOINTS.ACTIVE_CHILD, {
      method: 'POST',
      body: JSON.stringify({ learnerId }),
    });
    this.activeChildCache = { ...chosen };
    return chosen;
  }

  // --- Public Curriculum Catalog Methods ---
  public async getBooks(options: {
    level?: number;
    category?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BookListResponse> {
    const params = new URLSearchParams();
    if (options.level) params.set('level', String(options.level));
    if (options.category) params.set('category', options.category);
    if (options.searchQuery?.trim()) params.set('q', options.searchQuery.trim());
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    const query = params.toString();
    return apiFetch<BookListResponse>(
      query ? `${API_ENDPOINTS.BOOKS}?${query}` : API_ENDPOINTS.BOOKS,
      { method: 'GET' }
    );
  }

  public async getBook(bookId: string): Promise<BookDetail | null> {
    try {
      return await apiFetch<BookDetail>(API_ENDPOINTS.BOOK_BY_ID(bookId), { method: 'GET' });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  public async updateBookProgress(
    bookId: string,
    update: {
      status: 'started' | 'finished' | 'favorite';
      last_page: number;
      minutes_read: number;
    }
  ): Promise<BookProgress> {
    const childId = this.requireChildId();
    return apiFetch<BookProgress>(API_ENDPOINTS.BOOK_PROGRESS(childId, bookId), {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  public async setVoiceConsent(granted: boolean): Promise<void> {
    const childId = this.requireChildId();
    await apiFetch(API_ENDPOINTS.VOICE_CONSENT(childId), {
      method: 'POST',
      body: JSON.stringify({
        provider: 'web_speech',
        scope: 'read_aloud_assessment',
        granted,
      }),
    });
  }

  public async getReadAloudActivity(activityId: string): Promise<ReadAloudActivity> {
    return apiFetch<ReadAloudActivity>(API_ENDPOINTS.READ_ALOUD_ACTIVITY(activityId), {
      method: 'GET',
    });
  }

  public async submitReadAloud(
    activityId: string,
    transcript: string,
    wordConfidences: number[],
    durationSeconds: number
  ): Promise<VoiceAttemptResult> {
    const childId = this.requireChildId();
    return apiFetch<VoiceAttemptResult>(API_ENDPOINTS.READ_ALOUD(childId), {
      method: 'POST',
      body: JSON.stringify({
        activity_id: activityId,
        transcript,
        word_confidences: wordConfidences,
        duration_seconds: durationSeconds,
        provider: 'web_speech',
      }),
    });
  }

  public async getVoiceProgress(): Promise<VoiceProgress> {
    const childId = this.requireChildId();
    return apiFetch<VoiceProgress>(API_ENDPOINTS.VOICE_PROGRESS(childId), { method: 'GET' });
  }

  public async getReadAloudRecommendation(): Promise<ReadAloudRecommendation> {
    const childId = this.requireChildId();
    return apiFetch<ReadAloudRecommendation>(
      API_ENDPOINTS.READ_ALOUD_RECOMMENDATION(childId),
      { method: 'GET' }
    );
  }

  public async getReadingLevels(): Promise<ReadingLevel[]> {
    try {
      return await apiFetch<ReadingLevel[]>(API_ENDPOINTS.CURRICULUM_LEVELS, { method: 'GET' });
    } catch (err) {
      if (isServiceFallbackError(err)) {
        return [...READING_LEVELS];
      }
      throw err;
    }
  }

  public async getSkills(): Promise<Skill[]> {
    try {
      return await apiFetch<Skill[]>(API_ENDPOINTS.CURRICULUM_SKILLS, { method: 'GET' });
    } catch (err) {
      if (isServiceFallbackError(err)) {
        return [...SYNTHETIC_SKILLS];
      }
      throw err;
    }
  }

  public async getCategories(): Promise<SkillCategory[]> {
    try {
      return await apiFetch<SkillCategory[]>(API_ENDPOINTS.CURRICULUM_CATEGORIES, { method: 'GET' });
    } catch (err) {
      if (isServiceFallbackError(err)) {
        const all = await this.getAllLessons();
        return SYNTHETIC_CATEGORIES.map((cat) => ({
          ...cat,
          lessons: all.filter((l) => l.categoryId === cat.id),
        }));
      }
      throw err;
    }
  }

  public async getAllLessons(filters?: LessonFilterOptions): Promise<Lesson[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.categoryId && filters.categoryId !== 'all') {
        params.set('categoryId', filters.categoryId);
      }
      if (filters?.readingLevelId && filters.readingLevelId !== 'all') {
        params.set('readingLevelId', filters.readingLevelId);
      }
      if (filters?.searchQuery?.trim()) {
        params.set('q', filters.searchQuery.trim());
      }
      const queryStr = params.toString();
      const path = queryStr
        ? `${API_ENDPOINTS.CURRICULUM_LESSONS}?${queryStr}`
        : API_ENDPOINTS.CURRICULUM_LESSONS;
      return await apiFetch<Lesson[]>(path, { method: 'GET' });
    } catch (err) {
      if (!isServiceFallbackError(err)) {
        throw err;
      }

      let list = SYNTHETIC_LESSONS.map((l) => GradingService.sanitizeLesson(l));
      if (!filters) return list;

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
  }

  public async getLesson(id: string): Promise<Lesson | null> {
    try {
      return await apiFetch<Lesson | null>(API_ENDPOINTS.CURRICULUM_LESSON(id), { method: 'GET' });
    } catch (err) {
      if (!isServiceFallbackError(err)) {
        throw err;
      }
      const found = SYNTHETIC_LESSONS.find((l) => l.id === id);
      return found ? GradingService.sanitizeLesson(found) : null;
    }
  }

  public async getAdaptiveRecommendation(
    learnerId?: string
  ): Promise<AdaptiveRecommendation | null> {
    const id = learnerId || this.activeChildCache?.id;
    if (!id) return null;
    return apiFetch<AdaptiveRecommendation | null>(API_ENDPOINTS.ADAPTIVE_RECOMMENDATION(id), {
      method: 'GET',
    });
  }

  public async getRecommendedLesson(learnerId?: string): Promise<Lesson | null> {
    const rec = await this.getAdaptiveRecommendation(learnerId);
    if (rec?.lessonId) {
      const target = await this.getLesson(rec.lessonId);
      if (target) return target;
    }
    const all = await this.getAllLessons();
    return all[0] ?? null;
  }

  public async getRecommendations(learnerId?: string): Promise<Recommendation[]> {
    const id = this.requireChildId(learnerId);
    return apiFetch<Recommendation[]>(API_ENDPOINTS.RECOMMENDATIONS(id), { method: 'GET' });
  }

  // --- Session & Activity Methods ---
  public async getActiveSession(lessonId?: string): Promise<SessionRecord | null> {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    return apiFetch<SessionRecord | null>(`${API_ENDPOINTS.SESSION_ACTIVE}${query}`, {
      method: 'GET',
    });
  }

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    return apiFetch<SessionRecord | null>(API_ENDPOINTS.SESSION_BY_ID(sessionId), {
      method: 'GET',
    });
  }

  public async getAllSessions(): Promise<SessionRecord[]> {
    return apiFetch<SessionRecord[]>(API_ENDPOINTS.SESSIONS, { method: 'GET' });
  }

  public async getLearnerSessions(learnerId: string): Promise<SessionRecord[]> {
    return apiFetch<SessionRecord[]>(
      `${API_ENDPOINTS.SESSIONS}?learnerId=${encodeURIComponent(learnerId)}`,
      { method: 'GET' }
    );
  }

  public async startOrCreateSession(lessonId: string): Promise<SessionRecord> {
    const learnerId = this.requireChildId();
    return apiFetch<SessionRecord>(API_ENDPOINTS.SESSIONS, {
      method: 'POST',
      body: JSON.stringify({ lessonId, learnerId }),
    });
  }

  public async submitAnswer(
    sessionId: string,
    activityId: string,
    selectedOptionId: string,
    idempotencyKey?: string,
    activeDurationSeconds: number = 15
  ): Promise<{ session: SessionRecord; gradedAnswer: GradedAnswer }> {
    return apiFetch<{ session: SessionRecord; gradedAnswer: GradedAnswer }>(
      API_ENDPOINTS.SESSION_SUBMIT(sessionId),
      {
        method: 'POST',
        body: JSON.stringify({
          activityId,
          selectedOptionId,
          idempotencyKey,
          activeDurationSeconds,
        }),
      }
    );
  }

  public async advanceSessionQuestion(sessionId: string): Promise<SessionRecord> {
    return apiFetch<SessionRecord>(API_ENDPOINTS.SESSION_ADVANCE(sessionId), {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async completeSession(sessionId: string): Promise<SessionRecord> {
    return apiFetch<SessionRecord>(API_ENDPOINTS.SESSION_COMPLETE(sessionId), {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // --- Mastery & Progress Summaries ---
  public async getMasterySummary(learnerId?: string): Promise<Mastery[]> {
    const id = this.requireChildId(learnerId);
    return apiFetch<Mastery[]>(API_ENDPOINTS.MASTERY(id), { method: 'GET' });
  }

  public async getProgressSummary(learnerId?: string): Promise<ReadingProgressSummary> {
    const id = this.requireChildId(learnerId);
    return apiFetch<ReadingProgressSummary>(API_ENDPOINTS.PROGRESS(id), { method: 'GET' });
  }

  public async getLearnerRecentAttempts(
    learnerId: string,
    limit: number = 20,
    dateFilter: DateFilterOption = 'all'
  ): Promise<
    {
      attempt: Attempt;
      session: SessionRecord;
      skillName: string;
      categoryName: string;
      lessonTitle: string;
    }[]
  > {
    const query = new URLSearchParams({
      limit: String(limit),
      dateFilter,
    }).toString();
    return apiFetch(
      `${API_ENDPOINTS.RECENT_ATTEMPTS(learnerId)}?${query}`,
      { method: 'GET' }
    );
  }

  public async getLearnerWeeklyPractice(
    learnerId: string,
    days: number = 7
  ): Promise<
    {
      date: string;
      dayLabel: string;
      activeMinutes: number;
      questionsAnswered: number;
      accuracy: number;
    }[]
  > {
    return apiFetch(
      `${API_ENDPOINTS.WEEKLY_PRACTICE(learnerId)}?days=${encodeURIComponent(String(days))}`,
      { method: 'GET' }
    );
  }

  // --- Parent Methods ---
  public async getParentProfile(_parentId?: string): Promise<ParentProfile> {
    return apiFetch<ParentProfile>(API_ENDPOINTS.PARENT_PROFILE, { method: 'GET' });
  }

  public async updateParentProfile(
    _parentId: string,
    updates: Partial<ParentProfile>
  ): Promise<ParentProfile> {
    return apiFetch<ParentProfile>(API_ENDPOINTS.PARENT_PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getParentLearners(_parentId?: string): Promise<Learner[]> {
    return apiFetch<Learner[]>(API_ENDPOINTS.PARENT_LEARNERS, { method: 'GET' });
  }

  // --- Teacher Methods ---
  public async getTeacherProfile(_teacherId?: string): Promise<TeacherProfile> {
    return apiFetch<TeacherProfile>(API_ENDPOINTS.TEACHER_PROFILE, { method: 'GET' });
  }

  public async getTeacherClasses(_teacherId?: string): Promise<Classroom[]> {
    return apiFetch<Classroom[]>(API_ENDPOINTS.TEACHER_CLASSES, { method: 'GET' });
  }

  public async getClassLearners(classId: string): Promise<Learner[]> {
    return apiFetch<Learner[]>(API_ENDPOINTS.CLASS_LEARNERS(classId), { method: 'GET' });
  }

  public async getClassMasteryMatrix(classId: string): Promise<
    {
      learner: Learner;
      skillsMastery: Record<string, Mastery>;
      overallAccuracy: number;
      totalQuestsCompleted: number;
      totalActiveMinutes: number;
    }[]
  > {
    return apiFetch(API_ENDPOINTS.CLASS_MATRIX(classId), { method: 'GET' });
  }

  // --- Assignments ---
  public async getAssignments(classId?: string, learnerId?: string): Promise<Assignment[]> {
    const params = new URLSearchParams();
    if (classId) params.set('classId', classId);
    if (learnerId) params.set('learnerId', learnerId);
    const qs = params.toString();
    return apiFetch<Assignment[]>(
      qs ? `${API_ENDPOINTS.ASSIGNMENTS}?${qs}` : API_ENDPOINTS.ASSIGNMENTS,
      { method: 'GET' }
    );
  }

  public async createAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'completedLearnerIds'>
  ): Promise<Assignment> {
    return apiFetch<Assignment>(API_ENDPOINTS.ASSIGNMENTS, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  public async markAssignmentCompleted(
    assignmentId: string,
    learnerId: string
  ): Promise<Assignment> {
    return apiFetch<Assignment>(API_ENDPOINTS.ASSIGNMENT_COMPLETE(assignmentId), {
      method: 'POST',
      body: JSON.stringify({ learnerId }),
    });
  }

  // --- Authorized CSV Exports (formatted via formula-injection sanitizer) ---
  public async exportParentProgressCSV(
    learnerId: string,
    dateFilter: DateFilterOption = 'all'
  ): Promise<string> {
    const [learner, attempts, masteryList] = await Promise.all([
      this.getLearnerById(learnerId),
      this.getLearnerRecentAttempts(learnerId, 100, dateFilter),
      this.getMasterySummary(learnerId),
    ]);
    return buildParentProgressCSV({
      learnerName: learner?.name || learnerId,
      readingLevelId: learner?.readingLevelId || 'level-1',
      dateFilter,
      masteryList,
      attempts,
    });
  }

  public async exportTeacherClassCSV(classId: string): Promise<string> {
    const [classes, matrix, skills] = await Promise.all([
      this.getTeacherClasses(),
      this.getClassMasteryMatrix(classId),
      this.getSkills(),
    ]);
    const classroom = classes.find((c) => c.id === classId);
    return buildTeacherClassCSV({
      className: classroom?.name || classId,
      grade: classroom?.grade || 'Unspecified',
      matrix,
      skills,
    });
  }
}

export function buildParentProgressCSV(params: {
  learnerName: string;
  readingLevelId: string;
  dateFilter: DateFilterOption;
  masteryList: Mastery[];
  attempts: {
    attempt: Attempt;
    skillName: string;
    lessonTitle: string;
  }[];
}): string {
  const lines: string[] = [];
  lines.push(sanitizeCsvCell('ReadQuest Child Progress Report - Authorized Export'));
  lines.push(`${sanitizeCsvCell('Learner Name')},${sanitizeCsvCell(params.learnerName)}`);
  lines.push(`${sanitizeCsvCell('Reading Level')},${sanitizeCsvCell(params.readingLevelId)}`);
  lines.push(`${sanitizeCsvCell('Exported At')},${sanitizeCsvCell(new Date().toISOString())}`);
  lines.push(`${sanitizeCsvCell('Filter Window')},${sanitizeCsvCell(params.dateFilter)}`);
  lines.push('');
  lines.push(sanitizeCsvCell('SKILL MASTERY SUMMARY'));
  lines.push(
    [
      'Skill Code',
      'Skill Name',
      'Category',
      'Mastery Score (0-100)',
      'Band',
      'Evidence Status',
      'Confirmed Mastered',
      'Review Due',
    ]
      .map(sanitizeCsvCell)
      .join(',')
  );

  for (const m of params.masteryList) {
    lines.push(
      [
        m.code || '',
        m.skillName,
        m.categoryId,
        m.score !== null ? m.score.toFixed(1) : 'N/A',
        m.band,
        m.evidenceStatus,
        m.isConfirmedMastered,
        m.isReviewDue,
      ]
        .map(sanitizeCsvCell)
        .join(',')
    );
  }

  lines.push('');
  lines.push(sanitizeCsvCell('RECENT LEARNING ATTEMPTS'));
  lines.push(
    ['Timestamp', 'Lesson Title', 'Skill', 'Feedback', 'Result', 'Active Time (seconds)']
      .map(sanitizeCsvCell)
      .join(',')
  );

  for (const item of params.attempts) {
    lines.push(
      [
        item.attempt.timestamp,
        item.lessonTitle,
        item.skillName,
        item.attempt.explanation,
        item.attempt.isCorrect ? 'Correct' : 'Needs Practice',
        item.attempt.activeDurationSeconds,
      ]
        .map(sanitizeCsvCell)
        .join(',')
    );
  }

  return lines.join('\n');
}

export function buildTeacherClassCSV(params: {
  className: string;
  grade: string;
  matrix: {
    learner: Learner;
    skillsMastery: Record<string, Mastery>;
    overallAccuracy: number;
    totalQuestsCompleted: number;
    totalActiveMinutes: number;
  }[];
  skills: Skill[];
}): string {
  const lines: string[] = [];
  lines.push(sanitizeCsvCell('ReadQuest Classroom Mastery & Roster Export'));
  lines.push(`${sanitizeCsvCell('Class Name')},${sanitizeCsvCell(params.className)}`);
  lines.push(`${sanitizeCsvCell('Grade')},${sanitizeCsvCell(params.grade)}`);
  lines.push(`${sanitizeCsvCell('Exported At')},${sanitizeCsvCell(new Date().toISOString())}`);
  lines.push('');

  const headers = [
    'Student ID',
    'Student Name',
    'Grade',
    'Reading Level',
    'Quests Completed',
    'Total Active Mins',
    'Average Accuracy %',
    ...params.skills.map((s) => `${s.name} (${s.code})`),
  ];
  lines.push(headers.map(sanitizeCsvCell).join(','));

  for (const row of params.matrix) {
    const skillCells = params.skills.map((s) => {
      const m = row.skillsMastery[s.id];
      if (!m || m.evidenceStatus === 'unknown') return 'Unstarted';
      return `${m.band.toUpperCase()} (${m.score !== null ? `${Math.round(m.score)}%` : 'Prov.'})`;
    });
    const rowCells = [
      row.learner.id,
      row.learner.name,
      row.learner.gradeLevel,
      row.learner.readingLevelId,
      row.totalQuestsCompleted,
      row.totalActiveMinutes,
      `${row.overallAccuracy}%`,
      ...skillCells,
    ];
    lines.push(rowCells.map(sanitizeCsvCell).join(','));
  }

  return lines.join('\n');
}

export const questRepository: IReadingQuestRepository = new ApiReadingQuestRepository();

/**
 * Universal browser helper to download generated CSV files safely.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', safeName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
