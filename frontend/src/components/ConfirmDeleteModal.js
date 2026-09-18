import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

// Shared type-to-confirm delete modal. The user must type the exact
// `keyword` (default "DELETE") before the confirm button enables, so a
// stray click can never fire a destructive action.
export default function ConfirmDeleteModal({
  open,
  title = 'Confirm Delete',
  message,
  keyword = 'DELETE',
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  if (!open) return null;

  const matched = text.trim().toUpperCase() === String(keyword).toUpperCase();

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
            {title}
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.6 }}>{message}</p>
          <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
            Type <strong>{keyword}</strong> to confirm
          </label>
          <input
            className="form-control"
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && matched && !busy) onConfirm(); }}
            placeholder={keyword}
          />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-danger" disabled={!matched || busy} onClick={onConfirm}>
            <Trash2 size={14} /> {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
