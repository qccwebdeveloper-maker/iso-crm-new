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
   Seeded into each schedule row automatically (see the effect in Stage1Body
   below, and the matching one in Form09Stage2AuditPlan.js) whenever that row's
   Activity column is still empty, so the list always shows by default but stays
   fully editable — same as every other schedule cell. Exported so Stage 2
   (AUD-F-11) seeds identical Key Documents / Records for the same clauses. */
export const KEY_DOCUMENTS_BY_STANDARD = {
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
  'ISO 22000:2018': {
    'opening': 'Introduction of the audit team and organization representatives; confirmation of the audit scope, objectives, criteria and schedule; explanation of audit methods, sampling, confidentiality, communication and reporting arrangements; confirmation of food-safety requirements, site-access rules and required resources.',
    '4': 'Context analysis; internal & external issues; climate-change relevance; interested parties and their needs/expectations; climate-change related requirements; legal & other requirements; FSMS scope and boundaries; applicable products, processes and activities; FSMS processes and their interactions; documented scope and FSMS information.',
    '5': 'Top management commitment to FSMS; food safety policy and objectives; integration of FSMS into business processes; adequate resources; communication of food safety importance; achievement of intended FSMS outcomes; support for food safety culture; customer and regulatory requirements; continual improvement; management responsibility and accountability.',
    '5.2': "Food safety policy; suitability to organization's purpose and context; commitment to applicable food safety requirements; framework for FSMS objectives; communication of policy; policy availability to interested parties; employee awareness; policy review and maintenance; documented food safety policy records.",
    '5.3': 'FSMS organization chart; roles, responsibilities and authorities; Food Safety Team Leader responsibility; food safety team roles; responsibility for establishing, implementing, maintaining and updating FSMS; reporting FSMS performance to top management; communication of assigned responsibilities and authorities; documented responsibilities and authorities.',
    '6': 'FSMS risks & opportunities; internal/external issues and interested-party requirements; actions to address risks and opportunities; integration into FSMS processes; effectiveness of actions; consideration of changes; documented risk & opportunity records.',
    '6.2': 'FSMS objectives; measurable and monitored targets; consistency with food safety policy; applicable food safety requirements; objective action plans; resources, responsibilities and timelines; performance indicators; monitoring and evaluation of results; documented FSMS objectives and plans.',
    '6.3': 'FSMS changes; purpose and potential consequences of changes; integrity of FSMS; availability of resources; assignment of responsibilities and authorities; planned change implementation; change review and documented records.',
    '7': 'FSMS resources; competent people and food safety team; infrastructure and facilities; work environment conditions; externally developed FSMS elements and their suitability; control of externally provided processes, products and services; supplier approval/evaluation; specifications and verification records; documented resource and supplier control records.',
    '7.2': 'Competence requirements; competency of personnel affecting food safety; training and qualification records; food safety team competence; training needs; evaluation of training effectiveness; necessary skills and experience; documented evidence of competence.',
    '7.3': 'Food safety policy awareness; FSMS objectives; employee contribution to FSMS effectiveness; benefits of improved food safety performance; consequences of nonconformity; relevant food safety hazards; applicable food safety responsibilities; awareness/training records.',
    '7.4': 'Internal & external communication process; communication responsibilities and methods; food safety team communication; communication with suppliers, customers, contractors and authorities; food safety hazards and control information; documented communication records.',
    '7.5': 'FSMS documented information; required documents and records; document creation, identification, review and approval; document control, access, distribution, storage and retrieval; protection from loss or unauthorized changes; retention and disposition; control of external documents; documented information records.',
    '8': 'Operational criteria; control of processes; PRPs and food safety controls; product/process requirements; hazard control implementation; outsourced process controls; planned changes and control of unintended changes; verification of operational controls; documented operational records.',
    '8.2': 'PRP procedures and implementation; facility layout and zoning; cleaning & sanitation; pest control; personal hygiene; utilities and water quality; waste management; equipment maintenance; supplier controls; cross-contamination prevention; storage and handling conditions; PRP monitoring, verification and records.',
    '8.3': 'Traceability procedure; identification of product lots/batches; raw material and supplier traceability; processing history; product distribution records; traceability links between incoming materials and finished products; traceability test/verification; documented traceability records.',
    '8.4': 'Emergency preparedness procedure; potential emergencies and incidents; emergency response plans; food safety impact assessment; emergency communication; product withdrawal/recall arrangements; incident response actions; testing/drills; review of response effectiveness; updating procedures after incidents; documented emergency and incident records.',
    '8.5': 'Product/process information; flow diagrams and process steps; hazard identification and analysis; hazard assessment; selection of control measures; validation of control measures/combinations; HACCP/OPRP plan; CCP/OPRP controls and limits; monitoring and corrective actions; verification records; documented hazard control records.',
    '8.6': 'Review and update of PRPs and HACCP/OPRP plan; updated product/process information; hazard analysis changes; control measures and limits; monitoring and verification results; changes in processes, equipment or products; documented updated PRP and hazard control records.',
    '8.7': 'Monitoring and measuring equipment; suitability and calibration/verification; measurement methods; calibration status; protection from damage or deterioration; traceability to standards; review of measurement validity; action on equipment found unsuitable; calibration and verification records.',
    '8.8': 'Verification plan and activities; PRP verification; HACCP/OPRP plan verification; CCP/OPRP monitoring records; control measure effectiveness; verification results and trends; analysis of verification results; review of FSMS performance; corrective actions for deviations; documented verification and analysis records.',
    '8.9': 'Product/process nonconformity control; identification and correction of deviations; root cause and corrective actions; disposition of nonconforming products; assessment and control of potentially unsafe products; product release authorization; withdrawal/recall procedure; traceability and recall records; effectiveness verification and documented records.',
    '9': 'FSMS monitoring and measurement plan; PRP and hazard control monitoring results; CCP/OPRP performance; food safety objectives; verification results and trends; internal/external laboratory results; product/process performance data; analysis and evaluation of monitoring results; trends and FSMS effectiveness.',
    '9.2': 'Internal audit procedure; audit programme and schedule; audit criteria and scope; auditor competence and impartiality; FSMS conformity and effectiveness assessment; audit findings and reports; nonconformities and corrective actions; follow-up and effectiveness verification; communication of audit results; documented internal audit records.',
    '9.3': "Management Review Meeting (MRM) records; previous MRM actions; changes in internal/external issues; FSMS performance and effectiveness; food safety objectives; monitoring and verification results; audit results; nonconformities and corrective actions; supplier/customer issues; adequacy of resources; risks and opportunities; opportunities for improvement; decisions and actions for FSMS improvement; required changes; resource needs; documented MRM inputs, outputs and action records.",
    '10': 'Nonconformity identification and correction; root cause analysis; corrective action and effectiveness verification; continual improvement of FSMS suitability, adequacy and effectiveness; review of FSMS information; changes based on updated information; food safety team evaluation; documented NC, corrective action and FSMS update records.',
    'closing': 'Audit findings and conclusions; FSMS conformity/nonconformity summary; observations and improvement opportunities; audit evidence review; corrective action requirements; presentation of audit results; follow-up actions and timelines; client acknowledgement; closing meeting attendance records.',
  },
  'ISO/IEC 27001:2022': {
    'opening': 'Introduction of the audit team and organization representatives, confirmation of audit scope, objectives, criteria and schedule, explanation of the audit method and reporting process, communication arrangements, confidentiality, and confirmation of required resources.',
    '4': 'ISMS Context and Issues Register, Climate-Change Assessment, Interested Parties Register, Legal, Regulatory and Contractual Requirements Register, ISMS Scope Statement, Information Asset and Process Map, ISMS Manual, Risk Assessment and Treatment Records, Statement of Applicability, and applicable ISMS Procedures.',
    '5': 'Top management leadership and commitment to the ISMS; integration of information security into business processes; ISMS Manual; Information Security Objectives; Management Review Records; and Resource-Allocation Records.',
    '5.2': 'Information Security Policy; suitability to organizational purpose and context; policy approval, review and communication records; and evidence of policy availability to interested parties.',
    '5.3': 'Organization Chart; Roles and Responsibilities Matrix; Job Descriptions; Appointment and Authorization Records; and communication of information security roles, responsibilities and authorities.',
    '6': 'ISMS Risk and Opportunity Register, Information Security Risk Assessment Methodology, Asset Register, Risk Assessment Report, Risk Treatment Plan, Risk-Acceptance Records, Statement of Applicability, and Risk-Treatment Monitoring Records.',
    '6.2': 'Information Security Objectives and Targets, Objective Action Plan, Assigned Responsibilities, Required Resources, Target Completion Dates, Performance Indicators, Progress-Monitoring Records, and Effectiveness Evaluation Records.',
    '7': 'ISMS Resource Plan, Approved Budget, Manpower Records, IT Asset Register, Software and Licence Records, Infrastructure Maintenance Records, Information Security Tools and Service Records, and Management Review Records.',
    '7.2': 'Competence Matrix, Job Descriptions, Qualification and Experience Records, Training-Needs Analysis, Training Records, and Training Effectiveness Evaluation Records.',
    '7.3': 'Information Security Awareness Training Records, Employee Induction Records, Training Attendance Records, ISMS Policy Communication Records, Phishing or Security-Awareness Test Results, and Awareness Evaluation Records.',
    '7.4': 'ISMS Communication Procedure, Communication Matrix, Internal Communication Records, External Correspondence, Incident-Reporting Communications, Regulatory and Customer Notifications, and Communication Follow-up Records.',
    '7.5': 'Document Control Procedure, Master Document and Record List, ISMS Policies and Procedures, Document Review and Approval Records, Revision and Distribution Records, External Document Register, Record-Retention Records, Access-Control Records, and Obsolete Document-Control Records.',
    '8': 'ISMS Operational Control Procedures, Information Security Risk Treatment Plan, Statement of Applicability, Access-Control Records, Change-Management Records, Backup Records, Security Monitoring Logs, Incident Records, Supplier-Security Records, and Operational Review Records.',
    '8.2': "Information Security Risk Assessment Methodology, Asset Register, Risk Criteria, Risk Assessment Report, Risk Register, Risk Owners' Approval Records, and Risk Review Records.",
    '8.3': "Risk Treatment Plan, Statement of Applicability, Selected-Control Implementation Records, Residual-Risk Assessment, Risk Owners' Approval and Acceptance Records, and Risk-Treatment Progress Review Records.",
    '9': 'ISMS Monitoring and Measurement Plan, Information Security Performance Indicators, Security Monitoring Logs, Incident Statistics, Objective-Performance Records, Risk-Treatment Progress Records, Analysis Reports, and Effectiveness Evaluation Records.',
    '9.2': 'Internal Audit Procedure, Annual Audit Programme, Audit Plan, Audit Checklist, Internal Audit Report, Auditor Competence and Independence Records, Nonconformity Reports, and Corrective-Action Follow-up Records.',
    '9.3': 'Management Review Procedure, Meeting Notice and Agenda, Management Review Input Records, Meeting Minutes, Decisions and Action Plan, Attendance Records, Resource and Improvement Decisions, and Previous Action Follow-up Records.',
    '10.1': 'Nonconformity and Corrective-Action Procedure, Information Security Incident Records, Root-Cause Analysis, Correction and Corrective-Action Records, Effectiveness Evaluation Records, and Continual-Improvement Records.',
    'closing': "Presentation and discussion of audit findings, confirmation of nonconformities and corrective-action timelines, clarification of doubts, audit conclusion and recommendation, and acknowledgement by the organization's representatives.",
  },
  'ISO 45001:2018': {
    'opening': 'Introduction of audit team and auditee; confirmation of audit plan and schedule; roles and responsibilities; communication arrangements; confidentiality; safety/site requirements; availability of documents and resources; confirmation of opening meeting attendance.',
    '4': 'Context analysis; internal & external issues; climate-change relevance; interested parties and their needs/expectations; legal & other requirements; OH&S scope and boundaries; applicable activities, products & services; OH&S management system processes and their interactions; documented scope and system information.',
    '5': 'Top management leadership & accountability; OH&S policy/objectives alignment; integration of OH&S into business processes; resources; OH&S performance; worker support & participation; continual improvement; OH&S culture; incident/hazard reporting without reprisal; health & safety committee.',
    '5.2': 'OH&S policy; safe & healthy working conditions; prevention of work-related injury/ill health; OH&S objectives framework; commitment to legal & other requirements; hazard elimination & risk reduction; continual improvement; worker consultation & participation; policy communication, availability and relevance.',
    '5.3': 'Organization chart; OH&S roles, responsibilities & authorities; responsibility assignment; communication of roles; OH&S management system conformity responsibility; OH&S performance reporting to top management; documented responsibilities.',
    '5.4': 'Worker consultation & participation process; mechanisms, time, training & resources; OH&S information sharing; worker/representative involvement in policy, objectives, risk assessment, legal requirements, procurement/contractors, communication, emergency controls, audits, incidents & corrective actions; H&S committee records.',
    '6': 'OH&S risks & opportunities identification; hazards identification and risk assessment; OH&S and other risks; OH&S and other opportunities; legal & other requirements register; applicable requirements; action planning to address risks, opportunities and legal requirements; hierarchy of controls; implementation and effectiveness of actions; risks/opportunities arising from changes; documented risk & opportunity assessment records.',
    '6.2': 'OH&S objectives; measurable and monitored targets; consistency with OH&S policy; legal & other requirements; risk/opportunity considerations; worker consultation; action plan to achieve objectives; resources, responsibilities, timelines and performance indicators; evaluation of results; documented OH&S objectives and plans.',
    '7.1': 'Adequacy of resources; competent personnel; infrastructure & workplace facilities; equipment, PPE and safety resources; financial and operational resources; resources required for implementation, maintenance and continual improvement of the OH&S management system.',
    '7.2': 'Competence requirements; competency matrix; education, training, skills & experience records; training needs identification; safety training/induction; evaluation of training effectiveness; competency records of workers and contractors; documented evidence of competence.',
    '7.3': 'OH&S policy awareness; OH&S objectives and their contribution; awareness of hazards, OH&S risks and controls; worker contribution to OH&S management system effectiveness; consequences of nonconformity; relevant incidents and investigation findings; worker awareness records.',
    '7.4': 'OH&S communication process; what, when, with whom and how to communicate; internal & external OH&S communication; worker consultation and feedback; communication of OH&S policy, hazards, risks, controls and emergency information; communication with contractors, visitors and other interested parties; documented communication records.',
    '7.5': 'OH&S documented information; required documents and records; document creation and updating; identification, format and review/approval; document control, access, distribution, storage and retrieval; protection from loss or unauthorized changes; retention and disposition; control of external documents; documented information records.',
    '8': 'Operational controls and work instructions; hazard elimination and OH&S risk reduction measures; hierarchy of controls; management of planned/unplanned changes; change impact assessment; procurement controls; contractor selection and OH&S requirements; outsourced process controls; contractor performance and monitoring records; operational control records.',
    '8.2': 'Emergency preparedness and response procedure; identification of potential emergency situations; emergency plans and response measures; first-aid and emergency resources; emergency communication; worker training and awareness; evaluation of emergency response; periodic testing/drills; review after incidents/emergencies; documented emergency preparedness records.',
    '9': 'OH&S monitoring and measurement plan; performance indicators; monitoring, measurement, analysis and evaluation results; calibration/verification records where applicable; OH&S performance trends; legal and other requirements compliance evaluation; compliance status and actions; documented monitoring and compliance evaluation records.',
    '9.2': 'Internal audit procedure; audit programme and schedule; audit criteria and scope; auditor competence and impartiality; audit planning and implementation; audit findings and reports; nonconformities and corrective actions; follow-up and effectiveness verification; audit results communicated to relevant management; documented internal audit records.',
    '9.3': 'Management Review Meeting (MRM) records; previous MRM actions; changes in internal/external issues; OH&S risks & opportunities; OH&S policy and objectives; OH&S performance and trends; incidents, nonconformities and corrective actions; monitoring & measurement results; compliance evaluation; internal audit results; worker consultation/participation; resource adequacy; opportunities for continual improvement; MRM decisions, actions and responsibilities.',
    '10': 'Improvement opportunities; actions to achieve intended OH&S outcomes; incident reporting and investigation; nonconformity identification; root cause analysis; corrective action; hierarchy of controls; effectiveness verification; review of risks and opportunities; changes to OH&S management system; worker participation; documented incident, NC & corrective action records; roles and responsibilities.',
    'closing': 'Audit findings and conclusions; conformity/nonconformity summary; observations and opportunities for improvement; audit evidence review; corrective action requirements; presentation of audit results; next steps and follow-up; client acknowledgement and closing meeting records.',
  },
  'ISO 14001:2015': {
    'opening': 'Introduction of the audit team and organization representatives, confirmation of roles and responsibilities, audit scope, objectives, criteria, schedule, and communication arrangements.',
    '4': 'Context and Issues Register, Climate-Change Assessment, Interested Parties Register, Compliance Obligations Register, EMS Scope Statement, EMS Manual, Process Map, Environmental Aspect and Impact Register, and applicable EMS procedures.',
    '5': 'Top management leadership and commitment to the EMS; integration of environmental management into business processes; EMS Manual; Environmental Objectives; Management Review Records; and environmental performance review records.',
    '5.2': 'Environmental Policy; suitability to organizational purpose, context and scale of environmental impacts; policy approval, review and communication records; and evidence of policy availability to interested parties.',
    '5.3': 'Organization Chart; Roles and Responsibilities Matrix; Job Descriptions; Appointment/Authorization Letters; and communication of environmental roles, responsibilities and authorities.',
    '6': 'Environmental Risk and Opportunity Register, Environmental Aspect and Impact Register, Significance Evaluation Criteria, Life-Cycle Perspective Assessment, Compliance Obligations Register, Legal and Regulatory Requirements, Action Plans, Operational Control Measures, Responsible-Person and Target-Date Records, and Action Effectiveness Review Records.',
    '6.2': 'Environmental Objectives and Targets Register, Environmental Management Program/Action Plan, Assigned Responsibilities, Required Resources, Target Completion Dates, Environmental Performance Indicators, Progress-Monitoring Records, and Effectiveness Evaluation Records.',
    '7': 'Resource Planning and Allocation Records, Approved Budget, Manpower Records, Infrastructure and Equipment List, Maintenance Records, Monitoring and Measuring Equipment Records, Training Records, and Management Review Records.',
    '7.2': 'Competence Matrix, Job Descriptions, Qualification and Experience Records, Training-Needs Analysis, Training Plan, Training Attendance Records, Environmental Awareness/Skill Training Records, and Training Effectiveness Evaluation Records.',
    '7.3': 'Environmental Awareness Training Records, Induction Records, Training Attendance Records, Toolbox-Talk Records, and Awareness Evaluation Records.',
    '7.4': 'Communication Procedure, Communication Matrix, Internal Communication Records, External Correspondence, Regulatory Communications, Environmental Complaints Register, and Communication Follow-up Records.',
    '7.5': 'Document Control Procedure, Master Document and Record List, Document Review and Approval Records, Revision and Distribution Records, External Document Register, Retention Records, and Obsolete Document-Control Records.',
    '8': 'Operational Control Procedures, Work Instructions, Environmental Aspect and Impact Register, Waste-Management Records, Resource-Consumption Records, Emission/Effluent Monitoring Records, Chemical-Handling Records, and Contractor-Control Records.',
    '8.2': 'Emergency Preparedness and Response Procedure, Emergency Response Plan, Emergency Drill Records, Emergency Equipment Inspection Records, and Corrective-Action Records.',
    '9': 'Environmental Monitoring Plan, Monitoring and Measurement Records, Environmental Performance Data, Calibration Records, Compliance Obligations Register, Legal Compliance Evaluation Records, and Corrective-Action Records.',
    '9.2': 'Internal Audit Procedure, Annual Audit Programme, Audit Plan, Internal Audit Checklist, Audit Report, Auditor Competence Records, Nonconformity Reports, and Corrective-Action Follow-up Records.',
    '9.3': 'Management Review Procedure, Meeting Notice, Agenda, Management Review Inputs, Meeting Minutes, Decisions and Action Plan, Attendance Records, and Previous Action Follow-up Records.',
    '10': 'Nonconformity and Corrective-Action Procedure, NC Register, Incident and Complaint Records, Root-Cause Analysis, Correction and Corrective-Action Records, Effectiveness Evaluation Records, and Continual-Improvement Records.',
    'closing': "Closing Meeting: Presentation of audit findings, discussion of nonconformities and observations, confirmation of corrective-action timelines, clarification of doubts, audit conclusion and acknowledgement by the organization's representatives.",
  },
};

/* Resolve the Activity/Key Documents default text for a schedule row's Clauses
   cell — matches a numeric clause prefix ("5.2 Policy..." -> "5.2") or, for a
   manually-added agenda row, an Opening/Closing Meeting line. Shared by Stage 1
   (below) and Stage 2 (Form09Stage2AuditPlan.js), since both list identical
   clauses per standard. */
export function keyDocumentFor(docs, clauseText) {
  if (!docs) return null;
  const text = String(clauseText || '').trim();
  const no = text.match(/^\d+(?:\.\d+)?/)?.[0];
  if (no && docs[no]) return docs[no];
  if (/^opening meeting/i.test(text)) return docs.opening || null;
  if (/^closing meeting/i.test(text)) return docs.closing || null;
  return null;
}

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
      const docs = KEY_DOCUMENTS_BY_STANDARD[name];
      if (!docs) return;
      const rows = next[name] || [];
      let rowsChanged = false;
      const updated = rows.map(r => {
        if (r.activity && r.activity.trim()) return r;
        const doc = keyDocumentFor(docs, r.clauses);
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
