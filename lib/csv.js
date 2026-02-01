// Minimal CSV utilities (RFC4180-ish)
function parseCsv(csvText) {
  const text = String(csvText ?? '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }
    if (ch === '\r') {
      const next = text[i + 1];
      if (next === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  const isTrailingEmptyRow = row.length === 1 && row[0] === '' && rows.length > 0;
  if (!isTrailingEmptyRow) {
    rows.push(row);
  }
  return rows;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  const mustQuote = /[",\n\r]/.test(s) || /^\s/.test(s) || /\s$/.test(s);
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function stringifyCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

module.exports = {
  parseCsv,
  stringifyCsv
};
