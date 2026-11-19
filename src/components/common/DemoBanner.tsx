import React, { useState } from 'react';
import { AlertCircle, RotateCcw, Check, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface DemoBannerProps {
  onResetDemo: () => Promise<void>;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onResetDemo }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onResetDemo();
      setResetSuccess(true);
      setShowConfirm(false);
      setTimeout(() => setResetSuccess(false), 2500);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <aside
      className="bg-[#EAF5F7] border-b border-[#DED5FF] text-xs sm:text-sm text-[#171B37] py-2 px-4 shadow-xs"
      aria-label="Demo environment notice"
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-black bg-[#8274D8] text-white px-2.5 py-0.5 rounded-full text-xs tracking-wider uppercase">
            <Sparkles className="w-3 h-3" />
            Demo Mode
          </span>
          <span className="font-extrabold text-[#171B37]">
            COSC 512 Project
          </span>
          <span className="hidden md:inline text-[#6B6E8A]">
            • Synthetic data stored locally via repository pattern (ready for FastAPI backend)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {resetSuccess ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs">
              <Check className="w-3.5 h-3.5" />
              Progress Reset!
            </span>
          ) : showConfirm ? (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-red-200 shadow-xs">
              <span className="text-xs text-red-600 font-semibold">Reset all progress?</span>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-0.5 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A2249] bg-white hover:bg-[#F5F2FB] px-3 py-1.5 rounded-full border border-[#D8CCE8] transition-colors cursor-pointer"
              title="Reset all demo session history and restore default state"
            >
              <RotateCcw className="w-3 h-3 text-[#7C3AED]" />
              <span>Reset Demo Progress</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
