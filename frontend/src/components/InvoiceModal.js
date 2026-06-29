import React from 'react';
import { FileText, Printer, X, CheckCircle, Clock } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STAGE_LABEL = {
  proforma: 'Proforma Invoice',
  payment:  'Payment Received',
  verified: 'Payment Verified',
  final:    'Final Invoice',
};

/* Print just the invoice document (isolated by the body.printing-invoice CSS).
   Sets the document title so the saved PDF gets a meaningful filename. */
function printInvoice(inv) {
  const prevTitle = document.title;
  const name = `${(inv?.stage === 'final' ? 'Invoice' : 'Proforma')}-${(inv?.invoiceNo || '').replace(/[^\w.-]+/g, '_')}`;
  document.title = name || prevTitle;
  document.body.classList.add('printing-invoice');
  const restore = () => {
    document.body.classList.remove('printing-invoice');
    document.title = prevTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
}

/* Shared, printable invoice — used by both the client (My Invoices) and admin
   (Payment Tracking) sides. */
export default function InvoiceModal({ inv, onClose }) {
  const isFinal = inv.stage === 'final';
  return (
    <div className="modal-bg" onClick={onClose} style={{ alignItems: 'flex-start', overflowY: 'auto', padding: 20 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, width: '100%' }}>
        <div className="modal-head no-print">
          <div className="modal-title">
            <FileText size={15} style={{ color: 'var(--primary)', marginRight: 7, verticalAlign: 'middle' }} />
            {isFinal ? 'Final Invoice' : 'Proforma Invoice'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => printInvoice(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Printer size={13} /> Print / Download PDF
            </button>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Printable invoice document */}
        <div className="inv-doc" style={{ padding: 28, fontSize: 13, color: '#111' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #1e40af', paddingBottom: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', letterSpacing: '.02em' }}>QUALITY CONTROL CERTIFICATION</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>2nd Floor, Aman Market, RKBM House, Narela Mandi, Delhi – 110040, India</div>
            <div style={{ fontSize: 11, color: '#555' }}>www.qccertification.com · info@qccertification.com</div>
            <div style={{ marginTop: 12, display: 'inline-block', padding: '5px 18px', borderRadius: 6, background: '#1e40af', color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '.08em' }}>
              {isFinal ? 'TAX / FINAL INVOICE' : 'PROFORMA INVOICE'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Bill To</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{inv.organizationName || '—'}</div>
              <div style={{ color: '#444', maxWidth: 300, whiteSpace: 'pre-line' }}>{inv.address || ''}</div>
              {inv.standard && <div style={{ color: '#444', marginTop: 4 }}>Standard: {inv.standard}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><span style={{ color: '#888' }}>Invoice No: </span><strong>{inv.invoiceNo}</strong></div>
              <div><span style={{ color: '#888' }}>Date: </span>{fmtDate(inv.finalSentAt || inv.proformaSentAt || inv.createdAt)}</div>
              <div><span style={{ color: '#888' }}>Client ID: </span>{inv.clientId}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: 11 }}>Description</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: 11 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Certification / Audit Fee{inv.standard ? ` — ${inv.standard}` : ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{inr(inv.amount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>Total</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>{inr(inv.amount)}</td>
              </tr>
            </tbody>
          </table>

          {(inv.receivedAmount != null || inv.stage !== 'proforma') && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Amount Received</span><strong>{inv.receivedAmount != null ? inr(inv.receivedAmount) : '—'}</strong></div>
              {inv.paymentType && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Type</span><span style={{ textTransform: 'capitalize' }}>{inv.paymentType}</span></div>}
              {inv.bankName && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bank / Mode</span><span>{inv.bankName}</span></div>}
              {inv.paymentDate && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Date</span><span>{fmtDate(inv.paymentDate)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Status</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: inv.verified ? '#065f46' : '#92400e' }}>
                  {inv.verified ? <CheckCircle size={13} /> : <Clock size={13} />} {inv.verified ? 'Payment Verified' : (STAGE_LABEL[inv.stage] || 'Pending')}
                </span>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#666', marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            {isFinal
              ? 'This is a computer-generated final invoice issued upon verification of payment.'
              : 'This is a proforma invoice. Please make the payment to proceed. A final invoice will be issued after payment verification.'}
            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>For Quality Control Certification</div>
              <div style={{ color: '#888', marginTop: 18 }}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
