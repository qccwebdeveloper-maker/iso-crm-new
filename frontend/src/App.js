import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveClientProvider } from './context/ActiveClientContext';
import { UnsavedChangesProvider } from './context/UnsavedChangesContext';

import Login from './pages/Login';

// ── Admin ──
const AdminDashboard        = lazy(() => import('./pages/admin/Dashboard'));
const AdminApplications     = lazy(() => import('./pages/admin/Applications'));
const AdminApplicationDetail = lazy(() => import('./pages/admin/ApplicationDetail'));
const AdminNewApplication   = lazy(() => import('./pages/admin/NewApplication'));
const AdminUsers            = lazy(() => import('./pages/admin/Users'));
const AdminUserDetail       = lazy(() => import('./pages/admin/UserDetail'));
const AdminAuditors         = lazy(() => import('./pages/admin/Auditors'));
const AdminAuditorSignatures = lazy(() => import('./pages/admin/AuditorSignatures'));
const AdminReports          = lazy(() => import('./pages/admin/AdminReports'));
const AdminFeedback         = lazy(() => import('./pages/admin/Feedback'));
const AdminLeads            = lazy(() => import('./pages/admin/Leads'));
const AdminPayments         = lazy(() => import('./pages/admin/Payments'));
const AdminStandards        = lazy(() => import('./pages/admin/Standards'));
const AdminRoles            = lazy(() => import('./pages/admin/Roles'));
const ApprovalPending       = lazy(() => import('./pages/admin/ApprovalPending'));
const DMS                   = lazy(() => import('./pages/admin/DMS'));
const AuditStages           = lazy(() => import('./pages/admin/AuditStages'));
const Observation           = lazy(() => import('./pages/admin/Observation'));
const CertificateManagement = lazy(() => import('./pages/admin/CertificateManagement'));
const SendDocument          = lazy(() => import('./pages/admin/SendDocument'));
const AdminAnalysisReports  = lazy(() => import('./pages/admin/Reports'));
const AdminApplicationReview     = lazy(() => import('./pages/admin/ApplicationReview'));
const AdminApplicationReviewForm = lazy(() => import('./pages/admin/ApplicationReviewForm'));

// ── QMS Forms ──
const QMSForm01 = lazy(() => import('./pages/admin/qms/Form01ApplicationForm'));
const QMSForm02 = lazy(() => import('./pages/admin/qms/Form02ApplicationReview'));
const QMSForm03 = lazy(() => import('./pages/admin/qms/Form03AuditPlanning'));
const QMSForm04 = lazy(() => import('./pages/admin/qms/Form04AuditorDeclaration'));
const QMSForm05 = lazy(() => import('./pages/admin/qms/Form05Stage1AuditPlan'));
const QMSForm06 = lazy(() => import('./pages/admin/qms/Form06Stage1Meetings'));
const QMSForm07 = lazy(() => import('./pages/admin/qms/Form07Stage1AuditReport'));
const QMSForm08 = lazy(() => import('./pages/admin/qms/Form08Stage1ReviewReport'));
const QMSForm09 = lazy(() => import('./pages/admin/qms/Form09Stage2AuditPlan'));
const QMSForm10 = lazy(() => import('./pages/admin/qms/Form10Stage2Meetings'));
const QMSForm11 = lazy(() => import('./pages/admin/qms/Form11Stage2AuditReport'));
const QMSForm12 = lazy(() => import('./pages/admin/qms/Form12CARRequest'));
const QMSForm13 = lazy(() => import('./pages/admin/qms/Form13CARReport'));
const QMSForm14 = lazy(() => import('./pages/admin/qms/Form14DraftCertificate'));
const QMSForm15 = lazy(() => import('./pages/admin/qms/Form15FinalReviewReport'));
const QMSForm16 = lazy(() => import('./pages/admin/qms/Form16SurveillanceApplication'));
const QMSForm17 = lazy(() => import('./pages/admin/qms/Form17SurveillanceAuditPlan'));
const QMSForm18 = lazy(() => import('./pages/admin/qms/Form18SurveillanceMeetings'));
const QMSForm19 = lazy(() => import('./pages/admin/qms/Form19SurveillanceAuditReport'));
const QMSForm20 = lazy(() => import('./pages/admin/qms/Form20SurveillanceReviewReport'));
const QMSForm21 = lazy(() => import('./pages/admin/qms/Form21SurveillanceCARReport'));
const QMSForm22 = lazy(() => import('./pages/admin/qms/Form22LetterOfContinuation'));
const QMSForm23 = lazy(() => import('./pages/admin/qms/Form23OfiObservationSheet'));
const DownloadForms = lazy(() => import('./pages/admin/DownloadForms'));

