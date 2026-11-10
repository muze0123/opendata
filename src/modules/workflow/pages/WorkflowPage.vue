<script setup lang="ts">
import { computed, ref, reactive, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  useRoute,
  useRouter,
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
} from "vue-router";
import { Message } from "@arco-design/web-vue";
import AppPagination from "../../../design/components/AppPagination.vue";
import AppDetailList from "../../../design/components/AppDetailList.vue";
import ConfirmDialog from "../../../shared/components/ConfirmDialog.vue";
import {
  IconPlus,
  IconUndo,
  IconRedo,
  IconSettings,
  IconSearch,
  IconRefresh,
  IconFilter,
  IconMore,
  IconLeft,
  IconRight,
} from "@arco-design/web-vue/es/icon";
import FlowCanvas from "../components/FlowCanvas.vue";
import AttachmentField from "../components/AttachmentField.vue";
import NodeConfig from "../components/NodeConfig.vue";
import ConditionEditor from "../components/ConditionEditor.vue";
import ColumnSettingsPopover from "../../../shared/components/ColumnSettingsPopover.vue";
import { api, WorkflowError } from "../api";
import {
  newNode,
  type Bootstrap,
  type Definition,
  type WorkflowNode,
  type NodeKind,
  type Branch,
  type Template,
} from "../data/model";
import { nodeLabel, typeLabel } from "../labels";
import { useUserStore } from "../../user-management/stores/users";
import { roles } from "../../user-management/data/users";
const { t } = useI18n();
const route = useRoute(),
  router = useRouter(),
  users = useUserStore();
const base = "/settings/workflow";
const data = ref<Bootstrap>({
  definitions: [],
  templates: [],
  dictionaries: {},
});
const loading = ref(false),
  busy = ref(false),
  error = ref("");
const mode = computed(() => String(route.params.mode ?? "list"));
const readOnly = computed(
  () => mode.value === "detail" || !!draft.value?.enabled,
);
const draft = ref<Definition>();
const baseline = ref("");
const dirty = computed(
  () => !!draft.value && JSON.stringify(draft.value) !== baseline.value,
);
const missing = computed(() => !!route.params.id && !draft.value);
const history = ref<string[]>([]),
  historyIndex = ref(-1);
const filters = reactive({
  name: String(route.query.name ?? ""),
  type: String(route.query.type ?? ""),
  status: String(route.query.status ?? ""),
});
const current = ref(1),
  size = ref(10),
  settings = ref(false);
const columnState = ref<
  { key: string; visible: boolean; disabled?: boolean }[]
>(
  ["name", "description", "type", "enabled"].map((key) => ({
    key,
    visible: true,
    disabled: key === "name",
  })),
);
const columnItems = computed(() =>
  columnState.value.map((c) => ({ ...c, label: t(`workflow.${c.key}`) })),
);
const columns = computed(() => [
  ...columnItems.value
    .filter((c) => c.visible)
    .map((c) => ({
      title: c.label,
      dataIndex: c.key,
      slotName: c.key,
      width:
        c.key === "name"
          ? 240
          : c.key === "enabled"
            ? 120
            : c.key === "type"
              ? 160
              : undefined,
      ellipsis: true,
      tooltip: true,
    })),
  {
    title: t("workflow.operations"),
    dataIndex: "operations",
    slotName: "operations",
    width: 200,
    fixed: "right" as const,
  },
]);
const filterSettings = ref(false);
const filterState = ref(
  ["name", "type", "status"].map((key) => ({ key, visible: true })),
);
const filterItems = computed(() =>
  filterState.value.map((item) => ({
    ...item,
    label: t(`workflow.${item.key === "status" ? "enabled" : item.key}`),
  })),
);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(records.value.length / size.value)),
);
const jumpPage = ref(1);
const pageNumbers = computed(() => {
  const first = Math.max(1, Math.min(current.value - 2, totalPages.value - 4));
  return Array.from(
    { length: Math.min(5, totalPages.value) },
    (_, i) => first + i,
  );
});
function setPage(page: number) {
  current.value = Math.max(1, Math.min(totalPages.value, page));
  jumpPage.value = current.value;
  void router.replace({ query: { ...route.query, page: current.value } });
}
watch(size, () => setPage(1));

const records = computed(() =>
  data.value.definitions.filter(
    (d) =>
      d.name
        .toLowerCase()
        .includes(String(route.query.name ?? "").toLowerCase()) &&
      (!route.query.type || d.type === route.query.type) &&
      (!route.query.status || String(d.enabled) === route.query.status),
  ),
);
const visible = computed(() =>
  records.value.slice(
    (current.value - 1) * size.value,
    current.value * size.value,
  ),
);
watch(totalPages, () => {
  if (current.value > totalPages.value) setPage(totalPages.value);
});
const createOpen = ref(false),
  createForm = reactive({
    name: "",
    type: "" as "" | "normal" | "project",
    description: "",
  }),
  submitted = ref(false);
