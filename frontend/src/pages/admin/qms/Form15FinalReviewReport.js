import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, StandardChips } from './QMSFormPage';

/* Invisible helper: pulls the Type of Audit and reviewer name from F02 (Application
   Review) and the Mode of Audit from F01 (Application Form). Audit Type always mirrors
   F02; the reviewer name and mode fill in only when still blank here. */
function AuditTypeFetcher({ clientInfo, data, set }) {
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());

    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');

        // Reviewer name — team member with the "Application & Report Reviewer" role.
        const reviewer = (fd.auditTeam || []).find(a => a && a.role === 'Application & Report Reviewer' && a.name && String(a.name).trim());
        if (reviewer && blank(data.reviewerName)) set('reviewerName', String(reviewer.name).trim());

        // Online Meeting Link — fetched from F02 when blank here.
        if (fd.onlineMeetingLink && String(fd.onlineMeetingLink).trim() && blank(data.onlineMeetingLink)) set('onlineMeetingLink', String(fd.onlineMeetingLink).trim());
      })
      .catch(() => {});

    // Mode of Audit comes from the Application Form (F01) — field "modeOfWorking".
    axios.get(`/api/qms-forms/by-client/${cid}/1`)
      .then(({ data: f1 }) => {
        if (cancelled) return;
        const mode = f1?.formData?.modeOfWorking;
        if (mode && String(mode).trim() && blank(data.modeOfAudit)) set('modeOfAudit', String(mode).trim());
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line
  return null;
}

const INITIAL_CHECKS = [
  { key: 'stg2AuditorDiff',   label: 'Does stage 2 auditor different from stage 1? Yes / No' },
  { key: 'threeyearMechanism',label: 'Does the 3-year audit programme have a periodic verification mechanism?' },
  { key: 'stg2AuditorName',   label: 'Name of approved Auditor(s) for Stage 2 Audit?' },
  { key: 'stg2DeclarationSigned',label: 'Auditor(s) Declaration (AD-F-03) signed by auditor(s)?' },
  { key: 'stg2PlanSent',      label: 'Stage 2: Was Audit Plan & Schedule informed to client prior 7 days to audit?' },
  { key: 'stg2AuditDate',     label: 'Stage 2: What was the audit date?' },
  { key: 'totalObservations', label: 'Total number of observations found.' },
  { key: 'totalMinorNC',      label: 'Total number of Minor NC found.' },
  { key: 'totalMajorNC',      label: 'Total number of Major NC found.' },
  { key: 'leadAuditorRec',    label: 'What is the recommendation of Lead Auditor? (Certificate issue / Maintenance / Renewal / Suspend / Withdrawal / Reduce/Extend Scope /  Retain Certification)' },
];
const MULTISITE_CHECKS = [
  { key: 'hasMultiSite',      label: 'Does Client have multi-site location? Is calculation of man-days appropriate?' },
  { key: 'sampleSiteCalc',    label: 'Is calculation of sample site appropriate as per given multi-site location?' },
  { key: 'scopeChanges',      label: 'Does any changes with respect to process/manpower/activities or defined scope in multi-site?' },
  { key: 'siteNCRAction',     label: 'If NCR was raised about selected site, was equivalent corrective action taken in other sites?' },
];
const SURV1_CHECKS = [
  { key: 'siteChange',        label: 'Is any change at client site/address, scope or key management person?' },
  { key: 'auditorApproved',   label: 'What is Name of Auditor(s) approved for Audit?' },
  { key: 'decSigned',         label: 'Is Auditor(s) Declaration (AD-F-03) signed by auditor(s)?' },
  { key: 'auditPeriodic',     label: 'Was surveillance/renewal audit conducted periodically?' },
  { key: 'planSent',          label: 'Surveillance Audit Plan & Schedule was informed to client prior 7 days?' },
  { key: 'per3YearPlan',      label: 'Is surveillance audit plan prepared as per AUD-F-03A-Audit Planning for 3 years?' },
  { key: 'auditDate',         label: 'Date of audit conducted.' },
  { key: 'coreProcessesCovered',label: 'All the core processes were covered during the surveillance audit?' },
  { key: 'logoVerified',      label: 'Use of logo was verified and found in line with guidance.' },
  { key: 'observations',      label: 'Total number of observations.' },
  { key: 'minorNC',           label: 'Total number of Minor NC.' },
  { key: 'majorNC',           label: 'Total number of Major NC.' },
  { key: 'laRecommendation',  label: "What is Lead Auditor's recommendation? (Maintenance / Renewal / Suspend / Withdrawal / Reduce/Extend Scope / Retain Certification)" },
];

const RECERT_CHECKS = [
  { key: 'withinTimeline',    label: 'Is Recertification audit planned and conducted within timeline/prior to expiry?' },
  { key: 'siteChange',        label: 'Is any change at client site/address, scope or key management person?' },
  { key: 'auditorName',       label: 'What is Name of approved Auditor(s) for Stage 2 Audit?' },
  { key: 'decSigned',         label: 'Is Auditor(s) Declaration (AD-F-03) signed by auditor(s)?' },
  { key: 'recertPlan',        label: 'Is Recertification audit plan prepared as per AUD-F-03A?' },
  { key: 'planSent',          label: 'Was Recertification Audit Plan & Schedule informed to client prior 7 days?' },
  { key: 'auditDate',         label: 'Date of audit conducted.' },
  { key: 'coreProcessesCovered',label: 'Were All the core processes covered during the surveillance audit?' },
  { key: 'logoVerified',      label: 'Was Use of logo verified and found in line with guidance?' },
  { key: 'recertDate',        label: 'Recertification Audit date.' },
  { key: 'observations',      label: 'Total number of observations found.' },
  { key: 'minorNC',           label: 'Total number of Minor NC found.' },
  { key: 'majorNC',           label: 'Total number of Major NC found.' },
  { key: 'laRecommendation',  label: 'What is Lead Auditor recommendation? (Renewal / Suspend / Withdrawal / Reduce/Extend Scope / Retain Certification)' },
];

const buildChecks = (arr) => Object.fromEntries(arr.map(c => [c.key, '']));

const DEFAULT = {
  orgName: '', standard: '', auditType: 'INITIAL AUDIT', modeOfAudit: '', onlineMeetingLink: '',
  initialChecks:    buildChecks(INITIAL_CHECKS),
  multiSiteChecks:  buildChecks(MULTISITE_CHECKS),
  surv1Checks:      buildChecks(SURV1_CHECKS),
  recertChecks:     buildChecks(RECERT_CHECKS),
  reviewDecision: '',
  supplementEvidences: '',
  reviewerName: '', reviewDate: '',
  hodDecision: '', hodReviewDate: '',
};

const YNToggle = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#1e40af', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{label}</span>
    <div style={{ display: 'flex', gap: 16 }}>
      {['YES', 'NO'].map(v => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: value === v ? 700 : 500, color: 'white', fontSize: 12.5 }}>
          <input type="radio" name={`f15_${label}`} value={v} checked={value === v} onChange={() => onChange(v)} style={{ accentColor: 'white' }} />
          {v}
        </label>
      ))}
    </div>
  </div>
);