// ── Client ──
const ClientDashboard       = lazy(() => import('./pages/client/Dashboard'));
const ClientApplications    = lazy(() => import('./pages/client/Applications'));
const ClientApplicationDetail = lazy(() => import('./pages/client/ApplicationDetail'));
const ClientApplicationForm  = lazy(() => import('./pages/client/ApplicationForm'));
const ClientNewApplication   = lazy(() => import('./pages/client/NewApplicationForm'));
const ClientDocuments       = lazy(() => import('./pages/client/Documents'));
const ClientCertificates    = lazy(() => import('./pages/client/Certificates'));
const ClientInvoices        = lazy(() => import('./pages/client/Invoices'));
const ClientFeedback        = lazy(() => import('./pages/client/Feedback'));
const ClientTeamReports     = lazy(() => import('./pages/client/TeamReports'));
const ClientQMSFormViewer   = lazy(() => import('./pages/client/QMSFormViewer'));

// ── Auditor ──
const AuditorDashboard      = lazy(() => import('./pages/auditor/Dashboard'));
const AuditorApplications   = lazy(() => import('./pages/auditor/Applications'));
const AuditorApplicationDetail = lazy(() => import('./pages/auditor/ApplicationDetail'));

// ── Sales ──
const SalesDashboard        = lazy(() => import('./pages/sales/Dashboard'));
const SalesTeam             = lazy(() => import('./pages/sales/Team'));
const SalesLeads            = lazy(() => import('./pages/sales/Leads'));
const SalesAssign           = lazy(() => import('./pages/sales/Assign'));
const SalesReports          = lazy(() => import('./pages/sales/Reports'));
const SalesApplicationsList = lazy(() => import('./pages/sales/ApplicationsList'));

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-box"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const effectiveRole = user.role === 'reviewer' ? 'auditor' : user.role;
  if (roles && !roles.includes(user.role) && !roles.includes(effectiveRole)) {
    return <Navigate to={`/${effectiveRole}`} replace />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'reviewer') return <Navigate to="/auditor" replace />;
  return <Navigate to={`/${user.role}`} replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  const dest = !user ? '/login' : user.role === 'reviewer' ? '/auditor' : `/${user.role}`;
  return (
    <Suspense fallback={<div className="loading-box"><div className="spinner" /></div>}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to={dest} replace /> : <Login />} />
      <Route path="/login/:role" element={user ? <Navigate to={dest} replace /> : <Login />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* ── Admin ── */}
      <Route path="/admin"                   element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/leads"             element={<ProtectedRoute roles={['admin']}><AdminLeads /></ProtectedRoute>} />
      <Route path="/admin/applications"      element={<ProtectedRoute roles={['admin']}><AdminApplications /></ProtectedRoute>} />
      <Route path="/admin/applications/:id/edit" element={<ProtectedRoute roles={['admin']}><ClientNewApplication /></ProtectedRoute>} />
      <Route path="/admin/applications/:id"  element={<ProtectedRoute roles={['admin']}><AdminApplicationDetail /></ProtectedRoute>} />
      <Route path="/admin/payments"          element={<ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/users"             element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/users/:id"         element={<ProtectedRoute roles={['admin']}><AdminUserDetail /></ProtectedRoute>} />
      <Route path="/admin/auditors"          element={<ProtectedRoute roles={['admin']}><AdminAuditors /></ProtectedRoute>} />
      <Route path="/admin/auditor-signatures" element={<ProtectedRoute roles={['admin']}><AdminAuditorSignatures /></ProtectedRoute>} />
      <Route path="/admin/reports"           element={<ProtectedRoute roles={['admin']}><AdminAnalysisReports /></ProtectedRoute>} />
      <Route path="/admin/admin-reports"     element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/feedback"          element={<ProtectedRoute roles={['admin']}><AdminFeedback /></ProtectedRoute>} />
      <Route path="/admin/standards"         element={<ProtectedRoute roles={['admin']}><AdminStandards /></ProtectedRoute>} />
      <Route path="/admin/roles"             element={<ProtectedRoute roles={['admin']}><AdminRoles /></ProtectedRoute>} />
      <Route path="/admin/approval-pending"  element={<ProtectedRoute roles={['admin']}><ApprovalPending /></ProtectedRoute>} />
      <Route path="/admin/dms"               element={<ProtectedRoute roles={['admin']}><DMS /></ProtectedRoute>} />
      <Route path="/admin/audit-stage1"      element={<ProtectedRoute roles={['admin']}><AuditStages stage={1} /></ProtectedRoute>} />
      <Route path="/admin/audit-stage2"      element={<ProtectedRoute roles={['admin']}><AuditStages stage={2} /></ProtectedRoute>} />
      <Route path="/admin/observation"       element={<ProtectedRoute roles={['admin']}><Observation /></ProtectedRoute>} />
      <Route path="/admin/certificates"      element={<ProtectedRoute roles={['admin']}><CertificateManagement /></ProtectedRoute>} />
      <Route path="/admin/send-client"        element={<ProtectedRoute roles={['admin']}><SendDocument role="client" /></ProtectedRoute>} />
      <Route path="/admin/send-auditor"       element={<ProtectedRoute roles={['admin']}><SendDocument role="auditor" /></ProtectedRoute>} />
      <Route path="/admin/send-reviewer"      element={<ProtectedRoute roles={['admin']}><SendDocument role="reviewer" /></ProtectedRoute>} />
      <Route path="/admin/application-review"      element={<ProtectedRoute roles={['admin']}><AdminApplicationReview /></ProtectedRoute>} />
      <Route path="/admin/application-review/new" element={<ProtectedRoute roles={['admin']}><AdminApplicationReviewForm /></ProtectedRoute>} />
      <Route path="/admin/application-review/:id" element={<ProtectedRoute roles={['admin']}><AdminApplicationReviewForm /></ProtectedRoute>} />

      {/* ── QMS Forms ── */}
      <Route path="/admin/qms/form-01" element={<ProtectedRoute roles={['admin']}><QMSForm01 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-02" element={<ProtectedRoute roles={['admin']}><QMSForm02 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-03" element={<ProtectedRoute roles={['admin']}><QMSForm03 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-04" element={<ProtectedRoute roles={['admin']}><QMSForm04 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-05" element={<ProtectedRoute roles={['admin']}><QMSForm05 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-06" element={<ProtectedRoute roles={['admin']}><QMSForm06 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-07" element={<ProtectedRoute roles={['admin']}><QMSForm07 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-08" element={<ProtectedRoute roles={['admin']}><QMSForm08 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-09" element={<ProtectedRoute roles={['admin']}><QMSForm09 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-10" element={<ProtectedRoute roles={['admin']}><QMSForm10 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-11" element={<ProtectedRoute roles={['admin']}><QMSForm11 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-12" element={<ProtectedRoute roles={['admin']}><QMSForm12 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-13" element={<ProtectedRoute roles={['admin']}><QMSForm13 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-14" element={<ProtectedRoute roles={['admin']}><QMSForm14 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-15" element={<ProtectedRoute roles={['admin']}><QMSForm15 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-16" element={<ProtectedRoute roles={['admin']}><QMSForm16 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-17" element={<ProtectedRoute roles={['admin']}><QMSForm17 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-18" element={<ProtectedRoute roles={['admin']}><QMSForm18 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-19" element={<ProtectedRoute roles={['admin']}><QMSForm19 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-20" element={<ProtectedRoute roles={['admin']}><QMSForm20 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-21" element={<ProtectedRoute roles={['admin']}><QMSForm21 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-22" element={<ProtectedRoute roles={['admin']}><QMSForm22 /></ProtectedRoute>} />
      <Route path="/admin/qms/form-23" element={<ProtectedRoute roles={['admin']}><QMSForm23 /></ProtectedRoute>} />
      <Route path="/admin/qms/download" element={<ProtectedRoute roles={['admin']}><DownloadForms /></ProtectedRoute>} />

      {/* ── Client ── */}
      <Route path="/client"                  element={<ProtectedRoute roles={['client']}><ClientDashboard /></ProtectedRoute>} />
      <Route path="/client/applications"     element={<ProtectedRoute roles={['client']}><ClientApplications /></ProtectedRoute>} />
      <Route path="/client/applications/new" element={<ProtectedRoute roles={['client']}><ClientNewApplication /></ProtectedRoute>} />
      <Route path="/client/qms/form-01"      element={<ProtectedRoute roles={['client']}><ClientApplicationForm /></ProtectedRoute>} />
      <Route path="/client/qms/view/:formType" element={<ProtectedRoute roles={['client']}><ClientQMSFormViewer /></ProtectedRoute>} />
      <Route path="/client/applications/:id/edit" element={<ProtectedRoute roles={['client']}><ClientNewApplication /></ProtectedRoute>} />
      <Route path="/client/applications/:id" element={<ProtectedRoute roles={['client']}><ClientApplicationDetail /></ProtectedRoute>} />
      <Route path="/client/documents"        element={<ProtectedRoute roles={['client']}><ClientDocuments /></ProtectedRoute>} />
      <Route path="/client/certificates"     element={<ProtectedRoute roles={['client']}><ClientCertificates /></ProtectedRoute>} />
      <Route path="/client/invoices"         element={<ProtectedRoute roles={['client']}><ClientInvoices /></ProtectedRoute>} />
      <Route path="/client/feedback"           element={<ProtectedRoute roles={['client']}><ClientFeedback /></ProtectedRoute>} />
      <Route path="/client/team-reports"     element={<ProtectedRoute roles={['client']}><ClientTeamReports /></ProtectedRoute>} />

      {/* ── Auditor (+ reviewer redirected here) ── */}
      <Route path="/auditor"                  element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorDashboard /></ProtectedRoute>} />
      <Route path="/auditor/applications"     element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorApplications /></ProtectedRoute>} />
      <Route path="/auditor/applications/:id" element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorApplicationDetail /></ProtectedRoute>} />
      <Route path="/auditor/review-queue"      element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorApplications /></ProtectedRoute>} />
      <Route path="/auditor/reports"          element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorApplications /></ProtectedRoute>} />
      <Route path="/auditor/documents"        element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorApplications /></ProtectedRoute>} />
      <Route path="/auditor/settings"         element={<ProtectedRoute roles={['auditor','reviewer']}><AuditorDashboard /></ProtectedRoute>} />

      {/* ── Auditor — QMS Forms (same forms/editors as admin, review + edit access) ── */}
      <Route path="/auditor/qms/form-01" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm01 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-02" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm02 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-03" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm03 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-04" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm04 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-05" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm05 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-06" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm06 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-07" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm07 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-08" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm08 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-09" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm09 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-10" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm10 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-11" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm11 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-12" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm12 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-13" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm13 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-14" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm14 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-15" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm15 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-16" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm16 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-17" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm17 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-18" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm18 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-19" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm19 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-20" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm20 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-21" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm21 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-22" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm22 /></ProtectedRoute>} />
      <Route path="/auditor/qms/form-23" element={<ProtectedRoute roles={['auditor','reviewer']}><QMSForm23 /></ProtectedRoute>} />

      <Route path="/reviewer"                 element={<Navigate to="/auditor" replace />} />
      <Route path="/reviewer/*"               element={<Navigate to="/auditor" replace />} />

      {/* ── Sales ── */}
      <Route path="/sales"         element={<ProtectedRoute roles={['sales']}><SalesDashboard /></ProtectedRoute>} />
      <Route path="/sales/pipeline" element={<ProtectedRoute roles={['sales']}><SalesDashboard /></ProtectedRoute>} />
      <Route path="/sales/team"    element={<ProtectedRoute roles={['sales']}><SalesTeam /></ProtectedRoute>} />
      <Route path="/sales/leads"   element={<ProtectedRoute roles={['sales']}><SalesLeads /></ProtectedRoute>} />
      <Route path="/sales/assign"  element={<ProtectedRoute roles={['sales']}><SalesAssign /></ProtectedRoute>} />
      <Route path="/sales/reports"          element={<ProtectedRoute roles={['sales']}><SalesReports /></ProtectedRoute>} />
      <Route path="/sales/new-application"  element={<ProtectedRoute roles={['sales','admin']}><AdminNewApplication /></ProtectedRoute>} />
      <Route path="/sales/applications"     element={<ProtectedRoute roles={['sales']}><SalesApplicationsList /></ProtectedRoute>} />
      <Route path="/sales/targets" element={<ProtectedRoute roles={['sales']}><SalesReports /></ProtectedRoute>} />
      <Route path="/sales/settings" element={<ProtectedRoute roles={['sales']}><SalesDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ActiveClientProvider>
        <UnsavedChangesProvider>
          <Router>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#fff7ed', color: '#7c2d12', border: '1px solid #fed7aa', borderRadius: 12, fontSize: 13 },
                success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
              }}
            />
          </Router>
        </UnsavedChangesProvider>
      </ActiveClientProvider>
    </AuthProvider>
  );
}
