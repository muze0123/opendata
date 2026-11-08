<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { type TableColumnData } from '@arco-design/web-vue';
import { IconFilter, IconLeft, IconPlus, IconRefresh, IconRight, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLocaleStore } from '../../../app/stores/locale';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import {
  APP_CODES, PROJECT_CODES, currentTaskUser, taskPriorityLabels, taskRecords, taskStatusLabels,
  vehicleOptions, type TaskPriority, type TaskRecord, type TaskStatus, type TaskTab,
} from '../data/tasks';
import { useTaskLabels } from '../labels';
import CreateTaskDrawer from '../components/CreateTaskDrawer.vue';

const router = useRouter();
const { t, te } = useI18n({ useScope: 'global' });
const { appLabel, projectLabel } = useTaskLabels();
const localeStore = useLocaleStore();

/* ------------------------------------------------------------------ 页签 */

const TAB_KEYS: TaskTab[] = ['all', 'pending', 'created', 'participated', 'copied', 'completed'];
const activeTab = ref<TaskTab>('all');

function matchesTab(task: TaskRecord, tab: TaskTab = activeTab.value) {
  if (tab === 'all') return true;
  if (tab === 'pending') return task.status === 'pending';
  if (tab === 'created') return task.creator === currentTaskUser;
  if (tab === 'participated') return task.assignees.includes(currentTaskUser);
  if (tab === 'copied') return task.copiedUsers.includes(currentTaskUser);
  return task.status === 'completed';
}

/** 页签计数取自实际数据，避免出现与列表对不上的固定数字 */
const tabCounts = computed(() => Object.fromEntries(
  TAB_KEYS.map((key) => [key, taskRecords.filter((task) => matchesTab(task, key)).length]),
) as Record<TaskTab, number>);

const tabs = computed(() => TAB_KEYS.map((key) => ({ key, label: t(`tasks.tabs.${key}`), count: tabCounts.value[key] })));

/* ------------------------------------------------------------------ 筛选 */

const FILTER_KEYS = ['name', 'status', 'priority', 'sourceApp', 'targetApp', 'project', 'vehicle', 'createdRange', 'updatedRange'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

interface TaskFilters {
  name: string; status: string; priority: string; sourceApp: string; targetApp: string;
  project: string; vehicle: string; createdRange: string[]; updatedRange: string[];
}

const emptyFilters = (): TaskFilters => ({
  name: '', status: '', priority: '', sourceApp: '', targetApp: '', project: '', vehicle: '', createdRange: [], updatedRange: [],
});
const cloneFilters = (source: TaskFilters): TaskFilters => ({
  ...source, createdRange: [...source.createdRange], updatedRange: [...source.updatedRange],
});

/** 输入态与生效态分离：改动筛选条件不会静默改变结果，点击“查询”才生效 */
const draftFilters = reactive<TaskFilters>(emptyFilters());
const appliedFilters = ref<TaskFilters>(emptyFilters());

/**
 * 筛选条件设置：与项目管理页同一套气泡交互——勾选展示、拖动排序、恢复默认，
 * 每一次调整实时写回，没有确定/取消的暂存层。
 */
interface FilterSetting { key: FilterKey; visible: boolean }

const DEFAULT_HIDDEN_FILTERS: FilterKey[] = ['project', 'vehicle', 'createdRange', 'updatedRange'];
const defaultFilterSettings: FilterSetting[] = FILTER_KEYS.map((key) => ({ key, visible: !DEFAULT_HIDDEN_FILTERS.includes(key) }));
const cloneSettings = (settings: FilterSetting[]) => settings.map((setting) => ({ ...setting }));

const filterSettings = ref<FilterSetting[]>(cloneSettings(defaultFilterSettings));
const filterSettingsVisible = ref(false);
const visibleFilterSettings = computed(() => filterSettings.value.filter((setting) => setting.visible));
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map((setting) => ({
  key: setting.key,
  label: filterLabel(setting.key),
  visible: setting.visible,
})));

/** 气泡内每次勾选、拖拽或恢复默认都会带着完整的新顺序回来，直接整体替换 */
function updateFilterSettings(items: ColumnSettingsItem[]) {
  filterSettings.value = items.map((item) => ({ key: item.key as FilterKey, visible: item.visible }));
}

