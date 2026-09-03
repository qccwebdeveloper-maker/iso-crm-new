import React,{useState,useEffect}from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import{MessageSquare,Star}from 'lucide-react';

export default function ClientFeedback(){
  const[apps,setApps]=useState([]);const[loading,setLoading]=useState(true);
  const[form,setForm]=useState({appId:'',message:'',rating:5});const[saving,setSaving]=useState(false);
  useEffect(()=>{axios.get('/api/applications').then(r=>setApps(r.data||[])).finally(()=>setLoading(false));},[]);
  const submit=async(e)=>{
    e.preventDefault();
    if(saving)return;
    if(!form.appId)return toast.error('Select an application');
    if(!form.message.trim())return toast.error('Enter your feedback message');
    setSaving(true);
    try{await axios.post(`/api/applications/${form.appId}/feedback`,{message:form.message,rating:form.rating});toast.success('Feedback submitted!');setForm({appId:'',message:'',rating:5});}
    catch{toast.error('Failed to submit feedback');}finally{setSaving(false);}
  };
  return(
    <Layout title="Feedback">
      <div className="page-hdr"><div><h1 className="page-title">Submit Feedback</h1><p className="page-subtitle">Share your experience with the certification process</p></div></div>
      {loading?<div className="loading-box"><div className="spinner"/></div>:(
        <div className="card" style={{maxWidth:600}}>
          <div className="card-hdr"><div className="card-title"><MessageSquare size={16}/> New Feedback</div></div>
          <div className="card-body">
            <form onSubmit={submit}>
              <div className="form-group"><label className="form-label">Application *</label>
                <select className="form-control" value={form.appId} onChange={e=>setForm(p=>({...p,appId:e.target.value}))} required>
                  <option value="">Select Application</option>
                  {apps.map(a=><option key={a._id} value={a._id}>{(a.client?.clientId || '—')} — {a.organizationName}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Rating</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {[1,2,3,4,5].map(r=>(
                    <button key={r} type="button" onClick={()=>setForm(p=>({...p,rating:r}))}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:r<=form.rating?'#f59e0b':'#d1d5db'}}>
                      <Star size={24} fill={r<=form.rating?'#f59e0b':'none'} color={r<=form.rating?'#f59e0b':'#d1d5db'}/>
                    </button>
                  ))}
                  <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:4}}>{form.rating}/5</span>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Message *</label>
                <textarea className="form-control" rows={5} placeholder="Share your feedback about the certification process, auditor, or any suggestions…" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} required/>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Submitting…':'Submit Feedback'}</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
