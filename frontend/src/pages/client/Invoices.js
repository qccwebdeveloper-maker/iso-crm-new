import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import InvoiceModal from '../../components/InvoiceModal';
import { FileText } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STAGE_META = {
  proforma: { label: 'Proforma Invoice', bg: '#fef3c7', color: '#92400e' },
  payment:  { label: 'Payment Received',  bg: '#dbeafe', color: '#1e40af' },
  verified: { label: 'Payment Verified',  bg: '#e0e7ff', color: '#3730a3' },
  final:    { label: 'Final Invoice',     bg: '#d1fae5', color: '#065f46' },
};

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState(null);

  useEffect(() => {
    axios.get('/api/invoices/my')
      .then(({ data }) => setInvoices(data || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="My Invoices">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">My Invoices</h1>
          <p className="page-subtitle">Proforma and final invoices issued by Quality Control Certification.</p>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="loading-box"><div className="spinner" /></div></div>
      ) : invoices.length === 0 ? (
        <div className="card"><div className="empty-box" style={{ padding: '28px 20px' }}><FileText size={30} /><h3>No invoices yet</h3><p style={{ color: 'var(--gray-500)', marginTop: 8 }}>Invoices issued to you will appear here.</p></div></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Invoice No</th><th>Type</th><th>Amount</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {invoices.map(inv => {
                  const sm = STAGE_META[inv.stage] || STAGE_META.proforma;
                  return (
                    <tr key={inv._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoiceNo}</td>
                      <td><span className="badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span></td>
                      <td style={{ fontWeight: 600 }}>{inr(inv.amount)}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{fmtDate(inv.finalSentAt || inv.proformaSentAt || inv.createdAt)}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => setView(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <FileText size={12} /> View / Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view && <InvoiceModal inv={view} onClose={() => setView(null)} />}
    </Layout>
  );
}
