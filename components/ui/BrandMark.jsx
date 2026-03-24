'use client';

import React from 'react';

export default function BrandMark({ size = 32, className = '' }) {
  return (
    <div
      className={`inline-flex items-center justify-center text-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
      aria-label="Niyoplan"
    >
      <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="brandG2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C66E4" />
            <stop offset="55%" stopColor="#1D7AFC" />
            <stop offset="100%" stopColor="#0A4CB5" />
          </linearGradient>
        </defs>
        <rect width="180" height="180" rx="40" fill="url(#brandG2)" />
        <rect x="35" y="115" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.5" />
        <rect x="65" y="75" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.8" />
        <rect x="95" y="35" width="55" height="30" rx="15" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
