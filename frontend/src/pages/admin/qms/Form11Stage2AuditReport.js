import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';
import useStandards, { clausesForStandards, deriveClientStandards } from './useStandards';
import { FiChevronRight } from 'react-icons/fi';

/* Short code (e.g. "27001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

/* Format an ISO date range (yyyy-mm-dd) into "DD Mon - DD Mon YYYY". */
const DATE_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtAuditDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-');
  const mi = parseInt(m, 10) - 1;
  if (!y || !d || mi < 0 || mi > 11) return null;
  return { d: String(parseInt(d, 10)), mon: DATE_MONTHS[mi], y };
};
const fmtAuditDateRange = (from, to) => {
  const a = fmtAuditDay(from), b = fmtAuditDay(to);
  if (a && b) {
    if (a.y === b.y && a.mon === b.mon && a.d === b.d) return `${a.d} ${a.mon} ${a.y}`;
    if (a.y === b.y) return `${a.d} ${a.mon} - ${b.d} ${b.mon} ${b.y}`;
    return `${a.d} ${a.mon} ${a.y} - ${b.d} ${b.mon} ${b.y}`;
  }
  const one = a || b;
  return one ? `${one.d} ${one.mon} ${one.y}` : '';
};

/* Add a number of whole months to an ISO date (yyyy-mm-dd), returning ISO. */
const addMonthsISO = (iso, n) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(x => parseInt(x, 10));
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1 + n, d);
  const pad = x => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const ROLES = ['Lead Auditor','Auditor','Technical Expert'];
const NC_TYPES = ['Minor NC','Major NC'];
const CONFORMITY = ['C','NC','O','OFI','N/A'];

/* ISO/IEC 27001 Annex A — Information Security Controls appendix, matching the
   fixed "Information Security Controls" sheet on the AUD-F-09 template (93 controls). */
const INFO_SEC_CONTROLS = [
  { group: 'A.5 Organizational Controls', items: [
    ['5.1','Policies for information security'], ['5.2','Information security roles and responsibilities'],
    ['5.3','Segregation of duties'], ['5.4','Management responsibilities'],
    ['5.5','Contact with authorities'], ['5.6','Contact with special interest groups'],
    ['5.7','Threat intelligence'], ['5.8','Information security in project management'],
    ['5.9','Inventory of information and other associated assets'], ['5.10','Acceptable use of information and other associated assets'],
    ['5.11','Return of assets'], ['5.12','Classification of information'],
    ['5.13','Labelling of information'], ['5.14','Information transfer'],
    ['5.15','Access control'], ['5.16','Identity management'],
    ['5.17','Authentication information'], ['5.18','Access rights'],
    ['5.19','Information security in supplier relationships'], ['5.20','Addressing information security within supplier agreements'],
    ['5.21','Managing information security in the information and communication technology (ICT) supply chain'], ['5.22','Monitoring, review and change management of supplier services'],
    ['5.23','Information security for use of cloud services'], ['5.24','Information security incident management planning and preparation'],
    ['5.25','Assessment and decision on information security events'], ['5.26','Response to information security incidents'],
    ['5.27','Learning from information security incidents'], ['5.28','Collection of evidence'],
    ['5.29','Information security during disruption'], ['5.30','ICT readiness for business continuity'],
    ['5.31','Legal, statutory, regulatory and contractual requirements'], ['5.32','Intellectual property rights'],
    ['5.33','Protection of records'], ['5.34','Privacy and protection of personal identifiable information (PII)'],
    ['5.35','Independent review of information security'], ['5.36','Compliance with policies, rules and standards for information security'],
    ['5.37','Documented operating procedures'],
  ]},
  { group: '6 Peoples Controls', items: [
    ['6.1','Screening'], ['6.2','Terms and conditions of employment'],
    ['6.3','Information security awareness, education and training'], ['6.4','Disciplinary process'],
    ['6.5','Responsibilities after termination or change of employment'], ['6.6','Confidentiality or non-disclosure agreements'],
    ['6.7','Remote working'], ['6.8','Information security event reporting'],
  ]},
  { group: '7.0 Physical Controls', items: [
    ['7.1','Physical security perimeters'], ['7.2','Physical entry'],
    ['7.3','Securing offices, rooms and facilities'], ['7.4','Physical security monitoring'],
    ['7.5','Protecting against physical and environmental threats'], ['7.6','Working in secure areas'],
    ['7.7','Clear desk and clear screen'], ['7.8','Equipment siting and protection'],
    ['7.9','Security of assets off-premises'], ['7.10','Storage media'],
    ['7.11','Supporting utilities'], ['7.12','Cabling security'],
    ['7.13','Equipment maintenance'], ['7.14','Secure disposal or re-use of equipment'],
  ]},
  { group: '8. Technological controls', items: [
    ['8.1','User end point devices'], ['8.2','Privileged access rights'],
    ['8.3','Information access restriction'], ['8.4','Access to source code'],
    ['8.5','Secure authentication'], ['8.6','Capacity management'],
    ['8.7','Protection against malware'], ['8.8','Management of technical vulnerabilities'],
    ['8.9','Configuration management'], ['8.10','Information deletion'],
    ['8.11','Data masking'], ['8.12','Data leakage prevention'],
    ['8.13','Information backup'], ['8.14','Redundancy of information processing facilities'],
    ['8.15','Logging'], ['8.16','Monitoring activities'],
    ['8.17','Clock synchronization'], ['8.18','Use of privileged utility programs'],
    ['8.19','Installation of software on operational systems'], ['8.20','Networks security'],
    ['8.21','Security of network services'], ['8.22','Segregation of networks'],
    ['8.23','Web filtering'], ['8.24','Use of cryptography'],
    ['8.25','Secure development life cycle'], ['8.26','Application security requirements'],
    ['8.27','Secure system architecture and engineering principles'], ['8.28','Secure coding'],
    ['8.29','Security testing in development and acceptance'], ['8.30','Outsourced development'],
    ['8.31','Separation of development, test and production environments'], ['8.32','Change management'],
    ['8.33','Test information'], ['8.34','Protection of information systems during audit testing'],
  ]},
];

