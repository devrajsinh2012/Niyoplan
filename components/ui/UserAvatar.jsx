'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { avatarDataUrl, getAvatarColor, getInitials } from '@/lib/avatar';

/**
 * UserAvatar - Displays a user avatar with geometric pattern fallback
 *
 * @param {Object} props
 * @param {Object} props.user - User object with id, email, full_name, avatar_url
 * @param {number} props.size - Avatar size in pixels (default: 32)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showInitials - Show initials instead of geometric pattern (default: false)
 */
export default function UserAvatar({
  user,
  size = 32,
  className = '',
  showInitials = false
}) {
  // Generate a unique seed from user id or email
  const seed = user?.id || user?.email || 'default';

  // Memoize the avatar URL to prevent regeneration on every render
  const geometricAvatarUrl = useMemo(() => avatarDataUrl(seed), [seed]);
  const avatarColor = useMemo(() => getAvatarColor(seed), [seed]);
  const initials = useMemo(() => getInitials(user?.full_name || user?.name), [user?.full_name, user?.name]);

  // If user has a custom avatar URL, use that
  if (user?.avatar_url) {
    return (
      <Image
        src={user.avatar_url}
        alt={user?.full_name || user?.name || 'User'}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Show initials with colored background
  if (showInitials) {
    return (
      <div
        className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: avatarColor,
          fontSize: size * 0.4
        }}
        title={user?.full_name || user?.name || 'User'}
      >
        {initials}
      </div>
    );
  }

  // Use geometric avatar
  return (
    <Image
      src={geometricAvatarUrl}
      alt={user?.full_name || user?.name || 'User'}
      width={size}
      height={size}
      unoptimized
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Compact avatar for use in tight spaces (cards, lists)
 */
export function CompactAvatar({ user, size = 24, className = '' }) {
  return (
    <UserAvatar
      user={user}
      size={size}
      className={className}
    />
  );
}

/**
 * Avatar with name displayed next to it
 */
export function AvatarWithName({
  user,
  size = 32,
  className = '',
  nameClassName = ''
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <UserAvatar user={user} size={size} />
      <span className={`text-sm font-medium truncate ${nameClassName}`}>
        {user?.full_name || user?.name || 'User'}
      </span>
    </div>
  );
}
