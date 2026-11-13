<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { type TableColumnData } from '@arco-design/web-vue';
import { IconFilter, IconLeft, IconMore, IconPlus, IconRefresh, IconRight, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLocaleStore } from '../../../app/stores/locale';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import {
  APP_CODES, PROJECT_CODES, currentTaskUser, taskPriorityLabels, taskRecords, taskStatusLabels,
  vehicleOptions, type TaskPriority, type TaskRecord, type TaskStatus, type TaskTab,
} from '../data/tasks';
import { useTaskLabels } from '../labels';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { useAuthStore } from '../../auth/stores/auth';
import { updateTaskStatus } from '../data/tasks';
import CreateTaskDrawer from '../components/CreateTaskDrawer.vue';

const router = useRouter();
const auth = useAuthStore();
const actionTask = ref<TaskRecord>();
const listAction = ref<'cancel' | 'delete'>('cancel');
const listConfirmVisible = ref(false);
function requestListAction(task: TaskRecord, action: 'cancel' | 'delete') { actionTask.value = task; listAction.value = action; listConfirmVisible.value = true; }
/** 行操作溢出（DESIGN.md · Row action overflow）：前两个直显，其余收进「…」下拉。 */
const isActiveTask = (task: TaskRecord) => ['pending', 'in-progress'].includes(task.status);
const canDeleteTask = (task: TaskRecord) => ['recalled', 'cancelled'].includes(task.status) && auth.currentUser?.id === 'u-admin';
function confirmListAction() {
  const task = actionTask.value;
  if (!task) return;
  if (listAction.value === 'cancel' && ['pending', 'in-progress'].includes(task.status)) updateTaskStatus(task, 'cancelled', 'cancel', t('tasks.detail.recordCancelled'));
  else if (listAction.value === 'delete' && auth.currentUser?.id === 'u-admin' && ['recalled', 'cancelled'].includes(task.status)) taskRecords.splice(taskRecords.indexOf(task), 1);
  else { listConfirmVisible.value = false; return; }
  listConfirmVisible.value = false;
}
function executeTask(task: TaskRecord) {
  if (!['pending', 'in-progress'].includes(task.status)) return;
  router.push({ name: 'task-detail', params: { taskId: task.id }, query: { mode: 'execute' } });
}
const { t, te } = useI18n({ useScope: 'global' });
const { appLabel, projectLabel } = useTaskLabels();
const localeStore = useLocaleStore();

/* ------------------------------------------------------------------ 页签 */

const TAB_KEYS: TaskTab[] = ['all', 'pending', 'processed', 'created', 'copied'];
const activeTab = ref<TaskTab>('all');

function matchesTab(task: TaskRecord, tab: TaskTab = activeTab.value) {
  if (tab === 'all') return true;
  if (tab === 'pending') return ['pending', 'in-progress'].includes(task.status) && task.assignees.includes(currentTaskUser);
  if (tab === 'processed') return task.records.some(record => record.operator === currentTaskUser && ['execute', 'approve', 'reject', 'return', 'finish', 'transfer'].includes(record.action));
  if (tab === 'created') return task.creator === currentTaskUser;
  if (tab === 'copied') return task.copiedUsers.includes(currentTaskUser);
  return false;
}

/** 页签计数取自实际数据，避免出现与列表对不上的固定数字 */
const tabCounts = computed(() => Object.fromEntries(
  TAB_KEYS.map((key) => [key, taskRecords.filter((task) => matchesTab(task, key)).length]),
) as Record<TaskTab, number>);

const tabs = computed(() => TAB_KEYS.map((key) => ({ key, label: t(`tasks.tabs.${key}`), count: tabCounts.value[key] })));

/* ------------------------------------------------------------------ 筛选 */

const FILTER_KEYS = ['taskId', 'name', 'status', 'priority', 'sourceApp', 'targetApp', 'project', 'vehicle', 'createdRange', 'updatedRange'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

interface TaskFilters {
  name: string; taskId: string; status: string; priority: string; sourceApp: string; targetApp: string;
  project: string; vehicle: string; createdRange: string[]; updatedRange: string[];
}

const emptyFilters = (): TaskFilters => ({
  name: '', taskId: '', status: '', priority: '', sourceApp: '', targetApp: '', project: '', vehicle: '', createdRange: [], updatedRange: [],
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
  disabled: setting.key === 'taskId',
})));

/** 气泡内每次勾选、拖拽或恢复默认都会带着完整的新顺序回来，直接整体替换 */
function updateFilterSettings(items: ColumnSettingsItem[]) {
  filterSettings.value = items.map((item) => ({ key: item.key as FilterKey, visible: item.visible }));
}

