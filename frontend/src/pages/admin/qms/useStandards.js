import { useState, useEffect } from 'react';
import axios from 'axios';

/* Shared source of truth for ISO standards + their clauses.
   Standards (and their clauses) are configured in Admin → Standards and stored
   in the Standard schema; every QMS form reads them from here instead of using
   a hard-coded catalogue. */
export default function useStandards() {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios.get('/api/standards')
      .then(r => { if (alive) setStandards((r.data || []).filter(s => s.active !== false)); })
      .catch(() => { if (alive) setStandards([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const byName = Object.fromEntries(standards.map(s => [s.name, s]));
  const names  = standards.map(s => s.name);
  return { standards, byName, names, loading };
}

/* Normalize whatever a form holds as "selected standards" into an array of names.
   Accepts an array or a comma-joined string (the shape used across the forms). */
export function standardNames(value) {
  return Array.isArray(value)
    ? value.map(s => String(s).trim()).filter(Boolean)
    : String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

/* Resolve the standards the client actually selected in their Application Form (F01).
   The backend (/api/qms-forms/client/:id) returns `standards` as an array and also
   joins them into `isoStandard`; prefer the array, fall back to the joined strings.
   `names` is the live catalogue (Standard schema) — only standards that still exist
   in the catalogue are kept, in catalogue order. This is the single source of truth
   for "which standards apply to this client" and must NOT be read from a form's own
   saved `auditStandards`/`isoStandard` snapshot, which can go stale when F01 changes. */
export function deriveClientStandards(clientInfo, names) {
  if (!clientInfo) return [];
  let tokens = [];
  if (Array.isArray(clientInfo.standards)) {
    tokens = clientInfo.standards;
  } else {
    const raw = [clientInfo.isoStandard, clientInfo.isoStandards, clientInfo.standard]
      .filter(Boolean)
      .join(',');
    tokens = raw.split(',');
  }
  tokens = tokens.map(s => String(s).trim()).filter(Boolean);
  return names.filter(k => tokens.includes(k));
}

/* Collect the clauses for the given standard name(s) from the fetched catalogue,
   deduped by clause number + text and kept in catalogue order. Each clause is a
   { no, text } record as stored on the Standard schema. */
export function clausesForStandards(byName, value) {
  const seen = new Set();
  const out = [];
  standardNames(value).forEach(name => {
    const std = byName[name];
    (std?.clauses || []).forEach(c => {
      const key = `${c.no || ''}|${c.text || ''}`;
      if (!seen.has(key)) { seen.add(key); out.push({ no: c.no || '', text: c.text || '' }); }
    });
  });
  return out;
}

/* Group a granular clause list (as returned by clausesForStandards) by
   top-level clause number — e.g. 4.1/4.2/4.3/4.4 all collapse into one "4"
   row, and 5.1/5.1.1/5.1.2/5.2/5.2.1/5.2.2/5.3 all collapse into one "5" row
   — combining each sub-clause's own "no text" into one multi-line field.
   Used by forms (AUD-F-09 Report, AUD-F-05 Plan & Schedule) that show one
   row per major clause instead of one row per sub-clause; the Standards
   catalogue itself and AUD-F-03A Audit Programme stay fully granular. */
export function groupClausesByTopLevel(clauses) {
  const order = [];
  const byTop = new Map();
  (clauses || []).forEach(c => {
    const top = String(c.no || '').match(/^\d+/)?.[0] || c.no || '';
    if (!byTop.has(top)) { byTop.set(top, []); order.push(top); }
    byTop.get(top).push(c);
  });
  return order.map(top => ({
    no: top,
    text: byTop.get(top).map(c => `${c.no} ${c.text}`.trim()).join('\n'),
  }));
}
