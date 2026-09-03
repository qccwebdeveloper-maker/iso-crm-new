import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import {
  Plus, Search, Eye, UserCheck, ArrowRight, Trash2,
  Phone, Mail, MapPin, Tag, TrendingUp, Users, Star,
  CheckCircle, Clock, XCircle, Filter, Download, Inbox, Trophy
} from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const STATUS_CONFIG = {
  pending_review: { label:'Pending Review', color:'bdg-pending_review', icon:Inbox,       bg:'#fef2f2' },
  new:       { label:'New',       color:'bdg-submitted',    icon:Star,        bg:'#eff6ff' },
  contacted: { label:'Contacted', color:'bdg-under_review', icon:Phone,       bg:'#fffbeb' },
  qualified: { label:'Qualified', color:'bdg-audit_stage1', icon:CheckCircle, bg:'#f5f3ff' },
  converted: { label:'Converted', color:'bdg-certified',    icon:Trophy,      bg:'#f0fdf4' },
  lost:      { label:'Lost',      color:'bdg-rejected',     icon:XCircle,     bg:'#fef2f2' },
};

const PRIORITY = {
  high:   { label:'High',   color:'#ef4444', bg:'#fef2f2' },
  medium: { label:'Medium', color:'#f97316', bg:'#fff7ed' },
  low:    { label:'Low',    color:'#6b7280', bg:'#f9fafb' },
};

function StatusBadge({ status, size = 11 }) {
  const st = STATUS_CONFIG[status];
  if (!st) return null;
  const Icon = st.icon;
  return (
    <span className={`badge ${st.color}`}>
      <Icon size={size} style={{ marginRight: 3, verticalAlign: -1.5 }} /> {st.label}
    </span>
  );
}

const ISO_STANDARDS = ['ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 27001:2022','ISO 22000:2018','ISO 13485:2016','ISO 50001:2018'];
const SOURCES = ['Website','Referral','LinkedIn','Cold Call','Email Campaign','Trade Show','Other'];

const EMPTY_FORM = {
  companyName:'', contactPerson:'', email:'', mobile:'',
  address:'', city:'', state:'', country:'India',
  isoStandard:'ISO 9001:2015', source:'Website',
  status:'new', priority:'medium', notes:''
};

