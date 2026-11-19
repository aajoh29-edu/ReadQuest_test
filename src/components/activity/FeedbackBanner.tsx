import React from 'react';
import { CheckCircle2, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import { GradedAnswer } from '../../types';
import { Button } from '../common/Button';

interface FeedbackBannerProps {
  gradedAnswer: GradedAnswer | null;
  onNext: () => void;
  isLastQuestion: boolean;
  isLoadingNext?: boolean;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  gradedAnswer,
  onNext,
  isLastQuestion,
  isLoadingNext = false,
}) => {
  if (!gradedAnswer) return null;

  const { isCorrect, explanation } = gradedAnswer;

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border-3 transition-all animate-in slide-in-from-bottom-2 duration-200 ${
        isCorrect
          ? 'bg-[#F0FDF4] border-emerald-400 text-emerald-950 shadow-md shadow-emerald-500/10'
          : 'bg-[#FFFBEB] border-amber-400 text-amber-950 shadow-md shadow-amber-500/10'
      }`}
      role="region"
      aria-live="polite"
      aria-label="Question feedback"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
              isCorrect ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Lightbulb className="w-6 h-6 stroke-[2.5]" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black">
                {isCorrect ? 'Super Job! 🎉' : 'Learning Moment! 🌱'}
              </span>
              {isCorrect && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  +3 Stars
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-semibold leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex justify-end">
          <Button
            variant="peach"
            size="lg"
            onClick={onNext}
            isLoading={isLoadingNext}
            icon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
            iconPosition="right"
            className="w-full sm:w-auto"
          >
            {isLastQuestion ? 'See Quest Summary' : 'Next Question'}
          </Button>
        </div>
      </div>
    </div>
  );
};
