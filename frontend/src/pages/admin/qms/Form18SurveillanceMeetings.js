import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

const EMPTY_P = { sNo: '', name: '', position: '', openingMeeting: '', closingMeeting: '' };
const YN_OPTS = ['Yes', 'No'];

const DEFAULT = {
  auditDateFrom: '', auditDateTo: '', standard: '',
  participants: Array.from({ length: 5 }, (_, i) => ({ sNo: String(i + 1), name: '', position: '', openingMeeting: '', closingMeeting: '' })),
};

export default function Form18SurveillanceMeetings() {
  return (
    <QMSFormPage
      formType={18}
      formCode="AUD-F-07 (S)"
      formTitle="AUD-F-07 Opening & Closing Meeting"
      defaultData={DEFAULT}
      prefillFrom={{
        formTypes: [16],
        apply: (sources, cur) => {
          const f16 = sources[16] || {};
          const blank = v => !(v && String(v).trim());
          const out = { ...cur };
          if (f16.auditDateFrom && blank(out.auditDateFrom)) out.auditDateFrom = f16.auditDateFrom;
          if (f16.auditDateTo && blank(out.auditDateTo)) out.auditDateTo = f16.auditDateTo;
          return out;
        },
      }}
    >
      {(props) => <Body {...props} />}
    </QMSFormPage>
  );
}

function Body({ data, set, clientInfo }) {
  const setP = (ri, key, val) => { const p = [...(data.participants || [])]; p[ri] = { ...p[ri], [key]: val }; set('participants', p); };

  // Pull the surveillance audit dates from F16 when still blank here.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/16`)
      .then(({ data: f16 }) => {
        if (cancelled) return;
        const fd = f16?.formData || {};
        const map = { auditDateFrom: fd.auditDateFrom, auditDateTo: fd.auditDateTo };
        Object.entries(map).forEach(([k, v]) => { if (v && !(data[k] && String(data[k]).trim())) set(k, v); });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  return (
    <div>
      <SectionTitle>Meeting Details</SectionTitle>
      <FormRow cols={3}>
        <FormField label="Audit Date — Surveillance (From)"><FInput value={data.auditDateFrom} onChange={v => set('auditDateFrom', v)} type="date" /></FormField>
        <FormField label="Audit Date To"><FInput value={data.auditDateTo} onChange={v => set('auditDateTo', v)} type="date" /></FormField>
        <FormField label="Standard"><StandardChips value={data.standard} /></FormField>
      </FormRow>

      <SectionTitle>Participants</SectionTitle>
      <DynamicTable
        columns={[
          { key: 'sNo', label: 'S.No.', minWidth: 44, width: 64 },
          { key: 'name', label: 'Name', minWidth: 160 },
          { key: 'position', label: 'Position / Department', minWidth: 180 },
          { key: 'openingMeeting', label: 'Opening Meeting (Y/N)', type: 'select', options: YN_OPTS },
          { key: 'closingMeeting', label: 'Closing Meeting (Y/N)', type: 'select', options: YN_OPTS },
        ]}
        rows={data.participants || []}
        onAdd={() => { const cur = data.participants || []; set('participants', [...cur, { ...EMPTY_P, sNo: String(cur.length + 1) }]); }}
        onRemove={ri => set('participants', (data.participants || []).filter((_, i) => i !== ri))}
        onCellChange={setP}
        addLabel="Add Participant"
      />
    </div>
  );
}
