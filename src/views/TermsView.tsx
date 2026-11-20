import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export const TermsView: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#5843C4]">
          <BookOpen className="w-4 h-4" />
          <span>Platform Guidelines</span>
        </div>

        <h1 className="text-3xl font-black text-[#171B3A]">ReadQuest Terms of Use</h1>

        <div className="space-y-4 text-sm font-medium text-[#34364B] leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">1. Eligible Account Holders</h2>
            <p>
              ReadQuest accounts must be created and supervised by a parent, legal guardian, or authorized school educator. Children participate in reading quests through parent- or educator-managed profiles.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">2. Educational Support Tool</h2>
            <p>
              Mastery bands and adaptive recommendations are engineering heuristics designed to organize reading practice and celebrate progress. They are educational practice tools, not clinical or diagnostic reading assessments.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">3. Account Security</h2>
            <p>
              Account holders are responsible for keeping their sign-in credentials confidential and signing out on shared devices.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[#EEE9FF] flex items-center gap-4 text-xs font-extrabold text-[#5843C4]">
          <Link to="/signup" className="hover:underline">Create Parent Account</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/" className="hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};
