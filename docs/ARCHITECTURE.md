# QC Certification CRM — Architecture

This document describes the system architecture, the chosen tech stack (with the reasoning
and alternatives for each choice), how to scale the platform, what could be done better, and
the real problems faced while building it.

---

## 1. High-level architecture

The system is a classic **3-tier web application** with externalized storage:

```
        ┌──────────────────────────────────────────────────────────────┐
        │                          Browser (SPA)                         │
        │   React 18 + React Router · Axios · Recharts · react-hot-toast │
        └───────────────┬────────────────────────────────────────────────┘
                        │  HTTPS  (JWT Bearer token on every request)
                        ▼
        ┌──────────────────────────────────────────────────────────────┐
        │              Edge / static serving + reverse proxy             │
        │   nginx (serves React build)  →  proxies /api and /uploads     │
        │   (Caddy in front for TLS in the production compose)           │
        └───────────────┬────────────────────────────────────────────────┘
                        │  /api/*  ·  same origin (no CORS in prod)
                        ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                  Backend — Node.js + Express                   │
        │  Routes → middleware (protect / authorize) → Mongoose models   │
        │  JWT auth · multer uploads · nodemailer/Resend email           │
        └───────┬───────────────────────────────┬───────────────────────┘
                │                                │
                ▼                                ▼
      ┌───────────────────┐            ┌────────────────────────┐
      │   MongoDB Atlas    │            │       AWS S3 bucket      │
      │  (managed cluster) │            │  (private file storage)  │
      └───────────────────┘            └────────────────────────┘
                                                │
                                       ┌────────────────────────┐
                                       │  Email providers         │
                                       │  Brevo / Resend / Gmail  │
                                       └────────────────────────┘
```

### Request flow

1. The React SPA sends API calls to relative `/api/...` paths.
2. nginx serves the static build and reverse-proxies `/api` and `/uploads` to the Node
   backend — so frontend and backend are **same-origin** in production (no CORS).
3. Express routes pass through `protect` (JWT verification) and `authorize(...roles)`
   before hitting a Mongoose model.
4. Data persists in **MongoDB Atlas**; uploaded files live in a **private S3 bucket** and are
   served via short-lived presigned URLs.

### Backend internal structure ([backend/](../backend/))

```
server.js          → app bootstrap, CORS, route mounting, health check, error handler
config/db.js       → MongoDB connection
middleware/
  auth.js          → protect (JWT) + authorize (RBAC)
  upload.js        → multer file handling
models/            → Mongoose schemas (User, Application, Certificate, Lead, Payment,
                     QMSForm, Role, Standard, Observation, Document, AuditReport, …)
routes/            → one router per domain (auth, applications, certificates, leads,
                     payments, qms-forms, dashboard, settings, files, …)
utils/             → s3.js (file storage), email.js (multi-provider), clientId.js
```

The frontend is organized by **role-based page folders**
(`pages/admin`, `pages/client`, `pages/auditor`, `pages/sales`) with a single
`AuthContext` holding the logged-in user and JWT, and a `ProtectedRoute` wrapper that
enforces role access in the router ([frontend/src/App.js](../frontend/src/App.js)).

---

## 2. Tech stack — choices, *why*, and alternatives

