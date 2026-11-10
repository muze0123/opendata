<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message, type TableColumnData } from '@arco-design/web-vue';
import {
  IconPlus, IconSearch, IconDownload, IconUpload, IconMore, IconFilter, IconSettings, IconRefresh, IconLeft, IconRight,
} from '@arco-design/web-vue/es/icon';
import { useUserStore } from '../stores/users';
import { useDepartmentStore } from '../stores/departments';
import { useLocaleStore } from '../../../app/stores/locale';
import {
  buildDepartmentTree,
  collectDepartmentSubtree,
  getRoleNames,
  roles,
  type Department,
  type DepartmentNode,
  type UserRecord,
} from '../data/users';
import { exportUsers } from '../data/workbook';
import UserFormDrawer from '../components/UserFormDrawer.vue';
import UserDetailDrawer from '../components/UserDetailDrawer.vue';
import DepartmentFormDrawer from '../components/DepartmentFormDrawer.vue';
import ImportDrawer from '../components/ImportDrawer.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import RoleList from '../components/RoleList.vue';
import ColumnSettingsPopover from '../../../shared/components/ColumnSettingsPopover.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';

const { t } = useI18n();
const store = useUserStore();
const deptStore = useDepartmentStore();
const localeStore = useLocaleStore();
const locale = localeStore.locale === 'en-US' ? 'en-US' : 'zh-CN';

/* ----------------------------- 组织架构（部门树 + 三个点菜单） ----------------------------- */
const expandedKeys = ref<string[]>(deptStore.departments.map((d) => d.id));
const deptTreeData = computed<DepartmentNode[]>(() => buildDepartmentTree(deptStore.departments));

function expandAll() {
  expandedKeys.value = deptStore.departments.map((d) => d.id);
}
function collapseAll() {
  expandedKeys.value = [];
}
/** 选中部门（同时用于成员筛选与部门菜单的操作对象）。 */
const deptId = ref<string | null>(null);
const selectedIsRoot = computed(() => deptId.value === deptStore.rootId);
const deptEditDisabled = computed(() => !deptId.value || selectedIsRoot.value);
const deptDeleteDisabled = computed(() => !deptId.value || selectedIsRoot.value);
const companyName = computed(() => deptStore.nameOf(deptStore.rootId));
const companyDepartmentIds = computed(() => new Set(deptStore.subtreeIds(deptStore.rootId)));
const companyMembers = computed(() => store.users.filter((user) => companyDepartmentIds.value.has(user.deptId)));
const currentDepartmentMembers = computed(() => deptId.value
  ? store.users.filter((user) => user.deptId === deptId.value)
  : store.users.filter((user) => user.deptId === deptStore.rootId));
/** 右侧区块标题：选中部门时显示部门名称，否则显示公司根节点名称。 */
const headingName = computed(() => (deptId.value ? deptStore.nameOf(deptId.value) : companyName.value));
const scope = ref<'all' | 'direct'>('all');

/* 筛选字段的可见性与顺序（「筛选设置」气泡，DESIGN.md · List settings popover）
   默认只显示「数据范围」，角色与状态默认收起，需要时从筛选设置里勾选（用户裁决 2026-11-06）。 */
type FilterKey = 'scope' | 'role' | 'status' | 'createdBy' | 'createdAt';
const FILTER_FIELD_KEYS: FilterKey[] = ['scope', 'role', 'status', 'createdBy', 'createdAt'];
const FILTER_DEFAULT_VISIBLE: Record<FilterKey, boolean> = {
  scope: true, role: false, status: false, createdBy: false, createdAt: false,
};
const filterSettingsVisible = ref(false);
const filterOrder = ref<FilterKey[]>([...FILTER_FIELD_KEYS]);
const filterVisible = ref<Record<FilterKey, boolean>>({ ...FILTER_DEFAULT_VISIBLE });
const visibleFilters = computed<FilterKey[]>(() => filterOrder.value.filter((key) => filterVisible.value[key]));

/* 表格列的可见性与顺序（「列设置」气泡）；操作列固定、不进入列设置 */
const columnSettingsVisible = ref(false);
const COLUMN_LABEL_KEY: Record<string, string> = {
  account: 'account', name: 'user', deptId: 'department', roleIds: 'role', email: 'email', phone: 'phone', enabled: 'status', createdBy: 'createdBy', createdAt: 'createdAt',
};
/** 默认列顺序按参考稿：姓名、登录账号、部门、角色、邮箱、手机号、状态、操作。
    创建人 / 创建时间保留在列设置里，默认隐藏。 */
const COLUMN_DEFAULT_ORDER = ['name', 'account', 'deptId', 'roleIds', 'email', 'phone', 'enabled', 'createdBy', 'createdAt'];
const columnOrder = ref<string[]>([...COLUMN_DEFAULT_ORDER]);
const columnVisible = ref<Record<string, boolean>>({ account: true, name: true, deptId: true, roleIds: true, email: true, phone: true, enabled: true, createdBy: false, createdAt: false });

interface SettingsItem { key: string; label: string; visible: boolean; disabled?: boolean; }

function columnLabel(key: string) {
  return t(`userManagement.columns.${COLUMN_LABEL_KEY[key] ?? 'user'}`);
}
function filterLabel(key: FilterKey) {
  return t(`userManagement.toolbar.${key}`);
}

