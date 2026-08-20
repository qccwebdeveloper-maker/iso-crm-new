import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';
import useStandards, { clausesForStandards, deriveClientStandards } from './useStandards';
import AuditTeamResponsibilities from './AuditTeamResponsibilities';
import { FiChevronRight } from 'react-icons/fi';

/* Short code (e.g. "27001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

const ROLES = ['Lead Auditor','Auditor','Technical Expert','Application & Report Reviewer','HOD','Observer','Guide'];

const EMPTY_TEAM  = { name: '', role: '', stage2Days: '' };

// Fixed standard statement — displayed read-only, not editable.
const AUDIT_OBJECTIVES = `The objectives of the Stage-2 Certification Audit are to determine whether the organization’s implemented Management System conforms to the requirements of the applicable management system standard(s), is effectively implemented and maintained, and is capable of consistently achieving its intended outcomes.

The audit objectives include:

• To verify the effective implementation and conformity of the Management System with the applicable standard requirements.
• To evaluate the effectiveness of the organization’s processes in achieving planned results, objectives, and intended outcomes.
• To verify that the Management System is consistently implemented across all relevant functions, processes, and locations within the defined certification scope.
• To assess the effectiveness of operational controls, monitoring and measurement activities, and risk-based thinking in managing organizational processes.
• To verify compliance with applicable statutory, regulatory, legal, and customer/contractual requirements.
• To evaluate the effectiveness of internal audits, management reviews, corrective actions, and continual improvement activities.
• To confirm that identified risks, opportunities, and objectives are effectively managed and monitored.
• To verify the competence, awareness, communication, documented information, and availability of adequate resources supporting the Management System.
• To evaluate the organization’s capability to consistently provide products and/or services that meet customer and applicable statutory and regulatory requirements.
• To determine whether the Management System is suitable, adequate, effective, and capable of supporting certification.`;

export const DEFAULT = {
  idNo: '', orgName: '', address: '', contactPerson: '', contactDetails: '',
  auditType: '', auditStandards: '', auditPlanDate: '',
  auditDateFrom: '', auditDateTo: '', modeOfAudit: '', onlineMeetingLink: '',
  iafCode: '',
  auditObjectives: AUDIT_OBJECTIVES,
  auditLanguage: 'English',
  auditTeam: [{ ...EMPTY_TEAM }],
  // Audit schedule is kept separately per selected standard:
  //   { [standardName]: [ { dayTime, clauses, auditorName }, ... ] }
  schedules: {},
};

export default function Form09Stage2AuditPlan() {
  return (
    <QMSFormPage
      formType={9}
      formCode="AUD-F-11"
      formTitle="F11&F12 S2Plan&Schedule"
      defaultData={DEFAULT}
    >
      {(props) => <Stage2PlanBody {...props} />}
    </QMSFormPage>
  );
}

export function Stage2PlanBody({ data, set, clientInfo }) {
  const { byName, names, loading } = useStandards();

  // Standards the client selected in their Application Form (F01) drive the
  // schedule grouping — read from the live client record, falling back to a
  // snapshot saved on this form so it still renders when reopened from the list.
  const liveApp  = deriveClientStandards(clientInfo, names);
  const savedApp = Array.isArray(data.appStandards) ? data.appStandards : [];
  const stdNames = names.filter(k => liveApp.includes(k) || savedApp.includes(k));
  const schedules = data.schedules || {};
  const openMap   = data.scheduleOpen || {};

  // Snapshot the application standards into the form data once available, so the
  // schedule still renders after saving and reopening from the list.
  useEffect(() => {
    if (liveApp.length && JSON.stringify(savedApp) !== JSON.stringify(liveApp)) {
      set('appStandards', liveApp);
    }
  }, [clientInfo, names.length]); // eslint-disable-line

  // Audit Objectives is fixed, non-editable wording — keep it persisted so saved and
  // exported plans always carry the standard text (covers older forms saved before).
  useEffect(() => {
    if (data.auditObjectives !== AUDIT_OBJECTIVES) set('auditObjectives', AUDIT_OBJECTIVES);
  }, [data.auditObjectives]); // eslint-disable-line

  // Type of Audit is fetched from F02 (Application Review), filled when blank here.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        // Type of Audit is a read-only mirror of F02 — always reflect its value.
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');
        // Other planning details — Stage-2 dates here — filled when blank.
        const map = {
          contactPerson:     fd.contactPerson,
          contactDetails:    fd.contactNumbers,
          modeOfAudit:       fd.modeOfAudit,
          onlineMeetingLink: fd.onlineMeetingLink,
          iafCode:           fd.iafCode,
          auditDateFrom:     fd.stage2DateFrom,
          auditDateTo:       fd.stage2DateTo,
        };
        Object.entries(map).forEach(([k, v]) => {
          if (v && !(data[k] && String(data[k]).trim())) set(k, v);
        });
        // Audit team — carry auditors with Stage-2 man-days when none entered yet.
        const team = (fd.auditTeam || [])
          .filter(m => (m.name && m.name.trim()) || (m.role && m.role.trim()));
        const hasTeam = (data.auditTeam || []).some(m => m.name && m.name.trim());
        if (team.length && !hasTeam) {
          set('auditTeam', team.map(m => ({
            name: m.name || '', role: m.role || '',
            stage2Days: m.stage2Days != null ? String(m.stage2Days) : '',
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Seed each selected standard's schedule with its own clauses (Standard schema).
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

  const isOpen     = name => openMap[name] !== false; // default open
  const toggleOpen = name => set('scheduleOpen', { ...openMap, [name]: !isOpen(name) });

  const setTeam  = (ri,k,v)=>{ const t=[...(data.auditTeam||[])]; t[ri]={...t[ri],[k]:v}; set('auditTeam',t); };
  const setScheduleFor = (name, rows) => set('schedules', { ...(data.schedules || {}), [name]: rows });
  const setSched = (name, ri, k, v) => { const s=[...(schedules[name]||[])]; s[ri]={...s[ri],[k]:v}; setScheduleFor(name, s); };
  return (
          <div>
            <SectionTitle>1. Plan Information</SectionTitle>
            <FormRow cols={2}>
              <FormField label="1.1 ID No." required><FInput value={data.idNo} onChange={v=>set('idNo',v)} placeholder="Client ID" /></FormField>
              <FormField label="1.2 Organization Name" required><FInput value={data.orgName} onChange={v=>set('orgName',v)} /></FormField>
            </FormRow>
            <FormRow cols={1}><FormField label="1.3 Address"><FTextarea value={data.address} onChange={v=>set('address',v)} rows={2} /></FormField></FormRow>
            <FormRow cols={2}>
              <FormField label="1.4 Contact Person"><FInput value={data.contactPerson} onChange={v=>set('contactPerson',v)} /></FormField>
              <FormField label="Contact Details"><FInput value={data.contactDetails} onChange={v=>set('contactDetails',v)} /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.5 Type of Audit">
                <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
              </FormField>
              <FormField label="1.6 Audit Standard(s)"><StandardChips value={data.auditStandards} /></FormField>
            </FormRow>
            <FormRow cols={3}>
              <FormField label="1.7 Audit Plan Date"><FInput value={data.auditPlanDate} onChange={v=>set('auditPlanDate',v)} type="date" /></FormField>
              <FormField label="1.8 Audit Date From"><FInput value={data.auditDateFrom} onChange={v=>set('auditDateFrom',v)} type="date" /></FormField>
              <FormField label="Audit Date To"><FInput value={data.auditDateTo} onChange={v=>set('auditDateTo',v)} type="date" /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.9 Mode of Audit">
                <FSelect value={data.modeOfAudit} onChange={v=>set('modeOfAudit',v)} placeholder="Select" options={['Online','Onsite','Hybrid']} />
              </FormField>
              <FormField label="Online Meeting Link"><FInput value={data.onlineMeetingLink} onChange={v=>set('onlineMeetingLink',v)} placeholder="https://..." /></FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.10 Applicable IAF / EA Code"><FInput value={data.iafCode} onChange={v=>set('iafCode',v)} /></FormField>
              <FormField label="1.12 Language of Audit"><FInput value={data.auditLanguage} onChange={v=>set('auditLanguage',v)} placeholder="English" /></FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="1.11 Audit Objectives">
                <div className="qms-readonly-block">{AUDIT_OBJECTIVES}</div>
              </FormField>
            </FormRow>

            <SectionTitle>Audit Team Details</SectionTitle>
            <DynamicTable
              columns={[{key:'name',label:'Name',minWidth:140},{key:'role',label:'Role',type:'select',options:ROLES},{key:'stage2Days',label:'Stage-2 Man-days',minWidth:100}]}
              rows={data.auditTeam||[]} onAdd={()=>set('auditTeam',[...(data.auditTeam||[]),{...EMPTY_TEAM}])}
              onRemove={ri=>set('auditTeam',(data.auditTeam||[]).filter((_,i)=>i!==ri))} onCellChange={setTeam} addLabel="Add Team Member" />

            <AuditTeamResponsibilities />

            <SectionTitle>Audit Schedule — Stage 2</SectionTitle>
            {stdNames.length === 0 ? (
              <div className="aud3-empty">
                No ISO standards were selected in this client's Application Form (F01).
              </div>
            ) : (
              <div className="aud3-stack">
                {stdNames.map(name => {
                  const rows = schedules[name] || [];
                  const open = isOpen(name);
                  const meta = byName[name];
                  const cols = [
                    { key: 'dayTime',     label: 'Day & Time (From–To)', minWidth: 160 },
                    { key: 'clauses',     label: 'Clauses',              type: 'textarea', minWidth: 220 },
                    { key: 'auditorName', label: 'Auditor Name',         minWidth: 120 },
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
                        <span className="aud3-meta">
                          <span className="aud3-pill active">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
                        </span>
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
                              // Read the latest schedules so multi-step drags reorder correctly.
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
