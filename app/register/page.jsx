'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';

export default function RegisterPage() {
  const successColor = 'var(--status-done, #16a34a)';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signUp, signInWithGoogle, signInInitializing, signUpInitializing } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;
      
      toast.success('Check your email to confirm your account before signing in.');
      router.push('/login');
    } catch (error) {
      toast.error(error?.message || 'Could not create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);

    try {
      const { error } = await signInWithGoogle({ rememberMe: true, redirectPath: '/login' });
      if (error) throw error;
    } catch (error) {
      toast.error(error?.message || 'Failed to sign in with Google');
      setIsGoogleSubmitting(false);
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
        position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%',
        borderRadius: '50%', background: successColor, opacity: 0.1,
        filter: 'blur(120px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%',
        borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.1,
        filter: 'blur(120px)', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ margin: '0 auto 24px' }}>
            <BrandMark size={64} className="rounded-2xl" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Join NiyoPlan and organize your work
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {(signUpInitializing || signInInitializing) && (
            <p
              style={{
                margin: '0 0 14px',
                fontSize: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              Preparing authentication...
            </p>
          )}

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
              marginBottom: 18,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.5 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.5H12z" />
              <path fill="#FBBC05" d="M2.6 12c0 1.5.4 2.9 1.2 4.1l3.1-2.4c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7l-3.1-2.4C3 9.1 2.6 10.5 2.6 12z" />
              <path fill="#34A853" d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3-2.4c-.8.6-1.9 1-3.4 1-3 0-5.4-2-6.3-4.7l-3.1 2.4c2.2 3.6 5.6 6.1 9.4 6.1z" />
              <path fill="#4285F4" d="M21 12.4c0-.6-.1-1.1-.2-1.6H12v3.3h5c-.2 1.1-.8 2-1.6 2.6l3 2.4c1.8-1.6 2.6-4 2.6-6.7z" />
            </svg>
            {isGoogleSubmitting ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <span style={{ height: 1, background: 'var(--border-subtle)', flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
            <span style={{ height: 1, background: 'var(--border-subtle)', flex: 1 }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Full Name
              </label>
              <input
                type="text" required
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-panel)',
                  border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 14, transition: 'var(--transition-fast)'
                }}
                placeholder="John Doe"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                onFocus={e => e.target.style.borderColor = successColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

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
                onFocus={e => e.target.style.borderColor = successColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password" required minLength={6}
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-panel)',
                  border: '2px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 14, transition: 'var(--transition-fast)'
                }}
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = successColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>Must be at least 6 characters long</p>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="btn-primary"
              style={{
                width: '100%', padding: '12px', fontSize: 15, display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontWeight: 600,
                minHeight: 44
              }}
            >
              {isSubmitting ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="animate-spin" />
              ) : (
                <><UserPlus size={18} /> Sign Up</>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', margin: '32px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: successColor, textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
