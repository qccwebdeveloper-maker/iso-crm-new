import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import {
  Award, Download, Edit2, Plus, Trash2, Save,
  Clock, AlertCircle, RefreshCw, CheckCircle, Eye,
} from 'lucide-react';

const ISO_STDS = [
  'ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 22000:2018',
  'ISO 50001:2018','ISO 27001:2022','ISO/IEC 27701:2025','ISO/IEC 42001:2023',
  'ISO 22301:2019','ISO 37001:2016','ISO 21001:2018',
];
const ACCRED = ['EAS','UASL'];

const blank = () => ({
  orgName:'', standard:'', scope:'', address:'', clientId:'',
  contactPerson:'', designation:'', contactNumber:'', email:'',
  auditorName:'', auditorRole:'', iafCode:'', accreditation:'EAS',
  certNumber:'', issueDate:'', expiryDate:'', surveillanceDate:'',
  surveillanceDate2:'', originalCertDate:'', notes:'',
  orgTop:19, addressTop:25, scopeTop:51,
  orgSize:33, addressSize:20, scopeSize:22,
});

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* Long date format used on the printed certificate, e.g. "16 - February - 2026" */
const fmtLong = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  const day = String(dt.getDate()).padStart(2,'0');
  const month = dt.toLocaleString('en-US', { month:'long' });
  return `${day} - ${month} - ${dt.getFullYear()}`;
};

const esc = (s='') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ─── ISO management system label ─── */
function msLabel(standard) {
  if (!standard) return 'Management System';
  if (standard.includes('9001'))  return 'Quality Management System';
  if (standard.includes('14001')) return 'Environmental Management System';
  if (standard.includes('45001')) return 'Occupational Health & Safety Management System';
  if (standard.includes('22000')) return 'Food Safety Management System';
  if (standard.includes('27001')) return 'Information Security Management System';
  if (standard.includes('42001')) return 'AI Management System';
  if (standard.includes('22301')) return 'Business Continuity Management System';
  if (standard.includes('37001')) return 'Anti-Bribery Management System';
  if (standard.includes('21001')) return 'Educational Organizations Management System';
  return 'Management System';
}

/* Lazily load html2canvas from CDN (no npm dependency needed) */
let _h2cPromise = null;
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (_h2cPromise) return _h2cPromise;
  _h2cPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => { _h2cPromise = null; reject(new Error('Failed to load html2canvas')); };
    document.body.appendChild(s);
  });
  return _h2cPromise;
}

