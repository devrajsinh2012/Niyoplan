import React, { useState } from 'react';
import './CardDetail.css';
import { 
  X, MoreHorizontal, Paperclip, CheckSquare, Link, ChevronDown, 
  AlignLeft, Activity, List, Clock, Send, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function CardDetail({ card, onClose, onSave, isSaving = false }) {
  const { profile } = useAuth();
  
  const [form, setForm] = useState({
    title: card?.title || '',
    description: card?.description || '',
    status: card?.status || 'todo',
    priority: card?.priority || 'medium',
    story_points: card?.story_points ?? '',
    start_date: toDateInput(card?.start_date),
    due_date: toDateInput(card?.due_date)
  });

  const [activeTab, setActiveTab] = useState('comments');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');

  if (!card) return null;

  const handleSubmit = async (event) => {
    event?.preventDefault();
    await onSave?.({
      ...form,
      story_points: form.story_points === '' ? null : Number(form.story_points),
      start_date: form.start_date || null,
      due_date: form.due_date || null
    });
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    handleSubmit();
  };

  const initials = card.assignee?.full_name
    ? card.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const myInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ME';

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Breadcrumb & Actions */}
        <header className="detail-header">
          <div className="detail-breadcrumb">
            <span>Projects</span> <span className="separator">/</span>
            <span>Alpha Project</span> <span className="separator">/</span>
            <span className="current">{card.prefix || card.custom_id}</span>
          </div>
          <div className="detail-actions">
            <button className="btn-icon" title="Watch"><Eye size={16} /></button>
            <button className="btn-icon"><MoreHorizontal size={16} /></button>
            <button className="btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </header>
        
        <div className="detail-content">
          {/* Main Column */}
          <div className="detail-main">
            <textarea
              className="detail-title-input"
              value={form.title}
              onChange={(e) => {
                setForm(p => ({ ...p, title: e.target.value }));
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={handleSubmit}
              rows={1}
            />

            <div className="detail-toolbar">
              <button className="btn-toolbar"><Paperclip size={14} /> Attach</button>
              <button className="btn-toolbar"><CheckSquare size={14} /> Create subtask</button>
              <button className="btn-toolbar"><Link size={14} /> Link issue</button>
              <button className="btn-toolbar">Release <ChevronDown size={14} /></button>
            </div>

            <section className="detail-section">
              <div className="section-header">
                <h3><AlignLeft size={16} /> Description</h3>
                {!isEditingDesc && (
                  <button className="btn-ghost-sm" onClick={() => setIsEditingDesc(true)}>Edit</button>
                )}
              </div>
              
              {isEditingDesc ? (
                <div className="desc-editor-wrapper">
                  <textarea 
                    className="detail-desc-input" 
                    placeholder="Add a more detailed description..."
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                    autoFocus
                  />
                  <div className="desc-editor-actions">
                    <button className="btn-primary" onClick={handleDescSave} disabled={isSaving}>Save</button>
                    <button className="btn-ghost" onClick={() => setIsEditingDesc(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`desc-viewer ${!form.description ? 'empty' : ''}`}
                  onClick={() => setIsEditingDesc(true)}
                >
                  {form.description ? (
                    <p>{form.description}</p>
                  ) : (
                    'Add a description...'
                  )}
                </div>
              )}
            </section>

            <section className="detail-section">
              <div className="section-header">
                <h3><Activity size={16} /> Activity</h3>
              </div>
              <div className="activity-tabs">
                <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Comments</button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
                <button className={`tab ${activeTab === 'worklog' ? 'active' : ''}`} onClick={() => setActiveTab('worklog')}>Work log</button>
              </div>

              {activeTab === 'comments' && (
                <div className="comments-section">
                  <div className="comment-input-area">
                    <div className="comment-avatar">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : myInitials}
                    </div>
                    <div className="comment-input-wrapper">
                      <input 
                        type="text" 
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        className="comment-input"
                      />
                      {newComment && (
                        <div className="desc-editor-actions" style={{ marginTop: 8 }}>
                          <button className="btn-primary">Save</button>
                          <button className="btn-ghost" onClick={() => setNewComment('')}>Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="empty-state">No comments yet.</div>
                </div>
              )}
              {activeTab === 'history' && <div className="empty-state">History is empty.</div>}
              {activeTab === 'worklog' && <div className="empty-state">No work logged yet.</div>}
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="detail-sidebar">
            <div className="sidebar-block">
              <select
                className={`status-dropdown dropdown-${form.status.replace('_', '')}`}
                value={form.status}
                onChange={(e) => {
                  setForm(p => ({ ...p, status: e.target.value }));
                  handleSubmit();
                }}
              >
                <option value="todo">TO DO</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="in_review">IN REVIEW</option>
                <option value="done">DONE</option>
              </select>
            </div>

            <div className="sidebar-block border-top">
              <div className="sidebar-block-header">
                <h4>Details</h4>
                <button className="btn-icon"><ChevronDown size={14} /></button>
              </div>
              <div className="details-grid">
                
                <div className="detail-row">
                  <div className="detail-label">Assignee</div>
                  <div className="detail-value">
                    <div className="assignee-value">
                      <div className="avatar-sm">
                        {card.assignee?.avatar_url ? <img src={card.assignee.avatar_url} alt="" /> : initials}
                      </div>
                      <span>{card.assignee?.full_name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Reporter</div>
                  <div className="detail-value">
                    <div className="assignee-value">
                      <div className="avatar-sm">{myInitials}</div>
                      <span>{profile?.full_name || 'Me'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Priority</div>
                  <div className="detail-value">
                    <select
                      className="inline-select"
                      value={form.priority}
                      onChange={(e) => {
                        setForm(p => ({ ...p, priority: e.target.value }));
                        handleSubmit();
                      }}
                    >
                      <option value="highest">Highest</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="lowest">Lowest</option>
                    </select>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Labels</div>
                  <div className="detail-value text-muted">None</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Story Points</div>
                  <div className="detail-value">
                    <input
                      type="number"
                      className="inline-input"
                      value={form.story_points}
                      placeholder="None"
                      onChange={(e) => setForm(p => ({ ...p, story_points: e.target.value }))}
                      onBlur={handleSubmit}
                    />
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Sprint</div>
                  <div className="detail-value text-link">Active Sprint (Alpha)</div>
                </div>

              </div>
            </div>

            <div className="sidebar-meta">
              <div className="meta-text">Created {card.created_at ? new Date(card.created_at).toLocaleDateString() : 'Unknown'}</div>
              <div className="meta-text">Updated {card.updated_at ? new Date(card.updated_at).toLocaleDateString() : 'Unknown'}</div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
