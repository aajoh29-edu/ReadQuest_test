export type SkillCategoryId = 'letter-sounds' | 'phonics-blending' | 'sight-words' | 'comprehension';

export type ReadingLevelId = 'level-1' | 'level-2' | 'level-3';

export type BookSource = 'original' | 'public_domain' | 'licensed_edition';

export interface BookPage {
  page_number: number;
  sentences: string[];
}

export interface BookAttribution {
  source_title: string;
  creator_credits: string[];
  copyright_notice: string;
  edition_url: string | null;
  license_url: string | null;
  reformatting_note: string;
  sourcing_notes: string[];
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  level: number;
  category: string;
  word_count: number;
  cover_url: string | null;
  source: BookSource;
}

export interface BookDetail extends BookSummary {
  content: {
    pages: BookPage[];
  };
  attribution: BookAttribution;
}

export interface BookListResponse {
  items: BookSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookProgress {
  child_id: string;
  book_id: string;
  status: 'started' | 'finished' | 'favorite';
  last_page: number;
  minutes_read: number;
  started_at: string;
  finished_at: string | null;
  stars_awarded: number;
}

export interface ReadingLevel {
  id: ReadingLevelId;
  name: string;
  stageName: string;
  description: string;
  colorHex: string;
}

export type ActivityType =
  | 'multiple-choice-sound'
  | 'phonics-blending'
  | 'sight-word-cloze'
  | 'reading-comprehension';

export interface ActivityOption {
  id: string;
  label: string;
  visualCue?: string; // emoji or phoneme cue e.g. [b]
  phonicsPart?: string;
  isCorrect?: boolean; // internal to repository/grading layer, sanitized before client presentation
}

export interface PhonicsTile {
  letter: string;
  sound: string;
  audioLabel: string;
}

/**
 * 1. Skill Model
 */
export interface Skill {
  id: string;
  categoryId: SkillCategoryId;
  name: string;
  code: string; // e.g. 'LS.INIT.01'
  description: string;
  targetReadingLevel: ReadingLevelId;
}

/**
 * 2. Activity Model (The individual scored learning unit)
 */
export interface Activity {
  id: string; // Stable ID
  lessonId: string;
  primarySkillId: string;
  type: ActivityType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  prompt: string;
  subPrompt?: string; // Explicit written sound cues or adult-guided instructions
  hint?: string;
  passageTitle?: string;
  passageText?: string;
  phonicsTiles?: PhonicsTile[];
  blendedTarget?: string;
  contextSentenceWithBlank?: string;
  targetSightWord?: string;
  options: ActivityOption[];
  explanation: string;
  encouragementSuccess: string;
  encouragementRetry: string;
  publicationStatus: 'published' | 'draft' | 'archived';
  estimatedDurationSeconds: number;
}

/**
 * Backward compatibility alias for Activity
 */
export type Question = Activity;
export type QuestionOption = ActivityOption;

/**
 * 3. Lesson Model
 */
export interface Lesson {
  id: string;
  categoryId: SkillCategoryId;
  categoryName: string;
  readingLevelId: ReadingLevelId;
  readingLevelName: string;
  title: string;
  subtitle: string;
  description: string;
  prerequisiteLessonId?: string;
  prerequisiteExplanation?: string;
  estimatedMinutes: number;
  totalActivities: number;
  totalQuestions?: number;
  activities: Activity[];
  // alias for backward compatibility
  questions?: Activity[];
  badgeReward: string;
  iconName: string;
  themeColor: {
    badgeBg: string;
    badgeText: string;
    border: string;
    accent: string;
  };
  publicationStatus: 'published' | 'draft';
}

export interface SkillCategory {
  id: SkillCategoryId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  colorHex: string;
  lessons: Lesson[];
}

/**
 * 4. Learner Model
 */
export interface Learner {
  id: string;
  name: string;
  avatar: string;
  avatarName: string;
  readingLevelId: ReadingLevelId;
  gradeLevel: string;
  starsEarned: number;
  currentStreakDays: number;
  badges: string[];
  totalActivePracticeSeconds: number;
  lastActiveLessonId?: string;
}

export type LearnerProfile = Learner;

/**
 * 5. Attempt Model (Includes idempotencyKey and active duration tracking)
 */
export interface Attempt {
  idempotencyKey: string;
  activityId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
  timestamp: string;
  activeDurationSeconds: number;
  attemptNumber: number;
}

export type GradedAnswer = Attempt & { questionId: string };

/**
 * 6. Session Model
 */
export interface Session {
  id: string;
  learnerId?: string;
  lessonId: string;
  lessonTitle: string;
  categoryId: SkillCategoryId;
  readingLevelId: ReadingLevelId;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  currentActivityIndex: number; // 0 to 4
  attempts: Attempt[];
  isCompleted: boolean;
  score: number;
  totalActivities: number;
  accuracy: number;
  totalActiveDurationSeconds: number;
  earnedRewardId?: string;
  earnedBadge?: string;
}

export type SessionRecord = Session & {
  // legacy compatibility fields
  currentQuestionIndex: number;
  answers: GradedAnswer[];
  totalQuestions: number;
};

/**
 * 7. Mastery Model (Per-skill mastery tracking & adaptive formula)
 */
export type EvidenceStatus = 'unknown' | 'provisional' | 'insufficient_sessions' | 'confirmed';
export type MasteryBand = 'needs_focus' | 'developing' | 'proficient' | 'mastered';

export interface MasteryComponents {
  accuracy: number;     // 0 to 1
  recency: number;      // 0 to 1
  consistency: number;  // 0 to 1
}

export interface SkillMasteryRecord {
  skillId: string;
  code?: string;
  skillName: string;
  categoryId: SkillCategoryId;
  readingLevelId: ReadingLevelId;
  score: number | null; // unrounded raw score (null when evidence is 'unknown')
  band: MasteryBand | 'unknown';
  evidenceStatus: EvidenceStatus;
  isConfirmedMastered: boolean;
  components: MasteryComponents;
  windowAttemptCount: number; // up to 10 attempts evaluated
  totalAttemptCount: number;
  sessionCount: number;
  lastAttemptAt: string | null;
  nextReviewDueDate: string | null;
  reviewIntervalDays: number;
  isReviewDue: boolean;
  configVersion: string;
  calculatedAt: string;
}

export interface Mastery extends SkillMasteryRecord {
  // Legacy / convenience fields
  status: 'not-started' | 'in-progress' | 'mastered';
  accuracy: number;
  activitiesAttempted: number;
  activitiesCorrect: number;
  lastPracticedAt: string;
}

/**
 * 8. Recommendation Model (Adaptive recommendations with educational rationale)
 */
export type PriorityTier = 1 | 2 | 3 | 4;

export interface AdaptiveRecommendation {
  id: string;
  activityId?: string;
  activityPrompt?: string;
  activityType?: ActivityType;
  targetDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  lessonId: string;
  lessonTitle: string;
  skillId?: string;
  skillName?: string;
  categoryId: SkillCategoryId;
  categoryName: string;
  readingLevelId: ReadingLevelId;
  masteryScore: number | null;
  band: MasteryBand | 'unknown';
  evidenceStatus: EvidenceStatus;
  childFriendlyReason: string;
  adultFacingExplanation: string;
  priorityTier: PriorityTier;
  priorityLabel: 'urgent' | 'high' | 'recommended' | 'review';
  isAssignment: boolean;
  isResume: boolean;
  assignmentId?: string;
  configVersion: string;
  calculatedAt: string;
}

export interface Recommendation extends Partial<AdaptiveRecommendation> {
  id: string;
  lessonId: string;
  lessonTitle: string;
  categoryName: string;
  readingLevelId: ReadingLevelId;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  isResume: boolean;
}

/**
 * 9. Assignment Model
 */
export interface Assignment {
  id: string;
  title: string;
  classId?: string;
  teacherId?: string;
  lessonId: string;
  lessonTitle: string;
  skillId?: string;
  assignedLearnerIds: string[];
  completedLearnerIds: string[];
  dueDate?: string;
  instructions?: string;
  createdAt: string;
  // Backward compatibility fields
  learnerId?: string;
  assignedAt?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  targetDueDate?: string;
  completedAt?: string;
}

/**
 * Account Roles & Multi-User Context
 */
export type UserRole = 'parent' | 'teacher' | 'admin';
export type DateFilterOption = '7d' | '30d' | 'all';

export type AuthServiceStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'unavailable';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  practiceGoalMinutesPerDay?: number;
}