/* Build the certificate card markup (template image background + overlays) */
function certCardHtml(cert, W, H) {
  const orgName     = esc(cert.orgName || cert.organizationName || 'Your Organization Name');
  const standard    = (cert.standard || 'ISO 9001:2015').trim();
  const scope       = esc(cert.scope || 'Your Organization Scope');
  const certNumber  = esc(cert.certNumber || 'XXX/XXXX/XXXX');
  const issueDate   = fmtLong(cert.issueDate);
  const expiryDate  = fmtLong(cert.expiryDate);
  const origDate    = fmtLong(cert.originalCertDate || cert.issueDate);
  const surv1       = fmtLong(cert.surveillanceDate);
  const surv2       = fmtLong(cert.surveillanceDate2);
  const address     = esc(cert.address || '');
  const additionalSites = esc(cert.additionalSites || '');
  const msName      = esc(msLabel(standard));
  const bgUrl       = `${window.location.origin}/certificate-bg.jpg`;
  const statusUrl   = 'https://qccertification.com/Client.aspx';
  // Template already shows "Quality Management System / ISO 9001:2015" — only mask when different.
  const isNine9001  = /9001/.test(standard);

  // Adjustable vertical positions (% from top) — admin can nudge these per certificate
  const orgTop     = (cert.orgTop     === 0 || cert.orgTop)     ? Number(cert.orgTop)     : 19;
  const addressTop = (cert.addressTop === 0 || cert.addressTop) ? Number(cert.addressTop) : 25;
  const scopeTop   = (cert.scopeTop   === 0 || cert.scopeTop)   ? Number(cert.scopeTop)   : 51;
  const orgSize     = Number(cert.orgSize)     > 0 ? Number(cert.orgSize)     : 33;
  const addressSize = Number(cert.addressSize) > 0 ? Number(cert.addressSize) : 20;
  const scopeSize   = Number(cert.scopeSize)   > 0 ? Number(cert.scopeSize)   : 22;

  // Details rows rendered as an aligned table so all colons line up (matches the printed design)
  const detailRows = [
    ['Certificate No.',      certNumber],
    ['Original Issue Date',  origDate],
    ['Issue Date',           issueDate],
    ['1st Surveillance Due', surv1],
    ['2nd Surveillance Due', surv2],
    ['Expiry Date',          expiryDate],
  ].map(([label, value]) =>
    `<div style="display:table-row">
       <span style="display:table-cell;font-weight:bold;white-space:nowrap;padding-right:12px">${label}</span>
       <span style="display:table-cell;font-weight:bold;white-space:nowrap">: ${value}</span>
     </div>`
  ).join('');

  return `
  <div style="width:${W}px;height:${H}px;background:#fff;position:relative;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
    <img src="${bgUrl}" crossorigin="anonymous" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0"/>

    <div style="position:absolute;z-index:1;text-align:center;top:${orgTop}%;left:13%;right:13%;font-family:'Times New Roman',Georgia,serif">
      <div style="font-size:${orgSize}px;font-weight:bold;color:#000;line-height:1.25">${orgName}</div>
    </div>
    ${(address || additionalSites) ? `
    <div style="position:absolute;z-index:1;text-align:center;top:${addressTop}%;left:13%;right:13%;font-family:'Times New Roman',Georgia,serif">
      ${address ? `<div style="font-size:${addressSize}px;font-weight:bold;color:#000;line-height:1.55;white-space:pre-line">${address}</div>` : ''}
      ${additionalSites ? `<div style="font-size:${Math.max(10, addressSize - 3)}px;font-weight:bold;color:#000;margin-top:5px;line-height:1.45;white-space:pre-line">${additionalSites}</div>` : ''}
    </div>` : ''}

    ${!isNine9001 ? `
    <div style="position:absolute;z-index:2;top:35.8%;left:11%;right:11%;height:8.4%;background:#fff"></div>
    <div style="position:absolute;z-index:3;text-align:center;left:6%;right:6%;top:36.2%;font-size:32px;font-weight:bold;color:#1a1a1a;line-height:1.1">${msName}</div>
    <div style="position:absolute;z-index:3;text-align:center;left:6%;right:6%;top:39.9%;font-size:54px;font-weight:900;color:#1565c0;letter-spacing:1px;line-height:1.05">${esc(standard)}</div>` : ''}

    <div style="position:absolute;z-index:1;text-align:center;top:${scopeTop}%;left:13%;right:13%;font-family:'Times New Roman',Georgia,serif">
      <div style="font-size:${scopeSize}px;font-weight:bold;color:#000;line-height:1.5;text-transform:uppercase">${scope}</div>
    </div>

    <div style="position:absolute;z-index:1;text-align:left;top:63%;left:8%;width:66%;font-size:14px;color:#1a1a1a;line-height:1.95">
      <div style="display:table">${detailRows}</div>
      <div style="margin-top:8px;font-size:12px;font-weight:bold">To check this certificate status visit:</div>
      <div style="font-size:12px;color:#1565c0;font-style:italic">"${statusUrl}"</div>
    </div>
  </div>`;
}

/* On-screen certificate preview (scaled to fit) — uses the same template + overlays */
function CertificatePreview({ cert, maxWidth = 540 }) {
  const W = 900, H = Math.round((W * 2263) / 1591);
  const scale = maxWidth / W;
  return (
    <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.18)' }}>
      <div
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        dangerouslySetInnerHTML={{ __html: certCardHtml(cert, W, H) }}
      />
    </div>
  );
}

