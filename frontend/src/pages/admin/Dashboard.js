import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import toast from 'react-hot-toast';
import {
  FiFileText, FiUsers, FiAward, FiClock, FiTrendingUp, FiChevronRight,
  FiPlus, FiMessageSquare, FiTarget, FiStar,
  FiClipboard, FiEye, FiAlertCircle, FiActivity, FiBookOpen,
  FiAlertTriangle
} from 'react-icons/fi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState({ totalApplications:0, clients:0, auditors:0, statusCounts:[], monthlyApps:[], recentApps:[] });
  const [apps,      setApps]      = useState([]);
  const [auditors,  setAuditors]  = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      axios.get('/api/dashboard/stats').catch(() => ({ data: { totalApplications:0, clients:0, auditors:0, statusCounts:[], monthlyApps:[], recentApps:[] } })),
      axios.get('/api/applications').catch(() => ({ data: [] })),
      axios.get('/api/auditors').catch(() => ({ data: [] })),
    ]).then(([s, a, au]) => {
      const statsData = s.data || {};
      const appsData  = a.data || [];
      setStats({
        totalApplications: statsData.totalApplications || 0,
        clients:           statsData.clients           || 0,
        auditors:          statsData.auditors          || 0,
        statusCounts:      statsData.statusCounts      || [],
        monthlyApps:       statsData.monthlyApps       || [],
        recentApps:        statsData.recentApps        || [],
      });
      setApps(appsData);
      setAuditors(au.data || []);
      setFeedbacks(
        appsData.flatMap(app =>
          (app.feedbacks || []).map(f => ({ ...f, appId: app.applicationId, org: app.organizationName }))
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    }).catch(err => {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data. Please refresh.');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Layout title="Dashboard"><div className="loading-box"><div className="spinner"/></div></Layout>;

  if (error) return (
    <Layout title="Dashboard">
      <div style={{ padding: 32, textAlign: 'center' }}>
        <FiAlertCircle size={40} style={{ color: 'var(--red)', marginBottom: 12 }} />
        <h3 style={{ color: 'var(--text-1)', marginBottom: 8 }}>Dashboard Error</h3>
        <p style={{ color: 'var(--gray-400)', marginBottom: 16 }}>{error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    </Layout>
  );

  const certified    = (stats.statusCounts || []).find(s => s._id === 'certified')?.count || 0;
  const pending      = (stats.statusCounts || []).filter(s => ['submitted','under_review','audit_stage1','audit_stage2'].includes(s._id)).reduce((a, s) => a + s.count, 0);
  const compliance   = stats.totalApplications ? Math.round((certified / stats.totalApplications) * 100) : 0;
  const monthly      = (stats.monthlyApps || []).map(m => ({ name: MONTHS[(m._id?.month || 1) - 1], Apps: m.count }));
  const unassigned   = apps.filter(a => !a.assignedAuditor && ['submitted','under_review'].includes(a.status));
  const auditorList  = auditors.filter(a => a.role === 'auditor');
  const avgRating    = feedbacks.length ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : '—';

  const kpis = [
    { label: 'Total Applications', value: stats.totalApplications, icon: FiFileText,   color: 'orange', to: '/admin/qms/form-01' },
    { label: 'Active Clients',     value: stats.clients,           icon: FiUsers,       color: 'blue',   to: '/admin/users' },
    { label: 'Auditors',           value: auditorList.length,      icon: FiClipboard,   color: 'purple', to: '/admin/auditors' },
    { label: 'Certified',          value: certified,               icon: FiAward,       color: 'gold',   to: '/admin/applications' },
    { label: 'Pending Review',     value: pending,                 icon: FiClock,       color: 'amber',  to: '/admin/approval-pending' },
    { label: 'Compliance Rate',    value: `${compliance}%`,        icon: FiTrendingUp,  color: 'teal',   to: '/admin/reports' },
  ];


  return (
    <Layout title="Dashboard">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Here's everything happening today</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/leads')}><FiTarget size={14}/> Leads</button>
          <button className="btn btn-primary"   onClick={() => navigate('/admin/qms/form-01')}><FiPlus size={14}/> New Application</button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="welcome-card">
        <div className="wc-text" style={{ position:'relative', zIndex:1 }}>
          <h2>ISO Certification CRM</h2>
          <p>{apps.filter(a => a.status === 'submitted').length} new submissions · {unassigned.length} need auditor assignment</p>
        </div>
        <div className="wc-stats">
          {[
            { v: stats.totalApplications, l: 'Total Apps' },
            { v: certified,               l: 'Certified'  },
            { v: pending,                 l: 'Pending'    },
            { v: `${compliance}%`,        l: 'Compliance' },
          ].map((s, i) => (
            <div key={i} className="wc-stat">
              <div className="wc-stat-v">{s.v}</div>
              <div className="wc-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate(k.to)}>
            <div className={`kpi-icon ${k.color}`}><k.icon size={17}/></div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>


      {/* Monthly Chart */}
      <div className="card" style={{ marginBottom:18 }}>
        <div className="card-hdr">
          <div className="card-title"><FiTrendingUp size={14} style={{ color:'var(--primary)' }}/>Monthly Applications</div>
        </div>
        <div style={{ padding:'12px 8px 8px' }}>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={185}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1565c0" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#1565c0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3f2fd"/>
                <XAxis dataKey="name" tick={{ fontSize:10 }}/>
                <YAxis tick={{ fontSize:10 }}/>
                <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #90caf9', fontSize:12 }}/>
                <Area type="monotone" dataKey="Apps" stroke="#1565c0" fill="url(#ag)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-box" style={{ height:185, padding:0 }}>
              <FiTrendingUp size={28}/><h3>No data yet</h3>
            </div>
          )}
        </div>
      </div>

      {/* Status Chart + Feedback */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        <div className="card" style={{ marginBottom:0 }}>
          <div className="card-hdr"><div className="card-title"><FiActivity size={14} style={{ color:'var(--primary)' }}/>Application Status Overview</div></div>
          <div style={{ padding:'12px 8px 8px' }}>
            {(stats.statusCounts || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={(stats.statusCounts || []).map(s => ({ name: s._id.replace(/_/g,' '), count: s.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3f2fd"/>
                  <XAxis dataKey="name" tick={{ fontSize:9 }}/>
                  <YAxis tick={{ fontSize:10 }}/>
                  <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #90caf9', fontSize:12 }}/>
                  <Bar dataKey="count" fill="#1565c0" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-box" style={{ height:170, padding:0 }}><FiActivity size={28}/><h3>No data yet</h3></div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom:0 }}>
          <div className="card-hdr">
            <div className="card-title">
              <FiMessageSquare size={14} style={{ color:'var(--primary)' }}/>Client Feedback
              <span style={{ fontSize:11, fontWeight:500, color:'var(--gray-400)', marginLeft:6 }}>{feedbacks.length} · avg {avgRating}⭐</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/feedback')}>All <FiChevronRight size={11}/></button>
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {feedbacks.length === 0 ? (
              <div className="empty-box" style={{ padding:'24px 20px' }}><FiMessageSquare size={28}/><h3>No feedback yet</h3></div>
            ) : feedbacks.slice(0, 4).map((f, i) => (
              <div key={i} style={{ padding:'11px 16px', borderBottom:'1px solid var(--primary-50)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div style={{ fontWeight:600, fontSize:12.5 }}>{f.org}</div>
                  <div style={{ display:'flex', gap:1 }}>
                    {[1,2,3,4,5].map(s => <FiStar key={s} size={10} fill={s <= (f.rating || 0) ? '#f59e0b' : 'none'} stroke="#f59e0b"/>)}
                  </div>
                </div>
                <div style={{ fontSize:12, color:'var(--gray-600)', lineHeight:1.4 }}>{f.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </Layout>
  );
}
