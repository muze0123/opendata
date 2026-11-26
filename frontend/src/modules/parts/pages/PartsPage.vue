<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Message, type FormInstance } from '@arco-design/web-vue';
import { IconClose, IconFile, IconFilePdf, IconEye, IconLeft, IconUpload, IconDownload, IconFolder, IconFilter, IconMore, IconPlus, IconRefresh, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import AttachmentPreview from '../components/AttachmentPreview.vue';
import RichValue from '../components/RichValue.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import { freezeEdgeColumns } from '../../../shared/tableColumns';
import AppPagination from '../../../design/components/AppPagination.vue';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import { statusRole } from '../../../shared/status';
import emptyDot from '../../../assets/parts-empty-dot.svg';
import { usePartsStore } from '../stores/parts';
import { exportParts, importParts, partsTemplateBlob, PART_SHEET_FIELDS } from '../data/spreadsheet';
import { cachePartDetail, readPartDetail } from '../data/detailSnapshot';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import { regulationRows } from '../../regulations/data/regulations';
import { safeRichHtml, richHasContent } from '../utils/richText';
import {
  CURRENT_USER, PART_STATUSES, partTimeline, seedPart, taskTime,
  emptyPart, type Part, type PartAttachment, type Segment, type PartStatus,
} from '../data/parts';

const { t } = useI18n();
const taskCenter = useTaskCenterStore();
const route = useRoute();
const router = useRouter();
const { rows, initialized, custom, lockedSegments, lockedSeparator, lockedDigits, serial } = storeToRefs(usePartsStore());

/* ---------------------------------------- 导出 */
const exportOpen = ref(false);
const transferBusy = ref(false);
function requestExport() {
  if (!filtered.value.length) { Message.info(t('parts.exportEmpty')); return; }
  exportOpen.value = true;
}
async function exportData() {
  if (transferBusy.value) return;
  transferBusy.value = true;
  try {
    const blob = await exportParts(filtered.value, PART_SHEET_FIELDS.map(key => t(`parts.${key}`)));
    const time = taskTime();
    taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'part', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(blob), fileName: `零部件_${time.slice(0, 10)}.xlsx` });
    exportOpen.value = false;
    Message.success(t('parts.exportSuccess'));
    taskCenter.open('download');
  } catch { Message.error(t('parts.transferFailed')); }
  finally { transferBusy.value = false; }
}

/* ---------------------------------------- 批量导入（DESIGN.md · Batch import baseline） */
const importOpen = ref(false);
const importFile = ref<File>();
const importError = ref('');
const importDragging = ref(false);
const importFileInput = ref<HTMLInputElement>();
const partTemplateUrl = ref('');
const partTemplatePreparing = ref(false);
onBeforeUnmount(() => { if (partTemplateUrl.value) URL.revokeObjectURL(partTemplateUrl.value); });
async function preparePartTemplate() {
  partTemplatePreparing.value = true;
  try {
    const blob = await partsTemplateBlob(PART_SHEET_FIELDS.map(key => t(`parts.${key}`)));
    if (partTemplateUrl.value) URL.revokeObjectURL(partTemplateUrl.value);
    partTemplateUrl.value = URL.createObjectURL(blob);
  } catch { importError.value = t('parts.transferFailed'); }
  finally { partTemplatePreparing.value = false; }
}
function openImport() {
  importOpen.value = true; importFile.value = undefined; importError.value = ''; importDragging.value = false;
  if (importFileInput.value) importFileInput.value.value = '';
  void preparePartTemplate();
}
function downloadPartTemplate() {
  if (!partTemplateUrl.value || partTemplatePreparing.value) return;
  const link = document.createElement('a');
  link.href = partTemplateUrl.value; link.download = '零部件导入模版.xlsx'; link.click();
}
function chooseImportFile() { if (!transferBusy.value) { if (importFileInput.value) importFileInput.value.value = ''; importFileInput.value?.click(); } }
function selectImportFile(file?: File) {
  if (!file) return;
  importFile.value = file; importError.value = ''; importDragging.value = false;
  if (!file.name.toLowerCase().endsWith('.xlsx')) importError.value = t('parts.importFailed');
}
async function submitImport() {
  if (!importFile.value || transferBusy.value) return;
  transferBusy.value = true; importError.value = '';
  try {
    const labels = ['zh-CN', 'en-US'].map(locale => PART_SHEET_FIELDS.map(key => t(`parts.${key}`, {}, { locale })));
    const records = await importParts(importFile.value, rows.value, labels);
    rows.value.push(...records);
    initialized.value = true;
    Message.success(t('parts.imported', { count: records.length }));
    importOpen.value = false; importFile.value = undefined;
  } catch { importError.value = t('parts.importFailed'); }
  finally { transferBusy.value = false; }
}

/* ---------------------------------------- 筛选 / 列设置 */
/** 筛选字段与默认显隐（2026-11-20 用户确认）：搜索/名称/法规编号/证书状态/签发日期/创建时间默认显示。 */
interface PartFilterState {
  keyword: string; name: string; regulationCode: string; regulationName: string;
  status: PartStatus | ''; certificateNo: string; certificateVersion: string;
  issueDates: string[]; model: string; brand: string;
  creator: string; createdDates: string[]; updater: string; updatedDates: string[];
}
const query: PartFilterState = reactive({
  keyword: '', name: '', regulationCode: '', regulationName: '', status: '', certificateNo: '',
  certificateVersion: '', issueDates: [], model: '', brand: '',
  creator: '', createdDates: [], updater: '', updatedDates: [],
});
const applied = ref<PartFilterState>(JSON.parse(JSON.stringify(query)));
const FILTER_KEYS = [
  'keyword', 'name', 'regulationCode', 'regulationName', 'status', 'certificateNo', 'certificateVersion',
  'issueDates', 'model', 'brand', 'creator', 'createdDates', 'updater', 'updatedDates',
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
const HIDDEN_FILTERS: readonly FilterKey[] = ['regulationName', 'certificateNo', 'certificateVersion', 'model', 'brand', 'creator', 'updater', 'updatedDates'];
const defaultFilterSettings: { key: FilterKey; visible: boolean }[] = FILTER_KEYS.map(key => ({ key, visible: !HIDDEN_FILTERS.includes(key) }));
const filterSettings = ref(defaultFilterSettings.map(item => ({ ...item })));
const filterSettingsOpen = ref(false);
const visibleFilterKeys = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
/** 筛选 key → i18n 词条映射：日期区间键（issueDates→issueDate、createdDates→createdAt、updatedDates→updatedAt）。 */
const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  keyword: 'search', name: 'name', regulationCode: 'regulationCode', regulationName: 'regulationName',
  status: 'certificateStatus', certificateNo: 'certificateNo', certificateVersion: 'certificateVersion',
  issueDates: 'issueDate', model: 'model', brand: 'brand',
  creator: 'creator', createdDates: 'createdAt', updater: 'updater', updatedDates: 'updatedAt',
};
function filterLabel(key: FilterKey) {
  return t(`parts.${FILTER_LABEL_KEYS[key]}`);
}
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: filterLabel(item.key) })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => defaultFilterSettings.map(item => ({ ...item, label: filterLabel(item.key) })));
function onFilterSettingsChanged(next: ColumnSettingsItem[]) {
  const hidden = next.filter(item => !item.visible).map(item => item.key as FilterKey);
  filterSettings.value = next.map(item => ({ key: item.key as FilterKey, visible: item.visible }));
  for (const key of hidden) {
    if (key.endsWith('Dates')) { (query[key] as string[]) = []; (applied.value[key] as string[]) = []; }
    else { (query[key] as string) = ''; (applied.value[key] as string) = ''; }
  }
  if (hidden.length) page.value = 1;
}
function within(dates: string[], value: string) {
  if (!dates?.length) return true;
  return (!dates[0] || value >= dates[0]) && (!dates[1] || value <= dates[1]);
}
const creatorOptions = computed(() => [...new Set(rows.value.map(row => row.creator))].filter(Boolean));
const statusOptions = computed(() => PART_STATUSES.map(code => ({ value: code, label: t(`parts.statuses.${code}`) })));

