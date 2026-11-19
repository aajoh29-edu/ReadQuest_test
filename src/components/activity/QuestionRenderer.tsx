import React from 'react';
import { Question } from '../../types';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { PhonicsBlendingQuestion } from './PhonicsBlendingQuestion';
import { SightWordQuestion } from './SightWordQuestion';
import { ComprehensionQuestion } from './ComprehensionQuestion';

interface QuestionRendererProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  correctOptionId?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
  correctOptionId,
}) => {
  switch (question.type) {
    case 'multiple-choice-sound':
      return (
        <MultipleChoiceQuestion
          question={question}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
          isSubmitted={isSubmitted}
          correctOptionId={correctOptionId}
        />
      );
    case 'phonics-blending':
      return (
        <PhonicsBlendingQuestion
          question={question}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
          isSubmitted={isSubmitted}
          correctOptionId={correctOptionId}
        />
      );
    case 'sight-word-cloze':
      return (
        <SightWordQuestion
          question={question}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
          isSubmitted={isSubmitted}
          correctOptionId={correctOptionId}
        />
      );
    case 'reading-comprehension':
      return (
        <ComprehensionQuestion
          question={question}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
          isSubmitted={isSubmitted}
          correctOptionId={correctOptionId}
        />
      );
    default:
      return (
        <MultipleChoiceQuestion
          question={question}
          selectedOptionId={selectedOptionId}
          onSelectOption={onSelectOption}
          isSubmitted={isSubmitted}
          correctOptionId={correctOptionId}
        />
      );
  }
};