const statusOptions = computed(() => Object.keys(taskStatusLabels).filter((value) => value !== 'rejected').map((value) => ({ value, label: t(`tasks.statuses.${value}`) })));
const priorityOptions = computed(() => Object.keys(taskPriorityLabels).map((value) => ({ value, label: t(`tasks.priorities.${value}`) })));
const appOptions = computed(() => APP_CODES.map((code) => ({ value: code, label: appLabel(code) })));
const projectOptions = computed(() => PROJECT_CODES.map((code) => ({ value: code, label: projectLabel(code) })));
const vehicleSelectOptions = computed(() => vehicleOptions.map((value) => ({ value, label: value })));

function filterLabel(key: FilterKey) {
  if (key === 'createdRange') return t('tasks.fields.createdAt');
  if (key === 'updatedRange') return t('tasks.fields.updatedAt');
  return t(`tasks.fields.${key}`);
}

/** 演示“当前时间”锚点：所有逾期判断与逾期天数都基于同一锚点，避免与真实系统时间耦合。 */
const TASK_NOW = new Date().toISOString().slice(0, 10);

function isOverdue(task: TaskRecord) {
  return !['completed', 'recalled', 'cancelled'].includes(task.status) && Boolean(task.deadline) && task.deadline.slice(0, 10) < TASK_NOW;
}

/** 已逾期天数：锚点减去截止时间，向下取整到整天；非逾期返回 0。 */
function overdueDays(task: TaskRecord) {
  if (!isOverdue(task)) return 0;
  const deadline = new Date(task.deadline.replace(/-/g, '/'));
  const now = new Date(TASK_NOW.replace(/-/g, '/'));
  return Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / 86400000));
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
    if (filters.taskId && !task.id.toLowerCase().includes(filters.taskId.trim().toLowerCase())) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.sourceApp && task.sourceApp !== filters.sourceApp) return false;
    if (filters.targetApp && task.targetApp !== filters.targetApp) return false;
    if (filters.project && !projectLabel(task.project).toLowerCase().includes(filters.project.toLowerCase())) return false;
    if (filters.vehicle && !task.vehicle.toLowerCase().includes(filters.vehicle.toLowerCase())) return false;
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

type ChipKey = 'name' | 'taskId' | 'status' | 'priority' | 'sourceApp' | 'targetApp' | 'project' | 'vehicle' | 'createdRange' | 'updatedRange';

