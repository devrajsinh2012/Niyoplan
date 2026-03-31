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

      {/* Label and Progress indicator */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.05em',
            color: textColor,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Loading Niyoplan
        </span>
        {/* Animated bar indicator for premium feel */}
        <div 
          style={{
            width: '120px',
            height: '3px',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              height: '100%',
              width: '40%',
              background: 'linear-gradient(90deg, #0C66E4, #1D7AFC)',
              borderRadius: '2px',
              animation: 'niyoProgress 1.8s infinite ease-in-out'
            }}
          />
        </div>
      </div>
    
      <style>{`
        @keyframes niyoProgress {
          0% { left: -40%; width: 30%; }
          50% { left: 40%; width: 50%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>
    </div>
  );
}
