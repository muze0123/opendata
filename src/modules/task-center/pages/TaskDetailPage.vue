<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { IconArrowLeft, IconCheckCircle, IconDelete, IconFile, IconForward, IconHistory, IconPlus, IconUndo, IconSend, IconStop } from '@arco-design/web-vue/es/icon';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { currentTaskUser, getTask, memberOptions, taskPriorityLabels, taskRecords, taskStatusLabels, updateTaskStatus, type TaskActionCode, type TaskRecord, type TaskStatus } from '../data/tasks';
import { useTaskLabels } from '../labels';

type ActionKind = 'reject' | 'return' | 'finish' | 'recall' | 'transfer' | 'cancel' | 'delete';
const route = useRoute();
const router = useRouter();
const { t, te } = useI18n({ useScope: 'global' });
const { appLabel, projectLabel } = useTaskLabels();
const task = computed(() => getTask(String(route.params.taskId)));
const actionVisible = ref(false);
const actionKind = ref<ActionKind>('finish');
const actionLoading = ref(false);
const actionForm = reactive({ opinion: '', assignee: '' });

const actionMeta: Record<ActionKind, { titleKey: string; messageKey: string; confirmKey: string; danger?: boolean; requireOpinion?: boolean }> = {
  reject: { titleKey: 'tasks.detail.reject', messageKey: 'tasks.detail.rejectMessage', confirmKey: 'tasks.detail.reject', requireOpinion: true },
  return: { titleKey: 'tasks.detail.return', messageKey: 'tasks.detail.returnMessage', confirmKey: 'tasks.create.confirm', requireOpinion: true },
  finish: { titleKey: 'tasks.detail.finish', messageKey: 'tasks.detail.finishMessage', confirmKey: 'tasks.create.confirm', requireOpinion: true },
  recall: { titleKey: 'tasks.detail.recall', messageKey: 'tasks.detail.recallMessage', confirmKey: 'tasks.create.confirm', requireOpinion: true },
  transfer: { titleKey: 'tasks.detail.transfer', messageKey: '', confirmKey: 'tasks.create.confirm' },
  cancel: { titleKey: 'tasks.detail.cancel', messageKey: 'tasks.detail.cancelMessage', confirmKey: 'tasks.detail.cancel', danger: true },
  delete: { titleKey: 'tasks.detail.delete', messageKey: 'tasks.detail.deleteMessage', confirmKey: 'tasks.detail.delete', danger: true },
};
const currentAction = computed(() => ({ ...actionMeta[actionKind.value], title: t(actionMeta[actionKind.value].titleKey), message: actionMeta[actionKind.value].messageKey ? t(actionMeta[actionKind.value].messageKey) : '', confirm: t(actionMeta[actionKind.value].confirmKey) }));

function taskText(field: 'name' | 'description' | 'content') {
  if (!task.value) return '';
  const key = `tasks.records.${task.value.id}.${field}`;
  return te(key) ? t(key) : task.value[field];
}
function statusLabel(value: TaskStatus) { return t(`tasks.statuses.${value}`); }
function priorityLabel(value: TaskRecord['priority']) { return t(`tasks.priorities.${value}`); }
function actionLabel(value: TaskActionCode) { const key = `tasks.actionsLog.${value}`; return te(key) ? t(key) : value; }
function recordDetail(value: string) {
  if (value === '创建任务并提交') return t('tasks.detail.recordCreated');
  if (value === '开始处理任务') return t('tasks.detail.executeSuccess');
  if (value === '审核通过，任务结束') return t('tasks.detail.recordApproved');
  if (value === '材料不完整，退回补充') return t('tasks.detail.recordRejected');
  if (value === '任务已作废') return t('tasks.detail.recordCancelled');
  return value;
}
function flowTitle(type: TaskRecord['flow'][number]['type']) { return t(`tasks.create.${type === 'submit' ? 'submit' : type === 'review' ? 'review' : 'end'}`); }
function flowAssignee(value: string) {
  const submitterPrefix = '发起人：';
  const memberPrefix = '指定成员：';
  const endValue = '流程未结束';
  const endedValue = '流程已结束';
  if (value.startsWith(submitterPrefix)) return `${t('tasks.create.submitter')}: ${value.slice(submitterPrefix.length)}`;
  if (value.startsWith(memberPrefix)) return `${t('tasks.create.designatedMember')}: ${value.slice(memberPrefix.length)}`;
  if (value === endValue) return t('tasks.create.notEnded');
  if (value === endedValue) return t('tasks.create.ended');
  return value;
}

