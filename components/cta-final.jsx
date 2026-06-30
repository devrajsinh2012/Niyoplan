'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export default function CtaFinal() {
  return (
    <section
      className="relative z-10 mx-auto max-w-5xl px-6 py-20 md:py-28 text-center overflow-hidden rounded-3xl mb-20"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Ambient radial glow behind content */}
      <div
        className="pointer-events-none absolute -bottom-1/2 left-1/2 -translate-x-1/2 h-[350px] w-[550px] rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 25%, transparent) 0%, transparent 70%)' }}
      />

      {/* Decorative floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-10 h-10 w-10 rounded-full animate-pulse"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)',
          }}
        />
        <div
          className="absolute bottom-1/4 right-12 h-14 w-14 rounded-full"
          style={{
            background: 'color-mix(in srgb, #8b5cf6 6%, transparent)',
            border: '1px solid color-mix(in srgb, #8b5cf6 15%, transparent)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Icon badge */}
        <div
          className="inline-flex items-center justify-center h-11 w-11 rounded-2xl mb-6"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Zap size={20} />
        </div>

        {/* Heading — solid color, no gradient text */}
        <h2
          className="text-3xl font-extrabold sm:text-4xl md:text-5xl leading-tight"
          style={{
            color: 'var(--text-heading)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          Ready to experience project clarity?
        </h2>

        {/* Sub-text */}
        <p
          className="mt-5 max-w-md text-sm md:text-base leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Sign up today to create your organization workspace, manage sprints, link files, and automate routines.{' '}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>No credit card required.</span>
        </p>

        {/* CTA Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="hero-btn-primary"
          >
            Get Started for Free
            <ArrowRight size={15} className="ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium underline underline-offset-4 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </section>
  );
}
