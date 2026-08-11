import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import { FiSearch, FiDownload, FiFileText, FiClock, FiCheckCircle } from 'react-icons/fi';

/* All QMS forms that have a dedicated form-XX page (F01–F23).
   `name` mirrors the sidebar nav label in Layout.js exactly, so the form
   name shown here matches the sidebar, the form header, and the preview. */
const ALL_FORMS = [
  { formType: 1,  code: 'AUD-F-02',      name: 'F02 Application Form' },
  { formType: 2,  code: 'AUD-F-03',      name: 'F03 App Rev & F03-01 Aud Pln' },
  { formType: 3,  code: 'AUD-F-03A',     name: 'F03A Audit Planning for 3 years' },
  { formType: 4,  code: 'AD-F-03',       name: 'F-03 Auditor(s) Declaration' },
  { formType: 5,  code: 'AUD-F-05',      name: 'F05&F06 S1Plan&Schedule' },
  { formType: 6,  code: 'AUD-F-07 S1',   name: 'F07 S1Opening&Closing Meeting' },
  { formType: 7,  code: 'AUD-F-09',      name: 'F09A S1Report' },
  { formType: 23, code: 'AUD-F-09-B',    name: 'AUD-F-09-B_OFI_O Sheet' },
  { formType: 8,  code: 'AUD-F-22',      name: 'AUD-F-22-REVIEW REPORT (A)' },
  { formType: 9,  code: 'AUD-F-11',      name: 'F11&F12 S2Plan&Schedule' },
  { formType: 10, code: 'AUD-F-07 S2',   name: 'F07 S2 Open&Clos Meeting' },
  { formType: 11, code: 'AUD-F-15',      name: 'F15A S2Report' },
  { formType: 12, code: 'AUD-F-16',      name: 'F16&F17 CAR' },
  { formType: 13, code: 'AUD-F-17',      name: 'AUD-F-17 CAR' },
  { formType: 14, code: 'AUD-F-21',      name: 'AUD-F-21 Draft' },
  { formType: 15, code: 'AUD-F-22',      name: 'AUD-F-22-REVIEW REPORT (B)' },
  { formType: 16, code: 'AUD-F-02-A',    name: 'F16 · Application Form' },
  { formType: 17, code: 'AUD-F-05 / 06', name: 'F17 · Audit Plan' },
  { formType: 18, code: 'AUD-F-07 (S)',  name: 'F18 · Meetings' },
  { formType: 19, code: 'AUD-F-15 (S)',  name: 'F19 · Audit Report' },
  { formType: 20, code: 'AUD-F-22 (S)',  name: 'F20 · Report Review' },
  { formType: 21, code: 'AUD-F-17 (S)',  name: 'F21 · Surveillance CAR Report' },
  { formType: 22, code: 'ADMN-F-01',     name: 'F22 · Letter of Continuation' },
];

const STATUS_META = {
  draft:     { bg: '#fef3c7', color: '#92400e', Icon: FiClock,       label: 'Draft' },
  saved:     { bg: '#d1fae5', color: '#065f46', Icon: FiCheckCircle, label: 'Saved' },
  completed: { bg: '#dbeafe', color: '#1e40af', Icon: FiCheckCircle, label: 'Completed' },
};

const formPath = (formType) => `/admin/qms/form-${String(formType).padStart(2, '0')}`;

export default function DownloadForms() {
  const navigate = useNavigate();
  const [cidInput, setCidInput] = useState('');
  const [client, setClient]     = useState(null);
  const [byType, setByType]     = useState(null); // { [formType]: record }
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const search = async (e) => {
    e?.preventDefault();
    const id = cidInput.trim();
    if (!id) return;
    setLoading(true); setError(''); setByType(null); setClient(null);
    try {
      const { data: c } = await axios.get(`/api/qms-forms/client/${id}`);
      setClient(c);
      const realId = c.clientId || id;
      const { data } = await axios.get('/api/qms-forms', { params: { clientId: realId } });
      const map = {};
      (data || []).forEach(rec => { map[rec.formType] = rec; });
      setByType(map);
    } catch (err) {
      setError(err.response?.data?.message || 'Client not found');
    } finally { setLoading(false); }
  };

  const open = (formType) => {
    const realId = client?.clientId || cidInput.trim();
    navigate(`${formPath(formType)}?client=${encodeURIComponent(realId)}`);
  };

  const filledCount = byType ? Object.keys(byType).length : 0;

  return (
    <Layout title="Download Forms (PDF)">
      <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiDownload size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--gray-800)' }}>Download Forms (PDF)</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>Enter a Client ID to download each of their QMS forms as its own PDF</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={search} style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '18px 0 22px' }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: 360 }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              value={cidInput}
              onChange={e => setCidInput(e.target.value)}
              placeholder="Client ID or Company name"
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading ? 'Loading…' : 'Load Forms'}
          </button>
        </form>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {byType && (
          <>
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--gray-600)' }}>
              <strong>{client?.company || cidInput}</strong>{client?.clientId ? ` · ${client.clientId}` : ''} — {filledCount} form{filledCount === 1 ? '' : 's'} filled
            </div>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {ALL_FORMS.map((f, i) => {
                const rec = byType[f.formType];
                const filled = !!rec;
                const sm = filled ? (STATUS_META[rec.status] || STATUS_META.draft) : null;
                return (
                  <div key={f.formType} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white', opacity: filled ? 1 : 0.5 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiFileText size={16} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{f.code}</div>
                    </div>
                    {filled ? (
                      <>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sm.bg, color: sm.color }}>
                          <sm.Icon size={11} /> {sm.label}
                        </span>
                        <button type="button" onClick={() => open(f.formType)} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                          <FiDownload size={12} /> Open &amp; Download
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Not filled</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: 'var(--gray-500)' }}>
              <strong>Tip:</strong> Click <em>Open &amp; Download</em> to open a form's print-ready preview, then use <em>Print</em> there and choose “Save as PDF” as the destination. Each form downloads as its own PDF file.
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
