'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';

const REMEMBER_ME_KEY = 'niyoplan-remember-me';
const REMEMBERED_EMAIL_KEY = 'niyoplan-remembered-email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, user, loading } = useAuth();
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
      router.replace('/');
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
      router.replace('/');
    } catch (error) {
      toast.error(error?.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'var(--bg-app)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden'
    }} className="animate-fade-in text-primary">
      
      {/* Background Ornaments */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
        borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.1,
        filter: 'blur(120px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%',
        borderRadius: '50%', background: '#6554C0', opacity: 0.1,
        filter: 'blur(120px)', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <BrandMark size={64} className="mx-auto mb-6 rounded-2xl" />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            Welcome to NiyoPlan
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email" required
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-panel)',
                  border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 14, transition: 'var(--transition-fast)'
                }}
                placeholder="name@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <a href="#" style={{ fontSize: 13, color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot?
                </a>
              </div>
              <input
                type="password" required
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-panel)',
                  border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 14, transition: 'var(--transition-fast)'
                }}
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Remember me on this browser
              </span>
            </label>

            <button
              type="submit" disabled={isSubmitting} className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 15, display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}
            >
              {isSubmitting ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="animate-spin" />
              ) : (
                <><LogIn size={18} /> Sign In</>
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
