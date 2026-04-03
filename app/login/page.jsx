'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';
import { useAuth } from '@/context/AuthContext';

const REMEMBER_ME_KEY = 'niyoplan-remember-me';
const REMEMBERED_EMAIL_KEY = 'niyoplan-remembered-email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signIn, signInWithGoogle, user, loading, signInInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    const rememberFlag = localStorage.getItem(REMEMBER_ME_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }

    if (rememberFlag === '0') {
      setRememberMe(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password, { rememberMe });
      if (error) throw error;

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (error) {
      toast.error(error?.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);

    try {
      const { error } = await signInWithGoogle({ rememberMe, redirectPath: '/login' });
      if (error) throw error;
    } catch (error) {
      toast.error(error?.message || 'Failed to sign in with Google');
      setIsGoogleSubmitting(false);
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
          top: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          opacity: 0.1,
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: '#6554C0',
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
            Welcome to NiyoPlan
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {signInInitializing && (
            <p
              style={{
                margin: '0 0 14px',
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              Preparing sign-in...
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                Email
              </label>
              <input
                type="email"
                required
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
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-primary)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-strong)';
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-semibold text-[var(--accent-text)] hover:underline transition-all"
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 44px 10px 14px',
                    background: 'var(--bg-panel)',
                    border: '2px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    transition: 'var(--transition-fast)',
                  }}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-strong)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Remember me
              </span>
            </label>

            <button
              type="button"
              disabled={isGoogleSubmitting || isSubmitting}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-panel)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: isGoogleSubmitting || isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isGoogleSubmitting || isSubmitting ? 0.7 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.5 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.5H12z" />
                <path fill="#34A853" d="M2.6 7.8l3.2 2.3c.9-2 3-3.4 6.2-3.4 1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.5 2.5 12 2.5 8.2 2.5 4.9 4.6 2.6 7.8z" opacity="0" />
                <path fill="#FBBC05" d="M2.6 12c0 1.5.4 2.9 1.2 4.1l3.1-2.4c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7l-3.1-2.4C3 9.1 2.6 10.5 2.6 12z" />
                <path fill="#34A853" d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3-2.4c-.8.6-1.9 1-3.4 1-3 0-5.4-2-6.3-4.7l-3.1 2.4c2.2 3.6 5.6 6.1 9.4 6.1z" />
                <path fill="#4285F4" d="M21 12.4c0-.6-.1-1.1-.2-1.6H12v3.3h5c-.2 1.1-.8 2-1.6 2.6l3 2.4c1.8-1.6 2.6-4 2.6-6.7z" />
              </svg>
              {isGoogleSubmitting ? 'Redirecting to Google...' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -6 }}>
              <span style={{ height: 1, background: 'var(--border-subtle)', flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
              <span style={{ height: 1, background: 'var(--border-subtle)', flex: 1 }} />
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
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
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
                  <LogIn size={18} /> Sign In
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', margin: '32px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
