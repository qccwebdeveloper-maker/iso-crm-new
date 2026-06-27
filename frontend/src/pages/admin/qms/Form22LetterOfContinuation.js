import React from 'react';
import QMSFormPage, { FormRow, FormField, FInput, FTextarea, SectionTitle, StandardChips } from './QMSFormPage';

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
      formTitle="Letter of Continuation"
      defaultData={DEFAULT}
    >
      {({ data, set }) => (
        <div>
          <SectionTitle>Letter Reference</SectionTitle>
          <FormRow cols={2}>
            <FormField label="Reference No."><FInput value={data.refNo} onChange={v => set('refNo', v)} placeholder="QCC/.../01/26" /></FormField>
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