const COLUMN_KEYS = [
  'code', 'name', 'regulationCode', 'certificateNo', 'certificateVersion',
  'issueDate', 'issuer', 'agency', 'validUntil', 'model', 'brand',
  'creator', 'createdAt', 'updater', 'updatedAt', 'status',
] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];
const HIDDEN_COLUMNS: readonly ColumnKey[] = ['issuer', 'agency', 'validUntil', 'model', 'brand', 'creator', 'updater', 'updatedAt'];
const defaultColumnSettings = COLUMN_KEYS.map(key => ({
  key,
  visible: !HIDDEN_COLUMNS.includes(key),
  disabled: key === 'code',
}));
const columnSettings = ref(defaultColumnSettings.map(item => ({ ...item })));
const columnSettingsOpen = ref(false);
const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map(item => ({ ...item, label: t(item.key === 'status' ? 'parts.certificateStatus' : `parts.${item.key}`) })));
const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map(item => ({ ...item, label: t(item.key === 'status' ? 'parts.certificateStatus' : `parts.${item.key}`) })));
function onColumnSettingsChanged(next: ColumnSettingsItem[]) {
  columnSettings.value = next.map(item => ({ key: item.key as ColumnKey, visible: item.visible, disabled: item.key === 'code' }));
}

const regulationOptions = computed(() => regulationRows.value.map(row => ({ value: row.code, label: `${row.code} ${row.name}` })));
const regulationNameOptions = computed(() => [...new Set(regulationRows.value.map(row => row.name))].map(name => ({ value: name, label: name })));
const filtered = computed(() => rows.value.filter(row =>
  (!applied.value.keyword || row.code.toLowerCase().includes(applied.value.keyword.toLowerCase()) || row.name.toLowerCase().includes(applied.value.keyword.toLowerCase())) &&
  (!applied.value.name || row.name.toLowerCase().includes(applied.value.name.toLowerCase())) &&
  (!applied.value.regulationCode || row.regulationCode === applied.value.regulationCode) &&
  (!applied.value.regulationName || regulationRows.value.find(item => item.code === row.regulationCode)?.name === applied.value.regulationName) &&
  (!applied.value.status || row.status === applied.value.status) &&
  (!applied.value.certificateNo || row.certificateNo.toLowerCase().includes(applied.value.certificateNo.toLowerCase())) &&
  (!applied.value.certificateVersion || row.certificateVersion.toLowerCase().includes(applied.value.certificateVersion.toLowerCase())) &&
  within(applied.value.issueDates, row.issueDate) &&
  (!applied.value.model || row.model.toLowerCase().includes(applied.value.model.toLowerCase())) &&
  (!applied.value.brand || row.brand.toLowerCase().includes(applied.value.brand.toLowerCase())) &&
  (!applied.value.creator || row.creator === applied.value.creator) &&
  within(applied.value.createdDates, row.createdAt.slice(0, 10)) &&
  (!applied.value.updater || row.updater === applied.value.updater) &&
  within(applied.value.updatedDates, row.updatedAt.slice(0, 10)),
));
const page = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const pagedRows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
watch([filtered, pageSize], () => { if (page.value > totalPages.value) page.value = totalPages.value; });
function applyFilters() { applied.value = JSON.parse(JSON.stringify(query)); page.value = 1; }
function resetFilters() {
  Object.assign(query, {
    keyword: '', name: '', regulationCode: '', regulationName: '', status: '', certificateNo: '',
    certificateVersion: '', issueDates: [], model: '', brand: '', creator: '', createdDates: [], updater: '', updatedDates: [],
  });
  applyFilters();
}

const detail = computed(() => rows.value.find(row => row.id === route.params.id) ?? readPartDetail(String(route.params.id)));
const approvalMode = computed(() => route.query.mode === 'approval');
const timeline = computed(() => detail.value ? partTimeline(detail.value) : []);
function statusLabel(status: PartStatus | '') { return status ? t(`parts.statuses.${status}`) : t('parts.draft'); }
function statusTag(status: PartStatus | '') { return statusRole(status || 'draft', 'certificates'); }
function eventLabel(action: string) { return t(`parts.events.${action}`); }

const columns = computed(() => freezeEdgeColumns([
  ...columnSettings.value.filter(item => item.visible).map(item => ({
    title: t(item.key === 'status' ? 'parts.certificateStatus' : `parts.${item.key}`),
    dataIndex: item.key,
    slotName: item.key === 'status' ? 'status' : item.key === 'brand' ? 'brand' : undefined,
    width: item.key === 'code' ? 170 : 150,
  })),
  { title: t('parts.actions'), dataIndex: 'actions', slotName: 'actions', width: 180 },
]));
/** 商标为富文本 HTML，列表单元格只显示去标签纯文本摘要。 */
function brandText(html: string): string {
  const host = document.createElement('div');
  host.innerHTML = html || '';
  return (host.textContent || '').replace(/\s+/g, ' ').trim();
}
const horizontalWidth = computed(() => columns.value.reduce((total, column) => total + Number(column.width ?? 0), 0));

/* ---------------------------------------- 新增 / 编辑抽屉 */
const drawer = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<Part>(emptyPart());
const variable = ref('');
const snapshot = ref('');
function formState() {
  return JSON.stringify({
    form: { ...form, certificateFile: form.certificateFile?.name },
    variable: variable.value,
  });
}
const dirty = computed(() => drawer.value && snapshot.value !== formState());
const discard = ref(false);
const pendingLeave = ref<((allow: boolean) => void)>();
function closeDrawer() { if (dirty.value) { discard.value = true; return; } drawer.value = false; }
function open(row?: Part) {
  const source = row ?? emptyPart();
  Object.assign(form, JSON.parse(JSON.stringify(source)));
  // 附件必须显式赋值：Object.assign 不覆盖 absent 键（新增会带出旧文件）；
  // 且 JSON 克隆会把 File 变成 {}，编辑时需从源行浅拷贝恢复。
  form.certificateFile = source.certificateFile ? { ...source.certificateFile } : undefined;
  variable.value = '';
  snapshot.value = formState();
  drawer.value = true;
  formRef.value?.clearValidate();
}
/**
 * 抽屉字段顺序（2026-11-23 用户裁决）：
 * 编号（独立逻辑）→ 法规编号 → 名称 → 商标(富文本) → 型号 → 证书编号 → 版本号 →
 * 签发日期 → 签发机构 → 认证机构 → 有效期至 → 零部件证书(纯上传) → 版本说明。
 */
const DETAIL_FIELDS = ['regulationCode', 'name', 'brand', 'model', 'certificateNo', 'certificateVersion', 'issueDate', 'issuer', 'agency', 'validUntil'] as const;
const requiredFields = ['regulationCode', 'name', 'model', 'certificateNo', 'certificateVersion', 'issueDate', 'issuer', 'agency', 'validUntil'] as const;
const fieldRules = computed(() => Object.fromEntries(requiredFields.map(field => [field, [
  { required: true, message: t('parts.required') },
  { validator: (value: string, callback: (error?: string) => void) => callback(String(value ?? '').trim() ? undefined : t('parts.required')) },
]])));
const rules = computed(() => ({
  ...fieldRules.value,
  // 商标富文本必填（2026-11-23 用户裁决）：值为 HTML，空编辑器也会产出 <p><br></p>，
  // 用 richHasContent 白名单判定真实内容；required:true 仅负责渲染 Arco 必填星号。
  brand: [
    { required: true, message: t('parts.required') },
    { validator: (value: string, callback: (error?: string) => void) => callback(richHasContent(value ?? '') ? undefined : t('parts.required')) },
  ],
  // 附件必传：required:true 让 Arco 渲染必填星号，validator 兜住「有 name 无 file」等边界。
  certificateFile: [
    { required: true, message: t('parts.required') },
    { validator: (_value: PartAttachment | undefined, callback: (error?: string) => void) => callback(form.certificateFile ? undefined : t('parts.required')) },
  ],
}));

