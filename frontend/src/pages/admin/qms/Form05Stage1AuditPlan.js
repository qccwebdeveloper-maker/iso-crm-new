import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, DynamicTable, StandardChips } from './QMSFormPage';
import useStandards, { clausesForStandards, deriveClientStandards } from './useStandards';
import { FiChevronRight } from 'react-icons/fi';

/* Short code (e.g. "27001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

const ROLES = ['Lead Auditor','Auditor','Technical Expert','Application & Report Reviewer','HOD','Guide','Observer'];

const EMPTY_TEAM  = { name: '', role: '', competency: '', manDays: '' };

const ROLE_RESPONSIBILITIES = [
  {
    title: 'Lead Auditor / Team Leader – Responsibilities',
    intro: 'The Lead Auditor / Team Leader shall be responsible for the effective planning, management, execution, and reporting of the audit. Responsibilities include:',
    points: [
      'Leading, coordinating, and supervising the audit team throughout the audit process.',
      'Preparing and communicating the audit plan and agenda to the client within the agreed timeframe.',
      'Conducting the Opening Meeting to confirm the audit objectives, scope, criteria, methodology, and audit schedule.',
      'Guiding and supporting audit team members to ensure consistent and effective audit performance.',
      'Managing communication between the audit team and the auditee during the audit.',
      'Identifying, resolving, and communicating issues, concerns, or significant findings arising during the audit.',
      'Reviewing audit evidence and ensuring that audit findings are objective, accurate, and supported by evidence.',
      'Conducting the Closing Meeting and presenting audit conclusions, findings, and recommendations to the auditee.',
      'Ensuring that all audit documentation, reports, and records are completed accurately and submitted within the required timeframe.',
      'Ensuring confidentiality, impartiality, and compliance with certification body requirements throughout the audit process.',
      'Recommending the audit outcome based on objective evidence collected during the audit.',
      'Ensuring effective follow-up and communication regarding any identified nonconformities, opportunities for improvement, or audit-related matters.',
    ],
  },
  {
    title: 'Auditor – Responsibilities',
    intro: 'The Auditor shall be responsible for conducting assigned audit activities in accordance with the audit plan and under the direction of the Lead Auditor / Team Leader. Responsibilities include:',
    points: [
      'Conducting audit activities and collecting objective evidence in accordance with the audit plan and instructions provided by the Lead Auditor / Team Leader.',
      "Assessing compliance of the auditee's management system with applicable standard requirements, legal requirements, and organizational procedures.",
      'Recording audit observations, findings, nonconformities, and opportunities for improvement accurately and objectively.',
      'Preparing and submitting audit notes, findings, and reports to the Lead Auditor within the specified timeframe.',
      'Maintaining impartiality, confidentiality, professionalism, and adherence to the QCC Code of Conduct throughout the audit process.',
      'Communicating audit findings clearly and promptly to the Lead Auditor and relevant audit team members.',
      'Supporting the Lead Auditor in evaluating audit evidence and determining audit conclusions.',
      'Ensuring timely completion of assigned audit activities and contributing to the smooth and effective functioning of the audit process.',
      'Safeguarding all audit records, information, and documents obtained during the audit.',
      'Participating in audit team meetings, including preparation, review of findings, and closing discussions as required.',
    ],
  },
  {
    title: 'Technical Expert – Responsibilities',
    intro: "The Technical Expert shall provide specialized technical knowledge and support to the audit team to facilitate an effective and accurate assessment of the client's management system. The Technical Expert shall not make independent audit decisions unless authorized and competent to do so. Responsibilities include:",
    points: [
      'Assisting the Lead Auditor / Team Leader and auditors during the audit in accordance with the approved audit plan.',
      'Providing technical expertise and guidance on industry-specific processes, products, technologies, equipment, and regulatory requirements relevant to the audit scope.',
      "Advising the audit team on technical matters that may affect the evaluation of the effectiveness, conformity, and performance of the client's management system.",
      'Supporting the audit team in understanding complex technical processes and interpreting technical information and records.',
      'Assisting in the identification and evaluation of technical risks, operational controls, and compliance obligations relevant to the audit.',
      'Advising the audit team on technical issues identified during audit preparation, planning, execution, reporting, and follow-up activities.',
      'Providing objective technical input to support audit findings and conclusions based on factual evidence.',
      'Maintaining confidentiality, impartiality, and professional conduct throughout the audit process.',
      'Complying with all applicable QCC audit procedures, rules, regulations, and code of conduct requirements.',
      'Communicating technical observations and recommendations promptly to the Lead Auditor / Team Leader and supporting the effective functioning of the audit team.',
    ],
  },
  {
    title: 'Observer – Responsibilities',
    intro: 'An Observer may accompany the audit team for training, witnessing, accreditation, regulatory, or monitoring purposes and shall not participate in the audit decision-making process. Responsibilities include:',
    points: [
      'Complying with all applicable QCC audit procedures, rules, regulations, confidentiality requirements, and code of conduct.',
      'Observing the audit process without influencing the audit activities, audit findings, audit conclusions, or audit outcome.',
      'Refraining from interfering with communications between the audit team and the auditee.',
      'Maintaining impartiality, confidentiality, and professionalism throughout the audit process.',
      'Following the instructions of the Lead Auditor / Team Leader while present at the audit site.',
      'Not providing audit judgments, recommendations, or decisions regarding conformity, nonconformity, certification, or audit conclusions.',
      "Respecting the auditee's operational, safety, security, and confidentiality requirements during the audit.",
      'Ensuring that their presence does not disrupt or adversely affect the conduct and effectiveness of the audit.',
    ],
  },
  {
    title: 'Guide – Responsibilities',
    intro: 'A Guide may be appointed by the auditee to assist the audit team during the audit and facilitate effective communication and access to relevant areas, personnel, and information. Responsibilities include:',
    points: [
      'Coordinating and arranging contacts with relevant personnel and scheduling interviews as required by the audit plan.',
      'Facilitating access to specific departments, processes, facilities, and areas of the site as requested by the audit team.',
      'Ensuring that the audit team is informed of and complies with applicable site safety, security, hygiene, and operational requirements.',
      'Accompanying the audit team during site visits and witnessing the audit activities on behalf of the client, where appropriate.',
      'Providing clarification, factual information, and logistical support requested by the auditors to facilitate the audit process.',
      'Assisting in the collection and retrieval of relevant documents, records, and information required during the audit.',
      'Ensuring smooth communication between the auditee and the audit team throughout the audit.',
      'Respecting the independence of the audit process and refraining from influencing audit findings, conclusions, or outcomes.',
      'Maintaining confidentiality of information exchanged during the audit process.',
      'Supporting the efficient and effective conduct of the audit while ensuring minimal disruption to normal business operations.',
    ],
  },
];

/* Default "Activity / Key Documents / Records for Verification" text per clause,
   keyed by standard name then by the catalogue clause "no" (Admin > Standards).
   Seeded into each Stage-1 schedule row automatically (see the effect in
   Stage1Body below) whenever that row's Activity column is still empty, so the
   list always shows by default but stays fully editable — same as every other
   schedule cell. */