const SURV_CHECKS = [
  'Closure of Previous NC & its effectiveness',
  'Compliance of use of QCC logo/marks & Applicable AB logo / marks, if applicable',
  'Any changes with respect to management system',
  'Any Complaints / interested party feedback',
  'Any Change in Scope',  
  'Any additional Information',
];

/* Fixed, non-editable Stage-2 audit objective wording. */
const AUDIT_OBJECTIVES = 'To verify the effective implementation, adequacy, conformity and performance of the organization’s Management System during Stage–2 audit. The audit objective is to determine whether the implemented management system is capable of consistently meeting customer requirements, statutory and regulatory requirements, applicable legal obligations, and the organization’s own policies and objectives. The audit shall also evaluate process effectiveness, risk-based thinking, achievement of objectives, operational controls, monitoring and measurement results, internal audit effectiveness, management review outputs, corrective actions, continual improvement, and overall readiness for certification decision.';

/* Fixed, non-editable Stage-2 audit criteria wording. */
const AUDIT_CRITERIA = 'Applicable requirements of organization’s documented policies, manuals, procedures, SOPs, work instructions, process flow charts, risk assessments, objectives and targets; applicable statutory, regulatory, legal and contractual requirements; customer requirements; operational control requirements; monitoring and measurement records; internal audit reports; management review records; corrective action records; performance evaluation results; applicable IAF mandatory documents and accreditation requirements; and other relevant normative references applicable to the organization’s scope of certification.';

const DEFAULT = {
  idNo: '', orgName: '', address: '', contactPerson: '', contactDetails: '',
  auditType: 'Stage II', auditStandards: 'ISO 9001', modeOfAudit: '',
  onlineMeetingLink: '', scopeOfCertification: '', iafCode: '',
  auditLanguage: 'English', auditDates: '',
  auditTeam: [{ name: '', role: '', competency: '', stage2MD: '' }],
  auditObjectives: AUDIT_OBJECTIVES,
  auditCriteria: AUDIT_CRITERIA,
  deviationFromPlan: '',
  significantIssues: '',
  significantChanges: '',
  survChecks: Object.fromEntries(SURV_CHECKS.map((_, i) => [`check_${i}`, 'N/A'])),
  minorNC: '0', majorNC: '0', observations: '0', ofi: '0',
  recommendation: '',
  proposedNextAuditDate: '',
  resultsEvaluation: '',
  ncList: [],
  observationList: [],
  ofiList: [],
  // Stage-2 checklist is kept per selected standard:
  //   { [standardName]: [ { clause, description, conformity, finding }, ... ] }
  checklists: {},
  // Information Security Controls (ISO/IEC 27001 Annex A appendix), per selected standard:
  //   { [standardName]: { [clauseNo]: { conformity, finding } } }
  iscChecklists: {},
};


