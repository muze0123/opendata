<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '../../auth/stores/auth';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AppDetailList from '../../../design/components/AppDetailList.vue';
import AppListToolbar from '../../../design/components/AppListToolbar.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import BusinessTaskActionDialog from '../components/BusinessTaskActionDialog.vue';
import { getTask, getTaskActions, getSession } from '../api';
import { allowedActions, taskRole, useBusinessTaskLabels } from '../labels';
import type { ActionLog, Session, Task, TaskAction } from '../data/contracts';

const route = useRoute(); const router = useRouter(); const auth = useAuthStore();
const { t } = useI18n();
const { actionLabel, statusLabel, errorLabel, dateLabel } = useBusinessTaskLabels();
const task = ref<Task>(); const session = ref<Session>(); const history = ref<ActionLog[]>([]);
const loading = ref(false); const error = ref<unknown>(); const historyError = ref<unknown>();
const action = ref<TaskAction>(); const dialogOpen = ref(false); const conflict = ref(false);
let active = 0; let request: AbortController | undefined;
const ancestor = computed(() => router.resolve({ name: 'business-tasks', query: route.query }).href);
const actions = computed(() => task.value && session.value ? allowedActions(task.value, session.value) : []);
const fields = computed(() => task.value ? [
  { key: 'title', label: t('businessTasks.fields.title'), value: task.value.title },
  ...(['id', 'businessKey', 'businessType', 'platformCode', 'rootTaskId', 'nodeTaskId', 'workflowInstanceId', 'assigneeId', 'creatorId', 'version', 'returnCount'] as const).map(key => ({ key, label: t(`businessTasks.fields.${key}`), value: String(task.value![key]) })),
  ...(['createdAt', 'updatedAt'] as const).map(key => ({ key, label: t(`businessTasks.fields.${key}`), value: dateLabel(task.value![key]) })),
] : []);
async function load() {
  const ticket = ++active;
  request?.abort(); request = new AbortController(); loading.value = true; error.value = undefined; historyError.value = undefined;
  const id = String(route.params.id);
  try {
    const [record, identity] = await Promise.all([getTask(id, request.signal), getSession(request.signal)]);
    if (ticket !== active) return;
    task.value = record; session.value = identity;
    try {
      const records = await getTaskActions(id, request.signal);
      if (ticket === active) history.value = records;
    } catch (failure) { if (ticket === active) { history.value = []; historyError.value = failure; } }
  } catch (failure) { if (ticket === active) { error.value = failure; task.value = undefined; session.value = undefined; } }
  finally { if (ticket === active) loading.value = false; }
}
function openAction(value: TaskAction) { action.value = value; conflict.value = false; dialogOpen.value = true; }
function updated(value: Task) { task.value = value; conflict.value = false; Message.success(t('businessTasks.updated')); void load(); }
function reloadConflict() { conflict.value = true; void load(); }
watch([() => route.params.id, () => auth.token], () => { dialogOpen.value = false; history.value = []; void load(); }, { immediate: true });
onBeforeUnmount(() => { active++; request?.abort(); });
</script>

<template>
  <div class="business-task-detail">
    <AppDetailHeader :ancestor-to="ancestor" :ancestor-label="t('businessTasks.list')" :current-label="task?.title ?? t('businessTasks.detail')">
      <template #actions>
        <AppStatusTag v-if="task" :role="taskRole(task.status)" :label="statusLabel(task.status)" />
        <a-button v-for="code in actions" :key="code" :type="code === 'start' || code === 'complete' ? 'primary' : 'secondary'" :disabled="loading" @click="openAction(code)">{{ actionLabel(code) }}</a-button>
        <a-button class="app-btn-neutral" :loading="loading" @click="load">{{ t('businessTasks.refresh') }}</a-button>
      </template>
    </AppDetailHeader>
    <a-alert v-if="conflict" type="warning" :title="t('businessTasks.errors.VERSION_CONFLICT')" />
    <a-alert v-if="error" type="error" :title="errorLabel(error)">
      <template #action><a-button @click="load">{{ t('businessTasks.retry') }}</a-button></template>
    </a-alert>
    <a-spin v-else :loading="loading" class="business-task-content">
      <div v-if="task" class="business-task-sections">
        <section class="business-task-detail-panel" :aria-label="t('businessTasks.basic')">
          <AppListToolbar :title="t('businessTasks.basic')" />
          <AppDetailList :fields="fields" />
          <p v-if="task.description" class="business-task-description">{{ task.description }}</p>
        </section>
        <section class="business-task-detail-panel" :aria-label="t('businessTasks.history')">
          <AppListToolbar :title="t('businessTasks.history')" />
          <a-alert v-if="historyError" type="error" :title="errorLabel(historyError)"><template #action><a-button @click="load">{{ t('businessTasks.retry') }}</a-button></template></a-alert>
          <a-timeline v-else-if="history.length">
            <a-timeline-item v-for="record in history" :key="record.id" :label="dateLabel(record.occurredAt)">
              <span>{{ actionLabel(record.action as TaskAction | 'received') }} · {{ record.operatorId }}</span>
              <p v-if="record.reason" class="business-task-reason">{{ record.reason }}</p>
            </a-timeline-item>
          </a-timeline>
          <a-empty v-else :description="t('businessTasks.emptyHistory')" />
        </section>
      </div>
    </a-spin>
    <BusinessTaskActionDialog v-if="task && session && action" v-model:visible="dialogOpen" :task="task" :session="session" :action="action" @succeeded="updated" @conflict="reloadConflict" />
  </div>
</template>

<style scoped>
.business-task-detail, .business-task-sections { display: flex; flex-direction: column; gap: var(--mt-ds-space-4); min-width: 0; }
.business-task-content { display: block; min-width: 0; width: 100%; }
.business-task-detail-panel { padding: var(--mt-ds-space-4); background: var(--mt-ds-surface); border-radius: var(--mt-ds-control-radius); min-width: 0; }
.business-task-description, .business-task-reason { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--mt-ds-text-secondary); font-size: var(--mt-ds-font-body); line-height: var(--mt-ds-line-body); margin-bottom: 0; }
</style>
