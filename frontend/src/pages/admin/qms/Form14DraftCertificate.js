import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, FSelect, SectionTitle, StandardChips } from './QMSFormPage';

const MS_TYPES  = ['Quality Management System','Environmental Management System','Occupational Health and Safety Management System','Food Safety Management System','Information Security Management System','Energy Management System'];

const DEFAULT = {
  orgName: '', managementSystemType: 'Quality Management System',
  standard: '', scopeOfCertification: '',
  confirmationPersonName: '', leadAuditor: '',
  certIssueDate: '', certNo: '', selectedStandard: '',
  multiSiteLocations: '',
  additionalNotes: '',
};

export default function Form14DraftCertificate() {
  return (
    <QMSFormPage
      formType={14}
      formCode="AUD-F-21"
      formTitle="AUD-F-21 Draft"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => <CertBody data={data} set={set} clientInfo={clientInfo} />}
    </QMSFormPage>
  );
}

function CertBody({ data, set, clientInfo }) {
  // Client Authorized Person ← F01 contact person; Assigned Lead Auditor ← F02 audit
  // team member with the "Lead Auditor" role. Both fill only when blank here.
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());

    axios.get(`/api/qms-forms/by-client/${cid}/1`)
      .then(({ data: f1 }) => {
        if (cancelled) return;
        const cp = f1?.formData?.contactPerson;
        if (cp && String(cp).trim() && blank(data.confirmationPersonName)) set('confirmationPersonName', String(cp).trim());
      })
      .catch(() => {});

    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const lead = (f2?.formData?.auditTeam || []).find(a => a && a.role === 'Lead Auditor' && a.name && String(a.name).trim());
        if (lead && blank(data.leadAuditor)) set('leadAuditor', String(lead.name).trim());
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line

  return (
        <div>
          <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
            <strong>Important:</strong> This content will be used in your certificate. Please write carefully and confirm. If you have a previous certificate, please note the details below.
          </div>

          <SectionTitle>Certificate Content</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Organization Name" required>
              <FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name as on certificate" />
            </FormField>
            <FormField label="Management System Type">
              <FSelect value={data.managementSystemType} onChange={v => set('managementSystemType', v)} placeholder="Select type" options={MS_TYPES} />
            </FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Standard (as on certificate)">
              <StandardChips value={data.standard} />
            </FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Scope of Certification" required>
              <FTextarea value={data.scopeOfCertification} onChange={v => set('scopeOfCertification', v)} rows={4}
                placeholder="Describe the scope of certification as it should appear on the certificate..." />
            </FormField>
          </FormRow>

          <SectionTitle>Confirmation Details</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Client Authorized Person Name">
              <FInput value={data.confirmationPersonName} onChange={v => set('confirmationPersonName', v)} placeholder="Authorized person name" />
            </FormField>
            <FormField label="Assigned Lead Auditor">
              <FInput value={data.leadAuditor} onChange={v => set('leadAuditor', v)} placeholder="Lead auditor name" />
            </FormField>
          </FormRow>

          <SectionTitle>Multi-Site Details (if applicable)</SectionTitle>
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#6b7280' }}>
            If you have more than 3 multi locations and/or each location's scope is different, please specify here.
          </div>
          <FormRow cols={1}>
            <FormField label="Multi-site Locations">
              <FTextarea value={data.multiSiteLocations} onChange={v => set('multiSiteLocations', v)} rows={3}
                placeholder="List additional site locations and their scopes..." />
            </FormField>
          </FormRow>

          <SectionTitle>Additional Notes</SectionTitle>
          <FormRow cols={1}>
            <FormField label="Additional Notes / Comments">
              <FTextarea value={data.additionalNotes} onChange={v => set('additionalNotes', v)} rows={3} placeholder="Any additional information..." />
            </FormField>
          </FormRow>
        </div>
  );
}
