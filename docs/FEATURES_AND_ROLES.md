# QC Certification CRM — Features, Functionalities, Roles & Permissions

> A web platform that runs the **full ISO certification lifecycle** for QC Certification —
> from a sales lead, through the client application, the two-stage audit, the technical
> review, and finally certificate issuance. This document explains *what the system does*
> and *who is allowed to do what*.

---

## 1. What the product is

QC Certification is a certification body (CB) that audits client organizations against ISO
standards (ISO 9001, 14001, 45001, 27001, 50001, 22000, etc.) and issues accredited
certificates (NABCB / IAF). This CRM digitizes that entire process:

- Sales captures and qualifies **leads** and converts them into clients.
- Clients fill a detailed **application form** and upload documents.
- Admin assigns an **auditor** and a **reviewer**.
- The audit runs in **Stage 1 → Stage 2**, captured through 15 standardized **QMS forms**.
- A reviewer performs the **independent technical review**.
- Admin generates and issues the **certificate** with surveillance due dates.
- Everyone communicates through in-app **notifications**, **documents**, and **feedback**.

---

## 2. The certification lifecycle (status flow)

The `Application` document moves through a fixed set of statuses
([backend/models/Application.js](../backend/models/Application.js)):

```
draft → submitted → under_review → audit_stage1 → audit_stage2 → approved → certified
                                                                         ↘ rejected
```

| Status         | Meaning                                                              |
|----------------|----------------------------------------------------------------------|
| `draft`        | Client started the form but has not submitted (partial saves allowed)|
| `submitted`    | Client submitted; awaiting admin/reviewer action                     |
| `under_review` | Application review (Form 02) in progress                             |
| `audit_stage1` | Stage 1 (readiness/documentation) audit                              |
| `audit_stage2` | Stage 2 (implementation/certification) audit                        |
| `approved`     | Technical review passed; cleared for certification                   |
| `certified`    | Certificate issued                                                   |
| `rejected`     | Rejected at any gate                                                  |

Each application carries a `progressPercentage` and `progressStages[]` so the client can see
how far they are. A unique human-readable ID (`APP1000`, `APP1001`, …) is auto-generated.

---

## 3. Roles overview

Five roles exist in the system (`User.role` enum: `admin`, `client`, `auditor`, `reviewer`,
`sales`). The `reviewer` role shares the auditor's UI — it is routed to the `/auditor`
workspace ([frontend/src/App.js](../frontend/src/App.js)).

| Role       | Who they are                          | Primary job                                   |
|------------|---------------------------------------|-----------------------------------------------|
| **Admin**  | QC Certification staff / super-user   | Runs everything: users, assignments, audit stages, certificates, settings |
| **Sales**  | Business development team             | Leads, pipeline, converting leads to clients  |
| **Client** | The organization seeking certification| Files applications, uploads docs, views certs |
| **Auditor**| Field auditor                         | Conducts Stage 1 & Stage 2 audits, writes reports |
| **Reviewer**| Independent technical reviewer       | Reviews audit outcomes before certification   |

---

## 4. Features & functionalities by role

### 4.1 Authentication & onboarding (all roles)

- **Email + password login** for staff and clients ([routes/auth.js](../backend/routes/auth.js)).
- **Client ID login** — clients can log in with their generated Client ID (e.g. `CLT-M3X7K2-A9F`)
  instead of email.
- **OTP (two-factor) login**:
  - **Admin OTP** — admin login can require a 6-digit one-time code emailed to the admin.
  - **Client OTP** — a two-step `client-send-otp` → `client-verify-otp` flow. OTP can be
    globally toggled on/off by an `AppSetting` (`clientOtpEnabled`); when off, login is direct.
  - OTPs are 6 digits, expire in **10 minutes**, stored in an `Otp` collection.
- **Client self-registration** — a public form collecting company name, email, password,
  mobile, address, ISO standard and scope. New accounts are created **inactive**
  (`isActive: false`, `pendingApproval: true`) and require admin approval before login.
- **Welcome email** with login credentials is sent on approval; **OTP emails** use a
  branded HTML template ([utils/email.js](../backend/utils/email.js)).
- **JWT sessions** — a signed token (7-day expiry) is issued on login and sent as a
  `Bearer` token on every request.

### 4.2 Admin

The admin is the operational hub. Admin-only screens (all under `/admin/*`):

