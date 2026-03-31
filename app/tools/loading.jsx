export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--bg-panel)]" />
        <div className="mt-3 h-7 w-32 animate-pulse rounded bg-[var(--bg-panel)]" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--bg-panel)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--bg-panel)]" />
            <div className="mt-4 h-56 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]" />
          </div>
        ))}
      </div>
    </div>
  );
}