| Layer        | Chosen                          | Why it was the right choice                                                                 | Alternatives considered                          |
|--------------|---------------------------------|---------------------------------------------------------------------------------------------|--------------------------------------------------|
| Frontend     | **React 18 (CRA)**              | Huge ecosystem, component model fits the many role dashboards/forms; team familiarity        | Next.js, Vue, Angular, SvelteKit                 |
| Routing      | **react-router-dom v6**         | De-facto SPA router; nested + role-guarded routes are easy                                  | TanStack Router, Next.js file routing            |
| HTTP client  | **Axios**                       | Interceptors for the JWT header; cleaner error handling than fetch                          | native `fetch`, TanStack Query                   |
| Charts       | **Recharts**                    | Declarative React charts for dashboards/reports with minimal config                          | Chart.js, Victory, Nivo                          |
| UI feedback  | **react-hot-toast**, lucide/react-icons | Lightweight toasts + icon sets, no heavy UI framework                                | MUI, Ant Design, Chakra                          |
| Backend      | **Node.js + Express 4**         | Same language as frontend (JS end-to-end), minimal, massive middleware ecosystem            | NestJS, Fastify, Django, Spring Boot             |
| Database     | **MongoDB + Mongoose** (Atlas)  | Document model fits the deeply nested, evolving application/QMS-form data; `strict:false` lets new form fields pass through without migrations | PostgreSQL, MySQL, DynamoDB |
| Auth         | **JWT (jsonwebtoken) + bcrypt** | Stateless tokens scale horizontally with no session store; bcrypt for password hashing      | Sessions+Redis, Auth0/Cognito/Clerk, Passport    |
| File storage | **AWS S3** (presigned URLs)     | Durable, cheap, offloads large files from the app server; private bucket + signed URLs is secure | Cloudinary (earlier), local disk, GridFS    |
| Email        | **Brevo → Resend → Gmail → Ethereal** fallback chain | Free-tier friendly, resilient — if one provider fails delivery still works | SES, SendGrid, Mailgun, Postmark        |
| File uploads | **multer**                      | Standard Express multipart handling, streams buffers straight to S3                          | busboy, formidable                               |
| Container    | **Docker + docker-compose**     | Reproducible builds, identical local/prod images, trivial multi-service orchestration        | bare-metal pm2, Kubernetes, Elastic Beanstalk    |
| Hosting      | **AWS EC2 + ECR**, GitHub Actions CI/CD | One small VM is the cheapest way to run 2 containers; ECR for private images        | ECS/Fargate, Render, Vercel+Railway, Kubernetes  |
| TLS / edge   | **Caddy** (auto Let's Encrypt)  | Automatic certificate issuance + renewal with a 4-line config                                | nginx + certbot, AWS ALB + ACM                   |

### Why MongoDB specifically?

The `Application` schema is **large, deeply nested, and standard-specific** (ISO 50001 has
energy fields, ISO 14001/45001 have environmental/OH&S fields, etc.). A document store with
`strict: false` lets the frontend evolve its forms and send extra fields without a schema
migration each time — a major velocity win for an evolving compliance product. The 15 QMS
forms similarly use a flexible `formData: Mixed` payload.

The trade-off: weaker relational guarantees. References between `User`, `Application`,
`Certificate`, `Lead`, `Payment` are modeled as `ObjectId` refs and joined with `populate`,
which is fine at the current scale but is not as strict as SQL foreign keys.

### Why JWT over sessions?

Stateless auth means the backend can run as multiple identical containers behind a load
balancer with no shared session store. The cost is that token revocation is harder (tokens
are valid until they expire — 7 days here).

---

## 3. How to scale this project

The current deployment is a **single EC2 instance** running two containers — perfect for
the current load, but here is the scaling path as usage grows:

### 3.1 Application tier (stateless → easy to scale)

- The backend is **stateless** (JWT auth, files in S3, data in Atlas), so it scales
  **horizontally**: run N backend containers behind a load balancer.
- Move from a single EC2 + docker-compose to **ECS Fargate** or **Kubernetes (EKS)** with an
  **Application Load Balancer** and auto-scaling on CPU/RAM.
- Put the React build on a **CDN (CloudFront)** instead of being served by a single nginx —
  static assets get edge-cached globally and the origin load drops to near zero.

### 3.2 Database tier

- MongoDB Atlas already supports vertical scaling (bigger tier) and **replica sets** for
  read scaling and HA. Enable **auto-scaling** and add **read replicas** for report queries.
- Add **indexes** on hot query fields (`client`, `assignedAuditor`, `assignedReviewer`,
  `status`, `applicationId`, `clientId`) — several already exist; audit the rest.
- For very large datasets, enable **sharding** on a high-cardinality key.

### 3.3 File & email tiers

- S3 already scales effectively infinitely; front it with **CloudFront** for cached downloads.
- Move OTP/transactional email to **AWS SES** or a paid SendGrid/Postmark tier for higher
  throughput and deliverability than the free Brevo/Resend tiers.

### 3.4 Throughput & resilience

- Add **Redis** for: caching dashboard aggregates, rate-limiting login/OTP endpoints, and a
  token blocklist (to make JWT revocation possible).
- Offload slow work (PDF/certificate generation, bulk emails, report exports) to a
  **background job queue** (BullMQ on Redis, or SQS + worker).
- Add a **WebSocket / SSE** channel for real-time notifications instead of polling.

### 3.5 Observability (needed before scaling)

- Centralized logging (CloudWatch / ELK), metrics (Prometheus/Grafana or CloudWatch), and
  error tracking (Sentry). Today the app logs to stdout only.

---

## 4. What we could do better

These are honest improvement areas, not blockers:

1. **Automated tests.** There is essentially no test suite (only the CRA testing-library
   scaffold). Add unit tests for auth/permissions, integration tests for the application
   lifecycle, and E2E tests for the role workflows.
2. **Centralized RBAC.** Authorization is enforced per-route with `authorize(...)` plus
   ad-hoc role checks. A single permissions module/policy layer would reduce the risk of an
   endpoint being left unguarded, and there is a `Role` model that is only partially wired in.
3. **Input validation.** Request bodies are largely trusted (`strict:false` on Application
   lets arbitrary fields through). Add schema validation (Zod / Joi / express-validator) at
   the route boundary.
4. **Secret hygiene.** The JWT secret falls back to a hardcoded default
   (`'crm_secret_key_2024'`) if `JWT_SECRET` is unset, the seed route can reset the admin
   password, and demo credentials are printed on boot. These must be hardened/removed for
   production.
5. **Rate limiting & lockout.** Login and OTP endpoints have no rate limiting — add
   `express-rate-limit` and account lockout to resist brute-force.
6. **Consistent file references.** Documents are referenced in several shapes across
   schemas (some as `String`, some as `{url, issuedAt}`, some in `uploadedDocuments[]`).
   A single normalized document model would simplify the DMS.
7. **TypeScript.** Converting both ends to TypeScript would catch the kind of schema-shape
   mismatches that this app currently relies on careful coding to avoid.
8. **API documentation.** There is a Postman collection, but an OpenAPI/Swagger spec would
   keep docs in sync with code.
9. **Observability & migrations.** No structured logging, no DB migration tooling — both
   become important as the team and data grow.
10. **Reduce obfuscated routes.** The obfuscated bootstrap/admin routes are
    "security through obscurity"; replace with a proper, auditable admin-provisioning flow.

---

## 5. Problems faced while building the project

These are real issues encountered during development, several of which are documented as
"BUG FIX" comments directly in the code:

1. **Mongoose 9 schema incompatibilities.**
   - `[[Number]]` (a 2-D array) is **invalid Mongoose syntax**; the employee table had to be
     switched to `Schema.Types.Mixed` with a default 5×5 grid
     ([Application.js:63-64](../backend/models/Application.js#L63-L64)).
   - `null` is not a valid enum member by default — the `auditAcceptanceStatus` enum had to
     explicitly include `null`/`''` to allow "not yet decided"
     ([Application.js:129-130](../backend/models/Application.js#L129-L130)).
   - Mongoose 6+ changed `pre('save')` hooks: async hooks must **not** take `next` and must
     return a promise instead ([Application.js:158-170](../backend/models/Application.js#L158-L170)).

2. **Draft applications vs. required fields.** Originally `organizationName` was `required`,
   which blocked clients from saving partial drafts. The fix was to drop the `required`
   constraint and allow `draft` status with incomplete data.

3. **Application ID collisions.** Generating IDs from `count()` caused collisions after
   deletions. The fix computes the next ID from the **highest existing `APPnnnn`** and loops
   to guard against gap collisions ([Application.js:159-169](../backend/models/Application.js#L159-L169)).

4. **Email delivery from cloud hosts.** Gmail SMTP is unreachable/blocked from Render, and
   Resend's free tier only delivers to the account owner's address. This forced a
   **multi-provider fallback chain** (Brevo → Resend → Gmail → Ethereal) so OTP and welcome
   emails reliably deliver ([utils/email.js](../backend/utils/email.js)).

5. **CORS and the build-time API URL.** CRA bakes env vars at build time, so a hardcoded
   backend URL (e.g. an old Render URL in `Login.js`) broke across environments. The fix was
   to use **relative `/api` paths** and have nginx reverse-proxy them, making frontend and
   backend same-origin and eliminating CORS entirely in production.

6. **CORS for multiple known origins.** During the Render/Vercel phase, the backend needed
   to allow specific production origins **plus** any localhost port for dev — solved with a
   dynamic CORS origin function ([server.js:17-34](../backend/server.js#L17-L34)).

7. **File storage migration.** The project started with local disk uploads, moved to
   Cloudinary, then to **AWS S3 with presigned URLs** for a private, durable, scalable store.
   The legacy disk path remains only as a fallback and is ephemeral inside Docker.

8. **Unreachable code after `module.exports`.** An image-upload route was placed after
   `module.exports` in `applications.js` and never registered — a subtle bug fixed by
   reordering (noted in the README changelog).

9. **Reviewer vs. auditor UX.** Reviewers needed their own data scope but shared the auditor
   interface. Solved by routing `reviewer` → `/auditor` while keeping permissions and data
   filters (`assignedReviewer`) separate server-side.

10. **Ephemeral container storage.** Docker containers lose disk on redeploy, which would
    have lost any locally-stored uploads — another reason the move to S3 was necessary.
