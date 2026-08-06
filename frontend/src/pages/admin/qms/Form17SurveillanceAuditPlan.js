import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';
import useStandards, { clausesForStandards, deriveClientStandards } from './useStandards';
import AuditTeamResponsibilities from './AuditTeamResponsibilities';
import { FiChevronRight } from 'react-icons/fi';

/* Short code (e.g. "9001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

const ROLES = ['Lead Auditor', 'Auditor', 'Technical Expert', 'Application & Report Reviewer', 'Guide', 'Observer'];
const EMPTY_TEAM = { name: '', role: '', competency: '', manDays: '' };

const SURV_OBJECTIVES = `The objectives of the Surveillance Audit are to verify the continued conformity, adequacy, implementation and effectiveness of the organization's Management System against the applicable standard requirements since the previous audit.

The audit objectives include:
1. To confirm the continued conformity of the management system with the applicable standard and the organization's documented requirements.
2. To verify the effectiveness of corrective actions taken against nonconformities raised in the previous audit.
3. To evaluate the use of certification marks / logo and compliance with accreditation requirements.
4. To review changes, if any, to the organization, its scope, processes, key personnel and management system since the last audit.
5. To assess the continued effectiveness of the management system with regard to achievement of objectives, internal audit, management review, customer feedback and continual improvement.`;

const DEFAULT = {
  idNo: '', orgName: '', address: '', contactPerson: '', contactDetails: '', email: '',
  auditType: 'Surveillance I', auditStandards: '', auditPlanDate: '',
  auditDateFrom: '', auditDateTo: '', modeOfAudit: '', onlineMeetingLink: '',
  iafCode: '', auditObjectives: SURV_OBJECTIVES, auditLanguage: 'English',
  auditTeam: [{ ...EMPTY_TEAM }],
  // Audit schedule kept per selected standard: { [standard]: [ {dayTime, clauses, auditorName, activity} ] }
  schedules: {},
};

export default function Form17SurveillanceAuditPlan() {
  return (
    <QMSFormPage
      formType={17}
      formCode="AUD-F-05 / 06"
      formTitle="Audit Plan & Schedule — Surveillance / Re-certification"
      defaultData={DEFAULT}
    >
      {(props) => <Body {...props} />}
    </QMSFormPage>
  );
}

function Body({ data, set, clientInfo }) {
  const { byName, names, loading } = useStandards();

  const liveApp  = deriveClientStandards(clientInfo, names);
  const savedApp = Array.isArray(data.appStandards) ? data.appStandards : [];
  const stdNames = names.filter(k => liveApp.includes(k) || savedApp.includes(k));
  const schedules = data.schedules || {};
  const openMap   = data.scheduleOpen || {};

  useEffect(() => {
    if (liveApp.length && JSON.stringify(savedApp) !== JSON.stringify(liveApp)) set('appStandards', liveApp);
  }, [clientInfo, names.length]); // eslint-disable-line

  // Pull plan details & audit team from the Surveillance Application (F16) — runs on
  // every client load so values entered in F16 flow in here (same as F19). Scalars
  // fill only when blank; team members are appended if not already present (by name).
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());
    axios.get(`/api/qms-forms/by-client/${cid}/16`)
      .then(({ data: f16 }) => {
        if (cancelled) return;
        const fd = f16?.formData || {};
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');
        const fill = (key, val) => { if (val && String(val).trim() && blank(data[key])) set(key, String(val)); };
        fill('iafCode', fd.iafCode);
        fill('auditPlanDate', fd.auditPlanDate);
        fill('auditDateFrom', fd.auditDateFrom);
        fill('auditDateTo', fd.auditDateTo);

        // Audit team — Lead Auditor / Auditor / Application & Report Reviewer from F16.
        const desired = [];
        if (!blank(fd.leadAuditor)) desired.push({ name: String(fd.leadAuditor).trim(), role: 'Lead Auditor', competency: '', manDays: fd.surveillanceManDay || '' });
        if (!blank(fd.auditor) && String(fd.auditor).trim().toUpperCase() !== 'N/A') desired.push({ name: String(fd.auditor).trim(), role: 'Auditor', competency: '', manDays: '' });
        if (!blank(fd.applicationReviewedBy)) desired.push({ name: String(fd.applicationReviewedBy).trim(), role: 'Application & Report Reviewer', competency: '', manDays: '' });
        const existing = (data.auditTeam || []).filter(m => m && m.name && String(m.name).trim());
        const haveName = n => existing.some(m => String(m.name).trim().toLowerCase() === n.toLowerCase());
        const toAdd = desired.filter(d => !haveName(d.name));
        if (toAdd.length) set('auditTeam', [...existing, ...toAdd]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Pull the Online Meeting Link and IAF / EA Code from the Application Review
  // (F02) — filling them here only when still blank. Mode of Audit already
  // mirrors from the client record, so it doesn't need a fetch.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        if (fd.onlineMeetingLink && blank(data.onlineMeetingLink)) set('onlineMeetingLink', fd.onlineMeetingLink);
        if (fd.iafCode && blank(data.iafCode)) set('iafCode', fd.iafCode);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Seed each selected standard's schedule with its clauses the first time.
  useEffect(() => {
    if (loading) return;
    const next = { ...(data.schedules || {}) };
    let changed = false;
    stdNames.forEach(name => {
      if ((next[name] || []).length) return;
      const cls = clausesForStandards(byName, name);
      if (cls.length) {
        next[name] = cls.map(c => ({ dayTime: '', clauses: `${c.no} ${c.text}`.trim(), auditorName: '' }));
        changed = true;
      }
    });
    if (changed) set('schedules', next);
  }, [loading, stdNames.join('|')]); // eslint-disable-line

  const isOpen = name => openMap[name] !== false;
  const toggleOpen = name => set('scheduleOpen', { ...openMap, [name]: !isOpen(name) });
  const setTeam = (ri, key, val) => { const t = [...(data.auditTeam || [])]; t[ri] = { ...t[ri], [key]: val }; set('auditTeam', t); };
  const setScheduleFor = (name, rows) => set('schedules', { ...(data.schedules || {}), [name]: rows });
  const setSched = (name, ri, key, val) => { const s = [...(schedules[name] || [])]; s[ri] = { ...s[ri], [key]: val }; setScheduleFor(name, s); };

  return (
    <div>
      <SectionTitle>1. Plan Information</SectionTitle>
      <FormRow cols={2}>
        <FormField label="1.1 ID No."><FInput value={data.idNo} onChange={v => set('idNo', v)} placeholder="Client / Certificate ID" /></FormField>
        <FormField label="1.2 Organization Name"><FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" /></FormField>
      </FormRow>
      <FormRow cols={1}>
        <FormField label="1.3 Address"><FTextarea value={data.address} onChange={v => set('address', v)} rows={2} placeholder="Address" /></FormField>
      </FormRow>
      <FormRow cols={3}>
        <FormField label="1.4 Contact Person"><FInput value={data.contactPerson} onChange={v => set('contactPerson', v)} placeholder="Contact person" /></FormField>
        <FormField label="Contact Details"><FInput value={data.contactDetails} onChange={v => set('contactDetails', v)} placeholder="+91 XXXXX" /></FormField>
        <FormField label="Email"><FInput value={data.email} onChange={v => set('email', v)} type="email" placeholder="name@example.com" /></FormField>
      </FormRow>
      <FormRow cols={2}>
        <FormField label="1.5 Type of Audit">
          <FSelect value={data.auditType} onChange={v => set('auditType', v)} placeholder="Select" options={['Surveillance I', 'Surveillance II', 'Re-certification']} />
        </FormField>
        <FormField label="1.6 Audit Standard(s)"><StandardChips value={stdNames} /></FormField>
      </FormRow>
      <FormRow cols={3}>
        <FormField label="1.7 Audit Plan Date"><FInput value={data.auditPlanDate} onChange={v => set('auditPlanDate', v)} type="date" /></FormField>
        <FormField label="1.8 Audit Date From"><FInput value={data.auditDateFrom} onChange={v => set('auditDateFrom', v)} type="date" /></FormField>
        <FormField label="Audit Date To"><FInput value={data.auditDateTo} onChange={v => set('auditDateTo', v)} type="date" /></FormField>
      </FormRow>
      <FormRow cols={2}>
        <FormField label="1.9 Mode of Audit">
          <FSelect value={data.modeOfAudit} onChange={v => set('modeOfAudit', v)} placeholder="Select mode" options={['Online', 'Onsite', 'Hybrid']} />
        </FormField>
        <FormField label="Online Meeting Link (if applicable)"><FInput value={data.onlineMeetingLink} onChange={v => set('onlineMeetingLink', v)} placeholder="https://..." /></FormField>
      </FormRow>
      <FormRow cols={2}>
        <FormField label="1.10 Applicable IAF / EA Code"><FInput value={data.iafCode} onChange={v => set('iafCode', v)} placeholder="IAF / EA Code" /></FormField>
        <FormField label="1.11 Language of Audit"><FInput value={data.auditLanguage} onChange={v => set('auditLanguage', v)} placeholder="English" /></FormField>
      </FormRow>
      <FormRow cols={1}>
        <FormField label="1.12 Audit Objectives"><FTextarea value={data.auditObjectives} onChange={v => set('auditObjectives', v)} rows={4} autoGrow readOnly /></FormField>
      </FormRow>

      <SectionTitle>Audit Team Details</SectionTitle>
      <DynamicTable
        columns={[
          { key: 'name', label: 'Name', minWidth: 140 },
          { key: 'role', label: 'Role', type: 'select', options: ROLES },
          { key: 'competency', label: 'Competency / Standard', minWidth: 160 },
          { key: 'manDays', label: 'Audit Man-days', minWidth: 90 },
        ]}
        rows={data.auditTeam || []}
        onAdd={() => set('auditTeam', [...(data.auditTeam || []), { ...EMPTY_TEAM }])}
        onRemove={ri => set('auditTeam', (data.auditTeam || []).filter((_, i) => i !== ri))}
        onCellChange={setTeam}
        addLabel="Add Team Member"
      />

      <AuditTeamResponsibilities />

      <div style={{ margin: '16px 0', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12.5, color: '#374151', lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 8 }}>Note:</div>
        <ol style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>If you have any objection regarding this audit plan, please inform us within 48 hours of receiving this schedule. Otherwise, the audit plan will be considered accepted.</li>
          <li>Failure to conduct the audit as scheduled due to non-availability of personnel, incomplete documentation, or any other unforeseen circumstances may result in the audit being postponed, rescheduled, or cancelled, as applicable.</li>
          <li>The audit will be conducted in accordance with the applicable certification requirements, and any significant nonconformities identified during the audit may affect the certification status or the continuation of the audit process, where applicable.</li>
        </ol>
        <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>Attachment:</div>
        <div>☐ Audit / Visiting Schedule</div>
      </div>

      <SectionTitle>Audit Schedule — Surveillance / Re-certification</SectionTitle>
      {stdNames.length === 0 ? (
        <div className="aud3-empty">No ISO standards were selected in this client's Application Form (F01).</div>
      ) : (
        <div className="aud3-stack">
          {stdNames.map(name => {
            const rows = schedules[name] || [];
            const open = isOpen(name);
            const meta = byName[name];
            const cols = [
              { key: 'dayTime', label: 'Day & Time (From–To)', minWidth: 160 },
              { key: 'clauses', label: 'Clauses', type: 'textarea', minWidth: 200 },
              { key: 'auditorName', label: 'Auditor Name', minWidth: 120 },
            ];
            return (
              <section key={name} className={`aud3-std${open ? ' open' : ''}`}>
                <button type="button" className="aud3-head" onClick={() => toggleOpen(name)}>
                  <span className="aud3-chev"><FiChevronRight size={18} /></span>
                  <span className="aud3-mark">{stdCode(name)}</span>
                  <span className="aud3-title">
                    <span className="name">{name}</span>
                    {meta?.category && <span className="desc">{meta.category}</span>}
                  </span>
                  <span className="aud3-meta"><span className="aud3-pill active">{rows.length} row{rows.length === 1 ? '' : 's'}</span></span>
                </button>
                {open && (
                  <div className="aud3-body" style={{ padding: 16 }}>
                    <DynamicTable
                      columns={cols}
                      rows={rows}
                      onAdd={() => setScheduleFor(name, [...rows, { dayTime: '', clauses: '', auditorName: '' }])}
                      onRemove={(ri) => setScheduleFor(name, rows.filter((_, i) => i !== ri))}
                      onMove={(from, to) => {
                        if (from === to || from == null || to == null) return;
                        set('schedules', prev => {
                          const cur = (prev && prev[name]) || [];
                          if (from >= cur.length || to >= cur.length) return prev;
                          const next = [...cur];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          return { ...prev, [name]: next };
                        });
                      }}
                      onCellChange={(ri, key, val) => setSched(name, ri, key, val)}
                      addLabel="Add Clause"
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
