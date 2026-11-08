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
import NodeConfig from "../components/NodeConfig.vue";
import ConditionEditor from "../components/ConditionEditor.vue";
import ColumnSettingsPopover from "../../../shared/components/ColumnSettingsPopover.vue";
import { api, WorkflowError } from "../api";
import {
  newNode,
  PROJECT_ROLE_CODES,
  type Bootstrap,
  type Definition,
  type WorkflowNode,
  type NodeKind,
  type Branch,
  type Template,
  type Instance,
} from "../data/model";
import {
  nodeLabel,
  typeLabel,
  valueLabel,
  roleLabel,
  fieldLabel,
} from "../labels";
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
  instances: [],
  activities: [],
  risks: [],
  messages: [],
  dictionaries: {},
  adapters: {},
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
    title: t("workflow.delete"),
    description: t("workflow.deleteConfirm", { name: d.name }),
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
function editTemplate(item?: Template, readonly = false) {
  templateForm.value = item
    ? clone(item)
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
const runOpen = ref(false),
  runDefinition = ref<Definition>(),
  runForm = reactive({
    responsible: "u-admin",
    owner: "u-admin",
    activityId: "",
    extensionDays: 1,
    riskDescription: "",
    projectStatus: "active",
    projectStage: "development",
    activityStatus: "active",
    approvalResult: "approved",
    returnCount: 0,
  });
const instanceOpen = ref(false),
  activeInstance = ref<Instance>(),
  comment = ref("");
const activityOpen = ref(false),
  activityForm = reactive({
    name: "",
    planEnd: new Date().toISOString().slice(0, 10),
  });
const actorOptions = computed(() => [
  { id: "u-admin", name: t("workflow.currentActor") },
  ...users.users
    .filter((u) => u.enabled)
    .map((u) => ({ id: u.id, name: u.name })),
]);
function run(d: Definition) {
  runDefinition.value = d;
  runOpen.value = true;
}
async function startRun() {
  busy.value = true;
  try {
    const context = {
      ...runForm,
      roles: Object.fromEntries(
        roles.map((r) => [
          r.id,
          users.users
            .filter((u) => u.enabled && u.roleIds.includes(r.id))
            .map((u) => u.id),
        ]),
      ),
      projectRoles: Object.fromEntries(
        PROJECT_ROLE_CODES.map((id) => [id, [runForm.owner]]),
      ),
    };
    const i = await api<Instance>("instances", "POST", {
      definitionId: runDefinition.value!.id,
      context,
    });
    await load();
    runOpen.value = false;
    activeInstance.value = i;
    instanceOpen.value = true;
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
async function taskAction(action: string, taskId?: string) {
  if (!activeInstance.value) return;
  busy.value = true;
  try {
    activeInstance.value = await api<Instance>(
      `instances/${activeInstance.value.id}/${action === "retry" ? "retry" : taskId ? "action" : action}`,
      "POST",
      {
        taskId,
        action,
        comment: comment.value,
        revision: activeInstance.value.revision,
      },
    );
    comment.value = "";
    await load();
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
async function createActivity() {
  busy.value = true;
  try {
    await api("activities", "POST", activityForm);
    await load();
    activityOpen.value = false;
  } catch (e) {
    report(e);
  } finally {
    busy.value = false;
  }
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const tab = ref("definitions");
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
        ><div
          class="workflow-tabs panel"
          role="tablist"
          :aria-label="t('workflow.title')"
        >
          <button
            v-for="item in ['definitions', 'instances', 'business']"
            :key="item"
            role="tab"
            :aria-selected="tab === item"
            :class="{ active: tab === item }"
            @click="tab = item"
            @keydown.right.prevent="
              tab = ['definitions', 'instances', 'business'][
                (['definitions', 'instances', 'business'].indexOf(tab) + 1) % 3
              ]
            "
            @keydown.left.prevent="
              tab = ['definitions', 'instances', 'business'][
                (['definitions', 'instances', 'business'].indexOf(tab) + 2) % 3
              ]
            "
          >
            {{ t(`workflow.${item}`) }}
          </button>
        </div>
        <template v-if="tab === 'definitions'"
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
            <a-button @click="search(true)"
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
                  class="settings-trigger"
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
              ><a-space
                ><a-button @click="templateOpen = true">{{
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
                    class="settings-trigger"
                    :title="t('workflow.columns')"
                    :aria-label="t('workflow.columns')"
                    ><IconSettings /></a-button></ColumnSettingsPopover

                ></a-space
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
                      trigger="hover"
                      position="br"
                      popup-container="body"
                      content-class="row-more-dropdown"
                      ><a-button
                        type="text"
                        size="mini"
                        :aria-label="t('workflow.more')"
                        :title="t('workflow.more')"
                        ><IconMore /></a-button
                      ><template #content
                        ><a-doption
                          class="danger-option"
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
        >
        <section v-else-if="tab === 'instances'" class="panel">
          <div class="toolbar">
            <a-alert>{{ t("workflow.runtimeHelp") }}</a-alert
            ><a-button @click="load">{{ t("workflow.refresh") }}</a-button>
          </div>
          <a-table
            :data="data.instances"
            :pagination="{ pageSize: 10 }"
            :bordered="false"
            :scroll="{ x: 700 }"
            ><a-table-column :title="t('workflow.name')"
              ><template #cell="{ record }">{{
                record.definition.name
              }}</template></a-table-column
            ><a-table-column
              :title="t('workflow.instanceId')"
              data-index="id"
              ellipsis
            /><a-table-column :title="t('workflow.enabled')"
              ><template #cell="{ record }">{{
                valueLabel(t, record.status)
              }}</template></a-table-column
            ><a-table-column :title="t('workflow.operations')"
              ><template #cell="{ record }"
                ><a-button
                  type="text"
                  @click="
                    activeInstance = clone(record);
                    instanceOpen = true;
                  "
                  >{{ t("workflow.handle") }}</a-button
                ></template
              ></a-table-column
            ></a-table
          >
        </section>
        <section v-else class="panel">
          <div class="toolbar">
            <a-alert>{{ t("workflow.businessHelp") }}</a-alert
            ><a-button @click="activityOpen = true">{{
              t("workflow.createActivity")
            }}</a-button>
          </div>
          <a-table :data="data.activities" :bordered="false"
            ><a-table-column
              :title="t('workflow.activity')"
              data-index="name"
            /><a-table-column
              :title="t('workflow.planEnd')"
              data-index="planEnd"
            /><a-table-column :title="t('workflow.operations')"
              ><template #cell="{ record }"
                ><a-space
                  ><a-button
                    :disabled="
                      record.extensionPending ||
                      !data.definitions.find((d) => d.builtin === 'extension')
                        ?.enabled
                    "
                    @click="
                      runForm.activityId = record.id;
                      run(
                        data.definitions.find(
                          (d) => d.builtin === 'extension',
                        )!,
                      );
                    "
                    >{{ t("workflow.extension") }}</a-button
                  ><a-button
                    :disabled="
                      !data.definitions.find((d) => d.builtin === 'risk')
                        ?.enabled
                    "
                    @click="
                      runForm.activityId = record.id;
                      run(data.definitions.find((d) => d.builtin === 'risk')!);
                    "
                    >{{ t("workflow.risk") }}</a-button
                  ></a-space
                ></template
              ></a-table-column
            ></a-table
          >
          <h2>{{ t("workflow.risks") }}</h2>
          <a-table :data="data.risks" :bordered="false"
            ><a-table-column
              :title="t('workflow.description')"
              data-index="description"
            /><a-table-column :title="t('workflow.enabled')"
              ><template #cell="{ record }">{{
                valueLabel(t, record.status)
              }}</template></a-table-column
            ></a-table
          >
          <h2>{{ t("workflow.messages") }}</h2>
          <a-list :data="data.messages"
            ><template #item="{ item }"
              ><a-list-item
                >{{ t(`workflow.effects.${item.type}`) }} ·
                {{ item.at }}</a-list-item
              ></template
            ></a-list
          >
        </section> </template
      ><template v-else
        ><header class="panel editor-header">
          <a-breadcrumb
            ><a-breadcrumb-item
              ><router-link :to="{ path: base, query: route.query }">{{
                t("workflow.title")
              }}</router-link></a-breadcrumb-item
            ><a-breadcrumb-item>{{
              draft?.name || t("workflow.missing")
            }}</a-breadcrumb-item></a-breadcrumb
          ><a-space
            ><template v-if="!readOnly && !missing"
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
              ><a-button type="primary" :loading="busy" @click="save">{{
                t("workflow.save")
              }}</a-button></template
            ><a-button v-if="draft?.enabled" @click="run(draft)">{{
              t("workflow.run")
            }}</a-button
            ><a-button
              @click="router.push({ path: base, query: route.query })"
              >{{ t("workflow.close") }}</a-button
            ></a-space
          >
        </header>
        <a-result
          v-if="missing"
          status="404"
          :title="t('workflow.missing')" /><template v-else-if="draft"
          ><section class="panel basic">
            <h2>{{ t("workflow.basicInfo") }}</h2>
            <a-alert v-if="draft.builtin">{{
              t("workflow.lockedHelp")
            }}</a-alert
            ><a-descriptions :column="1"
              ><a-descriptions-item
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.name")
                  }}</span></template
                >{{ draft.name }}</a-descriptions-item
              ><a-descriptions-item
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.type")
                  }}</span></template
                >{{ typeLabel(t, draft.type) }}</a-descriptions-item
              ><a-descriptions-item
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.enabled")
                  }}</span></template
                ><a-tag :color="draft.enabled ? 'green' : 'gray'">{{
                  draft.enabled ? t("workflow.on") : t("workflow.off")
                }}</a-tag></a-descriptions-item
              ><a-descriptions-item
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.definitionId")
                  }}</span></template
                ><span class="definition-id">{{
                  draft.id
                }}</span></a-descriptions-item
              ><a-descriptions-item
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.version")
                  }}</span></template
                >v{{ draft.revision }}</a-descriptions-item
              ><a-descriptions-item :span="1"
                ><template #label
                  ><span class="app-detail-label">{{
                    t("workflow.description")
                  }}</span></template
                >{{
                  draft.builtin
                    ? t("workflow.lockedHelp")
                    : draft.description || "—"
                }}</a-descriptions-item
              ></a-descriptions
            >
          </section>
          <section class="panel canvas-panel">
            <h2>{{ t("workflow.canvas") }}</h2>
            <div class="canvas" :aria-label="t('workflow.canvas')">
              <FlowCanvas
                :nodes="draft.nodes"
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
      :width="560"
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
        ><a-form-item
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
        ><a-form-item
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
      :width="selectedBranch ? 800 : 500"
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
      :width="800"
      :title="t('workflow.manageTemplates')"
      :footer="false"
      ><section class="panel">
        <a-button type="primary" @click="editTemplate()">{{
          t("workflow.createTemplate")
        }}</a-button
        ><a-table :data="data.templates" :bordered="false"
          ><a-table-column
            :title="t('workflow.templateName')"
            data-index="name"
          /><a-table-column :title="t('workflow.channel')"
            ><template #cell="{ record }">{{
              nodeLabel(t, record.channel)
            }}</template></a-table-column
          ><a-table-column :title="t('workflow.operations')"
            ><template #cell="{ record }"
              ><a-space
                ><a-button type="text" @click="editTemplate(record, true)">{{
                  t("workflow.detail")
                }}</a-button
                ><a-button type="text" @click="editTemplate(record)">{{
                  t("workflow.edit")
                }}</a-button
                ><a-button
                  type="text"
                  status="danger"
                  @click="deleteTemplate(record)"
                  >{{ t("workflow.delete") }}</a-button
                ></a-space
              ></template
            ></a-table-column
          ></a-table
        >
      </section></a-drawer
    >
    <a-modal
      v-model:visible="templateEdit"
      :width="560"
      :title="t('workflow.messageTemplate')"
      :mask-closable="false"
      :footer="!templateReadonly"
      :on-before-ok="
        async () => {
          await saveTemplate();
          return !templateEdit;
        }
      "
      ><a-form :model="templateForm" layout="vertical"
        ><a-form-item
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
            :max-length="500"
            :disabled="templateReadonly" /><a-input
            v-else
            v-model="templateForm[field]"
            :max-length="20"
            :disabled="templateReadonly" /></a-form-item
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
          ></a-form-item
        ></a-form
      ></a-modal
    >
    <a-modal
      v-model:visible="runOpen"
      :title="t('workflow.run')"
      :width="560"
      :mask-closable="false"
      :on-before-ok="
        async () => {
          await startRun();
          return !runOpen;
        }
      "
      :ok-loading="busy"
      ><a-alert>{{ t("workflow.runHelp") }}</a-alert
      ><a-form :model="runForm" layout="vertical"
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.responsible")
            }}</span></template
          ><a-select v-model="runForm.responsible"
            ><a-option v-for="u in actorOptions" :key="u.id" :value="u.id">{{
              u.name
            }}</a-option></a-select
          ></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.projectOwner")
            }}</span></template
          ><a-select v-model="runForm.owner"
            ><a-option v-for="u in actorOptions" :key="u.id" :value="u.id">{{
              u.name
            }}</a-option></a-select
          ></a-form-item
        ><a-form-item
          v-for="field in [
            'projectStatus',
            'projectStage',
            'activityStatus',
          ] as const"
          :key="field"
          ><template #label
            ><span class="app-field-label">{{
              fieldLabel(t, field)
            }}</span></template
          ><a-select v-model="runForm[field]"
            ><a-option
              v-for="value in data.dictionaries[field] ?? []"
              :key="value"
              :value="value"
              >{{ valueLabel(t, value) }}</a-option
            ></a-select
          ></a-form-item
        ><template v-if="runDefinition?.builtin"
          ><a-form-item
            ><template #label
              ><span class="app-field-label">{{
                t("workflow.activity")
              }}</span></template
            ><a-select v-model="runForm.activityId"
              ><a-option
                v-for="a in data.activities"
                :key="a.id"
                :value="a.id"
                >{{ a.name }}</a-option
              ></a-select
            ></a-form-item
          ><a-form-item v-if="runDefinition.builtin === 'extension'"
            ><template #label
              ><span class="app-field-label">{{
                t("workflow.days")
              }}</span></template
            ><a-input-number
              v-model="runForm.extensionDays"
              :min="1"
              :max="365"
              :precision="0" /></a-form-item
          ><a-form-item v-else
            ><template #label
              ><span class="app-field-label">{{
                t("workflow.riskDescription")
              }}</span></template
            ><a-textarea
              v-model="runForm.riskDescription"
              :max-length="500" /></a-form-item></template></a-form
    ></a-modal>
    <a-drawer
      v-model:visible="instanceOpen"
      :width="800"
      :title="t('workflow.instance')"
      :footer="false"
      ><template v-if="activeInstance"
        ><section class="panel">
          <h2>{{ activeInstance.definition.name }}</h2>
          <p>
            {{ activeInstance.id }} · v{{
              activeInstance.definition.revision
            }}
            · {{ valueLabel(t, activeInstance.status) }}
          </p>
          <a-button
            :disabled="busy"
            @click="
              load().then(
                () =>
                  (activeInstance = data.instances.find(
                    (i) => i.id === activeInstance?.id,
                  )),
              )
            "
            >{{ t("workflow.refresh") }}</a-button
          ><a-space v-if="activeInstance.status === 'running'"
            ><a-button :loading="busy" @click="taskAction('withdraw')">{{
              t("workflow.withdraw")
            }}</a-button
            ><a-button
              status="danger"
              :loading="busy"
              @click="taskAction('cancel')"
              >{{ t("workflow.void") }}</a-button
            ></a-space
          >
        </section>
        <section class="panel">
          <h2>{{ t("workflow.pending") }}</h2>
          <a-textarea
            v-model="comment"
            :max-length="500"
            :aria-label="t('workflow.comment')"
            :placeholder="t('workflow.comment')"
          />
          <div
            v-for="task in activeInstance.tasks.filter((v) =>
              ['pending', 'external'].includes(v.status),
            )"
            :key="task.id"
            class="task"
          >
            <strong>{{
              task.node.name || nodeLabel(t, task.node.kind)
            }}</strong>
            <p>
              {{ t("workflow.assignees") }}：{{
                task.assignees
                  .map(
                    (id) => actorOptions.find((u) => u.id === id)?.name ?? id,
                  )
                  .join("、")
              }}
            </p>
            <a-alert v-if="task.status === 'external'" type="warning"
              >{{
                data.adapters[task.node.kind]
                  ? t("workflow.externalReady")
                  : t("workflow.externalPending")
              }}<a-button
                v-if="data.adapters[task.node.kind]"
                :disabled="busy"
                @click="taskAction('retry', task.id)"
                >{{ t("workflow.retry") }}</a-button
              ></a-alert
            ><a-alert v-else-if="!task.assignees.includes('u-admin')">{{
              t("workflow.otherAssignee")
            }}</a-alert
            ><a-space v-else-if="task.node.kind === 'review'"
              ><a-button
                type="primary"
                :disabled="busy || task.votes?.includes('u-admin')"
                @click="taskAction('approve', task.id)"
                >{{ t("workflow.approve") }}</a-button
              ><a-button
                status="danger"
                :disabled="busy || task.votes?.includes('u-admin')"
                @click="taskAction('reject', task.id)"
                >{{ t("workflow.reject") }}</a-button
              ></a-space
            ><a-space v-else
              ><a-button
                type="primary"
                :disabled="busy"
                @click="taskAction('submit', task.id)"
                >{{ t("workflow.submit") }}</a-button
              ><a-button
                :disabled="busy"
                @click="taskAction('return', task.id)"
                >{{ t("workflow.return") }}</a-button
              ></a-space
            >
          </div>
        </section>
        <section class="panel">
          <h2>{{ t("workflow.history") }}</h2>
          <a-timeline
            ><a-timeline-item
              v-for="event in activeInstance.history"
              :key="event.id"
              :label="event.at"
              >{{ t(`workflow.events.${event.code}`) }} ·
              {{ event.nodeId || "—" }}
              <p v-if="event.comment">{{ event.comment }}</p></a-timeline-item
            ></a-timeline
          >
        </section></template
      ></a-drawer
    >
    <a-modal
      v-model:visible="activityOpen"
      :title="t('workflow.createActivity')"
      :on-before-ok="
        async () => {
          await createActivity();
          return !activityOpen;
        }
      "
      ><a-form :model="activityForm" layout="vertical"
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.activity")
            }}</span></template
          ><a-input
            v-model="activityForm.name"
            :max-length="100" /></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.planEnd")
            }}</span></template
          ><a-date-picker
            v-model="activityForm.planEnd" /></a-form-item></a-form
    ></a-modal>

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
.workflow-tabs {
  display: flex;
  gap: 24px;
  padding-bottom: 0;
}
.workflow-tabs button {
  font: inherit;
  color: var(--app-text-secondary);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 0 0 12px;
  cursor: pointer;
}
.workflow-tabs button.active {
  border-bottom-color: var(--app-color-primary);
  color: var(--app-color-primary);
}
.workflow-tabs button:focus-visible {
  outline: 2px solid var(--app-color-primary);
}
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
.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.filters .app-field-label {
  white-space: nowrap;
  flex-shrink: 0;
}
.filters .filter-field {
  flex-shrink: 0;
  display: inline-grid;
  grid-template-columns: max-content minmax(0, 200px);
  align-items: center;
  gap: 8px;
}
.filters .filter-field > .arco-input-wrapper {
  width: 200px;
}
.filters .filter-field > .arco-select {
  width: 200px;
}
.toolbar,
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
.task {
  padding: 16px 0;
  border-bottom: 1px solid var(--app-divider);
}
.task p {
  color: var(--app-text-secondary);
}
:deep(.arco-pagination) {
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
:deep(.arco-drawer-body) {
  background: var(--app-fill-1);
}
@media (max-width: 900px) {
  .toolbar {
    flex-wrap: wrap;
  }
  .filters .app-field-label {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .filters .filter-field {
    max-width: 100%;
  }
  .filters label > .arco-input-wrapper,
  .filters .filter-field > .arco-select {
    flex: 1;
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
.filters .app-field-label {
  text-align: right;
}
@media (max-width: 600px) {
  .filters .filter-field {
    width: 100%;
    grid-template-columns: max-content minmax(0, 1fr);
  }
  .filters .app-filter-control {
    width: 100% !important;
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
