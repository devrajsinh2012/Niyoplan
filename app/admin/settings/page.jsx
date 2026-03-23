'use client';

import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in p-6 text-primary">
      <h1 className="text-2xl font-bold text-[var(--text-heading)]">Admin Settings</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Admin settings module is available. Use this page as the entry point for user and role management.
      </p>
      <div className="mt-6 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <p className="text-sm text-[var(--text-secondary)]">Quick links</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/projects" className="rounded-[3px] bg-[#0052CC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00388D]">
            Open Projects
          </Link>
          <Link href="/" className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]">
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
