import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { ClipboardCheck, Clock, CheckCircle, ChevronRight, TrendingUp, Star, AlertCircle, Eye, Search, FileText, Send, Phone, ThumbsUp, ThumbsDown, User, BookOpen, MapPin, X, Check, XCircle } from 'lucide-react';

const FL = ['submitted','under_review','audit_stage1','audit_stage2','approved','certified'];

const PBar = ({ label, value, max, color, fmt }) => (
  <div style={{marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
      <span style={{fontSize:12.5,fontWeight:600,color:'var(--text-1)'}}>{label}</span>
      <span style={{fontSize:12.5,fontWeight:700,color:'var(--text-2)'}}>{fmt?fmt(value):value}</span>
    </div>
    <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(value/Math.max(1,max))*100)}%`,background:color}}/></div>
  </div>
);

export default function AuditorDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [apps,   setApps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,    setTab]    = useState('auditor');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [acceptAuditModal, setAcceptAuditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([axios.get('/api/dashboard/stats'), axios.get('/api/applications')])
      .then(([s,a]) => { setStats(s.data); setApps(a.data||[]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Layout title="Dashboard"><div className="loading-box"><div className="spinner"/></div></Layout>;

  const uid = user?._id;
  const myAudits    = apps.filter(a => a.assignedAuditor?._id===uid || a.assignedAuditor===uid);
  const myReviews   = apps.filter(a => a.assignedReviewer?._id===uid || a.assignedReviewer===uid);
  const inProgress  = myAudits.filter(a => ['audit_stage1','audit_stage2'].includes(a.status));
  const completed   = myAudits.filter(a => ['approved','certified'].includes(a.status));
  const revPending  = myReviews.filter(a => ['under_review','audit_stage2'].includes(a.status));

  const filteredApps = apps.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.organizationName?.toLowerCase().includes(q) || a.applicationId?.toLowerCase().includes(q) || a.client?.name?.toLowerCase().includes(q))
      && (!statusF || a.status===statusF);
  });

  const moveStatus = async () => {
    if (saving) return;
    if (!nextStatus) return toast.error('Select a status');
    setSaving(true);
    try {
      await axios.put(`/api/applications/${noteModal._id}/status`, { status:nextStatus, notes:noteText });
      toast.success(`Status updated to ${nextStatus.replace(/_/g,' ')} — client notified`);
      setNoteModal(null); setNoteText(''); setNextStatus(''); load();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleAcceptAudit = async (status) => {
    if (saving) return;
    setSaving(true);
    try {
      await axios.post(`/api/applications/${acceptAuditModal._id}/accept-audit`, { status });
      toast.success(`Audit ${status} successfully!`);
      setAcceptAuditModal(null);
      load();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to update audit'); 
    } finally { 
      setSaving(false); 
    }
  };

  const TABS = [
    { id:'auditor',  label:'Auditor View',           icon: ClipboardCheck },
    { id:'reviewer', label:'Reviewer View',           icon: Star           },
    { id:'clients',  label:'All Client Applications', icon: FileText       },
  ];

  return (
    <Layout title="Dashboard">
      <div className="page-hdr">
        <div><h1 className="page-title">Welcome, {user?.name?.split(' ')[0]}</h1><p className="page-subtitle">Audit, review &amp; all client applications</p></div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={()=>navigate('/auditor/applications')}><ClipboardCheck size={13}/> My Audits</button>
          <button className="btn btn-primary" onClick={()=>setTab('clients')}><FileText size={13}/> All Apps</button>
        </div>
      </div>

      {/* Banner */}
      <div className="welcome-card">
        <div className="wc-text" style={{position:'relative',zIndex:1}}>
          <h2>Auditor &amp; Reviewer Dashboard</h2>
          <p>Combined workspace — toggle views with the tabs below</p>
        </div>
        <div className="wc-stats">
          {[{v:myAudits.length,l:'My Audits'},{v:inProgress.length,l:'In Progress'},{v:myReviews.length,l:'Reviews'},{v:apps.length,l:'Total Client Apps'}].map((s,i)=>(
            <div key={i} className="wc-stat"><div className="wc-stat-v">{s.v}</div><div className="wc-stat-l">{s.l}</div></div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:'flex',gap:4,marginBottom:22,background:'var(--primary-50)',borderRadius:12,padding:4,width:'fit-content',border:'1.5px solid var(--primary-100)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,transition:'all .15s',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',
            background:tab===t.id?'linear-gradient(135deg,var(--primary),var(--primary-dark))':'transparent',
            color:tab===t.id?'white':'var(--primary-dark)',
            boxShadow:tab===t.id?'0 2px 8px rgba(21,101,192,0.28)':'none',
          }}><t.icon size={13}/>{t.label}</button>
        ))}
      </div>

      {/* ── AUDITOR VIEW ── */}
      {tab==='auditor' && (
        <>
          <div className="kpi-grid">
            {[
              {label:'Assigned Audits',value:myAudits.length,  icon:ClipboardCheck,color:'orange'},
              {label:'In Progress',    value:inProgress.length,icon:Clock,         color:'amber' },
              {label:'Completed',      value:completed.length, icon:CheckCircle,   color:'green' },
              {label:'Review Queue',   value:myReviews.length, icon:Star,          color:'blue'  },
            ].map((k,i)=>(
              <div key={i} className="kpi-card">
                <div className={`kpi-icon ${k.color}`}><k.icon size={17}/></div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:18}}>
            <div className="card" style={{marginBottom:0}}>
              <div className="card-hdr">
                <div className="card-title"><ClipboardCheck size={14} style={{color:'var(--primary)'}}/>My Assigned Audits</div>
                <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/auditor/applications')}>All <ChevronRight size={11}/></button>
              </div>
              {myAudits.length===0 ? (
                <div className="empty-box"><ClipboardCheck size={32}/><h3>No audits assigned</h3><p>Admin will assign applications to you</p></div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Client ID</th><th>Organization</th><th>Client</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {myAudits.slice(0,6).map(a=>(
                        <tr key={a._id}>
                          <td><span className="mono">{a.client?.clientId || '—'}</span></td>
                          <td style={{fontWeight:600,fontSize:12.5,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.organizationName}</td>
                          <td style={{fontSize:12,color:'var(--gray-500)'}}>{a.client?.name}</td>
                          <td><span className={`badge bdg-${a.status}`} style={{fontSize:10}}>{a.status?.replace(/_/g,' ')}</span></td>
                          <td><div className="tbl-actions">
                            {!a.auditAcceptanceStatus && <button className="btn btn-success btn-sm" style={{display:'flex',alignItems:'center',gap:4}} onClick={()=>setAcceptAuditModal(a)}><Star size={11}/> Accept</button>}
                            {a.auditAcceptanceStatus === 'accepted' && <span style={{fontSize:11,color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center',gap:3}}><Check size={11}/>Accepted</span>}
                            {a.auditAcceptanceStatus === 'rejected' && <span style={{fontSize:11,color:'var(--red)',fontWeight:600,display:'flex',alignItems:'center',gap:3}}><XCircle size={11}/>Rejected</span>}
                            <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/auditor/applications/${a._id}`)}><Eye size={11}/> View</button>
                            <button className="btn btn-primary btn-sm" onClick={()=>{setNoteModal(a);setNoteText('');setNextStatus('');}}>Update</button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card" style={{marginBottom:0}}>
              <div className="card-hdr"><div className="card-title"><TrendingUp size={14} style={{color:'var(--primary)'}}/>My Performance</div></div>
              <div style={{padding:'16px 18px'}}>
                <PBar label="Completed"    value={completed.length}    max={Math.max(10,myAudits.length)} color="var(--primary)"/>
                <PBar label="In Progress"  value={inProgress.length}   max={Math.max(10,myAudits.length)} color="var(--amber)"/>
                <PBar label="Avg Rating"   value={4.7} max={5}   color="var(--amber)" fmt={v=>v.toFixed(1)+' / 5'}/>
                <PBar label="On-time Rate" value={94}  max={100} color="var(--green)"  fmt={v=>`${v}%`}/>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── REVIEWER VIEW ── */}
      {tab==='reviewer' && (
        <>
          <div className="kpi-grid">
            {[
              {label:'Assigned Reviews', value:myReviews.length,  icon:Star,        color:'orange'},
              {label:'Pending',          value:revPending.length, icon:Clock,       color:'amber' },
              {label:'Completed',        value:myReviews.filter(a=>['approved','certified'].includes(a.status)).length, icon:CheckCircle, color:'green'},
              {label:'Need Approval',    value:myReviews.filter(a=>a.status==='approved').length, icon:AlertCircle, color:'red'},
            ].map((k,i)=>(
              <div key={i} className="kpi-card">
                <div className={`kpi-icon ${k.color}`}><k.icon size={17}/></div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:18}}>
            <div className="card" style={{marginBottom:0}}>
              <div className="card-hdr">
                <div className="card-title"><Star size={14} style={{color:'var(--amber)'}}/>Review Queue</div>
                <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/auditor/review-queue')}>All <ChevronRight size={11}/></button>
              </div>
              {myReviews.length===0 ? (
                <div className="empty-box"><Star size={32}/><h3>Review queue empty</h3></div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Client ID</th><th>Organization</th><th>Standard</th><th>Status</th><th>Client</th><th></th></tr></thead>
                    <tbody>
                      {myReviews.slice(0,6).map(a=>(
                        <tr key={a._id}>
                          <td><span className="mono">{a.client?.clientId || '—'}</span></td>
                          <td style={{fontWeight:600,fontSize:12.5,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.organizationName}</td>
                          <td><span className="badge bdg-info" style={{fontSize:9.5}}>{a.isoStandard}</span></td>
                          <td><span className={`badge bdg-${a.status}`} style={{fontSize:9.5}}>{a.status?.replace(/_/g,' ')}</span></td>
                          <td style={{fontSize:12}}>{a.client?.name}</td>
                          <td><button className="btn btn-primary btn-sm" onClick={()=>navigate(`/auditor/applications/${a._id}`)}>Review</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              <div className="card" style={{marginBottom:16}}>
                <div className="card-hdr"><div className="card-title"><TrendingUp size={14} style={{color:'var(--primary)'}}/>Review Stats</div></div>
                <div style={{padding:'16px 18px'}}>
                  <PBar label="This Week"       value={3}   max={10}  color="var(--primary)"/>
                  <PBar label="This Month"      value={8}   max={20}  color="var(--blue)"/>
                  <PBar label="Approval Rate"   value={88}  max={100} color="var(--green)"  fmt={v=>`${v}%`}/>
                  <PBar label="Avg Review Time" value={2.4} max={5}   color="var(--amber)"  fmt={v=>`${v} days`}/>
                </div>
              </div>
              <div className="card" style={{marginBottom:0}}>
                <div className="card-hdr"><div className="card-title"><AlertCircle size={14} style={{color:'var(--amber)'}}/>Pending Actions</div></div>
                <div style={{padding:'4px 0'}}>
                  {apps.filter(a=>a.status==='audit_stage2').slice(0,3).map((a,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'10px 16px',borderBottom:'1px solid var(--primary-50)'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:i===0?'var(--red)':'var(--amber)',flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12.5,fontWeight:600}}>{a.applicationId}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)'}}>{a.organizationName}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/auditor/applications/${a._id}`)}><Eye size={11}/></button>
                    </div>
                  ))}
                  {apps.filter(a=>a.status==='audit_stage2').length===0 && <p style={{fontSize:12,color:'var(--gray-400)',textAlign:'center',padding:16,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Check size={12}/>All caught up</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ALL CLIENT APPLICATIONS ── */}
      {tab==='clients' && (
        <>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-body" style={{display:'flex',gap:10,flexWrap:'wrap',padding:12,alignItems:'center'}}>
              <div className="search-wrap" style={{flex:1,minWidth:200}}>
                <Search size={13} className="search-ico"/>
                <input className="search-input" placeholder="Search by app ID, org name, client…" value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="form-control" style={{width:'auto',minWidth:155}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
                <option value="">All Statuses</option>
                {FL.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <span style={{fontSize:12,color:'var(--gray-400)',flexShrink:0}}>{filteredApps.length} apps</span>
            </div>
          </div>
          <div className="kpi-grid" style={{marginBottom:18}}>
            {[
              {label:'Total',    value:apps.length,                                                    icon:FileText,    color:'orange'},
              {label:'In Audit', value:apps.filter(a=>['audit_stage1','audit_stage2'].includes(a.status)).length, icon:ClipboardCheck,color:'purple'},
              {label:'Approved', value:apps.filter(a=>a.status==='approved').length,                  icon:CheckCircle, color:'teal'  },
              {label:'Certified',value:apps.filter(a=>a.status==='certified').length,                 icon:Star,        color:'green' },
            ].map((k,i)=>(
              <div key={i} className="kpi-card">
                <div className={`kpi-icon ${k.color}`}><k.icon size={17}/></div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {filteredApps.length===0 ? (
            <div className="empty-box"><FileText size={38}/><h3>No applications found</h3></div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {filteredApps.map(app=>{
                const si = FL.indexOf(app.status);
                const pct = si>=0 ? Math.round(((si+1)/FL.length)*100) : 0;
                const isExp = expanded===app._id;
                return (
                  <div key={app._id} style={{background:'white',border:'1.5px solid var(--primary-100)',borderRadius:14,overflow:'hidden',boxShadow:isExp?'var(--shadow-lg)':'var(--shadow-sm)',transition:'box-shadow .15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:13,padding:'13px 17px',cursor:'pointer',flexWrap:'wrap'}} onClick={()=>setExpanded(isExp?null:app._id)}>
                      <div style={{width:38,height:38,borderRadius:9,background:'linear-gradient(135deg,var(--primary),var(--primary-dark))',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:14,flexShrink:0}}>{app.organizationName?.[0]?.toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:2}}>
                          <span style={{fontWeight:800,fontSize:13.5,color:'var(--text-1)'}}>{app.organizationName}</span>
                          <span className="mono" style={{fontSize:10.5}}>{app.applicationId}</span>
                          <span className={`badge bdg-${app.status}`} style={{fontSize:9.5}}>{app.status?.replace(/_/g,' ')}</span>
                        </div>
                        <div style={{fontSize:11.5,color:'var(--gray-400)',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
                          <span style={{display:'flex',alignItems:'center',gap:4}}><User size={11}/>{app.client?.name||'—'}</span>
                          <span style={{display:'flex',alignItems:'center',gap:4}}><BookOpen size={11}/>{app.isoStandard}</span>
                          {app.city&&<span style={{display:'flex',alignItems:'center',gap:4}}><MapPin size={11}/>{app.city}</span>}
                        </div>
                      </div>
                      <div style={{width:110,flexShrink:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <span style={{fontSize:9.5,color:'var(--gray-400)'}}>Progress</span>
                          <span style={{fontSize:9.5,fontWeight:700,color:'var(--primary)'}}>{pct}%</span>
                        </div>
                        <div className="progress-bar" style={{height:5}}><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                      </div>
                      <div style={{display:'flex',gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/auditor/applications/${app._id}`)}><Eye size={12}/> View</button>
                        <button className="btn btn-primary btn-sm" onClick={()=>{setNoteModal(app);setNoteText('');setNextStatus('');}}>Update</button>
                      </div>
                      <ChevronRight size={15} style={{color:'var(--gray-400)',flexShrink:0,transition:'transform .2s',transform:isExp?'rotate(90deg)':'none'}}/>
                    </div>
                    {isExp && (
                      <div style={{borderTop:'1.5px solid var(--primary-50)',padding:'15px 17px',background:'var(--primary-50)'}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>
                          {/* Client Info */}
                          <div style={{background:'white',borderRadius:9,padding:'11px 13px',border:'1px solid var(--primary-100)'}}>
                            <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--primary-light)',marginBottom:7}}>Client Info</div>
                            {[['Name',app.client?.name],['Email',app.client?.email],['Phone',app.client?.phone],['Company',app.client?.company]].map(([l,v])=>v?(
                              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid var(--primary-50)',fontSize:11.5}}>
                                <span style={{color:'var(--gray-500)',fontWeight:600}}>{l}</span>
                                <span style={{color:'var(--text-1)',fontWeight:500}}>{v}</span>
                              </div>
                            ):null)}
                          </div>
                          {/* App Details */}
                          <div style={{background:'white',borderRadius:9,padding:'11px 13px',border:'1px solid var(--primary-100)'}}>
                            <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--primary-light)',marginBottom:7}}>Application</div>
                            {[['Standard',app.isoStandard],['Scope',app.scope],['Employees',app.employeeCount?.total],['Address',[app.city,app.state].filter(Boolean).join(', ')],['Submitted',app.submittedAt?new Date(app.submittedAt).toLocaleDateString():null]].map(([l,v])=>v?(
                              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid var(--primary-50)',fontSize:11.5,gap:8}}>
                                <span style={{color:'var(--gray-500)',fontWeight:600,flexShrink:0}}>{l}</span>
                                <span style={{color:'var(--text-1)',fontWeight:500,textAlign:'right',wordBreak:'break-word'}}>{v}</span>
                              </div>
                            ):null)}
                          </div>
                          {/* Team */}
                          <div style={{background:'white',borderRadius:9,padding:'11px 13px',border:'1px solid var(--primary-100)'}}>
                            <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--primary-light)',marginBottom:7}}>Assigned Team</div>
                            {[{role:'Auditor',person:app.assignedAuditor},{role:'Reviewer',person:app.assignedReviewer}].map(({role,person})=>(
                              <div key={role} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 0',borderBottom:'1px solid var(--primary-50)'}}>
                                <div style={{fontSize:10,fontWeight:700,color:'var(--gray-500)',width:48,flexShrink:0}}>{role}</div>
                                {person?<div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'var(--text-1)'}}>{person.name}</div><div style={{fontSize:10,color:'var(--gray-400)'}}>{person.email}</div></div>:<span style={{fontSize:11.5,color:'var(--gray-400)',fontStyle:'italic'}}>Not assigned</span>}
                              </div>
                            ))}
                            {app.auditNotes&&<div style={{marginTop:8,fontSize:11,color:'var(--gray-600)',lineHeight:1.4}}><strong>Notes:</strong> {app.auditNotes}</div>}
                          </div>
                        </div>
                        {/* Stage strip */}
                        <div style={{display:'flex',gap:2,marginTop:12,flexWrap:'wrap'}}>
                          {FL.map((s,i)=>(
                            <div key={s} style={{flex:1,minWidth:58,textAlign:'center',padding:'4px 3px',fontSize:9,fontWeight:700,borderRadius:5,
                              background:i<si?'var(--primary)':i===si?'var(--primary-100)':'var(--gray-100)',
                              color:i<si?'white':i===si?'var(--primary-dark)':'var(--gray-400)',
                              border:i===si?'1.5px solid var(--primary)':'1.5px solid transparent',
                            }}>{s.replace(/_/g,' ')}</div>
                          ))}
                        </div>
                        <div style={{display:'flex',justifyContent:'flex-end',marginTop:10,gap:7}}>
                          <button className="btn btn-secondary btn-sm" onClick={()=>navigate(`/auditor/applications/${app._id}`)}><Eye size={12}/> View Details</button>
                          <button className="btn btn-primary btn-sm" onClick={()=>{setNoteModal(app);setNoteText('');setNextStatus('');}}><FileText size={12}/> Update Status</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Update Status Modal */}
      {noteModal && (
        <div className="modal-bg" onClick={()=>setNoteModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Update Application — {noteModal.applicationId}</div>
              <button className="modal-close" onClick={()=>setNoteModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div style={{background:'var(--primary-50)',borderRadius:9,padding:'9px 13px',marginBottom:14,fontSize:12.5}}>
                <strong>{noteModal.organizationName}</strong>
                <div style={{fontSize:11.5,color:'var(--gray-500)',marginTop:2}}>{noteModal.isoStandard} · <span className={`badge bdg-${noteModal.status}`} style={{fontSize:10}}>{noteModal.status?.replace(/_/g,' ')}</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Move to Status</label>
                <select className="form-control" value={nextStatus} onChange={e=>setNextStatus(e.target.value)}>
                  <option value="">— Select next stage —</option>
                  {['under_review','audit_stage1','audit_stage2','approved','certified','rejected'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes / Report</label>
                <textarea className="form-control" rows={4} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Enter audit notes, findings, or report…"/>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setNoteModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={moveStatus} disabled={saving}>{saving?'Updating…':<><Send size={13}/> Update & Notify Client</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept/Reject Audit Modal */}
      {acceptAuditModal && (
        <div className="modal-bg" onClick={()=>setAcceptAuditModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title"><ClipboardCheck size={15} style={{ color:'var(--primary)', marginRight:7, verticalAlign:'middle' }}/>Confirm Audit Assignment</div>
              <button className="modal-close" onClick={()=>setAcceptAuditModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div style={{background:'var(--primary-50)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13}}>
                <strong>{acceptAuditModal.organizationName}</strong>
                <div style={{fontSize:11.5,color:'var(--gray-500)',marginTop:2}}>{acceptAuditModal.isoStandard} · Application {acceptAuditModal.applicationId}</div>
              </div>
              <p style={{fontSize:13,color:'var(--gray-600)',marginBottom:16,lineHeight:1.5}}>
                Do you accept this audit assignment? Once you accept, you'll be responsible for conducting the audit and providing reports.
              </p>
              <div style={{background:'var(--blue-50)',borderRadius:8,padding:12,fontSize:12,color:'var(--blue-dark)',lineHeight:1.4,display:'flex',alignItems:'flex-start',gap:6}}>
                <Check size={13} style={{flexShrink:0,marginTop:1}}/><span><strong>Scope:</strong> {acceptAuditModal.scope}</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setAcceptAuditModal(null)}>Later</button>
              <button className="btn btn-secondary" onClick={()=>handleAcceptAudit('rejected')} disabled={saving} style={{background:'var(--red)',color:'white'}}>
                <ThumbsDown size={13}/> Reject
              </button>
              <button className="btn btn-primary" onClick={()=>handleAcceptAudit('accepted')} disabled={saving}>
                <ThumbsUp size={13}/> {saving ? 'Accepting…' : 'Accept Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