function statusColor(status: TaskStatus) { return status === 'completed' ? 'green' : status === 'in-progress' ? 'arcoblue' : status === 'pending' ? 'orange' : status === 'rejected' || status === 'cancelled' ? 'red' : 'gray'; }
function priorityColor(priority: TaskRecord['priority']) { return priority === 'urgent' || priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'gray'; }
function openAction(kind: ActionKind) {
  actionKind.value = kind; actionForm.opinion = ''; actionForm.assignee = memberOptions.find((member) => member !== currentTaskUser) ?? ''; actionVisible.value = true;
}
function canHandle() { return Boolean(task.value && ['pending', 'in-progress', 'rejected'].includes(task.value.status)); }
function handleExecute() { if (!task.value) return; updateTaskStatus(task.value, 'in-progress', 'execute', '开始处理任务'); Message.success(t('tasks.detail.executeSuccess')); }
function performAction() {
  if (!task.value) return;
  if (currentAction.value.requireOpinion && !actionForm.opinion.trim()) { Message.warning(t('tasks.create.opinionRequired')); return; }
  actionLoading.value = true;
  window.setTimeout(() => {
    const current = task.value;
    if (!current) return;
    if (actionKind.value === 'transfer') { current.assignees = [actionForm.assignee]; current.flow = current.flow.map((node) => node.type === 'review' ? { ...node, assignee: `指定成员：${actionForm.assignee}` } : node); current.records.push({ id: `r-${Date.now()}`, action: 'transfer', operator: currentTaskUser, detail: `转交给 ${actionForm.assignee}${actionForm.opinion ? `：${actionForm.opinion}` : ''}`, time: new Date().toISOString().slice(0, 16).replace('T', ' ') }); current.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' '); }
    else if (actionKind.value === 'reject') updateTaskStatus(current, 'rejected', 'reject', actionForm.opinion);
    else if (actionKind.value === 'return') updateTaskStatus(current, 'pending', 'return', actionForm.opinion);
    else if (actionKind.value === 'finish') updateTaskStatus(current, 'completed', 'finish', actionForm.opinion);
    else if (actionKind.value === 'recall') updateTaskStatus(current, 'recalled', 'recall', actionForm.opinion);
    else if (actionKind.value === 'cancel') updateTaskStatus(current, 'cancelled', 'cancel', '任务已作废');
    else if (actionKind.value === 'delete') { const index = taskRecords.findIndex((item) => item.id === current.id); if (index >= 0) taskRecords.splice(index, 1); actionVisible.value = false; actionLoading.value = false; Message.success(t('tasks.detail.deleteSuccess')); router.replace({ name: 'tasks' }); return; }
    actionVisible.value = false; actionLoading.value = false; Message.success(t('tasks.detail.actionSuccess', { action: currentAction.value.title }));
  }, 240);
}
function goBack() { router.push({ name: 'tasks' }); }
</script>