/* Render the certificate off-screen and download it directly as a JPG (no popup) */
async function generateCertificate(cert) {
  const fileName = `Certificate-${(cert.certNumber || 'QCC').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  const t = toast.loading('Generating certificate…');
  // Match the template image's exact aspect ratio (1591×2263) so it is never stretched
  const W = 900, H = Math.round((W * 2263) / 1591);
  let wrap;
  try {
    const html2canvas = await loadHtml2Canvas();

    wrap = document.createElement('div');
    wrap.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px;z-index:-1;pointer-events:none`;
    wrap.innerHTML = certCardHtml(cert, W, H);
    document.body.appendChild(wrap);

    // Wait for the template background image to finish loading
    const img = wrap.querySelector('img');
    await new Promise((res) => {
      if (img.complete) return res();
      img.onload = res; img.onerror = res;
    });

    const canvas = await html2canvas(wrap.firstElementChild, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    toast.success('Certificate downloaded', { id: t });
  } catch (e) {
    toast.error('Failed to generate certificate', { id: t });
  } finally {
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }
}

const FG = ({ label, required, children, full }) => (
  <div className="form-group" style={full ? { gridColumn:'1/-1' } : {}}>
    <label className="form-label">{label}{required && <span style={{ color:'var(--red)' }}> *</span>}</label>
    {children}
  </div>
);

const SectionBand = ({ title }) => (
  <div style={{ background:'linear-gradient(90deg,var(--primary-50),white)', border:'1px solid var(--primary-100)', borderRadius:8, padding:'7px 14px', margin:'18px 0 12px', fontWeight:700, fontSize:12, color:'var(--primary-dark)', letterSpacing:'.04em' }}>
    {title}
  </div>
);

function statusOf(c) {
  if (!c.expiryDate) return { label:'Active', color:'#10b981', bg:'#d1fae5' };
  const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
  if (days < 0)  return { label:'Expired',              color:'#ef4444', bg:'#fee2e2' };
  if (days < 90) return { label:`Expiring (${days}d)`,  color:'#f59e0b', bg:'#fef3c7' };
  return { label:'Active', color:'#10b981', bg:'#d1fae5' };
}

