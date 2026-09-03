import React,{useState,useEffect}from 'react';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import{FileText,Download,Eye,Upload,Award}from 'lucide-react';

// Only these two document types are uploadable / shown for clients
const CLIENT_DOCS=[
  {label:'Identity Proof',key:'proofId',hint:'Identity / address proof (PDF or image)'},
  {label:'Agreement Form',key:'agreement',hint:'Signed agreement document'},
];

export function ClientDocuments(){
  const[apps,setApps]=useState([]);
  const[loading,setLoading]=useState(true);
  const[uploading,setUploading]=useState('');// `${appId}:${key}` currently uploading

  const load=()=>{
    axios.get('/api/applications').then(r=>setApps(r.data||[])).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const handleUpload=async(appId,docType,file)=>{
    if(!file)return;
    const key=`${appId}:${docType}`;
    if(uploading===key)return;
    setUploading(key);
    try{
      const fd=new FormData();
      fd.append('document',file);
      fd.append('docType',docType);
      await axios.post(`/api/applications/${appId}/upload`,fd);
      toast.success('Document uploaded');
      load();
    }catch(e){
      toast.error(e?.response?.data?.message||'Upload failed');
    }finally{ setUploading(''); }
  };

  return(
    <Layout title="Documents & Forms">
      <div className="page-hdr"><div><h1 className="page-title">Documents & Forms</h1><p className="page-subtitle">Upload your Proof ID and Agreement Form</p></div></div>
      {loading?<div className="loading-box"><div className="spinner"/></div>:apps.length===0?<div className="empty-box"><FileText size={40}/><h3>No documents yet</h3><p>Submit an application to upload documents here</p></div>:(
        apps.map(app=>(
          <div key={app._id} className="card" style={{marginBottom:16}}>
            <div className="card-hdr">
              <div className="card-title"><span className="mono">{app.client?.clientId || '—'}</span> — {app.organizationName}</div>
              <span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span>
            </div>
            <div className="card-body">
              {CLIENT_DOCS.map(doc=>{
                const url=app[doc.key];
                const busy=uploading===`${app._id}:${doc.key}`;
                return(
                  <div key={doc.key} className="doc-row">
                    <div className="doc-row-info">
                      <FileText size={18} style={{color:url?'var(--primary)':'var(--gray-300)',flexShrink:0}}/>
                      <div><div className="doc-row-name">{doc.label}</div><div className="doc-row-meta">{url?'✓ Uploaded':doc.hint}</div></div>
                    </div>
                    <div className="doc-row-actions">
                      {url&&<><a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Eye size={12}/>Preview</a><a href={url} download className="btn btn-success btn-sm"><Download size={12}/>Download</a></>}
                      <label className="btn btn-primary btn-sm" style={{cursor:busy?'not-allowed':'pointer',opacity:busy?0.6:1}}>
                        <Upload size={12}/>{busy?'Uploading…':url?'Replace':'Upload'}
                        <input type="file" hidden disabled={busy} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={e=>{handleUpload(app._id,doc.key,e.target.files[0]);e.target.value='';}}/>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}
export function ClientCertificates(){
  const[apps,setApps]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{axios.get('/api/applications').then(r=>setApps((r.data||[]).filter(a=>a.status==='certified'))).finally(()=>setLoading(false));},[]);
  return(
    <Layout title="My Certificates">
      <div className="page-hdr"><div><h1 className="page-title">My Certificates</h1><p className="page-subtitle">Your ISO certifications</p></div></div>
      {loading?<div className="loading-box"><div className="spinner"/></div>:apps.length===0?
        <div className="empty-box" style={{paddingTop:80}}><Award size={56} style={{color:'var(--gray-200)'}}/><h3>No certificates yet</h3><p>Certificates appear here once your application is certified</p></div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
          {apps.map(app=>(
            <div key={app._id} style={{background:'white',border:'1px solid var(--primary-100)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-sm)',transition:'all .2s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow-sm)'}>
              <div style={{background:'linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%)',padding:'20px 22px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <span style={{fontSize:32}}>🏆</span>
                  <span style={{background:'rgba(255,255,255,0.2)',color:'white',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,border:'1px solid rgba(255,255,255,.3)'}}>CERTIFIED</span>
                </div>
                <div style={{marginTop:12,color:'white'}}>
                  <div style={{fontSize:17,fontWeight:800,marginBottom:3}}>{app.organizationName}</div>
                  <div style={{fontSize:13,opacity:.8}}>{app.isoStandard}</div>
                </div>
              </div>
              <div style={{padding:'16px 20px'}}>
                {app.scope&&<div style={{fontSize:12.5,color:'var(--gray-500)',marginBottom:10,lineHeight:1.5}}>Scope: {app.scope}</div>}
                <div style={{display:'flex',gap:16,fontSize:12,color:'var(--gray-400)',marginBottom:14}}>
                  {app.certificateIssueDate&&<span>Issued: {new Date(app.certificateIssueDate).toLocaleDateString()}</span>}
                  {app.certificateExpiryDate&&<span style={{color:'var(--amber)',fontWeight:600}}>Expires: {new Date(app.certificateExpiryDate).toLocaleDateString()}</span>}
                </div>
                {app.certificate?<div style={{display:'flex',gap:8}}>
                  <a href={app.certificate} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:'center'}}><Eye size={12}/>View</a>
                  <a href={app.certificate} download className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}><Download size={12}/>Download</a>
                </div>:<div style={{fontSize:12,color:'var(--gray-400)',textAlign:'center',padding:'8px 0'}}>Certificate file not available</div>}
              </div>
            </div>
          ))}
        </div>
      }
    </Layout>
  );
}
export default ClientDocuments;
