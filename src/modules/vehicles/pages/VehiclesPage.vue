<script setup lang="ts">
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import VehicleImport from '../components/VehicleImport.vue';
import { cachePartDetail } from '../../parts/data/detailSnapshot';
import { emptyPart } from '../../parts/data/parts';
import AppDetailList from '../../../design/components/AppDetailList.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { useUserStore } from '../../user-management/stores/users';
import { COUNTRY_CODES, validateVehicle, today } from '../data/validation';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useVehiclesStore } from '../stores/vehicles';
import { usePartsStore } from '../../parts/stores/parts';
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableColumnData, TreeNodeData } from '@arco-design/web-vue';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconMore, IconSettings, IconSearch, IconRefresh, IconLeft, IconRight, IconFilter, IconSettings as IconColumns } from '@arco-design/web-vue/es/icon';
import { directories, vehicles, vehicleParts, type VehiclePart, type Vehicle, type Directory } from '../data/vehicles';
const { t } = useI18n();
const users = useUserStore();
const ownerOptions = computed(() => users.users.map(user => ({ value: user.name, label: user.name })));
const countryOptions = computed(() => COUNTRY_CODES.map(code => ({ value: code, label: t(`regulations.${code}`) })));
const deleting = ref<Directory>();
const deleteError = ref('');
/** 层级配置锁定：仅当「当前选中目录及其子树」下已录入车辆数据时才锁定，
 *  符合交互说明「目录已有数据后配置锁定」与弹窗文案「目录已写入数据，层级配置已锁定」。
 *  空目录（含新建但未录入数据的目录）可正常配置层级；未选中任何目录时退化为全局判断（任一车辆即锁定）。
 *  此前写为 tree.value.length > 0（只要有目录节点就永久锁定）与 rows.value.length > 0（任一车辆即全局锁定），
 *  二者都忽略了「按目录判断」的语义，导致空目录也无法配置层级。 */
