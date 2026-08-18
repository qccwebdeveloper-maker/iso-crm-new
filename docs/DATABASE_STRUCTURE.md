# Database Structure

**Stack:** MongoDB Atlas + Mongoose ODM (no Prisma/SQL layer). Models live in `backend/models/*.js`.

## Connection

- **Setup:** `backend/config/db.js`, called from `backend/server.js` after `dotenv.config()`.
- **Driver:** Mongoose (`mongoose.connect`).
- **Connection string:** `MONGODB_URI` env var, set in `backend/.env` (not documented here).
- **Database name:** not set explicitly (no `dbName` option) — whatever database is embedded in the actual `MONGODB_URI` value, or Mongoose's default (`test`) if none is specified there.
- **Connection options:** `serverSelectionTimeoutMS: 15000`, `retryWrites: true`, `retryReads: true`, `w: 'majority'`, `heartbeatFrequencyMS: 10000`, `socketTimeoutMS: 45000`, `maxPoolSize: 10`. Reconnect loop retries up to 5 times with backoff. DNS forced to `8.8.8.8` / `8.8.4.4` / `1.1.1.1` to work around ISP SRV blocking.
- **Related env vars** (names only, no values): `MONGODB_URI`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_PASS`, `ADMINJS_ENABLED`, `ADMINJS_ROOT_PATH`, `ADMINJS_COOKIE_SECRET`.

> ⚠️ **Flag for follow-up:** `backend/config/db.js` (~line 25) has a hardcoded fallback `mongodb+srv://` connection string with embedded credentials, used if `MONGODB_URI` is unset. That means live DB credentials are committed to source, not only held in `.env`. Given the prior backdoor/DB-wipe incident, this is worth rotating and removing separately — not addressed by this doc.

---

## Collections

### User — `users` (`backend/models/User.js`)

| Field | Type | Notes |
|---|---|---|
| name | String | required, trim |
| email | String | required, lowercase, trim — **no `unique` constraint at DB level** |
| password | String | required, bcrypt-hashed, stripped from `toJSON` |
| role | String | enum: `admin, client, auditor, reviewer, sales` — required |
| company, country, phone | String | trim |
| isActive | Boolean | default `true` |
| pendingApproval | Boolean | default `false` |
| clientId | String | sequential 4-digit id (`backend/utils/clientId.js`) |
| address, isoStandard, scope | String | |
| profileImage | String | |
| assignedApplications | [ObjectId] → Application | |
| notifications | [subdoc] | `message` (required), `type` (enum: info/warning/success/error, default info), `read` (Boolean, default false), `link`, `createdAt` |

Timestamps: yes. No explicit indexes.
**Data-integrity gap:** `email` has no unique index — duplicate accounts are possible at the DB layer.

---

### Application — `applications` (`backend/models/Application.js`)

Central hub collection. Key fields:

| Field | Type | Notes |
|---|---|---|
| applicationId | String | **unique, sparse** — auto-generated `APPnnnn` via `pre('save')` hook |
| refno | String | |
| status | String | enum: `draft, submitted, under_review, audit_stage1, audit_stage2, approved, certified, rejected` (default `draft`) |
| progressPercentage | Number | default 0 |
| progressStages | [String] | |
| organizationName, organizationAbbr, address, address1, additionalSites, city, state, country (default `India`), pincode, website, contactNumbers, emailId, contactPerson, designation | String | |
| modeOfWorking | String | enum: `Online, Onsite, Hybrid, ''` (default `Onsite`) |
| hybridCoreActivities, scopeOfCertification, scope | String | |
| isoStandard | String | |
| standards | [String] | |
| mainProcesses, outsourcedProcesses, othersStandard | String | |
| applicationType | String | default `Initial` |
| accreditationBody | String | default `NABCB` |
| totalEmployees, contractual, workingShifts (default 1), remotePersonnel | Number/String | mixed |
| empTable | Mixed | 2D array default |
| employeeCount | Object | `{headOffice, branches, temporary, total}`, all Number default 0 |
| legalAct, keyProcessArea, productsServices, outsourcingProcess, consultantDetails | String | |
| establishmentDate, manualDate, internalAuditDate, managementReviewDate, certIssueDate, certExpiryDate | Date | |
| alreadyCertified | Boolean | default false |
| certStandard, certBody | String | |
| combinedAudit, jointAudit, integratedAudit, separateAudit, internalAuditCombined, mrmCombined, manualCombined, systemIntegrated, integratedApproach, integratedMgmt, integrationPercentage | String | audit-type flags |
| annualEnergyConsumption, enmsPersonnels, energySources, significantEnergyUses | String/Number | ISO 50001 fields |
| locationConditions | [String] | |
| airEmissionFacility, wastewaterFacility, wastesAmount, hazardousChemicals, pollutionClearance, criticalAspectsOHSAS, envAspectDetails, personnelOnSite, personnelAwayFromSite, risksAwayFromSite, ohsmsSignificantRisk, notRegulatedByLaw, relevantLaws | String | ISO 14001/45001 fields |
| client, assignedAuditor, assignedReviewer | ObjectId → User | default null |
| auditAcceptanceStatus | String | enum: `pending, accepted, rejected, null, ''` |
| auditAcceptedDate | Date | |
| applicationForm, agreement, signedForm, auditReport, reviewReport, proofId | String | S3 links |
| certificate | Object | `{url, issuedAt}` |
| uploadedDocuments | [subdoc] | `name, originalName, path, publicId, docType, uploadedBy (→User), uploadedAt` |
| paymentStatus | String | enum: `pending, partially_received, received` (default `pending`) |
| paymentAmount | Number | default 0 |
| paymentDate | Date | |
| auditNotes, reviewNotes, adminNotes | String | default `''` |
| feedbacks | [subdoc] | `from (→User), role, message, rating (1-5), createdAt` |
| submittedAt | Date | |

