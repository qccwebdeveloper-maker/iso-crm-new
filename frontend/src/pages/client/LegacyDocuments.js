import React,{useState,useEffect}from 'react';
import{useParams,useNavigate,Link}from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import{FileText,Download,ExternalLink,Archive,X,MousePointerClick}from 'lucide-react';
import{legacyDocFileName,legacyDocDriveFileId}from '../../utils/legacyDocs';

const DOC_TYPE_LABELS={agreement:'Agreement',invoice:'Invoice',certificate:'Certificate',gstCertificate:'GST Certificate',udyamCertificate:'Udyam Registration',other:'Other'};
const IMAGE_EXT=/\.(jpe?g|png|gif|webp)$/i;
const PDF_EXT=/\.pdf$/i;

// Read-only view of the legacy record an admin migrated for this client (see
// backend/routes/oldClients.js GET /me). The sidebar (Layout.js) lists every
// document as its own clickable link — /client/legacy-documents/:docId opens
// that one file's content here; the bare route shows the full list.
export default function ClientLegacyDocuments(){
  const{docId}=useParams();
  const navigate=useNavigate();
  const[client,setClient]=useState(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  useEffect(()=>{
    axios.get('/api/oldclients/me')
      .then(r=>setClient(r.data))
      .catch(err=>setError(err.response?.data?.message||'Could not load your documents'))
      .finally(()=>setLoading(false));
  },[]);

  if(loading)return<Layout title="My Documents"><div className="loading-box"><div className="spinner"/></div></Layout>;

  if(error||!client)return(
    <Layout title="My Documents">
      <div className="empty-box" style={{paddingTop:80}}>
        <Archive size={48} style={{color:'var(--gray-200)'}}/>
        <h3>No documents found</h3>
        <p>{error||'Nothing has been uploaded for your account yet.'}</p>
      </div>
    </Layout>
  );

  const docs=client.documents||[];

  if(docId){
    const doc=docs.find(d=>d._id===docId);
    if(!doc)return(
      <Layout title="My Documents">
        <div className="empty-box" style={{paddingTop:80}}>
          <FileText size={48} style={{color:'var(--gray-200)'}}/>
          <h3>Document not found</h3>
          <p>It may have been removed. <Link to="/client/legacy-documents">Back to all documents</Link></p>
        </div>
      </Layout>
    );

    const fileId=legacyDocDriveFileId(doc);
    const fileName=legacyDocFileName(doc);

    return(
      <Layout title={fileName}>
        <div className="page-hdr">
          <div><h1 className="page-title">{fileName}</h1><p className="page-subtitle">{DOC_TYPE_LABELS[doc.docType]||doc.docType}{doc.uploadedAt?` · Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`:''}</p></div>
          <div style={{display:'flex',gap:10}}>
            <a className="btn btn-primary" href={doc.path} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open in New Tab</a>
            <button className="btn btn-ghost" onClick={()=>navigate('/client/legacy-documents')}><X size={15}/>Close</button>
          </div>
        </div>

        <div className="card" style={{padding:20}}>
          {fileId ? (
            <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} title={fileName} width="100%" height="640" style={{border:'1px solid var(--gray-200)',borderRadius:8}} allow="autoplay"/>
          ) : IMAGE_EXT.test(fileName) ? (
            <img src={doc.path} alt={fileName} style={{maxWidth:'100%',borderRadius:8,border:'1px solid var(--gray-200)',display:'block',margin:'0 auto'}}/>
          ) : PDF_EXT.test(fileName) ? (
            <iframe src={doc.path} title={fileName} width="100%" height="640" style={{border:'1px solid var(--gray-200)',borderRadius:8}}/>
          ) : (
            <div className="empty-box" style={{padding:'44px 20px'}}>
              <FileText size={40} style={{color:'var(--primary-200)'}}/>
              <h3>Preview not available</h3>
              <p>This file type can't be previewed inline.</p>
              <a className="btn btn-primary" href={doc.path} target="_blank" rel="noreferrer" style={{marginTop:10}}><Download size={14}/>Download / View</a>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return(
    <Layout title="My Documents">
      <div className="empty-box" style={{paddingTop:120}}>
        <MousePointerClick size={48} style={{color:'var(--gray-200)'}}/>
        <h3>Select a document</h3>
        <p>Pick a file from the sidebar on the left to preview it here.</p>
      </div>
    </Layout>
  );
}
