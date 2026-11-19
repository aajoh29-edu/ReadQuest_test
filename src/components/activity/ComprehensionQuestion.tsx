import React, { useState } from 'react';
import { Question, QuestionOption } from '../../types';
import { BookOpen, Type, Sparkles } from 'lucide-react';

interface ComprehensionQuestionProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  correctOptionId?: string;
}

export const ComprehensionQuestion: React.FC<ComprehensionQuestionProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
  correctOptionId,
}) => {
  const [isLargeText, setIsLargeText] = useState(false);

  return (
    <div className="space-y-6">
      {/* Category header */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          Reading Comprehension
        </div>
        <button
          type="button"
          onClick={() => setIsLargeText((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D5D8A] bg-[#EDE7F6] hover:bg-[#D8CCE8] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          title="Toggle text size"
          aria-label="Toggle story text size"
        >
          <Type className="w-3.5 h-3.5" />
          <span>{isLargeText ? 'Standard Text' : 'Larger Text'}</span>
        </button>
      </div>

      {/* Passage Card */}
      <article
        className="bg-gradient-to-b from-[#FFFDF9] to-[#FAF8FD] border-2 border-[#D8CCE8] rounded-3xl p-6 sm:p-7 shadow-xs relative"
        aria-label="Story passage"
      >
        {question.passageTitle && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl" role="img" aria-hidden="true">
              📖
            </span>
            <h3 className="text-lg font-black text-[#151D42] tracking-tight">
              {question.passageTitle}
            </h3>
          </div>
        )}
        <p
          className={`font-medium text-[#1E2958] leading-relaxed tracking-wide ${
            isLargeText ? 'text-xl sm:text-2xl leading-loose' : 'text-base sm:text-lg'
          }`}
        >
          {question.passageText}
        </p>
      </article>

      {/* Question Prompt */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#151D42] leading-snug">
          {question.prompt}
        </h2>
        {question.hint && (
          <p className="text-xs sm:text-sm text-[#7A6E94] flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#FF8A65]" />
            <span>Hint: {question.hint}</span>
          </p>
        )}
      </div>

      {/* Options */}
      <fieldset className="border-0 p-0 m-0" disabled={isSubmitted}>
        <legend className="sr-only">Choose the correct answer based on the passage</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {question.options.map((option: QuestionOption, index: number) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrect = isSubmitted && correctOptionId === option.id;
            const isIncorrect = isSubmitted && isSelected && correctOptionId !== option.id;

            let style =
              'bg-white border-[#D8CCE8] text-[#151D42] hover:bg-[#F8F6FC] hover:border-[#8B5CF6]';
            if (isSelected && !isSubmitted) {
              style = 'bg-[#FFF5F2] border-[#FF8A65] text-[#151D42] ring-3 ring-[#FF8A65]/40';
            } else if (isCorrect) {
              style = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-3 ring-emerald-300';
            } else if (isIncorrect) {
              style = 'bg-rose-50 border-rose-400 text-rose-950';
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(option.id)}
                disabled={isSubmitted}
                className={`p-4 sm:p-5 rounded-3xl border-3 flex items-center justify-between text-left min-h-[72px] transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99] ${style}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#EDE7F6] text-[#7C3AED] font-black text-sm flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-base sm:text-lg font-bold">
                    {option.label}
                  </span>
                </div>
                {option.visualCue && (
                  <span className="text-2xl select-none shrink-0" role="img" aria-hidden="true">
                    {option.visualCue}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};
