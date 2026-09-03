import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, Search, TrendingUp, Award, Star } from 'lucide-react';

export default function SalesTeam() {
  const [team,    setTeam]    = useState([]);
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name: '', email: '', password: '', phone: '', company: '', role: 'sales' });
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/users').catch(() => ({ data: [] })),
      axios.get('/api/leads').catch(() => ({ data: [] })),
    ]).then(([u, l]) => {
      setTeam((u.data || []).filter(u => u.role === 'sales'));
      setLeads(l.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = team.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  const save = async () => {
    if (saving) return;
    if (!form.name || !form.email) return toast.error('Name and email required');
    if (modal === 'add' && !form.password) return toast.error('Password required');
    setSaving(true);
    try {
      if (modal === 'add') {
        await axios.post('/api/users', { ...form, role: 'sales' });
        toast.success('Team member added');
      } else {
        const d = { ...form };
        if (!d.password) delete d.password;
        await axios.put(`/api/users/${modal._id}`, d);
        toast.success('Updated');
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (deletingId) return;
    if (!window.confirm('Remove this team member?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/users/${id}`);
      toast.success('Removed');
      load();
    } catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  const getMemberStats = (memberId) => {
    const memberLeads = leads.filter(l => l.assignedTo?._id === memberId || l.assignedTo === memberId);
    return {
      total: memberLeads.length,
      converted: memberLeads.filter(l => l.status === 'converted').length,
      active: memberLeads.filter(l => !['converted', 'lost'].includes(l.status)).length,
      rate: memberLeads.length > 0 ? Math.round((memberLeads.filter(l => l.status === 'converted').length / memberLeads.length) * 100) : 0,
    };
  };

  const MOCK_TEAM = [
    { _id: 't1', name: 'Amit Kumar',   email: 'amit@crm.com',  phone: '+91 98765 11111', company: 'QC Cert', isActive: true },
    { _id: 't2', name: 'Priya Sharma', email: 'priya@crm.com', phone: '+91 98765 22222', company: 'QC Cert', isActive: true },
    { _id: 't3', name: 'Rahul Verma',  email: 'rahul@crm.com', phone: '+91 98765 33333', company: 'QC Cert', isActive: true },
    { _id: 't4', name: 'Neha Mehta',   email: 'neha@crm.com',  phone: '+91 98765 44444', company: 'QC Cert', isActive: false },
  ];

  const displayTeam = filtered.length > 0 ? filtered : MOCK_TEAM;
  const GRAD = [
    'linear-gradient(135deg,var(--primary),var(--primary-dark))',
    'linear-gradient(135deg,var(--teal),#0d9488)',
    'linear-gradient(135deg,var(--blue),#1d4ed8)',
    'linear-gradient(135deg,var(--purple),#6d28d9)',
  ];

  return (
    <Layout title="Sales Team">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Sales Team</h1>
          <p className="page-subtitle">{displayTeam.length} team members</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', email: '', password: '', phone: '', company: '', role: 'sales' }); setModal('add'); }}>
          <Plus size={14} /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { l: 'Team Members',    v: displayTeam.length,                                                     icon: Users,      c: 'blue' },
          { l: 'Total Leads',     v: leads.length,                                                            icon: TrendingUp, c: 'purple' },
          { l: 'Converted',       v: leads.filter(l => l.status === 'converted').length,                     icon: Award,      c: 'green' },
          { l: 'Avg Conv. Rate',  v: `${displayTeam.length > 0 ? Math.round(leads.filter(l => l.status === 'converted').length / Math.max(leads.length, 1) * 100) : 0}%`, icon: Star, c: 'orange' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon ${k.c}`}><k.icon size={20} /></div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div className="search-wrap">
            <Search size={15} className="search-ico" />
            <input className="search-input" placeholder="Search team members…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Team Grid */}
      {loading
        ? <div className="loading-box"><div className="spinner" /></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {displayTeam.map((m, i) => {
              const ms = getMemberStats(m._id);
              return (
                <div key={m._id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ height: 4, background: GRAD[i % 4] }} />
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <div className="avatar avatar-lg" style={{ background: GRAD[i % 4] }}>
                        {m.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-1)' }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{m.email}</div>
                        <span className={`badge ${m.isActive !== false ? 'bdg-active' : 'bdg-inactive'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                          {m.isActive !== false ? '● Active' : '● Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                      {[
                        { v: ms.total,     l: 'Leads' },
                        { v: ms.converted, l: 'Converted' },
                        { v: `${ms.rate}%`,l: 'Rate' },
                      ].map((s, j) => (
                        <div key={j} style={{ textAlign: 'center', background: 'var(--primary-50)', borderRadius: 8, padding: '8px 4px', border: '1px solid var(--primary-100)' }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1)' }}>{s.v}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--gray-500)' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--gray-500)' }}>Target Progress</span>
                        <span style={{ fontWeight: 700 }}>{ms.rate}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${ms.rate}%` }} />
                      </div>
                    </div>

                    {m.phone && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>📞 {m.phone}</div>}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setForm({ name: m.name, email: m.email, password: '', phone: m.phone || '', company: m.company || '', role: 'sales' }); setModal(m); }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={deletingId === m._id} onClick={() => del(m._id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Modal */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'add' ? 'Add Team Member' : 'Edit Team Member'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Amit Kumar" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="amit@crm.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password {modal !== 'add' && '(blank = keep)'}</label>
                  <input type="password" className="form-control" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={modal === 'add' ? 'Required' : '••••••••'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9000000000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-control" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? <><Plus size={14} /> Add Member</> : <><Edit size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
