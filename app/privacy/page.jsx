export const metadata = {
  title: 'Privacy Policy | Niyoplan',
};

const sections = [
  {
    title: 'Introduction',
    body: 'Niyoplan is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and how we protect it when you use our platform.',
  },
  {
    title: 'Data Security',
    body: 'We apply industry-standard safeguards to protect account and project data, including access controls, encrypted data transport, and operational security practices to reduce unauthorized access risks.',
  },
  {
    title: 'Google User Data',
    body: 'Niyoplan requests access to Google Drive so users can attach Drive files to projects and cards. We only store file metadata in our database, such as file IDs, file names, and shareable links. We do not download or store actual file contents, and we do not share Google Drive data with third parties.',
  },
  {
    title: 'Contact Us',
    body: 'If you have any questions or concerns about this Privacy Policy or how your data is handled, contact us at support@niyoplan.com.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Niyoplan Policy</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Last updated: April 3, 2026</p>
        </header>

        <section className="space-y-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8"
            >
              <h2 className="text-xl font-semibold text-[var(--text-heading)]">{section.title}</h2>
              <p className="mt-3 leading-7 text-[var(--text-secondary)]">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
