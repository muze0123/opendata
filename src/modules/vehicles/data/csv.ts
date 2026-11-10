/** Parse RFC 4180-style UTF-8 CSV, including quoted delimiters and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      row.push(field); field = '';
      if (character !== ',') { rows.push(row); row = []; if (character === '\r' && source[index + 1] === '\n') index++; }
    } else field += character;
  }
  if (quoted) throw new Error('Unclosed CSV field');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