const STAGE1_KEY_DOCUMENTS = {
  'ISO 9001:2015': {
    '4': 'Context / Internal & External Issues Register, Climate Change Relevance Assessment, Interested Parties & Requirements Register, QMS Scope Statement, Process Map / Process Interaction, Key Procedures / SOPs, Process KPIs, and Risk & Opportunity Register.',
    '5': 'Quality Policy, Management Commitment Evidence, Roles & Responsibilities, QMS Objectives, Management Review Records, Customer Requirements / Contracts, Customer Feedback & Complaint Records, Customer Satisfaction Results, and Actions taken to improve customer satisfaction.',
    '5.2': 'Approved Quality Policy, Policy Review / Revision Records, Top Management Approval, Display / Distribution Records, Employee Awareness / Communication Records, Induction / Training Records, and Evidence that the policy is available to relevant interested parties.',
    '5.3': 'Organization Chart, Job Descriptions, Roles & Responsibilities Matrix, Delegation / Authority Matrix, Appointment / Responsibility Letters, Departmental Responsibilities, and Records of Communication of Roles, Responsibilities & Authorities.',
    '6': 'Risk & Opportunity Register, Risk Assessment / Action Plan, Process Risk Records, Mitigation Actions, Responsibility & Target Dates, and Effectiveness Review Records.',
    '6.2': 'Quality Objectives, Department-wise Targets / KPIs, Objective Monitoring Records, Action Plans, Responsibilities, Target Dates, Required Resources, and Achievement / Effectiveness Review Records.',
    '6.3': 'Change Management Procedure, Change Request / Approval Records, Impact & Risk Assessment, Implementation Plan, Updated Documents / Process Records, Responsibilities, and Post-change Effectiveness Review.',
    '7': 'Resource Plan / Resource Allocation Records, Organization Chart & Manpower Records, Infrastructure & Maintenance Records, Workplace Environment Monitoring Records, Calibration / Verification Records of Monitoring & Measuring Equipment, Equipment Register, and Organizational Knowledge / Lessons Learned / Technical Knowledge Records.',
    '7.2': 'Competency Matrix, Job Descriptions, Qualification & Experience Records, Training Plan, Training Attendance / Certificates, Skill Evaluation Records, and Training Effectiveness Records.',
    '7.3': 'Employee Awareness / Induction Records, Quality Policy Awareness, Quality Objectives Awareness, Roles & Responsibilities Communication, Training, Toolbox Talk Records, and Records of awareness regarding contribution to QMS effectiveness and consequences of nonconformity.',
    '7.4': 'Communication Procedure / Matrix, Internal Communication Records, External Communication Records, Meeting Minutes, Emails / Notices / Circulars, Customer & Supplier Communication Records, and Responsibility / Approval Records for Communication.',
    '7.5': 'Document Control Procedure, Master Document List, Approved Procedures / SOPs / Forms, Document Identification & Revision Records, Review and Approval Records, Distribution / Access Control Records, External Document Register, Obsolete Document Control Records, and Record Retention / Disposal Records.',
    '8': 'Operational Plans, Process Procedures / SOPs, Work Instructions, Process Control Records, Acceptance Criteria, Resource Requirements, Risk Controls, Inspection / Monitoring Records, and Records of Planned Changes / Outsourced Process Controls.',
    '8.2': 'Customer Enquiries / RFQs, Quotations, Contracts / Purchase Orders, Product / Service Requirement Specifications, Contract Review Records, Legal & Regulatory Requirements, Order Confirmation Records, and Records of Changes / Amendments to Customer Requirements.',
    '8.3': 'Design & Development Procedure / Plan, Design Inputs / Customer Requirements, Applicable Legal & Technical Requirements, Design Review Records, Verification & Validation Records, Design Drawings / Specifications / Outputs, Approval Records, Prototype / Testing Records, and Design Change / Revision Control Records.',
    '8.4': 'Approved Supplier / Vendor List, Supplier Evaluation & Re-evaluation Records, Purchase Orders / Contracts, Supplier Specifications / Requirements, Incoming Inspection Records, Outsourced Process Control Records, Supplier Performance Monitoring Records, and Records of Communication with External Providers.',
    '8.5': 'Production / Service Procedures and Work Instructions, Production / Service Records, Inspection & Monitoring Records, Identification & Traceability Records, Customer / Supplier Property Records, Storage / Handling / Preservation Records, Delivery & Post-delivery / Warranty Records, and Production / Service Change Approval & Control Records.',
    '8.6': 'Final Inspection / Testing Records, Acceptance Criteria, Product / Service Release Records, Delivery / Dispatch Approval, Certificate of Conformity / Inspection Report where applicable, and Authorized Release / Approval Records.',
    '8.7': 'Nonconforming Product / Service Register, NCR Reports, Identification & Segregation Records, Disposition / Rework / Repair Records, Concession / Approval Records, Re-inspection / Verification Records, and Corrective Action Records.',
    '9': 'KPI / Performance Monitoring Records, Inspection & Measurement Results, Customer Satisfaction Survey / Feedback Records, Complaint Records, Trend Analysis, Process Performance Reports, Quality Objective Monitoring, Supplier Performance Data, and Analysis / Evaluation Reports.',
    '9.2': 'Internal Audit Procedure, Annual Audit Programme / Plan, Audit Schedule, Audit Checklist, Internal Audit Reports, Auditor Competence / Independence Records, NC / Observation Records, Corrective Action Records, and Follow-up / Closure Verification Records.',
    '9.3': 'Management Review Procedure / Plan, MRM Notice & Agenda, Management Review Minutes, Review Inputs, Quality Objectives & KPI Results, Customer Feedback, Audit Results, Process Performance, NC / Corrective Action Status, Risks & Opportunities, Resource Needs, Improvement Opportunities, Decisions, Action Items, Responsibilities, and Follow-up Records.',
    '10': 'Improvement Plan / Opportunities Register, Nonconformity Reports, Root Cause Analysis Records, Correction & Corrective Action Records, Effectiveness Verification Records, Customer Complaint / Audit Finding Follow-up, KPI / Trend Improvement Records, Lessons Learned, and Continual Improvement Evidence.',
  },
};

