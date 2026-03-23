'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in p-6 text-primary">
      <h1 className="text-2xl font-bold text-[var(--text-heading)]">Settings</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Workspace settings will appear here.
      </p>
      <Link href="/projects" className="mt-4 inline-flex rounded-[3px] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]">
        Back to Projects
      </Link>
    </div>
  );
}
