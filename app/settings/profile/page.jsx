'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/ui/UserAvatar';
import { Upload, X, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProfileSettingsPageSkeleton } from '@/components/ui/PageSkeleton';

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Personal Information
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  // Avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete Account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setTimezone(profile.timezone || 'UTC');
    }
  }, [profile]);

  useEffect(() => {
    const loadAuthEmail = async () => {
      const { data } = await supabase.auth.getUser();
      const authEmail = data?.user?.email || profile?.email || '';
      setEmail(authEmail);
      setNewEmail(authEmail);
    };
    loadAuthEmail();
  }, [profile?.email]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      setAvatarFile(null);
      setAvatarPreview(null);
      await refreshProfile();
      toast.success('Avatar removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove avatar');
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profile.avatar_url;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Check if bucket exists by trying to list (or just upload and catch specific error)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Avatar storage bucket not found. Please contact admin.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
      return profile.avatar_url;
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Upload avatar if changed
      const avatarUrl = await uploadAvatar();

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username || null,
          bio: bio || null,
          timezone: timezone,
          avatar_url: avatarUrl
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    const targetEmail = newEmail.trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Please enter a valid email');
      return;
    }

    if (targetEmail === (email || '').toLowerCase()) {
      toast('New email is same as current email');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: targetEmail });
      if (error) throw error;

      toast.success('Verification email sent. Confirm the new email to complete the change.');
      setShowEmailEditor(false);
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error(error?.message || 'Failed to change email');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== email) {
      toast.error('Email does not match');
      return;
    }

    setIsSaving(true);
    try {
      // First attempt RPC
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_id: profile.id
      });

      if (rpcError) {
        console.warn('RPC delete_user_account failed or missing:', rpcError);
        // Fallback or explicit error if RPC is strictly required
        if (rpcError.message.includes('not found')) {
          toast.error('Account deletion service is currently unavailable. Please contact support.');
          return;
        }
        throw rpcError;
      }

      toast.success('Account deleted');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setIsSaving(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!profile) {
    return <ProfileSettingsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-heading)]">Profile Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-heading)]">Profile Picture</h2>

            <div className="flex items-start gap-6">
              <div className="relative">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <UserAvatar user={profile} size={96} />
                )}
              </div>

              <div className="flex-1">
                <p className="mb-3 text-sm text-[var(--text-secondary)]">
                  Upload a photo or use your unique generated avatar
                </p>
                <div className="flex gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50">
                      <Upload size={16} />
                      Upload photo
                    </span>
                  </label>

                  {(profile.avatar_url || avatarPreview) && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  JPG, PNG. Max 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-heading)]">Personal Information</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Choose a unique username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Email
                </label>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="flex-1 rounded-md border border-[var(--border-subtle)] bg-gray-50 px-4 py-2 text-sm text-[var(--text-secondary)] cursor-not-allowed"
                  />
                  {!showEmailEditor ? (
                    <button
                      onClick={() => setShowEmailEditor(true)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Change email
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="flex-1 rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter new email"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleChangeEmail}
                          disabled={isSaving}
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Update'}
                        </button>
                        <button
                          onClick={() => {
                            setShowEmailEditor(false);
                            setNewEmail(email);
                          }}
                          className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  rows={3}
                  maxLength={160}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Tell us about yourself"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">
                  {bio.length}/160
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Kolkata">India</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Password & Security */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-heading)]">Password & Security</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 pr-10 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 pr-10 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full transition-all ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 pr-10 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-600" size={20} />
              <div className="flex-1">
                <h2 className="mb-2 text-lg font-semibold text-red-900">Danger Zone</h2>
                <p className="mb-4 text-sm text-red-700">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-md border-2 border-red-600 bg-white px-6 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
            </p>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type your email <span className="font-bold">{email}</span> to confirm:
              </label>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder={email}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmEmail('');
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmEmail !== email || isSaving}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
