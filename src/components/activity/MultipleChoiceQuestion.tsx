import React, { useEffect, useState } from 'react';
import { Question, QuestionOption } from '../../types';
import { Volume2 } from 'lucide-react';
import { speakText, stopSpeechSynthesis } from '../../utils/speechSynthesis';

interface MultipleChoiceQuestionProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  correctOptionId?: string;
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
  correctOptionId,
}) => {
  const [showSpeechUnavailable, setShowSpeechUnavailable] = useState(false);

  useEffect(() => () => stopSpeechSynthesis(), []);

  const handleReadPrompt = () => {
    const didStartSpeaking = speakText(question.subPrompt || question.prompt, { rate: 0.9 });
    setShowSpeechUnavailable(!didStartSpeaking);
  };

  const handleSelectOption = (option: QuestionOption) => {
    onSelectOption(option.id);
    speakText(option.label, { rate: 0.84 });
  };

  return (
    <div className="space-y-6">
      {/* Question prompt header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EDE7F6] text-[#7C3AED] rounded-full text-xs font-bold uppercase tracking-wider">
            <Volume2 className="w-3.5 h-3.5" />
            Sound Quest
          </div>
          <button
            type="button"
            onClick={handleReadPrompt}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#EDE7F6] hover:bg-[#D8CCE8] text-[#7C3AED] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            aria-label="Read this question aloud"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Hear Question</span>
          </button>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#151D42] leading-tight">
          {question.prompt}
        </h2>
        {question.subPrompt && (
          <p className="text-base sm:text-lg font-bold text-[#6D5D8A] bg-[#F5F2FB] p-3 rounded-2xl border border-[#D8CCE8]/60 inline-block">
            {question.subPrompt}
          </p>
        )}
        {showSpeechUnavailable && (
          <p className="text-xs font-bold text-rose-700">
            This browser did not allow speech playback for this question.
          </p>
        )}
      </div>

      {/* Options grid */}
      <fieldset className="border-0 p-0 m-0" disabled={isSubmitted}>
        <legend className="sr-only">Choose the correct answer</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((option: QuestionOption, index: number) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrect = isSubmitted && correctOptionId === option.id;
            const isIncorrect = isSubmitted && isSelected && correctOptionId !== option.id;

            let borderAndBg = 'border-[#D8CCE8] bg-white hover:bg-[#F8F6FC] hover:border-[#8B5CF6]/60 text-[#151D42]';
            if (isSelected && !isSubmitted) {
              borderAndBg = 'border-[#FF8A65] bg-[#FFF5F2] ring-3 ring-[#FF8A65]/40 text-[#151D42]';
            } else if (isCorrect) {
              borderAndBg = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-3 ring-emerald-300';
            } else if (isIncorrect) {
              borderAndBg = 'border-rose-400 bg-rose-50 text-rose-950';
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option)}
                disabled={isSubmitted}
                className={`relative min-h-[76px] p-4 sm:p-5 rounded-3xl border-3 flex items-center justify-between text-left transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[#7C3AED] ${borderAndBg}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-[#EDE7F6] text-[#7C3AED] font-black text-sm flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold tracking-wide">
                      {option.label}
                    </span>
                    {option.phonicsPart && (
                      <span className="text-xs text-[#6D5D8A] font-mono">
                        {option.phonicsPart}
                      </span>
                    )}
                  </div>
                </div>

                {option.visualCue && (
                  <span className="text-3xl select-none shrink-0" role="img" aria-hidden="true">
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