const statusOptions = computed(() => Object.keys(taskStatusLabels).map((value) => ({ value, label: t(`tasks.statuses.${value}`) })));
const priorityOptions = computed(() => Object.keys(taskPriorityLabels).map((value) => ({ value, label: t(`tasks.priorities.${value}`) })));
const appOptions = computed(() => APP_CODES.map((code) => ({ value: code, label: appLabel(code) })));
const projectOptions = computed(() => PROJECT_CODES.map((code) => ({ value: code, label: projectLabel(code) })));
const vehicleSelectOptions = computed(() => vehicleOptions.map((value) => ({ value, label: value })));

function filterLabel(key: FilterKey) {
  if (key === 'createdRange') return t('tasks.fields.createdAt');
  if (key === 'updatedRange') return t('tasks.fields.updatedAt');
  return t(`tasks.fields.${key}`);
}

function isOverdue(task: TaskRecord) {
  return !['completed', 'recalled', 'cancelled'].includes(task.status) && task.deadline < '2026-10-21 00:00';
}

function matchesDateRange(value: string, range: string[]) {
  if (range.length < 2 || !range[0] || !range[1]) return true;
  // 日期范围按“自然日”闭区间比较：结束日包含当天全部时间
  const start = `${range[0].slice(0, 10)} 00:00`;
  const end = `${range[1].slice(0, 10)} 23:59`;
  return value >= start && value <= end;
}

/** 搜索匹配“看到的文字”：英文界面下输入英文标题也能命中，中文原文同时保留兜底 */
function matchesKeyword(task: TaskRecord, keyword: string) {
  return taskText(task, 'name').toLowerCase().includes(keyword) || task.name.toLowerCase().includes(keyword);
}

function statusLabel(value: unknown) { return t(`tasks.statuses.${String(value)}`); }
function priorityLabel(value: unknown) { return t(`tasks.priorities.${String(value)}`); }
function statusColor(status: TaskStatus) {
  return status === 'completed' ? 'green' : status === 'in-progress' ? 'arcoblue' : status === 'pending' ? 'orange' : status === 'rejected' || status === 'cancelled' ? 'red' : 'gray';
}
function priorityColor(priority: TaskPriority) { return priority === 'urgent' || priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'gray'; }

/**
 * 排序取“显示值”而不是原始字段值。
 * 应用、项目、状态、优先级在数据层存的是 code，直接比 code 会得到与界面无关的顺序。
 */
const sortKey = ref<keyof TaskRecord>('createdAt');
const sortDirection = ref<'ascend' | 'descend'>('descend');

function sortValue(task: TaskRecord): string {
  switch (sortKey.value) {
    case 'sourceApp':
    case 'targetApp':
      return appLabel(task[sortKey.value]);
    case 'project':
      return projectLabel(task.project);
    case 'status':
      return statusLabel(task.status);
    case 'priority':
      return priorityLabel(task.priority);
    case 'name':
      return taskText(task, 'name');
    default:
      return String(task[sortKey.value] ?? '');
  }
}

const filteredTasks = computed(() => {
  const filters = appliedFilters.value;
  const keyword = filters.name.trim().toLowerCase();
  const rows = taskRecords.filter((task) => {
    if (!matchesTab(task)) return false;
    if (keyword && !matchesKeyword(task, keyword)) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.sourceApp && task.sourceApp !== filters.sourceApp) return false;
    if (filters.targetApp && task.targetApp !== filters.targetApp) return false;
    if (filters.project && task.project !== filters.project) return false;
    if (filters.vehicle && task.vehicle !== filters.vehicle) return false;
    if (!matchesDateRange(task.createdAt, filters.createdRange)) return false;
    if (!matchesDateRange(task.updatedAt, filters.updatedRange)) return false;
    return true;
  });
  return [...rows].sort((left, right) => {
    const result = sortValue(left).localeCompare(sortValue(right), localeStore.locale);
    return sortDirection.value === 'ascend' ? result : -result;
  });
});

/* -------------------------------------------------------------- 已应用条件 */

type ChipKey = 'name' | 'status' | 'priority' | 'sourceApp' | 'targetApp' | 'project' | 'vehicle' | 'createdRange' | 'updatedRange';

