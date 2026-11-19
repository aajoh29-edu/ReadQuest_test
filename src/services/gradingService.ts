import { Activity, Attempt, Lesson } from '../types';
import { SYNTHETIC_LESSONS } from './data/syntheticCurriculum';

export interface ActivitySubmission {
  activityId: string;
  selectedOptionId: string;
  idempotencyKey: string;
  activeDurationSeconds?: number;
}

/**
 * Isolated Grading Service
 * In production, grading runs on FastAPI backend (e.g. POST /api/v1/sessions/:id/evaluate).
 * Keeps answer validation strictly encapsulated away from client presentation code.
 */
export class GradingService {
  /**
   * Internal lookup across all 12 lessons and 60 activities.
   */
  public static findActivity(activityId: string): Activity | null {
    for (const lesson of SYNTHETIC_LESSONS) {
      const found = lesson.activities.find((a) => a.id === activityId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Evaluates an activity submission and returns a typed Attempt with idempotency key.
   */
  public static evaluateActivity(
    submission: ActivitySubmission,
    attemptNumber: number = 1
  ): Attempt {
    const activity = this.findActivity(submission.activityId);

    if (!activity) {
      throw new Error(`Grading error: Activity with ID '${submission.activityId}' was not found in curriculum.`);
    }

    const selectedOption = activity.options.find((opt) => opt.id === submission.selectedOptionId);
    const correctOption = activity.options.find((opt) => opt.isCorrect);

    if (!selectedOption) {
      throw new Error(`Grading error: Selected option '${submission.selectedOptionId}' does not exist for activity '${submission.activityId}'.`);
    }

    const isCorrect = Boolean(selectedOption.isCorrect);

    return {
      idempotencyKey: submission.idempotencyKey,
      activityId: submission.activityId,
      selectedOptionId: submission.selectedOptionId,
      isCorrect,
      correctOptionId: correctOption?.id || '',
      explanation: isCorrect ? activity.encouragementSuccess : activity.explanation,
      timestamp: new Date().toISOString(),
      activeDurationSeconds: Math.max(1, Math.min(300, submission.activeDurationSeconds || 15)),
      attemptNumber,
    };
  }

  /**
   * Strips internal isCorrect flags from activities for safe presentation layer consumption.
   */
  public static sanitizeLesson(lesson: Lesson): Lesson {
    return {
      ...lesson,
      activities: lesson.activities.map((act) => ({
        ...act,
        options: act.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          visualCue: opt.visualCue,
          phonicsPart: opt.phonicsPart,
          // Intentionally omitting isCorrect
        })),
      })),
      questions: lesson.activities.map((act) => ({
        ...act,
        options: act.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          visualCue: opt.visualCue,
          phonicsPart: opt.phonicsPart,
        })),
      })),
    };
  }

  /**
   * Calculates score, accuracy, and pass criteria.
   */
  public static calculateSessionScore(attempts: Attempt[], totalActivities: number) {
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const accuracy = totalActivities > 0 ? Math.round((correctCount / totalActivities) * 100) : 0;
    const totalActiveSeconds = attempts.reduce((acc, curr) => acc + (curr.activeDurationSeconds || 0), 0);

    return {
      score: correctCount,
      accuracy,
      isPassed: accuracy >= 60,
      totalActiveSeconds,
    };
  }
}
