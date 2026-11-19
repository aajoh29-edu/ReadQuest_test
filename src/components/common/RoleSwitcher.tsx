import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  ChevronDown,
  Check,
  User,
  GraduationCap,
  Sparkles,
  Info,
} from 'lucide-react';
import { DemoRole } from '../../types';
import { questRepository } from '../../services/repository';

interface RoleSwitcherProps {
  currentRole: DemoRole;
  onRoleChanged: (newRole: DemoRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const roleMeta = {
    child: {
      label: 'Child Mode',
      persona: 'Leo Vance (1st Grade)',
      icon: '🦊',
      badgeColor: 'bg-[#8274D8] text-white',
      route: '/dashboard',
    },
    parent: {
      label: 'Parent Portal',
      persona: 'Eleanor Vance (2 Children)',
      icon: '👨‍👩‍👧',
      badgeColor: 'bg-[#FFC38E] text-[#171B37]',
      route: '/parent',
    },
    teacher: {
      label: 'Teacher Portal',
      persona: 'Ms. Clara Martinez (Room 104)',
      icon: '👩‍🏫',
      badgeColor: 'bg-[#DDF1E8] text-[#171B37]',
      route: '/teacher',
    },
  };

  const handleSelectRole = (role: DemoRole) => {
    questRepository.setActiveRole(role);
    onRoleChanged(role);
    setIsOpen(false);

    // Route to appropriate view if switching between portals
    if (role === 'child' && (location.pathname === '/parent' || location.pathname === '/teacher')) {
      navigate('/dashboard');
    } else if (role === 'parent' && location.pathname !== '/parent') {
      navigate('/parent');
    } else if (role === 'teacher' && location.pathname !== '/teacher') {
      navigate('/teacher');
    }
  };

  const currentMeta = roleMeta[currentRole];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-[#F2EEFF] border-2 border-[#DED5FF] px-2.5 sm:px-3 py-1.5 rounded-2xl shadow-xs transition-all cursor-pointer group focus-visible:outline-3 focus-visible:outline-[#8274D8]"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Demo Role: ${currentMeta.label}. Click to switch view.`}
      >
        <span className="text-base select-none" role="img" aria-hidden="true">
          {currentMeta.icon}
        </span>
        <div className="text-left hidden sm:block">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#8274D8] leading-none">
            Demo Persona
          </div>
          <div className="text-xs font-black text-[#171B37] leading-tight">
            {currentMeta.label}
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#6B6E8A] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-xl border-2 border-[#DED5FF] p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header / Disclaimer Notice */}
            <div className="bg-[#F2EEFF] rounded-2xl p-2.5 mb-2.5 border border-[#DED5FF]">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#8274D8] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#34364B] leading-snug">
                  <span className="font-extrabold text-[#171B37]">Demo Mode Notice:</span> Switch
                  personas to evaluate all stakeholder workflows.
                  <button
                    onClick={() => setShowDisclaimer(!showDisclaimer)}
                    className="ml-1 text-[#8274D8] underline font-bold hover:text-[#171B37] cursor-pointer inline-flex items-center gap-0.5"
                  >
                    Auth info
                  </button>
                </div>
              </div>

              {showDisclaimer && (
                <div className="mt-2 pt-2 border-t border-[#DED5FF] text-[10px] text-[#6B6E8A] leading-relaxed">
                  ⚠️ <strong>Demo role switching is not authentication.</strong> Production access
                  controls, student data privacy (FERPA), and permissions are enforced by the
                  FastAPI backend service and JWT/RBAC claims.
                </div>
              )}
            </div>

            {/* Role Options */}
            <div className="space-y-1.5" role="none">
              {/* 1. Child Role */}
              <button
                role="menuitem"
                onClick={() => handleSelectRole('child')}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                  currentRole === 'child'
                    ? 'bg-[#F2EEFF] border-2 border-[#8274D8]'
                    : 'hover:bg-[#F2EEFF]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#8274D8]/20 flex items-center justify-center text-lg select-none">
                    🦊
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#171B37]">Child Experience</div>
                    <div className="text-[11px] text-[#6B6E8A]">Leo Vance · Quests & Lessons</div>
                  </div>
                </div>
                {currentRole === 'child' && (
                  <Check className="w-4 h-4 text-[#8274D8] stroke-[3]" />
                )}
              </button>

              {/* 2. Parent Role */}
              <button
                role="menuitem"
                onClick={() => handleSelectRole('parent')}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                  currentRole === 'parent'
                    ? 'bg-[#FFF3E8] border-2 border-[#FFC38E]'
                    : 'hover:bg-[#FFF3E8]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFC38E]/30 flex items-center justify-center text-lg select-none">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#171B37]">Parent Portal</div>
                    <div className="text-[11px] text-[#6B6E8A]">Eleanor Vance · Leo & Maya</div>
                  </div>
                </div>
                {currentRole === 'parent' && (
                  <Check className="w-4 h-4 text-[#171B37] stroke-[3]" />
                )}
              </button>

              {/* 3. Teacher Role */}
              <button
                role="menuitem"
                onClick={() => handleSelectRole('teacher')}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                  currentRole === 'teacher'
                    ? 'bg-[#EAF5F7] border-2 border-[#34D399]'
                    : 'hover:bg-[#EAF5F7]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DDF1E8] flex items-center justify-center text-lg select-none">
                    👩‍🏫
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#171B37]">Teacher Portal</div>
                    <div className="text-[11px] text-[#6B6E8A]">
                      Ms. Clara Martinez · 6 Students
                    </div>
                  </div>
                </div>
                {currentRole === 'teacher' && (
                  <Check className="w-4 h-4 text-[#10B981] stroke-[3]" />
                )}
              </button>
            </div>

            {/* Quick footer note */}
            <div className="mt-2.5 pt-2 border-t border-[#DED5FF] px-1 flex items-center justify-between text-[10px] text-[#6B6E8A]">
              <span>Shared Real-Time Repository</span>
              <span className="font-extrabold text-[#8274D8]">COSC 512</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
