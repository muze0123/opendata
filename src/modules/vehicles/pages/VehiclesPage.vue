<script setup lang="ts">
import AppDetailList from '../../../design/components/AppDetailList.vue';
import AppFieldLabel from '../../../design/components/AppFieldLabel.vue';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TableColumnData, TreeNodeData } from '@arco-design/web-vue';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconMore, IconSettings } from '@arco-design/web-vue/es/icon';
import { directories, vehicles, vehicleParts, type VehiclePart, type Vehicle, type Directory } from '../data/vehicles';
const { t } = useI18n();
const tree = ref<Directory[]>(structuredClone(directories));
const rows = ref<Vehicle[]>(structuredClone(vehicles));
const selected = ref(['default']);
const production = ref('production');
const directorySearch = ref('');
const query = ref('');
const applied = ref('');
const modal = ref(false);
const detail = ref<Vehicle>();
const directoryModal = ref(false);
const levelsModal = ref(false);
const hierarchyLevels = ref(4);
const draftLevels = ref(4);
function openLevels() { draftLevels.value = hierarchyLevels.value; levelsModal.value = true; }
function saveLevels() { hierarchyLevels.value = draftLevels.value; Message.success(t('vehicles.saved')); return true; }
const directoryName = ref('');
const directoryTarget = ref<Directory>();
const directoryParent = ref<Directory>();
const directoryParts = ref<string[]>([]);
const directoryRegex = ref('');
const directoryError = ref('');
const directoryView = ref(false);
function editDirectory(node?: Directory, parent?: Directory, view = false) {
  directoryTarget.value = node; directoryParent.value = parent; directoryView.value = view;
  directoryName.value = node?.title ?? ''; directoryRegex.value = node?.vinRegex ?? ''; directoryParts.value = [...(node?.partIds ?? [])]; directoryError.value = ''; directoryModal.value = true;
}
function depth(nodes: Directory[], key: string, level = 1): number {
  for (const node of nodes) { if (node.key === key) return level; const found = depth(node.children ?? [], key, level + 1); if (found) return found; } return 0;
}
const canAddChild = (node: Directory) => depth(tree.value, node.key) < hierarchyLevels.value;
const leafDirectory = computed(() => directoryTarget.value ? depth(tree.value, directoryTarget.value.key) === hierarchyLevels.value : directoryParent.value ? depth(tree.value, directoryParent.value.key) + 1 === hierarchyLevels.value : hierarchyLevels.value === 1);
const partOptions = [{ value: 'PN-GW-B02', label: 'PN-GW-B02 · 网关 GW' }, { value: 'PN-TBOX-C03', label: 'PN-TBOX-C03 · TBOX' }, { value: 'PN-IVI-D04', label: 'PN-IVI-D04 · 车机 IVI' }];
const partDetail = ref<VehiclePart>();
function directoryPath(nodes: Directory[], key: string): Directory[] {
  for (const node of nodes) {
    if (node.key === key) return [node];
    const path = directoryPath(node.children ?? [], key);
    if (path.length) return [node, ...path];
  }
  return [];
}
const detailPath = computed(() => directoryPath(tree.value, detail.value?.directory ?? ''));
const detailParts = computed(() => vehicleParts.filter(part => detailPath.value.at(-1)?.partIds?.includes(part.code)));
const partColumns = computed<TableColumnData[]>(() => [
  { title: t('vehicles.partCode'), dataIndex: 'code' },
  { title: t('vehicles.partName'), dataIndex: 'name' },
  { title: t('vehicles.supplier'), dataIndex: 'supplier' },
  { title: t('vehicles.operations'), slotName: 'partActions', width: 80 },
]);
const basicFields = computed(() => [
  { key: 'code', label: t('vehicles.code'), value: detail.value?.code ?? '—' },
  { key: 'directory', label: t('vehicles.directory'), value: detailPath.value.map(node => node.title).join(' / ') || '—' },
  ...detailFields(['effective', 'created']),
]);
const detailFields = (keys: (keyof Vehicle)[]) => keys.map(key => ({ key, label: t(`vehicles.${key}`), value: String(detail.value?.[key] || '—') }));
const error = ref('');
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
const scoped = computed(() => rows.value.filter(row => scope.value.includes(row.directory)));
const filtered = computed(() => scoped.value.filter(row => row.production === (production.value === 'production') && row.code.toLowerCase().includes(applied.value.toLowerCase())));
const columns = computed<TableColumnData[]>(() => ['code', 'created', 'effective'].map<TableColumnData>(key => ({ title: t(`vehicles.${key}`), dataIndex: key, sortable: { sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[] } })).concat([{ title: t('vehicles.operations'), dataIndex: 'operations', slotName: 'operations', sortable: { sortDirections: [] } }]));
function open() { Object.assign(form, { code: '', effective: '', region: '', owner: '', description: '' }); error.value = ''; modal.value = true; }
function save() {
  if (!form.code.trim() || !form.effective || !form.region.trim()) { error.value = 'required'; return false; }
  if (rows.value.some(row => row.code === form.code.trim())) { error.value = 'duplicate'; return false; }
  if (production.value === 'production' && !/^[A-HJ-NPR-Z0-9]{17}$/.test(form.code.trim())) { error.value = 'vinError'; return false; }
  rows.value.unshift({ ...form, code: form.code.trim(), id: crypto.randomUUID(), directory: selected.value[0] ?? 'default', production: production.value === 'production', created: new Date().toLocaleString('sv-SE') });
  applied.value = ''; query.value = ''; Message.success(t('vehicles.saved')); return true;
}
function saveDirectory() {
  if (directoryView.value) return true;
  if (!directoryName.value.trim()) { directoryError.value = 'required'; return false; }
  try { if (directoryRegex.value) new RegExp(directoryRegex.value); } catch { directoryError.value = 'regexError'; return false; }
  const siblings = directoryParent.value?.children ?? tree.value;
  if (siblings.some(node => node.key !== directoryTarget.value?.key && node.title === directoryName.value.trim())) { directoryError.value = 'duplicateDirectory'; return false; }
  const values = { title: directoryName.value.trim(), vinRegex: directoryRegex.value, partIds: [...directoryParts.value] };
  if (directoryTarget.value) Object.assign(directoryTarget.value, values);
  else if (directoryParent.value) { directoryParent.value.children ??= []; directoryParent.value.children.push({ key: crypto.randomUUID(), ...values }); }
  else tree.value.push({ key: crypto.randomUUID(), ...values });
  return true;
}
function filterNode(node: TreeNodeData) { return String(node.title ?? '').toLowerCase().includes(directorySearch.value.toLowerCase()); }
</script>
<template>
  <main class="vehicles-workspace">
    <aside class="directory-panel">
      <div class="directory-toolbar">
        <h2>{{ t('vehicles.directory') }}</h2>
        <a-tooltip :content="t('vehicles.newDirectory')"><a-button class="directory-tool" :aria-label="t('vehicles.newDirectory')" @click="editDirectory()"><template #icon><IconPlus :size="16" /></template></a-button></a-tooltip>
        <a-tooltip :content="t('vehicles.levelsTitle')"><a-button class="directory-tool" :aria-label="t('vehicles.levelsTitle')" @click="openLevels"><template #icon><IconSettings :size="16" /></template></a-button></a-tooltip>
      </div>
      <a-input-search v-model="directorySearch" :placeholder="t('vehicles.searchDirectory')" :aria-label="t('vehicles.searchDirectory')" allow-clear />
      <a-tree block-node v-model:selected-keys="selected" :data="tree" :default-expanded-keys="['brand', 'series', 'model']"  :filter-tree-node="filterNode"><template #extra="node"><a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow><button type="button" class="directory-more" :aria-label="t('vehicles.directoryActions')" @click.stop><IconMore :size="16" /></button><template #content><a-doption v-if="canAddChild(node)" @click="editDirectory(undefined, node)">{{ t('vehicles.addChild') }}</a-doption><a-doption @click="editDirectory(node)">{{ t('vehicles.edit') }}</a-doption><a-doption @click="editDirectory(node, undefined, true)">{{ t('vehicles.detail') }}</a-doption></template></a-dropdown></template></a-tree>
    </aside>
    <section class="vehicle-content">
      <a-tabs v-model:active-key="production" @change="query = ''; applied = ''">
        <a-tab-pane key="production" :title="`${t('vehicles.production')} (${scoped.filter(row => row.production).length})`" />
        <a-tab-pane key="prototype" :title="`${t('vehicles.prototype')} (${scoped.filter(row => !row.production).length})`" />
      </a-tabs>
      <a-form :model="{ query }" layout="inline" @submit-success="applied = query"><a-form-item><template #label><AppFieldLabel :text="t('vehicles.code')" context="filter" /></template><a-input v-model="query" allow-clear /></a-form-item><a-space><a-button type="primary" html-type="submit">{{ t('vehicles.search') }}</a-button><a-button @click="query = ''; applied = ''">{{ t('vehicles.reset') }}</a-button></a-space></a-form>
      <div class="actions"><a-button type="primary" @click="open"><template #icon><IconPlus /></template>{{ t('vehicles.create') }}</a-button></div>
      <a-table :columns="columns" :data="filtered" row-key="id" :scroll="{ x: 760 }" :pagination="{ pageSize: 5, showTotal: true, showPageSize: true, showJumper: true }"><template #operations="{ record }"><a-link @click="detail = record">{{ t('vehicles.detail') }}</a-link></template><template #empty><a-empty :description="t('vehicles.empty')" /></template></a-table>
    </section>
    <a-modal v-model:visible="modal" :title="t('vehicles.create')" :width="560" :ok-text="t('vehicles.confirm')" :cancel-text="t('vehicles.cancel')" :on-before-ok="save">
      <a-form :model="form" layout="vertical"><a-alert v-if="error" type="error">{{ t(`vehicles.${error}`) }}</a-alert><a-form-item v-for="field in ['code', 'effective', 'region', 'owner', 'description'] as const" :key="field" :label="t(`vehicles.${field}`)" :required="['code', 'effective', 'region'].includes(field)"><a-date-picker v-if="field === 'effective'" v-model="form.effective" /><a-textarea v-else-if="field === 'description'" v-model="form.description" :max-length="500" show-word-limit /><a-input v-else v-model="form[field]" :max-length="64" /></a-form-item></a-form>
    </a-modal>
    <a-drawer :visible="!!detail" :width="'min(800px, 100vw)'" :title="t('vehicles.detail')" :body-style="{ background: 'var(--app-fill-1)', padding: '16px' }" @cancel="detail = undefined">
      <div v-if="detail" class="vehicle-detail">
        <section class="detail-block vehicle-identity"><a-tag :color="detail.production ? 'green' : 'arcoblue'">{{ t(detail.production ? 'vehicles.production' : 'vehicles.prototype') }}</a-tag><p>{{ detail.code }}</p></section>
        <section class="detail-block"><h3>{{ t('vehicles.basicInfo') }}</h3><AppDetailList :fields="basicFields" /></section>
        <section class="detail-block"><h3>{{ t('vehicles.assetInfo') }}</h3><AppDetailList :fields="detailFields(['region', 'owner', 'description'])" /></section>
        <section class="detail-block"><h3>{{ t('vehicles.partDetails') }}</h3><a-table row-key="code" :columns="partColumns" :data="detailParts" :pagination="false" :bordered="false" :scroll="{ x: 550 }"><template #partActions="{ record }"><a-link @click="partDetail = record">{{ t('vehicles.partView') }}</a-link></template></a-table></section>
      </div>
      <template #footer><a-button type="primary" @click="detail = undefined">{{ t('vehicles.close') }}</a-button></template>
    </a-drawer>
    <a-drawer :visible="!!partDetail" :width="'min(500px, 100vw)'" :title="t('vehicles.partDetails')" :footer="false" @cancel="partDetail = undefined"><AppDetailList v-if="partDetail" :fields="[{ key: 'code', label: t('vehicles.partCode'), value: partDetail.code }, { key: 'name', label: t('vehicles.partName'), value: partDetail.name }, { key: 'supplier', label: t('vehicles.supplier'), value: partDetail.supplier }]" /></a-drawer>
    <a-modal v-model:visible="directoryModal" :title="t(directoryView ? 'vehicles.directoryDetail' : directoryTarget ? 'vehicles.editDirectory' : 'vehicles.newDirectory')" :ok-text="t('vehicles.confirm')" :cancel-text="t('vehicles.cancel')" :on-before-ok="saveDirectory"><a-form :model="{ directoryName }" layout="vertical"><a-alert v-if="directoryError" type="error">{{ t(`vehicles.${directoryError}`) }}</a-alert><a-form-item required><template #label><span class="app-field-label">{{ t('vehicles.directoryName') }}</span></template><span v-if="directoryView">{{ directoryName }}</span><a-input v-else v-model="directoryName" :max-length="64" show-word-limit /></a-form-item><template v-if="leafDirectory"><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.vinRegex') }}</span></template><span v-if="directoryView">{{ directoryRegex || '—' }}</span><a-input v-else v-model="directoryRegex" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.parts') }}</span></template><span v-if="directoryView">{{ directoryParts.join(', ') || '—' }}</span><a-select v-else v-model="directoryParts" multiple allow-search allow-clear :options="partOptions" /></a-form-item></template></a-form></a-modal>
    <a-modal v-model:visible="levelsModal" :title="t('vehicles.levelsTitle')" :width="560" :ok-text="t('vehicles.save')" :cancel-text="t('vehicles.cancel')" :on-before-ok="saveLevels" modal-class="vehicle-levels-dialog">
      <p class="levels-help">{{ t('vehicles.levelsHelp') }}</p>
      <a-form :model="{ draftLevels }" layout="vertical"><a-form-item><template #label><span class="app-field-label">{{ t('vehicles.levelCount') }}</span></template><a-select v-model="draftLevels" :options="[1, 2, 3, 4].map(value => ({ value, label: t('vehicles.levelOption', { count: value }) }))" /></a-form-item></a-form>
    </a-modal>
  </main>
