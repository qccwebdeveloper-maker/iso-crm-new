import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { MdDashboard, MdShield } from 'react-icons/md';
import {
  FiFileText, FiUsers, FiBarChart2, FiLogOut, FiBell, FiMenu, FiX,
  FiStar, FiMessageSquare, FiAward, FiFolder, FiSettings, FiPlus,
  FiCamera, FiTarget, FiTrendingUp, FiUserCheck, FiBookOpen,
  FiSend, FiAlertTriangle, FiChevronDown, FiActivity,
  FiSearch, FiCreditCard, FiClipboard, FiDownload
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
      { to: '/admin/users',         icon: FiUsers,      label: 'Users' },
      { to: '/admin/roles',         icon: MdShield,     label: 'Roles' },
    ]},

    { sec: 'Applications', items: [
      { to: '/admin/feedback',              icon: FiMessageSquare, label: 'Reviews & Feedback' },
    ]},

    { sec: 'Documents & Comm.', items: [
      { to: '/admin/certificates',  icon: FiAward, label: 'Certificates' },
      { to: '/admin/payments',      icon: FiCreditCard, label: 'Payment Tracking' },
    ]},
    { sec: 'Leads', items: [
      { to: '/admin/leads', icon: FiTarget, label: 'Lead Management', badge: 'NEW' },
    ]},
    { sec: 'Initial Audit', items: [
      { to: '/admin/qms/form-01', icon: FiFileText, label: 'F01 · Application Form' },
      { to: '/admin/qms/form-02', icon: FiFileText, label: 'F02 · Application Review' },
      { to: '/admin/qms/form-03', icon: FiFileText, label: 'F03 · Audit Planning 3yr' },
      { to: '/admin/qms/form-04', icon: FiFileText, label: 'F04 · Auditor Declaration' },
      { to: '/admin/qms/form-05', icon: FiFileText, label: 'F05 · Stage-1 Audit Plan' },
      { to: '/admin/qms/form-06', icon: FiFileText, label: 'F06 · Stage-1 Meetings' },
      { to: '/admin/qms/form-07', icon: FiFileText, label: 'F07 · Stage-1 Audit Report' },
      { to: '/admin/qms/form-08', icon: FiFileText, label: 'F08 · Stage-1 Review Report' },
      { to: '/admin/qms/form-09', icon: FiFileText, label: 'F09 · Stage-2 Audit Plan' },
      { to: '/admin/qms/form-10', icon: FiFileText, label: 'F10 · Stage-2 Meetings' },
      { to: '/admin/qms/form-11', icon: FiFileText, label: 'F11 · Stage-2 Audit Report' },
      { to: '/admin/qms/form-12', icon: FiFileText, label: 'F12 · CAR Request' },
      { to: '/admin/qms/form-13', icon: FiFileText, label: 'F13 · CAR Report' },
      { to: '/admin/qms/form-14', icon: FiFileText, label: 'F14 · Draft Certificate' },
      { to: '/admin/qms/form-15', icon: FiFileText, label: 'F15 · Final Review Report' },
    ]},
    { sec: 'Surveillance / Recertification / Special Audit', items: [
      { to: '/admin/qms/form-16', icon: FiFileText, label: 'F16 · Application Form' },
      { to: '/admin/qms/form-17', icon: FiFileText, label: 'F17 · Audit Plan' },
      { to: '/admin/qms/form-18', icon: FiFileText, label: 'F18 · Meetings' },
      { to: '/admin/qms/form-19', icon: FiFileText, label: 'F19 · Audit Report' },
      { to: '/admin/qms/form-20', icon: FiFileText, label: 'F20 · Report Review' },
      { to: '/admin/qms/form-21', icon: FiFileText, label: 'F21 · Surveillance CAR Report' },
      { to: '/admin/qms/form-22', icon: FiFileText, label: 'F22 · Letter of Continuation' },
    ]},
    { sec: 'Tools', items: [
      { to: '/admin/qms/download', icon: FiDownload, label: 'Download Forms (PDF)' },
    ]},
  ],
  client: [
    { sec: 'Overview', items: [
      { to: '/client',              icon: MdDashboard,  label: 'Dashboard' },
      { to: '/client/applications', icon: FiFileText,   label: 'My Applications' },
    ]},
    { sec: 'Application', items: [
      { to: '/client/qms/form-01', icon: FiFileText, label: 'F01 · Application Form' },
    ]},
    { sec: 'Reports', items: [
      { to: '/client/team-reports',   icon: FiClipboard, label: 'Team & Reports' },
    ]},
    { sec: 'Documents', items: [
      { to: '/client/documents',    icon: FiFolder, label: 'Documents & Forms' },
      { to: '/client/certificates', icon: FiAward,  label: 'My Certificates' },
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

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
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

  // Auto-expand the section that contains the active route
  useEffect(() => {
    const nav = NAV[user?.role] || [];
    const updates = {};
    nav.forEach(s => {
      if (s.collapsible && s.key) {
        const hasActive = s.items.some(item => {
          if (item.to.endsWith('/new')) return loc.pathname === item.to;
          return loc.pathname.startsWith(item.to);
        });
        if (hasActive) updates[s.key] = false; // false = expanded
      }
    });
    if (Object.keys(updates).length) setCollapsed(p => ({ ...p, ...updates }));
  }, [loc.pathname, user?.role]);
  const nRef        = useRef(null);
  const imgRef      = useRef(null);
  const sidebarNavRef = useRef(null);

  const secs   = NAV[user?.role] || [];
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
    if (n.link) { navigate(n.link); setNotifOpen(false); }
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
  const handleNavClick = () => {
    setOpen(false);
    window.scrollTo(0, 0);
    if (window.innerWidth > 768) setMini(true);
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
                      className={`nav-chevron ${!collapsed[s.key] ? 'open' : ''}`}
                    />
                  </button>
                  {!collapsed[s.key] && (
                    <div className="nav-sub">
                      {s.items.map(item => (
                        <Link
                          key={item.to + item.label}
                          to={item.to}
                          className={`nav-sub-item ${isOn(item.to) ? 'active' : ''}`}
                          title={item.label}
                          onClick={handleNavClick}
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
                      onClick={handleNavClick}
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
                                    {n.link && (
                                      <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        View →
                                      </span>
                                    )}
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
    </div>
  );
}
