import React from 'react';
import QMSFormPage, { FormRow, FormField, FInput, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

const EMPTY_CAR = { ncrNo: '', clauseRef: '', minorMajor: 'Minor', ncrDetail: '', writingDate: '', processDept: '', acceptedBy: '', leadAuditorName: '' };

const DEFAULT = {
  idNo: '', orgName: '', standard: '',
  carEntries:      [{ ...EMPTY_CAR, ncrNo: '1' }],   // Stage 1 (from F07)
  carEntriesStage2: [{ ...EMPTY_CAR, ncrNo: '1' }],  // Stage 2 (from F11)
};

const CAR_COLUMNS = [
  { key: 'ncrNo',          label: 'NCR No.',        minWidth: 60 },
  { key: 'clauseRef',      label: 'Clause Ref.',    minWidth: 100 },
  { key: 'minorMajor',     label: 'Minor / Major',  type: 'select', options: ['Minor','Major'] },
  { key: 'ncrDetail',      label: 'NCR Detail',     type: 'textarea', fullRow: true },
  { key: 'writingDate',    label: 'Writing Date',   type: 'date' },
  { key: 'processDept',    label: 'Process / Dept.', minWidth: 120 },
  { key: 'acceptedBy',     label: 'Accepted By Representative', minWidth: 140 },
  { key: 'leadAuditorName',label: 'Lead Auditor',   minWidth: 140 },
];

// Map an audit-report NC into a CAR entry.
const ncToCar = (n, i) => ({
  ...EMPTY_CAR,
  ncrNo:      String(i + 1),
  clauseRef:  n.clause || '',
  minorMajor: /major/i.test(n.type || '') ? 'Major' : 'Minor',
  ncrDetail:  n.details || '',
});

export default function Form12CARRequest() {
  return (
    <QMSFormPage
      formType={12}
      formCode="AUD-F-16"
      formTitle="Request for Corrective Action (CAR)"
      defaultData={DEFAULT}
      prefillFrom={{
        formTypes: [1, 2, 7, 11],
        apply: (sources, cur) => {
          const out = { ...cur };
          // Stage 1 ← F07 NCs (only when the Stage-1 table is still empty)
          const s1 = sources[7]?.ncList || [];
          const s1HasData = (cur.carEntries || []).some(e => e.ncrDetail || e.clauseRef);
          if (s1.length && !s1HasData) out.carEntries = s1.map(ncToCar);
          // Stage 2 ← F11 NCs (only when the Stage-2 table is still empty)
          const s2 = sources[11]?.ncList || [];
          const s2HasData = (cur.carEntriesStage2 || []).some(e => e.ncrDetail || e.clauseRef);
          if (s2.length && !s2HasData) out.carEntriesStage2 = s2.map(ncToCar);
          // Accepted By Representative ← F01's Representative Name.
          // Lead Auditor ← F02's Audit Team (the member with role "Lead Auditor").
          // Both fill every row that is still blank; typed values are kept.
          // F01 shows representativeName but falls back to contactPerson on screen,
          // so mirror that here — otherwise a rep that was never typed reads as blank.
          const rep = (sources[1]?.representativeName || sources[1]?.contactPerson || '').trim();
          const lead = ((sources[2]?.auditTeam || [])
            .find(m => m && m.role === 'Lead Auditor' && m.name && String(m.name).trim())?.name || '').trim();
          if (rep || lead) {
            const fill = list => (list || []).map(e => {
              const next = { ...e };
              if (rep  && !(e.acceptedBy      && String(e.acceptedBy).trim()))      next.acceptedBy      = rep;
              if (lead && !(e.leadAuditorName && String(e.leadAuditorName).trim())) next.leadAuditorName = lead;
              return next;
            });
            out.carEntries      = fill(out.carEntries);
            out.carEntriesStage2 = fill(out.carEntriesStage2);
          }
          return out;
        },
      }}
    >
      {({ data, set }) => {
        const setCarOn = (field) => (ri, k, v) => {
          const t = [...(data[field] || [])];
          t[ri] = { ...t[ri], [k]: v };
          set(field, t);
        };
        const addOn = (field) => () => {
          const cur = data[field] || [];
          set(field, [...cur, { ...EMPTY_CAR, ncrNo: String(cur.length + 1) }]);
        };
        const removeOn = (field) => (ri) => set(field, (data[field] || []).filter((_, i) => i !== ri));

        return (
          <div>
            <SectionTitle>Organization Details</SectionTitle>
            <FormRow cols={3}>
              <FormField label="ID No.">
                <FInput value={data.idNo} onChange={v => set('idNo', v)} placeholder="Client / Application ID" />
              </FormField>
              <FormField label="Organization Name" required>
                <FInput value={data.orgName} onChange={v => set('orgName', v)} />
              </FormField>
              <FormField label="Standard">
                <StandardChips value={data.standard} />
              </FormField>
            </FormRow>

            <div style={{ background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
              <strong>Note:</strong> Minor NCR — Please take action including reason analysis and prevention within 1 month. | Major NCR — Please conduct confirmation audit between 1–3 months.
            </div>

            <SectionTitle>Stage 1 — Corrective Action Requests</SectionTitle>
            <DynamicTable
              columns={CAR_COLUMNS}
              rows={data.carEntries || []}
              onAdd={addOn('carEntries')}
              onRemove={removeOn('carEntries')}
              onCellChange={setCarOn('carEntries')}
              addLabel="Add NCR Entry"
            />

            <SectionTitle>Stage 2 — Corrective Action Requests</SectionTitle>
            <DynamicTable
              columns={CAR_COLUMNS}
              rows={data.carEntriesStage2 || []}
              onAdd={addOn('carEntriesStage2')}
              onRemove={removeOn('carEntriesStage2')}
              onCellChange={setCarOn('carEntriesStage2')}
              addLabel="Add NCR Entry"
            />
          </div>
        );
      }}
    </QMSFormPage>
  );
}