const activeFilterChips = computed(() => {
  const chips: { key: ChipKey; label: string }[] = [];
  const add = (key: ChipKey, field: string, value: string) => chips.push({ key, label: t('tasks.filters.chip', { field, value }) });
  const filters = appliedFilters.value;
  const rangeText = (range: string[]) => (range.length === 2 && range[0] && range[1] ? `${range[0].slice(0, 10)} ~ ${range[1].slice(0, 10)}` : '');

  if (filters.name) add('name', t('tasks.fields.name'), filters.name);
  if (filters.status) add('status', t('tasks.fields.status'), statusLabel(filters.status));
  if (filters.priority) add('priority', t('tasks.fields.priority'), priorityLabel(filters.priority));
  if (filters.sourceApp) add('sourceApp', t('tasks.fields.sourceApp'), appLabel(filters.sourceApp as TaskRecord['sourceApp']));
  if (filters.targetApp) add('targetApp', t('tasks.fields.targetApp'), appLabel(filters.targetApp as TaskRecord['targetApp']));
  if (filters.project) add('project', t('tasks.fields.project'), projectLabel(filters.project as TaskRecord['project']));
  if (filters.vehicle) add('vehicle', t('tasks.fields.vehicle'), filters.vehicle);
  if (rangeText(filters.createdRange)) add('createdRange', t('tasks.fields.createdAt'), rangeText(filters.createdRange));
  if (rangeText(filters.updatedRange)) add('updatedRange', t('tasks.fields.updatedAt'), rangeText(filters.updatedRange));
  return chips;
});

const hasAppliedFilters = computed(() => activeFilterChips.value.length > 0);

function clearCondition(key: ChipKey) {
  switch (key) {
    case 'name': appliedFilters.value.name = ''; draftFilters.name = ''; break;
    case 'status': appliedFilters.value.status = ''; draftFilters.status = ''; break;
    case 'priority': appliedFilters.value.priority = ''; draftFilters.priority = ''; break;
    case 'sourceApp': appliedFilters.value.sourceApp = ''; draftFilters.sourceApp = ''; break;
    case 'targetApp': appliedFilters.value.targetApp = ''; draftFilters.targetApp = ''; break;
    case 'project': appliedFilters.value.project = ''; draftFilters.project = ''; break;
    case 'vehicle': appliedFilters.value.vehicle = ''; draftFilters.vehicle = ''; break;
    case 'createdRange': appliedFilters.value.createdRange = []; draftFilters.createdRange = []; break;
    case 'updatedRange': appliedFilters.value.updatedRange = []; draftFilters.updatedRange = []; break;
  }
  setPage(1);
}

function applyFilters() {
  appliedFilters.value = cloneFilters(draftFilters);
  setPage(1);
}

function resetFilters() {
  Object.assign(draftFilters, emptyFilters());
  appliedFilters.value = emptyFilters();
  setPage(1);
}

/* ------------------------------------------------------------------ 分页 */

