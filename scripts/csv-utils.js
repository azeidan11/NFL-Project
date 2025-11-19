// Helpers to fetch and parse CSV files in the browser.

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  const normalized = normalizeLineEndings(text);

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === "\"") {
      if (inQuotes && normalized[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

export async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load CSV "${path}": ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  if (!rows.length) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(h => h.trim());
  const normalizedRows = dataRows
    .map(row => row.map(cell => (cell ?? "").trim()))
    .filter(row => row.some(cell => cell.length > 0));

  return { headers, rows: normalizedRows };
}
