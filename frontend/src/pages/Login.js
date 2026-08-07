import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  User, Search, BarChart2, Shield, Lock,
  Eye, EyeOff, AlertTriangle, CheckCircle, CheckCircle2,
  ArrowRight, ArrowLeft, ClipboardList, Mail,
  Loader2,
} from 'lucide-react';

const ISO_STANDARDS = [
  'ISO 9001:2015',
  'ISO 14001:2015',
  'ISO 22000:2018',
  'ISO 27001:2022',
  'ISO 45001:2018',
];

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #e8f0fe 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  blob1: { position: 'fixed', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'rgba(21,101,192,0.07)', pointerEvents: 'none' },
  blob2: { position: 'fixed', bottom: -80, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(13,71,161,0.05)', pointerEvents: 'none' },
  card: { background: 'white', borderRadius: 24, padding: '34px 32px 28px', boxShadow: '0 20px 60px rgba(21,101,192,0.14)', border: '1.5px solid #90caf9' },
  logoWrap: { textAlign: 'center', marginBottom: 24 },
  logoIcon: { width: 64, height: 64, borderRadius: '50%', background: '#ffffff', border: '2px solid #bbdefb', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(21,101,192,0.18)', overflow: 'hidden' },
  h1: { fontSize: 19, fontWeight: 800, color: '#0d1b2a', margin: '0 0 3px' },
  sub: { fontSize: 11.5, color: '#1565c0', margin: 0, fontWeight: 600 },
  tabs: { display: 'flex', background: '#e3f2fd', borderRadius: 11, padding: 3, marginBottom: 22, border: '1px solid #90caf9' },
  label: { display: 'block', fontSize: 10.5, fontWeight: 700, color: '#0d47a1', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' },
  btnMain: { width: '100%', padding: '12px 0', border: 'none', borderRadius: 11, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#1565c0,#0d47a1)', boxShadow: '0 4px 14px rgba(21,101,192,0.32)', transition: 'opacity .15s' },
};

function inp(focused) {
  return { width: '100%', padding: '10px 13px', border: `1.5px solid ${focused ? '#1565c0' : '#90caf9'}`, borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", boxSizing: 'border-box', background: '#f0f4f8', color: '#0d1b2a', transition: 'border .15s' };
}

function FInput({ type = 'text', placeholder, value, onChange, required = true, name, onEnter }) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} name={name}
      style={inp(f)}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
      onKeyDown={onEnter ? e => e.key === 'Enter' && onEnter() : undefined}
    />
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={S.label}>{label}{required && <span style={{ color: '#1565c0' }}> *</span>}</label>
      {children}
    </div>
  );
}

function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === 'error'
    ? { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }
    : { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' };
  return (
    <div style={{ ...styles, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      {type === 'error' ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{msg}</span>
    </div>
  );
}

function OtpInput({ value, onChange }) {
  const refs = useRef([]);
  const boxes = Array.from({ length: 6 });

  const handleChange = (e, i) => {
    const v = e.target.value.replace(/\D/, '').slice(-1);
    const arr = (value || '      ').split('');
    arr[i] = v || ' ';
    onChange(arr.join(''));
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (e, i) => {
    if (e.key === 'Backspace') {
      const arr = (value || '      ').split('');
      if (!arr[i] || arr[i] === ' ') { if (i > 0) { refs.current[i - 1]?.focus(); } }
      else { arr[i] = ' '; onChange(arr.join('')); }
    }
  };
  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length) { onChange(paste.padEnd(6, ' ')); refs.current[Math.min(paste.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '14px 0' }}>
      {boxes.map((_, i) => {
        const digit = (value || '      ')[i]?.trim() || '';
        return (
          <input key={i} ref={el => (refs.current[i] = el)}
            type="text" inputMode="numeric" maxLength={1} value={digit}
            onChange={e => handleChange(e, i)} onKeyDown={e => handleKey(e, i)} onPaste={handlePaste}
            style={{ width: 42, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 800, border: `2px solid ${digit ? '#1565c0' : '#90caf9'}`, borderRadius: 11, outline: 'none', background: digit ? '#e3f2fd' : '#f0f4f8', color: '#0d47a1', fontFamily: 'monospace', transition: 'all .15s' }}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
export default function Login() {
  const [tab, setTab] = useState('login');
  // Role is chosen by the URL path: /login/admin | /login/client | /login/auditor | /login/sales.
  // Bare /login defaults to client.
  const { role } = useParams();
  const initialMode = ['admin', 'auditor', 'sales', 'client'].includes(role) ? role : 'client';
  const [loginMode, setLoginMode] = useState(initialMode);
  const showRoleTabs = false;                  // single-form login per link — hide the role switcher
  const allowRegister = initialMode === 'client'; // only clients can self-register (Create Account)

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  const [otpSent, setOtpSent]  = useState(false);
  const [otp, setOtp]          = useState('      ');
  const [timer, setTimer]      = useState(0);
  const timerRef               = useRef(null);
  const [otpVia, setOtpVia]    = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const [reg, setReg] = useState({ companyName: '', email: '', password: '', mobile: '', address: '', standard: '', scope: '' });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [serverReady, setServerReady] = useState(false);

  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();

  // Health check against the same origin (nginx proxies /api -> backend),
  // so there's no CORS and no external cold-start to wait on.
  useEffect(() => {
    const warmUp = async () => {
      try {
        await axios.get('/api/health', { timeout: 70000 });
      } catch { /* ignore — server is up or unreachable */ }
      setServerReady(true);
    };
    warmUp();
    return () => { clearInterval(timerRef.current); };
  }, []);

  const startTimer = (sec = 60) => {
    setTimer(sec);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
  };

  const clear = () => { setErr(''); setMsg(''); };

  const getErrMsg = (ex, fallback) => {
    if (!ex.response) {
      if (ex.code === 'ERR_NETWORK' || ex.message?.includes('Network Error') || ex.message?.includes('ECONNREFUSED')) {
        return 'Cannot connect to server. Make sure the backend is running on port 5000.';
      }
      return 'Server is not responding. Please start the backend server and try again.';
    }
    return ex.response?.data?.message || fallback;
  };

  const handleLogin = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    if (!serverReady) setMsg('Server is waking up, please wait…');
    try {
      const user = await login(email, password);
      navigate(user.role === 'reviewer' ? '/auditor' : `/${user.role}`);
    } catch (ex) {
      setErr(getErrMsg(ex, 'Invalid email or password.'));
    } finally { setLoading(false); }
  };

  const handleSendOtp = async () => {
    if (!adminEmail || !/\S+@\S+\.\S+/.test(adminEmail)) { setErr('Enter a valid admin email address.'); return; }
    clear(); setPreviewUrl(''); setOtpVia(''); setLoading(true);
    if (!serverReady) setMsg('Server is waking up, please wait…');
    try {
      const { data } = await axios.post('/api/auth/send-otp',
        { email: adminEmail.trim().toLowerCase() },
        { timeout: 90000 }
      );
      setOtpSent(true);
      setOtpVia(data.via || '');
      setPreviewUrl(data.previewUrl || '');
      setMsg(data.previewUrl
        ? `OTP ready — click the button below to view it.`
        : `OTP sent to ${adminEmail}. Check your inbox.`);
      startTimer(60);
    } catch (ex) {
      setErr(getErrMsg(ex, 'Failed to send OTP. The server may still be waking up — please try again in 30 seconds.'));
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const otpVal = otp.replace(/\s/g, '');
    if (otpVal.length < 6) { setErr('Enter the complete 6-digit OTP.'); return; }
    clear(); setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/verify-otp', { email: adminEmail.trim().toLowerCase(), otp: otpVal });
      loginWithToken(data, data.token);
      navigate('/admin');
    } catch (ex) {
      setErr(getErrMsg(ex, 'Invalid OTP. Please try again.'));
    } finally { setLoading(false); }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setErr('Enter your Client ID and password.'); return; }
    clear(); setLoading(true);
    if (!serverReady) setMsg('Server is waking up, please wait…');
    try {
      const { data } = await axios.post('/api/auth/client-login', { clientId: email.trim(), password });
      loginWithToken(data, data.token);
      navigate('/client');
    } catch (ex) {
      setErr(getErrMsg(ex, 'Invalid Client ID or password.'));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); clear();
    const { companyName, email: re, password: rp, mobile, address, standard, scope } = reg;
    if (!companyName || !re || !rp || !mobile || !address || !standard || !scope) { setErr('All fields are required.'); return; }
    if (rp.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await axios.post('/api/auth/register-client', reg);
      setTab('success');
    } catch (ex) {
      setErr(getErrMsg(ex, 'Registration failed. Please try again.'));
    } finally { setLoading(false); }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => { setTab(id); clear(); }}
      style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, background: tab === id ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'transparent', color: tab === id ? 'white' : '#9ca3af', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
      {label}
    </button>
  );

  const modePill = (id, label) => (
    <button onClick={() => { setLoginMode(id); clear(); setOtpSent(false); setOtp('      '); setAdminEmail(''); setPreviewUrl(''); setOtpVia(''); setEmail(''); setPassword(''); }}
      style={{ flex: 1, padding: '7px 4px', border: `1.5px solid ${loginMode === id ? '#1565c0' : '#bbdefb'}`, borderRadius: 9, background: loginMode === id ? '#e3f2fd' : 'transparent', color: loginMode === id ? '#1565c0' : '#9ca3af', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {label}
    </button>
  );

  return (
    <div style={S.page}>
      <div style={S.blob1} /><div style={S.blob2} />

      <div style={{ width: '100%', maxWidth: tab === 'register' ? 520 : 428, position: 'relative' }}>
        <div style={S.card}>

          {/* Logo */}
          <div style={S.logoWrap}>
            <div style={S.logoIcon}>
              <img src="/QC.png" alt="QC Certification"
                style={{ width: 56, height: 56, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="color:#1565c0;font-size:18px;font-weight:900">QC</span>'; }} />
            </div>
            <h1 style={S.h1}>QC Certification CRM</h1>
            <p style={S.sub}>ISO Certification Management Platform</p>
          </div>

          {/* Tabs */}
          {tab !== 'success' && allowRegister && (
            <div style={S.tabs}>
              {tabBtn('login', 'Sign In')}
              {tabBtn('register', 'Create Account')}
            </div>
          )}

          {!serverReady && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '9px 14px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              Connecting to server…
            </div>
          )}
          <Alert type="error" msg={err} />
          <Alert type="success" msg={msg} />

          {/* ────── LOGIN TAB ────── */}
          {tab === 'login' && (
            <>
              {showRoleTabs && (
                <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
                  {modePill('client',  <><User size={12} /> Client</>)}
                  {modePill('auditor', <><Search size={12} /> Auditor</>)}
                  {modePill('sales',   <><BarChart2 size={12} /> Sales</>)}
                  {modePill('admin',   <><Shield size={12} /> Admin OTP</>)}
                </div>
              )}

              {/* Admin OTP login */}
              {loginMode === 'admin' && (
                <div>
                  {!otpSent ? (
                    <>
                      <Field label="Admin Email Address" required>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="email" placeholder="Enter admin email" value={adminEmail}
                            onChange={e => setAdminEmail(e.target.value)}
                            style={{ ...inp(false), flex: 1 }}
                            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                          />
                          <button onClick={handleSendOtp} disabled={loading}
                            style={{ ...S.btnMain, width: 'auto', padding: '0 18px', flexShrink: 0, boxShadow: 'none', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />}
                            {loading ? 'Sending…' : 'Send OTP'}
                          </button>
                        </div>
                      </Field>
                    </>
                  ) : (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 12.5, color: '#6b7280' }}>
                          OTP sent to <strong style={{ color: '#0d1b2a' }}>{adminEmail}</strong>
                        </div>
                        {otpVia === 'gmail' ? (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <CheckCircle size={12} /> Check your inbox (and spam folder)
                          </div>
                        ) : previewUrl ? (
                          <a href={previewUrl} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 18px', background: 'linear-gradient(135deg,#1565c0,#0d47a1)', color: 'white', borderRadius: 9, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
                            <Mail size={13} /> Click here to view your OTP
                          </a>
                        ) : (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <CheckCircle size={12} /> Check your inbox (and spam folder)
                          </div>
                        )}
                      </div>

                      <p style={{ textAlign: 'center', fontSize: 11.5, color: '#9ca3af', margin: '6px 0 2px' }}>Enter the 6-digit code below</p>
                      <OtpInput value={otp} onChange={setOtp} />
                      <button onClick={handleVerifyOtp} disabled={loading || otp.replace(/\s/g,'').length < 6}
                        style={{ ...S.btnMain, opacity: (loading || otp.replace(/\s/g,'').length < 6) ? 0.55 : 1, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
                        {loading ? 'Verifying…' : 'Open Admin Dashboard'}
                      </button>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => { setOtpSent(false); setOtp('      '); setPreviewUrl(''); setOtpVia(''); clear(); }}
                          style={{ background: 'none', border: 'none', fontSize: 11.5, color: '#1565c0', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ArrowLeft size={12} /> Change email
                        </button>
                        {timer > 0
                          ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>Resend in {timer}s</span>
                          : <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', fontSize: 11.5, color: '#1565c0', cursor: 'pointer', fontFamily: 'inherit' }}>Resend OTP</button>
                        }
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Client login — Client ID + password */}
              {loginMode === 'client' && (
                <div>
                  <form onSubmit={handleClientLogin}>
                    <Field label="Client ID" required>
                      <FInput type="text" placeholder="Enter your Client ID"
                        value={email} onChange={e => setEmail(e.target.value)} />
                    </Field>
                    <Field label="Password" required>
                      <div style={{ position: 'relative' }}>
                        <input type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                          value={password} onChange={e => setPassword(e.target.value)} required
                          style={{ ...inp(false), paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <button type="submit" disabled={loading} style={{ ...S.btnMain, marginTop: 6, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
                      {loading ? 'Signing in…' : 'Client Login'}
                    </button>
                  </form>
                </div>
              )}

              {/* Auditor / Sales login — password only */}
              {(loginMode === 'auditor' || loginMode === 'sales') && (
                <form onSubmit={handleLogin}>
                  <Field label="Email Address" required>
                    <FInput type="email"
                      placeholder={loginMode === 'auditor' ? 'auditor@crm.com' : 'sales@crm.com'}
                      value={email} onChange={e => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Password" required>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                        value={password} onChange={e => setPassword(e.target.value)} required
                        style={{ ...inp(false), paddingRight: 40 }} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <button type="submit" disabled={loading} style={{ ...S.btnMain, marginTop: 6, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
                    {loading ? 'Signing in…' : `${loginMode === 'auditor' ? 'Auditor' : 'Sales'} Login`}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ────── REGISTER TAB ────── */}
          {tab === 'register' && allowRegister && (
            <form onSubmit={handleRegister}>
              <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10, padding: '10px 13px', marginBottom: 18, fontSize: 11.5, color: '#0d47a1', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <ClipboardList size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>New Client Registration</strong> — fill all fields to create your account. Admin will activate it shortly.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Company Name" required>
                    <FInput placeholder="ABC Manufacturing Ltd" value={reg.companyName} onChange={e => setReg(r => ({ ...r, companyName: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Email" required>
                  <FInput type="email" placeholder="info@company.com" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} />
                </Field>
                <Field label="Password" required>
                  <FInput type="password" placeholder="Min 6 characters" value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} />
                </Field>
                <Field label="Mobile" required>
                  <FInput type="tel" placeholder="9XXXXXXXXX" value={reg.mobile} onChange={e => setReg(r => ({ ...r, mobile: e.target.value.replace(/\D/g,'').slice(0,10) }))} />
                </Field>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Address" required>
                    <FInput placeholder="Full address with city & state" value={reg.address} onChange={e => setReg(r => ({ ...r, address: e.target.value }))} />
                  </Field>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="ISO Standard" required>
                    <select value={reg.standard} onChange={e => setReg(r => ({ ...r, standard: e.target.value }))} required
                      style={{ ...inp(false), cursor: 'pointer' }}>
                      <option value="">Select ISO Standard</option>
                      {ISO_STANDARDS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Organization Activity / Scope" required>
                    <textarea value={reg.scope} onChange={e => setReg(r => ({ ...r, scope: e.target.value }))} required rows={3}
                      placeholder="Describe your organization's main activities and certification scope…"
                      style={{ ...inp(false), resize: 'vertical', lineHeight: 1.5 }} />
                  </Field>
                </div>
              </div>

              <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '0 0 14px' }}>
                <span style={{ color: '#1565c0' }}>*</span> Required Field
              </p>
              <button type="submit" disabled={loading} style={{ ...S.btnMain, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
                {loading ? 'Creating Account…' : 'Create My Account'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 14, marginBottom: 0 }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); clear(); }}
                  style={{ background: 'none', border: 'none', color: '#1565c0', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Sign In</button>
              </p>
            </form>
          )}

          {/* ────── SUCCESS TAB ────── */}
          {tab === 'success' && (
            <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                <CheckCircle2 size={52} color="#1565c0" strokeWidth={1.5} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0d1b2a', margin: '0 0 8px' }}>Thank You for Registering!</h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px', lineHeight: 1.5 }}>
                Your profile has been submitted and is <strong>under review by the admin</strong>. We'll activate your account shortly — you'll be able to log in once it's approved.
              </p>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: '#166534', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle size={13} /> Registration submitted successfully.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Shield size={13} /> Your profile is under review by the admin.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Mail size={13} /> The admin will share your login credentials once your account is activated.</div>
              </div>

              <button onClick={() => { setTab('login'); setLoginMode('client'); clear(); }} style={{ ...S.btnMain, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <ArrowRight size={14} /> Go to Login
              </button>
            </div>
          )}
        </div>

        {tab !== 'success' && (
          <p style={{ textAlign: 'center', fontSize: 11, color: '#1565c0', marginTop: 13, marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Lock size={11} /> Secure platform · ISO Certification Management
          </p>
        )}
      </div>
    </div>
  );
}
