'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/apiClient';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function CreateProjectModal({ 
    isOpen, 
    onClose, 
    activeOrganization, 
    profile, 
    onProjectCreated 
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [projectRequirementLink, setProjectRequirementLink] = useState('');
  const [designPrototypeLink, setDesignPrototypeLink] = useState('');
  const [apiDocumentationLink, setApiDocumentationLink] = useState('');

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!prefix || prefix.length < 4) {
      const words = val.split(' ').filter(w => w.length > 0);
      let newPrefix = '';
      if (words.length === 1) {
        newPrefix = words[0].substring(0, 4).toUpperCase();
      } else {
        newPrefix = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
      }
      setPrefix(newPrefix);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const organizationId = activeOrganization?.id;

      if (!organizationId) {
        throw new Error('No active company found. Please complete onboarding first.');
      }

      // Use the API route which we just fixed to include organization_id
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          prefix: prefix.toUpperCase(),
          organizationId: organizationId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const project = await res.json();

      // Create default lists
      await supabase.from('lists').insert(DEFAULT_LISTS.map((list) => ({
        project_id: project.id,
        name: list.name,
        rank: list.rank
      })));

      // Create resources/docs if any
      const docsToCreate = [
        { title: 'Project Requirement', content: projectRequirementLink.trim() },
        { title: 'Design Prototype', content: designPrototypeLink.trim() },
        { title: 'API Documentation', content: apiDocumentationLink.trim() },
      ].filter((doc) => doc.content);

      if (docsToCreate.length > 0) {
        await supabase.from('docs').insert(
          docsToCreate.map((doc) => ({
            project_id: project.id,
            title: doc.title,
            content: doc.content,
            created_by: profile?.id,
            updated_by: profile?.id,
          }))
        );
      }

      toast.success('Project created!');
      setName('');
      setDescription('');
      setPrefix('');
      setProjectRequirementLink('');
      setDesignPrototypeLink('');
      setApiDocumentationLink('');
      
      if (onProjectCreated) onProjectCreated(project);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#091E42]/60 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-lg bg-[var(--bg-surface)] p-8 shadow-2xl animate-fade-in ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Create Project</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreateProject} className="flex flex-col gap-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text" 
              required
              className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
              placeholder="e.g. Website Overhaul"
              value={name} 
              onChange={handleNameChange}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Project Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text" 
              required 
              maxLength={6}
              className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-bold uppercase text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none placeholder:font-medium tracking-widest"
              placeholder="e.g. WEB"
              value={prefix} 
              onChange={e => setPrefix(e.target.value.toUpperCase())}
            />
            <p className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
              Issues will look like <span className="font-bold text-[#0052CC]">{prefix || 'WEB'}-123</span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              className="w-full min-h-[100px] rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none resize-none"
              placeholder="What is this project about?"
              value={description} 
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3 border border-[var(--border-subtle)] rounded-[4px] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Project Resources (Optional)
            </p>
            <input
              type="url"
              className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
              placeholder="Project Requirement URL"
              value={projectRequirementLink}
              onChange={(e) => setProjectRequirementLink(e.target.value)}
            />
            <input
              type="url"
              className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
              placeholder="Design Prototype URL"
              value={designPrototypeLink}
              onChange={(e) => setDesignPrototypeLink(e.target.value)}
            />
            <input
              type="url"
              className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
              placeholder="API Documentation URL"
              value={apiDocumentationLink}
              onChange={(e) => setApiDocumentationLink(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button 
              type="button" 
              className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 active:scale-95" 
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
