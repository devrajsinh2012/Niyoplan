import React from 'react';
import './CardDetail.css';

export default function CardDetail({ card, onClose }) {
  if (!card) return null;

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
        
        <div className="card-detail-body">
          <input 
            type="text" 
            className="card-detail-title-input" 
            defaultValue={card.title} 
            placeholder="Card Title" 
          />
          
          <div className="card-layout">
            <div className="card-main-col">
              <section className="card-section">
                <h3>Description</h3>
                <div className="ai-generate-bar">
                  <button className="btn-magic">✨ Generate with Groq AI</button>
                </div>
                <textarea 
                  className="card-detail-textarea" 
                  placeholder="Add a more detailed description..."
                  rows={8}
                  defaultValue="This task involves setting up the primary feature set..."
                />
              </section>
              
              <section className="card-section">
                <h3>Checklist</h3>
                <div className="checklist-progress-bar">
                  <div className="checklist-progress-fill" style={{ width: '33%' }}></div>
                </div>
                <ul className="checklist-items">
                  <li><input type="checkbox" checked readOnly/> Sub-task 1 completed</li>
                  <li><input type="checkbox" /> Sub-task 2 pending</li>
                  <li><input type="checkbox" /> Sub-task 3 pending</li>
                </ul>
                <button className="btn-outline btn-sm">Add Item</button>
              </section>
            </div>
            
            <div className="card-side-col">
              <div className="card-meta-block">
                <h4>Status</h4>
                <div className="status-selector">To Do ▾</div>
              </div>
              
              <div className="card-meta-block">
                <h4>Assignees</h4>
                <div className="member-avatar">D</div>
                <button className="btn-add-member">+</button>
              </div>
              
              <div className="card-meta-block">
                <h4>Labels</h4>
                <div className="label-chip bg-red">Bug</div>
                <button className="btn-add-label">+</button>
              </div>
              
              <div className="card-meta-block">
                <h4>Dates</h4>
                <input type="date" className="date-input" defaultValue="2026-03-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
