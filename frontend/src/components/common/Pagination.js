import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ total, page, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  const getPages = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return { pages, start, end };
  };
  const { pages, start, end } = getPages();

  const btn = (content, onClick, active = false, disabled = false, key) => (
    <button
      key={key}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 8px',
        border: active ? 'none' : '1px solid var(--gray-200)',
        borderRadius: 7,
        background: active ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : '#fff',
        color: active ? '#fff' : disabled ? 'var(--gray-300)' : 'var(--gray-600)',
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
        fontFamily: 'inherit',
      }}
    >
      {content}
    </button>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderTop: '1px solid var(--gray-100)',
      flexWrap: 'wrap', gap: 10,
    }}>
      <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
        Showing {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {btn(<ChevronLeft size={13} />, () => onChange(page - 1), false, page === 1)}
        {start > 1 && (
          <>
            {btn('1', () => onChange(1))}
            {start > 2 && <span style={{ color: 'var(--gray-400)', fontSize: 13, padding: '0 2px' }}>…</span>}
          </>
        )}
        {pages.map(p => btn(p, () => onChange(p), p === page, false, p))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span style={{ color: 'var(--gray-400)', fontSize: 13, padding: '0 2px' }}>…</span>}
            {btn(totalPages, () => onChange(totalPages))}
          </>
        )}
        {btn(<ChevronRight size={13} />, () => onChange(page + 1), false, page === totalPages)}
      </div>
    </div>
  );
}
