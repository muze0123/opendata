import ExcelJS from 'exceljs';
import {
  departments,
  roles,
  getDepartmentName,
  getRoleNames,
  type NewUser,
  type UserRecord,
} from './users';

type Locale = 'zh-CN' | 'en-US';

/** 导入 / 模板列（与 i18n import.columnHint 一致）。 */
const TEMPLATE_HEADERS: Record<Locale, string[]> = {
  'zh-CN': ['姓名', '登录账号', '手机号', '邮箱', '所属部门', '角色', '状态'],
  'en-US': ['Name', 'Account', 'Phone', 'Email', 'Department', 'Roles', 'Status'],
};

/** 导出列（含只读展示字段）。 */
const EXPORT_HEADERS: Record<Locale, string[]> = {
  'zh-CN': ['姓名', '登录账号', '手机号', '邮箱', '所属部门', '角色', '状态', '最近登录', '加入时间', '备注'],
  'en-US': ['Name', 'Account', 'Phone', 'Email', 'Department', 'Roles', 'Status', 'Last login', 'Joined', 'Note'],
};

const STATUS_TEXT: Record<Locale, { enabled: string; disabled: string }> = {
  'zh-CN': { enabled: '启用', disabled: '禁用' },
  'en-US': { enabled: 'Enabled', disabled: 'Disabled' },
};

/** 触发浏览器下载（演示用，直接落本地；接入任务中心后改为下发下载任务）。 */
function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 已就绪的模板文件：抽屉打开时预生成，点击时同步下载（DESIGN.md · Batch import）。 */
export interface UserTemplateFile {
  blob: Blob;
  fileName: string;
}

/** 生成导入模板（仅表头，列与 import.columnHint、parseUserWorkbook 共用同一份定义）。 */
export async function buildUserTemplate(locale: Locale): Promise<UserTemplateFile> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OpenData';
  const sheet = workbook.addWorksheet(locale === 'zh-CN' ? '用户' : 'Users');
  const headers = TEMPLATE_HEADERS[locale];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 24;
  sheet.columns = headers.map((header) => ({
    width: header === '状态' || header === 'Status' ? 10 : 18,
  }));
  const blob = new Blob([await workbook.xlsx.writeBuffer() as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = locale === 'zh-CN' ? '用户管理导入模版.xlsx' : 'UserManagement_Import_Template.xlsx';
  return { blob, fileName };
}

/** 同步触发模板下载：必须在用户点击的调用栈内执行，不做 await。 */
export function saveUserTemplate(file: UserTemplateFile): void {
  triggerDownload(file.blob, file.fileName);
}

export interface ParsedUserRow {
  /** 数据行序号（不含表头，从 1 开始） */
  index: number;
  name: string;
  account: string;
  phone: string;
  email: string;
  deptId: string | null;
  roleIds: string[];
  enabled: boolean;
  /** 本地化后的错误信息；为空表示本行可导入 */
  errors: string[];
}

const ERROR_TEXT: Record<Locale, { nameRequired: string; accountRequired: string; departmentNotFound: string; roleNotFound: (name: string) => string }> = {
  'zh-CN': {
    nameRequired: '姓名不能为空',
    accountRequired: '登录账号不能为空',
    departmentNotFound: '所属部门在系统中不存在',
    roleNotFound: (name) => `角色「${name}」不存在`,
  },
  'en-US': {
    nameRequired: 'Name is required',
    accountRequired: 'Account is required',
    departmentNotFound: 'Department does not exist',
    roleNotFound: (name) => `Role "${name}" does not exist`,
  },
};

/** 解析导入的 xlsx：返回逐行解析结果与可导入记录（含翻译后的错误）。 */
export async function parseUserWorkbook(
  buffer: ArrayBuffer,
  locale: Locale,
): Promise<{ rows: ParsedUserRow[]; valid: NewUser[] }> {
  const workbook = await new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], valid: [] };

  // 读取表头，判断文件语言并定位各列位置（容错：列顺序不固定）。
  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
    headerCells.push(String(cell.value ?? '').trim());
  });
  const fileLocale: Locale = headerCells.includes('姓名') ? 'zh-CN' : 'en-US';
  const expected = TEMPLATE_HEADERS[fileLocale];
  const colIndex = new Map<string, number>();
  headerCells.forEach((header, i) => {
    const pos = expected.indexOf(header);
    if (pos !== -1) colIndex.set(expected[pos], i + 1);
  });

  const deptByName = new Map(departments.map((dept) => [dept.name.trim(), dept.id]));
  const roleByName = new Map(roles.map((role) => [role.name.trim(), role.id]));
  const texts = ERROR_TEXT[locale];
  const rows: ParsedUserRow[] = [];
  const valid: NewUser[] = [];

  const statusKeys = STATUS_TEXT[fileLocale];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string): string => {
      const idx = colIndex.get(header);
      if (!idx) return '';
      const value = row.getCell(idx).value;
      if (value == null) return '';
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      return String(value).trim();
    };

    const name = get(expected[0]);
    const account = get(expected[1]);
    const phone = get(expected[2]);
    const email = get(expected[3]);
    const deptName = get(expected[4]);
    const rolesText = get(expected[5]);
    const statusTextValue = get(expected[6]);

    const errors: string[] = [];
    if (!name) errors.push(texts.nameRequired);
    if (!account) errors.push(texts.accountRequired);

    const deptId = deptByName.get(deptName) ?? null;
    if (deptName && !deptId) errors.push(texts.departmentNotFound);

    const roleNames = rolesText
      .split(/[、,，/\n|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const roleIds: string[] = [];
    for (const roleName of roleNames) {
      const id = roleByName.get(roleName);
      if (id) roleIds.push(id);
      else errors.push(texts.roleNotFound(roleName));
    }

    const enabled =
      statusTextValue === statusKeys.disabled
        ? false
        : true;

    const parsed: ParsedUserRow = {
      index: rowNumber - 1,
      name,
      account,
      phone,
      email,
      deptId,
      roleIds,
      enabled,
      errors,
    };
    rows.push(parsed);
    if (errors.length === 0 && name && account && deptId) {
      valid.push({
        name,
        account,
        phone,
        email,
        deptId,
        roleIds,
        enabled,
        joinedAt: new Date().toISOString().slice(0, 10),
        lastLogin: '',
        note: '',
        owner: false,
      });
    }
  });

  return { rows, valid };
}

/** 导出已应用筛选后的用户为 xlsx 并触发下载。 */
export async function exportUsers(records: UserRecord[], locale: Locale): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OpenData';
  const sheet = workbook.addWorksheet(locale === 'zh-CN' ? '用户' : 'Users');
  const headers = EXPORT_HEADERS[locale];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 24;
  sheet.columns = headers.map((header) => ({
    width: header === '状态' || header === 'Status' ? 10 : 20,
  }));

  const status = STATUS_TEXT[locale];
  records.forEach((user) => {
    sheet.addRow([
      user.name,
      user.account,
      user.phone || '',
      user.email || '',
      getDepartmentName(user.deptId),
      getRoleNames(user.roleIds).join('、'),
      user.enabled ? status.enabled : status.disabled,
      user.lastLogin || '',
      user.joinedAt || '',
      user.note || '',
    ]);
  });

  const blob = new Blob([await workbook.xlsx.writeBuffer() as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date().toISOString().slice(0, 10);
  const fileName = locale === 'zh-CN' ? `用户管理_${date}.xlsx` : `UserManagement_${date}.xlsx`;
  triggerDownload(blob, fileName);
}
