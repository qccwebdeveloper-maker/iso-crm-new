// Shared grouping/labeling helpers for legacy (pre-CRM) client documents —
// used by the client's legacy-document sidebar (components/common/Layout.js)
// and its detail view (pages/client/LegacyDocuments.js). Synced-from-Drive
// documents keep their source sub-folder in `name`, e.g. "admin/5341.jpeg" or
// "Client/GST certificate.pdf" (see backend/routes/oldClients.js drive/sync).
export const LEGACY_DOC_GROUP_ORDER = ['Admin', 'Client'];

export function legacyDocGroup(d) {
  const name = d.name || '';
  if (!name.includes('/')) return 'Other';
  const top = name.split('/')[0];
  const topLower = top.toLowerCase();
  if (topLower === 'admin') return 'Admin';
  if (topLower === 'client') return 'Client';
  return top;
}

export function legacyDocFileName(d) {
  const name = d.name || '';
  return name.includes('/') ? name.split('/').slice(1).join('/') : (d.originalName || name);
}

export function legacyDocDriveFileId(d) {
  if (d.publicId && d.publicId.startsWith('drive:')) return d.publicId.slice(6);
  const m = (d.path || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Returns [[groupName, [docs...]], ...] ordered per LEGACY_DOC_GROUP_ORDER,
// then any other named group, then "Other" last.
export function groupLegacyDocs(documents) {
  const groups = {};
  (documents || []).forEach(d => { const g = legacyDocGroup(d); (groups[g] = groups[g] || []).push(d); });
  const names = Object.keys(groups).sort((a, b) => {
    const idx = n => LEGACY_DOC_GROUP_ORDER.indexOf(n);
    const ai = idx(a), bi = idx(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    if (a === 'Other') return 1; if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
  return names.map(name => [name, groups[name]]);
}
