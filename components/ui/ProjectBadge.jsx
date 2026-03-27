'use client';

import React, { useId, useMemo } from 'react';

const themes = [
  {
    start: '#2563EB',
    end: '#06B6D4',
    glyph: '#F8FDFF',
    chipBg: 'rgba(8, 24, 55, 0.18)',
    chipText: '#EAF7FF',
    glow: 'rgba(56, 189, 248, 0.32)',
    border: 'rgba(255, 255, 255, 0.28)',
  },
  {
    start: '#7C3AED',
    end: '#EC4899',
    glyph: '#FFF7FB',
    chipBg: 'rgba(48, 13, 58, 0.18)',
    chipText: '#FFF0FB',
    glow: 'rgba(244, 114, 182, 0.28)',
    border: 'rgba(255, 255, 255, 0.24)',
  },
  {
    start: '#0F766E',
    end: '#22C55E',
    glyph: '#F4FFF7',
    chipBg: 'rgba(9, 49, 39, 0.18)',
    chipText: '#F1FFF8',
    glow: 'rgba(34, 197, 94, 0.26)',
    border: 'rgba(255, 255, 255, 0.24)',
  },
  {
    start: '#EA580C',
    end: '#F59E0B',
    glyph: '#FFF9EF',
    chipBg: 'rgba(84, 36, 8, 0.18)',
    chipText: '#FFF8EA',
    glow: 'rgba(251, 191, 36, 0.28)',
    border: 'rgba(255, 255, 255, 0.26)',
  },
  {
    start: '#1D4ED8',
    end: '#312E81',
    glyph: '#F3F5FF',
    chipBg: 'rgba(17, 18, 59, 0.2)',
    chipText: '#EEF2FF',
    glow: 'rgba(99, 102, 241, 0.28)',
    border: 'rgba(255, 255, 255, 0.22)',
  },
  {
    start: '#BE123C',
    end: '#7C3AED',
    glyph: '#FFF8FC',
    chipBg: 'rgba(69, 12, 44, 0.2)',
    chipText: '#FFF1F7',
    glow: 'rgba(168, 85, 247, 0.24)',
    border: 'rgba(255, 255, 255, 0.22)',
  },
];

function getLabel(project) {
  const prefix = project?.prefix?.trim();
  if (prefix) return prefix.slice(0, 2).toUpperCase();

  const name = project?.name?.trim() || 'NP';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function BadgeGlyph({ variant, color }) {
  switch (variant % 4) {
    case 0:
      return (
        <>
          <rect x="26" y="56" width="16" height="14" rx="5" fill={color} opacity="0.92" />
          <rect x="44" y="43" width="16" height="27" rx="5" fill={color} opacity="0.96" />
          <rect x="62" y="31" width="12" height="39" rx="5" fill={color} />
        </>
      );
    case 1:
      return (
        <>
          <path d="M30 65 L47 45 L61 54 L74 34" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30" cy="65" r="5" fill={color} />
          <circle cx="47" cy="45" r="5" fill={color} />
          <circle cx="61" cy="54" r="5" fill={color} />
          <circle cx="74" cy="34" r="5" fill={color} />
        </>
      );
    case 2:
      return (
        <>
          <path d="M28 63 C34 44, 47 33, 68 31" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
          <path d="M34 70 C43 57, 58 51, 76 50" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.72" />
          <circle cx="28" cy="63" r="5" fill={color} />
          <circle cx="76" cy="50" r="5" fill={color} opacity="0.9" />
        </>
      );
    default:
      return (
        <>
          <path d="M31 62 L45 40 L56 52 L70 31" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M58 31 H72 V45" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="31" cy="62" r="5" fill={color} opacity="0.92" />
        </>
      );
  }
}

export default function ProjectBadge({ project, size = 40, className = '' }) {
  const gradientId = useId().replace(/:/g, '');
  const label = useMemo(() => getLabel(project), [project]);
  const badgeTheme = useMemo(() => {
    const key = `${project?.id || ''}:${project?.prefix || ''}:${project?.name || ''}`;
    return themes[hash(key) % themes.length];
  }, [project]);
  const variant = useMemo(() => hash(`${project?.name || ''}:${project?.prefix || ''}`) % 4, [project]);
  const showChip = size >= 32;
  const chipFontSize = Math.max(8, Math.floor(size * 0.18));
  const borderRadius = Math.max(12, Math.floor(size * 0.34));
  const shadowBlur = Math.max(18, Math.floor(size * 0.55));
  const shadowOffset = Math.max(10, Math.floor(size * 0.22));

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: `linear-gradient(155deg, ${badgeTheme.start}, ${badgeTheme.end})`,
        border: `1px solid ${badgeTheme.border}`,
        boxShadow: `0 ${shadowOffset}px ${shadowBlur}px ${badgeTheme.glow}`,
      }}
      title={project?.name || 'Project'}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 22% 18%, rgba(255,255,255,0.35), transparent 36%), radial-gradient(circle at 88% 100%, ${badgeTheme.glow}, transparent 44%)`,
        }}
      />
      <div className="absolute -right-[16%] -top-[8%] h-[48%] w-[48%] rounded-full bg-white/18 blur-sm" />
      <div className="absolute left-[8%] top-[10%] h-[18%] w-[18%] rounded-full bg-white/12" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="18%" y1="12%" x2="88%" y2="88%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="68" height="68" rx="24" fill={`url(#${gradientId})`} opacity="0.65" />
        <BadgeGlyph variant={variant} color={badgeTheme.glyph} />
      </svg>

      {showChip && (
        <div
          className="absolute bottom-[10%] right-[10%] rounded-full font-semibold uppercase tracking-[0.18em]"
          style={{
            background: badgeTheme.chipBg,
            color: badgeTheme.chipText,
            fontSize: chipFontSize,
            padding: `${Math.max(2, Math.floor(size * 0.05))}px ${Math.max(5, Math.floor(size * 0.13))}px`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