const page = ref(1);
const pageSize = ref(10);
const jumpPage = ref(1);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / pageSize.value)));
const pagedTasks = computed(() => filteredTasks.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageNumbers = computed(() => {
  const windowSize = Math.min(totalPages.value, 5);
  const start = Math.min(Math.max(page.value - Math.floor(windowSize / 2), 1), totalPages.value - windowSize + 1);
  return Array.from({ length: windowSize }, (_, index) => start + index);
});

watch(totalPages, (value) => { if (page.value > value) setPage(value); });

function setPage(value: number) {
  page.value = Math.min(Math.max(value, 1), totalPages.value);
  jumpPage.value = page.value;
}
function goToJumpPage() { setPage(Number(jumpPage.value)); }
function handleTabChange(value: string | number) { activeTab.value = value as TaskTab; setPage(1); }
function handlePageSizeChange(value: unknown) {
  const nextSize = Number(value);
  if (!Number.isFinite(nextSize) || nextSize <= 0) return;
  pageSize.value = nextSize;
  setPage(1);
}
function handleSort(dataIndex: string, direction: string) {
  if (direction !== 'ascend' && direction !== 'descend') return;
  sortKey.value = dataIndex as keyof TaskRecord;
  sortDirection.value = direction;
}

/* ------------------------------------------------------------ 数据列表字段 */

const COLUMN_KEYS = ['name', 'status', 'priority', 'createdAt', 'updatedAt', 'sourceApp', 'targetApp', 'project', 'vehicle', 'actions'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

interface ColumnSetting { key: ColumnKey; visible: boolean }

const defaultColumnSettings: ColumnSetting[] = COLUMN_KEYS.map((key) => ({ key, visible: true }));
const columnSettings = ref<ColumnSetting[]>(defaultColumnSettings.map((setting) => ({ ...setting })));
const columnSettingsVisible = ref(false);

const COLUMN_META: Record<ColumnKey, { width: number; slotName?: string; sortable: boolean; fixed?: 'left' | 'right' }> = {
  name: { width: 210, slotName: 'name', sortable: true, fixed: 'left' },
  status: { width: 96, slotName: 'status', sortable: true },
  priority: { width: 96, slotName: 'priority', sortable: true },
  createdAt: { width: 164, sortable: true },
  updatedAt: { width: 164, sortable: true },
  sourceApp: { width: 110, slotName: 'sourceApp', sortable: true },
  targetApp: { width: 110, slotName: 'targetApp', sortable: true },
  project: { width: 144, slotName: 'project', sortable: true },
  vehicle: { width: 110, slotName: 'vehicle', sortable: true },
  actions: { width: 168, slotName: 'actions', sortable: false, fixed: 'right' },
};

function columnLabel(key: ColumnKey) { return t(`tasks.fields.${key}`); }

const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map((setting) => ({
  key: setting.key,
  label: columnLabel(setting.key),
  visible: setting.visible,
  // 主识别字段常驻：隐藏后列表无法区分记录，也不能被拖到其它字段之后
  disabled: setting.key === 'name',
})));

const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map((setting) => ({
  key: setting.key,
  label: columnLabel(setting.key),
  visible: setting.visible,
  disabled: setting.key === 'name',
})));

const tableColumns = computed<TableColumnData[]>(() => columnSettings.value
  .filter((setting) => setting.visible)
  .map((setting) => {
    const meta = COLUMN_META[setting.key];
    const column: TableColumnData = {
      title: columnLabel(setting.key),
      dataIndex: setting.key === 'actions' ? undefined : setting.key,
      width: meta.width,
      align: 'left',
    };
    if (meta.slotName) column.slotName = meta.slotName;
    if (meta.fixed) column.fixed = meta.fixed;
    if (meta.sortable) column.sortable = { sortDirections: ['ascend', 'descend'], sorter: true };
    return column;
  }));

function updateColumnSettings(items: ColumnSettingsItem[]) {
  columnSettings.value = items.map((item) => ({ key: item.key as ColumnKey, visible: item.visible }));
}

/* --------------------------------------------------------------- 新建任务 */

const createVisible = ref(false);

type TaskTextField = 'name' | 'description' | 'content';
/**
 * 任务标题 / 描述 / 正文是业务数据：默认语言直接用数据层原文，
 * 其它语言由 tasks.records.<id>.<field> 覆盖，缺省就回落原文。
 */
function taskText(task: TaskRecord, field: TaskTextField) {
  const key = `tasks.records.${task.id}.${field}`;
  return te(key) ? t(key) : task[field];
}

function openDetail(task: TaskRecord) { router.push({ name: 'task-detail', params: { taskId: task.id } }); }
function openCreate() { createVisible.value = true; }
/** 抽屉创建成功后回到第一页，新任务置顶可见 */
function onTaskCreated() { setPage(1); }
/** 编辑编排沿用本平台的编排占位页 */
function onEditOrchestration() { router.push({ name: 'task-orchestration' }); }
</script>

