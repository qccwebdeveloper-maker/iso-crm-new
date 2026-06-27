import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FRadioGroup, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

// Format two ISO dates (yyyy-mm-dd) into a "DD Mon - DD Mon YYYY" range string.
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDateRange = (from, to) => {
  const part = iso => { const [, m, d] = String(iso).split('-'); return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`; };
  const year = iso => String(iso).split('-')[0];
  if (from && to) return `${part(from)} - ${part(to)} ${year(to)}`;
  if (from) return `${part(from)} ${year(from)}`;
  return '';
};
import useStandards, { clausesForStandards, deriveClientStandards } from './useStandards';
import { FiChevronRight } from 'react-icons/fi';

/* Short code (e.g. "27001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

const ROLES = ['Lead Auditor','Auditor','Technical Expert','Application & Report Reviewer','HOD','Guide','Observer'];
const NC_TYPES = ['Minor NC','Major NC','Observation','OFI'];
const REC_OPTS = [
  { value: 'proceed', label: 'Recommended proceeding with Stage 2 within agreed timeframe after review of Stage-1 audit results.' },
  { value: 'pending', label: 'Recommended not proceeding to Stage 2 until audit evidence has been submitted showing that concerns have been rectified.' },
  { value: 'repeat',  label: 'Recommended not proceeding without a further Stage 1 audit due to severity of concerns raised.' },
];
const CONFORMITY = ['C','NC','O','OFI','N/A'];

const ISMS_REVIEW_QUESTIONS = [
  'Are complex controls such as cryptography, cloud security, network security, access control, backup and monitoring reviewed for audit planning?',
  'Has the organization clearly defined the type of activity or process covered under the ISMS?',
  'Are core, support and outsourced processes within the ISMS scope identified?',
  'Are information security risks linked with the identified activities or processes?',
  'Are critical activities or processes involving confidential, sensitive or customer information identified?',
  'Are IT, operational, administrative and business processes relevant to the ISMS clearly described?',
  'Is the provided information on manpower and activity/process type sufficient for determining audit planning, scope and duration?',
  'Has the organization identified the complexity level of the ISMS considering criticality of information and associated risks?',
  'Has the organization identified critical, confidential, sensitive or customer information handled within the ISMS scope?',
  'Are major information security risks identified for processes, assets, systems and activities under the ISMS?',
  'Has the organization clearly defined the type of business activities performed within the ISMS scope?',
  'Are all business functions, services and processes included in the ISMS scope clearly identified?',
  'Has the organization provided previous ISMS performance information, where applicable?',
  'Are previous nonconformities, security incidents, corrective actions and improvement records reviewed?',
  'Has the organization identified the extent and diversity of technology used in implementing the ISMS?',
  'Are the number and types of IT platforms, operating systems, databases, applications and cloud platforms identified?',
  'Has the organization identified the number of segregated networks and network zones used within the ISMS scope?',
  'Has the organization identified outsourced processes and third-party arrangements used within the ISMS scope?',
  'Are third parties having access to information assets, systems, networks or customer data identified and controlled?',
  'Has the organization identified the extent of information system development activities within the ISMS scope?',
  'Are controls for secure design, development, testing, deployment and change management identified?',
  'Has the organization provided the number of sites covered under the ISMS scope?',
  'Has the organization identified Disaster Recovery sites included or relevant to the ISMS scope?',
  'Are site-wise activities, manpower, technology, processes and security controls identified for audit planning?',
  'After Stage 1, has the certification body considered the number and complexity of ISMS controls implemented?',
  'Are complex controls such as cryptography, cloud security, network security, access control, backup and monitoring reviewed for audit planning?',
  'Is the information sufficient to determine audit duration, audit team competence and Stage 2 planning?',
];

const DEFAULT = {
  idNo: '', isoStandards: '', orgName: '', auditLanguage: 'English', address: '',
  modeOfAudit: '', contactPerson: '', onlineMeetingLink: '',
  contactDetails: '', auditDates: '', auditType: '', stage1Duration: '',
  scopeOfCertification: '', iafCode: '', quotedManDaysAdequate: '',
  auditStandards: '',
  auditTeam: [{ name: '', role: '', standard: '', stage1MD: '' }],
  auditObjectives: `The objectives of the Stage-1 Audit are to determine the organization's readiness for the Stage-2 Certification Audit by evaluating the adequacy, implementation status, and effectiveness of the Management System documentation and processes.

The audit objectives include:
1. To assess the conformity and adequacy of the documented management system against the applicable standard requirements.
2. To review the status of implementation of the management system, including established policies, objectives, procedures, and documented information.
3. To evaluate the organization's internal audit programme and management review process to ensure they have been effectively planned and conducted.
4. To assess site-specific conditions, operational processes, infrastructure, equipment, and resources relevant to the scope of certification.
5. To verify identification and compliance evaluation of applicable statutory, regulatory, and legal requirements.
6. To assess the organization's preparedness for the Stage-2 Audit and identify any areas of concern that could be classified as nonconformities during Stage-2.
7. To confirm the certification scope, organizational context, interested parties, risks and opportunities, and understanding of applicable management system requirements.
8. To collect sufficient information regarding the management system, processes, locations, and activities to facilitate effective planning of the Stage-2 Audit.`,
  auditCriteria: 'Client QMS Manual, policies, procedures, SOPs, process flow, risk assessment, legal register, objectives, internal audit records, management review records, operational control records, compliance obligations, customer/contractual requirements, and applicable site-specific requirements.',
  briefAboutOrg: '',
  auditDurationChange: '', employeeDetailChange: '', employeeDetailChangeDetails: '',
  scopeChange: '', scopeChangeDetails: '', additionalInfo: '',
  nonConformitiesRaised: '',
  minorNC: '0', majorNC: '0', observations: '0', ofi: '0', overallReadiness: '',
  ismsReview: {},
  recommendation: '',
  ncList: [],
  observationList: [],
  ofiList: [],
  // Stage-1 checklist is kept per selected standard:
  //   { [standardName]: [ { clause, description, conformity, finding }, ... ] }
  checklists: {},
};

export default function Form07Stage1AuditReport() {
  return (
    <QMSFormPage
      formType={7}
      formCode="AUD-F-09"
      formTitle="Stage-1 Audit Report"
      defaultData={DEFAULT}
    >
      {(props) => <Stage1ReportBody {...props} />}
    </QMSFormPage>
  );
}

function Stage1ReportBody({ data, set, clientInfo }) {
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

  // Fetch the meeting link and Stage-1 audit dates from F02 (Application Review) and
  // fill them here when blank, without overwriting anything already entered.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const map = {
          onlineMeetingLink: fd.onlineMeetingLink,
          modeOfAudit:       fd.modeOfAudit,
          auditDates:        fmtDateRange(fd.stage1DateFrom, fd.stage1DateTo),
          stage1Duration:    fd.totalMandaysS1 != null && fd.totalMandaysS1 !== '' ? String(fd.totalMandaysS1) : '',
          iafCode:           fd.iafCode,
        };
        Object.entries(map).forEach(([k, v]) => {
          if (v && !(data[k] && String(data[k]).trim())) set(k, v);
        });
        // Type of Audit is a read-only mirror of F02 — always reflect its value.
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');
        // Audit team — carry the auditors from F02 (name, role, Stage-1 man-days)
        // when none have been entered here yet.
        const team = (fd.auditTeam || [])
          .filter(m => (m.name && m.name.trim()) || (m.role && m.role.trim()));
        const hasTeam = (data.auditTeam || []).some(m => m.name && m.name.trim());
        if (team.length && !hasTeam) {
          set('auditTeam', team.map(m => ({
            name: m.name || '', role: m.role || '', standard: '',
            stage1MD: m.stage1Days != null ? String(m.stage1Days) : '',
          })));
        }
      })
      .catch(() => { /* no F02 yet — keep application/defaults */ });
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

  const setTeam = (ri, k, v) => { const t=[...(data.auditTeam||[])]; t[ri]={...t[ri],[k]:v}; set('auditTeam',t); };
  const setNC   = (ri, k, v) => { const t=[...(data.ncList||[])]; t[ri]={...t[ri],[k]:v}; set('ncList',t); };
  const setObs  = (ri, k, v) => { const t=[...(data.observationList||[])]; t[ri]={...t[ri],[k]:v}; set('observationList',t); };
  const setOFI  = (ri, k, v) => { const t=[...(data.ofiList||[])]; t[ri]={...t[ri],[k]:v}; set('ofiList',t); };
  const setCL   = (name, ri, k, v) => { const t=[...(checklists[name]||[])]; t[ri]={...t[ri],[k]:v}; set('checklists',{...checklists,[name]:t}); };
  return (
          <div>
            <SectionTitle>1. Organization & Audit Details</SectionTitle>
            <FormRow cols={2}>
              
              <FormField label="1.1 ID No." required><FInput value={data.idNo} onChange={v=>set('idNo',v)} placeholder="Client ID" /></FormField>
              <FormField label="ISO Standards"><StandardChips value={data.isoStandards || data.auditStandards} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.2 Organization Name" required><FInput value={data.orgName} onChange={v=>set('orgName',v)} /></FormField>
              <FormField label="Language of Audit"><FInput value={data.auditLanguage} onChange={v=>set('auditLanguage',v)} placeholder="English" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.3 Address"><FTextarea value={data.address} onChange={v=>set('address',v)} rows={2} /></FormField>
              <FormField label="Mode of Audit">
                <FInput value={data.modeOfAudit} disabled placeholder="Auto-filled from Application Form" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.4 Contact Person"><FInput value={data.contactPerson} onChange={v=>set('contactPerson',v)} /></FormField>
              <FormField label="Online Meeting Link"><FInput value={data.onlineMeetingLink} onChange={v=>set('onlineMeetingLink',v)} placeholder="https://..." /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.5 Contact Details"><FInput value={data.contactDetails} onChange={v=>set('contactDetails',v)} /></FormField>
              <FormField label="Audit Dates"><FInput value={data.auditDates} onChange={v=>set('auditDates',v)} placeholder="DD Mon - DD Mon YYYY" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.6 Type of Audit">
                <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
              </FormField>
              <FormField label="Stage-1 Audit Duration"><FInput value={data.stage1Duration} onChange={v=>set('stage1Duration',v)} placeholder="e.g. 1 day" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.7 Scope of Certification"><FTextarea value={data.scopeOfCertification} onChange={v=>set('scopeOfCertification',v)} rows={2} /></FormField>
              <FormField label="Applicable IAF / EA Code"><FInput value={data.iafCode} onChange={v=>set('iafCode',v)} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.8 Audit Standard(s)"><StandardChips value={data.auditStandards || data.isoStandards} /></FormField>
              <FormField label="Quoted Man-days Adequate?">
                <FRadioGroup value={data.quotedManDaysAdequate} onChange={v=>set('quotedManDaysAdequate',v)} options={[{value:'Yes',label:'Yes'},{value:'No',label:'No'}]} />
              </FormField>
            </FormRow>

            <SectionTitle>2. Audit Team Details</SectionTitle>
            <DynamicTable
              columns={[{key:'name',label:'Name',minWidth:140},{key:'role',label:'Role',type:'select',options:ROLES},{key:'standard',label:'Standard / Competency',minWidth:160},{key:'stage1MD',label:'Stage-1 MD',minWidth:80}]}
              rows={data.auditTeam||[]} onAdd={()=>set('auditTeam',[...(data.auditTeam||[]),{name:'',role:'',standard:'',stage1MD:''}])}
              onRemove={ri=>set('auditTeam',(data.auditTeam||[]).filter((_,i)=>i!==ri))} onCellChange={setTeam} addLabel="Add Member" />

            <SectionTitle>Audit Objectives</SectionTitle>
            <div style={{ padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', fontSize: 13, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line', marginBottom: 16 }}>
              {data.auditObjectives}
            </div>

            <SectionTitle>Audit Criteria</SectionTitle>
            <div style={{ padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', fontSize: 13, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line', marginBottom: 16 }}>
              {data.auditCriteria}
            </div>

            <SectionTitle>Brief About the Organization</SectionTitle>
            <FTextarea value={data.briefAboutOrg} onChange={v=>set('briefAboutOrg',v)} rows={4} placeholder="Brief organizational overview..." />

            <SectionTitle>Changes & Summary</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Audit Duration for Stage 1"><FInput value={data.auditDurationChange} onChange={v=>set('auditDurationChange',v)} /></FormField>
              <FormField label="Non-Conformities Raised"><FInput value={data.nonConformitiesRaised} onChange={v=>set('nonConformitiesRaised',v)} /></FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Any change in employee details?">
                <FRadioGroup value={data.employeeDetailChange} onChange={v=>set('employeeDetailChange',v)} options={[{value:'Yes',label:'Yes'},{value:'No',label:'No'}]} />
              </FormField>
            </FormRow>
            {data.employeeDetailChange==='Yes' && (
              <FormRow cols={1}>
                <FormField label="Employee Change Details" required>
                  <FTextarea value={data.employeeDetailChangeDetails} onChange={v=>set('employeeDetailChangeDetails',v)} rows={2} placeholder="Describe the change in employee details" />
                </FormField>
              </FormRow>
            )}
            <FormRow cols={1}>
              <FormField label="Any change in Scope?">
                <FRadioGroup value={data.scopeChange} onChange={v=>set('scopeChange',v)} options={[{value:'Yes',label:'Yes'},{value:'No',label:'No'}]} />
              </FormField>
            </FormRow>
            {data.scopeChange==='Yes' && (
              <FormRow cols={1}>
                <FormField label="Scope Change Details" required>
                  <FTextarea value={data.scopeChangeDetails} onChange={v=>set('scopeChangeDetails',v)} rows={2} placeholder="Describe the change in scope" />
                </FormField>
              </FormRow>
            )}
            <FormRow cols={1}>
              <FormField label="Additional Information"><FTextarea value={data.additionalInfo} onChange={v=>set('additionalInfo',v)} rows={2} /></FormField>
            </FormRow>

            <SectionTitle>Non-Conformity / Observation Summary</SectionTitle>
            <FormRow cols={4}>
              <FormField label="Minor NC"><FInput value={data.minorNC} onChange={v=>set('minorNC',v)} type="number" placeholder="0" /></FormField>
              <FormField label="Major NC"><FInput value={data.majorNC} onChange={v=>set('majorNC',v)} type="number" placeholder="0" /></FormField>
              <FormField label="Observations"><FInput value={data.observations} onChange={v=>set('observations',v)} type="number" placeholder="0" /></FormField>
              <FormField label="OFI"><FInput value={data.ofi} onChange={v=>set('ofi',v)} type="number" placeholder="0" /></FormField>
            </FormRow>
            <SectionTitle>ISMS Stage-1 Readiness Review</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#1e40af', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Is ISMS Stage-1 Readiness Review applicable?</span>
              <div style={{ display: 'flex', gap: 16 }}>
                {['YES','NO'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: data.ismsReviewApplicable===v?700:500, color: 'white', fontSize: 12.5 }}>
                    <input type="radio" name="f07_ismsReviewApplicable" value={v} checked={data.ismsReviewApplicable===v}
                      onChange={()=>set('ismsReviewApplicable',v)} style={{ accentColor: 'white' }} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            {data.ismsReviewApplicable==='YES' && (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', width: '50%' }}>Review Item</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', width: 140 }}>Applicable</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ISMS_REVIEW_QUESTIONS.map((q, i) => {
                    const key = `q${i+1}`;
                    const ansKey = `${key}_ans`;
                    const review = data.ismsReview || {};
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i%2===0?'white':'#fafafa' }}>
                        <td style={{ padding: '8px 10px', fontSize: 12, lineHeight: 1.5, verticalAlign: 'top' }}>{q}</td>
                        <td style={{ padding: '8px 10px', verticalAlign: 'top', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                            {['Yes','No'].map(opt => (
                              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                                <input type="radio" name={ansKey} value={opt} checked={review[ansKey]===opt}
                                  onChange={()=>set('ismsReview',{...review,[ansKey]:opt})} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                          <textarea value={review[key]||''} onChange={e=>set('ismsReview',{...review,[key]:e.target.value})} rows={2}
                            placeholder="Remarks / evidence / notes..."
                            style={{ padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', minWidth: 240, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            <div style={{ margin: '16px 0', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> This audit has been conducted on a sampling basis of the available information, documents, records, processes and activities reviewed during the audit. The audit findings are based only on the evidence verified at the time of audit and do not guarantee detection of all possible nonconformities or system weaknesses.
            </div>

            <SectionTitle>3. Non-Conformities Overview</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'standard',label:'MS Standard',minWidth:120},{key:'type',label:'Type',type:'select',options:NC_TYPES},{key:'clause',label:'Clause No.',minWidth:80},{key:'details',label:'Details of NC',type:'textarea',fullRow:true}]}
              rows={data.ncList||[]} onAdd={()=>set('ncList',[...(data.ncList||[]),{sNo:String((data.ncList||[]).length+1),standard:'ISO 9001:2015',type:'Minor NC',clause:'',details:''}])}
              onRemove={ri=>set('ncList',(data.ncList||[]).filter((_,i)=>i!==ri))} onCellChange={setNC} addLabel="Add NC" />

            <SectionTitle>Observations Overview</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'standard',label:'MS Standard',minWidth:120},{key:'clause',label:'Clause No.',minWidth:80},{key:'details',label:'Details',type:'textarea',fullRow:true}]}
              rows={data.observationList||[]} onAdd={()=>set('observationList',[...(data.observationList||[]),{sNo:String((data.observationList||[]).length+1),standard:'ISO 9001:2015',clause:'',details:''}])}
              onRemove={ri=>set('observationList',(data.observationList||[]).filter((_,i)=>i!==ri))} onCellChange={setObs} addLabel="Add Observation" />

            <SectionTitle>4. Opportunities for Improvement (OFI)</SectionTitle>
            <DynamicTable
              columns={[{key:'sNo',label:'S.No.',minWidth:50},{key:'standard',label:'MS Standard',minWidth:120},{key:'clause',label:'Clause',minWidth:80},{key:'ofi',label:'Opportunity for Improvement',type:'textarea',fullRow:true}]}
              rows={data.ofiList||[]} onAdd={()=>set('ofiList',[...(data.ofiList||[]),{sNo:String((data.ofiList||[]).length+1),standard:'ISO 9001:2015',clause:'',ofi:''}])}
              onRemove={ri=>set('ofiList',(data.ofiList||[]).filter((_,i)=>i!==ri))} onCellChange={setOFI} addLabel="Add OFI" />

            <SectionTitle>Recommendation</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REC_OPTS.map(o => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${data.recommendation===o.value?'var(--primary)':'#e2e8f0'}`, background: data.recommendation===o.value?'#fff7ed':'white', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" value={o.value} checked={data.recommendation===o.value} onChange={()=>set('recommendation',o.value)} style={{marginTop:2}} />
                  {o.label}
                </label>
              ))}
            </div>

            <SectionTitle>5. Stage-1 Audit Checklist</SectionTitle>
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
                                    <td style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'pre-line', lineHeight: 1.55, minWidth: 220, verticalAlign: 'top' }}>{row.description}</td>
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
