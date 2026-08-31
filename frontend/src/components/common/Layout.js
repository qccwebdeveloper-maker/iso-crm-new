import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActiveClient } from '../../context/ActiveClientContext';
import { useUnsavedChangesGuard } from '../../context/UnsavedChangesContext';
import axios from 'axios';
import { MdDashboard, MdShield } from 'react-icons/md';
import {
  FiFileText, FiUsers, FiBarChart2, FiLogOut, FiBell, FiMenu, FiX,
  FiStar, FiMessageSquare, FiAward, FiFolder, FiSettings, FiPlus,
  FiCamera, FiTarget, FiTrendingUp, FiUserCheck, FiBookOpen,
  FiSend, FiAlertTriangle, FiChevronDown, FiActivity,
  FiSearch, FiCreditCard, FiClipboard, FiDownload, FiPenTool
} from 'react-icons/fi';


const NAV = {
  admin: [
    { sec: 'Overview', items: [
      { to: '/admin',               icon: MdDashboard,  label: 'Dashboard' },
      { to: '/admin/reports',       icon: FiBarChart2,  label: 'Analysis & Reports' },
    ]},
    { sec: 'Master', collapsible: true, key: 'master', items: [
      { to: '/admin/standards',     icon: FiBookOpen,   label: 'Standards' },
      { to: '/admin/auditors',      icon: FiClipboard,  label: 'Auditors' },
      { to: '/admin/auditor-signatures', icon: FiPenTool, label: 'Auditor Signatures' },
      { to: '/admin/users',         icon: FiUsers,      label: 'Users' },
      { to: '/admin/roles',         icon: MdShield,     label: 'Roles' },
    ]},

    { sec: 'Applications', items: [
      { to: '/admin/applications',          icon: FiUserCheck,     label: 'Assign Audit' },
      { to: '/admin/feedback',              icon: FiMessageSquare, label: 'Reviews & Feedback' },
    ]},

    { sec: 'Documents & Comm.', items: [
      { to: '/admin/certificates',  icon: FiAward, label: 'Certificates' },
      { to: '/admin/payments',      icon: FiCreditCard, label: 'Payment Tracking' },
    ]},
    { sec: 'Tools', items: [
      { to: '/admin/qms/download', icon: FiDownload, label: 'Download Forms (PDF)' },
    ]},
    { sec: 'Leads', items: [
      { to: '/admin/leads', icon: FiTarget, label: 'Lead Management', badge: 'NEW' },
    ]},
    { sec: 'Initial Audit', items: [
      { to: '/admin/qms/form-01', icon: FiFileText, label: 'AUD-F-02 Application Form' },
      { to: '/admin/qms/form-02', icon: FiFileText, label: 'AUD-F-03 App Rev & F03-01 Aud Pln' },
      { to: '/admin/qms/form-03', icon: FiFileText, label: 'AUD-F-03A Audit Planning for 3 years' },
      { to: '/admin/qms/form-04', icon: FiFileText, label: 'AD-F-03 Auditor(s) Declaration' },
      { to: '/admin/qms/form-05', icon: FiFileText, label: 'AUD-F-05 S1 Plan & Schedule' },
      { to: '/admin/qms/form-06', icon: FiFileText, label: 'AUD-F-07 S1 Opening & Closing Meeting' },
      { to: '/admin/qms/form-07', icon: FiFileText, label: 'AUD-F-09 S1 Report' },
      { to: '/admin/qms/form-23', icon: FiFileText, label: 'AUD-F-09-B OFI/O Sheet' },
      { to: '/admin/qms/form-08', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (A)' },
      { to: '/admin/qms/form-09', icon: FiFileText, label: 'AUD-F-11 S2 Plan & Schedule' },
      { to: '/admin/qms/form-10', icon: FiFileText, label: 'AUD-F-07 S2 Open & Clos Meeting' },
      { to: '/admin/qms/form-11', icon: FiFileText, label: 'AUD-F-15 S2 Report' },
      { to: '/admin/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/admin/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/admin/qms/form-14', icon: FiFileText, label: 'AUD-F-21 Draft' },
      { to: '/admin/qms/form-15', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (B)' },
    ]},
    { sec: 'Surveillance - 1', items: [
      { to: '/admin/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/admin/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance I' },
      { to: '/admin/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/admin/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/admin/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/admin/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/admin/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Surveillance - 2', items: [
      { to: '/admin/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/admin/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance II' },
      { to: '/admin/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/admin/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/admin/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/admin/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/admin/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Recertification', items: [
    ]},
  ],
  client: [
    { sec: 'Overview', items: [
      { to: '/client',              icon: MdDashboard,  label: 'Dashboard' },
      { to: '/client/applications', icon: FiFileText,   label: 'My Applications' },
    ]},
    { sec: 'Application', items: [
      { to: '/client/qms/form-01',   icon: FiFileText, label: 'AUD-F-02 Application Form' },
      { to: '/client/qms/view/5',    icon: FiFileText, label: 'AUD-F-05 S1 Plan & Schedule' },
      { to: '/client/qms/view/7',    icon: FiFileText, label: 'AUD-F-09 S1 Report' },
      { to: '/client/qms/view/23',   icon: FiFileText, label: 'AUD-F-09-B OFI/O Sheet' },
      { to: '/client/qms/view/9',    icon: FiFileText, label: 'AUD-F-11 S2 Plan & Schedule' },
      { to: '/client/qms/view/11',   icon: FiFileText, label: 'AUD-F-15 S2 Report' },
      { to: '/client/qms/view/12',   icon: FiFileText, label: 'AUD-F-16 CAR' },
    ]},
    { sec: 'Reports', items: [
      { to: '/client/team-reports',   icon: FiClipboard, label: 'Team & Reports' },
    ]},
    { sec: 'Documents', items: [
      { to: '/client/documents',    icon: FiFolder, label: 'Documents & Forms' },
      { to: '/client/certificates', icon: FiAward,  label: 'My Certificates' },
      { to: '/client/invoices',     icon: FiCreditCard, label: 'My Invoices' },
    ]},
    { sec: 'Support', items: [
      { to: '/client/feedback', icon: FiMessageSquare, label: 'Feedback' },
    ]},
  ],
  auditor: [
    { sec: 'Overview', items: [
      { to: '/auditor',              icon: MdDashboard,  label: 'Dashboard' },
      { to: '/auditor/applications', icon: FiClipboard,  label: 'My Audits' },
    ]},
    { sec: 'Review', items: [
      { to: '/auditor/review-queue', icon: FiStar,      label: 'Review Queue' },
      { to: '/auditor/reports',      icon: FiBarChart2, label: 'Reports' },
    ]},
    { sec: 'Initial Audit', items: [
      { to: '/auditor/qms/form-01', icon: FiFileText, label: 'AUD-F-02 Application Form' },
      { to: '/auditor/qms/form-02', icon: FiFileText, label: 'AUD-F-03 App Rev & F03-01 Aud Pln' },
      { to: '/auditor/qms/form-03', icon: FiFileText, label: 'AUD-F-03A Audit Planning for 3 years' },
      { to: '/auditor/qms/form-04', icon: FiFileText, label: 'AD-F-03 Auditor(s) Declaration' },
      { to: '/auditor/qms/form-05', icon: FiFileText, label: 'AUD-F-05 S1 Plan & Schedule' },
      { to: '/auditor/qms/form-06', icon: FiFileText, label: 'AUD-F-07 S1 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-07', icon: FiFileText, label: 'AUD-F-09 S1 Report' },
      { to: '/auditor/qms/form-23', icon: FiFileText, label: 'AUD-F-09-B OFI/O Sheet' },
      { to: '/auditor/qms/form-08', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (A)' },
      { to: '/auditor/qms/form-09', icon: FiFileText, label: 'AUD-F-11 S2 Plan & Schedule' },
      { to: '/auditor/qms/form-10', icon: FiFileText, label: 'AUD-F-07 S2 Open & Clos Meeting' },
      { to: '/auditor/qms/form-11', icon: FiFileText, label: 'AUD-F-15 S2 Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-14', icon: FiFileText, label: 'AUD-F-21 Draft' },
      { to: '/auditor/qms/form-15', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (B)' },
    ]},
    { sec: 'Surveillance - 1', items: [
      { to: '/auditor/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/auditor/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance I' },
      { to: '/auditor/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Surveillance - 2', items: [
      { to: '/auditor/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/auditor/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance II' },
      { to: '/auditor/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Recertification', items: [
    ]},
    { sec: 'Documents', items: [
      { to: '/auditor/documents', icon: FiFolder, label: 'Documents' },
    ]},
    { sec: 'System', items: [
      { to: '/auditor/settings', icon: FiSettings, label: 'Settings' },
    ]},
  ],
  reviewer: [
    { sec: 'Overview', items: [
      { to: '/auditor',              icon: MdDashboard,  label: 'Dashboard' },
      { to: '/auditor/applications', icon: FiClipboard,  label: 'My Audits' },
    ]},
    { sec: 'Review', items: [
      { to: '/auditor/review-queue', icon: FiStar,      label: 'Review Queue' },
      { to: '/auditor/reports',      icon: FiBarChart2, label: 'Reports' },
    ]},
    { sec: 'Initial Audit', items: [
      { to: '/auditor/qms/form-01', icon: FiFileText, label: 'AUD-F-02 Application Form' },
      { to: '/auditor/qms/form-02', icon: FiFileText, label: 'AUD-F-03 App Rev & F03-01 Aud Pln' },
      { to: '/auditor/qms/form-03', icon: FiFileText, label: 'AUD-F-03A Audit Planning for 3 years' },
      { to: '/auditor/qms/form-04', icon: FiFileText, label: 'AD-F-03 Auditor(s) Declaration' },
      { to: '/auditor/qms/form-05', icon: FiFileText, label: 'AUD-F-05 S1 Plan & Schedule' },
      { to: '/auditor/qms/form-06', icon: FiFileText, label: 'AUD-F-07 S1 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-07', icon: FiFileText, label: 'AUD-F-09 S1 Report' },
      { to: '/auditor/qms/form-23', icon: FiFileText, label: 'AUD-F-09-B OFI/O Sheet' },
      { to: '/auditor/qms/form-08', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (A)' },
      { to: '/auditor/qms/form-09', icon: FiFileText, label: 'AUD-F-11 S2 Plan & Schedule' },
      { to: '/auditor/qms/form-10', icon: FiFileText, label: 'AUD-F-07 S2 Open & Clos Meeting' },
      { to: '/auditor/qms/form-11', icon: FiFileText, label: 'AUD-F-15 S2 Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-14', icon: FiFileText, label: 'AUD-F-21 Draft' },
      { to: '/auditor/qms/form-15', icon: FiFileText, label: 'AUD-F-22 REVIEW REPORT (B)' },
    ]},
    { sec: 'Surveillance - 1', items: [
      { to: '/auditor/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/auditor/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance I' },
      { to: '/auditor/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Surveillance - 2', items: [
      { to: '/auditor/qms/form-16', icon: FiFileText, label: 'F02 Application Form' },
      { to: '/auditor/qms/form-17', icon: FiFileText, label: 'AUD-F-06 Audit Schedule Surveillance II' },
      { to: '/auditor/qms/form-18', icon: FiFileText, label: 'AUD-F-07 Opening & Closing Meeting' },
      { to: '/auditor/qms/form-19', icon: FiFileText, label: 'AUD-F-15 Audit Report' },
      { to: '/auditor/qms/form-12', icon: FiFileText, label: 'AUD-F-16 CAR' },
      { to: '/auditor/qms/form-13', icon: FiFileText, label: 'AUD-F-17 CAR' },
      { to: '/auditor/qms/form-22', icon: FiFileText, label: 'ADMN-F-01 Continuation Letter' },
    ]},
    { sec: 'Recertification', items: [
    ]},
    { sec: 'Documents', items: [
      { to: '/auditor/documents', icon: FiFolder, label: 'Documents' },
    ]},
    { sec: 'System', items: [
      { to: '/auditor/settings', icon: FiSettings, label: 'Settings' },
    ]},
  ],
  sales: [
    { sec: 'Overview', items: [
      { to: '/sales',          icon: MdDashboard,  label: 'Dashboard' },
      { to: '/sales/pipeline', icon: FiTarget,     label: 'Sales Pipeline' },
    ]},
    { sec: 'Applications', items: [
      { to: '/sales/new-application',  icon: FiPlus,      label: 'New Application', badge: 'NEW' },
      { to: '/sales/applications',     icon: FiClipboard, label: 'View Audit Details', badge: 'QMS' },
    ]},
    { sec: 'Team', items: [
      { to: '/sales/team',   icon: FiUsers,     label: 'Sales Team' },
      { to: '/sales/leads',  icon: FiFileText,  label: 'Lead Management' },
      { to: '/sales/assign', icon: FiUserCheck, label: 'Assign Leads' },
    ]},
    { sec: 'Performance', items: [
      { to: '/sales/reports',  icon: FiBarChart2,  label: 'Sales Reports' },
      { to: '/sales/targets',  icon: FiTrendingUp, label: 'Targets & Quotas' },
    ]},
    { sec: 'System', items: [
      { to: '/sales/settings', icon: FiSettings, label: 'Settings' },
    ]},
  ],
};

// Initial-Audit-only forms (by formType, parsed from the route's /form-XX suffix):
// only the company's original (smallest) Client ID went through Initial Audit —
// every other Client ID for the same company is surveillance/recertification only.
const HIDDEN_FOR_NON_PRIMARY = new Set([3, 4, 5, 6, 7, 8, 23]);
const formTypeFromPath = (to) => {
  const m = to.match(/form-(\d+)$/);
  return m ? Number(m[1]) : null;
};

// Several formTypes (the CAR forms 12/13, the Application Form 1, …) are reachable
// from more than one of these sections — the "phase" tags which stage's copy of
// that formType a click should open (see backend/models/QMSForm.js `phase`).
// Matched by prefix because applyActiveClientNav relabels the Surveillance
// sections to "Surveillance - 1-<rank>" / "Surveillance - 2-<rank>".
const phaseForSectionName = (secName) => {
  if (secName === 'Initial Audit') return 'initial';
  if (secName.startsWith('Surveillance - 1')) return 'surv1';
  if (secName.startsWith('Surveillance - 2')) return 'surv2';
  if (secName === 'Recertification') return 'recert';
  return null;
};

// NAV defines 'Recertification' as an empty stub per role (its real, per-cycle
// item list is normally computed dynamically by buildCycleGroupedNav once a
// client is active). Populate it here too — mirroring 'Initial Audit', filtered
// the same way — so it isn't empty in the sidebar's default state either (right
// after login, before any client is searched/selected).
Object.values(NAV).forEach(sections => {
  const initial = sections.find(s => s.sec === 'Initial Audit');
  const recert  = sections.find(s => s.sec === 'Recertification');
  if (initial && recert) {
    recert.items = initial.items.filter(item => !HIDDEN_FOR_NON_PRIMARY.has(formTypeFromPath(item.to)));
  }
});

// Tailor the QMS Forms nav to whichever Client ID is currently open (see
// ActiveClientContext): the primary Client ID gets everything as-is; any other
// Client ID for the same company hides the Initial-Audit-only forms and gets its
// own numbered Surveillance cycle instead of the plain "Surveillance - 1/2" labels.
function applyActiveClientNav(sections, activeClient) {
  if (!activeClient || activeClient.isPrimaryClientId !== false) return sections;
  const rank = activeClient.clientRank || 1;
  return sections.map(s => {
    if (s.sec === 'Initial Audit') {
      return { ...s, items: s.items.filter(item => !HIDDEN_FOR_NON_PRIMARY.has(formTypeFromPath(item.to))) };
    }
    if (s.sec === 'Surveillance - 1') return { ...s, sec: `Surveillance - 1-${rank}` };
    if (s.sec === 'Surveillance - 2') return { ...s, sec: `Surveillance - 2-${rank}` };
    return s;
  });
}

// Once a Client ID itself has more than one certification cycle (Initial +
// Surveillances, then a fresh cycle per recertification-before-expiry — see
// ActiveClientContext/cycleCount), replace the flat Initial Audit / Surveillance -
// 1 / Surveillance - 2 / Recertification sections with one collapsible "Cycle N"
// group per cycle, each containing the same items (routes are unchanged — the admin
// still picks the client/cycle from the form page itself). A single-cycle client
// (the common case) is untouched, so the sidebar looks exactly like it does today.
const CYCLE_SECTION_NAMES = new Set(['Initial Audit', 'Surveillance - 1', 'Surveillance - 2', 'Recertification']);
function buildCycleGroupedNav(sections, activeClient) {
  if (!activeClient) return sections;
  const cycleSections = sections.filter(s => CYCLE_SECTION_NAMES.has(s.sec));
  if (!cycleSections.length) return sections;

  const cycles     = (activeClient.cycles && activeClient.cycles.length) ? activeClient.cycles : [1];
  const firstCycle = Math.min(...cycles);
  const initialAuditSection = cycleSections.find(s => s.sec === 'Initial Audit');
  const cycleGroups = cycles.map(c => {
    const isFirst = c === firstCycle;
    // Only the first cycle actually went through Initial Audit — every later
    // cycle (recertification-before-expiry) never gets an Initial Audit section.
    // The Recertification group always mirrors the same (filtered) form set —
    // in every cycle, including the first — regardless of whether Initial Audit
    // is also showing them. Groups with no items are dropped so an empty
    // Initial Audit / Recertification header never renders.
    const groups = cycleSections.map(s => {
      if (s.sec === 'Initial Audit') {
        return { label: s.sec, phase: 'initial', items: isFirst ? s.items : [] };
      }
      if (s.sec === 'Recertification' && initialAuditSection) {
        return {
          label: s.sec, phase: 'recert',
          items: initialAuditSection.items.filter(item => !HIDDEN_FOR_NON_PRIMARY.has(formTypeFromPath(item.to))),
        };
      }
      return { label: s.sec, phase: phaseForSectionName(s.sec) || 'initial', items: s.items };
    }).filter(g => g.items.length).map(g => ({ ...g, key: `cyclegrp-${c}-${g.label}` }));
    return { sec: `Cycle ${c}`, collapsible: true, key: `cycle-${c}`, groups };
  });

  const result = [];
  let inserted = false;
  sections.forEach(s => {
    if (CYCLE_SECTION_NAMES.has(s.sec)) {
      if (!inserted) { result.push(...cycleGroups); inserted = true; }
      return;
    }
    result.push(s);
  });
  return result;
}

// QMSFormPage has no way to know which client (or cycle) a sidebar click was
// meant to open — without this, navigating to e.g. /admin/qms/form-12 always lands
// on the generic "search a client" list view, which reads as "the form doesn't
// open." Once a client is active (picked via company search elsewhere), decorate
// every QMS form link with ?client=&cycle=&edit=1 so QMSFormPage's deep-link effect
// auto-resolves that exact client/cycle straight into the editable form.
function withClientDeepLinks(sections, activeClient) {
  if (!activeClient || !activeClient.clientId) return sections;
  const cid = encodeURIComponent(activeClient.clientId);
  const decorateItem = (item, cycle, phase) => {
    if (formTypeFromPath(item.to) == null || item.to.includes('?')) return item;
    return { ...item, to: `${item.to}?client=${cid}&cycle=${cycle}&edit=1&phase=${phase}` };
  };
  return sections.map(s => {
    if (s.groups) {
      const m = /^cycle-(\d+)$/.exec(s.key || '');
      const cycle = m ? m[1] : (activeClient.activeCycle || 1);
      return { ...s, groups: s.groups.map(g => ({ ...g, items: g.items.map(item => decorateItem(item, cycle, g.phase || 'initial')) })) };
    }
    if (s.items) {
      const phase = phaseForSectionName(s.sec) || 'initial';
      return { ...s, items: s.items.map(item => decorateItem(item, activeClient.activeCycle || 1, phase)) };
    }
    return s;
  });
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const { activeClient } = useActiveClient();
  const unsavedGuard = useUnsavedChangesGuard();
  const [pendingNav, setPendingNav] = useState(null); // target path while the unsaved-changes prompt is open
  const [navSaving,  setNavSaving]  = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const [open,            setOpen]            = useState(false);   // mobile drawer
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);  // desktop full hide
  // Desktop icon-only mode — persisted because each page mounts its own Layout,
  // so plain state would reset on every navigation
  const [mini,            setMini]            = useState(() => localStorage.getItem('sidebar_mini') === '1');
  useEffect(() => { localStorage.setItem('sidebar_mini', mini ? '1' : '0'); }, [mini]);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [profileImg,      setProfileImg]      = useState(null);
  const [collapsed,       setCollapsed]       = useState({ master: true, qmsForms: true });

  // Cycle-grouped nav (every "primary" Client ID — the common case, including a
  // brand-new one still on cycle 1) takes priority over the legacy clientRank
  // relabeling (built for the old scheme of a brand-new Client ID per cycle) — a
  // given active client should only ever be using one of the two mechanisms at a
  // time. A fresh single-cycle client still gets grouped as "Cycle 1" so its
  // Recertification phase (and the auto-next-cycle feature) is reachable from the
  // very first cycle, not only once a second cycle already exists.
  const secs = withClientDeepLinks(
    (activeClient && activeClient.isPrimaryClientId !== false)
      ? buildCycleGroupedNav(NAV[user?.role] || [], activeClient)
      : applyActiveClientNav(NAV[user?.role] || [], activeClient),
    activeClient
  );

  // "Cycle 1" starts open, every later cycle starts collapsed — every cycle points
  // at the same routes (the admin picks which cycle from the form page's own
  // selector, not the URL), so "the active route is inside this section" isn't a
  // useful signal to auto-open one over another here.
  const isSectionCollapsed = (key) => {
    if (key in collapsed) return collapsed[key];
    if (key && key.startsWith('cyclegrp-')) return false;
    if (key && key.startsWith('cycle-')) return key !== 'cycle-1';
    return false;
  };

  // Auto-expand the (non-cycle) section that contains the active route
  useEffect(() => {
    const updates = {};
    secs.forEach(s => {
      if (!s.collapsible || !s.key || s.key.startsWith('cycle-')) return;
      const hasActive = (s.items || []).some(item => {
        if (item.to.endsWith('/new')) return loc.pathname === item.to;
        return loc.pathname.startsWith(item.to);
      });
      if (hasActive) updates[s.key] = false; // false = expanded
    });
    if (Object.keys(updates).length) setCollapsed(p => ({ ...p, ...updates }));
  }, [loc.pathname, user?.role]); // eslint-disable-line
  const nRef        = useRef(null);
  const imgRef      = useRef(null);
  const sidebarNavRef = useRef(null);

  const unread = notifications.filter(n => !n.read).length;

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await axios.get('/api/users/me/notifications');
      setNotifications(data || []);
    } catch {}
  }, [user]);

  const handleNotifClick = async (n) => {
    if (!n.read) {
      try {
        await axios.put(`/api/users/me/notifications/${n._id}`);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      } catch {}
    }
    // Always close on click — older notifications created before links were added
    // to every notify call site otherwise give zero feedback when clicked.
    if (n.link) navigate(n.link);
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/users/me/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const isOn = (to) => {
    if (to === `/${user?.role}` || to === '/auditor') return loc.pathname === to;
    if (to.endsWith('/new')) return loc.pathname === to;
    return loc.pathname.startsWith(to) && !loc.pathname.startsWith(to + '/new');
  };

  // Scroll active nav item into view whenever sidebar opens or route changes
  useEffect(() => {
    const t = setTimeout(() => {
      const nav = sidebarNavRef.current;
      if (!nav) return;
      const active = nav.querySelector('.nav-link.active, .nav-sub-item.active');
      if (!active) { nav.scrollTop = 0; return; }
      const navRect    = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const offset     = activeRect.top - navRect.top - navRect.height / 3;
      nav.scrollBy({ top: offset, behavior: 'smooth' });
    }, open ? 160 : 60);
    return () => clearTimeout(t);
  }, [open, loc.pathname]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    const fn = e => { if (nRef.current && !nRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`profile_img_${user?._id}`);
    if (saved) setProfileImg(saved);
  }, [user?._id]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleProfileImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileImg(ev.target.result);
      localStorage.setItem(`profile_img_${user?._id}`, ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleCollapse = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // Nav item click: on desktop, collapse sidebar to icon-only mode.
  // Hovering the icon strip temporarily expands it (CSS); the hamburger
  // button restores the full sidebar permanently. Mobile drawer just closes.
  // If the currently-open QMS form has unsaved changes (see
  // UnsavedChangesContext), the navigation is held and a prompt is shown instead —
  // preventDefault() on the Link's click stops React Router from navigating.
  const finishNavClick = () => {
    setOpen(false);
    window.scrollTo(0, 0);
    if (window.innerWidth > 768) setMini(true);
  };
  const handleNavClick = (e, to) => {
    if (unsavedGuard?.current?.isDirty && to && to !== loc.pathname) {
      e.preventDefault();
      setPendingNav(to);
      return;
    }
    finishNavClick();
  };
  const proceedPendingNav = () => {
    const to = pendingNav;
    setPendingNav(null);
    finishNavClick();
    if (to) navigate(to);
  };
  const handleSaveAndLeave = async () => {
    const guard = unsavedGuard?.current;
    setNavSaving(true);
    let ok = true;
    try { if (guard?.onSave) ok = await guard.onSave(); } catch { ok = false; }
    setNavSaving(false);
    // Only leave once the save actually succeeded — if it failed, the form's own
    // save handler already showed an error toast; stay put so nothing is lost.
    if (ok !== false) proceedPendingNav();
  };
  const handleDiscardAndLeave = () => {
    unsavedGuard?.current?.onDiscard?.();
    proceedPendingNav();
  };

  const handleMenuToggle = () => {
    if (window.innerWidth > 768) {
      // Toggle between icon-only mini mode and the full sidebar
      setMini(m => !m);
    } else {
      setOpen(v => !v);
    }
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {open && (
        <div
          className="sidebar-overlay show"
          onClick={() => setOpen(false)}
          style={{ display: 'block', opacity: 1 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mini ? 'mini' : ''}`}>
        {/* Logo */}
        <div className="sidebar-top">
          <div className="logo-mark">
            <img src="/QC.png" alt="QC Certification" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="logo-text-top">QC Certification</div>
            <div className="logo-text-sub">ISO CRM Platform</div>
          </div>
          {/* Mobile close button */}
          <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Close sidebar">
            <FiX size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" ref={sidebarNavRef}>
          {secs.map((s, i) => (
            <div key={i}>
              {s.collapsible ? (
                <>
                  <button
                    className="nav-link"
                    style={{ justifyContent: 'space-between' }}
                    title={s.sec}
                    onClick={() => toggleCollapse(s.key)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FiActivity className="nav-icon" size={15} />
                      <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--primary-dark)' }}>
                        {s.sec}
                      </span>
                    </div>
                    <FiChevronDown
                      size={13}
                      className={`nav-chevron ${!isSectionCollapsed(s.key) ? 'open' : ''}`}
                    />
                  </button>
                  {!isSectionCollapsed(s.key) && (
                    <div className="nav-sub">
                      {s.groups ? s.groups.map((g, gi) => (
                        <div key={g.key || g.label + gi}>
                          <button
                            className="nav-group-label"
                            style={{ paddingLeft: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800, color: 'var(--primary-dark)', textAlign: 'left' }}
                            onClick={() => toggleCollapse(g.key)}
                          >
                            {g.label}
                            <FiChevronDown
                              size={11}
                              style={{ marginRight: 12 }}
                              className={`nav-chevron ${!isSectionCollapsed(g.key) ? 'open' : ''}`}
                            />
                          </button>
                          {!isSectionCollapsed(g.key) && g.items.map(item => (
                            <Link
                              key={item.to + item.label}
                              to={item.to}
                              className={`nav-sub-item ${isOn(item.to) ? 'active' : ''}`}
                              title={item.label}
                              onClick={(e) => handleNavClick(e, item.to)}
                            >
                              <span className="nav-sub-dot" />
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      )) : s.items.map(item => (
                        <Link
                          key={item.to + item.label}
                          to={item.to}
                          className={`nav-sub-item ${isOn(item.to) ? 'active' : ''}`}
                          title={item.label}
                          onClick={(e) => handleNavClick(e, item.to)}
                        >
                          <span className="nav-sub-dot" />
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="nav-group-label">{s.sec}</div>
                  {s.items.map(item => (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      className={`nav-link ${isOn(item.to) ? 'active' : ''}`}
                      title={item.label}
                      onClick={(e) => handleNavClick(e, item.to)}
                    >
                      <item.icon className="nav-icon" size={15} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                      {isOn(item.to) && <span className="nav-dot" />}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          <div className="user-row">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div className="u-avatar">
                {profileImg ? <img src={profileImg} alt="profile" /> : user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <label style={{ position: 'absolute', bottom: -2, right: -2, width: 15, height: 15, borderRadius: '50%', background: 'var(--primary)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <FiCamera size={7} color="white" />
                <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfileImg} />
              </label>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="u-name">{user?.name}</div>
              <div className="u-email">{user?.email}</div>
            </div>
          </div>
          <button className="u-logout" title="Sign out" onClick={() => { logout(); navigate('/login'); }}>
            <FiLogOut size={13} /> <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}${mini ? ' mini' : ''}`}>
        {/* Header */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="hdr-btn mob-menu-btn" onClick={handleMenuToggle}>
              <FiMenu size={17} />
            </button>
            <h1 className="page-heading">{title || 'Dashboard'}</h1>
          </div>
          <div className="top-bar-right">
            <div className="hdr-pill"><span className="hdr-dot" />System Online</div>
            <span className="hdr-role">{user?.role}</span>

            {/* Bell */}
            <div style={{ position: 'relative' }} ref={nRef}>
              <button className="hdr-btn" onClick={() => { setNotifOpen(v => !v); fetchNotifs(); }}>
                <FiBell size={15} />
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>

              {notifOpen && (
                <>
                  {/* Mobile backdrop */}
                  <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />

                  <div className="notif-panel">
                    {/* Header */}
                    <div className="notif-hdr">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiBell size={13} style={{ color: 'var(--primary)' }} />
                        <span className="notif-hdr-title">Notifications</span>
                        {unread > 0 && (
                          <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                            {unread} new
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {unread > 0 && (
                          <button onClick={markAllRead}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setNotifOpen(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', padding: 2 }}>
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="notif-list">
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>
                          <FiBell size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                          <div style={{ fontSize: 13, fontWeight: 600 }}>All caught up</div>
                          <div style={{ fontSize: 11, marginTop: 3 }}>No notifications yet</div>
                        </div>
                      ) : (
                        notifications.slice(0, 20).map((n) => {
                          const typeColor = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: 'var(--primary)' }[n.type] || 'var(--primary)';
                          const relTime   = (() => {
                            const diff = Date.now() - new Date(n.createdAt);
                            const m = Math.floor(diff / 60000);
                            if (m < 1)  return 'Just now';
                            if (m < 60) return `${m}m ago`;
                            const h = Math.floor(m / 60);
                            if (h < 24) return `${h}h ago`;
                            return new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                          })();
                          return (
                            <div key={n._id}
                              className={`notif-item ${!n.read ? 'unread' : ''} ${n.link ? 'notif-clickable' : ''}`}
                              onClick={() => handleNotifClick(n)}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor, flexShrink: 0, marginTop: 5 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="notif-msg">{n.message}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
                                    <span className="notif-time">{relTime}</span>
                                    {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <div
              style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-200)', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => imgRef.current?.click()}
            >
              {profileImg
                ? <img src={profileImg} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>
                    {user?.name?.slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>

      {/* Unsaved-changes prompt — shown when navigating away from a QMS form
          page that still has edits not yet saved (see UnsavedChangesContext) */}
      {pendingNav && (
        <div className="modal-bg" onClick={() => !navSaving && setPendingNav(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Unsaved changes</div>
              {!navSaving && <button className="modal-close" onClick={() => setPendingNav(null)}>✕</button>}
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--gray-600)', margin: 0 }}>
                You're leaving this form without saving. Save your changes as a draft before you go?
              </p>
            </div>
            <div className="modal-foot" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" disabled={navSaving} onClick={() => setPendingNav(null)}>Cancel</button>
              <button className="btn btn-ghost" disabled={navSaving} onClick={handleDiscardAndLeave}>Leave without saving</button>
              <button className="btn btn-primary" disabled={navSaving} onClick={handleSaveAndLeave}>
                {navSaving ? 'Saving…' : 'Save & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
