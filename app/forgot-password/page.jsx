'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const appUrl =
        currentOrigin ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success('Check your email for the reset link');
    } catch (error) {
      toast.error(error?.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5 relative overflow-hidden bg-[var(--bg-app)]">
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-[#6554C0] opacity-5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <BrandMark size={64} className="mx-auto mb-6 rounded-2xl shadow-lg ring-1 ring-black/5" />
          <h1 className="text-3xl font-bold text-[var(--text-heading)] tracking-tight mb-2">
            Forgot password?
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {isSent 
              ? "We've sent reset instructions to your email." 
              : "No worries, we'll send you reset instructions."}
          </p>
        </div>

        <div className="card p-8 sm:p-10">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-[var(--bg-panel)] border-2 border-[var(--border-strong)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm transition-all focus:border-[var(--accent-primary)] outline-none"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 text-[15px] flex justify-center items-center gap-2 rounded-[var(--radius-lg)]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[var(--bg-done)] flex items-center justify-center rounded-full mx-auto mb-6">
                <CheckCircle2 className="text-[var(--status-done)]" size={32} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-heading)] mb-2">Check your email</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                We&apos;ve sent a password reset link to <span className="font-semibold text-[var(--text-primary)]">{email}</span>.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="text-[var(--accent-text)] text-sm font-semibold hover:underline"
              >
                Didn&apos;t receive the email? Click to try again
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-text)] hover:gap-3 transition-all"
            >
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
