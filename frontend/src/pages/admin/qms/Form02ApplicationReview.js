import React from 'react';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, FRadioGroup, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

const YN = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
const RISK = ['High (H)', 'Medium (M)', 'Low (L)'];
const ROLES = ['Lead Auditor', 'Auditor', 'Technical Expert', 'Application & Report Reviewer', 'HOD', 'Guide', 'Observer'];
const BIZ_COMPLEXITY = [
  'High Business Complexity (7–9)',
  'Medium Business Complexity (5–6)',
  'Low Business Complexity (3–4)',
];
const IT_COMPLEXITY = [
  'High IT Complexity (7–9)',
  'Medium IT Complexity (5–6)',
  'Low IT Complexity (3–4)',
];

const EMPTY_AUDITOR = { name: '', role: '', stage1Days: '', stage2Days: '' };

const DEFAULT = {
  // Organization
  idNo: '', orgName: '', address: '', contactPerson: '', contactNumbers: '',
  noOfPersons: '', auditType: '',
  auditStandards: '', modeOfAudit: '', onlineMeetingLink: '',
  scopeOfCertification: '', auditLanguage: 'English', iafCode: '',
  // Transfer
  transferApplicable: '', transferNCClosed: '', transferReason: '', transferFromIAFCB: '', certValidityDate: '',
  // Risk & Team
  risk: '',
  auditTeam: [{ ...EMPTY_AUDITOR }, { ...EMPTY_AUDITOR }],
  hodName: '', hodDecision: '',
  // Audit man-days
  totalMandays: '', totalMandaysS1: '', totalMandaysS2: '', totalMandaysIAF: '',
  adjustedMandays: '', mandaysJustification: '',
  // Audit dates
  stage1DateFrom: '', stage1DateTo: '', stage2DateFrom: '', stage2DateTo: '',
  // Reviewer declaration
  reviewerDeclaration: '',
  reviewerName: '', verificationName: '', reviewDate: '',
  verificationDate: '',
  // ISO 22000 FSMS Manday Calculation (Ds = TD + TH + TFTE)
  fsmsCategory: '', fsmsTD: '', fsmsTH: '', fsmsTFTE: '', fsmsDs: '',
  // ISO 27001 ISMS Audit Time Calculation
  ismsPersonsControl: '', ismsBaseAuditTime: '', ismsBusinessComplexity: '', ismsITComplexity: '',
  ismsComplexityAdj: '', ismsAdditiveAdj: '', ismsAdditionalTime: '',
  ismsTotalFinalTime: '', ismsStage1Time: '', ismsStage2Time: '',
  // IMS Man-Day Calculation (Annex I)
  imsEmployees: '', imsStandards: '',
  stdMandays9001: '', stdMandays14001: '', stdMandays45001: '', stdMandays27001: '',
  stdMandays22000: '', stdMandays22301: '', stdMandays27701: '', stdMandays42001: '',
  stdMandays37001: '', stdMandays21001: '', stdMandays50001: '',
  totalMandaysBeforeIntegration: '',
  // ISMS Reduction
  imsBusinessComplexity: '', imsITComplexity: '', imsImpactFactor: '', ismsReductionDays: '',
  // Integration calculation
  levelOfIntegration: '', combinedAuditAbility: '',
  x1Value: '', x2Value: '', x3Value: '', yValue: '', zValue: '',
  integratedReductionAllowed: '', mandayReduction: '', finalIntegratedMandays: '',
  // On-site / Off-site
  onsiteAuditTime: '', offsiteTime: '',
  // Stage-wise distribution
  stageWiseStage1: '', stageWiseStage2: '',
  totalOnsiteTime: '', offsiteReporting: '', totalIntegratedAuditTime: '',
};

