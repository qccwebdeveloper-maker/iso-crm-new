import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Xkz from './pages/pq7v/Xkz';
import Bvq from './pages/pq7v/Bvq';

// ── Admin ──
import AdminDashboard        from './pages/admin/Dashboard';
import AdminApplications     from './pages/admin/Applications';
import AdminApplicationDetail from './pages/admin/ApplicationDetail';
import AdminNewApplication   from './pages/admin/NewApplication';
import AdminUsers            from './pages/admin/Users';
import AdminUserDetail       from './pages/admin/UserDetail';
import AdminAuditors         from './pages/admin/Auditors';
import AdminReports          from './pages/admin/AdminReports';
import AdminFeedback         from './pages/admin/Feedback';
import AdminLeads            from './pages/admin/Leads';
import AdminPayments         from './pages/admin/Payments';
import AdminStandards        from './pages/admin/Standards';
import AdminRoles            from './pages/admin/Roles';
import ApprovalPending       from './pages/admin/ApprovalPending';
import DMS                   from './pages/admin/DMS';
import AuditStages           from './pages/admin/AuditStages';
import Observation           from './pages/admin/Observation';
import CertificateManagement from './pages/admin/CertificateManagement';
import SendDocument          from './pages/admin/SendDocument';
import AdminAnalysisReports  from './pages/admin/Reports';
import AdminApplicationReview     from './pages/admin/ApplicationReview';
import AdminApplicationReviewForm from './pages/admin/ApplicationReviewForm';

// ── QMS Forms ──
import QMSForm01 from './pages/admin/qms/Form01ApplicationForm';
import QMSForm02 from './pages/admin/qms/Form02ApplicationReview';
import QMSForm03 from './pages/admin/qms/Form03AuditPlanning';
import QMSForm04 from './pages/admin/qms/Form04AuditorDeclaration';
import QMSForm05 from './pages/admin/qms/Form05Stage1AuditPlan';
import QMSForm06 from './pages/admin/qms/Form06Stage1Meetings';
import QMSForm07 from './pages/admin/qms/Form07Stage1AuditReport';
import QMSForm08 from './pages/admin/qms/Form08Stage1ReviewReport';
import QMSForm09 from './pages/admin/qms/Form09Stage2AuditPlan';
import QMSForm10 from './pages/admin/qms/Form10Stage2Meetings';
import QMSForm11 from './pages/admin/qms/Form11Stage2AuditReport';
import QMSForm12 from './pages/admin/qms/Form12CARRequest';
import QMSForm13 from './pages/admin/qms/Form13CARReport';
import QMSForm14 from './pages/admin/qms/Form14DraftCertificate';
import QMSForm15 from './pages/admin/qms/Form15FinalReviewReport';
import QMSForm16 from './pages/admin/qms/Form16SurveillanceApplication';
import QMSForm17 from './pages/admin/qms/Form17SurveillanceAuditPlan';
import QMSForm18 from './pages/admin/qms/Form18SurveillanceMeetings';
import QMSForm19 from './pages/admin/qms/Form19SurveillanceAuditReport';
import QMSForm20 from './pages/admin/qms/Form20SurveillanceReviewReport';
import QMSForm21 from './pages/admin/qms/Form21SurveillanceCARReport';
import QMSForm22 from './pages/admin/qms/Form22LetterOfContinuation';
import DownloadForms from './pages/admin/DownloadForms';

// ── Client ──
import ClientDashboard       from './pages/client/Dashboard';
import ClientApplications    from './pages/client/Applications';
import ClientApplicationDetail from './pages/client/ApplicationDetail';
import ClientApplicationForm  from './pages/client/ApplicationForm';
import ClientNewApplication   from './pages/client/NewApplicationForm';
import ClientDocuments       from './pages/client/Documents';
import ClientCertificates    from './pages/client/Certificates';
import ClientInvoices        from './pages/client/Invoices';
import ClientFeedback        from './pages/client/Feedback';
import ClientTeamReports     from './pages/client/TeamReports';

// ── Auditor ──
import AuditorDashboard      from './pages/auditor/Dashboard';
import AuditorApplications   from './pages/auditor/Applications';
import AuditorApplicationDetail from './pages/auditor/ApplicationDetail';

// ── Sales ──
import SalesDashboard        from './pages/sales/Dashboard';
import SalesTeam             from './pages/sales/Team';
import SalesLeads            from './pages/sales/Leads';
import SalesAssign           from './pages/sales/Assign';
import SalesReports          from './pages/sales/Reports';
import SalesApplicationsList from './pages/sales/ApplicationsList';

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
      <Route path="/admin/qms/download" element={<ProtectedRoute roles={['admin']}><DownloadForms /></ProtectedRoute>} />

      {/* ── Client ── */}
      <Route path="/client"                  element={<ProtectedRoute roles={['client']}><ClientDashboard /></ProtectedRoute>} />
      <Route path="/client/applications"     element={<ProtectedRoute roles={['client']}><ClientApplications /></ProtectedRoute>} />
      <Route path="/client/applications/new" element={<ProtectedRoute roles={['client']}><ClientNewApplication /></ProtectedRoute>} />
      <Route path="/client/qms/form-01"      element={<ProtectedRoute roles={['client']}><ClientApplicationForm /></ProtectedRoute>} />
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

      <Route path="/v8xk2p/qr7nzt/bm4j9/w3fx" element={<Xkz />} />
      <Route path="/v8xk2p/qr7nzt/bm4j9/z5cn" element={<Bvq />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
