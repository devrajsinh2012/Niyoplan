'use client';

import React from 'react';
import { Star } from 'lucide-react';

const testimonialsList = [
  {
    name: 'Devrajsinh Gohil',
    role: 'Principal Engineer at DG Labs',
    content:
      'Niyoplan transformed how our team manages sprint delivery. Being able to reference GDrive links directly on active columns saved us endless coordination cycles.',
    avatar: 'DG',
    accentColor: '#3b82f6',
  },
  {
    name: 'Alex Rivera',
    role: 'VP of Product at Hyperlink',
    content:
      'The dashboard is not just eye candy. The speed and layout structure lets us focus on actual execution blockers. Extremely performant.',
    avatar: 'AR',
    accentColor: '#10b981',
  },
  {
    name: 'Ksenia Kondra',
    role: 'Co-founder at WebCraft',
    content:
      'Niyoplan API integration is a game-changer. We connected our custom telemetry and build queues within a single afternoon. Highly recommended!',
    avatar: 'KK',
    accentColor: '#8b5cf6',
  },
];

const brandLogos = [
  { letter: 'V', name: 'VERCEL', bg: '#000000', text: '#ffffff' },
  { letter: 'S', name: 'SUPABASE', bg: '#10b981', text: '#ffffff' },
  { letter: 'A', name: 'ACME', bg: '#3b82f6', text: '#ffffff' },
  { letter: 'L', name: 'LINEAR', bg: '#8b5cf6', text: '#ffffff' },
];

export default function Testimonials() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-24">
      {/* Visual ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, #6366f1 25%, transparent) 0%, transparent 70%)' }}
      />

      {/* Brand trust strip — no uppercase "trusted by" kicker, just logos */}
      <div
        className="rounded-2xl py-8 px-8 mb-20"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {brandLogos.map((brand) => (
            <div
              key={brand.name}
              className="flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity duration-300 select-none cursor-default"
            >
              <span
                className="h-6 w-6 rounded-md flex items-center justify-center font-extrabold text-xs"
                style={{ background: brand.bg, color: brand.text }}
              >
                {brand.letter}
              </span>
              <span className="font-extrabold text-sm tracking-wide" style={{ color: 'var(--text-heading)' }}>
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center mb-14">
        <h2
          className="text-3xl font-extrabold sm:text-4xl"
          style={{
            color: 'var(--text-heading)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          Loved by developers and product leaders.
        </h2>
        <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>
          See how teams use Niyoplan to eliminate noise and ship with speed.
        </p>
      </div>

      {/* Testimonial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {testimonialsList.map((t, idx) => (
          <div
            key={idx}
            className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Hover glow overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${t.accentColor} 6%, transparent) 0%, transparent 60%)`,
              }}
            />

            <div className="relative">
              {/* Stars */}
              <div className="flex gap-1 mb-4 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-current" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${t.accentColor} 15%, transparent)`,
                    color: t.accentColor,
                    border: `1px solid color-mix(in srgb, ${t.accentColor} 25%, transparent)`,
                  }}
                >
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {t.name}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