Schema options: `{ timestamps: true, strict: false }` (extra ad-hoc fields are allowed through).
Hook: `pre('save')` generates `applicationId` as `APP1000`, `APP1001`, … with collision guard.

---

### ApplicationReview — `applicationreviews` (`backend/models/ApplicationReview.js`)

Review/manday-calculation record tied 1:1(ish) to an Application.

- `applicationRef` → Application
- Basic info: `idNo, organizationName, address, contactPerson, contactNumbers, personsUnderCertification, auditType1 (default "Stage I"), auditType2 (default "Stage II"), auditStandards, modeOfAudit (default "Onsite"), meetingLink, scopeOfCertification, auditLanguage (default "English"), iafCode`
- Transfer: `isTransfer` (enum Yes/No, default No), `ncClosed`, `ncReason`, `transferFromIAF`, `certValidityDate`
- `risk`: enum `H, M, L, ''`
- `auditTeam`: [subdoc] `role, name, stage1Days, stage2Days`
- `totalManDays`, `totalManDaysStages`, `totalManDaysIAF`
- Dates: `stage1From/To`, `stage2From/To`, `reviewerDate`, `verificationDate`
- `reviewerName`, `verificationName`
- ~10 ISMS manday fields (`ismsPersonsControl` … `ismsITComplexity`)
- ~24 IMS integrated manday fields (`imsOrgName` … `imsTotalIntegratedTime`)
- `reviewStatus`: enum `draft, submitted, approved` (default `draft`)
- `reviewedBy` → User

Timestamps: yes.

---

### AuditReport — `auditreports` (`backend/models/AuditReport.js`)

Full audit lifecycle report (application review → stage 1 → stage 2 → certificate/review), organized by form section:

- Ownership: `createdBy` (→User, required), `clientId`, `client` (→User), `assignedAuditor` (→User), `status` (enum: draft/in_progress/completed, default draft)
- §2.1 org info: `refNo, orgName, address, additionalSites, contactNumber, email, contactPerson, designation, modeOfWorking, hybridDetails, scope, mainProcesses, outsourcedProcesses`
- §2.3: `applicationType, totalEmployees, contractual (Number), shifts, fullTime, partTime, performingSameJob, tempUnskilled`
- §2.2: `standards` [String]
- §2.4: `personnel` (Mixed)
- §2.5: `legalActs, keyProcessArea, products, outsourcingProcess, consultantDetails, establishmentDate, manualDate, internalAuditDate, mrmDate, alreadyCertified (Boolean), certStandards, certBody, certIssue, certExpiry`
- §2.6: `integration` (Mixed)
- Planning (AUD-F-03): `auditTeam` [subdoc: name/role/stage1MD/stage2MD], `stage1From/To`, `stage2From/To`, `iafCode, risk, meetingLink, modeOfAudit, applicationDate, applicationReviewDate, after11Month, stage1AuditPlan, stage2AuditPlan`
- Stage 1 report (AUD-F-09): `s1OrgBrief, s1Duration, s1EmployeeChanged (Boolean), s1ScopeChanged (Boolean), s1Clauses (Mixed), s1MinorNC/s1MajorNC/s1Obs/s1OFI (Number), s1Readiness, s1Recommendation, s1NCs` [subdoc: standard/type/clause/detail/process], `s1Observations` [subdoc: standard/clause/detail]
- Stage 2 report (AUD-F-15): `s2Duration, s2Deviations, s2SignificantIssues, s2Changes, s2MinorNC/s2MajorNC/s2Obs/s2OFI (Number), s2Recommendation, s2NCs, s2Observations` (same subdoc shapes as stage 1), `s2RootCause, s2Correction, s2CorrectiveAction, s2CompletionDate`
- Certificate & review (AUD-F-21/22): `certSystem (default "Quality Management System"), certReqStandard, certScope, certIssueDate, certNumber, clientAuthPerson, auditTeamLeader, reviewDecision, reviewDate, hodDecision, hodReviewDate`

