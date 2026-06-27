import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, StandardChips } from './QMSFormPage';


/* Map the Application Form (F01) "Application Type" to this form's Audit Type. */
const APP_TYPE_TO_AUDIT = {
  'Initial':          'Initial Audit',
  'Surveillance':     '1st Surveillance',
  'Re-certification': 'Re-certification',
  'Special Audit':    'Special Audit',
};

/* Invisible helper: pulls the Type of Audit and online meeting link from F02
   (Application Review) and fills them here when blank. The audit type is mapped to
   this form's radio labels. Mode of Audit arrives via the shared client pre-fill. */
function AuditTypeFetcher({ clientInfo, data, set }) {
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const mapped = APP_TYPE_TO_AUDIT[fd.auditType];
        if (mapped) set('auditType', mapped);
        if (fd.onlineMeetingLink && !(data.onlineMeetingLink && String(data.onlineMeetingLink).trim())) set('onlineMeetingLink', fd.onlineMeetingLink);

        // Auditor(s) approved for Stage 1 — names of team members assigned Stage-1 man-days
        const blank = v => !(v && String(v).trim());
        const stage1Auditors = (fd.auditTeam || [])
          .filter(a => a && a.name && String(a.name).trim() && a.stage1Days && String(a.stage1Days).trim() && String(a.stage1Days).trim() !== '0')
          .map(a => String(a.name).trim());
        if (stage1Auditors.length && blank(data.auditorNames)) set('auditorNames', stage1Auditors.join(', '));

        // Stage-1 audit dates
        if (fd.stage1DateFrom && blank(data.auditDateFrom)) set('auditDateFrom', fd.stage1DateFrom);
        if (fd.stage1DateTo && blank(data.auditDateTo)) set('auditDateTo', fd.stage1DateTo);

        // Reviewer name — team member with the "Application & Report Reviewer" role
        const reviewer = (fd.auditTeam || []).find(a => a && a.role === 'Application & Report Reviewer' && a.name && String(a.name).trim());
        if (reviewer) {
          const rn = String(reviewer.name).trim();
          if (blank(data.reviewerStatement)) set('reviewerStatement', rn);
          if (blank(data.reviewerName)) set('reviewerName', rn);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line
  return null;
}

/* ── Yes / No / NA options ── */
const YNA = ['Yes', 'No', 'N/A'];

/* ── Lead auditor recommendation options ── */
const LA_RECOMMENDATIONS = [
  'Proceed to Stage 2',
  'Renewal',
  'Suspend',
  'Withdrawal',
  'Reduce Scope',
  'Extend Scope',
  'Retain Certification',
];

const DEFAULT = {
  /* Organization */
  orgName: '', standard: '', auditType: '', modeOfAudit: '', onlineMeetingLink: '',
  /* Checklist fields */
  teamCompetent: '', reviewerCompetent: '', mandayCorrect: '', agreementSigned: '',
  auditorNames: '',
  declarationSigned: '',
  planInformedPrior: '',
  auditDateFrom: '', auditDateTo: '',
  scopeFinalized: '',
  differenceFound: '',
  totalObservations: '', totalMinorNC: '', totalMajorNC: '',
  laRecommendation: '',
  /* Review decision */
  reviewerStatement: '',
  reviewDecision: '',
  supplementEvidences: '',
  readyForStage2: '',
  /* Reviewer */
  reviewerName: '', reviewDate: '',
  reviewer2Name: '', reviewer2Date: '',
};

/* ── Inline radio group for Yes / No / NA ── */
function YNARow({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {YNA.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12.5,
          fontWeight: value === opt ? 700 : 500,
          color: value === opt ? (opt === 'Yes' ? '#16a34a' : opt === 'No' ? '#dc2626' : '#6b7280') : '#6b7280' }}>
          <input type="radio" value={opt} checked={value === opt} onChange={() => onChange(opt)}
            style={{ accentColor: opt === 'Yes' ? '#16a34a' : opt === 'No' ? '#dc2626' : '#6b7280' }} />
          {opt}
        </label>
      ))}
    </div>
  );
}

/* ── Checklist row ── */
function CheckRow({ index, label, children, subheader }) {
  if (subheader) {
    return (
      <tr>
        <td colSpan={2} style={{ padding: '8px 14px', background: 'var(--primary-50)',
          fontWeight: 700, fontSize: 11.5, color: 'var(--primary-dark)',
          textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--primary-100)' }}>
          {label}
        </td>
      </tr>
    );
  }
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafafa' }}>
      <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#374151', verticalAlign: 'middle' }}>
        {label}
      </td>
      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
        {children}
      </td>
    </tr>
  );
}