export const DEFAULT = {
  idNo: '', orgName: '', address: '', contactPerson: '', contactDetails: '', email: '',
  auditType: '', auditStandards: '', auditPlanDate: '',
  auditDateFrom: '', auditDateTo: '', modeOfAudit: '', onlineMeetingLink: '',
  scopeOfCertification: '', iafCode: '',
  auditObjectives: `The objectives of the Stage-1 Audit are to determine the organization's readiness for the Stage-2 Certification Audit by evaluating the adequacy, implementation status, and effectiveness of the Management System documentation and processes.

The audit objectives include:
1. To assess the conformity and adequacy of the documented management system against the applicable standard requirements.
2. To review the status of implementation of the management system, including established policies, objectives, procedures, and documented information.
3. To evaluate the organization's internal audit programme and management review process to ensure they have been effectively planned and conducted.
4. To assess site-specific conditions, operational processes, infrastructure, equipment, and resources relevant to the scope of certification.
5. To verify identification and compliance evaluation of applicable statutory, regulatory, and legal requirements.
6. To assess the organization's preparedness for the Stage-2 Audit and identify any areas of concern that could be classified as nonconformities during Stage-2.
7. To confirm the certification scope, organizational context, interested parties, risks and opportunities, and understanding of applicable management system requirements.
8. To collect sufficient information regarding the management system, processes, locations, and activities to facilitate effective planning of the Stage-2 Audit.`,
  auditLanguage: 'English',
  auditTeam: [{ ...EMPTY_TEAM }],
  // Audit schedule is kept separately per selected standard:
  //   { [standardName]: [ { dayTime, clauses, activity, auditorName }, ... ] }
  schedules: {},
};

