import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Plus, Search, UserCheck, Trash2, Edit, Filter, Download, Phone, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const STATUS_CONFIG = {
  new:       { label: 'New',       bdg: 'bdg-new',       bg: '#eff6ff' },
  contacted: { label: 'Contacted', bdg: 'bdg-contacted', bg: '#fffbeb' },
  qualified: { label: 'Qualified', bdg: 'bdg-qualified', bg: '#f5f3ff' },
  converted: { label: 'Converted', bdg: 'bdg-converted', bg: '#f0fdf4' },
  lost:      { label: 'Lost',      bdg: 'bdg-rejected',  bg: '#fef2f2' },
};

const ISO_STANDARDS = ['ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 27001:2022','ISO 22000:2018','ISO 13485:2016','ISO 50001:2018'];
const SOURCES = ['Website','Referral','LinkedIn','Cold Call','Email Campaign','Trade Show','Other'];
const PRIORITY = ['high','medium','low'];

const EMPTY_FORM = {
  companyName: '', contactPerson: '', email: '', mobile: '',
  city: '', state: '', country: 'India',
  isoStandard: 'ISO 9001:2015', source: 'Website',
  status: 'new', priority: 'medium', notes: '',
};

export default function SalesLeads() {
  const [leads,    setLeads]    = useState([]);
  const [team,     setTeam]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('');
  const [modal,        setModal]        = useState(null);
  const [assignModal,  setAssignModal]  = useState(null);
  const [convertModal, setConvertModal] = useState(null);
  const [convertForm,  setConvertForm]  = useState({ scope: '', accreditationBody: 'NABCB' });
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [assignTo,     setAssignTo]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [formErrors,   setFormErrors]   = useState({});
  const [page,         setPage]         = useState(1);
  const [deletingId,   setDeletingId]   = useState(null);
  const PER_PAGE = 10;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/leads').catch(() => ({ data: [] })),
      axios.get('/api/users').catch(() => ({ data: [] })),
    ]).then(([l, u]) => {
      setLeads(l.data || []);
      setTeam((u.data || []).filter(u => u.role === 'sales' || u.role === 'admin'));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const mQ = !q || l.companyName?.toLowerCase().includes(q) || l.contactPerson?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
    const mS = !statusF || l.status === statusF;
    return mQ && mS;
  });

  React.useEffect(() => setPage(1), [search, statusF]);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    converted: leads.filter(l => l.status === 'converted').length,
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
      if (modal === 'add') {
        await axios.post('/api/leads', form);
        toast.success('Lead added!');
      } else {
        await axios.put(`/api/leads/${modal._id}`, form);
        toast.success('Updated!');
      }
      setModal(null);
      setForm(EMPTY_FORM);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (saving) return;
    if (!assignTo) return toast.error('Select a team member');
    setSaving(true);
    try {
      await axios.put(`/api/leads/${assignModal._id}`, { ...assignModal, assignedTo: assignTo });
      toast.success('Lead assigned!');
      setAssignModal(null);
      setAssignTo('');
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const convertLead = async () => {
    if (saving) return;
    if (!convertForm.scope.trim()) return toast.error('Scope is required');
    setSaving(true);
    try {
      await axios.post(`/api/leads/${convertModal._id}/convert`, convertForm);
      toast.success('Lead converted to application!');
      setConvertModal(null); setConvertForm({ scope: '', accreditationBody: 'NABCB' }); load();
    } catch { toast.error('Failed to convert'); } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (deletingId) return;
    if (!window.confirm('Delete this lead?')) return;
    setDeletingId(id);
    try { await axios.delete(`/api/leads/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  return (
    <Layout title="Lead Management">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-subtitle">{leads.length} total leads</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost">
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setModal('add'); }}>
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { l: 'Total',     v: stats.total,     c: 'purple' },
          { l: 'New',       v: stats.new,        c: 'blue' },
          { l: 'Qualified', v: stats.qualified,  c: 'amber' },
          { l: 'Converted', v: stats.converted,  c: 'green' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} className="search-ico" />
            <input className="search-input" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading
          ? <div className="loading-box"><div className="spinner" /></div>
          : filtered.length === 0
          ? <div className="empty-box"><h3>No leads found</h3><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setForm(EMPTY_FORM); setModal('add'); }}><Plus size={14} /> Add First Lead</button></div>
          : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Company</th><th>Contact</th><th>Standard</th><th>Source</th><th>Status</th><th>Priority</th><th>Assigned To</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paged.map(l => (
                    <tr key={l._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{l.companyName}</div>
                        {l.city && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{l.city}{l.state ? `, ${l.state}` : ''}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.contactPerson}</div>
                        {l.mobile && <div style={{ fontSize: 11, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{l.mobile}</div>}
                        {l.email  && <div style={{ fontSize: 11, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{l.email}</div>}
                      </td>
                      <td><span className="badge bdg-info" style={{ fontSize: 10.5 }}>{l.isoStandard}</span></td>
                      <td style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{l.source}</td>
                      <td><span className={`badge ${STATUS_CONFIG[l.status]?.bdg || 'bdg-new'}`} style={{ fontSize: 10.5 }}>{l.status}</span></td>
                      <td>
                        <span className={`badge ${l.priority === 'high' ? 'bdg-rejected' : l.priority === 'medium' ? 'bdg-under_review' : 'bdg-inactive'}`} style={{ fontSize: 10.5 }}>
                          {l.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{l.assignedTo?.name || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                      <td>
                        <div className="tbl-actions">
                          <button className="btn btn-ghost btn-sm" title="Assign" onClick={() => { setAssignModal(l); setAssignTo(''); }}>
                            <UserCheck size={12} />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setForm({ companyName: l.companyName, contactPerson: l.contactPerson, email: l.email || '', mobile: l.mobile || '', city: l.city || '', state: l.state || '', country: l.country || 'India', isoStandard: l.isoStandard, source: l.source, status: l.status, priority: l.priority, notes: l.notes || '' }); setModal(l); }}>
                            <Edit size={12} />
                          </button>
                          {!['converted','lost'].includes(l.status) && (
                            <button className="btn btn-success btn-sm" style={{fontSize:10,gap:4}} title="Convert to Application"
                              onClick={() => { setConvertModal(l); setConvertForm({ scope: `ISO Certification for ${l.companyName}`, accreditationBody: 'NABCB' }); }}>
                              <ArrowRight size={11}/> Convert
                            </button>
                          )}
                          {l.status==='converted' && (
                            <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--green)',fontWeight:700}}>
                              <CheckCircle size={11}/> Converted
                            </span>
                          )}
                          <button className="btn btn-danger btn-sm" disabled={deletingId === l._id} onClick={() => del(l._id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        {!loading && filtered.length > 0 && <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-bg" onClick={() => { setModal(null); setFormErrors({}); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'add' ? 'Add New Lead' : 'Edit Lead'}</div>
              <button className="modal-close" onClick={() => { setModal(null); setFormErrors({}); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input className={`form-control${formErrors.companyName ? ' input-error' : ''}`} value={form.companyName} onChange={e => { setForm(p => ({ ...p, companyName: e.target.value })); if (formErrors.companyName) setFormErrors(p => ({ ...p, companyName: '' })); }} placeholder="ABC Corp" />
                  {formErrors.companyName && <span className="field-error">{formErrors.companyName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person *</label>
                  <input className={`form-control${formErrors.contactPerson ? ' input-error' : ''}`} value={form.contactPerson} onChange={e => { setForm(p => ({ ...p, contactPerson: e.target.value })); if (formErrors.contactPerson) setFormErrors(p => ({ ...p, contactPerson: '' })); }} placeholder="John Doe" />
                  {formErrors.contactPerson && <span className="field-error">{formErrors.contactPerson}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className={`form-control${formErrors.email ? ' input-error' : ''}`} value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (formErrors.email) setFormErrors(p => ({ ...p, email: '' })); }} placeholder="john@abc.com" />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-control" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="+91 9000000000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ISO Standard</label>
                  <select className="form-control" value={form.isoStandard} onChange={e => setForm(p => ({ ...p, isoStandard: e.target.value }))}>
                    {ISO_STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select className="form-control" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-control" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes…" rows={3} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => { setModal(null); setFormErrors({}); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? <><Plus size={14} /> Add Lead</> : <><Edit size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-bg" onClick={() => setAssignModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <div className="modal-title">Assign Lead</div>
              <button className="modal-close" onClick={() => setAssignModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--primary-50)', borderRadius: 10, padding: '14px', marginBottom: 18, border: '1px solid var(--primary-200)' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{assignModal.contactPerson}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 2 }}>{assignModal.companyName}</div>
                <span className="badge bdg-info" style={{ marginTop: 6, display: 'inline-block', fontSize: 10.5 }}>{assignModal.isoStandard}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to *</label>
                <select className="form-control" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                  <option value="">Select team member</option>
                  {(team.length > 0 ? team : [
                    { _id: 't1', name: 'Amit Kumar' },
                    { _id: 't2', name: 'Priya Sharma' },
                    { _id: 't3', name: 'Rahul Verma' },
                  ]).map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
                {saving ? 'Assigning…' : <><UserCheck size={14} /> Assign</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Application Modal */}
      {convertModal && (
        <div className="modal-bg" onClick={() => setConvertModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title"><ArrowRight size={14} style={{ color: 'var(--green)', marginRight: 7, verticalAlign: 'middle' }}/>Convert to Application</div>
              <button className="modal-close" onClick={() => setConvertModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 9, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{convertModal.companyName}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                  {convertModal.contactPerson} · {convertModal.isoStandard}
                  {convertModal.city ? ` · ${convertModal.city}` : ''}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Scope of Certification *</label>
                <textarea className="form-control" rows={3}
                  value={convertForm.scope}
                  onChange={e => setConvertForm(p => ({ ...p, scope: e.target.value }))}
                  placeholder="Describe the scope of activities to be certified…" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Accreditation Body</label>
                <select className="form-control" value={convertForm.accreditationBody}
                  onChange={e => setConvertForm(p => ({ ...p, accreditationBody: e.target.value }))}>
                  {['NABCB','DAkkS','UKAS','NAB','ANAB','JAB','KAN'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConvertModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={convertLead} disabled={saving}>
                {saving ? 'Converting…' : <><ArrowRight size={13} /> Convert to Application</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
