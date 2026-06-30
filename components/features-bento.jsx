'use client';

import React from 'react';
import { Workflow, Link2, ShieldCheck, Server, AlertCircle, Code } from 'lucide-react';

export default function FeaturesBento() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 20%, transparent) 0%, transparent 70%)' }} />

      {/* Section Header — no uppercase tracked eyebrow badge */}
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h2
          className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl"
          style={{
            color: 'var(--text-heading)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          Engineered for velocity.{' '}
          <span style={{ color: 'var(--accent-primary)' }}>Built for clarity.</span>
        </h2>
        <p
          className="mt-4 text-base md:text-lg leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Ditch scattered tools. Manage execution, file references, security guidelines,
          and internal automations in a unified interface.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Card 1 — Smart Delivery Dashboard (2 cols) */}
        <div
          className="group relative col-span-1 md:col-span-2 rounded-2xl p-7 md:p-9 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Top hover glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #3b82f6 5%, transparent) 0%, transparent 60%)' }}
          />

          <div className="relative flex flex-col h-full">
            {/* Icon — small, no large rounded square */}
            <div
              className="mb-5 flex items-center gap-2.5"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, #3b82f6 12%, transparent)', color: '#3b82f6' }}
              >
                <Workflow size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3b82f6', letterSpacing: '0.06em' }}>Dashboard</span>
            </div>

            {/* Text */}
            <h3 className="text-xl font-bold md:text-2xl mb-2" style={{ color: 'var(--text-heading)' }}>
              Smart Delivery Dashboard
            </h3>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Monitor sprint bottlenecks, ticket priorities, and active task progress
              in one unified view. Keep alignment high and blockers low.
            </p>

            {/* Simulated UI widget */}
            <div
              className="mt-7 rounded-xl p-4 text-left overflow-hidden"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Active Blockers (2)
                  </span>
                </div>
                <span
                  className="text-xs rounded-md px-2 py-0.5 font-semibold"
                  style={{ background: 'color-mix(in srgb, #ef4444 12%, transparent)', color: '#ef4444' }}
                >
                  High Alert
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <AlertCircle size={13} className="text-red-500 shrink-0" />, text: 'Database scaling latency spike', time: '2h ago' },
                  { icon: <AlertCircle size={13} className="text-yellow-500 shrink-0" />, text: 'Auth token expiration issue', time: '4h ago' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.text}
                      </span>
                    </div>
                    <span className="text-xs ml-3 shrink-0" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — Google Drive Attachments (1 col) */}
        <div
          className="group relative rounded-2xl p-7 md:p-9 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #10b981 5%, transparent) 0%, transparent 60%)' }}
          />

          <div className="relative flex flex-col h-full">
            <div className="mb-5 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, #10b981 12%, transparent)', color: '#10b981' }}
              >
                <Link2 size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#10b981', letterSpacing: '0.06em' }}>Files</span>
            </div>

            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
              Drive Attachments
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Link asset paths dynamically. Access documents and visual mockups straight from
              tickets without bloating storage.
            </p>

            {/* Simulated UI widget */}
            <div
              className="mt-7 rounded-xl p-3.5"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}
            >
              <div
                className="flex items-center gap-3 rounded-lg p-2.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs font-mono shrink-0"
                  style={{ background: 'color-mix(in srgb, #10b981 15%, transparent)', color: '#10b981' }}
                >
                  GD
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-2 w-20 rounded-full" style={{ background: 'var(--border-strong)' }} />
                  <div className="h-1.5 w-14 rounded-full" style={{ background: 'var(--border-subtle)' }} />
                </div>
                <span className="text-xs font-bold uppercase shrink-0" style={{ color: '#10b981' }}>
                  Linked
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 — Secure Collaboration (1 col) */}
        <div
          className="group relative rounded-2xl p-7 md:p-9 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #8b5cf6 5%, transparent) 0%, transparent 60%)' }}
          />

          <div className="relative flex flex-col h-full">
            <div className="mb-5 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, #8b5cf6 12%, transparent)', color: '#8b5cf6' }}
              >
                <ShieldCheck size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8b5cf6', letterSpacing: '0.06em' }}>Access</span>
            </div>

            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
              Secure Collaboration
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Role-based access controls and organization separation keeps your company data protected.
            </p>

            {/* Simulated roles widget */}
            <div
              className="mt-7 rounded-xl p-3.5 space-y-1.5"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}
            >
              {[
                { label: 'Owner Level', badge: 'Admin', color: '#8b5cf6' },
                { label: 'Collaborator', badge: 'Write Access', color: 'var(--accent-primary)' },
                { label: 'External Client', badge: 'Read Only', color: 'var(--text-muted)' },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium"
                  style={{
                    background: i === 0 ? 'color-mix(in srgb, #8b5cf6 8%, transparent)' : 'transparent',
                    color: i === 0 ? '#8b5cf6' : 'var(--text-secondary)',
                  }}
                >
                  <span>{row.label}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: 'color-mix(in srgb,' + row.color + ' 12%, transparent)',
                      color: row.color,
                    }}
                  >
                    {row.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4 — API-First Automations (2 cols) */}
        <div
          className="group relative col-span-1 md:col-span-2 rounded-2xl p-7 md:p-9 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #6366f1 5%, transparent) 0%, transparent 60%)' }}
          />

          <div className="relative flex flex-col h-full">
            <div className="mb-5 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, #6366f1 12%, transparent)', color: '#6366f1' }}
              >
                <Server size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6366f1', letterSpacing: '0.06em' }}>API</span>
            </div>

            <h3 className="text-xl font-bold md:text-2xl mb-2" style={{ color: 'var(--text-heading)' }}>
              API-First Automations
            </h3>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Deploy, fetch, and orchestrate internal tasks using clean, documented API routes.
              Connect your own services seamlessly.
            </p>

            {/* Code widget */}
            <div
              className="mt-7 rounded-xl p-4 font-mono text-left overflow-hidden"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="flex items-center justify-between text-xs mb-3 pb-2"
                style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Code size={12} style={{ color: '#6366f1' }} />
                  <span>GET /api/v1/projects</span>
                </div>
                <span style={{ color: '#10b981' }}>200 OK</span>
              </div>
              <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: '#6366f1' }}>
{`{
  "status": "success",
  "data": [
    { "id": "proj_9k2", "name": "Supabase Redesign", "progress": 88 },
    { "id": "proj_1a4", "name": "API Webhooks Engine", "status": "completed" }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