<template>
  <main v-if="task" class="task-detail-page">
    <header class="detail-header"><div><a-button type="text" class="back-button" @click="goBack"><IconArrowLeft />{{ t('tasks.detail.back') }}</a-button><div class="detail-title-row"><h1>{{ taskText('name') }}</h1><a-tag :color="statusColor(task.status)">{{ statusLabel(task.status) }}</a-tag></div></div><a-space><a-button v-if="task.status === 'pending'" type="primary" @click="handleExecute"><IconSend />{{ t('tasks.detail.execute') }}</a-button><a-button v-if="task.status === 'pending' && task.creator === currentTaskUser" status="danger" @click="openAction('cancel')"><IconStop />{{ t('tasks.detail.cancel') }}</a-button><a-button v-if="['completed', 'recalled', 'cancelled'].includes(task.status) && task.creator === currentTaskUser" status="danger" @click="openAction('delete')"><IconDelete />{{ t('tasks.detail.delete') }}</a-button></a-space></header>
    <div class="detail-grid">
      <div class="detail-main">
        <section class="detail-card"><h2>{{ t('tasks.detail.overview') }}</h2><div class="task-info-grid"><div><span>{{ t('tasks.fields.priority') }}</span><strong><a-tag :color="priorityColor(task.priority)">{{ priorityLabel(task.priority) }}</a-tag></strong></div><div><span>{{ t('tasks.fields.createdAt') }}</span><strong>{{ task.createdAt }}</strong></div><div><span>{{ t('tasks.create.deadline') }}</span><strong>{{ task.deadline }}</strong></div><div><span>{{ t('tasks.fields.sourceApp') }}</span><strong>{{ appLabel(task.sourceApp) }}</strong></div><div><span>{{ t('tasks.fields.targetApp') }}</span><strong>{{ appLabel(task.targetApp) }}</strong></div><div><span>{{ t('tasks.fields.vehicle') }}</span><strong>{{ task?.vehicle ?? '—' }}</strong></div><div class="wide"><span>{{ t('tasks.fields.project') }}</span><strong>{{ projectLabel(task.project) }}</strong></div><div class="wide"><span>{{ t('tasks.detail.description') }}</span><strong>{{ taskText('description') || '—' }}</strong></div><div class="wide"><span>{{ t('tasks.detail.attachments') }}</span><div class="attachment-list"><a-link v-for="attachment in task.attachments" :key="attachment.id"><IconFile />{{ attachment.name }}</a-link><span v-if="!task.attachments.length">{{ t('tasks.detail.noAttachments') }}</span></div></div></div></section>
        <section class="detail-card"><h2>{{ t('tasks.detail.taskContent') }}</h2><p class="task-content">{{ taskText('content') }}</p></section>
        <section v-if="canHandle()" class="detail-card task-handle-card"><h2>{{ t('tasks.detail.handle') }}</h2><a-form :model="task" layout="vertical"><a-form-item :label="t('tasks.detail.handlingOpinion')"><a-textarea v-model="task.handlingOpinion" :auto-size="{ minRows: 4, maxRows: 7 }" :placeholder="t('tasks.detail.input')" /></a-form-item><a-form-item :label="t('tasks.detail.uploadResult')"><div class="upload-placeholder"><IconPlus />{{ t('tasks.create.upload') }}<small>{{ t('tasks.create.uploadHint') }}</small></div></a-form-item></a-form><div class="handle-actions"><a-button @click="openAction('return')"><IconUndo />{{ t('tasks.detail.return') }}</a-button><a-button @click="openAction('finish')"><IconCheckCircle />{{ t('tasks.detail.finish') }}</a-button><a-button @click="openAction('transfer')"><IconForward />{{ t('tasks.detail.transfer') }}</a-button><a-button v-if="task.creator === currentTaskUser" @click="openAction('recall')"><IconHistory />{{ t('tasks.detail.recall') }}</a-button><a-button type="primary" @click="openAction('finish')"><IconCheckCircle />{{ t('tasks.detail.submit') }}</a-button></div></section>
      </div>
      <aside class="detail-side"><section class="detail-card"><h2>{{ t('tasks.detail.flow') }}</h2><div class="flow-detail"><div v-for="node in task.flow" :key="node.id" class="flow-detail-node" :class="`flow-detail-node--${node.status}`"><div class="flow-node-title"><span class="flow-node-dot" aria-hidden="true" />{{ flowTitle(node.type) }}</div><p>{{ flowAssignee(node.assignee) }}</p></div></div></section><section class="detail-card operation-card"><h2>{{ t('tasks.detail.records') }}</h2><a-timeline v-if="task.records.length"><a-timeline-item v-for="record in task.records" :key="record.id" dot-color="arcoblue"><div class="operation-heading"><strong>{{ actionLabel(record.action) }} | {{ record.operator }}</strong></div><p>{{ recordDetail(record.detail) }}</p><small>{{ record.time }}<em v-if="record.duration">{{ record.duration }}</em></small></a-timeline-item></a-timeline><a-empty v-else :description="t('tasks.detail.noRecords')" /></section></aside>
    </div>
    <a-modal v-model:visible="actionVisible" :title="currentAction.title" :ok-text="currentAction.confirm" :ok-button-props="{ status: currentAction.danger ? 'danger' : 'normal', loading: actionLoading }" @ok="performAction"><template v-if="actionKind === 'transfer'"><a-form :model="actionForm" layout="vertical"><a-form-item :label="t('tasks.detail.transferTo')" required><a-select v-model="actionForm.assignee" :options="memberOptions.filter((member) => member !== currentTaskUser).map((value) => ({ value, label: value }))" /></a-form-item><a-form-item :label="t('tasks.detail.transferOpinion')"><a-textarea v-model="actionForm.opinion" :placeholder="t('tasks.detail.input')" :auto-size="{ minRows: 4, maxRows: 6 }" /></a-form-item></a-form></template><template v-else><p class="action-message">{{ currentAction.message }}</p><a-form v-if="currentAction.requireOpinion" :model="actionForm" layout="vertical"><a-form-item :label="t('tasks.detail.opinion')" required><a-textarea v-model="actionForm.opinion" :placeholder="t('tasks.detail.input')" :auto-size="{ minRows: 4, maxRows: 6 }" /></a-form-item></a-form></template></a-modal>
  </main>
  <main v-else class="task-not-found"><a-result status="404" :title="t('tasks.detail.notFound')"><template #extra><a-button type="primary" @click="goBack">{{ t('tasks.detail.backToTasks') }}</a-button></template></a-result></main>