const hierarchyLocked = computed(() => {
  const key = selected.value[0];
  if (!key) return rows.value.length > 0;
  return rows.value.some(row => directoryPath(tree.value, row.directory).some(node => node.key === key));
});
function requestDelete(node: Directory) {
  deleteError.value = projects.value.some(project => project.directories.includes(node.key)) ? 'referenced' : node.children?.length ? 'hasChildren' : rows.value.some(row => row.directory === node.key) ? 'hasVehicles' : '';
  deleting.value = node;
}
function removeDirectory() {
  const node = deleting.value; if (!node) return;
  const path = directoryPath(tree.value, node.key);
  const parent = path.at(-2); const siblings = parent?.children ?? tree.value;
  const index = siblings.findIndex(item => item.key === node.key);
  if (projects.value.some(project => project.directories.includes(node.key)) || node.children?.length || rows.value.some(row => row.directory === node.key)) return;
  if (index >= 0) siblings.splice(index, 1);
  selected.value = parent ? [parent.key] : []; deleting.value = undefined;
}
const { tree, rows, hierarchyLevels, projects } = storeToRefs(useVehiclesStore());
const partsStore = usePartsStore();
const route = useRoute();
const router = useRouter();
const editor = computed(() => route.name === 'vehicle-directory-new' || route.name === 'vehicle-directory-edit');
const editorSnapshot = ref('');
const partQuery = ref('');
const partApplied = ref('');
const partCatalog = computed(() => partsStore.rows.map(part => ({ code: part.code, name: part.name, supplier: part.supplier, id: part.id })));
const availableParts = computed(() => partCatalog.value.filter(part => `${part.code} ${part.name}`.toLowerCase().includes(partApplied.value.toLowerCase())));
const editorLocked = computed(() => projects.value.some(project => project.type === 'vehicle' && project.status === 'completed' && project.directories.includes(directoryTarget.value?.key ?? '')));
const editorDirty = computed(() => editor.value && editorSnapshot.value !== JSON.stringify([directoryName.value, directoryRegex.value, directoryParts.value]));
const discardVisible = ref(false);
function protectRefresh(event: BeforeUnloadEvent) { if (editorDirty.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => window.addEventListener('beforeunload', protectRefresh));
onBeforeUnmount(() => window.removeEventListener('beforeunload', protectRefresh));
let leaveResolve: ((value: boolean) => void) | undefined;
onBeforeRouteLeave(() => { if (!editorDirty.value) return true; discardVisible.value = true; return new Promise<boolean>(resolve => { leaveResolve = resolve; }); });
function resolveLeave(value: boolean) { discardVisible.value = false; leaveResolve?.(value); leaveResolve = undefined; }
function partHref(part: VehiclePart) {
  const record = partsStore.rows.find(item => item.code === part.code);
  return router.resolve({ name: 'part-detail', params: { id: record?.id ?? part.code } }).href;
}
function preparePart(part: VehiclePart) {
  const record = partsStore.rows.find(item => item.code === part.code);
  const snapshot = record ?? { ...emptyPart(), id: part.code, code: part.code, name: part.name, supplier: part.supplier };
  try { cachePartDetail(snapshot); } catch { /* The detail route retains its unavailable state when storage is blocked. */ }
}
const selected = ref(['default']);
const production = ref('production');
const directorySearch = ref('');
const query = ref('');
const applied = ref('');
const dates = reactive({ effective: [] as string[], created: [] as string[] });
const appliedDates = ref({ effective: [] as string[], created: [] as string[] });
const columnOpen = ref(false);
const columnKeys = ref(['code', 'created', 'effective']);
const columnItems = computed(() => ['code', 'created', 'effective'].map(key => ({ key, label: t(`vehicles.${key}`), visible: columnKeys.value.includes(key), disabled: key === 'code' })));
/* ---------------------------------------- 筛选条件设置（DESIGN.md · List settings popover）
   弹层顺序即筛选条顺序；勾选、拖拽、恢复默认即时生效，无草稿层；隐藏条件时同步清空草稿值与生效值 */
const FILTER_KEYS = ['code', 'effective', 'created'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
const defaultFilterSettings: { key: FilterKey; visible: boolean }[] = FILTER_KEYS.map(key => ({ key, visible: true }));
const filterSettings = ref(defaultFilterSettings.map(item => ({ ...item })));
const filterSettingsOpen = ref(false);
const visibleFilterKeys = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
const showCodeFilter = computed(() => visibleFilterKeys.value.includes('code'));
const visibleDateFilterKeys = computed(() => visibleFilterKeys.value.filter((key): key is 'effective' | 'created' => key !== 'code'));
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: t(`vehicles.${item.key}`), disabled: item.key === 'code' })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => defaultFilterSettings.map(item => ({ ...item, label: t(`vehicles.${item.key}`), disabled: item.key === 'code' })));
function clearFilter(key: FilterKey) {
  if (key === 'code') { query.value = ''; applied.value = ''; }
  else { dates[key] = []; appliedDates.value[key] = []; }
}
function onFilterSettingsChanged(next: ColumnSettingsItem[]) {
  const hidden = next.filter(item => !item.visible).map(item => item.key as FilterKey);
  filterSettings.value = next.map(item => ({ key: item.key as FilterKey, visible: item.visible }));
  hidden.forEach(clearFilter);
  if (hidden.length) setPage(1);
}
function dateMatches(value: string, range: string[]) { return !range?.length || value.slice(0, 10) >= range[0]! && value.slice(0, 10) <= range[1]!; }
const modal = ref(false);
const detail = ref<Vehicle>();
const deletingVehicle = ref<Vehicle>();
function removeVehicle() {
  const id = deletingVehicle.value?.id;
  rows.value = rows.value.filter(row => row.id !== id);
  if (detail.value?.id === id) detail.value = undefined;
  deletingVehicle.value = undefined;
  setPage(page.value);
  Message.success(t('vehicles.vehicleDeleted'));
}
const directoryModal = ref(false);
const levelsModal = ref(false);
const draftLevels = ref(4);
function openLevels() { draftLevels.value = hierarchyLevels.value; levelsModal.value = true; }
function saveLevels() { if (hierarchyLocked.value) return false; hierarchyLevels.value = draftLevels.value; Message.success(t('vehicles.saved')); return true; }
const directoryName = ref('');
const directoryTarget = ref<Directory>();
const directoryParent = ref<Directory>();
const directoryParts = ref<string[]>([]);
const directoryRegex = ref('');
const directoryError = ref('');
const directoryView = ref(false);
const directoryDetailVisible = ref(false);
function editDirectory(node?: Directory, parent?: Directory, view = false) {
  node = node ? directoryPath(tree.value, node.key).at(-1) : undefined;
  parent = parent ? directoryPath(tree.value, parent.key).at(-1) : undefined;
  directoryTarget.value = node; directoryParent.value = parent; directoryView.value = view;
  directoryName.value = node?.title ?? ''; directoryRegex.value = node?.vinRegex ?? ''; directoryParts.value = [...(node?.partIds ?? [])]; directoryError.value = '';
  if (!view && ((node && depth(tree.value, node.key) === hierarchyLevels.value) || (parent && depth(tree.value, parent.key) + 1 === hierarchyLevels.value))) {
    void router.push(node ? { name: 'vehicle-directory-edit', params: { id: node.key } } : { name: 'vehicle-directory-new', query: { parent: parent?.key } }); return;
  }
  if (view && node && depth(tree.value, node.key) === hierarchyLevels.value) directoryDetailVisible.value = true;
  else directoryModal.value = true;
}
function depth(nodes: Directory[], key: string, level = 1): number {
  for (const node of nodes) { if (node.key === key) return level; const found = depth(node.children ?? [], key, level + 1); if (found) return found; } return 0;
}
const canAddChild = (node: Directory) => depth(tree.value, node.key) < hierarchyLevels.value;
const leafDirectory = computed(() => directoryTarget.value ? depth(tree.value, directoryTarget.value.key) === hierarchyLevels.value : directoryParent.value ? depth(tree.value, directoryParent.value.key) + 1 === hierarchyLevels.value : hierarchyLevels.value === 1);
const partOptions = [{ value: 'PN-GW-B02', label: 'PN-GW-B02 · 网关 GW' }, { value: 'PN-TBOX-C03', label: 'PN-TBOX-C03 · TBOX' }, { value: 'PN-IVI-D04', label: 'PN-IVI-D04 · 车机 IVI' }];
function directoryPath(nodes: Directory[], key: string): Directory[] {
  for (const node of nodes) {
    if (node.key === key) return [node];
    const path = directoryPath(node.children ?? [], key);
    if (path.length) return [node, ...path];
  }
  return [];
}
const detailPath = computed(() => directoryPath(tree.value, detail.value?.directory ?? ''));
const detailParts = computed(() => [...partCatalog.value, ...vehicleParts.filter(part => !partCatalog.value.some(item => item.code === part.code))].filter(part => detailPath.value.at(-1)?.partIds?.includes(part.code)));
const partColumns = computed<TableColumnData[]>(() => [
  { title: t('vehicles.partCode'), dataIndex: 'code' },
  { title: t('vehicles.partName'), dataIndex: 'name' },
  { title: t('vehicles.supplier'), dataIndex: 'supplier' },
  { title: t('vehicles.operations'), slotName: 'partActions', width: 80 },
]);
const directoryFacts = computed(() => [
  { key: 'name', label: t('vehicles.directoryName'), value: directoryTarget.value?.title || '—' },
  { key: 'path', label: t('vehicles.directoryPath'), value: directoryPath(tree.value, directoryTarget.value?.key ?? '').map(node => node.title).join(' / ') || '—' },
  { key: 'regex', label: t('vehicles.vinRegex'), value: directoryTarget.value?.vinRegex || '—' },
  { key: 'created', label: t('vehicles.directoryCreated'), value: directoryTarget.value?.created || '—' },
  { key: 'updated', label: t('vehicles.directoryUpdated'), value: directoryTarget.value?.updated || '—' },
]);
const linkedDirectoryParts = computed(() => [...partCatalog.value, ...vehicleParts.filter(part => !partCatalog.value.some(item => item.code === part.code))].filter(part => directoryTarget.value?.partIds?.includes(part.code)));
const basicFields = computed(() => [
  { key: 'code', label: t('vehicles.code'), value: detail.value?.code ?? '—' },
  { key: 'directory', label: t('vehicles.directory'), value: detailPath.value.map(node => node.title).join(' / ') || '—' },
  ...detailFields(['effective', 'created']),
]);
const detailFields = (keys: (keyof Vehicle)[]) => keys.map(key => ({ key, label: t(`vehicles.${key}`), value: key === 'region' && detail.value?.region ? t(`regulations.${detail.value.region}`) : String(detail.value?.[key] || '—') }));
const error = ref('');
const vehicleFormFields = computed(() => production.value === 'production' ? ['code', 'effective', 'region', 'owner', 'description'] as const : ['code', 'effective'] as const);
const form = reactive({ code: '', effective: '', region: '', owner: '', description: '' });
function descendants(nodes: Directory[], key: string): string[] {
  for (const node of nodes) {
    if (node.key === key) return [node.key, ...(node.children ?? []).flatMap(child => descendants([child], child.key))];
    const result = descendants(node.children ?? [], key);
    if (result.length) return result;
  }
  return [];
}
const scope = computed(() => descendants(tree.value, selected.value[0] ?? 'brand'));
const activeDirectory = computed(() => directoryPath(tree.value, selected.value[0] ?? '').at(-1));
const selectedLeaf = computed(() => Boolean(activeDirectory.value && depth(tree.value, activeDirectory.value.key) === hierarchyLevels.value));
const activePath = computed(() => directoryPath(tree.value, selected.value[0] ?? '').map(node => node.title).join(' / '));
const breadcrumbSegments = computed(() => directoryPath(tree.value, selected.value[0] ?? '').map(node => node.title));
const scoped = computed(() => selectedLeaf.value ? rows.value.filter(row => row.directory === selected.value[0]) : []);
watch(selected, () => { dates.effective = []; dates.created = []; appliedDates.value = { effective: [], created: [] }; query.value = ''; applied.value = ''; production.value = 'production'; setPage(1); });
const filtered = computed(() => scoped.value.filter(row => row.production === (production.value === 'production') && row.code.toLowerCase().includes(applied.value.toLowerCase()) && dateMatches(row.effective, appliedDates.value.effective) && dateMatches(row.created, appliedDates.value.created)));
/** 筛选已应用且有条件（DESIGN.md · Empty：区分「暂无数据」与「搜索不到相关内容」） */
const hasAppliedFilters = computed(() => Boolean(applied.value.trim() || appliedDates.value.created.length || appliedDates.value.effective.length));
/** 查询 / 重置：草稿值 → 应用值，查询变化重置到第 1 页 */
function applySearch() { applied.value = query.value; appliedDates.value = { effective: [...dates.effective], created: [...dates.created] }; setPage(1); }
function resetSearch() { dates.effective = []; dates.created = []; appliedDates.value = { effective: [], created: [] }; query.value = ''; applied.value = ''; setPage(1); }
/* 排序在数据层完成（DESIGN.md · Table）：手动切片分页时 Arco 内建排序只作用于当前页，必须先排后切 */
type SortKey = 'code' | 'created' | 'effective';
const sortKey = ref<SortKey>('created');
const sortDirection = ref<'ascend' | 'descend'>('descend');
const sorted = computed(() => {
  const list = [...filtered.value];
  const key = sortKey.value;
  return sortDirection.value === 'ascend'
    ? list.sort((a, b) => String(a[key]).localeCompare(String(b[key])))
    : list.sort((a, b) => String(b[key]).localeCompare(String(a[key])));
});
/* 分页（DESIGN.md · Pagination）：共 N 项 → 每页条数 → 页码（5 页滑动窗口）→ 跳至 */
const page = ref(1);
const pageSize = ref(10);
const jumpPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)));
const pagedRows = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageNumbers = computed(() => {
  const windowSize = Math.min(totalPages.value, 5);
  const start = Math.min(Math.max(page.value - Math.floor(windowSize / 2), 1), totalPages.value - windowSize + 1);
  return Array.from({ length: windowSize }, (_, index) => start + index);
});
function setPage(value: number) { page.value = Math.min(Math.max(value, 1), totalPages.value); jumpPage.value = page.value; }
function goToJumpPage() { setPage(Number(jumpPage.value)); }
function handlePageSizeChange(value: unknown) {
  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0) return;
  pageSize.value = next;
  setPage(1);
}
/** 表头排序 → 数据层重排并回到第 1 页 */
function handleSort(dataIndex: unknown, direction: unknown) {
  if (direction !== 'ascend' && direction !== 'descend') return;
  if (dataIndex !== 'code' && dataIndex !== 'created' && dataIndex !== 'effective') return;
  sortKey.value = dataIndex;
  sortDirection.value = direction;
  setPage(1);
}
const columns = computed<TableColumnData[]>(() => columnKeys.value.map<TableColumnData>(key => ({ title: t(`vehicles.${key}`), dataIndex: key, ...(key === 'code' ? { slotName: 'code' } : {}), ...(key === 'created' ? { sortable: { sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[], defaultSortOrder: 'descend' as const } } : { sortable: { sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[] } }) })).concat([{ title: t('vehicles.operations'), dataIndex: 'operations', slotName: 'operations', width: 160 }]));
function open() { Object.assign(form, { code: '', effective: '', region: '', owner: '', description: '' }); error.value = ''; modal.value = true; }
function save() {
  if (!selectedLeaf.value) return false;
  error.value = validateVehicle(form, production.value === 'production', rows.value, selected.value[0]!, activeDirectory.value?.vinRegex ?? '', users.users.map(user => user.name));
  if (error.value) { void nextTick(() => document.querySelector<HTMLInputElement>('.arco-modal:has(.arco-alert-error) input')?.focus()); return false; }
  rows.value.unshift({ ...form, code: form.code.trim(), id: crypto.randomUUID(), directory: selected.value[0] ?? 'default', production: production.value === 'production', created: new Date().toLocaleString('sv-SE') });
  applied.value = ''; query.value = ''; setPage(1); Message.success(t('vehicles.saved')); return true;
}
function saveDirectory() {
  if (directoryView.value) return true;
  if (editorLocked.value) { directoryError.value = 'projectLocked'; return false; }
  if (!directoryName.value.trim() || directoryName.value.length > 64) { directoryError.value = 'required'; return false; }
  try { if (directoryRegex.value) new RegExp(directoryRegex.value); } catch { directoryError.value = 'regexError'; return false; }
  const path = directoryTarget.value ? directoryPath(tree.value, directoryTarget.value.key) : [];
  const siblings = directoryParent.value?.children ?? path.at(-2)?.children ?? tree.value;
  if (siblings.some(node => node.key !== directoryTarget.value?.key && node.title === directoryName.value.trim())) { directoryError.value = 'duplicateDirectory'; return false; }
  const targetKey = directoryTarget.value?.key;
  const removed = (directoryTarget.value?.partIds ?? []).filter(code => !directoryParts.value.includes(code));
  if (projects.value.some(project => project.status !== 'completed' && project.directories.includes(targetKey ?? '') && removed.some(code => project.usedParts.includes(code)))) { directoryError.value = 'partInUse'; return false; }
  const values = { updated: new Date().toLocaleString('sv-SE'), title: directoryName.value.trim(), vinRegex: directoryRegex.value, partIds: [...directoryParts.value] };
  if (directoryTarget.value) Object.assign(directoryTarget.value, values);
  else if (directoryParent.value) { directoryParent.value.children ??= []; directoryParent.value.children.push({ key: crypto.randomUUID(), created: values.updated, ...values }); }
  else tree.value.push({ key: crypto.randomUUID(), created: values.updated, ...values });
  for (const project of projects.value.filter(project => project.status !== 'completed' && project.directories.includes(targetKey ?? ''))) { project.snapshot = [...new Set(project.directories.flatMap(key => directoryPath(tree.value, key).at(-1)?.partIds ?? []))]; }
  Message.success(t('vehicles.saved'));
  if (editor.value) { editorSnapshot.value = JSON.stringify([directoryName.value, directoryRegex.value, directoryParts.value]); void router.push('/vehicles'); }
  return true;
}
watch(() => route.fullPath, () => {
  if (!editor.value) return;
  const target = route.name === 'vehicle-directory-edit' ? directoryPath(tree.value, String(route.params.id)).at(-1) : undefined;
  directoryTarget.value = target; directoryParent.value = target ? directoryPath(tree.value, target.key).at(-2) : directoryPath(tree.value, String(route.query.parent ?? '')).at(-1);
  directoryName.value = target?.title ?? ''; directoryRegex.value = target?.vinRegex ?? ''; directoryParts.value = [...(target?.partIds ?? [])]; directoryError.value = ''; directoryView.value = false;
  editorSnapshot.value = JSON.stringify([directoryName.value, directoryRegex.value, directoryParts.value]);
}, { immediate: true });
function filterNode(node: TreeNodeData) { return String(node.title ?? '').toLowerCase().includes(directorySearch.value.toLowerCase()); }
</script>
<template>
  <main v-if="editor" class="directory-editor">
    <div class="editor-bar"><span>{{ directoryParent?.title }} / {{ t(directoryTarget ? 'vehicles.editDirectory' : 'vehicles.newLeaf') }}</span><a-space><a-button @click="router.push('/vehicles')">{{ t('vehicles.cancel') }}</a-button><a-button type="primary" :disabled="editorLocked" @click="saveDirectory">{{ t('vehicles.save') }}</a-button></a-space></div>
    <section class="detail-block"><h3>{{ t('vehicles.basicInfo') }}</h3><a-alert v-if="editorLocked">{{ t('vehicles.projectLocked') }}</a-alert><a-alert v-if="directoryError" type="error">{{ t(`vehicles.${directoryError}`) }}</a-alert><a-form :model="{}" layout="vertical"><a-form-item :label="t('vehicles.directoryName')" required><a-input v-model="directoryName" :disabled="editorLocked" :max-length="64" show-word-limit /></a-form-item><a-form-item :label="t('vehicles.vinRegex')"><a-input v-model="directoryRegex" :disabled="editorLocked" /></a-form-item></a-form></section>
    <section class="detail-block"><h3>{{ t('vehicles.parts') }}</h3><a-space><a-input v-model="partQuery" :aria-label="t('vehicles.partSearch')" /><a-button @click="partApplied = partQuery">{{ t('vehicles.search') }}</a-button><a-button @click="partQuery = ''; partApplied = ''">{{ t('vehicles.reset') }}</a-button></a-space><a-table row-key="code" v-model:selected-keys="directoryParts" :row-selection="{ type: 'checkbox', onlyCurrent: false }" :data="availableParts.map(part => ({ ...part, disabled: editorLocked }))" :columns="partColumns.slice(0, 3)" :pagination="{ pageSize: 10 }" /><p>{{ t('vehicles.selectedParts', { count: directoryParts.length }) }}</p><a-space wrap><a-tag v-for="code in directoryParts" :key="code" :closable="!editorLocked" @close="directoryParts = directoryParts.filter(value => value !== code)">{{ partCatalog.find(part => part.code === code)?.name || code }}</a-tag></a-space></section>
    <ConfirmDialog :visible="discardVisible" :title="t('vehicles.discard')" @update:visible="resolveLeave(false)" @confirm="resolveLeave(true)" />
  </main>
  <main v-else class="vehicles-workspace">
    <aside class="directory-panel">
      <div class="directory-toolbar">
        <h2>{{ t('vehicles.directory') }}</h2>
        <a-tooltip :content="t('vehicles.newDirectory')"><a-button class="directory-tool" :aria-label="t('vehicles.newDirectory')" @click="editDirectory()"><template #icon><IconPlus :size="16" /></template></a-button></a-tooltip>
        <a-tooltip :content="t('vehicles.levelsTitle')"><a-button class="directory-tool" :aria-label="t('vehicles.levelsTitle')" @click="openLevels"><template #icon><IconSettings :size="16" /></template></a-button></a-tooltip>
      </div>
      <a-input-search v-model="directorySearch" :placeholder="t('vehicles.searchDirectory')" :aria-label="t('vehicles.searchDirectory')" allow-clear />
      <a-tree block-node v-model:selected-keys="selected" :data="tree" :default-expanded-keys="['brand', 'series', 'model']"  :filter-tree-node="filterNode"><template #extra="node"><a-tooltip v-if="canAddChild(node)" :content="t('vehicles.addChild')"><button type="button" class="directory-more" :aria-label="t('vehicles.addChild')" @click.stop="editDirectory(undefined, node)"><IconPlus :size="16" /></button></a-tooltip><a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow><button type="button" class="directory-more" :aria-label="t('vehicles.directoryActions')" @click.stop><IconMore :size="16" /></button><template #content><a-doption @click="editDirectory(node)">{{ t('vehicles.edit') }}</a-doption><a-doption v-if="!canAddChild(node)" @click="editDirectory(node, undefined, true)">{{ t('vehicles.directoryDetail') }}</a-doption><a-doption class="row-more-danger" @click="requestDelete(node)">{{ t('vehicles.delete') }}</a-doption></template></a-dropdown></template></a-tree>
    </aside>
    <section class="vehicle-content">
      <a-empty v-if="!selectedLeaf" :description="t('vehicles.selectLeaf')" />
      <template v-else>
      <div class="directory-breadcrumb">
        <template v-for="(segment, index) in breadcrumbSegments" :key="index">
          <span class="crumb" :class="{ current: index === breadcrumbSegments.length - 1 }">{{ segment }}</span><span v-if="index < breadcrumbSegments.length - 1" class="crumb-sep">/</span>
        </template>
      </div>
      <a-tabs v-model:active-key="production" @change="resetSearch">
        <a-tab-pane key="production" :title="`${t('vehicles.production')} (${scoped.filter(row => row.production).length})`" />
        <a-tab-pane key="prototype" :title="`${t('vehicles.prototype')} (${scoped.filter(row => !row.production).length})`" />
      </a-tabs>
      <!-- 筛选条（2026-11-09 用户裁决）：字段名在上、控件在下（12px / 4px / 左对齐 / 200px），单元 16px 栅栏分布；
           查询/重置/筛选设置按钮紧跟最后一个筛选组件右侧，保持栅栏左对齐 -->
      <form class="vehicle-toolbar" @submit.prevent="applySearch">
        <div v-if="showCodeFilter" class="vehicle-filter-unit">
          <label class="app-field-label" for="vehicle-code-filter">{{ t('vehicles.code') }}</label>
          <a-input id="vehicle-code-filter" v-model="query" class="app-filter-control" allow-clear @press-enter="applySearch" @clear="applySearch" />
        </div>
        <div v-for="key in visibleDateFilterKeys" :key="key" class="vehicle-filter-unit"><label class="app-field-label">{{ t(`vehicles.${key}`) }}</label><a-range-picker v-model="dates[key]" class="app-filter-control" :aria-label="t(`vehicles.${key}`)" /></div>
        <a-button type="primary" @click="applySearch"><template #icon><IconSearch :size="16" /></template>{{ t('vehicles.search') }}</a-button>
        <a-button class="app-btn-neutral" @click="resetSearch"><template #icon><IconRefresh :size="16" /></template>{{ t('vehicles.reset') }}</a-button>
        <ColumnSettingsPopover v-model:visible="filterSettingsOpen" :items="filterSettingsItems" :default-items="defaultFilterItems" :title="t('vehicles.filterSettings')" :list-aria-label="t('vehicles.filterListAria')" :show-label="t('vehicles.show')" :restore-label="t('vehicles.restore')" @change="onFilterSettingsChanged"><a-tooltip :content="t('vehicles.filterSettings')"><a-button class="app-btn-neutral vehicle-icon-button" html-type="button" :aria-label="t('vehicles.filterSettings')"><IconFilter :size="16" /></a-button></a-tooltip></ColumnSettingsPopover>
      </form>
      <!-- 操作行：主操作「新建车辆」在左；列设置在数据列表右上角（DESIGN.md · Icon-only toolbar controls） -->
      <div class="vehicle-actions">
        <div class="vehicle-actions-main">
          <a-button type="primary" @click="open"><template #icon><IconPlus :size="16" /></template>{{ t('vehicles.create') }}</a-button>
          <VehicleImport v-if="selectedLeaf" :key="selected[0] + production" :directory="selected[0]!" :path="activePath" :production="production === 'production'" :pattern="activeDirectory?.vinRegex ?? ''" :rows="rows" :users="users.users.map(user => user.name)" @imported="rows.unshift(...$event); setPage(1)" />
        </div>
        <ColumnSettingsPopover v-model:visible="columnOpen" :items="columnItems" :default-items="['code', 'created', 'effective'].map(key => ({ key, label: t(`vehicles.${key}`), visible: true, disabled: key === 'code' }))" :title="t('vehicles.columns')" :list-aria-label="t('vehicles.columnListAria')" :show-label="t('vehicles.show')" :restore-label="t('vehicles.restore')" @change="columnKeys = $event.filter(item => item.visible).map(item => item.key)"><a-tooltip :content="t('vehicles.columns')"><a-button class="app-btn-neutral vehicle-icon-button" :aria-label="t('vehicles.columns')" @click="columnOpen = !columnOpen"><template #icon><IconColumns /></template></a-button></a-tooltip></ColumnSettingsPopover>
      </div>
      <!-- 数据列表（DESIGN.md · Table）：白底、无外框、无斑马纹，全列表 weight 400 -->
      <a-table class="vehicle-table" :columns="columns" :data="pagedRows" row-key="id" :bordered="false" :stripe="false" :scroll="{ x: 760 }" :pagination="false" @sorter-change="handleSort"><template #code="{ record }"><span class="cell-code" role="button" tabindex="0" :aria-label="`${t('vehicles.detail')}：${record.code}`" @click="detail = record" @keyup.enter="detail = record">{{ record.code }}</span></template><template #operations="{ record }"><a-space :size="12"><a-link @click="detail = record">{{ t('vehicles.partView') }}</a-link><a-link status="danger" @click="deletingVehicle = record">{{ t('vehicles.deleteAction') }}</a-link></a-space></template><template #empty><a-empty :description="hasAppliedFilters ? t('vehicles.noMatch') : t('vehicles.empty')" /></template></a-table>
      <!-- 分页（DESIGN.md · Pagination）：右对齐「共 N 项 → 每页条数 → 页码 → 跳至」 -->
      <nav v-if="filtered.length" class="vehicle-pagination app-pagination" :aria-label="t('vehicles.pageNavigation')">
        <span class="pagination-total">{{ t('vehicles.total', { count: filtered.length }) }}</span>
        <div class="pagination-pages">
          <a-select class="app-page-size" :model-value="pageSize" :aria-label="t('vehicles.pageSizeAria')" @update:model-value="handlePageSizeChange">
            <a-option v-for="size in [10, 50, 100, 500]" :key="size" :value="size">{{ t('vehicles.perPage', { count: size }) }}</a-option>
          </a-select>
          <button class="pagination-arrow" type="button" :disabled="page === 1" :aria-label="t('vehicles.previous')" @click="setPage(page - 1)"><IconLeft /></button>
          <button v-for="number in pageNumbers" :key="number" class="pagination-number" :class="{ active: page === number }" type="button" :aria-current="page === number ? 'page' : undefined" @click="setPage(number)">{{ number }}</button>
          <button class="pagination-arrow" type="button" :disabled="page === totalPages" :aria-label="t('vehicles.next')" @click="setPage(page + 1)"><IconRight /></button>
        </div>
        <span class="pagination-jump-label">{{ t('vehicles.jumpTo') }}</span>
        <a-input-number v-model="jumpPage" class="app-page-jump" :min="1" :max="totalPages" hide-button @press-enter="goToJumpPage" />
        <span class="pagination-total-pages">{{ t('vehicles.totalPages', { count: totalPages }) }}</span>
      </nav>
      </template>
    </section>
    <a-modal v-model:visible="modal" :title="t('vehicles.create')" :width="560" :ok-text="t('vehicles.confirm')" :cancel-text="t('vehicles.cancel')" :on-before-ok="save">
      <a-form :model="form" layout="vertical"><a-alert v-if="error" type="error">{{ t(`vehicles.${error}`) }}</a-alert><a-form-item v-for="field in vehicleFormFields" :key="field" :label="t(`vehicles.${field}`)" :required="['code', 'effective', 'region'].includes(field)"><a-date-picker v-if="field === 'effective'" v-model="form.effective" :disabled-date="date => !!date && date.toLocaleDateString('sv-SE') < today()" /><a-select v-else-if="field === 'region'" v-model="form.region" :options="countryOptions" allow-search /><a-select v-else-if="field === 'owner'" v-model="form.owner" :options="ownerOptions" allow-search allow-clear /><a-textarea v-else-if="field === 'description'" v-model="form.description" :max-length="500" show-word-limit /><a-input v-else v-model="form[field]" :max-length="production === 'production' ? 17 : 50" /></a-form-item></a-form>
    </a-modal>
    <a-drawer class="um-detail-drawer" placement="right" popup-container="body" :visible="!!detail" :width="'min(800px, 100vw)'" :title="t('vehicles.detail')" :body-style="{ background: 'var(--app-fill-1)', padding: '16px' }" @cancel="detail = undefined">
      <div v-if="detail" class="vehicle-detail">
        <section class="detail-block vehicle-identity"><a-tag :color="detail.production ? 'green' : 'arcoblue'">{{ t(detail.production ? 'vehicles.production' : 'vehicles.prototype') }}</a-tag><p>{{ detail.code }}</p></section>
        <section class="detail-block"><h3>{{ t('vehicles.basicInfo') }}</h3><AppDetailList :fields="basicFields" /></section>
        <section v-if="detail.production" class="detail-block"><h3>{{ t('vehicles.assetInfo') }}</h3><AppDetailList :fields="detailFields(['region', 'owner', 'description'])" /></section>
        <section class="detail-block"><h3>{{ t('vehicles.partDetails') }}</h3><a-table row-key="code" :columns="partColumns" :data="detailParts" :pagination="false" :bordered="false"><template #partActions="{ record }"><a-link :href="partHref(record)" target="_blank" rel="noopener" @click="preparePart(record)" @auxclick="preparePart(record)">{{ t('vehicles.partView') }}</a-link></template></a-table></section>
      </div>
      <template #footer><a-button type="primary" @click="detail = undefined">{{ t('vehicles.close') }}</a-button></template>
    </a-drawer>

    <a-drawer class="um-detail-drawer" placement="right" popup-container="body" v-model:visible="directoryDetailVisible" :width="'min(800px, 100vw)'" :title="t('vehicles.leafDetail')" :body-style="{ background: 'var(--app-fill-1)', padding: '16px' }">
      <div class="vehicle-detail directory-detail">
        <section class="detail-block vehicle-identity"><a-tag color="arcoblue">{{ t('vehicles.leafDirectory') }}</a-tag><p>{{ directoryTarget?.title }}</p></section>
        <section class="detail-block"><h3>{{ t('vehicles.basicInfo') }}</h3><AppDetailList :fields="directoryFacts" /></section>
        <section class="detail-block"><h3>{{ t('vehicles.parts') }}</h3><a-table row-key="code" :columns="partColumns" :data="linkedDirectoryParts" :pagination="false" :bordered="false"><template #partActions="{ record }"><a-link :href="partHref(record)" target="_blank" rel="noopener" @click="preparePart(record)" @auxclick="preparePart(record)">{{ t('vehicles.partView') }}</a-link></template></a-table></section>
      </div>
      <template #footer><a-button type="primary" @click="directoryDetailVisible = false">{{ t('vehicles.close') }}</a-button></template>
    </a-drawer>
    <a-modal v-model:visible="directoryModal" :title="t(directoryView ? 'vehicles.directoryDetail' : directoryTarget ? 'vehicles.editDirectory' : directoryParent ? 'vehicles.addChild' : 'vehicles.newDirectory')" :ok-text="t('vehicles.confirm')" :cancel-text="t('vehicles.cancel')" :on-before-ok="saveDirectory"><a-form :model="{ directoryName }" layout="vertical"><a-alert v-if="directoryError" type="error">{{ t(`vehicles.${directoryError}`) }}</a-alert><a-form-item required><template #label><span class="app-field-label">{{ t('vehicles.directoryName') }}</span></template><span v-if="directoryView">{{ directoryName }}</span><a-input v-else v-model="directoryName" :max-length="64" show-word-limit /></a-form-item><template v-if="leafDirectory"><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.vinRegex') }}</span></template><span v-if="directoryView">{{ directoryRegex || '—' }}</span><a-input v-else v-model="directoryRegex" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.parts') }}</span></template><span v-if="directoryView">{{ directoryParts.join(', ') || '—' }}</span><a-select v-else v-model="directoryParts" multiple allow-search allow-clear :options="partOptions" /></a-form-item></template></a-form></a-modal>
    <a-modal v-model:visible="levelsModal" :title="t('vehicles.levelsTitle')" :width="560" :ok-text="t('vehicles.save')" :cancel-text="t('vehicles.cancel')" :ok-button-props="{ disabled: hierarchyLocked }" :on-before-ok="saveLevels" modal-class="vehicle-levels-dialog">
      <p class="levels-help">{{ t(hierarchyLocked ? 'vehicles.locked' : 'vehicles.levelsHelp') }}</p>
      <a-form :model="{ draftLevels }" layout="vertical"><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.levelCount') }}</span></template><a-select v-model="draftLevels" :disabled="hierarchyLocked" :options="[2, 3, 4, 5, 6].map(value => ({ value, label: t('vehicles.levelOption', { count: value }) }))" /></a-form-item></a-form>
    </a-modal>
    <ConfirmDialog :visible="!!deletingVehicle" :title="t('vehicles.deleteVehicle', { code: deletingVehicle?.code ?? '' })" :description="t('vehicles.deleteVehicleConfirm')" @update:visible="deletingVehicle = undefined" @confirm="removeVehicle" />
    <ConfirmDialog :visible="!!deleting" :title="t('vehicles.delete')" :description="deleteError ? t(`vehicles.${deleteError}`) : deleting?.title" :single="!!deleteError" @update:visible="deleting = undefined" @confirm="deleteError ? deleting = undefined : removeDirectory()" />
  </main>
