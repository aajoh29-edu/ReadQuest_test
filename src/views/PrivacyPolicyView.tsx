import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#189B73]">
          <ShieldCheck className="w-4 h-4" />
          <span>Family Privacy Practices</span>
        </div>

        <h1 className="text-3xl font-black text-[#171B3A]">ReadQuest Privacy Policy</h1>
        <p className="text-sm font-semibold text-[#5C5E7B] leading-relaxed">
          ReadQuest is designed with privacy-by-design principles for families and educators supporting young readers.
        </p>

        <div className="space-y-4 text-sm font-medium text-[#34364B] leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">1. Adult-Managed Accounts</h2>
            <p>
              Account registration and authentication are limited to parents, legal guardians, or authorized educators. ReadQuest does not collect child email addresses, phone numbers, home addresses, or behavioral advertising profiles.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">2. Child Reader Profiles</h2>
            <p>
              Parents create child reader profiles using only a chosen nickname, animal avatar, grade context, and reading level stage. Learning progress and mastery records stay strictly scoped to the parent’s or authorized teacher’s account.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-black text-[#171B3A]">3. Data Retention & Deletion</h2>
            <p>
              Parents can update or permanently delete any child reader profile or their full family account from Account Settings at any time after re-confirming their account password.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[#EEE9FF] flex items-center gap-4 text-xs font-extrabold text-[#5843C4]">
          <Link to="/signup" className="hover:underline">Create Parent Account</Link>
          <Link to="/terms" className="hover:underline">Terms of Use</Link>
          <Link to="/" className="hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};
