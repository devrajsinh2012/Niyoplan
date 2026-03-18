import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';

export default function DocsWorkspacePanel({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDoc = useMemo(() => docs.find((doc) => doc.id === selectedDocId) || null, [docs, selectedDocId]);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRows, hierarchy] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/docs`),
        apiFetch(`/api/projects/${projectId}/spaces`)
      ]);
      setDocs(docRows || []);
      setSpaces(hierarchy?.spaces || []);
      setFolders(hierarchy?.folders || []);
      if ((docRows || []).length > 0 && !selectedDocId) setSelectedDocId(docRows[0].id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load docs workspace');
    } finally {
      setLoading(false);
    }
  };

  const createSpace = async () => {
    const name = prompt('Space name');
    if (!name) return;
    try {
      await apiFetch(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      toast.success('Space created');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create space');
    }
  };

  const createFolder = async () => {
    const name = prompt('Folder name');
    if (!name) return;
    if (!spaces.length) {
      toast.error('Create a space first');
      return;
    }

    try {
      await apiFetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        body: JSON.stringify({ name, space_id: spaces[0].id })
      });
      toast.success('Folder created');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const createDoc = async () => {
    const title = prompt('Doc title');
    if (!title) return;

    try {
      const created = await apiFetch(`/api/projects/${projectId}/docs`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          space_id: spaces[0]?.id || null,
          folder_id: folders[0]?.id || null,
          content: ''
        })
      });
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
      await apiFetch(`/api/projects/${projectId}/docs/${selectedDoc.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedDoc.title,
          content: selectedDoc.content,
          space_id: selectedDoc.space_id,
          folder_id: selectedDoc.folder_id
        })
      });
      toast.success('Doc saved');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save doc');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300">Loading docs...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 min-h-[640px]">
      <aside className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={createSpace}>+ Space</button>
          <button className="btn-secondary text-xs" onClick={createFolder}>+ Folder</button>
          <button className="btn-primary text-xs" onClick={createDoc}>+ Doc</button>
        </div>

        <div className="text-xs text-slate-400">Spaces</div>
        <div className="space-y-1">
          {spaces.map((space) => (
            <div key={space.id} className="text-sm text-slate-200 border border-slate-800 rounded px-2 py-1">{space.name}</div>
          ))}
          {!spaces.length && <div className="text-xs text-slate-500">No spaces yet</div>}
        </div>

        <div className="text-xs text-slate-400 mt-3">Docs</div>
        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {docs.map((doc) => (
            <button
              key={doc.id}
              className={`w-full text-left px-2 py-2 rounded text-sm border ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-slate-800 bg-slate-900/30 text-slate-300'}`}
              onClick={() => setSelectedDocId(doc.id)}
            >
              {doc.title}
            </button>
          ))}
          {!docs.length && <div className="text-xs text-slate-500">No docs yet</div>}
        </div>
      </aside>

      <section className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
        {!selectedDoc ? (
          <div className="text-slate-500">Select or create a doc to start editing.</div>
        ) : (
          <>
            <input className="input-dark" value={selectedDoc.title || ''} onChange={(e) => updateSelectedDoc('title', e.target.value)} />
            <textarea
              className="input-dark flex-1 min-h-[500px]"
              placeholder="Write your collaborative notes here..."
              value={selectedDoc.content || ''}
              onChange={(e) => updateSelectedDoc('content', e.target.value)}
            />
            <div className="flex justify-end">
              <button className="btn-primary" onClick={saveDoc} disabled={saving}>{saving ? 'Saving...' : 'Save Document'}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
