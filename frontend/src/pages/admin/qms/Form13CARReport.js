import React, { useState } from 'react';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, StandardChips } from './QMSFormPage';
import { FiPlusCircle, FiX } from 'react-icons/fi';

const EMPTY_NC = {
  ncrNo: '', dept: '', auditType: 'Stage-2', clauseNo: '', detailsOfNC: '',
  rootCause: '', correction: '', correctiveAction: '', completionDate: '',
  evaluationResult: '', evaluationAccepted: '',
  confirmationResult: '', confirmationDate: '', confirmationOfficer: '', unsatisfiedReason: '',
};

const DEFAULT = {
  orgName: '', auditStandards: '',
  ncList: [{ ...EMPTY_NC }],
};

export default function Form13CARReport() {
  return (
    <QMSFormPage
      formType={13}
      formCode="AUD-F-17"
      formTitle="AUD-F-17 CAR"
      defaultData={DEFAULT}
      prefillFrom={{
        formTypes: [12],
        apply: (sources, cur) => {
          const f12 = sources[12] || {};
          const mapCar = (c, auditType) => ({
            ...EMPTY_NC,
            ncrNo:       c.ncrNo || '',
            dept:        c.processDept || '',
            auditType,
            clauseNo:    c.clauseRef || '',
            detailsOfNC: c.ncrDetail || '',
          });
          // Pull the CAR entries from F12, keeping them stage-wise (Stage 1 then Stage 2).
          const fetched = [
            ...(f12.carEntries || []).filter(c => c.ncrDetail || c.clauseRef).map(c => mapCar(c, 'Stage-1')),
            ...(f12.carEntriesStage2 || []).filter(c => c.ncrDetail || c.clauseRef).map(c => mapCar(c, 'Stage-2')),
          ];
          if (!fetched.length) return cur;
          // Only auto-fill when the report's NC list is still empty (just the blank default).
          const hasData = (cur.ncList || []).some(n => n.detailsOfNC || n.clauseNo || n.ncrNo);
          if (hasData) return cur;
          return { ...cur, ncList: fetched };
        },
      }}
    >
      {({ data, set }) => {
        const ncList = data.ncList && data.ncList.length ? data.ncList : [{ ...EMPTY_NC }];
        const setNC = (ri, key, val) => {
          const t = [...ncList];
          t[ri] = { ...t[ri], [key]: val };
          set('ncList', t);
        };
        const addNC = () => set('ncList', [...ncList, { ...EMPTY_NC }]);
        const removeNC = (ri) => set('ncList', ncList.filter((_, i) => i !== ri));
        return <CARReportBody data={data} set={set} ncList={ncList} setNC={setNC} addNC={addNC} removeNC={removeNC} />;
      }}
    </QMSFormPage>
  );
}