/** 附件文件类型图标：PDF 用专用图标，其余（png/doc/docx）用通用文件图标，与法规附件行一致。 */
function attachmentIcon(fileName: string) {
  return fileName.toLowerCase().endsWith('.pdf') ? IconFilePdf : IconFile;
}
const certificateInput = ref<HTMLInputElement>();
function chooseAttachment() {
  if (certificateInput.value) { certificateInput.value.value = ''; certificateInput.value.click(); }
}
function selectAttachment(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!/\.(png|pdf|doc|docx)$/i.test(file.name) || file.size > 20 * 1024 * 1024) {
    Message.error(t('parts.fileError'));
    return;
  }
  form.certificateFile = { name: file.name, file };
}
function previewUrl(attachment?: PartAttachment) {
  // 刷新后 localStorage 只留文件名（File 不可序列化），此时不给 URL 而是由调用方提示。
  if (!attachment?.file || typeof attachment.file !== 'object' || !(attachment.file instanceof Blob)) return '';
  return URL.createObjectURL(attachment.file);
}
const previewedAttachment = ref<PartAttachment>();
function previewAttachment(attachment?: PartAttachment) {
  // 刷新/跨标签页后仅剩文件名（File 不可序列化），直接提示而非打开空预览。
  if (!attachment?.file || !(attachment.file instanceof Blob)) { Message.info(t('parts.fileUnavailable')); return; }
  previewedAttachment.value = attachment;
}
function downloadAttachment(attachment?: PartAttachment) {
  if (!attachment?.file || !(attachment.file instanceof Blob)) { Message.info(t('parts.fileUnavailable')); return; }
  const time = taskTime();
  taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'part', fileStamp: time.replace(/\D/g, ''), operator: CURRENT_USER, time, status: 'success', fileUrl: previewUrl(attachment), fileName: attachment.name });
  taskCenter.open('download');
}

/* ---------------------------------------- 编号规则（沿用分段编号条） */
const ruleVisible = ref(false);
const ruleSnapshot = ref('');
const ruleDiscard = ref(false);
function ruleState() { return JSON.stringify({ separator: separator.value, digits: digits.value, segments: segments.value }); }
function openRule() { ruleSnapshot.value = ruleState(); ruleVisible.value = true; }
function closeRule() { if (ruleState() !== ruleSnapshot.value) ruleDiscard.value = true; else ruleVisible.value = false; }
function discardRule() {
  const initial = JSON.parse(ruleSnapshot.value);
  separator.value = initial.separator; digits.value = initial.digits; segments.value = initial.segments;
  ruleVisible.value = false; ruleDiscard.value = false;
}
const separator = ref('-');
const digits = ref(4);
const segments = ref<Segment[]>([
  { id: 'fixed', kind: 'fixed', value: 'DDY' },
  { id: 'variable', kind: 'variable', value: 'ABCD' },
  { id: 'year', kind: 'year', value: '2026' },
]);
const preview = computed(() => [...segments.value.map(s => s.value), '1'.padStart(digits.value, '0')].join(separator.value));
const digitOptions = computed(() => [4, 6, 8].map(value => ({ value, label: t('parts.digitOption', { count: value }) })));
const generatedCode = computed(() => custom.value
  ? [...lockedSegments.value.map(s => s.kind === 'variable' ? variable.value.trim() : s.value), String(serial.value).padStart(lockedDigits.value, '0')].join(lockedSeparator.value)
  : `PART-${String(serial.value).padStart(4, '0')}`);
const firstVariableIndex = computed(() => lockedSegments.value.findIndex(segment => segment.kind === 'variable'));
function addSegment(kind: Segment['kind']) { segments.value.push({ id: crypto.randomUUID(), kind, value: kind === 'year' ? String(new Date().getFullYear()) : '' }); }
function configure() {
  if (!segments.value.length || segments.value.some(s => !/^[A-Za-z0-9]+$/.test(s.value))) { Message.error(t('parts.invalidRule')); return false; }
  lockedSegments.value = JSON.parse(JSON.stringify(segments.value));
  lockedSeparator.value = separator.value;
  lockedDigits.value = digits.value;
  custom.value = true;
  initialized.value = true;
  ruleVisible.value = false;
  open();
  return true;
}

/* ---------------------------------------- 保存草稿 / 提交 / 删除 / 复制 / 撤回 */
/** 附件必传校验：提交时零部件证书与商标的附件缺一不可（保存草稿不强制）。 */
function attachmentsMissing(): boolean {
  return !form.certificateFile;
}
async function save(draft = false) {
  if (!draft) {
    if (await formRef.value?.validate()) {
      formRef.value?.scrollToField(requiredFields.find(field => !String(form[field] ?? '').trim()) ?? 'name');
      return;
    }
    if (attachmentsMissing()) { Message.error(t('parts.attachmentRequired')); return; }
    if (custom.value && lockedSegments.value.some(s => s.kind === 'variable') && !form.id && !/^[A-Za-z0-9]+$/.test(variable.value.trim())) {
      Message.error(t('parts.invalidVariable')); return;
    }
  }
  const now = taskTime();
  const base = JSON.parse(JSON.stringify(form)) as Part;
  // JSON 克隆会把 File 变成 {}，附件必须从 form 按浅拷贝恢复，
  // 否则详情页预览/下载拿到的 file 不是 Blob，createObjectURL 直接抛错。
  base.certificateFile = form.certificateFile ? { ...form.certificateFile } : undefined;
  // 状态流转：保存草稿 → 待提交；提交 → 审批中（进入审批阶段）。
  const record = seedPart({
    ...base,
    name: form.name.trim(),
    code: form.id ? form.code : generatedCode.value,
    status: draft ? 'submitting' : 'reviewing',
    creator: base.creator || CURRENT_USER,
    createdAt: base.createdAt || now,
    updater: CURRENT_USER,
    updatedAt: now,
    events: [...base.events, { id: crypto.randomUUID(), action: draft ? 'draft' : 'submit', actor: CURRENT_USER, time: now }],
  });
  if (rows.value.some(row => row.id !== record.id && (row.code === record.code || row.name === record.name))) { Message.error(t('parts.duplicate')); return; }
  if (record.id) rows.value.splice(rows.value.findIndex(row => row.id === record.id), 1, record);
  else { record.id = crypto.randomUUID(); rows.value.push({ ...record }); serial.value++; }
  cachePartDetail(record);
  initialized.value = true;
  drawer.value = false;
  Message.success(t(draft ? 'parts.draftSaved' : 'parts.submitted'));
}
const deleting = ref<Part>();
function remove() {
  const index = rows.value.findIndex(row => row.id === deleting.value?.id);
  if (index >= 0) rows.value.splice(index, 1);
  deleting.value = undefined;
}
/** 复制功能已按 2026-11-23 用户裁决移除。 */
function withdraw(row: Part) {
  row.status = 'withdrawn';
  row.events.push({ id: crypto.randomUUID(), action: 'withdraw', actor: CURRENT_USER, time: taskTime() });
  cachePartDetail(row);
  Message.success(t('parts.withdrawn'));
}

/** 状态-操作矩阵（2026-11-20 用户确认）。视角：submitter=提交人 / approver=审批人；本地演示默认提交人视角。 */
type RowAction = 'detail' | 'edit' | 'delete' | 'withdraw' | 'approve';
const perspective = ref<'submitter' | 'approver'>('submitter');
/** 状态-操作矩阵（2026-11-23 用户裁决：去掉复制）。 */
const ROW_ACTIONS: Record<PartStatus | '', RowAction[]> = {
  submitting: ['detail', 'edit', 'delete'],
  reviewing: ['detail', 'withdraw', 'delete'],
  completed: ['detail', 'delete'],
  rejected: ['detail', 'edit', 'delete'],
  withdrawn: ['detail', 'edit', 'delete'],
  '': ['detail', 'edit', 'delete'],
};
function rowActions(status: PartStatus | ''): RowAction[] {
  const base = ROW_ACTIONS[status] ?? ROW_ACTIONS.submitting!;
  if (status === 'reviewing' && perspective.value === 'approver') {
    return ['detail', 'approve', 'delete'];
  }
  return base;
}
/** 操作列分流（DESIGN.md · Row action overflow）：前 2 个直显，其余进「···」下拉。 */
function inlineRowActions(status: PartStatus | ''): RowAction[] { return rowActions(status).slice(0, 2); }
function overflowRowActions(status: PartStatus | ''): RowAction[] { return rowActions(status).slice(2); }
const ROW_ACTION_LABEL: Record<RowAction, () => string> = {
  detail: () => t('parts.detail'),
  edit: () => t('parts.edit'),
  delete: () => t('parts.delete'),
  withdraw: () => t('parts.withdraw'),
  approve: () => t('parts.approve'),
};
const ROW_ACTION_HANDLER: Record<RowAction, (row: Part) => void> = {
  detail: row => void router.push(`/data/parts/${row.id}`),
  edit: row => open(row),
  delete: row => { deleting.value = row; },
  withdraw: row => withdraw(row),
  approve: row => void router.push({ path: `/data/parts/${row.id}`, query: { mode: 'approval' } }),
};

