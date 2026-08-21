import React, { useEffect } from 'react';
import axios from 'axios';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, SectionTitle, StandardChips } from './QMSFormPage';

/* Sets the letter Reference No. to the client ID only (the 4-digit number, no
   prefix/sign), when still blank — e.g. 8006. */
function RefNoFiller({ clientInfo, data, set }) {
  const cid = clientInfo?.clientId;
  const refNo = data.refNo;
  useEffect(() => {
    if (!cid) return;
    if (refNo && String(refNo).trim()) return; // keep a value already entered / saved
    set('refNo', String(cid));
  }, [cid, refNo]); // eslint-disable-line
  return null;
}

/* Pulls the Scope of Registration from the Application Review (F02) — filling
   it here only when still blank, so manual edits are preserved. */
function ScopeFetcher({ clientInfo, data, set }) {
  useEffect(() => {
    const cid = clientInfo?.clientId;
    if (!cid) return;
    let cancelled = false;
    const blank = v => !(v && String(v).trim());
    axios.get(`/api/qms-forms/by-client/${cid}/2`)
      .then(({ data: f2 }) => {
        if (cancelled) return;
        const scope = f2?.formData?.scopeOfCertification;
        if (scope && String(scope).trim() && blank(data.scopeOfRegistration)) set('scopeOfRegistration', String(scope).trim());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientInfo?.clientId]); // eslint-disable-line
  return null;
}

const DEFAULT = {
  refNo: '', letterDate: '',
  orgName: '', address: '', standard: '',
  subject: 'Continuation of Certificate',
  bodyText: 'Please accept our congratulations on the successful completion of the Surveillance Audit for your Management System Certification at your works / office for continued compliance towards the requirements of the applicable standard.',
  scopeOfRegistration: '',
  certificateNo: '', certificateValidTill: '', nextSurveillanceBy: '',
  signatoryName: 'RK Verma, Director',
  signatoryOrg: 'Quality Control Certification',
};

export default function Form22LetterOfContinuation() {
  return (
    <QMSFormPage
      formType={22}
      formCode="ADMN-F-01"
      formTitle="ADMN-F-01 Continuation Letter"
      defaultData={DEFAULT}
    >
      {({ data, set, clientInfo }) => (
        <div>
          <RefNoFiller clientInfo={clientInfo} data={data} set={set} />
          <ScopeFetcher clientInfo={clientInfo} data={data} set={set} />
          <SectionTitle>Letter Reference</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Reference No."><FInput value={data.refNo} onChange={v => set('refNo', v)} placeholder="e.g. 8006" /></FormField>
            <FormField label="Date"><FInput value={data.letterDate} onChange={v => set('letterDate', v)} type="date" /></FormField>
          </FormRow>

          <SectionTitle>Addressed To</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Organization Name"><FInput value={data.orgName} onChange={v => set('orgName', v)} placeholder="Organization name" /></FormField>
            <FormField label="Standard"><StandardChips value={data.standard} /></FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Address"><FTextarea value={data.address} onChange={v => set('address', v)} rows={2} placeholder="Address" /></FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Subject"><FInput value={data.subject} onChange={v => set('subject', v)} placeholder="Continuation of Certificate" /></FormField>
          </FormRow>

          <SectionTitle>Letter Body</SectionTitle>
          <FormRow cols={1}>
            <FormField label="Body Text"><FTextarea value={data.bodyText} onChange={v => set('bodyText', v)} rows={4} /></FormField>
          </FormRow>
          <FormRow cols={1}>
            <FormField label="Scope of Registration"><FTextarea value={data.scopeOfRegistration} onChange={v => set('scopeOfRegistration', v)} rows={3} placeholder="Scope" /></FormField>
          </FormRow>

          <SectionTitle>Certificate Validity</SectionTitle>
          <FormRow cols={3}>
            <FormField label="Certificate No."><FInput value={data.certificateNo} onChange={v => set('certificateNo', v)} placeholder="QCC/..." /></FormField>
            <FormField label="Certificate Valid Till"><FInput value={data.certificateValidTill} onChange={v => set('certificateValidTill', v)} type="date" /></FormField>
            <FormField label="Next Surveillance Audit By / Before"><FInput value={data.nextSurveillanceBy} onChange={v => set('nextSurveillanceBy', v)} type="date" /></FormField>
          </FormRow>

          <SectionTitle>Signatory</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Signatory Name & Designation"><FInput value={data.signatoryName} onChange={v => set('signatoryName', v)} placeholder="Name, Designation" /></FormField>
            <FormField label="Issuing Organization"><FInput value={data.signatoryOrg} onChange={v => set('signatoryOrg', v)} placeholder="Quality Control Certification" /></FormField>
          </FormRow>
        </div>
      )}
    </QMSFormPage>
  );
}
