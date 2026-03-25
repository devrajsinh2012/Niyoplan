'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
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
        borderRadius: '50%', background: 'var(--status-done)', opacity: 0.1,
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
                onFocus={e => e.target.style.borderColor = 'var(--status-done)'}
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
                onFocus={e => e.target.style.borderColor = 'var(--status-done)'}
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
                onFocus={e => e.target.style.borderColor = 'var(--status-done)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>Must be at least 6 characters long</p>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              style={{
                width: '100%', padding: '12px', fontSize: 15, display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12,
                background: 'var(--status-done)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = ''}
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
            <Link href="/login" style={{ color: 'var(--status-done)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
