import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import {
  FileText, Clock, Award, XCircle, ChevronRight, ArrowRight,
  Star, CheckCircle, AlertCircle, Send, ClipboardCheck, Phone, Edit, Eye,
  FileEdit, Upload, Search, ClipboardList, Building2, FolderOpen,
  MessageSquare, FileUp, UserCheck, Check, AlertTriangle, X,
} from 'lucide-react';

const STAGES = ['submitted','under_review','audit_stage1','audit_stage2','approved','certified'];

const STAGE_INFO = {
  draft:        { label:'Draft',         Icon: FileEdit,      color:'var(--gray-400)', desc:'Application saved as draft' },
  submitted:    { label:'Submitted',     Icon: Upload,        color:'var(--blue)',     desc:'Received — awaiting review' },
  under_review: { label:'Under Review',  Icon: Search,        color:'var(--amber)',    desc:'Admin reviewing your application' },
  audit_stage1: { label:'Audit Stage 1', Icon: ClipboardList, color:'var(--purple)',   desc:'Document audit in progress' },
  audit_stage2: { label:'Audit Stage 2', Icon: Building2,     color:'#7e22ce',         desc:'On-site audit in progress' },
  approved:     { label:'Approved',      Icon: CheckCircle,   color:'var(--teal)',     desc:'Approved — certificate being prepared' },
  certified:    { label:'Certified',     Icon: Award,         color:'var(--green)',    desc:'Certification complete!' },
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [apps,       setApps]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fbModal,    setFbModal]    = useState(false);
  const [fbForm,     setFbForm]     = useState({ appId:'', message:'', rating:5 });
  const [submitting, setSubmitting] = useState(false);
  const [editModal,  setEditModal]  = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([axios.get('/api/dashboard/stats'), axios.get('/api/applications')])
      .then(([s, a]) => { setStats(s.data); setApps(a.data || []); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Layout title="Dashboard"><div className="loading-box"><div className="spinner"/></div></Layout>;

  const kpis = [
    { l:'Total Applications', v:stats?.totalApplications??0, icon:FileText,  c:'orange', to:'/client/applications' },
    { l:'Under Review',       v:stats?.underReview??0,       icon:Clock,     c:'amber',  to:'/client/applications' },
    { l:'Certified',          v:stats?.certified??0,         icon:Award,     c:'gold',   to:'/client/certificates' },
    { l:'Rejected',           v:stats?.rejected??0,          icon:XCircle,   c:'red',    to:'/client/applications' },
  ];

  const quickActions = [
    { l:'My Applications', d:'View your applications',  Icon: ClipboardList,  to:'/client/applications',     c:'var(--primary)' },
    { l:'My Documents',    d:'Upload required forms',   Icon: FolderOpen,     to:'/client/documents',        c:'var(--blue)'    },
    { l:'Certificates',    d:'Download certificates',   Icon: Award,          to:'/client/certificates',     c:'var(--amber)'   },
    { l:'Send Feedback',   d:'Rate your experience',    Icon: MessageSquare,  onClick:()=>setFbModal(true),  c:'var(--teal)'    },
  ];

  const pendingActions = [
    { Icon: FileUp,        text:'Upload signed agreement', sub:'Required document',       urgent:true,  action:()=>navigate('/client/documents')     },
    { Icon: FileEdit,      text:'Complete org profile',    sub:'Fill in company details',  urgent:false, action:()=>navigate('/client/applications')  },
    { Icon: Award,         text:'Download certificate',    sub:'Available after approval', urgent:false, action:()=>navigate('/client/certificates')  },
    { Icon: MessageSquare, text:'Send feedback',           sub:'Rate your experience',     urgent:false, action:()=>setFbModal(true)                  },
  ];

  const recentApps = stats?.recentApps || apps.slice(0, 5);
  const latestApp  = recentApps[0];
  const stageIdx   = latestApp ? STAGES.indexOf(latestApp.status) : -1;
  const stageInfo  = latestApp ? STAGE_INFO[latestApp.status] : null;

  const submitFeedback = async () => {
    if (submitting) return;
    if (!fbForm.appId || !fbForm.message.trim()) return toast.error('Select application and enter feedback');
    setSubmitting(true);
    try {
      await axios.post(`/api/applications/${fbForm.appId}/feedback`, { message:fbForm.message, rating:fbForm.rating });
      toast.success('Feedback sent to admin!');
      setFbModal(false); setFbForm({ appId:'', message:'', rating:5 });
    } catch { toast.error('Failed to send'); } finally { setSubmitting(false); }
  };

  const openEdit = (app) => {
    setEditForm({ organizationName:app.organizationName||'', scope:app.scope||'', website:app.website||'', city:app.city||'', state:app.state||'' });
    setEditModal(app);
  };

  const doEdit = async () => {
    if (editSaving) return;
    if (!editForm.organizationName) return toast.error('Name required');
    setEditSaving(true);
    try {
      await axios.put(`/api/applications/${editModal._id}`, editForm);
      toast.success('Updated!'); setEditModal(null); load();
    } catch { toast.error('Failed'); } finally { setEditSaving(false); }
  };

  return (
    <Layout title="Dashboard">

      {/* ── Page Header ── */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Track your ISO certification journey</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="client-kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi-card" onClick={() => navigate(k.to)} style={{cursor:'pointer'}}>
            <div className={`kpi-icon ${k.c}`}><k.icon size={17}/></div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="client-quick-grid">
        {quickActions.map((a, i) => (
          <div key={i} className="quick-action" onClick={a.onClick || (() => navigate(a.to))}>
            <div className="qa-icon" style={{background:`${a.c}18`, border:`1px solid ${a.c}30`, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <a.Icon size={18} style={{color: a.c}}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:13, color:'var(--text-1)'}}>{a.l}</div>
              <div style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{a.d}</div>
            </div>
            <ArrowRight size={13} style={{color:'var(--gray-300)', flexShrink:0}}/>
          </div>
        ))}
      </div>

      {/* ── Certification Progress ── */}
      <div className="card" style={{marginBottom:18}}>
        <div className="card-hdr">
          <div className="card-title"><CheckCircle size={14} style={{color:'var(--primary)'}}/>Certification Progress</div>
          {latestApp && <span style={{fontSize:10, color:'var(--gray-400)'}}>{latestApp.client?.clientId || '—'}</span>}
        </div>

        {latestApp && stageInfo ? (
          <div style={{padding:'16px 20px'}}>
            {/* Status banner + progress + payment */}
            <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:16, flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:`${stageInfo.color}12`, borderRadius:9, border:`1.5px solid ${stageInfo.color}30`, flex:'0 0 auto'}}>
                <stageInfo.Icon size={22} style={{color: stageInfo.color, flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:700, fontSize:13.5, color:stageInfo.color}}>{stageInfo.label}</div>
                  <div style={{fontSize:11, color:'var(--gray-500)', marginTop:1}}>{stageInfo.desc}</div>
                </div>
              </div>
              <div style={{flex:1, minWidth:160}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                  <span style={{fontSize:12, color:'var(--gray-500)', fontWeight:500}}>Overall Progress</span>
                  <span style={{fontSize:13, fontWeight:800, color:'var(--primary)'}}>
                    {latestApp.progressPercentage || Math.round(((stageIdx+1)/STAGES.length)*100)}%
                  </span>
                </div>
                <div className="progress-bar" style={{height:8}}>
                  <div className="progress-fill" style={{width:`${Math.max(0, latestApp.progressPercentage || ((stageIdx+1)/STAGES.length)*100)}%`}}/>
                </div>
              </div>
              {latestApp.paymentStatus && (
                <div style={{padding:'10px 14px', background:'var(--amber-50)', borderRadius:8, border:'1px solid var(--amber-100)', flex:'0 0 auto'}}>
                  <div style={{fontSize:9, fontWeight:700, color:'#92400e', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5}}>Payment</div>
                  <div style={{display:'flex', alignItems:'center', gap:7}}>
                    <span className={`badge ${latestApp.paymentStatus==='received'?'bdg-approved':'bdg-submitted'}`} style={{fontSize:10, display:'flex', alignItems:'center', gap:4}}>
                      {latestApp.paymentStatus==='received'
                        ? <><Check size={9}/> Received</>
                        : latestApp.paymentStatus==='partially_received'
                        ? 'Partial'
                        : <><Clock size={9}/> Pending</>}
                    </span>
                    {latestApp.paymentAmount && <span style={{fontSize:11, fontWeight:700, color:'var(--text-1)'}}>₹{latestApp.paymentAmount}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Stage strip */}
            <div style={{display:'flex', gap:3}}>
              {STAGES.map((s, i) => (
                <div key={s} style={{
                  flex:1, textAlign:'center', padding:'7px 4px', fontSize:9.5, fontWeight:700, borderRadius:6,
                  background: i < stageIdx ? 'var(--primary)' : i === stageIdx ? 'var(--primary-100)' : 'var(--gray-100)',
                  color: i < stageIdx ? 'white' : i === stageIdx ? 'var(--primary-dark)' : 'var(--gray-400)',
                  border: i === stageIdx ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:3,
                  whiteSpace:'nowrap', overflow:'hidden',
                }}>
                  {i < stageIdx && <Check size={9}/>}
                  {s.replace(/_/g,' ')}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{padding:'28px 20px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
            <CheckCircle size={36} style={{color:'var(--primary-200)', flexShrink:0}}/>
            <div>
              <div style={{fontSize:14, fontWeight:700, color:'var(--gray-400)'}}>No active application</div>
              <div style={{fontSize:12, color:'var(--gray-300)', marginTop:3}}>Your certification progress will appear here once an application is in progress</div>
            </div>
          </div>
        )}
      </div>

      {/* ── My Applications ── */}
      <div className="card" style={{marginBottom:18}}>
        <div className="card-hdr">
          <div className="card-title"><FileText size={14} style={{color:'var(--primary)'}}/>My Applications</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/applications')}>
            View All <ChevronRight size={11}/>
          </button>
        </div>

        {recentApps.length === 0 ? (
          <div className="empty-box" style={{padding:'44px 20px'}}>
            <FileText size={40} style={{color:'var(--primary-200)'}}/>
            <h3>No applications yet</h3>
            <p>Your applications will appear here</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl" style={{minWidth:700}}>
              <thead>
                <tr>
                  <th style={{width:120}}>Client ID</th>
                  <th>Organization</th>
                  <th style={{width:130}}>ISO Standard</th>
                  <th style={{width:160}}>Progress</th>
                  <th style={{width:110}}>Payment</th>
                  <th style={{width:130}}>Status</th>
                  <th style={{width:80}}>Date</th>
                  <th style={{width:90}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map(app => (
                  <tr key={app._id}>
                    <td><span className="mono">{app.client?.clientId || '—'}</span></td>
                    <td>
                      <div style={{fontWeight:600, fontSize:13, color:'var(--text-1)'}}>{app.organizationName}</div>
                      {app.city && <div style={{fontSize:10.5, color:'var(--gray-400)', marginTop:1}}>{app.city}{app.state ? `, ${app.state}` : ''}</div>}
                    </td>
                    <td><span className="badge bdg-info">{app.isoStandard}</span></td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{flex:1, height:6, background:'var(--primary-50)', borderRadius:3}}>
                          <div style={{height:'100%', width:`${Math.min(100, app.progressPercentage||0)}%`, background:'var(--primary)', borderRadius:3, transition:'width .3s'}}/>
                        </div>
                        <span style={{fontSize:11, fontWeight:700, color:'var(--primary)', flexShrink:0, minWidth:32}}>{app.progressPercentage||0}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${app.paymentStatus==='received'?'bdg-approved':app.paymentStatus==='partially_received'?'bdg-audit_stage2':'bdg-submitted'}`}
                        style={{display:'inline-flex', alignItems:'center', gap:4}}>
                        {app.paymentStatus==='received'
                          ? <><Check size={9}/> Paid</>
                          : app.paymentStatus==='partially_received'
                          ? 'Partial'
                          : <><Clock size={9}/> Pending</>}
                      </span>
                    </td>
                    <td><span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span></td>
                    <td style={{fontSize:11, color:'var(--gray-400)', whiteSpace:'nowrap'}}>
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-sm" title="View" onClick={() => navigate(`/client/applications/${app._id}`)}>
                          <Eye size={12}/> View
                        </button>
                        {['draft','submitted'].includes(app.status) && (
                          <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => openEdit(app)}>
                            <Edit size={12}/>
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

      {/* ── Bottom 2-col: Assigned Team + Pending Actions ── */}
      <div className="client-dash-grid">

        {/* Assigned Team */}
        <div className="card" style={{marginBottom:0}}>
          <div className="card-hdr">
            <div className="card-title"><ClipboardCheck size={14} style={{color:'var(--primary)'}}/>Assigned Team</div>
            {latestApp && <span style={{fontSize:10, color:'var(--gray-400)'}}>{latestApp.client?.clientId || '—'}</span>}
          </div>
          {latestApp ? (
            [
              { role:'Auditor',  Icon: Search,    person:latestApp.assignedAuditor,  report:latestApp.auditReport,  color:'var(--primary)', bg:'var(--primary-50)' },
              { role:'Reviewer', Icon: UserCheck, person:latestApp.assignedReviewer, report:latestApp.reviewReport, color:'#7c3aed',        bg:'#f5f3ff'           },
            ].map(({ role, Icon, person, report, color, bg }, idx) => (
              <div key={role} style={{padding:'14px 18px', borderBottom:idx===0?'1px solid var(--primary-50)':'none'}}>
                <div style={{display:'flex', alignItems:'center', gap:5, marginBottom:10}}>
                  <Icon size={13} style={{color, flexShrink:0}}/>
                  <span style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color}}>{role}</span>
                </div>
                {person ? (
                  <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                    <div style={{width:40, height:40, borderRadius:'50%', background:`${color}15`, border:`2px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:15, fontWeight:800, color}}>
                      {person.name?.slice(0,1).toUpperCase()}
                    </div>
                    <div style={{flex:1, minWidth:120}}>
                      <div style={{fontWeight:700, fontSize:13.5, color:'var(--text-1)'}}>{person.name}</div>
                      <div style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{person.email}</div>
                      {person.phone && (
                        <a href={`tel:${person.phone}`} style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--gray-500)', textDecoration:'none', marginTop:4}}>
                          <Phone size={11} style={{color, flexShrink:0}}/>{person.phone}
                        </a>
                      )}
                    </div>
                    {report ? (
                      <a href={report} target="_blank" rel="noreferrer"
                        style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color, fontWeight:700, textDecoration:'none', padding:'7px 14px', background:bg, border:`1px solid ${color}25`, borderRadius:8, flexShrink:0}}>
                        <FileText size={13}/>View Report
                      </a>
                    ) : (
                      <span style={{fontSize:11, color:'var(--gray-300)', fontStyle:'italic'}}>No report yet</span>
                    )}
                  </div>
                ) : (
                  <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--gray-50)', borderRadius:8, border:'1px dashed var(--gray-200)'}}>
                    <ClipboardCheck size={16} style={{color:'var(--gray-300)', flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12, fontWeight:600, color:'var(--gray-400)'}}>Not yet assigned</div>
                      <div style={{fontSize:10.5, color:'var(--gray-300)', marginTop:1}}>Admin will assign a {role.toLowerCase()} soon</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{padding:'32px 20px', textAlign:'center'}}>
              <ClipboardCheck size={34} style={{color:'var(--primary-200)', marginBottom:10}}/>
              <div style={{fontSize:13, fontWeight:600, color:'var(--gray-400)'}}>No team assigned yet</div>
              <div style={{fontSize:11, color:'var(--gray-300)', marginTop:4}}>Your auditor & reviewer will appear here</div>
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="card" style={{marginBottom:0}}>
          <div className="card-hdr">
            <div className="card-title"><AlertCircle size={14} style={{color:'var(--amber)'}}/>Pending Actions</div>
          </div>
          <div>
            {pendingActions.map((item, i, arr) => (
              <div key={i}
                style={{display:'flex', alignItems:'center', gap:14, padding:'13px 18px', borderBottom:i<arr.length-1?'1px solid var(--primary-50)':'none', cursor:'pointer', transition:'background .12s'}}
                onClick={item.action}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{width:36, height:36, borderRadius:9, background: item.urgent ? '#fef2f2' : 'var(--primary-50)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <item.Icon size={16} style={{color: item.urgent ? 'var(--red)' : 'var(--primary)'}}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)'}}>{item.text}</div>
                  <div style={{fontSize:11, color: item.urgent ? 'var(--red)' : 'var(--gray-400)', marginTop:2, fontWeight: item.urgent ? 700 : 400, display:'flex', alignItems:'center', gap:4}}>
                    {item.urgent && <AlertTriangle size={10}/>}
                    {item.urgent ? 'Action Required' : item.sub}
                  </div>
                </div>
                <ArrowRight size={14} style={{color:'var(--gray-300)', flexShrink:0}}/>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-bg" onClick={() => setEditModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title"><Edit size={14} style={{color:'var(--primary)', marginRight:7, verticalAlign:'middle'}}/>Edit — {editModal.client?.clientId || '—'}</div>
              <button className="modal-close" onClick={() => setEditModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Organization Name *</label><input className="form-control" value={editForm.organizationName} onChange={e => setEditForm(p => ({...p, organizationName:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Scope</label><textarea className="form-control" rows={2} value={editForm.scope} onChange={e => setEditForm(p => ({...p, scope:e.target.value}))}/></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">City</label><input className="form-control" value={editForm.city} onChange={e => setEditForm(p => ({...p, city:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">State</label><input className="form-control" value={editForm.state} onChange={e => setEditForm(p => ({...p, state:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Website</label><input className="form-control" value={editForm.website} onChange={e => setEditForm(p => ({...p, website:e.target.value}))}/></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doEdit} disabled={editSaving}>{editSaving ? 'Saving…' : <><Edit size={13}/> Save</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {fbModal && (
        <div className="modal-bg" onClick={() => setFbModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Send Feedback to Admin</div>
              <button className="modal-close" onClick={() => setFbModal(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Application *</label>
                <select className="form-control" value={fbForm.appId} onChange={e => setFbForm(p => ({...p, appId:e.target.value}))}>
                  <option value="">— Select Application —</option>
                  {apps.map(a => <option key={a._id} value={a._id}>{(a.client?.clientId || '—')} — {a.organizationName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{display:'flex', gap:8, marginTop:4}}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setFbForm(p => ({...p, rating:s}))} style={{background:'none', border:'none', cursor:'pointer', padding:0}}>
                      <Star size={26} fill={s <= fbForm.rating ? '#f59e0b' : 'none'} stroke="#f59e0b"/>
                    </button>
                  ))}
                  <span style={{fontSize:13, color:'var(--gray-500)', alignSelf:'center', marginLeft:4}}>{fbForm.rating}/5</span>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-control" rows={4} value={fbForm.message} onChange={e => setFbForm(p => ({...p, message:e.target.value}))} placeholder="Tell us about your experience…"/></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setFbModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitFeedback} disabled={submitting}>
                {submitting ? 'Sending…' : <><Send size={13}/> Send to Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
