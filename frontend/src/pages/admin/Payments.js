import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { FileText, CheckCircle, Send, Search, Trash2, CreditCard, ShieldCheck, Eye } from 'lucide-react';
import InvoiceModal from '../../components/InvoiceModal';

const BANKS = ['Axis', 'HDFC', 'Kotak', 'PayU', 'PayPal', 'Google Pay', 'Paytm', 'Cash', 'Other'];
const PAY_TYPES = [
  { value: 'full', label: 'Full Payment' },
  { value: 'half', label: 'Half Payment' },
  { value: 'part', label: 'Part Payment' },
];

const STAGE_META = {
  proforma: { label: 'Proforma Sent',       bg: '#fef3c7', color: '#92400e' },
  payment:  { label: 'Payment Recorded',    bg: '#dbeafe', color: '#1e40af' },
  verified: { label: 'Payment Verified',    bg: '#e0e7ff', color: '#3730a3' },
  final:    { label: 'Final Invoice Sent',  bg: '#d1fae5', color: '#065f46' },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { key: 'proforma', label: '1 · Proforma Invoice', icon: FileText },
  { key: 'verify',   label: '2 · Verify Payment',   icon: ShieldCheck },
  { key: 'final',    label: '3 · Final Invoice',    icon: Send },
];

export default function AdminPayments() {
  const [tab, setTab]         = useState('proforma');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/invoices')
      .then(({ data }) => setInvoices(data || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout title="Payment Tracking">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Payment Tracking — Invoices</h1>
          <p className="page-subtitle">Proforma invoice → record &amp; verify payment → final invoice.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'proforma' && <ProformaTab onDone={load} />}
      {tab === 'verify'   && <VerifyTab onDone={load} />}
      {tab === 'final'    && <FinalTab onDone={load} />}

      <AllInvoices invoices={invoices} loading={loading} onDelete={load} />
    </Layout>
  );
}

/* ───────────────── Shared: client search ───────────────── */
function useClientInvoices() {
  const [cid, setCid] = useState('');
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const fetchFor = async (e) => {
    e?.preventDefault();
    const id = cid.trim();
    if (!id) return;
    setBusy(true);
    try {
      const { data } = await axios.get(`/api/invoices/by-client/${id}`);
      setList(data || []);
      if (!data?.length) toast('No invoices for this client yet', { icon: 'ℹ️' });
    } catch { toast.error('Lookup failed'); setList([]); }
    finally { setBusy(false); }
  };
  return { cid, setCid, list, setList, busy, fetchFor };
}

