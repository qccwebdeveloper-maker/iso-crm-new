import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

const EMPTY_P = { sNo: '', name: '', position: '', openingMeeting: '', closingMeeting: '' };
const YN_OPTS = ['Yes','No'];
// Only these two roles from F02's Audit Team Details are pulled into Participants.
const AUDITOR_ROLES = ['Lead Auditor', 'Auditor'];

const DEFAULT = {
  auditDateFrom: '', auditDateTo: '', standard: '',
  participants: Array.from({ length: 5 }, (_, i) => ({ sNo: String(i + 1), name: '', position: '', openingMeeting: '', closingMeeting: '' })),
};

export default function Form06Stage1Meetings() {
  return (
    <QMSFormPage
      formType={6}
      formCode="AUD-F-07 S1"
      formTitle="Attendance List — Opening & Closing Meeting (Stage-1)"
      defaultData={DEFAULT}
    >
      {(props) => <Form06Body {...props} />}
    </QMSFormPage>
  );
}

function Form06Body({ data, set, clientInfo }) {
  const setP = (ri, key, val) => {
    const p = [...(data.participants || [])];
    p[ri] = { ...p[ri], [key]: val };
    set('participants', p);
  };

  // Fetch from F02 (Application Review): the Stage-1 audit dates, plus the Lead
  // Auditor / Auditor from the Audit Team Details — carried into Participants
  // (name → Name, role → Position). Only those two roles are pulled; other roles
  // (Reviewer, Technical Expert, HOD, Guide, Observer) are skipped. Anything already
  // entered on this form is preserved and auditors are never duplicated.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const map = { auditDateFrom: fd.stage1DateFrom, auditDateTo: fd.stage1DateTo };
        Object.entries(map).forEach(([k, v]) => {
          if (v && !(data[k] && String(data[k]).trim())) set(k, v);
        });
        // Auditor / Lead Auditor rows from F02, deduped against what's already here.
        const auditors = (fd.auditTeam || [])
          .filter(m => m && AUDITOR_ROLES.includes(m.role) && m.name && String(m.name).trim())
          .map(m => ({ name: String(m.name).trim(), role: m.role }));
        if (!auditors.length) return;
        const rows = [...(data.participants || [])];
        const has = n => rows.some(r => (r.name || '').trim().toLowerCase() === n.toLowerCase());
        let changed = false;
        auditors.forEach(a => {
          if (has(a.name)) return;
          const blankRow = rows.find(r => !(r.name || '').trim() && !(r.position || '').trim());
          if (blankRow) { blankRow.name = a.name; blankRow.position = a.role; }
          else rows.push({ ...EMPTY_P, name: a.name, position: a.role });
          changed = true;
        });
        if (changed) set('participants', rows.map((r, i) => ({ ...r, sNo: String(i + 1) })));
      })
      .catch(() => { /* no F02 yet — keep defaults */ });
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  return (
    <div>
      <SectionTitle>Meeting Details</SectionTitle>
      <FormRow cols={3}>
        <FormField label="Audit Date — Stage 1 (From)">
          <FInput value={data.auditDateFrom} onChange={v => set('auditDateFrom', v)} type="date" />
        </FormField>
        <FormField label="Audit Date To">
          <FInput value={data.auditDateTo} onChange={v => set('auditDateTo', v)} type="date" />
        </FormField>
        <FormField label="Standard">
          <StandardChips value={data.standard} />
        </FormField>
      </FormRow>

      <SectionTitle>Participants</SectionTitle>
      <DynamicTable
        columns={[
          { key: 'sNo',            label: 'S.No.',               minWidth: 44, width: 64 },
          { key: 'name',           label: 'Name',                minWidth: 160 },
          { key: 'position',       label: 'Position / Department', minWidth: 180 },
          { key: 'openingMeeting', label: 'Opening Meeting (Y/N)', type: 'select', options: YN_OPTS },
          { key: 'closingMeeting', label: 'Closing Meeting (Y/N)', type: 'select', options: YN_OPTS },
        ]}
        rows={data.participants || []}
        onAdd={() => {
          const cur = data.participants || [];
          set('participants', [...cur, { ...EMPTY_P, sNo: String(cur.length + 1) }]);
        }}
        onRemove={ri => set('participants', (data.participants || []).filter((_, i) => i !== ri))}
        onCellChange={setP}
        addLabel="Add Participant"
      />
    </div>
  );
}