/* ─── Edit / Issue form (reused in both modal and full tab) ─── */
function CertForm({ data, set, isEdit, onGen }) {
  return (
    <>
      <SectionBand title="Organization Details" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <FG label="Organization Name" required>
          <input className="form-control" value={data.orgName||''} onChange={e=>set('orgName',e.target.value)} placeholder="ABC Pvt. Ltd." />
        </FG>
        <FG label="ISO Standard" required>
          <select className="form-control" value={data.standard||''} onChange={e=>set('standard',e.target.value)}>
            <option value="">— Select Standard —</option>
            {ISO_STDS.map(s=><option key={s}>{s}</option>)}
          </select>
        </FG>
        <FG label="Address" full>
          <textarea className="form-control" rows={2} value={data.address||''} onChange={e=>set('address',e.target.value)} placeholder="Full address..." />
        </FG>
        <FG label="Scope of Certification" full>
          <textarea className="form-control" rows={2} value={data.scope||''} onChange={e=>set('scope',e.target.value)} placeholder="Design, Development and Provision of..." />
        </FG>
        <FG label="Contact Person">
          <input className="form-control" value={data.contactPerson||''} onChange={e=>set('contactPerson',e.target.value)} />
        </FG>
        <FG label="Designation">
          <input className="form-control" value={data.designation||''} onChange={e=>set('designation',e.target.value)} />
        </FG>
        <FG label="Contact Number">
          <input className="form-control" value={data.contactNumber||''} onChange={e=>set('contactNumber',e.target.value)} />
        </FG>
        <FG label="Email">
          <input type="email" className="form-control" value={data.email||''} onChange={e=>set('email',e.target.value)} />
        </FG>
      </div>

      <SectionBand title="Certificate Details" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
        <FG label="Certificate Number" required>
          <div style={{ display:'flex', gap:6 }}>
            <input className="form-control" value={data.certNumber||''} onChange={e=>set('certNumber',e.target.value)} placeholder="QCC/65A3B/0226" />
            {onGen && (
              <button type="button" className="btn btn-ghost btn-sm" title="Auto-generate number" style={{ whiteSpace:'nowrap' }} onClick={onGen}>
                <RefreshCw size={13}/> Generate
              </button>
            )}
          </div>
        </FG>
        <FG label="IAF Code">
          <input className="form-control" value={data.iafCode||''} onChange={e=>set('iafCode',e.target.value)} placeholder="e.g. 33" />
        </FG>
        <FG label="Accreditation Body">
          <select className="form-control" value={data.accreditation||'EAS'} onChange={e=>set('accreditation',e.target.value)}>
            {ACCRED.map(a=><option key={a}>{a}</option>)}
          </select>
        </FG>
        <FG label="Original Issue Date">
          <input type="date" className="form-control" value={(data.originalCertDate||'').slice(0,10)} onChange={e=>set('originalCertDate',e.target.value)} />
        </FG>
        <FG label="Issue Date">
          <input type="date" className="form-control" value={(data.issueDate||'').slice(0,10)} onChange={e=>set('issueDate',e.target.value)} />
        </FG>
        <FG label="Expiry Date">
          <input type="date" className="form-control" value={(data.expiryDate||'').slice(0,10)} onChange={e=>set('expiryDate',e.target.value)} />
        </FG>
        <FG label="1st Surveillance Due">
          <input type="date" className="form-control" value={(data.surveillanceDate||'').slice(0,10)} onChange={e=>set('surveillanceDate',e.target.value)} />
        </FG>
        <FG label="2nd Surveillance Due">
          <input type="date" className="form-control" value={(data.surveillanceDate2||'').slice(0,10)} onChange={e=>set('surveillanceDate2',e.target.value)} />
        </FG>
      </div>

      <SectionBand title="Certificate Layout — Text Position" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <FG label="Organization block — vertical position">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Move up"
              onClick={()=>set('orgTop', Math.max(0, Math.round((Number(data.orgTop ?? 19) - 0.5)*10)/10))}>↑</button>
            <input type="number" step="0.5" className="form-control" style={{ textAlign:'center' }}
              value={data.orgTop ?? 19} onChange={e=>set('orgTop', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Move down"
              onClick={()=>set('orgTop', Math.min(100, Math.round((Number(data.orgTop ?? 19) + 0.5)*10)/10))}>↓</button>
          </div>
        </FG>
        <FG label="Address block — vertical position">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Move up"
              onClick={()=>set('addressTop', Math.max(0, Math.round((Number(data.addressTop ?? 25) - 0.5)*10)/10))}>↑</button>
            <input type="number" step="0.5" className="form-control" style={{ textAlign:'center' }}
              value={data.addressTop ?? 25} onChange={e=>set('addressTop', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Move down"
              onClick={()=>set('addressTop', Math.min(100, Math.round((Number(data.addressTop ?? 25) + 0.5)*10)/10))}>↓</button>
          </div>
        </FG>
        <FG label="Scope block — vertical position">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Move up"
              onClick={()=>set('scopeTop', Math.max(0, Math.round((Number(data.scopeTop ?? 51) - 0.5)*10)/10))}>↑</button>
            <input type="number" step="0.5" className="form-control" style={{ textAlign:'center' }}
              value={data.scopeTop ?? 51} onChange={e=>set('scopeTop', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Move down"
              onClick={()=>set('scopeTop', Math.min(100, Math.round((Number(data.scopeTop ?? 51) + 0.5)*10)/10))}>↓</button>
          </div>
        </FG>
        <FG label="Organization — text size">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Smaller"
              onClick={()=>set('orgSize', Math.max(8, Number(data.orgSize ?? 33) - 1))}>A−</button>
            <input type="number" step="1" className="form-control" style={{ textAlign:'center' }}
              value={data.orgSize ?? 33} onChange={e=>set('orgSize', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Bigger"
              onClick={()=>set('orgSize', Math.min(80, Number(data.orgSize ?? 33) + 1))}>A+</button>
          </div>
        </FG>
        <FG label="Address — text size">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Smaller"
              onClick={()=>set('addressSize', Math.max(8, Number(data.addressSize ?? 20) - 1))}>A−</button>
            <input type="number" step="1" className="form-control" style={{ textAlign:'center' }}
              value={data.addressSize ?? 20} onChange={e=>set('addressSize', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Bigger"
              onClick={()=>set('addressSize', Math.min(60, Number(data.addressSize ?? 20) + 1))}>A+</button>
          </div>
        </FG>
        <FG label="Scope — text size">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" title="Smaller"
              onClick={()=>set('scopeSize', Math.max(8, Number(data.scopeSize ?? 22) - 1))}>A−</button>
            <input type="number" step="1" className="form-control" style={{ textAlign:'center' }}
              value={data.scopeSize ?? 22} onChange={e=>set('scopeSize', e.target.value===''?'':Number(e.target.value))} />
            <button type="button" className="btn btn-ghost btn-sm" title="Bigger"
              onClick={()=>set('scopeSize', Math.min(60, Number(data.scopeSize ?? 22) + 1))}>A+</button>
          </div>
        </FG>
        <div style={{ gridColumn:'1/-1', fontSize:11.5, color:'var(--gray-500)' }}>
          Position: smaller number = higher up (defaults Org <b>19</b>, Address <b>25</b>, Scope <b>51</b>). Text size in px (defaults Org <b>33</b>, Address <b>20</b>, Scope <b>22</b>). Use ↑/↓ and A−/A+.
        </div>
      </div>

      {isEdit && (data.updatedAt||data.createdAt) && (
        <div style={{ marginTop:14, padding:'8px 12px', background:'var(--primary-50)', borderRadius:8, fontSize:11.5, color:'var(--gray-500)', display:'flex', alignItems:'center', gap:6 }}>
          <Clock size={12} />
          Last updated: <strong style={{ color:'var(--primary-dark)' }}>{fmt(data.updatedAt||data.createdAt)}</strong>
          &nbsp;·&nbsp; Created: <strong style={{ color:'var(--primary-dark)' }}>{fmt(data.createdAt)}</strong>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════ MAIN ═══════════════════════ */
export default function CertificateManagement() {
  const [tab,         setTab]         = useState('list');
  const [certs,       setCerts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [manualForm,  setManualForm]  = useState(blank());
  const [editModal,   setEditModal]   = useState(null);
  const [viewModal,   setViewModal]   = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [clientIdInput, setClientIdInput] = useState('');
  const [fetching,    setFetching]    = useState(false);
  const [setting,     setSetting]     = useState({
    title:'Certificate of Registration', authority:'QC Certification Pvt Ltd',
    validityYears:3, footerText:'This certificate is subject to certification body regulations.', accreditation:'EAS',
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/certificates').catch(()=>({ data:[] })),
    ]).then(([c]) => {
      setCerts(c.data||[]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setM = (k,v) => setManualForm(p=>({...p,[k]:v}));
  const setE = (k,v) => setEditModal(p=>({...p,[k]:v}));

  // Coerce layout position fields to clean numbers before saving
  const numOr = (v, d) => (v==='' || v===null || v===undefined || isNaN(Number(v))) ? d : Number(v);
  const withLayout = (f) => ({
    ...f,
    orgTop: numOr(f.orgTop, 19), addressTop: numOr(f.addressTop, 25), scopeTop: numOr(f.scopeTop, 51),
    orgSize: numOr(f.orgSize, 33), addressSize: numOr(f.addressSize, 20), scopeSize: numOr(f.scopeSize, 22),
  });

  const genCertNumber = async (setter) => {
    try {
      const { data } = await axios.get('/api/certificates/gen-number');
      setter('certNumber', data.certNumber);
      toast.success('Certificate number generated');
    } catch { toast.error('Failed to generate number'); }
  };

  const fetchByClientId = async () => {
    const cid = clientIdInput.trim();
    if (!cid) return toast.error('Enter a Client ID');
    setFetching(true);
    try {
      const { data } = await axios.get(`/api/certificates/prefill/${encodeURIComponent(cid)}`);
      setManualForm(p => ({ ...p, ...data.data }));
      toast.success(
        data.foundApplication
          ? `Filled from ${data.client.name}'s application`
          : `Client ${data.client.name} found (no application — filled basic details)`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Client not found');
    } finally { setFetching(false); }
  };

  const issueManual = async () => {
    if (!manualForm.orgName.trim())   return toast.error('Organization name required');
    if (!manualForm.standard)         return toast.error('Standard required');
    if (!manualForm.certNumber.trim()) return toast.error('Certificate number required');
    setSaving(true);
    try {
      await axios.post('/api/certificates/manual', withLayout(manualForm));
      toast.success('Certificate issued!');
      setManualForm(blank());
      setTab('list');
      load();
    } catch { toast.error('Failed to issue certificate'); }
    finally { setSaving(false); }
  };

  const updateCert = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await axios.put(`/api/certificates/${editModal._id}`, withLayout(editModal));
      toast.success('Certificate updated!');
      setEditModal(null);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const deleteCert = async () => {
    try {
      await axios.delete(`/api/certificates/${deleteId}`);
      toast.success('Certificate deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const saveSetting = async () => {
    setSaving(true);
    try {
      await axios.put('/api/certificates/settings', setting);
      toast.success('Settings saved');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  // Summary counts
  const active    = certs.filter(c => !c.expiryDate || new Date(c.expiryDate) > new Date()).length;
  const expiringSoon = certs.filter(c => {
    if (!c.expiryDate) return false;
    const d = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
    return d >= 0 && d < 90;
  }).length;
  const expired   = certs.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date()).length;

  const TABS = [
    { id:'list',     label:'All Certificates' },
    { id:'manual',   label:'+ Issue Manual'   },
    { id:'settings', label:'Settings'         },
  ];

  return (
    <Layout title="Certificate Management">

      {/* ── Header ── */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Certificate Management</h1>
          <p className="page-subtitle">Issue, update and manage ISO certifications</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14}/> Refresh</button>
          <button className="btn btn-primary" onClick={()=>setTab('manual')}><Plus size={14}/> Issue Certificate</button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Issued',    value:certs.length, color:'#3b82f6', bg:'#dbeafe', icon:Award        },
          { label:'Active',          value:active,        color:'#10b981', bg:'#d1fae5', icon:CheckCircle  },
          { label:'Expiring Soon',   value:expiringSoon,  color:'#f59e0b', bg:'#fef3c7', icon:Clock        },
          { label:'Expired',         value:expired,       color:'#ef4444', bg:'#fee2e2', icon:AlertCircle  },
        ].map((s,i)=>(
          <div key={i} style={{ background:'white', borderRadius:10, padding:'14px 18px', border:'1.5px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <s.icon size={16} color={s.color}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom:0 }}>
        {/* ── Tabs ── */}
        <div className="tabs-bar">
          {TABS.map(t=>(
            <button key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding:'20px 24px' }}>

          {/* ═══ LIST TAB ═══ */}
          {tab==='list'&&(
            loading
              ? <div className="loading-box"><div className="spinner"/></div>
              : certs.length===0
                ? (
                  <div className="empty-box" style={{ padding:'48px 20px' }}>
                    <Award size={40}/>
                    <h3>No certificates yet</h3>
                    <p>Issue your first certificate to get started.</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={()=>setTab('manual')}>
                      <Plus size={12}/> Issue Certificate
                    </button>
                  </div>
                )
                : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Client ID</th>
                          <th>Organization</th>
                          <th>Standard</th>
                          <th>Issue Date</th>
                          <th>Expiry Date</th>
                          <th>Last Updated</th>
                          <th>Status</th>
                          <th style={{ textAlign:'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certs.map(c=>{
                          const st = statusOf(c);
                          return (
                            <tr key={c._id}>
                              <td style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--primary-dark)' }}>
                                {c.clientId||'—'}
                                {c.certNumber&&<div style={{ fontSize:10, color:'var(--gray-400)', fontWeight:600 }}>{c.certNumber}</div>}
                              </td>
                              <td style={{ fontWeight:600, maxWidth:180 }}>
                                <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.orgName||c.organizationName||'—'}</div>
                                {c.iafCode&&<div style={{ fontSize:10, color:'var(--gray-400)' }}>IAF: {c.iafCode}</div>}
                              </td>
                              <td style={{ fontSize:12 }}>{c.standard||'—'}</td>
                              <td style={{ fontSize:12 }}>{fmt(c.issueDate)}</td>
                              <td style={{ fontSize:12 }}>{fmt(c.expiryDate)}</td>
                              <td>
                                <div style={{ fontSize:11.5, color:'var(--gray-500)' }}>{fmt(c.updatedAt||c.createdAt)}</div>
                                {c.updatedAt&&c.createdAt&&c.updatedAt!==c.createdAt&&(
                                  <div style={{ fontSize:10, color:'var(--primary)' }}>Updated</div>
                                )}
                              </td>
                              <td>
                                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color }}>
                                  {st.label}
                                </span>
                              </td>
                              <td>
                                <div style={{ display:'flex', gap:5, justifyContent:'center', flexWrap:'wrap' }}>
                                  <button className="btn btn-ghost btn-sm" title="View Details"
                                    onClick={()=>setViewModal(c)}>
                                    <Eye size={13}/> View
                                  </button>
                                  <button className="btn btn-ghost btn-sm" title="Edit / Update"
                                    onClick={()=>setEditModal({ ...c, issueDate:(c.issueDate||'').slice(0,10), expiryDate:(c.expiryDate||'').slice(0,10), surveillanceDate:(c.surveillanceDate||'').slice(0,10) })}>
                                    <Edit2 size={13}/> Edit
                                  </button>
                                  <button className="btn btn-secondary btn-sm" onClick={()=>generateCertificate(c)}>
                                    <Download size={13}/> Download
                                  </button>
                                  <button
                                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, border:'1px solid #fecaca', background:'#fef2f2', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}
                                    onClick={()=>setDeleteId(c._id)}>
                                    <Trash2 size={13}/> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
          )}

          {/* ═══ MANUAL ISSUE TAB ═══ */}
          {tab==='manual'&&(
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--gray-700)', marginBottom:18, paddingBottom:12, borderBottom:'1.5px solid var(--primary-50)' }}>
                Issue New Certificate Manually
              </div>

              {/* Fetch details from a client's application by Client ID */}
              <div style={{ background:'var(--primary-50)', border:'1.5px solid var(--primary-100)', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
                <div style={{ fontWeight:700, fontSize:12.5, color:'var(--primary-dark)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <RefreshCw size={13}/> Auto-fill from Client ID
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  <input
                    className="form-control"
                    style={{ maxWidth:220 }}
                    placeholder="Enter Client ID (e.g. 1000)"
                    value={clientIdInput}
                    onChange={e=>setClientIdInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter') fetchByClientId(); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={fetchByClientId} disabled={fetching}>
                    {fetching ? 'Fetching…' : 'Fetch & Fill'}
                  </button>
                  <span style={{ fontSize:11.5, color:'var(--gray-500)' }}>
                    Loads organization, address, standard, scope &amp; contact from the client's latest application.
                  </span>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 380px', gap:24, alignItems:'start' }}>
                {/* Left — form */}
                <div>
                  <CertForm data={manualForm} set={setM} isEdit={false} onGen={()=>genCertNumber(setM)}/>
                  <div style={{ display:'flex', gap:10, marginTop:22, paddingTop:16, borderTop:'1.5px solid var(--primary-50)' }}>
                    <button className="btn btn-ghost" onClick={()=>setTab('list')}>Cancel</button>
                    <button className="btn btn-primary" onClick={issueManual} disabled={saving}>
                      <Award size={14}/> {saving?'Issuing…':'Issue Certificate'}
                    </button>
                  </div>
                </div>

                {/* Right — live sample preview */}
                <div style={{ position:'sticky', top:16 }}>
                  <div style={{ fontWeight:700, fontSize:12.5, color:'var(--primary-dark)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                    <Eye size={14}/> Live Sample Preview
                  </div>
                  <div style={{ display:'flex', justifyContent:'center', background:'#e7eef6', borderRadius:10, padding:14 }}>
                    <CertificatePreview cert={manualForm} maxWidth={340} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:8, textAlign:'center' }}>
                    Updates live as you edit. Use the ↑ / ↓ position controls to adjust spacing.
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop:12, width:'100%' }}
                    onClick={()=>generateCertificate(manualForm)}>
                    <Download size={13}/> Download Sample JPG
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS TAB ═══ */}
          {tab==='settings'&&(
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--gray-700)', marginBottom:18, paddingBottom:12, borderBottom:'1.5px solid var(--primary-50)' }}>
                Certificate Template Settings
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Certificate Title</label>
                  <input className="form-control" value={setting.title} onChange={e=>setSetting(p=>({...p,title:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Issuing Authority</label>
                  <input className="form-control" value={setting.authority} onChange={e=>setSetting(p=>({...p,authority:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Validity (Years)</label>
                  <input type="number" className="form-control" value={setting.validityYears} onChange={e=>setSetting(p=>({...p,validityYears:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Accreditation Body</label>
                  <select className="form-control" value={setting.accreditation} onChange={e=>setSetting(p=>({...p,accreditation:e.target.value}))}>
                    {ACCRED.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Footer Text</label>
                  <textarea className="form-control" rows={2} value={setting.footerText} onChange={e=>setSetting(p=>({...p,footerText:e.target.value}))}/>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveSetting} disabled={saving}>
                <Save size={14}/> {saving?'Saving…':'Save Settings'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ═══ VIEW MODAL — certificate image preview ═══ */}
      {viewModal&&(
        <div className="modal-bg" onClick={()=>setViewModal(null)}>
          <div className="modal-box" style={{ maxWidth:640 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                <Eye size={15} style={{ color:'var(--primary)', marginRight:7, verticalAlign:'middle' }}/>
                Certificate Preview — <span style={{ fontFamily:'monospace' }}>{viewModal.certNumber||'—'}</span>
              </div>
              <button className="modal-close" onClick={()=>setViewModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display:'flex', justifyContent:'center', background:'#e7eef6', padding:'20px 0' }}>
              <CertificatePreview cert={viewModal} maxWidth={560} />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setViewModal(null)}>Close</button>
              <button className="btn btn-secondary" onClick={()=>generateCertificate(viewModal)}>
                <Download size={13}/> Download JPG
              </button>
              <button className="btn btn-primary" onClick={()=>{ setEditModal({ ...viewModal, issueDate:(viewModal.issueDate||'').slice(0,10), expiryDate:(viewModal.expiryDate||'').slice(0,10) }); setViewModal(null); }}>
                <Edit2 size={13}/> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editModal&&(
        <div className="modal-bg" onClick={()=>setEditModal(null)}>
          <div className="modal-box" style={{ maxWidth:700 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                <Edit2 size={15} style={{ color:'var(--primary)', marginRight:7, verticalAlign:'middle' }}/>
                Update Certificate — <span style={{ fontFamily:'monospace' }}>{editModal.certNumber}</span>
              </div>
              <button className="modal-close" onClick={()=>setEditModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight:'72vh', overflowY:'auto' }}>
              <CertForm data={editModal} set={setE} isEdit={true} onGen={()=>genCertNumber(setE)}/>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={updateCert} disabled={saving}>
                <Save size={13}/> {saving?'Saving…':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM MODAL ═══ */}
      {deleteId&&(
        <div className="modal-bg" onClick={()=>setDeleteId(null)}>
          <div className="modal-box" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title" style={{ color:'#ef4444' }}>
                <Trash2 size={15} style={{ marginRight:7, verticalAlign:'middle' }}/>Confirm Delete
              </div>
              <button className="modal-close" onClick={()=>setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <AlertCircle size={40} style={{ color:'#ef4444', marginBottom:14 }}/>
                <p style={{ fontSize:14, color:'var(--gray-700)', margin:0, lineHeight:1.6 }}>
                  Are you sure you want to permanently delete this certificate?<br/>
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setDeleteId(null)}>Cancel</button>
              <button
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:8, border:'none', background:'#ef4444', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}
                onClick={deleteCert}>
                <Trash2 size={13}/> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
