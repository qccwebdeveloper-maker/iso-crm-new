import React,{useState,useEffect}from 'react';import axios from 'axios';import Layout from '../../components/common/Layout';import toast from 'react-hot-toast';import{Plus,Edit,Trash2,Search,ArrowLeft,Upload,FileText,Download,Archive,FolderOpen,Folder,ChevronRight,Link2,RefreshCw,Filter,Eye,EyeOff,KeyRound,Copy}from 'lucide-react';

const EMPTY_FORM={companyName:'',contactPerson:'',phone:'',email:'',address:'',isoStandard:'',gstNumber:'',udyamNumber:'',notes:''};
const DOC_TYPES=[{v:'agreement',l:'Agreement'},{v:'invoice',l:'Invoice'},{v:'certificate',l:'Certificate'},{v:'gstCertificate',l:'GST Certificate'},{v:'udyamCertificate',l:'Udyam Registration'},{v:'other',l:'Other'}];

// Legacy clients onboarded before this CRM existed — no User account or QMS
// cycle, just company details plus scanned paperwork (agreement, invoices,
// GST/Udyam certs) kept here for reference. See backend/routes/oldClients.js.
export default function AdminOldClients(){
  const[list,setList]=useState([]);const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(null); // null | 'add' | entry object being edited
  const[form,setForm]=useState(EMPTY_FORM);
  const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState(false);
  const[docType,setDocType]=useState('agreement');
  const[q,setQ]=useState('');
  const[showDrive,setShowDrive]=useState(false);const[driveLoading,setDriveLoading]=useState(false);
  const[driveEntries,setDriveEntries]=useState([]);const[driveStack,setDriveStack]=useState([]);
  const[attachingId,setAttachingId]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[filterType,setFilterType]=useState('all');
  const[creatingLogin,setCreatingLogin]=useState(false);
  const[bulkCreating,setBulkCreating]=useState(false);

  // Synced-from-Drive documents keep their source sub-folder in `name`, e.g.
  // "admin/5341.jpeg" or "Client/GST certificate.pdf" — mirror that grouping
  // in the UI instead of showing one flat list. Manually uploaded files (no
  // "/" in the name) fall into "Other".
  const GROUP_ORDER=['Admin','Client'];
  const docGroup=d=>{
    const name=d.name||'';
    if(!name.includes('/'))return'Other';
    const top=name.split('/')[0];
    const topLower=top.toLowerCase();
    if(topLower==='admin')return'Admin';
    if(topLower==='client')return'Client';
    return top;
  };
  const docFileName=d=>{
    const name=d.name||'';
    return name.includes('/')?name.split('/').slice(1).join('/'):(d.originalName||name);
  };
  // Drive-sourced documents (synced or attached from the Drive browser) carry
  // "drive:<fileId>" as publicId — only those can be previewed inline via
  // Google's embeddable /preview viewer; plain uploads just open their link.
  const driveFileId=d=>{
    if(d.publicId&&d.publicId.startsWith('drive:'))return d.publicId.slice(6);
    const m=(d.path||'').match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m?m[1]:null;
  };
  const[previewDocId,setPreviewDocId]=useState(null);

  const load=()=>{setLoading(true);axios.get('/api/oldclients').then(r=>setList(r.data||[])).catch(()=>toast.error('Failed to load old clients')).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const openAdd=()=>{setForm(EMPTY_FORM);setShowDrive(false);setPreviewDocId(null);setModal('add');};
  const openEdit=entry=>{setForm({companyName:entry.companyName||'',contactPerson:entry.contactPerson||'',phone:entry.phone||'',email:entry.email||'',address:entry.address||'',isoStandard:entry.isoStandard||'',gstNumber:entry.gstNumber||'',udyamNumber:entry.udyamNumber||'',notes:entry.notes||''});setShowDrive(false);setPreviewDocId(null);setModal(entry);};

  const save=async()=>{
    if(!form.companyName.trim())return toast.error('Company name is required');
    setSaving(true);
    try{
      if(modal==='add'){
        const{data}=await axios.post('/api/oldclients',form);
        toast.success('Old client added');
        setModal(data); // switch into edit mode so documents can be uploaded right away
      }else{
        const{data}=await axios.put(`/api/oldclients/${modal._id}`,form);
        toast.success('Updated');
        setModal(data);
      }
      load();
    }catch(err){toast.error(err.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  const del=async id=>{
    if(!window.confirm('Delete this old client and all its documents?'))return;
    try{await axios.delete(`/api/oldclients/${id}`);toast.success('Deleted');load();if(modal&&modal!=='add'&&modal._id===id)setModal(null);}
    catch{toast.error('Failed');}
  };

  const handleFile=async e=>{
    const file=e.target.files&&e.target.files[0];e.target.value='';
    if(!file||!modal||modal==='add')return;
    setUploading(true);
    try{
      const fd=new FormData();fd.append('document',file);fd.append('docType',docType);
      const{data}=await axios.post(`/api/oldclients/${modal._id}/upload`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      setModal(data);toast.success('Document uploaded');load();
    }catch(err){toast.error(err.response?.data?.message||'Upload failed');}
    finally{setUploading(false);}
  };

  const delDoc=async docId=>{
    if(!modal||modal==='add')return;
    if(!window.confirm('Remove this document?'))return;
    try{const{data}=await axios.delete(`/api/oldclients/${modal._id}/documents/${docId}`);setModal(data);toast.success('Document removed');load();}
    catch{toast.error('Failed');}
  };

  // ── Import documents straight from the legacy Google Drive tree ──
  // (one sub-folder per old client, e.g. 9026/9027/...) — see
  // GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID and backend/utils/googleDrive.js.
  const loadDrive=async folderId=>{
    setDriveLoading(true);
    try{
      const{data}=await axios.get('/api/oldclients/drive/browse',{params:folderId?{folderId}:{}});
      setDriveEntries(data.entries||[]);
    }catch(err){toast.error(err.response?.data?.message||'Could not load Google Drive folder');}
    finally{setDriveLoading(false);}
  };
  const openDrive=()=>{setShowDrive(true);setDriveStack([{id:null,name:'Old Clients (Drive)'}]);loadDrive(null);};
  const enterDriveFolder=entry=>{setDriveStack(p=>[...p,{id:entry.id,name:entry.name}]);loadDrive(entry.id);};
  const goToDriveCrumb=idx=>{const target=driveStack[idx];setDriveStack(driveStack.slice(0,idx+1));loadDrive(target.id);};
  const attachDriveFile=async entry=>{
    if(!modal||modal==='add')return;
    setAttachingId(entry.id);
    try{
      const{data}=await axios.post(`/api/oldclients/${modal._id}/import-drive-file`,{fileId:entry.id,name:entry.name,docType,viewUrl:entry.viewUrl});
      setModal(data);toast.success(`Attached "${entry.name}"`);load();
    }catch(err){toast.error(err.response?.data?.message||'Attach failed');}
    finally{setAttachingId(null);}
  };

  const syncDrive=async()=>{
    setSyncing(true);
    try{
      const{data}=await axios.post('/api/oldclients/drive/sync');
      toast.success(`Synced: ${data.clientsCreated} new client${data.clientsCreated===1?'':'s'}, ${data.filesAdded} file${data.filesAdded===1?'':'s'} added`);
      load();
    }catch(err){toast.error(err.response?.data?.message||'Drive sync failed');}
    finally{setSyncing(false);}
  };

  // ── Client logins — lets each legacy client sign in (Client ID + `${clientId}@1234`) and view their own documents ──
  const copyText=text=>{navigator.clipboard?.writeText(text).then(()=>toast.success('Copied')).catch(()=>{});};

  const createLogin=async()=>{
    if(!modal||modal==='add')return;
    setCreatingLogin(true);
    try{
      const{data}=await axios.post(`/api/oldclients/${modal._id}/create-login`);
      setModal(m=>({...m,clientId:data.user.clientId}));
      toast.success(data.created?`Login created — Client ID ${data.user.clientId}`:`Login already exists — Client ID ${data.user.clientId}`);
      load();
    }catch(err){toast.error(err.response?.data?.message||'Could not create login');}
    finally{setCreatingLogin(false);}
  };

  const bulkCreateLogins=async()=>{
    setBulkCreating(true);
    try{
      const{data}=await axios.post('/api/oldclients/create-logins-bulk');
      toast.success(`Created ${data.created} login${data.created===1?'':'s'} (${data.scanned} scanned)`);
      load();
    }catch(err){toast.error(err.response?.data?.message||'Could not create logins');}
    finally{setBulkCreating(false);}
  };

  const filtered=list.filter(c=>{
    const s=q.trim().toLowerCase();
    if(!s)return true;
    return c.companyName?.toLowerCase().includes(s)||c.contactPerson?.toLowerCase().includes(s)||c.email?.toLowerCase().includes(s)||c.phone?.toLowerCase().includes(s);
  });

  // ── Full-page Add / Edit form ──
  if(modal){
    const isEdit=modal!=='add';
    return(<Layout title={isEdit?'Edit Old Client':'Add Old Client'}>
      <div className="page-hdr">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setModal(null)}><ArrowLeft size={15}/>Back</button>
          <div><h1 className="page-title">{isEdit?'Edit Old Client':'Add Old Client'}</h1><p className="page-subtitle">{isEdit?'Update company details and manage documents':'Save the company first, then attach its documents'}</p></div>
        </div>
      </div>
      <div className="card" style={{width:'100%',padding:24,marginBottom:isEdit?20:0}}>
        <div className="form-group"><label className="form-label">Company Name *</label><input className="form-control" value={form.companyName} onChange={e=>setForm(p=>({...p,companyName:e.target.value}))} placeholder="e.g. TAP Engineering"/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="form-group"><label className="form-label">Contact Person</label><input className="form-control" value={form.contactPerson} onChange={e=>setForm(p=>({...p,contactPerson:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">ISO Standard</label><input className="form-control" value={form.isoStandard} onChange={e=>setForm(p=>({...p,isoStandard:e.target.value}))} placeholder="e.g. ISO 9001:2015"/></div>
          <div className="form-group"><label className="form-label">GST Number</label><input className="form-control" value={form.gstNumber} onChange={e=>setForm(p=>({...p,gstNumber:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Udyam Number</label><input className="form-control" value={form.udyamNumber} onChange={e=>setForm(p=>({...p,udyamNumber:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,borderTop:'1px solid var(--gray-100)',paddingTop:18}}>
          <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':isEdit?<><Edit size={14}/>Save</>:<><Plus size={14}/>Create</>}</button>
        </div>
      </div>

      {isEdit&&(<div className="card" style={{width:'100%',padding:24,marginBottom:20}}>
        <h3 style={{margin:'0 0 14px',fontSize:15,display:'flex',alignItems:'center',gap:8}}><KeyRound size={16} style={{color:'var(--primary)'}}/>Client Login</h3>
        {modal.clientId?(
          <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:20}}>
            <div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>Client ID</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}><span className="mono" style={{fontSize:15,fontWeight:700}}>{modal.clientId}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>copyText(modal.clientId)}><Copy size={12}/></button></div>
            </div>
            <div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>Password</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}><span className="mono" style={{fontSize:15,fontWeight:700}}>{modal.clientId}@1234</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>copyText(`${modal.clientId}@1234`)}><Copy size={12}/></button></div>
            </div>
            <span style={{fontSize:12,color:'var(--gray-400)'}}>The client can sign in from the Client Login tab with these credentials.</span>
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <p style={{fontSize:12,color:'var(--gray-400)',margin:0,flex:1}}>No login created yet — the client can't view these documents until one exists.</p>
            <button className="btn btn-primary btn-sm" onClick={createLogin} disabled={creatingLogin}>{creatingLogin?'Creating…':<><KeyRound size={13}/>Create Login</>}</button>
          </div>
        )}
      </div>)}

      {isEdit&&(<div className="card" style={{width:'100%',padding:24}}>
        <h3 style={{margin:'0 0 14px',fontSize:15,display:'flex',alignItems:'center',gap:8}}><Archive size={16} style={{color:'var(--primary)'}}/>Documents</h3>
        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
          <label style={{fontSize:12,color:'var(--gray-500)'}}>Upload as:</label>
          <select className="form-control" style={{maxWidth:220}} value={docType} onChange={e=>setDocType(e.target.value)}>
            {DOC_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <label className="btn btn-ghost btn-sm" style={{cursor:uploading?'default':'pointer'}}>
            {uploading?'Uploading…':<><Upload size={13}/>Upload File</>}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} disabled={uploading} style={{display:'none'}}/>
          </label>
          {!showDrive&&<button type="button" className="btn btn-ghost btn-sm" onClick={openDrive}><FolderOpen size={13}/>Import from Google Drive</button>}
        </div>

        {showDrive&&(<div style={{border:'1px solid var(--gray-200)',borderRadius:8,padding:14,marginBottom:16,background:'var(--gray-50)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:4,fontSize:12,color:'var(--gray-500)'}}>
              {driveStack.map((c,idx)=>(<span key={idx} style={{display:'flex',alignItems:'center',gap:4}}>
                {idx>0&&<ChevronRight size={11}/>}
                <button type="button" onClick={()=>goToDriveCrumb(idx)} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:idx===driveStack.length-1?'var(--gray-700)':'var(--primary)',fontWeight:idx===driveStack.length-1?600:400}}>{c.name}</button>
              </span>))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setShowDrive(false)}>Close</button>
          </div>
          {driveLoading?<div className="loading-box"><div className="spinner"/></div>:(
            driveEntries.length===0
              ?<p style={{fontSize:12,color:'var(--gray-400)',margin:0}}>This folder is empty.</p>
              :<div style={{display:'flex',flexDirection:'column',gap:4}}>
                {driveEntries.map(entry=>(<div key={entry.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:6,background:'white',border:'1px solid var(--gray-100)'}}>
                  {entry.type==='folder'
                    ?<button type="button" onClick={()=>enterDriveFolder(entry)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',padding:0,cursor:'pointer',flex:1,textAlign:'left'}}>
                        <Folder size={14} style={{color:'var(--primary)'}}/><span>{entry.name}</span>
                      </button>
                    :<span style={{display:'flex',alignItems:'center',gap:8,flex:1,fontSize:13}}><FileText size={14} style={{color:'var(--gray-400)'}}/>{entry.name}</span>}
                  {entry.type==='file'&&(<>
                    <a className="btn btn-ghost btn-sm" href={entry.viewUrl} target="_blank" rel="noreferrer"><Link2 size={12}/>Open</a>
                    <button type="button" className="btn btn-primary btn-sm" disabled={attachingId===entry.id} onClick={()=>attachDriveFile(entry)}>{attachingId===entry.id?'Attaching…':'Attach'}</button>
                  </>)}
                </div>))}
              </div>
          )}
        </div>)}

        {(modal.documents||[]).length>0&&(<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <Filter size={13} style={{color:'var(--gray-400)'}}/>
          <label style={{fontSize:12,color:'var(--gray-500)'}}>Filter by type:</label>
          <select className="form-control" style={{maxWidth:220}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {DOC_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>)}

        {(modal.documents||[]).length===0
          ?<p style={{fontSize:12,color:'var(--gray-400)'}}>No documents uploaded yet.</p>
          :(()=>{
              const docsFiltered=modal.documents.filter(d=>filterType==='all'||d.docType===filterType);
              if(docsFiltered.length===0)return<p style={{fontSize:12,color:'var(--gray-400)'}}>No documents match this filter.</p>;
              const groups={};
              docsFiltered.forEach(d=>{const g=docGroup(d);(groups[g]=groups[g]||[]).push(d);});
              const groupNames=Object.keys(groups).sort((a,b)=>{
                const idx=n=>GROUP_ORDER.indexOf(n);
                const ai=idx(a),bi=idx(b);
                if(ai!==-1||bi!==-1)return(ai===-1?99:ai)-(bi===-1?99:bi);
                if(a==='Other')return 1;if(b==='Other')return -1;
                return a.localeCompare(b);
              });
              return groupNames.map(g=>(<div key={g} style={{marginBottom:20}}>
                <h4 style={{margin:'0 0 8px',fontSize:13,display:'flex',alignItems:'center',gap:6,color:'var(--gray-600)'}}><Folder size={13} style={{color:'var(--primary)'}}/>{g} <span style={{color:'var(--gray-400)',fontWeight:400}}>({groups[g].length})</span></h4>
                <div className="tbl-wrap"><table className="tbl"><thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>
                  {groups[g].map(d=>{const fileId=driveFileId(d);const isOpen=previewDocId===d._id;return(<React.Fragment key={d._id}><tr>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><FileText size={13} style={{color:'var(--primary)'}}/>{docFileName(d)}</div></td>
                    <td><span className="badge bdg-info">{DOC_TYPES.find(t=>t.v===d.docType)?.l||d.docType}</span></td>
                    <td style={{fontSize:12,color:'var(--gray-400)'}}>{d.uploadedAt?new Date(d.uploadedAt).toLocaleDateString():'—'}</td>
                    <td><div className="tbl-actions">
                      {fileId
                        ?<button type="button" className="btn btn-ghost btn-sm" onClick={()=>setPreviewDocId(isOpen?null:d._id)}>{isOpen?<><EyeOff size={13}/>Hide</>:<><Eye size={13}/>Preview</>}</button>
                        :<a className="btn btn-ghost btn-sm" href={d.path} target="_blank" rel="noreferrer"><Download size={13}/>View</a>}
                      <button className="btn btn-danger btn-sm" onClick={()=>delDoc(d._id)}><Trash2 size={13}/>Remove</button>
                    </div></td>
                  </tr>
                  {isOpen&&fileId&&<tr><td colSpan={4} style={{padding:'0 0 14px'}}>
                    <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} title={docFileName(d)} width="100%" height="480" style={{border:'1px solid var(--gray-200)',borderRadius:8}} allow="autoplay"/>
                  </td></tr>}
                  </React.Fragment>);})}
                </tbody></table></div>
              </div>));
            })()}
      </div>)}
    </Layout>);
  }

  // ── List view ──
  return(<Layout title="Old Clients">
    <div className="page-hdr">
      <div><h1 className="page-title">Old Clients</h1><p className="page-subtitle">{list.length} legacy client{list.length===1?'':'s'} — onboarded before this CRM, kept for records</p></div>
      <div style={{display:'flex',gap:10}}>
        <button className="btn btn-ghost" onClick={bulkCreateLogins} disabled={bulkCreating}><KeyRound size={14}/>{bulkCreating?'Creating…':'Create Logins for All'}</button>
        <button className="btn btn-ghost" onClick={syncDrive} disabled={syncing}><RefreshCw size={14}/>{syncing?'Syncing…':'Sync from Google Drive'}</button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/>Add Old Client</button>
      </div>
    </div>
    <div className="card" style={{marginBottom:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
      <Search size={14} style={{color:'var(--gray-400)'}}/>
      <input className="form-control" style={{border:'none',padding:'4px 0'}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by company, contact, email or phone…"/>
    </div>
    <div className="card">{loading?<div className="loading-box"><div className="spinner"/></div>:(
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>#</th><th>Company</th><th>Contact</th><th>Standard</th><th>Login</th><th>Documents</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((c,i)=>(<tr key={c._id}>
          <td style={{color:'var(--gray-400)',fontSize:12}}>{i+1}</td>
          <td><strong>{c.companyName}</strong></td>
          <td>{c.contactPerson||<span style={{color:'var(--gray-300)'}}>—</span>}<div style={{fontSize:11,color:'var(--gray-400)'}}>{c.phone||c.email||''}</div></td>
          <td>{c.isoStandard||<span style={{color:'var(--gray-300)'}}>—</span>}</td>
          <td>{c.clientId?<span className="mono badge bdg-approved">{c.clientId}</span>:<span style={{color:'var(--gray-300)',fontSize:11}}>Not created</span>}</td>
          <td><span className="badge bdg-info">{(c.documents||[]).length}</span></td>
          <td><div className="tbl-actions">
            <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(c)}><Edit size={13}/>Open</button>
            <button className="btn btn-danger btn-sm" onClick={()=>del(c._id)}><Trash2 size={13}/>Delete</button>
          </div></td>
        </tr>))}
        {filtered.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>{q?'No matches':'No old clients added yet'}</td></tr>}
      </tbody></table></div>
    )}</div>
  </Layout>);
}
