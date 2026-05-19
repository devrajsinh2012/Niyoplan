'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiClient';
import { useOrganization } from '@/context/OrganizationContext';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NiyoplanLoader from '@/components/ui/NiyoplanLoader';
import Portal from '@/components/modals/Portal';

const tabs = ['overview', 'contacts', 'reminders', 'interactions', 'deliverables', 'analytics'];

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Modal({ title, children, onClose, onSave, saving, saveText = 'Save' }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#091E42]/60 p-4 backdrop-blur-[4px]">
        <div
          className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[12px] bg-[var(--bg-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/5 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <h2 className="tracking-tight text-xl font-bold text-[var(--text-heading)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-muted)] transition-all hover:rotate-90 hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-8 py-6 text-left space-y-8">
              {children}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <button type="button" onClick={onClose} className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 active:scale-95">
                {saving ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" /> : <><Plus size={16} />{saveText}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none';

function QuickForm({ type, client, projects, members, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (type === 'contact') return { contact_name: '', title: '', email: '', phone: '', is_primary: false, preferred_communication: 'email' };
    if (type === 'reminder') return { title: '', description: '', reminder_type: 'follow_up', due_at: '', remind_at: '', assigned_to: '', project_id: '' };
    if (type === 'interaction') return { title: '', notes: '', interaction_type: 'call', duration_minutes: '', outcome: '', action_items: '', next_action_at: '', project_id: '', create_follow_up: false };
    return { title: '', description: '', due_date: '', delivered_date: '', status: 'pending', acceptance_notes: '', project_id: '' };
  });

  const endpoint = `/api/clients/${client.id}/${type === 'contact' ? 'contacts' : type === 'reminder' ? 'reminders' : type === 'interaction' ? 'interactions' : 'deliverables'}`;

  const save = async () => {
    setSaving(true);
    try {
      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          project_id: form.project_id || null,
          assigned_to: form.assigned_to || null,
          duration_minutes: form.duration_minutes || null,
          due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
          remind_at: form.remind_at ? new Date(form.remind_at).toISOString() : null,
          next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `Failed to save ${type}`);
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} added`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message || `Failed to save ${type}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      title={`Add ${type[0].toUpperCase()}${type.slice(1)}`} 
      onClose={onClose}
      onSave={save}
      saving={saving}
      saveText={`Save ${type[0].toUpperCase()}${type.slice(1)}`}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {type === 'contact' && (
          <>
            <Field label="Name"><input className={inputClass} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
            <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Preferred"><select className={inputClass} value={form.preferred_communication} onChange={(e) => setForm({ ...form, preferred_communication: e.target.value })}><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="message">Message</option></select></Field>
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" id="is_primary" className="h-4 w-4 rounded border-[var(--border-subtle)] text-[#0052CC] focus:ring-[#0052CC]" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />
              <label htmlFor="is_primary" className="text-sm font-medium text-[var(--text-secondary)]">Primary contact</label>
            </div>
          </>
        )}

        {type === 'reminder' && (
          <>
            <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Type"><select className={inputClass} value={form.reminder_type} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })}><option value="follow_up">Follow up</option><option value="meeting">Meeting</option><option value="delivery">Delivery</option><option value="check_in">Check in</option><option value="other">Other</option></select></Field>
            <Field label="Due"><input type="datetime-local" className={inputClass} value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></Field>
            <Field label="Remind At"><input type="datetime-local" className={inputClass} value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} /></Field>
            <Field label="Project"><select className={inputClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Assign To"><select className={inputClass} value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}><option value="">Me/default</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profiles?.full_name || member.user_id}</option>)}</select></Field>
            <Field label="Description" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </>
        )}

        {type === 'interaction' && (
          <>
            <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Type"><select className={inputClass} value={form.interaction_type} onChange={(e) => setForm({ ...form, interaction_type: e.target.value })}><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="message">Message</option><option value="other">Other</option></select></Field>
            <Field label="Duration Minutes"><input type="number" className={inputClass} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
            <Field label="Project"><select className={inputClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Next Action"><input type="datetime-local" className={inputClass} value={form.next_action_at} onChange={(e) => setForm({ ...form, next_action_at: e.target.value })} /></Field>
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" id="create_follow_up" className="h-4 w-4 rounded border-[var(--border-subtle)] text-[#0052CC] focus:ring-[#0052CC]" checked={form.create_follow_up} onChange={(e) => setForm({ ...form, create_follow_up: e.target.checked })} />
              <label htmlFor="create_follow_up" className="text-sm font-medium text-[var(--text-secondary)]">Create follow-up reminder</label>
            </div>
            <Field label="Notes" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <Field label="Outcome" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></Field>
            <Field label="Action Items" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.action_items} onChange={(e) => setForm({ ...form, action_items: e.target.value })} /></Field>
          </>
        )}

        {type === 'deliverable' && (
          <>
            <Field label="Title" className="md:col-span-2"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="delivered">Delivered</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></Field>
            <Field label="Project"><select className={inputClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Due Date"><input type="date" className={inputClass} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Delivered Date"><input type="date" className={inputClass} value={form.delivered_date} onChange={(e) => setForm({ ...form, delivered_date: e.target.value })} /></Field>
            <Field label="Description" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Acceptance Notes" className="md:col-span-2"><textarea className={inputClass} rows={3} value={form.acceptance_notes} onChange={(e) => setForm({ ...form, acceptance_notes: e.target.value })} /></Field>
          </>
        )}
      </div>
    </Modal>
  );
}

function EmptyState({ label }) {
  return <div className="rounded-[4px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)]/40 px-4 py-8 text-center text-sm text-[var(--text-muted)]">No {label} yet.</div>;
}

export default function ClientProfilePage() {
  const { clientId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganization } = useOrganization();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview');
  const [modalType, setModalType] = useState(null);
  const canManage = ['admin', 'pm'].includes(activeOrganization?.role);

  const loadClient = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/clients/${clientId}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load client');
      setClient(payload);
    } catch (error) {
      toast.error(error.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadReferenceData = useCallback(async () => {
    if (!activeOrganization?.id) return;
    try {
      const [projectsResponse, membersResponse] = await Promise.all([
        apiFetch(`/api/projects?organizationId=${activeOrganization.id}`),
        apiFetch(`/api/organizations/${activeOrganization.id}/members`),
      ]);
      if (projectsResponse.ok) setProjects(await projectsResponse.json());
      if (membersResponse.ok) setMembers(await membersResponse.json());
    } catch (error) {
      console.error('Failed to load client reference data:', error);
    }
  }, [activeOrganization?.id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const reminderStats = useMemo(() => {
    const reminders = client?.reminders || [];
    const now = Date.now();
    return {
      pending: reminders.filter((item) => item.status === 'pending').length,
      overdue: reminders.filter((item) => item.status === 'pending' && new Date(item.due_at).getTime() < now).length,
    };
  }, [client?.reminders]);

  const archiveClient = async () => {
    if (!client || !confirm(`Archive ${client.name}?`)) return;
    try {
      const response = await apiFetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to archive client');
      toast.success('Client archived');
      router.push('/clients');
    } catch (error) {
      toast.error(error.message || 'Failed to archive client');
    }
  };

  const completeReminder = async (reminderId) => {
    try {
      const response = await apiFetch(`/api/client-reminders/${reminderId}/complete`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to complete reminder');
      toast.success('Reminder completed');
      loadClient();
    } catch (error) {
      toast.error(error.message || 'Failed to complete reminder');
    }
  };

  const updateDeliverableStatus = async (deliverable, status) => {
    try {
      const response = await apiFetch(`/api/clients/${client.id}/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, delivered_date: status === 'delivered' ? new Date().toISOString().split('T')[0] : deliverable.delivered_date }),
      });
      if (!response.ok) throw new Error('Failed to update deliverable');
      toast.success('Deliverable updated');
      loadClient();
    } catch (error) {
      toast.error(error.message || 'Failed to update deliverable');
    }
  };

  if (loading) return <NiyoplanLoader />;
  if (!client) return <div className="p-8 text-sm text-[var(--text-muted)]">Client not found.</div>;

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 lg:p-10">
      <Link href="/clients" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)]">
        <ArrowLeft size={16} /> Back to clients
      </Link>

      <header className="mb-8 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-[3px] bg-[var(--accent-subtle)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)]">{client.tier}</span>
              <span className="rounded-[3px] border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{client.status}</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-heading)]">{client.name}</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{client.company || 'No company name'} {client.email ? `| ${client.email}` : ''}</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setModalType('reminder')} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"><CalendarClock size={16} /> Reminder</button>
              <button onClick={archiveClient} className="inline-flex items-center gap-2 rounded-[4px] border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={16} /> Archive</button>
            </div>
          )}
        </div>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] pb-2">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-[4px] px-3 py-2 text-sm font-semibold capitalize ${activeTab === tab ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)]'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-5 text-lg font-bold text-[var(--text-heading)]">Client Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <p className="text-sm"><span className="font-semibold text-[var(--text-heading)]">Email:</span> {client.email || 'Not set'}</p>
              <p className="text-sm"><span className="font-semibold text-[var(--text-heading)]">Phone:</span> {client.phone || 'Not set'}</p>
              <p className="text-sm"><span className="font-semibold text-[var(--text-heading)]">Contract:</span> {client.contract_value ? `$${Number(client.contract_value).toLocaleString()}` : 'Not set'}</p>
              <p className="text-sm"><span className="font-semibold text-[var(--text-heading)]">Contract End:</span> {formatDate(client.contract_end_date)}</p>
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <div className="text-2xl font-bold text-[var(--text-heading)]">{reminderStats.pending}</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Pending Reminders</div>
            </div>
            <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <div className="text-2xl font-bold text-red-600">{reminderStats.overdue}</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Overdue</div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'contacts' && (
        <section className="space-y-3">
          {canManage && <button onClick={() => setModalType('contact')} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add Contact</button>}
          {!client.contacts?.length ? <EmptyState label="contacts" /> : client.contacts.map((contact) => (
            <div key={contact.id} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[var(--text-heading)]">{contact.contact_name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{contact.title || 'No title'} {contact.is_primary ? '| Primary' : ''}</p>
                </div>
                <UserRound size={18} className="text-[var(--text-muted)]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                {contact.email && <span className="inline-flex items-center gap-1"><Mail size={14} /> {contact.email}</span>}
                {contact.phone && <span className="inline-flex items-center gap-1"><Phone size={14} /> {contact.phone}</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'reminders' && (
        <section className="space-y-3">
          {canManage && <button onClick={() => setModalType('reminder')} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add Reminder</button>}
          {!client.reminders?.length ? <EmptyState label="reminders" /> : client.reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold text-[var(--text-heading)]">{reminder.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{reminder.description || reminder.reminder_type?.replace('_', ' ')}</p>
                  <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">Due {formatDate(reminder.due_at)} {reminder.project?.name ? `| ${reminder.project.name}` : ''}</p>
                </div>
                {reminder.status === 'pending' && canManage && <button onClick={() => completeReminder(reminder.id)} className="inline-flex items-center gap-2 rounded-[4px] border border-[#36B37E]/30 px-3 py-2 text-sm font-semibold text-[#006644] hover:bg-[#E3FCEF]"><CheckCircle2 size={16} /> Complete</button>}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'interactions' && (
        <section className="space-y-3">
          {canManage && <button onClick={() => setModalType('interaction')} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white"><Plus size={16} /> Log Interaction</button>}
          {!client.interactions?.length ? <EmptyState label="interactions" /> : client.interactions.map((interaction) => (
            <div key={interaction.id} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]"><MessageSquare size={13} /> {interaction.interaction_type}</div>
              <h3 className="font-bold text-[var(--text-heading)]">{interaction.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{interaction.notes || interaction.outcome || 'No notes added'}</p>
              {interaction.next_action_at && <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">Next action: {formatDate(interaction.next_action_at)}</p>}
            </div>
          ))}
        </section>
      )}

      {activeTab === 'deliverables' && (
        <section className="space-y-3">
          {canManage && <button onClick={() => setModalType('deliverable')} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add Deliverable</button>}
          {!client.deliverables?.length ? <EmptyState label="deliverables" /> : client.deliverables.map((deliverable) => (
            <div key={deliverable.id} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]"><ClipboardList size={13} /> {deliverable.status}</div>
                  <h3 className="font-bold text-[var(--text-heading)]">{deliverable.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Due {formatDate(deliverable.due_date)} {deliverable.project?.name ? `| ${deliverable.project.name}` : ''}</p>
                </div>
                {canManage && (
                  <select className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={deliverable.status} onChange={(e) => updateDeliverableStatus(deliverable, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"><div className="text-2xl font-bold">{client.contacts?.length || 0}</div><p className="text-xs font-bold uppercase text-[var(--text-muted)]">Contacts</p></div>
          <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"><div className="text-2xl font-bold">{client.interactions?.length || 0}</div><p className="text-xs font-bold uppercase text-[var(--text-muted)]">Interactions</p></div>
          <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"><div className="text-2xl font-bold">{client.deliverables?.filter((item) => ['delivered', 'approved'].includes(item.status)).length || 0}/{client.deliverables?.length || 0}</div><p className="text-xs font-bold uppercase text-[var(--text-muted)]">Deliverables Done</p></div>
        </section>
      )}

      <button onClick={loadClient} className="mt-8 inline-flex items-center gap-2 rounded-[4px] border border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]"><RefreshCw size={15} /> Refresh</button>

      {modalType && (
        <QuickForm
          type={modalType}
          client={client}
          projects={projects}
          members={members}
          onClose={() => setModalType(null)}
          onSaved={loadClient}
        />
      )}
    </div>
  );
}

