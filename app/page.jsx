'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Sun, Moon } from 'lucide-react';
import BrandMark from '@/components/ui/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import Hero from '@/components/hero';
import FeaturesBento from '@/components/features-bento';
import Testimonials from '@/components/testimonials';
import CtaFinal from '@/components/cta-final';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, initialLoading } = useAuth();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [theme, setTheme] = useState('dark');

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('niyoplan-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.style.colorScheme = savedTheme;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem('niyoplan-theme', newTheme);
  };

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div 
      className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 selection:bg-blue-500/30 selection:text-white ${
        theme === 'dark' ? 'bg-[#050505] text-neutral-300' : 'bg-[#FAFBFD] text-[#17253D]'
      }`}
    >
      {/* Floating Top Navigation Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-500 backdrop-blur-md ${
          theme === 'dark' ? 'border-white/5 bg-[#050505]/75' : 'border-neutral-200 bg-white/75'
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <BrandMark size={34} className="rounded-xl shadow-lg shadow-blue-500/10" />
            <p className={`text-base font-bold tracking-tight transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-neutral-900'
            }`}>
              Niyoplan
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`rounded-lg p-2.5 border transition-colors ${
                theme === 'dark' 
                  ? 'border-white/10 text-neutral-400 hover:bg-white/[0.03] hover:text-white' 
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              href="/login"
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                theme === 'dark' 
                  ? 'border-white/10 text-neutral-300 hover:bg-white/[0.03] hover:text-white' 
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/10 transition hover:bg-blue-500 hover:scale-[1.01]"
            >
              Get Started
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Landing Main sections */}
      <main className="relative z-10 pt-14">
        <Hero />
        <FeaturesBento />
        <Testimonials />
        <CtaFinal />
      </main>

      {/* Footer */}
      <footer 
        className={`relative z-10 border-t transition-colors duration-500 ${
          theme === 'dark' ? 'border-white/5 bg-[#050505]/95' : 'border-neutral-200 bg-white/95'
        } py-8`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 text-xs md:flex-row md:items-center md:justify-between" style={{ color: 'var(--text-muted)' }}>
          <p>Copyright © {new Date().getFullYear()} Niyoplan. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/login" className="hover:text-blue-500 transition">Log In</Link>
            <Link href="/register" className="hover:text-blue-500 transition">Sign Up</Link>
            <Link href="/api-documentation" className="hover:text-blue-500 transition">API Docs</Link>
            <Link href="/privacy" className="hover:text-blue-500 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-500 transition">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
