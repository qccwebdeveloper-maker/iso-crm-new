import { useState, useEffect } from 'react';
import axios from 'axios';

/* Roster of auditors/technical experts and their on-file signature image
   (Admin → imported from the "List of Auditors Code Matrix"). QMS forms use
   this to auto-fill a signatory's signature the moment their name matches an
   entry here, instead of requiring a manual upload. */
export default function useAuditorSignatures() {
  const [byName, setByName] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios.get('/api/auditor-signatures')
      .then(({ data }) => {
        if (!alive) return;
        const map = {};
        (data || []).forEach(a => {
          if (a.name && a.signatureUrl) map[a.name.trim().toLowerCase()] = a.signatureUrl;
        });
        setByName(map);
      })
      .catch(() => { if (alive) setByName({}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const lookup = (name) => byName[String(name || '').trim().toLowerCase()] || '';
  return { byName, lookup, loading };
}
