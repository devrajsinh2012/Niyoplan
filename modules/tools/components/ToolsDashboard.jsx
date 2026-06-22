'use client';

import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState(toolsCatalog[0]?.id || 'calculator');

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Workspace</p>
            <h1 className="text-2xl font-semibold text-[var(--text-heading)]">{toolsRoute.label}</h1>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{toolsRoute.description}</p>
          </div>
          
          <div className="flex-shrink-0">
            <nav className="flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1 shadow-sm overflow-x-auto scrollbar-none max-w-full">
              {toolsCatalog.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 select-none whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-subtle)]/50'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/50 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />
                    {tool.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {toolsCatalog.map((tool) => {
          const ToolComponent = TOOL_COMPONENTS[tool.id];
          const isActive = activeTab === tool.id;

          return (
            <div key={tool.id} className={isActive ? 'block animate-fade-in' : 'hidden'}>
              <ToolComponent />
            </div>
          );
        })}
      </div>
    </div>
  );
}