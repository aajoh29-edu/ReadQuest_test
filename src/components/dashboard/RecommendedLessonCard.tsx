import React from 'react';
import { Play, Sparkles, Clock, Award, ArrowRight } from 'lucide-react';
import { Lesson, SessionRecord } from '../../types';
import { Button } from '../common/Button';

interface RecommendedLessonCardProps {
  lesson: Lesson;
  activeSession: SessionRecord | null;
  onStartLesson: (lessonId: string) => void;
}

export const RecommendedLessonCard: React.FC<RecommendedLessonCardProps> = ({
  lesson,
  activeSession,
  onStartLesson,
}) => {
  const isResuming = activeSession && activeSession.lessonId === lesson.id && !activeSession.isCompleted;

  return (
    <div className="bg-gradient-to-br from-[#FFFFFF] via-[#FAF8FD] to-[#F3EEF9] border-3 border-[#C8B8E2] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#FF8A65]/10 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-xs bg-[#FF8A65]/15 text-[#D84315] px-3 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {isResuming ? 'Continue Adventure' : 'Recommended Next Quest'}
            </span>
            <span className="text-xs font-bold text-[#6D5D8A] bg-[#EDE7F6] px-3 py-1 rounded-full">
              {lesson.categoryName}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#151D42] tracking-tight">
            {lesson.title}
          </h2>

          <p className="text-sm sm:text-base font-medium text-[#4A3B69] leading-relaxed">
            {lesson.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-bold text-[#6D5D8A] pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#7C3AED]" />
              ~{lesson.estimatedMinutes} minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF8A65]" />
              {lesson.totalActivities ?? lesson.totalQuestions ?? 5} Activities
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Award className="w-4 h-4 text-amber-500" />
              Badge: {lesson.badgeReward}
            </span>
          </div>

          {isResuming && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 text-xs text-amber-900 font-semibold flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>
                You have an unfinished quest saved at Question {activeSession.currentQuestionIndex + 1} of {activeSession.totalQuestions}!
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center">
          <Button
            variant="peach"
            size="xl"
            onClick={() => onStartLesson(lesson.id)}
            icon={isResuming ? <Play className="w-6 h-6 fill-current" /> : <ArrowRight className="w-6 h-6 stroke-[3]" />}
            iconPosition="right"
            className="w-full sm:w-auto shadow-lg shadow-orange-500/25"
          >
            {isResuming ? 'Resume Quest' : 'Start Quest Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};
