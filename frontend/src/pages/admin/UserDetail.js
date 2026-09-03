import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle, User, Building, Globe, Mail, Phone, MapPin, Calendar, Shield, Hash } from 'lucide-react';

const roleColor = { admin: 'var(--primary)', client: '#3b82f6', auditor: '#8b5cf6', reviewer: '#8b5cf6', sales: '#16a34a' };

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/users/${id}`)
      .then(r => setUser(r.data))
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    if (acting) return;
    setActing(true);
    try {
      await axios.put(`/api/users/${user._id}`, { isActive: true, pendingApproval: false });
      toast.success(`${user.name} activated`);
      navigate('/admin/users');
    } catch { toast.error('Failed to activate'); }
    finally { setActing(false); }
  };

  const reject = async () => {
    if (acting) return;
    if (!window.confirm(`Reject and delete ${user.name}'s registration?`)) return;
    setActing(true);
    try {
      await axios.delete(`/api/users/${user._id}`);
      toast.success('Registration rejected');
      navigate('/admin/users');
    } catch { toast.error('Failed'); }
    finally { setActing(false); }
  };

  if (loading) return <Layout title="User"><div className="loading-box"><div className="spinner" /></div></Layout>;
  if (!user)   return <Layout title="Not Found"><p style={{ padding: 20 }}>User not found</p></Layout>;

  const isPending = user.pendingApproval && !user.isActive;
  const rc = roleColor[user.role] || 'var(--primary)';

  const Info = ({ icon: Icon, label, value }) => value ? (
    <div className="info-row">
      <span className="ir-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={13} style={{ color: 'var(--gray-400)' }} />}{label}
      </span>
      <span className="ir-value">{value}</span>
    </div>
  ) : null;

  return (
    <Layout title={user.name}>
      {/* Page header */}
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/users')}><ArrowLeft size={14} />Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 18, background: rc + '22', color: rc }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="page-title" style={{ margin: 0 }}>{user.name}</h1>
                <span className={`badge bdg-${user.role}`}>{user.role}</span>
                {isPending
                  ? <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>Pending Approval</span>
                  : <span className={`badge bdg-${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                }
              </div>
              <p className="page-subtitle">{user.email}{user.clientId ? ` · ID ${user.clientId}` : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending review banner */}
      {isPending && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#92400e' }}>
            <strong>This registration is awaiting approval.</strong> Review the details below, then approve or reject.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={approve} disabled={acting} style={{ background: '#16a34a', borderColor: '#16a34a' }}><CheckCircle size={14} /> Approve</button>
            <button className="btn btn-danger btn-sm" onClick={reject} disabled={acting}><XCircle size={14} /> Reject</button>
          </div>
        </div>
      )}

      <div className="dash-grid">
        {/* Account */}
        <div className="card">
          <div className="card-hdr"><div className="card-title"><User size={14} style={{ color: 'var(--primary)' }} />Account</div></div>
          <div className="card-body">
            <Info icon={User} label="Full Name" value={user.name} />
            <Info icon={Mail} label="Email" value={user.email} />
            <Info icon={Shield} label="Role" value={user.role} />
            <Info icon={Hash} label="Client ID" value={user.clientId} />
            <Info label="Status" value={isPending ? 'Pending Approval' : user.isActive ? 'Active' : 'Inactive'} />
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <div className="card-hdr"><div className="card-title"><Building size={14} style={{ color: 'var(--primary)' }} />Contact & Company</div></div>
          <div className="card-body">
            <Info icon={Building} label="Company" value={user.company} />
            <Info icon={Phone} label="Phone" value={user.phone} />
            <Info icon={MapPin} label="Address" value={user.address} />
            {!user.company && !user.phone && !user.address && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '6px 0' }}>No contact details provided.</div>
            )}
          </div>
        </div>

        {/* ISO / Registration */}
        <div className="card">
          <div className="card-hdr"><div className="card-title"><Globe size={14} style={{ color: 'var(--primary)' }} />Registration Details</div></div>
          <div className="card-body">
            <Info icon={Globe} label="ISO Standard" value={user.isoStandard} />
            <Info label="Scope" value={user.scope} />
            <Info label="Assigned Applications" value={user.assignedApplications?.length || null} />
            <Info icon={Calendar} label="Registered" value={fmtDate(user.createdAt)} />
            <Info icon={Calendar} label="Last Updated" value={fmtDate(user.updatedAt)} />
          </div>
        </div>
      </div>

    </Layout>
  );
}
