import React,{useState,useEffect}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import toast from 'react-hot-toast';
import{ClipboardCheck,Star,Mail,Phone,MapPin,Plus,ArrowLeft,RefreshCw,Eye,EyeOff}from 'lucide-react';

function genPassword(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

export default function AdminAuditors(){
  const[people,setPeople]=useState([]);const[loading,setLoading]=useState(true);
  const[adding,setAdding]=useState(false);const[saving,setSaving]=useState(false);
  const[showPw,setShowPw]=useState(false);const[errors,setErrors]=useState({});
  const[form,setForm]=useState({name:'',email:'',password:'',phone:'',country:'',role:'auditor'});

  const load=()=>{setLoading(true);axios.get('/api/auditors').then(r=>setPeople(r.data||[])).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const aud=people.filter(p=>p.role==='auditor');const rev=people.filter(p=>p.role==='reviewer');

  const openAdd=()=>{setForm({name:'',email:'',password:genPassword(),phone:'',country:'',role:'auditor'});setErrors({});setShowPw(false);setAdding(true);};

  const validate=()=>{
    const e={};
    if(!form.name.trim())e.name='Name is required';
    if(!form.email.trim())e.email='Email is required';
    else if(!/\S+@\S+\.\S+/.test(form.email))e.email='Enter a valid email address';
    if(!form.password)e.password='Password is required';
    return e;
  };

  const save=async()=>{
    if(saving)return;
    const errs=validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    setErrors({});setSaving(true);
    try{
      await axios.post('/api/users',form);
      toast.success(`${form.role==='reviewer'?'Reviewer':'Auditor'} added`);
      setAdding(false);load();
    }catch(err){toast.error(err.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  const Card=({p})=>(
    <div style={{background:'white',border:'1px solid var(--primary-100)',borderRadius:14,padding:20,boxShadow:'var(--shadow-sm)',transition:'all .2s'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow-sm)'}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <div className="avatar avatar-lg">{p.name?.[0]?.toUpperCase()}</div>
        <div><div style={{fontWeight:700,fontSize:15,color:'var(--text-1)'}}>{p.name}</div><span className={`badge bdg-${p.role}`}>{p.role}</span></div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--gray-700)'}}><Mail size={13} style={{color:'var(--gray-400)'}}/>{p.email}</div>
        {p.phone&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--gray-700)'}}><Phone size={13} style={{color:'var(--gray-400)'}}/>{p.phone}</div>}
        {p.country&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--gray-700)'}}><MapPin size={13} style={{color:'var(--gray-400)'}}/>{p.country}</div>}
      </div>
      <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--primary-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,color:'var(--gray-400)'}}>Assigned</span>
        <span style={{fontWeight:700,fontFamily:'JetBrains Mono',fontSize:15,color:'var(--primary)'}}>{p.assignedApplications?.length||0}</span>
      </div>
    </div>
  );

  // ── Full-page Add Auditor form ──
  if(adding){
    return(
      <Layout title="Add Team Member">
        <div className="page-hdr">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}><ArrowLeft size={15}/> Back</button>
            <div><h1 className="page-title">Add Team Member</h1><p className="page-subtitle">Create a new auditor or reviewer account</p></div>
          </div>
        </div>
        <div className="card" style={{width:'100%',padding:24}}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className={`form-control${errors.name?' input-error':''}`} value={form.name} onChange={e=>{setForm(p=>({...p,name:e.target.value}));setErrors(p=>({...p,name:''}));}} placeholder="Auditor Name"/>
              {errors.name&&<span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className={`form-control${errors.email?' input-error':''}`} value={form.email} onChange={e=>{setForm(p=>({...p,email:e.target.value}));setErrors(p=>({...p,email:''}));}} placeholder="auditor@company.com"/>
              {errors.email&&<span className="field-error">{errors.email}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span>Password *</span>
                <button type="button" onClick={()=>setForm(p=>({...p,password:genPassword()}))}
                  style={{background:'none',border:'none',color:'#1565c0',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',gap:3,fontWeight:600}}>
                  <RefreshCw size={11}/> Generate
                </button>
              </label>
              <div style={{position:'relative'}}>
                <input type={showPw?'text':'password'} className={`form-control${errors.password?' input-error':''}`} value={form.password}
                  onChange={e=>{setForm(p=>({...p,password:e.target.value}));setErrors(p=>({...p,password:''}));}}
                  placeholder="Required" style={{paddingRight:36}}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9ca3af'}}>
                  {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
              {errors.password&&<span className="field-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 9000000000"/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                <option value="auditor">auditor</option>
                <option value="reviewer">reviewer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-control" value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))} placeholder="Country"/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,borderTop:'1px solid var(--gray-100)',paddingTop:18}}>
            <button className="btn btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':<><Plus size={14}/> Create</>}</button>
          </div>
        </div>
      </Layout>
    );
  }

  return(
    <Layout title="Auditors & Reviewers">
      <div className="page-hdr">
        <div><h1 className="page-title">Audit & Review Team</h1><p className="page-subtitle">{people.length} members</p></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Auditor</button>
      </div>
      {loading?<div className="loading-box"><div className="spinner"/></div>:(
        <>
          <div className="section-label" style={{display:'flex',alignItems:'center',gap:6}}><ClipboardCheck size={13}/> Auditors ({aud.length})</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16,marginBottom:32}}>
            {aud.map(p=><Card key={p._id} p={p}/>)}
            {aud.length===0&&<p style={{color:'var(--gray-400)',fontSize:13}}>No auditors yet — click “Add Auditor” to create one</p>}
          </div>
          <div className="section-label" style={{display:'flex',alignItems:'center',gap:6}}><Star size={13}/> Reviewers ({rev.length})</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {rev.map(p=><Card key={p._id} p={p}/>)}
            {rev.length===0&&<p style={{color:'var(--gray-400)',fontSize:13}}>No reviewers yet</p>}
          </div>
        </>
      )}
    </Layout>
  );
}
