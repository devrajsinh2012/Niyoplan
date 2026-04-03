export const metadata = {
  title: 'API Documentation | Niyoplan',
};

const apiGroups = [
  {
    title: 'Authentication',
    items: ['Sign in and session lifecycle', 'Onboarding status checks', 'Organization-aware access control'],
  },
  {
    title: 'Projects and Cards',
    items: ['Project lifecycle endpoints', 'Card management and status updates', 'Sprint and dashboard summaries'],
  },
  {
    title: 'Drive and Files',
    items: ['Google Drive connect/disconnect flows', 'Attach file metadata to cards and projects', 'Access-controlled file linking'],
  },
];

export default function ApiDocumentationPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">API Documentation</h1>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">
            Niyoplan API routes are organized around secure team workflows. Use these endpoints to automate project delivery,
            manage file attachments, and integrate external tools.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {apiGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]"
            >
              <h2 className="text-lg font-semibold text-[var(--text-heading)]">{group.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {group.items.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
