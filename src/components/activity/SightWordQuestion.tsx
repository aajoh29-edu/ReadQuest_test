import React from 'react';
import { Question, QuestionOption } from '../../types';
import { Sparkles } from 'lucide-react';

interface SightWordQuestionProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  correctOptionId?: string;
}

export const SightWordQuestion: React.FC<SightWordQuestionProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
  correctOptionId,
}) => {
  const sentence = question.contextSentenceWithBlank || '_____';
  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const parts = sentence.split('_____');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Sight Word Cloze
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#151D42] leading-tight">
          {question.prompt}
        </h2>
      </div>

      {/* Sentence Presentation Box with Interactive Blank */}
      <div className="bg-[#FAF8FD] border-2 border-[#D8CCE8] rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#151D42] leading-relaxed tracking-wide inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span>{parts[0]}</span>
          <span
            className={`inline-flex items-center justify-center min-w-[120px] sm:min-w-[150px] px-4 py-1.5 rounded-2xl border-3 border-dashed font-black transition-all ${
              selectedOption
                ? 'bg-[#FFF5F2] border-[#FF8A65] text-[#151D42] scale-105'
                : 'bg-white border-[#BDB0D6] text-gray-400'
            }`}
          >
            {selectedOption ? selectedOption.label : '______'}
          </span>
          <span>{parts[1] || ''}</span>
        </p>
        <p className="text-xs text-[#7A6E94] mt-4 font-semibold">
          Tap a word card below to complete the sentence!
        </p>
      </div>

      {/* Sight Word Option Cards */}
      <fieldset className="border-0 p-0 m-0" disabled={isSubmitted}>
        <legend className="sr-only">Choose a sight word</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
                className={`p-4 sm:p-5 rounded-3xl border-3 min-h-[84px] flex flex-col items-center justify-center font-black text-2xl sm:text-3xl transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] ${style}`}
                aria-pressed={isSelected}
              >
                <span>{option.label}</span>
                <span className="text-[11px] font-semibold text-[#6D5D8A] mt-1">
                  Word {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};
