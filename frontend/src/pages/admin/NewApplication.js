import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, FileText, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { localMobileNumber } from '../../utils/phone';
import { COUNTRY_CODES } from '../../utils/countryCodes';

/* ── constants ── */
const ISO_LIST = [
  'ISO 9001:2015','ISO 14001:2015','ISO 45001:2018','ISO 22000:2018',
  'ISO 27001:2022','ISO/IEC 27701:2025','ISO/IEC 42001:2023',
  'ISO 22301:2019','ISO 37001:2016','ISO 21001:2018','ISO 50001:2018',
];
const APP_TYPES = ['Initial','Surveillance','Re-certification','Un-Announced','Follow-up'];
const ACCRED    = ['EAS','UASL'];
const EMP_ROWS = ['Top Management','Production Area / Service','Quality Control / Technical','Administration','Other'];
const EMP_COLS = ['Full Time','Part Time','Performing Same type of Job','Temporary Unskilled Workers','Effective No. Filled by QCC'];
const LOCATION_CONDITIONS = ['Special countermeasure area','Protection area of source water','Industrial complex','City'];
const emptyRow = () => Array(EMP_COLS.length).fill(0);

const INIT = {
  refno:'', client:'', organizationName:'', address:'', additionalSites:'',
  countryCode:'+91', mobileNumber:'', emailId:'', contactPerson:'', designation:'',
  modeOfWorking:'Onsite', hybridCoreActivities:'',
  scopeOfCertification:'',
  mainProcesses:'', outsourcedProcesses:'',
  standards:[], othersStandard:'',
  applicationType:'Initial', accreditationBody:'EAS',
  totalEmployees:0, contractual:0, workingShifts:1,
  empTable: EMP_ROWS.map(()=>emptyRow()),
  remotePersonnel:0, weekendOperation:'',
  legalAct:'', keyProcessArea:'', productsServices:'',
  outsourcingProcess:'', consultantDetails:'',
  establishmentDate:'', manualDate:'', internalAuditDate:'', managementReviewDate:'',
  alreadyCertified:false, certStandard:'', certBody:'', certIssueDate:'', certExpiryDate:'',
  // joint audit
  jointAuditMain:'',
  combinedAudit:'', jointAudit:'', integratedAudit:'', separateAudit:'',
  internalAuditCombined:'', mrmCombined:'', manualCombined:'',
  systemIntegrated:'', integratedApproach:'', integratedMgmt:'',
  integrationPercentage:'',
  // ISO 50001
  annualEnergyConsumption:'', enmsPersonnels:'', energySources:'', significantEnergyUses:'',
  // ISO 14001 / 45001
  locationConditions:[],
  airEmissionFacility:'', wastewaterFacility:'', wastesAmount:'', hazardousChemicals:'',
  pollutionClearance:'', criticalAspectsOHSAS:'',
  envAspectDetails:'', personnelOnSite:'', personnelAwayFromSite:'',
  risksAwayFromSite:'', ohsmsSignificantRisk:'',
  notRegulatedByLaw:'', relevantLaws:'',
  // ISO 22000
  iso22000NumSites:'', iso22000HACCP:'', iso22000Seasonality:'',
  iso22000SeasonDetails:'', iso22000HACCPStudies:'', iso22000ProcessLines:'',
  iso22000FSSAI:'', iso22000Automation:'', iso22000ClosedProduction:'',
  iso22000MechanizedOp:'', iso22000LabourIntensiveness:'',
  iso22000ProductTypes:'', iso22000ProductLines:'', iso22000ProductDev:'',
  iso22000CCPs:'', iso22000PRPs:'', iso22000OPRPs:'',
  iso22000BuildingArea:'', iso22000Infrastructure:'',
  iso22000InhouseLab:'', iso22000PriorAudits:'', iso22000AuditReport:'',
  iso22000Translator:'', iso22000OtherFactors:'',
  // ISO 27001
  iso27001SoaVersion:'', iso27001SoaDate:'', iso27001OutsourcedProcess:'',
  iso27001RiskAssessmentDate:'',
  iso27001BusinessA:'', iso27001BusinessB:'', iso27001BusinessC:'',
  iso27001ITA:'', iso27001ITB:'', iso27001ITC:'',
  iso27001RecordsAccess:'',
  iso27001ReadOnlyPersons:0, iso27001NoAccessPersons:0,
  iso27001RestrictedPersons:0, iso27001StrictPersons:0,
  // declaration
  declarationDate:'', representativeName:'',
  acceptanceRefNo:'', notAcceptance:'', supplementInfo:'',
  adminNotes:'',
};

/* ── helpers ── */
const Row = ({children, mb=12}) => (
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'0 16px',marginBottom:mb}}>
    {children}
  </div>
);
const FG = ({label, required, children, full}) => (
  <div className="form-group" style={full?{gridColumn:'1/-1'}:{}}>
    <label className="form-label">{label}{required&&<span style={{color:'var(--red)'}}> *</span>}</label>
    {children}
  </div>
);
const TCell = ({children, head, bold}) => (
  <td style={{
    padding:'7px 10px', border:'1px solid var(--primary-100)',
    fontWeight:head||bold?700:400, fontSize:head?10.5:12,
    background:head?'var(--primary-50)':'white',
    color:head?'var(--primary-dark)':'var(--text-1)',
    textAlign:head?'center':'left', whiteSpace:head?'pre-wrap':'normal', lineHeight:1.3,
  }}>{children}</td>
);
const YNRow = ({label, field, form, set}) => (
  <div style={{display:'flex',alignItems:'center',padding:'9px 14px',borderBottom:'1px solid var(--primary-50)',gap:12,flexWrap:'wrap'}}>
    <span style={{flex:1,fontSize:12.5,color:'var(--text-1)'}}>{label}</span>
    <div style={{display:'flex',gap:12}}>
      {['YES','NO'].map(v=>(
        <label key={v} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontWeight:form[field]===v?700:500,
          color:form[field]===v?(v==='YES'?'var(--green)':'var(--red)'):'var(--gray-400)',fontSize:12.5}}>
          <input type="radio" name={field} value={v} checked={form[field]===v}
            onChange={()=>set(field,v)} style={{accentColor:v==='YES'?'var(--green)':'var(--red)'}}/>
          {v}
        </label>
      ))}
    </div>
  </div>
);

