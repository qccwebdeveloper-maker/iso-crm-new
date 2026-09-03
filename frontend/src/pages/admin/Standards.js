import React,{useState,useEffect}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import toast from 'react-hot-toast';import{Plus,Edit,Trash2,BookOpen,ArrowLeft,GripVertical}from 'lucide-react';
export default function AdminStandards(){
  const[standards,setStandards]=useState([]);const[loading,setLoading]=useState(true);const[modal,setModal]=useState(null);const[saving,setSaving]=useState(false);const[form,setForm]=useState({name:'',clauses:[],active:true});const[dragIdx,setDragIdx]=useState(null);const[deletingId,setDeletingId]=useState(null);
  const load=()=>{setLoading(true);axios.get('/api/standards').then(r=>setStandards(r.data||[])).finally(()=>setLoading(false));};useEffect(load,[]);
  const addClause=()=>setForm(p=>({...p,clauses:[...(p.clauses||[]),{no:'',text:''}]}));
  const updClause=(i,k,v)=>setForm(p=>({...p,clauses:p.clauses.map((c,idx)=>idx===i?{...c,[k]:v}:c)}));
  const delClause=i=>setForm(p=>({...p,clauses:p.clauses.filter((_,idx)=>idx!==i)}));
  const moveClause=(from,to)=>{if(from===to||from==null||to==null)return;setForm(p=>{const arr=[...(p.clauses||[])];const[m]=arr.splice(from,1);arr.splice(to,0,m);return{...p,clauses:arr};});};
  const save=async()=>{if(saving)return;if(!form.name)return toast.error('Standard name required');const payload={...form,clauses:(form.clauses||[]).filter(c=>c.no||c.text)};setSaving(true);try{if(modal==='add')await axios.post('/api/standards',payload);else await axios.put(`/api/standards/${modal._id}`,payload);toast.success(modal==='add'?'Added':'Updated');setModal(null);load();}catch(e){toast.error(e.response?.data?.message||'Error');}finally{setSaving(false);}};
  const del=async id=>{if(deletingId)return;if(!window.confirm('Delete?'))return;setDeletingId(id);try{await axios.delete(`/api/standards/${id}`);toast.success('Deleted');load();}catch{toast.error('Failed');}finally{setDeletingId(null);}};

  // ── Full-page Add / Edit form ──
  if(modal){
    return(<Layout title={modal==='add'?'Add Standard':'Edit Standard'}>
      <div className="page-hdr">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setModal(null)}><ArrowLeft size={15}/>Back</button>
          <div><h1 className="page-title">{modal==='add'?'Add Standard':'Edit Standard'}</h1><p className="page-subtitle">{modal==='add'?'Create a new ISO standard and its clauses':'Update this ISO standard and its clauses'}</p></div>
        </div>
      </div>
      <div className="card" style={{width:'100%',padding:24}}>
        <div className="form-group"><label className="form-label">Standard Name *</label><input className="form-control" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. ISO 9001:2015"/></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-control" value={form.active?'1':'0'} onChange={e=>setForm(p=>({...p,active:e.target.value==='1'}))}><option value="1">Active</option><option value="0">Inactive</option></select></div>
        <div className="form-group">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><label className="form-label" style={{margin:0}}>Clauses</label><button type="button" className="btn btn-ghost btn-sm" onClick={addClause}><Plus size={13}/>Add Clause</button></div>
          {(form.clauses||[]).length===0&&<p style={{fontSize:12,color:'var(--gray-400)',margin:'4px 0'}}>No clauses added yet.</p>}
          {(form.clauses||[]).length>0&&<p style={{fontSize:11,color:'var(--gray-400)',margin:'0 0 8px'}}>Tip: drag the <GripVertical size={11} style={{verticalAlign:'middle'}}/> handle to reorder clauses.</p>}
          {(form.clauses||[]).map((c,i)=>(<div key={i}
            onDragOver={e=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==i){moveClause(dragIdx,i);setDragIdx(i);}}}
            onDrop={e=>{e.preventDefault();setDragIdx(null);}}
            style={{display:'flex',gap:8,marginBottom:8,alignItems:'center',borderRadius:6,
              transition:'opacity .18s ease, transform .18s ease, box-shadow .18s ease',
              ...(dragIdx===i?{opacity:.55,transform:'scale(1.015)',boxShadow:'0 4px 14px rgba(21,101,192,.18)',background:'var(--primary-50)'}:null)}}>
            <span draggable
              onDragStart={e=>{setDragIdx(i);e.dataTransfer.effectAllowed='move';}}
              onDragEnd={()=>setDragIdx(null)}
              title="Drag to reorder"
              style={{cursor:'grab',display:'flex',alignItems:'center',color:'var(--gray-400)',padding:'0 2px',touchAction:'none'}}><GripVertical size={16}/></span>
            <input className="form-control" style={{flex:'0 0 100px'}} value={c.no} onChange={e=>updClause(i,'no',e.target.value)} placeholder="No."/><input className="form-control" style={{flex:1}} value={c.text} onChange={e=>updClause(i,'text',e.target.value)} placeholder="Clause text"/><button type="button" className="btn btn-danger btn-sm" onClick={()=>delClause(i)}><Trash2 size={13}/></button></div>))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,borderTop:'1px solid var(--gray-100)',paddingTop:18}}>
          <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':modal==='add'?<><Plus size={14}/>Create</>:<><Edit size={14}/>Save</>}</button>
        </div>
      </div>
    </Layout>);
  }

  // ── List view ──
  return(<Layout title="ISO Standards">
    <div className="page-hdr"><div><h1 className="page-title">ISO Standards</h1><p className="page-subtitle">{standards.length} configured</p></div><button className="btn btn-primary" onClick={()=>{setForm({name:'',clauses:[],active:true});setModal('add');}}><Plus size={14}/>Add Standard</button></div>
    <div className="card">{loading?<div className="loading-box"><div className="spinner"/></div>:(<div className="tbl-wrap"><table className="tbl"><thead><tr><th>#</th><th>Name</th><th>Clauses</th><th>Status</th><th>Actions</th></tr></thead><tbody>{standards.map((s,i)=>(<tr key={s._id}><td style={{color:'var(--gray-400)',fontSize:12}}>{i+1}</td><td><div style={{display:'flex',alignItems:'center',gap:8}}><BookOpen size={13} style={{color:'var(--primary)'}}/><strong>{s.name}</strong></div></td><td><span className="badge bdg-info" style={{background:'var(--primary-50)',color:'var(--primary-dark)',border:'1px solid var(--primary-200)'}}>{(s.clauses||[]).length} clause{(s.clauses||[]).length===1?'':'s'}</span></td><td><span className={`badge bdg-${s.active?'certified':'rejected'}`}>{s.active?'Active':'Inactive'}</span></td><td><div className="tbl-actions"><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({name:s.name,clauses:s.clauses||[],active:s.active});setModal(s);}}><Edit size={13}/>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>del(s._id)} disabled={deletingId===s._id}>{deletingId===s._id?'Deleting…':<><Trash2 size={13}/>Delete</>}</button></div></td></tr>))}{standards.length===0&&<tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>No standards yet</td></tr>}</tbody></table></div>)}</div>
  </Layout>);
}