Timestamps: yes.

---

### AuditorSignature — `auditorsignatures` (`backend/models/AuditorSignature.js`)

Standalone lookup table for stored auditor signature images.

- `name`: String, required, trim
- `nameKey`: String, required, trim, lowercase, **unique** (auto-derived from `name` via `pre('validate')`)
- `location`: String, trim
- `signatureUrl`: String, default `''`

Timestamps: yes.

---

### CertSetting — `certsettings` (`backend/models/CertSetting.js`)

Singleton-style settings document (no unique key — maintained as one doc by app logic).

- `title` (default "Certificate of Registration")
- `authority` (default "QC Certification Pvt Ltd")
- `validityYears`: Number, default 3
- `footerText`: String, default text
- `accreditation`: default "NABCB"

Timestamps: yes.

---

### Certificate — `certificates` (`backend/models/Certificate.js`)

- `orgName`, `standard`: required
- `scope, address, additionalSites, contactPerson, designation, contactNumber, email, auditorName`: String
- `auditorRole`: enum `Lead Auditor, Auditor, Technical Expert, ''`
- `iafCode`, `accreditation` (default "NABCB")
- `certNumber`: String, required, **unique**
- `clientId`: String
- `issueDate, expiryDate, surveillanceDate, surveillanceDate2, originalCertDate`: Date
- `notes`: String
- Layout tuning: `orgTop, addressTop, scopeTop, orgSize, addressSize, scopeSize` (Number)
- `linkedApplication` → Application, default null

Timestamps: yes.

---

### Document — `documents` (`backend/models/Document.js`)

Generic uploaded-file record (S3-backed).

- `name, originalName`: String
- `path`: String, required (S3 presigned link)
- `publicId`: String, required (S3 object key)
- `s3Key`, `storageUrl`: String
- `docType`: enum `applicationForm, agreement, signedForm, auditReport, reviewReport, certificate, proofId, document` (default `document`)
- `applicationId` (String) + `application` (→Application)
- `clientId` (String) + `client` (→User)
- `uploadedBy` → User; `uploadedByName`: String
- `fileSize`: Number; `mimeType`: String; `uploadedAt`: Date, default now

Timestamps: yes.

---

### Invoice — `invoices` (`backend/models/Invoice.js`)

- `clientId`: String, required; `clientRef` → User
- `organizationName, standard, address, invoiceNo`: String
- `amount`: Number, required
- `stage`: enum `proforma, payment, verified, final` (default `proforma`); `proformaSentAt`: Date
- `paymentType`: enum `full, half, part, ''`; `bankName`, `receivedAmount`, `paymentDate`
- `verified`: Boolean, default false; `verifiedAmount`, `verifiedAt`
- `finalSentAt`: Date

Timestamps: yes.

---

### Lead — `leads` (`backend/models/Lead.js`)

- `leadId`: String, **unique** (auto-generated `LEAD-nnn` via `pre('save')` using `countDocuments()`)
- `companyName`: String, required, trim
- `contactPerson, email, mobile, city, state`: String; `country` (default `India`)
- `isoStandard`: String
- `source`: enum `Website, Referral, LinkedIn, Cold Call, Email Campaign, Trade Show, Other`
- `status`: enum `new, contacted, qualified, converted, lost` (default `new`)
- `priority`: enum `high, medium, low` (default `medium`)
- `notes`: String
- `assignedTo, assignedAuditor, assignedReviewer` → User, default null
- `convertedToApplication` → Application, default null

Timestamps: yes.

---

### Observation — `observations` (`backend/models/Observation.js`)

- `applicationId` (String, required) + `application` → Application
- `type`: enum `Major NC, Minor NC, OFI, Observation` (required)
- `description`: String, required; `corrective_action`: String
- `raisedBy` → User; `raisedByName`: String
- `status`: enum `Open, Closed` (default `Open`); `closedAt`: Date

Timestamps: yes.

---

### Otp — `otps` (`backend/models/Otp.js`)

- `email`: String, required, indexed
- `otp`: String, required
- `userId` → User, required
- `expiresAt`: Date, required

**No `timestamps` option.**
**Explicit TTL index:** `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }` — MongoDB auto-deletes expired OTP docs.

---

