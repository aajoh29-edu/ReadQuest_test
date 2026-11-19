import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Check,
  UserCog,
  Heart,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { DemoRole, Learner, LearnerProfile } from '../../types';
import { questRepository } from '../../services/repository';
import {
  ReadQuestLogoMark,
  QuestIcon,
  LibraryIcon,
  ProgressIcon,
  ProfileAvatarFrame,
  RewardStarIcon,
} from '../icons/ReadQuestIcons';

interface NavbarProps {
  profile: LearnerProfile | null;
  currentRole: DemoRole;
  onRoleChanged: (role: DemoRole) => void;
  onOpenProfileModal?: () => void;
  onRefreshProfile?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  currentRole,
  onRoleChanged,
  onOpenProfileModal,
  onRefreshProfile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoLearners, setDemoLearners] = useState<Learner[]>([]);

  useEffect(() => {
    questRepository.getAllLearners().then((list) => {
      // Feature primary family learners cleanly in quick-switch menu
      setDemoLearners(list.slice(0, 4));
    });
  }, [profile?.id]);

  const childNavLinks = [
    { to: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { to: '/library', label: 'Library', kind: 'library' as const },
    { to: '/progress', label: 'Progress', kind: 'progress' as const },
  ];

  const parentNavLinks = [
    { to: '/parent', label: 'Parent Portal', kind: 'parent' as const },
    { to: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { to: '/library', label: 'Library', kind: 'library' as const },
    { to: '/progress', label: 'Progress', kind: 'progress' as const },
  ];

  const teacherNavLinks = [
    { to: '/teacher', label: 'Classroom', kind: 'teacher' as const },
    { to: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { to: '/library', label: 'Library', kind: 'library' as const },
    { to: '/progress', label: 'Progress', kind: 'progress' as const },
  ];

  const currentNavLinks =
    currentRole === 'parent'
      ? parentNavLinks
      : currentRole === 'teacher'
      ? teacherNavLinks
      : childNavLinks;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleSelectLearner = async (learnerId: string) => {
    await questRepository.selectActiveLearner(learnerId);
    questRepository.setActiveRole('child', { learnerId });
    onRoleChanged('child');
    if (onRefreshProfile) {
      await onRefreshProfile();
    }
    setMenuOpen(false);
  };

  const handleSelectPortalRole = (role: DemoRole, targetPath: string) => {
    questRepository.setActiveRole(role);
    onRoleChanged(role);
    setMenuOpen(false);
    navigate(targetPath);
  };

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Explorer';

  const renderNavIcon = (
    kind: 'quests' | 'library' | 'progress' | 'parent' | 'teacher',
    active: boolean
  ) => {
    switch (kind) {
      case 'quests':
        return <QuestIcon size={22} active={active} className="shrink-0" />;
      case 'library':
        return <LibraryIcon size={22} active={active} className="shrink-0" />;
      case 'progress':
        return <ProgressIcon size={22} active={active} className="shrink-0" />;
      case 'parent':
        return <Heart className="w-4 h-4 text-[#C25E28] shrink-0" />;
      case 'teacher':
        return <GraduationCap className="w-4 h-4 text-[#189B73] shrink-0" />;
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#EEE9FF] sticky top-0 z-30">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Custom ReadQuest Storybook Brand Mark & Wordmark */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 group focus-visible:outline-3 focus-visible:outline-[#7C65E8] rounded-xl whitespace-nowrap shrink-0"
          aria-label="ReadQuest Landing Home"
        >
          <ReadQuestLogoMark
            size={36}
            className="transition-transform duration-200 group-hover:scale-105 shrink-0"
          />
          <span className="text-xl font-black tracking-tight text-[#171B3A]">
            Read<span className="text-[#7C65E8]">Quest</span>
          </span>
        </Link>

        {/* Zone 2: Clean Desktop Navigation Links with Custom Icons & Active Underline */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7"
        >
          {currentNavLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex items-center gap-2 py-2 text-sm font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-[#5843C4]'
                    : 'text-[#34364B] hover:text-[#7C65E8]'
                }`}
              >
                {renderNavIcon(link.kind, active)}
                <span>{link.label}</span>
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-[1px] h-[3px] rounded-full bg-[#7C65E8]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Child Persona Selector Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={`Active persona: ${firstName}, ${profile?.starsEarned ?? 0} stars. Open persona switcher`}
            className="inline-flex items-center gap-2 bg-[#FAF9FF] hover:bg-[#EEE9FF] border border-[#DED5FF] px-3 py-1.5 min-h-[44px] rounded-2xl transition-all duration-150 hover:border-[#7C65E8]/60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-3 focus-visible:outline-[#7C65E8]"
          >
            <ProfileAvatarFrame
              avatar={
                currentRole === 'parent'
                  ? '👨‍👩‍👧'
                  : currentRole === 'teacher'
                  ? '👩‍🏫'
                  : profile?.avatar || '🦊'
              }
              avatarName={profile?.avatarName || 'Explorer'}
              size={28}
              active={menuOpen}
            />
            <span className="text-xs sm:text-sm font-black text-[#171B3A]">
              {currentRole === 'parent'
                ? 'Parent'
                : currentRole === 'teacher'
                ? 'Teacher'
                : firstName}
            </span>
            {currentRole === 'child' && profile && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 pl-1.5 border-l border-[#DED5FF] tabular-nums">
                <RewardStarIcon size={16} />
                {profile.starsEarned}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#5C5E7B] transition-transform duration-150 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Persona Switcher Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="Persona and role selector"
                className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-xl border border-[#DED5FF] p-3 z-50 space-y-3 motion-safe:animate-[menu-pop_0.16s_cubic-bezier(0.16,1,0.3,1)] origin-top-right"
              >
                {/* Child Profiles Section */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#5C5E7B]">
                    Child Profiles
                  </div>
                  {demoLearners.map((learner) => {
                    const isCurrent =
                      currentRole === 'child' && profile?.id === learner.id;
                    return (
                      <button
                        key={learner.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelectLearner(learner.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-2xl text-left transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#EEE9FF] text-[#171B3A]'
                            : 'hover:bg-[#FAF9FF] text-[#34364B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProfileAvatarFrame
                            avatar={learner.avatar}
                            avatarName={learner.avatarName}
                            size={30}
                            active={isCurrent}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-[#171B3A] truncate">
                              {learner.name}
                            </div>
                            <div className="text-[11px] font-semibold text-[#5C5E7B] tabular-nums">
                              {learner.starsEarned} stars · {learner.readingLevelId.replace('-', ' ')}
                            </div>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-[#7C65E8] shrink-0" />}
                      </button>
                    );
                  })}

                  {onOpenProfileModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenProfileModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-2xl text-xs font-extrabold text-[#5843C4] hover:bg-[#FAF9FF] transition-colors cursor-pointer"
                    >
                      <UserCog className="w-4 h-4" />
                      <span>Customize Avatar & Name</span>
                    </button>
                  )}
                </div>

                {/* Adult Portals Section */}
                <div className="pt-2 border-t border-[#EEE9FF] space-y-1">
                  <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#5C5E7B]">
                    Family & Educator Views
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelectPortalRole('parent', '/parent')}
                    className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-2xl text-left transition-colors cursor-pointer ${
                      currentRole === 'parent'
                        ? 'bg-[#FFF5EE] text-[#171B3A]'
                        : 'hover:bg-[#FAF9FF] text-[#34364B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className="w-4 h-4 text-[#C25E28]" />
                      <div>
                        <div className="text-xs font-black text-[#171B3A]">Parent Insights</div>
                        <div className="text-[11px] text-[#5C5E7B]">Eleanor Vance · Family Progress</div>
                      </div>
                    </div>
                    {currentRole === 'parent' && <Check className="w-4 h-4 text-[#C25E28]" />}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelectPortalRole('teacher', '/teacher')}
                    className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-2xl text-left transition-colors cursor-pointer ${
                      currentRole === 'teacher'
                        ? 'bg-[#E3F9F1] text-[#171B3A]'
                        : 'hover:bg-[#FAF9FF] text-[#34364B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-[#189B73]" />
                      <div>
                        <div className="text-xs font-black text-[#171B3A]">Teacher Classroom</div>
                        <div className="text-[11px] text-[#5C5E7B]">Ms. Clara Martinez · Room 104</div>
                      </div>
                    </div>
                    {currentRole === 'teacher' && <Check className="w-4 h-4 text-[#189B73]" />}
                  </button>
                </div>

                {/* Demo Disclaimer */}
                <div className="bg-[#FAF9FF] rounded-2xl p-2.5 border border-[#EEE9FF] flex items-start gap-2 text-[10px] text-[#5C5E7B] leading-snug">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#7C65E8] shrink-0 mt-0.5" />
                  <span>
                    Demo persona switcher is not authentication; backend enforces access policies.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
