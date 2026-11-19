import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { questRepository } from './services/repository';
import { DemoRole, LearnerProfile } from './types';
import { Navbar } from './components/common/Navbar';
import { DemoBanner } from './components/common/DemoBanner';
import { FloatingBottomNav } from './components/common/FloatingBottomNav';
import { ProfileModal } from './components/common/ProfileModal';
import { Footer } from './components/landing/Footer';
import { WelcomeView } from './views/WelcomeView';
import { DashboardView } from './views/DashboardView';
import { LibraryView } from './views/LibraryView';
import { ActivityPlayerView } from './views/ActivityPlayerView';
import { SessionSummaryView } from './views/SessionSummaryView';
import { ProgressView } from './views/ProgressView';
import { ProfileView } from './views/ProfileView';
import { ParentDashboardView } from './views/ParentDashboardView';
import { TeacherDashboardView } from './views/TeacherDashboardView';

export default function App() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<DemoRole>('child');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const refreshProfile = async () => {
    const current = await questRepository.getLearnerProfile();
    setProfile(current);
    const roleState = questRepository.getActiveRole();
    setCurrentRole(roleState.role);
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const handleResetDemo = async () => {
    await questRepository.resetDemoData();
    await refreshProfile();
    window.location.reload();
  };

  const handleSaveProfile = async (updates: Partial<LearnerProfile>) => {
    const updated = await questRepository.updateLearnerProfile(updates);
    setProfile(updated);
  };

  const handleRoleChanged = (newRole: DemoRole) => {
    setCurrentRole(newRole);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen readquest-bg flex flex-col text-[#34364B] selection:bg-[#FFAE80]/40 relative">
        {/* Top Demo Banner */}
        <DemoBanner onResetDemo={handleResetDemo} />

        {/* Global Navigation Header */}
        <Navbar
          profile={profile}
          currentRole={currentRole}
          onRoleChanged={handleRoleChanged}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onRefreshProfile={refreshProfile}
        />

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<WelcomeView profile={profile} />} />
            <Route path="/welcome" element={<WelcomeView profile={profile} />} />
            <Route
              path="/dashboard"
              element={
                <DashboardView
                  profile={profile}
                  onRefreshProfile={refreshProfile}
                  onOpenProfileModal={() => setIsProfileModalOpen(true)}
                />
              }
            />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/activity/:lessonId" element={<ActivityPlayerView />} />
            <Route path="/summary/:sessionId" element={<SessionSummaryView />} />
            <Route path="/progress" element={<ProgressView />} />
            <Route
              path="/profile"
              element={
                <ProfileView
                  onResetDemo={handleResetDemo}
                  onRefreshGlobalProfile={refreshProfile}
                />
              }
            />
            <Route path="/parent" element={<ParentDashboardView />} />
            <Route path="/teacher" element={<TeacherDashboardView />} />

            {/* Catch-all redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Floating Mobile Bottom Navigation Bar */}
        <FloatingBottomNav profile={profile} />

        {/* Redesigned ReadQuest Footer */}
        <Footer onResetDemo={handleResetDemo} />

        {/* Profile Customizer Modal */}
        {profile && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            profile={profile}
            onSaveProfile={handleSaveProfile}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
