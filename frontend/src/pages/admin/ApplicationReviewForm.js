import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Save, CheckCircle, ArrowLeft, Search, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ── tiny helpers ── */
const SH = ({ title, sub }) => (
  <div style={{ background: 'var(--primary)', color: '#fff', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, marginBottom: 14, marginTop: 6, letterSpacing: '.03em' }}>
    {title}{sub && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8, opacity: .85 }}>{sub}</span>}
  </div>
);

const FG = ({ label, required, children, full, hint }) => (
  <div className="form-group" style={full ? { gridColumn: '1/-1' } : {}}>
    <label className="form-label">
      {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      {hint && <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 11 }}> {hint}</span>}
    </label>
    {children}
  </div>
);

const G2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0 16px' }}>{children}</div>
);
const G3 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0 16px' }}>{children}</div>
);
const Gauto = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0 16px' }}>{children}</div>
);

const inp = (val, onChange, placeholder = '', type = 'text') => (
  <input className="form-control" type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
);
const ta = (val, onChange, placeholder = '', rows = 2) => (
  <textarea className="form-control" rows={rows} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
);
const sel = (val, onChange, opts) => (
  <select className="form-control" value={val} onChange={e => onChange(e.target.value)}>
    {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
  </select>
);

const TH = ({ children, style = {} }) => (
  <th style={{ background: 'var(--primary-50)', color: 'var(--gray-600)', fontSize: 11, fontWeight: 700, padding: '8px 10px', textAlign: 'left', ...style }}>{children}</th>
);
const TD = ({ children, style = {} }) => (
  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', ...style }}>{children}</td>
);

const TEAM_ROLES = [
  'Lead Auditor',
  'Auditor',
  'Application Reviewer & Report Reviewer',
  'Final Certification Decision by HOD',
];

const INIT = () => ({
  /* Section 1 — Basic Info */
  idNo: '',
  organizationName: '',
  address: '',
  contactPerson: '',
  contactNumbers: '',
  personsUnderCertification: '',
  auditType1: 'Stage I',
  auditType2: 'Stage II',
  auditStandards: '',
  modeOfAudit: 'Onsite',
  meetingLink: '',
  scopeOfCertification: '',
  auditLanguage: 'English',
  iafCode: '',

  /* Transfer */
  isTransfer: 'No',
  ncClosed: '',
  ncReason: '',
  transferFromIAF: '',
  certValidityDate: '',

  risk: '',

  /* Section 2 — Audit Team */
  auditTeam: TEAM_ROLES.map(role => ({ role, name: '', stage1Days: '', stage2Days: '' })),
  totalManDays: '',
  totalManDaysStages: '',
  totalManDaysIAF: '',

  /* Audit Dates */
  stage1From: '', stage1To: '',
  stage2From: '', stage2To: '',

  /* Sign-off */
  reviewerName: '',
  reviewerDate: '',
  verificationName: '',
  verificationDate: '',

  /* Section 3 — ISMS Manday (ISO 27001) */
  ismsPersonsControl: '',
  ismsBaseAuditTime: '',
  ismsComplexityAdj: '',
  ismsAdditiveAdj: '',
  ismsAdditionalTime: '',
  ismsTotalFinalTime: '',
  ismsStage1Time: '',
  ismsStage2Time: '',
  ismsBusinessComplexity: '',
  ismsITComplexity: '',

  /* Section 4 — IMS Integrated Manday (Annex I) */
  imsOrgName: '',
  imsEmployees: '',
  imsApplicableStandards: '',
  imsISO9001: '',
  imsISO14001: '',
  imsISO45001: '',
  imsISO27001: '',
  imsTotalBeforeIntegration: '',
  imsBusinessComplexity: '',
  imsITComplexity: '',
  imsImpactFactor: '',
  imsISMSReduction: '',
  imsLevelOfIntegration: '',
  imsCombinedAuditAbility: '',
  imsIntegratedReduction: '',
  imsManDayReduction: '',
  imsFinalIntegratedManDays: '',
  imsOnSiteTime: '',
  imsOffSiteTime: '',
  imsStage1Audit: '',
  imsStage2Audit: '',
  imsTotalOnSite: '',
  imsOffSitePlanning: '',
  imsTotalIntegratedTime: '',

  reviewStatus: 'draft',
});

export default function ApplicationReviewForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [form, setForm] = useState(INIT());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  /* Application selector */
  const [apps, setApps] = useState([]);
  const [appSearch, setAppSearch] = useState('');
  const [showAppDrop, setShowAppDrop] = useState(false);
  const [linkedApp, setLinkedApp] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setTeam = (idx, key, val) =>
    setForm(p => {
      const t = [...p.auditTeam];
      t[idx] = { ...t[idx], [key]: val };
      return { ...p, auditTeam: t };
    });

  /* Load application list */
  useEffect(() => {
    axios.get('/api/applications').then(r => setApps(r.data || [])).catch(() => {});
  }, []);

  /* Load existing review */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/application-reviews/${id}`)
      .then(r => {
        const d = r.data;
        setForm({ ...INIT(), ...d });
        if (d.application) setLinkedApp(d.application);
      })
      .catch(() => toast.error('Failed to load review'))
      .finally(() => setLoading(false));
  }, [id]);

  const pickApp = app => {
    setLinkedApp(app);
    setShowAppDrop(false);
    setAppSearch('');
    set('organizationName',      app.organizationName || '');
    set('address',               app.address || '');
    set('contactPerson',         app.contactPerson || '');
    set('contactNumbers',        app.contactNumbers || '');
    set('auditStandards',        app.isoStandard || '');
    set('scopeOfCertification',  app.scopeOfCertification || app.scope || '');
    set('iafCode',               app.iafCode || '');
    set('imsOrgName',            app.organizationName || '');
    set('imsEmployees',          String(app.totalEmployees || ''));
    set('imsApplicableStandards',app.isoStandard || '');
    set('personsUnderCertification', String(app.totalEmployees || ''));
    set('ismsPersonsControl',    String(app.totalEmployees || ''));
  };

  const filteredApps = apps.filter(a => {
    const q = appSearch.toLowerCase();
    return !q || a.applicationId?.toLowerCase().includes(q) || a.organizationName?.toLowerCase().includes(q);
  });

  const handleSave = async (asDraft = true) => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        reviewStatus: asDraft ? 'draft' : 'submitted',
        ...(linkedApp ? { applicationRef: linkedApp._id } : {}),
      };
      if (id) {
        await axios.put(`/api/application-reviews/${id}`, payload);
        toast.success(asDraft ? 'Draft saved' : 'Review submitted');
      } else {
        const res = await axios.post('/api/application-reviews', payload);
        toast.success(asDraft ? 'Draft saved' : 'Review submitted');
        navigate(`/admin/application-review/${res.data._id}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title="Application Review"><div className="loading-box"><div className="spinner" /></div></Layout>;

  return (
    <Layout title="Application Review — Form">
      {/* ── Page header ── */}
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/application-review')}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="page-title">Application Review &amp; Audit Planning</h1>
            <p className="page-subtitle" style={{ fontSize: 11 }}>AUD-F-03 &nbsp;|&nbsp; Application Review &amp; AUD-F-03-01 Audit Planning / Rev.: 02</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => handleSave(true)} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            <CheckCircle size={14} /> {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      {/* ── Link Application ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Building size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Link Application:</span>
          <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
            <div className="search-wrap">
              <Search size={15} className="search-ico" />
              <input className="search-input" placeholder="Search application ID or org name…"
                value={appSearch}
                onFocus={() => setShowAppDrop(true)}
                onChange={e => { setAppSearch(e.target.value); setShowAppDrop(true); }} />
            </div>
            {showAppDrop && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 300, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto' }}>
                {filteredApps.length === 0
                  ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-400)' }}>No applications found</div>
                  : filteredApps.slice(0, 25).map(a => (
                    <div key={a._id} onClick={() => pickApp(a)}
                      style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--primary-50)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{a.applicationId}</span>
                        <span className={`badge bdg-${a.status}`} style={{ fontSize: 10 }}>{a.status?.replace(/_/g, ' ')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{a.organizationName} · {a.isoStandard}</div>
                    </div>
                  ))
                }
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAppDrop(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
          {linkedApp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--primary-50)', borderRadius: 8, border: '1px solid var(--primary-100)', fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{linkedApp.applicationId}</span>
              <span style={{ color: 'var(--gray-500)' }}>—</span>
              <span>{linkedApp.organizationName}</span>
              <span className="badge bdg-info" style={{ fontSize: 10 }}>{linkedApp.isoStandard}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 1 — Basic Application Information
      ══════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <SH title="Section 1 — Application Information" />

          <div className="form-group">
            <label className="form-label">ID No.</label>
            {inp(form.idNo, v => set('idNo', v), 'e.g. AUD-F-03-2024-001')}
          </div>

          <G2>
            <FG label="Organization Name" required>
              {inp(form.organizationName, v => set('organizationName', v))}
            </FG>
            <FG label="Contact Person">
              {inp(form.contactPerson, v => set('contactPerson', v))}
            </FG>
            <FG label="Address" full>
              {ta(form.address, v => set('address', v), '', 2)}
            </FG>
            <FG label="Contact Numbers">
              {inp(form.contactNumbers, v => set('contactNumbers', v))}
            </FG>
            <FG label="No. of Persons Under Certification">
              {inp(form.personsUnderCertification, v => set('personsUnderCertification', v), '0', 'number')}
            </FG>
          </G2>

          <G3>
            <FG label="Audit Type 1">
              {sel(form.auditType1, v => set('auditType1', v), ['Stage I', 'Stage II', 'Surveillance', 'Re-certification', 'Un-Announced', 'Follow-up'])}
            </FG>
            <FG label="Audit Type 2">
              {sel(form.auditType2, v => set('auditType2', v), ['Stage II', 'Stage I', 'Surveillance', 'Re-certification', 'Un-Announced', 'Follow-up', 'N/A'])}
            </FG>
            <FG label="Risk (H / M / L)">
              {sel(form.risk, v => set('risk', v), [
                { value: '', label: '— Select —' },
                { value: 'H', label: 'H — High' },
                { value: 'M', label: 'M — Medium' },
                { value: 'L', label: 'L — Low' },
              ])}
            </FG>
          </G3>

          <FG label="Audit Standard(s)" required>
            {inp(form.auditStandards, v => set('auditStandards', v), 'e.g. ISO 9001:2015, ISO 14001:2015')}
          </FG>

          <G2>
            <FG label="Mode of Audit">
              {sel(form.modeOfAudit, v => set('modeOfAudit', v), ['Onsite', 'Online', 'Hybrid'])}
            </FG>
            <FG label="Meeting Link" hint="(if Online)">
              {inp(form.meetingLink, v => set('meetingLink', v), 'https://…')}
            </FG>
          </G2>

          <FG label="Scope of Certification" full>
            {ta(form.scopeOfCertification, v => set('scopeOfCertification', v), '', 2)}
          </FG>

          <G2>
            <FG label="Audit Language">
              {inp(form.auditLanguage, v => set('auditLanguage', v), 'English')}
            </FG>
            <FG label="IAF Code">
              {inp(form.iafCode, v => set('iafCode', v))}
            </FG>
          </G2>

          {/* Transfer section */}
          <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)', marginBottom: 10 }}>For Transfer (if applicable)</div>
            <G2>
              <FG label="Is this a Transfer?">
                {sel(form.isTransfer, v => set('isTransfer', v), ['No', 'Yes'])}
              </FG>
              {form.isTransfer === 'Yes' && (
                <FG label="All nonconformities closed by existing CB?">
                  {sel(form.ncClosed, v => set('ncClosed', v), [
                    { value: '', label: '— Select —' },
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No',  label: 'No' },
                  ])}
                </FG>
              )}
              {form.isTransfer === 'Yes' && form.ncClosed === 'No' && (
                <FG label="If No — Describe the reason(s)" full>
                  {ta(form.ncReason, v => set('ncReason', v))}
                </FG>
              )}
              {form.isTransfer === 'Yes' && (
                <>
                  <FG label="Transfer from IAF Member CB">
                    {inp(form.transferFromIAF, v => set('transferFromIAF', v))}
                  </FG>
                  <FG label="Certificate Validity Date">
                    {inp(form.certValidityDate, v => set('certValidityDate', v), '', 'date')}
                  </FG>
                </>
              )}
            </G2>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 — Audit Team Details
      ══════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <SH title="Section 2 — Audit Team Details" />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <TH style={{ width: '30%' }}>Role</TH>
                  <TH style={{ width: '30%' }}>Name</TH>
                  <TH style={{ textAlign: 'center' }}>Audit Man-Days<br /><span style={{ fontWeight: 400, fontSize: 10 }}>Stage 1</span></TH>
                  <TH style={{ textAlign: 'center' }}>Audit Man-Days<br /><span style={{ fontWeight: 400, fontSize: 10 }}>Stage 2</span></TH>
                </tr>
              </thead>
              <tbody>
                {form.auditTeam.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontWeight: 600, fontSize: 12.5 }}>{row.role}</TD>
                    <TD>
                      <input className="form-control" style={{ margin: 0 }} value={row.name}
                        onChange={e => setTeam(idx, 'name', e.target.value)}
                        placeholder="Full name" />
                    </TD>
                    <TD style={{ textAlign: 'center' }}>
                      <input className="form-control" style={{ margin: 0, textAlign: 'center', width: 80 }}
                        type="number" min="0" step="0.5" value={row.stage1Days}
                        onChange={e => setTeam(idx, 'stage1Days', e.target.value)}
                        placeholder="0" />
                    </TD>
                    <TD style={{ textAlign: 'center' }}>
                      <input className="form-control" style={{ margin: 0, textAlign: 'center', width: 80 }}
                        type="number" min="0" step="0.5" value={row.stage2Days}
                        onChange={e => setTeam(idx, 'stage2Days', e.target.value)}
                        placeholder="0" />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <G3 style={{ marginTop: 14 }}>
            <FG label="Total Audit Man-Days">
              {inp(form.totalManDays, v => set('totalManDays', v), '0', 'number')}
            </FG>
            <FG label="Total Man-Days (Stage 1 + Stage 2)">
              {inp(form.totalManDaysStages, v => set('totalManDaysStages', v), '0', 'number')}
            </FG>
            <FG label="Total Man-Days as per IAF MD 5">
              {inp(form.totalManDaysIAF, v => set('totalManDaysIAF', v), '0', 'number')}
            </FG>
          </G3>

          {/* Audit Dates */}
          <SH title="Audit Dates (Tentative)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--primary)', marginBottom: 8 }}>Stage 1 Audit Dates</div>
              <G2>
                <FG label="From">{inp(form.stage1From, v => set('stage1From', v), '', 'date')}</FG>
                <FG label="To">{inp(form.stage1To,   v => set('stage1To',   v), '', 'date')}</FG>
              </G2>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--primary)', marginBottom: 8 }}>Stage 2 / Other Audit Dates</div>
              <G2>
                <FG label="From">{inp(form.stage2From, v => set('stage2From', v), '', 'date')}</FG>
                <FG label="To">{inp(form.stage2To,   v => set('stage2To',   v), '', 'date')}</FG>
              </G2>
            </div>
          </div>

          {/* Conflict of Interest */}
          <div style={{ margin: '16px 0 12px', padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: '#92400e' }}>Conflict of Interest Declaration: </span>
            I confirm that I don't have any relevant interest of below: — I didn't work with the applied/client organization in the recent two years. — I and QCC didn't supply any consulting, training and internal audit for the applied/client organization in the recent two years.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0 24px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--primary)', marginBottom: 6 }}>Reviewer</div>
              <G2>
                <FG label="Reviewer Name">{inp(form.reviewerName, v => set('reviewerName', v))}</FG>
                <FG label="Date">{inp(form.reviewerDate, v => set('reviewerDate', v), '', 'date')}</FG>
              </G2>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--primary)', marginBottom: 6 }}>Verification (if applicable)</div>
              <G2>
                <FG label="Verification Name">{inp(form.verificationName, v => set('verificationName', v))}</FG>
                <FG label="Date">{inp(form.verificationDate, v => set('verificationDate', v), '', 'date')}</FG>
              </G2>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 3 — Manday Calculation (ISMS / ISO 27001)
          As per ISO/IEC 27006-1:2024
      ══════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <SH title="Section 3 — Manday Calculation (ISMS)" sub="As per ISO/IEC 27006-1:2024" />

          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <TH style={{ width: '55%' }}>Description</TH>
                  <TH>Value</TH>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Number of Persons Under Organization\'s Control', 'ismsPersonsControl', 'number', ''],
                  ['Base ISMS Audit Time as per Table C.1', 'ismsBaseAuditTime', 'number', 'Auditor Days'],
                  ['IT / Business Complexity Adjustment', 'ismsComplexityAdj', 'text', '%'],
                  ['Additive / Subtractive Adjustment', 'ismsAdditiveAdj', 'number', 'Auditor Days'],
                  ['Additional Audit Time, if applicable', 'ismsAdditionalTime', 'number', 'Auditor Days'],
                  ['Total Final Audit Time', 'ismsTotalFinalTime', 'number', 'Auditor Days'],
                  ['Stage 1 Audit Time', 'ismsStage1Time', 'number', 'Auditor Days'],
                  ['Stage 2 Audit Time', 'ismsStage2Time', 'number', 'Auditor Days'],
                ].map(([label, key, type, unit], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontSize: 12.5 }}>{label}</TD>
                    <TD>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input className="form-control" style={{ margin: 0, maxWidth: 130 }}
                          type={type} value={form[key]}
                          onChange={e => set(key, e.target.value)} />
                        {unit && <span style={{ fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{unit}</span>}
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IT/Business Complexity Reference Table */}
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8 }}>
            IT / Business Complexity Reference (ISO/IEC 27006-1:2024)
          </div>
          <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <TH style={{ minWidth: 160 }}>Business Complexity ↓ / IT Complexity →</TH>
                  <TH style={{ textAlign: 'center', minWidth: 130 }}>Low IT (3–4)</TH>
                  <TH style={{ textAlign: 'center', minWidth: 130 }}>Medium IT (5–6)</TH>
                  <TH style={{ textAlign: 'center', minWidth: 130 }}>High IT (7–9)</TH>
                </tr>
              </thead>
              <tbody>
                {[
                  ['High Business (7–9)', '+5% to +20%', '+10% to +50%', '+20% to +100%'],
                  ['Medium Business (5–6)', '−5% to −10%', '0', '+10% to +50%'],
                  ['Low Business (3–4)', '−10% to −30%', '−5% to −10%', '+5% to +20%'],
                ].map(([biz, l, m, h], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontWeight: 600, fontSize: 11.5 }}>{biz}</TD>
                    <TD style={{ textAlign: 'center', fontSize: 11.5 }}>{l}</TD>
                    <TD style={{ textAlign: 'center', fontSize: 11.5, background: '#fef9c3' }}>{m}</TD>
                    <TD style={{ textAlign: 'center', fontSize: 11.5 }}>{h}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <G2>
            <FG label="Business Complexity (score 3–9)">
              {inp(form.ismsBusinessComplexity, v => set('ismsBusinessComplexity', v), 'e.g. 5')}
            </FG>
            <FG label="IT Complexity (score 3–9)">
              {inp(form.ismsITComplexity, v => set('ismsITComplexity', v), 'e.g. 4')}
            </FG>
          </G2>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 4 — IMS Man-Day Calculation (Annex I)
      ══════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <SH title="Section 4 — IMS Man-Day Calculation" sub="Annex I — Integrated Management System" />

          <G3>
            <FG label="Organization Name">
              {inp(form.imsOrgName, v => set('imsOrgName', v))}
            </FG>
            <FG label="No. of Employees">
              {inp(form.imsEmployees, v => set('imsEmployees', v), '0', 'number')}
            </FG>
            <FG label="Applicable Standards">
              {inp(form.imsApplicableStandards, v => set('imsApplicableStandards', v), 'e.g. ISO 9001, ISO 14001')}
            </FG>
          </G3>

          {/* Standard-wise Man-Day Calculation */}
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--gray-600)', margin: '14px 0 8px' }}>Standard-wise Man-Day Calculation</div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <TH style={{ width: '50%' }}>Standard</TH>
                  <TH>Man-days</TH>
                </tr>
              </thead>
              <tbody>
                {[
                  ['ISO 9001', 'imsISO9001'],
                  ['ISO 14001', 'imsISO14001'],
                  ['ISO 45001', 'imsISO45001'],
                  ['ISO 27001', 'imsISO27001'],
                ].map(([std, key], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontWeight: 600, fontSize: 12.5 }}>{std}</TD>
                    <TD>
                      <input className="form-control" style={{ margin: 0, maxWidth: 130 }}
                        type="number" value={form[key]}
                        onChange={e => set(key, e.target.value)} placeholder="0" />
                    </TD>
                  </tr>
                ))}
                <tr style={{ background: 'var(--primary-50)' }}>
                  <TD style={{ fontWeight: 700, fontSize: 12.5 }}>Total Man-days before Integration</TD>
                  <TD>
                    <input className="form-control" style={{ margin: 0, maxWidth: 130, fontWeight: 700 }}
                      type="number" value={form.imsTotalBeforeIntegration}
                      onChange={e => set('imsTotalBeforeIntegration', e.target.value)} placeholder="0" />
                  </TD>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ISMS Reduction Calculation */}
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--gray-600)', marginBottom: 8 }}>ISMS Reduction Calculation</div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr><TH style={{ width: '50%' }}>Factor</TH><TH>Result</TH></tr>
              </thead>
              <tbody>
                {[
                  ['Business Complexity', 'imsBusinessComplexity'],
                  ['IT Complexity', 'imsITComplexity'],
                  ['Impact Factor on Audit Time', 'imsImpactFactor'],
                  ['ISMS Reduction', 'imsISMSReduction'],
                ].map(([label, key], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontSize: 12.5 }}>{label}</TD>
                    <TD>
                      <input className="form-control" style={{ margin: 0, maxWidth: 160 }}
                        value={form[key]} onChange={e => set(key, e.target.value)} />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Integrated Man-Day Calculation */}
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--gray-600)', marginBottom: 8 }}>Integrated Man-Day Calculation <span style={{ fontWeight: 400, fontSize: 11 }}>(as per MD 11 Annex-1)</span></div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <TH style={{ width: '40%' }}>Particulars</TH>
                  <TH style={{ width: '30%' }}>Calculation / Basis</TH>
                  <TH>Result</TH>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Total Man-days before Integration', 'Standard-wise total', 'imsTotalBeforeIntegration'],
                  ['Level of Integration %', 'As per application / Annex 1', 'imsLevelOfIntegration'],
                  ['Ability to perform combined audit %', '100 ((X1-1)+(X2-1)+…(Xn-1)) / Z(Y-1)', 'imsCombinedAuditAbility'],
                  ['Integrated Reduction Allowed', 'Based on vertical & horizontal audit %', 'imsIntegratedReduction'],
                  ['Man-day Reduction', '', 'imsManDayReduction'],
                  ['Final Integrated Man-days', '', 'imsFinalIntegratedManDays'],
                ].map(([label, basis, key], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontWeight: i === 5 ? 700 : 500, fontSize: 12.5 }}>{label}</TD>
                    <TD style={{ fontSize: 11, color: 'var(--gray-500)' }}>{basis}</TD>
                    <TD>
                      <input className="form-control" style={{ margin: 0, maxWidth: 130 }}
                        type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0" />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* On-site / Off-site */}
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--gray-600)', marginBottom: 8 }}>On-site and Off-site Audit Time</div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr><TH style={{ width: '50%' }}>Particulars</TH><TH>Man-days</TH></tr>
              </thead>
              <tbody>
                {[
                  ['Final Integrated Man-days', 'imsFinalIntegratedManDays'],
                  ['On-site Audit Time', 'imsOnSiteTime'],
                  ['Off-site Time', 'imsOffSiteTime'],
                ].map(([label, key], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontSize: 12.5 }}>{label}</TD>
                    <TD>
                      <input className="form-control" style={{ margin: 0, maxWidth: 130 }}
                        type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0" />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stage-wise Audit Time Distribution */}
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--gray-600)', marginBottom: 8 }}>Stage-wise Audit Time Distribution</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
              <thead>
                <tr><TH style={{ width: '50%' }}>Audit Stage</TH><TH>Man-days</TH></tr>
              </thead>
              <tbody>
                {[
                  ['Stage 1 Audit', 'imsStage1Audit'],
                  ['Stage 2 Audit', 'imsStage2Audit'],
                  ['Total On-site Audit Time', 'imsTotalOnSite'],
                  ['Off-site Planning / Reporting / Closing', 'imsOffSitePlanning'],
                  ['Total Integrated Audit Time', 'imsTotalIntegratedTime'],
                ].map(([label, key], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TD style={{ fontWeight: [4].includes(i) ? 700 : 500, fontSize: 12.5, background: [4].includes(i) ? 'var(--primary-50)' : 'inherit' }}>{label}</TD>
                    <TD style={{ background: [4].includes(i) ? 'var(--primary-50)' : 'inherit' }}>
                      <input className="form-control" style={{ margin: 0, maxWidth: 130, fontWeight: [4].includes(i) ? 700 : 400 }}
                        type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0" />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Floating action bar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/application-review')}>
          <ArrowLeft size={14} /> Back to List
        </button>
        <button className="btn btn-secondary" onClick={() => handleSave(true)} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving}>
          <CheckCircle size={14} /> {saving ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </Layout>
  );
}
