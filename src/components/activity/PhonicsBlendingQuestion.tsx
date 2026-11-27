import React, { useEffect, useRef, useState } from 'react';
import { Question, QuestionOption } from '../../types';
import { Play, Sparkles } from 'lucide-react';
import { speakText, stopSpeechSynthesis } from '../../utils/speechSynthesis';

interface PhonicsBlendingQuestionProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  correctOptionId?: string;
}

export const PhonicsBlendingQuestion: React.FC<PhonicsBlendingQuestionProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
  correctOptionId,
}) => {
  const [activeTileIndex, setActiveTileIndex] = useState<number | null>(null);
  const [isBlendingSequence, setIsBlendingSequence] = useState(false);
  const blendTimeoutsRef = useRef<number[]>([]);

  const tiles = question.phonicsTiles || [];

  const clearBlendTimeouts = () => {
    blendTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    blendTimeoutsRef.current = [];
  };

  useEffect(
    () => () => {
      clearBlendTimeouts();
      stopSpeechSynthesis();
    },
    []
  );

  const handleTileClick = (index: number) => {
    const tile = tiles[index];
    if (!tile) return;
    clearBlendTimeouts();
    setIsBlendingSequence(false);
    speakText(tile.audioLabel || tile.sound || tile.letter, { rate: 0.84 });
    setActiveTileIndex(index);
    const timeoutId = window.setTimeout(() => {
      setActiveTileIndex((prev) => (prev === index ? null : prev));
    }, 1200);
    blendTimeoutsRef.current.push(timeoutId);
  };

  const handleBlendSequence = () => {
    if (isBlendingSequence || tiles.length === 0) return;
    clearBlendTimeouts();
    stopSpeechSynthesis();
    setIsBlendingSequence(true);

    tiles.forEach((tile, idx) => {
      const timeoutId = window.setTimeout(() => {
        setActiveTileIndex(idx);
        speakText(tile.audioLabel || tile.sound || tile.letter, {
          rate: 0.84,
          cancelOngoing: false,
        });
      }, idx * 850);
      blendTimeoutsRef.current.push(timeoutId);
    });

    const doneTimeoutId = window.setTimeout(() => {
      setActiveTileIndex(null);
      setIsBlendingSequence(false);
    }, tiles.length * 850 + 450);
    blendTimeoutsRef.current.push(doneTimeoutId);
  };

  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Phonics Workshop
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#151D42] leading-tight">
          {question.prompt}
        </h2>
        {question.subPrompt && (
          <p className="text-sm sm:text-base font-semibold text-[#6D5D8A]">
            {question.subPrompt}
          </p>
        )}
      </div>

      {/* Interactive Sound Tiles Workspace */}
      <div className="bg-[#FAF8FD] border-2 border-[#D8CCE8] rounded-3xl p-5 sm:p-7 shadow-inner text-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D5D8A]">
            Interactive Sound Tiles
          </span>
          <button
            type="button"
            onClick={handleBlendSequence}
            disabled={isBlendingSequence}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#EDE7F6] hover:bg-[#D8CCE8] text-[#7C3AED] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            aria-label="Play sound blend sequence"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Blend Sounds Together</span>
          </button>
        </div>

        {/* Tiles row */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-2">
          {tiles.map((tile, index) => {
            const isActive = activeTileIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleTileClick(index)}
                className={`flex flex-col items-center justify-center w-20 h-24 sm:w-26 sm:h-30 rounded-3xl border-3 transition-all duration-200 cursor-pointer shadow-md ${
                  isActive
                    ? 'scale-110 bg-[#FF8A65] border-[#FF8A65] text-white shadow-orange-300'
                    : 'bg-white border-[#C8B8E2] text-[#151D42] hover:border-[#7C3AED]'
                }`}
                aria-label={`Sound tile ${tile.letter}, sounds like ${tile.sound}`}
              >
                <span className="text-3xl sm:text-4xl font-black font-mono">
                  {tile.letter}
                </span>
                <span
                  className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/30 text-white' : 'bg-[#EDE7F6] text-[#7C3AED]'
                  }`}
                >
                  {tile.sound}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#7A6E94] mt-4">
          Tap each tile to hear its sound, or press <strong className="text-[#151D42]">Blend Sounds Together</strong>!
        </p>
      </div>

      {/* Answer options */}
      <fieldset className="border-0 p-0 m-0" disabled={isSubmitted}>
        <legend className="text-sm font-bold text-[#151D42] mb-3">
          Which word is made from these blended sounds?
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {question.options.map((option: QuestionOption) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrect = isSubmitted && correctOptionId === option.id;
            const isIncorrect = isSubmitted && isSelected && correctOptionId !== option.id;

            let borderAndBg =
              'border-[#D8CCE8] bg-white hover:bg-[#F8F6FC] hover:border-[#8B5CF6]/60 text-[#151D42]';
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
                onClick={() => onSelectOption(option.id)}
                disabled={isSubmitted}
                className={`p-4 rounded-3xl border-3 flex flex-col items-center justify-center min-h-[88px] transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] ${borderAndBg}`}
                aria-pressed={isSelected}
              >
                {option.visualCue && (
                  <span className="text-2xl mb-1" role="img" aria-hidden="true">
                    {option.visualCue}
                  </span>
                )}
                <span className="text-2xl font-black lowercase tracking-wide">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};