const nameInput = ref<{ focus: () => void }>();
const selected = ref<WorkflowNode>(),
  selectedOriginal = ref<WorkflowNode>(),
  selectedBranch = ref<Branch>(),
  branchOriginal = ref<Branch>(),
  branchParent = ref<WorkflowNode>();
const overlayDirty = computed(() =>
  selected.value
    ? JSON.stringify(selected.value) !== JSON.stringify(selectedOriginal.value)
    : selectedBranch.value
      ? JSON.stringify(selectedBranch.value) !==
        JSON.stringify(branchOriginal.value)
      : false,
);
function report(e: unknown) {
  error.value = e instanceof WorkflowError ? e.code : "server";
  Message.error(t(`workflow.errors.${error.value}`));
}
async function load() {
  loading.value = true;
  try {
    data.value = await api<Bootstrap>("bootstrap");
    error.value = "";
  } catch (e) {
    report(e);
  } finally {
    loading.value = false;
  }
}
function init() {
  const item = data.value.definitions.find((v) => v.id === route.params.id);
  draft.value = item ? clone(item) : undefined;
  baseline.value = JSON.stringify(draft.value);
  history.value = draft.value ? [baseline.value] : [];
  historyIndex.value = history.value.length - 1;
}
watch(
  () => route.fullPath,
  () => {
    filters.name = String(route.query.name ?? "");
    filters.type = String(route.query.type ?? "");
    filters.status = String(route.query.status ?? "");
    current.value = Number(route.query.page ?? 1);
    init();
  },
);
void load().then(init);
function checkpoint() {
  if (!draft.value) return;
  const snapshot = JSON.stringify(draft.value);
  if (history.value[historyIndex.value] === snapshot) return;
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(snapshot);
  historyIndex.value++;
}
function undo(delta: number) {
  const i = historyIndex.value + delta;
  if (i < 0 || i >= history.value.length) return;
  historyIndex.value = i;
  draft.value = JSON.parse(history.value[i]);
}
function search(reset = false) {
  if (reset) Object.assign(filters, { name: "", type: "", status: "" });
  void router.replace({ path: base, query: { ...filters, page: 1 } });
}
async function create() {
  submitted.value = true;
  if (!createForm.name.trim() || !createForm.type) {
    nameInput.value?.focus();
    return;
  }
  busy.value = true;
  try {
    const d = await api<Definition>("definitions", "POST", createForm);
    data.value.definitions.push(d);
    createOpen.value = false;
    void router.push(`${base}/${d.id}/edit`);
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (!draft.value) return;
  busy.value = true;
  try {
    const d = await api<Definition>(
      `definitions/${draft.value.id}`,
      "PUT",
      draft.value,
    );
    data.value.definitions = data.value.definitions.map((v) =>
      v.id === d.id ? d : v,
    );
    draft.value = clone(d);
    baseline.value = JSON.stringify(d);
    checkpoint();
    Message.success(t("workflow.saved"));
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
async function toggle(d: Definition, value: unknown) {
  busy.value = true;
  try {
    const updated = await api<Definition>(`definitions/${d.id}/status`, "PUT", {
      enabled: value,
      revision: d.revision,
    });
    Object.assign(d, updated);
    Message.success(t("workflow.saved"));
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
/* 统一的二次确认弹窗：三处场景（删除流程 / 放弃修改 / 删除模板）共用一个
   ConfirmDialog 实例，保持与全站提示、问号确认弹窗同一规格。 */
interface PendingConfirm {
  title: string;
  description: string;
  okText: string;
  cancelText: string;
  /** 返回 false 时保留弹窗并允许重试（对应原 Modal.confirm 的 onBeforeOk）。 */
  beforeOk?: () => Promise<boolean> | boolean;
  resolve: (value: boolean) => void;
}
const pendingConfirm = ref<PendingConfirm>();
const confirmBusy = ref(false);

function askConfirm(config: Omit<PendingConfirm, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConfirm.value = { ...config, resolve };
  });
}
function settleConfirm(value: boolean) {
  const current = pendingConfirm.value;
  pendingConfirm.value = undefined;
  current?.resolve(value);
}
async function onConfirmOk() {
  const current = pendingConfirm.value;
  if (!current || confirmBusy.value) return;
  confirmBusy.value = true;
  try {
    if (!current.beforeOk || (await current.beforeOk())) settleConfirm(true);
  } finally {
    confirmBusy.value = false;
  }
}
function onConfirmVisible(value: boolean) {
  if (!value) settleConfirm(false);
}

function remove(d: Definition) {
  askConfirm({
    title: t("workflow.flowDeleteTitle", { name: d.name }),
    description: t("workflow.flowDeleteWarning"),
    okText: t("workflow.delete"),
    cancelText: t("workflow.cancel"),
    beforeOk: async () => {
      try {
        await api(`definitions/${d.id}`, "DELETE");
        await load();
        return true;
      } catch (e) {
        report(e);
        return false;
      }
    },
  });
}
function add(nodes: WorkflowNode[], index: number, kind: NodeKind) {
  if (readOnly.value || draft.value?.builtin) return;
  nodes.splice(index, 0, newNode(kind, draft.value!.type));
  checkpoint();
}
function select(node: WorkflowNode) {
  if (["condition", "parallel"].includes(node.kind)) return;
  selectedOriginal.value = node;
  selected.value = clone(node);
}
function branch(branch: Branch, node: WorkflowNode) {
  branchOriginal.value = branch;
  selectedBranch.value = clone(branch);
  branchParent.value = node;
}
async function closeConfig() {
  if (overlayDirty.value && !(await confirmDiscard())) return;
  selected.value = undefined;
  selectedBranch.value = undefined;
}
function saveConfig() {
  if (selected.value && selectedOriginal.value)
    Object.assign(selectedOriginal.value, clone(selected.value));
  if (selectedBranch.value && branchOriginal.value) {
    const old = branchOriginal.value.priority,
      other = branchParent.value?.branches?.find(
        (v) =>
          !v.fallback &&
          v.id !== branchOriginal.value!.id &&
          v.priority === selectedBranch.value!.priority,
      );
    if (other) other.priority = old;
    Object.assign(branchOriginal.value, clone(selectedBranch.value));
  }
  selected.value = undefined;
  selectedBranch.value = undefined;
  checkpoint();
}
function confirmDiscard() {
  return askConfirm({
    title: t("workflow.discardTitle"),
    description: t("workflow.discard"),
    okText: t("workflow.leave"),
    cancelText: t("workflow.stay"),
  });
}
async function canLeave() {
  return !(dirty.value || overlayDirty.value) || (await confirmDiscard());
}
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(async (to, from) =>
  to.params.id === from.params.id && to.params.mode === from.params.mode
    ? true
    : canLeave(),
);
const beforeUnload = (e: BeforeUnloadEvent) => {
  if (dirty.value || overlayDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
};
window.addEventListener("beforeunload", beforeUnload);
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
const templateOpen = ref(false),
  templateEdit = ref(false),
  templateReadonly = ref(false),
  templateForm = ref<Template>({
    id: "",
    name: "",
    channel: "email",
    title: "",
    content: "",
    attachments: [],
  });
const templateFilters = reactive({ name: '', channel: '' });
const appliedTemplateFilters = reactive({ name: '', channel: '' });
const templatePage = ref(1), templatePageSize = ref(10);
const filteredTemplates = computed(() => data.value.templates.filter(item =>
  item.name.toLocaleLowerCase().includes(appliedTemplateFilters.name.trim().toLocaleLowerCase()) &&
  (!appliedTemplateFilters.channel || item.channel === appliedTemplateFilters.channel)));
const templateColumns = computed(() => [
  { title: t('workflow.templateName'), dataIndex: 'name', width: 260 },
  { title: t('workflow.channel'), dataIndex: 'channel', slotName: 'channel', width: 180 },
  { title: t('workflow.operations'), slotName: 'templateOperations', width: 160, fixed: 'right' as const },
]);
const templateRows = computed(() => filteredTemplates.value.slice((templatePage.value - 1) * templatePageSize.value, templatePage.value * templatePageSize.value));
function searchTemplates(reset = false) {
  if (reset) Object.assign(templateFilters, { name: '', channel: '' });
  Object.assign(appliedTemplateFilters, templateFilters);
  templatePage.value = 1;
}
watch(() => filteredTemplates.value.length, count => {
  templatePage.value = Math.min(templatePage.value, Math.max(1, Math.ceil(count / templatePageSize.value)));
});
function editTemplate(item?: Template, readonly = false) {
  templateForm.value = item
    ? { ...clone(item), attachments: clone(item.attachments ?? []) }
    : {
        id: "",
        name: "",
        channel: "email",
        title: "",
        content: "",
        attachments: [],
      };
  templateReadonly.value = readonly;
  templateEdit.value = true;
}
async function saveTemplate() {
  busy.value = true;
  try {
    const f = templateForm.value;
    await api(`templates${f.id ? "/" + f.id : ""}`, f.id ? "PUT" : "POST", f);
    await load();
    templateEdit.value = false;
    Message.success(t("workflow.saved"));
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
async function fromMessage() {
  if (!selected.value?.message) return;
  templateForm.value = {
    id: "",
    name: "",
    channel: selected.value.kind as "email" | "sms",
    title: selected.value.message.title,
    content: selected.value.message.content,
    attachments: selected.value.message.attachments ?? [],
  };
  templateReadonly.value = false;
  templateEdit.value = true;
}
function deleteTemplate(item: Template) {
  askConfirm({
    title: t("workflow.delete"),
    description: t("workflow.deleteConfirm", { name: item.name }),
    okText: t("workflow.delete"),
    cancelText: t("workflow.cancel"),
    beforeOk: async () => {
      try {
        await api(`templates/${item.id}`, "DELETE");
        await load();
        return true;
      } catch (e) {
        report(e);
        return false;
      }
    },
  });
}
const actorOptions = computed(() => [
  { id: "u-admin", name: t("workflow.currentActor") },
  ...users.users
    .filter((u) => u.enabled)
    .map((u) => ({ id: u.id, name: u.name })),
]);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
</script>
<template>
  <div class="workflow-page">
    <a-alert v-if="error" type="error" closable @close="error = ''"
      >{{ t(`workflow.errors.${error}`) }}
      <a-button type="text" @click="load">{{
        t("workflow.retry")
      }}</a-button></a-alert
    ><a-spin :loading="loading" style="width: 100%"
      ><template v-if="mode === 'list'"
        ><form class="filters panel" @submit.prevent="search()">
            <div
              v-for="item in filterState.filter((v) => v.visible)"
              :key="item.key"
              class="filter-field"
            >
              <label
                class="app-field-label"
                :for="`workflow-filter-${item.key}`"
                >{{
                  t(`workflow.${item.key === "status" ? "enabled" : item.key}`)
                }}</label
              >
              <a-input
                v-if="item.key === 'name'"
                id="workflow-filter-name"
                v-model="filters.name"
                class="app-filter-control"
                :aria-label="t('workflow.name')"
                :max-length="20"
                allow-clear
                :placeholder="t('workflow.input')"
              />
              <a-select
                v-else-if="item.key === 'type'"
                id="workflow-filter-type"
                v-model="filters.type"
                class="app-filter-control"
                :aria-label="t('workflow.type')"
                ><a-option value="">{{ t("workflow.every") }}</a-option
                ><a-option value="normal">{{ typeLabel(t, "normal") }}</a-option
                ><a-option value="project">{{
                  typeLabel(t, "project")
                }}</a-option></a-select
              >
              <a-select
                v-else
                id="workflow-filter-status"
                v-model="filters.status"
                class="app-filter-control"
                :aria-label="t('workflow.enabled')"
                ><a-option value="">{{ t("workflow.every") }}</a-option
                ><a-option value="true">{{ t("workflow.on") }}</a-option
                ><a-option value="false">{{
                  t("workflow.off")
                }}</a-option></a-select
              >
            </div>
            <a-button type="primary" html-type="submit"
              ><template #icon><IconSearch /></template
              >{{ t("workflow.search") }}</a-button
            >
            <a-button class="app-btn-neutral" @click="search(true)"
              ><template #icon><IconRefresh /></template
              >{{ t("workflow.reset") }}</a-button
            >
            <ColumnSettingsPopover
              v-model:visible="filterSettings"
              :items="filterItems"
              :default-items="
                ['name', 'type', 'status'].map((key) => ({
                  key,
                  visible: true,
                  label: t(`workflow.${key === 'status' ? 'enabled' : key}`),
                }))
              "
              :title="t('workflow.filterSettings')"
              :list-aria-label="t('workflow.filterSettings')"
              :show-label="t('workflow.show')"
              :restore-label="t('workflow.restore')"
              @change="filterState = $event"
                ><a-tooltip :content="t('workflow.filterSettings')"
                ><a-button
                  class="app-btn-neutral settings-trigger"
                  :aria-label="t('workflow.filterSettings')"
                  ><IconFilter /></a-button></a-tooltip
              ></ColumnSettingsPopover>
          </form>
          <section class="panel">
            <div class="toolbar">
              <a-button
                type="primary"
                @click="
                  createForm.name = '';
                  createForm.type = '';
                  createForm.description = '';
                  submitted = false;
                  createOpen = true;
                "
                ><IconPlus />{{ t("workflow.create") }}</a-button
              ><a-button class="app-btn-neutral" @click="templateOpen = true">{{
                  t("workflow.manageTemplates")
                }}</a-button
                ><ColumnSettingsPopover
                  v-model:visible="settings"
                  :items="columnItems"
                  :default-items="
                    ['name', 'description', 'type', 'enabled'].map((key) => ({
                      key,
                      label: t(`workflow.${key}`),
                      visible: true,
                      disabled: key === 'name',
                    }))
                  "
                  :title="t('workflow.columns')"
                  :list-aria-label="t('workflow.columns')"
                  :show-label="t('workflow.show')"
                  :restore-label="t('workflow.restore')"
                  @change="columnState = $event"
                  ><a-button
                    class="app-btn-neutral settings-trigger"
                    :title="t('workflow.columns')"
                    :aria-label="t('workflow.columns')"
                    ><IconSettings /></a-button></ColumnSettingsPopover

                >
            </div>
            <a-table
              :data="visible"
              :columns="columns"
              :pagination="false"
              :bordered="false"
              size="large"
              :scroll="{ x: 900 }"
              row-key="id"
              ><template #name="{ record }"
                ><router-link
                  class="record-name"
                  :to="{
                    path: `${base}/${record.id}/detail`,
                    query: route.query,
                  }"
                  >{{ record.name }}</router-link
                >
                <a-tag v-if="record.builtin" size="small">{{
                  t("workflow.builtin")
                }}</a-tag></template
              ><template #description="{ record }">{{
                record.builtin ? t("workflow.lockedHelp") : record.description
              }}</template
              ><template #type="{ record }">{{
                typeLabel(t, record.type)
              }}</template
              ><template #enabled="{ record }"
                ><a-switch
                  :model-value="record.enabled"
                  :disabled="busy"
                  :checked-text="t('workflow.on')"
                  :unchecked-text="t('workflow.off')"
                  :aria-label="t('workflow.enabled')"
                  @change="toggle(record, $event)" /></template
              ><template #operations="{ record }"
                ><a-space :size="12"
                  ><a-button
                    type="text"
                    @click="
                      router.push({
                        path: `${base}/${record.id}/detail`,
                        query: route.query,
                      })
                    "
                    >{{ t("workflow.detail") }}</a-button
                  ><template v-if="!record.enabled"
                    ><a-button
                      type="text"
                      @click="
                        router.push({
                          path: `${base}/${record.id}/edit`,
                          query: route.query,
                        })
                      "
                      >{{ t("workflow.edit") }}</a-button
                    ><a-dropdown
                      v-if="!record.builtin"
                      :trigger="['hover', 'click']"
                      position="br"
                      popup-container="body"
                      content-class="row-more-dropdown"
                      arrow-class="row-more-arrow"
                      show-arrow
                      ><a-button
                        type="text"
                        size="mini"
                        :aria-label="t('workflow.more')"
                        :title="t('workflow.more')"
                        ><IconMore /></a-button
                      ><template #content
                        ><a-doption
                          class="row-more-danger"
                          @click="remove(record)"
                          >{{ t("workflow.delete") }}</a-doption
                        ></template
                      ></a-dropdown
                    >
                  </template></a-space
                ></template
              ><template #empty
                ><a-empty
                  :description="
                    records.length ? t('workflow.empty') : t('workflow.noMatch')
                  " /></template
            ></a-table>
            <nav
              class="workflow-pagination app-pagination"
              :aria-label="t('workflow.pagination')"
            >
              <span>{{ t("workflow.total", { count: records.length }) }}</span>
              <div class="pagination-pages">
                <a-select
                  v-model="size"
                  class="app-page-size"
                  :aria-label="t('workflow.pageSize')"
                  ><a-option
                    v-for="value in [10, 50, 100, 500]"
                    :key="value"
                    :value="value"
                    >{{ t("workflow.perPage", { count: value }) }}</a-option
                  ></a-select
                ><button
                  class="pagination-arrow"
                  :disabled="current === 1"
                  :aria-label="t('workflow.previous')"
                  @click="setPage(current - 1)"
                >
                  <IconLeft /></button
                ><button
                  v-for="number in pageNumbers"
                  :key="number"
                  class="pagination-number"
                  :class="{ active: current === number }"
                  :aria-current="current === number ? 'page' : undefined"
                  @click="setPage(number)"
                >
                  {{ number }}</button
                ><button
                  class="pagination-arrow"
                  :disabled="current === totalPages"
                  :aria-label="t('workflow.nextPage')"
                  @click="setPage(current + 1)"
                >
                  <IconRight />
                </button>
              </div>
              <span>{{ t("workflow.jump") }}</span
              ><a-input-number
                v-model="jumpPage"
                class="app-page-jump"
                :aria-label="t('workflow.jump')"
                :min="1"
                :max="totalPages"
                hide-button
                @press-enter="setPage(jumpPage)"
              /><span>{{
                t("workflow.totalPages", { count: totalPages })
              }}</span>
            </nav>
          </section></template
      ><template v-else
        ><header class="panel editor-header">
          <div class="editor-location"><a-button type="text" class="workflow-back" :aria-label="t('workflow.backToList')" @click="router.push({ path: base, query: route.query })"><IconLeft /></a-button><a-breadcrumb
            ><a-breadcrumb-item
              ><router-link :to="{ path: base, query: route.query }">{{
                t("workflow.title")
              }}</router-link></a-breadcrumb-item
            ><a-breadcrumb-item>{{
              readOnly ? t("workflow.detailPage") : t("workflow.editPage")
            }}</a-breadcrumb-item></a-breadcrumb></div
          ><a-space v-if="!readOnly && !missing"            ><template v-if="!readOnly && !missing"
              ><a-button
                :disabled="historyIndex <= 0"
                :aria-label="t('workflow.undo')"
                @click="undo(-1)"
                ><IconUndo /></a-button
              ><a-button
                :disabled="historyIndex >= history.length - 1"
                :aria-label="t('workflow.redo')"
                @click="undo(1)"
                ><IconRedo /></a-button
              ><a-button class="workflow-close" @click="router.push({ path: base, query: route.query })">{{ t('workflow.close') }}</a-button
              ><a-button type="primary" :loading="busy" @click="save">{{
                t("workflow.save")
              }}</a-button></template
            ></a-space
          >
        </header>
        <a-result
          v-if="missing"
          status="404"
          :title="t('workflow.missing')" /><template v-else-if="draft"
          ><section class="panel canvas-panel">
            <h2 v-if="readOnly">{{ t('workflow.canvas') }}</h2>
            <div class="canvas" :aria-label="t('workflow.canvas')">
              <FlowCanvas
                :nodes="draft.nodes"
                :template-labels="Object.fromEntries(data.templates.map(item => [item.id, item.name]))"
                :assignee-labels="Object.fromEntries([...roles, ...actorOptions].map(person => [person.id, person.name]))"
                :readonly="readOnly"
                :locked="!!draft.builtin"
                root
                @add="add"
                @select="select"
                @branch="branch"
                @change="checkpoint"
              />
            </div></section></template></template
    ></a-spin>
    <a-modal
      v-model:visible="createOpen"
      :width="'min(560px, calc(100vw - 32px))'"
      :title="t('workflow.create')"
      :mask-closable="false"
      :ok-text="t('workflow.next')"
      :cancel-text="t('workflow.cancel')"
      :on-before-ok="
        async () => {
          await create();
          return !createOpen;
        }
      "
      :ok-loading="busy"
      ><a-form :model="createForm" layout="vertical"
        ><a-form-item required
          :validate-status="
            submitted && !createForm.name.trim() ? 'error' : undefined
          "
          :help="
            submitted && !createForm.name.trim() ? t('workflow.required') : ''
          "
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.name")
            }}</span></template
          ><a-input
            :aria-label="t('workflow.name')"
            ref="nameInput"
            v-model="createForm.name"
            :max-length="20"
            show-word-limit
            :placeholder="t('workflow.input')" /></a-form-item
        ><a-form-item required
          :validate-status="submitted && !createForm.type ? 'error' : undefined"
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.type")
            }}</span></template
          ><a-select
            :aria-label="t('workflow.type')"
            v-model="createForm.type"
            :placeholder="t('workflow.select')"
            ><a-option value="normal">{{ typeLabel(t, "normal") }}</a-option
            ><a-option value="project">{{
              typeLabel(t, "project")
            }}</a-option></a-select
          ></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.description")
            }}</span></template
          ><a-textarea
            :aria-label="t('workflow.description')"
            v-model="createForm.description"
            :max-length="500"
            show-word-limit /></a-form-item></a-form
    ></a-modal>
    <a-drawer
      class="workflow-node-drawer"
      :visible="!!selected || !!selectedBranch"
      :width="selectedBranch ? 'min(800px, 100vw)' : 'min(500px, 100vw)'"
      :title="
        selected
          ? nodeLabel(t, selected.kind)
          : t('workflow.configureCondition')
      "
      :mask-closable="readOnly"
      :esc-to-close="readOnly"
      @cancel="closeConfig"
      ><template v-if="selected"
        ><NodeConfig
          :node="selected"
          :type="draft!.type"
          :readonly="
            readOnly || (!!draft?.builtin && selected.kind !== 'review')
          "
          :builtin="!!draft?.builtin"
          :users="actorOptions"
          :roles="roles"
          :templates="data.templates"
          @templates="templateOpen = true"
        /><a-button v-if="selected.message && !readOnly" @click="fromMessage">{{
          t("workflow.saveAsTemplate")
        }}</a-button></template
      >
      <section v-if="selectedBranch" class="panel">
        <a-alert>{{
          branchParent?.kind === "condition"
            ? t("workflow.exclusiveHelp")
            : t("workflow.parallelHelp")
        }}</a-alert
        ><label class="priority"
          ><span class="app-field-label">{{ t("workflow.order") }}</span
          ><a-select v-model="selectedBranch.priority" :disabled="readOnly"
            ><a-option
              v-for="i in (branchParent?.branches?.length ?? 1) - 1"
              :key="i"
              :value="i"
              >{{ t("workflow.priority", { count: i }) }}</a-option
            ></a-select
          ></label
        ><ConditionEditor
          :group="selectedBranch.condition"
          :type="draft!.type"
          :dictionaries="data.dictionaries"
          :readonly="readOnly"
        />
      </section>
      <template #footer
        ><a-space
          ><a-button @click="closeConfig">{{ t("workflow.cancel") }}</a-button
          ><a-button v-if="!readOnly" type="primary" @click="saveConfig">{{
            t("workflow.confirm")
          }}</a-button></a-space
        ></template
      ></a-drawer
    >
    <a-drawer
      v-model:visible="templateOpen"
      :width="'min(800px, 100vw)'"
      :title="t('workflow.manageTemplates')"
      :footer="false"
      ><form class="filters panel" @submit.prevent="searchTemplates()">
        <label class="filter-field"><span class="app-field-label">{{ t('workflow.templateName') }}</span><a-input v-model="templateFilters.name" :max-length="20" :placeholder="t('workflow.input')" :aria-label="t('workflow.templateName')" /></label>
        <label class="filter-field"><span class="app-field-label">{{ t('workflow.channel') }}</span><a-select v-model="templateFilters.channel" :aria-label="t('workflow.channel')"><a-option value="">{{ t('workflow.every') }}</a-option><a-option value="email">{{ nodeLabel(t, 'email') }}</a-option><a-option value="sms">{{ nodeLabel(t, 'sms') }}</a-option></a-select></label>
        <a-space><a-button html-type="submit" type="primary"><IconSearch />{{ t('workflow.search') }}</a-button><a-button @click="searchTemplates(true)"><IconRefresh />{{ t('workflow.reset') }}</a-button></a-space>
      </form><section class="panel">
        <a-button type="primary" @click="editTemplate()">{{
          t("workflow.createTemplate")
        }}</a-button
        ><a-table :data="templateRows" :columns="templateColumns" :bordered="false" :pagination="false" :scroll="{ x: 600 }">
          <template #empty>{{ t('workflow.empty') }}</template>
          <template #channel="{ record }">{{ nodeLabel(t, record.channel) }}</template>
          <template #templateOperations="{ record }"><a-space>
            <a-button type="text" @click="editTemplate(record, true)">{{ t('workflow.detail') }}</a-button>
            <a-button type="text" @click="editTemplate(record)">{{ t('workflow.edit') }}</a-button>
            <a-dropdown trigger="click" @select="deleteTemplate(record)"><a-button type="text" :aria-label="t('workflow.more')"><IconMore /></a-button><template #content><a-doption value="delete">{{ t('workflow.delete') }}</a-doption></template></a-dropdown>
          </a-space></template>
        </a-table>
        <AppPagination v-model:current="templatePage" v-model:page-size="templatePageSize" :total="filteredTemplates.length" :page-sizes="[10, 50, 100, 500]" />
      </section></a-drawer
    >
    <a-modal
      v-model:visible="templateEdit"
      :width="'min(560px, calc(100vw - 32px))'"
      :title="t('workflow.messageTemplate')"
      :mask-closable="false"
      :footer="!templateReadonly"
      :on-before-ok="
        async () => {
          await saveTemplate();
          return !templateEdit;
        }
      "
      ><AppDetailList v-if="templateReadonly" :fields="[
        { key: 'channel', label: t('workflow.channel'), value: nodeLabel(t, templateForm.channel) },
        { key: 'name', label: t('workflow.templateName'), value: templateForm.name },
        { key: 'title', label: t('workflow.messageTitle'), value: templateForm.title },
        { key: 'content', label: t('workflow.content'), value: templateForm.content },
        { key: 'attachments', label: t('workflow.attachments'), value: templateForm.attachments.map(file => file.name).join('、') || '—' },
      ]" /><a-form v-else :model="templateForm" layout="vertical"
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.channel")
            }}</span></template
          ><a-select v-model="templateForm.channel" :disabled="templateReadonly"
            ><a-option value="email">{{ nodeLabel(t, "email") }}</a-option
            ><a-option value="sms">{{
              nodeLabel(t, "sms")
            }}</a-option></a-select
          ></a-form-item        ><a-form-item
          v-for="field in ['name', 'title', 'content'] as const"
          :key="field"
          ><template #label
            ><span class="app-field-label">{{
              field === "name"
                ? t("workflow.templateName")
                : field === "title"
                  ? t("workflow.messageTitle")
                  : t("workflow.content")
            }}</span></template
          ><a-textarea
            v-if="field === 'content'"
            v-model="templateForm[field]"
            :aria-label="t('workflow.content')"
            :max-length="500"
            :disabled="templateReadonly" /><a-input
            v-else
            v-model="templateForm[field]"
            :aria-label="field === 'name' ? t('workflow.templateName') : field === 'title' ? t('workflow.messageTitle') : t('workflow.content')"
            :max-length="20"
            :disabled="templateReadonly" /></a-form-item

          ><a-form-item :label="t('workflow.attachments')"><AttachmentField v-model="templateForm.attachments" /></a-form-item
        ></a-form
      ></a-modal
    >

    <ConfirmDialog
      :visible="!!pendingConfirm"
      :title="pendingConfirm?.title ?? ''"
      :description="pendingConfirm?.description ?? ''"
      :ok-text="pendingConfirm?.okText ?? t('common.confirm')"
      :cancel-text="pendingConfirm?.cancelText ?? t('common.cancel')"
      :ok-loading="confirmBusy"
      @update:visible="onConfirmVisible"
      @confirm="onConfirmOk"
    />
  </div>