const activeFilterChips = computed(() => {
  const chips: { key: ChipKey; label: string }[] = [];
  const add = (key: ChipKey, field: string, value: string) => chips.push({ key, label: t('tasks.filters.chip', { field, value }) });
  const filters = appliedFilters.value;
  const rangeText = (range: string[]) => (range.length === 2 && range[0] && range[1] ? `${range[0].slice(0, 10)} ~ ${range[1].slice(0, 10)}` : '');

  if (filters.name) add('name', t('tasks.fields.name'), filters.name);
  if (filters.taskId) add('taskId', t('tasks.fields.taskId'), filters.taskId);
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
    case 'taskId': appliedFilters.value.taskId = ''; draftFilters.taskId = ''; break;
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

/** 可配置字段；操作列是固定列，不在列设置中、不可隐藏或排序（DESIGN.md · 列设置 Scope）。 */
const COLUMN_KEYS = ['taskId', 'name', 'status', 'priority', 'createdAt', 'updatedAt', 'sourceApp', 'targetApp', 'project', 'vehicle'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

interface ColumnSetting { key: ColumnKey; visible: boolean }

const defaultColumnSettings: ColumnSetting[] = COLUMN_KEYS.map((key) => ({ key, visible: true }));
const columnSettings = ref<ColumnSetting[]>(defaultColumnSettings.map((setting) => ({ ...setting })));
const columnSettingsVisible = ref(false);

const COLUMN_META: Record<ColumnKey, { width: number; slotName?: string; sortable: boolean; fixed?: 'left' | 'right'; dataIndex?: string }> = {
  name: { width: 210, slotName: 'name', sortable: true },
  status: { width: 96, slotName: 'status', sortable: true },
  priority: { width: 96, slotName: 'priority', sortable: true },
  createdAt: { width: 164, sortable: true },
  updatedAt: { width: 164, sortable: true },
  sourceApp: { width: 110, slotName: 'sourceApp', sortable: true },
  targetApp: { width: 110, slotName: 'targetApp', sortable: true },
  project: { width: 144, slotName: 'project', sortable: true },
  vehicle: { width: 110, slotName: 'vehicle', sortable: true },
  taskId: { width: 140, fixed: 'left', sortable: true, dataIndex: 'id' },
};

/** 恒为最后一列、右侧固定；不参与列设置的显隐与拖拽排序。 */
const ACTION_COLUMN = { width: 168, slotName: 'actions', fixed: 'right' } as const;

function columnLabel(key: ColumnKey) { return t(`tasks.fields.${key}`); }

const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map((setting) => ({
  key: setting.key,
  label: columnLabel(setting.key),
  visible: setting.visible,
  // 主识别字段常驻：隐藏后列表无法区分记录，也不能被拖到其它字段之后
  disabled: setting.key === 'taskId',
})));

const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map((setting) => ({
  key: setting.key,
  label: columnLabel(setting.key),
  visible: setting.visible,
  disabled: setting.key === 'taskId',
})));

const tableColumns = computed<TableColumnData[]>(() => {
  const dataColumns = columnSettings.value
    .filter((setting) => setting.visible)
    .map((setting): TableColumnData => {
      const meta = COLUMN_META[setting.key];
      const column: TableColumnData = {
        title: columnLabel(setting.key),
        dataIndex: meta.dataIndex ?? setting.key,
        width: meta.width,
        align: 'left',
      };
      if (meta.slotName) column.slotName = meta.slotName;
      if (meta.fixed) column.fixed = meta.fixed;
      if (meta.sortable) column.sortable = { sortDirections: ['ascend', 'descend'], sorter: true };
      return column;
    });
  return [...dataColumns, {
    title: t('tasks.fields.actions'),
    slotName: ACTION_COLUMN.slotName,
    width: ACTION_COLUMN.width,
    fixed: ACTION_COLUMN.fixed,
    align: 'left',
  }];
});

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
    <section class="tasks-panel tasks-filter-panel">
      <div class="tasks-query-region">
      <a-tabs :active-key="activeTab" @change="handleTabChange">
        <a-tab-pane v-for="tab in tabs" :key="tab.key" :title="`${tab.label}(${tab.count})`" />
      </a-tabs>

      <div class="tasks-query">
          <label
            v-for="setting in visibleFilterSettings"
            :key="setting.key"
            class="filter-field"
            :class="{ 'filter-field--range': setting.key === 'createdRange' || setting.key === 'updatedRange' }"
          >
            <span class="app-field-label">{{ filterLabel(setting.key) }}</span>
            <a-input v-if="setting.key === 'name'" v-model="draftFilters.name" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.input')" @press-enter="applyFilters" />
            <a-input v-else-if="setting.key === 'taskId'" v-model="draftFilters.taskId" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.input')" @press-enter="applyFilters" />
            <a-select v-else-if="setting.key === 'status'" v-model="draftFilters.status" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="statusOptions" />
            <a-select v-else-if="setting.key === 'priority'" v-model="draftFilters.priority" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="priorityOptions" />
            <a-select v-else-if="setting.key === 'sourceApp'" v-model="draftFilters.sourceApp" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="appOptions" />
            <a-select v-else-if="setting.key === 'targetApp'" v-model="draftFilters.targetApp" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.all')" :options="appOptions" />
            <a-input v-else-if="setting.key === 'project'" v-model="draftFilters.project" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.input')" @press-enter="applyFilters" />
            <a-input v-else-if="setting.key === 'vehicle'" v-model="draftFilters.vehicle" class="app-filter-control" allow-clear :placeholder="t('tasks.filters.input')" @press-enter="applyFilters" />
            <a-range-picker v-else-if="setting.key === 'createdRange'" v-model="draftFilters.createdRange" class="app-filter-control" :placeholder="[t('tasks.filters.startDate'), t('tasks.filters.endDate')]" />
            <a-range-picker v-else v-model="draftFilters.updatedRange" class="app-filter-control" :placeholder="[t('tasks.filters.startDate'), t('tasks.filters.endDate')]" />
          </label>
        <div class="tasks-query-actions">
          <a-button type="primary" @click="applyFilters"><template #icon><IconSearch /></template>{{ t('tasks.filters.search') }}</a-button>
          <a-button class="app-btn-neutral" @click="resetFilters"><template #icon><IconRefresh /></template>{{ t('tasks.filters.reset') }}</a-button>

          <ColumnSettingsPopover
            v-model:visible="filterSettingsVisible"
            :items="filterSettingsItems"
            :default-items="defaultFilterSettings.map((setting) => ({ key: setting.key, label: filterLabel(setting.key), visible: setting.visible, disabled: setting.key === 'taskId' }))"
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

      </div>
    </section>

    <section class="tasks-panel tasks-list-panel">
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
            <a-tooltip :content="t('tasks.columns.settings')"><a-button class="column-settings-trigger" :aria-label="t('tasks.columns.settings')" @click="columnSettingsVisible = true"><IconSettings /></a-button></a-tooltip>
          </ColumnSettingsPopover>
      </div>

      <a-table
        :columns="tableColumns"
        :data="pagedTasks"
        :pagination="false"
        :scroll="{ x: 1512 }"
        row-key="id"
        @sorter-change="handleSort"
      >
        <template #name="{ record }">
          <span class="task-name-cell">
            <button class="table-link" type="button" @click="openDetail(record)">{{ taskText(record, 'name') }}</button>
            <a-tag class="task-overdue-tag" v-if="isOverdue(record)" size="small" color="red">{{ t('tasks.actions.overdue', { day: overdueDays(record) }) }}</a-tag>
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
            <a-link v-if="isActiveTask(record)" @click="executeTask(record)">{{ t('tasks.actions.execute') }}</a-link>
            <a-link v-else-if="canDeleteTask(record)" status="danger" @click="requestListAction(record, 'delete')">{{ t('tasks.actions.delete') }}</a-link>
            <a-dropdown v-if="isActiveTask(record)" :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow>
              <button type="button" class="tasks-row-more" :aria-label="t('tasks.actions.more')" :title="t('tasks.actions.more')"><IconMore :size="16" /></button>
              <template #content><a-doption class="row-more-danger" @click="requestListAction(record, 'cancel')">{{ t('tasks.actions.cancel') }}</a-doption></template>
            </a-dropdown>
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
            <a-option v-for="size in [10, 50, 100, 500]" :key="size" :value="size">{{ t('tasks.pagination.perPage', { count: size }) }}</a-option>
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

    <ConfirmDialog v-model:visible="listConfirmVisible" icon="warning" :title="t(listAction === 'cancel' ? 'tasks.detail.cancelConfirmTitle' : 'tasks.detail.deleteConfirmTitle', { name: actionTask?.name ?? '' })" :description="t(listAction === 'cancel' ? 'tasks.detail.cancelMessage' : 'tasks.detail.deleteMessage')" :ok-text="t(listAction === 'cancel' ? 'tasks.actions.cancel' : 'tasks.actions.delete')" @confirm="confirmListAction" />
    <!-- 新建任务抽屉：1:1 复刻「功能数据安全合规自评」项目的 CreateTaskDrawer -->
    <CreateTaskDrawer
      v-model:visible="createVisible"
      @created="onTaskCreated"
      @edit-orchestration="onEditOrchestration"
    />
  </main>
</template>

<style scoped>
.tasks-page { min-height: calc(100dvh - 88px); padding: 0; background: var(--mt-fill-1); }
.tasks-panel { min-height: calc(100dvh - 88px); padding: 0 16px 16px; background: var(--color-bg-2); }

/* 页签：贴在下边框上，不额外制造间距 */
.tasks-panel :deep(.arco-tabs-nav) { margin-bottom: 0; }
.tasks-panel :deep(.arco-tabs-content) { padding-top: 0; }
.tasks-panel :deep(.arco-tabs-nav::before) { background: var(--app-divider); }

/* 查询区（2026-11-09 用户裁决）：字段名在上、控件在下，12px / 4px / 左对齐 / 200px；
   条件与查询/重置/筛选设置统一 16px 栅栏换行分布，按钮紧跟最后一个条件右侧且左对齐 */
.tasks-query { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--mt-ds-space-4); padding: var(--mt-ds-space-4) 0; }
.filter-field { display: grid; grid-template-columns: minmax(0, var(--mt-ds-filter-width)); align-items: start; justify-items: start; gap: var(--mt-ds-space-1); min-width: 0; color: var(--color-text-2); }
.filter-field > span.app-field-label { font-size: var(--mt-ds-font-caption); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-caption); text-align: left; padding: 0; white-space: nowrap; }
.filter-field :deep(.app-filter-control) { width: var(--mt-ds-filter-width); max-width: 100%; }
.filter-field :deep(.app-filter-control.arco-select) { flex: 0 0 var(--mt-ds-filter-width); }
.filter-field :deep(.app-filter-control.arco-input-wrapper),
.filter-field :deep(.app-filter-control.arco-select-view),
.filter-field :deep(.app-filter-control .arco-select-view) { background: var(--app-surface); border-color: var(--app-control-border); }
.filter-field :deep(.app-filter-control.arco-input-wrapper:hover),
.filter-field :deep(.app-filter-control.arco-select-view:hover),
.filter-field :deep(.app-filter-control .arco-select-view:hover) { background: var(--app-surface); border-color: var(--app-control-border); }
.filter-field :deep(.app-filter-control.arco-input-wrapper:focus-within),
.filter-field :deep(.app-filter-control.arco-select-view:focus-within),
.filter-field :deep(.app-filter-control .arco-select-view:focus-within) { background: var(--app-surface); border-color: var(--app-color-primary); }
/* 筛选条件 select 的占位提示语「全部」按规范使用正文黑色（color-text-1），而非浏览器默认灰占位色 */
.filter-field :deep(.app-filter-control .arco-select-view-input::placeholder) { color: var(--color-text-1); }
.tasks-query-actions { display: flex; align-items: center; gap: var(--mt-ds-space-4); margin-left: 0; }
.icon-button { width: 32px; height: 32px; padding: 0; }