</template>
<style scoped>
.vehicles-workspace { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 16px; background: var(--app-fill-1); min-height: calc(100dvh - 88px); }
.directory-panel, .vehicle-content { background: var(--app-surface); padding: 16px; border-radius: 2px; min-width: 0; }
.directory-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.directory-tool { width: 32px; height: 32px; padding: 0; background: var(--app-surface); color: var(--color-text-3); }
h2 { font-size: 16px; line-height: 24px; margin: 0 auto 0 0; font-weight: 600; }
.directory-panel { border-right: 0; }
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
.detail-block { padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-radius-panel, 2px); }
.vehicle-identity p { margin: 12px 0 0; font-size: 18px; line-height: 26px; overflow-wrap: anywhere; }
.detail-block h3 { padding-bottom: 8px; border-bottom: 1px solid var(--color-border-2); margin: 0 0 12px; font-size: 16px; line-height: 24px; font-weight: 600; color: var(--color-text-1); }
.vehicle-content :deep(.arco-table-th), .vehicle-content :deep(.arco-table-td), .vehicle-content :deep(.arco-link) { font-weight: 400; }
.vehicle-content :deep(.arco-table-th) { background: var(--app-surface); }
.vehicle-content :deep(.arco-table-border) { border: 0; }
.levels-help { color: var(--color-text-3); margin: 0 0 32px; line-height: 22px; }
.actions { margin: 16px 0 12px; }
@media (max-width: 900px) { .vehicles-workspace { grid-template-columns: 220px minmax(0, 1fr); } }
@media (max-width: 600px) { .vehicles-workspace { grid-template-columns: minmax(0, 1fr); } }
</style>
