'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import InputModal from '@/components/ui/InputModal';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { ChevronDown, ChevronRight, FilePlus2, FileText, Folder, FolderPlus, Layers3 } from 'lucide-react';
import { DocsPanelSkeleton } from '@/components/ui/PageSkeleton';
import { getSupabaseAuthHeaders } from '@/lib/apiClient';

export default function DocsWorkspacePanel({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedSpaces, setExpandedSpaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState({ isOpen: false, type: null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedDoc = useMemo(() => docs.find((doc) => doc.id === selectedDocId) || null, [docs, selectedDocId]);
  const selectedSpace = useMemo(() => spaces.find((space) => space.id === selectedSpaceId) || null, [spaces, selectedSpaceId]);
  const selectedFolder = useMemo(() => folders.find((folder) => folder.id === selectedFolderId) || null, [folders, selectedFolderId]);

  const foldersBySpace = useMemo(() => {
    const grouped = new Map();
    folders.forEach((folder) => {
      if (!grouped.has(folder.space_id)) {
        grouped.set(folder.space_id, []);
      }
      grouped.get(folder.space_id).push(folder);
    });
    return grouped;
  }, [folders]);

  const docsByFolder = useMemo(() => {
    const grouped = new Map();
    docs.forEach((doc) => {
      if (!doc.folder_id) return;
      if (!grouped.has(doc.folder_id)) {
        grouped.set(doc.folder_id, []);
      }
      grouped.get(doc.folder_id).push(doc);
    });
    return grouped;
  }, [docs]);

  const docsBySpace = useMemo(() => {
    const grouped = new Map();
    docs.forEach((doc) => {
      if (!doc.space_id || doc.folder_id) return;
      if (!grouped.has(doc.space_id)) {
        grouped.set(doc.space_id, []);
      }
      grouped.get(doc.space_id).push(doc);
    });
    return grouped;
  }, [docs]);

  const docsWithoutSpace = useMemo(() => docs.filter((doc) => !doc.space_id), [docs]);
  const foldersForSelectedDocSpace = useMemo(() => {
    if (!selectedDoc?.space_id) return [];
    return folders.filter((folder) => folder.space_id === selectedDoc.space_id);
  }, [folders, selectedDoc]);

  const apiRequest = useCallback(async (url, options = {}) => {
    const hasBody = options.body !== undefined;
    const authHeaders = await getSupabaseAuthHeaders(hasBody ? { 'Content-Type': 'application/json' } : {});

    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Request failed');
    }

    return payload;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadDocs = async () => {
        const data = await apiRequest(`/api/projects/${projectId}/docs`);
        return Array.isArray(data) ? data : [];
      };
      const loadHierarchy = async () => {
        const data = await apiRequest(`/api/projects/${projectId}/spaces`);
        return data || { spaces: [], folders: [] };
      };

      const [docRows, hierarchy] = await Promise.all([loadDocs(), loadHierarchy()]);
      const nextDocs = Array.isArray(docRows) ? docRows : [];
      const nextSpaces = Array.isArray(hierarchy?.spaces) ? hierarchy.spaces : [];
      const nextFolders = Array.isArray(hierarchy?.folders) ? hierarchy.folders : [];

      setDocs(nextDocs);
      setSpaces(nextSpaces);
      setFolders(nextFolders);

      setSelectedDocId((prevSelectedDocId) => {
        if (!nextDocs.length) return null;
        if (prevSelectedDocId && nextDocs.some((doc) => doc.id === prevSelectedDocId)) {
          return prevSelectedDocId;
        }
        return nextDocs[0].id;
      });

      setSelectedSpaceId((prevSelectedSpaceId) => {
        if (prevSelectedSpaceId && nextSpaces.some((space) => space.id === prevSelectedSpaceId)) {
          return prevSelectedSpaceId;
        }
        const docWithSpace = nextDocs.find((doc) => doc.space_id && nextSpaces.some((space) => space.id === doc.space_id));
        return docWithSpace?.space_id || nextSpaces[0]?.id || null;
      });

      setSelectedFolderId((prevSelectedFolderId) => {
        if (prevSelectedFolderId && nextFolders.some((folder) => folder.id === prevSelectedFolderId)) {
          return prevSelectedFolderId;
        }
        const docWithFolder = nextDocs.find((doc) => doc.folder_id && nextFolders.some((folder) => folder.id === doc.folder_id));
        return docWithFolder?.folder_id || null;
      });

      setExpandedSpaces((prev) => {
        const next = {};
        nextSpaces.forEach((space) => {
          next[space.id] = prev[space.id] ?? true;
        });
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load docs workspace');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, projectId]);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, loadData]);

  const createSpace = async (name) => {
    if (!name?.trim()) return;
    try {
      const created = await apiRequest(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });
      toast.success('Space created');
      setSelectedSpaceId(created.id);
      setSelectedFolderId(null);
      setExpandedSpaces((prev) => ({ ...prev, [created.id]: true }));
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create space');
    }
  };

  const createFolder = async (name) => {
    if (!name?.trim()) return;
    if (!selectedSpaceId) {
      toast.error('Select a space first');
      return;
    }

    try {
      const created = await apiRequest(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), space_id: selectedSpaceId })
      });
      toast.success('Folder created');
      setSelectedFolderId(created.id);
      setExpandedSpaces((prev) => ({ ...prev, [selectedSpaceId]: true }));
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const createDoc = async (title) => {
    if (!title?.trim()) return;
    if (!selectedSpaceId) {
      toast.error('Select a space first');
      return;
    }

    const selectedFolderInSpace = selectedFolderId && folders.some((folder) => folder.id === selectedFolderId && folder.space_id === selectedSpaceId)
      ? selectedFolderId
      : null;

    try {
      const created = await apiRequest(`/api/projects/${projectId}/docs`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          space_id: selectedSpaceId,
          folder_id: selectedFolderInSpace,
          content: ''
        })
      });
      toast.success('Doc created');
      await loadData();
      setSelectedDocId(created.id);
      setSelectedSpaceId(created.space_id || null);
      setSelectedFolderId(created.folder_id || null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create doc');
    }
  };

  const updateSelectedDoc = (updates) => {
    setDocs((prev) => prev.map((doc) => (doc.id === selectedDocId ? { ...doc, ...updates } : doc)));
  };

  const selectDoc = (doc) => {
    setSelectedDocId(doc.id);
    setSelectedSpaceId(doc.space_id || null);
    setSelectedFolderId(doc.folder_id || null);
    if (doc.space_id) {
      setExpandedSpaces((prev) => ({ ...prev, [doc.space_id]: true }));
    }
  };

  const deleteDoc = async () => {
    if (!selectedDoc) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/projects/${projectId}/docs/${selectedDoc.id}`, {
        method: 'DELETE'
      });
      toast.success('Doc deleted');
      setShowDeleteConfirm(false);
      setSelectedDocId(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete doc');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await apiRequest(`/api/projects/${projectId}/docs/${selectedDoc.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedDoc.title,
          content: selectedDoc.content,
          space_id: selectedDoc.space_id,
          folder_id: selectedDoc.folder_id
        })
      });
      toast.success('Doc saved');
      await loadData();
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

  const toggleSpace = (spaceId) => {
    setExpandedSpaces((prev) => ({
      ...prev,
      [spaceId]: !(prev[spaceId] ?? true)
    }));
  };

  const handleSelectSpace = (spaceId) => {
    setSelectedSpaceId(spaceId);
    setSelectedFolderId(null);
    setExpandedSpaces((prev) => ({ ...prev, [spaceId]: true }));
  };

  const handleSelectFolder = (folder) => {
    setSelectedSpaceId(folder.space_id);
    setSelectedFolderId(folder.id);
    setExpandedSpaces((prev) => ({ ...prev, [folder.space_id]: true }));
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
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">Docs Hierarchy</div>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {spaces.map((space) => {
              const spaceFolders = foldersBySpace.get(space.id) || [];
              const rootDocs = docsBySpace.get(space.id) || [];
              const expanded = expandedSpaces[space.id] ?? true;
              const isSpaceSelected = selectedSpaceId === space.id && !selectedFolderId;

              return (
                <div key={space.id} className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-1 p-1.5">
                    <button
                      className="h-6 w-6 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                      onClick={() => toggleSpace(space.id)}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <button
                      className={`flex-1 text-left rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${isSpaceSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={() => handleSelectSpace(space.id)}
                    >
                      {space.name}
                    </button>
                  </div>

                  {expanded && (
                    <div className="space-y-1 pb-2">
                      {rootDocs.map((doc) => (
                        <button
                          key={doc.id}
                          className={`w-[calc(100%-1.5rem)] ml-6 text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                          onClick={() => selectDoc(doc)}
                        >
                          <FileText size={12} />
                          <span className="truncate">{doc.title || 'Untitled document'}</span>
                        </button>
                      ))}

                      {spaceFolders.map((folder) => {
                        const folderDocs = docsByFolder.get(folder.id) || [];
                        const isFolderSelected = selectedFolderId === folder.id;

                        return (
                          <div key={folder.id} className="space-y-1">
                            <button
                              className={`w-[calc(100%-1.5rem)] ml-6 text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${isFolderSelected ? 'border-slate-400/40 bg-slate-100 text-slate-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                              onClick={() => handleSelectFolder(folder)}
                            >
                              <Folder size={12} />
                              <span className="truncate">{folder.name}</span>
                            </button>

                            {folderDocs.map((doc) => (
                              <button
                                key={doc.id}
                                className={`w-[calc(100%-2.5rem)] ml-10 text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                                onClick={() => selectDoc(doc)}
                              >
                                <FileText size={12} />
                                <span className="truncate">{doc.title || 'Untitled document'}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}

                      {!rootDocs.length && !spaceFolders.length && (
                        <div className="text-[11px] text-gray-400 px-2 py-2 ml-6 border border-dashed border-gray-200 rounded-lg w-[calc(100%-1.5rem)] text-center font-medium">
                          No folders or docs in this space yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!!docsWithoutSpace.length && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 space-y-1">
                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-700 px-1">Unassigned Docs</div>
                {docsWithoutSpace.map((doc) => (
                  <button
                    key={doc.id}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${selectedDocId === doc.id ? 'border-blue-500/40 bg-blue-50 text-blue-700' : 'border-amber-200 bg-white/70 text-amber-900 hover:border-amber-300'}`}
                    onClick={() => selectDoc(doc)}
                  >
                    <FileText size={12} />
                    <span className="truncate">{doc.title || 'Untitled document'}</span>
                  </button>
                ))}
              </div>
            )}

            {!spaces.length && (
              <div className="text-[11px] text-gray-400 px-2 py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center font-medium">
                No spaces defined. Click &quot;+ Space&quot; to organize your docs.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">Create Target</div>
          <div className="text-[11px] text-gray-500 px-2 py-2 bg-gray-50 rounded-xl border border-gray-200 font-medium leading-relaxed">
            {selectedSpace
              ? `Space: ${selectedSpace.name}${selectedFolder ? ` / Folder: ${selectedFolder.name}` : ''}`
              : 'Select a space to create folders and docs.'}
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
              onChange={(e) => updateSelectedDoc({ title: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Space
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={selectedDoc.space_id || ''}
                  onChange={(e) => {
                    const nextSpaceId = e.target.value || null;
                    const nextFolderId = nextSpaceId && selectedDoc.folder_id && folders.some((folder) => folder.id === selectedDoc.folder_id && folder.space_id === nextSpaceId)
                      ? selectedDoc.folder_id
                      : null;
                    updateSelectedDoc({
                      space_id: nextSpaceId,
                      folder_id: nextFolderId
                    });
                    setSelectedSpaceId(nextSpaceId);
                    setSelectedFolderId(nextFolderId);
                    if (nextSpaceId) {
                      setExpandedSpaces((prev) => ({ ...prev, [nextSpaceId]: true }));
                    }
                  }}
                >
                  <option value="">No space</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>{space.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Folder
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  value={selectedDoc.folder_id || ''}
                  disabled={!selectedDoc.space_id}
                  onChange={(e) => {
                    const nextFolderId = e.target.value || null;
                    updateSelectedDoc({ folder_id: nextFolderId });
                    setSelectedFolderId(nextFolderId);
                  }}
                >
                  <option value="">No folder</option>
                  {foldersForSelectedDocSpace.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              className="w-full bg-white border border-gray-300 rounded-xl p-4 text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium flex-1 min-h-[460px] resize-none leading-relaxed"
              placeholder="Write your collaborative notes here..."
              value={selectedDoc.content || ''}
              onChange={(e) => updateSelectedDoc({ content: e.target.value })}
            />
            <div className="flex justify-end pt-2 gap-3">
              <button
                className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
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

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={deleteDoc}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