<template>
  <main class="tasks-page">
    <section class="tasks-panel">
      <a-tabs :active-key="activeTab" @change="handleTabChange">
        <a-tab-pane v-for="tab in tabs" :key="tab.key" :title="`${tab.label} (${tab.count})`" />
      </a-tabs>

      <div class="tasks-query">
        <div class="tasks-filters">
          <label
            v-for="setting in visibleFilterSettings"
            :key="setting.key"
            class="filter-field"
            :class="{ 'filter-field--range': setting.key === 'createdRange' || setting.key === 'updatedRange' }"
          >
            <span>{{ filterLabel(setting.key) }}</span>
            <a-input v-if="setting.key === 'name'" v-model="draftFilters.name" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.input')" @press-enter="applyFilters" />
            <a-select v-else-if="setting.key === 'status'" v-model="draftFilters.status" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="statusOptions" />
            <a-select v-else-if="setting.key === 'priority'" v-model="draftFilters.priority" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="priorityOptions" />
            <a-select v-else-if="setting.key === 'sourceApp'" v-model="draftFilters.sourceApp" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="appOptions" />
            <a-select v-else-if="setting.key === 'targetApp'" v-model="draftFilters.targetApp" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="appOptions" />
            <a-select v-else-if="setting.key === 'project'" v-model="draftFilters.project" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="projectOptions" />
            <a-select v-else-if="setting.key === 'vehicle'" v-model="draftFilters.vehicle" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="vehicleSelectOptions" />
            <a-range-picker v-else-if="setting.key === 'createdRange'" v-model="draftFilters.createdRange" class="app-filter-control" :placeholder="[t('tasks.filters.startDate'), t('tasks.filters.endDate')]" />
            <a-range-picker v-else v-model="draftFilters.updatedRange" class="app-filter-control" :placeholder="[t('tasks.filters.startDate'), t('tasks.filters.endDate')]" />
          </label>
        </div>
        <div class="tasks-query-actions">
          <a-button type="primary" @click="applyFilters"><template #icon><IconSearch /></template>{{ t('tasks.filters.search') }}</a-button>
          <a-button class="app-btn-neutral" @click="resetFilters"><template #icon><IconRefresh /></template>{{ t('tasks.filters.reset') }}</a-button>
          <ColumnSettingsPopover
            v-model:visible="filterSettingsVisible"
            :items="filterSettingsItems"
            :default-items="defaultFilterSettings.map((setting) => ({ key: setting.key, label: filterLabel(setting.key), visible: setting.visible }))"
            :list-aria-label="t('tasks.filters.listAria')"
            :show-label="t('tasks.actions.show')"
            :restore-label="t('tasks.actions.restore')"
            :title="t('tasks.filters.settings')"
            @change="updateFilterSettings"
          >
            <a-tooltip :content="t('tasks.filters.settings')"><a-button class="icon-button" :aria-label="t('tasks.filters.settings')" @click="filterSettingsVisible = true"><IconFilter /></a-button></a-tooltip>
          </ColumnSettingsPopover>
        </div>
      </div>

      <div v-if="hasAppliedFilters" class="tasks-applied">
        <a-tag v-for="chip in activeFilterChips" :key="chip.key" closable :close-aria-label="t('tasks.actions.removeFilter')" @close="clearCondition(chip.key)">{{ chip.label }}</a-tag>
        <a-button type="text" size="small" @click="resetFilters">{{ t('tasks.filters.clearAll') }}</a-button>
      </div>

      <div class="tasks-toolbar">
        <a-button type="primary" size="large" @click="openCreate"><template #icon><IconPlus /></template>{{ t('tasks.create.title') }}</a-button>
        <ColumnSettingsPopover
          v-model:visible="columnSettingsVisible"
          :items="columnSettingsItems"
          :default-items="defaultColumnItems"
          :title="t('tasks.columns.settings')"
          :list-aria-label="t('tasks.columns.listAria')"
          :show-label="t('tasks.actions.show')"
          :restore-label="t('tasks.actions.restore')"
          @change="updateColumnSettings"
        >
          <a-button class="column-settings-trigger" :aria-label="t('tasks.columns.settings')" :title="t('tasks.columns.settings')" @click="columnSettingsVisible = true"><IconSettings /></a-button>
        </ColumnSettingsPopover>
      </div>

      <a-table
        :columns="tableColumns"
        :data="pagedTasks"
        :pagination="false"
        :scroll="{ x: 1372 }"
        row-key="id"
        @sorter-change="handleSort"
      >
        <template #name="{ record }">
          <span class="task-name-cell">
            <button class="table-link" type="button" @click="openDetail(record)">{{ taskText(record, 'name') }}</button>
            <a-tag v-if="isOverdue(record)" size="small" color="red">{{ t('tasks.actions.overdue') }}</a-tag>
          </span>
        </template>
        <template #status="{ record }"><a-tag :color="statusColor(record.status)" size="small">{{ statusLabel(record.status) }}</a-tag></template>
        <template #priority="{ record }"><a-tag :color="priorityColor(record.priority)" size="small">{{ priorityLabel(record.priority) }}</a-tag></template>
        <template #sourceApp="{ record }">{{ appLabel(record.sourceApp) }}</template>
        <template #targetApp="{ record }">{{ appLabel(record.targetApp) }}</template>
        <template #project="{ record }">{{ projectLabel(record.project) }}</template>
        <template #vehicle="{ record }">{{ record.vehicle }}</template>
        <template #actions="{ record }">
          <div class="table-actions">
            <a-link @click="openDetail(record)">{{ t('tasks.actions.detail') }}</a-link>
            <a-link v-if="record.status === 'pending'" @click="openDetail(record)">{{ t('tasks.actions.execute') }}</a-link>
            <a-link v-if="record.status === 'pending' && record.creator === currentTaskUser" status="danger" @click="openDetail(record)">{{ t('tasks.actions.cancel') }}</a-link>
            <a-link v-if="['completed', 'recalled', 'cancelled'].includes(record.status) && record.creator === currentTaskUser" status="danger" @click="openDetail(record)">{{ t('tasks.actions.delete') }}</a-link>
          </div>
        </template>
        <template #empty>
          <div class="tasks-empty">
            <a-empty :description="hasAppliedFilters ? t('tasks.labels.noMatch') : t('tasks.labels.empty')" />
            <a-button v-if="hasAppliedFilters" @click="resetFilters">{{ t('tasks.filters.reset') }}</a-button>
          </div>
        </template>
      </a-table>

      <nav class="tasks-pagination app-pagination" :aria-label="t('tasks.pagination.navigation')">
        <span class="pagination-total">{{ t('tasks.pagination.total', { count: filteredTasks.length }) }}</span>
        <div class="pagination-pages">
          <a-select class="app-page-size" :model-value="pageSize" :aria-label="t('tasks.pagination.pageSizeAria')" @update:model-value="handlePageSizeChange">
            <a-option v-for="size in [10, 20, 50]" :key="size" :value="size">{{ t('tasks.pagination.perPage', { count: size }) }}</a-option>
          </a-select>
          <button class="pagination-arrow" type="button" :disabled="page === 1" :aria-label="t('tasks.pagination.previous')" @click="setPage(page - 1)"><IconLeft /></button>
          <button
            v-for="number in pageNumbers"
            :key="number"
            class="pagination-number"
            :class="{ active: page === number }"
            type="button"
            :aria-current="page === number ? 'page' : undefined"
            @click="setPage(number)"
          >{{ number }}</button>
          <button class="pagination-arrow" type="button" :disabled="page === totalPages" :aria-label="t('tasks.pagination.next')" @click="setPage(page + 1)"><IconRight /></button>
        </div>
        <span class="pagination-jump-label">{{ t('tasks.pagination.jumpTo') }}</span>
        <a-input-number v-model="jumpPage" class="app-page-jump" :min="1" :max="totalPages" hide-button @press-enter="goToJumpPage" />
        <span class="pagination-total-pages">{{ t('tasks.pagination.totalPages', { count: totalPages }) }}</span>
      </nav>
    </section>

    <!-- 新建任务抽屉：1:1 复刻「功能数据安全合规自评」项目的 CreateTaskDrawer -->
    <CreateTaskDrawer
      v-model:visible="createVisible"
      @created="onTaskCreated"
      @edit-orchestration="onEditOrchestration"
    />
  </main>
