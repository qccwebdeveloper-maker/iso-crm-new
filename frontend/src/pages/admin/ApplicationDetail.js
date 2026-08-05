import React,{useState,useEffect}from 'react';
import{useParams,useNavigate,useSearchParams}from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import{ArrowLeft,Download,Upload,FileText,CheckCircle,Star,User,Building,Globe,Send,Edit2,Save,X}from 'lucide-react';
import { localMobileNumber } from '../../utils/phone';

/* ── constants (mirror NewApplication) ── */
const FL          = ['draft','submitted','under_review','audit_stage1','audit_stage2','approved','certified'];
const ISO_LIST    = ['ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 22000:2018','ISO 27001:2022','ISO/IEC 27701:2025','ISO/IEC 42001:2023','ISO 22301:2019','ISO 37001:2016','ISO 21001:2018'];
const APP_TYPES   = ['Initial','Surveillance','Re-certification','Un-Announced','Follow-up'];
const ACCRED      = ['USF','UASL'];
const EMP_ROWS    = ['Top Management','Production Area / Service','Quality Control / Technical','Administration','Other'];
const EMP_COLS    = ['Full Time','Part Time','Performing Same type of Job','Temporary Unskilled Workers','Effective No. Filled by QCC'];
const LOC_CONDS   = ['Special countermeasure area','Protection area of source water','Industrial complex','City'];
const COUNTRY_CODES = [
  {code:'+1',country:'US/Canada'},{code:'+7',country:'Russia'},{code:'+20',country:'Egypt'},
  {code:'+27',country:'South Africa'},{code:'+31',country:'Netherlands'},{code:'+33',country:'France'},
  {code:'+34',country:'Spain'},{code:'+39',country:'Italy'},{code:'+44',country:'UK'},
  {code:'+45',country:'Denmark'},{code:'+46',country:'Sweden'},{code:'+49',country:'Germany'},
  {code:'+52',country:'Mexico'},{code:'+55',country:'Brazil'},{code:'+60',country:'Malaysia'},
  {code:'+61',country:'Australia'},{code:'+62',country:'Indonesia'},{code:'+65',country:'Singapore'},
  {code:'+66',country:'Thailand'},{code:'+81',country:'Japan'},{code:'+82',country:'South Korea'},
  {code:'+86',country:'China'},{code:'+90',country:'Turkey'},{code:'+91',country:'India'},
  {code:'+92',country:'Pakistan'},{code:'+94',country:'Sri Lanka'},{code:'+234',country:'Nigeria'},
  {code:'+254',country:'Kenya'},{code:'+880',country:'Bangladesh'},{code:'+966',country:'Saudi Arabia'},
  {code:'+971',country:'UAE'},{code:'+974',country:'Qatar'},{code:'+977',country:'Nepal'},
];

const emptyEmpTable = () => EMP_ROWS.map(() => Array(EMP_COLS.length).fill(0));

/* ── tiny UI helpers ── */
const SectionHead = ({title}) => (
  <div style={{background:'var(--primary)',color:'white',padding:'9px 16px',borderRadius:8,fontWeight:700,fontSize:13,marginBottom:14,marginTop:10,letterSpacing:'.03em'}}>
    {title}
  </div>
);
const FG = ({label,required,children,full,hint}) => (
  <div className="form-group" style={full?{gridColumn:'1/-1'}:{}}>
    <label className="form-label">{label}{required&&<span style={{color:'var(--red)'}}> *</span>}{hint&&<span style={{fontWeight:400,color:'var(--gray-400)',fontSize:11}}> {hint}</span>}</label>
    {children}
  </div>
);
const Grid = ({children,cols='repeat(auto-fit,minmax(240px,1fr))'}) => (
  <div style={{display:'grid',gridTemplateColumns:cols,gap:'0 16px'}}>{children}</div>
);
const YNRow = ({label,field,form,onChange}) => (
  <div style={{display:'flex',alignItems:'center',padding:'9px 14px',borderBottom:'1px solid var(--primary-50)',gap:12,flexWrap:'wrap'}}>
    <span style={{flex:1,fontSize:12.5,color:'var(--text-1)'}}>{label}</span>
    <div style={{display:'flex',gap:12}}>
      {['YES','NO'].map(v=>(
        <label key={v} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontWeight:form[field]===v?700:500,
          color:form[field]===v?(v==='YES'?'var(--green)':'var(--red)'):'var(--gray-400)',fontSize:12.5}}>
          <input type="radio" name={`yn_${field}`} value={v} checked={form[field]===v}
            onChange={()=>onChange(field,v)} style={{accentColor:v==='YES'?'var(--green)':'var(--red)'}}/>
          {v}
        </label>
      ))}
    </div>
  </div>
);

