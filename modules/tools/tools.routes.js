import { Braces, Calculator, FileText, WandSparkles } from 'lucide-react';

export const toolsRoute = {
  href: '/tools',
  label: 'Tools',
  description: 'Lightweight productivity utilities for daily work.',
};

export const toolsCatalog = [
  {
    id: 'calculator',
    label: 'Calculator',
    description: 'Basic arithmetic with percentages and keyboard input.',
    icon: Calculator,
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Quick local notes with autosave and timestamps.',
    icon: FileText,
  },
  {
    id: 'jsonFormatter',
    label: 'JSON Formatter',
    description: 'Validate and pretty-print JSON locally.',
    icon: Braces,
  },
  {
    id: 'aiWriter',
    label: 'AI Writing Assistant',
    description: 'Refine text into a concise professional tone.',
    icon: WandSparkles,
  },
];