export default function Form08Stage1ReviewReport() {
  return (
    <QMSFormPage
      formType={8}
      formCode="AUD-F-22"
      formTitle="Review Report — Stage 1 (After Audit Report)"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => (
        <div>
          <AuditTypeFetcher clientInfo={clientInfo} data={data} set={set} />

          {/* ── 1. Organization Details ── */}
          <SectionTitle>Organization Details</SectionTitle>

          {/* Audit Type — read-only, fetched from Application Review (F02) */}
          <FormRow cols={1}>
            <FormField label="Audit Type" required>
              <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
            </FormField>
          </FormRow>

          <FormRow cols={2}>
            <FormField label="Organization Name" required>
              <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" />
            </FormField>
            <FormField label="Standard(s)">
              <StandardChips value={data.standard} />
            </FormField>
          </FormRow>
          <FormRow cols={2}>
            <FormField label="Mode of Audit">
              <FInput value={data.modeOfAudit} disabled placeholder="Auto-filled from Application Form" />
            </FormField>
            <FormField label="Online Meeting Link (if applicable)">
              <FInput value={data.onlineMeetingLink} onChange={v => set('onlineMeetingLink', v)} placeholder="https://..." />
            </FormField>
          </FormRow>

          {/* ── 2. Review Checklist ── */}
          <SectionTitle>Review Checklist — Application Review &amp; Stage 1 Audit</SectionTitle>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--primary)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: 'white', width: '55%' }}>Review Details</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: 'white' }}>Remarks / Response</th>
                </tr>
              </thead>
              <tbody>

                {/* Subheader */}
                <CheckRow subheader label="Initial Audit — Application Review & Stage 1 Audit" />

                <CheckRow index={0} label="Is audit team competent (IAF code) to conduct audit?">
                  <YNARow value={data.teamCompetent} onChange={v => set('teamCompetent', v)} />
                </CheckRow>

                <CheckRow index={1} label="Is application & audit reviewer competent (IAF code)?">
                  <YNARow value={data.reviewerCompetent} onChange={v => set('reviewerCompetent', v)} />
                </CheckRow>

                <CheckRow index={2} label="Is correct calculation of Man-day(s) as per application filled?">
                  <YNARow value={data.mandayCorrect} onChange={v => set('mandayCorrect', v)} />
                </CheckRow>

                <CheckRow index={3} label="Does Agreement signed by the client?">
                  <YNARow value={data.agreementSigned} onChange={v => set('agreementSigned', v)} />
                </CheckRow>

                <CheckRow index={4} label="What is the name of Auditor(s) approved for Stage 1 Audit?">
                  <input value={data.auditorNames || ''} onChange={e => set('auditorNames', e.target.value)}
                    placeholder="Auditor name(s)"
                    style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12.5, outline: 'none' }} />
                </CheckRow>

                <CheckRow index={5} label="Is Declaration (AD-F-03) signed by the auditor(s)?">
                  <YNARow value={data.declarationSigned} onChange={v => set('declarationSigned', v)} />
                </CheckRow>

                <CheckRow index={6} label="Stage 1: Was Audit Plan & Schedule informed to client prior 7 days to audit?">
                  <YNARow value={data.planInformedPrior} onChange={v => set('planInformedPrior', v)} />
                </CheckRow>

                <CheckRow index={7} label="Stage 1: What was the Audit date?">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>From</span>
                      <input type="date" value={data.auditDateFrom || ''} onChange={e => set('auditDateFrom', e.target.value)}
                        style={{ padding: '5px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>To</span>
                      <input type="date" value={data.auditDateTo || ''} onChange={e => set('auditDateTo', e.target.value)}
                        style={{ padding: '5px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none' }} />
                    </div>
                  </div>
                </CheckRow>

                <CheckRow index={8} label="Does Scope finalize as per client products / Service?">
                  <YNARow value={data.scopeFinalized} onChange={v => set('scopeFinalized', v)} />
                </CheckRow>

                <CheckRow index={9} label="What is the difference found between the given details (filled application) and Stage 1 report?">
                  <textarea value={data.differenceFound || ''} onChange={e => set('differenceFound', e.target.value)}
                    rows={2} placeholder="Describe differences, if any…"
                    style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7,
                      fontSize: 12.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </CheckRow>

                <CheckRow index={10} label="Total No. of Observations found.">
                  <input type="number" min="0" value={data.totalObservations || ''} onChange={e => set('totalObservations', e.target.value)}
                    placeholder="0"
                    style={{ width: 90, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12.5, outline: 'none' }} />
                </CheckRow>

                <CheckRow index={11} label="Total No. of Minor NC found.">
                  <input type="number" min="0" value={data.totalMinorNC || ''} onChange={e => set('totalMinorNC', e.target.value)}
                    placeholder="0"
                    style={{ width: 90, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12.5, outline: 'none' }} />
                </CheckRow>

                <CheckRow index={12} label="Total No. of Major NC found.">
                  <input type="number" min="0" value={data.totalMajorNC || ''} onChange={e => set('totalMajorNC', e.target.value)}
                    placeholder="0"
                    style={{ width: 90, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12.5, outline: 'none' }} />
                </CheckRow>

                <CheckRow index={13} label="What is Lead Auditor recommendation for client organization?">
                  <FSelect value={data.laRecommendation} onChange={v => set('laRecommendation', v)}
                    placeholder="Select recommendation" options={LA_RECOMMENDATIONS} />
                </CheckRow>

              </tbody>
            </table>
          </div>

          {/* ── 3. Verified By ── */}
          <SectionTitle>Verified By</SectionTitle>

          {/* "I, [name] verified..." statement */}
          <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10,
            padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: '#0369a1', marginBottom: 10, lineHeight: 1.7 }}>
              I, &nbsp;
              <input value={data.reviewerStatement || ''} onChange={e => set('reviewerStatement', e.target.value)}
                placeholder="Reviewer name"
                style={{ display: 'inline-block', minWidth: 160, padding: '3px 8px',
                  border: '1.5px solid #7dd3fc', borderRadius: 6, fontSize: 12.5, outline: 'none', background: 'white' }} />
              &nbsp; verified and found that the Audit Report is:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  value: 'appropriate',
                  label: 'Appropriate',
                  desc: 'Sufficient Objective Evidence is present in the Audit Report. Recommended that Issuance of Certification will be granted.',
                  color: '#16a34a',
                  bg: '#f0fdf4',
                  border: '#bbf7d0',
                },
                {
                  value: 'supplement',
                  label: 'Supplement Required',
                  desc: 'Insufficient Objective Evidence present in the Audit Report. Sufficient Objective Evidence required (details below).',
                  color: '#dc2626',
                  bg: '#fef2f2',
                  border: '#fecaca',
                },
              ].map(o => (
                <label key={o.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 16px', borderRadius: 8,
                  border: `1.5px solid ${data.reviewDecision === o.value ? o.border : '#e2e8f0'}`,
                  background: data.reviewDecision === o.value ? o.bg : 'white',
                  cursor: 'pointer',
                }}>
                  <input type="radio" value={o.value} checked={data.reviewDecision === o.value}
                    onChange={() => set('reviewDecision', o.value)}
                    style={{ marginTop: 3, accentColor: o.color }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: o.color }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>{o.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {data.reviewDecision === 'supplement' && (
            <FormRow cols={1}>
              <FormField label="Required Supplement Objective Evidences (describe below)">
                <FTextarea value={data.supplementEvidences} onChange={v => set('supplementEvidences', v)}
                  rows={4} placeholder="List required objective evidences…" />
              </FormField>
            </FormRow>
          )}

          {/* Ready for Stage 2 — Yes / No */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Ready for Stage 2?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['Yes', 'No'].map(d => {
                const active = data.readyForStage2 === d;
                const accent = d === 'Yes' ? '#16a34a' : '#dc2626';
                return (
                  <label key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 22px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${active ? accent : '#e2e8f0'}`,
                    background: active ? (d === 'Yes' ? '#f0fdf4' : '#fef2f2') : 'white',
                    fontSize: 12.5, fontWeight: active ? 700 : 500,
                    color: active ? accent : '#374151',
                    transition: 'all .14s',
                  }}>
                    <input type="radio" name="readyForStage2" value={d}
                      checked={active}
                      onChange={() => set('readyForStage2', d)}
                      style={{ accentColor: accent, width: 14, height: 14 }} />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── 4. Reviewer Details ── */}
          <SectionTitle>Reviewer Details</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Reviewer Name">
              <FInput value={data.reviewerName} onChange={v => set('reviewerName', v)} placeholder="Reviewer name" />
            </FormField>
            <FormField label="Review Date">
              <FInput value={data.reviewDate} onChange={v => set('reviewDate', v)} type="date" />
            </FormField>
          </FormRow>

        </div>
      )}
    </QMSFormPage>
  );
}
