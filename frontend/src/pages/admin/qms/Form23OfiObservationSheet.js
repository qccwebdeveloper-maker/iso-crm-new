import React from 'react';
import QMSFormPage, { SectionTitle, DynamicTable } from './QMSFormPage';

const EMPTY_ROW = { sNo: '', clause: '', currentFindings: '', status: '', correctiveAction: '', auditorComment: '', remarks: '' };

export const DEFAULT = {
  entries: [{ ...EMPTY_ROW, sNo: '1' }],
};

// Mirrors the AUD-F-09-B_OFI_O Sheet.xlsx columns exactly (S.No., Clause, Current
// Findings, Status, Corrective Action taken, Auditor Comment, Remarks). The long-text
// columns are capped at 1500 words each, matching the sheet's field limit.
const OFI_COLUMNS = [
  { key: 'sNo',              label: 'S.No.',                   minWidth: 55 },
  { key: 'clause',           label: 'Clause',                  minWidth: 90 },
  { key: 'currentFindings',  label: 'Current Findings',        type: 'textarea', fullRow: true, maxWords: 1500 },
  { key: 'status',           label: 'Status',                  minWidth: 130 },
  { key: 'correctiveAction', label: 'Corrective Action taken', type: 'textarea', fullRow: true, maxWords: 1500 },
  { key: 'auditorComment',   label: 'Auditor Comment',         type: 'textarea', fullRow: true, maxWords: 1500 },
  { key: 'remarks',          label: 'Remarks',                 type: 'textarea', fullRow: true, maxWords: 1500 },
];

export default function Form23OfiObservationSheet() {
  return (
    <QMSFormPage
      formType={23}
      formCode="AUD-F-09-B"
      formTitle="AUD-F-09-B_OFI_O Sheet"
      defaultData={DEFAULT}
    >
      {(props) => <OfiBody {...props} />}
    </QMSFormPage>
  );
}

export function OfiBody({ data, set }) {
  const setRow = (ri, k, v) => {
    const rows = [...(data.entries || [])];
    rows[ri] = { ...rows[ri], [k]: v };
    set('entries', rows);
  };
  const addRow = () => {
    const rows = data.entries || [];
    set('entries', [...rows, { ...EMPTY_ROW, sNo: String(rows.length + 1) }]);
  };
  const removeRow = (ri) => set('entries', (data.entries || []).filter((_, i) => i !== ri));

  return (
    <div>
      <SectionTitle>Area of Concern</SectionTitle>
      <DynamicTable
        columns={OFI_COLUMNS}
        rows={data.entries || []}
        onAdd={addRow}
        onRemove={removeRow}
        onCellChange={setRow}
        addLabel="Add Row"
      />
    </div>
  );
}