const columnSettingItems = computed<SettingsItem[]>(() =>
  columnOrder.value.map((key) => ({ key, label: columnLabel(key), visible: columnVisible.value[key], disabled: key === 'name' })),
);
const columnDefaultItems = computed<SettingsItem[]>(() =>
  COLUMN_DEFAULT_ORDER.map((key) => ({ key, label: columnLabel(key), visible: key !== 'createdBy' && key !== 'createdAt', disabled: key === 'name' })),
);
function onColumnSettingsChange(items: SettingsItem[]) {
  columnOrder.value = items.map((item) => item.key);
  const next: Record<string, boolean> = {};
  for (const item of items) next[item.key] = item.visible;
  columnVisible.value = next;
}

const filterSettingItems = computed<SettingsItem[]>(() => [
  { key: 'keyword', label: t('userManagement.toolbar.keyword'), visible: true, disabled: true },
  ...filterOrder.value.map((key) => ({ key, label: filterLabel(key), visible: filterVisible.value[key] })),
]);
const filterDefaultItems = computed<SettingsItem[]>(() => [
  { key: 'keyword', label: t('userManagement.toolbar.keyword'), visible: true, disabled: true },
  ...FILTER_FIELD_KEYS.map((key) => ({ key, label: filterLabel(key), visible: FILTER_DEFAULT_VISIBLE[key] })),
]);
function onFilterSettingsChange(items: SettingsItem[]) {
  const order: FilterKey[] = [];
  const next: Record<FilterKey, boolean> = {
    scope: false, role: false, status: false, createdBy: false, createdAt: false,
  };
  for (const item of items) {
    if (item.key === 'keyword') continue;
    const key = item.key as FilterKey;
    order.push(key);
    next[key] = item.visible;
  }
  filterOrder.value = order;
  filterVisible.value = next;
  // 隐藏某项筛选条件时，同步清空其草稿值与已应用值，避免「看不见却仍在生效」的隐式过滤
  const d: FilterDraft = { ...draft.value, createdAt: [...draft.value.createdAt] };
  const a: FilterDraft = { ...applied.value, createdAt: [...applied.value.createdAt] };
  let changed = false;
  if (!next.role && (d.roleId || a.roleId)) { d.roleId = ''; a.roleId = ''; changed = true; }
  if (!next.status && (d.status || a.status)) { d.status = ''; a.status = ''; changed = true; }
  if (!next.createdBy && (d.createdBy || a.createdBy)) { d.createdBy = ''; a.createdBy = ''; changed = true; }
  if (!next.createdAt && (d.createdAt.length || a.createdAt.length)) { d.createdAt = []; a.createdAt = []; changed = true; }
  if (changed) {
    draft.value = d;
    applied.value = a;
    setPage(1);
  }
}

const addDeptLabel = computed(() =>
  deptId.value && !selectedIsRoot.value
    ? t('userManagement.department.addChild')
    : t('userManagement.department.add'),
);

/* ----------------------------- 部门表单抽屉 ----------------------------- */
const deptFormVisible = ref(false);
const deptFormMode = ref<'add' | 'edit'>('add');
const deptFormTarget = ref<Department | null>(null);
const deptFormParent = ref<string | null>(null);
const deptFormExclude = ref<string[]>([]);

function openAddDept() {
  deptFormMode.value = 'add';
  deptFormTarget.value = null;
  deptFormParent.value = deptId.value ?? deptStore.rootId;
  deptFormExclude.value = [];
  deptFormVisible.value = true;
}
function openEditDept() {
  if (!deptId.value || selectedIsRoot.value) return;
  const d = deptStore.getById(deptId.value);
  if (!d) return;
  deptFormMode.value = 'edit';
  deptFormTarget.value = d;
  deptFormParent.value = d.parent;
  deptFormExclude.value = deptStore.subtreeIds(d.id);
  deptFormVisible.value = true;
}
function onDeptSaved() {
  // 部门树随 deptStore 响应式更新，无需额外处理
}

/* ----------------------------- 部门删除守卫 ----------------------------- */
const deptDeleteVisible = ref(false);
const deptBlockedVisible = ref(false);
const deptBlockedMessage = ref('');
const deptDeleteInfo = ref<{ name: string; count: number }>({ name: '', count: 0 });
function openDeleteDept() {
  if (!deptId.value || selectedIsRoot.value) return;
  const d = deptStore.getById(deptId.value);
  if (!d) return;
  const subtree = deptStore.subtreeIds(d.id);
  const memberCount = store.users.filter((u) => subtree.includes(u.deptId)).length;
  if (memberCount > 0) {
    deptBlockedMessage.value = t('userManagement.department.deleteBlocked', { name: d.name, count: memberCount });
    deptBlockedVisible.value = true;
    return;
  }
  deptDeleteInfo.value = { name: d.name, count: subtree.length - 1 };
  deptDeleteVisible.value = true;
}
function confirmDeleteDept() {
  if (!deptId.value) return;
  const removed = new Set(deptStore.subtreeIds(deptId.value));
  deptStore.removeDepartment(deptId.value);
  if (removed.has(deptId.value)) deptId.value = null;
  Message.success(t('userManagement.department.deleted'));
  deptDeleteVisible.value = false;
}

/* ----------------------------- 筛选（草稿 → 应用） ----------------------------- */
type FilterDraft = {
  keyword: string;
  roleId: string;
  status: '' | 'enabled' | 'disabled';
  createdBy: string;
  createdAt: string[];
};
const blankFilter: FilterDraft = { keyword: '', roleId: '', status: '', createdBy: '', createdAt: [] };
const draft = ref<FilterDraft>({ ...blankFilter });
const applied = ref<FilterDraft>({ ...blankFilter });

