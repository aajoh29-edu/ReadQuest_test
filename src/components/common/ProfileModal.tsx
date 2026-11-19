import React, { useState } from 'react';
import { X, Check, Award, Star } from 'lucide-react';
import { LearnerProfile } from '../../types';
import { AVAILABLE_AVATARS } from '../../services/data/syntheticData';
import { Button } from './Button';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile;
  onSaveProfile: (updates: Partial<LearnerProfile>) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [selectedAvatarName, setSelectedAvatarName] = useState(profile.avatarName);
  const [gradeLevel, setGradeLevel] = useState(profile.gradeLevel);
  const [readingLevelId, setReadingLevelId] = useState(profile.readingLevelId || 'level-1');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        name: name.trim() || 'Young Explorer',
        avatar: selectedAvatar,
        avatarName: selectedAvatarName,
        gradeLevel,
        readingLevelId,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border-2 border-[#DED5FF] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#F5F2FB] text-gray-500 hover:text-[#151D42] cursor-pointer"
          aria-label="Close profile editor"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EDE7F6] flex items-center justify-center text-3xl">
            {selectedAvatar}
          </div>
          <div>
            <h2 id="profile-modal-title" className="text-xl font-bold text-[#151D42]">
              Learner Profile
            </h2>
            <p className="text-xs text-[#6D5D8A]">Customize your ReadQuest explorer badge</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="learner-name" className="block text-xs font-bold text-[#151D42] mb-1">
              Explorer Name
            </label>
            <input
              id="learner-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#DED5FF] focus:border-[#7C3AED] focus:outline-hidden text-[#151D42] font-semibold"
              placeholder="e.g. Leo Explorer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151D42] mb-1.5">
              Choose Avatar
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.emoji);
                    setSelectedAvatarName(av.name);
                  }}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                    selectedAvatar === av.emoji
                      ? 'border-[#7C3AED] bg-[#EDE7F6] scale-105'
                      : 'border-transparent bg-[#F5F2FB] hover:bg-[#EFEAF8]'
                  }`}
                  title={`${av.name} - ${av.desc}`}
                >
                  <span className="text-2xl" role="img" aria-label={av.name}>
                    {av.emoji}
                  </span>
                  <span className="text-[10px] font-bold text-[#4A3B69] mt-1 truncate max-w-full">
                    {av.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reading-level" className="block text-xs font-bold text-[#171B37] mb-1">
                Reading Level
              </label>
              <select
                id="reading-level"
                value={readingLevelId}
                onChange={(e) => setReadingLevelId(e.target.value as any)}
                className="w-full px-3 py-2 rounded-2xl border-2 border-[#DED5FF] focus:border-[#8274D8] focus:outline-hidden text-xs font-bold text-[#171B37] bg-white cursor-pointer"
              >
                <option value="level-1">Level 1 · Seedling</option>
                <option value="level-2">Level 2 · Sprout</option>
                <option value="level-3">Level 3 · Bloom</option>
              </select>
            </div>

            <div>
              <label htmlFor="grade-level" className="block text-xs font-bold text-[#171B37] mb-1">
                School Grade
              </label>
              <select
                id="grade-level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl border-2 border-[#DED5FF] focus:border-[#8274D8] focus:outline-hidden text-xs font-bold text-[#171B37] bg-white cursor-pointer"
              >
                <option value="Early Kindergarten">Early Kindergarten (Ages 4-5)</option>
                <option value="Kindergarten">Kindergarten (Ages 5-6)</option>
                <option value="1st Grade">1st Grade (Ages 6-7)</option>
                <option value="2nd Grade">2nd Grade (Ages 7-8)</option>
              </select>
            </div>
          </div>

          {/* Badges Preview */}
          <div className="pt-2 border-t border-[#E2DAED]">
            <span className="text-xs font-bold text-[#151D42] block mb-2">
              Earned Badges ({profile.badges.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.badges.length > 0 ? (
                profile.badges.map((b, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#EDE7F6] text-[#6D5D8A] px-2.5 py-1 rounded-xl"
                  >
                    <Award className="w-3 h-3 text-[#7C3AED]" />
                    {b}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">No badges earned yet. Complete a lesson!</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="peach" size="sm" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