function CARReportBody({ data, set, ncList, setNC, addNC, removeNC }) {
  const [confirmIdx, setConfirmIdx] = useState(null);

        return (
          <div>
            <SectionTitle>Organization Details</SectionTitle>
            <FormRow cols={2}>
              <FormField label="Organization Name" required>
                <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" />
              </FormField>
              <FormField label="Audit Standard(s)">
                <StandardChips value={data.auditStandards} />
              </FormField>
            </FormRow>

            {ncList.map((nc, ri) => (
              <div key={ri} style={{ border: '1.5px solid var(--primary-200, #bfdbfe)', borderRadius: 12, padding: '4px 16px 16px', marginBottom: 18, background: '#fbfdff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 6px' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-dark)' }}>Non-Conformity #{ri + 1}</span>
                  {ncList.length > 1 && (
                    <button type="button" onClick={() => setConfirmIdx(ri)} title="Remove"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: 4, cursor: 'pointer' }}>
                      <FiX size={13} />
                    </button>
                  )}
                </div>

                <FormRow cols={3}>
                  <FormField label="NCR No.">
                    <FInput value={nc.ncrNo} onChange={v => setNC(ri, 'ncrNo', v)} placeholder="NCR-001" />
                  </FormField>
                  <FormField label="Department">
                    <FInput value={nc.dept} onChange={v => setNC(ri, 'dept', v)} placeholder="Department name" />
                  </FormField>
                  <FormField label="Audit Type">
                    <FSelect value={nc.auditType} onChange={v => setNC(ri, 'auditType', v)} placeholder="Select type"
                      options={[ 'Stage-1', 'Stage-2', 'Surveillance', 'Re-certification', 'Follow-up' ,'Special' ]} />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="Clause No.">
                    <FInput value={nc.clauseNo} onChange={v => setNC(ri, 'clauseNo', v)} placeholder="e.g. 8.5.1" />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="Details of Non-Conformity">
                    <FTextarea value={nc.detailsOfNC} onChange={v => setNC(ri, 'detailsOfNC', v)} rows={3} placeholder="Describe the non-conformity in detail..." />
                  </FormField>
                </FormRow>
          
                <SectionTitle>Result of Corrective Action</SectionTitle>
                <FormRow cols={1}>
                  <FormField label="1. Root Cause">
                    <FTextarea value={nc.rootCause} onChange={v => setNC(ri, 'rootCause', v)} rows={3} placeholder="Identify the root cause of the non-conformity..." />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="2. Correction (Immediate Action)">
                    <FTextarea value={nc.correction} onChange={v => setNC(ri, 'correction', v)} rows={3} placeholder="Describe the immediate correction taken..." />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="3. Corrective Action (Systematic Action)">
                    <FTextarea value={nc.correctiveAction} onChange={v => setNC(ri, 'correctiveAction', v)} rows={3} placeholder="Describe the systemic corrective action to prevent recurrence..." />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="Completion Date of Corrective Action">
                    <FInput value={nc.completionDate} onChange={v => setNC(ri, 'completionDate', v)} type="date" />
                  </FormField>
                </FormRow>

                <SectionTitle>For Auditor(s) / QCC Use Only</SectionTitle>
                <FormRow cols={1}>
                  <FormField label="Evaluation Result of Corrective Action">
                    <FTextarea value={nc.evaluationResult} onChange={v => setNC(ri, 'evaluationResult', v)} rows={3} placeholder="Auditor's evaluation of the corrective action..." />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="Accepted by Auditor">
                    <FInput value={nc.evaluationAccepted} onChange={v => setNC(ri, 'evaluationAccepted', v)} placeholder="Auditor name" />
                  </FormField>
                </FormRow>

                <SectionTitle>QCC Confirmation</SectionTitle>
                <FormRow cols={2}>
                  <FormField label="Confirmation Result">
                    <FSelect value={nc.confirmationResult} onChange={v => setNC(ri, 'confirmationResult', v)} placeholder="Select result"
                      options={['Satisfied','Unsatisfied']} />
                  </FormField>
                  <FormField label="Confirmation Date">
                    <FInput value={nc.confirmationDate} onChange={v => setNC(ri, 'confirmationDate', v)} type="date" />
                  </FormField>
                </FormRow>
                <FormRow cols={1}>
                  <FormField label="Confirmation Officer">
                    <FInput value={nc.confirmationOfficer} onChange={v => setNC(ri, 'confirmationOfficer', v)} placeholder="Confirmation officer name" />
                  </FormField>
                </FormRow>
                {nc.confirmationResult === 'Unsatisfied' && (
                  <FormRow cols={1}>
                    <FormField label="Reason (if Unsatisfied)">
                      <FTextarea value={nc.unsatisfiedReason} onChange={v => setNC(ri, 'unsatisfiedReason', v)} rows={3} placeholder="Describe reason for unsatisfied result..." />
                    </FormField>
                  </FormRow>
                )}
              </div>
            ))}

            <button type="button" onClick={addNC}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-50, #eff6ff)', border: '1.5px solid var(--primary-200, #bfdbfe)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginBottom: 8 }}>
              <FiPlusCircle size={15} /> Add Non-Conformity
            </button>

            {confirmIdx !== null && (
              <div onClick={() => setConfirmIdx(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div onClick={e => e.stopPropagation()}
                  style={{ background: 'white', borderRadius: 14, padding: '24px 26px', width: 'min(420px, 90vw)', boxShadow: '0 20px 50px rgba(0,0,0,.25)', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <FiX size={26} color="#dc2626" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete this Non-Conformity?</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 22 }}>
                    Are you sure you want to delete <strong>Non-Conformity #{confirmIdx + 1}</strong>? This action cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button type="button" onClick={() => setConfirmIdx(null)}
                      style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => { removeNC(confirmIdx); setConfirmIdx(null); }}
                      style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
}
