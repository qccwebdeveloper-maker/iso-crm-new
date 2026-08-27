import React,{useState,useEffect}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import{FiDownload,FiEye,FiFileText}from 'react-icons/fi';
export default function AdminReports(){
  const[tab,setTab]=useState('auditor');const[reports,setReports]=useState([]);const[loading,setLoading]=useState(true);
  const TABS=[{id:'auditor',label:'Auditor to Admin'},{id:'client',label:'Client to Admin'},{id:'reviewer',label:'Reviewer to Admin'},{id:'clientDoc',label:'Client Document'}];
  const load=()=>{setLoading(true);axios.get('/api/reports').then(r=>setReports(Array.isArray(r.data)?r.data:[])).finally(()=>setLoading(false));};useEffect(load,[]);
  const filtered=reports.filter(r=>r.type===tab);
  return(<Layout title="Reports">
    <div className="page-hdr"><div><h1 className="page-title">Reports</h1><p className="page-subtitle">Incoming reports from all roles</p></div><button className="btn btn-secondary" onClick={()=>window.print()}><FiDownload size={14}/>Export</button></div>
    <div className="card"><div className="card-body">
      <div className="tabs-bar">{TABS.map(t=><button key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
      {loading?<div className="loading-box"><div className="spinner"/></div>:(<div className="tbl-wrap"><table className="tbl"><thead><tr><th>App ID</th><th>Organization</th><th>Submitted By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=>(<tr key={r._id}><td><span className="mono">{r.applicationId}</span></td><td style={{fontWeight:600}}>{r.organizationName}</td><td style={{fontSize:13}}>{r.submittedBy}</td><td style={{fontSize:12,color:'var(--gray-400)'}}>{r.createdAt?new Date(r.createdAt).toLocaleDateString():'—'}</td><td><span className={`badge ${r.status==='read'?'bdg-certified':'bdg-under_review'}`}>{r.status||'submitted'}</span></td><td><div className="tbl-actions"><button className="btn btn-ghost btn-sm"><FiEye size={13}/>View</button>{r.filePath&&<a href={r.filePath} download className="btn btn-secondary btn-sm"><FiDownload size={13}/>Download</a>}</div></td></tr>))}{filtered.length===0&&<tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>No reports in this category</td></tr>}</tbody></table></div>)}
    </div></div>
  </Layout>);}
