import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  Search, ArrowLeft, CheckCircle, XCircle, Upload, Download, Eye, Send,
  Star, FileText, MessageSquare, Phone, Mail, Building, User,
  RefreshCw, ChevronRight, Clock, AlertCircle, Filter,
  Paperclip, FolderOpen, Plus, Trash2
} from 'lucide-react';

const FL = ['submitted','under_review','audit_stage1','audit_stage2','approved','certified'];

// ── Stepper component ──────────────────────────────────────────
const Stepper = ({ status }) => {
  const si = FL.indexOf(status);
  return (
    <div className="stepper">
      {FL.map((s,i) => (
        <div key={s} className={`step ${i<si?'done':''} ${i===si?'active':''}`}>
          <div className="step-node">
            <div className="step-circle">{i<si ? <CheckCircle size={12}/> : i+1}</div>
            <div className="step-lbl">{s.replace(/_/g,' ')}</div>
          </div>
          {i<FL.length-1 && <div className="step-connector"/>}
        </div>
      ))}
    </div>
  );
};

// ── Document row ───────────────────────────────────────────────
const DocRow = ({ icon, label, path, meta, onUpload, accept, uploading }) => {
  const fileRef = useRef(null);
  return (
    <div className="doc-row">
      <div className="doc-row-info">
        <div style={{width:36,height:36,borderRadius:8,background:path?'var(--primary-50)':'var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {icon || <FileText size={18} color={path?'var(--primary)':'var(--gray-400)'}/>}
        </div>
        <div>
          <div className="doc-row-name">{label}</div>
          <div className="doc-row-meta">{path ? '✓ Uploaded' : meta || 'Not uploaded yet'}</div>
        </div>
      </div>
      <div className="doc-row-actions">
        {path ? (
          <>
            <a href={path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Eye size={12}/> View</a>
            <a href={path} download className="btn btn-success btn-sm"><Download size={12}/> Save</a>
            {onUpload && (
              <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                <Upload size={12}/> {uploading?'…':'Replace'}
              </button>
            )}
          </>
        ) : onUpload ? (
          <button className="btn btn-primary btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}>
            <Upload size={12}/> {uploading?'Uploading…':'Upload'}
          </button>
        ) : (
          <span style={{fontSize:11,color:'var(--gray-400)'}}>Awaiting client</span>
        )}
        {onUpload && (
          <input ref={fileRef} type="file" accept={accept||'*'} style={{display:'none'}} onChange={onUpload}/>
        )}
      </div>
    </div>
  );
};

// ─── APPLICATIONS LIST ─────────────────────────────────────────
export function AuditorApplications() {
  const navigate = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [saving,  setSaving]  = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/applications').then(r => setApps(r.data||[])).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.client?.clientId?.toLowerCase().includes(q) || a.applicationId?.toLowerCase().includes(q) || a.organizationName?.toLowerCase().includes(q) || a.client?.name?.toLowerCase().includes(q))
      && (!statusF || a.status === statusF);
  });

  const advance = async (app) => {
    if (saving) return;
    const next = {under_review:'audit_stage1',audit_stage1:'audit_stage2',audit_stage2:'approved'}[app.status];
    if (!next) return;
    setSaving(app._id);
    try {
      await axios.put(`/api/applications/${app._id}/status`, { status:next });
      toast.success(`✅ Moved to: ${next.replace(/_/g,' ')}`);
      load();
    } catch { toast.error('Failed to update status'); }
    finally { setSaving(''); }
  };

  const nextLabel = { under_review:'→ Stage 1', audit_stage1:'→ Stage 2', audit_stage2:'→ Approve' };

  return (
    <Layout title="My Audits">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">My Assigned Audits</h1>
          <p className="page-subtitle">{filtered.length} application{filtered.length!==1?'s':''}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-body" style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:1,minWidth:220}}>
            <Search size={15} className="search-ico"/>
            <input className="search-input" placeholder="Search by Client ID, organization, client…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-control" style={{width:'auto',minWidth:170}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            {FL.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          {(search||statusF) && <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch('');setStatusF('');}}>Clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-box"><div className="spinner"/></div>
        ) : filtered.length===0 ? (
          <div className="empty-box" style={{padding:70}}>
            <Eye size={48} style={{color:'var(--primary-200)'}}/>
            <h3>No applications found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client ID</th><th>Organization</th><th>Client</th><th>Standard</th>
                  <th>Status</th><th>Docs</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app=>(
                  <tr key={app._id}>
                    <td><span className="mono">{app.client?.clientId || '—'}</span></td>
                    <td>
                      <div style={{fontWeight:600,color:'var(--text-1)',fontSize:13,marginBottom:2}}>{app.organizationName}</div>
                      <div style={{fontSize:11,color:'var(--gray-500)'}}>{[app.city,app.state].filter(Boolean).join(', ')}</div>
                    </td>
                    <td>
                      {app.client ? (
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div className="avatar" style={{width:26,height:26,fontSize:10,flexShrink:0}}>{app.client.name?.[0]}</div>
                          <div>
                            <div style={{fontWeight:600,fontSize:12,color:'var(--text-1)'}}>{app.client.name}</div>
                            {app.client.email && <div style={{fontSize:11,color:'var(--gray-500)',display:'flex',alignItems:'center',gap:3}}><Mail size={10} style={{color:'var(--primary)'}}/>{app.client.email}</div>}
                            {app.client.phone && <div style={{fontSize:11,color:'var(--gray-500)',display:'flex',alignItems:'center',gap:3}}><Phone size={10} style={{color:'var(--primary)'}}/>{app.client.phone}</div>}
                          </div>
                        </div>
                      ) : <span style={{color:'var(--gray-400)',fontSize:12}}>—</span>}
                    </td>
                    <td><span className="badge bdg-info" style={{fontSize:11}}>{app.isoStandard}</span></td>
                    <td><span className={`badge bdg-${app.status}`} style={{fontSize:11}}>{app.status?.replace(/_/g,' ')}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {app.applicationForm && <span title="Application Form" style={{color:'var(--primary)',fontSize:10,background:'var(--primary-50)',padding:'2px 5px',borderRadius:4,fontWeight:700}}>FORM</span>}
                        {app.auditReport     && <span title="Audit Report" style={{color:'#15803d',fontSize:10,background:'#dcfce7',padding:'2px 5px',borderRadius:4,fontWeight:700}}>RPT</span>}
                        {(app.uploadedDocuments||[]).length>0 && <span title={`${app.uploadedDocuments.length} documents`} style={{color:'#5b21b6',fontSize:10,background:'#f5f3ff',padding:'2px 5px',borderRadius:4,fontWeight:700}}>{app.uploadedDocuments.length}📎</span>}
                      </div>
                    </td>
                    <td style={{fontSize:11,color:'var(--primary-light)'}}>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:'5px 10px'}} onClick={()=>navigate(`/auditor/applications/${app._id}`)}>
                          Open
                        </button>
                        {nextLabel[app.status] && (
                          <button className="btn btn-success btn-sm" style={{fontSize:11,padding:'5px 10px'}} onClick={()=>advance(app)} disabled={saving===app._id}>
                            {saving===app._id?'…':nextLabel[app.status]}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── APPLICATION DETAIL ─────────────────────────────────────────
export function AuditorApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app,       setApp]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('overview');
  const [notes,     setNotes]     = useState('');
  const [fb,        setFb]        = useState({ message:'', rating:5 });
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState('');
  const [notifying, setNotifying] = useState(false);
  const auditRepRef  = useRef(null);
  const extraDocRef  = useRef(null);

  const load = () => {
    setLoading(true);
    axios.get(`/api/applications/${id}`)
      .then(r => { setApp(r.data); setNotes(r.data.auditNotes||''); })
      .finally(()=>setLoading(false));
  };
  useEffect(load, [id]);

  const { user } = useAuth();

  const setStatus = async (s) => {
    if (saving) return;
    setSaving(true);
    try {
      await axios.put(`/api/applications/${id}/status`, { status:s, notes });
      toast.success(`Status updated → ${s.replace(/_/g,' ')}`);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const saveNotes = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await axios.put(`/api/applications/${id}/status`, { status: app.status, notes });
      toast.success('Notes saved!');
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const upload = async (e, docType) => {
    if (uploading) return;
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('document', f);
    fd.append('docType', docType);
    setUploading(docType);
    try {
      await axios.post(`/api/applications/${id}/upload`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      toast.success(`${docType === 'auditReport' ? 'Audit report' : 'Document'} uploaded!`);
      load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(''); e.target.value=''; }
  };

  const uploadExtra = async (e) => {
    if (uploading) return;
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('document', f);
    fd.append('docType', 'extra');
    fd.append('docName', f.name);
    setUploading('extra');
    try {
      await axios.post(`/api/applications/${id}/upload`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      toast.success('Document uploaded!');
      load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(''); e.target.value=''; }
  };

  const submitFb = async () => {
    if (saving) return;
    if (!fb.message.trim()) return toast.error('Enter feedback');
    setSaving(true);
    try {
      await axios.post(`/api/applications/${id}/feedback`, { ...fb, role:'auditor' });
      toast.success('Feedback submitted!');
      setFb({ message:'', rating:5 });
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const notify = async () => {
    if (notifying) return;
    setNotifying(true);
    try {
      await axios.post(`/api/applications/${id}/send-document`, { message: notes||'Audit progress update.' });
      toast.success('Client notified!');
    } catch { toast.error('Failed'); }
    finally { setNotifying(false); }
  };

  if (loading) return <Layout title="Audit Detail"><div className="loading-box"><div className="spinner"/></div></Layout>;
  if (!app)    return <Layout title="Not Found"><div style={{padding:40,textAlign:'center',color:'var(--primary)'}}>Application not found</div></Layout>;

  const si = FL.indexOf(app.status);
  const canAudit = ['under_review','audit_stage1','audit_stage2'].includes(app.status);
  const docCount = [app.applicationForm, app.agreement, app.signedForm, app.auditReport].filter(Boolean).length + (app.uploadedDocuments||[]).length;

  return (
    <Layout title={`Audit — ${app.applicationId}`}>
      {/* ── Page header ── */}
      <div className="page-hdr">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/auditor/applications')}>
            <ArrowLeft size={14}/> Back
          </button>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2,flexWrap:'wrap'}}>
              <span className="mono">{app.applicationId}</span>
              <span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span>
              {docCount>0 && <span style={{fontSize:11,background:'#f5f3ff',color:'#5b21b6',padding:'2px 8px',borderRadius:99,fontWeight:700}}>📎 {docCount} docs</span>}
            </div>
            <p className="page-subtitle">{app.organizationName} · {app.isoStandard}</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {app.status==='under_review'   && <button className="btn btn-primary btn-sm"  onClick={()=>setStatus('audit_stage1')} disabled={saving}><CheckCircle size={13}/>Start Stage 1</button>}
          {app.status==='audit_stage1'   && <button className="btn btn-primary btn-sm"  onClick={()=>setStatus('audit_stage2')} disabled={saving}><CheckCircle size={13}/>Complete Stage 2</button>}
          {app.status==='audit_stage2'   && <button className="btn btn-success btn-sm"  onClick={()=>setStatus('approved')}     disabled={saving}><CheckCircle size={13}/>Approve</button>}
          {canAudit                      && <button className="btn btn-danger btn-sm"   onClick={()=>setStatus('rejected')}     disabled={saving}><XCircle size={13}/>Reject</button>}
          <button className="btn btn-ghost btn-sm" onClick={notify} disabled={notifying}><Send size={13}/> {notifying?'Notifying…':'Notify Client'}</button>
        </div>
      </div>

      {/* ── Stage Stepper ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-body"><Stepper status={app.status}/></div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs-bar">
        {[
          {k:'overview',  l:'Overview'},
          {k:'client',    l:'Client Info'},
          {k:'documents', l:`Documents (${docCount})`},
          {k:'audit',     l:'Audit Notes'},
          {k:'feedback',  l:`Feedback (${app.feedbacks?.length||0})`},
        ].map(t=>(
          <button key={t.k} className={`tab-item ${tab===t.k?'on':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════
          OVERVIEW TAB
      ═══════════════════════════════════ */}
      {tab==='overview' && (
        <div className="dash-grid">
          {/* Organization */}
          <div className="card">
            <div className="card-hdr"><div className="card-title"><Building size={14} style={{color:'var(--primary)'}}/>Organization</div></div>
            <div className="card-body">
              {[
                ['Name',        app.organizationName],
                ['Abbreviation',app.organizationAbbr],
                ['Address',     [app.address1,app.city,app.state,app.country].filter(Boolean).join(', ')],
                ['Pincode',     app.pincode],
                ['Website',     app.website],
                ['Submitted',   app.submittedAt?new Date(app.submittedAt).toLocaleDateString():'—'],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="info-row">
                  <span className="ir-label">{l}</span>
                  <span className="ir-value" style={{fontSize:12.5,wordBreak:'break-all'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ISO Details */}
          <div className="card">
            <div className="card-hdr"><div className="card-title"><FileText size={14} style={{color:'var(--primary)'}}/>ISO Details</div></div>
            <div className="card-body">
              {[
                ['Standard',          app.isoStandard],
                ['Scope',             app.scope],
                ['Accreditation',     app.accreditationBody],
                ['Head Office Staff', app.employeeCount?.headOffice],
                ['Branch Staff',      app.employeeCount?.branches],
                ['Temp Staff',        app.employeeCount?.temporary],
                ['Total Employees',   app.employeeCount?.total],
              ].filter(([,v])=>v||v===0).map(([l,v])=>(
                <div key={l} className="info-row">
                  <span className="ir-label">{l}</span>
                  <span className="ir-value" style={{fontSize:12.5}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div className="card">
            <div className="card-hdr"><div className="card-title"><User size={14} style={{color:'var(--primary)'}}/>Team Assignment</div></div>
            <div className="card-body">
              <div style={{marginBottom:16}}>
                <div className="section-label">Assigned Auditor</div>
                {app.assignedAuditor ? (
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--primary-50)',borderRadius:10,border:'1px solid var(--primary-100)'}}>
                    <div className="avatar" style={{width:32,height:32,fontSize:12}}>{app.assignedAuditor.name?.[0]}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{app.assignedAuditor.name}</div>
                      <div style={{fontSize:11,color:'var(--primary)'}}>{app.assignedAuditor.email}</div>
                    </div>
                  </div>
                ) : <span style={{color:'var(--gray-400)',fontSize:12}}>Not assigned</span>}
              </div>
              <div>
                <div className="section-label">Assigned Reviewer</div>
                {app.assignedReviewer ? (
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--amber-50)',borderRadius:10,border:'1px solid #fde68a'}}>
                    <div className="avatar avatar-amber" style={{width:32,height:32,fontSize:12}}>{app.assignedReviewer.name?.[0]}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{app.assignedReviewer.name}</div>
                      <div style={{fontSize:11,color:'#92400e'}}>{app.assignedReviewer.email}</div>
                    </div>
                  </div>
                ) : <span style={{color:'var(--gray-400)',fontSize:12}}>Not assigned</span>}
              </div>
              {app.adminNotes && (
                <div style={{marginTop:16,padding:'10px 12px',background:'var(--primary-50)',borderRadius:8,borderLeft:'3px solid var(--primary)'}}>
                  <div className="section-label">Admin Notes</div>
                  <p style={{fontSize:12.5,color:'var(--gray-600)',lineHeight:1.5}}>{app.adminNotes}</p>
                </div>
              )}
              {/* Acceptance actions for assigned auditor/reviewer */}
              <div style={{marginTop:12}}>
                { (user && (user._id === app.assignedAuditor?._id || user._id === app.assignedReviewer?._id)) && (
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {app.auditAcceptanceStatus === 'accepted' ? (
                      <span className="badge bdg-success">Assignment accepted</span>
                    ) : (
                      <>
                        <button className="btn btn-success btn-sm" disabled={saving} onClick={async()=>{
                          if(saving) return;
                          try{ setSaving(true); await axios.post(`/api/applications/${id}/accept-audit`,{ status: 'accepted' }); toast.success('Assignment accepted'); load(); }
                          catch{ toast.error('Failed to accept'); }
                          finally{ setSaving(false); }
                        }}>Accept</button>
                        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={async()=>{
                          if(saving) return;
                          try{ setSaving(true); await axios.post(`/api/applications/${id}/accept-audit`,{ status: 'rejected' }); toast.success('Assignment rejected'); load(); }
                          catch{ toast.error('Failed to reject'); }
                          finally{ setSaving(false); }
                        }}>Reject</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          CLIENT INFO TAB
      ═══════════════════════════════════ */}
      {tab==='client' && (
        <div className="dash-grid half">
          <div className="card">
            <div className="card-hdr"><div className="card-title"><User size={14} style={{color:'var(--primary)'}}/>Client Profile</div></div>
            <div className="card-body">
              {app.client ? (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,paddingBottom:16,borderBottom:'1px solid var(--primary-100)'}}>
                    <div className="avatar avatar-lg" style={{width:56,height:56,fontSize:20,flexShrink:0}}>{app.client.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:18,color:'var(--text-1)'}}>{app.client.name}</div>
                      <span className="badge bdg-client">Client</span>
                      {app.client.company && <div style={{fontSize:12,color:'var(--gray-500)',marginTop:3}}>{app.client.company}</div>}
                    </div>
                  </div>
                  {[
                    ['Email',   app.client.email,   <Mail   size={13} style={{color:'var(--primary)'}}/>],
                    ['Phone',   app.client.phone,   <Phone  size={13} style={{color:'var(--primary)'}}/>],
                    ['Company', app.client.company, <Building size={13} style={{color:'var(--primary)'}}/>],
                  ].filter(([,v])=>v).map(([l,v,icon])=>(
                    <div key={l} className="info-row">
                      <span className="ir-label" style={{display:'flex',alignItems:'center',gap:5}}>{icon}{l}</span>
                      <span className="ir-value" style={{fontSize:13}}>{v}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>
                    {app.client.email && <a href={`mailto:${app.client.email}`} className="btn btn-outline btn-sm"><Mail size={13}/> Send Email</a>}
                    {app.client.phone && <a href={`tel:${app.client.phone}`}    className="btn btn-ghost btn-sm"><Phone size={13}/> Call</a>}
                  </div>
                </>
              ) : (
                <div className="empty-box" style={{padding:40}}><User size={36}/><h3>No client assigned</h3></div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hdr"><div className="card-title"><Building size={14} style={{color:'var(--primary)'}}/>Organization Contact</div></div>
            <div className="card-body">
              {[
                ['Organization',  app.organizationName],
                ['Contact Person',app.contactPerson],
                ['Contact Email', app.contactEmail || app.client?.email],
                ['Contact Phone', app.contactPhone || app.client?.phone],
                ['City',          app.city],
                ['State',         app.state],
                ['Country',       app.country],
                ['Pincode',       app.pincode],
                ['Website',       app.website],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="info-row">
                  <span className="ir-label">{l}</span>
                  <span className="ir-value" style={{fontSize:12.5,wordBreak:'break-all'}}>{v}</span>
                </div>
              ))}
              <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>
                {(app.contactEmail||app.client?.email) && <a href={`mailto:${app.contactEmail||app.client?.email}`} className="btn btn-outline btn-sm"><Mail size={13}/> Email</a>}
                {(app.contactPhone||app.client?.phone) && <a href={`tel:${app.contactPhone||app.client?.phone}`}    className="btn btn-ghost btn-sm"><Phone size={13}/> Call</a>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          DOCUMENTS TAB
      ═══════════════════════════════════ */}
      {tab==='documents' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* ── Client Submitted Documents ── */}
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><FolderOpen size={14} style={{color:'var(--primary)'}}/>Client Documents</div>
              <span style={{fontSize:12,color:'var(--primary)',fontWeight:600}}>Submitted by client</span>
            </div>
            <div className="card-body">
              <DocRow label="Application Form"    path={app.applicationForm} meta="Client must upload"/>
              <DocRow label="Signed Agreement"    path={app.agreement}       meta="Client must sign and upload"/>
              <DocRow label="Signed Application"  path={app.signedForm}      meta="Signed copy from client"/>

              {/* Extra uploaded documents */}
              {(app.uploadedDocuments||[]).length > 0 && (
                <>
                  <div style={{height:1,background:'var(--primary-100)',margin:'16px 0'}}/>
                  <div className="section-label">Additional Client Documents ({app.uploadedDocuments.length})</div>
                  {app.uploadedDocuments.map((doc,i)=>(
                    <div key={i} className="doc-row">
                      <div className="doc-row-info">
                        <div style={{width:36,height:36,borderRadius:8,background:'var(--primary-50)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Paperclip size={16} color="var(--primary)"/>
                        </div>
                        <div>
                          <div className="doc-row-name">{doc.name || doc.docType || `Document ${i+1}`}</div>
                          <div className="doc-row-meta">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '✓ Uploaded'}</div>
                        </div>
                      </div>
                      <div className="doc-row-actions">
                        <a href={doc.path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Eye size={12}/> View</a>
                        <a href={doc.path} download className="btn btn-success btn-sm"><Download size={12}/> Save</a>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Auditor Uploads ── */}
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><Upload size={14} style={{color:'var(--primary)'}}/>Auditor Documents</div>
              <span style={{fontSize:12,color:'var(--primary)',fontWeight:600}}>Uploaded by you</span>
            </div>
            <div className="card-body">

              {/* Audit Report */}
              <div style={{marginBottom:20}}>
                <div className="section-label">Audit Report</div>
                <DocRow
                  label="Audit Report"
                  path={app.auditReport}
                  meta="Upload your completed audit report (PDF/DOC)"
                  onUpload={e=>upload(e,'auditReport')}
                  accept=".pdf,.doc,.docx"
                  uploading={uploading==='auditReport'}
                />
              </div>

              {/* Upload zone for extra docs */}
              <div style={{height:1,background:'var(--primary-100)',marginBottom:20}}/>
              <div className="section-label">Upload Additional Documents</div>
              <div
                className="drop-zone"
                style={{marginBottom:16}}
                onClick={()=>extraDocRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const ev={target:{files:[f],value:''}};uploadExtra(ev);}}}
              >
                <Upload size={30} style={{color:'var(--primary)',margin:'0 auto'}}/>
                <div className="drop-zone-title">
                  {uploading==='extra' ? '⏳ Uploading…' : 'Click or drag & drop to upload'}
                </div>
                <div className="drop-zone-sub">Observation sheets, checklists, evidence files — any format, up to 10MB</div>
                <input ref={extraDocRef} type="file" style={{display:'none'}} onChange={uploadExtra} accept="*"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          AUDIT NOTES TAB
      ═══════════════════════════════════ */}
      {tab==='audit' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><MessageSquare size={14} style={{color:'var(--primary)'}}/>Audit Notes & Observations</div>
              <span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Observations, Findings & Recommendations</label>
                <textarea
                  className="form-control"
                  rows={9}
                  value={notes}
                  onChange={e=>setNotes(e.target.value)}
                  placeholder="Enter audit observations, non-conformities, findings, corrective actions, and recommendations…"
                />
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button className="btn btn-secondary" onClick={saveNotes} disabled={saving}><FileText size={14}/>{saving?'Saving…':'Save Notes'}</button>
                <button className="btn btn-ghost" onClick={notify} disabled={notifying}><Send size={14}/>{notifying?'Sending…':'Send to Client'}</button>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="card">
            <div className="card-hdr"><div className="card-title"><CheckCircle size={14} style={{color:'var(--primary)'}}/>Audit Actions</div></div>
            <div className="card-body">
              <p style={{fontSize:13,color:'var(--gray-600)',marginBottom:16}}>
                Current stage: <strong style={{color:'var(--primary)'}}>{app.status?.replace(/_/g,' ').toUpperCase()}</strong>
                {canAudit && ' — take action to advance this application.'}
              </p>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {app.status==='under_review' && (
                  <button className="btn btn-primary" onClick={()=>setStatus('audit_stage1')} disabled={saving}>
                    <CheckCircle size={15}/> {saving?'…':'Complete Stage 1 Audit'}
                  </button>
                )}
                {app.status==='audit_stage1' && (
                  <button className="btn btn-primary" onClick={()=>setStatus('audit_stage2')} disabled={saving}>
                    <CheckCircle size={15}/> {saving?'…':'Complete Stage 2 Audit'}
                  </button>
                )}
                {app.status==='audit_stage2' && (
                  <button className="btn btn-success" onClick={()=>setStatus('approved')} disabled={saving}>
                    <CheckCircle size={15}/> {saving?'…':'Mark as Approved'}
                  </button>
                )}
                {canAudit && (
                  <button className="btn btn-danger" onClick={()=>setStatus('rejected')} disabled={saving}>
                    <XCircle size={15}/> {saving?'…':'Reject Application'}
                  </button>
                )}
                {!canAudit && <div className="alert alert-success" style={{margin:0,flex:1}}>✅ This application has been {app.status?.replace(/_/g,' ')}.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          FEEDBACK TAB
      ═══════════════════════════════════ */}
      {tab==='feedback' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Submit form */}
          <div className="card">
            <div className="card-hdr"><div className="card-title"><Star size={14} style={{color:'var(--primary)'}}/>Submit Your Feedback</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{display:'flex',gap:8}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} className="star-btn" onClick={()=>setFb(p=>({...p,rating:n}))}>
                      <Star size={30} fill={n<=fb.rating?'var(--primary)':'none'} stroke={n<=fb.rating?'var(--primary)':'var(--primary-200)'}/>
                    </button>
                  ))}
                  <span style={{fontSize:13,color:'var(--primary)',fontWeight:700,alignSelf:'center',marginLeft:4}}>{fb.rating}/5</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comments</label>
                <textarea className="form-control" rows={5} value={fb.message} onChange={e=>setFb(p=>({...p,message:e.target.value}))} placeholder="Your observations, audit findings summary, or general feedback…"/>
              </div>
              <button className="btn btn-primary" onClick={submitFb} disabled={saving}>
                <Send size={14}/> {saving?'Submitting…':'Submit Feedback'}
              </button>
            </div>
          </div>

          {/* Past feedback */}
          {(app.feedbacks||[]).length>0 && (
            <div className="card">
              <div className="card-hdr"><div className="card-title">All Feedback ({app.feedbacks.length})</div></div>
              <div className="card-body">
                {app.feedbacks.map((f,i)=>(
                  <div key={i} style={{border:'1px solid var(--primary-100)',borderRadius:12,padding:14,marginBottom:10,background:'var(--primary-50)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="avatar" style={{width:28,height:28,fontSize:11}}>{f.from?.name?.[0]||'?'}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13}}>{f.from?.name||'User'}</div>
                          <span className={`badge bdg-${f.role||'auditor'}`}>{f.role||'auditor'}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:2}}>
                        {[1,2,3,4,5].map(n=>(
                          <Star key={n} size={13} fill={n<=(f.rating||0)?'var(--primary)':'none'} stroke={n<=(f.rating||0)?'var(--primary)':'var(--primary-200)'}/>
                        ))}
                      </div>
                    </div>
                    <p style={{fontSize:13.5,color:'var(--gray-600)',lineHeight:1.6}}>{f.message}</p>
                    <div style={{fontSize:11,color:'var(--primary-light)',marginTop:6}}>{f.createdAt?new Date(f.createdAt).toLocaleDateString():''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default AuditorApplications;