const ChecksTable = ({ checks, values, setVal }) => (
  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', minWidth: 340 }}>Item</th>
          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1.5px solid #e2e8f0', minWidth: 200 }}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c, i) => (
          <tr key={c.key} style={{ borderBottom: '1px solid #f1f5f9', background: i%2===0?'white':'#fafafa' }}>
            <td style={{ padding: '8px 12px', fontSize: 13, color: '#374151' }}>{c.label}</td>
            <td style={{ padding: '6px 8px' }}>
              <input type="text" value={values?.[c.key] ?? ''} onChange={e => setVal(c.key, e.target.value)} placeholder="Remarks"
                style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function Form15FinalReviewReport() {
  return (
    <QMSFormPage
      formType={15}
      formCode="AUD-F-22"
      formTitle="AUD-F-22-REVIEW REPORT (B)"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => {
        const setCheck = (section, key, val) => set(section, { ...(data[section] || {}), [key]: val });
        return (
          <div>
            <AuditTypeFetcher clientInfo={clientInfo} data={data} set={set} />
            <SectionTitle>Organization Details</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Organization Name">
                <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" />
              </FormField>
              <FormField label="Standard">
                <StandardChips value={data.standard} />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Audit Type">
                <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
              </FormField>
              <FormField label="Mode of Audit">
                <FInput value={data.modeOfAudit} disabled placeholder="Auto-filled from Application Form" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Online Meeting Link (if applicable)">
                <FInput value={data.onlineMeetingLink} onChange={v => set('onlineMeetingLink', v)} placeholder="https://..." />
              </FormField>
            </FormRow>

            <SectionTitle>Initial Audit — Stage 2 Review</SectionTitle>
            <ChecksTable checks={INITIAL_CHECKS} values={data.initialChecks} setVal={(k,v) => setCheck('initialChecks', k, v)} />

            <SectionTitle>Multi-site Certification</SectionTitle>
            <YNToggle label="Is Multi-site Certification applicable?" value={data.multiSiteApplicable} onChange={v => set('multiSiteApplicable', v)} />
            {data.multiSiteApplicable === 'YES' && (
              <ChecksTable checks={MULTISITE_CHECKS} values={data.multiSiteChecks} setVal={(k,v) => setCheck('multiSiteChecks', k, v)} />
            )}

            <SectionTitle> Surveillance Audit</SectionTitle>
            <YNToggle label="Is Surveillance Audit applicable?" value={data.surv1Applicable} onChange={v => set('surv1Applicable', v)} />
            {data.surv1Applicable === 'YES' && (
              <ChecksTable checks={SURV1_CHECKS} values={data.surv1Checks} setVal={(k,v) => setCheck('surv1Checks', k, v)} />
            )}

            <SectionTitle>Recertification Audit</SectionTitle>
            <YNToggle label="Is Recertification Audit applicable?" value={data.recertApplicable} onChange={v => set('recertApplicable', v)} />
            {data.recertApplicable === 'YES' && (
              <ChecksTable checks={RECERT_CHECKS} values={data.recertChecks} setVal={(k,v) => setCheck('recertChecks', k, v)} />
            )}

            <SectionTitle>Review Decision</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { value: 'appropriate', label: 'Appropriate — Sufficient Objective Evidence present. Recommended: Issuance of Certification will be granted.' },
                { value: 'supplement',  label: 'Supplement Required — Insufficient Objective Evidence. Additional evidence required.' },
              ].map(o => (
                <label key={o.value} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:8,border:`1.5px solid ${data.reviewDecision===o.value?'var(--primary)':'#e2e8f0'}`,background:data.reviewDecision===o.value?'#fff7ed':'white',cursor:'pointer',fontSize:13 }}>
                  <input type="radio" value={o.value} checked={data.reviewDecision===o.value} onChange={()=>set('reviewDecision',o.value)} style={{marginTop:2}} />
                  {o.label}
                </label>
              ))}
            </div>
            {data.reviewDecision === 'supplement' && (
              <FormRow cols={1}>
                <FormField label="Required Supplement Objective Evidences">
                  <FTextarea value={data.supplementEvidences} onChange={v => set('supplementEvidences', v)} rows={4} />
                </FormField>
              </FormRow>
            )}

            <SectionTitle>Reviewer Details</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Reviewer Name"><FInput value={data.reviewerName} onChange={v => set('reviewerName', v)} placeholder="Reviewer name" /></FormField>
              <FormField label="Review Date"><FInput value={data.reviewDate} onChange={v => set('reviewDate', v)} type="date" /></FormField>
            </FormRow>

            <SectionTitle>HOD Final Decision</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { value: 'certificate_issue',     label: 'Certificate Issue' },
                { value: 'maintenance',           label: 'Maintenance / Surveillance Audit Successful' },
                { value: 'renewal',               label: 'Renewal' },
                { value: 'reduce',                label: 'Reduce Scope' },
                { value: 'extend',                label: 'Extend Scope' },
                { value: 'retain certification',  label: 'Retain Certification' },
              ].map(o => (
                <label key={o.value} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderRadius:8,border:`1.5px solid ${data.hodDecision===o.value?'var(--primary)':'#e2e8f0'}`,background:data.hodDecision===o.value?'#fff7ed':'white',cursor:'pointer',fontSize:13 }}>
                  <input type="radio" value={o.value} checked={data.hodDecision===o.value} onChange={()=>set('hodDecision',o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
            <FormRow cols={1}>
              <FormField label="HOD Review Date">
                <FInput value={data.hodReviewDate} onChange={v => set('hodReviewDate', v)} type="date" />
              </FormField>
            </FormRow>
          </div>
        );
      }}
    </QMSFormPage>
  );
}