</template>

<style scoped>
.task-detail-page { min-height: calc(100dvh - 56px); padding: 16px var(--app-page-gutter); background: var(--app-page); }
.detail-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; max-width: 1400px; margin: 0 auto 16px; }.back-button { padding-inline: 0; color: var(--color-text-3); }.detail-title-row { display: flex; align-items: center; gap: 12px; }.detail-title-row h1 { margin: 8px 0 0; font-size: 18px; font-weight: 600; line-height: 26px; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: start; gap: 16px; max-width: 1400px; margin: 0 auto; }.detail-main, .detail-side { display: grid; gap: 16px; }.detail-card { padding: 16px; background: var(--color-bg-2); }.detail-card h2 { margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border-2); font-size: 16px; line-height: 24px; font-weight: 600; }.task-info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 28px; }.task-info-grid > div { display: grid; gap: 8px; min-width: 0; }.task-info-grid .wide { grid-column: 1 / -1; }.task-info-grid span { color: var(--color-text-3); font-size: 13px; }.task-info-grid strong { color: var(--color-text-1); font-size: 14px; font-weight: 400; }.attachment-list { display: flex; flex-wrap: wrap; gap: 12px; }.task-content { min-height: 82px; margin: 0; color: var(--color-text-2); line-height: 1.8; white-space: pre-wrap; }.task-handle-card :deep(.arco-form-item) { margin-bottom: 18px; }.upload-placeholder { display: grid; place-items: center; gap: 7px; min-height: 110px; border: 1px dashed var(--color-border-3); color: var(--color-text-2); background: var(--color-fill-1); }.upload-placeholder small { color: var(--color-text-3); }.handle-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid var(--color-border-2); }.flow-detail { display: grid; gap: 10px; }.flow-detail-node { padding: 10px 12px; border: 1px solid var(--color-primary-light-3); background: var(--color-primary-light-1); }.flow-detail-node--current { border-color: var(--color-warning-6); background: var(--color-warning-light-1); }.flow-detail-node--pending { border-color: var(--color-border-2); background: var(--color-fill-1); }.flow-node-title { display: flex; align-items: center; gap: 8px; font-size: 14px; }.flow-node-dot { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--primary-6)); }.flow-detail-node--current .flow-node-dot { background: rgb(var(--warning-6)); }.flow-detail-node--pending .flow-node-dot { background: var(--color-text-4); }.flow-detail-node p { margin: 6px 0 0 15px; color: var(--color-text-3); font-size: 12px; }.operation-card :deep(.arco-timeline-item-content) { padding-bottom: 20px; }.operation-heading strong { font-weight: 500; }.operation-card p { margin: 6px 0; color: var(--color-text-2); font-size: 13px; }.operation-card small { display: flex; justify-content: space-between; color: var(--color-text-3); }.operation-card em { font-style: normal; }.action-message { margin: 0 0 20px; color: var(--color-text-2); font-size: 16px; line-height: 1.7; }.task-not-found { display: grid; min-height: calc(100dvh - 56px); place-items: center; }
@media (max-width: 960px) { .detail-grid { grid-template-columns: 1fr; }.detail-side { grid-template-columns: repeat(2, minmax(0, 1fr)); }.task-info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .task-detail-page { padding-inline: 16px; }.detail-header { align-items: flex-start; flex-direction: column; }.detail-side { grid-template-columns: 1fr; }.task-info-grid { grid-template-columns: 1fr; }.task-info-grid .wide { grid-column: auto; }.handle-actions { flex-wrap: wrap; justify-content: flex-start; } }
</style>
