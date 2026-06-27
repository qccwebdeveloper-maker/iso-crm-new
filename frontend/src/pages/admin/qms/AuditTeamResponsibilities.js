import React from 'react';
import { SectionTitle } from './QMSFormPage';

/* Shared, read-only "Audit Team Roles & Responsibilities" block used across the
   audit-plan forms (F05 Stage-1, F09 Stage-2, F17 Surveillance). */
export const ROLE_RESPONSIBILITIES = [
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

export default function AuditTeamResponsibilities() {
  return (
    <>
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
    </>
  );
}
