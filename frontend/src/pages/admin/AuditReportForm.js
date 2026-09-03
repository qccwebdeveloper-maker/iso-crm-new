import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Save, FileText, Eye, UserCheck, UserX, ArrowLeft, CheckCircle } from 'lucide-react';
import {
  STEPS, initState, PreviewModal,
  Step1, Step2, Step3, Step4, Step5, Step6, Step7,
  inp, sel,
} from './AuditStepComponents';

export default function AuditReportForm() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [data,           setData]           = useState(initState());
  const [saving,         setSaving]         = useState(false);
  const [loading,        setLoading]        = useState(!!id);
  const [showPreview,    setShowPreview]    = useState(false);
  const [reportId,       setReportId]       = useState(id || null);
  const [activeSection,  setActiveSection]  = useState(1);

  const [clientId,           setClientId]           = useState('');
  const [clientInfo,         setClientInfo]         = useState(null);
  const [assignedAuditor,    setAssignedAuditor]    = useState(null);
  const [assignedReviewer,   setAssignedReviewer]   = useState(null);
  const [auditors,           setAuditors]           = useState([]);
  const [reviewers,          setReviewers]          = useState([]);
  const [selectedAuditorId,  setSelectedAuditorId]  = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [assigning,          setAssigning]          = useState(false);
  const [assigningReviewer,  setAssigningReviewer]  = useState(false);

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (id) {
      setLoading(true);
      axios.get(`/api/audit-reports/${id}`)
        .then(res => {
          const r = res.data;
          setData({ ...initState(), ...r });
          setClientId(r.clientId || '');
          setClientInfo(r.client || null);
          setAssignedAuditor(r.assignedAuditor || null);
          setAssignedReviewer(r.assignedReviewer || null);
          setReportId(r._id);
        })
        .catch(() => toast.error('Failed to load report'))
        .finally(() => setLoading(false));
    }
    axios.get('/api/auditors').then(res => {
      const list = res.data || [];
      setAuditors(list.filter(u => u.role === 'auditor'));
      setReviewers(list.filter(u => u.role === 'reviewer'));
    }).catch(() => {});
  }, [id]);

  const handleSave = async (asDraft = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...data, clientId, status: asDraft ? 'draft' : 'in_progress' };
      if (reportId) {
        const res = await axios.put(`/api/audit-reports/${reportId}`, payload);
        setClientInfo(res.data.client || null);
        setAssignedAuditor(res.data.assignedAuditor || null);
        setAssignedReviewer(res.data.assignedReviewer || null);
        toast.success(asDraft ? 'Draft saved!' : 'Report saved!');
      } else {
        const res = await axios.post('/api/audit-reports', payload);
        const newId = res.data._id;
        setReportId(newId);
        setClientInfo(res.data.client || null);
        setAssignedAuditor(res.data.assignedAuditor || null);
        setAssignedReviewer(res.data.assignedReviewer || null);
        navigate(`/admin/audit-reports/${newId}`, { replace: true });
        toast.success('Report created!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (assigning) return;
    if (!reportId) { toast.error('Save report first before assigning auditor'); return; }
    if (!selectedAuditorId) { toast.error('Please select an auditor'); return; }
    setAssigning(true);
    try {
      const res = await axios.post(`/api/audit-reports/${reportId}/assign`, { auditorId: selectedAuditorId });
      setAssignedAuditor(res.data.assignedAuditor);
      toast.success('Auditor assigned successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign auditor');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignReviewer = async () => {
    if (assigningReviewer) return;
    if (!reportId) { toast.error('Save report first before assigning reviewer'); return; }
    if (!selectedReviewerId) { toast.error('Please select a reviewer'); return; }
    setAssigningReviewer(true);
    try {
      const res = await axios.post(`/api/audit-reports/${reportId}/assign`, { reviewerId: selectedReviewerId });
      setAssignedReviewer(res.data.assignedReviewer);
      toast.success('Reviewer assigned successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign reviewer');
    } finally {
      setAssigningReviewer(false);
    }
  };

  const handleUnassignReviewer = async () => {
    if (assigningReviewer) return;
    if (!reportId) return;
    setAssigningReviewer(true);
    try {
      await axios.post(`/api/audit-reports/${reportId}/unassign-reviewer`);
      setAssignedReviewer(null);
      setSelectedReviewerId('');
      toast.success('Reviewer unassigned');
    } catch {
      toast.error('Failed to unassign reviewer');
    } finally {
      setAssigningReviewer(false);
    }
  };

  const handleUnassign = async () => {
    if (assigning) return;
    if (!reportId) return;
    setAssigning(true);
    try {
      await axios.post(`/api/audit-reports/${reportId}/unassign`);
      setAssignedAuditor(null);
      setSelectedAuditorId('');
      toast.success('Auditor unassigned');
    } catch {
      toast.error('Failed to unassign auditor');
    } finally {
      setAssigning(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(`audit-sec-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionId);
  };

  const selectedStandards = data.standards || [];

  const STEP_CONTENT = [Step1, Step2, Step3, Step4, Step5, Step6, Step7];

  if (loading) {
    return (
      <Layout title="Audit Report">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={reportId ? 'Edit Audit Report' : 'New QMS Audit Report'}>
      <div className="audit-wrap">

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/admin/audit-reports')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--gray-800)' }}>
                {reportId ? 'Edit Audit Report' : 'New QMS Audit Report'}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
                Quality Control Certification — Complete Audit Documentation Package
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowPreview(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--primary)', background: '#fff7ed', color: 'var(--primary-dark)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              <Eye size={14} /> Preview
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: 'var(--gray-700)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* ── Client ID + Auditor row ── */}
        <div className="audit-meta-row">
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Client Linking</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Enter client ID to link report..."
                style={{ ...inp, flex: 1 }}
              />
            </div>
            {clientInfo && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12 }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span style={{ color: '#15803d', fontWeight: 600 }}>{clientInfo.name}</span>
                <span style={{ color: '#86efac' }}>·</span>
                <span style={{ color: '#15803d' }}>{clientInfo.email}</span>
              </div>
            )}
            {!clientInfo && clientId && (
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500, display: 'block', marginTop: 6 }}>
                Client not resolved yet — save to link
              </span>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Assign Auditor</div>
            {assignedAuditor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d', whiteSpace: 'nowrap' }}>✓ {assignedAuditor.name}</span>
                  <span style={{ fontSize: 12, color: '#86efac' }}>·</span>
                  <span style={{ fontSize: 12, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignedAuditor.email}</span>
                </div>
                <button
                  onClick={handleUnassign}
                  disabled={assigning}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: assigning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                >
                  <UserX size={13} /> {assigning ? '...' : 'Remove'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={selectedAuditorId}
                  onChange={e => setSelectedAuditorId(e.target.value)}
                  style={{ ...sel, flex: 1, minWidth: 180 }}
                >
                  <option value="">Select auditor...</option>
                  {auditors.map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedAuditorId}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: selectedAuditorId ? 'var(--primary)' : '#e2e8f0', color: selectedAuditorId ? 'white' : 'var(--gray-400)', cursor: (assigning || !selectedAuditorId) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  <UserCheck size={13} /> {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            )}
            {!reportId && (
              <span style={{ fontSize: 10.5, color: 'var(--gray-400)', display: 'block', marginTop: 6 }}>
                Save report first to enable assignment
              </span>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Assign Reviewer</div>
            {assignedReviewer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d', whiteSpace: 'nowrap' }}>✓ {assignedReviewer.name}</span>
                  <span style={{ fontSize: 12, color: '#86efac' }}>·</span>
                  <span style={{ fontSize: 12, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignedReviewer.email}</span>
                </div>
                <button
                  onClick={handleUnassignReviewer}
                  disabled={assigningReviewer}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: assigningReviewer ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                >
                  <UserX size={13} /> {assigningReviewer ? '...' : 'Remove'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={selectedReviewerId}
                  onChange={e => setSelectedReviewerId(e.target.value)}
                  style={{ ...sel, flex: 1, minWidth: 180 }}
                >
                  <option value="">Select reviewer...</option>
                  {reviewers.map(r => <option key={r._id} value={r._id}>{r.name} ({r.email})</option>)}
                </select>
                <button
                  onClick={handleAssignReviewer}
                  disabled={assigningReviewer || !selectedReviewerId}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: selectedReviewerId ? 'var(--primary)' : '#e2e8f0', color: selectedReviewerId ? 'white' : 'var(--gray-400)', cursor: (assigningReviewer || !selectedReviewerId) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  <UserCheck size={13} /> {assigningReviewer ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            )}
            {!reportId && (
              <span style={{ fontSize: 10.5, color: 'var(--gray-400)', display: 'block', marginTop: 6 }}>
                Save report first to enable assignment
              </span>
            )}
          </div>
        </div>

        {/* ── Selected Standards Banner ── */}
        {selectedStandards.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Standards:</span>
            {selectedStandards.map(s => (
              <span key={s} style={{ padding: '3px 10px', borderRadius: 20, background: 'white', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 600, color: 'var(--primary-dark)' }}>{s}</span>
            ))}
          </div>
        )}

        {/* ── Main layout: sidebar + sections ── */}
        <div className="audit-layout">

          {/* Sidebar stepper */}
          <div className="audit-sidebar">
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: '14px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, paddingLeft: 6 }}>
                {selectedStandards.length > 0
                  ? selectedStandards[0].split(':')[0] + ' Audit Sections'
                  : 'Audit Sections'}
              </div>
              <div className="audit-sidebar-inner" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {STEPS.map(s => {
                  const isActive = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      className="audit-nav-btn"
                      onClick={() => scrollToSection(s.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: 'none', borderLeft: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        background: isActive ? '#fff7ed' : 'transparent',
                        cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: isActive ? 'var(--primary)' : '#f1f5f9',
                        color: isActive ? 'white' : 'var(--gray-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                      }}>{s.id}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary-dark)' : 'var(--gray-700)', lineHeight: 1.3 }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--gray-400)', fontFamily: 'monospace', marginTop: 1 }}>{s.code}</div>
                        {/* Standard badges for audit stage sections */}
                        {selectedStandards.length > 0 && [5, 6, 7].includes(s.id) && (
                          <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                            {selectedStandards.slice(0, 2).map(std => (
                              <span key={std} style={{ fontSize: 8.5, background: '#fff7ed', color: 'var(--primary)', padding: '1px 5px', borderRadius: 3, border: '1px solid #fed7aa', fontWeight: 600 }}>
                                {std.split(':')[0]}
                              </span>
                            ))}
                            {selectedStandards.length > 2 && (
                              <span style={{ fontSize: 8.5, color: 'var(--gray-400)' }}>+{selectedStandards.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
                >
                  <CheckCircle size={13} /> {saving ? 'Saving...' : 'Save & Complete'}
                </button>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, idx) => {
              const StepComp = STEP_CONTENT[idx];
              const isActive = activeSection === s.id;
              return (
                <div
                  key={s.id}
                  id={`audit-sec-${s.id}`}
                  style={{
                    background: 'white', borderRadius: 12, overflow: 'hidden',
                    border: `1px solid ${isActive ? 'var(--primary-200, #fed7aa)' : '#f1f5f9'}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', scrollMarginTop: 80,
                  }}
                >
                  {/* Section header */}
                  <div
                    className={`audit-section-hdr${isActive ? ' active' : ''}`}
                    onClick={() => setActiveSection(s.id)}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isActive ? 'var(--primary)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {React.createElement(s.icon, { size: 14, color: isActive ? 'white' : 'var(--gray-500)' })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>{s.label}</span>
                        <span style={{ fontSize: 9.5, color: 'var(--gray-400)', fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{s.code}</span>
                        {/* Standard badges on stage sections */}
                        {selectedStandards.length > 0 && [5, 6].includes(s.id) && selectedStandards.slice(0, 3).map(std => (
                          <span key={std} style={{ fontSize: 9, background: '#fff7ed', color: 'var(--primary)', padding: '2px 7px', borderRadius: 4, border: '1px solid #fed7aa', fontWeight: 600 }}>
                            {std.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="aud-sec-num" style={{ fontSize: 11, color: 'var(--gray-400)', flexShrink: 0 }}>§ {s.id}/{STEPS.length}</span>
                  </div>
                  {/* Section body */}
                  <div style={{ padding: '24px 28px' }}>
                    <StepComp d={data} set={set} />
                  </div>
                </div>
              );
            })}

            {/* Bottom action bar */}
            <div className="audit-bottom-bar">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: 'var(--gray-700)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                <CheckCircle size={16} /> {saving ? 'Saving...' : 'Save & Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && <PreviewModal data={data} onClose={() => setShowPreview(false)} />}
    </Layout>
  );
}