export default function AdminLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [priorityF, setPriorityF] = useState('');
  const [view, setView] = useState('grid'); // grid | table

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [convertModal, setConvertModal] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [assign, setAssign] = useState({ auditorId:'', reviewerId:'' });
  const [convertForm, setConvertForm] = useState({ scope:'', accreditationBody:'NABCB' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [page,   setPage]   = useState(1);
  const PER_PAGE = 10;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/leads'),
      axios.get('/api/auditors')
    ]).then(([l, au]) => {
      setLeads(l.data || []);
      const all = au.data || [];
      setAuditors(all.filter(u => u.role === 'auditor'));
      setReviewers(all.filter(u => u.role === 'reviewer'));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.companyName?.toLowerCase().includes(q) || l.contactPerson?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.leadId?.toLowerCase().includes(q);
    const matchS = !statusF || l.status === statusF;
    const matchP = !priorityF || l.priority === priorityF;
    return matchQ && matchS && matchP;
  });

  React.useEffect(() => setPage(1), [search, statusF, priorityF]);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = {
    total: leads.length,
    pendingReview: leads.filter(l=>l.status==='pending_review').length,
    new: leads.filter(l=>l.status==='new').length,
    contacted: leads.filter(l=>l.status==='contacted').length,
    qualified: leads.filter(l=>l.status==='qualified').length,
    converted: leads.filter(l=>l.status==='converted').length,
  };

  const validateLead = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleAdd = async () => {
    if (saving) return;
    const errs = validateLead();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaving(true);
    try {
      await axios.post('/api/leads', form);
      toast.success('Lead added successfully!');
      setAddModal(false); setForm(EMPTY_FORM); load();
    } catch { toast.error('Failed to add lead'); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (saving) return;
    if (!assign.auditorId && !assign.reviewerId) return toast.error('Select at least one');
    setSaving(true);
    try {
      await axios.post(`/api/leads/${assignModal._id}/assign`, assign);
      toast.success('Lead assigned successfully!');
      setAssignModal(null); setAssign({ auditorId:'', reviewerId:'' }); load();
    } catch { toast.error('Assignment failed'); }
    finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (saving) return;
    if (!convertForm.scope) return toast.error('Scope is required');
    setSaving(true);
    try {
      const { data } = await axios.post(`/api/leads/${convertModal._id}/convert`, convertForm);
      toast.success(`Converted! Application ${data.application.applicationId} created.`);
      setConvertModal(null); setConvertForm({ scope:'', accreditationBody:'NABCB' }); load();
    } catch { toast.error('Conversion failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (deletingId) return;
    if (!window.confirm('Delete this lead?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/leads/${id}`);
      toast.success('Lead deleted');
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const updateStatus = async (id, status) => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    try {
      await axios.put(`/api/leads/${id}`, { status });
      toast.success('Status updated');
      load();
    } catch { toast.error('Update failed'); }
    finally { setStatusUpdating(false); }
  };

  const exportCSV = () => {
    const rows = [
      ['Lead ID','Company','Contact','Email','Mobile','ISO Standard','Status','Priority','Source','Auditor','Reviewer','Date'],
      ...filtered.map(l => [
        l.leadId, l.companyName, l.contactPerson, l.email, l.mobile,
        l.isoStandard, l.status, l.priority, l.source,
        l.assignedAuditor?.name||'', l.assignedReviewer?.name||'',
        new Date(l.createdAt).toLocaleDateString()
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='leads-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Leads exported!');
  };

  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <Layout title="Lead Management">
      {/* ── Page header ── */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-subtitle">{stats.total} total leads · {stats.pendingReview} pending review · {stats.qualified} qualified · {stats.converted} converted</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={14}/> Export</button>
          <button className="btn btn-primary" onClick={()=>{ setForm(EMPTY_FORM); setFormErrors({}); setAddModal(true); }}><Plus size={15}/> Add Lead</button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:24}}>
        {[
          {l:'Total',          s:'',                v:stats.total,         c:'orange', icon:<TrendingUp size={18}/>},
          {l:'Pending Review', s:'pending_review',   v:stats.pendingReview, c:'red',    icon:<Inbox size={18}/>},
          {l:'New',            s:'new',              v:stats.new,           c:'blue',   icon:<Star size={18}/>},
          {l:'Contacted',      s:'contacted',        v:stats.contacted,     c:'amber',  icon:<Phone size={18}/>},
          {l:'Qualified',      s:'qualified',        v:stats.qualified,     c:'purple', icon:<CheckCircle size={18}/>},
          {l:'Converted',      s:'converted',        v:stats.converted,     c:'green',  icon:<ArrowRight size={18}/>},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.c}`} style={{padding:'16px 18px',cursor:'pointer'}}
            onClick={()=>setStatusF(k.s===statusF?'':k.s)}>
            <div className={`kpi-icon ${k.c}`} style={{width:36,height:36,marginBottom:10}}>{k.icon}</div>
            <div className="kpi-value" style={{fontSize:24}}>{k.v}</div>
            <div className="kpi-label" style={{fontSize:12}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-body" style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div className="search-wrap" style={{flex:1,minWidth:220}}>
            <Search size={15} className="search-ico"/>
            <input className="search-input" placeholder="Search by company, contact, email, lead ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-control" style={{width:'auto',minWidth:150}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="form-control" style={{width:'auto',minWidth:140}} value={priorityF} onChange={e=>setPriorityF(e.target.value)}>
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{display:'flex',gap:4,background:'var(--primary-50)',borderRadius:8,padding:4,border:'1px solid var(--primary-100)'}}>
            {['grid','table'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:view===v?'var(--primary)':'transparent',color:view===v?'white':'var(--primary)',fontFamily:'inherit',transition:'all .15s'}}>
                {v==='grid'?'⊞ Grid':'⊟ Table'}
              </button>
            ))}
          </div>
          {(search||statusF||priorityF) && (
            <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch('');setStatusF('');setPriorityF('');}}>Clear</button>
          )}
          <span style={{fontSize:12,color:'var(--primary)',fontWeight:600,marginLeft:'auto'}}>{filtered.length} results</span>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="loading-box"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-box" style={{padding:80}}>
          <Users size={52} style={{color:'var(--primary-200)'}}/>
          <h3>No leads found</h3>
          <p>Try adjusting your filters or add a new lead</p>
          <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>{ setForm(EMPTY_FORM); setFormErrors({}); setAddModal(true); }}><Plus size={15}/> Add First Lead</button>
        </div></div>
      ) : view === 'grid' ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {paged.map(lead => (
            <LeadCard key={lead._id} lead={lead}
              onView={()=>setDetailModal(lead)}
              onAssign={()=>{setAssignModal(lead);setAssign({auditorId:lead.assignedAuditor?._id||'',reviewerId:lead.assignedReviewer?._id||'',});}}
              onConvert={()=>setConvertModal(lead)}
              onDelete={()=>handleDelete(lead._id)}
              onStatusChange={(s)=>updateStatus(lead._id,s)}
              deleting={deletingId===lead._id}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Lead ID</th><th>Company</th><th>Contact</th><th>Standard</th><th>Status</th><th>Priority</th><th>Auditor</th><th>Reviewer</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {paged.map(lead=>(
                  <tr key={lead._id}>
                    <td><span className="mono">{lead.leadId}</span></td>
                    <td>
                      <div style={{fontWeight:700,color:'var(--text-1)',fontSize:13.5}}>{lead.companyName}</div>
                      <div style={{fontSize:11,color:'var(--primary)',marginTop:1}}>{lead.source}</div>
                    </td>
                    <td>
                      <div style={{fontSize:13}}>{lead.contactPerson}</div>
                      <div style={{fontSize:11,color:'var(--gray-500)'}}>{lead.mobile}</div>
                    </td>
                    <td><span className="badge bdg-info">{lead.isoStandard}</span></td>
                    <td>
                      <StatusBadge status={lead.status} size={10} />
                    </td>
                    <td>
                      <span style={{fontSize:12,fontWeight:700,color:PRIORITY[lead.priority]?.color,background:PRIORITY[lead.priority]?.bg,padding:'2px 8px',borderRadius:99}}>
                        {PRIORITY[lead.priority]?.label}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'var(--gray-600)'}}>{lead.assignedAuditor?.name||<span style={{color:'var(--primary-200)'}}>—</span>}</td>
                    <td style={{fontSize:12,color:'var(--gray-600)'}}>{lead.assignedReviewer?.name||<span style={{color:'var(--primary-200)'}}>—</span>}</td>
                    <td style={{fontSize:11,color:'var(--primary-light)'}}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-sm" onClick={()=>setDetailModal(lead)} title="View Details"><Eye size={13}/></button>
                        <button className="btn btn-outline btn-sm" onClick={()=>{setAssignModal(lead);setAssign({auditorId:lead.assignedAuditor?._id||'',reviewerId:lead.assignedReviewer?._id||'',});}} title="Assign"><UserCheck size={13}/></button>
                        {lead.status !== 'converted' && (
                          <button className="btn btn-success btn-sm" onClick={()=>setConvertModal(lead)} title="Convert to Application"><ArrowRight size={13}/></button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(lead._id)} disabled={deletingId===lead._id} title="Delete"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />}

      {/* ── ADD LEAD MODAL ── */}
      {addModal && (
        <div className="modal-bg" onClick={()=>{ setAddModal(false); setFormErrors({}); }}>
          <div className="modal-box" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title" style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Plus size={15} /> Add New Lead</span>
              <button className="modal-close" onClick={()=>{ setAddModal(false); setFormErrors({}); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input className={`form-control${formErrors.companyName ? ' input-error' : ''}`} placeholder="e.g. ABC Enterprises" value={form.companyName} onChange={e=>{F('companyName',e.target.value); if(formErrors.companyName) setFormErrors(p=>({...p,companyName:''}));}}/>
                  {formErrors.companyName && <span className="field-error">{formErrors.companyName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person *</label>
                  <input className={`form-control${formErrors.contactPerson ? ' input-error' : ''}`} placeholder="Full name" value={form.contactPerson} onChange={e=>{F('contactPerson',e.target.value); if(formErrors.contactPerson) setFormErrors(p=>({...p,contactPerson:''}));}}/>
                  {formErrors.contactPerson && <span className="field-error">{formErrors.contactPerson}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className={`form-control${formErrors.email ? ' input-error' : ''}`} type="email" placeholder="contact@company.com" value={form.email} onChange={e=>{F('email',e.target.value); if(formErrors.email) setFormErrors(p=>({...p,email:''}));}}/>
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-control" placeholder="10-digit number" value={form.mobile} onChange={e=>F('mobile',e.target.value)}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" placeholder="Street address" value={form.address} onChange={e=>F('address',e.target.value)}/>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={e=>F('city',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={form.state} onChange={e=>F('state',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-control" value={form.country} onChange={e=>F('country',e.target.value)}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ISO Standard</label>
                  <select className="form-control" value={form.isoStandard} onChange={e=>F('isoStandard',e.target.value)}>
                    {ISO_STANDARDS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Source</label>
                  <select className="form-control" value={form.source} onChange={e=>F('source',e.target.value)}>
                    {SOURCES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e=>F('status',e.target.value)}>
                    {Object.entries(STATUS_CONFIG).filter(([k])=>k!=='converted').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-control" value={form.priority} onChange={e=>F('priority',e.target.value)}>
                    {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} placeholder="Internal notes about this lead…" value={form.notes} onChange={e=>F('notes',e.target.value)}/>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={()=>{ setAddModal(false); setFormErrors({}); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Add Lead'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <div className="modal-bg" onClick={()=>setAssignModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title" style={{ display:'inline-flex', alignItems:'center', gap:6 }}><UserCheck size={15} /> Assign Lead — {assignModal.leadId}</span>
              <button className="modal-close" onClick={()=>setAssignModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{padding:'12px 16px',background:'var(--primary-50)',borderRadius:12,marginBottom:20,border:'1px solid var(--primary-100)'}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--text-1)',marginBottom:4}}>{assignModal.companyName}</div>
                <div style={{fontSize:12,color:'var(--primary)'}}>{assignModal.contactPerson} · {assignModal.isoStandard}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Auditor</label>
                <select className="form-control" value={assign.auditorId} onChange={e=>setAssign(a=>({...a,auditorId:e.target.value}))}>
                  <option value="">— Select Auditor —</option>
                  {auditors.map(a=><option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Reviewer</label>
                <select className="form-control" value={assign.reviewerId} onChange={e=>setAssign(a=>({...a,reviewerId:e.target.value}))}>
                  <option value="">— Select Reviewer —</option>
                  {reviewers.map(r=><option key={r._id} value={r._id}>{r.name} ({r.email})</option>)}
                </select>
              </div>
              <div className="alert alert-info" style={{fontSize:12.5}}>
                Assigned users will receive a notification and can view this lead.
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={()=>setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>{saving?'Assigning…':'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailModal && (
        <div className="modal-bg" onClick={()=>setDetailModal(null)}>
          <div className="modal-box" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-title">{detailModal.companyName}</span>
                <div style={{marginTop:4,display:'flex',gap:6}}>
                  <StatusBadge status={detailModal.status} />
                  <span style={{fontSize:12,fontWeight:700,color:PRIORITY[detailModal.priority]?.color,background:PRIORITY[detailModal.priority]?.bg,padding:'2px 8px',borderRadius:99}}>{PRIORITY[detailModal.priority]?.label} Priority</span>
                </div>
              </div>
              <button className="modal-close" onClick={()=>setDetailModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Lead ID', detailModal.leadId],
                ['Contact', detailModal.contactPerson],
                ['Email', detailModal.email],
                ['Mobile', detailModal.mobile],
                ['Address', [detailModal.address,detailModal.city,detailModal.state].filter(Boolean).join(', ')],
                ['ISO Standard', detailModal.isoStandard],
                ['Source', detailModal.source],
                ['Assigned Auditor', detailModal.assignedAuditor?.name||'Not assigned'],
                ['Assigned Reviewer', detailModal.assignedReviewer?.name||'Not assigned'],
                ['Created', new Date(detailModal.createdAt).toLocaleString()],
              ].map(([l,v])=>(
                <div key={l} className="info-row">
                  <span className="ir-label">{l}</span>
                  <span className="ir-value">{v||'—'}</span>
                </div>
              ))}
              {detailModal.notes && (
                <div style={{marginTop:14,padding:'12px 14px',background:'var(--primary-50)',borderRadius:10,border:'1px solid var(--primary-100)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Notes</div>
                  <p style={{fontSize:13,color:'var(--gray-600)',lineHeight:1.6}}>{detailModal.notes}</p>
                </div>
              )}

              <div style={{marginTop:16}}>
                <label className="form-label">Update Status</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {Object.entries(STATUS_CONFIG).map(([k,v])=>(
                    <button key={k}
                      className={`btn btn-sm ${detailModal.status===k?'btn-primary':'btn-ghost'}`}
                      onClick={()=>{updateStatus(detailModal._id,k);setDetailModal({...detailModal,status:k});}}
                      disabled={statusUpdating}
                      style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                      <v.icon size={12} /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={()=>setDetailModal(null)}>Close</button>
              {detailModal.status !== 'converted' && (
                <button className="btn btn-success" onClick={()=>{setDetailModal(null);setConvertModal(detailModal);}}>
                  <ArrowRight size={14}/> Convert to Application
                </button>
              )}
              <button className="btn btn-primary" onClick={()=>{setDetailModal(null);setAssignModal(detailModal);setAssign({auditorId:detailModal.assignedAuditor?._id||'',reviewerId:detailModal.assignedReviewer?._id||''});}}>
                <UserCheck size={14}/> Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONVERT MODAL ── */}
      {convertModal && (
        <div className="modal-bg" onClick={()=>setConvertModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title" style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Trophy size={15} /> Convert Lead to Application</span>
              <button className="modal-close" onClick={()=>setConvertModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{marginBottom:16}}>
                This will create a new ISO certification application from <strong>{convertModal.companyName}</strong> and mark this lead as Converted.
              </div>
              <div className="form-group">
                <label className="form-label">Scope of Certification *</label>
                <textarea className="form-control" rows={3} placeholder="e.g. Design, Development and Manufacturing of Industrial Components" value={convertForm.scope} onChange={e=>setConvertForm(f=>({...f,scope:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Accreditation Body</label>
                <select className="form-control" value={convertForm.accreditationBody} onChange={e=>setConvertForm(f=>({...f,accreditationBody:e.target.value}))}>
                  {['NABCB','DAkkS','UKAS','NAB','ANAB','JAB'].map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div style={{padding:'12px 14px',background:'var(--primary-50)',borderRadius:10,border:'1px solid var(--primary-100)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--primary)',marginBottom:8}}>Application will be created with:</div>
                {[
                  ['Organization', convertModal.companyName],
                  ['ISO Standard', convertModal.isoStandard],
                  ['Contact', convertModal.contactPerson],
                  ['Auditor', convertModal.assignedAuditor?.name||'Not assigned'],
                  ['Reviewer', convertModal.assignedReviewer?.name||'Not assigned'],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'4px 0',borderBottom:'1px solid var(--primary-100)'}}>
                    <span style={{color:'var(--gray-500)'}}>{l}</span>
                    <span style={{fontWeight:600,color:'var(--text-1)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={()=>setConvertModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={saving}>{saving?'Converting…':'Convert & Create Application'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function LeadCard({ lead, onView, onAssign, onConvert, onDelete, onStatusChange, deleting }) {
  const pr = PRIORITY[lead.priority] || {};
  return (
    <div style={{background:'white',border:'1.5px solid var(--primary-100)',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(249,115,22,0.06)',transition:'all .2s'}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(249,115,22,0.12)';e.currentTarget.style.borderColor='var(--primary-200)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(249,115,22,0.06)';e.currentTarget.style.borderColor='var(--primary-100)';e.currentTarget.style.transform='none';}}>

      {/* Card top strip */}
      <div style={{height:4,background:`linear-gradient(90deg, var(--primary), var(--primary-light))`}}/>

      <div style={{padding:'16px 18px'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:14.5,color:'var(--text-1)',marginBottom:3,lineHeight:1.3}}>{lead.companyName}</div>
            <span className="mono" style={{fontSize:10.5}}>{lead.leadId}</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end',flexShrink:0,marginLeft:8}}>
            <StatusBadge status={lead.status} size={10} />
            <span style={{fontSize:10.5,fontWeight:700,color:pr.color,background:pr.bg,padding:'2px 7px',borderRadius:99}}>{pr.label}</span>
          </div>
        </div>

        {/* Contact info */}
        <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'var(--gray-600)'}}>
            <div style={{width:18,color:'var(--primary)'}}><Users size={13}/></div>
            {lead.contactPerson}
          </div>
          {lead.email && <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--gray-500)'}}>
            <div style={{width:18,color:'var(--primary)'}}><Mail size={13}/></div>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.email}</span>
          </div>}
          {lead.mobile && <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--gray-500)'}}>
            <div style={{width:18,color:'var(--primary)'}}><Phone size={13}/></div>
            {lead.mobile}
          </div>}
          {lead.city && <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--gray-500)'}}>
            <div style={{width:18,color:'var(--primary)'}}><MapPin size={13}/></div>
            {[lead.city,lead.state].filter(Boolean).join(', ')}
          </div>}
        </div>

        {/* Standard & source */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <span className="badge bdg-info" style={{fontSize:10.5}}>{lead.isoStandard}</span>
          <span style={{fontSize:10.5,background:'var(--gray-100)',color:'var(--gray-600)',padding:'2px 7px',borderRadius:99,fontWeight:600}}>{lead.source}</span>
        </div>

        {/* Assigned */}
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {lead.assignedAuditor ? (
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,background:'var(--purple-50)',color:'#5b21b6',padding:'4px 8px',borderRadius:8}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#8b5cf6',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0}}>A</div>
              {lead.assignedAuditor.name}
            </div>
          ) : (
            <div style={{fontSize:11,color:'var(--gray-400)',fontStyle:'italic'}}>No auditor assigned</div>
          )}
          {lead.assignedReviewer && (
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,background:'var(--amber-50)',color:'#92400e',padding:'4px 8px',borderRadius:8}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#f59e0b',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0}}>R</div>
              {lead.assignedReviewer.name}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:6,borderTop:'1px solid var(--primary-50)',paddingTop:12}}>
          <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={onView}><Eye size={12}/> View</button>
          <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={onAssign}><UserCheck size={12}/> Assign</button>
          {lead.status !== 'converted' ? (
            <button className="btn btn-success btn-sm" style={{flex:1}} onClick={onConvert}><ArrowRight size={12}/> Convert</button>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{flex:1,opacity:.5,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:4}} disabled><CheckCircle size={12}/> Converted</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}><Trash2 size={12}/></button>
        </div>
      </div>
    </div>
  );
}
