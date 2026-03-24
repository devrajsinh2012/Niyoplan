'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import InputModal from '@/components/ui/InputModal';
import { FolderPlus, FilePlus2, Layers3 } from 'lucide-react';
import { DocsPanelSkeleton } from '@/components/ui/PageSkeleton';

export default function DocsWorkspacePanel({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState({ isOpen: false, type: null });

  const selectedDoc = useMemo(() => docs.find((doc) => doc.id === selectedDocId) || null, [docs, selectedDocId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadDocs = async () => {
        const res = await fetch(`/api/projects/${projectId}/docs`);
        if (!res.ok) return [];
        return res.json();
      };
      const loadHierarchy = async () => {
        const res = await fetch(`/api/projects/${projectId}/spaces`);
        if (!res.ok) return { spaces: [], folders: [] };
        return res.json();
      };

      const [docRows, hierarchy] = await Promise.all([loadDocs(), loadHierarchy()]);
      const normalizedDocs = Array.isArray(docRows) ? docRows : [];
      setDocs(normalizedDocs);
      setSpaces(Array.isArray(hierarchy?.spaces) ? hierarchy.spaces : []);
      setFolders(Array.isArray(hierarchy?.folders) ? hierarchy.folders : []);
      if (normalizedDocs.length > 0 && !selectedDocId) setSelectedDocId(normalizedDocs[0].id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load docs workspace');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDocId]);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, loadData]);

  const createSpace = async (name) => {
    if (!name?.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) throw new Error('Failed to create space');
      toast.success('Space created');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create space');
    }
  };

  const createFolder = async (name) => {
    if (!name?.trim()) return;
    if (!spaces.length) {
      toast.error('Create a space first');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), space_id: spaces[0].id })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      toast.success('Folder created');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const createDoc = async (title) => {
    if (!title?.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          space_id: spaces[0]?.id || null,
          folder_id: folders[0]?.id || null,
          content: ''
        })
      });
      if (!res.ok) throw new Error('Failed to create doc');
      const created = await res.json();
      toast.success('Doc created');
      await loadData();
      setSelectedDocId(created.id);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create doc');
    }
  };

  const updateSelectedDoc = (field, value) => {
    setDocs((prev) => prev.map((doc) => (doc.id === selectedDocId ? { ...doc, [field]: value } : doc)));
  };

  const saveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedDoc.title,
          content: selectedDoc.content,
          space_id: selectedDoc.space_id,
          folder_id: selectedDoc.folder_id
        })
      });
      if (!res.ok) throw new Error('Failed to save doc');
      toast.success('Doc saved');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save doc');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = (type) => {
    setCreateModal({ isOpen: true, type });
  };

  const handleCreateFromModal = async (value) => {
    const modalType = createModal.type;
    setCreateModal({ isOpen: false, type: null });

    if (modalType === 'space') {
      await createSpace(value);
      return;
    }

    if (modalType === 'folder') {
      await createFolder(value);
      return;
    }

    if (modalType === 'doc') {
      await createDoc(value);
    }
  };

  if (loading) return <DocsPanelSkeleton />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4 min-h-[600px]">
      <aside className="rounded-2xl p-4 space-y-4 bg-white border border-gray-200 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5 px-0.5">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={() => openCreateModal('space')}>+ Space</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={() => openCreateModal('folder')}>+ Folder</button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={() => openCreateModal('doc')}>+ Doc</button>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">Spaces</div>
          <div className="space-y-1">
            {spaces.map((space) => (
              <div key={space.id} className="text-xs text-gray-700 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 font-medium">{space.name}</div>
            ))}
            {!spaces.length && <div className="text-[11px] text-gray-400 px-2 font-medium">No spaces yet</div>}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">Documents</div>
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                {doc.title}
              </button>
            ))}
            {!docs.length && <div className="text-[11px] text-gray-400 px-2 font-medium">No docs yet</div>}
          </div>
        </div>
      </aside>

      <section className="rounded-2xl p-6 flex flex-col gap-4 bg-white border border-gray-200 shadow-sm">
        {!selectedDoc ? (
          <div className="text-gray-400 font-medium py-40 text-center">Select or create a doc to start editing.</div>
        ) : (
          <>
            <input
              className="w-full bg-white border border-gray-300 rounded-xl p-4 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-lg font-bold"
              value={selectedDoc.title || ''}
              onChange={(e) => updateSelectedDoc('title', e.target.value)}
            />
            <textarea
              className="w-full bg-white border border-gray-300 rounded-xl p-4 text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium flex-1 min-h-[460px] resize-none leading-relaxed"
              placeholder="Write your collaborative notes here..."
              value={selectedDoc.content || ''}
              onChange={(e) => updateSelectedDoc('content', e.target.value)}
            />
            <div className="flex justify-end pt-2">
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 py-3 text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                onClick={saveDoc}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : 'Save Document'}
              </button>
            </div>
          </>
        )}
      </section>

      <InputModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false, type: null })}
        onSubmit={handleCreateFromModal}
        title={
          createModal.type === 'space'
            ? 'Create Space'
            : createModal.type === 'folder'
              ? 'Create Folder'
              : 'Create Document'
        }
        label={
          createModal.type === 'space'
            ? 'Space Name'
            : createModal.type === 'folder'
              ? 'Folder Name'
              : 'Document Title'
        }
        placeholder={
          createModal.type === 'space'
            ? 'e.g. Product Design'
            : createModal.type === 'folder'
              ? 'e.g. Sprint Notes'
              : 'e.g. API Guidelines'
        }
        icon={
          createModal.type === 'space'
            ? Layers3
            : createModal.type === 'folder'
              ? FolderPlus
              : FilePlus2
        }
        submitLabel={
          createModal.type === 'space'
            ? 'Create Space'
            : createModal.type === 'folder'
              ? 'Create Folder'
              : 'Create Doc'
        }
        maxLength={80}
      />
    </div>
  );
}
