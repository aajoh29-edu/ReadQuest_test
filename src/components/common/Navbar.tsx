import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Check,
  UserCog,
  Heart,
  GraduationCap,
  LogOut,
  Settings,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ReadQuestLogoMark,
  QuestIcon,
  LibraryIcon,
  ProgressIcon,
  ProfileAvatarFrame,
  RewardStarIcon,
} from '../icons/ReadQuestIcons';
import { AdventureButton, SecondaryButton } from './ReadQuestButtons';

interface NavbarProps {
  onOpenProfileModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfileModal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, user, childProfiles, activeChild, selectChildProfile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const publicNavLinks = [
    { to: '/', label: 'Home', kind: 'quests' as const },
    { to: '/library', label: 'Library', kind: 'library' as const },
    { to: '/books', label: 'Books', kind: 'library' as const },
  ];

  const authenticatedNavLinks = [
    { to: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { to: '/library', label: 'Library', kind: 'library' as const },
    { to: '/books', label: 'Books', kind: 'library' as const },
    { to: '/progress', label: 'Progress', kind: 'progress' as const },
    ...(user?.role === 'parent' || user?.role === 'admin'
      ? [{ to: '/parent', label: 'Parent Portal', kind: 'parent' as const }]
      : []),
    ...(user?.role === 'teacher' || user?.role === 'admin'
      ? [{ to: '/teacher', label: 'Classroom', kind: 'teacher' as const }]
      : []),
  ];

  const currentNavLinks = isAuthenticated ? authenticatedNavLinks : publicNavLinks;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/welcome';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleSelectLearner = async (learnerId: string) => {
    await selectChildProfile(learnerId);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const displayName = activeChild?.name
    ? activeChild.name.split(' ')[0]
    : user?.fullName.split(' ')[0] || 'Account';

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
    <header className="bg-white/95 backdrop-blur-md border-b border-[#EEE9FF] sticky top-0 z-30 shadow-[0_2px_12px_-4px_rgba(23,27,58,0.05)]">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-[72px] flex items-center justify-between gap-4 sm:gap-8">
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

        {/* Zone 2: Clean Desktop Navigation Links */}
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
                  active ? 'text-[#5843C4]' : 'text-[#34364B] hover:text-[#7C65E8]'
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

        {/* Zone 3: Real Auth Controls (Sign In / Get Started OR Authenticated Account Menu) */}
        {!isAuthenticated ? (
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/login">
              <SecondaryButton size="sm">Sign In</SecondaryButton>
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex">
              <AdventureButton size="sm">Get Started</AdventureButton>
            </Link>
          </div>
        ) : (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={`Account menu for ${displayName}`}
              className="inline-flex items-center gap-2 bg-[#FAF9FF] hover:bg-[#EEE9FF] border border-[#DED5FF] px-3 py-1.5 min-h-[44px] rounded-2xl transition-all duration-150 hover:border-[#7C65E8]/60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-3 focus-visible:outline-[#7C65E8]"
            >
              <ProfileAvatarFrame
                avatar={activeChild?.avatar || '🦊'}
                avatarName={activeChild?.avatarName || 'Reader'}
                size={28}
                active={menuOpen}
              />
              <span className="text-xs sm:text-sm font-black text-[#171B3A]">
                {displayName}
              </span>
              {activeChild && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 pl-1.5 border-l border-[#DED5FF] tabular-nums">
                  <RewardStarIcon size={16} />
                  {activeChild.starsEarned}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[#5C5E7B] transition-transform duration-150 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  aria-label="Account and child reader profiles"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-xl border border-[#DED5FF] p-3 z-50 space-y-3 origin-top-right"
                >
                  {/* Signed-in account summary */}
                  <div className="px-2.5 py-2 rounded-2xl bg-[#FAF9FF] border border-[#EEE9FF]">
                    <div className="text-xs font-black text-[#171B3A] truncate">
                      {user?.fullName}
                    </div>
                    <div className="text-[11px] font-semibold text-[#5C5E7B] truncate">
                      {user?.email}
                    </div>
                  </div>

                  {/* Child Profiles Section */}
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#5C5E7B]">
                      Child Reader Profiles
                    </div>

                    {childProfiles.length === 0 ? (
                      <Link
                        to="/account"
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-extrabold text-[#5843C4] bg-[#EEE9FF]/60 hover:bg-[#EEE9FF]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add a child reader profile</span>
                      </Link>
                    ) : (
                      childProfiles.map((learner) => {
                        const isCurrent = activeChild?.id === learner.id;
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
                                  {learner.starsEarned} stars · {learner.readingLevelId}
                                </div>
                              </div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-[#7C65E8] shrink-0" />}
                          </button>
                        );
                      })
                    )}

                    {onOpenProfileModal && activeChild && (
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
                        <span>Customize Reader Avatar</span>
                      </button>
                    )}
                  </div>

                  {/* Account Management & Sign Out */}
                  <div className="pt-2 border-t border-[#EEE9FF] space-y-1">
                    <Link
                      to="/account"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-2xl text-xs font-extrabold text-[#171B3A] hover:bg-[#FAF9FF]"
                    >
                      <Settings className="w-4 h-4 text-[#5843C4]" />
                      <span>Account Settings & Children</span>
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-2xl text-xs font-extrabold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