/* ───────────────── STEP 1: Proforma ───────────────── */
function ProformaTab({ onDone }) {
  const [cid, setCid] = useState('');
  const [client, setClient] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClient = async (e) => {
    e?.preventDefault();
    const id = cid.trim();
    if (!id) return;
    setBusy(true); setClient(null);
    try {
      const { data } = await axios.get(`/api/qms-forms/client/${id}`);
      setClient(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Client not found');
    } finally { setBusy(false); }
  };

  const send = async () => {
    if (saving) return;
    if (!client) return toast.error('Fetch a client first');
    if (!amount) return toast.error('Enter the invoice amount');
    setSaving(true);
    try {
      await axios.post('/api/invoices', {
        clientId: client.clientId,
        organizationName: client.company,
        standard: client.isoStandard || (client.standards || []).join(', '),
        address: client.address,
        amount,
      });
      toast.success('Proforma invoice sent to client');
      setClient(null); setCid(''); setAmount('');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send proforma invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-hdr"><div className="card-title"><FileText size={14} style={{ color: 'var(--primary)' }} /> Create Proforma Invoice</div></div>
      <div style={{ padding: 18 }}>
        <form onSubmit={fetchClient} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
            <label className="form-label">Client ID</label>
            <input className="form-control" value={cid} onChange={e => setCid(e.target.value)} placeholder="Enter Client ID or company" />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> {busy ? 'Fetching…' : 'Fetch Details'}
          </button>
        </form>

        {client && (
          <>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Organization Name</label><input className="form-control" value={client.company || ''} readOnly /></div>
              <div className="form-group"><label className="form-label">Standard</label><input className="form-control" value={client.isoStandard || (client.standards || []).join(', ') || ''} readOnly /></div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={client.address || ''} readOnly /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invoice Amount (₹) *</label>
                <input type="number" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={send} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                  <Send size={14} /> {saving ? 'Sending…' : 'Create & Send Proforma Invoice'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────── STEP 2: Verify Payment ───────────────── */
function VerifyTab({ onDone }) {
  const { cid, setCid, list, busy, fetchFor } = useClientInvoices();
  const [forms, setForms] = useState({}); // per-invoice payment form
  const [saving, setSaving] = useState('');

  const setF = (id, patch) => setForms(p => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));

  const record = async (inv) => {
    if (saving) return;
    const f = forms[inv._id] || {};
    if (!f.paymentType) return toast.error('Select payment type');
    if (!f.receivedAmount) return toast.error('Enter received amount');
    setSaving(inv._id);
    try {
      await axios.put(`/api/invoices/${inv._id}/payment`, {
        paymentType: f.paymentType, bankName: f.bankName || '',
        receivedAmount: f.receivedAmount, paymentDate: f.paymentDate || undefined,
      });
      toast.success('Payment recorded');
      fetchFor(); onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const verify = async (inv) => {
    if (saving) return;
    const f = forms[inv._id] || {};
    setSaving(inv._id);
    try {
      await axios.put(`/api/invoices/${inv._id}/verify`, { verifiedAmount: f.receivedAmount ?? inv.receivedAmount });
      toast.success('Payment verified');
      fetchFor(); onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-hdr"><div className="card-title"><ShieldCheck size={14} style={{ color: 'var(--primary)' }} /> Record &amp; Verify Payment</div></div>
      <div style={{ padding: 18 }}>
        <form onSubmit={fetchFor} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
            <label className="form-label">Client ID</label>
            <input className="form-control" value={cid} onChange={e => setCid(e.target.value)} placeholder="Enter Client ID" />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> {busy ? 'Loading…' : 'Show Invoices'}
          </button>
        </form>

        {list && list.length === 0 && <div className="empty-box" style={{ padding: 20 }}><p>No invoices for this client.</p></div>}

        {(list || []).map(inv => {
          const f = forms[inv._id] || {};
          const sm = STAGE_META[inv.stage];
          return (
            <div key={inv._id} style={{ border: '1px solid var(--gray-100)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ fontFamily: 'monospace' }}>{inv.invoiceNo}</strong>
                  <span style={{ marginLeft: 10, color: 'var(--gray-500)' }}>{inv.organizationName} · Billed {inr(inv.amount)}</span>
                </div>
                <span className="badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Type *</label>
                  <select className="form-control" value={f.paymentType ?? inv.paymentType ?? ''} onChange={e => setF(inv._id, { paymentType: e.target.value })}>
                    <option value="">Select</option>
                    {PAY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bank / Mode</label>
                  <select className="form-control" value={f.bankName ?? inv.bankName ?? ''} onChange={e => setF(inv._id, { bankName: e.target.value })}>
                    <option value="">Select</option>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Received Amount (₹) *</label>
                  <input type="number" className="form-control" value={f.receivedAmount ?? inv.receivedAmount ?? ''} onChange={e => setF(inv._id, { receivedAmount: e.target.value })} placeholder="Amount received" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input type="date" className="form-control" value={f.paymentDate ?? (inv.paymentDate ? new Date(inv.paymentDate).toISOString().slice(0, 10) : '')} onChange={e => setF(inv._id, { paymentDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => record(inv)} disabled={saving === inv._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={13} /> Record Payment
                </button>
                <button className="btn btn-primary" onClick={() => verify(inv)} disabled={saving === inv._id || inv.stage === 'proforma'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} /> {inv.verified ? 'Re-verify' : 'Verify Payment'}
                </button>
              </div>
              {inv.verified && <div style={{ marginTop: 8, fontSize: 12, color: '#065f46' }}>✓ Verified {inr(inv.verifiedAmount)} on {fmtDate(inv.verifiedAt)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── STEP 3: Final Invoice ───────────────── */
function FinalTab({ onDone }) {
  const { cid, setCid, list, busy, fetchFor } = useClientInvoices();
  const [saving, setSaving] = useState('');

  const sendFinal = async (inv) => {
    if (saving) return;
    setSaving(inv._id);
    try {
      await axios.put(`/api/invoices/${inv._id}/final`);
      toast.success('Final invoice sent to client');
      fetchFor(); onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Verify the payment first'); }
    finally { setSaving(''); }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-hdr"><div className="card-title"><Send size={14} style={{ color: 'var(--primary)' }} /> Send Final Invoice</div></div>
      <div style={{ padding: 18 }}>
        <form onSubmit={fetchFor} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
            <label className="form-label">Client ID</label>
            <input className="form-control" value={cid} onChange={e => setCid(e.target.value)} placeholder="Enter Client ID" />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> {busy ? 'Loading…' : 'Show Invoices'}
          </button>
        </form>

        {list && list.length === 0 && <div className="empty-box" style={{ padding: 20 }}><p>No invoices for this client.</p></div>}

        {(list || []).map(inv => {
          const sm = STAGE_META[inv.stage];
          return (
            <div key={inv._id} style={{ border: '1px solid var(--gray-100)', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ fontFamily: 'monospace' }}>{inv.invoiceNo}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 2 }}>
                  {inv.organizationName} · Billed {inr(inv.amount)} · {inv.verified ? `Verified ${inr(inv.verifiedAmount)}` : 'Not verified'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                <button className="btn btn-primary" onClick={() => sendFinal(inv)} disabled={saving === inv._id || !inv.verified || inv.stage === 'final'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Send size={13} /> {inv.stage === 'final' ? 'Sent' : 'Send Final Invoice'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── All invoices table ───────────────── */
function AllInvoices({ invoices, loading, onDelete }) {
  const [view, setView] = useState(null);
  const [deleting, setDeleting] = useState('');
  const del = async (id) => {
    if (deleting) return;
    if (!window.confirm('Delete this invoice?')) return;
    setDeleting(id);
    try { await axios.delete(`/api/invoices/${id}`); toast.success('Deleted'); onDelete(); }
    catch { toast.error('Delete failed'); }
    finally { setDeleting(''); }
  };
  return (
    <>
    <div className="card">
      <div className="card-hdr"><div className="card-title"><CreditCard size={14} style={{ color: 'var(--primary)' }} /> All Invoices</div></div>
      {loading ? (
        <div className="loading-box"><div className="spinner" /></div>
      ) : invoices.length === 0 ? (
        <div className="empty-box" style={{ padding: '24px 20px' }}><CreditCard size={28} /><h3>No invoices yet</h3><p style={{ color: 'var(--gray-500)', marginTop: 8 }}>Create a proforma invoice above to get started.</p></div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice No</th><th>Client ID</th><th>Organization</th><th>Billed</th><th>Received</th><th>Stage</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const sm = STAGE_META[inv.stage] || STAGE_META.proforma;
                return (
                  <tr key={inv._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoiceNo}</td>
                    <td><strong>{inv.clientId}</strong></td>
                    <td>{inv.organizationName || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{inr(inv.amount)}</td>
                    <td>{inv.receivedAmount != null ? inr(inv.receivedAmount) : '—'}{inv.paymentType ? ` (${inv.paymentType})` : ''}</td>
                    <td><span className="badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span></td>
                    <td style={{ color: 'var(--gray-500)' }}>{fmtDate(inv.finalSentAt || inv.verifiedAt || inv.paymentDate || inv.proformaSentAt)}</td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setView(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> View</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(inv._id)} disabled={deleting === inv._id}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    {view && <InvoiceModal inv={view} onClose={() => setView(null)} />}
    </>
  );
}
