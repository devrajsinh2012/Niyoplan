'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import MySpaceListBoard from '@/components/myspace/MySpaceListBoard';
import MySpaceCalendar from '@/components/myspace/MySpaceCalendar';
import MySpaceDashboard from '@/components/myspace/MySpaceDashboard';
import { GenericPageSkeleton } from '@/components/ui/PageSkeleton';
import { LayoutList, Calendar, BarChart2 } from 'lucide-react';

const TABS = [
  { id: 'list', label: 'List / Board', icon: LayoutList },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
];

function MySpacePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'list';
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMyWork() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/my-work');
        if (!res.ok) throw new Error('Failed to load your cards');
        const data = await res.json();
        setCards(data.cards || []);
      } catch (err) {
        setError(err.message || 'Something went wrong');
        setCards([]);
      } finally {
        setLoading(false);
      }
    }
    loadMyWork();
  }, []);

  function switchTab(tabId) {
    router.push(`/my-space?tab=${tabId}`);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-6">
        <GenericPageSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-heading)' }}>
          My Space
        </h1>
      </div>

      {/* Tab bar */}
      <div
        className="mb-6 flex items-center gap-1 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 rounded-[4px] border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
        >
          {error}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'list' && (
        <MySpaceListBoard cards={cards || []} onCardsChange={setCards} />
      )}
      {activeTab === 'calendar' && (
        <MySpaceCalendar cards={cards || []} />
      )}
      {activeTab === 'dashboard' && (
        <MySpaceDashboard cards={cards || []} />
      )}
    </div>
  );
}

export default function MySpacePage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl p-6"><GenericPageSkeleton /></div>}>
      <MySpacePageContent />
    </Suspense>
  );
}