/* ---------------------------------------- 审批：顶部操作栏 + 弹窗录入意见/理由 */
const reviewOpen = ref(false);
const reviewingApprove = ref(true);
const reviewText = ref('');
const reviewError = ref(false);
function openReview(approve: boolean) {
  reviewingApprove.value = approve;
  reviewText.value = '';
  reviewError.value = false;
  reviewOpen.value = true;
}
function confirmReview() {
  if (!reviewText.value.trim()) {
    reviewError.value = true;
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('#part-review-text textarea')?.focus());
    return;
  }
  const record = detail.value;
  if (!record) return;
  const now = taskTime();
  record.status = reviewingApprove.value ? 'completed' : 'rejected';
  record.history.push({ reviewer: CURRENT_USER, approved: reviewingApprove.value, opinion: reviewText.value.trim(), time: now });
  record.events.push({ id: crypto.randomUUID(), action: reviewingApprove.value ? 'approve' : 'reject', actor: CURRENT_USER, time: now, comment: reviewText.value.trim() });
  const index = rows.value.findIndex(row => row.id === record.id);
  if (index >= 0) rows.value.splice(index, 1, record);
  else rows.value.push(record);
  initialized.value = true;
  cachePartDetail(record);
  reviewOpen.value = false;
  Message.success(t('parts.reviewed'));
  void router.push('/data/parts');
}

/* ---------------------------------------- 关联任务 */
const taskColumns = computed(() => [
  ...(['taskCode', 'taskName', 'brand', 'series', 'model', 'taskPriority', 'certificateStatus'] as const).map((key, index) => ({
    title: t(`parts.${key === 'taskPriority' ? 'priority' : key === 'taskCode' ? 'taskCode' : key === 'taskName' ? 'taskName' : key === 'certificateStatus' ? 'certificateStatus' : key}`),
    dataIndex: ['code', 'name', 'brand', 'series', 'model', 'priority', 'status'][index],
    slotName: key === 'taskPriority' ? 'priority' : key === 'certificateStatus' ? 'status' : undefined,
    width: 150,
  })),
  { title: t('parts.actions'), slotName: 'actions', width: 100 },
]);
function priorityLabel(code: string) { return t(`parts.projectPriorities.${code}`); }

/* ---------------------------------------- 离开确认 */
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) event.preventDefault(); }
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave((_to, _from, next) => { if (!dirty.value) next(); else { pendingLeave.value = allow => next(allow); discard.value = true; } });
watch(discard, value => { if (!value) { pendingLeave.value?.(false); pendingLeave.value = undefined; } });
function confirmDiscard() { drawer.value = false; pendingLeave.value?.(true); pendingLeave.value = undefined; discard.value = false; }
</script>