.tasks-applied { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0 0 12px; }

.tasks-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 0 12px; }
.column-settings-trigger { width: 32px; height: 32px; padding: 0; }

/* 数据列表：白底、无外框、无斑马纹、行间单线分隔 */
.tasks-panel :deep(.arco-table) { border: 0; }
.tasks-panel :deep(.arco-table-container) { border: 0; }
.tasks-panel :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); white-space: nowrap; }
.tasks-panel :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); background: var(--app-surface); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); white-space: nowrap; }
.tasks-panel :deep(.arco-table-th), .tasks-panel :deep(.arco-table-td) { text-align: left; }
.tasks-panel :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }

.task-name-cell { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.table-link { max-width: 100%; overflow: hidden; padding: 0; border: 0; color: var(--color-text-1); background: transparent; cursor: pointer; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.table-link:hover, .table-link:focus-visible { color: var(--app-color-primary); }
.table-actions { display: flex; align-items: center; gap: var(--mt-ds-space-3); }
.table-actions :deep(.arco-link) { font-weight: var(--mt-ds-weight-body); }
.tasks-row-more { display: inline-grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; border-radius: var(--mt-ds-control-radius); background: transparent; color: var(--color-text-3); cursor: pointer; }
.tasks-row-more:hover { background: var(--color-fill-1); color: var(--color-text-2); }
.tasks-row-more:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }

.tasks-empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; }
.tasks-empty :deep(.arco-empty-description) { color: var(--color-text-3); font-size: 20px; font-weight: 400; line-height: 28px; }

