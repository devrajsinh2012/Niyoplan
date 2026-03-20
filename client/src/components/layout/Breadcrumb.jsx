import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb component
 * @param {Array} items - Array of { label, to? } objects. Last item has no `to` (current page).
 */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {item.to && !isLast ? (
              <Link
                to={item.to}
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 4px',
                  transition: 'color var(--transition-fast), background var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent-text)';
                  e.currentTarget.style.background = 'var(--accent-subtle)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.background = '';
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{
                color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isLast ? 500 : 400,
              }}>
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
