import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { FileText, Plus, Trash2, Edit2, User, UserCheck } from 'lucide-react';

const STATUS_COLORS = {
  draft:       { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
  in_progress: { bg: '#fff7ed', color: '#c2410c', label: 'In Progress' },
  completed:   { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
};

export default function AuditReportList() {
  const navigate = useNavigate();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    axios.get('/api/audit-reports')
      .then(res => setReports(res.data || []))
      .catch(() => toast.error('Failed to load audit reports'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, orgName) => {
    if (deleting) return;
    if (!window.confirm(`Delete audit report for "${orgName || 'this report'}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/audit-reports/${id}`);
      setReports(prev => prev.filter(r => r._id !== id));
      toast.success('Report deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Layout title="Audit Reports">
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--gray-800)' }}>Audit Reports</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>{reports.length} report{reports.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/audit-report/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={15} /> New Audit Report
          </button>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 10 }}>
              <div className="spinner" />
              <span style={{ color: 'var(--gray-500)', fontSize: 14 }}>Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileText size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>No audit reports yet</div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>Create a new audit report to get started</div>
              <button
                onClick={() => navigate('/admin/audit-report/new')}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                + Create Report
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                    {['Ref No.', 'Organization', 'Client', 'Assigned Auditor', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.draft;
                    return (
                      <tr key={r._id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                          {r.refNo || <span style={{ color: 'var(--gray-300)', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-800)', fontWeight: 500, maxWidth: 200 }}>
                          {r.orgName || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unnamed</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {r.client ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={12} color="var(--primary)" />
                              <span style={{ color: 'var(--gray-700)' }}>{r.client.name}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
                              {r.clientId ? <span style={{ color: '#f59e0b', fontSize: 11 }}>ID: {r.clientId} (unresolved)</span> : '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {r.assignedAuditor ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <UserCheck size={12} color="#10b981" />
                              <span style={{ color: 'var(--gray-700)' }}>{r.assignedAuditor.name}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--gray-300)', fontStyle: 'italic', fontSize: 11 }}>Not assigned</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700 }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                          {fmt(r.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => navigate(`/admin/audit-reports/${r._id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1.5px solid var(--primary)', background: '#fff7ed', color: 'var(--primary-dark)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(r._id, r.orgName)}
                              disabled={deleting === r._id}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: deleting === r._id ? 'not-allowed' : 'pointer', fontSize: 12, opacity: deleting === r._id ? 0.6 : 1 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
