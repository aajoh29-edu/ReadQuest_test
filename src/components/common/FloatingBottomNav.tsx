import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  QuestIcon,
  LibraryIcon,
  ProgressIcon,
  ProfileAvatarFrame,
} from '../icons/ReadQuestIcons';

export const FloatingBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, activeChild } = useAuth();

  if (location.pathname.startsWith('/activity')) {
    return null;
  }

  const isAuthenticated = status === 'authenticated';

  if (!isAuthenticated) {
    const publicItems = [
      { path: '/', label: 'Home', kind: 'home' as const },
      { path: '/library', label: 'Library', kind: 'library' as const },
      { path: '/login', label: 'Sign In', kind: 'login' as const },
      { path: '/signup', label: 'Sign Up', kind: 'signup' as const },
    ];

    return (
      <nav
        className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-sm"
        aria-label="Mobile bottom navigation"
      >
        <div className="bg-[#171B3A] text-white px-2 py-1.5 rounded-3xl shadow-xl shadow-[#171B3A]/25 grid grid-cols-4 gap-1 border border-white/10">
          {publicItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[48px] px-2 py-1.5 rounded-2xl text-[11px] font-extrabold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#7C65E8] text-white shadow-xs'
                    : 'text-[#DED5FF] hover:text-white hover:bg-white/10'
                }`}
              >
                {item.kind === 'home' && <QuestIcon size={20} active={isActive} />}
                {item.kind === 'library' && <LibraryIcon size={20} active={isActive} />}
                {item.kind === 'login' && <LogIn className="w-5 h-5" />}
                {item.kind === 'signup' && <UserPlus className="w-5 h-5" />}
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const navItems = [
    { path: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { path: '/library', label: 'Library', kind: 'library' as const },
    { path: '/progress', label: 'Progress', kind: 'progress' as const },
    { path: '/account', label: 'Account', kind: 'account' as const },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-sm"
      aria-label="Mobile bottom navigation"
    >
      <div className="bg-[#171B3A] text-white px-2 py-1.5 rounded-3xl shadow-xl shadow-[#171B3A]/25 grid grid-cols-4 gap-1 border border-white/10">
        {navItems.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[48px] px-2 py-1.5 rounded-2xl text-[11px] font-extrabold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFD76A] ${
                isActive
                  ? 'bg-[#7C65E8] text-white shadow-xs'
                  : 'text-[#DED5FF] hover:text-white hover:bg-white/10'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.kind === 'quests' && <QuestIcon size={22} active={isActive} />}
              {item.kind === 'library' && <LibraryIcon size={22} active={isActive} />}
              {item.kind === 'progress' && <ProgressIcon size={22} active={isActive} />}
              {item.kind === 'account' &&
                (activeChild ? (
                  <ProfileAvatarFrame
                    avatar={activeChild.avatar}
                    avatarName={activeChild.avatarName}
                    size={22}
                    active={isActive}
                  />
                ) : (
                  <Settings className="w-5 h-5" />
                ))}
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