export default function Form05Stage1AuditPlan() {
  return (
    <QMSFormPage
      formType={5}
      formCode="AUD-F-05"
      formTitle="AUD-F-05 S1 Plan & Schedule"
      defaultData={DEFAULT}
    >
      {(props) => <Stage1Body {...props} />}
    </QMSFormPage>
  );
}

export function Stage1Body({ data, set, clientInfo }) {
  const { byName, names, loading } = useStandards();

  // Standards the client actually selected in their Application Form (F01) — read
  // from the live client record, NOT from any stale snapshot saved on this form.
  //  - liveApp:  resolved from the client record loaded into the banner.
  //  - savedApp: snapshotted into this form's data the first time it loaded, so the
  //              schedule still renders when the form is reopened from the list view.
  const liveApp  = deriveClientStandards(clientInfo, names);
  const savedApp = Array.isArray(data.appStandards) ? data.appStandards : [];
  const stdNames = names.filter(k => liveApp.includes(k) || savedApp.includes(k));
  const schedules = data.schedules || {};
  const openMap   = data.scheduleOpen || {};

  // Snapshot the application standards into the form data once available, so the
  // selection survives saving and reopening from the list.
  useEffect(() => {
    if (liveApp.length && JSON.stringify(savedApp) !== JSON.stringify(liveApp)) {
      set('appStandards', liveApp);
    }
  }, [clientInfo, names.length]); // eslint-disable-line

  // Fetch the planning details from F02 (Application Review) — e.g. mode of audit,
  // online meeting link, IAF code, contact details, scope — and fill any field that
  // is still blank here, without overwriting anything already entered on this form.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const fd = f2?.formData || {};
        const map = {
          contactPerson:        fd.contactPerson,
          contactDetails:       fd.contactNumbers,
          modeOfAudit:          fd.modeOfAudit,
          onlineMeetingLink:    fd.onlineMeetingLink,
          scopeOfCertification: fd.scopeOfCertification,
          iafCode:              fd.iafCode,
          auditDateFrom:        fd.stage1DateFrom,
          auditDateTo:          fd.stage1DateTo,
        };
        Object.entries(map).forEach(([k, v]) => {
          if (v && !(data[k] && String(data[k]).trim())) set(k, v);
        });
        // Type of Audit is a read-only mirror of F02 — always reflect its value.
        if (fd.auditType !== undefined) set('auditType', fd.auditType || '');
        // Audit team — carry over the auditors from F02 (name, role, Stage-1 man-days)
        // when none have been entered here yet.
        const team = (fd.auditTeam || [])
          .filter(m => (m.name && m.name.trim()) || (m.role && m.role.trim()));
        const hasTeam = (data.auditTeam || []).some(m => m.name && m.name.trim());
        if (team.length && !hasTeam) {
          set('auditTeam', team.map(m => {
            const md = m.stage1Days != null && String(m.stage1Days).trim() ? String(m.stage1Days).trim() : '';
            return { name: m.name || '', role: m.role || '', competency: '', manDays: md };
          }));
        }
      })
      .catch(() => { /* no F02 yet — keep application/defaults */ });
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  // Auto-fill each team member's Competency / Standard with the client's selected
  // ISO standard(s) — the same value shown at "1.6 Audit Standard(s)" — for any
  // row that doesn't have one entered yet (covers rows pulled from F02 above,
  // manually added rows, and previously-saved rows left blank).
  useEffect(() => {
    if (loading || !stdNames.length) return;
    const value = stdNames.join(', ');
    const rows = data.auditTeam || [];
    let changed = false;
    const next = rows.map(r => {
      if (r.competency && r.competency.trim()) return r;
      changed = true;
      return { ...r, competency: value };
    });
    if (changed) set('auditTeam', next);
  }, [loading, stdNames.join('|'), data.auditTeam]); // eslint-disable-line

  // Seed each selected standard's schedule with its own clauses (from the Standard
  // schema) the first time the form is opened with no rows yet for that standard.
  useEffect(() => {
    if (loading) return;
    const next = { ...(data.schedules || {}) };
    let changed = false;
    stdNames.forEach(name => {
      if ((next[name] || []).length) return;
      const cls = clausesForStandards(byName, name);
      if (cls.length) {
        // Same as AUD-F-11 (Stage 2 Plan & Schedule, Form09Stage2AuditPlan.js)
        // — one row per catalogue sub-clause, no grouping and no added
        // Opening/Closing Meeting rows, so Stage 1 and Stage 2 always list
        // identical clauses for a given standard.
        next[name] = cls.map(c => ({ dayTime: '', clauses: `${c.no} ${c.text}`.trim(), activity: '', auditorName: '' }));
        changed = true;
      }
    });
    if (changed) set('schedules', next);
  }, [loading, stdNames.join('|')]); // eslint-disable-line

  // Pre-fill each schedule row's "Activity / Key Documents / Records for
  // Verification" cell with the standard's default key-documents list for that
  // clause, for every standard we have a list for (currently ISO 9001:2015).
  // Only fills rows where the cell is still empty, so it shows by default on a
  // fresh/newly-seeded schedule without ever overwriting what a user typed.
  useEffect(() => {
    if (loading) return;
    const next = { ...(data.schedules || {}) };
    let changed = false;
    stdNames.forEach(name => {
      const docs = STAGE1_KEY_DOCUMENTS[name];
      if (!docs) return;
      const rows = next[name] || [];
      let rowsChanged = false;
      const updated = rows.map(r => {
        if (r.activity && r.activity.trim()) return r;
        const no = String(r.clauses || '').match(/^\d+(?:\.\d+)?/)?.[0];
        const doc = no && docs[no];
        if (!doc) return r;
        rowsChanged = true;
        return { ...r, activity: doc };
      });
      if (rowsChanged) { next[name] = updated; changed = true; }
    });
    if (changed) set('schedules', next);
  }, [loading, stdNames.join('|'), data.schedules]); // eslint-disable-line

  const isOpen   = name => openMap[name] !== false; // default open
  const toggleOpen = name => set('scheduleOpen', { ...openMap, [name]: !isOpen(name) });

  const setTeam = (ri, key, val) => {
    const t = [...(data.auditTeam || [])];
    t[ri] = { ...t[ri], [key]: val };
    set('auditTeam', t);
  };
  const setScheduleFor = (name, rows) => set('schedules', { ...(data.schedules || {}), [name]: rows });
  const setSched = (name, ri, key, val) => {
    const s = [...(schedules[name] || [])];
    s[ri] = { ...s[ri], [key]: val };
    setScheduleFor(name, s);
  };
  return (
          <div>
            <SectionTitle>1. Plan Information</SectionTitle>
            <FormRow cols={2}>
              <FormField label="1.1 ID No." required>
                <FInput value={data.idNo} onChange={v => set('idNo', v)} placeholder="Client / Application ID" />
              </FormField>
              <FormField label="1.2 Organization Name" required>
                <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="1.3 Address">
                <FTextarea value={data.address} onChange={v => set('address', v)} rows={2} placeholder="Address" />
              </FormField>
            </FormRow>
            <FormRow cols={3}>
              <FormField label="1.4 Contact Person">
                <FInput value={data.contactPerson} onChange={v => set('contactPerson', v)} placeholder="Contact person" />
              </FormField>
              <FormField label="Contact Details">
                <FInput value={data.contactDetails} onChange={v => set('contactDetails', v)} placeholder="+91 XXXXX" />
              </FormField>
              <FormField label="Email">
                <FInput value={data.email} onChange={v => set('email', v)} type="email" placeholder="name@example.com" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.5 Type of Audit">
                <FInput value={data.auditType} disabled placeholder="Auto-filled from Application Review (F02)" />
              </FormField>
              <FormField label="1.6 Audit Standard(s)">
                <StandardChips value={stdNames} />
              </FormField>
            </FormRow>
            <FormRow cols={3}>
              <FormField label="1.7 Audit Plan Date">
                <FInput value={data.auditPlanDate} onChange={v => set('auditPlanDate', v)} type="date" />
              </FormField>
              <FormField label="1.8 Audit Date From">
                <FInput value={data.auditDateFrom} onChange={v => set('auditDateFrom', v)} type="date" />
              </FormField>
              <FormField label="Audit Date To">
                <FInput value={data.auditDateTo} onChange={v => set('auditDateTo', v)} type="date" />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.9 Mode of Audit">
                <FSelect value={data.modeOfAudit} onChange={v => set('modeOfAudit', v)} placeholder="Select mode" options={['Online','Onsite','Hybrid']} />
              </FormField>
              <FormField label="Online Meeting Link (if applicable)">
                <FInput value={data.onlineMeetingLink} onChange={v => set('onlineMeetingLink', v)} placeholder="https://..." />
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="1.10 Scope of Certification">
                <FTextarea value={data.scopeOfCertification} onChange={v => set('scopeOfCertification', v)} rows={2} placeholder="Scope" />
              </FormField>
              <FormField label="1.11 Applicable IAF / EA Code">
                <FInput value={data.iafCode} onChange={v => set('iafCode', v)} placeholder="IAF / EA Code" />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="1.12 Audit Objectives">
                <FTextarea value={data.auditObjectives} onChange={v => set('auditObjectives', v)} rows={4} autoGrow readOnly />
              </FormField>
            </FormRow>
            <FormRow cols={1}>
              <FormField label="1.13 Language of Audit">
                <FInput value={data.auditLanguage} onChange={v => set('auditLanguage', v)} placeholder="English" />
              </FormField>
            </FormRow>

            <SectionTitle>Audit Team Details</SectionTitle>
            <DynamicTable
              columns={[
                { key: 'name',       label: 'Name',            minWidth: 140 },
                { key: 'role',       label: 'Role',            type: 'select', options: ROLES },
                { key: 'competency', label: 'Competency / Standard', minWidth: 160 },
                { key: 'manDays',    label: 'Stage-1 Man-days', minWidth: 80 },
              ]}
              rows={data.auditTeam || []}
              onAdd={() => set('auditTeam', [...(data.auditTeam || []), { ...EMPTY_TEAM }])}
              onRemove={ri => set('auditTeam', (data.auditTeam || []).filter((_, i) => i !== ri))}
              onCellChange={setTeam}
              addLabel="Add Team Member"
            />

            <SectionTitle>Audit Team Roles &amp; Responsibilities</SectionTitle>
            {ROLE_RESPONSIBILITIES.map((role, i) => (
              <div key={i} style={{ marginBottom: 16, border: '1px solid var(--gray-100)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: 'var(--primary-50)', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: 'var(--primary-dark)' }}>
                  {role.title}
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>{role.intro}</p>
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {role.points.map((pt, j) => (
                      <li key={j} style={{ fontSize: 12.5, color: 'var(--gray-700)', lineHeight: 1.55 }}>{pt}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}

            <SectionTitle>Audit Schedule — Stage 1</SectionTitle>
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
                    { key: 'dayTime',    label: 'Day & Time (From–To)', minWidth: 100 },
                    { key: 'clauses',    label: 'Clauses',             type: 'textarea', minWidth: 320 },
                    { key: 'auditorName',label: 'Auditor Name',        minWidth: 120 },
                    { key: 'activity',   label: 'Activity / Key Documents / Records for Verification', type: 'textarea', minWidth: 240 },
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
                            onAdd={() => setScheduleFor(name, [...rows, { dayTime: '', clauses: '', auditorName: '', activity: '' }])}
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
