<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconMore, IconPlus, IconSettings, IconSearch, IconRefresh, IconLeft, IconRight } from '@arco-design/web-vue/es/icon';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import { freezeEdgeColumns } from '../../../shared/tableColumns';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { roles } from '../../user-management/data/users';
import { enabledApps, useRoleStore } from '../data/roles';
import { actionLabel, moduleLabel } from '../labels';
const { t } = useI18n();
const route = useRoute(); const router = useRouter(); const store = useRoleStore();
const base = '/settings/roles';
const isList = computed(() => route.path === base);
const readOnly = computed(() => route.name === 'role-detail');
const editing = computed(() => route.name === 'role-edit');
const current = computed(() => roles.find(role => role.id === route.params.id));
const missing = computed(() => !isList.value && route.name !== 'role-new' && !current.value);
const form = reactive({ name: '', description: '', permissions: [] as string[] });
const baseline = ref(''); const submitted = ref(false); const saving = ref(false); const app = ref('tianshu');
const dirty = computed(() => !isList.value && !readOnly.value && JSON.stringify(form) !== baseline.value);
watch(() => route.fullPath, () => {
  const config = store.configs.find(item => item.id === current.value?.id);
  Object.assign(form, { name: current.value?.name ?? '', description: config?.description ?? '', permissions: [...(config?.permissions ?? [])] });
  baseline.value = JSON.stringify(form); submitted.value = false; app.value = 'tianshu';
}, { immediate: true });
const discard = ref(false); let pendingExit: ((value: boolean) => void) | undefined;
function guard() { if (!dirty.value) return true; discard.value = true; return new Promise<boolean>(resolve => { pendingExit = resolve; }); }
onBeforeRouteLeave(guard); onBeforeRouteUpdate(guard);
function settleExit(value: boolean) { discard.value = false; pendingExit?.(value); pendingExit = undefined; }
function unload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
window.addEventListener('beforeunload', unload); onBeforeUnmount(() => window.removeEventListener('beforeunload', unload));
const nameInput = ref<{ focus: () => void }>();
const permissionRegion = ref<HTMLElement>();
const nameError = computed(() => !form.name.trim() ? t('roleManagement.required') : Array.from(form.name.trim()).length > 20 ? t('roleManagement.nameLimit') : !editing.value && roles.some(role => role.name.toLocaleLowerCase() === form.name.trim().toLocaleLowerCase()) ? t('roleManagement.unique') : '');
async function save() {
  submitted.value = true;
  if (nameError.value) { nameInput.value?.focus(); return; }
  if (!form.permissions.length) { permissionRegion.value?.focus(); return; }
  if (Array.from(form.description).length > 500 || saving.value) return;
  saving.value = true;
  try { store.save(editing.value ? current.value?.id : undefined, form.name, form.description, form.permissions); baseline.value = JSON.stringify(form); Message.success(t('roleManagement.saved')); await router.push({ path: base, query: route.query }); }
  catch { Message.error(t('roleManagement.failed')); }
  finally { saving.value = false; }
}
const filters = reactive({ name: String(route.query.name ?? ''), description: String(route.query.description ?? '') });
const page = computed({ get: () => Math.max(1, Number(route.query.page) || 1), set: value => { void router.replace({ query: { ...route.query, page: value } }); } });
const pageSize = computed({ get: () => [10,50,100,500].includes(Number(route.query.size)) ? Number(route.query.size) : 10, set: value => { void router.replace({ query: { ...route.query, size: value, page: 1 } }); } });
function search(reset = false) { if (reset) Object.assign(filters, { name: '', description: '' }); void router.replace({ query: { ...route.query, ...filters, page: 1 } }); }
const records = computed(() => roles.map(role => ({ ...role, description: store.configs.find(item => item.id === role.id)?.description ?? '' })).filter(role => role.name.toLocaleLowerCase().includes(String(route.query.name ?? '').toLocaleLowerCase()) && role.description.toLocaleLowerCase().includes(String(route.query.description ?? '').toLocaleLowerCase())));
const totalPages = computed(() => Math.max(1, Math.ceil(records.value.length / pageSize.value)));
const pageNumbers = computed(() => { const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4)); return Array.from({ length: Math.min(5, totalPages.value) }, (_, i) => start + i); });
function setPage(value: number | undefined) { if (value) page.value = Math.max(1, Math.min(totalPages.value, Math.floor(value))); }
watch(() => [route.query.name, route.query.description], () => Object.assign(filters, { name: String(route.query.name ?? ''), description: String(route.query.description ?? '') }));
const visibleRecords = computed(() => records.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const settings = ref(false);
const defaultColumns = [{ key: 'name', visible: true, disabled: true }, { key: 'description', visible: true }];
const columnState = ref(defaultColumns.map(item => ({ ...item })));
const defaultColumnItems = computed(() => defaultColumns.map(item => ({ ...item, label: t(`roleManagement.${item.key}`) })));
const columnItems = computed(() => columnState.value.map(item => ({ ...item, label: t(`roleManagement.${item.key}`) })));
const columns = computed(() => freezeEdgeColumns(columnItems.value.filter(item => item.visible).map(item => ({ title: item.label, dataIndex: item.key, slotName: item.key, width: item.key === 'name' ? 240 : item.key === 'operations' ? 230 : undefined, ellipsis: true, tooltip: true })).concat([{ title: t('roleManagement.operations'), dataIndex: 'operations', slotName: 'operations', width: 230, ellipsis: false, tooltip: false }])));
function updateColumns(items: ColumnSettingsItem[]) { columnState.value = items; }
function open(mode: 'new'|'edit'|'detail', id?: string) { void router.push({ path: mode === 'new' ? `${base}/new` : `${base}/${id}/${mode}`, query: route.query }); }
const target = ref<string>();
function requestDelete(id: string) { if (id === 'r0') return; if (store.linked(id)) { Message.warning(t('roleManagement.linked')); return; } target.value = id; }
function remove() { if (!target.value) return; if (store.remove(target.value)) { Message.success(t('roleManagement.deleted')); if (page.value > 1 && visibleRecords.value.length === 0) page.value--; } else Message.warning(t('roleManagement.linked')); target.value = undefined; }
function ids(appId: string, rowId: string, actions: readonly string[]) { return actions.map(action => `${appId}.${rowId}.${action}`); }
function checked(keys: string[]) { return keys.every(key => form.permissions.includes(key)); }
function partial(keys: string[]) { return !checked(keys) && keys.some(key => form.permissions.includes(key)); }
function toggle(keys: string[], value: unknown) { if (readOnly.value) return; const selected = new Set(form.permissions); keys.forEach(key => value === true ? selected.add(key) : selected.delete(key)); form.permissions = [...selected]; }
const title = computed(() => readOnly.value ? t('roleManagement.detail') : editing.value ? t('roleManagement.editTitle') : t('roleManagement.new'));
</script>

<template>
  <div class="roles-page" :class="{ 'is-detail': !isList }">
    <template v-if="isList">
      <form class="role-filters" @submit.prevent="search()">
        <label class="filter-field"><span class="app-field-label">{{ t('roleManagement.name') }}</span><a-input class="app-filter-control" v-model="filters.name" :placeholder="t('roleManagement.placeholder')" allow-clear /></label>
        <label class="filter-field"><span class="app-field-label">{{ t('roleManagement.description') }}</span><a-input class="app-filter-control" v-model="filters.description" :placeholder="t('roleManagement.placeholder')" allow-clear /></label>
        <a-button type="primary" html-type="submit"><template #icon><IconSearch /></template>{{ t('roleManagement.search') }}</a-button><a-button class="app-btn-neutral" @click="search(true)"><template #icon><IconRefresh /></template>{{ t('roleManagement.reset') }}</a-button>
        <div class="list-settings">
          <ColumnSettingsPopover v-model:visible="settings" :items="columnItems" :default-items="defaultColumnItems" :title="t('roleManagement.columns')" :list-aria-label="t('roleManagement.columns')" :show-label="t('roleManagement.show')" :restore-label="t('roleManagement.restore')" @change="updateColumns"><a-tooltip :content="t('roleManagement.columns')"><a-button class="app-btn-neutral role-icon-button" :aria-label="t('roleManagement.columns')"><IconSettings /></a-button></a-tooltip></ColumnSettingsPopover>

        </div>
      </form>
      <section class="role-panel">
        <div class="role-toolbar"><a-button type="primary" @click="open('new')"><template #icon><IconPlus /></template>{{ t('roleManagement.new') }}</a-button></div>
        <a-table row-key="id" :data="visibleRecords" :columns="columns" :pagination="false" size="large" :bordered="false" :scroll="{ x: 760 }">
          <template #operations="{ record }"><div class="row-actions"><a-link @click="open('detail', record.id)">{{ t('roleManagement.detail') }}</a-link><template v-if="record.id !== 'r0'"><a-link @click="open('edit', record.id)">{{ t('roleManagement.edit') }}</a-link><a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow><button type="button" class="role-row-more" :aria-label="t('roleManagement.more')" :title="t('roleManagement.more')"><IconMore :size="16" /></button><template #content><a-doption class="row-more-danger" @click="requestDelete(record.id)">{{ t('roleManagement.delete') }}</a-doption></template></a-dropdown></template></div></template>
          <template #empty><a-empty :description="t('roleManagement.empty')" /></template>
        </a-table>
        <nav class="role-pagination app-pagination" :aria-label="t('audit.table.navigation')">
          <span class="pagination-total">{{ t('audit.pagination.total', { count: records.length }) }}</span>
          <div class="pagination-pages"><a-select v-model="pageSize" class="app-page-size" :aria-label="t('audit.table.pageSize')"><a-option v-for="size in [10,50,100,500]" :key="size" :value="size">{{ t('audit.pagination.perPage', { count: size }) }}</a-option></a-select>
          <button class="pagination-arrow" :disabled="page === 1" :aria-label="t('audit.pagination.previous')" @click="setPage(page - 1)"><IconLeft /></button><button v-for="number in pageNumbers" :key="number" class="pagination-number" :class="{ active: number === page }" :aria-current="number === page ? 'page' : undefined" @click="setPage(number)">{{ number }}</button><button class="pagination-arrow" :disabled="page >= totalPages" :aria-label="t('audit.pagination.next')" @click="setPage(page + 1)"><IconRight /></button></div>
          <span>{{ t('audit.pagination.jumpTo') }}</span><a-input-number class="app-page-jump" :model-value="page" :min="1" :max="totalPages" :hide-button="true" :aria-label="t('audit.pagination.jumpTo')" @change="setPage" /><span>{{ t('audit.pagination.totalPages', { count: totalPages }) }}</span>
        </nav>
      </section>
    </template>
    <template v-else>
      <header class="role-header"><a-breadcrumb><a-breadcrumb-item><router-link :to="{ path: base, query: route.query }">{{ t('roleManagement.title') }}</router-link></a-breadcrumb-item><a-breadcrumb-item>{{ title }}</a-breadcrumb-item></a-breadcrumb><a-space><a-button @click="router.push({ path: base, query: route.query })">{{ readOnly || missing ? t('roleManagement.back') : t('roleManagement.cancel') }}</a-button><a-button v-if="!readOnly && !missing && current?.id !== 'r0'" type="primary" :loading="saving" @click="save">{{ t('roleManagement.confirm') }}</a-button></a-space></header>
      <a-result v-if="missing || (editing && current?.id === 'r0')" status="404" :title="t('roleManagement.unavailable')" />
      <template v-else>
        <section class="role-panel"><h2>{{ t('roleManagement.basic') }}</h2>
          <a-descriptions v-if="readOnly" :column="1" :colon="false" class="role-details"><a-descriptions-item><template #label><span class="app-detail-label">{{ t('roleManagement.name') }}</span></template>{{ form.name }}</a-descriptions-item><a-descriptions-item><template #label><span class="app-detail-label">{{ t('roleManagement.description') }}</span></template>{{ form.description || '—' }}</a-descriptions-item></a-descriptions>
          <a-form v-else :model="form" layout="vertical" class="role-form">
            <a-form-item field="name" :validate-status="submitted && nameError ? 'error' : undefined" :help="submitted ? nameError : ''"><template #label><span class="app-field-label"><span v-if="!editing" class="required">*</span>{{ t('roleManagement.name') }}</span></template><span v-if="editing">{{ form.name }}</span><a-input v-else ref="nameInput" v-model="form.name" :max-length="20" show-word-limit :placeholder="t('roleManagement.placeholder')" /></a-form-item>
            <a-form-item field="description"><template #label><span class="app-field-label">{{ t('roleManagement.description') }}</span></template><a-textarea v-model="form.description" :max-length="500" show-word-limit :placeholder="t('roleManagement.placeholder')" /></a-form-item>
          </a-form>
        </section>
        <section ref="permissionRegion" tabindex="-1" class="role-panel"><h2>{{ t('roleManagement.permissions') }}</h2><p v-if="submitted && !form.permissions.length" class="error" role="alert">{{ t('roleManagement.permissionRequired') }}</p>
          <a-tabs v-model:active-key="app"><a-tab-pane v-for="application in enabledApps" :key="application.id" :title="application.name"><div class="matrix-scroll"><table class="permission-matrix"><thead><tr><th>{{ t('roleManagement.level1') }}</th><th>{{ t('roleManagement.level2') }}</th><th>{{ t('roleManagement.level3') }}</th></tr></thead><tbody><tr v-for="(row, index) in application.rows" :key="row.id"><td v-if="index === 0 || application.rows[index-1].group !== row.group" :rowspan="application.rows.filter(item => item.group === row.group).length">{{ moduleLabel(t, row.group) }}</td><td><a-checkbox :model-value="checked(ids(application.id,row.id,row.actions))" :indeterminate="partial(ids(application.id,row.id,row.actions))" :disabled="readOnly" @change="toggle(ids(application.id,row.id,row.actions), $event)">{{ moduleLabel(t,row.page) }}</a-checkbox></td><td><div class="permission-actions"><a-checkbox v-for="action in row.actions" :key="action" :model-value="form.permissions.includes(`${application.id}.${row.id}.${action}`)" :disabled="readOnly" @change="toggle([`${application.id}.${row.id}.${action}`], $event)">{{ actionLabel(t,action) }}</a-checkbox></div></td></tr></tbody></table></div></a-tab-pane></a-tabs>
        </section>
      </template>
    </template>
    <ConfirmDialog
      :visible="!!target"
      :title="t('roleManagement.deleteTitle')"
      :description="t('roleManagement.deleteConfirm', { name: roles.find(role => role.id === target)?.name })"
      :cancel-text="t('roleManagement.cancel')"
      :ok-text="t('roleManagement.delete')"
      @update:visible="target = undefined"
      @confirm="remove"
    />
    <ConfirmDialog
      :visible="discard"
      :title="t('roleManagement.discardTitle')"
      :description="t('roleManagement.discard')"
      :cancel-text="t('roleManagement.stay')"
      :ok-text="t('roleManagement.leave')"
      @update:visible="settleExit(false)"
      @confirm="settleExit(true)"
    />
  </div>
</template>
<style scoped>
.roles-page { display: grid; gap: 12px; min-width: 0; }
.role-panel, .role-filters, .role-header { padding: 16px; background: var(--app-surface); }
.role-header, .row-actions, .list-settings { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
/* 筛选条（2026-11-09 用户裁决）：字段名在上、控件在下，12px / 4px / 左对齐 / 200px，
   条件与查询/重置/列设置统一 16px 栅栏换行分布，按钮紧跟最后一个条件右侧且左对齐 */
.role-filters { display:flex; flex-wrap:wrap; align-items:flex-end; gap:var(--mt-ds-space-4); border-radius:var(--mt-ds-control-radius); }
.filter-field { display:grid; grid-template-columns:minmax(0, var(--mt-ds-filter-width)); align-items:start; justify-items:start; gap:var(--mt-ds-space-1); min-width:0; }
.filter-field :deep(.app-filter-control) { width:var(--mt-ds-filter-width); max-width:100%; }
.list-settings { margin-left:0; gap:var(--mt-ds-space-4); }
.role-header { justify-content:space-between; position:sticky; top:56px; z-index:5; }
h2 { font-size:16px; font-weight:600; line-height:24px; margin:0 0 12px; padding:8px 0; color:var(--color-text-1); }
.role-toolbar { margin-bottom:16px; }
.role-panel { min-width:0; border-radius:2px; }
.role-icon-button { width:32px; height:32px; padding:0; font-size:16px; }
.role-pagination { display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; margin-top:16px; color:var(--color-text-3); }
.pagination-total { margin-right:8px; }
.pagination-pages { display:flex; align-items:center; gap:8px; margin-right:8px; }
.role-details :deep(.arco-descriptions-item-value) { overflow-wrap:anywhere; white-space:pre-wrap; }
.role-filters .app-field-label { font-size:var(--mt-ds-font-caption); font-weight:var(--mt-ds-weight-body); line-height:var(--mt-ds-line-caption); text-align:left; padding:0; white-space:nowrap; }
/* DESIGN.md · Data-list text weight：表头与单元格内所有文字统一 400 */
.roles-page :deep(.arco-table-th) { background:var(--app-table-header); text-align:left; font-weight:var(--mt-ds-weight-body); }
.roles-page :deep(.arco-table-td) { border-bottom:1px solid var(--app-divider); font-weight:var(--mt-ds-weight-body); }
.role-form { width:500px; max-width:100%; }
.required, .error { color:var(--app-color-danger); }.required { margin-right:4px; }
.row-actions { gap:var(--mt-ds-space-3); flex-wrap:nowrap; }
.row-actions :deep(.arco-link) { font-weight:var(--mt-ds-weight-body); }
.role-row-more { display:inline-grid; width:24px; height:24px; padding:0; place-items:center; border:0; border-radius:var(--mt-ds-control-radius); background:transparent; color:var(--color-text-3); cursor:pointer; }
.role-row-more:hover { background:var(--color-fill-1); color:var(--color-text-2); }
.role-row-more:focus-visible { outline:2px solid var(--app-accent); outline-offset:2px; }
.role-panel > :deep(.arco-pagination) { margin-top:16px; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
.matrix-scroll { overflow-x:auto; }.permission-matrix { border-collapse:collapse; width:100%; min-width:780px; text-align:left; }
.permission-matrix th, .permission-matrix td { padding:12px; border:1px solid var(--app-divider); }
.permission-matrix th { background:var(--app-table-header); font-weight:var(--mt-ds-weight-body); }
.permission-matrix th:nth-child(1), .permission-matrix th:nth-child(2) { width:180px; }
.permission-actions { display:flex; flex-wrap:wrap; gap:12px 24px; }
/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry）。 */
@media(max-width:760px) {
  .role-filters { align-items:stretch; }
  .filter-field { grid-template-columns:minmax(0, 1fr); width:100%; }
  .filter-field :deep(.app-filter-control) { width:100%; }
}
</style>
<style>.danger-option { color:var(--app-color-danger) !important; }</style>