</template>

<style scoped>
.tasks-page { min-height: calc(100dvh - 56px); padding: 16px var(--app-page-gutter); background: var(--mt-fill-1); }
.tasks-panel { min-height: calc(100dvh - 88px); padding: 0 16px 16px; background: var(--color-bg-2); }

/* 页签：贴在下边框上，不额外制造间距 */
.tasks-panel :deep(.arco-tabs-nav) { margin-bottom: 0; }
.tasks-panel :deep(.arco-tabs-content) { padding-top: 0; }
.tasks-panel :deep(.arco-tabs-nav::before) { background: var(--app-divider); }

/* 查询区：标签右对齐 + 200px 控制宽度 + 8px 标签间距，条件组按内容收紧 */
.tasks-query { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px; padding: 16px 0; }
.tasks-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px; flex: 0 1 auto; min-width: 0; }
.filter-field { display: grid; grid-template-columns: max-content 200px; align-items: center; gap: 8px; color: var(--color-text-2); white-space: nowrap; }
.filter-field > span { min-width: 56px; text-align: right; }
.filter-field :deep(.app-filter-control) { width: 200px; }
.filter-field :deep(.app-filter-control.arco-select) { flex: 0 0 200px; }
.filter-field :deep(.app-filter-control.arco-input-wrapper),
.filter-field :deep(.app-filter-control.arco-select-view),
.filter-field :deep(.app-filter-control .arco-select-view) { background: var(--app-surface); border-color: var(--app-control-border); }
.filter-field :deep(.app-filter-control.arco-input-wrapper:hover),
.filter-field :deep(.app-filter-control.arco-select-view:hover),
.filter-field :deep(.app-filter-control .arco-select-view:hover) { background: var(--app-surface); border-color: var(--app-control-border); }
.filter-field :deep(.app-filter-control.arco-input-wrapper:focus-within),
.filter-field :deep(.app-filter-control.arco-select-view:focus-within),
.filter-field :deep(.app-filter-control .arco-select-view:focus-within) { background: var(--app-surface); border-color: var(--app-color-primary); }
.tasks-query-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.icon-button { width: 32px; height: 32px; padding: 0; }

