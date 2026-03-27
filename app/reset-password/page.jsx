'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking your recovery link...');

  useEffect(() => {
    let mounted = true;

    const updateReadyState = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setIsReady(false);
        setStatusMessage(error.message || 'Recovery session not found. Please use the password reset link from your email.');
        setIsCheckingLink(false);
        return;
      }

      setIsReady(Boolean(data?.session));
      setStatusMessage(
        data?.session
          ? ''
          : 'Recovery session not found. Please use the password reset link from your email.'
      );
      setIsCheckingLink(false);
    };

    const hydrateRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
        const searchParams = url.searchParams;
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const recoveryType = searchParams.get('type') || hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

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
          window.history.replaceState({}, document.title, url.pathname);
        }
      } catch (error) {
        if (!mounted) return;
        setIsReady(false);
        setStatusMessage(error?.message || 'Recovery session not found. Please use the password reset link from your email.');
        setIsCheckingLink(false);
      }
    };

    hydrateRecoverySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsReady(Boolean(session));
        setStatusMessage(
          session ? '' : 'Recovery session not found. Please use the password reset link from your email.'
        );
        setIsCheckingLink(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully. Please sign in.');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
      className="animate-fade-in text-primary"
    >
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'var(--status-done)',
          opacity: 0.1,
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <BrandMark size={64} className="mx-auto mb-6 rounded-2xl" />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-heading)',
              margin: '0 0 8px',
              letterSpacing: '-0.03em',
            }}
          >
            Set New Password
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Choose a strong password for your account
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {isCheckingLink ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              {statusMessage}
            </div>
          ) : !isReady ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              {statusMessage}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                  }}
                >
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-panel)',
                    border: '2px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    transition: 'var(--transition-fast)',
                  }}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-panel)',
                    border: '2px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    transition: 'var(--transition-fast)',
                  }}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 15,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {isSubmitting ? (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                    }}
                    className="animate-spin"
                  />
                ) : (
                  <>
                    <KeyRound size={18} /> Update Password
                  </>
                )}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', margin: '24px 0 0', fontSize: 14 }}>
            <Link
              href="/login"
              style={{
                color: 'var(--accent-text)',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