export interface ChildProfileInput {
  displayName: string;
  avatar: string;
  avatarName: string;
  readingLevelId: ReadingLevelId;
  ageBandOrGrade: string;
}

export interface AuthSessionResponse {
  user: AuthenticatedUser;
  childProfiles?: Learner[];
  requiresEmailVerification?: boolean;
  message?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  isValid: boolean;
  unmetRequirements: string[];
}

export interface ParentProfile {
  id: string;
  name: string;
  email: string;
  childrenIds: string[];
  practiceGoalMinutesPerDay: number;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  classIds: string[];
}

export interface Classroom {
  id: string;
  name: string;
  grade: string;
  teacherId: string;
  studentIds: string[];
}

/**
 * 10. Reward Model (Milestones separate from mastery)
 */
export interface Reward {
  id: string;
  type: 'badge' | 'trophy' | 'stars' | 'streak';
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
  isUnlocked: boolean;
  milestoneCriterion?: string;
}

export interface ReadingProgressSummary {
  totalLessonsCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  totalActivePracticeSeconds: number;
  categoriesProgress: Record<
    SkillCategoryId,
    {
      completed: boolean;
      bestScore: number;
      attempts: number;
    }
  >;
  levelsProgress: Record<
    ReadingLevelId,
    {
      completedCount: number;
      totalCount: number;
    }
  >;
}
