'use client';

import React, { useMemo } from 'react';

const palette = [
  { bg: '#1F3A5F', fg: '#EAF2FF' },
  { bg: '#2D5A27', fg: '#E8FCE3' },
  { bg: '#5A2D27', fg: '#FFEDE8' },
  { bg: '#3B4A66', fg: '#EAF0FF' },
  { bg: '#4F3A12', fg: '#FFF4DB' },
  { bg: '#244D57', fg: '#E4FBFF' },
];

function getLabel(project) {
  const prefix = project?.prefix?.trim();
  if (prefix) return prefix.slice(0, 2).toUpperCase();

  const name = project?.name?.trim() || 'NP';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
}

function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function ProjectBadge({ project, size = 40, className = '' }) {
  const label = useMemo(() => getLabel(project), [project]);
  const colorSet = useMemo(() => {
    const key = `${project?.id || ''}:${project?.prefix || ''}:${project?.name || ''}`;
    return palette[hash(key) % palette.length];
  }, [project]);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg font-bold shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colorSet.bg,
        color: colorSet.fg,
        fontSize: Math.max(10, Math.floor(size * 0.34)),
        letterSpacing: '0.04em',
      }}
      title={project?.name || 'Project'}
    >
      {label}
    </div>
  );
}
