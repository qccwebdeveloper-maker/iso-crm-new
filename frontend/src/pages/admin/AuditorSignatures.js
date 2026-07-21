import React,{useState,useEffect,useRef}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import toast from 'react-hot-toast';import{Plus,Edit,Trash2,PenTool,ArrowLeft,Search,Upload,X}from 'lucide-react';

const EMPTY_FORM={name:'',location:'',signatureUrl:''};

// Admin roster for auditor/technical-expert signatures. Add a name + signature
// image here once and every QMS form (e.g. F-03 Auditor Declaration) auto-fills
// that person's signature the moment their typed name matches an entry —
// see useAuditorSignatures.js. Images upload straight to S3 via
// POST /api/auditor-signatures/upload.
export default function AdminAuditorSignatures(){
  const[list,setList]=useState([]);const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(null); // null | 'add' | entry object being edited
  const[form,setForm]=useState(EMPTY_FORM);
  const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState(false);
  const[q,setQ]=useState('');
  const fileRef=useRef(null);

  const load=()=>{setLoading(true);axios.get('/api/auditor-signatures').then(r=>setList(r.data||[])).catch(()=>toast.error('Failed to load roster')).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const openAdd=()=>{setForm(EMPTY_FORM);setModal('add');};
  const openEdit=entry=>{setForm({name:entry.name,location:entry.location||'',signatureUrl:entry.signatureUrl||''});setModal(entry);};

  const handleFile=async e=>{
    const file=e.target.files&&e.target.files[0];e.target.value='';
    if(!file)return;
    setUploading(true);
    try{
      const fd=new FormData();fd.append('signature',file);
      const{data}=await axios.post('/api/auditor-signatures/upload',fd,{headers:{'Content-Type':'multipart/form-data'}});
      setForm(p=>({...p,signatureUrl:data.url}));
    }catch(err){toast.error(err.response?.data?.message||'Upload failed');}
    finally{setUploading(false);}
  };

  const save=async()=>{
    if(!form.name.trim())return toast.error('Name is required');
    setSaving(true);
    try{
      // The backend upserts by name (lowercased), not by id — if an existing
      // entry's name was changed, recreate it under the new name instead of
      // leaving a stale duplicate behind under the old one.
      if(modal&&modal!=='add'&&modal.name.trim().toLowerCase()!==form.name.trim().toLowerCase()){
        await axios.delete(`/api/auditor-signatures/${modal._id}`);
      }
      await axios.post('/api/auditor-signatures',form);
      toast.success(modal==='add'?'Added':'Updated');
      setModal(null);load();
    }catch(err){toast.error(err.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  const del=async id=>{
    if(!window.confirm('Delete this auditor\'s signature from the roster?'))return;
    try{await axios.delete(`/api/auditor-signatures/${id}`);toast.success('Deleted');load();}
    catch{toast.error('Failed');}
  };

  const filtered=list.filter(a=>{
    const s=q.trim().toLowerCase();
    if(!s)return true;
    return a.name?.toLowerCase().includes(s)||a.location?.toLowerCase().includes(s);
  });

  // ── Full-page Add / Edit form ──
  if(modal){
    return(<Layout title={modal==='add'?'Add Auditor Signature':'Edit Auditor Signature'}>
      <div className="page-hdr">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setModal(null)}><ArrowLeft size={15}/>Back</button>
          <div><h1 className="page-title">{modal==='add'?'Add Auditor Signature':'Edit Auditor Signature'}</h1><p className="page-subtitle">Uploaded here goes straight to S3 and auto-fills on QMS forms wherever this name is typed</p></div>
        </div>
      </div>
      <div className="card" style={{width:'100%',maxWidth:520,padding:24}}>
        <div className="form-group"><label className="form-label">Auditor / Technical Expert Name *</label><input className="form-control" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Avinash Vasant Sansare"/></div>
        <div className="form-group"><label className="form-label">Location</label><input className="form-control" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="e.g. Mumbai"/></div>
        <div className="form-group">
          <label className="form-label">Signature Image</label>
          {form.signatureUrl?(
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <img src={form.signatureUrl} alt="Signature" style={{height:60,maxWidth:220,objectFit:'contain',border:'1px solid var(--gray-200)',borderRadius:6,background:'white',padding:4}}/>
              <button type="button" className="btn btn-ghost btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}><Upload size={13}/>Replace</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setForm(p=>({...p,signatureUrl:''}))}><X size={13}/>Remove</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={handleFile} disabled={uploading} style={{display:'none'}} />
            </div>
          ):(
            <label className="qms-dyn-inp" style={{display:'inline-flex',alignItems:'center',gap:6,cursor:uploading?'default':'pointer',padding:'10px 16px',color:'var(--gray-500)',fontSize:13,border:'1px dashed var(--gray-300)',borderRadius:8}}>
              {uploading?'Uploading…':<><Upload size={13}/> Upload PNG/JPG</>}
              <input type="file" accept="image/png,image/jpeg" onChange={handleFile} disabled={uploading} style={{display:'none'}} />
            </label>
          )}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,borderTop:'1px solid var(--gray-100)',paddingTop:18}}>
          <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving||uploading}>{saving?'Saving…':modal==='add'?<><Plus size={14}/>Create</>:<><Edit size={14}/>Save</>}</button>
        </div>
      </div>
    </Layout>);
  }

  // ── List view ──
  return(<Layout title="Auditor Signatures">
    <div className="page-hdr">
      <div><h1 className="page-title">Auditor Signatures</h1><p className="page-subtitle">{list.length} in roster — used to auto-fill signatures on QMS forms by name</p></div>
      <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/>Add Signature</button>
    </div>
    <div className="card" style={{marginBottom:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
      <Search size={14} style={{color:'var(--gray-400)'}}/>
      <input className="form-control" style={{border:'none',padding:'4px 0'}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or location…"/>
    </div>
    <div className="card">{loading?<div className="loading-box"><div className="spinner"/></div>:(
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>#</th><th>Signature</th><th>Name</th><th>Location</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((a,i)=>(<tr key={a._id}>
          <td style={{color:'var(--gray-400)',fontSize:12}}>{i+1}</td>
          <td>{a.signatureUrl
            ?<img src={a.signatureUrl} alt={a.name} style={{height:36,maxWidth:120,objectFit:'contain',background:'white',border:'1px solid var(--gray-200)',borderRadius:4}}/>
            :<span style={{fontSize:12,color:'var(--gray-400)',fontStyle:'italic'}}>No signature</span>}</td>
          <td><div style={{display:'flex',alignItems:'center',gap:8}}><PenTool size={13} style={{color:'var(--primary)'}}/><strong>{a.name}</strong></div></td>
          <td>{a.location||<span style={{color:'var(--gray-300)'}}>—</span>}</td>
          <td><div className="tbl-actions">
            <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(a)}><Edit size={13}/>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={()=>del(a._id)}><Trash2 size={13}/>Delete</button>
          </div></td>
        </tr>))}
        {filtered.length===0&&<tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>{q?'No matches':'No signatures in the roster yet'}</td></tr>}
      </tbody></table></div>
    )}</div>
  </Layout>);
}
