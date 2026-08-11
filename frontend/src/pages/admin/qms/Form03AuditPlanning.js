import React, { useEffect } from 'react';
import QMSFormPage, { SectionTitle } from './QMSFormPage';
import useStandards from './useStandards';
import { FiChevronRight } from 'react-icons/fi';

/* ============ Column catalogue (canonical display order) ============ */
const COLUMNS = [
  { id: 'initial',     label: 'Initial Audit',               sub: '',                type: 'check', removable: false },
  { id: 'csf_initial', label: 'Client-Specific Audit Focus', sub: 'Initial',         type: 'text',  removable: true  },
  { id: 'surv1',       label: 'Surveillance-I',              sub: '',                type: 'check', removable: true  },
  { id: 'csf_surv1',   label: 'Client-Specific Audit Focus', sub: 'Surveillance-I',  type: 'text',  removable: true  },
  { id: 'surv2',       label: 'Surveillance-II',             sub: '',                type: 'check', removable: true  },
  { id: 'csf_surv2',   label: 'Client-Specific Audit Focus', sub: 'Surveillance-II', type: 'text',  removable: true  },
  { id: 'recert',      label: 'Recertification',             sub: '',                type: 'check', removable: true  },
];

/* Short code (e.g. "9001") pulled from a standard name for the accordion mark. */
const stdCode = (name) => {
  const m = String(name || '').match(/(\d{4,5})/);
  return m ? m[1] : String(name || '').slice(0, 6);
};

/* All the standards the client selected in their Application Form (F01).
   The backend (/api/qms-forms/client/:id) returns `standards` as an array and also
   joins them into `isoStandard`; prefer the array, fall back to the joined string.
   `names` is the live catalogue fetched from the Standard schema — only standards
   that exist in the catalogue are kept, in catalogue order. */
function deriveClientStandards(clientInfo, names) {
  if (!clientInfo) return [];
  let tokens = [];
  if (Array.isArray(clientInfo.standards)) {
    tokens = clientInfo.standards;
  } else {
    const raw = [clientInfo.isoStandard, clientInfo.isoStandards, clientInfo.standard]
      .filter(Boolean)
      .join(',');
    tokens = raw.split(',');
  }
  tokens = tokens.map(s => String(s).trim()).filter(Boolean);
  // Match on the standard's numeric code (e.g. "27001") rather than an exact
  // string — the Application Form and the Standards catalogue don't always
  // write the same standard identically ("ISO 27001:2022" vs "ISO/IEC 27001").
  const tokenCodes = tokens.map(stdCode);
  return names.filter(k => tokenCodes.includes(stdCode(k)));
}

/* ISO/IEC 27001:2022 Annex A — Information Security Controls (93 controls, 4 themes).
   Fixed catalogue (not editable per-standard like clauses) — only shown for ISO 27001,
   matching the "Information Security Controls" block on the AUD-F-03A template sheet. */
