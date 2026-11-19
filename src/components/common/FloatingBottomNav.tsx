import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LearnerProfile } from '../../types';
import {
  QuestIcon,
  LibraryIcon,
  ProgressIcon,
  ProfileAvatarFrame,
} from '../icons/ReadQuestIcons';

interface FloatingBottomNavProps {
  profile?: LearnerProfile | null;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({ profile }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide during focused reading activity sessions
  if (location.pathname.startsWith('/activity')) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', label: 'Quests', kind: 'quests' as const },
    { path: '/library', label: 'Library', kind: 'library' as const },
    { path: '/progress', label: 'Progress', kind: 'progress' as const },
    { path: '/profile', label: 'Profile', kind: 'profile' as const },
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
              {item.kind === 'profile' && (
                <ProfileAvatarFrame
                  avatar={profile?.avatar || '🦊'}
                  avatarName={profile?.avatarName || 'Explorer'}
                  size={22}
                  active={isActive}
                />
              )}
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
