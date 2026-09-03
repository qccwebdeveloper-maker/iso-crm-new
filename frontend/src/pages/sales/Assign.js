import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { UserCheck, Phone, Mail, Target, Users, CheckCircle } from 'lucide-react';

const STATUS_CONFIG = {
  new:       { label: 'New',       bdg: 'bdg-new' },
  contacted: { label: 'Contacted', bdg: 'bdg-contacted' },
  qualified: { label: 'Qualified', bdg: 'bdg-qualified' },
  converted: { label: 'Converted', bdg: 'bdg-converted' },
  lost:      { label: 'Lost',      bdg: 'bdg-rejected' },
};

const GRAD = [
  'linear-gradient(135deg,var(--primary),var(--primary-dark))',
  'linear-gradient(135deg,var(--teal),#0d9488)',
  'linear-gradient(135deg,var(--blue),#1d4ed8)',
  'linear-gradient(135deg,var(--purple),#6d28d9)',
];

export default function SalesAssign() {
  const [leads,    setLeads]    = useState([]);
  const [team,     setTeam]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState({});
  const [saving,   setSaving]   = useState(false);

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

  const unassigned = leads.filter(l => !l.assignedTo);
  const assigned   = leads.filter(l => l.assignedTo);

  const handleAssign = async (lead) => {
    if (saving) return;
    const memberId = selected[lead._id];
    if (!memberId) return toast.error('Select a team member first');
    setSaving(true);
    try {
      await axios.put(`/api/leads/${lead._id}`, { ...lead, assignedTo: memberId });
      toast.success(`Lead assigned to ${team.find(m => m._id === memberId)?.name || 'member'}!`);
      setSelected(p => { const n = { ...p }; delete n[lead._id]; return n; });
      load();
    } catch { toast.error('Failed to assign'); }
    finally { setSaving(false); }
  };

  const handleBulkAssign = async () => {
    if (saving) return;
    const toAssign = Object.entries(selected).filter(([, v]) => v);
    if (toAssign.length === 0) return toast.error('Select leads and members first');
    setSaving(true);
    let success = 0;
    for (const [leadId, memberId] of toAssign) {
      try {
        const lead = leads.find(l => l._id === leadId);
        if (lead) { await axios.put(`/api/leads/${leadId}`, { ...lead, assignedTo: memberId }); success++; }
      } catch {}
    }
    toast.success(`${success} leads assigned!`);
    setSelected({});
    load();
    setSaving(false);
  };

  const MOCK_TEAM = [
    { _id: 't1', name: 'Amit Kumar' },
    { _id: 't2', name: 'Priya Sharma' },
    { _id: 't3', name: 'Rahul Verma' },
    { _id: 't4', name: 'Neha Mehta' },
  ];
  const displayTeam = team.length > 0 ? team : MOCK_TEAM;

  return (
    <Layout title="Assign Leads">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Assign Leads</h1>
          <p className="page-subtitle">{unassigned.length} unassigned · {assigned.length} assigned</p>
        </div>
        {Object.keys(selected).length > 0 && (
          <button className="btn btn-primary" onClick={handleBulkAssign} disabled={saving}>
            <UserCheck size={14} /> Assign Selected ({Object.keys(selected).length})
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Unassigned Leads */}
        <div>
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><Target size={14} style={{ color: 'var(--primary)' }} />Unassigned Leads</div>
              <span className="badge bdg-rejected">{unassigned.length} pending</span>
            </div>
            {loading
              ? <div className="loading-box"><div className="spinner" /></div>
              : unassigned.length === 0
              ? (
                <div className="empty-box">
                  <CheckCircle size={40} />
                  <h3>All leads assigned!</h3>
                  <p>Great work — no pending assignments</p>
                </div>
              ) : (
                <div style={{ padding: '0 20px 12px' }}>
                  {unassigned.map((l, i) => (
                    <div key={l._id} style={{ border: '1.5px solid var(--primary-100)', borderRadius: 12, padding: '14px 16px', marginBottom: 12, transition: 'all .14s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{l.companyName}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 1 }}>{l.contactPerson}</div>
                        </div>
                        <span className={`badge ${STATUS_CONFIG[l.status]?.bdg || 'bdg-new'}`}>{l.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="badge bdg-info" style={{ fontSize: 10.5 }}>{l.isoStandard}</span>
                        {l.priority && <span className={`badge ${l.priority === 'high' ? 'bdg-rejected' : l.priority === 'medium' ? 'bdg-contacted' : 'bdg-inactive'}`} style={{ fontSize: 10.5 }}>{l.priority}</span>}
                      </div>
                      {(l.mobile || l.email) && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                          {l.mobile && <span style={{ fontSize: 11.5, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{l.mobile}</span>}
                          {l.email  && <span style={{ fontSize: 11.5, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{l.email}</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className="form-control"
                          style={{ flex: 1, fontSize: 12.5 }}
                          value={selected[l._id] || ''}
                          onChange={e => setSelected(p => ({ ...p, [l._id]: e.target.value }))}
                        >
                          <option value="">Select team member</option>
                          {displayTeam.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </select>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAssign(l)}
                          disabled={!selected[l._id] || saving}
                        >
                          <UserCheck size={13} /> Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        <div>
          {/* Team Workload */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-hdr">
              <div className="card-title"><Users size={14} style={{ color: 'var(--primary)' }} />Team Workload</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {displayTeam.map((m, i) => {
                const active = leads.filter(l => (l.assignedTo?._id === m._id || l.assignedTo === m._id) && !['converted', 'lost'].includes(l.status)).length;
                const total  = leads.filter(l => l.assignedTo?._id === m._id || l.assignedTo === m._id).length;
                const load   = active >= 6 ? 'high' : active >= 3 ? 'medium' : 'low';
                return (
                  <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--primary-50)' }}>
                    <div className="avatar" style={{ background: GRAD[i % 4] }}>{m.name.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                        <span className={`badge ${load === 'high' ? 'bdg-rejected' : load === 'medium' ? 'bdg-contacted' : 'bdg-certified'}`}>{load}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min((active / 8) * 100, 100)}%` }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>{active} active / {total} total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recently Assigned */}
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><CheckCircle size={14} style={{ color: 'var(--green)' }} />Recently Assigned</div>
            </div>
            <div style={{ padding: '0 20px 8px' }}>
              {assigned.slice(0, 6).length === 0
                ? <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>No assigned leads yet</div>
                : assigned.slice(0, 6).map(l => (
                    <div key={l._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--primary-50)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{l.companyName}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>→ {l.assignedTo?.name || '—'}</div>
                      </div>
                      <span className={`badge ${STATUS_CONFIG[l.status]?.bdg || 'bdg-new'}`} style={{ fontSize: 10.5 }}>{l.status}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
