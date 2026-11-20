<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { TableColumnData } from '@arco-design/web-vue';
import { useAuthStore } from '../../auth/stores/auth';
import AppListToolbar from '../../../design/components/AppListToolbar.vue';
import AppPagination from '../../../design/components/AppPagination.vue';
import AppFieldLabel from '../../../design/components/AppFieldLabel.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import { listTasks } from '../api';
import { taskRole, useBusinessTaskLabels } from '../labels';
import { TASK_STATUS_CODES, type TaskPage, type TaskStatus } from '../data/contracts';

const { t } = useI18n();
const { statusLabel, dateLabel, errorLabel } = useBusinessTaskLabels();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const draft = reactive({ q: '', status: '' as TaskStatus | '' });
const current = ref(1);
const size = ref(10);
const data = ref<TaskPage>();
const applied = reactive({ q: '', status: '' as TaskStatus | '' });
const loading = ref(false);
const error = ref<unknown>();
let active = 0;
let request: AbortController | undefined;
const columns = computed<TableColumnData[]>(() => [
  { title: t('businessTasks.fields.title'), dataIndex: 'title', width: 240 },
  { title: t('businessTasks.fields.businessKey'), dataIndex: 'businessKey', width: 180 },
  { title: t('businessTasks.fields.rootTaskId'), dataIndex: 'rootTaskId', width: 180 },
  { title: t('businessTasks.fields.nodeTaskId'), dataIndex: 'nodeTaskId', width: 180 },
  { title: t('businessTasks.fields.status'), slotName: 'status', width: 120 },
  { title: t('businessTasks.fields.assigneeId'), dataIndex: 'assigneeId', width: 140 },
  { title: t('businessTasks.fields.updatedAt'), slotName: 'updatedAt', width: 190 },
  { title: t('businessTasks.operations'), slotName: 'operations', width: 100, fixed: 'right' },
]);
const hasFilter = computed(() => Boolean(route.query.q || route.query.status));
function pageQuery(page: number, pageSize = size.value, filters = draft) {
  return { q: filters.q.trim() || undefined, status: filters.status || undefined, page: String(page), size: String(pageSize) };
}
async function load() {
  const version = ++active;
  request?.abort(); request = new AbortController();
  loading.value = true; error.value = undefined;
  try {
    const result = await listTasks({ page: current.value, size: size.value, status: applied.status, q: applied.q }, request.signal);
    if (version !== active) return;
    const lastPage = Math.max(1, Math.ceil(result.total / size.value));
    if (current.value > lastPage) { await router.replace({ query: pageQuery(lastPage, size.value, applied) }); return; }
    data.value = result;
  } catch (failure) {
    if (version === active) { error.value = failure; data.value = undefined; }
  } finally { if (version === active) loading.value = false; }
}
function search() {
  const next = pageQuery(1);
  if (draft.q.trim() === String(route.query.q ?? '') && draft.status === String(route.query.status ?? '') && current.value === 1) void load();
  else void router.push({ query: next });
}
function reset() { draft.q = ''; draft.status = ''; current.value = 1; void router.push({ query: pageQuery(1) }); }
function changePage(page: number) { void router.push({ query: pageQuery(page, size.value, { q: String(route.query.q ?? ''), status: String(route.query.status ?? '') as TaskStatus | '' }) }); }
function changeSize(value: number) { size.value = value; void router.push({ query: pageQuery(1, value, { q: String(route.query.q ?? ''), status: String(route.query.status ?? '') as TaskStatus | '' }) }); }
watch([() => route.query, () => auth.token], () => {
  draft.q = String(route.query.q ?? '').slice(0, 200);
  const status = String(route.query.status ?? '');
  draft.status = TASK_STATUS_CODES.includes(status as TaskStatus) ? status as TaskStatus : '';
  applied.q = draft.q.trim(); applied.status = draft.status;
  current.value = Math.max(1, Math.min(1000001, Math.trunc(Number(route.query.page)) || 1));
  const proposedSize = Number(route.query.size);
  size.value = [10, 20, 50, 100].includes(proposedSize) ? proposedSize : 10;
  void load();
}, { immediate: true });
onBeforeUnmount(() => { active++; request?.abort(); });
</script>

