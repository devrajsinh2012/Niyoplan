'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset link sent. Please check your email.');
    } catch (error) {
      toast.error(error?.message || 'Failed to send reset email');
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
          top: '-10%',
          right: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
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
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Enter your email and we will send you a reset link
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
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
                  <Mail size={18} /> Send Reset Link
                </>
              )}
            </button>
          </form>

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
