import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';
import { Save, Send } from 'lucide-react';
import { Form01Inner, INIT } from '../admin/qms/Form01ApplicationForm';

/* New / Edit Application — uses the admin "Form 01" UI (Form01Inner) and saves as a
   real Application record (POST/PUT /api/applications). Role-aware:
   - client : the form is scoped to themselves (server links the app to them).
   - admin/sales : shows a "Select Client" dropdown to assign the application. */
export default function ApplicationFormPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = !!id;
  const isClient   = user?.role === 'client';

  const [data,       setData]       = useState(INIT);
  const [clients,    setClients]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [loadingApp, setLoadingApp] = useState(!!id);

  const backTo = isClient ? '/client/applications' : '/admin/applications';

  // Admin/sales — load the list of clients for the "Assign to Client" dropdown
  useEffect(() => {
    if (isClient) return;
    axios.get('/api/users?role=client').then(r => setClients(r.data || [])).catch(() => {});
  }, [isClient]);

  // New application by a client — prefill from their own profile
  useEffect(() => {
    if (id || !isClient) return;
    setData(d => ({
      ...d,
      organizationName:     user?.company || '',
      contactPerson:        user?.name    || '',
      emailId:              user?.email   || '',
      mobileNumber:         (user?.phone || '').replace(/\D/g, ''),
      address:              user?.address || '',
      scopeOfCertification: user?.scope   || '',
    }));
  }, [user, id, isClient]);

  // Edit mode — load the existing application and map it onto the Form 01 shape
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/applications/${id}`)
      .then(({ data: a }) => {
        setData(f => ({
          ...f,
          ...a,
          client:               a.client?._id || a.client || '',
          standards:            Array.isArray(a.standards) ? a.standards : [],
          locationConditions:   Array.isArray(a.locationConditions) ? a.locationConditions : [],
          empTable:             (Array.isArray(a.empTable) && a.empTable.length) ? a.empTable : f.empTable,
          scopeOfCertification: a.scopeOfCertification || a.scope || '',
        }));
      })
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoadingApp(false));
  }, [id]);

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  const grandTotal = () => (data.empTable || []).flat().reduce((a, b) => a + (Number(b) || 0), 0);

  const submit = async (asDraft) => {
    if (saving) return;
    if (!data.organizationName?.trim()) { toast.error('Organization name is required'); return; }
    if (!data.scopeOfCertification?.trim()) { toast.error('Scope of certification is required'); return; }
    if (!asDraft && (data.standards || []).length === 0) { toast.error('Select at least one standard to submit'); return; }
    setSaving(true);
    try {
      const total = grandTotal();
      const payload = {
        ...data,
        isoStandard:   (data.standards || [])[0] || 'ISO 9001:2015',
        scope:         data.scopeOfCertification,
        country:       'India',
        employeeCount: { headOffice: total, branches: 0, temporary: 0, total },
      };
      // Client: server links the app to them, so don't send a client field.
      // Admin/sales: keep whatever client was selected (may be blank = assign later).
      if (isClient) delete payload.client;

      let appId = id;
      if (isEdit) {
        await axios.put(`/api/applications/${id}`, payload);
      } else {
        const { data: created } = await axios.post('/api/applications', payload);
        appId = created._id;
      }
      if (!asDraft) await axios.post(`/api/applications/${appId}/submit`).catch(() => {});
      toast.success(isEdit ? (asDraft ? 'Changes saved' : 'Application updated!')
                           : (asDraft ? 'Saved as draft' : 'Application submitted!'));
      navigate(backTo);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  if (loadingApp) {
    return (
      <Layout title="Edit Application">
        <div className="loading-box"><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? 'Edit Application' : (isClient ? 'Apply for ISO Certification' : 'New Application')}>
      {/* Admin/sales — assign the application to a client */}
      {!isClient && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Assign to Client</label>
            <select className="form-control" style={{ width: 'auto', minWidth: 280 }}
              value={data.client || ''} onChange={e => set('client', e.target.value)}>
              <option value="">— Assign later —</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
        </div>
      )}

      <Form01Inner
        data={data}
        set={set}
        onSaveDraft={() => submit(true)}
        onSave={() => submit(false)}
        saving={saving}
      />

      {/* Bottom action bar — explicit Submit */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
        marginTop: 18, padding: '16px 20px', background: 'white', borderRadius: 12,
        border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,.06)', flexWrap: 'wrap',
      }}>
        <span style={{ flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--gray-500)' }}>
          Save your progress as a draft, or submit the application.
        </span>
        <button type="button" className="btn btn-secondary" disabled={saving}
          onClick={() => submit(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} /> Save as Draft
        </button>
        <button type="button" className="btn btn-primary" disabled={saving}
          onClick={() => submit(false)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Send size={14} /> {saving ? 'Submitting…' : (isEdit ? 'Update & Submit' : 'Submit Application')}
        </button>
      </div>
    </Layout>
  );
}