/* 列表页脚：总条数 → 每页条数 → 翻页 → 跳转，整体右对齐。
   控件表面（白底 / Border-3 描边 / 禁用灰）统一在 global.css 的 .app-pagination 里，两块列表页共用。 */
.tasks-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; color: var(--color-text-2); }
.pagination-total { margin-right: 8px; color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.pagination-pages { display: flex; align-items: center; gap: 8px; margin-right: 8px; }
.pagination-jump-label, .pagination-total-pages { color: var(--color-text-3); font-size: 14px; line-height: 22px; }

/* 新建任务抽屉的字段、上传区与流程预览样式已随 1:1 复刻迁移到 components/CreateTaskDrawer.vue */

@media (max-width: 720px) {
  .tasks-page { padding: 0; }
  .tasks-toolbar { align-items: flex-start; flex-direction: column; }
  .tasks-pagination { justify-content: flex-start; }
  .pagination-total { width: 100%; margin-right: 0; }
}
/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry）。 */
@media (max-width: 760px) {
  .tasks-query { align-items: stretch; }
  .filter-field { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .filter-field :deep(.app-filter-control), .filter-field :deep(.app-filter-control.arco-select) { width: 100%; flex: 1 1 auto; }
}
</style>

<style scoped>
.tasks-query-region { margin-bottom: 16px; border-bottom: 1px solid var(--app-divider); }
</style>

<style scoped>
.tasks-page { display: flex; flex-direction: column; gap: 12px; }
.tasks-panel { min-height: 0; }
.tasks-query-region { margin-bottom: 0; border-bottom: 0; }
.tasks-filter-panel { padding-bottom: 0; }
.tasks-list-panel { padding-top: 16px; }
</style>

<style scoped>
.column-settings-trigger, .icon-button { background: transparent; border: 1px solid var(--app-control-border); }
.tasks-toolbar .column-settings-trigger { margin-left: auto; }
.task-name-cell :deep(.task-overdue-tag) { width: max-content; flex: 0 0 auto; white-space: nowrap; }
@media (max-width: 720px) {
  .tasks-toolbar { flex-direction: row; align-items: center; }
}
</style>