/* ── Inline table for read-only reference data ── */
function RefTable({ title, headers, rows }) {
  const tdStyle = { padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: 12, color: '#374151' };
  const thStyle = { padding: '6px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 11.5, fontWeight: 700, color: '#1e40af', textAlign: 'left' };
  return (
    <div style={{ marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>{title}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead><tr>{headers.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'white' : '#f8fafc' }}>
              {r.map((c, ci) => <td key={ci} style={tdStyle}>{c}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Calculation row ── */
function CalcRow({ label, value, onChange, placeholder, note, type = 'text', unit }) {
  return (
    <div className="calc-row">
      <div className="calc-row-label">
        {label}
        {note && <small>{note}</small>}
      </div>
      <div className="calc-row-field">
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '—'}
          className="calc-row-input"
        />
        {unit && <span className="calc-row-unit">{unit}</span>}
      </div>
    </div>
  );
}

export default function Form02ApplicationReview() {
  return (
    <QMSFormPage
      formType={2}
      formCode="AUD-F-03"
      formTitle="F03 App Rev & F03-01 Aud Pln"
      defaultData={DEFAULT}
    >
      {({ data, set }) => {
        // Save the team rows and auto-recalculate the man-days totals from them.
        const num = v => parseFloat(v) || 0;
        const commitTeam = (t) => {
          const s1 = t.reduce((a, r) => a + num(r.stage1Days), 0);
          const s2 = t.reduce((a, r) => a + num(r.stage2Days), 0);
          set('auditTeam', t);
          set('totalMandaysS1', s1);
          set('totalMandaysS2', s2);
        };
        const setTeam = (ri, key, val) => {
          const t = [...(data.auditTeam || [])];
          t[ri] = { ...t[ri], [key]: val };
          commitTeam(t);
        };

        // IMS (Integrated Management System) only applies when 2+ standards are
        // selected in the application. Only then do its Annex I details auto-fetch.
        const stdCount = String(data.auditStandards || '')
          .split(',').map(s => s.trim()).filter(Boolean).length;
        const isIMS = stdCount >= 2;

        return (
          <div>
            {/* ── 1. Organization Information ── */}
            <SectionTitle>Organization Information</SectionTitle>
            <FormRow cols={2}>
              <FormField label="ID No." required>
                <FInput value={data.idNo} onChange={v => set('idNo', v)} placeholder="Client / Application ID" />
              </FormField>
              <FormField label="Organization Name" required>
                <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Address">
                <FTextarea value={data.address} onChange={v => set('address', v)} rows={2} placeholder="Full address" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Contact Person">
                <FInput value={data.contactPerson} onChange={v => set('contactPerson', v)} placeholder="Contact person name" />
              </FormField>
              <FormField label="Contact Numbers">
                <FInput value={data.contactNumbers} onChange={v => set('contactNumbers', v)} placeholder="+91 XXXXX XXXXX" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="No. of Persons under Certification">
                <FInput value={data.noOfPersons} onChange={v => set('noOfPersons', v)} type="number" placeholder="0" />
              </FormField>
              <FormField label="Type of Audit">
                <FSelect value={data.auditType} onChange={v => set('auditType', v)} placeholder="Select type"
                  options={['Initial', 'Surveillance', 'Re-certification', 'Un-Announced', 'Follow-up', 'Special Audit']} />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Audit Standard(s)">
                <StandardChips value={data.auditStandards} />
              </FormField>
              <FormField label="IAF Code">
                <FInput value={data.iafCode} onChange={v => set('iafCode', v)} placeholder="IAF / EA Code" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Mode of Audit">
                <FInput value={data.modeOfAudit} disabled placeholder="Auto-filled from Application Form" />
              </FormField>
              <FormField label="Online Meeting Link (if applicable)">
                <FInput value={data.onlineMeetingLink} onChange={v => set('onlineMeetingLink', v)} placeholder="Meeting link" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Scope of Certification">
                <FTextarea value={data.scopeOfCertification} onChange={v => set('scopeOfCertification', v)} rows={2} placeholder="Scope of certification" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Audit Language">
                <FInput value={data.auditLanguage} onChange={v => set('auditLanguage', v)} placeholder="English" />
              </FormField>
              <FormField label="Risk Level">
                <FSelect value={data.risk} onChange={v => set('risk', v)} placeholder="Select risk" options={RISK} />
              </FormField>
            </FormRow>

            {/* ── 2. Transfer Details ── */}
            <div className="qms-section-title-wrap">
              <div className="qms-section-title" style={{ justifyContent: 'space-between' }}>
                <span>Transfer Details (if applicable)</span>
                <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 600 }}>
                  <FRadioGroup value={data.transferApplicable} onChange={v => set('transferApplicable', v)} options={YN} />
                </span>
              </div>
            </div>
            {data.transferApplicable === 'Yes' && (
              <>
                <FormRow cols={1}>
                  <FormField label="All nonconformities closed by existing CB?">
                    <FRadioGroup value={data.transferNCClosed} onChange={v => set('transferNCClosed', v)} options={YN} />
                  </FormField>
                </FormRow>
                {data.transferNCClosed === 'Yes' && (
                  <FormRow cols={2}>
                    <FormField label="Transfer from IAF member CB">
                      <FInput value={data.transferFromIAFCB} onChange={v => set('transferFromIAFCB', v)} placeholder="CB name" />
                    </FormField>
                    <FormField label="Certificate Validity Date">
                      <FInput value={data.certValidityDate} onChange={v => set('certValidityDate', v)} type="date" />
                    </FormField>
                  </FormRow>
                )}
                {data.transferNCClosed === 'No' && (
                  <FormRow cols={1}>
                    <FormField label="Reason for non-closure of nonconformities">
                      <FTextarea value={data.transferReason} onChange={v => set('transferReason', v)} placeholder="Describe reason(s)" />
                    </FormField>
                  </FormRow>
                )}
              </>
            )}

            {/* ── 3. Audit Team Details ── */}
            <SectionTitle>Audit Team Details</SectionTitle>
            <DynamicTable
              columns={[
                { key: 'name', label: 'Auditor Name', minWidth: 140 },
                { key: 'role', label: 'Role', type: 'select', options: ROLES },
                { key: 'stage1Days', label: 'Stage-1 Man-days', type: 'text', minWidth: 100 },
                { key: 'stage2Days', label: 'Stage-2 Man-days', type: 'text', minWidth: 100 },
              ]}
              rows={data.auditTeam || []}
              onAdd={() => commitTeam([...(data.auditTeam || []), { ...EMPTY_AUDITOR }])}
              onRemove={ri => commitTeam((data.auditTeam || []).filter((_, i) => i !== ri))}
              onCellChange={setTeam}
              addLabel="Add Auditor"
            />

            {/* ── 4. Audit Man-days ── */}
            <SectionTitle>Audit Man-days Summary</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Total Audit Mandays (Stage 1)">
                <FInput value={data.totalMandaysS1} type="number" placeholder="0" disabled />
              </FormField>
              <FormField label="Total Audit Mandays (Stage 2)">
                <FInput value={data.totalMandaysS2} type="number" placeholder="0" disabled />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Total Audit Mandays">
                <FInput value={data.totalMandays} onChange={v => set('totalMandays', v)} type="number" placeholder="0" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Mandays Justification">
                <FTextarea value={data.mandaysJustification} onChange={v => set('mandaysJustification', v)} rows={4}
                  placeholder="Provide justification for the audit mandays / any adjustments..." />
              </FormField>
            </FormRow>

            {/* ── 5. Audit Dates ── */}
            <SectionTitle>Audit Dates (Tentative)</SectionTitle>
            <div className="qms-date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 100, marginBottom: 40 }}>
              <FormField label="Stage-1 Audit Date From">
                <FInput value={data.stage1DateFrom} onChange={v => set('stage1DateFrom', v)} type="date" />
              </FormField>
              <FormField label="Stage-1 Audit Date To">
                <FInput value={data.stage1DateTo} onChange={v => set('stage1DateTo', v)} type="date" />
              </FormField>
            </div>
            <div className="qms-date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 100, marginBottom: 40 }}>
              <FormField label="Stage-2 / Other Audit Date From">
                <FInput value={data.stage2DateFrom} onChange={v => set('stage2DateFrom', v)} type="date" />
              </FormField>
              <FormField label="Stage-2 / Other Audit Date To">
                <FInput value={data.stage2DateTo} onChange={v => set('stage2DateTo', v)} type="date" />
              </FormField>
            </div>

            {/* ── 6. Reviewer Independence Declaration ── */}
            <SectionTitle>Reviewer Independence Declaration</SectionTitle>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 12.5, color: '#14532d', lineHeight: 1.7 }}>
              <strong>I confirm that I don't have any relevant interest as below:</strong>
              <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                <li>I didn't work with the applied / client organization in the recent two years.</li>
                <li>I and QCC didn't supply any consulting, training or internal audit for the applied / client organization in the recent two years.</li>
              </ul>
            </div>
            <FormRow cols={1}>
              <FormField label="Reviewer Declaration Confirmation">
                <FRadioGroup value={data.reviewerDeclaration} onChange={v => set('reviewerDeclaration', v)}
                  options={[
                    { value: 'Confirmed', label: 'Confirmed — I have no conflict of interest' },
                    { value: 'Conflict', label: 'Conflict exists' },
                  ]} />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Reviewer Name">
                <FInput value={data.reviewerName || (data.auditTeam || []).find(a => a.role === 'Application & Report Reviewer')?.name || ''} onChange={v => set('reviewerName', v)} placeholder="Reviewer name" />
              </FormField>
              <FormField label="Review Date">
                <FInput value={data.reviewDate} onChange={v => set('reviewDate', v)} type="date" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Final Certification Decision by HOD — Name">
                <FInput value={data.hodName} onChange={v => set('hodName', v)} placeholder="HOD name" />
              </FormField>
              <FormField label="HOD Decision">
                <FSelect value={data.hodDecision} onChange={v => set('hodDecision', v)} placeholder="Select decision"
                  options={['Approved', 'Approved with conditions', 'Rejected', 'Deferred']} />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Verification Date">
                <FInput value={data.verificationDate} onChange={v => set('verificationDate', v)} type="date" />
              </FormField>
            </FormRow>

            {/* ── 8. IMS Man-Day Calculation (Annex I) ── */}
            <SectionTitle>IMS Man-Day Calculation — Annex I</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              background: '#1e40af', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Is IMS Man-Day Calculation applicable?</span>
              <div style={{ display: 'flex', gap: 16 }}>
                {['YES', 'NO'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: data.imsAnnexApplicable === v ? 700 : 500, color: 'white', fontSize: 12.5 }}>
                    <input type="radio" name="f02_imsAnnexApplicable" value={v} checked={data.imsAnnexApplicable === v}
                      onChange={() => set('imsAnnexApplicable', v)} style={{ accentColor: 'white' }} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            {data.imsAnnexApplicable === 'YES' && (<>

            {/* 8a. Organization details */}
            <FormRow cols={2}>
              <FormField label="Organization Name">
                <FInput value={data.imsOrgName || (isIMS ? data.orgName : '')} onChange={v => set('imsOrgName', v)} placeholder="Organization name" />
              </FormField>
              <FormField label="No. of Employees">
                <FInput value={data.imsEmployees} onChange={v => set('imsEmployees', v)} type="number" placeholder="0" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="Applicable Standards">
                <FInput value={data.imsStandards || (isIMS ? data.auditStandards : '')} onChange={v => set('imsStandards', v)} placeholder="e.g. ISO 9001, ISO 14001, ISO 45001" />
              </FormField>
            </FormRow>

            {/* 8b. Standard-wise man-day table */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#1e40af', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                Standard-wise Man-Day Calculation
              </div>
              {[
                { key: 'stdMandays9001',  label: 'ISO 9001:2015 — Quality Management System' },
                { key: 'stdMandays14001', label: 'ISO 14001:2015 — Environmental Management System' },
                { key: 'stdMandays45001', label: 'ISO 45001:2018 — OH&S Management System' },
                { key: 'stdMandays27001', label: 'ISO/IEC 27001:2022 — Information Security Management System' },
                { key: 'stdMandays22000', label: 'ISO 22000:2018 — Food Safety Management System' },
                { key: 'stdMandays22301', label: 'ISO 22301:2019 — Business Continuity Management System' },
                { key: 'stdMandays27701', label: 'ISO/IEC 27701:2025 — Privacy Information Management System' },
                { key: 'stdMandays42001', label: 'ISO/IEC 42001:2023 — AI Management System' },
                { key: 'stdMandays37001', label: 'ISO 37001:2016 — Anti-Bribery Management System' },
                { key: 'stdMandays21001', label: 'ISO 21001:2018 — Educational Organizations Management System' },
                { key: 'stdMandays50001', label: 'ISO 50001:2018 — Energy Management System' },
              ].map(({ key, label }) => (
                <CalcRow key={key} label={label} value={data[key]}
                  onChange={v => set(key, v)} placeholder="0.0" unit="Man-days" />
              ))}
              <CalcRow label="Total Man-days before Integration" value={data.totalMandaysBeforeIntegration}
                onChange={v => set('totalMandaysBeforeIntegration', v)} placeholder="0.0" unit="Man-days" />
            </div>

            {/* 8d. Integrated Man-Day Calculation (as per MD 11 Annex-1) */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#b45309', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                Integrated Man-Day Calculation — As per MD 11 Annex-1
              </div>
              <CalcRow label="Total Man-days before Integration" value={data.totalMandaysBeforeIntegration}
                onChange={v => set('totalMandaysBeforeIntegration', v)} placeholder="0.0" unit="Man-days"
                note="Standard-wise total" />
              <CalcRow label="Level of Integration %" value={data.levelOfIntegration}
                onChange={v => set('levelOfIntegration', v)} placeholder="e.g. 80" unit="%"
                note="As per application / Annex 1" />
              <CalcRow label="Ability to Perform Combined Audit %" value={data.combinedAuditAbility}
                onChange={v => set('combinedAuditAbility', v)} placeholder="e.g. 75" unit="%"
                note="= 100 × [(X1-1)+(X2-1)+…(Xn-1)] / Z(Y-1)" />
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#fffbeb' }}>
                <div style={{ fontSize: 11.5, color: '#92400e', marginBottom: 8, fontWeight: 600 }}>
                  Where: X = No. of standards per auditor qualified | Y = Total MS standards | Z = No. of auditors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {[
                    { key: 'x1Value', label: 'X1 (Auditor 1 stds)' },
                    { key: 'x2Value', label: 'X2 (Auditor 2 stds)' },
                    { key: 'x3Value', label: 'X3 (Auditor 3 stds)' },
                    { key: 'yValue',  label: 'Y (Total Standards)' },
                    { key: 'zValue',  label: 'Z (No. of Auditors)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: '#92400e', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                      <input type="number" value={data[key] || ''} onChange={e => set(key, e.target.value)}
                        placeholder="0" style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #fde68a', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff' }} />
                    </div>
                  ))}
                </div>
              </div>
              <CalcRow label="Integrated Reduction Allowed" value={data.integratedReductionAllowed}
                onChange={v => set('integratedReductionAllowed', v)} placeholder="0.0" unit="%"
                note="Based on vertical and horizontal audit percentage" />
              <CalcRow label="Man-day Reduction" value={data.mandayReduction}
                onChange={v => set('mandayReduction', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Final Integrated Man-days" value={data.finalIntegratedMandays}
                onChange={v => set('finalIntegratedMandays', v)} placeholder="0.0" unit="Man-days" />
            </div>

            {/* 8e. On-site / Off-site Audit Time */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#065f46', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                On-site and Off-site Audit Time
              </div>
              <CalcRow label="Final Integrated Man-days" value={data.finalIntegratedMandays}
                onChange={v => set('finalIntegratedMandays', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="On-site Audit Time" value={data.onsiteAuditTime}
                onChange={v => set('onsiteAuditTime', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Off-site Time" value={data.offsiteTime}
                onChange={v => set('offsiteTime', v)} placeholder="0.0" unit="Man-days" />
            </div>

            {/* 8f. Stage-wise Audit Time Distribution */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#1e3a8a', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                Stage-wise Audit Time Distribution
              </div>
              <CalcRow label="Stage 1 Audit" value={data.stageWiseStage1}
                onChange={v => set('stageWiseStage1', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Stage 2 Audit" value={data.stageWiseStage2}
                onChange={v => set('stageWiseStage2', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Total On-site Audit Time" value={data.totalOnsiteTime}
                onChange={v => set('totalOnsiteTime', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Off-site Planning / Reporting / Closing" value={data.offsiteReporting}
                onChange={v => set('offsiteReporting', v)} placeholder="0.0" unit="Man-days" />
              <CalcRow label="Total Integrated Audit Time" value={data.totalIntegratedAuditTime}
                onChange={v => set('totalIntegratedAuditTime', v)} placeholder="0.0" unit="Man-days" />
            </div>
            </>)}

            {/* ── 9. IAF MD 5 Reference Tables ── */}
            <SectionTitle>Audit Time Reference Tables (IAF MD 5:2023)</SectionTitle>

            {/* ISO 9001 QMS Table */}
            <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ background: '#f1f5f9', padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#1e40af' }}>
                ISO 9001:2015 — QMS Audit Time (Annex A, Table QMS 1)
              </summary>
              <div style={{ padding: 12 }}>
                <RefTable
                  headers={['Effective No. of Personnel', 'Audit Time (Stage 1+2, days)', 'Effective No. of Personnel', 'Audit Time (Stage 1+2, days)']}
                  rows={[
                    ['1–5','1.5','626–875','12'],['6–10','2','876–1175','13'],['11–15','2.5','1176–1550','14'],
                    ['16–25','3','1551–2025','15'],['26–45','4','2026–2675','16'],['46–65','5','2676–3450','17'],
                    ['66–85','6','3451–4350','18'],['86–125','7','4351–5450','19'],['126–175','8','5451–6800','20'],
                    ['176–275','9','6801–8500','21'],['276–425','10','8501–10700','22'],['426–625','11','>10700','Follow progression'],
                  ]}
                />
              </div>
            </details>

            {/* ISO 14001 EMS Table */}
            <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ background: '#f1f5f9', padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#166534' }}>
                ISO 14001:2015 — EMS Audit Time (Annex B, Table EMS 1) — Stage 1 + Stage 2
              </summary>
              <div style={{ padding: 12 }}>
                <RefTable
                  headers={['Effective No. of Personnel', 'High', 'Med', 'Low', 'Lim']}
                  rows={[
                    ['1–5','3','2.5','2.5','2.5'],['6–10','3.5','3','3','3'],['11–15','4.5','3.5','3','3'],
                    ['16–25','5.5','4.5','3.5','3'],['26–45','7','5.5','4','3'],['46–65','8','6','4.5','3.5'],
                    ['66–85','9','7','5','3.5'],['86–125','11','8','5.5','4'],['126–175','12','9','6','4.5'],
                    ['176–275','13','10','7','5'],['276–425','15','11','8','5.5'],['426–625','16','12','9','6'],
                    ['626–875','17','13','10','6.5'],['876–1175','19','15','11','7'],['1176–1550','20','16','12','7.5'],
                    ['1551–2025','21','17','12','8'],['>2025','Follow progression','','',''],
                  ]}
                />
              </div>
            </details>

            {/* ISO 45001 OH&SMS Table */}
            <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ background: '#f1f5f9', padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#9a3412' }}>
                ISO 45001:2018 — OH&SMS Audit Time (Annex C, Table OH&SMS 1) — Stage 1 + Stage 2
              </summary>
              <div style={{ padding: 12 }}>
                <RefTable
                  headers={['Effective No. of Personnel', 'High', 'Med', 'Low']}
                  rows={[
                    ['1–5','3','2.5','2.5'],['6–10','3.5','3','3'],['11–15','4.5','3.5','3'],
                    ['16–25','5.5','4.5','3.5'],['26–45','7','5.5','4'],['46–65','8','6','4.5'],
                    ['66–85','9','7','5'],['86–125','11','8','5.5'],['126–175','12','9','6'],
                    ['176–275','13','10','7'],['276–425','15','11','8'],['426–625','16','12','9'],
                    ['626–875','17','13','10'],['876–1175','19','15','11'],['1176–1550','20','16','12'],
                    ['1551–2025','21','17','12'],['>2025','Follow progression','',''],
                  ]}
                />
              </div>
            </details>

            {/* ISO/IEC 27001 ISMS Table */}
            <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ background: '#f1f5f9', padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#4c1d95' }}>
                ISO/IEC 27001:2022 — ISMS Audit Time (ISO/IEC 27006-1:2024, Table C.1)
              </summary>
              <div style={{ padding: 12 }}>
                {/* ISMS Audit Time Calculation (editable) */}
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: '#4c1d95', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                    Manday Calculation — Factors related to IT environment
                  </div>
                  <CalcRow label="Number of Persons Under Organization's Control" value={data.ismsPersonsControl}
                    onChange={v => set('ismsPersonsControl', v)} type="number" placeholder="e.g. 50" />
                  <CalcRow label="Base ISMS Audit Time (as per Table C.1)" value={data.ismsBaseAuditTime}
                    onChange={v => set('ismsBaseAuditTime', v)} placeholder="e.g. 7" unit="Auditor Days" />
                  <CalcRow label="Business Complexity" value={data.ismsBusinessComplexity}
                    onChange={v => set('ismsBusinessComplexity', v)} placeholder="Select or enter" note="High (7–9) / Medium (5–6) / Low (3–4)" />
                  <CalcRow label="IT Complexity" value={data.ismsITComplexity}
                    onChange={v => set('ismsITComplexity', v)} placeholder="Select or enter" note="High (7–9) / Medium (5–6) / Low (3–4)" />
                  <CalcRow label="IT / Business Complexity Adjustment" value={data.ismsComplexityAdj}
                    onChange={v => set('ismsComplexityAdj', v)} placeholder="e.g. +10%" unit="%" />
                  <CalcRow label="Additive / Subtractive Adjustment" value={data.ismsAdditiveAdj}
                    onChange={v => set('ismsAdditiveAdj', v)} placeholder="e.g. +1.5" unit="Auditor Days" />
                  <CalcRow label="Additional Audit Time (if applicable)" value={data.ismsAdditionalTime}
                    onChange={v => set('ismsAdditionalTime', v)} placeholder="0" unit="Auditor Days" />
                  <CalcRow label="Total Final ISMS Audit Time" value={data.ismsTotalFinalTime}
                    onChange={v => set('ismsTotalFinalTime', v)} placeholder="0" unit="Auditor Days" />
                  <CalcRow label="Stage 1 Audit Time" value={data.ismsStage1Time}
                    onChange={v => set('ismsStage1Time', v)} placeholder="0" unit="Auditor Days" />
                  <CalcRow label="Stage 2 Audit Time" value={data.ismsStage2Time}
                    onChange={v => set('ismsStage2Time', v)} placeholder="0" unit="Auditor Days" />
                </div>
                {/* ISMS Reduction Calculation (editable) */}
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: '#0f766e', color: 'white', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
                    ISMS Reduction Calculation
                  </div>
                  <CalcRow label="Business Complexity" value={data.imsBusinessComplexity}
                    onChange={v => set('imsBusinessComplexity', v)} placeholder="High / Medium / Low" />
                  <CalcRow label="IT Complexity" value={data.imsITComplexity}
                    onChange={v => set('imsITComplexity', v)} placeholder="High / Medium / Low" />
                  <CalcRow label="Impact Factor on Audit Time" value={data.imsImpactFactor}
                    onChange={v => set('imsImpactFactor', v)} placeholder="e.g. +10% to +50%" unit="%" />
                  <CalcRow label="ISMS Reduction" value={data.ismsReductionDays}
                    onChange={v => set('ismsReductionDays', v)} placeholder="0.0" unit="Man-days" />
                </div>
                <div style={{ marginBottom: 10, fontSize: 12, color: '#4c1d95', fontWeight: 600 }}>Business Complexity × IT Complexity Adjustment Matrix</div>
                <RefTable
                  headers={['Business Complexity ↓ / IT Complexity →', 'Low IT (3–4)', 'Medium IT (5–6)', 'High IT (7–9)']}
                  rows={[
                    ['High Business Complexity (7–9)', '+5% to +20%', '+10% to +50%', '+20% to +100%'],
                    ['Medium Business Complexity (5–6)', '−5% to −10%', '0%', '+10% to +50%'],
                    ['Low Business Complexity (3–4)', '−10% to −30%', '−5% to −10%', '+5% to +20%'],
                  ]}
                />
                <div style={{ marginTop: 10 }} />
                <RefTable
                  title="Table C.1 — ISMS Audit Time Chart (ISO/IEC 27006-1:2024)"
                  headers={['No. of Persons', 'QMS Days', 'EMS Days', 'ISMS Days', 'Additive Factors']}
                  rows={[
                    ['1–10','1.5–2','2.5–3','5','See C.3.5'],['11–15','2.5','3.5','6','See C.3.5'],
                    ['16–25','3','4.5','7','See C.3.5'],['26–45','4','5.5','8.5','See C.3.5'],
                    ['46–65','5','6','10','See C.3.5'],['66–85','6','7','11','See C.3.5'],
                    ['86–125','7','8','12','See C.3.5'],['126–175','8','9','13','See C.3.5'],
                    ['176–275','9','10','14','See C.3.5'],['276–425','10','11','15','See C.3.5'],
                    ['426–625','11','12','16.5','See C.3.5'],['626–875','12','13','17.5','See C.3.5'],
                    ['876–1175','13','15','18.5','See C.3.5'],['1176–1550','14','16','19.5','See C.3.5'],
                    ['1551–2025','15','17','21','See C.3.5'],['2026–2675','16','18','22','See C.3.5'],
                    ['>2675','Follow progression','','',''],
                  ]}
                />
              </div>
            </details>

            {/* ISO 22000 FSMS Table */}
            <details style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ background: '#f1f5f9', padding: '9px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#92400e' }}>
                ISO 22000:2018 — FSMS Audit Time (ISO 22003-1:2022, Table B.1)
              </summary>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textAlign: 'center', marginBottom: 2 }}>Audit Time Determination For ISO 22000:2018</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textAlign: 'center', marginBottom: 10 }}>Table B.1 — Variables for Calculation of Minimum Audit Duration</div>
                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 10px', background: '#fde68a', border: '1px solid #d1a054', fontSize: 11.5, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>Category or Subcategory</th>
                        <th style={{ padding: '6px 10px', background: '#fde68a', border: '1px solid #d1a054', fontSize: 11.5, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>Basic Site Audit Duration, in Audit Days<br />(TD)</th>
                        <th style={{ padding: '6px 10px', background: '#fde68a', border: '1px solid #d1a054', fontSize: 11.5, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>No. of Audit Days for Each Additional HACCP Study<br />(TH)</th>
                        <th style={{ padding: '6px 10px', background: '#fde68a', border: '1px solid #d1a054', fontSize: 11.5, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>Effective Number FTE<br />(TFTE)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['AI', '1,0', '0,25'], ['AII', '1,0', '0,25'], ['BI', '1,0', '0,25'], ['BII', '1,0', '0,25'], ['BIII', '1,0', '0,25'],
                        ['C0', '2,0', '0,50'], ['CI', '2,0', '0,50'], ['CII', '2,0', '0,50'], ['CIII', '2,0', '0,50'], ['CIV', '2,0', '0,50'],
                        ['D', '1,0', '0,50'], ['E', '1,5', '0,50'], ['FI', '1,0', '0,50'], ['FII', '1,0', '0,5'],
                        ['G', '1,5', '0,25'], ['H', '1,5', '0,25'], ['I', '1,5', '0,50'], ['J', '1,5', '0,50'], ['K', '2,0', '0,5'],
                      ].map((r, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: 12, color: '#92400e', fontWeight: 700, textAlign: 'center' }}>{r[0]}</td>
                          <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: 12, color: '#374151', textAlign: 'center' }}>{r[1]}</td>
                          <td style={{ padding: '5px 10px', border: '1px solid #e2e8f0', fontSize: 12, color: '#374151', textAlign: 'center' }}>{r[2]}</td>
                          {ri === 0 && (
                            <td rowSpan={19} style={{ padding: '5px 14px', border: '1px solid #e2e8f0', fontSize: 12, color: '#374151', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'pre-line', lineHeight: 2 }}>
                              {'1 to 5 = 0\n6 to 49 = 0,5\n50 to 99 = 1,0\n100 to 199 = 1,5\n200 to 499 = 2,0\n500 to 999 = 2,5\n> 1 000 = 3'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td colSpan={2} style={{ background: '#fde68a', color: '#92400e', fontWeight: 800, fontSize: 12.5, textAlign: 'center', padding: '7px 10px', border: '1px solid #d1a054' }}>MANDAY CALCULATION</td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ padding: '7px 12px', border: '1px solid #d1a054', fontSize: 12, color: '#92400e', fontWeight: 600, textAlign: 'center' }}>The minimum initial certification audit duration for FSMS certification audits shall be given as Ds, expressed in days, which is calculated, considering Table B.1: from ISO 22003-1:2022</td>
                      </tr>
                      {[
                        ['where', ''],
                        ['Ds', 'is the total audit duration;'],
                        ['TD', 'is the basic site audit duration for (sub) category and scope of certification (includes one HACCP study), in days;'],
                        ['TH', 'is the number of audit days for additional HACCP studies;'],
                        ['TFTE', 'is the number of audit days per number of FTE employees.'],
                        ['Ds = (TD + TH + TFTE)', ''],
                      ].map((r, ri) => (
                        <tr key={ri}>
                          <td style={{ padding: '6px 12px', border: '1px solid #d1a054', fontSize: 12, color: '#92400e', fontWeight: 700, width: '32%', whiteSpace: 'nowrap' }}>{r[0]}</td>
                          <td style={{ padding: '6px 12px', border: '1px solid #d1a054', fontSize: 12, color: '#374151' }}>{r[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Editable FSMS Manday Calculation */}
                <div style={{ overflowX: 'auto', marginTop: 14 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td colSpan={2} style={{ background: '#0f766e', color: 'white', fontWeight: 800, fontSize: 12.5, textAlign: 'center', padding: '7px 10px', border: '1px solid #0f766e' }}>FSMS Manday Calculation — Enter Values</td>
                      </tr>
                      {(() => {
                        const fsmsTotal = (Number(data.fsmsTD) || 0) + (Number(data.fsmsTH) || 0) + (Number(data.fsmsTFTE) || 0);
                        return [
                          { key: 'fsmsCategory', label: 'Category / Subcategory', ph: 'e.g. CIII', type: 'text' },
                          { key: 'fsmsTD', label: 'TD — Basic Site Audit Duration (incl. one HACCP study)', ph: 'e.g. 2.0', unit: 'Days' },
                          { key: 'fsmsTH', label: 'TH — Audit Days for Additional HACCP Studies', ph: 'e.g. 0.5', unit: 'Days' },
                          { key: 'fsmsTFTE', label: 'TFTE — Audit Days per Number of FTE Employees', ph: 'e.g. 1.5', unit: 'Days' },
                          { key: 'fsmsDs', label: 'Ds — Total Audit Duration  (Ds = TD + TH + TFTE)', ph: '0.0', unit: 'Days', computed: true },
                        ].map(({ key, label, ph, unit, type, computed }) => (
                          <tr key={key}>
                            <td style={{ padding: '6px 12px', border: '1px solid #99f6e4', fontSize: 12, color: '#0f766e', fontWeight: 700, width: '55%' }}>{label}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #99f6e4' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type={type === 'text' ? 'text' : 'number'} readOnly={computed}
                                  value={computed ? (fsmsTotal ? fsmsTotal : '') : (data[key] || '')}
                                  onChange={e => set(key, e.target.value)} placeholder={ph}
                                  style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #5eead4', borderRadius: 7, fontSize: 13, outline: 'none', background: computed ? '#ccfbf1' : '#fff', fontWeight: computed ? 800 : 400, color: computed ? '#0f766e' : 'inherit' }} />
                                {unit && <span style={{ fontSize: 11.5, color: '#0f766e', fontWeight: 600, whiteSpace: 'nowrap' }}>{unit}</span>}
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>

          </div>
        );
      }}
    </QMSFormPage>
  );
}
