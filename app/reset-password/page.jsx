'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  useEffect(() => {
    let mounted = true;

    const updateReadyState = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error || !data?.session) {
        setIsReady(false);
        setErrorStatus(error?.message || 'Invalid or expired reset link. Please request a new one.');
        setIsCheckingLink(false);
        return;
      }

      setIsReady(true);
      setErrorStatus('');
      setIsCheckingLink(false);
    };

    const hydrateRecoverySession = async () => {
      try {
        const url = new URL(typeof window !== 'undefined' ? window.location.href : '');
        // Supabase sends tokens in either hash or search params depending on configuration
        const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
        const searchParams = url.searchParams;
        
        const code = searchParams.get('code') || hashParams.get('code');
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
        const recoveryType = searchParams.get('type') || hashParams.get('type');
        const accessToken = hashParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || hashParams.get('refresh_token');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && recoveryType === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) throw error;
        }

        await updateReadyState();

        if (mounted && (code || tokenHash || accessToken)) {
          // Clean up URL after successful hydration
          window.history.replaceState({}, document.title, url.pathname);
        }
      } catch (error) {
        if (!mounted) return;
        setIsReady(false);
        setErrorStatus(error?.message || 'Reset link is invalid.');
        setIsCheckingLink(false);
      }
    };

    hydrateRecoverySession();

    // Still listen for event changes to be safe
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && !isSuccess)) {
        setIsReady(Boolean(session));
        setIsCheckingLink(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords must match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setIsSuccess(true);
      toast.success('Password updated successfully');
      
      // Auto-logout and redirect after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 3000);
    } catch (error) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5 relative overflow-hidden bg-[var(--bg-app)]">
      {/* Decorative gradients */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-[var(--status-done)] opacity-5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <BrandMark size={64} className="mx-auto mb-6 rounded-2xl shadow-lg ring-1 ring-black/5" />
          <h1 className="text-3xl font-bold text-[var(--text-heading)] tracking-tight mb-2">
            Set new password
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-0">
            {isSuccess ? "You're all set!" : "Secure your account with a new password."}
          </p>
        </div>

        <div className="card p-8 sm:p-10">
          {isCheckingLink ? (
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-3 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Checking your secure link...</p>
            </div>
          ) : !isReady && !isSuccess ? (
            <div className="py-2 text-center">
              <div className="w-16 h-16 bg-[var(--bg-blocked)] flex items-center justify-center rounded-full mx-auto mb-6">
                <AlertCircle className="text-[var(--status-blocked)]" size={32} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-heading)] mb-2">Reset link expired</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                {errorStatus || "This password reset link is invalid or has expired."}
              </p>
              <Link
                href="/forgot-password"
                className="btn-primary w-full py-3 text-sm flex justify-center items-center gap-2 rounded-[var(--radius-lg)] no-underline"
              >
                Request new link
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[var(--bg-done)] flex items-center justify-center rounded-full mx-auto mb-6">
                <CheckCircle2 className="text-[var(--status-done)]" size={32} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-heading)] mb-2">Password updated</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                Your password has been changed successfully. Redirecting you to sign in...
              </p>
              <div className="w-full h-1.5 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--status-done)] animate-progress" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      className="w-full pl-11 pr-4 py-3 bg-[var(--bg-panel)] border-2 border-[var(--border-strong)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm transition-all focus:border-[var(--accent-primary)] outline-none"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      className="w-full pl-11 pr-4 py-3 bg-[var(--bg-panel)] border-2 border-[var(--border-strong)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm transition-all focus:border-[var(--accent-primary)] outline-none"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 text-[15px] flex justify-center items-center gap-2 rounded-[var(--radius-lg)] mt-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Update password"
                )}
              </button>
            </form>
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
