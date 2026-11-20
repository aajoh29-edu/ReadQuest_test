import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AVAILABLE_AVATARS } from '../services/data/syntheticCurriculum';
import { ReadingLevelId } from '../types';
import {
  evaluatePasswordStrength,
  sanitizeErrorMessage,
  validateDisplayName,
} from '../utils/security';
import { AdventureButton, SecondaryButton } from '../components/common/ReadQuestButtons';
import { ProfileAvatarFrame } from '../components/icons/ReadQuestIcons';

export const AccountSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    childProfiles,
    activeChild,
    logout,
    selectChildProfile,
    createChildProfile,
    updateChildProfile,
    deleteChildProfile,
  } = useAuth();

  // Add / Edit Child Profile state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAvatar, setNewChildAvatar] = useState(AVAILABLE_AVATARS[0]);
  const [newChildLevel, setNewChildLevel] = useState<ReadingLevelId>('level-1');
  const [newChildGrade, setNewChildGrade] = useState('1st Grade');
  const [childError, setChildError] = useState<string | null>(null);
  const [childSuccess, setChildSuccess] = useState<string | null>(null);
  const [isSavingChild, setIsSavingChild] = useState(false);

  // Edit active child state
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildLevel, setEditChildLevel] = useState<ReadingLevelId>('level-1');

  // Re-auth delete child state
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [deleteChildPassword, setDeleteChildPassword] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Resend verification banner
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);

  if (!user) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleResendVerification = async () => {
    try {
      const res = await authService.resendVerificationEmail(user.email);
      setVerificationMsg(res.message || 'Verification link sent to your email.');
    } catch (err) {
      setVerificationMsg(sanitizeErrorMessage(err));
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setChildError(null);
    setChildSuccess(null);

    const check = validateDisplayName(newChildName, 2, 24, 'Child nickname');
    if (!check.valid) {
      setChildError(check.error || 'Please enter a valid nickname.');
      return;
    }

    setIsSavingChild(true);
    try {
      await createChildProfile({
        displayName: check.normalized,
        avatar: newChildAvatar.emoji,
        avatarName: newChildAvatar.name,
        readingLevelId: newChildLevel,
        ageBandOrGrade: newChildGrade,
      });
      setNewChildName('');
      setShowAddChild(false);
      setChildSuccess('Child reader profile added!');
    } catch (err) {
      setChildError(sanitizeErrorMessage(err));
    } finally {
      setIsSavingChild(false);
    }
  };

  const handleSaveEditChild = async (childId: string) => {
    setChildError(null);
    setChildSuccess(null);
    const check = validateDisplayName(editChildName, 2, 24, 'Child nickname');
    if (!check.valid) {
      setChildError(check.error || 'Invalid nickname.');
      return;
    }

    setIsSavingChild(true);
    try {
      await updateChildProfile(childId, {
        displayName: check.normalized,
        readingLevelId: editChildLevel,
      });
      setEditingChildId(null);
      setChildSuccess('Child profile updated.');
    } catch (err) {
      setChildError(sanitizeErrorMessage(err));
    } finally {
      setIsSavingChild(false);
    }
  };

  const handleConfirmDeleteChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingChildId) return;
    setChildError(null);
    setIsSavingChild(true);
    try {
      await deleteChildProfile(deletingChildId, deleteChildPassword);
      setDeletingChildId(null);
      setDeleteChildPassword('');
      setChildSuccess('Child profile removed.');
    } catch (err) {
      setChildError(sanitizeErrorMessage(err));
    } finally {
      setIsSavingChild(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError('Please enter your current password.');
      return;
    }
    if (!strength.isValid) {
      setPwError(`New password must include: ${strength.unmetRequirements.join(', ')}.`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setIsUpdatingPw(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwSuccess(res.message || 'Password updated successfully.');
    } catch (err) {
      setPwError(sanitizeErrorMessage(err));
    } finally {
      setIsUpdatingPw(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);
    setIsDeletingAccount(true);
    try {
      await authService.requestAccountDeletion(deleteAccountPassword);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteAccountError(sanitizeErrorMessage(err));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DED5FF] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#5843C4] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#189B73]" />
            <span>Account & Family Controls</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#171B3A]">
            Account Settings
          </h1>
        </div>

        <SecondaryButton
          size="sm"
          onClick={handleSignOut}
          icon={<LogOut className="w-4 h-4" />}
        >
          Sign Out
        </SecondaryButton>
      </div>

      {/* Email Verification Warning if unverified */}
      {!user.emailVerified && (
        <div className="bg-[#FFF3E8] border border-[#FFC38E] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-[#9A3412] space-y-0.5">
            <div className="font-black text-sm">Verify Your Email Address</div>
            <p>
              Please confirm <span className="underline">{user.email}</span> so you can recover your account and manage child profiles safely.
            </p>
            {verificationMsg && <p className="text-[#189B73] font-black">{verificationMsg}</p>}
          </div>
          <AdventureButton size="sm" onClick={handleResendVerification}>
            Resend Link
          </AdventureButton>
        </div>
      )}

      {/* Account Summary Card */}
      <section className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 shadow-xs space-y-3">
        <h2 className="text-lg font-black text-[#171B3A] flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#7C65E8]" />
          <span>Signed-In Account</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-sm">
          <div>
            <span className="text-xs font-bold text-[#5C5E7B] block">Account Holder</span>
            <span className="font-black text-[#171B3A]">{user.fullName}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-[#5C5E7B] block">Email</span>
            <span className="font-black text-[#171B3A]">{user.email}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-[#5C5E7B] block">Role & Status</span>
            <span className="font-black text-[#171B3A] capitalize">{user.role}</span>{' '}
            <span
              className={`ml-1.5 text-[11px] font-black px-2 py-0.5 rounded-full ${
                user.emailVerified
                  ? 'bg-[#E3F9F1] text-[#189B73]'
                  : 'bg-[#FFF3E8] text-[#9A3412]'
              }`}
            >
              {user.emailVerified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>
      </section>

      {/* Parent-Managed Child Profiles */}
      <section className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#171B3A] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#7C65E8]" />
              <span>Child Reader Profiles</span>
            </h2>
            <p className="text-xs font-semibold text-[#5C5E7B]">
              Create safe, parent-managed nicknames and avatars for each young reader.
            </p>
          </div>
          <AdventureButton
            size="sm"
            onClick={() => setShowAddChild((v) => !v)}
            icon={<Plus className="w-4 h-4" />}
          >
            {showAddChild ? 'Close Form' : 'Add Child Profile'}
          </AdventureButton>
        </div>

        {childError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{childError}</span>
          </div>
        )}
        {childSuccess && (
          <div className="bg-[#E3F9F1] border border-[#65D7B2] text-[#189B73] rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{childSuccess}</span>
          </div>
        )}

        {showAddChild && (
          <form
            onSubmit={handleCreateChild}
            className="bg-[#FAF9FF] border border-[#DED5FF] rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-[#171B3A] mb-1">
                  Child Nickname (No Email)
                </label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  maxLength={24}
                  required
                  placeholder="e.g. Reader Nickname"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] bg-white text-sm font-bold text-[#171B3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#171B3A] mb-1">
                  Starting Reading Level
                </label>
                <select
                  value={newChildLevel}
                  onChange={(e) => setNewChildLevel(e.target.value as ReadingLevelId)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] bg-white text-xs font-bold text-[#171B3A]"
                >
                  <option value="level-1">Level 1 · Seedling</option>
                  <option value="level-2">Level 2 · Sprout</option>
                  <option value="level-3">Level 3 · Bloom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#171B3A] mb-1">
                  Age Band / Grade
                </label>
                <select
                  value={newChildGrade}
                  onChange={(e) => setNewChildGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] bg-white text-xs font-bold text-[#171B3A]"
                >
                  <option value="Early Kindergarten">Ages 4–5</option>
                  <option value="Kindergarten">Kindergarten (Ages 5–6)</option>
                  <option value="1st Grade">1st Grade (Ages 6–7)</option>
                  <option value="2nd Grade">2nd Grade (Ages 7–8)</option>
                  <option value="3rd Grade">3rd Grade (Ages 8–9)</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-black text-[#171B3A] mb-1.5">
                Choose Reading Companion Avatar
              </span>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setNewChildAvatar(av)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-2 cursor-pointer ${
                      newChildAvatar.id === av.id
                        ? 'border-[#7C65E8] bg-[#EEE9FF] text-[#171B3A]'
                        : 'border-[#DED5FF] bg-white text-[#5C5E7B]'
                    }`}
                  >
                    <span className="text-lg">{av.emoji}</span>
                    <span>{av.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <SecondaryButton size="sm" type="button" onClick={() => setShowAddChild(false)}>
                Cancel
              </SecondaryButton>
              <AdventureButton size="sm" type="submit" isLoading={isSavingChild}>
                Save Child Profile
              </AdventureButton>
            </div>
          </form>
        )}

        {childProfiles.length === 0 ? (
          <div className="bg-[#FAF9FF] border border-[#EEE9FF] rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm font-black text-[#171B3A]">No child profiles yet</p>
            <p className="text-xs font-semibold text-[#5C5E7B]">
              Add a child reader profile above to start personalized reading quests and mastery tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {childProfiles.map((child) => {
              const isSelected = activeChild?.id === child.id;
              const isEditing = editingChildId === child.id;
              const isDeleting = deletingChildId === child.id;

              return (
                <div
                  key={child.id}
                  className={`p-4 rounded-2xl border-2 transition-colors ${
                    isSelected ? 'border-[#7C65E8] bg-[#FAF9FF]' : 'border-[#EEE9FF] bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProfileAvatarFrame
                        avatar={child.avatar}
                        avatarName={child.avatarName}
                        size={40}
                        active={isSelected}
                      />
                      <div>
                        <div className="text-sm font-black text-[#171B3A]">
                          {child.name}
                          {isSelected && (
                            <span className="ml-2 text-[10px] font-black uppercase bg-[#EEE9FF] text-[#5843C4] px-2 py-0.5 rounded-full">
                              Active Reader
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-[#5C5E7B]">
                          {child.gradeLevel} · {child.readingLevelId} · {child.starsEarned} stars
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isSelected && (
                        <SecondaryButton size="sm" onClick={() => selectChildProfile(child.id)}>
                          Set Active
                        </SecondaryButton>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingChildId(isEditing ? null : child.id);
                          setEditChildName(child.name);
                          setEditChildLevel(child.readingLevelId);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[#DED5FF] text-xs font-extrabold text-[#171B3A] hover:bg-[#EEE9FF] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingChildId(isDeleting ? null : child.id);
                          setDeleteChildPassword('');
                        }}
                        className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                        aria-label={`Remove ${child.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-[#EEE9FF] grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-[11px] font-black text-[#171B3A] mb-1">
                          Nickname
                        </label>
                        <input
                          type="text"
                          value={editChildName}
                          onChange={(e) => setEditChildName(e.target.value)}
                          maxLength={24}
                          className="w-full px-3 py-2 rounded-xl border border-[#DED5FF] text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-[#171B3A] mb-1">
                          Reading Level
                        </label>
                        <select
                          value={editChildLevel}
                          onChange={(e) => setEditChildLevel(e.target.value as ReadingLevelId)}
                          className="w-full px-3 py-2 rounded-xl border border-[#DED5FF] text-xs font-bold bg-white"
                        >
                          <option value="level-1">Level 1 · Seedling</option>
                          <option value="level-2">Level 2 · Sprout</option>
                          <option value="level-3">Level 3 · Bloom</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <AdventureButton
                          size="sm"
                          isLoading={isSavingChild}
                          onClick={() => handleSaveEditChild(child.id)}
                        >
                          Save
                        </AdventureButton>
                        <SecondaryButton size="sm" onClick={() => setEditingChildId(null)}>
                          Cancel
                        </SecondaryButton>
                      </div>
                    </div>
                  )}

                  {isDeleting && (
                    <form
                      onSubmit={handleConfirmDeleteChild}
                      className="mt-3 pt-3 border-t border-rose-200 space-y-2"
                    >
                      <p className="text-xs font-bold text-rose-800">
                        Enter your parent account password to permanently remove {child.name}’s profile and reading history.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="password"
                          value={deleteChildPassword}
                          onChange={(e) => setDeleteChildPassword(e.target.value)}
                          required
                          placeholder="Confirm parent password"
                          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-rose-300 text-xs font-bold"
                        />
                        <button
                          type="submit"
                          disabled={isSavingChild}
                          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm Remove
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Security: Change Password */}
      <section className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-black text-[#171B3A] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#7C65E8]" />
          <span>Update Password</span>
        </h2>

        {pwError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs font-bold">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="bg-[#E3F9F1] border border-[#65D7B2] text-[#189B73] rounded-2xl p-3 text-xs font-bold">
            {pwSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="acct-curr-pw" className="block text-xs font-black text-[#171B3A] mb-1">
              Current Password
            </label>
            <input
              id="acct-curr-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="acct-new-pw" className="block text-xs font-black text-[#171B3A] mb-1">
              New Password
            </label>
            <input
              id="acct-new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="acct-conf-pw" className="block text-xs font-black text-[#171B3A] mb-1">
              Confirm New Password
            </label>
            <input
              id="acct-conf-pw"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DED5FF] text-sm font-bold"
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] font-semibold text-[#5C5E7B]">
              Minimum 10 characters with uppercase, lowercase, number, and symbol.
            </span>
            <AdventureButton type="submit" size="sm" isLoading={isUpdatingPw}>
              Change Password
            </AdventureButton>
          </div>
        </form>
      </section>

      {/* Account Deletion */}
      <section className="bg-white border-2 border-rose-200 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-rose-900">Delete Parent Account</h2>
            <p className="text-xs font-semibold text-[#5C5E7B]">
              Permanently remove your account, linked child profiles, and stored learning records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteAccount((v) => !v)}
            className="px-3.5 py-2 rounded-xl border border-rose-300 text-xs font-black text-rose-800 hover:bg-rose-50 cursor-pointer"
          >
            {showDeleteAccount ? 'Cancel' : 'Delete Account...'}
          </button>
        </div>

        {showDeleteAccount && (
          <form onSubmit={handleDeleteAccount} className="pt-2 space-y-3">
            {deleteAccountError && (
              <p className="text-xs font-bold text-rose-700">{deleteAccountError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                value={deleteAccountPassword}
                onChange={(e) => setDeleteAccountPassword(e.target.value)}
                required
                placeholder="Confirm your password to delete account"
                className="flex-1 min-w-[220px] px-3.5 py-2.5 rounded-xl border border-rose-300 text-xs font-bold"
              />
              <button
                type="submit"
                disabled={isDeletingAccount}
                className="px-4 py-2.5 rounded-xl bg-rose-700 text-white text-xs font-black hover:bg-rose-800 cursor-pointer"
              >
                {isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