- **Dashboard** — aggregate stats (applications by status, users, payments, leads).
- **User management** — list/create/edit/deactivate users of any role; **approve or reject**
  pending client registrations (`/admin/approval-pending`).
- **Applications** — view all applications, edit them, assign auditor + reviewer, change
  status, add admin notes, delete.
- **Auditors** — manage the auditor/reviewer pool and their assignments.
- **Audit Stages** — drive Stage 1 (`/admin/audit-stage1`) and Stage 2 (`/admin/audit-stage2`).
- **Observations** — log audit observations / non-conformities.
- **QMS Forms (1–15)** — the standardized certification paperwork (see §5).
- **Application Review** — formal application review records (Form 02 backing data).
- **Certificate Management** — generate certificate numbers, prefill from client data,
  set issue/expiry/surveillance dates, font/layout positioning, issue & manage certificates
  ([routes/certificates.js](../backend/routes/certificates.js)).
- **Payments** — record and track client payments (`pending` / `partially_received` / `received`).
- **Leads** — full access to the sales pipeline.
- **Standards** — manage the catalog of ISO standards offered.
- **Roles** — manage custom role definitions.
- **DMS (Document Management)** — central document store.
- **Send Document** — push documents to a client, auditor, or reviewer.
- **Reports** — analytics + downloadable management reports.
- **Settings** — global app settings (e.g. toggle client OTP).

### 4.3 Sales

Sales screens (`/sales/*`) — scoped to the lead/pipeline domain:

- **Dashboard / Pipeline** — pipeline view of leads by stage.
- **Leads** — create, edit, assign, and track leads. A lead has `source`
  (Website, Referral, LinkedIn, Cold Call, Email Campaign, Trade Show, Other),
  `status` (`new → contacted → qualified → converted → lost`) and `priority`.
- **Assign** — assign leads to team members / auditors / reviewers.
- **Convert** — convert a qualified lead into a client + application
  ([routes/leads.js](../backend/routes/leads.js) `/:id/convert`).
- **Team** — view the sales team.
- **Reports / Targets** — sales performance and targets.
- **New Application** — sales can also start an application on a client's behalf.

### 4.4 Client

Client screens (`/client/*`):

- **Dashboard** — status of their own applications and next actions.
- **Applications** — create a new application, save as draft, edit, and **submit** for review.
  The application form is a long multi-section form (organization & contact, standards &
  type, employees, management-system info, audit-type flags, standard-specific sections for
  ISO 50001/14001/45001).
- **Documents** — upload required documents (application form, agreement, signed forms,
  proof of ID, etc.). Files go to **AWS S3**.
- **Certificates** — view/download issued certificates.
- **Feedback** — rate (1–5 stars) and comment on the service per application.
- **Team Reports** — view reports shared with them.
- Clients can only ever see **their own** data (enforced server-side, see §6).

### 4.5 Auditor (and Reviewer)

Auditor screens (`/auditor/*`; reviewers are redirected here):

- **Dashboard** — assigned applications and tasks.
- **Applications** — see only applications **assigned to them** (as auditor or reviewer).
- **Application Detail** — review the application, conduct the audit, write
  **audit notes** (auditor) or **review notes** (reviewer).
- **Accept / reject assignment** — auditors and reviewers explicitly accept or decline an
  assignment (`auditAcceptanceStatus`).
- **Audit reports** — produce Stage 1 and Stage 2 audit reports (backed by the QMS forms).
- **Review queue / reports / documents** — supporting views.

---

## 5. QMS Forms (the 15-form certification workflow)

The heart of the certification process is a set of **15 standardized QMS forms**
([frontend/src/pages/admin/qms/](../frontend/src/pages/admin/qms/),
[backend/models/QMSForm.js](../backend/models/QMSForm.js)). Each form is stored per client
(`clientId + formType` is unique) with a `status` of `draft` / `saved` / `completed` and a
flexible `formData` payload.

