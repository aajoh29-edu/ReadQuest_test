import React from 'react';
import { Volume2, Puzzle, Sparkles, BookOpen, CheckCircle, ArrowRight } from 'lucide-react';
import { Lesson, SkillCategory } from '../../types';
import { Button } from '../common/Button';

interface CategoryCardProps {
  category: SkillCategory;
  lesson?: Lesson;
  isCompleted: boolean;
  bestScore?: number;
  onSelectLesson: (lessonId: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  lesson,
  isCompleted,
  bestScore,
  onSelectLesson,
}) => {
  const getCategoryIcon = () => {
    switch (category.id) {
      case 'letter-sounds':
        return <Volume2 className="w-6 h-6 stroke-[2.5]" />;
      case 'phonics-blending':
        return <Puzzle className="w-6 h-6 stroke-[2.5]" />;
      case 'sight-words':
        return <Sparkles className="w-6 h-6 stroke-[2.5]" />;
      case 'comprehension':
        return <BookOpen className="w-6 h-6 stroke-[2.5]" />;
      default:
        return <BookOpen className="w-6 h-6" />;
    }
  };

  const getAccentColor = () => {
    switch (category.id) {
      case 'letter-sounds':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          border: 'hover:border-purple-300',
          tag: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'phonics-blending':
        return {
          bg: 'bg-pink-100',
          text: 'text-pink-700',
          border: 'hover:border-pink-300',
          tag: 'bg-pink-50 text-pink-700 border-pink-200',
        };
      case 'sight-words':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'hover:border-blue-300',
          tag: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'comprehension':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          border: 'hover:border-emerald-300',
          tag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }
  };

  const colors = getAccentColor();

  return (
    <div
      className={`bg-white border-2 border-[#E2DAED] rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${colors.border}`}
    >
      <div className="space-y-3">
        {/* Header with icon and status */}
        <div className="flex items-center justify-between">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors.bg} ${colors.text} shadow-xs`}
          >
            {getCategoryIcon()}
          </div>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Completed ({bestScore}/5)
            </span>
          ) : (
            <span className="text-xs font-bold text-[#6D5D8A] bg-[#EDE7F6] px-2.5 py-1 rounded-full">
              5 Questions
            </span>
          )}
        </div>

        <div>
          <h3 className="text-xl font-black text-[#151D42] tracking-tight">
            {category.name}
          </h3>
          <p className="text-xs font-bold text-[#7C3AED] mt-0.5">
            {category.tagline}
          </p>
        </div>

        <p className="text-xs sm:text-sm font-medium text-[#4A3B69] line-clamp-2">
          {category.description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-[#F0EBF7] flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#6D5D8A] truncate">
          {lesson?.title || 'Quest 1'}
        </span>
        {lesson && (
          <Button
            variant={isCompleted ? 'outline' : 'peach'}
            size="sm"
            onClick={() => onSelectLesson(lesson.id)}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            {isCompleted ? 'Replay' : 'Play'}
          </Button>
        )}
      </div>
    </div>
  );
};
