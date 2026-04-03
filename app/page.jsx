'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, ShieldCheck, Rocket, Link2, Workflow, Server } from 'lucide-react';
import BrandMark from '@/components/ui/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

const featureCards = [
  {
    title: 'Smart Delivery Dashboard',
    description: 'Track priorities, blockers, sprint velocity, and team focus in one structured workspace.',
    icon: Workflow,
  },
  {
    title: 'Google Drive Attachments',
    description: 'Attach Drive files directly to projects and cards without storing file contents in Niyoplan.',
    icon: Link2,
  },
  {
    title: 'Secure Team Collaboration',
    description: 'Organization-based access control, role management, and clear project visibility.',
    icon: ShieldCheck,
  },
  {
    title: 'Built for API Workflows',
    description: 'Use documented API routes to extend automation and integrate with your internal tools.',
    icon: Server,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, initialLoading } = useAuth();
  const { activeOrganization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    if (loading || initialLoading || (user && orgLoading)) return;

    if (user) {
      if (activeOrganization?.id) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [activeOrganization?.id, initialLoading, loading, orgLoading, router, user]);

  const waitingForAuth = loading || initialLoading || (user && orgLoading);

  if (waitingForAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[var(--shell-ambient-1)] blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--shell-ambient-2)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[var(--accent-glow)] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandMark size={34} className="rounded-xl" />
            <div>
              <p className="text-base font-semibold text-[var(--text-heading)]">Niyoplan</p>
              <p className="text-xs text-[var(--text-muted)]">Project Execution Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-panel-hover)]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Get Started
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-14 md:pt-20">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <Rocket size={14} />
              High-tech project control
            </p>
            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-[var(--text-heading)] md:text-6xl">
              Build faster with one command center for planning, execution, and team clarity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              Niyoplan combines project dashboards, sprint visibility, documentation workflows, and secure file attachments
              so product teams can ship with confidence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-panel-hover)]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              >
                Get Started
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-md)]"
                >
                  <div className="mb-3 inline-flex rounded-lg bg-[var(--accent-subtle)] p-2 text-[var(--accent-primary)]">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-heading)]">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/85">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
          <p>Copyright {new Date().getFullYear()} Niyoplan. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/login" className="hover:text-[var(--accent-primary)]">Log In</Link>
            <Link href="/register" className="hover:text-[var(--accent-primary)]">Sign Up</Link>
            <Link href="/api-documentation" className="hover:text-[var(--accent-primary)]">API Documentation</Link>
            <Link href="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--accent-primary)]">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