| #  | Form                          | Purpose                                       |
|----|-------------------------------|-----------------------------------------------|
| 01 | Application Form              | Client's certification application            |
| 02 | Application Review            | CB reviews the application for acceptance     |
| 03 | Audit Planning                | Plan the audit program                        |
| 04 | Auditor Declaration           | Auditor impartiality / conflict declaration   |
| 05 | Stage 1 Audit Plan            | Plan for the Stage 1 audit                    |
| 06 | Stage 1 Meetings              | Opening/closing meeting records (Stage 1)     |
| 07 | Stage 1 Audit Report          | Findings from Stage 1                          |
| 08 | Stage 1 Review Report         | Review of Stage 1 outcome                      |
| 09 | Stage 2 Audit Plan            | Plan for the Stage 2 audit                    |
| 10 | Stage 2 Meetings              | Opening/closing meeting records (Stage 2)     |
| 11 | Stage 2 Audit Report          | Findings from Stage 2                          |
| 12 | CAR Request                   | Corrective Action Request (non-conformities)  |
| 13 | CAR Report                    | Corrective-action verification                |
| 14 | Draft Certificate             | Draft of the certificate                       |
| 15 | Final Review Report           | Final independent technical review → decision |

This sequence mirrors a real accredited certification audit cycle.

---

## 6. Roles & permissions matrix

Authorization is enforced server-side by two middlewares
([backend/middleware/auth.js](../backend/middleware/auth.js)):

- **`protect`** — requires a valid JWT, loads the user, and rejects inactive accounts.
- **`authorize(...roles)`** — restricts a route to specific roles.

In addition, list/detail endpoints **scope data by role** — e.g. clients see only their own
applications, auditors/reviewers see only assigned ones
([routes/applications.js](../backend/routes/applications.js)).

| Capability                            | Admin | Sales | Client | Auditor | Reviewer |
|---------------------------------------|:-----:|:-----:|:------:|:-------:|:--------:|
| Log in                                | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage users / approve clients        | ✅ | — | — | — | — |
| Manage leads / pipeline               | ✅ | ✅ | — | — | — |
| Convert lead → client                 | ✅ | ✅ | — | — | — |
| Create application                    | ✅ | ✅ | ✅ (own) | — | — |
| View applications                     | ✅ all | ✅ (sales scope) | ✅ own | ✅ assigned | ✅ assigned |
| Edit application                      | ✅ | — | ✅ own (pre-submit) | — | — |
| Submit application                    | — | — | ✅ own | — | — |
| Assign auditor / reviewer             | ✅ | — | — | — | — |
| Accept / reject assignment            | — | — | — | ✅ | ✅ |
| Update status / write audit notes     | ✅ | — | — | ✅ (audit) | ✅ (review) |
| Upload documents                      | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fill QMS forms (1–15)                 | ✅ | — | partial (Form 01) | via audit | via review |
| Record payments                       | ✅ | — | — | — | — |
| Generate / issue certificates         | ✅ | — | — | — | — |
| View certificates                     | ✅ | — | ✅ own | — | — |
| Submit feedback                       | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage standards / roles / settings   | ✅ | — | — | — | — |
| View reports                          | ✅ | ✅ (sales) | ✅ (own/team) | ✅ (own) | ✅ (own) |

> Note: `reviewer` accounts are routed through the auditor workspace but server-side
> permissions and data scoping (`assignedReviewer`) keep their data separate from auditors.

---

## 7. Supporting / cross-cutting features

- **Notifications** — each user document carries an embedded `notifications[]` array
  (message, type, read flag, link). The system pushes notifications on key events
  (new feedback, assignment accepted/rejected, etc.).
- **Feedback & ratings** — 1–5 star ratings with comments, stored both per-application and
  surfaced to admin.
- **File storage** — uploads go to a **private AWS S3 bucket**; the browser fetches files via
  `/api/files/<key>`, which 302-redirects to a short-lived **presigned URL**
  ([utils/s3.js](../backend/utils/s3.js)). Local disk (`backend/uploads/`) is a fallback only.
- **Email delivery** — multi-provider fallback chain: **Brevo SMTP → Resend → Gmail SMTP →
  Ethereal preview** ([utils/email.js](../backend/utils/email.js)), so OTP/welcome emails
  still work even if one provider is misconfigured.
- **Client IDs** — unique, human-friendly client identifiers generated on registration.
- **Standards catalog** — configurable list of ISO standards, IAF codes, accreditation body.
- **Health check** — `GET /api/health` for uptime monitoring.

---

## 8. Demo / seed accounts

Seeded via `POST /api/auth/seed` — only runs when the database has zero users, so it can never
overwrite or wipe existing data (see [backend/seed.js](../backend/seed.js)):

| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Admin    | admin@crm.com     | admin123    |
| Client   | client@crm.com    | client123   |
| Auditor  | auditor@crm.com   | auditor123  |
| Sales    | sales@crm.com     | sales123    |

> These are development credentials only. In production, change all secrets, disable the
> seed route, and rotate any exposed keys.
