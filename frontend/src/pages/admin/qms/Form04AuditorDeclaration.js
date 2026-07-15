import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';

// Includes the roles used in F02's Audit Team plus the legacy declaration roles,
// so both freshly-fetched and previously-saved roles display in the dropdown.
const ROLES = ['Lead Auditor','Auditor','Technical Expert','Application & Report Reviewer','Application Reviewer','Report Reviewer','HOD','Final Certification Decision by HOD','Guide','Observer'];
const EMPTY_SIG = { name: '', role: '', date: '', signature: '' };

const DEFAULT = {
  orgName: '', auditStandards: '',
  signatories: [
    { name: '', role: 'Lead Auditor',   date: '', signature: '' },
    { name: '', role: 'Auditor',        date: '', signature: '' },
    { name: '', role: 'Application Reviewer', date: '', signature: '' },
    { name: '', role: 'Final Certification Decision by HOD', date: '', signature: '' },
  ],
};

function Form04Inner({ data, set, clientInfo }) {
  const setSig = (ri, key, val) => {
    const s = [...(data.signatories || [])];
    s[ri] = { ...s[ri], [key]: val };
    set('signatories', s);
  };

  // Fetch the Audit Team from F02 (Application Review) and use them as the
  // declaration's signatories — only when none have been entered here yet, so a
  // saved/edited Form 04 is never overwritten.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    const hasNames = (data.signatories || []).some(s => s.name && s.name.trim());
    if (hasNames) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const team = (f2?.formData?.auditTeam || [])
          .filter(m => (m.name && m.name.trim()) || (m.role && m.role.trim()));
        if (team.length) {
          set('signatories', team.map(m => ({ name: m.name || '', role: m.role || '', date: '', signature: '' })));
        }
      })
      .catch(() => { /* no F02 yet — keep the default signatories */ });
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

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

      <SectionTitle>Declaration Statement</SectionTitle>
      <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 18px', marginBottom: 20, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
        <p>• I confirm that I don't have any relevant interest as below:</p>
        <ul style={{ marginLeft: 20, marginTop: 4 }}>
          <li>I didn't work with the applied / client organization in recent two years.</li>
          <li>I and QCC didn't supply any consulting, training and internal audit for the applied / client organization in recent two years.</li>
        </ul>
        <p>• I will act in accordance with QCC policy & procedures and won't reveal any secret information without approval of QCC and interested parties, conduct activities in accurate and impartial manner.</p>
        <p>• I will keep all other gained information through audit as confidential.</p>
        <p>• I shall perform my duties in accordance with ISO 19011.</p>
        <p style={{ marginTop: 8 }}><strong>I assure that if different from above, I'll be responsible for all relevant matters.</strong></p>
      </div>

      <SectionTitle>Signatories</SectionTitle>
      <DynamicTable
        columns={[
          { key: 'name',      label: 'Name',      minWidth: 160 },
          { key: 'role',      label: 'Role',      type: 'select', options: ROLES },
          { key: 'date',      label: 'Date',      type: 'date' },
          { key: 'signature', label: 'Signature', type: 'signature', minWidth: 220 },
        ]}
        rows={data.signatories || []}
        onAdd={() => set('signatories', [...(data.signatories || []), { ...EMPTY_SIG }])}
        onRemove={ri => set('signatories', (data.signatories || []).filter((_, i) => i !== ri))}
        onCellChange={setSig}
        addLabel="Add Signatory"
      />
    </div>
  );
}

export default function Form04AuditorDeclaration() {
  return (
    <QMSFormPage
      formType={4}
      formCode="AD-F-03"
      formTitle="Auditor(s) Declaration"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => (
        <Form04Inner data={data} set={set} clientInfo={clientInfo} />
      )}
    </QMSFormPage>
  );
}
