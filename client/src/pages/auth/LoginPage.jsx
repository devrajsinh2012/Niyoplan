import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to sign in');
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
    }} className="animate-fade-in">
      
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
          <div style={{
            width: 64, height: 64, margin: '0 auto 24px', borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent-primary), #6554C0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(12, 102, 228, 0.2)',
          }}>
            <span style={{ fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: -1 }}>N</span>
          </div>
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
            <Link to="/register" style={{ color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
