import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, StandardChips } from './QMSFormPage';

/* Pulls the Lead Auditor / Auditor names, Stage-1 & Stage-2 man-days, and the
   IAF Code from the Application Review (F02) — filling them here only when
   still blank, so manual edits are preserved. */
function AuditorFetcher({ clientInfo, data, set, setManDays }) {
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const team = fd.auditTeam || [];
        const lead = team.find(a => a && a.role === 'Lead Auditor' && a.name && String(a.name).trim());
        const aud  = team.find(a => a && a.role === 'Auditor' && a.name && String(a.name).trim());
        if (lead && blank(data.leadAuditor)) set('leadAuditor', String(lead.name).trim());
        if (aud && blank(data.auditor)) set('auditor', String(aud.name).trim());
        if (fd.iafCode && blank(data.iafCode)) set('iafCode', String(fd.iafCode).trim());
        if (blank(data.initialManDaysSt1) && blank(data.initialManDaysSt2) && (fd.totalMandaysS1 || fd.totalMandaysS2)) {
          setManDays(String(fd.totalMandaysS1 || ''), String(fd.totalMandaysS2 || ''));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line
  return null;
}

/* Pulls the contact person's Designation from the Application Form (F01) —
   filling it here only when still blank. */
function DesignationFetcher({ clientInfo, data, set }) {
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());
    axios.get(`/api/qms-forms/by-client/${cid}/1`)
      .then(({ data: f1 }) => {
        if (cancelled) return;
        const designation = f1?.formData?.designation;
        if (designation && String(designation).trim() && blank(data.designation)) set('designation', String(designation).trim());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line
  return null;
}

const AUDIT_TYPES = ['Surveillance I', 'Surveillance II', 'Re-certification'];
const YN = ['No', 'Yes'];

/* Each "change since last audit" question is a Yes/No with a details box that
   only appears when "Yes" is selected. */
const CHANGE_QUESTIONS = [
  { key: 'changeOrgName',   label: 'Change in Organization name?' },
  { key: 'changeScope',     label: 'Change in Scope?' },
  { key: 'changeAddress',   label: 'Change in Address / Locations?' },
  { key: 'changeKeyPerson', label: 'Change in Key Personnel?' },
  { key: 'changeProducts',  label: 'Change in Products / Services?' },
  { key: 'majorIncidents',  label: 'Any Major Incidents / Legal Issues?' },
];

const DEFAULT = {
  idNo: '', orgName: '', address: '', contactNumbers: '', contactPerson: '',
  designation: '', emailId: '',
  scopeOfCertification: '', standard: '',
  auditType: 'Surveillance I', preferredLanguage: 'English / Hindi',
  // change questions — stored as { value: 'Yes'|'No', details: '' }
  changes: Object.fromEntries(CHANGE_QUESTIONS.map(q => [q.key, { value: 'No', details: '' }])),
  newEmployeesHiredYN: 'No', newEmployeesHired: '', additionalShifts: 'No', newSitesToAudit: 'N/A',
  // QCC official use — application review
  initialManDaysSt1: '', initialManDaysSt2: '',
  surveillanceManDay: '', auditPlanDate: '', auditDateFrom: '', auditDateTo: '',
  iafCode: '', leadAuditor: '', auditor: '',
  applicationReviewDate: '', applicationReviewedBy: '',
};

export default function Form16SurveillanceApplication() {
  return (
    <QMSFormPage
      formType={16}
      formCode="AUD-F-02-A"
      formTitle="Application Form — Surveillance / Re-certification"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => {
        const changes = data.changes || {};
        const setChange = (key, patch) => set('changes', { ...changes, [key]: { ...(changes[key] || {}), ...patch } });

        // Surveillance Audit Man-day(s) = one-third of total Initial Audit man-days
        // (ST-1 + ST-2), rounded to the nearest half day (e.g. 1.00–1.25 → 1,
        // 1.25–1.50 → 1.5, 1.75–2.00 → 2), and shown with a "day(s)" unit.
        const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
        const fmt = n => (Number.isInteger(n) ? String(n) : Number(n.toFixed(2)).toString());
        const roundToHalfDay = n => Math.round(n * 2) / 2;
        const survManDayValue = (() => {
          const total = num(data.initialManDaysSt1) + num(data.initialManDaysSt2);
          return total ? fmt(roundToHalfDay(total / 3)) : '';
        })();
        const survManDay = survManDayValue ? `${survManDayValue} day${survManDayValue === '1' ? '' : 's'}` : '';
        // Keep the calculated value persisted whenever ST-1 / ST-2 changes.
        const setManDay = (key, v) => {
          const st1 = key === 'initialManDaysSt1' ? v : data.initialManDaysSt1;
          const st2 = key === 'initialManDaysSt2' ? v : data.initialManDaysSt2;
          const total = num(st1) + num(st2);
          set(key, v);
          set('surveillanceManDay', total ? fmt(roundToHalfDay(total / 3)) : '');
        };
        const setManDays = (st1, st2) => {
          const total = num(st1) + num(st2);
          set('initialManDaysSt1', st1);
          set('initialManDaysSt2', st2);
          set('surveillanceManDay', total ? fmt(roundToHalfDay(total / 3)) : '');
        };
        return (
          <div>
            <AuditorFetcher clientInfo={clientInfo} data={data} set={set} setManDays={setManDays} />
            <DesignationFetcher clientInfo={clientInfo} data={data} set={set} />
            <SectionTitle>Organization Details</SectionTitle>
            <FormRow cols={2}>
              <FormField label="ID No."><FInput value={data.idNo} onChange={v => set('idNo', v)} placeholder="Client / Certificate ID" /></FormField>
              <FormField label="Name of Organization"><FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" /></FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Address"><FTextarea value={data.address} onChange={v => set('address', v)} rows={2} placeholder="Address" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Contact Number"><FInput value={data.contactNumbers} onChange={v => set('contactNumbers', v)} placeholder="Phone" /></FormField>
              <FormField label="Contact Person"><FInput value={data.contactPerson} onChange={v => set('contactPerson', v)} placeholder="Contact person" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Designation"><FInput value={data.designation} onChange={v => set('designation', v)} placeholder="e.g. Quality Manager" /></FormField>
              <FormField label="Email Id"><FInput value={data.emailId} onChange={v => set('emailId', v)} type="email" placeholder="info@company.com" /></FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Scope of Certification"><FTextarea value={data.scopeOfCertification} onChange={v => set('scopeOfCertification', v)} rows={3} placeholder="Scope" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Standard(s)"><StandardChips value={data.standard} /></FormField>
              <FormField label="Audit Type">
                <FSelect value={data.auditType} onChange={v => set('auditType', v)} placeholder="Select audit type" options={AUDIT_TYPES} />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Preferred Language"><FInput value={data.preferredLanguage} onChange={v => set('preferredLanguage', v)} placeholder="English / Hindi" /></FormField>
            </FormRow>

            <SectionTitle>Changes Since Last Audit</SectionTitle>
            {CHANGE_QUESTIONS.map(q => {
              const c = changes[q.key] || { value: 'No', details: '' };
              return (
                <div key={q.key} style={{ marginBottom: 12 }}>
                  <FormRow cols={2}>
                    <FormField label={q.label}>
                      <FSelect value={c.value} onChange={v => setChange(q.key, { value: v })} options={YN} />
                    </FormField>
                  </FormRow>
                  {c.value === 'Yes' && (
                    <FormRow cols={1}>
                      <FormField label="Details">
                        <FInput value={c.details} onChange={v => setChange(q.key, { details: v })} placeholder="Provide details" />
                      </FormField>
                    </FormRow>
                  )}
                </div>
              );
            })}
            <FormRow cols={2}>
              <FormField label="Any New Employees Hired?">
                <FSelect value={data.newEmployeesHiredYN} onChange={v => set('newEmployeesHiredYN', v)} options={YN} />
              </FormField>
            </FormRow>
            {data.newEmployeesHiredYN === 'Yes' && (
              <FormRow cols={1}>
                <FormField label="List of New Employees Hired"><FTextarea value={data.newEmployeesHired} onChange={v => set('newEmployeesHired', v)} rows={2} placeholder="Names / count of new employees" /></FormField>
              </FormRow>
            )}
            <FormRow cols={2}>
              <FormField label="Additional Working Shifts"><FInput value={data.additionalShifts} onChange={v => set('additionalShifts', v)} placeholder="No / details" /></FormField>
              <FormField label="New Sites to be Audited"><FInput value={data.newSitesToAudit} onChange={v => set('newSitesToAudit', v)} placeholder="N/A" /></FormField>
            </FormRow>

            <SectionTitle>QCC Official Use Only — Application Review</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Initial Audit Man-days — Stage 1 (ST-1)"><FInput value={data.initialManDaysSt1} onChange={v => setManDay('initialManDaysSt1', v)} placeholder="e.g. 0.5" /></FormField>
              <FormField label="Initial Audit Man-days — Stage 2 (ST-2)"><FInput value={data.initialManDaysSt2} onChange={v => setManDay('initialManDaysSt2', v)} placeholder="e.g. 1.5" /></FormField>
            </FormRow>
            <FormRow cols={3}>
              <FormField label="Surveillance Audit Man-day(s) — ⅓ of total"><FInput value={survManDay} disabled placeholder="Auto = (ST-1 + ST-2) / 3" /></FormField>
              <FormField label="Audit Plan Date"><FInput value={data.auditPlanDate} onChange={v => set('auditPlanDate', v)} type="date" /></FormField>
              <FormField label="Applicable IAF Code"><FInput value={data.iafCode} onChange={v => set('iafCode', v)} placeholder="IAF Code" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Surveillance Audit Date (From)"><FInput value={data.auditDateFrom} onChange={v => set('auditDateFrom', v)} type="date" /></FormField>
              <FormField label="Audit Date (To)"><FInput value={data.auditDateTo} onChange={v => set('auditDateTo', v)} type="date" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Lead Auditor"><FInput value={data.leadAuditor} onChange={v => set('leadAuditor', v)} placeholder="Lead auditor name" /></FormField>
              <FormField label="Auditor"><FInput value={data.auditor} onChange={v => set('auditor', v)} placeholder="Auditor name / N/A" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Application Review Date"><FInput value={data.applicationReviewDate} onChange={v => set('applicationReviewDate', v)} type="date" /></FormField>
              <FormField label="Application Reviewed By"><FInput value={data.applicationReviewedBy} onChange={v => set('applicationReviewedBy', v)} placeholder="Reviewer name" /></FormField>
            </FormRow>
          </div>
        );
      }}
    </QMSFormPage>
  );
}
