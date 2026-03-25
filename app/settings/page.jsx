'use client';

import Link from 'next/link';
import BrandMark from '@/components/ui/BrandMark';

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in p-6 text-primary">
      <div className="flex items-center gap-4 mb-6">
        <BrandMark size={40} />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your personal profile and organization preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link 
          href="/settings/profile"
          className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
        >
          <h3 className="text-sm font-bold text-[var(--text-heading)] group-hover:text-blue-600 transition-colors mb-2">My Profile</h3>
          <p className="text-xs text-[var(--text-secondary)]">Update your avatar, name, bio, and change your password.</p>
        </Link>

        <Link 
          href="/settings/company"
          className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
        >
          <h3 className="text-sm font-bold text-[var(--text-heading)] group-hover:text-blue-600 transition-colors mb-2">Company Settings</h3>
          <p className="text-xs text-[var(--text-secondary)]">Manage organization details, members, and invite codes.</p>
        </Link>
      </div>
      <Link href="/projects" className="mt-4 inline-flex rounded-[3px] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]">
        Back to Projects
      </Link>
    </div>
  );
}
