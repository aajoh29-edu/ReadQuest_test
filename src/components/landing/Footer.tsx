import React from 'react';
import { Link } from 'react-router-dom';
import { ReadQuestLogoMark, RewardStarIcon } from '../icons/ReadQuestIcons';

interface FooterProps {
  onResetDemo?: () => Promise<void>;
}

export const Footer: React.FC<FooterProps> = ({ onResetDemo }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E0FA] pt-10 pb-24 md:pb-10 px-4 sm:px-6">
      <div className="max-w-[1260px] mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand & Educational Mission */}
          <div className="md:col-span-5 space-y-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group focus-visible:outline-3 focus-visible:outline-[#7C65E8] rounded-xl"
            >
              <ReadQuestLogoMark
                size={36}
                className="transition-transform duration-200 group-hover:scale-105 shrink-0"
              />
              <span className="text-xl font-black tracking-tight text-[#171B3A]">
                Read<span className="text-[#7C65E8]">Quest</span>
              </span>
            </Link>
            <p className="text-sm font-medium text-[#5C5E7B] leading-relaxed max-w-sm">
              Helping young learners build lifelong reading confidence through joyful phonics, blending, sight words, and interactive story adventures.
            </p>
          </div>

          {/* Learning Links */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#171B3A]">
              Explore ReadQuest
            </h3>
            <ul className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm font-bold text-[#5C5E7B]">
              <li>
                <Link to="/dashboard" className="hover:text-[#7C65E8] transition-colors">
                  Quests
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-[#7C65E8] transition-colors">
                  Story Library
                </Link>
              </li>
              <li>
                <Link to="/progress" className="hover:text-[#7C65E8] transition-colors">
                  Progress & Badges
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#7C65E8] transition-colors">
                  Explorer Profile
                </Link>
              </li>
              <li>
                <Link to="/parent" className="hover:text-[#7C65E8] transition-colors">
                  Parent Portal
                </Link>
              </li>
              <li>
                <Link to="/teacher" className="hover:text-[#7C65E8] transition-colors">
                  Teacher Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Demo Data & Privacy Note */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#171B3A]">
              Demo & Data Privacy
            </h3>
            <p className="text-xs font-medium text-[#5C5E7B] leading-relaxed">
              This interactive prototype saves your reading progress locally in your browser. No personal child data is sent externally.
            </p>
            {onResetDemo && (
              <button
                type="button"
                onClick={onResetDemo}
                className="text-xs font-extrabold text-[#5843C4] hover:underline cursor-pointer"
              >
                Reset Demo Progress
              </button>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Custom Star Accent */}
        <div className="pt-6 border-t border-[#EEE9FF] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-[#5C5E7B]">
          <div className="flex items-center gap-2">
            <RewardStarIcon size={16} className="shrink-0" />
            <span>© {currentYear} ReadQuest · Children’s Adaptive Reading Platform</span>
          </div>
          <div>COSC 512 Graduate Software Engineering Project</div>
        </div>
      </div>
    </footer>
  );
};