</template>
<style scoped>
/* 与用户管理内容区域一致：左右两栏贴合成一块白色业务面板，中间仅 1px 竖线分隔，
   不留画布灰缝、不加圆角；栏内边距也按用户管理的左右卡片取值。 */
.directory-editor { display: grid; gap: 12px; }
.editor-bar { display: flex; justify-content: space-between; gap: 16px; background: var(--app-surface); padding: 16px; position: sticky; top: 56px; z-index: 2; }
.directory-editor :deep(.arco-input-wrapper) { max-width: 500px; }
.vehicles-workspace { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 0; align-items: stretch; background: var(--app-surface); min-height: calc(100vh - 104px); }
.directory-panel, .vehicle-content { background: var(--app-surface); min-width: 0; border-radius: 0; }
.directory-panel { padding: 16px; border-right: 1px solid var(--color-border-2); }
.vehicle-content { padding: 18px 16px 16px; }
.directory-toolbar { display: flex; align-items: center; gap: 0px; margin-bottom: 12px; flex-wrap: wrap; }
.directory-tool { width: 32px; height: 32px; padding: 0; background: var(--app-surface); color: var(--color-text-3); }
h2 { font-size: 16px; line-height: 24px; margin: 0 auto 0 0; font-weight: 600; }
/* 层级面包屑（DESIGN.md · Breadcrumb）：祖先 14px/400、当前项 14px/600 非链接；与下方 tabs 12px 块间距（DESIGN.md 400） */
.directory-breadcrumb { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; font-size: 14px; line-height: 22px; }
.directory-breadcrumb .crumb { color: var(--color-text-2); font-weight: 400; }
.directory-breadcrumb .crumb.current { color: var(--color-text-1); font-weight: 600; }
.directory-breadcrumb .crumb-sep { color: var(--color-text-3); }
.directory-panel :deep(.arco-tree) { margin-top: 16px; max-height: calc(100dvh - 240px); overflow: auto; }
.directory-panel :deep(.arco-tree-node-title-text) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.directory-panel :deep(.arco-tree-node-extra) { margin-left: auto; display: flex; align-items: center; }
.directory-panel :deep(.arco-tree-node:hover) { background: var(--color-fill-2); border-radius: 2px; }
.directory-panel :deep(.arco-tree-node-title), .directory-panel :deep(.arco-tree-node-title:hover) { padding-right: 0; background: transparent; }
.directory-panel :deep(.arco-tree-node-selected), .directory-panel :deep(.arco-tree-node-selected:hover) { background: var(--color-primary-light-1); color: var(--app-accent); }
.directory-panel :deep(.arco-tree-node-selected .arco-tree-node-switcher), .directory-panel :deep(.arco-tree-node-selected .arco-tree-node-switcher-icon), .directory-panel :deep(.arco-tree-node-switcher:hover) { color: var(--app-accent); }
.directory-panel :deep(.arco-tree-node-icon-hover::before) { display: none; }
.directory-more { width: 24px; height: 24px; margin-right: 6px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--color-text-2); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; opacity: 0; }
.directory-panel :deep(.arco-tree-node:hover .directory-more), .directory-panel :deep(.arco-tree-node:focus-within .directory-more) { opacity: 1; }
.directory-more:hover, .directory-more:focus-visible { background: var(--color-fill-3); opacity: 1; }
.directory-more :deep(svg) { transform: rotate(90deg); }
.vehicle-detail { display: grid; gap: var(--mt-ds-space-4); }
.vehicle-detail { min-width: 0; }
.vehicle-detail :deep(.arco-table table) { width: 100%; table-layout: fixed; }
.vehicle-detail :deep(.arco-table-td), .vehicle-detail :deep(.arco-table-th), .vehicle-detail :deep(.arco-table-cell) { white-space: normal; overflow-wrap: anywhere; }
.detail-block { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-radius-panel, 2px); }
.vehicle-identity p { margin: 12px 0 0; font-size: 18px; line-height: 26px; overflow-wrap: anywhere; }
.detail-block h3 { padding-bottom: 8px; margin: 0 0 12px; font-size:16px; line-height: 24px; font-weight: 600; color: var(--color-text-1); }
/* 表格（DESIGN.md · Table）：白底、无外框、无斑马纹；表头语义填充 --app-table-header（#F6F7F9），
   全列表 weight 400（2026-11-07 用户裁决），单元格 8px 10px 内边距、单行省略 */