const ANNEX_A_CONTROLS = [
  { group: 'Organizational Controls', items: [
    ['5.1','Policies for information security'], ['5.2','Information security roles and responsibilities'],
    ['5.3','Segregation of duties'], ['5.4','Management responsibilities'],
    ['5.5','Contact with authorities'], ['5.6','Contact with special interest groups'],
    ['5.7','Threat intelligence'], ['5.8','Information security in project management'],
    ['5.9','Inventory of information and other associated assets'], ['5.10','Acceptable use of information and other associated assets'],
    ['5.11','Return of assets'], ['5.12','Classification of information'],
    ['5.13','Labelling of information'], ['5.14','Information transfer'],
    ['5.15','Access control'], ['5.16','Identity management'],
    ['5.17','Authentication information'], ['5.18','Access rights'],
    ['5.19','Information security in supplier relationships'], ['5.20','Addressing information security within supplier agreements'],
    ['5.21','Managing information security in the ICT supply chain'], ['5.22','Monitoring, review and change management of supplier services'],
    ['5.23','Information security for use of cloud services'], ['5.24','Information security incident management planning and preparation'],
    ['5.25','Assessment and decision on information security events'], ['5.26','Response to information security incidents'],
    ['5.27','Learning from information security incidents'], ['5.28','Collection of evidence'],
    ['5.29','Information security during disruption'], ['5.30','ICT readiness for business continuity'],
    ['5.31','Legal, statutory, regulatory and contractual requirements'], ['5.32','Intellectual property rights'],
    ['5.33','Protection of records'], ['5.34','Privacy and protection of PII'],
    ['5.35','Independent review of information security'], ['5.36','Compliance with policies, rules and standards for information security'],
    ['5.37','Documented operating procedures'],
  ]},
  { group: 'People Controls', items: [
    ['6.1','Screening'], ['6.2','Terms and conditions of employment'],
    ['6.3','Information security awareness, education and training'], ['6.4','Disciplinary process'],
    ['6.5','Responsibilities after termination or change of employment'], ['6.6','Confidentiality or non-disclosure agreements'],
    ['6.7','Remote working'], ['6.8','Information security event reporting'],
  ]},
  { group: 'Physical Controls', items: [
    ['7.1','Physical security perimeters'], ['7.2','Physical entry'],
    ['7.3','Securing offices, rooms and facilities'], ['7.4','Physical security monitoring'],
    ['7.5','Protecting against physical and environmental threats'], ['7.6','Working in secure areas'],
    ['7.7','Clear desk and clear screen'], ['7.8','Equipment siting and protection'],
    ['7.9','Security of assets off-premises'], ['7.10','Storage media'],
    ['7.11','Supporting utilities'], ['7.12','Cabling security'],
    ['7.13','Equipment maintenance'], ['7.14','Secure disposal or re-use of equipment'],
  ]},
  { group: 'Technological Controls', items: [
    ['8.1','User endpoint devices'], ['8.2','Privileged access rights'],
    ['8.3','Information access restriction'], ['8.4','Access to source code'],
    ['8.5','Secure authentication'], ['8.6','Capacity management'],
    ['8.7','Protection against malware'], ['8.8','Management of technical vulnerabilities'],
    ['8.9','Configuration management'], ['8.10','Information deletion'],
    ['8.11','Data masking'], ['8.12','Data leakage prevention'],
    ['8.13','Information backup'], ['8.14','Redundancy of information processing facilities'],
    ['8.15','Logging'], ['8.16','Monitoring activities'],
    ['8.17','Clock synchronization'], ['8.18','Use of privileged utility programs'],
    ['8.19','Installation of software on operational systems'], ['8.20','Networks security'],
    ['8.21','Security of network services'], ['8.22','Segregation of networks'],
    ['8.23','Web filtering'], ['8.24','Use of cryptography'],
    ['8.25','Secure development life cycle'], ['8.26','Application security requirements'],
    ['8.27','Secure system architecture and engineering principles'], ['8.28','Secure coding'],
    ['8.29','Security testing in development and acceptance'], ['8.30','Outsourced development'],
    ['8.31','Separation of development, test and production environments'], ['8.32','Change management'],
    ['8.33','Test information'], ['8.34','Protection of information systems during audit testing'],
  ]},
];

/* Audit-stage checkbox columns for the Annex A controls table. */
const CONTROL_STAGES = [
  { id: 'stage1', label: 'Stage-1 Audit' },
  { id: 'stage2', label: 'Stage-2 Audit' },
  { id: 'sa1',    label: 'Surveillance-1 (SA1)' },
  { id: 'sa2',    label: 'Surveillance-2 (SA2)' },
  { id: 'ra',     label: 'Recertification (RA)' },
];

/* The AUD-F-03A "Information Security Controls" sheet prints the 93 controls
   as two side-by-side Clause|Stage-1|Stage-2|SA1|SA2|RA blocks (a print-width
   trick — 48 controls left, 45 right, splitting mid "Physical Controls").
   Reproduce that exact split here instead of one long vertical list. */
function splitControls(sections, at) {
  let seen = 0;
  const left = [];
  const right = [];
  for (const section of sections) {
    const remaining = at - seen;
    if (remaining <= 0) {
      right.push(section);
    } else if (section.items.length <= remaining) {
      left.push(section);
      seen += section.items.length;
    } else {
      left.push({ group: section.group, items: section.items.slice(0, remaining) });
      right.push({ group: section.group, items: section.items.slice(remaining) });
      seen += remaining;
    }
  }
  return [left, right];
}
const [ANNEX_A_LEFT, ANNEX_A_RIGHT] = splitControls(ANNEX_A_CONTROLS, 48);

const blankStd = () => ({ open: true, cols: COLUMNS.map(c => c.id), values: {}, notes: {}, controls: {} });

