import React, { useState } from 'react';
import { RotateCcw, Cpu } from 'lucide-react';
import { Button } from '../components/common/Button';
import { AdaptiveDiagnosticModal } from '../components/adaptive/AdaptiveDiagnosticModal';

interface DevToolsViewProps {
  onResetState: () => Promise<void>;
}

/**
 * Internal-only developer utilities (not linked in user-facing navigation).
 */
export const DevToolsView: React.FC<DevToolsViewProps> = ({ onResetState }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#171B3A]">Internal Developer Utilities</h1>
        <p className="text-sm font-semibold text-[#5C5E7B] mt-1">
          Non-public diagnostic verification and local state management tools.
        </p>
      </div>

      <div className="bg-white border border-[#DED5FF] rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 font-black text-[#171B3A]">
          <Cpu className="w-5 h-5 text-[#7C65E8]" />
          <span>Adaptive Mastery Verification</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDiagnostics(true)}>
          Open Adaptive Diagnostics
        </Button>
      </div>

      <div className="bg-white border border-[#DED5FF] rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 font-black text-[#171B3A]">
          <RotateCcw className="w-5 h-5 text-[#7C65E8]" />
          <span>Reset Local Application State</span>
        </div>
        <p className="text-xs font-medium text-[#5C5E7B]">
          Restores initial seeded profiles and clears local session history.
        </p>
        {showConfirm ? (
          <div className="flex items-center gap-3">
            <Button
              variant="peach"
              size="sm"
              onClick={async () => {
                await onResetState();
                setShowConfirm(false);
              }}
            >
              Confirm Full Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
            Reset Local Progress
          </Button>
        )}
      </div>

      <AdaptiveDiagnosticModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </div>
  );
};