/** 创建人候选项：取成员记录里出现过的创建人（与审计页的 actor 下拉同一口径）。 */
const creatorOptions = computed(() =>
  Array.from(new Set(store.users.map((user) => user.createdBy).filter(Boolean))).sort(),
);

const hasAppliedFilters = computed(
  () =>
    Boolean(applied.value.keyword.trim()) ||
    Boolean(applied.value.roleId) ||
    Boolean(applied.value.status) ||
    Boolean(applied.value.createdBy) ||
    applied.value.createdAt.length > 0 ||
    Boolean(deptId.value),
);

function applyFilters() {
  applied.value = { ...draft.value, createdAt: [...draft.value.createdAt] };
  setPage(1);
}
function resetFilters() {
  draft.value = { ...blankFilter, createdAt: [] };
  applied.value = { ...blankFilter, createdAt: [] };
  scope.value = 'all';
  deptId.value = null;
  setPage(1);
}
function onDeptSelect(keys: (string | number)[]) {
  deptId.value = keys.length ? String(keys[0]) : null;
  setPage(1);
}
function onDeptExpand(keys: (string | number)[]) {
  expandedKeys.value = keys.map(String);
}
function openNodeMenu(id: string) {
  deptId.value = id;
  setPage(1);
}
function clearDept() {
  deptId.value = null;
  setPage(1);
}