.vehicle-content :deep(.arco-table-border), .vehicle-content :deep(.arco-table-container) { border: 0; }
.vehicle-content :deep(.arco-table-th), .vehicle-content :deep(.arco-table-th-title), .vehicle-content :deep(.arco-table-td), .vehicle-content :deep(.arco-link) { font-weight: 400; }
/* 详情抽屉内 detail-block 表格（popup-container=body 脱离 .vehicle-content 树）同样遵循
   DESIGN.md · Data-list text weight：.vehicle-detail 本身携带 scope id，仍是表格祖先，可直接命中 */
.vehicle-detail :deep(.arco-table-th), .vehicle-detail :deep(.arco-table-th-title), .vehicle-detail :deep(.arco-table-td) { font-weight: 400; }
.vehicle-content :deep(.arco-table-th) { background: var(--app-table-header); padding: 8px 10px; white-space: nowrap; }
.vehicle-content :deep(.arco-table-td) { padding: 8px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vehicle-content :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
/* 排序列仅以表头箭头示意当前排序方向，数据单元格不再整列填充灰色（DESIGN.md · Table 白底、无斑马纹） */
.vehicle-content :deep(.arco-table-td.arco-table-col-sorted) { background: transparent; }
/* 首列（车型代号）：默认纯文本，hover/聚焦变主色，点击进入详情（DESIGN.md · 1016 车型列表细化） */
.vehicle-content :deep(.cell-code) { cursor: pointer; color: var(--color-text-1); transition: color .15s; }
.vehicle-content :deep(.arco-table-tr:hover .cell-code) { color: var(--app-accent); }
.vehicle-content :deep(.cell-code:focus-visible) { outline: 2px solid var(--app-accent); outline-offset: 2px; border-radius: 2px; }
/* 筛选条（2026-11-09 用户裁决）：字段名 12px 带冒号、左对齐，控件在字段下方、间距 4px；
   单元与按钮组按 16px 栅栏分布，按钮组紧跟最后一个组件右侧且左对齐。
   控件宽度走 :deep()，Arco 选择器/输入根节点不携带本文件 scope id */
.vehicle-toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 14px; }
.vehicle-filter-unit { display: grid; grid-template-columns: minmax(0, 200px); align-items: start; justify-items: start; gap: 4px; min-width: 0; }
.vehicle-filter-unit .app-field-label { font-size: 12px; font-weight: 400; line-height: 20px; text-align: left; padding: 0; white-space: nowrap; }
.vehicle-filter-unit :deep(.app-filter-control) { width: 200px; max-width: 100%; }
.vehicle-toolbar > :deep(.arco-btn) { flex: 0 0 auto; }
/* 列设置：32×32 图标触发器，白色非强调表面（DESIGN.md · Icon-only toolbar controls） */
.vehicle-icon-button { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }
/* 操作行：主操作组在左，列设置固定在数据列表右上角 */
.vehicle-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; margin-bottom: 14px; }
.vehicle-actions-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
/* 分页（DESIGN.md · Pagination）：右对齐，控件几何走 global.css 的 .app-pagination 共享规则 */
.vehicle-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; color: var(--color-text-2); }
.vehicle-pagination .pagination-total { margin-right: 8px; color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.vehicle-pagination .pagination-pages { display: flex; align-items: center; gap: 8px; margin-right: 8px; }
.vehicle-pagination .pagination-jump-label, .vehicle-pagination .pagination-total-pages { color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.levels-help { color: var(--color-text-3); margin: 0 0 32px; line-height: 22px; }
@media (max-width: 900px) { .vehicles-workspace { grid-template-columns: 220px minmax(0, 1fr); } }
@media (max-width: 600px) { .vehicles-workspace { grid-template-columns: minmax(0, 1fr); } .directory-panel { border-right: 0; border-bottom: 1px solid var(--color-border-2); } }
</style>

<style scoped>
/* 窄屏：每个筛选单元独占一行、控件占满宽度；桌面与窄屏均为「字段名在上、控件在下」 */
@media (max-width: 760px) {
  .vehicle-toolbar { align-items: stretch; }
  .vehicle-filter-unit { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .vehicle-filter-unit :deep(.app-filter-control), .vehicle-filter-unit :deep(.arco-input-wrapper), .vehicle-filter-unit :deep(.arco-select), .vehicle-filter-unit :deep(.arco-picker) { width: 100%; max-width: 100%; flex: none; }
}
</style>
