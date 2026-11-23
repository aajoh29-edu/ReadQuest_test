import React from 'react';
import { Star, CheckCircle, Target, Award, Trophy } from 'lucide-react';
import { LearnerProfile, ReadingProgressSummary } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { formatAccuracy } from '../../utils/formatAccuracy';

interface SessionProgressWidgetProps {
  profile: LearnerProfile;
  progress: ReadingProgressSummary;
}

export const SessionProgressWidget: React.FC<SessionProgressWidgetProps> = ({
  profile,
  progress,
}) => {
  const completedLessons = progress.totalLessonsCompleted;
  const totalCategories = 4;

  return (
    <div className="bg-white border-2 border-[#E2DAED] rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EDE7F6] flex items-center justify-center text-[#7C3AED]">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#151D42]">Quest Progress</h3>
            <p className="text-xs font-semibold text-[#6D5D8A]">Today's Learning Journey</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFF5F2] border border-[#FF8A65]/30 px-3 py-1 rounded-full text-xs font-black text-[#D84315]">
          <Star className="w-3.5 h-3.5 fill-[#FF8A65] text-[#FF8A65]" />
          <span>{profile.starsEarned} Total Stars</span>
        </div>
      </div>

      {/* Progress Bar for Categories */}
      <div className="space-y-1.5">
        <ProgressBar
          value={completedLessons}
          max={totalCategories}
          label={`Categories Conquered (${completedLessons} of ${totalCategories})`}
          showPercentage
          color="purple"
          height="md"
        />
      </div>

      {/* Mini metric counters */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#F0EBF7] text-center">
        <div className="bg-[#FAF8FD] p-3 rounded-2xl border border-[#EDE7F6]">
          <span className="block text-2xl font-black text-[#151D42]">
            {progress.totalQuestionsAnswered}
          </span>
          <span className="text-[11px] font-bold text-[#6D5D8A] uppercase">
            Questions
          </span>
        </div>

        <div className="bg-[#FAF8FD] p-3 rounded-2xl border border-[#EDE7F6]">
          <span className="block text-2xl font-black text-emerald-700">
            {progress.totalCorrectAnswers}
          </span>
          <span className="text-[11px] font-bold text-[#6D5D8A] uppercase">
            Correct
          </span>
        </div>

        <div className="bg-[#FAF8FD] p-3 rounded-2xl border border-[#EDE7F6]">
          <span className="block text-2xl font-black text-[#FF8A65]">
            {formatAccuracy(progress.averageAccuracy)}
          </span>
          <span className="text-[11px] font-bold text-[#6D5D8A] uppercase">
            Accuracy
          </span>
        </div>
      </div>
    </div>
  );
};
