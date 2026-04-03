export const metadata = {
  title: 'Terms of Service | Niyoplan',
};

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using Niyoplan, you agree to these Terms of Service. If you do not agree to these terms, you should not use the service.',
  },
  {
    title: 'Use of Service',
    body: 'You agree to use Niyoplan in compliance with applicable laws and not to misuse the platform, interfere with operations, or attempt unauthorized access to data or systems.',
  },
  {
    title: 'User Accounts',
    body: 'You are responsible for maintaining account security and for activities under your account. Please keep your credentials confidential and notify us promptly about unauthorized use.',
  },
  {
    title: 'Contact Information',
    body: 'For legal, support, or policy-related questions, contact support@niyoplan.com.',
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Niyoplan Policy</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">Terms of Service</h1>
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
