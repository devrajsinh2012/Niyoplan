'use client';
import React, { useEffect, useState } from 'react';

/**
 * NiyoplanLoader – full-screen loading overlay with the animated conveyor SVG.
 * Theme-aware: matches dark or light background based on user preference.
 */
export default function NiyoplanLoader() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage for theme preference
    const savedTheme = localStorage.getItem('niyoplan-theme');
    setIsDark(savedTheme === 'dark');
    setMounted(true);
  }, []);

  // Use a slight delay or default to light to avoid flash for the majority of users
  const bg = isDark ? '#0d1117' : '#FFFFFF';
  const textColor = isDark ? 'rgba(255,255,255,0.85)' : '#44546F';
  const dotColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(68, 84, 111, 0.4)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        zIndex: 9999,
        gap: '24px',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Brand mark with conveyor animation */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="72" height="72">
        <defs>
          <linearGradient id="niyoLoader_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C66E4" />
            <stop offset="55%" stopColor="#1D7AFC" />
            <stop offset="100%" stopColor="#0A4CB5" />
          </linearGradient>
          <clipPath id="niyoLoader_clip">
            <rect width="180" height="180" rx="40" />
          </clipPath>
          <style>{`
            .niyobar {
              animation: niyoconveyor 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
            }
            .niyobar-1 { animation-delay: 0s; }
            .niyobar-2 { animation-delay: 0.15s; }
            .niyobar-3 { animation-delay: 0.3s; }
            @keyframes niyoconveyor {
              0%, 20%  { transform: translateX(0); }
              40%      { transform: translateX(180px); }
              40.1%    { transform: translateX(-180px); }
              60%, 100%{ transform: translateX(0); }
            }
          `}</style>
        </defs>
        <rect width="180" height="180" rx="40" fill="url(#niyoLoader_g)" />
        <g clipPath="url(#niyoLoader_clip)">
          <rect className="niyobar niyobar-1" x="95" y="35" width="55" height="30" rx="15" fill="#FFFFFF" />
          <rect className="niyobar niyobar-2" x="65" y="75" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.8" />
          <rect className="niyobar niyobar-3" x="35" y="115" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.5" />
        </g>
      </svg>

      {/* Label and Dots (hidden until theme detected to avoid flash) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: textColor,
            fontFamily: 'inherit',
          }}
        >
          Loading
        </span>
        {/* Animated dots */}
        <div
          style={{
            display: 'flex',
            gap: '5px',
            alignItems: 'center',
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: dotColor,
                animation: `niyoDot 1.2s ${i * 0.2}s infinite ease-in-out both`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes niyoDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
