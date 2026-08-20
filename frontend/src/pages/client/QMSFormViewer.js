import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import { FiEye, FiPrinter, FiFileText, FiClock } from 'react-icons/fi';

import { Stage1Body,       DEFAULT as F05_DEFAULT } from '../admin/qms/Form05Stage1AuditPlan';
import { Stage1ReportBody, DEFAULT as F07_DEFAULT } from '../admin/qms/Form07Stage1AuditReport';
import { OfiBody,          DEFAULT as F23_DEFAULT } from '../admin/qms/Form23OfiObservationSheet';
import { Stage2PlanBody,   DEFAULT as F09_DEFAULT } from '../admin/qms/Form09Stage2AuditPlan';
import { Stage2ReportBody, DEFAULT as F11_DEFAULT } from '../admin/qms/Form11Stage2AuditReport';
import { CarBody,          DEFAULT as F12_DEFAULT } from '../admin/qms/Form12CARRequest';

/* Read-only client view of the audit-side QMS forms. Reuses the exact same body
   components the admin/auditor fills in — the client just sees their own saved
   record with all inputs disabled, never a separate copy of the layout. */
const FORMS = {
  5:  { code: 'AUD-F-05',   title: 'F05 & F06 · Stage-1 Audit Plan & Schedule',   defaultData: F05_DEFAULT, Body: Stage1Body },
  7:  { code: 'AUD-F-09',   title: 'F09A · Stage-1 Audit Report',                 defaultData: F07_DEFAULT, Body: Stage1ReportBody },
  23: { code: 'AUD-F-09-B', title: 'F09-B · OFI / Observation Sheet',             defaultData: F23_DEFAULT, Body: OfiBody },
  9:  { code: 'AUD-F-11',   title: 'F11 & F12 · Stage-2 Audit Plan & Schedule',   defaultData: F09_DEFAULT, Body: Stage2PlanBody },
  11: { code: 'AUD-F-15',   title: 'F15A · Stage-2 Audit Report',                 defaultData: F11_DEFAULT, Body: Stage2ReportBody },
  12: { code: 'AUD-F-16',   title: 'F16 & F17 · Corrective Action Request (CAR)', defaultData: F12_DEFAULT, Body: CarBody },
};

const noop = () => {};

export default function QMSFormViewer() {
  const { formType } = useParams();
  const cfg = FORMS[Number(formType)];

  const [record,     setRecord]     = useState(null); // saved QMSForm doc, or null if none yet
  const [clientInfo, setClientInfo] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!cfg) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all([
      axios.get(`/api/qms-forms/my/${formType}`).catch(() => ({ data: null })),
      axios.get('/api/qms-forms/my-info').catch(() => ({ data: null })),
    ]).then(([formRes, infoRes]) => {
      if (!active) return;
      setRecord(formRes.data || null);
      setClientInfo(infoRes.data || null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [formType]); // eslint-disable-line

  if (!cfg) {
    return (
      <Layout title="Form not found">
        <div className="card"><div className="empty-box"><FiFileText size={36} /><h3>Form not found</h3></div></div>
      </Layout>
    );
  }

  if (loading) {
    return <Layout title={cfg.title}><div className="loading-box"><div className="spinner" /></div></Layout>;
  }

  const printPdf = () => {
    const prevTitle = document.title;
    const name = `${cfg.code}-${cfg.title}-${clientInfo?.company || clientInfo?.clientId || 'form'}`
      .replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    document.title = name;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const { Body } = cfg;

  return (
    <Layout title={cfg.title}>
      <div className="qms-wrap">
        <div className="qms-header-card">
          <div className="qms-header-left">
            <div className="qms-header-icon"><FiFileText size={20} color="white" /></div>
            <div>
              <div className="qms-form-code">{cfg.code}</div>
              <h2 className="qms-form-title">{cfg.title}</h2>
            </div>
          </div>
          {record && (
            <button
              type="button"
              onClick={printPdf}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FiPrinter size={13} /> Print / Save as PDF
            </button>
          )}
        </div>

        {!record ? (
          <div className="qms-list-card">
            <div className="qms-list-empty">
              <div className="qms-list-empty-icon"><FiClock size={26} color="var(--primary)" /></div>
              <h3>Not filled yet</h3>
              <p>Your auditor hasn't completed this form yet. It will appear here once they save it.</p>
            </div>
          </div>
        ) : (
          <div className="qms-form-area">
            <div className="qms-form-card">
              <div className="qms-preview-ro-badge" style={{ marginBottom: 14 }}>
                <FiEye size={11} /> Read-only — filled by your auditor
              </div>
              <div style={{ pointerEvents: 'none', userSelect: 'text' }}>
                <Body
                  data={{ ...cfg.defaultData, ...(record.formData || {}) }}
                  set={noop}
                  clientInfo={clientInfo}
                  isPreview
                  onSaveDraft={noop}
                  onSave={noop}
                  saving={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