<template>
  <AttachmentPreview v-if="previewedAttachment" :attachment="previewedAttachment" @close="previewedAttachment = undefined" @download="downloadAttachment" />
  <main class="parts-page" :class="{ 'parts-detail-page': !!route.params.id, 'parts-list-page': !route.params.id && (initialized || rows.length) }">
    <!-- 详情子页面：顶部操作栏统一 AppDetailHeader（DESIGN.md · 详情子页面顶部操作栏） -->
    <template v-if="route.params.id">
      <AppDetailHeader :ancestor-to="'/data/parts'" :ancestor-label="t('parts.title')" :current-label="t('parts.partDetailTitle')" :nav-aria-label="t('parts.partDetailTitle')">
        <template v-if="approvalMode" #actions>
          <a-button class="app-btn-neutral" @click="router.push('/data/parts')">{{ t('parts.cancel') }}</a-button>
          <a-button status="danger" @click="openReview(false)">{{ t('parts.reject') }}</a-button>
          <a-button type="primary" @click="openReview(true)">{{ t('parts.pass') }}</a-button>
        </template>
      </AppDetailHeader>
      <template v-if="detail">
        <section class="region">
          <div class="block-title"><h3>{{ t('parts.basic') }}</h3></div>
          <!-- 基本信息：与证书/法规详情一致的 app-detail-list 三列布局（标签值同行、16px 栅栏） -->
          <dl class="app-detail-list part-basic-fields">
            <div v-for="field in ['code', 'name', 'certificateStatus', 'regulationCode', 'certificateNo', 'certificateVersion', 'issueDate', 'issuer', 'agency', 'validUntil', 'model', 'creator', 'createdAt', 'updater', 'updatedAt'] as const" :key="field" class="app-detail-row">
              <dt class="app-detail-label">{{ t(field === 'certificateStatus' ? 'parts.certificateStatus' : `parts.${field}`) }}</dt>
              <dd class="app-detail-value">
                <AppStatusTag v-if="field === 'certificateStatus'" :role="statusTag(detail.status)" :label="statusLabel(detail.status)" />
                <template v-else>{{ detail[field] || '—' }}</template>
              </dd>
            </div>
            <!-- 零部件证书：纯附件（预览/下载）；商标：富文本安全渲染。 -->
            <div class="app-detail-row">
              <dt class="app-detail-label">{{ t('parts.certificate') }}</dt>
              <dd class="app-detail-value">
                <div class="part-file-cell">
                  <div v-if="detail.certificateFile" class="part-file-actions">
                    <span class="part-file-name">{{ detail.certificateFile.name }}</span>
                    <a-button type="text" :aria-label="t('parts.filePreview')" :title="t('parts.filePreview')" @click="previewAttachment(detail.certificateFile)"><template #icon><IconEye :size="16" /></template></a-button>
                    <a-button type="text" :aria-label="t('parts.downloadFile')" :title="t('parts.downloadFile')" @click="downloadAttachment(detail.certificateFile)"><template #icon><IconDownload :size="16" /></template></a-button>
                  </div>
                  <span v-else>—</span>
                </div>
              </dd>
            </div>
            <div class="app-detail-row">
              <dt class="app-detail-label">{{ t('parts.brand') }}</dt>
              <dd class="app-detail-value">
                <div v-if="detail.brand" class="part-brand-rich" v-html="safeRichHtml(detail.brand)" />
                <span v-else>—</span>
              </dd>
            </div>
          </dl>
        </section>

        <!-- 版本信息区块按用户要求隐藏，保留代码以便后续恢复 -->
        <!--
        <section class="region"><h3>{{ t('parts.versions') }}</h3><div class="version-layout"> ... </div></section>
        -->

        <section class="region">
          <h3>{{ t('parts.relatedTasks') }}</h3>
          <a-table :columns="taskColumns" :data="detail.relatedTasks ?? []" :pagination="false" :bordered="false" :scroll="{ x: 1150 }" row-key="id">
            <template #priority="{ record }">{{ priorityLabel(record.priority) }}</template>
            <template #status="{ record }"><AppStatusTag :role="statusTag(record.status)" :label="statusLabel(record.status)" /></template>
            <template #actions="{ record }"><router-link :to="`/data/parts/${detail.id}/relations/tasks/${record.id}`">{{ t('parts.detail') }}</router-link></template>
            <template #empty><a-empty :description="t('parts.noTasks')" /></template>
          </a-table>
        </section>

        <section class="region" :aria-label="t('parts.timeline')">
          <h3>{{ t('parts.timeline') }}</h3>
          <a-empty v-if="!timeline.length" :description="t('parts.noTimeline')" />
          <a-timeline v-else class="processing-timeline">
            <a-timeline-item v-for="event in timeline" :key="event.id">
              <div class="timeline-heading"><strong>{{ eventLabel(event.action) }}</strong><time>{{ event.time }}</time></div>
              <p>{{ t('parts.eventDescription', { actor: event.actor, action: eventLabel(event.action), name: detail.name }) }}</p>
              <p v-if="event.comment" class="event-comment">{{ t('parts.eventOpinion', { comment: event.comment }) }}</p>
            </a-timeline-item>
          </a-timeline>
        </section>
      </template>
      <a-empty v-else :description="t('parts.missing')" />
    </template>

    <section v-else-if="!initialized && !rows.length" class="initial region">
      <div class="empty-illustration" aria-hidden="true"><div class="empty-sheet"><div class="empty-top"/><div v-for="n in 3" :key="n" class="empty-line"><img :src="emptyDot" alt="" /><span /></div></div></div>
      <p>{{ t('parts.initialHelp') }}</p>
      <a-space wrap><a-button type="primary" @click="custom = false; open()">{{ t('parts.direct') }}</a-button><a-button @click="openRule">{{ t('parts.customRule') }}</a-button></a-space>
    </section>

    <template v-else>
      <!-- 筛选条件：字段名在上、控件在下（12px / 4px / 左对齐 / 200px），16px 栅栏左对齐 -->
      <form class="region filters" @submit.prevent="applyFilters">
        <div v-for="key in visibleFilterKeys" :key="key" class="parts-filter-field">
          <label class="app-field-label" :for="`parts-${key}-filter`">{{ filterLabel(key) }}</label>
          <a-input v-if="key === 'keyword'" id="parts-keyword-filter" v-model="query.keyword" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.searchPlaceholder')" />
          <a-input v-else-if="key === 'name'" id="parts-name-filter" v-model="query.name" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.inputPlaceholder.name')" />
          <a-select v-else-if="key === 'regulationCode'" id="parts-regulation-filter" v-model="query.regulationCode" class="parts-filter-control app-filter-control" :options="regulationOptions" allow-clear show-search :placeholder="t('parts.inputPlaceholder.regulationCode')" :aria-label="t('parts.regulationCode')" />
          <a-select v-else-if="key === 'regulationName'" id="parts-regulationName-filter" v-model="query.regulationName" class="parts-filter-control app-filter-control" :options="regulationNameOptions" allow-clear show-search :placeholder="t('parts.filterPlaceholder.regulationName')" :aria-label="t('parts.regulationName')" />
          <a-select v-else-if="key === 'status'" id="parts-status-filter" v-model="query.status" class="parts-filter-control app-filter-control" :options="statusOptions" allow-clear :placeholder="t('parts.filterPlaceholder.status')" :aria-label="t('parts.certificateStatus')" />
          <a-input v-else-if="key === 'certificateNo'" id="parts-certificateNo-filter" v-model="query.certificateNo" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.filterPlaceholder.certificateNo')" />
          <a-input v-else-if="key === 'certificateVersion'" id="parts-certificateVersion-filter" v-model="query.certificateVersion" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.filterPlaceholder.certificateVersion')" />
          <a-range-picker v-else-if="key === 'issueDates'" v-model="query.issueDates" class="parts-filter-control app-filter-control" :aria-label="t('parts.issueDate')" :placeholder="[t('vehicles.startDate'), t('vehicles.endDate')]" />
          <a-input v-else-if="key === 'model'" id="parts-model-filter" v-model="query.model" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.filterPlaceholder.model')" />
          <a-input v-else-if="key === 'brand'" id="parts-brand-filter" v-model="query.brand" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.filterPlaceholder.brand')" />
          <a-select v-else-if="key === 'creator'" id="parts-creator-filter" v-model="query.creator" class="parts-filter-control app-filter-control" :options="creatorOptions.map(value => ({ value, label: value }))" allow-clear show-search :placeholder="t('parts.filterPlaceholder.creator')" :aria-label="t('parts.creator')" />
          <a-range-picker v-else-if="key === 'createdDates'" v-model="query.createdDates" class="parts-filter-control app-filter-control" :aria-label="t('parts.createdAt')" :placeholder="[t('vehicles.startDate'), t('vehicles.endDate')]" />
          <a-select v-else-if="key === 'updater'" id="parts-updater-filter" v-model="query.updater" class="parts-filter-control app-filter-control" :options="creatorOptions.map(value => ({ value, label: value }))" allow-clear show-search :placeholder="t('parts.filterPlaceholder.updater')" :aria-label="t('parts.updater')" />
          <a-range-picker v-else v-model="query.updatedDates" class="parts-filter-control app-filter-control" :aria-label="t('parts.updatedAt')" :placeholder="[t('vehicles.startDate'), t('vehicles.endDate')]" />
        </div>
        <a-button type="primary" html-type="submit"><template #icon><IconSearch :size="16" /></template>{{ t('parts.searchBtn') }}</a-button>
        <a-button class="app-btn-neutral" html-type="button" @click="resetFilters"><template #icon><IconRefresh :size="16" /></template>{{ t('parts.reset') }}</a-button>
        <ColumnSettingsPopover v-model:visible="filterSettingsOpen" :items="filterSettingsItems" :default-items="defaultFilterItems" :title="t('parts.filterSettings')" :list-aria-label="t('parts.filterSettings')" :show-label="t('parts.show')" :restore-label="t('parts.restore')" @change="onFilterSettingsChanged">
          <a-tooltip :content="t('parts.filterSettings')"><a-button class="app-btn-neutral parts-icon-button" html-type="button" :aria-label="t('parts.filterSettings')"><IconFilter :size="16" /></a-button></a-tooltip>
        </ColumnSettingsPopover>
      </form>

      <section class="region parts-list" role="region" :aria-label="t('parts.listTitle')">
        <div class="parts-list-actions"><a-space wrap>
            <a-button type="primary" @click="open()"><template #icon><IconPlus :size="16" /></template>{{ t('parts.create') }}</a-button><a-button class="app-btn-neutral" :disabled="transferBusy" @click="openImport"><template #icon><IconUpload :size="16" /></template>{{ t('parts.import') }}</a-button><a-button class="app-btn-neutral" @click="requestExport"><template #icon><IconDownload :size="16" /></template>{{ t('parts.export') }}</a-button></a-space>
            <ColumnSettingsPopover v-model:visible="columnSettingsOpen" :items="columnSettingsItems" :default-items="defaultColumnItems" :title="t('parts.columnSettings')" :list-aria-label="t('parts.columnSettings')" :show-label="t('parts.show')" :restore-label="t('parts.restore')" @change="onColumnSettingsChanged">
              <a-tooltip :content="t('parts.columnSettings')"><a-button class="app-btn-neutral parts-icon-button" :aria-label="t('parts.columnSettings')"><IconSettings :size="16" /></a-button></a-tooltip>
            </ColumnSettingsPopover>
        </div>
        <a-table class="parts-table" :columns="columns" :data="pagedRows" row-key="id" :bordered="false" :stripe="false" :pagination="false" :scroll="{ x: horizontalWidth }">
          <template #status="{ record }"><AppStatusTag :role="statusTag(record.status)" :label="statusLabel(record.status)" /></template>
          <template #brand="{ record }">{{ brandText(record.brand) || '—' }}</template>
          <template #actions="{ record }">
            <!-- 状态-操作矩阵 + 操作列分流：前 2 个直显（按操作频率排序），其余进「···」（DESIGN.md · Row action overflow） -->
            <div class="parts-row-actions">
              <a-link v-for="action in inlineRowActions(record.status)" :key="action" @click="ROW_ACTION_HANDLER[action](record)">{{ ROW_ACTION_LABEL[action]() }}</a-link>
              <a-dropdown v-if="overflowRowActions(record.status).length" :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow>
                <button type="button" class="parts-row-more" :aria-label="t('parts.more')" :title="t('parts.more')"><IconMore :size="16" /></button>
                <template #content>
                  <a-doption v-for="action in overflowRowActions(record.status)" :key="action" :class="{ 'row-more-danger': action === 'delete' }" @click="ROW_ACTION_HANDLER[action](record)">{{ ROW_ACTION_LABEL[action]() }}</a-doption>
                </template>
              </a-dropdown>
            </div>
          </template>
          <template #empty><a-empty :description="t('parts.noMatch')" /></template>
        </a-table>
        <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="filtered.length" />
      </section>
    </template>

    <!-- 新增 / 编辑零部件抽屉 -->
    <a-drawer :visible="drawer" :width="'min(500px, 100vw)'" :title="t(form.id ? 'parts.editTitle' : 'parts.create')" class="parts-form-drawer" :mask-closable="false" :esc-to-close="true" @cancel="closeDrawer">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="part-form" scroll-to-first-error>
        <a-form-item v-if="custom && !form.id && lockedSegments.some(segment => segment.kind === 'variable')">
          <!-- 编号条字段不在 rules 中，星号必须手动渲染（仅有这一个，不会重复）。 -->
          <template #label><span class="part-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.code') }}</span></template>
          <div class="part-code-editor" role="group" :aria-label="t('parts.code')">
            <template v-for="(segment, index) in lockedSegments" :key="segment.id">
              <span v-if="index > 0" class="part-code-separator" aria-hidden="true">{{ lockedSeparator }}</span>
              <a-input v-if="segment.kind === 'variable' && index === firstVariableIndex" v-model="variable" class="part-code-segment part-code-variable" :placeholder="t('parts.variablePlaceholder')" :max-length="20" :input-attrs="{ 'aria-label': t('parts.variable'), 'aria-required': 'true' }" />
              <span v-else-if="segment.kind === 'variable'" class="part-code-segment part-code-fixed">{{ variable.trim() || t('parts.variable') }}</span>
              <span v-else class="part-code-segment part-code-fixed">{{ segment.value }}</span>
            </template>
            <span class="part-code-separator" aria-hidden="true">{{ lockedSeparator }}</span>
            <span class="part-code-segment part-code-fixed">{{ String(serial).padStart(lockedDigits, '0') }}</span>
          </div>
        </a-form-item>

        <a-form-item v-for="field in DETAIL_FIELDS" :key="field" :field="field">
          <!-- 必填星号由 Arco rules 的 required 自动渲染，此处不再手动加星号（避免双星号）。 -->
          <template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template>
          <a-select v-if="field === 'regulationCode'" v-model="form.regulationCode" :options="regulationOptions" show-search :placeholder="t('parts.inputPlaceholder.regulationCode')" />
          <!-- 商标：富文本（2026-11-23 用户裁决，去掉上传与输入框） -->
          <RichValue v-else-if="field === 'brand'" v-model="form.brand" :label="t('parts.brand')" input-id="part-brand-editor" />
          <a-date-picker v-else-if="field === 'issueDate'" v-model="form.issueDate" :placeholder="t('parts.inputPlaceholder.issueDate')" class="part-full-control" />
          <a-date-picker v-else-if="field === 'validUntil'" v-model="form.validUntil" :placeholder="t('parts.inputPlaceholder.validUntil')" class="part-full-control" />
          <a-input v-else v-model="form[field]" :max-length="field === 'certificateVersion' ? 20 : 100" show-word-limit :placeholder="t(`parts.inputPlaceholder.${field}`)" />
        </a-form-item>

        <!-- 零部件证书：纯附件上传（2026-11-23 用户裁决，去掉输入框；交互不变：png/pdf/word、1 个、≤20MB）。位于有效期至之后、版本说明之前。 -->
        <a-form-item field="certificateFile">
          <template #label><span class="app-field-label">{{ t('parts.certificate') }}</span></template>
          <div class="part-upload">
            <input ref="certificateInput" type="file" accept=".png,.pdf,.doc,.docx" hidden @change="selectAttachment($event)" />
            <div v-if="!form.certificateFile" class="part-upload-row">
              <a-button class="app-btn-neutral" @click="chooseAttachment()"><template #icon><IconUpload :size="16" /></template>{{ t('parts.uploadFile') }}</a-button>
              <span class="part-upload-hint">{{ t('parts.fileHint') }}</span>
            </div>
            <!-- 已上传：文件类型图标 + 文件名 + × 移除（mini 文字按钮居右），与新增法规的法规文件行一致 -->
            <div v-else class="part-file-list">
              <div class="part-file-item">
                <component :is="attachmentIcon(form.certificateFile.name)" :size="16" class="part-file-type" />
                <span class="part-file-item-name">{{ form.certificateFile.name }}</span>
                <a-button type="text" size="mini" class="part-file-remove" :aria-label="t('parts.removeFile')" :title="t('parts.removeFile')" @click="form.certificateFile = undefined"><template #icon><IconClose :size="14" /></template></a-button>
              </div>
            </div>
          </div>
        </a-form-item>

        <a-form-item field="versionNote">
          <template #label><span class="app-field-label">{{ t('parts.versionNote') }}</span></template>
          <a-textarea v-model="form.versionNote" :max-length="200" show-word-limit :placeholder="t('parts.inputPlaceholder.versionNote')" />
        </a-form-item>
      </a-form>

      <template #footer>
        <div class="parts-drawer-footer">
          <a-button class="app-btn-neutral" @click="closeDrawer">{{ t('parts.cancel') }}</a-button>
          <a-button class="app-btn-neutral" @click="save(true)">{{ t('parts.saveDraft') }}</a-button>
          <a-button type="primary" @click="save(false)">{{ t('parts.submit') }}</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 自定义编号规则抽屉（沿用分段编号条） -->
    <a-drawer :visible="ruleVisible" :title="t('parts.customRule')" :width="500" class="parts-rule-drawer" :mask-closable="true" :esc-to-close="true" @cancel="closeRule">
      <section class="rule-section">
        <h4 class="rule-section-title">{{ t('parts.basicConfig') }}</h4>
        <div class="rule-row"><span class="rule-row-label"><span class="rule-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.separator') }}</span></span><a-radio-group v-model="separator" class="rule-radios" :options="['-', '_', '/']" :aria-label="t('parts.separator')" /></div>
        <div class="rule-row"><span class="rule-row-label"><span class="rule-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.digits') }}</span></span><a-radio-group v-model="digits" class="rule-radios" :options="digitOptions" :aria-label="t('parts.digits')" /></div>
      </section>
      <section class="rule-section">
        <h4 class="rule-section-title">{{ t('parts.ruleSection') }}</h4>
        <div class="rule-actions"><a-button v-for="kind in ['fixed', 'variable', 'year'] as const" :key="kind" class="rule-add" @click="addSegment(kind)"><IconPlus />{{ t(`parts.${kind}`) }}</a-button></div>
        <div class="segments">
          <div v-for="segment in segments" :key="segment.id" class="segment">
            <div class="segment-head"><span class="segment-title">{{ t(`parts.${segment.kind}`) }}</span><button type="button" class="segment-remove" :aria-label="t('parts.removeSegment')" @click="segments = segments.filter(item => item.id !== segment.id)">×</button></div>
            <a-input v-model="segment.value" :max-length="20" :disabled="segment.kind === 'year'" :aria-label="t(`parts.${segment.kind}`)" />
          </div>
          <div class="segment"><div class="segment-head"><span class="segment-title">{{ t('parts.sequence') }}</span></div><a-input :model-value="'1'.padStart(digits, '0')" disabled :aria-label="t('parts.sequence')" /></div>
        </div>
        <p class="rule-preview"><span class="app-field-label">{{ t('parts.preview') }}</span>{{ preview }}</p>
      </section>
      <template #footer><a-space><a-button class="app-btn-neutral" @click="closeRule">{{ t('parts.cancel') }}</a-button><a-button type="primary" @click="configure">{{ t('parts.confirm') }}</a-button></a-space></template>
    </a-drawer>

    <!-- 审批弹窗：通过录入审批意见，驳回录入驳回理由 -->
    <a-modal v-model:visible="reviewOpen" :title="t(reviewingApprove ? 'parts.approveTitle' : 'parts.rejectTitle')" :width="480" :ok-text="t(reviewingApprove ? 'parts.pass' : 'parts.reject')" :cancel-text="t('parts.cancel')" @ok="confirmReview">
      <a-textarea id="part-review-text" v-model="reviewText" :max-length="500" show-word-limit :placeholder="t(reviewingApprove ? 'parts.opinionPlaceholder' : 'parts.reasonPlaceholder')" :aria-label="t(reviewingApprove ? 'parts.approveTitle' : 'parts.rejectTitle')" />
      <p v-if="reviewError" class="part-review-error">{{ t(reviewingApprove ? 'parts.opinionRequired' : 'parts.reasonRequired') }}</p>
    </a-modal>

    <ConfirmDialog v-model:visible="ruleDiscard" :title="t('designSystem.unsavedChanges')" @confirm="discardRule" />
    <ConfirmDialog v-model:visible="discard" :title="t('designSystem.unsavedChanges')" @confirm="confirmDiscard" />
    <ConfirmDialog :visible="!!deleting" :title="t('parts.confirmDeleteNamed', { name: deleting?.name ?? '' })" :description="t('parts.deleteCaution')" @update:visible="deleting = undefined" @confirm="remove" />

    <!-- 批量导入抽屉 -->
    <a-drawer class="app-import-drawer" :visible="importOpen" :width="'min(560px, 100vw)'" :title="t('batchImport.title')" :mask-closable="!transferBusy" :esc-to-close="!transferBusy" :closable="!transferBusy" @cancel="!transferBusy && (importOpen = false)">
      <div class="app-import-block">
        <input ref="importFileInput" type="file" accept=".xlsx" hidden @change="selectImportFile(($event.target as HTMLInputElement).files?.[0])" />
        <div class="app-import-target" :class="{ 'is-dragging': importDragging }" role="button" tabindex="0" :aria-label="t('batchImport.upload')" @click="chooseImportFile" @keydown.enter.prevent="chooseImportFile" @keydown.space.prevent="chooseImportFile" @dragover.prevent="!transferBusy && (importDragging = true)" @dragleave="importDragging = false" @drop.prevent="selectImportFile($event.dataTransfer?.files[0])">
          <IconFolder :size="32" />
          <p class="app-import-target-name">{{ importFile?.name || t('batchImport.hint') }}</p>
          <a-button type="primary" :disabled="transferBusy" @click.stop="chooseImportFile">{{ t(importFile ? 'batchImport.reupload' : 'batchImport.upload') }}</a-button>
        </div>
        <a-alert v-if="importError" type="error" role="alert">{{ importError }}</a-alert>
        <div class="app-import-notes"><p class="app-import-notes-title">{{ t('batchImport.notesTitle') }}</p><p class="app-import-notes-lines">{{ t('parts.importHelp') }}</p></div>
        <a-button type="text" class="app-import-template" :loading="partTemplatePreparing" :disabled="partTemplatePreparing || transferBusy" @click="partTemplateUrl ? downloadPartTemplate() : preparePartTemplate()">
          <template #icon><IconDownload :size="16" /></template>{{ t(partTemplatePreparing ? 'batchImport.templatePreparing' : partTemplateUrl ? 'batchImport.template' : 'batchImport.templateRetry') }}
        </a-button>
      </div>
      <template #footer><a-space :size="12"><a-button class="app-btn-neutral" :disabled="transferBusy" @click="importOpen = false">{{ t('batchImport.cancel') }}</a-button><a-button type="primary" :loading="transferBusy" :disabled="!importFile || !importFile.name.toLowerCase().endsWith('.xlsx')" @click="submitImport">{{ t('batchImport.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog v-model:visible="exportOpen" icon="info" :title="t('parts.exportTitle')" :description="[t('parts.exportScope'), t('parts.exportDestination')]" :ok-text="t('parts.exportConfirm')" :ok-loading="transferBusy" :dismissible="!transferBusy" @confirm="exportData" />
  </main>