.tasks-applied { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0 0 12px; }

.tasks-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 0 12px; }
.column-settings-trigger { width: 32px; height: 32px; padding: 0; }

/* 数据列表：白底、无外框、无斑马纹、行间单线分隔 */
.tasks-panel :deep(.arco-table) { border: 0; }
.tasks-panel :deep(.arco-table-container) { border: 0; }
.tasks-panel :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: 14px; font-weight: 600; line-height: 22px; white-space: nowrap; }
.tasks-panel :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); background: var(--app-surface); font-size: 14px; white-space: nowrap; }
.tasks-panel :deep(.arco-table-th), .tasks-panel :deep(.arco-table-td) { text-align: left; }
.tasks-panel :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }

.task-name-cell { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.table-link { max-width: 100%; overflow: hidden; padding: 0; border: 0; color: var(--color-text-1); background: transparent; cursor: pointer; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.table-link:hover, .table-link:focus-visible { color: var(--app-color-primary); }
.table-actions { display: flex; align-items: center; gap: 12px; }

.tasks-empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; }
.tasks-empty :deep(.arco-empty-description) { color: var(--color-text-3); font-size: 20px; font-weight: 400; line-height: 28px; }

/* 列表页脚：总条数 → 每页条数 → 翻页 → 跳转，整体右对齐。
   控件表面（白底 / Border-3 描边 / 禁用灰）统一在 global.css 的 .app-pagination 里，两块列表页共用。 */
.tasks-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; color: var(--color-text-2); }
.pagination-total { margin-right: 8px; color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.pagination-pages { display: flex; align-items: center; gap: 8px; margin-right: 8px; }
.pagination-jump-label, .pagination-total-pages { color: var(--color-text-3); font-size: 14px; line-height: 22px; }

/* 新建任务抽屉的字段、上传区与流程预览样式已随 1:1 复刻迁移到 components/CreateTaskDrawer.vue */

/* 筛选条件设置弹窗：与项目管理页同一套列表与拖拽样式 */
@media (max-width: 1280px) {
  .tasks-query { align-items: stretch; flex-direction: column; }
  .tasks-query-actions { justify-content: flex-end; }
}

@media (max-width: 720px) {
  .tasks-page { padding: 16px; }
  .tasks-filters { grid-template-columns: 1fr; }
  .filter-field { grid-template-columns: max-content minmax(0, 1fr); }
  .filter-field :deep(.app-filter-control), .filter-field :deep(.app-filter-control.arco-select) { width: 100%; flex: 1 1 auto; }
  .tasks-query-actions { justify-content: flex-start; }
  .tasks-toolbar { align-items: flex-start; flex-direction: column; }
  .tasks-pagination { justify-content: flex-start; }
  .pagination-total { width: 100%; margin-right: 0; }
}
</style>
