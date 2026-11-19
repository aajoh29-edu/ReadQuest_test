import React from 'react';
import { Heart, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdventureButton, SecondaryButton } from '../common/ReadQuestButtons';
import {
  ArrowActionIcon,
  ProgressIcon,
  QuestIcon,
  WordBlendingIcon,
} from '../icons/ReadQuestIcons';

export const ParentBenefits: React.FC = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      title: 'Learn at Your Own Pace',
      description:
        'Personalized reading adventures help every child grow with confidence across independent Seedling, Sprout, and Bloom stages.',
      icon: <QuestIcon size={30} active />,
      accentBg: 'bg-[#EEE9FF]',
    },
    {
      title: 'Build Strong Foundations',
      description:
        'Practice sounds, letters, blending, sight words, and comprehension through 60 structured, bite-sized literacy activities.',
      icon: <WordBlendingIcon size={30} />,
      accentBg: 'bg-[#E3F9F1]',
    },
    {
      title: 'Celebrate Every Milestone',
      description:
        'Follow learning progress, active practice time, and skill evidence to recognize each exciting achievement together.',
      icon: <ProgressIcon size={30} active />,
      accentBg: 'bg-[#FFF5EE]',
    },
  ];

  return (
    <section
      aria-labelledby="parent-benefits-heading"
      className="py-12 sm:py-16 bg-gradient-to-b from-[#FAF9FF] to-[#EEE9FF]/50 border-t border-[#EEE9FF]"
    >
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Heading */}
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#5843C4] block">
            For Families & Educators
          </span>
          <h2
            id="parent-benefits-heading"
            className="text-2xl sm:text-4xl font-black text-[#171B3A]"
          >
            Growing Confident Readers, One Quest at a Time.
          </h2>
          <p className="text-sm sm:text-base font-medium text-[#5C5E7B]">
            Thoughtfully designed for early readers, with transparent tools for the grown-ups cheering them on.
          </p>
        </div>

        {/* Three Clean Benefit Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white rounded-[24px] p-6 border border-[#E5E0FA] shadow-xs space-y-4"
            >
              <div
                className={`w-13 h-13 rounded-2xl ${b.accentBg} flex items-center justify-center`}
              >
                {b.icon}
              </div>
              <h3 className="text-xl font-black text-[#171B3A]">
                {b.title}
              </h3>
              <p className="text-sm font-medium text-[#34364B] leading-relaxed">
                {b.description}
              </p>
            </div>
          ))}
        </div>

        {/* Direct Links to Existing Parent & Teacher Views */}
        <div className="bg-white rounded-[24px] p-6 border border-[#E5E0FA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#171B3A]">
              Explore Family & Classroom Insights
            </h3>
            <p className="text-xs sm:text-sm font-medium text-[#5C5E7B]">
              Check real session history, skill evidence, and assignments in the Parent or Teacher view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SecondaryButton
              size="sm"
              onClick={() => navigate('/parent')}
              icon={<Heart className="w-4 h-4 text-[#C25E28]" />}
            >
              Parent Insights
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              onClick={() => navigate('/teacher')}
              icon={<GraduationCap className="w-4 h-4 text-[#189B73]" />}
              iconPosition="left"
            >
              Teacher Classroom
            </SecondaryButton>
            <AdventureButton
              size="sm"
              onClick={() => navigate('/progress')}
              icon={<ArrowActionIcon size={16} />}
              iconPosition="right"
            >
              Skill Progress
            </AdventureButton>
          </div>
        </div>
      </div>
    </section>
  );
};