</template>
<style scoped>
.workflow-page > :deep(.arco-spin) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  width: 100% !important;
}
.workflow-page :deep(.arco-table .arco-spin) {
  max-width: 100%;
  min-width: 0;
}
.workflow-page {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.panel {
  background: var(--app-surface-container);
  padding: 16px;
  border-radius: 2px;
  min-width: 0;
  margin-bottom: 0;
}
/* 筛选条（2026-11-09 用户裁决）：字段名在上、控件在下，12px / 4px / 左对齐 / 200px，
   条件与查询/重置/筛选设置统一 16px 栅栏换行分布，按钮紧跟最后一个条件右侧且左对齐 */
.filters {
  display: flex;
  align-items: flex-end;
  gap: var(--mt-ds-space-4);
  flex-wrap: wrap;
}
.filters .app-field-label {
  white-space: nowrap;
  font-size: var(--mt-ds-font-caption);
  font-weight: var(--mt-ds-weight-body);
  line-height: var(--mt-ds-line-caption);
  text-align: left;
  padding: 0;
}
.filters .filter-field {
  display: grid;
  grid-template-columns: minmax(0, var(--mt-ds-filter-width));
  align-items: start;
  justify-items: start;
  gap: var(--mt-ds-space-1);
  min-width: 0;
}
.filters .filter-field :deep(.app-filter-control) {
  width: var(--mt-ds-filter-width);
  max-width: 100%;
}
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px; }
.toolbar :deep(.settings-trigger) { margin-inline-start: auto; }
.workflow-back { width: 32px; height: 32px; min-width: 32px; padding: 0; color: var(--app-text-secondary); border: 0; flex-shrink: 0; }
.workflow-close { background: transparent; border: 1px solid var(--app-divider); color: var(--app-text-primary); }
.workflow-close:hover { background: transparent; border-color: var(--app-color-primary); color: var(--app-color-primary); }
.workflow-back:hover { color: var(--app-color-primary); background: var(--app-primary-light-bg); }
.editor-location { display: flex; align-items: center; gap: 8px; min-width: 0; }
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.editor-header {
  position: sticky;
  top: 56px;
  z-index: 5;
  flex-wrap: wrap;
}
.canvas {
  overflow: auto;
  min-height: 620px;
  padding: 32px 0;
}
.canvas > :deep(.flow-sequence) {
  width: max-content;
  min-width: 100%;
}
.basic :deep(.arco-alert) {
  margin-bottom: 16px;
}
.priority {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 16px 0;
}
.priority > .arco-select {
  width: 160px;
}
h2 {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  margin: 0 0 12px;
}
:deep(.arco-drawer-body) {
  background: var(--app-fill-1);
}
@media (max-width: 900px) {
  .toolbar {
    flex-wrap: wrap;
  }
  .editor-header {
    position: static;
  }
  .canvas {
    padding: 24px 12px;
  }
}
.workflow-pagination,
.pagination-pages {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.workflow-pagination {
  justify-content: flex-end;
  margin-top: 16px;
  gap: 12px;
}
.settings-trigger {
  width: 32px;
  height: 32px;
  padding: 0;
}
.record-name {
  color: var(--app-text-primary);
  text-decoration: none;
}
.record-name:hover,
.record-name:focus-visible {
  color: var(--app-color-primary);
}
.definition-id {
  overflow-wrap: anywhere;
  user-select: all;
}
.basic :deep(.arco-descriptions-item-label) {
  color: var(--app-text-muted);
}
.workflow-page :deep(.arco-table-th) {
  background: var(--app-table-header);
  font-weight: var(--mt-ds-weight-body);
}
.workflow-page :deep(.arco-table-td) {
  font-weight: var(--mt-ds-weight-body);
}
.workflow-page :deep(.arco-table-tr:last-child .arco-table-td) {
  border-bottom: 1px solid var(--app-divider);
}
.canvas-panel {
  overflow: hidden;
}
.basic h2,
.canvas-panel h2 {
  padding: 8px 0;
  margin: 0 0 12px;
}
.editor-header {
  margin-bottom: 0;
}
/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry）。 */
@media (max-width: 760px) {
  .filters { align-items: stretch; }
  .filters .filter-field {
    width: 100%;
    grid-template-columns: minmax(0, 1fr);
  }
  .filters .filter-field :deep(.app-filter-control) {
    width: 100%;
  }
}
:global(.workflow-node-drawer .arco-drawer-body) {
  background: var(--app-page);
  padding: 16px;
}
:global(.workflow-node-drawer .arco-drawer-header) {
  height: 56px;
  box-sizing: border-box;
}
:global(.workflow-node-drawer .arco-drawer) {
  max-width: 100vw;
}
</style>
