import React, { useState, useEffect, useRef } from 'react';
import { Save, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import QMSFormPage from './QMSFormPage';
import useStandards from './useStandards';
import { localMobileNumber } from '../../../utils/phone';
const APP_TYPES = ['Initial','Surveillance','Re-certification','Un-Announced','Follow-up', 'Special Audit'];
const ACCRED = ['UAF','UASL'];
const COUNTRY_CODES = [
  {code:'+1',country:'US/Canada'},{code:'+7',country:'Russia'},{code:'+20',country:'Egypt'},
  {code:'+27',country:'South Africa'},{code:'+30',country:'Greece'},{code:'+31',country:'Netherlands'},
  {code:'+32',country:'Belgium'},{code:'+33',country:'France'},{code:'+34',country:'Spain'},
  {code:'+36',country:'Hungary'},{code:'+39',country:'Italy'},{code:'+40',country:'Romania'},
  {code:'+41',country:'Switzerland'},{code:'+43',country:'Austria'},{code:'+44',country:'UK'},
  {code:'+45',country:'Denmark'},{code:'+46',country:'Sweden'},{code:'+47',country:'Norway'},
  {code:'+48',country:'Poland'},{code:'+49',country:'Germany'},{code:'+52',country:'Mexico'},
  {code:'+54',country:'Argentina'},{code:'+55',country:'Brazil'},{code:'+56',country:'Chile'},
  {code:'+57',country:'Colombia'},{code:'+60',country:'Malaysia'},{code:'+61',country:'Australia'},
  {code:'+62',country:'Indonesia'},{code:'+63',country:'Philippines'},{code:'+64',country:'New Zealand'},
  {code:'+65',country:'Singapore'},{code:'+66',country:'Thailand'},{code:'+81',country:'Japan'},
  {code:'+82',country:'South Korea'},{code:'+84',country:'Vietnam'},{code:'+86',country:'China'},
  {code:'+90',country:'Turkey'},{code:'+91',country:'India'},{code:'+92',country:'Pakistan'},
  {code:'+94',country:'Sri Lanka'},{code:'+98',country:'Iran'},{code:'+212',country:'Morocco'},
  {code:'+213',country:'Algeria'},{code:'+216',country:'Tunisia'},{code:'+234',country:'Nigeria'},
  {code:'+254',country:'Kenya'},{code:'+255',country:'Tanzania'},{code:'+351',country:'Portugal'},
  {code:'+353',country:'Ireland'},{code:'+358',country:'Finland'},{code:'+380',country:'Ukraine'},
  {code:'+420',country:'Czech Republic'},{code:'+880',country:'Bangladesh'},{code:'+960',country:'Maldives'},
  {code:'+961',country:'Lebanon'},{code:'+962',country:'Jordan'},{code:'+964',country:'Iraq'},
  {code:'+965',country:'Kuwait'},{code:'+966',country:'Saudi Arabia'},{code:'+968',country:'Oman'},
  {code:'+971',country:'UAE'},{code:'+972',country:'Israel'},{code:'+973',country:'Bahrain'},
  {code:'+974',country:'Qatar'},{code:'+977',country:'Nepal'},
];
const EMP_ROWS = ['Top Management','Production Area / Service','Quality Control / Technical','Administration','Other'];
const EMP_COLS = ['Full Time','Part Time','Performing Same type of Job','Temporary Unskilled Workers','Effective No. Filled by QCC'];
const LOCATION_CONDITIONS = ['Special countermeasure area','Protection area of source water','Industrial complex','City'];
const emptyRow = () => Array(EMP_COLS.length).fill(0);

export const INIT = {
  refno:'', organizationName:'', address:'', additionalSites:'',
  countryCode:'+91', mobileNumber:'', emailId:'', contactPerson:'', designation:'',
  modeOfWorking:'Onsite', hybridCoreActivities:'',
  scopeOfCertification:'',
  mainProcesses:'', outsourcedProcesses:'',
  standards:[], othersStandard:'',
  applicationType:'Initial', accreditationBody:'UAF',
  totalEmployees:0, contractual:0, workingShifts:1,
  empTable: EMP_ROWS.map(()=>emptyRow()),
  remotePersonnel:0, weekendOperation:'',
  legalAct:'', keyProcessArea:'', productsServices:'',
  outsourcingProcess:'', consultantDetails:'',
  establishmentDate:'', manualDate:'', internalAuditDate:'', managementReviewDate:'',
  alreadyCertified:false, certStandard:'', certBody:'', certIssueDate:'', certExpiryDate:'',
  jointAuditMain:'',
  combinedAudit:'', jointAudit:'', integratedAudit:'', separateAudit:'',
  internalAuditCombined:'', mrmCombined:'', manualCombined:'',
  systemIntegrated:'', integratedApproach:'', integratedMgmt:'',
  integrationPercentage:'',
  annualEnergyConsumption:'', enmsPersonnels:'', energySources:'', significantEnergyUses:'',
  locationConditions:[],
  airEmissionFacility:'', wastewaterFacility:'', wastesAmount:'', hazardousChemicals:'',
  pollutionClearance:'', criticalAspectsOHSAS:'',
  envAspectDetails:'', personnelOnSite:'', personnelAwayFromSite:'',
  risksAwayFromSite:'', ohsmsSignificantRisk:'',
  notRegulatedByLaw:'', relevantLaws:'',
  iso22000NumSites:'', iso22000HACCP:'', iso22000Seasonality:'',
  iso22000SeasonDetails:'', iso22000HACCPStudies:'', iso22000ProcessLines:'',
  iso22000FSSAI:'', iso22000Automation:'', iso22000ClosedProduction:'',
  iso22000MechanizedOp:'', iso22000LabourIntensiveness:'',
  iso22000ProductTypes:'', iso22000ProductLines:'', iso22000ProductDev:'',
  iso22000CCPs:'', iso22000PRPs:'', iso22000OPRPs:'',
  iso22000BuildingArea:'', iso22000Infrastructure:'',
  iso22000InhouseLab:'', iso22000PriorAudits:'', iso22000AuditReport:'',
  iso22000Translator:'', iso22000OtherFactors:'',
  iso27001SoaVersion:'', iso27001SoaDate:'', iso27001OutsourcedProcess:'',
  iso27001RiskAssessmentDate:'',
  iso27001BusinessA:'', iso27001BusinessB:'', iso27001BusinessC:'',
  iso27001ITA:'', iso27001ITB:'', iso27001ITC:'',
  iso27001RecordsAccess:'',
  iso27001ReadOnlyPersons:0, iso27001NoAccessPersons:0,
  iso27001RestrictedPersons:0, iso27001StrictPersons:0,
  // ISO 27701 PIMS
  iso27701Role:'', iso27701PIICategories:'', iso27701SoaStatus:'',
  iso27701ConfidentialInfo:'', iso27701Conformance:'',
  iso27701PIIRisk:'', iso27701OperationalRisk:'',
  // ISO 42001 AIMS
  iso42001Role:'', iso42001ConfidentialInfo:'', iso42001AdjustmentFactors:'',
  // ISO 37001 ABMS
  iso37001EffectiveEmployees:0, iso37001Risk:'',
  // ISO 21001 EOMS
  iso21001Staff:0, iso21001Volunteers:0, iso21001ExternalStaff:0, iso21001OtherStaff:0, iso21001Risk:'',
  // ISO 22301 BCMS
  iso22301NumSites:'', iso22301CriticalProcesses:'', iso22301RTO:'', iso22301RPO:'',
  iso22301BIAStatus:'', iso22301BCPStatus:'', iso22301ExerciseFrequency:'', iso22301Risk:'',
  iso22301OutsourcedBC:'', iso22301CrisisTeam:'',
  // Multi-site
  multiSiteEmpTable:[], multiSiteSameCorporate:'', multiSiteImplementSame:'',
  multiSiteSameCEO:'', multiSiteQualitySystem:'', multiSiteSampling:{},
  // OHSMS additions
  ohsmsProcessRisks:'', envOhsasAccident:'',
  declarationDate:'', representativeName:'',
  acceptanceRefNo:'', notAcceptance:'', supplementInfo:'',
  adminNotes:'',
};

/* ── helper UI components ── */
// Free-text field that starts as a single line and grows to show all the text typed.
const GrowText = ({value, onChange, placeholder, className='form-control', style}) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      placeholder={placeholder}
      value={value||''}
      onChange={e=>onChange(e.target.value)}
      style={{resize:'none', overflow:'hidden', minHeight:40, ...style}}
    />
  );
};
const Row = ({children, mb=12}) => (
  <div className="qms-row" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'0 16px',marginBottom:mb}}>
    {children}
  </div>
);
const FG = ({label, required, children, full}) => (
  <div className="form-group" style={full?{gridColumn:'1/-1'}:{}}>
    <label className="form-label">{label}{required&&<span style={{color:'var(--red)'}}> *</span>}</label>
    {children}
  </div>
);
const TCell = ({children, head}) => (
  <td style={{
    padding:'7px 10px', border:'1px solid var(--primary-100)',
    fontWeight:head?700:400, fontSize:head?10.5:12,
    background:head?'var(--primary-50)':'white',
    color:head?'var(--primary-dark)':'var(--text-1)',
    textAlign:head?'center':'left', whiteSpace:head?'pre-wrap':'normal', lineHeight:1.3,
  }}>{children}</td>
);
const YN_COLOR = v => v==='YES' ? 'var(--green)' : v==='NO' ? 'var(--red)' : 'var(--blue)';
const YNRow = ({label, field, form, set, options=['YES','NO']}) => (
  <div style={{display:'flex',alignItems:'center',padding:'9px 14px',borderBottom:'1px solid var(--primary-50)',gap:12,flexWrap:'wrap'}}>
    <span style={{flex:1,fontSize:12.5,color:'var(--text-1)'}}>{label}</span>
    <div style={{display:'flex',gap:12}}>
      {options.map(v=>(
        <label key={v} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontWeight:form[field]===v?700:500,
          color:form[field]===v?YN_COLOR(v):'var(--gray-400)',fontSize:12.5}}>
          <input type="radio" name={'f01_'+field} value={v} checked={form[field]===v}
            onChange={()=>set(field,v)} style={{accentColor:YN_COLOR(v)}}/>
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
    {isOpen && <div className="accsec-body" style={{padding:'16px 18px'}}>{children}</div>}
  </div>
);
const SecCard = ({id, title, children}) => (
  <div id={id} style={{background:'white',borderRadius:12,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.06)',scrollMarginTop:150}}>
    <div style={{background:'var(--primary)',color:'white',padding:'10px 20px',fontWeight:700,fontSize:14}}>
      {title}
    </div>
    <div className="sec-card-body" style={{padding:'22px 24px'}}>{children}</div>
  </div>
);

/* ── Inner form component (needs local useState for accordion UI state) ── */
export function Form01Inner({ data, set, onSaveDraft, onSave, saving }) {
  // Default all ISO Additional Details accordions to open — the read-only preview used for
  // PDF download has pointer-events disabled (can't click to expand), so anything collapsed
  // by default would be silently missing from the downloaded/printed PDF.
  const [openSecs, setOpenSecs] = useState({ iso50001:true, isoEnv:true, iso22000:true, iso22301:true, iso27001:true, iso27701:true, iso42001:true, iso37001:true, iso21001:true });
  const { names: ISO_LIST } = useStandards();

  // Drop any saved standard that is no longer in the live catalogue (Admin → Standards)
  // — e.g. legacy hard-coded values like "ISO 9001:2015" — so they don't appear as
  // stuck chips that can't be unticked. "Others" is a manual entry, always kept.
  useEffect(() => {
    if (!ISO_LIST.length) return;
    const allowed = new Set([...ISO_LIST, 'Others']);
    const cur = data.standards || [];
    const pruned = cur.filter(s => allowed.has(s));
    if (pruned.length !== cur.length) set('standards', pruned);
  }, [ISO_LIST.join('|')]); // eslint-disable-line

  const toggleSec = (k) => setOpenSecs(s=>({...s,[k]:!s[k]}));
  const toggleStd = (s) => {
    const cur = data.standards || [];
    set('standards', cur.includes(s) ? cur.filter(x=>x!==s) : [...cur,s]);
  };
  const toggleLoc = (l) => {
    const cur = data.locationConditions || [];
    set('locationConditions', cur.includes(l) ? cur.filter(x=>x!==l) : [...cur,l]);
  };
  const setEmp = (row, col, val) => {
    const tbl = (data.empTable && data.empTable.length===EMP_ROWS.length)
      ? data.empTable : EMP_ROWS.map(()=>emptyRow());
    const t = tbl.map((r,ri)=>ri===row ? r.map((c,ci)=>ci===col?Number(val)||0:c) : r);
    set('empTable', t);
  };
  const colTotal  = (col) => (data.empTable||[]).reduce((a,r)=>a+(r?.[col]||0),0);
  // Total no. of employees = total of the "Effective No. Filled by QCC" column (last column)
  const effectiveTotal = () => colTotal(EMP_COLS.length - 1);
  const scrollTo  = (id)  => { const el=document.getElementById('f01-'+id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); };

  const has14001 = (data.standards||[]).includes('ISO 14001:2015');
  const has45001 = (data.standards||[]).includes('ISO 45001:2018');
  const has50001 = (data.standards||[]).includes('ISO 50001:2018');
  const has22000 = (data.standards||[]).includes('ISO 22000:2018');
  const has22301 = (data.standards||[]).includes('ISO 22301:2019');
  const has27001 = (data.standards||[]).includes('ISO 27001:2022');
  const has27701 = (data.standards||[]).includes('ISO/IEC 27701:2025');
  const has42001 = (data.standards||[]).includes('ISO/IEC 42001:2023');
  const has37001 = (data.standards||[]).includes('ISO 37001:2016');
  const has21001 = (data.standards||[]).includes('ISO 21001:2018');
  const showEnv  = has14001 || has45001;
  const hasISOAdd= has50001 || showEnv || has22000 || has22301 || has27001 || has27701 || has42001 || has37001 || has21001;

  const navLinks = [
    {id:'basic-info',    label:'Basic Info',    desc:'Organisation & Contact'},
    {id:'standards-sec', label:'Standards',     desc:'ISO Standards & Type'},
    {id:'employees-sec', label:'Employees',     desc:'Workforce Details'},
    {id:'mgmt-sec',      label:'Mgmt System',   desc:'Management Info'},
    {id:'audit-sec',     label:'Audit Type',    desc:'Joint / Combined Audit'},
    ...(hasISOAdd?[{id:'iso-add-sec',label:'ISO Details',desc:'Additional Details'}]:[]),
    {id:'submit-sec',    label:'Submit',        desc:'Declaration & Review'},
  ];

  // Scroll-spy: highlight the stepper step for the section currently in view
  const [activeSec, setActiveSec] = useState(navLinks[0].id);
  useEffect(() => {
    const ids = navLinks.map(l => l.id);
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById('f01-' + id);
        if (el && el.getBoundingClientRect().top <= 170) current = id;
      }
      setActiveSec(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasISOAdd]);

  const activeIdx = navLinks.findIndex(l => l.id === activeSec);

  return (
    <div className="audit-wrap">

      {/* Standards banner */}
      {(data.standards||[]).length>0&&(
        <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span style={{fontSize:10.5,fontWeight:700,color:'#9a3412',textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap'}}>Standards:</span>
          {(data.standards||[]).map(s=>(
            <span key={s} style={{padding:'3px 10px',borderRadius:20,background:'white',border:'1px solid #fed7aa',fontSize:11,fontWeight:600,color:'var(--primary-dark)'}}>{s}</span>
          ))}
        </div>
      )}

      {/* ── Top stepper nav (Jump to Section) ── */}
      <div className="qms-stepper">
        {navLinks.map(({id,label,desc}, i)=>(
          <React.Fragment key={id}>
            {i > 0 && <div className={`qms-step-connector${i <= activeIdx ? ' passed' : ''}`} />}
            <button
              type="button"
              onClick={()=>scrollTo(id)}
              className={`qms-step-btn${id === activeSec ? ' active' : i < activeIdx ? ' passed' : ''}`}
            >
              <span className="qms-step-num">{i + 1}</span>
              <span className="qms-step-txt">
                <span className="qms-step-lbl" style={{display:'block'}}>{label}</span>
                <span className="qms-step-desc" style={{display:'block'}}>{desc}</span>
              </span>
            </button>
          </React.Fragment>
        ))}
        <div className="qms-stepper-actions">
          <button type="button" onClick={onSaveDraft} disabled={saving} className="btn btn-ghost btn-sm"
            style={{display:'inline-flex',alignItems:'center',gap:5}}>
            <Save size={12}/> Draft
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary btn-sm"
            style={{display:'inline-flex',alignItems:'center',gap:5}}>
            <FileText size={12}/> {saving?'Saving…':'Save'}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="qms-secs-col" style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Basic Info */}
          <SecCard id="f01-basic-info" title="Basic Information">
            <div className="qms-form-intro" style={{background:'linear-gradient(135deg,var(--primary-50),white)',border:'1.5px solid var(--primary-200)',borderRadius:10,padding:'12px 18px',marginBottom:22,textAlign:'center'}}>
              <div style={{fontWeight:800,fontSize:15,color:'var(--text-1)',marginBottom:2}}>Request for Proposal cum Application Form</div>
              <div style={{fontSize:11.5,color:'var(--gray-500)'}}>QC Certification · ISO Certification Management</div>
            </div>
            <Row>
              <FG label="REFNO">
                <input className="form-control" placeholder="Auto-generated" value={data.refno||''} onChange={e=>set('refno',e.target.value)}/>
              </FG>
              <FG label="Name of Organization" required>
                <GrowText placeholder="e.g. ABC Manufacturing Ltd" value={data.organizationName} onChange={v=>set('organizationName',v)}/>
              </FG>
            </Row>
            <FG label="Address" required>
              <textarea className="form-control" rows={3} placeholder="Full address" value={data.address||''} onChange={e=>set('address',e.target.value)}/>
            </FG>
            <FG label="Additional Sites / Addresses, if any">
              <textarea className="form-control" rows={2} placeholder="List additional site addresses" value={data.additionalSites||''} onChange={e=>set('additionalSites',e.target.value)}/>
            </FG>
            <Row>
              <FG label="Mobile Number" required>
                <div className="mobile-input-row">
                  <select className="form-control" value={data.countryCode||'+91'} onChange={e=>set('countryCode',e.target.value)}>
                    {COUNTRY_CODES.map(c=><option key={c.code+c.country} value={c.code}>{c.code} {c.country}</option>)}
                  </select>
                  <input className="form-control" placeholder="9000000000" value={localMobileNumber(data.mobileNumber, data.countryCode)}
                    onChange={e=>set('mobileNumber',e.target.value.replace(/\D/g,'').slice(0,15))}/>
                </div>
              </FG>
              <FG label="Email Id">
                <input type="email" className="form-control" placeholder="info@company.com" value={data.emailId||''} onChange={e=>set('emailId',e.target.value)}/>
              </FG>
              <FG label="Contact Person" required>
                <GrowText placeholder="Full name" value={data.contactPerson} onChange={v=>set('contactPerson',v)}/>
              </FG>
              <FG label="Designation">
                <GrowText placeholder="e.g. Quality Manager" value={data.designation} onChange={v=>set('designation',v)}/>
              </FG>
            </Row>
            <Row mb={0}>
              <FG label="Mode of Audit">
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {['Online','Onsite','Hybrid'].map(m=>(
                    <label key={m} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'8px 14px',
                      border:`1.5px solid ${data.modeOfWorking===m?'var(--primary)':'var(--gray-200)'}`,
                      borderRadius:8,background:data.modeOfWorking===m?'var(--primary-50)':'white',
                      fontWeight:data.modeOfWorking===m?700:500,fontSize:13,
                      color:data.modeOfWorking===m?'var(--primary-dark)':'var(--gray-500)'}}>
                      <input type="radio" name="f01_mode" value={m} checked={data.modeOfWorking===m} onChange={()=>set('modeOfWorking',m)} style={{accentColor:'var(--primary)'}}/>
                      {m}
                    </label>
                  ))}
                </div>
              </FG>
              {data.modeOfWorking==='Hybrid'&&(
                <FG label="In-case of Hybrid, Core activities Online or Onsite?">
                  <select className="form-control" value={data.hybridCoreActivities||''} onChange={e=>set('hybridCoreActivities',e.target.value)}>
                    <option value="">Select</option>
                    <option>Core activities Online</option>
                    <option>Core activities Onsite</option>
                  </select>
                </FG>
              )}
            </Row>
            <FG label="Scope of Certification" required>
              <textarea className="form-control" rows={4} placeholder="Describe the scope of activities, products/services to be certified…" value={data.scopeOfCertification||''} onChange={e=>set('scopeOfCertification',e.target.value)}/>
            </FG>
          </SecCard>

          {/* Standards */}
          <SecCard id="f01-standards-sec" title="Standards & Application Type">
            <Row>
              <FG label="Main Processes / Activities" full>
                <GrowText placeholder="e.g. purchase, store, production" value={data.mainProcesses} onChange={v=>set('mainProcesses',v)}/>
              </FG>
              <FG label="Outsourced Processes, if any" full>
                <GrowText placeholder="e.g. printing, packaging" value={data.outsourcedProcesses} onChange={v=>set('outsourcedProcesses',v)}/>
              </FG>
            </Row>
            <div className="form-group">
              <label className="form-label">Standard(s)<span style={{color:'var(--red)'}}> *</span> <span style={{fontWeight:400,color:'var(--gray-400)'}}>— tick all applicable</span></label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:8,marginBottom:8}}>
                {ISO_LIST.map(s=>(
                  <label key={s} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 13px',
                    border:`1.5px solid ${(data.standards||[]).includes(s)?'var(--primary)':'var(--gray-200)'}`,
                    borderRadius:8,cursor:'pointer',background:(data.standards||[]).includes(s)?'var(--primary-50)':'white',transition:'all .14s'}}>
                    <input type="checkbox" checked={(data.standards||[]).includes(s)} onChange={()=>toggleStd(s)} style={{accentColor:'var(--primary)',width:15,height:15,flexShrink:0}}/>
                    <span style={{fontSize:12.5,fontWeight:(data.standards||[]).includes(s)?700:500,color:(data.standards||[]).includes(s)?'var(--primary-dark)':'var(--gray-600)'}}>{s}</span>
                  </label>
                ))}
                <label style={{display:'flex',alignItems:'center',gap:9,padding:'9px 13px',border:'1.5px solid var(--gray-200)',borderRadius:8,cursor:'pointer',background:'white'}}>
                  <input type="checkbox" checked={(data.standards||[]).includes('Others')} onChange={()=>toggleStd('Others')} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                  <span style={{fontSize:12.5,color:'var(--gray-600)'}}>Others</span>
                </label>
              </div>
              {(data.standards||[]).length>0&&(
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {(data.standards||[]).map(s=><span key={s} className="badge bdg-info" style={{fontSize:10.5}}>{s}</span>)}
                </div>
              )}
              {(data.standards||[]).includes('Others')&&(
                <GrowText style={{marginTop:8}} placeholder="Specify other standard(s)" value={data.othersStandard} onChange={v=>set('othersStandard',v)}/>
              )}
            </div>
            <Row mb={0}>
              <FG label="Application Type">
                <select className="form-control" value={data.applicationType||'Initial'} onChange={e=>set('applicationType',e.target.value)}>
                  {APP_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </FG>
              <FG label="Accreditation Body">
                <select className="form-control" value={data.accreditationBody||'UAF'} onChange={e=>set('accreditationBody',e.target.value)}>
                  {ACCRED.map(a=><option key={a}>{a}</option>)}
                </select>
              </FG>
            </Row>
          </SecCard>

          {/* Employees */}
          <SecCard id="f01-employees-sec" title="Employees & Workforce">
            <div style={{display:'flex',gap:14,marginBottom:18,flexWrap:'wrap'}}>
              {[{label:'No. of Employees — Total',field:'totalEmployees'},{label:'Contractual',field:'contractual'},{label:'Working No. of Shifts',field:'workingShifts'}].map(({label,field})=>(
                <div key={field} style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</div>
                  <input className="form-control" type="number" min="0" value={data[field]||0} onChange={e=>set(field,Number(e.target.value)||0)}/>
                </div>
              ))}
            </div>
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:750,fontSize:12}}>
                <thead>
                  <tr>
                    <TCell head>Activities</TCell>
                    {EMP_COLS.map(c=><TCell key={c} head>{c}</TCell>)}
                  </tr>
                </thead>
                <tbody>
                  {EMP_ROWS.map((rowLabel,ri)=>(
                    <tr key={ri}>
                      <td style={{padding:'8px 12px',fontWeight:600,fontSize:12.5,border:'1px solid var(--primary-100)',background:'var(--primary-50)',color:'var(--text-1)',minWidth:180}}>{rowLabel}</td>
                      {EMP_COLS.map((_,ci)=>(
                        <td key={ci} style={{padding:'5px 7px',border:'1px solid var(--gray-100)',background:ri%2===0?'white':'var(--gray-50)'}}>
                          <input type="number" min="0"
                            value={((data.empTable||[])[ri]||emptyRow())[ci]}
                            onChange={e=>setEmp(ri,ci,e.target.value)}
                            style={{width:'100%',padding:'5px 7px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,textAlign:'center',outline:'none',background:'white'}}/>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{background:'var(--primary-100)'}}>
                    <td style={{padding:'9px 12px',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:13,color:'var(--text-1)'}}>Total</td>
                    {EMP_COLS.map((_,ci)=>(
                      <td key={ci} style={{padding:'9px 10px',textAlign:'center',fontWeight:700,border:'1px solid var(--primary-200)',fontSize:13,color:ci===EMP_COLS.length-1?'var(--primary)':'var(--primary-dark)'}}>{colTotal(ci)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <Row mb={0}>
              <FG label="No. of personnel working away from site (if applicable)">
                <input className="form-control" type="number" min="0" value={data.remotePersonnel||0} onChange={e=>set('remotePersonnel',Number(e.target.value)||0)}/>
              </FG>
              <FG label="No. of Employees (auto)">
                <input className="form-control" value={effectiveTotal()} readOnly style={{background:'var(--primary-50)',fontWeight:700,color:'var(--primary)'}}/>
              </FG>
              <FG label="Operation for Weekend / Weekly Holiday" full>
                <GrowText placeholder="e.g. Saturday half day, Sunday off" value={data.weekendOperation} onChange={v=>set('weekendOperation',v)}/>
              </FG>
            </Row>
          </SecCard>

          {/* Management System */}
          <SecCard id="f01-mgmt-sec" title="Management System Information">
            {[
              {n:'1.',label:'Applicable Legal, statuary & regulatory act',hint:'(i.e., Pvt. Ltd. / Ltd. / Partnership / proprietorship / Labour law)',field:'legalAct'},
              {n:'2.',label:'Organization Key Process Area',hint:'(i.e., purchase/store/production etc.)',field:'keyProcessArea'},
              {n:'3.',label:'Organization Products / Services',hint:'(i.e., abc & xyz products etc.)',field:'productsServices'},
              {n:'4.',label:'Any outsourcing process',hint:'(i.e., printing etc.)',field:'outsourcingProcess'},
              {n:'5.',label:'Consultant details, if used for Management System Preparation',hint:'',field:'consultantDetails'},
            ].map(({n,label,hint,field})=>(
              <div key={field} className="form-group">
                <label className="form-label">{n} {label} <span style={{fontWeight:400,color:'var(--gray-400)'}}>{hint}</span></label>
                <GrowText value={data[field]} onChange={v=>set(field,v)}/>
              </div>
            ))}
            <Row>
              <FG label="6. Organization establishment date"><input type="date" className="form-control" value={data.establishmentDate||''} onChange={e=>set('establishmentDate',e.target.value)}/></FG>
              <FG label="7. Manual Date"><input type="date" className="form-control" value={data.manualDate||''} onChange={e=>set('manualDate',e.target.value)}/></FG>
              <FG label="8. Internal audit date (Or planned date)"><input type="date" className="form-control" value={data.internalAuditDate||''} onChange={e=>set('internalAuditDate',e.target.value)}/></FG>
              <FG label="9. Management review date (Or planned date)"><input type="date" className="form-control" value={data.managementReviewDate||''} onChange={e=>set('managementReviewDate',e.target.value)}/></FG>
            </Row>
            <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 14px'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:600,fontSize:13,marginBottom:data.alreadyCertified?12:0}}>
                <input type="checkbox" checked={!!data.alreadyCertified} onChange={e=>set('alreadyCertified',e.target.checked)} style={{accentColor:'var(--primary)',width:15,height:15}}/>
                If org. already ISO Certified, write the standards:
              </label>
              {data.alreadyCertified&&(
                <Row mb={0}>
                  <FG label="Certified Standard(s)"><GrowText placeholder="e.g. ISO 9001:2015" value={data.certStandard} onChange={v=>set('certStandard',v)}/></FG>
                  <FG label="Certification Body"><GrowText value={data.certBody} onChange={v=>set('certBody',v)}/></FG>
                  <FG label="Issue Date"><input type="date" className="form-control" value={data.certIssueDate||''} onChange={e=>set('certIssueDate',e.target.value)}/></FG>
                  <FG label="Expiry Date"><input type="date" className="form-control" value={data.certExpiryDate||''} onChange={e=>set('certExpiryDate',e.target.value)}/></FG>
                </Row>
              )}
            </div>
          </SecCard>

          {/* Joint / Combined Audit */}
          <div id="f01-audit-sec" style={{background:'white',borderRadius:12,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.06)',scrollMarginTop:80}}>
            <div style={{background:'var(--primary)',color:'white',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
              <span style={{fontWeight:700,fontSize:14}}>In case of joint, combined, integrated audit:—</span>
              <div style={{display:'flex',gap:18}}>
                {['YES','NO'].map(v=>(
                  <label key={v} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:'white',
                    fontWeight:data.jointAuditMain===v?800:400,fontSize:14,userSelect:'none'}}>
                    <input type="radio" name="f01_jointAuditMain" value={v}
                      checked={data.jointAuditMain===v} onChange={()=>set('jointAuditMain',v)}
                      style={{accentColor:'white',width:15,height:15}}/>
                    {v}
                  </label>
                ))}
              </div>
            </div>
            {data.jointAuditMain==='YES'&&(
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
                  <YNRow key={field} label={label} field={field} form={data} set={set}/>
                ))}
                <div style={{padding:'9px 14px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:12.5,color:'var(--text-1)',flex:1}}>Percentage level of integration (decided by QCC):</span>
                  <input className="form-control" style={{width:160}} placeholder="e.g. 80%" value={data.integrationPercentage||''} onChange={e=>set('integrationPercentage',e.target.value)}/>
                </div>
              </div>
            )}
          </div>

          {/* ISO Additional Details */}
          {hasISOAdd&&(
            <SecCard id="f01-iso-add-sec" title="ISO Additional Details">

              {has50001&&(
                <AccSec title="This Section for ISO 50001:2018 – Energy Management System – Additional Details"
                  color="#16a34a" isOpen={openSecs.iso50001} onToggle={()=>toggleSec('iso50001')}>
                  <Row mb={0}>
                    <FG label="Annual Energy Consumption (Unit KWH etc.)"><GrowText value={data.annualEnergyConsumption} onChange={v=>set('annualEnergyConsumption',v)}/></FG>
                    <FG label="Number of EnMS Effective Personnels"><input className="form-control" type="number" min="0" value={data.enmsPersonnels||''} onChange={e=>set('enmsPersonnels',e.target.value)}/></FG>
                    <FG label="Name & Number of Energy Sources"><GrowText value={data.energySources} onChange={v=>set('energySources',v)}/></FG>
                    <FG label="Name & Number of significant energy uses (SEUs)"><GrowText value={data.significantEnergyUses} onChange={v=>set('significantEnergyUses',v)}/></FG>
                  </Row>
                </AccSec>
              )}

              {showEnv&&(
                <AccSec
                  title={`This Section for ${has14001?'ISO 14001:2015':''}${has14001&&has45001?' / ':''}${has45001?'ISO 45001:2018':''} – Additional Details`}
                  color="#dc2626" isOpen={openSecs.isoEnv} onToggle={()=>toggleSec('isoEnv')}>
                  <div className="form-group">
                    <label className="form-label">Select Condition of your location (tick all applicable)</label>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                      {LOCATION_CONDITIONS.map(l=>(
                        <label key={l} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'7px 12px',
                          border:`1.5px solid ${(data.locationConditions||[]).includes(l)?'#dc2626':'var(--gray-200)'}`,
                          borderRadius:8,background:(data.locationConditions||[]).includes(l)?'#fef2f2':'white',
                          fontSize:12.5,fontWeight:(data.locationConditions||[]).includes(l)?700:500}}>
                          <input type="checkbox" checked={(data.locationConditions||[]).includes(l)} onChange={()=>toggleLoc(l)} style={{accentColor:'#dc2626',width:14,height:14}}/>{l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Row>
                    <FG label="Operating air emission facility"><select className="form-control" value={data.airEmissionFacility||''} onChange={e=>set('airEmissionFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                    <FG label="Operating waste water treatment facility"><select className="form-control" value={data.wastewaterFacility||''} onChange={e=>set('wastewaterFacility',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                    <FG label="Kind of wastes & amount (Ton/year)"><GrowText value={data.wastesAmount} onChange={v=>set('wastesAmount',v)}/></FG>
                    <FG label="Usage of hazardous chemical substances?"><select className="form-control" value={data.hazardousChemicals||''} onChange={e=>set('hazardousChemicals',e.target.value)}><option value="">Select</option><option>YES</option><option>NO</option></select></FG>
                  </Row>
                  {[
                    {label:'Does you have Pollution Clearance from local authorities?',field:'pollutionClearance',options:['YES','NO','N/A']},
                    {label:'Does you have more than 5 critical environmental aspect or OHSAS risks?',field:'criticalAspectsOHSAS'},
                  ].map(({label,field,options})=>(<YNRow key={field} label={label} field={field} form={data} set={set} options={options}/>))}
                  {[
                    {label:'Details of the Environmental Aspects (if More Than 5 critical aspect)',field:'envAspectDetails'},
                    {label:'How many no. of personnel working on site?',field:'personnelOnSite'},
                    {label:'How many no. of personnel working away from site?',field:'personnelAwayFromSite'},
                    {label:'What are the risks for personnel working away from the site?',field:'risksAwayFromSite'},
                    {label:'Details of the OHSMS Significant RISK (if More Than 5 critical OHSMS RISK)',field:'ohsmsSignificantRisk'},
                    {label:'OHSMS risks associated with processes, the main hazardous materials used in the processes',field:'ohsmsProcessRisks'},
                  ].map(({label,field})=>(
                    <div key={field} className="form-group">
                      <label className="form-label" style={{fontSize:12}}>{label}</label>
                      <GrowText value={data[field]} onChange={v=>set(field,v)}/>
                    </div>
                  ))}
                  <YNRow label="Does your organization is not regulated by the law and don't need any license?" field="notRegulatedByLaw" form={data} set={set}/>
                  <YNRow label="Does your organization have any accident related to environment or OHSAS in recent 3 years?" field="envOhsasAccident" form={data} set={set}/>
                  <div className="form-group" style={{marginTop:10}}>
                    <label className="form-label">Please write relevant laws applicable to your organization</label>
                    <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:6}}>(Ex. air, water, waste, noise, chemical, mining, labour etc. laws)</div>
                    <textarea className="form-control" rows={3} value={data.relevantLaws||''} onChange={e=>set('relevantLaws',e.target.value)}/>
                  </div>
                </AccSec>
              )}

              {has22000&&(
                <AccSec title="This Section for ISO 22000:2018 – Food Safety Management System – Additional Details"
                  color="#d97706" isOpen={openSecs.iso22000} onToggle={()=>toggleSec('iso22000')}>
                  <Row>
                    <FG label="Number of Sites to be Audited"><input className="form-control" type="number" min="0" value={data.iso22000NumSites||''} onChange={e=>set('iso22000NumSites',e.target.value)}/></FG>
                    <FG label="Have you implemented HACCP Principles?">
                      <select className="form-control" value={data.iso22000HACCP||''} onChange={e=>set('iso22000HACCP',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option><option>In Progress</option>
                      </select>
                    </FG>
                    <FG label="FSSAI License Registration No."><GrowText placeholder="e.g. 12345678901234" value={data.iso22000FSSAI} onChange={v=>set('iso22000FSSAI',v)}/></FG>
                    <FG label="Total No. of HACCP Studies"><input className="form-control" type="number" min="0" value={data.iso22000HACCPStudies||''} onChange={e=>set('iso22000HACCPStudies',e.target.value)}/></FG>
                  </Row>
                  <Row>
                    <FG label="How many process lines in production?"><input className="form-control" type="number" min="0" value={data.iso22000ProcessLines||''} onChange={e=>set('iso22000ProcessLines',e.target.value)}/></FG>
                    <FG label="Level of Automation">
                      <select className="form-control" value={data.iso22000Automation||''} onChange={e=>set('iso22000Automation',e.target.value)}>
                        <option value="">Select</option><option>Manual Operation</option><option>Semi-Automatic Operation</option><option>Fully Automatic Operation</option>
                      </select>
                    </FG>
                    <FG label="Labour Intensiveness">
                      <select className="form-control" value={data.iso22000LabourIntensiveness||''} onChange={e=>set('iso22000LabourIntensiveness',e.target.value)}>
                        <option value="">Select</option><option>Low</option><option>Medium</option><option>High</option>
                      </select>
                    </FG>
                    <FG label="Building Area (sq.ft / m²)"><GrowText placeholder="e.g. 5000 sq.ft" value={data.iso22000BuildingArea} onChange={v=>set('iso22000BuildingArea',v)}/></FG>
                  </Row>
                  <Row>
                    <FG label="Closed Production System?">
                      <select className="form-control" value={data.iso22000ClosedProduction||''} onChange={e=>set('iso22000ClosedProduction',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                    <FG label="Mechanized Operation?">
                      <select className="form-control" value={data.iso22000MechanizedOp||''} onChange={e=>set('iso22000MechanizedOp',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                    <FG label="In-house Lab Testing Available?">
                      <select className="form-control" value={data.iso22000InhouseLab||''} onChange={e=>set('iso22000InhouseLab',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                    <FG label="Any prior audits conducted?">
                      <select className="form-control" value={data.iso22000PriorAudits||''} onChange={e=>set('iso22000PriorAudits',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                  </Row>
                  <Row>
                    <FG label="Product Types"><GrowText placeholder="e.g. Packaged food, beverages" value={data.iso22000ProductTypes} onChange={v=>set('iso22000ProductTypes',v)}/></FG>
                    <FG label="Product Lines"><GrowText value={data.iso22000ProductLines} onChange={v=>set('iso22000ProductLines',v)}/></FG>
                    <FG label="Product Development?">
                      <select className="form-control" value={data.iso22000ProductDev||''} onChange={e=>set('iso22000ProductDev',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                  </Row>
                  <Row>
                    <FG label="CCPs"><input className="form-control" type="number" min="0" value={data.iso22000CCPs||''} onChange={e=>set('iso22000CCPs',e.target.value)}/></FG>
                    <FG label="PRPs"><input className="form-control" type="number" min="0" value={data.iso22000PRPs||''} onChange={e=>set('iso22000PRPs',e.target.value)}/></FG>
                    <FG label="OPRPs"><input className="form-control" type="number" min="0" value={data.iso22000OPRPs||''} onChange={e=>set('iso22000OPRPs',e.target.value)}/></FG>
                  </Row>
                  <Row>
                    <FG label="Any seasonality issues?">
                      <select className="form-control" value={data.iso22000Seasonality||''} onChange={e=>set('iso22000Seasonality',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                    <FG label="Translator Required?">
                      <select className="form-control" value={data.iso22000Translator||''} onChange={e=>set('iso22000Translator',e.target.value)}>
                        <option value="">Select</option><option>Yes</option><option>No</option>
                      </select>
                    </FG>
                  </Row>
                  {data.iso22000Seasonality==='Yes'&&(
                    <FG label="Seasonality Details" full>
                      <textarea className="form-control" rows={3} value={data.iso22000SeasonDetails||''} onChange={e=>set('iso22000SeasonDetails',e.target.value)}/>
                    </FG>
                  )}
                  <FG label="Infrastructure Details" full>
                    <textarea className="form-control" rows={2} value={data.iso22000Infrastructure||''} onChange={e=>set('iso22000Infrastructure',e.target.value)}/>
                  </FG>
                  {data.iso22000PriorAudits==='Yes'&&(
                    <FG label="Attach audit findings / details" full>
                      <textarea className="form-control" rows={2} value={data.iso22000AuditReport||''} onChange={e=>set('iso22000AuditReport',e.target.value)}/>
                    </FG>
                  )}
                  <FG label="Other Factors (specify)" full>
                    <GrowText value={data.iso22000OtherFactors} onChange={v=>set('iso22000OtherFactors',v)}/>
                  </FG>
                </AccSec>
              )}

              {has22301&&(
                <AccSec title="This Section for ISO 22301:2019 – Business Continuity Management System (BCMS) – Additional Details"
                  color="#0f766e" isOpen={openSecs.iso22301} onToggle={()=>toggleSec('iso22301')}>
                  <Row>
                    <FG label="Number of Sites to be Audited"><input className="form-control" type="number" min="0" value={data.iso22301NumSites||''} onChange={e=>set('iso22301NumSites',e.target.value)}/></FG>
                    <FG label="Number of Critical Business Processes Identified"><input className="form-control" type="number" min="0" value={data.iso22301CriticalProcesses||''} onChange={e=>set('iso22301CriticalProcesses',e.target.value)}/></FG>
                  </Row>
                  <Row>
                    <FG label="Recovery Time Objective (RTO)"><GrowText placeholder="e.g. 4 hours, 24 hours" value={data.iso22301RTO} onChange={v=>set('iso22301RTO',v)}/></FG>
                    <FG label="Recovery Point Objective (RPO)"><GrowText placeholder="e.g. 1 hour, 8 hours" value={data.iso22301RPO} onChange={v=>set('iso22301RPO',v)}/></FG>
                  </Row>
                  <Row>
                    <FG label="Business Impact Analysis (BIA) Status">
                      <select className="form-control" value={data.iso22301BIAStatus||''} onChange={e=>set('iso22301BIAStatus',e.target.value)}>
                        <option value="">Select</option>
                        <option>Completed and up-to-date</option>
                        <option>Completed but needs review</option>
                        <option>In Progress</option>
                        <option>Not yet conducted</option>
                      </select>
                    </FG>
                    <FG label="Business Continuity Plan (BCP) Status">
                      <select className="form-control" value={data.iso22301BCPStatus||''} onChange={e=>set('iso22301BCPStatus',e.target.value)}>
                        <option value="">Select</option>
                        <option>Documented, tested and approved</option>
                        <option>Documented but not yet tested</option>
                        <option>In Progress</option>
                        <option>Not yet developed</option>
                      </select>
                    </FG>
                  </Row>
                  <Row>
                    <FG label="BC Exercise / Testing Frequency">
                      <select className="form-control" value={data.iso22301ExerciseFrequency||''} onChange={e=>set('iso22301ExerciseFrequency',e.target.value)}>
                        <option value="">Select</option>
                        <option>Quarterly</option>
                        <option>Bi-Annual</option>
                        <option>Annual</option>
                        <option>Not yet conducted</option>
                      </select>
                    </FG>
                    <FG label="Outsourced BC / DR Services?">
                      <select className="form-control" value={data.iso22301OutsourcedBC||''} onChange={e=>set('iso22301OutsourcedBC',e.target.value)}>
                        <option value="">Select</option>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </FG>
                  </Row>
                  <FG label="Crisis Management Team Structure" full>
                    <textarea className="form-control" rows={3} placeholder="Describe the Crisis Management / Incident Response Team composition" value={data.iso22301CrisisTeam||''} onChange={e=>set('iso22301CrisisTeam',e.target.value)}/>
                  </FG>
                  <FG label="Business Continuity Risk Level" full>
                    <select className="form-control" value={data.iso22301Risk||''} onChange={e=>set('iso22301Risk',e.target.value)}>
                      <option value="">Select</option>
                      <option>Low – Low dependency on single processes/systems, quick recovery, minimal stakeholder impact</option>
                      <option>Medium – Moderate dependency, defined RTO/RPO, some critical processes</option>
                      <option>High – High dependency on critical processes, strict RTO/RPO, large stakeholder and regulatory impact</option>
                    </select>
                  </FG>
                </AccSec>
              )}

              {has27001&&(
                <AccSec title="This Section for ISO 27001:2022 – Information Security Management System – Additional Details"
                  color="#7c3aed" isOpen={openSecs.iso27001} onToggle={()=>toggleSec('iso27001')}>
                  <Row>
                    <FG label="SOA Version No."><GrowText placeholder="e.g. v1.0" value={data.iso27001SoaVersion} onChange={v=>set('iso27001SoaVersion',v)}/></FG>
                    <FG label="Date of Implementation"><input type="date" className="form-control" value={data.iso27001SoaDate||''} onChange={e=>set('iso27001SoaDate',e.target.value)}/></FG>
                    <FG label="Risk Assessment & Risk Treatment Date"><input type="date" className="form-control" value={data.iso27001RiskAssessmentDate||''} onChange={e=>set('iso27001RiskAssessmentDate',e.target.value)}/></FG>
                  </Row>
                  <FG label="Any outsourced process (i.e., IT / Data Centre / Server)" full>
                    <GrowText value={data.iso27001OutsourcedProcess} onChange={v=>set('iso27001OutsourcedProcess',v)}/>
                  </FG>
                  <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:12.5,color:'var(--primary-dark)',marginBottom:10}}>Business Complexity — Select applicable level (1 / 2 / 3)</div>
                    <Row mb={0}>
                      <FG label="A. Type(s) of business and regulatory requirements">
                        <select className="form-control" value={data.iso27001BusinessA||''} onChange={e=>set('iso27001BusinessA',e.target.value)}>
                          <option value="">Select</option>
                          <option value="1">1 — Non-critical business / non-regulated sectors</option>
                          <option value="2">2 — Customers in critical business sectors</option>
                          <option value="3">3 — Works in critical business sectors</option>
                        </select>
                      </FG>
                      <FG label="B. Process and tasks">
                        <select className="form-control" value={data.iso27001BusinessB||''} onChange={e=>set('iso27001BusinessB',e.target.value)}>
                          <option value="">Select</option>
                          <option value="1">1 — Standard & repetitive tasks</option>
                          <option value="2">2 — Standard but non-repetitive, high number of products/services</option>
                          <option value="3">3 — Complex processes, many business units</option>
                        </select>
                      </FG>
                      <FG label="C. Level of establishment of the MS">
                        <select className="form-control" value={data.iso27001BusinessC||''} onChange={e=>set('iso27001BusinessC',e.target.value)}>
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
                        <select className="form-control" value={data.iso27001ITA||''} onChange={e=>set('iso27001ITA',e.target.value)}>
                          <option value="">Select</option>
                          <option value="1">1 — Few / highly standardized IT platforms</option>
                          <option value="2">2 — Several different IT platforms</option>
                          <option value="3">3 — Many different IT platforms & networks</option>
                        </select>
                      </FG>
                      <FG label="B. Dependency on outsourcing / cloud services">
                        <select className="form-control" value={data.iso27001ITB||''} onChange={e=>set('iso27001ITB',e.target.value)}>
                          <option value="">Select</option>
                          <option value="1">1 — Little or no dependency on outsourcing</option>
                          <option value="2">2 — Some dependency, some business activities</option>
                          <option value="3">3 — High dependency, large impact on business</option>
                        </select>
                      </FG>
                      <FG label="C. Information System development">
                        <select className="form-control" value={data.iso27001ITC||''} onChange={e=>set('iso27001ITC',e.target.value)}>
                          <option value="">Select</option>
                          <option value="1">1 — None or very limited in-house development</option>
                          <option value="2">2 — Some in-house / outsourced development</option>
                          <option value="3">3 — Extensive in-house / outsourced development</option>
                        </select>
                      </FG>
                    </Row>
                  </div>
                  <FG label="Confirmation of access to organizational records" full>
                    <select className="form-control" value={data.iso27001RecordsAccess||''} onChange={e=>set('iso27001RecordsAccess',e.target.value)}>
                      <option value="">Select</option>
                      <option>Agreed to share all ISMS records for review by audit team</option>
                      <option>Not agreed to share all ISMS records (contains confidential information)</option>
                    </select>
                  </FG>
                  <div style={{background:'var(--primary-50)',borderRadius:8,padding:'12px 16px',marginTop:4}}>
                    <div style={{fontWeight:700,fontSize:12.5,color:'var(--primary-dark)',marginBottom:10}}>Personnel Access to Information Processing Facilities</div>
                    <Row mb={0}>
                      <FG label="No. of persons with read-only access"><input className="form-control" type="number" min="0" value={data.iso27001ReadOnlyPersons||0} onChange={e=>set('iso27001ReadOnlyPersons',Number(e.target.value)||0)}/></FG>
                      <FG label="No. of persons with no access"><input className="form-control" type="number" min="0" value={data.iso27001NoAccessPersons||0} onChange={e=>set('iso27001NoAccessPersons',Number(e.target.value)||0)}/></FG>
                      <FG label="No. of persons with restricted access"><input className="form-control" type="number" min="0" value={data.iso27001RestrictedPersons||0} onChange={e=>set('iso27001RestrictedPersons',Number(e.target.value)||0)}/></FG>
                      <FG label="No. of persons with strict limitations"><input className="form-control" type="number" min="0" value={data.iso27001StrictPersons||0} onChange={e=>set('iso27001StrictPersons',Number(e.target.value)||0)}/></FG>
                    </Row>
                  </div>
                </AccSec>
              )}
              {has27701&&(
                <AccSec title="This Section for ISO/IEC 27701:2025 – Privacy Information Management System (PIMS) – Additional Details"
                  color="#0891b2" isOpen={openSecs.iso27701} onToggle={()=>toggleSec('iso27701')}>
                  <Row>
                    <FG label="A) Role of the Organization (PII Controller / PII Processor)">
                      <select className="form-control" value={data.iso27701Role||''} onChange={e=>set('iso27701Role',e.target.value)}>
                        <option value="">Select</option>
                        <option>PII Controller only</option>
                        <option>PII Processor only</option>
                        <option>PII Controller and PII Processor</option>
                        <option>PII Provider and PII Customer</option>
                      </select>
                    </FG>
                    <FG label="B) Categories of PII Principals' data processed">
                      <GrowText value={data.iso27701PIICategories} onChange={v=>set('iso27701PIICategories',v)} placeholder="e.g. Employees, Customers, Minors..."/>
                    </FG>
                  </Row>
                  <Row>
                    <FG label="C) Current status of PIMS Statement of Applicability (SoA)">
                      <GrowText value={data.iso27701SoaStatus} onChange={v=>set('iso27701SoaStatus',v)} placeholder="e.g. v1.0, Date implemented"/>
                    </FG>
                    <FG label="D) Confidential / Sensitive PIMS information not available to audit team?">
                      <select className="form-control" value={data.iso27701ConfidentialInfo||''} onChange={e=>set('iso27701ConfidentialInfo',e.target.value)}>
                        <option value="">Select</option>
                        <option>Yes – some information is confidential</option>
                        <option>No – all information available</option>
                      </select>
                    </FG>
                  </Row>
                  <Row>
                    <FG label="E) PIMS conforms to ISO/IEC 27701 requirements?">
                      <select className="form-control" value={data.iso27701Conformance||''} onChange={e=>set('iso27701Conformance',e.target.value)}>
                        <option value="">Select</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>In Progress</option>
                      </select>
                    </FG>
                  </Row>
                  <div style={{background:'#e0f2fe',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
                    <div style={{fontWeight:700,fontSize:12.5,color:'#0369a1',marginBottom:8}}>PII Processing Risk Classification (Select: High / Medium / Low)</div>
                    <Row mb={0}>
                      <FG label="PII Processing Risk (Classification for audit time)">
                        <select className="form-control" value={data.iso27701PIIRisk||''} onChange={e=>set('iso27701PIIRisk',e.target.value)}>
                          <option value="">Select</option>
                          <option>High Risk PII Processing</option>
                          <option>Medium Risk PII Processing</option>
                          <option>Low Risk PII Processing</option>
                        </select>
                      </FG>
                      <FG label="Operational Risk (For Audit Time Calculation)">
                        <select className="form-control" value={data.iso27701OperationalRisk||''} onChange={e=>set('iso27701OperationalRisk',e.target.value)}>
                          <option value="">Select</option>
                          <option>High Operational Risk</option>
                          <option>Medium Operational Risk</option>
                          <option>Low Operational Risk</option>
                        </select>
                      </FG>
                    </Row>
                  </div>
                </AccSec>
              )}

              {has42001&&(
                <AccSec title="This Section for ISO/IEC 42001:2023 – Artificial Intelligence Management Systems (AIMS) – Additional Details"
                  color="#7e22ce" isOpen={openSecs.iso42001} onToggle={()=>toggleSec('iso42001')}>
                  <Row>
                    <FG label="Customer Role">
                      <select className="form-control" value={data.iso42001Role||''} onChange={e=>set('iso42001Role',e.target.value)}>
                        <option value="">Select</option>
                        <option>AI Producer and AI Customer</option>
                        <option>AI Provider and AI Customer</option>
                        <option>AI Producer only</option>
                        <option>AI Customer only</option>
                      </select>
                    </FG>
                    <FG label="Any information not available to audit team due to confidentiality?">
                      <select className="form-control" value={data.iso42001ConfidentialInfo||''} onChange={e=>set('iso42001ConfidentialInfo',e.target.value)}>
                        <option value="">Select</option>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </FG>
                  </Row>
                  <FG label="Adjustment Factors (Table B – factors for adjustment of audit time)" full>
                    <textarea className="form-control" rows={4} value={data.iso42001AdjustmentFactors||''}
                      onChange={e=>set('iso42001AdjustmentFactors',e.target.value)}
                      placeholder="Describe applicable factors: No. of regulatory frameworks, No. of AI systems, High-risk AI purpose, Third-party agreements, Additional controls, etc."/>
                  </FG>
                </AccSec>
              )}

              {has37001&&(
                <AccSec title="This Section for ISO 37001:2016 – Anti Bribery Management System (ABMS) – Additional Details"
                  color="#b45309" isOpen={openSecs.iso37001} onToggle={()=>toggleSec('iso37001')}>
                  <div style={{background:'#fffbeb',borderRadius:8,border:'1px solid #fde68a',padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400e'}}>
                    <strong>Note:</strong> Effective Number of Employees for ABMS shall include personnel from Top Management, Governing Body, ABMS Compliance &amp; Investigation Committee, Marketing, Purchase, Legal &amp; Compliance, Due Diligence, Internal / External Audit, Finance &amp; Accounts Departments.
                  </div>
                  <Row mb={0}>
                    <FG label="Effective Number of Employees under ABMS">
                      <input className="form-control" type="number" min="0" value={data.iso37001EffectiveEmployees||0} onChange={e=>set('iso37001EffectiveEmployees',Number(e.target.value)||0)}/>
                    </FG>
                    <FG label="Bribery Risk Level">
                      <select className="form-control" value={data.iso37001Risk||''} onChange={e=>set('iso37001Risk',e.target.value)}>
                        <option value="">Select</option>
                        <option>Low – Financial and other transactions in limited business, few stakeholders, no public delivery services</option>
                        <option>Medium – Financial and other transactions at larger scale, many stakeholders, no public delivery services</option>
                        <option>High – Financial &amp; other transactions at larger scale, National/International/Government bodies stakeholders, Public delivery services</option>
                      </select>
                    </FG>
                  </Row>
                </AccSec>
              )}

              {has21001&&(
                <AccSec title="This Section for ISO 21001:2018 – Educational Organizations Management System (EOMS) – Additional Details"
                  color="#065f46" isOpen={openSecs.iso21001} onToggle={()=>toggleSec('iso21001')}>
                  <div style={{overflowX:'auto',marginBottom:14}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:520}}>
                      <thead>
                        <tr style={{background:'var(--primary-50)'}}>
                          <TCell head>Category of Personnel</TCell>
                          <TCell head>Number</TCell>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {label:'Staff employed by the organization (including Academic and Non-Academic)',field:'iso21001Staff'},
                          {label:'Volunteers and interns working with or contributing to the organization',field:'iso21001Volunteers'},
                          {label:'Staff of external providers working with or contributing to the organization',field:'iso21001ExternalStaff'},
                          {label:'Other Supporting staff (admin, support, maintenance, canteen, etc.)',field:'iso21001OtherStaff'},
                        ].map(({label,field})=>(
                          <tr key={field}>
                            <td style={{padding:'8px 12px',border:'1px solid var(--primary-100)',fontSize:12.5}}>{label}</td>
                            <td style={{padding:'6px 8px',border:'1px solid var(--primary-100)'}}>
                              <input type="number" min="0" value={data[field]||0} onChange={e=>set(field,Number(e.target.value)||0)}
                                style={{width:'100%',padding:'5px 8px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,outline:'none'}}/>
                            </td>
                          </tr>
                        ))}
                        <tr style={{background:'var(--primary-100)'}}>
                          <td style={{padding:'8px 12px',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:13}}>TOTAL</td>
                          <td style={{padding:'8px 12px',fontWeight:800,border:'1px solid var(--primary-200)',fontSize:13,textAlign:'center',color:'var(--primary)'}}>
                            {(data.iso21001Staff||0)+(data.iso21001Volunteers||0)+(data.iso21001ExternalStaff||0)+(data.iso21001OtherStaff||0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <FG label="Educational Organization Risk Level" full>
                    <select className="form-control" value={data.iso21001Risk||''} onChange={e=>set('iso21001Risk',e.target.value)}>
                      <option value="">Select</option>
                      <option>Low – Coaching and Entrance exam preparation Centres &amp; Institutes</option>
                      <option>Medium – All Educational schools under State/Central Government approved through concerned Educational Boards (national or international)</option>
                      <option>High – Management Courses, Technical Courses, University and Professional Courses Institutes (national or international)</option>
                    </select>
                  </FG>
                </AccSec>
              )}

            </SecCard>
          )}

          {/* Multi-site Annexure */}
          <SecCard id="f01-multisite-sec" title="Multi-Site Annexure (Annexure-01) — Complete if Applicable">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
              background:'var(--primary)',borderRadius:8,padding:'10px 16px',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:700,color:'white'}}>Is this a Multi-Site application?</span>
              <div style={{display:'flex',gap:16}}>
                {['YES','NO'].map(v=>(
                  <label key={v} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontWeight:data.multiSiteApplicable===v?700:500,color:'white',fontSize:12.5}}>
                    <input type="radio" name="f01_multiSiteApplicable" value={v} checked={data.multiSiteApplicable===v}
                      onChange={()=>set('multiSiteApplicable',v)} style={{accentColor:'white'}}/>
                    {v}
                  </label>
                ))}
              </div>
            </div>
            {data.multiSiteApplicable==='YES' && (<>
            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#92400e'}}>
              In case of Multi-site, kindly fill this annexure per site.
            </div>
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:650}}>
                <thead>
                  <tr style={{background:'var(--primary-50)'}}>
                    <TCell head>Activities</TCell>
                    <TCell head>Full Time</TCell>
                    <TCell head>Part Time</TCell>
                    <TCell head>Performing Same type of Job</TCell>
                    <TCell head>Temporary Unskilled Workers</TCell>
                    <TCell head>Effective No. Filled by QCC</TCell>
                  </tr>
                </thead>
                <tbody>
                  {['Management','Production Area / Service','Quality Control / Technical','Administration','Other'].map((row,ri)=>{
                    const mst = (data.multiSiteEmpTable||[]);
                    const rowData = mst[ri]||[0,0,0,0,0];
                    return (
                      <tr key={ri}>
                        <td style={{padding:'8px 12px',fontWeight:600,fontSize:12.5,border:'1px solid var(--primary-100)',background:'var(--primary-50)'}}>{row}</td>
                        {[0,1,2,3,4].map(ci=>(
                          <td key={ci} style={{padding:'5px 7px',border:'1px solid var(--gray-100)'}}>
                            <input type="number" min="0" value={rowData[ci]||0}
                              onChange={e=>{
                                const t=(data.multiSiteEmpTable||[]).map((r,i)=>i===ri?[...r]:[...r]);
                                while(t.length<=ri) t.push([0,0,0,0,0]);
                                const row2=[...t[ri]]; row2[ci]=Number(e.target.value)||0; t[ri]=row2;
                                set('multiSiteEmpTable',t);
                              }}
                              style={{width:'100%',padding:'5px 7px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,textAlign:'center',outline:'none'}}/>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:650}}>
                <thead>
                  <tr style={{background:'var(--primary-50)'}}>
                    <th colSpan={2} style={{padding:'10px 12px',textAlign:'left',fontSize:12.5,fontWeight:700,color:'var(--primary-dark)',border:'1px solid var(--primary-100)'}}>
                      A representative number of sites have been sampled by the QCC, taking into account:
                    </th>
                  </tr>
                  <tr style={{background:'#f8fafc'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--gray-500)',border:'1px solid var(--gray-100)',width:'55%'}}>Criteria</th>
                    <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--gray-500)',border:'1px solid var(--gray-100)'}}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'the results of internal audits of the central office (if appropriate) and the sites;',
                    'the results of management review;',
                    'variations in the size of the sites;',
                    'variations in the business purpose of the sites;',
                    'complexity of the information systems at the different sites;',
                    'variations in working practices;',
                    'variations in activities undertaken;',
                    'variations of design and operation of controls;',
                    'potential interaction with critical information systems or information systems processing sensitive information;',
                    'any differing legal requirements;',
                    'geographical and cultural aspects;',
                    'risk situation of the sites;',
                    'information security incidents at the specific sites.',
                  ].map((item,i)=>{
                    const key=`s${i+1}`;
                    const samp=data.multiSiteSampling||{};
                    return (
                      <tr key={i} style={{background:i%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'8px 12px',fontSize:12.5,border:'1px solid var(--gray-100)',verticalAlign:'top'}}>{i+1}) {item}</td>
                        <td style={{padding:'5px 7px',border:'1px solid var(--gray-100)'}}>
                          <GrowText value={samp[key]} className=""
                            onChange={v=>set('multiSiteSampling',{...samp,[key]:v})}
                            style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--primary-200)',borderRadius:6,fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{fontWeight:700,fontSize:13,color:'var(--primary-dark)',margin:'4px 0 10px'}}>
              Please write the below answers:
            </div>
            <div style={{border:'1px solid #f1f5f9',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              {[
                {label:'A — Are same corporate?',field:'multiSiteSameCorporate'},
                {label:'B — Are actually implementing same activity in control?',field:'multiSiteImplementSame'},
                {label:'C — Have same CEO?',field:'multiSiteSameCEO'},
                {label:'D — Are using same quality system and procedure?',field:'multiSiteQualitySystem'},
              ].map(({label,field},i)=>(
                <YNRow key={field} label={label} field={field} form={data} set={set}/>
              ))}
            </div>
            <div style={{fontSize:12,color:'var(--gray-500)',fontStyle:'italic'}}>
              * Please attach detail information about multi-site (Total site no. / size and location of each site).
            </div>
            </>)}
          </SecCard>

          {/* Declaration & Submit */}
          <SecCard id="f01-submit-sec" title="Summary & Declaration">
            <div style={{background:'var(--primary-50)',border:'1.5px solid var(--primary-200)',borderRadius:10,padding:'16px 18px',marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--primary-dark)',marginBottom:12}}>Summary — Review before Submit</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px 20px'}}>
                {[
                  {l:'Organization', v:data.organizationName||'—'},
                  {l:'Standards',    v:(data.standards||[]).length>0?(data.standards||[]).join(', '):'—'},
                  {l:'App. Type',    v:data.applicationType||'—'},
                  {l:'Mode',         v:data.modeOfWorking||'—'},
                  {l:'Contact',      v:data.contactPerson||'—'},
                  {l:'Total Emp.',   v:effectiveTotal()},
                  {l:'Accreditation',v:data.accreditationBody||'—'},
                  {l:'Scope',        v:data.scopeOfCertification?(data.scopeOfCertification.slice(0,60)+'…'):'—'},
                ].map(({l,v})=>(
                  <div key={l} style={{borderBottom:'1px solid var(--primary-100)',paddingBottom:5}}>
                    <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--primary)',marginBottom:2}}>{l}</div>
                    <div style={{fontSize:12.5,fontWeight:600,color:'var(--text-1)',wordBreak:'break-word'}}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{border:'1.5px solid var(--primary-200)',borderRadius:10,overflow:'hidden',marginBottom:20}}>
              <div style={{background:'#e8f0fe',borderBottom:'1px solid var(--primary-200)',padding:'11px 16px',fontSize:12.5,fontWeight:600,color:'#1e3a5f',textAlign:'center',lineHeight:1.5}}>
                Application submission: I declare that above information is true as per my best knowledge &amp; QCC can use for ISO Certification purposes
              </div>
              <div className="decl-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid var(--primary-100)'}}>
                <div style={{padding:'10px 16px',borderRight:'1px solid var(--primary-100)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Date</div>
                  <input type="date" className="form-control" value={data.declarationDate||''} onChange={e=>set('declarationDate',e.target.value)}/>
                </div>
                <div style={{padding:'10px 16px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Representative Name</div>
                  <GrowText placeholder="Authorised signatory name" value={data.representativeName||data.contactPerson||''} onChange={v=>set('representativeName',v)}/>
                </div>
              </div>
              <div style={{background:'var(--primary)',color:'white',padding:'9px 16px',fontWeight:700,fontSize:13,textAlign:'center',letterSpacing:'.03em'}}>
                Review (To be filled by QUALITY CONTROL CERTIFICATION)
              </div>
              <div className="decl-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid var(--primary-100)'}}>
                <div style={{padding:'10px 16px',borderRight:'1px solid var(--primary-100)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Acceptance, Ref. No</div>
                  <GrowText placeholder="e.g. ACC-2024-001" value={data.acceptanceRefNo} onChange={v=>set('acceptanceRefNo',v)}/>
                </div>
                <div style={{padding:'10px 16px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Not Acceptance</div>
                  <GrowText placeholder="Reason for non-acceptance (if any)" value={data.notAcceptance} onChange={v=>set('notAcceptance',v)}/>
                </div>
              </div>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--primary-100)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Supplement information, if needed</div>
                <textarea className="form-control" rows={2} placeholder="Any supplemental information required…" value={data.supplementInfo||''} onChange={e=>set('supplementInfo',e.target.value)}/>
              </div>
              <div style={{background:'var(--primary-50)',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--primary-dark)'}}>Quality Control Certification</span>
                <span style={{fontSize:10.5,color:'var(--gray-500)'}}>AUD-F-02-Request for Proposal cum Application Form / Rev.: 03</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Internal Notes (Admin only)</label>
              <textarea className="form-control" rows={3} placeholder="Any internal notes…" value={data.adminNotes||''} onChange={e=>set('adminNotes',e.target.value)}/>
              <div style={{marginTop:8,fontSize:11.5,fontStyle:'italic',color:'var(--gray-600)'}}>
                <b style={{fontStyle:'normal',color:'var(--gray-700)'}}>Note:</b> In case, if you have more site&rsquo;s, kindly fill this annexure per site.
              </div>
            </div>
          </SecCard>

      </div>{/* end main col */}
    </div>
  );
}

/* ── Default export ── */
export default function Form01ApplicationForm() {
  return (
    <QMSFormPage
      formType={1}
      formCode="AUD-F-02"
      formTitle="Application Form"
      defaultData={INIT}
    >
      {({ data, set, clientInfo, onSaveDraft, onSave, saving }) => (
        <Form01Inner
          data={data}
          set={set}
          clientInfo={clientInfo}
          onSaveDraft={onSaveDraft}
          onSave={onSave}
          saving={saving}
        />
      )}
    </QMSFormPage>
  );
}
