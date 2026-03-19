import React, { useState } from 'react';
import './CardDetail.css';

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function CardDetail({ card, onClose, onSave, isSaving = false }) {
  const [form, setForm] = useState({
    title: card?.title || '',
    description: card?.description || '',
    status: card?.status || 'backlog',
    priority: card?.priority || 'medium',
    story_points: card?.story_points ?? '',
    start_date: toDateInput(card?.start_date),
    due_date: toDateInput(card?.due_date)
  });

  if (!card) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave?.({
      ...form,
      story_points: form.story_points === '' ? null : Number(form.story_points),
      start_date: form.start_date || null,
      due_date: form.due_date || null
    });
  };

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-panel" onClick={(e) => e.stopPropagation()}>
        <header className="card-detail-header">
          <div className="card-detail-prefix">{card.prefix || 'NIYO-123'}</div>
          <div className="card-detail-actions">
            <button className="btn-icon">⋯</button>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </header>
        
        <form className="card-detail-body" onSubmit={handleSubmit}>
          <input
            type="text"
            className="card-detail-title-input"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Card Title"
            required
          />
          
          <div className="card-layout">
            <div className="card-main-col">
              <section className="card-section">
                <h3>Description</h3>
                <textarea 
                  className="card-detail-textarea" 
                  placeholder="Add a more detailed description..."
                  rows={8}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </section>
              
              <section className="card-section">
                <h3>Details</h3>
                <div className="card-field-grid">
                  <label className="card-field-label" htmlFor="story-points">Story Points</label>
                  <input
                    id="story-points"
                    type="number"
                    min="0"
                    className="date-input"
                    value={form.story_points}
                    onChange={(event) => setForm((prev) => ({ ...prev, story_points: event.target.value }))}
                  />
                </div>
              </section>
            </div>
            
            <div className="card-side-col">
              <div className="card-meta-block">
                <h4>Status</h4>
                <select
                  className="status-selector"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              
              <div className="card-meta-block">
                <h4>Priority</h4>
                <select
                  className="status-selector"
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div className="card-meta-block">
                <h4>Start Date</h4>
                <input
                  type="date"
                  className="date-input"
                  value={form.start_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                />
              </div>
              
              <div className="card-meta-block">
                <h4>Due Date</h4>
                <input
                  type="date"
                  className="date-input"
                  value={form.due_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                />
              </div>

              <button type="submit" className="btn-primary card-detail-save" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