</template>

<style scoped>
.parts-page { display: grid; gap: 16px; min-width: 0; }
.parts-page.parts-list-page { grid-template-rows: auto minmax(0, 1fr); }
.region { padding: 16px; background: var(--app-surface); min-width: 0; }
.initial { min-height: calc(100dvh - 88px); display: flex; align-items: center; flex-direction: column; padding-top: clamp(80px, 20vh, 204px); box-sizing: border-box; }
.initial > p { max-width: 520px; text-align: center; color: var(--color-text-3); line-height: 22px; margin: 28px 0 40px; }
.empty-illustration { width: 160px; height: 120px; background: rgb(var(--primary-2)); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.empty-sheet { background: var(--app-surface); height: 100px; border-radius: 8px; overflow: hidden; }
.empty-top { height: 18px; background: rgb(var(--primary-3)); margin-bottom: 14px; }
.empty-line { display: flex; align-items: center; gap: 4px; padding: 0 8px; margin-bottom: 10px; }
.empty-line img { width: 8px; height: 8px; }
.empty-line span { width: 100px; height: 8px; background: var(--color-fill-2); border-radius: 4px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
h3 { margin: 0 0 16px; font-size: 16px; }
.part-form { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 100%; padding: 16px; background: var(--app-surface); border-radius: 2px; }
.part-form :deep(.arco-form-item) { margin-bottom: 0; }
.part-form :deep(.arco-form-item-label) { margin-bottom: 4px; padding: 0; }
.part-form :deep(.arco-input-wrapper), .part-form :deep(.arco-select-view), .part-form :deep(.arco-picker), .part-form :deep(.arco-textarea-wrapper) { width: 100%; }
.part-full-control { width: 100%; }
.part-required { margin-right: 4px; color: rgb(var(--danger-6)); font-size: 14px; line-height: 22px; }
.parts-drawer-footer { display: flex; justify-content: flex-end; gap: 12px; }
.part-code-editor { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; min-width: 0; }
.part-form .part-code-editor :deep(.part-code-separator) { flex: none; color: var(--color-text-3); font-size: 14px; line-height: 32px; }
.part-form .part-code-editor :deep(.part-code-segment) { flex: none; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; height: 32px; min-width: 56px; padding: 0 12px; border: 1px solid var(--app-control-border); border-radius: var(--app-radius-control); background: var(--app-fill-2); color: var(--color-text-3); font-size: 14px; line-height: 22px; white-space: nowrap; }
.part-form .part-code-editor :deep(.part-code-variable) { flex: 1 1 140px; width: auto; min-width: 140px; justify-content: flex-start; padding: 0 12px; border-color: var(--app-control-border); background: var(--app-surface); box-shadow: none; }
.part-form .part-code-editor :deep(.part-code-variable:focus-within) { border-color: var(--app-accent); box-shadow: inset 0 0 0 1px var(--app-accent); }
.part-form .part-code-editor :deep(.part-code-variable .arco-input) { color: var(--color-text-1); font-size: 14px; }
.part-form .part-code-editor :deep(.part-code-variable .arco-input::placeholder) { color: var(--color-text-3); }
.part-attach-item :deep(.arco-form-item-content) { flex-direction: column; align-items: stretch; }
.part-upload { display: flex; flex-direction: column; align-items: flex-start; gap: 0; margin-top: 8px; width: 100%; }
.part-upload-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; min-width: 0; }
.part-upload-hint { margin: 0; color: var(--color-text-3); font-size: 12px; line-height: 20px; }
.part-uploaded { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.part-uploaded-name { color: var(--color-text-1); font-size: 14px; overflow-wrap: anywhere; }
/* 已上传文件行（2026-11-23 对齐法规 .reg-file-*）：图标+文件名占满+× mini 按钮居右 */
.part-file-list { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.part-file-item { display: flex; align-items: center; gap: 8px; min-height: 32px; color: var(--color-text-1); }
.part-file-type { flex: none; color: var(--color-text-3); }
.part-file-item-name { flex: 1; min-width: 0; font-size: 14px; line-height: 22px; overflow-wrap: anywhere; text-align: left; }
.part-file-remove { flex: none; }
.part-file-remove :deep(svg) { display: block; }
.part-file-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.part-file-input { width: 100%; max-width: 320px; background: var(--app-surface); }
.part-file-actions { display: flex; flex-wrap: wrap; gap: 12px; font-size: 14px; overflow-wrap: anywhere; }
.part-file-name { overflow-wrap: anywhere; min-width: 0; }
.part-brand-rich { overflow-wrap: anywhere; overflow-x: auto; max-width: 100%; }
.part-brand-rich :deep(img) { max-width: 100%; height: auto; }
.part-brand-rich :deep(table) { border-collapse: collapse; }
.part-brand-rich :deep(td), .part-brand-rich :deep(th) { border: 1px solid var(--app-divider); padding: var(--mt-ds-space-2); }
/* 基本信息：与证书详情一致的三列栅栏（16px gap），行内标签值 baseline 对齐 */
.part-basic-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--mt-ds-space-4); margin: 0; text-align: left; }
.part-basic-fields .app-detail-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--mt-ds-space-2); min-width: 0; }
.part-basic-fields dt { flex-shrink: 0; }
.part-basic-fields dt, .part-basic-fields dd { margin: 0; font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); }
@media (max-width: 900px) { .part-basic-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .part-basic-fields { grid-template-columns: minmax(0, 1fr); } }
.part-file-actions { align-items: center; }
.part-file-actions :deep(.arco-btn) { flex: none; width: 32px; height: 32px; padding: 0; }
.part-review-error { margin: 8px 0 0; color: rgb(var(--danger-6)); font-size: 12px; line-height: 20px; }
.parts-detail-page :deep(.arco-table) { max-width: 100%; min-width: 0; }
.parts-detail-page .region { border-radius: var(--mt-ds-control-radius); }
.parts-detail-page h3 { font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
.parts-detail-page :deep(.arco-descriptions-item-label), .parts-detail-page :deep(.arco-descriptions-item-value), .parts-detail-page :deep(.arco-table-th), .parts-detail-page :deep(.arco-table-td) { font-weight: var(--mt-ds-weight-body); }
.parts-detail-page :deep(.arco-descriptions-item-label) { padding-bottom: var(--mt-ds-space-1); color: var(--color-text-3); }
.parts-detail-page a { color: var(--app-accent); }
/* 关联任务表内【详情】等链接（2026-11-20 用户裁决）：保持主色但不加下划线，hover 也不加。 */
.parts-detail-page .region a { text-decoration: none; }
.parts-detail-page .region a:hover { text-decoration: none; }
.block-title { display: flex; align-items: center; gap: var(--mt-ds-space-2); margin: 0 0 16px; }
.block-title h3 { margin: 0; }
.detail-status { flex: none; }
.timeline-heading { display: flex; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-4); }
.timeline-heading time { color: var(--color-text-3); }
.processing-timeline p { margin: var(--mt-ds-space-2) 0 0; line-height: var(--mt-ds-line-body); overflow-wrap: anywhere; }
.event-comment { color: var(--color-text-2); white-space: pre-wrap; }
.processing-timeline :deep(.arco-timeline-item:not(.arco-timeline-item-last)) { padding-bottom: var(--mt-ds-space-6); }
@media (max-width: 760px) { .initial { padding-top: 80px; } }
</style>

