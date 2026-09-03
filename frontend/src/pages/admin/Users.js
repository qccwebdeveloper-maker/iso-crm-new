import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, CheckCircle, Copy, RefreshCw, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

const ISO_STANDARDS = ['ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 27001:2022','ISO 22000:2018','ISO 13485:2016','ISO 50001:2018'];

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button onClick={copy} title="Copy"
      style={{ background: done ? '#16a34a' : '#e3f2fd', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: done ? '#fff' : '#1565c0', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}>
      <Copy size={11} /> {done ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [rf, setRf]               = useState('');
  const [statusF, setStatusF]     = useState('');
  const [modal, setModal]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPw, setShowPw]       = useState(false);
  const [errors, setErrors]       = useState({});
  const [page, setPage]           = useState(1);
  const [credsModal, setCredsModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const PER_PAGE = 10;

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'client', phone: '', company: '', branchLabel: '', address: '', isoStandard: '',
  });

  const load = () => {
    setLoading(true);
    axios.get('/api/users').then(r => setUsers(r.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const setRole = (role) => {
    setForm(p => ({ ...p, role, password: role === 'client' ? genPassword() : p.password }));
  };

  React.useEffect(() => setPage(1), [search, rf, statusF, activeTab]);

  const pending  = users.filter(u => u.pendingApproval && !u.isActive);
  const filtered = users.filter(u => {
    if (activeTab === 'pending') return u.pendingApproval && !u.isActive;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.clientId?.toLowerCase().includes(q);
    const matchRole   = !rf || u.role === rf;
    const matchStatus = !statusF || (statusF === 'active' ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.role)         e.role  = 'Role is required';
    if (modal === 'add' && !form.password) e.password = 'Password is required';
    if (modal === 'add' && form.role === 'client' && !form.isoStandard) e.isoStandard = 'ISO Standard is required for clients';
    return e;
  };

  const save = async () => {
    if (saving) return;
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      if (modal === 'add') {
        const { data } = await axios.post('/api/users', form);
        toast.success('User created');
        if (form.role === 'client' && data.clientId) {
          setCredsModal({ clientId: data.clientId, password: form.password, name: data.name });
        }
      } else {
        const d = { ...form };
        if (!d.password) delete d.password;
        await axios.put(`/api/users/${modal._id}`, d);
        toast.success('Updated');
      }
      setModal(null);
      load();
    } catch (err) {
      // Same company + same standard + a still-active certification already has a
      // Client ID — this is a hard block; a new one can only be created once that
      // certification actually expires (Certificates page → Expire).
      toast.error(err.response?.data?.message || 'Error');
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (deletingId) return;
    if (!window.confirm('Delete this user?')) return;
    setDeletingId(id);
    try { await axios.delete(`/api/users/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  const roleColor = { admin: 'var(--primary)', client: '#3b82f6', auditor: '#8b5cf6', reviewer: '#8b5cf6', sales: '#16a34a' };

  const openAdd = () => {
    setForm({ name: '', email: '', password: genPassword(), role: 'client', phone: '', company: '', branchLabel: '', address: '', isoStandard: '' });
    setErrors({});
    setShowPw(false);
    setModal('add');
  };

  const renderTable = () => {
    if (loading) return <div className="loading-box"><div className="spinner" /></div>;
    if (filtered.length === 0) return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
        {activeTab === 'pending' ? 'No pending registrations' : 'No users found'}
      </div>
    );
    return (
      <>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                {activeTab === 'pending' && <th>Client ID</th>}
                <th>Role</th>
                <th>Company</th>
                <th>Phone</th>
                {activeTab === 'pending' && <th>ISO Standard</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(u => (
                <tr key={u._id} style={u.pendingApproval && !u.isActive ? { background: '#fffbeb' } : {}}>
                  <td>
                    <div onClick={() => navigate(`/admin/users/${u._id}`)} title="View details"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div className="avatar" style={{ background: roleColor[u.role] + '22', color: roleColor[u.role] }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{u.email}</div>
                        {u.clientId && (
                          <div style={{ fontSize: 10, color: '#1565c0', fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>
                            ID: {u.clientId}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {activeTab === 'pending' && (
                    <td style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#1565c0' }}>{u.clientId || '—'}</td>
                  )}
                  <td><span className={`badge bdg-${u.role}`}>{u.role}</span></td>
                  <td style={{ fontSize: 13 }}>{u.company || '—'}</td>
                  <td style={{ fontSize: 13 }}>{u.phone || '—'}</td>
                  {activeTab === 'pending' && <td style={{ fontSize: 12 }}>{u.isoStandard || '—'}</td>}
                  <td>
                    {u.pendingApproval && !u.isActive
                      ? <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>Pending</span>
                      : <span className={`badge bdg-${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    }
                  </td>
                  <td>
                    <div className="tbl-actions">
                      {u.pendingApproval && !u.isActive ? (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/users/${u._id}`)}><Eye size={13} /> Review</button>
                      ) : (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', company: u.company || '', branchLabel: u.branchLabel || '', address: u.address || '', isoStandard: u.isoStandard || '' }); setShowPw(false); setModal(u); }}>
                            <Edit size={13} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(u._id)} disabled={deletingId === u._id}><Trash2 size={13} /> {deletingId === u._id ? 'Deleting…' : 'Delete'}</button>
                        </>
                      )}
                    </div>
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

  // ── Full-page Add / Edit form ──
  if (modal) {
    const isAdd = modal === 'add';
    return (
      <Layout title={isAdd ? 'Add New User' : 'Edit User'}>
        <div className="page-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><ArrowLeft size={15} /> Back</button>
            <div>
              <h1 className="page-title">{isAdd ? 'Add New User' : 'Edit User'}</h1>
              <p className="page-subtitle">{isAdd ? 'Create a new user account' : 'Update this user account'}</p>
            </div>
          </div>
        </div>
        <div className="card" style={{ width: '100%', padding: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className={`form-control${errors.name ? ' input-error' : ''}`} value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }} placeholder="Company / Client Name" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className={`form-control${errors.email ? ' input-error' : ''}`} value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })); }} placeholder="client@company.com" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Password{!isAdd ? ' (blank = keep)' : ' *'}</span>
                {isAdd && form.role === 'client' && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, password: genPassword() }))}
                    style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                    <RefreshCw size={11} /> Generate
                  </button>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="form-control" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={isAdd ? 'Required' : '••••••••'}
                  style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={e => setRole(e.target.value)}>
                {['admin', 'client', 'auditor', 'reviewer', 'sales'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9000000000" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-control" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company Ltd" />
            </div>
          </div>
          {form.role === 'client' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Branch Label</label>
                  <input className="form-control" value={form.branchLabel} onChange={e => setForm(p => ({ ...p, branchLabel: e.target.value }))} placeholder="e.g. Pune Plant" />
                </div>
                <div className="form-group">
                  <label className="form-label">ISO Standard{isAdd ? ' *' : ''}</label>
                <select className={`form-control${errors.isoStandard ? ' input-error' : ''}`} value={form.isoStandard}
                  onChange={e => { setForm(p => ({ ...p, isoStandard: e.target.value })); setErrors(p => ({ ...p, isoStandard: '' })); }}>
                  <option value="">Select standard…</option>
                  {ISO_STANDARDS.map(s => <option key={s}>{s}</option>)}
                </select>
                {errors.isoStandard && <span className="field-error">{errors.isoStandard}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Branch Address</label>
                <input className="form-control" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full site address" />
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid var(--gray-100)', paddingTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => save()} disabled={saving}>
              {saving ? 'Saving…' : isAdd ? <><Plus size={14} /> Create</> : <><Edit size={14} /> Save</>}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="User Management">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            {filtered.length} users
            {pending.length > 0 && (
              <span style={{ marginLeft: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {pending.length} Pending Approval
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Client</button>
      </div>

      {pending.length > 0 && activeTab !== 'pending' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#92400e' }}>
            <strong>{pending.length} new client registration{pending.length > 1 ? 's' : ''}</strong> pending your approval.
          </div>
          <button onClick={() => setActiveTab('pending')} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>Review</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, background: '#e3f2fd', borderRadius: 10, padding: 3, marginBottom: 16, border: '1px solid #90caf9', width: 'fit-content' }}>
        {[['all', 'All Users'], ['pending', `Pending Approval${pending.length ? ` (${pending.length})` : ''}`]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding: '7px 16px', border: 'none', borderRadius: 8, background: activeTab === id ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'transparent', color: activeTab === id ? 'white' : '#9ca3af', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'all' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
              <Search size={15} className="search-ico" />
              <input className="search-input" placeholder="Search name, email, client ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={rf} onChange={e => setRf(e.target.value)}>
              <option value="">All Roles</option>
              {['admin', 'client', 'auditor', 'sales'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={statusF} onChange={e => setStatusF(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      <div className="card">
        {renderTable()}
      </div>

      {credsModal && (
        <div className="modal-bg" onClick={() => setCredsModal(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head" style={{ background: 'linear-gradient(135deg,#1565c0,#0d47a1)', borderRadius: '12px 12px 0 0' }}>
              <div className="modal-title" style={{ color: '#fff' }}>Client Created Successfully</div>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setCredsModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <CheckCircle size={40} color="#16a34a" strokeWidth={1.5} />
                <p style={{ margin: '8px 0 0', fontSize: 14, color: '#374151' }}>
                  Share these credentials with <strong>{credsModal.name}</strong>
                </p>
              </div>

              <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#1565c0', marginBottom: 6 }}>Client ID (Login Username)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, fontFamily: 'monospace', color: '#0d47a1' }}>{credsModal.clientId}</span>
                  <CopyBtn text={credsModal.clientId} />
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#16a34a', marginBottom: 6 }}>Password</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: '#166534', letterSpacing: 2 }}>{credsModal.password}</span>
                  <CopyBtn text={credsModal.password} />
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 13px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                The client can log in using their <strong>Client ID</strong> (not email) and this password. Save these details — the password cannot be retrieved later.
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setCredsModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
