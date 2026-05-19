'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useOrganization } from '@/context/OrganizationContext';
import { apiFetch } from '@/lib/apiClient';
import { BriefcaseBusiness, CalendarClock, CheckCircle2, DollarSign, Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import NiyoplanLoader from '@/components/ui/NiyoplanLoader';
import Portal from '@/components/modals/Portal';

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'active',
  tier: 'standard',
  contract_value: '',
  contract_end_date: '',
};

function ClientModal({ open, onClose, organizationId, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  if (!open) return null;

  const save = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch('/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          organizationId,
          contract_value: form.contract_value || null,
          contract_end_date: form.contract_end_date || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to create client');

      toast.success('Client created');
      onCreated(payload);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#091E42]/60 p-4 backdrop-blur-[4px]">
        <div
          className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[12px] bg-[var(--bg-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/5 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <form id="create-client-form" onSubmit={save} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <div>
                <h2 className="tracking-tight text-xl font-bold text-[var(--text-heading)]">Add Client</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Create a company-scoped client profile.</p>
              </div>
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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Client Name *</label>
                  <input required className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none" placeholder="e.g. Acme Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Company</label>
                  <input className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" placeholder="Company Name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Email</label>
                  <input type="email" className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" placeholder="client@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Phone</label>
                  <input type="tel" className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status</label>
                  <select className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Tier</label>
                  <select className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                    <option value="standard">Standard</option>
                    <option value="vip">VIP</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Contract Value</label>
                  <input type="number" min="0" className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" placeholder="e.g. 10000" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Contract End Date</label>
                  <input type="date" className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <button type="button" onClick={onClose} className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95">Cancel</button>
              <button form="create-client-form" type="submit" disabled={saving} className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 active:scale-95">
                {saving ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" /> : <><Plus size={16} />Create Client</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <Icon size={13} /> {label}
      </div>
      <div className="text-2xl font-bold text-[var(--text-heading)]">{value}</div>
    </div>
  );
}

export default function ClientsPage() {
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('recent');
  const canManage = ['admin', 'pm'].includes(activeOrganization?.role);

  const loadClients = useCallback(async () => {
    if (!activeOrganization?.id) {
      setClients([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({
        organizationId: activeOrganization.id,
        search,
        status,
        tier,
        sort,
      });

      const [clientsResponse, statsResponse] = await Promise.all([
        apiFetch(`/api/clients?${query.toString()}`),
        apiFetch(`/api/clients/dashboard/stats?organizationId=${activeOrganization.id}`),
      ]);

      const clientsPayload = await clientsResponse.json();
      const statsPayload = await statsResponse.json();

      if (!clientsResponse.ok) throw new Error(clientsPayload?.error || 'Failed to load clients');
      if (!statsResponse.ok) throw new Error(statsPayload?.error || 'Failed to load client stats');

      setClients(Array.isArray(clientsPayload) ? clientsPayload : []);
      setStats(statsPayload);
    } catch (error) {
      toast.error(error.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.id, search, status, tier, sort]);

  useEffect(() => {
    if (!orgLoading) loadClients();
  }, [orgLoading, loadClients]);

  const totalContractValue = useMemo(() => clients.reduce((sum, client) => sum + Number(client.contract_value || 0), 0), [clients]);

  if (loading) return <NiyoplanLoader />;

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 lg:p-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] text-[var(--accent-primary)]">
              <BriefcaseBusiness size={20} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-heading)]">Clients</h1>
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)]">Manage client relationships, follow-ups, deliverables, and interaction history for {activeOrganization?.name || 'this company'}.</p>
        </div>
        {canManage && (
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-[4px] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-hover)]">
            <Plus size={16} /> Add Client
          </button>
        )}
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Active Clients" value={stats?.active_clients ?? 0} />
        <Stat icon={CalendarClock} label="Overdue Reminders" value={stats?.overdue_reminders ?? 0} />
        <Stat icon={CheckCircle2} label="Deliverable Completion" value={`${stats?.deliverable_completion_rate ?? 0}%`} />
        <Stat icon={DollarSign} label="Visible Contract Value" value={totalContractValue ? `$${Math.round(totalContractValue).toLocaleString()}` : '$0'} />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="w-full rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent-primary)]" placeholder="Search clients, companies, email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
          <option value="all">All Statuses</option>
        </select>
        <select className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All Tiers</option>
          <option value="vip">VIP</option>
          <option value="standard">Standard</option>
          <option value="trial">Trial</option>
        </select>
        <select className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recently Added</option>
          <option value="name">Name</option>
          <option value="contract">Contract Value</option>
        </select>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-[6px] border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-panel-hover)] px-6 py-16 text-center">
          <BriefcaseBusiness size={44} className="mx-auto mb-4 text-[var(--text-muted)] opacity-70" />
          <h2 className="text-lg font-bold text-[var(--text-heading)]">No clients found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">Create a client profile to start tracking contacts, reminders, interactions, and deliverables.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`} className="group rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm transition hover:border-[var(--accent-primary)] hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-bold text-[var(--text-heading)] group-hover:text-[var(--accent-primary)]">{client.name}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{client.company || client.email || 'No company added'}</p>
                </div>
                <span className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">{client.tier}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-4 text-center">
                <div>
                  <div className="text-base font-bold text-[var(--text-heading)]">{client.contacts?.[0]?.count || 0}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Contacts</div>
                </div>
                <div>
                  <div className="text-base font-bold text-[var(--text-heading)]">{client.reminders?.[0]?.count || 0}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Reminders</div>
                </div>
                <div>
                  <div className="text-base font-bold text-[var(--text-heading)]">{client.deliverables?.[0]?.count || 0}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Deliverables</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ClientModal open={modalOpen} onClose={() => setModalOpen(false)} organizationId={activeOrganization?.id} onCreated={() => loadClients()} />
    </div>
  );
}

