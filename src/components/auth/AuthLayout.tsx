import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ReadQuestLogoMark } from '../icons/ReadQuestIcons';
import { LANDING_ARTWORK, ResilientArtwork } from '../landing/ResilientArtwork';
import { ReadQuestMascot } from '../landing/ReadQuestMascot';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  mascotMessage?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  mascotMessage = 'Welcome! Families and grown-ups sign in here to keep reading progress safe.',
}) => {
  return (
    <div className="min-h-[calc(100vh-140px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Storybook Brand Column */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 self-start focus-visible:outline-3 focus-visible:outline-[#7C65E8] rounded-xl"
          >
            <ReadQuestLogoMark size={38} />
            <span className="text-2xl font-black tracking-tight text-[#171B3A]">
              Read<span className="text-[#7C65E8]">Quest</span>
            </span>
          </Link>

          <div className="rounded-[28px] overflow-hidden bg-white border border-[#DED5FF] shadow-lg shadow-[#7C65E8]/10 aspect-[4/3]">
            <ResilientArtwork
              src={LANDING_ARTWORK.hero}
              alt="ReadQuest storybook world illustration"
              fallbackTitle="ReadQuest Learning Adventures"
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>

          <ReadQuestMascot size="sm" mood="encouraging" message={mascotMessage} />

          <div className="bg-white/90 border border-[#E5E0FA] rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#189B73] shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-[#5C5E7B] leading-relaxed">
              Adult-managed family accounts protect young readers. Child nicknames and avatars stay private under your account controls.
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-white border-2 border-[#DED5FF] rounded-[28px] p-6 sm:p-8 shadow-md space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#171B3A] tracking-tight">
                {title}
              </h1>
              <p className="text-sm font-semibold text-[#5C5E7B]">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
