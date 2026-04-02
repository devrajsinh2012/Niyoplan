'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { File as FileIcon, FileText, Image as ImageIcon, Loader2, Trash2, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/apiClient';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function formatBytes(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForMimeType(mimeType = '') {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return FileText;
  return FileIcon;
}

export default function FileAttachment({ orgId, projectId, cardId }) {
  const [attachments, setAttachments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (orgId) params.set('orgId', orgId);
    if (projectId) params.set('projectId', projectId);
    if (cardId) params.set('cardId', cardId);
    return params.toString();
  }, [orgId, projectId, cardId]);

  const loadDriveStatus = useCallback(async () => {
    if (!orgId) {
      setDriveStatus({ connected: true });
      return;
    }

    try {
      const response = await apiFetch(`/api/drive/status?orgId=${encodeURIComponent(orgId)}`);
      if (!response.ok) throw new Error('Drive status lookup failed.');
      const payload = await response.json();
      setDriveStatus(payload);
    } catch (error) {
      console.error(error);
      setDriveStatus({ connected: false });
    }
  }, [orgId]);

  const loadAttachments = useCallback(async () => {
    if (!projectId && !orgId) {
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    try {
      const response = await apiFetch(`/api/files?${listQuery}`);
      if (!response.ok) throw new Error('Failed to load attachments');
      const payload = await response.json();
      setAttachments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load attachments');
      setAttachments([]);
    } finally {
      setLoadingList(false);
    }
  }, [listQuery, orgId, projectId]);

  useEffect(() => {
    loadDriveStatus();
  }, [loadDriveStatus]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File too large. Maximum size is 25MB.');
      event.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (orgId) formData.append('orgId', orgId);
      if (projectId) formData.append('projectId', projectId);
      if (cardId) formData.append('cardId', cardId);

      const response = await apiFetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }

      toast.success('File uploaded');
      setAttachments((prev) => [payload.attachment, ...prev]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const response = await apiFetch(`/api/files/${fileId}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to fetch download link');
      }

      const targetUrl = payload.downloadUrl || payload.viewUrl;
      if (!targetUrl) {
        throw new Error('No download link returned for this file.');
      }

      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to open file');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this attachment? This will remove it from Google Drive too.')) {
      return;
    }

    setDeletingId(fileId);

    try {
      const response = await apiFetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Delete failed');
      }

      setAttachments((prev) => prev.filter((item) => item.id !== fileId));
      toast.success('Attachment deleted');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading || driveStatus?.connected === false}
          />
        </label>
      </div>

      {driveStatus?.connected === false && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          File uploads are not enabled. Ask your admin to connect Google Drive in Company Settings.
        </div>
      )}

      {loadingList ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-xs text-gray-500">No attachments yet.</div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = iconForMimeType(attachment.mime_type || '');
            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-900">{attachment.original_name}</p>
                    <p className="text-[11px] text-gray-500">{formatBytes(Number(attachment.size_bytes || 0))}</p>
                  </div>
                </div>

                <div className="ml-2 flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => handleDownload(attachment.id)}
                    aria-label={`Download ${attachment.original_name}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={deletingId === attachment.id}
                    aria-label={`Delete ${attachment.original_name}`}
                  >
                    {deletingId === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