<template>
  <div class="business-tasks-page">
    <form class="business-task-filters" @submit.prevent="search">
      <div class="business-task-filter">
        <AppFieldLabel as="label" for="business-task-query" context="filter" :text="t('businessTasks.keyword')" />
        <a-input v-model="draft.q" allow-clear :max-length="200" :input-attrs="{ id: 'business-task-query', 'aria-label': t('businessTasks.keyword') }" />
      </div>
      <div class="business-task-filter">
        <AppFieldLabel context="filter" :text="t('businessTasks.fields.status')" />
        <a-select v-model="draft.status" :aria-label="t('businessTasks.fields.status')" allow-clear>
          <a-option value="">{{ t('businessTasks.all') }}</a-option>
          <a-option v-for="code in TASK_STATUS_CODES" :key="code" :value="code">{{ statusLabel(code) }}</a-option>
        </a-select>
      </div>
      <div class="business-task-filter-actions">
        <a-button html-type="submit" type="primary" :loading="loading">{{ t('businessTasks.search') }}</a-button>
        <a-button class="app-btn-neutral" :disabled="loading" @click="reset">{{ t('businessTasks.reset') }}</a-button>
      </div>
    </form>
    <section class="business-task-panel" :aria-label="t('businessTasks.list')">
      <AppListToolbar :title="t('businessTasks.list')" :summary="data ? t('businessTasks.total', { count: data.total }) : undefined">
        <template #actions>
          <a-button class="app-btn-neutral" @click="router.push('/tasks')">{{ t('businessTasks.taskCenter') }}</a-button>
          <a-button class="app-btn-neutral" :loading="loading" @click="load">{{ t('businessTasks.refresh') }}</a-button>
        </template>
      </AppListToolbar>
      <a-alert v-if="error" type="error" :title="errorLabel(error)">
        <template #action><a-button @click="load">{{ t('businessTasks.retry') }}</a-button></template>
      </a-alert>
      <template v-else>
        <a-table class="business-task-table" :columns="columns" :data="data?.items ?? []" :loading="loading" row-key="id" :pagination="false" :bordered="false" :scroll="{ x: 1330 }">
          <template #status="{ record }"><AppStatusTag :role="taskRole(record.status)" :label="statusLabel(record.status)" /></template>
          <template #updatedAt="{ record }"><time :datetime="record.updatedAt" :title="record.updatedAt">{{ dateLabel(record.updatedAt) }}</time></template>
          <template #operations="{ record }"><router-link :to="{ name: 'business-task-detail', params: { id: record.id }, query: route.query }">{{ t('businessTasks.view') }}</router-link></template>
          <template #empty><a-empty :description="hasFilter ? t('businessTasks.noMatch') : t('businessTasks.empty')" /></template>
        </a-table>
        <AppPagination v-if="data" :current="current" :page-size="size" :page-sizes="[10, 20, 50, 100]" :total="data.total" @update:current="changePage" @update:page-size="changeSize" />
      </template>
    </section>
  </div>
</template>

<style scoped>
.business-tasks-page { display: flex; flex-direction: column; gap: var(--mt-ds-space-4); min-width: 0; }
.business-task-filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--mt-ds-space-4); padding: var(--mt-ds-space-4); background: var(--mt-ds-surface); border-radius: var(--mt-ds-control-radius); }
.business-task-filter { display: grid; grid-template-columns: max-content var(--mt-ds-filter-width); align-items: center; gap: var(--mt-ds-space-2); min-width: 0; }
.business-task-filter-actions { display: flex; gap: var(--mt-ds-space-2); }
.business-task-panel { min-width: 0; padding: var(--mt-ds-space-4); background: var(--mt-ds-surface); border-radius: var(--mt-ds-control-radius); }
.business-task-table :deep(.arco-table-th), .business-task-table :deep(.arco-table-td), .business-task-table a { font-weight: var(--mt-ds-weight-body); }
.business-task-table a { color: var(--mt-ds-primary); text-decoration: none; }
.business-task-table a:hover { text-decoration: underline; }
@media (max-width: 600px) { .business-task-filter { width: 100%; grid-template-columns: max-content minmax(0, 1fr); } }
</style>
