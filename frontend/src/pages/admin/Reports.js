import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import {
  FiTrendingUp, FiDownload, FiFileText, FiUsers, FiClipboard,
  FiAward, FiClock, FiXCircle, FiBarChart2, FiPieChart,
  FiAlertCircle, FiCheckCircle, FiDatabase, FiFilter
} from 'react-icons/fi';
import { MdOutlineAnalytics } from 'react-icons/md';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SC = { draft:'#9ca3af', submitted:'#3b82f6', under_review:'#f59e0b', audit_stage1:'#8b5cf6', audit_stage2:'#a855f7', approved:'#22c55e', certified:'#16a34a', rejected:'#ef4444' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #fed7aa', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(249,115,22,.1)', fontSize:12 }}>
      <div style={{ fontWeight:700, color:'#431407', marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

const TABS = [
  { id:'overview',  label:'Overview',  icon: MdOutlineAnalytics },
  { id:'auditor',   label:'Auditor',   icon: FiClipboard        },
  { id:'reviewer',  label:'Reviewer',  icon: FiUsers            },
  { id:'export',    label:'Export',    icon: FiDownload         },
];

export default function AdminReports() {
  const [stats, setStats]       = useState(null);
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([axios.get('/api/dashboard/stats'), axios.get('/api/applications')])
      .then(([s,a]) => { setStats(s.data); setApps(a.data||[]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Analytics"><div className="loading-box"><div className="spinner"/></div></Layout>;

  const certified  = (stats?.statusCounts||[]).find(s=>s._id==='certified')?.count ?? 0;
  const rejected   = (stats?.statusCounts||[]).find(s=>s._id==='rejected')?.count ?? 0;
  const pending    = (stats?.statusCounts||[]).filter(s=>['submitted','under_review','audit_stage1','audit_stage2'].includes(s._id)).reduce((a,s)=>a+s.count,0);
  const pie        = (stats?.statusCounts||[]).map(s => ({ name:s._id?.replace(/_/g,' '), value:s.count, fill:SC[s._id]||'#9ca3af' }));
  const monthly    = (stats?.monthlyApps||[]).map(m => ({ name:MONTHS[(m._id.month||1)-1], Apps:m.count }));
  const byStd      = apps.reduce((a,ap) => { if(ap.isoStandard) a[ap.isoStandard]=(a[ap.isoStandard]||0)+1; return a; }, {});
  const stdData    = Object.entries(byStd).map(([n,c]) => ({n,c})).sort((a,b)=>b.c-a.c);
  const auditorApps  = apps.filter(a => a.assignedAuditor);
  const reviewerApps = apps.filter(a => a.assignedReviewer);

  const kpis = [
    { l:'Total',       v: stats?.totalApplications??0, c:'orange', icon: FiBarChart2,    iconColor:'#f97316' },
    { l:'Certified',   v: certified,                   c:'gold',   icon: FiAward,        iconColor:'#d97706' },
    { l:'In Progress', v: pending,                     c:'blue',   icon: FiClock,        iconColor:'#3b82f6' },
    { l:'Rejected',    v: rejected,                    c:'red',    icon: FiXCircle,      iconColor:'#ef4444' },
  ];

  const exportCSV = () => {
    const rows = [
      ['Client ID','Organization','Client','Standard','Status','Auditor','Reviewer','Issue Date'],
      ...apps.map(a => [
        a.client?.clientId||'', a.organizationName, a.client?.name||'',
        a.isoStandard, a.status, a.assignedAuditor?.name||'',
        a.assignedReviewer?.name||'', a.submittedAt?new Date(a.submittedAt).toLocaleDateString():''
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a'); el.href=url; el.download='applications-export.csv'; el.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
  };

  const exportCards = [
    {
      title: 'All Applications',
      desc:  'Complete export with all fields',
      icon:  FiDatabase,
      color: '#3b82f6', bg: '#dbeafe',
      action: exportCSV,
    },
    {
      title: 'Certified Only',
      desc:  'Export certified applications',
      icon:  FiAward,
      color: '#d97706', bg: '#fef3c7',
      action: () => {
        const filtered = apps.filter(a=>a.status==='certified');
        const rows=[['Client ID','Org','Standard','Cert Date'],...filtered.map(a=>[a.client?.clientId||'',a.organizationName,a.isoStandard,a.updatedAt?new Date(a.updatedAt).toLocaleDateString():''])];
        const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
        const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download='certified.csv';el.click();
        toast.success('Certified export done!');
      },
    },
    {
      title: 'Pending Applications',
      desc:  'Export pending / in-progress',
      icon:  FiClock,
      color: '#7c3aed', bg: '#ede9fe',
      action: () => {
        const filtered=apps.filter(a=>['submitted','under_review','audit_stage1','audit_stage2'].includes(a.status));
        const rows=[['Client ID','Org','Status','Auditor'],...filtered.map(a=>[a.client?.clientId||'',a.organizationName,a.status,a.assignedAuditor?.name||''])];
        const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
        const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download='pending.csv';el.click();
        toast.success('Pending export done!');
      },
    },
  ];

  return (
    <Layout title="Analytics & Reports">

      {/* Page Header */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">Performance overview across all certifications</p>
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>
          <FiDownload size={14} style={{ marginRight:6 }}/> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item ${activeTab===t.id ? 'on' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            <t.icon size={13}/>
            {t.label}
            {t.id==='auditor'  && <span style={{ fontSize:11, opacity:.7 }}>({auditorApps.length})</span>}
            {t.id==='reviewer' && <span style={{ fontSize:11, opacity:.7 }}>({reviewerApps.length})</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (<>

        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpis.map((k,i) => (
            <div key={i} className={`kpi-card ${k.c}`}>
              <div className={`kpi-icon ${k.c}`}>
                <k.icon size={18} color={k.iconColor}/>
              </div>
              <div className="kpi-value">{k.v}</div>
              <div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="dash-grid two" style={{ marginBottom:20 }}>
          <div className="card">
            <div className="card-hdr">
              <div className="card-title">
                <FiTrendingUp size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
                Monthly Volume
              </div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffedd5" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:'#c2410c'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#c2410c'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="Apps" stroke="#f97316" strokeWidth={2.5} fill="url(#ag)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-hdr">
              <div className="card-title">
                <FiPieChart size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
                Status Distribution
              </div>
            </div>
            <div className="card-body">
              {pie.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={42}>
                      {pie.map((e,i) => <Cell key={i} fill={e.fill}/>)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:10,border:'1px solid #fed7aa',fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-box">
                  <FiPieChart size={28}/>
                  <p>No data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ISO Standard Breakdown */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <FiFilter size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
              Applications by ISO Standard
            </div>
          </div>
          <div className="card-body">
            {stdData.length === 0 ? (
              <div className="empty-box">
                <FiAlertCircle size={28}/>
                <p>No data</p>
              </div>
            ) : stdData.map((s,i) => (
              <div key={i} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13.5, fontWeight:600 }}>{s.n}</span>
                  <span style={{ fontSize:13, color:'var(--primary)', fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>{s.c}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width:`${(s.c/(stats?.totalApplications||1))*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

      </>)}

      {/* ── AUDITOR TAB ── */}
      {activeTab === 'auditor' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <FiClipboard size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
              Auditor Reports
            </div>
          </div>
          {auditorApps.length === 0 ? (
            <div className="empty-box" style={{ padding:60 }}>
              <FiClipboard size={48}/>
              <h3>No auditor reports</h3>
              <p>Applications with assigned auditors will appear here</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th><FiFileText size={11} style={{ marginRight:5 }}/>Client ID</th>
                    <th>Organization</th>
                    <th><FiClipboard size={11} style={{ marginRight:5 }}/>Auditor</th>
                    <th>Stage</th>
                    <th>Notes</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorApps.map((app,i) => (
                    <tr key={i}>
                      <td><span className="mono">{app.client?.clientId || '—'}</span></td>
                      <td style={{ fontWeight:600 }}>{app.organizationName}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar" style={{ width:26, height:26, fontSize:10 }}>{app.assignedAuditor?.name?.[0]}</div>
                          <span style={{ fontSize:13 }}>{app.assignedAuditor?.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span></td>
                      <td style={{ maxWidth:300, fontSize:12.5, color:'var(--gray-600)' }}>
                        {app.auditNotes || <span style={{ color:'var(--primary-200)' }}>No notes yet</span>}
                      </td>
                      <td style={{ fontSize:12, color:'var(--primary-light)' }}>
                        {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWER TAB ── */}
      {activeTab === 'reviewer' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <FiUsers size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
              Reviewer Reports
            </div>
          </div>
          {reviewerApps.length === 0 ? (
            <div className="empty-box" style={{ padding:60 }}>
              <FiUsers size={48}/>
              <h3>No reviewer reports</h3>
              <p>Applications with assigned reviewers will appear here</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th><FiFileText size={11} style={{ marginRight:5 }}/>Client ID</th>
                    <th>Organization</th>
                    <th><FiUsers size={11} style={{ marginRight:5 }}/>Reviewer</th>
                    <th>Status</th>
                    <th>Review Notes</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewerApps.map((app,i) => (
                    <tr key={i}>
                      <td><span className="mono">{app.client?.clientId || '—'}</span></td>
                      <td style={{ fontWeight:600 }}>{app.organizationName}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar avatar-amber" style={{ width:26, height:26, fontSize:10 }}>{app.assignedReviewer?.name?.[0]}</div>
                          <span style={{ fontSize:13 }}>{app.assignedReviewer?.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span></td>
                      <td style={{ maxWidth:300, fontSize:12.5, color:'var(--gray-600)' }}>
                        {app.reviewNotes || <span style={{ color:'var(--primary-200)' }}>No notes yet</span>}
                      </td>
                      <td style={{ fontSize:12, color:'var(--primary-light)' }}>
                        {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT TAB ── */}
      {activeTab === 'export' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <FiDownload size={14} style={{ color:'var(--primary)', marginRight:6 }}/>
              Export Data
            </div>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
              {exportCards.map((item,i) => (
                <div
                  key={i}
                  onClick={item.action}
                  style={{
                    display:'flex', alignItems:'center', gap:14, padding:'18px 20px',
                    background:'white', borderRadius:12, border:`1.5px solid ${item.color}25`,
                    cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 4px 16px ${item.color}22`; e.currentTarget.style.borderColor=item.color+'60'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor=item.color+'25'; }}
                >
                  <div style={{
                    width:44, height:44, borderRadius:10, background:item.bg,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    <item.icon size={20} color={item.color}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1)' }}>{item.title}</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:3 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
