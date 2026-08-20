import React,{useState,useEffect,useRef}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import toast from 'react-hot-toast';import{Send,Upload}from 'lucide-react';
export default function SendDocument({role}){
  const[apps,setApps]=useState([]);const[form,setForm]=useState({appId:'',docType:'document',message:'',file:null});const[saving,setSaving]=useState(false);
  // `saving` alone leaves a race window: two rapid clicks can both fire before React
  // re-renders the disabled button, sending the message twice. This ref is checked and
  // set synchronously, before any await, so a second click is always rejected in time.
  const sendingRef=useRef(false);
  const titles={client:'Send to Client',auditor:'Send to Auditor',reviewer:'Send to Reviewer'};
  useEffect(()=>{axios.get('/api/applications').then(r=>setApps(r.data||[]));}, []);
  const send=async()=>{if(sendingRef.current)return;if(!form.appId)return toast.error('Select an application');sendingRef.current=true;setSaving(true);try{const fd=new FormData();if(form.file)fd.append('document',form.file);fd.append('docType',form.docType);fd.append('message',form.message);fd.append('sendTo',role);await axios.post(`/api/applications/${form.appId}/send-document`,fd,{headers:{'Content-Type':'multipart/form-data'}});toast.success(`Document sent to ${role}`);setForm({appId:'',docType:'document',message:'',file:null});}catch{toast.error('Failed');}finally{sendingRef.current=false;setSaving(false);}};
  return(<Layout title={titles[role]||'Send Document'}>
    <div className="page-hdr"><div><h1 className="page-title">{titles[role]}</h1><p className="page-subtitle">Send documents and notifications</p></div></div>
    <div className="card"><div className="card-body">
      <div className="form-group"><label className="form-label">Select Application *</label><select className="form-control" value={form.appId} onChange={e=>setForm(p=>({...p,appId:e.target.value}))}><option value="">— Select Application —</option>{apps.map(a=><option key={a._id} value={a._id}>{a.applicationId} — {a.organizationName}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Document Type</label><select className="form-control" value={form.docType} onChange={e=>setForm(p=>({...p,docType:e.target.value}))}>{['applicationForm','agreement','auditReport','reviewReport','certificate','document'].map(t=><option key={t} value={t}>{t.replace(/([A-Z])/g,' $1')}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Upload Document (optional)</label><input type="file" className="form-control" onChange={e=>setForm(p=>({...p,file:e.target.files[0]}))} accept=".pdf,.doc,.docx,.jpg,.png"/></div>
      <div className="form-group"><label className="form-label">Message / Notes</label><textarea className="form-control" rows={3} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder={`Optional message for the ${role}…`}/></div>
      <button className="btn btn-primary" onClick={send} disabled={saving}>{saving?'Sending…':<><Send size={14}/>Send Document</>}</button>
    </div></div>
  </Layout>);}
