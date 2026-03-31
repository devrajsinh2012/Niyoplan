'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { toolsCatalog, toolsRoute } from '../tools.routes';

function ToolLoadingCard({ title, description }) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--bg-panel)]" />
          <div className="h-3 w-48 animate-pulse rounded bg-[var(--bg-panel)]" />
        </div>
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]" />
      <p className="mt-3 text-sm text-[var(--text-muted)]">{title} - {description}</p>
    </section>
  );
}

const CalculatorTool = dynamic(() => import('./Calculator'), {
  ssr: false,
  loading: () => <ToolLoadingCard title="Calculator" description="Loading calculator..." />,
});

const NotesTool = dynamic(() => import('./Notes'), {
  ssr: false,
  loading: () => <ToolLoadingCard title="Notes" description="Loading notes..." />,
});

const JsonFormatterTool = dynamic(() => import('./JsonFormatter'), {
  ssr: false,
  loading: () => <ToolLoadingCard title="JSON Formatter & Validator" description="Loading formatter..." />,
});

const AiWriterTool = dynamic(() => import('./AiWriter'), {
  ssr: false,
  loading: () => <ToolLoadingCard title="AI Writing Assistant" description="Loading AI writer..." />,
});

const TOOL_COMPONENTS = {
  calculator: CalculatorTool,
  notes: NotesTool,
  jsonFormatter: JsonFormatterTool,
  aiWriter: AiWriterTool,
};

export default function ToolsDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Workspace</p>
          <h1 className="text-2xl font-semibold text-[var(--text-heading)]">{toolsRoute.label}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{toolsRoute.description}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {toolsCatalog.map((tool) => {
          const ToolComponent = TOOL_COMPONENTS[tool.id];
          const Icon = tool.icon;

          return (
            <div key={tool.id} className="min-w-0">
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Icon size={12} />
                {tool.label}
              </div>
              <ToolComponent />
            </div>
          );
        })}
      </div>
    </div>
  );
}