const AccSec = ({title, color, isOpen, onToggle, children}) => (
  <div style={{border:`2px solid ${color}`,borderRadius:10,marginBottom:14,overflow:'hidden'}}>
    <div onClick={onToggle} style={{
      background:color, color:'white', padding:'10px 16px', fontWeight:700,
      fontSize:13, cursor:'pointer', display:'flex', alignItems:'center',
      justifyContent:'space-between', userSelect:'none',
    }}>
      <span style={{flex:1,marginRight:10}}>{title}</span>
      {isOpen ? <ChevronDown size={15} style={{flexShrink:0}}/> : <ChevronRight size={15} style={{flexShrink:0}}/>}
    </div>
    {isOpen && <div style={{padding:'16px 18px'}}>{children}</div>}
  </div>
);

const SecCard = ({id, title, children}) => (
  <div id={id} style={{background:'white',borderRadius:12,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.06)',scrollMarginTop:80}}>
    <div style={{background:'var(--primary)',color:'white',padding:'10px 20px',fontWeight:700,fontSize:14}}>
      {title}
    </div>
    <div style={{padding:'22px 24px'}}>{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════ */
export default function AdminNewApplication() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdit    = !!id;
  const [clients,    setClients]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [loadingApp, setLoadingApp] = useState(!!id);
  const [form,       setForm]       = useState(INIT);
  const [openSecs,   setOpenSecs]   = useState({ iso50001:false, isoEnv:false, iso22000:false, iso27001:false });

  const isClient = user?.role === 'client';
  const backTo = isClient ? '/client/applications'
    : user?.role === 'sales' ? '/sales/leads'
    : '/admin/applications';

  useEffect(()=>{
    if (!isClient) axios.get('/api/users?role=client').then(r=>setClients(r.data||[])).catch(()=>{});
  },[isClient]);

  // Edit mode — load the existing application and pre-fill the full form
  useEffect(()=>{
    if (!id) return;
    axios.get(`/api/applications/${id}`).then(({data})=>{
      setForm(f=>({
        ...f,
        ...data,
        client:               data.client?._id || data.client || '',
        standards:            Array.isArray(data.standards) ? data.standards : [],
        locationConditions:   Array.isArray(data.locationConditions) ? data.locationConditions : [],
        empTable:             (Array.isArray(data.empTable) && data.empTable.length) ? data.empTable : f.empTable,
        scopeOfCertification: data.scopeOfCertification || data.scope || '',
      }));
    }).catch(()=>toast.error('Failed to load application'))
      .finally(()=>setLoadingApp(false));
  },[id]);

  const set       = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleSec = (k)   => setOpenSecs(s=>({...s,[k]:!s[k]}));
  const toggleStd = (s)   => setForm(f=>({...f, standards:f.standards.includes(s)?f.standards.filter(x=>x!==s):[...f.standards,s]}));
  const toggleLoc = (l)   => setForm(f=>({...f, locationConditions:f.locationConditions.includes(l)?f.locationConditions.filter(x=>x!==l):[...f.locationConditions,l]}));
  const setEmp    = (row,col,val) => setForm(f=>{
    const t = f.empTable.map((r,ri)=>ri===row?r.map((c,ci)=>ci===col?Number(val)||0:c):r);
    return {...f,empTable:t};
  });

  const rowTotal  = (row) => form.empTable[row].reduce((a,b)=>a+b,0);
  const colTotal  = (col) => form.empTable.reduce((a,r)=>a+r[col],0);
  const grandTotal= ()    => form.empTable.flat().reduce((a,b)=>a+b,0);
  const scrollTo  = (id)  => { const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); };

  const submit = async(asDraft=false)=>{
    if(!form.organizationName.trim()){ toast.error('Organization name required'); scrollTo('basic-info'); return; }
    if(!form.scopeOfCertification.trim()){ toast.error('Scope required'); scrollTo('basic-info'); return; }
    if(!asDraft && form.standards.length===0){ toast.error('Select at least one standard'); scrollTo('standards-sec'); return; }
    setSaving(true);
    try{
      const payload={
        ...form,
        isoStandard:form.standards[0]||'ISO 9001:2015',
        scope:form.scopeOfCertification,
        country:'India',
        employeeCount:{headOffice:grandTotal(),branches:0,temporary:0,total:grandTotal()},
      };
      if(isClient) delete payload.client;
      else if(!payload.client) delete payload.client;
      let appId = id;
      if(isEdit){
        await axios.put(`/api/applications/${id}`, payload);
      } else {
        const {data} = await axios.post('/api/applications', payload);
        appId = data._id;
      }
      if(!asDraft) await axios.post(`/api/applications/${appId}/submit`).catch(()=>{});
      toast.success(isEdit ? (asDraft?'Changes saved':'Application updated!')
                           : (asDraft?'Saved as draft':'Application submitted!'));
      navigate(backTo);
    }catch(e){
      toast.error(e?.response?.data?.message||'Failed to save application');
    }finally{ setSaving(false); }
  };

  const has14001 = form.standards.includes('ISO 14001:2015');
  const has45001 = form.standards.includes('ISO 45001:2018');
  const has50001 = form.standards.includes('ISO 50001:2018');
  const has22000 = form.standards.includes('ISO 22000:2018');
  const has27001 = form.standards.includes('ISO 27001:2022');
  const showEnv  = has14001 || has45001;
  const hasISOAdd= has50001 || showEnv || has22000 || has27001;

  const navLinks = [
    {id:'basic-info',    label:'Basic Info',    desc:'Organisation & Contact'},
    {id:'standards-sec', label:'Standards',     desc:'ISO Standards & Type'},
    {id:'employees-sec', label:'Employees',     desc:'Workforce Details'},
    {id:'mgmt-sec',      label:'Mgmt System',   desc:'Management Info'},
    {id:'audit-sec',     label:'Audit Type',    desc:'Joint / Combined Audit'},
    ...(hasISOAdd?[{id:'iso-add-sec',label:'ISO Details',desc:'Additional Details'}]:[]),
    {id:'submit-sec',    label:'Submit',        desc:'Review & Submit'},
  ];

  /* ─── render ─── */
  if (loadingApp) {
    return <Layout title="Edit Application"><div className="loading-box"><div className="spinner"/></div></Layout>;
  }
  return (
    <Layout title={isEdit ? 'Edit Application' : 'New Application'}>
      <div className="audit-wrap">

        {/* Header */}
        <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <button className="btn btn-ghost btn-sm" style={{flexShrink:0}} onClick={()=>navigate(backTo)}>
              <ArrowLeft size={14}/> Back
            </button>
            <div>
              <h1 className="page-title">{isEdit?'Edit Application':isClient?'Apply for ISO Certification':'New Application'}</h1>
              <p className="page-subtitle">Request for Proposal cum Application Form — QC Certification</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={()=>submit(true)} disabled={saving}>
            <Save size={14}/> Save Draft
          </button>
        </div>

        {/* Standards banner */}
        {form.standards.length>0&&(
          <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{fontSize:10.5,fontWeight:700,color:'#9a3412',textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap'}}>Standards:</span>
            {form.standards.map(s=>(
              <span key={s} style={{padding:'3px 10px',borderRadius:20,background:'white',border:'1px solid #fed7aa',fontSize:11,fontWeight:600,color:'var(--primary-dark)'}}>{s}</span>
            ))}
          </div>
        )}

        <div className="audit-layout">

          {/* Sidebar */}
          <div className="audit-sidebar">
            <div style={{background:'white',borderRadius:12,border:'1px solid #f1f5f9',padding:'14px 10px',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:9.5,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10,paddingLeft:6}}>
                Jump to Section
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {navLinks.map(({id,label,desc})=>(
                  <button key={id} onClick={()=>scrollTo(id)}
                    style={{display:'flex',alignItems:'flex-start',gap:8,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left'}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:'var(--gray-700)',lineHeight:1.3}}>{label}</div>
                      <div style={{fontSize:10,color:'var(--gray-400)',marginTop:1}}>{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9',display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={()=>submit(true)} disabled={saving}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'8px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'white',color:'var(--gray-700)',cursor:saving?'not-allowed':'pointer',fontSize:12,fontWeight:600,opacity:saving?0.6:1}}>
                  <Save size={12}/> Save Draft
                </button>
                <button onClick={()=>submit(false)} disabled={saving}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'9px',borderRadius:8,border:'none',background:'var(--primary)',color:'white',cursor:saving?'not-allowed':'pointer',fontSize:12,fontWeight:600,opacity:saving?0.6:1}}>
                  <CheckCircle size={13}/> {saving?'Submitting…':'Submit'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Form ── */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* ─── Basic Info ─── */}
            <SecCard id="basic-info" title="Basic Information">
              <div style={{background:'linear-gradient(135deg,var(--primary-50),white)',border:'1.5px solid var(--primary-200)',borderRadius:10,padding:'12px 18px',marginBottom:22,textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:15,color:'var(--text-1)',marginBottom:2}}>Request for Proposal cum Application Form</div>
                <div style={{fontSize:11.5,color:'var(--gray-500)'}}>QC Certification · ISO Certification Management</div>
              </div>
              {!isClient&&(
                <Row>
                  <FG label="REFNO"><input className="form-control" placeholder="Auto-generated" value={form.refno} onChange={e=>set('refno',e.target.value)}/></FG>
                  <FG label="Select Client"><select className="form-control" value={form.client} onChange={e=>set('client',e.target.value)}>
                    <option value="">— Assign later —</option>
                    {clients.map(c=><option key={c._id} value={c._id}>
                      {c.company || c.name} — {c.branchLabel || 'Main Branch'} — {c.clientId || c.email}{c.isoStandard ? ` — ${c.isoStandard}` : ''}
                    </option>)}
                  </select></FG>
                </Row>
              )}
              <FG label="Name of Organization" required>
                <input className="form-control" placeholder="e.g. ABC Manufacturing Ltd" value={form.organizationName} onChange={e=>set('organizationName',e.target.value)}/>
              </FG>
              <FG label="Address" required>
                <textarea className="form-control" rows={3} placeholder="Full address" value={form.address} onChange={e=>set('address',e.target.value)}/>
              </FG>
              <FG label="Additional Sites / Addresses, if any">
                <textarea className="form-control" rows={2} placeholder="List additional site addresses" value={form.additionalSites} onChange={e=>set('additionalSites',e.target.value)}/>
              </FG>
              <Row>
                <FG label="Mobile Number" required>
                  <div className="mobile-input-row">
                    <select className="form-control" value={form.countryCode} onChange={e=>set('countryCode',e.target.value)}>
                      {COUNTRY_CODES.map(c=><option key={c.code+c.country} value={c.code}>{c.code} {c.country}</option>)}
                    </select>
                    <input className="form-control" placeholder="9000000000" value={localMobileNumber(form.mobileNumber, form.countryCode)}
                      onChange={e=>set('mobileNumber',e.target.value.replace(/\D/g,'').slice(0,15))}/>
                  </div>
                </FG>
                <FG label="Email Id"><input type="email" className="form-control" placeholder="info@company.com" value={form.emailId} onChange={e=>set('emailId',e.target.value)}/></FG>
                <FG label="Contact Person" required><input className="form-control" placeholder="Full name" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)}/></FG>
                <FG label="Designation"><input className="form-control" placeholder="e.g. Quality Manager" value={form.designation} onChange={e=>set('designation',e.target.value)}/></FG>
              </Row>
              <Row mb={0}>
                <FG label="Mode of Working">
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    {['Online','Onsite','Hybrid'].map(m=>(
                      <label key={m} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'8px 14px',
                        border:`1.5px solid ${form.modeOfWorking===m?'var(--primary)':'var(--gray-200)'}`,
                        borderRadius:8,background:form.modeOfWorking===m?'var(--primary-50)':'white',
                        fontWeight:form.modeOfWorking===m?700:500,fontSize:13,
                        color:form.modeOfWorking===m?'var(--primary-dark)':'var(--gray-500)'}}>
                        <input type="radio" name="mode" value={m} checked={form.modeOfWorking===m} onChange={()=>set('modeOfWorking',m)} style={{accentColor:'var(--primary)'}}/>
                        {m}
                      </label>
                    ))}
                  </div>
                </FG>
                {form.modeOfWorking==='Hybrid'&&(
                  <FG label="In-case of Hybrid, Core activities Online or Onsite?">
                    <select className="form-control" value={form.hybridCoreActivities} onChange={e=>set('hybridCoreActivities',e.target.value)}>
                      <option value="">Select</option>
                      <option>Core activities Online</option>
                      <option>Core activities Onsite</option>
                    </select>
                  </FG>
                )}
              </Row>
              <FG label="Scope of Certification" required>
                <textarea className="form-control" rows={4} placeholder="Describe the scope of activities, products/services to be certified…" value={form.scopeOfCertification} onChange={e=>set('scopeOfCertification',e.target.value)}/>
              </FG>
            </SecCard>

            {/* ─── Standards ─── */}
            <SecCard id="standards-sec" title="Standards & Application Type">
              <Row>
                <FG label="Main Processes / Activities" full>
                  <input className="form-control" placeholder="e.g. purchase, store, production" value={form.mainProcesses} onChange={e=>set('mainProcesses',e.target.value)}/>
                </FG>
                <FG label="Outsourced Processes, if any" full>
                  <input className="form-control" placeholder="e.g. printing, packaging" value={form.outsourcedProcesses} onChange={e=>set('outsourcedProcesses',e.target.value)}/>
                </FG>
              </Row>
              <div className="form-group">
                <label className="form-label">Standard(s)<span style={{color:'var(--red)'}}> *</span> <span style={{fontWeight:400,color:'var(--gray-400)'}}>— tick all applicable</span></label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:8,marginBottom:8}}>
                  {ISO_LIST.map(s=>(
                    <label key={s} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 13px',
                      border:`1.5px solid ${form.standards.includes(s)?'var(--primary)':'var(--gray-200)'}`,
                      borderRadius:8,cursor:'pointer',background:form.standards.includes(s)?'var(--primary-50)':'white',transition:'all .14s'}}>
                      <input type="checkbox" checked={form.standards.includes(s)} onChange={()=>toggleStd(s)} style={{accentColor:'var(--primary)',width:15,height:15,flexShrink:0}}/>
                      <span style={{fontSize:12.5,fontWeight:form.standards.includes(s)?700:500,color:form.standards.includes(s)?'var(--primary-dark)':'var(--gray-600)'}}>{s}</span>
                    </label>
                  ))}
                  <label style={{display:'flex',alignItems:'center',gap:9,padding:'9px 13px',border:'1.5px solid var(--gray-200)',borderRadius:8,cursor:'pointer',background:'white'}}>
                    <input type="checkbox" checked={form.standards.includes('Others')} onChange={()=>toggleStd('Others')} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                    <span style={{fontSize:12.5,color:'var(--gray-600)'}}>Others</span>
                  </label>
                </div>
                {form.standards.length>0&&(
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                    {form.standards.map(s=><span key={s} className="badge bdg-info" style={{fontSize:10.5}}>{s}</span>)}
                  </div>
                )}
                {form.standards.includes('Others')&&(
                  <input className="form-control" style={{marginTop:8}} placeholder="Specify other standard(s)" value={form.othersStandard} onChange={e=>set('othersStandard',e.target.value)}/>
                )}
              </div>
              <Row mb={0}>
                <FG label="Application Type">
                  <select className="form-control" value={form.applicationType} onChange={e=>set('applicationType',e.target.value)}>
                    {APP_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <div style={{fontSize:10.5,color:'var(--gray-400)',marginTop:3}}>Initial / Surveillance / Re-certification / Un-Announced / Follow-up</div>
                </FG>
                <FG label="Accreditation Body">
                  <select className="form-control" value={form.accreditationBody} onChange={e=>set('accreditationBody',e.target.value)}>
                    {ACCRED.map(a=><option key={a}>{a}</option>)}
                  </select>
                </FG>
              </Row>
            </SecCard>

            {/* ─── Employees ─── */}
            <SecCard id="employees-sec" title="Employees & Workforce">
              <div style={{display:'flex',gap:14,marginBottom:18,flexWrap:'wrap'}}>
                {[{label:'No. of Employees — Total',field:'totalEmployees'},{label:'Contractual',field:'contractual'},{label:'Working No. of Shifts',field:'workingShifts'}].map(({label,field})=>(
                  <div key={field} style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</div>
                    <input className="form-control" type="number" min="0" value={form[field]} onChange={e=>set(field,Number(e.target.value)||0)}/>
                  </div>
                ))}
              </div>
              <div style={{overflowX:'auto',marginBottom:16}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:750,fontSize:12}}>
                  <thead>
                    <tr>
                      <TCell head>Activities</TCell>
                      {EMP_COLS.map(c=><TCell key={c} head>{c}</TCell>)}
                      <TCell head>Total</TCell>
                    </tr>
                  </thead>
                  <tbody>
                    {EMP_ROWS.map((row,ri)=>(
                      <tr key={ri}>
                        <td style={{padding:'8px 12px',fontWeight:600,fontSize:12.5,border:'1px solid var(--primary-100)',background:'var(--primary-50)',color:'var(--text-1)',minWidth:180}}>{row}</td>
                        {EMP_COLS.map((_,ci)=>(
                          <td key={ci} style={{padding:'5px 7px',border:'1px solid var(--gray-100)',background:ri%2===0?'white':'var(--gray-50)'}}>
                            <input type="number" min="0" value={form.empTable[ri][ci]}
                              onChange={e=>setEmp(ri,ci,e.target.value)}
                              style={{width:'100%',padding:'5px 7px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,textAlign:'center',outline:'none',background:'white'}}/>
                          </td>
                        ))}
                        <td style={{padding:'8px 10px',textAlign:'center',fontWeight:700,fontSize:13,color:'var(--primary)',border:'1px solid var(--primary-100)',background:'var(--primary-50)'}}>{rowTotal(ri)}</td>
                      </tr>
                    ))}
                    <tr style={{background:'var(--primary-100)'}}>
                      <td style={{padding:'9px 12px',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:13,color:'var(--text-1)'}}>Total</td>
                      {EMP_COLS.map((_,ci)=>(
                        <td key={ci} style={{padding:'9px 10px',textAlign:'center',fontWeight:700,border:'1px solid var(--primary-200)',fontSize:13,color:'var(--primary-dark)'}}>{colTotal(ci)}</td>
                      ))}
                      <td style={{padding:'9px 10px',textAlign:'center',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:15,color:'var(--primary)'}}>{grandTotal()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Row mb={0}>
                <FG label="No. of personnel working away from site (if applicable)">
                  <input className="form-control" type="number" min="0" value={form.remotePersonnel} onChange={e=>set('remotePersonnel',Number(e.target.value)||0)}/>
                </FG>
                <FG label="No. of Employees (auto)">
                  <input className="form-control" value={grandTotal()} readOnly style={{background:'var(--primary-50)',fontWeight:700,color:'var(--primary)'}}/>
                </FG>
                <FG label="Operation for Weekend / Weekly Holiday" full>
                  <input className="form-control" placeholder="e.g. Saturday half day, Sunday off" value={form.weekendOperation} onChange={e=>set('weekendOperation',e.target.value)}/>
                </FG>
              </Row>
            </SecCard>

            {/* ─── Management System Info ─── */}
            <SecCard id="mgmt-sec" title="Management System Information">
              {[
                {n:'1.',label:'Applicable Legal, statuary & regulatory act',hint:'(i.e., Pvt. Ltd. / Ltd. / Partnership / proprietorship / Labour law)',field:'legalAct'},
                {n:'2.',label:'Organization Key Process Area',hint:'(i.e., purchase/store/production etc.)',field:'keyProcessArea'},
                {n:'3.',label:'Organization Products / Services',hint:'(i.e., abc & xyz products etc.)',field:'productsServices'},
                {n:'4.',label:'Any outsourcing process',hint:'(i.e., printing etc.)',field:'outsourcingProcess'},
                {n:'5.',label:'Consultant details, if used for Management System Preparation',hint:'',field:'consultantDetails'},
              ].map(({n,label,hint,field})=>(
                <div key={field} className="form-group">
                  <label className="form-label">{n} {label} <span style={{fontWeight:400,color:'var(--gray-400)'}}>{hint}</span></label>
                  <input className="form-control" value={form[field]} onChange={e=>set(field,e.target.value)}/>
                </div>
              ))}
              <Row>
                <FG label="6. Organization establishment date"><input type="date" className="form-control" value={form.establishmentDate} onChange={e=>set('establishmentDate',e.target.value)}/></FG>
                <FG label="7. Manual Date"><input type="date" className="form-control" value={form.manualDate} onChange={e=>set('manualDate',e.target.value)}/></FG>
                <FG label="8. Internal audit date (Or planned date)"><input type="date" className="form-control" value={form.internalAuditDate} onChange={e=>set('internalAuditDate',e.target.value)}/></FG>
                <FG label="9. Management review date (Or planned date)"><input type="date" className="form-control" value={form.managementReviewDate} onChange={e=>set('managementReviewDate',e.target.value)}/></FG>
              </Row>
              <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 14px'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:600,fontSize:13,marginBottom:form.alreadyCertified?12:0}}>
                  <input type="checkbox" checked={form.alreadyCertified} onChange={e=>set('alreadyCertified',e.target.checked)} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                  If org. already ISO Certified, write the standards:
                </label>
                {form.alreadyCertified&&(
                  <Row mb={0}>
                    <FG label="Certified Standard(s)"><input className="form-control" placeholder="e.g. ISO 9001:2015" value={form.certStandard} onChange={e=>set('certStandard',e.target.value)}/></FG>
                    <FG label="Certification Body"><input className="form-control" value={form.certBody} onChange={e=>set('certBody',e.target.value)}/></FG>
                    <FG label="Issue Date"><input type="date" className="form-control" value={form.certIssueDate} onChange={e=>set('certIssueDate',e.target.value)}/></FG>
                    <FG label="Expiry Date"><input type="date" className="form-control" value={form.certExpiryDate} onChange={e=>set('certExpiryDate',e.target.value)}/></FG>
                  </Row>
                )}
              </div>
            </SecCard>

            {/* ─── Joint / Combined Audit ─── */}
            <div id="audit-sec" style={{background:'white',borderRadius:12,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.06)',scrollMarginTop:80}}>
              <div style={{background:'var(--primary)',color:'white',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <span style={{fontWeight:700,fontSize:14}}>In case of joint, combined, integrated audit:—</span>
                <div style={{display:'flex',gap:18}}>
                  {['YES','NO'].map(v=>(
                    <label key={v} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:'white',
                      fontWeight:form.jointAuditMain===v?800:400,fontSize:14,userSelect:'none'}}>
                      <input type="radio" name="jointAuditMain" value={v}
                        checked={form.jointAuditMain===v}
                        onChange={()=>set('jointAuditMain',v)}
                        style={{accentColor:'white',width:15,height:15}}/>
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              {form.jointAuditMain==='YES'&&(
                <div>
                  {[
                    {label:'Combined Audit — Do you want the audits for several certification programmes/standards to be conducted as a Combined Audit?',field:'combinedAudit'},
                    {label:'Joint Audit — Do you want the audits to be conducted as a Joint Audit with another certification body / audit team?',field:'jointAudit'},
                    {label:'Integrated Audit — Do you want the audits for multiple management system standards to be conducted as an Integrated Audit?',field:'integratedAudit'},
                    {label:'Separate Audit — Do you want each certification programme/standard to be audited separately?',field:'separateAudit'},
                    {label:'Is Internal Audit Combined?',field:'internalAuditCombined'},
                    {label:'Is MRM Combined including business strategy and plan?',field:'mrmCombined'},
                    {label:'Is Manual, Procedures are Combined?',field:'manualCombined'},
                    {label:'Is Implemented System Integrated?',field:'systemIntegrated'},
                    {label:'Is there integrated approach for correction, corrective action and continual improvement?',field:'integratedApproach'},
                    {label:'Is there any integrated management support and responsibilities?',field:'integratedMgmt'},
                  ].map(({label,field})=>(
                    <YNRow key={field} label={label} field={field} form={form} set={set}/>
                  ))}
                  <div style={{padding:'9px 14px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <span style={{fontSize:12.5,color:'var(--text-1)',flex:1}}>Percentage level of integration (decided by QCC):</span>
                    <input className="form-control" style={{width:160}} placeholder="e.g. 80%" value={form.integrationPercentage} onChange={e=>set('integrationPercentage',e.target.value)}/>
                  </div>
                </div>
              )}
            </div>

            {/* ─── ISO Additional Details ─── */}
            {hasISOAdd&&(
              <SecCard id="iso-add-sec" title="ISO Additional Details">

                {/* ISO 50001 */}
                {has50001&&(
                  <AccSec
                    title="This Section for ISO 50001:2018 – Energy Management System – Additional Details"
                    color="#16a34a"
                    isOpen={openSecs.iso50001}
                    onToggle={()=>toggleSec('iso50001')}
                  >
                    <Row mb={0}>
                      <FG label="Annual Energy Consumption (Unit KWH etc.)"><input className="form-control" value={form.annualEnergyConsumption} onChange={e=>set('annualEnergyConsumption',e.target.value)}/></FG>
                      <FG label="Number of EnMS Effective Personnels"><input className="form-control" type="number" min="0" value={form.enmsPersonnels} onChange={e=>set('enmsPersonnels',e.target.value)}/></FG>
                      <FG label="Name & Number of Energy Sources"><input className="form-control" value={form.energySources} onChange={e=>set('energySources',e.target.value)}/></FG>
                      <FG label="Name & Number of significant energy uses (SEUs)"><input className="form-control" value={form.significantEnergyUses} onChange={e=>set('significantEnergyUses',e.target.value)}/></FG>
                    </Row>
                  </AccSec>
                )}

                {/* ISO 14001 / 45001 */}
                {showEnv&&(
                  <AccSec
                    title={`This Section for ${has14001?'ISO 14001:2015':''}${has14001&&has45001?' / ':''}${has45001?'ISO 45001:2018':''} – Additional Details (Fill out applicable details)`}
                    color="#dc2626"
                    isOpen={openSecs.isoEnv}
                    onToggle={()=>toggleSec('isoEnv')}
                  >
                    <div className="form-group">
                      <label className="form-label">Select Condition of your location (tick all applicable)</label>
                      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        {LOCATION_CONDITIONS.map(l=>(
                          <label key={l} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'7px 12px',
                            border:`1.5px solid ${form.locationConditions.includes(l)?'#dc2626':'var(--gray-200)'}`,
                            borderRadius:8,background:form.locationConditions.includes(l)?'#fef2f2':'white',
                            fontSize:12.5,fontWeight:form.locationConditions.includes(l)?700:500}}>
                            <input type="checkbox" checked={form.locationConditions.includes(l)} onChange={()=>toggleLoc(l)} style={{accentColor:'#dc2626',width:14,height:14}}/>{l}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Row>
                      <FG label="Operating air emission facility"><select className="form-control" value={form.airEmissionFacility} onChange={e=>set('airEmissionFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                      <FG label="Operating waste water treatment facility"><select className="form-control" value={form.wastewaterFacility} onChange={e=>set('wastewaterFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                      <FG label="Kind of wastes & amount (Ton/year)"><input className="form-control" value={form.wastesAmount} onChange={e=>set('wastesAmount',e.target.value)}/></FG>
                      <FG label="Usage of hazardous chemical substances?"><select className="form-control" value={form.hazardousChemicals} onChange={e=>set('hazardousChemicals',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                    </Row>
                    {[
                      {label:'Does you have Pollution Clearance from local authorities?',field:'pollutionClearance'},
                      {label:"Does you have more than 5 critical environmental aspect or OHSAS risks? (ex: air, water, waste, noise, chemical, soil)",field:'criticalAspectsOHSAS'},
                    ].map(({label,field})=>(
                      <YNRow key={field} label={label} field={field} form={form} set={set}/>
                    ))}
                    {[
                      {label:'Details of the Environmental Aspects (if More Than 5 critical aspect)',field:'envAspectDetails'},
                      {label:'How many no. of personnel working on site?',field:'personnelOnSite'},
                      {label:'How many no. of personnel working away from site?',field:'personnelAwayFromSite'},
                      {label:'What are the risks for personnel working away from the site?',field:'risksAwayFromSite'},
                      {label:'Details of the OHSMS Significant RISK (if More Than 5 critical OHSMS RISK)',field:'ohsmsSignificantRisk'},
                    ].map(({label,field})=>(
                      <div key={field} className="form-group">
                        <label className="form-label" style={{fontSize:12}}>{label}</label>
                        <input className="form-control" value={form[field]} onChange={e=>set(field,e.target.value)}/>
                      </div>
                    ))}
                    <YNRow label="Does your organization is not regulated by the law and don't need any license?" field="notRegulatedByLaw" form={form} set={set}/>
                    <div className="form-group" style={{marginTop:10}}>
                      <label className="form-label">Please write relevant laws applicable to your organization</label>
                      <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:6}}>(Ex. air, water, waste, noise, chemical, mining, labour etc. laws), process related and product related legal requirement.</div>
                      <textarea className="form-control" rows={3} value={form.relevantLaws} onChange={e=>set('relevantLaws',e.target.value)}/>
                    </div>
                  </AccSec>
                )}

                {/* ISO 22000 */}
                {has22000&&(
                  <AccSec
                    title="This Section for ISO 22000:2018 – Food Safety Management System – Additional Details"
                    color="#d97706"
                    isOpen={openSecs.iso22000}
                    onToggle={()=>toggleSec('iso22000')}
                  >
                    <Row>
                      <FG label="Number of Sites to be Audited"><input className="form-control" type="number" min="0" value={form.iso22000NumSites} onChange={e=>set('iso22000NumSites',e.target.value)}/></FG>
                      <FG label="Have you implemented HACCP Principles?">
                        <select className="form-control" value={form.iso22000HACCP} onChange={e=>set('iso22000HACCP',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option><option>In Progress</option>
                        </select>
                      </FG>
                      <FG label="FSSAI License Registration No."><input className="form-control" placeholder="e.g. 12345678901234" value={form.iso22000FSSAI} onChange={e=>set('iso22000FSSAI',e.target.value)}/></FG>
                      <FG label="Total No. of HACCP Studies"><input className="form-control" type="number" min="0" value={form.iso22000HACCPStudies} onChange={e=>set('iso22000HACCPStudies',e.target.value)}/></FG>
                    </Row>
                    <Row>
                      <FG label="How many process lines in production?"><input className="form-control" type="number" min="0" value={form.iso22000ProcessLines} onChange={e=>set('iso22000ProcessLines',e.target.value)}/></FG>
                      <FG label="Level of Automation">
                        <select className="form-control" value={form.iso22000Automation} onChange={e=>set('iso22000Automation',e.target.value)}>
                          <option value="">Select</option><option>Manual Operation</option><option>Semi-Automatic Operation</option><option>Fully Automatic Operation</option>
                        </select>
                      </FG>
                      <FG label="Labour Intensiveness">
                        <select className="form-control" value={form.iso22000LabourIntensiveness} onChange={e=>set('iso22000LabourIntensiveness',e.target.value)}>
                          <option value="">Select</option><option>Low</option><option>Medium</option><option>High</option>
                        </select>
                      </FG>
                      <FG label="Building Area (sq.ft / m²)"><input className="form-control" placeholder="e.g. 5000 sq.ft" value={form.iso22000BuildingArea} onChange={e=>set('iso22000BuildingArea',e.target.value)}/></FG>
                    </Row>
                    <Row>
                      <FG label="Does the organization has Closed Production System?">
                        <select className="form-control" value={form.iso22000ClosedProduction} onChange={e=>set('iso22000ClosedProduction',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                      <FG label="Does the organization has Mechanized Operation?">
                        <select className="form-control" value={form.iso22000MechanizedOp} onChange={e=>set('iso22000MechanizedOp',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                      <FG label="In-house Lab Testing Available?">
                        <select className="form-control" value={form.iso22000InhouseLab} onChange={e=>set('iso22000InhouseLab',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                      <FG label="Any prior audits conducted?">
                        <select className="form-control" value={form.iso22000PriorAudits} onChange={e=>set('iso22000PriorAudits',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                    </Row>
                    <Row>
                      <FG label="Product Types"><input className="form-control" placeholder="e.g. Packaged food, beverages" value={form.iso22000ProductTypes} onChange={e=>set('iso22000ProductTypes',e.target.value)}/></FG>
                      <FG label="Product Lines"><input className="form-control" value={form.iso22000ProductLines} onChange={e=>set('iso22000ProductLines',e.target.value)}/></FG>
                      <FG label="Product Development (Yes/No)">
                        <select className="form-control" value={form.iso22000ProductDev} onChange={e=>set('iso22000ProductDev',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                    </Row>
                    <Row>
                      <FG label="CCPs (Critical Control Points)"><input className="form-control" type="number" min="0" placeholder="Number of CCPs" value={form.iso22000CCPs} onChange={e=>set('iso22000CCPs',e.target.value)}/></FG>
                      <FG label="PRPs (Prerequisite Programs)"><input className="form-control" type="number" min="0" placeholder="Number of PRPs" value={form.iso22000PRPs} onChange={e=>set('iso22000PRPs',e.target.value)}/></FG>
                      <FG label="OPRPs (Operational PRPs)"><input className="form-control" type="number" min="0" placeholder="Number of OPRPs" value={form.iso22000OPRPs} onChange={e=>set('iso22000OPRPs',e.target.value)}/></FG>
                    </Row>
                    <Row>
                      <FG label="Any seasonality issues?">
                        <select className="form-control" value={form.iso22000Seasonality} onChange={e=>set('iso22000Seasonality',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                      <FG label="Translator Required?">
                        <select className="form-control" value={form.iso22000Translator} onChange={e=>set('iso22000Translator',e.target.value)}>
                          <option value="">Select</option><option>Yes</option><option>No</option>
                        </select>
                      </FG>
                    </Row>
                    {form.iso22000Seasonality==='Yes'&&(
                      <FG label="Seasonality Details (Product, Season/Months, Peak Production, Impact)" full>
                        <textarea className="form-control" rows={3} placeholder="A. Product(s):&#10;B. Season/Months of operation:&#10;C. Peak production period:&#10;D. Impact on operations:" value={form.iso22000SeasonDetails} onChange={e=>set('iso22000SeasonDetails',e.target.value)}/>
                      </FG>
                    )}
                    <FG label="Infrastructure Details" full>
                      <textarea className="form-control" rows={2} value={form.iso22000Infrastructure} onChange={e=>set('iso22000Infrastructure',e.target.value)}/>
                    </FG>
                    {form.iso22000PriorAudits==='Yes'&&(
                      <FG label="If yes, attach audit findings / details" full>
                        <textarea className="form-control" rows={2} value={form.iso22000AuditReport} onChange={e=>set('iso22000AuditReport',e.target.value)}/>
                      </FG>
                    )}
                    <FG label="Other Factors (specify)" full>
                      <input className="form-control" value={form.iso22000OtherFactors} onChange={e=>set('iso22000OtherFactors',e.target.value)}/>
                    </FG>
                  </AccSec>
                )}

                {/* ISO 27001 */}
                {has27001&&(
                  <AccSec
                    title="This Section for ISO 27001:2022 – Information Security Management System – Additional Details"
                    color="#7c3aed"
                    isOpen={openSecs.iso27001}
                    onToggle={()=>toggleSec('iso27001')}
                  >
                    <Row>
                      <FG label="SOA Version No."><input className="form-control" placeholder="e.g. v1.0" value={form.iso27001SoaVersion} onChange={e=>set('iso27001SoaVersion',e.target.value)}/></FG>
                      <FG label="Date of Implementation"><input type="date" className="form-control" value={form.iso27001SoaDate} onChange={e=>set('iso27001SoaDate',e.target.value)}/></FG>
                      <FG label="Risk Assessment & Risk Treatment Date"><input type="date" className="form-control" value={form.iso27001RiskAssessmentDate} onChange={e=>set('iso27001RiskAssessmentDate',e.target.value)}/></FG>
                    </Row>
                    <FG label="Any outsourced process (i.e., IT / Data Centre / Server)" full>
                      <input className="form-control" value={form.iso27001OutsourcedProcess} onChange={e=>set('iso27001OutsourcedProcess',e.target.value)}/>
                    </FG>
                    <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                      <div style={{fontWeight:700,fontSize:12.5,color:'var(--primary-dark)',marginBottom:10}}>Business Complexity — Select applicable level (1 / 2 / 3)</div>
                      <Row mb={0}>
                        <FG label="A. Type(s) of business and regulatory requirements">
                          <select className="form-control" value={form.iso27001BusinessA} onChange={e=>set('iso27001BusinessA',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — Non-critical business / non-regulated sectors</option>
                            <option value="2">2 — Customers in critical business sectors</option>
                            <option value="3">3 — Works in critical business sectors</option>
                          </select>
                        </FG>
                        <FG label="B. Process and tasks">
                          <select className="form-control" value={form.iso27001BusinessB} onChange={e=>set('iso27001BusinessB',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — Standard & repetitive tasks</option>
                            <option value="2">2 — Standard but non-repetitive, high number of products/services</option>
                            <option value="3">3 — Complex processes, many business units</option>
                          </select>
                        </FG>
                        <FG label="C. Level of establishment of the MS">
                          <select className="form-control" value={form.iso27001BusinessC} onChange={e=>set('iso27001BusinessC',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — ISMS well established / other MS in place</option>
                            <option value="2">2 — Some elements of other MS implemented</option>
                            <option value="3">3 — No other MS; ISMS new and not established</option>
                          </select>
                        </FG>
                      </Row>
                    </div>
                    <div style={{background:'#f5f3ff',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                      <div style={{fontWeight:700,fontSize:12.5,color:'#7c3aed',marginBottom:10}}>IT Complexity — Select applicable level (1 / 2 / 3)</div>
                      <Row mb={0}>
                        <FG label="A. IT infrastructure complexity">
                          <select className="form-control" value={form.iso27001ITA} onChange={e=>set('iso27001ITA',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — Few / highly standardized IT platforms</option>
                            <option value="2">2 — Several different IT platforms</option>
                            <option value="3">3 — Many different IT platforms & networks</option>
                          </select>
                        </FG>
                        <FG label="B. Dependency on outsourcing / cloud services">
                          <select className="form-control" value={form.iso27001ITB} onChange={e=>set('iso27001ITB',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — Little or no dependency on outsourcing</option>
                            <option value="2">2 — Some dependency, some business activities</option>
                            <option value="3">3 — High dependency, large impact on business</option>
                          </select>
                        </FG>
                        <FG label="C. Information System development">
                          <select className="form-control" value={form.iso27001ITC} onChange={e=>set('iso27001ITC',e.target.value)}>
                            <option value="">Select</option>
                            <option value="1">1 — None or very limited in-house development</option>
                            <option value="2">2 — Some in-house / outsourced development</option>
                            <option value="3">3 — Extensive in-house / outsourced development</option>
                          </select>
                        </FG>
                      </Row>
                    </div>
                    <FG label="Confirmation of access to organizational records" full>
                      <select className="form-control" value={form.iso27001RecordsAccess} onChange={e=>set('iso27001RecordsAccess',e.target.value)}>
                        <option value="">Select</option>
                        <option>Agreed to share all ISMS records for review by audit team</option>
                        <option>Not agreed to share all ISMS records (contains confidential information)</option>
                      </select>
                    </FG>
                    <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 16px',marginTop:4}}>
                      <div style={{fontWeight:700,fontSize:12.5,color:'var(--primary-dark)',marginBottom:10}}>Personnel Access to Information Processing Facilities</div>
                      <Row mb={0}>
                        <FG label="No. of persons with read-only access"><input className="form-control" type="number" min="0" value={form.iso27001ReadOnlyPersons} onChange={e=>set('iso27001ReadOnlyPersons',Number(e.target.value)||0)}/></FG>
                        <FG label="No. of persons with no access"><input className="form-control" type="number" min="0" value={form.iso27001NoAccessPersons} onChange={e=>set('iso27001NoAccessPersons',Number(e.target.value)||0)}/></FG>
                        <FG label="No. of persons with restricted access"><input className="form-control" type="number" min="0" value={form.iso27001RestrictedPersons} onChange={e=>set('iso27001RestrictedPersons',Number(e.target.value)||0)}/></FG>
                        <FG label="No. of persons with strict limitations"><input className="form-control" type="number" min="0" value={form.iso27001StrictPersons} onChange={e=>set('iso27001StrictPersons',Number(e.target.value)||0)}/></FG>
                      </Row>
                    </div>
                  </AccSec>
                )}

              </SecCard>
            )}

            {/* ─── Submit ─── */}
            <SecCard id="submit-sec" title="Summary & Submit">

              {/* Summary */}
              <div style={{background:'var(--primary-50)',border:'1.5px solid var(--primary-200)',borderRadius:10,padding:'16px 18px',marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--primary-dark)',marginBottom:12,display:'flex',alignItems:'center',gap:7}}>
                  <CheckCircle size={15} style={{color:'var(--primary)'}}/>Summary — Review before Submit
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px 20px'}}>
                  {[
                    {l:'Organization', v:form.organizationName||'—'},
                    {l:'Standards',    v:form.standards.length>0?form.standards.join(', '):'—'},
                    {l:'App. Type',    v:form.applicationType},
                    {l:'Mode',         v:form.modeOfWorking},
                    {l:'Contact',      v:form.contactPerson||'—'},
                    {l:'Total Emp.',   v:grandTotal()},
                    {l:'Accreditation',v:form.accreditationBody},
                    {l:'Scope',        v:form.scopeOfCertification?form.scopeOfCertification.slice(0,60)+'…':'—'},
                  ].map(({l,v})=>(
                    <div key={l} style={{borderBottom:'1px solid var(--primary-100)',paddingBottom:5}}>
                      <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--primary)',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:12.5,fontWeight:600,color:'var(--text-1)',wordBreak:'break-word'}}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Declaration Table */}
              <div style={{border:'1.5px solid var(--primary-200)',borderRadius:10,overflow:'hidden',marginBottom:20}}>

                {/* Multi-site notice */}
                <div style={{background:'#fffbeb',borderBottom:'1px solid var(--primary-100)',padding:'9px 16px',fontSize:12.5,color:'#92400e',fontStyle:'italic',textAlign:'center'}}>
                  In case, if you have more site's, kindly fill this annexure per site.
                </div>

                {/* Declaration statement */}
                <div style={{background:'#e8f0fe',borderBottom:'1px solid var(--primary-200)',padding:'11px 16px',fontSize:12.5,fontWeight:600,color:'#1e3a5f',textAlign:'center',lineHeight:1.5}}>
                  Application submission: I declare that above information is true as per my best knowledge &amp; QCC can use for ISO Certification purposes
                </div>

                {/* Date + Representative Name */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid var(--primary-100)'}}>
                  <div style={{padding:'10px 16px',borderRight:'1px solid var(--primary-100)'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Date</div>
                    <input type="date" className="form-control" value={form.declarationDate} onChange={e=>set('declarationDate',e.target.value)}/>
                  </div>
                  <div style={{padding:'10px 16px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Representative Name</div>
                    <input className="form-control" placeholder="Authorised signatory name" value={form.representativeName} onChange={e=>set('representativeName',e.target.value)}/>
                  </div>
                </div>

                {/* Review section header */}
                <div style={{background:'var(--primary)',color:'white',padding:'9px 16px',fontWeight:700,fontSize:13,textAlign:'center',letterSpacing:'.03em'}}>
                  Review (To be filled by QUALITY CONTROL CERTIFICATION)
                </div>

                {/* Acceptance / Not Acceptance */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid var(--primary-100)'}}>
                  <div style={{padding:'10px 16px',borderRight:'1px solid var(--primary-100)'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Acceptance, Ref. No</div>
                    <input className="form-control" placeholder="e.g. ACC-2024-001" value={form.acceptanceRefNo} onChange={e=>set('acceptanceRefNo',e.target.value)}/>
                  </div>
                  <div style={{padding:'10px 16px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Not Acceptance</div>
                    <input className="form-control" placeholder="Reason for non-acceptance (if any)" value={form.notAcceptance} onChange={e=>set('notAcceptance',e.target.value)}/>
                  </div>
                </div>

                {/* Supplement Info */}
                <div style={{padding:'10px 16px',borderBottom:'1px solid var(--primary-100)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Supplement information, if needed</div>
                  <textarea className="form-control" rows={2} placeholder="Any supplemental information required…" value={form.supplementInfo} onChange={e=>set('supplementInfo',e.target.value)}/>
                </div>

                {/* Footer */}
                <div style={{background:'var(--primary-50)',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--primary-dark)'}}>Quality Control Certification</span>
                  <span style={{fontSize:10.5,color:'var(--gray-500)'}}>AUD-F-02-Request for Proposal cum Application Form / Rev.: 03</span>
                </div>

              </div>

              {/* Admin notes */}
              {!isClient&&(
                <div className="form-group">
                  <label className="form-label">Internal Notes (Admin only)</label>
                  <textarea className="form-control" rows={3} placeholder="Any internal notes…" value={form.adminNotes} onChange={e=>set('adminNotes',e.target.value)}/>
                </div>
              )}

            </SecCard>

            {/* Bottom action bar */}
            <div className="audit-bottom-bar">
              <button className="btn btn-secondary" onClick={()=>submit(true)} disabled={saving}>
                <Save size={14}/> Save Draft
              </button>
              <button className="btn btn-primary" onClick={()=>submit(false)} disabled={saving}>
                <FileText size={14}/> {saving?'Submitting…':'Submit Application'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
