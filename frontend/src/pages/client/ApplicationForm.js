import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Save, Send, CheckCircle } from 'lucide-react';
import { Form01Inner, INIT } from '../admin/qms/Form01ApplicationForm';

/* Client-facing F01 — same form the admin uses, but scoped to the
   logged-in client's own record (no client-ID search). */
export default function ClientApplicationForm() {
  const { user } = useAuth();
  const [data,    setData]    = useState(INIT);
  const [status,  setStatus]  = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    let active = true;
    axios.get('/api/qms-forms/my/1')
      .then(r => {
        if (!active) return;
        if (r.data && r.data.formData) {
          // Existing form — load saved data
          setData({ ...INIT, ...r.data.formData });
          setStatus(r.data.status || 'draft');
        } else {
          // No form yet — start fresh, pre-filled from the client's profile
          setData(d => ({
            ...d,
            organizationName:     user?.company || '',
            contactPerson:        user?.name    || '',
            emailId:              user?.email   || '',
            mobileNumber:         (user?.phone || '').replace(/\D/g, ''),
            address:              user?.address || '',
            scopeOfCertification: user?.scope   || '',
          }));
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  const handleSave = async (saveStatus) => {
    if (saving) return;
    if (!data.organizationName?.trim()) { toast.error('Organization name is required'); return; }
    if (saveStatus !== 'draft' && !data.scopeOfCertification?.trim()) {
      toast.error('Scope of certification is required to submit');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/api/qms-forms/my', {
        formType: 1,
        formCode: 'AUD-F-02',
        formName: 'Application Form',
        status:   saveStatus,
        formData: data,
      });
      setStatus(saveStatus);
      toast.success(saveStatus === 'draft' ? 'Saved as draft' : 'Application submitted!');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Application Form">
        <div className="loading-box"><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Application Form">
      {status === 'saved' && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} /> Your application has been submitted and is visible to the admin. You can still update it and submit again.
        </div>
      )}
      <Form01Inner
        data={data}
        set={set}
        onSaveDraft={() => handleSave('draft')}
        onSave={() => handleSave('saved')}
        saving={saving}
      />

      {/* ── Bottom action bar — explicit Submit ── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
        marginTop: 18, padding: '16px 20px', background: 'white', borderRadius: 12,
        border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,.06)', flexWrap: 'wrap',
      }}>
        <span style={{ flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--gray-500)' }}>
          Save your progress as a draft, or submit the application to send it to the admin.
        </span>
        <button type="button" className="btn btn-secondary" disabled={saving}
          onClick={() => handleSave('draft')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} /> Save as Draft
        </button>
        <button type="button" className="btn btn-primary" disabled={saving}
          onClick={() => handleSave('saved')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Send size={14} /> {saving ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </Layout>
  );
}