### Payment — `payments` (`backend/models/Payment.js`)

- `name`: String, required
- `transactionId`: String, required
- `applicationId` → Application, default null *(field is named `applicationId` but is actually an ObjectId ref, not a code string — inconsistent with the `applicationId` string convention used elsewhere)*
- `amount`: Number, required
- `paymentStatus`: enum `pending, partially_received, received` (default `pending`)
- `paymentDate`: Date

Timestamps: yes.

---

### QMSForm — `qmsforms` (`backend/models/QMSForm.js`)

- `clientId`: String, required; `clientRef` → User
- `formType`: Number, required, min 1, max 23
- `formCode`, `formName`: String
- `status`: enum `draft, saved, completed` (default `draft`)
- `formData`: Mixed, default `{}`
- `application` → Application (set for form type F01 when a client's submission creates an Application)

**Explicit compound unique index:** `{ clientId: 1, formType: 1 }` — one form of each type per client.

Timestamps: yes.

---

### Role — `roles` (`backend/models/Role.js`)

- `name`: String, required, **unique**, trim
- `permissions`: [String]
- `description`: String

Timestamps: yes.

---

### Standard — `standards` (`backend/models/Standard.js`)

- `name`: String, required, **unique**, trim
- `category`, `description`: String
- `clauses`: [subdoc] `no, text` (both trimmed String), default `[]`
- `active`: Boolean, default `true`

Timestamps: yes.

---

### AppSetting — `appsettings` (`backend/models/AppSetting.js`)

Generic key/value store for app-wide settings.

- `key`: String, required, **unique**
- `value`: Mixed, required

Timestamps: yes.

---

## Relationship Map

`Application` is the central collection — most others reference it either via a true Mongoose `ObjectId` ref, a denormalized `applicationId`/`clientId` string code, or both.

| From | Field | → To | Notes |
|---|---|---|---|
| Application | `client`, `assignedAuditor`, `assignedReviewer` | User | populated in application/dashboard/audit routes |
| Application | `feedbacks[].from` | User | subdoc ref |
| Application | `uploadedDocuments[].uploadedBy` | User | subdoc ref |
| User | `assignedApplications[]` | Application | inverse convenience list |
| ApplicationReview | `applicationRef` | Application | ~1:1 review per application |
| ApplicationReview | `reviewedBy` | User | |
| AuditReport | `createdBy`, `client`, `assignedAuditor` | User | |
| Certificate | `linkedApplication` | Application | |
| Document | `application` | Application | |
| Document | `client`, `uploadedBy` | User | |
| Invoice | `clientRef` | User | |
| Lead | `assignedTo`, `assignedAuditor`, `assignedReviewer` | User | |
| Lead | `convertedToApplication` | Application | lead → application conversion |
| Observation | `application` | Application | |
| Observation | `raisedBy` | User | |
| Otp | `userId` | User | |
| Payment | `applicationId` (ObjectId despite the name) | Application | |
| QMSForm | `clientRef` | User | |
| QMSForm | `application` | Application | set when F01 submission creates an Application |

```
                 ┌────────────┐
                 │    Lead    │
                 └─────┬──────┘
                       │ convertedToApplication
                       ▼
   ┌───────────────────────────────────────┐
   │              Application               │◄──── QMSForm (F01 creates it)
   │  client / assignedAuditor / reviewer   │
   └───┬──────┬──────┬──────┬──────┬────────┘
       │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼
   AuditReport ApplicationReview Certificate Document Observation
       │                                          │
       ▼                                          ▼
     User (auditor/reviewer/client)             User (uploadedBy)

   Payment ──► Application        Invoice ──► User (clientRef)
   Otp ──► User                   AuditorSignature (standalone)
   Role / Standard / AppSetting (standalone reference tables)
```

## Explicit Indexes

| Collection | Index | Type |
|---|---|---|
| Otp | `{ expiresAt: 1 }`, `expireAfterSeconds: 0` | TTL |
| Otp | `email` | field-level index |
| QMSForm | `{ clientId: 1, formType: 1 }` | compound unique |
| AppSetting | `key` | unique |
| Application | `applicationId` | unique, sparse |
| AuditorSignature | `nameKey` | unique |
| Certificate | `certNumber` | unique |
| Lead | `leadId` | unique |
| Role | `name` | unique |
| Standard | `name` | unique |

**Known gap:** `User.email` has no unique index at the DB level — duplicate accounts are possible unless enforced purely in route logic.

## Files

- Models: `backend/models/*.js`
- Connection: `backend/config/db.js`, invoked from `backend/server.js`
- Client-ID generator: `backend/utils/clientId.js`
- Seed data: `backend/seed.js`, `backend/mockData.js`
