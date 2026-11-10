import ExcelJS from 'exceljs';
import { emptyPart, LEVEL_CODES, DEVELOPMENT_CODES, type Part } from './parts';
export const PART_SHEET_FIELDS = ['code', 'name', 'abbreviation', 'level', 'development', 'supplier', 'material', 'ip', 'owner', 'securityOwner'] as const;
export async function exportParts(records: Part[], labels: string[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Parts');
  sheet.addRow(labels);
  for (const record of records) sheet.addRow(PART_SHEET_FIELDS.map(key => record[key]));
  sheet.columns.forEach(column => { column.width = 24; });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/** 生成空白导入模板（表头 = 传入的本地化列名），供批量导入抽屉预生成下载。 */
export async function partsTemplateBlob(labels: string[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Parts');
  sheet.addRow(labels);
  sheet.columns.forEach(column => { column.width = 24; });
  return new Blob([await workbook.xlsx.writeBuffer() as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export async function importParts(file: File, current: Part[], labels: string[][]): Promise<Part[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('invalid');
  const headers = PART_SHEET_FIELDS.map((key, index) => {
    let found = 0;
    sheet.getRow(1).eachCell((cell, column) => { if ([key, ...labels.map(items => items[index])].includes(cell.text.trim())) found = column; });
    if (!found) throw new Error('invalid');
    return found;
  });
  const records: Part[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = headers.map(column => row.getCell(column).text.trim());
    if (values.every(value => !value)) return;
    const record = { ...emptyPart(), ...Object.fromEntries(PART_SHEET_FIELDS.map((key, index) => [key, values[index]])), id: crypto.randomUUID() } as Part;
    if (!record.code || !record.name || !record.abbreviation || !record.owner || !record.securityOwner || !LEVEL_CODES.includes(record.level as typeof LEVEL_CODES[number]) || !DEVELOPMENT_CODES.includes(record.development as typeof DEVELOPMENT_CODES[number])) throw new Error('invalid');
    if (record.ip && !/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(record.ip)) throw new Error('invalid');
    if ([...current, ...records].some(item => item.code === record.code || item.name === record.name)) throw new Error('duplicate');
    records.push(record);
  });
  if (!records.length) throw new Error('invalid');
  return records;
}
