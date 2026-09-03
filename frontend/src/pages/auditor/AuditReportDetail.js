import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, FileText, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import {
  STEPS, initState, StepIndicator,
  Step1, Step2, Step3, Step4, Step5, Step6,
} from '../admin/AuditStepComponents';

// Auditor can see Steps 1–6 (not Step 7: Certificate & Review)
const AUDITOR_STEPS = STEPS.filter(s => s.id <= 6);

export default function AuditorAuditReportDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [step,    setStep]    = useState(1);
  const [data,    setData]    = useState(initState());
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [client,  setClient]  = useState(null);

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  useEffect(() => {
    axios.get(`/api/audit-reports/${id}`)
      .then(res => {
        const r = res.data;
        setData({ ...initState(), ...r });
        setOrgName(r.orgName || '');
        setClient(r.client || null);
      })
      .catch(err => {
        if (err.response?.status === 403) {
          toast.error('Access denied');
          navigate('/auditor/audit-reports');
        } else {
          toast.error('Failed to load report');
        }
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await axios.put(`/api/audit-reports/${id}`, data);
      toast.success('Report saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const stepComponents = [
    <Step1 d={data} set={set} />,
    <Step2 d={data} set={set} />,
    <Step3 d={data} set={set} />,
    <Step4 d={data} set={set} />,
    <Step5 d={data} set={set} />,
    <Step6 d={data} set={set} />,
  ];

  const currentIdx = AUDITOR_STEPS.findIndex(s => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === AUDITOR_STEPS.length - 1;

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
    <Layout title="Audit Report">
      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/auditor/audit-reports')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--gray-800)' }}>
                {orgName || 'Audit Report'}
              </h2>
              {client && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>Client: {client.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Access info */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#1d4ed8' }}>
          You can fill Steps 1–6. <strong>Step 7 (Certificate & Review)</strong> is managed by admin only.
        </div>

        {/* Step Indicator (6 steps) */}
        <StepIndicator steps={AUDITOR_STEPS} currentStep={step} onStepClick={setStep} />

        {/* Step Content */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #f8fafc' }}>
            {React.createElement(AUDITOR_STEPS[currentIdx].icon, { size: 18, color: 'var(--primary)' })}
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)' }}>
              Step {currentIdx + 1}: {AUDITOR_STEPS[currentIdx].label}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-400)', fontFamily: 'monospace', background: '#f8fafc', padding: '2px 8px', borderRadius: 5, border: '1px solid #e2e8f0' }}>
              {AUDITOR_STEPS[currentIdx].code}
            </span>
          </div>
          {stepComponents[currentIdx]}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <button
            onClick={() => !isFirst && setStep(AUDITOR_STEPS[currentIdx - 1].id)}
            disabled={isFirst}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: isFirst ? '#f8fafc' : 'white', color: isFirst ? 'var(--gray-300)' : 'var(--gray-700)', cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Step {currentIdx + 1} of {AUDITOR_STEPS.length}</span>
          {!isLast
            ? <button
                onClick={() => setStep(AUDITOR_STEPS[currentIdx + 1].id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Next <ChevronRight size={16} />
              </button>
            : <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                <CheckCircle size={16} /> {saving ? 'Saving...' : 'Save & Done'}
              </button>
          }
        </div>
      </div>
    </Layout>
  );
}
