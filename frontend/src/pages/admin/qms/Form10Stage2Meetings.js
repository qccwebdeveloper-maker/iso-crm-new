import React, { useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import QMSFormPage, { FormRow, FormField, FInput, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

const YN_OPTS = ['Yes','No'];
const EMPTY_P = { sNo: '', name: '', position: '', openingMeeting: '', closingMeeting: '' };
// Only these two roles from F02's Audit Team Details are pulled into Participants.
const AUDITOR_ROLES = ['Lead Auditor', 'Auditor'];

const DEFAULT = {
  auditDateFrom: '', auditDateTo: '', standard: '',
  participants: Array.from({ length: 5 }, (_, i) => ({
    sNo: String(i + 1), name: '', position: '', openingMeeting: '', closingMeeting: '',
  })),
};

export default function Form10Stage2Meetings() {
  return (
    <QMSFormPage
      formType={10}
      formCode="AUD-F-07 S2"
      formTitle="Attendance List — Opening & Closing Meeting (Stage-2)"
      defaultData={DEFAULT}
    >
      {(props) => <Form10Body {...props} />}
    </QMSFormPage>
  );
}

function Form10Body({ data, set, clientInfo }) {
  const setP = (ri, key, val) => {
    const p = [...(data.participants || [])];
    p[ri] = { ...p[ri], [key]: val };
    set('participants', p);
  };

  // True once the auditor has typed at least one participant on this form.
  const hasParticipantData = () =>
    (data.participants || []).some(p => p && (p.name?.trim() || p.position?.trim()));

  // Copy the participant list from F06 (Stage-1 Meetings) onto this form.
  const applyParticipants = (list, { silent } = {}) => {
    const cleaned = (Array.isArray(list) ? list : [])
      .filter(p => p && (p.name?.trim() || p.position?.trim()))
      .map((p, i) => ({
        sNo: String(i + 1),
        name: p.name || '',
        position: p.position || '',
        openingMeeting: p.openingMeeting || '',
        closingMeeting: p.closingMeeting || '',
      }));
    if (cleaned.length === 0) return false;
    set('participants', cleaned);
    if (!silent) toast.success(`Imported ${cleaned.length} participant(s) from F06`);
    return true;
  };

  // Merge the Lead Auditor / Auditor rows (name → Name, role → Position) into a
  // participant list, filling blank rows first and never duplicating an existing name.
  const mergeAuditors = (rows, auditTeam) => {
    const auditors = (auditTeam || [])
      .filter(m => m && AUDITOR_ROLES.includes(m.role) && m.name && String(m.name).trim())
      .map(m => ({ name: String(m.name).trim(), role: m.role }));
    let out = [...rows];
    auditors.forEach(a => {
      if (out.some(r => (r.name || '').trim().toLowerCase() === a.name.toLowerCase())) return;
      const idx = out.findIndex(r => !(r.name || '').trim() && !(r.position || '').trim());
      if (idx >= 0) out[idx] = { ...out[idx], name: a.name, position: a.role };
      else out = [...out, { ...EMPTY_P, name: a.name, position: a.role }];
    });
    return out;
  };

  // Fetch the Stage-2 audit dates from F02 (Application Review) and fill them here
  // when still blank, without overwriting dates already entered on this form.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const map = { auditDateFrom: fd.stage2DateFrom, auditDateTo: fd.stage2DateTo };
        Object.entries(map).forEach(([k, v]) => {
          if (v && !(data[k] && String(data[k]).trim())) set(k, v);
        });
      })
      .catch(() => { /* no F02 yet — keep defaults */ });
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Auto-prefill participants when this form's list is still empty: take the
  // attendees from F06 (Stage-1 Meetings) and add the Lead Auditor / Auditor from
  // F02's Audit Team Details (only those two roles). Both sources are fetched
  // together and applied in a single update, so there is no ordering race.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid || hasParticipantData()) return;
    let cancelled = false;
    Promise.all([
      axios.get(`/api/qms-forms/by-client/${cid}/6`).then(r => r.data).catch(() => null),
      axios.get(`/api/qms-forms/by-client/${cid}/2`).then(r => r.data).catch(() => null),
    ]).then(([f6, f2]) => {
      if (cancelled || hasParticipantData()) return;
      const fromF6 = (f6?.formData?.participants || [])
        .filter(p => p && (p.name?.trim() || p.position?.trim()))
        .map(p => ({
          sNo: '', name: p.name || '', position: p.position || '',
          openingMeeting: p.openingMeeting || '', closingMeeting: p.closingMeeting || '',
        }));
      const base = fromF6.length ? fromF6 : (data.participants || []);
      const merged = mergeAuditors(base, f2?.formData?.auditTeam);
      const hasAny = merged.some(p => p.name?.trim() || p.position?.trim());
      if (hasAny) set('participants', merged.map((r, i) => ({ ...r, sNo: String(i + 1) })));
    });
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Manual re-import (overwrites the current list with F06's attendees).
  const importFromF06 = () => {
    const cid = clientInfo?.clientId;
    if (!cid) { toast.error('No client selected'); return; }
    axios.get(`/api/qms-forms/by-client/${cid}/6`)
      .then(({ data: f6 }) => {
        if (!applyParticipants(f6?.formData?.participants)) {
          toast.error('No participants found in F06 (Stage-1 Meetings)');
        }
      })
      .catch(() => toast.error('Could not load F06 (Stage-1 Meetings)'));
  };

  return (
    <div>
      <SectionTitle>Meeting Details</SectionTitle>
      <FormRow cols={3}>
        <FormField label="Audit Date — Stage 2 (From)">
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={importFromF06}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} /> Import participants from F06 (Stage-1)
        </button>
      </div>
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