/* ───────────────────────── Inner interactive component ───────────────────────── */
function AuditProgramme({ data, set, clientInfo, isPreview }) {
  const { byName, names, loading } = useStandards();

  const byStd = data.byStd || {};

  // Standards the client picked in their Application Form (F01).
  //  - liveApp:  fetched from the client record loaded into the banner (search / edit).
  //  - savedApp: the same list snapshotted into this form's data the first time it loaded,
  //              so it still works when reopened later from the list view.
  const liveApp  = deriveClientStandards(clientInfo, names);
  const savedApp = Array.isArray(data.appStandards) ? data.appStandards : [];
  const appStandards = names.filter(k => liveApp.includes(k) || savedApp.includes(k));

  // Accordions mirror exactly the standards selected in the client's Application
  // Form (F01): one standard → one accordion, two standards → two, and so on.
  const orderedSelected = appStandards;

  // Snapshot the application standards into the form data once available, so the
  // list still shows the right standards when the form is reopened later.
  useEffect(() => {
    if (liveApp.length && JSON.stringify(savedApp) !== JSON.stringify(liveApp)) {
      set('appStandards', liveApp);
    }
  }, [clientInfo, names.length]); // eslint-disable-line

  const getStd  = key => ({ ...blankStd(), ...(byStd[key] || {}) });
  const setStd  = (key, patch) => set('byStd', { ...byStd, [key]: { ...getStd(key), ...patch } });

  return (
    <div>
      <SectionTitle>Audit Programme — Standards in Scope</SectionTitle>

      {loading ? (
        <div className="aud3-picker-empty">Loading standards…</div>
      ) : (
      <>
      {/* Standards in scope — taken straight from the client's application */}
      <div className="aud3-picker">
        <div className="aud3-picker-hd">
          Standards from the client's application{appStandards.length ? ` (${appStandards.length} selected)` : ''}
        </div>
        {appStandards.length === 0 ? (
          <div className="aud3-picker-empty">
            No ISO standards were selected in this client's Application Form (F01).
          </div>
        ) : (
          <div className="aud3-picker-grid">
            {appStandards.map(key => (
              <span key={key} className="aud3-chip on">{key}</span>
            ))}
          </div>
        )}
      </div>

      {/* Accordions */}
      <SectionTitle>3-Year Audit Programme — Initial, Surveillance &amp; Recertification</SectionTitle>
      {orderedSelected.length === 0 ? (
        <div className="aud3-empty">
          No standard selected in the Application Form (F01) yet.
        </div>
      ) : (
        <div className="aud3-stack">
          {orderedSelected.map(key => (
            <StandardCard
              key={key}
              stdKey={key}
              meta={byName[key]}
              st={getStd(key)}
              setStd={patch => setStd(key, patch)}
              isPreview={isPreview}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ───────────────────────── One standard accordion ───────────────────────── */
function StandardCard({ stdKey, meta, st, setStd, isPreview }) {
  const code = stdCode(stdKey);
  const desc = meta?.category || '';
  const catalogueClauses = Array.isArray(meta?.clauses) ? meta.clauses : [];
  // The read-only preview/print modal disables clicks (pointer-events:none), so a
  // standard that was left collapsed while editing could never be reopened there —
  // its whole clause table would be silently missing from the printed PDF. Force
  // every accordion open for that view regardless of the saved toggle state.
  const isOpen = isPreview || st.open;

  const setCheck = (rowKey, colId, val) => {
    const values = { ...st.values, [rowKey]: { ...(st.values[rowKey] || {}), [colId]: val } };
    setStd({ values });
  };
  const setNote = (colId, field, val) => {
    const notes = { ...st.notes, [colId]: { ...(st.notes[colId] || {}), [field]: val } };
    setStd({ notes });
  };
  const setControlCheck = (no, stageId, val) => {
    const controls = { ...st.controls, [no]: { ...(st.controls[no] || {}), [stageId]: val } };
    setStd({ controls });
  };

  // Clause rows come straight from the Standard schema.
  const rows = catalogueClauses.map((c, i) => ({ key: `f${i}`, num: c.no || '', title: c.text || '', desc: '' }));
  const N = rows.length;

  return (
    <section className={`aud3-std${isOpen ? ' open' : ''}`}>
      {/* header */}
      <button type="button" className="aud3-head" onClick={() => setStd({ open: !st.open })}>
        <span className="aud3-chev"><FiChevronRight size={18} /></span>
        <span className="aud3-mark">{code}</span>
        <span className="aud3-title">
          <span className="name">{stdKey}</span>
          {desc && <span className="desc">{desc}</span>}
        </span>
        <span className="aud3-meta">
          <span className="aud3-pill">{N} clauses</span>
          <span className="aud3-pill active">{COLUMNS.length} columns</span>
        </span>
      </button>

      {isOpen && (
        <div className="aud3-body">
          {/* table */}
          <div className="aud3-tscroll">
            <table className="aud3-table">
              <thead>
                <tr>
                  <th className="col-area">Sub-Clause / Audit Area</th>
                  {COLUMNS.map(c => (
                    <th key={c.id} className={`aud3-colhead ${c.type === 'check' ? 'col-check' : 'col-focus'}`}>
                      {c.label}{c.sub && <span className="sub">{c.sub}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const vals = (st.values || {})[r.key] || {};
                  return (
                    <tr key={r.key}>
                      <td className="area">
                        <div className="aud3-clause">
                          <span className="aud3-cnum">{r.num}</span>
                          <span>
                            <span className="aud3-ct">{r.title}</span>
                            {r.desc && <span className="aud3-cd">{r.desc}</span>}
                          </span>
                        </div>
                      </td>
                      {COLUMNS.map(c => {
                        const id = c.id;
                        if (c.type === 'check') {
                          return (
                            <td key={id} className="col-check">
                              <input
                                type="checkbox"
                                className="aud3-cbx"
                                checked={!!vals[id]}
                                onChange={e => setCheck(r.key, id, e.target.checked)}
                                aria-label={`${r.num} — ${c.label}`}
                              />
                            </td>
                          );
                        }
                        // merged focus column — render one cell on first row, spanning all clauses
                        if (i !== 0) return null;
                        const nv = (st.notes || {})[id] || {};
                        return (
                          <td key={id} className="csf-cell" rowSpan={N}>
                            <div className="aud3-csf-inner">
                              <div className="aud3-nf">
                                <div className="aud3-nf-label">Audit Notes</div>
                                <textarea
                                  className="aud3-ta aud3-nf-ta"
                                  value={nv.audit || ''}
                                  placeholder="Audit notes…"
                                  onChange={e => setNote(id, 'audit', e.target.value)}
                                />
                              </div>
                              <div className="aud3-nf">
                                <div className="aud3-nf-label">Seasonality Factors to be Considered</div>
                                <textarea
                                  className="aud3-ta aud3-nf-ta"
                                  value={nv.seasonality || ''}
                                  placeholder="Seasonality factors…"
                                  onChange={e => setNote(id, 'seasonality', e.target.value)}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Information Security Controls (ISO/IEC 27001 Annex A) — only shown on the
              ISO/IEC 27001:2022 standard's accordion, matching the fixed appendix on the
              AUD-F-03A sheet. Reproduced as the same two side-by-side blocks the source
              sheet prints. */}
          {code === '27001' && (
          <>
          <div className="aud3-ctl-hd">Information Security Controls</div>
          <div className="aud3-tscroll">
            <div className="aud3-ctl-split">
              <ControlsBlock sections={ANNEX_A_LEFT} controls={st.controls} onCheck={setControlCheck} />
              <ControlsBlock sections={ANNEX_A_RIGHT} controls={st.controls} onCheck={setControlCheck} />
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </section>
  );
}

/* One Clause|Stage-1|Stage-2|SA1|SA2|RA block of the Annex A controls table. */
function ControlsBlock({ sections, controls, onCheck }) {
  return (
    <table className="aud3-table aud3-ctl-table">
      <thead>
        <tr>
          <th className="col-area">Clause</th>
          {CONTROL_STAGES.map(s => (
            <th key={s.id} className="aud3-colhead col-check">{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sections.map(section => (
          <React.Fragment key={section.group}>
            <tr className="aud3-grouphead">
              <td colSpan={1 + CONTROL_STAGES.length}>{section.group}</td>
            </tr>
            {section.items.map(([no, text]) => {
              const cv = controls[no] || {};
              return (
                <tr key={no} title={text}>
                  <td className="area">
                    <span className="aud3-cnum">{no}</span>
                  </td>
                  {CONTROL_STAGES.map(s => (
                    <td key={s.id} className="col-check">
                      <input
                        type="checkbox"
                        className="aud3-cbx"
                        checked={!!cv[s.id]}
                        onChange={e => onCheck(no, s.id, e.target.checked)}
                        aria-label={`${no} — ${s.label}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

export default function Form03AuditPlanning() {
  return (
    <QMSFormPage
      formType={3}
      formCode="AUD-F-03A"
      formTitle="F03A Audit Planning for 3 years"
      defaultData={{}}
    >
      {({ data, set, clientInfo, isPreview }) => (
        <AuditProgramme data={data} set={set} clientInfo={clientInfo} isPreview={isPreview} />
      )}
    </QMSFormPage>
  );
}
