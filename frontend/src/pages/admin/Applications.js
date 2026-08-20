import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Search, UserCheck, Eye, Edit, Plus, ArrowLeft } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

export default function AdminApplications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps]   = useState([]);
  const [clients, setClients] = useState([]);
  const [aud,  setAud]    = useState([]);
  const [rev,  setRev]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [standardF, setStandardF] = useState(searchParams.get('standard') || '');
  const [assignModal, setAssignModal] = useState(null);
  const [assign, setAssign] = useState({ auditorId:'', reviewerId:'' });
  const [saving, setSaving] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const load = () => {
    setLoading(true);
    Promise.all([axios.get('/api/applications'), axios.get('/api/auditors'), axios.get('/api/users?role=client')])
      .then(([a,au,cl]) => {
        setApps(a.data||[]);
        setAud((au.data||[]).filter(u=>u.role==='auditor'));
        setRev((au.data||[]).filter(u=>u.role==='reviewer'));
        setClients(cl.data||[]);
      }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const standards = [...new Set(apps.map(a => a.isoStandard).filter(Boolean))].sort();

  // Every client should appear here, not just ones who've filed an application —
  // clients with none get a placeholder row (__noApp) instead of being hidden.
  const rows = React.useMemo(() => {
    const withApp = new Set(apps.map(a => a.client?._id).filter(Boolean));
    const placeholders = clients.filter(c => !withApp.has(c._id)).map(c => ({
      _id: `client-${c._id}`,
      client: c,
      organizationName: c.company || '',
      isoStandard: '',
      status: '',
      assignedAuditor: null,
      createdAt: c.createdAt,
      __noApp: true,
    }));
    return [...apps, ...placeholders];
  }, [apps, clients]);

  const filtered = rows.filter(a => {
    const q = search.toLowerCase();
    return (!q||(a.client?.clientId||'').toLowerCase().includes(q)||a.organizationName?.toLowerCase().includes(q)||a.client?.name?.toLowerCase().includes(q))
      && (!statusF||a.status===statusF)
      && (!standardF||a.isoStandard===standardF);
  });

  React.useEffect(() => setPage(1), [search, statusF, standardF]);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const changeStandard = (val) => {
    setStandardF(val);
    setSearchParams(val ? { standard: val } : {});
  };

  const doAssign = async () => {
    if (!assign.auditorId && !assign.reviewerId) return toast.error('Select at least one');
    setSaving(true);
    try { await axios.post(`/api/applications/${assignModal._id}/assign`, assign); toast.success('Assigned!'); setAssignModal(null); load(); }
    catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const openEdit = (app) => {
    navigate(`/admin/applications/${app._id}?tab=edit`);
  };

  // Clients without an application yet have nothing to attach an auditor to —
  // create a draft Application for them first, then open the same assign modal.
  const startAssign = async (row) => {
    if (!row.__noApp) {
      setAssignModal(row);
      setAssign({ auditorId: row.assignedAuditor?._id||'', reviewerId: row.assignedReviewer?._id||'' });
      return;
    }
    setCreatingFor(row.client._id);
    try {
      const { data } = await axios.post('/api/applications', { client: row.client._id });
      setAssignModal({ ...data, client: row.client });
      setAssign({ auditorId:'', reviewerId:'' });
      load();
    } catch { toast.error('Could not start an application for this client'); }
    finally { setCreatingFor(null); }
  };

  const ST = ['draft','submitted','under_review','audit_stage1','audit_stage2','approved','certified','rejected'];

  const renderTable = () => {
    if (loading) return <div className="loading-box"><div className="spinner"/></div>;
    if (filtered.length === 0) return <div className="empty-box"><Eye size={40}/><h3>No applications</h3><p>Try adjusting your filters</p></div>;
    return (
      <>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Client ID</th><th>Organization</th><th>Client</th><th>Standard</th><th>Status</th><th>Auditor</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(app=>(
                <tr key={app._id} style={app.__noApp?{opacity:.7}:undefined}>
                  <td><span className="mono">{app.client?.clientId || '—'}</span></td>
                  <td style={{fontWeight:600,maxWidth:160}}>{app.organizationName || <span style={{color:'var(--gray-300)',fontStyle:'italic',fontWeight:400}}>No application</span>}</td>
                  <td><div style={{display:'flex',alignItems:'center',gap:7}}><div className="avatar" style={{width:24,height:24,fontSize:10}}>{app.client?.name?.[0]}</div><span style={{fontSize:12.5}}>{app.client?.name}</span></div></td>
                  <td>{app.isoStandard ? <span className="badge bdg-info" style={{fontSize:10}}>{app.isoStandard}</span> : <span style={{fontSize:11,color:'var(--gray-300)'}}>—</span>}</td>
                  <td>{app.status ? <span className={`badge bdg-${app.status}`} style={{fontSize:10}}>{app.status?.replace(/_/g,' ')}</span> : <span className="badge" style={{fontSize:10,background:'var(--gray-100)',color:'var(--gray-400)'}}>Not applied</span>}</td>
                  <td style={{fontSize:12,color:'var(--gray-500)'}}>{app.assignedAuditor?.name||'—'}</td>
                  <td style={{fontSize:12,color:'var(--gray-400)'}}>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td>
                    {app.__noApp ? (
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/admin/users/${app.client?._id}`)}><Eye size={13}/> View Client</button>
                        <button className="btn btn-primary btn-sm" disabled={creatingFor===app.client?._id} onClick={()=>startAssign(app)}>
                          <UserCheck size={13}/> {creatingFor===app.client?._id ? 'Starting…' : 'Assign'}
                        </button>
                      </div>
                    ) : (
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/admin/applications/${app._id}`)}><Eye size={13}/> View</button>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(app)}><Edit size={13}/> Edit</button>
                        <button className="btn btn-primary btn-sm" onClick={()=>startAssign(app)}>
                          <UserCheck size={13}/> Assign
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
      </>
    );
  };

  return (
    <Layout title="Applications">
      <div className="page-hdr">
        <div>
          {searchParams.get('standard') && (
            <button className="btn btn-ghost btn-sm" style={{marginBottom:8,paddingLeft:0}} onClick={() => navigate('/admin/reports')}>
              <ArrowLeft size={13}/> Back to Reports
            </button>
          )}
          <h1 className="page-title">All Applications</h1>
          <p className="page-subtitle">
            {filtered.filter(r=>!r.__noApp).length} application{filtered.filter(r=>!r.__noApp).length!==1?'s':''}
            {filtered.some(r=>r.__noApp) && ` · ${filtered.filter(r=>r.__noApp).length} client${filtered.filter(r=>r.__noApp).length!==1?'s':''} without an application`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/qms/form-01')}><Plus size={14}/> New Application</button>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-body" style={{display:'flex',gap:12,flexWrap:'wrap',padding:14}}>
          <div className="search-wrap" style={{flex:1,minWidth:200}}>
            <Search size={15} className="search-ico"/>
            <input className="search-input" placeholder="Search by ID, organization, client…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-control" style={{width:'auto',minWidth:160}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            {ST.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select className="form-control" style={{width:'auto',minWidth:160}} value={standardF} onChange={e=>changeStandard(e.target.value)}>
            <option value="">All Standards</option>
            {standards.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {renderTable()}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-bg" onClick={()=>setAssignModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title"><UserCheck size={16} style={{color:'var(--primary)',marginRight:8,verticalAlign:'middle'}}/>Assign Team — {assignModal.client?.clientId || '—'}</div>
              <button className="modal-close" onClick={()=>setAssignModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{background:'var(--primary-50)',borderRadius:10,padding:'10px 14px',marginBottom:18,fontSize:13,border:'1px solid var(--primary-100)'}}>
                <strong>{assignModal.organizationName || assignModal.client?.company || assignModal.client?.name || 'New Application'}</strong>
                {assignModal.isoStandard && <> · <span style={{color:'var(--gray-500)'}}>{assignModal.isoStandard}</span></>}
              </div>
              <div className="form-group"><label className="form-label">Assign Auditor</label>
                <select className="form-control" value={assign.auditorId} onChange={e=>setAssign(p=>({...p,auditorId:e.target.value}))}>
                  <option value="">— Select Auditor —</option>
                  {aud.map(a=><option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Assign Reviewer</label>
                <select className="form-control" value={assign.reviewerId} onChange={e=>setAssign(p=>({...p,reviewerId:e.target.value}))}>
                  <option value="">— Select Reviewer —</option>
                  {rev.map(r=><option key={r._id} value={r._id}>{r.name} ({r.email})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doAssign} disabled={saving}>{saving?'Saving…':<><UserCheck size={14}/> Confirm Assign</>}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
