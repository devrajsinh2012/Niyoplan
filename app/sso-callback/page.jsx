'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SSOCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    const finishOAuth = async () => {
      await supabase.auth.getSession();

      if (!active) return;

      const redirectPath = searchParams.get('redirect') || '/login';
      router.replace(redirectPath.startsWith('/') ? redirectPath : '/login');
    };

    finishOAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return null;
}
