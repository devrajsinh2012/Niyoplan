import React from 'react';

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-[var(--bg-panel-hover)] ${className}`} />;
}

export function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-app)]">
      <div className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6 py-3">
        <SkeletonBlock className="h-full w-52" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-16 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] md:block">
          <div className="space-y-4 p-3">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
          </div>
        </aside>
        <main className="flex-1 overflow-hidden p-6">
          <GenericPageSkeleton />
        </main>
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
      </div>
      <SkeletonBlock className="h-72" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-8 w-72" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 w-24" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </div>
      <SkeletonBlock className="h-72" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
        <SkeletonBlock className="h-[420px]" />
        <SkeletonBlock className="h-[420px]" />
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <div className="flex flex-wrap gap-4">
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-52" />
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailPageSkeleton() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col gap-6 pb-10">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-36" />
        ))}
      </div>
      <SkeletonBlock className="h-[520px]" />
    </div>
  );
}

export function ProjectSettingsPageSkeleton() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-10 w-72" />
      </div>
      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-28" />
        ))}
      </div>
      <SkeletonBlock className="h-[520px]" />
    </div>
  );
}

export function CompanySettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-64 bg-gray-200" />
          <SkeletonBlock className="h-4 w-80 bg-gray-200" />
        </div>
        <SkeletonBlock className="h-16 bg-gray-200" />
        <SkeletonBlock className="h-[520px] bg-gray-200" />
      </div>
    </div>
  );
}

export function ProfileSettingsPageSkeleton() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <SkeletonBlock className="h-64" />
      <SkeletonBlock className="h-80" />
      <SkeletonBlock className="h-80" />
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-5 py-8">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-2xl" />
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8">
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
        </div>
      </div>
    </div>
  );
}

export function OnboardingPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-6 md:p-10">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonBlock className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
      <SkeletonBlock className="h-14 w-48" />
    </div>
  );
}

export function AdminSettingsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-52" />
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  );
}

export function KanbanPanelSkeleton() {
  return (
    <div className="kanban-wrapper">
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SkeletonBlock className="h-8 w-44" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-9 w-20" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, colIndex) => (
          <div key={colIndex} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
            <SkeletonBlock className="mb-3 h-6 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <SkeletonBlock key={cardIndex} className="h-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GanttPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-16" />
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-8 w-20" />
        </div>
        <SkeletonBlock className="h-8 w-28" />
      </div>
      <SkeletonBlock className="mb-3 h-12 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DocsPanelSkeleton() {
  return (
    <div className="grid min-h-[600px] grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          <SkeletonBlock className="h-8 bg-gray-200" />
          <SkeletonBlock className="h-8 bg-gray-200" />
          <SkeletonBlock className="h-8 bg-gray-200" />
        </div>
        <SkeletonBlock className="h-4 w-20 bg-gray-200" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 bg-gray-200" />
          ))}
        </div>
      </aside>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="h-14 w-full bg-gray-200" />
        <SkeletonBlock className="h-[420px] w-full bg-gray-200" />
        <div className="flex justify-end">
          <SkeletonBlock className="h-11 w-32 bg-gray-200" />
        </div>
      </section>
    </div>
  );
}

export function GoalsPanelSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="mb-4 h-7 w-40 bg-gray-200" />
        <div className="space-y-3">
          <SkeletonBlock className="h-11 w-full bg-gray-200" />
          <SkeletonBlock className="h-28 w-full bg-gray-200" />
          <SkeletonBlock className="h-10 w-52 bg-gray-200" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-6 w-2/3 bg-gray-200" />
            <SkeletonBlock className="h-16 w-full bg-gray-200" />
            <SkeletonBlock className="h-24 w-full bg-gray-200" />
            <SkeletonBlock className="h-10 w-full bg-gray-200" />
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="mb-3 h-6 w-48 bg-gray-200" />
        <SkeletonBlock className="h-40 w-full bg-gray-200" />
      </section>
    </div>
  );
}

export function MeetingsPanelSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="mb-4 h-7 w-56 bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonBlock className="h-64 w-full bg-gray-200" />
          <SkeletonBlock className="h-64 w-full bg-gray-200" />
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="mb-4 h-7 w-44 bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-52 w-full bg-gray-200 md:col-span-2" />
          <SkeletonBlock className="h-44 w-full bg-gray-200" />
          <SkeletonBlock className="h-44 w-full bg-gray-200" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-72 w-full bg-gray-200" />
        <SkeletonBlock className="h-72 w-full bg-gray-200" />
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="mb-3 h-7 w-40 bg-gray-200" />
        <SkeletonBlock className="h-48 w-full bg-gray-200" />
      </section>
    </div>
  );
}