/* ----------------------------- 过滤结果 ----------------------------- */
const filteredUsers = computed<UserRecord[]>(() => {
  const keyword = applied.value.keyword.trim().toLowerCase();
  const roleId = applied.value.roleId;
  const status = applied.value.status;
  const creator = applied.value.createdBy;
  const [dateFrom, dateTo] = applied.value.createdAt;
  const subtree = deptId.value ? collectDepartmentSubtree(deptId.value) : null;
  return store.users.filter((user) => {
    if (keyword) {
      const haystack = `${user.name} ${user.account} ${user.phone} ${user.email}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (roleId && !user.roleIds.includes(roleId)) return false;
    if (status === 'enabled' && !user.enabled) return false;
    if (status === 'disabled' && user.enabled) return false;
    if (creator && user.createdBy !== creator) return false;
    if (dateFrom && dateTo) {
      const day = user.createdAt.slice(0, 10);
      if (day < dateFrom || day > dateTo) return false;
    }
    if (subtree && (scope.value === 'direct' ? user.deptId !== deptId.value : !subtree.includes(user.deptId))) return false;
    return true;
  });
});

/* ----------------------------- 分页（沿用审计列表契约） ----------------------------- */
const page = ref(1);
const pageSize = ref(10);
const jumpPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)));
const pagedUsers = computed(() =>
  filteredUsers.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
const pageNumbers = computed(() => {
  const windowSize = Math.min(totalPages.value, 5);
  const start = Math.min(Math.max(page.value - Math.floor(windowSize / 2), 1), totalPages.value - windowSize + 1);
  return Array.from({ length: windowSize }, (_, index) => start + index);
});
function setPage(value: number) {
  page.value = Math.min(Math.max(value, 1), totalPages.value);
  jumpPage.value = page.value;
}
function goToJumpPage() {
  setPage(Number(jumpPage.value));
}
function handlePageSizeChange(value: unknown) {
  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0) return;
  pageSize.value = next;
  setPage(1);
}

/* ----------------------------- 选择 / 批量 ----------------------------- */
const selectedKeys = ref<string[]>([]);
const selectedUsers = computed(() => store.users.filter((u) => selectedKeys.value.includes(u.id)));

function handleSelectionChange(keys: (string | number)[]) {
  selectedKeys.value = keys.map(String);
}
function clearSelection() {
  selectedKeys.value = [];
}
/** 返回选中项中属于超级管理员（不可操作）的数量。 */
function selectedOwnerCount(): number {
  return selectedUsers.value.filter((u) => u.owner).length;
}
function notifyOwnerSkipped() {
  const skipped = selectedOwnerCount();
  if (skipped > 0) {
    Message.info(t('userManagement.toolbar.ownerSkipped', { count: skipped }));
  }
}
function batchEnable() {
  if (!selectedKeys.value.length) return;
  store.setEnabled(selectedKeys.value, true);
  Message.success(t('userManagement.toolbar.batchEnabled', { count: selectedKeys.value.length - selectedOwnerCount() }));
  notifyOwnerSkipped();
  clearSelection();
}
function batchDisable() {
  if (!selectedKeys.value.length) return;
  store.setEnabled(selectedKeys.value, false);
  Message.success(t('userManagement.toolbar.batchDisabled', { count: selectedKeys.value.length - selectedOwnerCount() }));
  notifyOwnerSkipped();
  clearSelection();
}
function confirmDeleteSelected() {
  const targets = selectedUsers.value.filter((u) => !u.owner);
  if (!targets.length) return;
  deleteTargets.value = targets;
  deleteVisible.value = true;
}

/* ----------------------------- 行操作 ----------------------------- */
function openDetail(user: UserRecord) {
  detailUser.value = user;
  detailVisible.value = true;
}
function openEdit(user: UserRecord) {
  /** 超级管理员（owner）不提供编辑入口，这里再兜一层，防止从详情等旁路进入。 */
  if (user.owner) return;
  formMode.value = 'edit';
  formUser.value = user;
  formVisible.value = true;
}
function onDetailEdit() {
  if (!detailUser.value) return;
  detailVisible.value = false;
  openEdit(detailUser.value);
}
function onToggleStatus(user: UserRecord, value: boolean) {
  if (user.owner) return;
  store.setEnabled([user.id], value);
  Message.success(value ? t('userManagement.status.enabledToast') : t('userManagement.status.disabledToast'));
}
function confirmDeleteSingle(user: UserRecord) {
  if (user.owner) return;
  deleteTargets.value = [user];
  deleteVisible.value = true;
}
function onDeleteConfirm() {
  store.removeUsers(deleteTargets.value.map((u) => u.id));
  Message.success(t('userManagement.delete.success'));
  deleteTargets.value = [];
  deleteVisible.value = false;
  clearSelection();
}

/* ----------------------------- 重置密码 ----------------------------- */
const resetPasswordVisible = ref(false);
const resetPasswordUser = ref<UserRecord | null>(null);
function openResetPassword(user: UserRecord) {
  resetPasswordUser.value = user;
  resetPasswordVisible.value = true;
}
function confirmResetPassword() {
  const name = resetPasswordUser.value?.name ?? '';
  resetPasswordVisible.value = false;
  resetPasswordUser.value = null;
  Message.success(t('userManagement.resetPassword.success', { name }));
}

/* ----------------------------- 弹层状态 ----------------------------- */
const formVisible = ref(false);
const formMode = ref<'add' | 'edit'>('add');
const formUser = ref<UserRecord | null>(null);
const detailVisible = ref(false);
const detailUser = ref<UserRecord | null>(null);
const importVisible = ref(false);
const deleteVisible = ref(false);
const deleteTargets = ref<UserRecord[]>([]);
const exportVisible = ref(false);
const exporting = ref(false);

function openAdd() {
  formMode.value = 'add';
  formUser.value = null;
  formVisible.value = true;
}
function openImport() {
  importVisible.value = true;
}
async function handleExport() {
  if (!filteredUsers.value.length) {
    Message.info(t('userManagement.export.empty'));
    return;
  }
  exportVisible.value = true;
}
async function confirmExport() {
  exporting.value = true;
  try {
    await exportUsers(filteredUsers.value, locale);
    Message.success(t('userManagement.export.notice.created'));
    exportVisible.value = false;
  } catch {
    Message.error(t('userManagement.export.fail'));
  } finally {
    exporting.value = false;
  }
}

/* ----------------------------- 表格列 ----------------------------- */
const columnCatalog = computed<Record<string, TableColumnData>>(() => ({
  name: { title: t('userManagement.columns.user'), dataIndex: 'name', slotName: 'nameCell', width: 130, sortable: { sortDirections: ['ascend', 'descend'] } },
  account: { title: t('userManagement.columns.account'), dataIndex: 'account', slotName: 'accountCell', width: 150, sortable: { sortDirections: ['ascend', 'descend'] } },
  deptId: { title: t('userManagement.columns.department'), dataIndex: 'deptId', slotName: 'department', width: 150, sortable: { sortDirections: ['ascend', 'descend'] } },
  roleIds: { title: t('userManagement.columns.role'), dataIndex: 'roleIds', slotName: 'role', width: 180 },
  email: { title: t('userManagement.columns.email'), dataIndex: 'email', slotName: 'email', width: 150 },
  phone: { title: t('userManagement.columns.phone'), dataIndex: 'phone', slotName: 'phone', width: 120 },
  enabled: { title: t('userManagement.columns.status'), dataIndex: 'enabled', slotName: 'status', width: 100 },
  createdBy: { title: t('userManagement.columns.createdBy'), dataIndex: 'createdBy', width: 120 },
  createdAt: { title: t('userManagement.columns.createdAt'), dataIndex: 'createdAt', width: 160 },
}));
/** 只渲染可见列，操作列固定为最后一列（DESIGN.md · 列设置：操作列不参与配置）。 */
const columns = computed<TableColumnData[]>(() => {
  const list: TableColumnData[] = [];
  for (const key of columnOrder.value) {
    if (columnVisible.value[key]) list.push(columnCatalog.value[key]);
  }
  list.push({ title: t('userManagement.columns.actions'), dataIndex: 'id', slotName: 'actions', width: 120, align: 'left' });
  return list;
});

function deptNameById(id: string) {
  return deptStore.nameOf(id);
}
</script>

<template>
  <main class="um-page">
    <div class="um-split">
      <!-- 左侧：组织架构区块 -->
      <a-card class="um-org-card" :bordered="false">
        <div class="um-rail">
          <a-tree
            :data="deptTreeData"
            :field-names="{ key: 'id', title: 'name', children: 'children' }"
            :selected-keys="[deptId ?? deptStore.rootId]"
            :expanded-keys="expandedKeys"
            block-node
            class="um-tree"
            @select="onDeptSelect"
            @expand="onDeptExpand"
          >
            <template #title="node"><span :title="node.name" :class="{ 'um-root-title': String(node.id ?? node.key) === deptStore.rootId }">{{ node.name }}</span></template>
            <template #extra="node">
              <a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow>
                <button class="um-node-more" type="button" :aria-label="t('userManagement.department.menuAria')" @click.stop>
                  <IconMore :size="16" />
                </button>
                <template #content>
                  <a-doption v-if="String(node.id ?? node.key) !== deptStore.rootId" @click="openNodeMenu(String(node.id ?? node.key)); openEditDept()">{{ t('userManagement.department.edit') }}</a-doption>
                  <a-doption @click="deptId = String(node.id ?? node.key); openAddDept()">{{ t('userManagement.department.addChild') }}</a-doption>
                  <a-doption v-if="String(node.id ?? node.key) !== deptStore.rootId" class="row-more-danger" @click="openNodeMenu(String(node.id ?? node.key)); openDeleteDept()">{{ t('userManagement.department.delete') }}</a-doption>
                </template>
              </a-dropdown>
            </template>
          </a-tree>
        </div>
      </a-card>

      <!-- 右侧：成员列表 + 筛选区块 -->
      <a-card class="um-list-card" :bordered="false">
        <header class="um-company-heading">
          <div class="um-heading-main">{{ headingName }}</div>
          <span class="um-count-muted">{{ t('userManagement.summary.total', { count: companyMembers.length }) }}</span>
          <span class="um-count-muted">{{ t('userManagement.summary.direct', { count: currentDepartmentMembers.length }) }}</span>
        </header>

        <form class="um-toolbar" @submit.prevent="applyFilters">
          <div class="um-filter-unit um-filter-keyword">
            <label class="app-field-label" for="um-keyword">{{ t('userManagement.toolbar.keyword') }}</label>
            <a-input
              id="um-keyword"
              v-model="draft.keyword"
              :placeholder="t('userManagement.toolbar.searchPlaceholder')"
              allow-clear
              class="app-filter-control"
              @press-enter="applyFilters"
            >
              <template #prefix><IconSearch :size="16" /></template>
            </a-input>
          </div>

          <template v-for="field in visibleFilters" :key="field">
            <div v-if="field === 'scope'" class="um-filter-unit">
              <label class="app-field-label" for="um-scope">{{ t('userManagement.toolbar.scope') }}</label>
              <a-select id="um-scope" v-model="scope" class="app-filter-control" @change="setPage(1)">
                <a-option value="all">{{ t('userManagement.toolbar.allMembers') }}</a-option>
                <a-option value="direct">{{ t('userManagement.toolbar.directMembers') }}</a-option>
              </a-select>
            </div>
            <div v-else-if="field === 'role'" class="um-filter-unit">
              <label class="app-field-label" for="um-role">{{ t('userManagement.toolbar.role') }}</label>
              <a-select id="um-role" v-model="draft.roleId" :placeholder="t('userManagement.toolbar.all')" allow-clear class="app-filter-control">
                <a-option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-option>
              </a-select>
            </div>
            <div v-else-if="field === 'status'" class="um-filter-unit">
              <label class="app-field-label" for="um-status">{{ t('userManagement.toolbar.status') }}</label>
              <a-select id="um-status" v-model="draft.status" :placeholder="t('userManagement.toolbar.all')" allow-clear class="app-filter-control">
                <a-option value="enabled">{{ t('userManagement.status.enabled') }}</a-option>
                <a-option value="disabled">{{ t('userManagement.status.disabled') }}</a-option>
              </a-select>
            </div>
            <div v-else-if="field === 'createdBy'" class="um-filter-unit">
              <label class="app-field-label" for="um-created-by">{{ t('userManagement.toolbar.createdBy') }}</label>
              <a-select id="um-created-by" v-model="draft.createdBy" :placeholder="t('userManagement.toolbar.all')" allow-clear class="app-filter-control">
                <a-option v-for="creator in creatorOptions" :key="creator" :value="creator">{{ creator }}</a-option>
              </a-select>
            </div>
            <div v-else class="um-filter-unit">
              <label class="app-field-label" for="um-created-at">{{ t('userManagement.toolbar.createdAt') }}</label>
              <a-range-picker
                id="um-created-at"
                v-model="draft.createdAt"
                value-format="YYYY-MM-DD"
                :placeholder="[t('userManagement.toolbar.startDate'), t('userManagement.toolbar.endDate')]"
                class="app-filter-control"
              />
            </div>
          </template>

          <a-button type="primary" @click="applyFilters">
            <template #icon><IconSearch :size="16" /></template>
            {{ t('userManagement.toolbar.search') }}
          </a-button>
          <a-button class="app-btn-neutral" @click="resetFilters">
            <template #icon><IconRefresh :size="16" /></template>
            {{ t('userManagement.toolbar.reset') }}
          </a-button>

          <ColumnSettingsPopover
            v-model:visible="filterSettingsVisible"
            :items="filterSettingItems"
            :default-items="filterDefaultItems"
            :title="t('userManagement.toolbar.filterSettings')"
            :list-aria-label="t('userManagement.toolbar.filterSettings')"
            :show-label="t('userManagement.toolbar.show')"
            :restore-label="t('userManagement.toolbar.restoreDefaults')"
            @change="onFilterSettingsChange"
          >
            <a-button class="app-btn-neutral um-icon-trigger" :aria-label="t('userManagement.toolbar.filterSettings')" :title="t('userManagement.toolbar.filterSettings')">
              <IconFilter :size="16" />
            </a-button>
          </ColumnSettingsPopover>
        </form>

        <div class="um-action-row">
          <a-button type="primary" @click="openAdd"><template #icon><IconPlus :size="16" /></template>{{ t('userManagement.toolbar.add') }}</a-button>
          <a-button class="app-btn-neutral" @click="openImport"><template #icon><IconUpload :size="16" /></template>{{ t('userManagement.toolbar.import') }}</a-button>
          <div class="um-action-tools">
            <ColumnSettingsPopover
              v-model:visible="columnSettingsVisible"
              :items="columnSettingItems"
              :default-items="columnDefaultItems"
              :title="t('userManagement.toolbar.columnSettings')"
              :list-aria-label="t('userManagement.toolbar.columnSettings')"
              :show-label="t('userManagement.toolbar.show')"
              :restore-label="t('userManagement.toolbar.restoreDefaults')"
              @change="onColumnSettingsChange"
            >
              <a-button class="app-btn-neutral um-icon-trigger" :aria-label="t('userManagement.toolbar.columnSettings')" :title="t('userManagement.toolbar.columnSettings')">
                <IconSettings :size="16" />
              </a-button>
            </ColumnSettingsPopover>
          </div>
        </div>

        <!-- 批量操作条 -->
        <div v-if="selectedKeys.length" class="um-batch">
          <span class="um-batch-count">{{ t('userManagement.toolbar.selected', { count: selectedKeys.length }) }}</span>
          <div class="um-batch-actions">
            <a-button class="app-btn-neutral" size="small" @click="batchEnable">{{ t('userManagement.toolbar.batchEnable') }}</a-button>
            <a-button class="app-btn-neutral" size="small" @click="batchDisable">{{ t('userManagement.toolbar.batchDisable') }}</a-button>
            <a-button class="app-btn-neutral" size="small" status="danger" @click="confirmDeleteSelected">{{ t('userManagement.toolbar.batchDelete') }}</a-button>
          </div>
          <button type="button" class="um-batch-clear" @click="clearSelection">{{ t('userManagement.toolbar.clearSelection') }}</button>
        </div>

        <!-- 表格 -->
        <div v-if="filteredUsers.length" class="um-table-scroll">
        <a-table
          v-if="filteredUsers.length"
          :columns="columns"
          :data="pagedUsers"
          :row-key="'id'"
          :pagination="false"
          :bordered="false"
          :stripe="false"
          class="um-table"
          @selection-change="handleSelectionChange"
        >
          <template #nameCell="{ record }">
            <div class="um-name-cell">
              <a-avatar :size="24" class="um-avatar">{{ (record as UserRecord).name.slice(0, 1) }}</a-avatar>
              <button type="button" class="um-link" @click="openDetail(record as UserRecord)">{{ (record as UserRecord).name }}</button>
            </div>
          </template>
          <template #accountCell="{ record }">
            <span class="um-cell-text">{{ (record as UserRecord).account }}</span>
          </template>
          <template #email="{ record }">
            <span class="um-cell-text">{{ (record as UserRecord).email || '—' }}</span>
          </template>
          <template #phone="{ record }">
            <span class="um-cell-text">{{ (record as UserRecord).phone || '—' }}</span>
          </template>
          <template #department="{ record }">
            {{ deptNameById((record as UserRecord).deptId) }}
          </template>
          <template #role="{ record }">
            <RoleList
              v-if="(record as UserRecord).roleIds.length"
              :names="getRoleNames((record as UserRecord).roleIds)"
            />
            <span v-else>—</span>
          </template>
          <template #status="{ record }">
            <a-switch
              :model-value="(record as UserRecord).enabled"
              :disabled="(record as UserRecord).owner"
              :aria-label="t('userManagement.status.control', { name: (record as UserRecord).name })"
              @change="(value: unknown) => onToggleStatus(record as UserRecord, Boolean(value))"
            />
          </template>
          <template #actions="{ record }">
            <div class="um-row-actions">
              <button type="button" class="um-link" @click="openDetail(record as UserRecord)">{{ t('userManagement.actions.view') }}</button>
              <button v-if="!(record as UserRecord).owner" type="button" class="um-link" @click="openEdit(record as UserRecord)">{{ t('userManagement.actions.edit') }}</button>
              <a-dropdown trigger="click" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow>
                <button type="button" class="um-row-more" :aria-label="t('userManagement.actions.more')">
                  <IconMore :size="16" />
                </button>
                <template #content>
                  <a-doption @click="openResetPassword(record as UserRecord)">{{ t('userManagement.actions.resetPassword') }}</a-doption>
                  <a-doption
                    v-if="!(record as UserRecord).owner"
                    class="row-more-danger"
                    @click="confirmDeleteSingle(record as UserRecord)"
                  >{{ t('userManagement.actions.delete') }}</a-doption>
                </template>
              </a-dropdown>
            </div>
          </template>
        </a-table>
        </div>

        <a-empty
          v-else
          :description="hasAppliedFilters ? t('userManagement.table.noMatch') : t('userManagement.table.empty')"
        />

        <!-- 分页 -->
        <nav v-if="filteredUsers.length" class="um-pagination app-pagination" :aria-label="t('userManagement.table.navigation')">
          <span class="pagination-total">{{ t('userManagement.pagination.total', { count: filteredUsers.length }) }}</span>
          <div class="pagination-pages">
            <a-select class="app-page-size" :model-value="pageSize" :aria-label="t('userManagement.table.pageSize')" @update:model-value="handlePageSizeChange">
              <a-option v-for="size in [10, 20, 50, 100]" :key="size" :value="size">{{ t('userManagement.pagination.perPage', { count: size }) }}</a-option>
            </a-select>
            <button class="pagination-arrow" type="button" :disabled="page === 1" :aria-label="t('userManagement.pagination.previous')" @click="setPage(page - 1)">
              <IconLeft />
            </button>
            <button
              v-for="number in pageNumbers"
              :key="number"
              class="pagination-number"
              :class="{ active: page === number }"
              type="button"
              :aria-current="page === number ? 'page' : undefined"
              @click="setPage(number)"
            >{{ number }}</button>
            <button class="pagination-arrow" type="button" :disabled="page === totalPages" :aria-label="t('userManagement.pagination.next')" @click="setPage(page + 1)">
              <IconRight />
            </button>
          </div>
          <span class="pagination-jump-label">{{ t('userManagement.pagination.jumpTo') }}</span>
          <a-input-number v-model="jumpPage" class="app-page-jump" :min="1" :max="totalPages" hide-button @press-enter="goToJumpPage" />
          <span class="pagination-total-pages">{{ t('userManagement.pagination.totalPages', { count: totalPages }) }}</span>
        </nav>
      </a-card>
    </div>

    <!-- 弹层 -->
    <UserFormDrawer v-model:visible="formVisible" :mode="formMode" :user="formUser" :dept-tree-data="deptTreeData" />
    <UserDetailDrawer v-model:visible="detailVisible" :user="detailUser" @edit="onDetailEdit" />
    <DepartmentFormDrawer
      v-model:visible="deptFormVisible"
      :mode="deptFormMode"
      :department="deptFormTarget"
      :parent-id="deptFormParent"
      :exclude-ids="deptFormExclude"
      :dept-tree-data="deptTreeData"
      :add-as-child="true"
      @saved="onDeptSaved"
    />
    <ImportDrawer v-model:visible="importVisible" />
    <DeleteConfirmModal v-model:visible="deleteVisible" :users="deleteTargets" @confirm="onDeleteConfirm" />

    <!-- 删除部门：有成员时只提示；无成员时二次确认（参考稿的两种对话框形态） -->
    <ConfirmDialog
      :visible="deptBlockedVisible"
      icon="info"
      :title="t('userManagement.department.blockedTitle')"
      :description="deptBlockedMessage"
      single
      :ack-text="t('userManagement.department.acknowledge')"
      @update:visible="deptBlockedVisible = $event"
    />
    <ConfirmDialog
      :visible="deptDeleteVisible"
      :title="t('userManagement.department.deleteConfirmTitle', { name: deptDeleteInfo.name })"
      :cancel-text="t('userManagement.delete.cancel')"
      :ok-text="t('userManagement.department.deleteConfirm')"
      @update:visible="deptDeleteVisible = $event"
      @confirm="confirmDeleteDept"
    />

    <!-- 重置密码 -->
    <ConfirmDialog
      :visible="resetPasswordVisible"
      :title="t('userManagement.resetPassword.title', { name: resetPasswordUser?.name ?? '' })"
      :description="t('userManagement.resetPassword.desc')"
      :cancel-text="t('userManagement.delete.cancel')"
      :ok-text="t('userManagement.delete.confirm')"
      @update:visible="resetPasswordVisible = $event"
      @confirm="confirmResetPassword"
    />

    <!-- 导出确认 -->
    <ConfirmDialog
      :visible="exportVisible"
      icon="info"
      :title="t('userManagement.export.notice.title')"
      :description="[t('userManagement.export.notice.line1'), t('userManagement.export.notice.line2')]"
      :cancel-text="t('userManagement.export.notice.cancel')"
      :ok-text="t('userManagement.export.notice.confirm')"
      :ok-loading="exporting"
      :cancel-disabled="exporting"
      :dismissible="!exporting"
      @update:visible="exportVisible = $event"
      @confirm="confirmExport"
    />
  </main>
</template>

<style scoped>
.um-page { padding: 0; background: var(--app-fill-1); min-height: calc(100vh - 80px); }
.um-split { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 0px; align-items: stretch; min-height: calc(100vh - 104px); background: var(--app-surface); }

/* 组织架构卡片 */
.um-org-card { align-self: stretch; border-right: 1px solid var(--color-border-2); border-radius: 0; }
.um-org-card :deep(.arco-card-body) { padding: 16px; }
.um-org-card :deep(.arco-card-header) { display: none; }
.um-root-title { font-size: 14px; font-weight: 600; white-space: nowrap; }
.um-tree :deep(.arco-tree-node-title-text) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.um-list-card { border-radius: 0; }
.um-list-card :deep(.arco-card-body) { padding: 18px 16px 16px; }
.um-company-heading { display: flex; align-items: baseline; gap: 16px; min-height: 26px; margin-bottom: 14px; }
.um-heading-main { color: var(--color-text-1); font-size: 14px; font-weight: 600; line-height: 22px; }
.um-count-muted { color: var(--color-text-3); font-size: 12px; line-height: 18px; }
/* 三点按钮：hover 背景块与所在部门行的右边界留 6px 间隙，避免和行高亮块粘成一片 */
.um-node-more { width: 24px; height: 24px; margin-right: 6px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--color-text-2); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; opacity: 0; }
 .um-tree :deep(.arco-tree-node:hover .um-node-more), .um-tree :deep(.arco-tree-node:focus-within .um-node-more) { opacity: 1; }
.um-node-more:hover, .um-node-more:focus-visible { background: var(--color-fill-3); opacity: 1; }
.um-tree :deep(.arco-tree-node:hover) { background: var(--color-fill-2); border-radius: 2px; }
.um-tree :deep(.arco-tree-node-title), .um-tree :deep(.arco-tree-node-title:hover) { padding-right: 0; background: transparent; }
.um-tree :deep(.arco-tree-node-selected), .um-tree :deep(.arco-tree-node-selected:hover) { color: var(--app-accent); background: var(--color-primary-light-1); }
.um-tree :deep(.arco-tree-node-selected .arco-tree-node-switcher), .um-tree :deep(.arco-tree-node-selected .arco-tree-node-switcher-icon) { color: var(--app-accent); }
.um-tree :deep(.arco-tree-node-switcher:hover) { color: var(--app-accent); }
.um-tree :deep(.arco-tree-node-icon-hover::before) { display: none; }
.um-tree :deep(.arco-tree-node-extra) { display: flex; align-items: center; }
.um-tree :deep(.arco-tree-node-extra) { margin-left: auto; }
.um-list-card { min-width: 0; }
.um-rail { min-width: 0; }
.um-node-more :deep(svg) { transform: rotate(90deg); }
.um-rail-all { display: block; width: 100%; min-height: 36px; padding: 6px 10px; margin-bottom: 4px; border: 0; border-radius: 4px; background: transparent; color: var(--color-text-2); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.um-rail-all:hover { background: var(--color-fill-2); }
.um-rail-all.is-active { color: var(--app-accent); background: var(--color-primary-light-1); font-weight: 600; }
.um-tree { max-height: calc(100vh - 240px); overflow: auto; }

/* 筛选条（2026-11-09 用户裁决）：字段名在上、控件在下，12px / 4px / 左对齐 / 200px，
   条件与查询/重置/筛选设置统一 16px 栅栏换行分布，按钮紧跟最后一个条件右侧且左对齐。
   控件宽度必须用 :deep()：Arco 的 .arco-select-view 由组件内部渲染，不带本文件的 scope id，
   直接写 .um-filter-control 会静默失效（选择器带 [data-v] 后不匹配）。 */
.um-toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: var(--mt-ds-space-4); margin-bottom: 14px; }
.um-filter-unit { display: grid; grid-template-columns: minmax(0, var(--mt-ds-filter-width)); align-items: start; justify-items: start; gap: var(--mt-ds-space-1); min-width: 0; }
.um-filter-unit .app-field-label { font-size: var(--mt-ds-font-caption); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-caption); text-align: left; padding: 0; white-space: nowrap; }
.um-filter-unit :deep(.app-filter-control) { width: var(--mt-ds-filter-width); max-width: 100%; }
.um-toolbar > :deep(.arco-btn) { flex: 0 0 auto; }
/* 图标工具按钮（筛选设置／列设置）：32×32、白底描边（DESIGN.md · Icon-only toolbar controls） */
.um-icon-trigger { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.um-action-row { display: flex; align-items: center; gap: 12px; min-height: 34px; margin-bottom: 14px; }
.um-action-tools { margin-left: auto; display: flex; align-items: center; }

/* 批量条 */
.um-batch { display: flex; align-items: center; gap: 16px; min-height: 40px; padding: 4px 16px; margin-bottom: 12px; background: var(--color-primary-light-1); border-radius: 4px; }
.um-batch-count { color: var(--app-accent); font-weight: 600; }
.um-batch-actions { display: inline-flex; gap: 8px; }
.um-batch-clear { margin-left: auto; border: 0; background: transparent; color: var(--color-text-2); cursor: pointer; font: inherit; }
.um-batch-clear:hover { color: var(--app-accent); }

/* 表格 */
.um-table-scroll { width: 100%; overflow-x: auto; }
.um-table { width: 100%; min-width: 980px; margin-bottom: 8px; }
.um-table :deep(.arco-table-container) { min-width: 980px; }
.um-table :deep(table) { table-layout: fixed; }
.um-table :deep(.arco-table-th), .um-table :deep(.arco-table-td) { padding: 8px 10px; white-space: nowrap; }
.um-table :deep(.arco-table-td) { overflow: hidden; text-overflow: ellipsis; }
.um-table :deep(.arco-table-th) { font-weight: var(--mt-ds-weight-body); background: var(--app-table-header); }
.um-table :deep(.arco-table-td), .um-table :deep(.arco-table-th-item-title) { font-weight: var(--mt-ds-weight-body); }
.um-table :deep(.arco-table-tr) .arco-table-td:nth-child(1) .um-link { font-weight: 400; color: var(--color-text-1); }
/* 姓名列：左侧圆形头像（取姓名首字），右侧为可点开的姓名链接 */
.um-name-cell { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.um-name-cell :deep(.um-avatar) {
  flex: none;
  background: var(--app-primary-light-bg);
  color: var(--app-primary-strong);
  font-size: 12px;
  font-weight: 400;
}
.um-link { border: 0; background: transparent; padding: 0; color: var(--app-accent); cursor: pointer; font: inherit; font-size: 14px; line-height: 20px; }
.um-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.um-sub { font-size: 12px; color: var(--color-text-3); line-height: 18px; }
.um-contact { display: flex; flex-direction: column; gap: 2px; }
.um-contact span { font-size: 13px; line-height: 18px; color: var(--color-text-2); }
.um-row-actions { display: flex; align-items: center; gap: 12px; }
.um-row-more { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--color-text-2); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.um-row-more:hover { background: var(--color-fill-2); color: var(--app-accent); }

/* 分页 */
.um-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; color: var(--color-text-2); }
.um-pagination .pagination-total { margin-right: 8px; color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.um-pagination .pagination-pages { display: flex; align-items: center; gap: 8px; margin-right: 8px; }
.um-pagination .pagination-jump-label, .um-pagination .pagination-total-pages { color: var(--color-text-3); font-size: 14px; line-height: 22px; }

@media (max-width: 1000px) {
  .um-split { grid-template-columns: 250px minmax(0, 1fr); }
  .um-tree { max-height: 200px; }
}
/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry）。 */
@media (max-width: 760px) {
  .um-split { grid-template-columns: 1fr; }
  .um-toolbar { align-items: stretch; }
  .um-filter-unit { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .um-filter-unit :deep(.app-filter-control) { width: 100%; }
}
</style>