<style scoped>
.filters, .parts-list { border-radius: var(--mt-ds-control-radius); }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--mt-ds-space-4); }
.filters :deep(input::placeholder), .filters :deep(.arco-select-view-placeholder) { color: var(--color-text-3); opacity: 1; }
.parts-filter-field { display: grid; grid-template-columns: minmax(0, var(--mt-ds-filter-width)); align-items: start; justify-items: start; gap: var(--mt-ds-space-1); min-width: 0; }
.parts-filter-field .app-field-label { font-size: var(--mt-ds-font-caption); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-caption); text-align: left; padding: 0; white-space: nowrap; }
.filters :deep(.parts-filter-control) { width: var(--mt-ds-filter-width); max-width: 100%; }
.filters > :deep(.arco-btn) { flex: 0 0 auto; }
.parts-icon-button { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }
.parts-list-actions { justify-content: space-between; display: flex; align-items: center; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-3); flex-wrap: wrap; }
.parts-list :deep(.arco-table), .parts-list :deep(.arco-table-container) { border: 0; }
.parts-list :deep(thead) { background: var(--app-table-header); }
.parts-list :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; }
.parts-list :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-surface); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.parts-list :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
.parts-list :deep(.arco-link), .parts-list :deep(.arco-tag) { font-weight: var(--mt-ds-weight-body); }
.parts-row-actions { display: inline-flex; align-items: center; gap: var(--mt-ds-space-3); }
.parts-row-actions > a { color: var(--app-accent); font-weight: var(--mt-ds-weight-body); text-decoration: none; }
.parts-row-actions > a:hover { text-decoration: underline; }
.parts-row-more { display: inline-grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; border-radius: var(--mt-ds-control-radius); background: transparent; color: var(--color-text-3); cursor: pointer; }
.parts-row-more:hover { background: var(--color-fill-1); color: var(--color-text-2); }
.parts-row-more:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
@media (max-width: 760px) {
  .filters { align-items: stretch; }
  .parts-filter-field { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .filters :deep(.parts-filter-control) { width: 100%; max-width: 100%; }
}
</style>

<!-- a-modal / a-drawer teleport 到 body，scoped 规则覆盖不到弹层外壳。 -->
<style>
.parts-rule-drawer { max-width: 100vw; }
.parts-rule-drawer .arco-drawer-body { background: var(--mt-fill-1); padding: var(--mt-ds-space-4); }
.parts-rule-drawer .rule-section { padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.parts-rule-drawer .arco-drawer-header { padding: 0 20px; border-bottom: 1px solid var(--app-divider); }
.parts-rule-drawer .arco-drawer-footer { padding: 16px 20px 20px; border-top: 1px solid var(--app-divider); }
.parts-rule-drawer .arco-drawer-footer .arco-btn { height: 32px; min-width: 64px; border-radius: var(--app-radius-control); font-size: 14px; }
.parts-rule-drawer .arco-drawer-footer .arco-btn:not(.arco-btn-primary) { border: 1px solid var(--color-border-2); background: var(--app-surface); color: var(--color-text-1); }
.parts-rule-drawer .rule-section + .rule-section { margin-top: var(--mt-ds-space-4); }
.parts-rule-drawer .rule-section-title { margin: 0 0 12px; font-size: 16px; font-weight: 600; line-height: 24px; }
.parts-rule-drawer .rule-row { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.parts-rule-drawer .rule-row:last-child { margin-bottom: 0; }
.parts-rule-drawer .rule-row-label { display: inline-flex; flex: none; align-items: center; gap: 4px; font-size: 14px; }
.parts-rule-drawer .rule-required { color: rgb(var(--danger-6)); }
.parts-rule-drawer .rule-radios { display: inline-flex; flex-wrap: wrap; gap: 16px; }
.parts-rule-drawer .rule-radios .arco-radio { margin-right: 0; font-size: 14px; }
.parts-rule-drawer .rule-actions { display: flex; flex-wrap: wrap; gap: 16px; }
.parts-rule-drawer .rule-add { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto; padding: 0 12px; height: 32px; border: 1px solid var(--app-accent); border-radius: var(--app-radius-control); background: var(--app-surface); color: var(--app-accent); font-size: 14px; }
.parts-rule-drawer .segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.parts-rule-drawer .segment { min-width: 0; padding: 12px; border: 1px solid var(--color-border-2); border-radius: var(--app-radius-control); background: var(--app-surface); }
.parts-rule-drawer .segment-head { display: flex; align-items: center; justify-content: space-between; min-height: 24px; margin-bottom: 12px; }
.parts-rule-drawer .segment-title { color: var(--color-text-3); font-size: 14px; }
.parts-rule-drawer .segment-remove { padding: 0 4px; border: 0; background: transparent; color: rgb(var(--danger-6)); font-size: 18px; line-height: 24px; cursor: pointer; }
.parts-rule-drawer .segment .arco-input-wrapper { height: 32px; border-radius: var(--app-radius-control); }
.parts-rule-drawer .segment .arco-input-wrapper.arco-input-disabled { background: var(--color-fill-1); }
.parts-rule-drawer .rule-preview { margin: 24px 0 0; padding: 12px 16px; border-radius: var(--app-radius-control); background: var(--color-fill-1); font-size: 14px; line-height: 24px; overflow-wrap: anywhere; }
@media (max-width: 900px) {
  .parts-rule-drawer .arco-drawer-header, .parts-rule-drawer .arco-drawer-body, .parts-rule-drawer .arco-drawer-footer { padding-left: 20px; padding-right: 20px; }
}
@media (max-width: 560px) {
  .parts-rule-drawer .segments { grid-template-columns: minmax(0, 1fr); }
  .parts-rule-drawer .rule-add { width: 100%; }
  .parts-rule-drawer .rule-row { align-items: flex-start; flex-direction: column; gap: 8px; }
}
</style>