export default function AdminApplicationDetail(){
  const{id}=useParams(); const navigate=useNavigate();
  const[searchParams]=useSearchParams();
  const[app,setApp]             = useState(null);
  const[loading,setLoading]     = useState(true);
  const[auditorsList,setAuditorsList] = useState([]);
  const[assigning,setAssigning] = useState(false);
  const[selectedAuditor,setSelectedAuditor] = useState('');
  const[selectedReviewer,setSelectedReviewer] = useState('');
  const[tab,setTab]             = useState(searchParams.get('tab')||'overview');
  const[ns,setNs]               = useState('');
  const[note,setNote]           = useState('');
  const[uploading,setUploading] = useState(false);
  const[saving,setSaving]       = useState(false);
  const[ef,setEf]               = useState({});   /* edit form state */

  const initEf = (d) => setEf({
    /* Step 1 */
    refno:               d.refno||'',
    organizationName:    d.organizationName||'',
    address:             d.address||'',
    additionalSites:     d.additionalSites||'',
    countryCode:         d.countryCode||'+91',
    mobileNumber:        d.mobileNumber||'',
    emailId:             d.emailId||'',
    contactPerson:       d.contactPerson||'',
    designation:         d.designation||'',
    modeOfWorking:       d.modeOfWorking||'Onsite',
    hybridCoreActivities:d.hybridCoreActivities||'',
    scopeOfCertification:d.scopeOfCertification||d.scope||'',
    /* Step 2 */
    mainProcesses:       d.mainProcesses||'',
    outsourcedProcesses: d.outsourcedProcesses||'',
    standards:           d.standards||[d.isoStandard].filter(Boolean),
    othersStandard:      d.othersStandard||'',
    applicationType:     d.applicationType||'Initial',
    accreditationBody:   d.accreditationBody||'USF',
    /* Step 3 */
    totalEmployees:      d.totalEmployees||d.employeeCount?.total||0,
    contractual:         d.contractual||0,
    workingShifts:       d.workingShifts||1,
    empTable:            d.empTable||emptyEmpTable(),
    remotePersonnel:     d.remotePersonnel||0,
    weekendOperation:    d.weekendOperation||'',
    /* Step 4 — Management system */
    legalAct:            d.legalAct||'',
    keyProcessArea:      d.keyProcessArea||'',
    productsServices:    d.productsServices||'',
    outsourcingProcess:  d.outsourcingProcess||'',
    consultantDetails:   d.consultantDetails||'',
    establishmentDate:   d.establishmentDate?d.establishmentDate.slice(0,10):'',
    manualDate:          d.manualDate?d.manualDate.slice(0,10):'',
    internalAuditDate:   d.internalAuditDate?d.internalAuditDate.slice(0,10):'',
    managementReviewDate:d.managementReviewDate?d.managementReviewDate.slice(0,10):'',
    alreadyCertified:    d.alreadyCertified||false,
    certStandard:        d.certStandard||'',
    certBody:            d.certBody||'',
    certIssueDate:       d.certIssueDate?d.certIssueDate.slice(0,10):'',
    certExpiryDate:      d.certExpiryDate?d.certExpiryDate.slice(0,10):'',
    /* Combined / integrated audit */
    combinedAudit:       d.combinedAudit||'',
    jointAudit:          d.jointAudit||'',
    integratedAudit:     d.integratedAudit||'',
    separateAudit:       d.separateAudit||'',
    internalAuditCombined:d.internalAuditCombined||'',
    mrmCombined:         d.mrmCombined||'',
    manualCombined:      d.manualCombined||'',
    systemIntegrated:    d.systemIntegrated||'',
    integratedApproach:  d.integratedApproach||'',
    integratedMgmt:      d.integratedMgmt||'',
    integrationPercentage:d.integrationPercentage||'',
    /* ISO 50001 */
    annualEnergyConsumption:d.annualEnergyConsumption||'',
    enmsPersonnels:      d.enmsPersonnels||'',
    energySources:       d.energySources||'',
    significantEnergyUses:d.significantEnergyUses||'',
    /* ISO 14001 / 45001 */
    locationConditions:  d.locationConditions||[],
    airEmissionFacility: d.airEmissionFacility||'',
    wastewaterFacility:  d.wastewaterFacility||'',
    wastesAmount:        d.wastesAmount||'',
    hazardousChemicals:  d.hazardousChemicals||'',
    pollutionClearance:  d.pollutionClearance||'',
    criticalAspectsOHSAS:d.criticalAspectsOHSAS||'',
    envAspectDetails:    d.envAspectDetails||'',
    personnelOnSite:     d.personnelOnSite||'',
    personnelAwayFromSite:d.personnelAwayFromSite||'',
    risksAwayFromSite:   d.risksAwayFromSite||'',
    ohsmsSignificantRisk:d.ohsmsSignificantRisk||'',
    notRegulatedByLaw:   d.notRegulatedByLaw||'',
    relevantLaws:        d.relevantLaws||'',
    /* Admin */
    adminNotes:          d.adminNotes||'',
  });

  const load = () => {
    setLoading(true);
    axios.get(`/api/applications/${id}`)
      .then(r=>{ setApp(r.data); setNs(r.data.status); initEf(r.data); })
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ axios.get('/api/auditors').then(r=>setAuditorsList(r.data||[])).catch(()=>{}); },[]);
  useEffect(load,[id]);

  /* field setter */
  const set = (k,v) => setEf(p=>({...p,[k]:v}));

  /* toggle standard */
  const toggleStd = (s) => setEf(p=>({...p,standards:p.standards.includes(s)?p.standards.filter(x=>x!==s):[...p.standards,s]}));
  const toggleLoc = (l) => setEf(p=>({...p,locationConditions:p.locationConditions.includes(l)?p.locationConditions.filter(x=>x!==l):[...p.locationConditions,l]}));

  /* employee table */
  const setCell = (ri,ci,val) => setEf(p=>{
    const t=(p.empTable||emptyEmpTable()).map((r,i)=>i===ri?r.map((c,j)=>j===ci?Number(val)||0:c):r);
    return{...p,empTable:t};
  });
  const rowTotal = (ri) => (ef.empTable||emptyEmpTable())[ri]?.reduce((a,b)=>a+b,0)||0;
  const colTotal = (ci) => (ef.empTable||emptyEmpTable()).reduce((a,r)=>a+(r[ci]||0),0);
  const grandTotal= () => (ef.empTable||emptyEmpTable()).flat().reduce((a,b)=>a+b,0);

  /* status update */
  const updateStatus = async()=>{
    try{ await axios.put(`/api/applications/${id}/status`,{status:ns,notes:note}); toast.success('Status updated'); setNote(''); load(); }
    catch{ toast.error('Failed'); }
  };

  /* save edit */
  const saveEdit = async()=>{
    if(!ef.organizationName?.trim()){toast.error('Organization name required');return;}
    if(!ef.address?.trim()){toast.error('Address required');return;}
    if(!ef.mobileNumber?.trim()){toast.error('Mobile number required');return;}
    if(!ef.contactPerson?.trim()){toast.error('Contact person required');return;}
    setSaving(true);
    try{
      const payload={...ef, scope:ef.scopeOfCertification, isoStandard:ef.standards[0]||app.isoStandard,
        employeeCount:{headOffice:grandTotal(),branches:0,temporary:0,total:grandTotal()}};
      await axios.put(`/api/applications/${id}`,payload);
      toast.success('Application saved');
      load(); setTab('overview');
    }catch{ toast.error('Save failed'); }
    finally{ setSaving(false); }
  };

  /* document upload */
  const upload = async(e,dt)=>{
    const f=e.target.files[0]; if(!f)return;
    const fd=new FormData(); fd.append('document',f); fd.append('docType',dt);
    setUploading(true);
    try{ await axios.post(`/api/applications/${id}/upload`,fd,{headers:{'Content-Type':'multipart/form-data'}}); toast.success('Uploaded'); load(); }
    catch{ toast.error('Upload failed'); }
    finally{ setUploading(false); }
  };

  if(loading) return <Layout title="Application"><div className="loading-box"><div className="spinner"/></div></Layout>;
  if(!app)    return <Layout title="Not Found"><p style={{padding:20}}>Not found</p></Layout>;

  const si = FL.indexOf(app.status);
  const has50001 = (ef.standards||[]).includes('ISO 50001:2018');
  const has14001 = (ef.standards||[]).includes('ISO 14001:2015');
  const has45001 = (ef.standards||[]).includes('ISO 45001:2018');
  const showEnv  = has14001||has45001;
  const tbl      = ef.empTable||emptyEmpTable();

  /* ── save / cancel bar ── */
  const ActionBar = ({top}) => (
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:top?'0 0 16px':'16px 0 0',borderBottom:top?'1px solid var(--primary-100)':undefined,borderTop:top?undefined:'1px solid var(--primary-100)'}}>
      <button className="btn btn-ghost" onClick={()=>setTab('overview')}><X size={13}/>Cancel</button>
      <button className="btn btn-primary" onClick={saveEdit} disabled={saving}><Save size={13}/>{saving?'Saving…':'Save Changes'}</button>
    </div>
  );

  return(
    <Layout title={app.applicationId}>
      {/* Page header */}
      <div className="page-hdr">
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/admin/applications')}><ArrowLeft size={14}/>Back</button>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span className="mono">{app.applicationId}</span>
              <span className={`badge bdg-${app.status}`}>{app.status?.replace(/_/g,' ')}</span>
            </div>
            <p className="page-subtitle">{app.organizationName} · {app.isoStandard}</p>
          </div>
        </div>
        {tab!=='edit'&&(
          <button className="btn btn-primary btn-sm" onClick={()=>setTab('edit')}><Edit2 size={13}/>Edit Application</button>
        )}
      </div>

      {/* Status stepper */}
      <div className="card" style={{marginBottom:20}}><div className="card-body">
        <div className="stepper">
          {FL.map((s,i)=>(
            <div key={s} className={`step ${i<si?'done':''} ${i===si?'active':''}`}>
              <div className="step-node"><div className="step-circle">{i<si?<CheckCircle size={13}/>:i+1}</div><div className="step-lbl">{s.replace(/_/g,' ')}</div></div>
              {i<FL.length-1&&<div className="step-connector"/>}
            </div>
          ))}
        </div>
      </div></div>

      {/* Tabs */}
      <div className="tabs-bar">
        {['overview','edit','documents','status','feedback'].map(t=>(
          <button key={t} className={`tab-item ${tab===t?'on':''}`} onClick={()=>setTab(t)} style={{display:'flex',alignItems:'center',gap:5}}>
            {t==='edit'&&<Edit2 size={11}/>}
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══════════ EDIT TAB ═══════════ */}
      {tab==='edit'&&(
        <div className="card">
          <div className="card-hdr" style={{justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div className="card-title"><Edit2 size={14} style={{color:'var(--primary)'}}/>Edit Full Application — {app.applicationId}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setTab('overview')}><X size={13}/>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}><Save size={13}/>{saving?'Saving…':'Save'}</button>
            </div>
          </div>
          <div className="card-body">
            <ActionBar top/>

            {/* ── SECTION 1: Basic Info ── */}
            <SectionHead title="Section 1 — Basic Information"/>
            <Grid>
              <FG label="REFNO" full>
                <input className="form-control" value={ef.refno||''} onChange={e=>set('refno',e.target.value)}/>
              </FG>
              <FG label="Name of Organization" required full>
                <input className="form-control" value={ef.organizationName||''} onChange={e=>set('organizationName',e.target.value)}/>
              </FG>
              <FG label="Address" required full>
                <textarea className="form-control" rows={3} value={ef.address||''} onChange={e=>set('address',e.target.value)}/>
              </FG>
              <FG label="Additional Sites / Addresses" full>
                <textarea className="form-control" rows={2} value={ef.additionalSites||''} onChange={e=>set('additionalSites',e.target.value)}/>
              </FG>
              <FG label="Mobile Number" required>
                <div className="mobile-input-row">
                  <select className="form-control" value={ef.countryCode||'+91'} onChange={e=>set('countryCode',e.target.value)}>
                    {COUNTRY_CODES.map(c=><option key={c.code+c.country} value={c.code}>{c.code} {c.country}</option>)}
                  </select>
                  <input className="form-control" placeholder="9000000000" value={localMobileNumber(ef.mobileNumber, ef.countryCode)}
                    onChange={e=>set('mobileNumber',e.target.value.replace(/\D/g,'').slice(0,15))}/>
                </div>
              </FG>
              <FG label="Email Id">
                <input type="email" className="form-control" value={ef.emailId||''} onChange={e=>set('emailId',e.target.value)}/>
              </FG>
              <FG label="Contact Person" required>
                <input className="form-control" value={ef.contactPerson||''} onChange={e=>set('contactPerson',e.target.value)}/>
              </FG>
              <FG label="Designation">
                <input className="form-control" value={ef.designation||''} onChange={e=>set('designation',e.target.value)}/>
              </FG>
              <FG label="Mode of Working" full>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {['Online','Onsite','Hybrid'].map(m=>(
                    <label key={m} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'8px 14px',
                      border:`1.5px solid ${ef.modeOfWorking===m?'var(--primary)':'var(--gray-200)'}`,borderRadius:8,
                      background:ef.modeOfWorking===m?'var(--primary-50)':'white',
                      fontWeight:ef.modeOfWorking===m?700:500,fontSize:13,
                      color:ef.modeOfWorking===m?'var(--primary-dark)':'var(--gray-500)'}}>
                      <input type="radio" name="modeEdit" value={m} checked={ef.modeOfWorking===m} onChange={()=>set('modeOfWorking',m)} style={{accentColor:'var(--primary)'}}/>
                      {m}
                    </label>
                  ))}
                </div>
              </FG>
              {ef.modeOfWorking==='Hybrid'&&(
                <FG label="Core activities Online or Onsite?">
                  <select className="form-control" value={ef.hybridCoreActivities||''} onChange={e=>set('hybridCoreActivities',e.target.value)}>
                    <option value="">Select</option>
                    <option>Core activities Online</option>
                    <option>Core activities Onsite</option>
                  </select>
                </FG>
              )}
              <FG label="Scope of Certification" required full>
                <textarea className="form-control" rows={4} value={ef.scopeOfCertification||''} onChange={e=>set('scopeOfCertification',e.target.value)}/>
              </FG>
            </Grid>

            {/* ── SECTION 2: Standards ── */}
            <SectionHead title="Section 2 — Standards & Application Type"/>
            <Grid>
              <FG label="Main Processes / Activities" full>
                <input className="form-control" value={ef.mainProcesses||''} onChange={e=>set('mainProcesses',e.target.value)}/>
              </FG>
              <FG label="Outsourced Processes, if any" full>
                <input className="form-control" value={ef.outsourcedProcesses||''} onChange={e=>set('outsourcedProcesses',e.target.value)}/>
              </FG>
            </Grid>
            <div className="form-group">
              <label className="form-label">Standard(s) <span style={{color:'var(--red)'}}>*</span> <span style={{fontWeight:400,color:'var(--gray-400)'}}>— tick all applicable</span></label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:8}}>
                {ISO_LIST.map(s=>(
                  <label key={s} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 13px',
                    border:`1.5px solid ${(ef.standards||[]).includes(s)?'var(--primary)':'var(--gray-200)'}`,
                    borderRadius:8,cursor:'pointer',background:(ef.standards||[]).includes(s)?'var(--primary-50)':'white',transition:'all .14s'}}>
                    <input type="checkbox" checked={(ef.standards||[]).includes(s)} onChange={()=>toggleStd(s)} style={{accentColor:'var(--primary)',width:15,height:15,flexShrink:0}}/>
                    <span style={{fontSize:12.5,fontWeight:(ef.standards||[]).includes(s)?700:500,color:(ef.standards||[]).includes(s)?'var(--primary-dark)':'var(--gray-600)'}}>{s}</span>
                  </label>
                ))}
              </div>
              {(ef.standards||[]).length>0&&(
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                  {(ef.standards||[]).map(s=><span key={s} className="badge bdg-info" style={{fontSize:10.5}}>{s}</span>)}
                </div>
              )}
            </div>
            <Grid>
              <FG label="Application Type">
                <select className="form-control" value={ef.applicationType||'Initial'} onChange={e=>set('applicationType',e.target.value)}>
                  {APP_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </FG>
              <FG label="Accreditation Body">
                <select className="form-control" value={ef.accreditationBody||'USF'} onChange={e=>set('accreditationBody',e.target.value)}>
                  {ACCRED.map(a=><option key={a}>{a}</option>)}
                </select>
              </FG>
            </Grid>

            {/* ── SECTION 3: Employees ── */}
            <SectionHead title="Section 3 — Employee Details"/>
            <Grid cols="repeat(auto-fit,minmax(180px,1fr))">
              {[{label:'Total Employees',field:'totalEmployees'},{label:'Contractual',field:'contractual'},{label:'Working Shifts',field:'workingShifts'}].map(({label,field})=>(
                <FG key={field} label={label}>
                  <input className="form-control" type="number" min="0" value={ef[field]||0} onChange={e=>set(field,Number(e.target.value)||0)}/>
                </FG>
              ))}
            </Grid>
            {/* Employee table */}
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700,fontSize:12}}>
                <thead>
                  <tr>
                    <td style={{padding:'7px 10px',border:'1px solid var(--primary-100)',fontWeight:700,fontSize:10.5,background:'var(--primary-50)',color:'var(--primary-dark)'}}>Activities</td>
                    {EMP_COLS.map(c=><td key={c} style={{padding:'7px 10px',border:'1px solid var(--primary-100)',fontWeight:700,fontSize:10.5,background:'var(--primary-50)',color:'var(--primary-dark)',textAlign:'center',whiteSpace:'pre-wrap',lineHeight:1.3}}>{c}</td>)}
                    <td style={{padding:'7px 10px',border:'1px solid var(--primary-100)',fontWeight:700,fontSize:10.5,background:'var(--primary-50)',color:'var(--primary-dark)',textAlign:'center'}}>Total</td>
                  </tr>
                </thead>
                <tbody>
                  {EMP_ROWS.map((row,ri)=>(
                    <tr key={ri}>
                      <td style={{padding:'8px 12px',fontWeight:600,fontSize:12.5,border:'1px solid var(--primary-100)',background:'var(--primary-50)',color:'var(--text-1)',minWidth:160}}>{row}</td>
                      {EMP_COLS.map((_,ci)=>(
                        <td key={ci} style={{padding:'5px 7px',border:'1px solid var(--gray-100)',background:ri%2===0?'white':'var(--gray-50)'}}>
                          <input type="number" min="0" value={tbl[ri]?.[ci]||0} onChange={e=>setCell(ri,ci,e.target.value)}
                            style={{width:'100%',padding:'5px 7px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,textAlign:'center',outline:'none',background:'white'}}/>
                        </td>
                      ))}
                      <td style={{padding:'8px 10px',textAlign:'center',fontWeight:700,fontSize:13,color:'var(--primary)',border:'1px solid var(--primary-100)',background:'var(--primary-50)'}}>{rowTotal(ri)}</td>
                    </tr>
                  ))}
                  <tr style={{background:'var(--primary-100)'}}>
                    <td style={{padding:'9px 12px',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:13}}>Total</td>
                    {EMP_COLS.map((_,ci)=>(
                      <td key={ci} style={{padding:'9px 10px',textAlign:'center',fontWeight:700,border:'1px solid var(--primary-200)',fontSize:13,color:'var(--primary-dark)'}}>{colTotal(ci)}</td>
                    ))}
                    <td style={{padding:'9px 10px',textAlign:'center',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:15,color:'var(--primary)'}}>{grandTotal()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Grid>
              <FG label="Personnel working away from site">
                <input className="form-control" type="number" min="0" value={ef.remotePersonnel||0} onChange={e=>set('remotePersonnel',Number(e.target.value)||0)}/>
              </FG>
              <FG label="Operation for Weekend / Weekly Holiday" full>
                <input className="form-control" placeholder="e.g. Saturday half day, Sunday off" value={ef.weekendOperation||''} onChange={e=>set('weekendOperation',e.target.value)}/>
              </FG>
            </Grid>

            {/* ── SECTION 4: Management System ── */}
            <SectionHead title="Section 4 — Management System Information"/>
            <Grid>
              {[
                {n:'1.',label:'Applicable Legal, statutory & regulatory act',hint:'(Pvt. Ltd./Ltd./Partnership etc.)',field:'legalAct'},
                {n:'2.',label:'Organization Key Process Area',hint:'(purchase/store/production etc.)',field:'keyProcessArea'},
                {n:'3.',label:'Organization Products / Services',hint:'',field:'productsServices'},
                {n:'4.',label:'Any outsourcing process',hint:'(printing etc.)',field:'outsourcingProcess'},
                {n:'5.',label:'Consultant details (if used)',hint:'',field:'consultantDetails'},
              ].map(({n,label,hint,field})=>(
                <FG key={field} label={`${n} ${label}`} hint={hint} full>
                  <input className="form-control" value={ef[field]||''} onChange={e=>set(field,e.target.value)}/>
                </FG>
              ))}
            </Grid>
            <Grid cols="repeat(auto-fit,minmax(210px,1fr))">
              <FG label="6. Organization establishment date"><input type="date" className="form-control" value={ef.establishmentDate||''} onChange={e=>set('establishmentDate',e.target.value)}/></FG>
              <FG label="7. Manual Date"><input type="date" className="form-control" value={ef.manualDate||''} onChange={e=>set('manualDate',e.target.value)}/></FG>
              <FG label="8. Internal audit date"><input type="date" className="form-control" value={ef.internalAuditDate||''} onChange={e=>set('internalAuditDate',e.target.value)}/></FG>
              <FG label="9. Management review date"><input type="date" className="form-control" value={ef.managementReviewDate||''} onChange={e=>set('managementReviewDate',e.target.value)}/></FG>
            </Grid>

            {/* Already certified */}
            <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 14px',marginBottom:16}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:600,fontSize:13,marginBottom:ef.alreadyCertified?12:0}}>
                <input type="checkbox" checked={ef.alreadyCertified||false} onChange={e=>set('alreadyCertified',e.target.checked)} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                If organisation already ISO Certified, write the standards:
              </label>
              {ef.alreadyCertified&&(
                <Grid cols="repeat(auto-fit,minmax(200px,1fr))">
                  <FG label="Certified Standard(s)"><input className="form-control" value={ef.certStandard||''} onChange={e=>set('certStandard',e.target.value)}/></FG>
                  <FG label="Certification Body"><input className="form-control" value={ef.certBody||''} onChange={e=>set('certBody',e.target.value)}/></FG>
                  <FG label="Issue Date"><input type="date" className="form-control" value={ef.certIssueDate||''} onChange={e=>set('certIssueDate',e.target.value)}/></FG>
                  <FG label="Expiry Date"><input type="date" className="form-control" value={ef.certExpiryDate||''} onChange={e=>set('certExpiryDate',e.target.value)}/></FG>
                </Grid>
              )}
            </div>

            {/* Combined / Integrated audit */}
            <div style={{border:'2px solid var(--primary)',borderRadius:10,marginBottom:18,overflow:'hidden'}}>
              <div style={{background:'var(--primary)',color:'white',padding:'8px 16px',fontWeight:700,fontSize:13,textAlign:'center'}}>
                In case of joint, combined, integrated audit:—
              </div>
              {[
                {label:'Combined Audit — Do you want audits for several certification programmes to be conducted as a Combined Audit?',field:'combinedAudit'},
                {label:'Joint Audit — Do you want audits to be conducted as a Joint Audit with another certification body?',field:'jointAudit'},
                {label:'Integrated Audit — Do you want audits for multiple standards to be conducted as an Integrated Audit?',field:'integratedAudit'},
                {label:'Separate Audit — Do you want each certification programme to be audited separately?',field:'separateAudit'},
                {label:'Is Internal Audit Combined?',field:'internalAuditCombined'},
                {label:'Is MRM Combined including business strategy and plan?',field:'mrmCombined'},
                {label:'Is Manual, Procedures Combined?',field:'manualCombined'},
                {label:'Is Implemented System Integrated?',field:'systemIntegrated'},
                {label:'Is there integrated approach for correction, corrective action and continual improvement?',field:'integratedApproach'},
                {label:'Is there any integrated management support and responsibilities?',field:'integratedMgmt'},
              ].map(({label,field})=>(
                <YNRow key={field} label={label} field={field} form={ef} onChange={set}/>
              ))}
              <div style={{padding:'9px 14px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:12.5,flex:1}}>Percentage level of integration (decided by QCC):</span>
                <input className="form-control" style={{width:160}} placeholder="e.g. 80%" value={ef.integrationPercentage||''} onChange={e=>set('integrationPercentage',e.target.value)}/>
              </div>
            </div>

            {/* ISO 50001 */}
            {has50001&&(
              <div style={{border:'2px solid #16a34a',borderRadius:10,marginBottom:18,overflow:'hidden'}}>
                <div style={{background:'#16a34a',color:'white',padding:'8px 16px',fontWeight:700,fontSize:13,textAlign:'center'}}>
                  ISO 50001:2018 – Energy Management System – Additional Details
                </div>
                <div style={{padding:'16px 18px'}}>
                  <Grid cols="repeat(auto-fit,minmax(220px,1fr))">
                    <FG label="Annual Energy Consumption (KWH etc.)"><input className="form-control" value={ef.annualEnergyConsumption||''} onChange={e=>set('annualEnergyConsumption',e.target.value)}/></FG>
                    <FG label="No. of EnMS Effective Personnels"><input className="form-control" type="number" min="0" value={ef.enmsPersonnels||''} onChange={e=>set('enmsPersonnels',e.target.value)}/></FG>
                    <FG label="Name & Number of Energy Sources"><input className="form-control" value={ef.energySources||''} onChange={e=>set('energySources',e.target.value)}/></FG>
                    <FG label="Name & Number of significant energy uses (SEUs)"><input className="form-control" value={ef.significantEnergyUses||''} onChange={e=>set('significantEnergyUses',e.target.value)}/></FG>
                  </Grid>
                </div>
              </div>
            )}

            {/* ISO 14001 / 45001 */}
            {showEnv&&(
              <div style={{border:'2px solid var(--red)',borderRadius:10,marginBottom:18,overflow:'hidden'}}>
                <div style={{background:'var(--red)',color:'white',padding:'8px 16px',fontWeight:700,fontSize:13,textAlign:'center'}}>
                  {has14001?'ISO 14001:2015':''}{has14001&&has45001?' / ':''}{has45001?'ISO 45001:2018':''} – Additional Details
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div className="form-group">
                    <label className="form-label">Select Condition of your location (tick all applicable)</label>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {LOC_CONDS.map(l=>(
                        <label key={l} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'7px 12px',
                          border:`1.5px solid ${(ef.locationConditions||[]).includes(l)?'var(--red)':'var(--gray-200)'}`,
                          borderRadius:8,background:(ef.locationConditions||[]).includes(l)?'#fff0f0':'white',fontSize:12.5,
                          fontWeight:(ef.locationConditions||[]).includes(l)?700:500}}>
                          <input type="checkbox" checked={(ef.locationConditions||[]).includes(l)} onChange={()=>toggleLoc(l)} style={{accentColor:'var(--red)',width:14,height:14}}/>{l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Grid cols="repeat(auto-fit,minmax(220px,1fr))">
                    <FG label="Operating air emission facility">
                      <select className="form-control" value={ef.airEmissionFacility||''} onChange={e=>set('airEmissionFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select>
                    </FG>
                    <FG label="Operating waste water treatment facility">
                      <select className="form-control" value={ef.wastewaterFacility||''} onChange={e=>set('wastewaterFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select>
                    </FG>
                    <FG label="Kind of wastes & amount (Ton/year)">
                      <input className="form-control" value={ef.wastesAmount||''} onChange={e=>set('wastesAmount',e.target.value)}/>
                    </FG>
                    <FG label="Usage of hazardous chemical substances?">
                      <select className="form-control" value={ef.hazardousChemicals||''} onChange={e=>set('hazardousChemicals',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select>
                    </FG>
                  </Grid>
                  {[
                    {label:'Does you have Pollution Clearance from local authorities?',field:'pollutionClearance'},
                    {label:'Does you have more than 5 critical environmental aspect or OHSAS risks?',field:'criticalAspectsOHSAS'},
                  ].map(({label,field})=>(
                    <YNRow key={field} label={label} field={field} form={ef} onChange={set}/>
                  ))}
                  {[
                    {label:'Details of Environmental Aspects (if more than 5 critical aspect)',field:'envAspectDetails'},
                    {label:'No. of personnel working on site',field:'personnelOnSite'},
                    {label:'No. of personnel working away from site',field:'personnelAwayFromSite'},
                    {label:'Risks for personnel working away from site',field:'risksAwayFromSite'},
                    {label:'Details of OHSMS Significant RISK (if more than 5 critical OHSMS RISK)',field:'ohsmsSignificantRisk'},
                  ].map(({label,field})=>(
                    <div key={field} className="form-group">
                      <label className="form-label" style={{fontSize:12}}>{label}</label>
                      <input className="form-control" value={ef[field]||''} onChange={e=>set(field,e.target.value)}/>
                    </div>
                  ))}
                  <YNRow label="Is your organization not regulated by law and does not need any license?" field="notRegulatedByLaw" form={ef} onChange={set}/>
                  <div className="form-group" style={{marginTop:10}}>
                    <label className="form-label">Relevant laws applicable to your organization</label>
                    <textarea className="form-control" rows={3} value={ef.relevantLaws||''} onChange={e=>set('relevantLaws',e.target.value)}/>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className="form-group">
              <label className="form-label">Internal Notes (Admin only)</label>
              <textarea className="form-control" rows={3} value={ef.adminNotes||''} onChange={e=>set('adminNotes',e.target.value)}/>
            </div>

            <ActionBar/>
          </div>
        </div>
      )}

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {tab==='overview'&&(
        <div className="dash-grid">
          <div className="card"><div className="card-hdr"><div className="card-title"><Building size={14} style={{color:'var(--primary)'}}/>Organization</div></div><div className="card-body">
            {[['Name',app.organizationName],['Address',app.address],['Mobile',app.mobileNumber?(app.countryCode||'')+' '+localMobileNumber(app.mobileNumber, app.countryCode):null],['Email',app.emailId],['Contact Person',app.contactPerson],['Designation',app.designation],['Submitted',app.submittedAt?new Date(app.submittedAt).toLocaleDateString():'—']].map(([l,v])=>v?<div key={l} className="info-row"><span className="ir-label">{l}</span><span className="ir-value">{v}</span></div>:null)}
          </div></div>
          <div className="card"><div className="card-hdr"><div className="card-title"><Globe size={14} style={{color:'var(--primary)'}}/>ISO Details</div></div><div className="card-body">
            {[['Standard',(app.standards||[app.isoStandard]).filter(Boolean).join(', ')],['Scope',app.scopeOfCertification||app.scope],['App. Type',app.applicationType],['Accreditation',app.accreditationBody],['Mode',app.modeOfWorking],['Employees',app.employeeCount?.total]].map(([l,v])=>v?<div key={l} className="info-row"><span className="ir-label">{l}</span><span className="ir-value">{v}</span></div>:null)}
          </div></div>
          <div className="card"><div className="card-hdr"><div className="card-title"><User size={14} style={{color:'var(--primary)'}}/>Team</div></div><div className="card-body">
            {[{r:'Client',u:app.client}].map(({r,u})=>(
              <div key={r} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--primary-100)'}}>
                <span className="ir-label">{r}</span>
                {u?<div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar" style={{width:26,height:26,fontSize:10}}>{u.name?.[0]}</div><span style={{fontSize:13,fontWeight:600}}>{u.name}</span></div>:<span style={{fontSize:12,color:'var(--gray-400)'}}>Not assigned</span>}
              </div>
            ))}
            <div style={{marginTop:12,borderTop:'1px dashed var(--primary-50)',paddingTop:12}}>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                <div style={{flex:1,minWidth:140}}>
                  <label className="form-label">Assign Auditor</label>
                  <select className="form-control" value={selectedAuditor} onChange={e=>setSelectedAuditor(e.target.value)}>
                    <option value="">— Select Auditor —</option>
                    {auditorsList.filter(a=>a.role==='auditor').map(a=><option key={a._id} value={a._id}>{a.name} — {a.email}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:140}}>
                  <label className="form-label">Assign Reviewer</label>
                  <select className="form-control" value={selectedReviewer} onChange={e=>setSelectedReviewer(e.target.value)}>
                    <option value="">— Select Reviewer —</option>
                    {auditorsList.filter(a=>a.role==='reviewer').map(a=><option key={a._id} value={a._id}>{a.name} — {a.email}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button className="btn btn-ghost" onClick={()=>{setSelectedAuditor('');setSelectedReviewer('');}}>Reset</button>
                <button className="btn btn-primary" disabled={assigning} onClick={async()=>{
                  if(!selectedAuditor&&!selectedReviewer){toast.error('Select auditor or reviewer');return;}
                  setAssigning(true);
                  try{ await axios.post(`/api/applications/${id}/assign`,{auditorId:selectedAuditor||undefined,reviewerId:selectedReviewer||undefined}); toast.success('Assigned'); setSelectedAuditor('');setSelectedReviewer('');load(); }
                  catch{ toast.error('Assignment failed'); }
                  finally{ setAssigning(false); }
                }}>Assign</button>
              </div>
            </div>
          </div></div>
        </div>
      )}

      {/* ═══════════ DOCUMENTS TAB ═══════════ */}
      {tab==='documents'&&(
        <div className="card"><div className="card-hdr"><div className="card-title"><FileText size={14} style={{color:'var(--primary)'}}/>Documents</div></div><div className="card-body">
          {[{label:'Application Form',key:'applicationForm'},{label:'Agreement',key:'agreement'},{label:'Signed Form',key:'signedForm'},{label:'Audit Report',key:'auditReport'},{label:'Review Report',key:'reviewReport'},{label:'Certificate',key:'certificate'}].map(doc=>(
            <div key={doc.key} className="doc-row">
              <div className="doc-row-info"><FileText size={18} style={{color:app[doc.key]?'var(--primary)':'var(--gray-300)',flexShrink:0}}/><div><div className="doc-row-name">{doc.label}</div><div className="doc-row-meta">{app[doc.key]?'✓ Uploaded':'Not uploaded yet'}</div></div></div>
              <div className="doc-row-actions">
                {app[doc.key]&&<a href={app[doc.key]} download className="btn btn-success btn-sm"><Download size={12}/>Download</a>}
                <label className="btn btn-outline btn-sm" style={{cursor:'pointer'}}><Upload size={12}/>{app[doc.key]?'Replace':'Upload'}<input type="file" style={{display:'none'}} onChange={e=>upload(e,doc.key)} disabled={uploading}/></label>
              </div>
            </div>
          ))}
          {app.uploadedDocuments?.length>0&&<div style={{marginTop:16}}>
            <div className="section-label">Additional Files</div>
            {app.uploadedDocuments.map((d,i)=>(
              <div key={i} className="doc-row"><div className="doc-row-info"><FileText size={16} style={{color:'var(--primary)',flexShrink:0}}/><div><div className="doc-row-name">{d.name}</div><div className="doc-row-meta">By {d.uploadedBy?.name||'—'}</div></div></div><a href={d.path} download className="btn btn-ghost btn-sm"><Download size={12}/>Download</a></div>
            ))}
          </div>}
        </div></div>
      )}

      {/* ═══════════ STATUS TAB ═══════════ */}
      {tab==='status'&&(
        <div className="card"><div className="card-hdr"><div className="card-title"><CheckCircle size={14} style={{color:'var(--primary)'}}/>Update Status</div></div><div className="card-body">
          <div className="form-group"><label className="form-label">New Status</label><select className="form-control" value={ns} onChange={e=>setNs(e.target.value)}>{FL.concat(['rejected']).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Notes for Client</label><textarea className="form-control" rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a message for the client…"/></div>
          <button className="btn btn-primary" onClick={updateStatus}><Send size={14}/>Update & Notify Client</button>
          {app.adminNotes&&<div className="alert alert-info" style={{marginTop:16}}><strong>Previous note:</strong> {app.adminNotes}</div>}
        </div></div>
      )}

      {/* ═══════════ FEEDBACK TAB ═══════════ */}
      {tab==='feedback'&&(
        <div className="card"><div className="card-hdr"><div className="card-title"><Star size={14} style={{color:'var(--amber)'}}/>All Feedback ({app.feedbacks?.length||0})</div></div><div className="card-body">
          {!app.feedbacks?.length
            ?<div className="empty-box" style={{padding:40}}><Star size={36}/><p>No feedback yet</p></div>
            :app.feedbacks.map((fb,i)=>(
              <div key={i} style={{border:'1px solid var(--primary-100)',borderRadius:12,padding:16,marginBottom:12,background:'var(--gray-50)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><div className="avatar">{fb.from?.name?.[0]||'?'}</div><div><div style={{fontWeight:700,fontSize:14}}>{fb.from?.name||'User'}</div><span className={`badge bdg-${fb.role}`}>{fb.role}</span></div></div>
                  <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(n=><Star key={n} size={14} fill={n<=fb.rating?'#f59e0b':'none'} stroke={n<=fb.rating?'#f59e0b':'#d1d5db'}/>)}</div>
                </div>
                <p style={{fontSize:13.5,color:'var(--gray-700)',lineHeight:1.6,background:'white',padding:'10px 14px',borderRadius:8,border:'1px solid var(--primary-100)'}}>{fb.message}</p>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:8}}>{fb.createdAt?new Date(fb.createdAt).toLocaleString():''}</div>
              </div>
          ))}
        </div></div>
      )}
    </Layout>
  );
}