const REC_OPTS = [
  { value: 'certified',   label: 'Recommended for Certification — The Management System complies with requirements.' },
  { value: 'minor_nc',    label: 'Recommended with Minor NC — Certification recommended upon off-site verification within 60 days.' },
  { value: 'major_nc',    label: 'Not recommended due to Major NC — Follow-up assessment required within 60 days.' },
  { value: 'suspend',     label: 'Not Recommended / Suspension / Withdrawal / Surveillance / Re-Certification.' },
];

export default function Form11Stage2AuditReport() {
  return (
    <QMSFormPage
      formType={11}
      formCode="AUD-F-15"
      formTitle="Stage 2 Audit Report"
      defaultData={DEFAULT}
      prefillFrom={{
        formTypes: [7],
        apply: (sources, cur) => {
          const src = sources[7] || {};
          return {
            ...cur,
            ncList:          (cur.ncList && cur.ncList.length)                   ? cur.ncList          : (src.ncList || []),
            observationList: (cur.observationList && cur.observationList.length) ? cur.observationList : (src.observationList || []),
          };
        },
      }}
    >
      {(props) => <Stage2ReportBody {...props} />}
    </QMSFormPage>
  );
}

function Stage2ReportBody({ data, set, clientInfo }) {
  const { byName, names, loading } = useStandards();

  // Standards the client selected in their Application Form (F01) drive the
  // checklist grouping — read from the live client record, falling back to a
  // snapshot saved on this form so it still renders when reopened from the list.
  const liveApp  = deriveClientStandards(clientInfo, names);
  const savedApp = Array.isArray(data.appStandards) ? data.appStandards : [];
  const stdNames = names.filter(k => liveApp.includes(k) || savedApp.includes(k));
  const checklists = data.checklists || {};
  const openMap    = data.checklistOpen || {};

  // Snapshot the application standards into the form data once available, so the
  // checklist still renders after saving and reopening from the list.
  useEffect(() => {
    if (liveApp.length && JSON.stringify(savedApp) !== JSON.stringify(liveApp)) {
      set('appStandards', liveApp);
    }
  }, [clientInfo, names.length]); // eslint-disable-line

  // Audit Objectives & Criteria are fixed, non-editable wording — keep them persisted
  // so saved and exported reports always carry the standard text (covers older forms).
  useEffect(() => {
    if (data.auditObjectives !== AUDIT_OBJECTIVES) set('auditObjectives', AUDIT_OBJECTIVES);
    if (data.auditCriteria !== AUDIT_CRITERIA) set('auditCriteria', AUDIT_CRITERIA);
  }, [data.auditObjectives, data.auditCriteria]); // eslint-disable-line

  // Section-1 details are fetched from F02 (Application Review). Type of Audit always
  // mirrors F02; the remaining detail fields fill in only when still blank here so any
  // manual edits are preserved.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');

        const blank = v => !(v && String(v).trim());
        const fill = (key, val) => { if (val && String(val).trim() && blank(data[key])) set(key, String(val)); };
        fill('idNo', fd.idNo);
        fill('orgName', fd.orgName);
        fill('address', fd.address);
        fill('contactPerson', fd.contactPerson);
        fill('contactDetails', fd.contactNumbers);
        fill('modeOfAudit', fd.modeOfAudit);
        fill('onlineMeetingLink', fd.onlineMeetingLink);
        fill('scopeOfCertification', fd.scopeOfCertification);
        fill('iafCode', fd.iafCode);

        // Language of Audit — also overwrite the plain "English" default.
        if (fd.auditLanguage && String(fd.auditLanguage).trim() && (blank(data.auditLanguage) || data.auditLanguage === 'English')) {
          set('auditLanguage', fd.auditLanguage);
        }

        // 1.12 Audit Dates — Stage-2 dates from F02, formatted "DD Mon - DD Mon YYYY".
        const dates = fmtAuditDateRange(fd.stage2DateFrom, fd.stage2DateTo);
        if (dates && blank(data.auditDates)) set('auditDates', dates);

        // Proposed Next Audit Date — audit start date + 11 months.
        const baseDate = fd.stage2DateFrom || fd.stage2DateTo;
        const nextDate = addMonthsISO(baseDate, 11);
        if (nextDate && blank(data.proposedNextAuditDate)) set('proposedNextAuditDate', nextDate);

        // 2. Audit Team Details — pull the Stage-2 team from F02. Brings over members
        // with an auditing role or assigned Stage-2 man-days; fills only when this
        // form's team is still empty so manual edits are preserved.
        const teamSrc = (fd.auditTeam || []).filter(a => a && a.name && String(a.name).trim() && (
          ROLES.includes(a.role) ||
          (a.stage2Days && String(a.stage2Days).trim() && String(a.stage2Days).trim() !== '0')
        ));
        const teamEmpty = !(data.auditTeam || []).some(a => a && a.name && String(a.name).trim());
        if (teamSrc.length && teamEmpty) {
          set('auditTeam', teamSrc.map(a => ({
            name: String(a.name).trim(),
            role: ROLES.includes(a.role) ? a.role : '',
            competency: '',
            stage2MD: a.stage2Days != null && String(a.stage2Days).trim() ? String(a.stage2Days) : '',
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Seed each selected standard's checklist with its own clauses (Standard schema).
  useEffect(() => {
    if (loading) return;
    const next = { ...(data.checklists || {}) };
    let changed = false;
    stdNames.forEach(name => {
      if ((next[name] || []).length) return;
      const cls = clausesForStandards(byName, name);
      if (cls.length) {
        next[name] = cls.map(c => ({ clause: c.no, description: c.text, conformity: 'N/A', finding: '' }));
        changed = true;
      }
    });
    if (changed) set('checklists', next);
  }, [loading, stdNames.join('|')]); // eslint-disable-line

  const isOpen     = name => openMap[name] !== false; // default open
  const toggleOpen = name => set('checklistOpen', { ...openMap, [name]: !isOpen(name) });

  const setTeam = (ri,k,v)=>{ const t=[...(data.auditTeam||[])]; t[ri]={...t[ri],[k]:v}; set('auditTeam',t); };
  const setNC   = (ri,k,v)=>{ const t=[...(data.ncList||[])]; t[ri]={...t[ri],[k]:v}; set('ncList',t); };
  const setObs  = (ri,k,v)=>{ const t=[...(data.observationList||[])]; t[ri]={...t[ri],[k]:v}; set('observationList',t); };
  const setOFI  = (ri,k,v)=>{ const t=[...(data.ofiList||[])]; t[ri]={...t[ri],[k]:v}; set('ofiList',t); };
  const setCL   = (name,ri,k,v)=>{ const t=[...(checklists[name]||[])]; t[ri]={...t[ri],[k]:v}; set('checklists',{...checklists,[name]:t}); };
  const iscChecklists = data.iscChecklists || {};
  const setISC  = (name, no, k, v) => {
    const forStd = { ...(iscChecklists[name] || {}) };
    forStd[no] = { ...(forStd[no] || {}), [k]: v };
    set('iscChecklists', { ...iscChecklists, [name]: forStd });
  };
  const survChecks = data.survChecks || {};
  return (
          <div>
            <SectionTitle>1. Organization & Audit Details</SectionTitle>
            <FormRow cols={2}>
              <FormField label="1.1 ID No." required><FInput value={data.idNo} onChange={v=>set('idNo',v)} /></FormField>
              <FormField label="1.2 Organization Name" required><FInput value={data.orgName} onChange={v=>set('orgName',v)} /></FormField>
            </FormRow>
            <FormRow cols={1}><FormField label="1.3 Address"><FTextarea value={data.address} onChange={v=>set('address',v)} rows={2} /></FormField></FormRow>
            <FormRow cols={2}>
              <FormField label="1.4 Contact Person"><FInput value={data.contactPerson} onChange={v=>set('contactPerson',v)} /></FormField>
              <FormField label="Contact Details"><FInput value={data.contactDetails} onChange={v=>set('contactDetails',v)} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.5 Type of Audit">
                <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
              </FormField>
              <FormField label="1.6 Audit Standard(s)"><StandardChips value={data.auditStandards} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.7 Mode of Audit">
                <FSelect value={data.modeOfAudit} onChange={v=>set('modeOfAudit',v)} placeholder="Select" options={['Online','Onsite','Hybrid']} />
              </FormField>
              <FormField label="1.8 Online Meeting Link"><FInput value={data.onlineMeetingLink} onChange={v=>set('onlineMeetingLink',v)} placeholder="https://..." /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.9 Scope of Certification"><FTextarea value={data.scopeOfCertification} onChange={v=>set('scopeOfCertification',v)} rows={2} /></FormField>
              <FormField label="1.10 Applicable IAF / EA Code"><FInput value={data.iafCode} onChange={v=>set('iafCode',v)} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.11 Language of Audit"><FInput value={data.auditLanguage} onChange={v=>set('auditLanguage',v)} placeholder="English" /></FormField>
              <FormField label="1.12 Audit Dates"><FInput value={data.auditDates} onChange={v=>set('auditDates',v)} placeholder="DD Mon - DD Mon YYYY" /></FormField>
            </FormRow>

            <SectionTitle>2. Audit Team Details</SectionTitle>
            <DynamicTable
              columns={[{key:'name',label:'Name',minWidth:140},{key:'role',label:'Role',type:'select',options:ROLES},{key:'competency',label:'Competency Standard(s)',minWidth:160},{key:'stage2MD',label:'Stage-2 MD',minWidth:80}]}
              rows={data.auditTeam||[]} onAdd={()=>set('auditTeam',[...(data.auditTeam||[]),{name:'',role:'',competency:'',stage2MD:''}])}
              onRemove={ri=>set('auditTeam',(data.auditTeam||[]).filter((_,i)=>i!==ri))} onCellChange={setTeam} addLabel="Add Member" />

            <div style={{ margin: '16px 0', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> This audit has been conducted on a sampling basis of the available information, documents, records, processes and activities reviewed during the audit. The audit findings are based only on the evidence verified at the time of audit and do not guarantee detection of all possible nonconformities or system weaknesses.
            </div>

            <SectionTitle>Audit Context</SectionTitle>
            <FormRow cols={1}><FormField label="Audit Objectives"><FTextarea value={AUDIT_OBJECTIVES} onChange={()=>{}} readOnly /></FormField></FormRow>
            <FormRow cols={1}><FormField label="Audit Criteria"><FTextarea value={AUDIT_CRITERIA} onChange={()=>{}} readOnly /></FormField></FormRow>
            <FormRow cols={2}>
              <FormField label="Any deviation from the audit plan?"><FTextarea value={data.deviationFromPlan} onChange={v=>set('deviationFromPlan',v)} rows={2} /></FormField>
              <FormField label="Significant issues impacting audit programme?"><FTextarea value={data.significantIssues} onChange={v=>set('significantIssues',v)} rows={2} /></FormField>
            </FormRow>
            <FormRow cols={1}><FormField label="Significant changes affecting management system since last audit"><FTextarea value={data.significantChanges} onChange={v=>set('significantChanges',v)} rows={2} /></FormField></FormRow>

            <SectionTitle>Surveillance / Recertification Verification</SectionTitle>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', minWidth: 320 }}>Verification Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', minWidth: 200 }}>Status / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {SURV_CHECKS.map((check, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i%2===0?'white':'#fafafa' }}>
                      <td style={{ padding: '8px 12px', fontSize: 13 }}>{check}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="text" value={survChecks[`check_${i}`] || 'N/A'} onChange={e=>set('survChecks',{...survChecks,[`check_${i}`]:e.target.value})}
                          style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionTitle>Non-Conformities Summary</SectionTitle>
            <FormRow cols={4}>
              <FormField label="Minor NC"><FInput value={data.minorNC} onChange={v=>set('minorNC',v)} type="number" placeholder="0" /></FormField>
              <FormField label="Major NC"><FInput value={data.majorNC} onChange={v=>set('majorNC',v)} type="number" placeholder="0" /></FormField>
              <FormField label="Observations"><FInput value={data.observations} onChange={v=>set('observations',v)} type="number" placeholder="0" /></FormField>
              <FormField label="OFI"><FInput value={data.ofi} onChange={v=>set('ofi',v)} type="number" placeholder="0" /></FormField>
            </FormRow>

            <SectionTitle>Recommendation</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REC_OPTS.map(o => (
                <label key={o.value} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:8,border:`1.5px solid ${data.recommendation===o.value?'var(--primary)':'#e2e8f0'}`,background:data.recommendation===o.value?'#fff7ed':'white',cursor:'pointer',fontSize:13 }}>
                  <input type="radio" value={o.value} checked={data.recommendation===o.value} onChange={()=>set('recommendation',o.value)} style={{marginTop:2}} />
                  {o.label}
                </label>
              ))}
            </div>
            <FormRow cols={1} style={{marginTop:16}}>
              <FormField label="Proposed Next Audit Date (Surveillance / Re-certification)">
                <FInput value={data.proposedNextAuditDate} onChange={v=>set('proposedNextAuditDate',v)} type="date" />
              </FormField>
            </FormRow>

            <SectionTitle>3. Non-Conformities Overview</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'standard',label:'MS Standard',minWidth:120},{key:'type',label:'Type of NC',type:'select',options:NC_TYPES},{key:'clause',label:'Clause No.',minWidth:80},{key:'details',label:'Details of NC',type:'textarea',fullRow:true}]}
              rows={data.ncList||[]} onAdd={()=>set('ncList',[...(data.ncList||[]),{sNo:String((data.ncList||[]).length+1),standard:'ISO 9001:2015',type:'Minor NC',clause:'',details:''}])}
              onRemove={ri=>set('ncList',(data.ncList||[]).filter((_,i)=>i!==ri))} onCellChange={setNC} addLabel="Add NC" />

            <SectionTitle>Observations Overview</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'standard',label:'MS Standard',minWidth:120},{key:'clause',label:'Clause No.',minWidth:80},{key:'details',label:'Details',type:'textarea',fullRow:true}]}
              rows={data.observationList||[]} onAdd={()=>set('observationList',[...(data.observationList||[]),{sNo:String((data.observationList||[]).length+1),standard:'ISO 9001:2015',clause:'',details:''}])}
              onRemove={ri=>set('observationList',(data.observationList||[]).filter((_,i)=>i!==ri))} onCellChange={setObs} addLabel="Add Observation" />

            <SectionTitle>4. Opportunities for Improvement (OFI)</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'ofi',label:'Opportunity for Improvement',type:'textarea',minWidth:240},{key:'standard',label:'MS Standard',minWidth:120},{key:'clause',label:'Relevant Clause',minWidth:100}]}
              rows={data.ofiList||[]} onAdd={()=>set('ofiList',[...(data.ofiList||[]),{sNo:String((data.ofiList||[]).length+1),ofi:'',standard:'ISO 9001:2015',clause:''}])}
              onRemove={ri=>set('ofiList',(data.ofiList||[]).filter((_,i)=>i!==ri))} onCellChange={setOFI} addLabel="Add OFI" />

            <SectionTitle>Results of Evaluation of Management System Documents and Implementation</SectionTitle>
            <FormRow cols={1}>
              <FormField label="Results of the evaluation of management system documents and their implementation">
                <FTextarea value={data.resultsEvaluation} onChange={v=>set('resultsEvaluation',v)} rows={4}
                  placeholder="Summarise findings from evaluation of management system documents and observed implementation..." />
              </FormField>
            </FormRow>

 
 
    

            <SectionTitle>5. Quality Stage-2 Audit Checklist</SectionTitle>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>
              C – Conformity&nbsp;&nbsp; NC – Non Conformity&nbsp;&nbsp; O – Observation&nbsp;&nbsp; OFI – Opportunity&nbsp;&nbsp; N/A – Not Applicable
            </div>
            {stdNames.length === 0 ? (
              <div className="aud3-empty">
                No ISO standards were selected in this client's Application Form (F01).
              </div>
            ) : (
              <div className="aud3-stack">
                {stdNames.map(name => {
                  const rows = checklists[name] || [];
                  const open = isOpen(name);
                  const meta = byName[name];
                  return (
                    <section key={name} className={`aud3-std${open ? ' open' : ''}`}>
                      <button type="button" className="aud3-head" onClick={() => toggleOpen(name)}>
                        <span className="aud3-chev"><FiChevronRight size={18} /></span>
                        <span className="aud3-mark">{stdCode(name)}</span>
                        <span className="aud3-title">
                          <span className="name">{name}</span>
                          {meta?.category && <span className="desc">{meta.category}</span>}
                        </span>
                        <span className="aud3-meta">
                          <span className="aud3-pill active">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="aud3-body" style={{ padding: 16, overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Clause','Description','C/NC/O/OFI'].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, ri) => (
                                <React.Fragment key={ri}>
                                  <tr style={{ background: ri%2===0?'white':'#fafafa' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--primary-dark)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{row.clause}</td>
                                    <td style={{ padding: '6px 10px', fontSize: 11.5, whiteSpace: 'pre-line', maxWidth: 340, verticalAlign: 'top' }}>{row.description}</td>
                                    <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                                      <select value={row.conformity||'N/A'} onChange={e=>setCL(name,ri,'conformity',e.target.value)}
                                        style={{ padding: '4px 6px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', background: 'white' }}>
                                        {CONFORMITY.map(c=><option key={c} value={c}>{c}</option>)}
                                      </select>
                                    </td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: ri%2===0?'white':'#fafafa' }}>
                                    <td colSpan={3} style={{ padding: '0 10px 10px' }}>
                                      <textarea value={row.finding||''}
                                        onChange={e=>setCL(name,ri,'finding',e.target.value)}
                                        onInput={e=>{ e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                                        ref={el=>{ if(el){ el.style.height='auto'; el.style.height=el.scrollHeight+'px'; } }}
                                        rows={2}
                                        placeholder="Finding / evidence / notes..."
                                        style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>

                          {/* Information Security Controls (ISO/IEC 27001 Annex A) — only
                              shown when this is the ISO 45001:2018 standard's accordion. */}
                          {stdCode(name) === '45001' && (
                          <>
                          <div style={{ marginTop: 20, fontSize: 12.5, fontWeight: 800, color: 'var(--primary-dark)', background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: '8px 8px 0 0', padding: '10px 12px' }}>
                            Information Security Controls
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Clause','Description','C/NC/O/OFI'].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {INFO_SEC_CONTROLS.map(section => (
                                <React.Fragment key={section.group}>
                                  <tr>
                                    <td colSpan={3} style={{ padding: '7px 10px', textAlign: 'left', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, letterSpacing: '.02em', borderBottom: '1px solid #e2e8f0' }}>{section.group}</td>
                                  </tr>
                                  {section.items.map(([no, text]) => {
                                    const cv = (iscChecklists[name] || {})[no] || {};
                                    return (
                                      <React.Fragment key={no}>
                                        <tr style={{ background: 'white' }}>
                                          <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--primary-dark)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{no}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 11.5, whiteSpace: 'pre-line', maxWidth: 340, verticalAlign: 'top' }}>{text}</td>
                                          <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                                            <select value={cv.conformity || 'N/A'} onChange={e => setISC(name, no, 'conformity', e.target.value)}
                                              style={{ padding: '4px 6px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', background: 'white' }}>
                                              {CONFORMITY.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                          </td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td colSpan={3} style={{ padding: '0 10px 10px' }}>
                                            <textarea value={cv.finding || ''}
                                              onChange={e => setISC(name, no, 'finding', e.target.value)}
                                              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                              rows={2}
                                              placeholder="Finding / evidence / notes..."
                                              style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                          </>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
  );
}
