'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function DocsWorkspacePanel({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDoc = useMemo(() => docs.find((doc) => doc.id === selectedDocId) || null, [docs, selectedDocId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadDocs = async () => {
        const res = await fetch(`/api/projects/${projectId}/docs`);
        return res.json();
      };
      const loadHierarchy = async () => {
        const res = await fetch(`/api/projects/${projectId}/spaces`);
        return res.json();
      };

      const [docRows, hierarchy] = await Promise.all([loadDocs(), loadHierarchy()]);
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
  }, [projectId, selectedDocId]);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, loadData]);

  const createSpace = async () => {
    const name = prompt('Space name');
    if (!name) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create space');
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
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, space_id: spaces[0].id })
      });
      if (!res.ok) throw new Error('Failed to create folder');
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
      const res = await fetch(`/api/projects/${projectId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
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

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300 font-medium text-center py-20">Loading docs...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4 min-h-[600px]">
      <aside className="glass-panel rounded-2xl p-4 space-y-4 bg-slate-900/50 border border-slate-800">
        <div className="grid grid-cols-3 gap-1.5 px-0.5">
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={createSpace}>+ Space</button>
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={createFolder}>+ Folder</button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 text-[10px] font-bold uppercase transition-colors text-center" onClick={createDoc}>+ Doc</button>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 mb-2">Spaces</div>
          <div className="space-y-1">
            {spaces.map((space) => (
              <div key={space.id} className="text-xs text-slate-300 border border-slate-800/50 bg-slate-900/30 rounded-lg px-3 py-2 font-medium">{space.name}</div>
            ))}
            {!spaces.length && <div className="text-[11px] text-slate-600 px-2 font-medium">No spaces yet</div>}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 mb-2">Documents</div>
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {docs.map((doc) => (
              <button
                key={doc.id}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'}`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                {doc.title}
              </button>
            ))}
            {!docs.length && <div className="text-[11px] text-slate-600 px-2 font-medium">No docs yet</div>}
          </div>
        </div>
      </aside>

      <section className="glass-panel rounded-2xl p-6 flex flex-col gap-4 bg-slate-900/50 border border-slate-800">
        {!selectedDoc ? (
          <div className="text-slate-600 font-medium py-40 text-center">Select or create a doc to start editing.</div>
        ) : (
          <>
            <input 
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none text-lg font-bold shadow-inner" 
              value={selectedDoc.title || ''} 
              onChange={(e) => updateSelectedDoc('title', e.target.value)} 
            />
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-300 focus:border-blue-500 outline-none text-sm font-medium flex-1 min-h-[460px] resize-none leading-relaxed shadow-inner"
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
    </div>
  );
}
