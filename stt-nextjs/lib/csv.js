// Shared CSV helpers for every app/api/export/* route. Kept intentionally
// small: a field escaper (RFC 4180 — quote a field if it contains a comma,
// quote, or newline, and double up internal quotes) and a Response builder
// that sets the headers the browser needs to download the file directly
// (Content-Disposition: attachment) rather than navigate to it.
function csvField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows) {
  // \r\n per RFC 4180 — Excel in particular is fussier about bare \n.
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

function csvResponse(filename, rows) {
  const body = toCsv(rows);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

module.exports = { toCsv, csvResponse };
