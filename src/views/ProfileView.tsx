import React, { useState, useEffect } from 'react';
import { Star, Flame, Award, Check } from 'lucide-react';
import { questRepository } from '../services/repository';
import { LearnerProfile } from '../types';
import { AVAILABLE_AVATARS } from '../services/data/syntheticData';
import { Button } from '../components/common/Button';

interface ProfileViewProps {
  onRefreshGlobalProfile: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onRefreshGlobalProfile,
}) => {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [selectedAvatarName, setSelectedAvatarName] = useState('Fox Scout');
  const [gradeLevel, setGradeLevel] = useState('1st Grade');
  const [readingLevelId, setReadingLevelId] = useState<'level-1' | 'level-2' | 'level-3'>('level-1');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    questRepository.getLearnerProfile().then((p) => {
      setProfile(p);
      setName(p.name);
      setSelectedAvatar(p.avatar);
      setSelectedAvatarName(p.avatarName);
      setGradeLevel(p.gradeLevel);
      if (p.readingLevelId) {
        setReadingLevelId(p.readingLevelId);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await questRepository.updateLearnerProfile({
        name: name.trim() || 'Young Explorer',
        avatar: selectedAvatar,
        avatarName: selectedAvatarName,
        gradeLevel,
        readingLevelId,
      });
      setProfile(updated);
      await onRefreshGlobalProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-[#8274D8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 md:pb-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#171B37] tracking-tight">
          Explorer Profile
        </h1>
        <p className="text-sm font-semibold text-[#6B6E8A]">
          Customize your reading character, reading level, and learning preferences.
        </p>
      </div>

      {/* Main Profile Settings Card */}
      <div className="bg-white border-2 border-[#DED5FF] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#EAF5F7]">
          <div className="w-20 h-20 rounded-3xl bg-[#F2EEFF] border-3 border-[#DED5FF] flex items-center justify-center text-5xl shadow-sm">
            {selectedAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-[#F2EEFF] text-[#8274D8] px-2.5 py-0.5 rounded-full">
                {selectedAvatarName}
              </span>
              <span className="text-xs font-bold text-[#6B6E8A]">
                {gradeLevel}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#171B37] mt-1">
              {name || 'Young Explorer'}
            </h2>
            <div className="flex items-center gap-3 text-xs font-bold text-[#6B6E8A] mt-1">
              <span className="flex items-center gap-1 text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {profile.starsEarned} Stars
              </span>
              <span className="flex items-center gap-1 text-orange-600">
                <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-500" />
                {profile.currentStreakDays} Day Streak
              </span>
              <span className="flex items-center gap-1 text-purple-600">
                <Award className="w-3.5 h-3.5 text-[#8274D8]" />
                {profile.badges.length} Badges
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-bold text-[#171B37] mb-2">
              Explorer Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              className="w-full px-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#8274D8] focus:outline-hidden text-lg font-bold text-[#171B37]"
            />
          </div>

          <div>
            <span className="block text-sm font-bold text-[#171B37] mb-2.5">
              Choose Avatar Companion
            </span>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {AVAILABLE_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.emoji);
                    setSelectedAvatarName(av.name);
                  }}
                  className={`p-3 rounded-2xl border-3 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === av.emoji
                      ? 'border-[#8274D8] bg-[#F2EEFF] scale-105 shadow-sm'
                      : 'border-transparent bg-[#EAF5F7] hover:bg-[#DED5FF]/40'
                  }`}
                >
                  <span className="text-3xl" role="img" aria-label={av.name}>
                    {av.emoji}
                  </span>
                  <span className="text-[11px] font-black text-[#171B37] mt-1 truncate max-w-full">
                    {av.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reading-level-select" className="block text-sm font-bold text-[#171B37] mb-2">
                Configurable Reading Level
              </label>
              <select
                id="reading-level-select"
                value={readingLevelId}
                onChange={(e) => setReadingLevelId(e.target.value as any)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#8274D8] focus:outline-hidden font-bold text-[#171B37] bg-white cursor-pointer"
              >
                <option value="level-1">Level 1 · Seedling (Foundational)</option>
                <option value="level-2">Level 2 · Sprout (Growing Reader)</option>
                <option value="level-3">Level 3 · Bloom (Confident Reader)</option>
              </select>
              <span className="text-[11px] text-[#6B6E8A] mt-1 block">
                Independent of school grade
              </span>
            </div>

            <div>
              <label htmlFor="grade-select" className="block text-sm font-bold text-[#171B37] mb-2">
                School Grade Level (Context)
              </label>
              <select
                id="grade-select"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#DED5FF] focus:border-[#8274D8] focus:outline-hidden font-bold text-[#171B37] bg-white cursor-pointer"
              >
                <option value="Early Kindergarten">Early Kindergarten (Ages 4-5)</option>
                <option value="Kindergarten">Kindergarten (Ages 5-6)</option>
                <option value="1st Grade">1st Grade (Ages 6-7)</option>
                <option value="2nd Grade">2nd Grade (Ages 7-8)</option>
                <option value="3rd Grade">3rd Grade (Ages 8-9)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#EAF5F7]">
            {saveSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full">
                <Check className="w-4 h-4" />
                Profile saved successfully!
              </span>
            ) : (
              <span className="text-xs text-[#6B6E8A]">
                Changes take effect across all quest activities immediately.
              </span>
            )}

            <Button
              type="submit"
              variant="peach"
              size="md"
              isLoading={isSaving}
              className="shadow-sm"
            >
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
