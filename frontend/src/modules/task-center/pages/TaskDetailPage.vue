<script setup lang="ts">
/**
 * 任务详情子页面（/tasks/:taskId）—— 按 DESIGN.md 重构。
 *
 * - Section list and child-route composition：56px 顶栏下的白色 sticky 操作带
 *   （父级链接 / 当前对象 / 状态 / 关键操作），内容区不显示页面标题；
 *   内容由 Fill-1 画布上彼此独立的白卡分组构成，16px 内边距、2px 圆角、12px 模块间距，不嵌套卡片。
 * - Descriptions / 字段标签冒号：只读事实统一走共享 .app-detail-list 行，
 *   表单标签走 .app-field-label，冒号由 --app-field-colon 按语言渲染。
 * - Dialog：纯确认（执行 / 作废 / 删除）走共享 ConfirmDialog 并点名任务；
 *   需要输入的处理动作走带标题头与描边 footer 的表单弹窗。
 * - Button：非强调按钮统一 app-btn-neutral（白底描边），每个区域只保留一个主操作。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Message, type FileItem } from '@arco-design/web-vue';
import { IconPlus, IconDelete, IconFile, IconSend, IconStop } from '@arco-design/web-vue/es/icon';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import {
  appendTaskRecord,
  currentTaskUser,
  getTask,
  memberOptions,
  taskRecords,
  updateTaskStatus,
  type TaskActionCode,
  type TaskRecord,
  type TaskStatus,
} from '../data/tasks';
import { useTaskLabels } from '../labels';

import { roles } from '../../user-management/data/users';

type FormActionKind = 'submit' | 'approve' | 'reject' | 'return' | 'finish' | 'recall' | 'transfer';
type ConfirmKind = 'execute' | 'cancel' | 'delete';

const route = useRoute();
const router = useRouter();
const { t, te } = useI18n({ useScope: 'global' });
const { appLabel, projectLabel } = useTaskLabels();
const task = computed(() => getTask(String(route.params.taskId)));
const taskName = computed(() => taskText('name'));
const terminal = computed(() => Boolean(task.value && ['completed', 'recalled', 'cancelled'].includes(task.value.status)));

/** sticky 判定：与 ProductLayout 的 56px 固定顶栏对齐；吸顶时用 Level-4 阴影分层，常态不画描边。 */
const STICKY_TOP = 56;
const opBand = ref<HTMLElement | null>(null);
const stuck = ref(false);
let frame = 0;
function measureSticky() {
  frame = 0;
  const el = opBand.value;
  if (!el) return;
  stuck.value = el.getBoundingClientRect().top <= STICKY_TOP + 0.5;
}
function scheduleMeasure() { if (!frame) frame = requestAnimationFrame(measureSticky); }
onMounted(() => {
  measureSticky();
  window.addEventListener('scroll', scheduleMeasure, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
});
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  window.removeEventListener('scroll', scheduleMeasure);
  window.removeEventListener('resize', scheduleMeasure);
});

/* ---------------------------------------------------------- 需输入的处理动作（表单弹窗） */
const actionVisible = ref(false);
const actionKind = ref<FormActionKind>('finish');
const actionLoading = ref(false);
const actionForm = reactive({ opinion: '', assignee: '', returnNodeId: '' });

const returnNodeError = ref(false);
const returnNodeOptions = computed(() => {
  const flow = task.value?.flow ?? [];
  const currentIndex = flow.findIndex(node => node.status === 'current');
  return flow.slice(0, Math.max(0, currentIndex)).filter(node => node.type !== 'end').map(node => ({
    value: node.id,
    label: `${node.title}（${node.assignee.replace(/^(发起人|指定成员)：/, '')}）`,
  }));
});
const handlingOpinion = ref('');
const handlingFiles = ref<FileItem[]>([]);
const copyType = ref('users');
const copiedMembers = ref<string[]>([]);
const copiedRoles = ref<string[]>([]);
const isReview = computed(() => task.value?.flow.some(node => node.status === 'current' && node.type === 'review') ?? false);
function beforeHandlingUpload(file: File) {
  if (handlingFiles.value.length >= 5 || file.size > 20 * 1024 * 1024 || !/\.(docx?|xlsx?|pdf|png|jpe?g)$/i.test(file.name)) {
    Message.warning(t('taskHandling.fileError'));
    return false;
  }
  return true;
}
function submitHandling() {
  actionKind.value = isReview.value ? 'approve' : 'submit';
  actionForm.opinion = handlingOpinion.value;
  performAction();
}

const actionMeta: Record<FormActionKind, { titleKey: string; messageKey: string; confirmKey: string; requireOpinion: boolean }> = {
  submit: { titleKey: 'tasks.detail.submit', messageKey: 'tasks.detail.executeMessage', confirmKey: 'tasks.detail.submit', requireOpinion: false },
  approve: { titleKey: 'tasks.actionsLog.approve', messageKey: 'tasks.detail.executeMessage', confirmKey: 'tasks.actionsLog.approve', requireOpinion: false },
  reject: { titleKey: 'tasks.detail.reject', messageKey: 'tasks.detail.rejectMessage', confirmKey: 'tasks.detail.reject', requireOpinion: false },
  return: { titleKey: 'tasks.detail.return', messageKey: 'tasks.detail.returnMessage', confirmKey: 'tasks.detail.return', requireOpinion: false },
  finish: { titleKey: 'tasks.detail.finish', messageKey: 'tasks.detail.finishMessage', confirmKey: 'tasks.detail.finish', requireOpinion: false },
  recall: { titleKey: 'tasks.detail.recall', messageKey: 'tasks.detail.recallMessage', confirmKey: 'tasks.detail.recall', requireOpinion: false },
  transfer: { titleKey: 'tasks.detail.transfer', messageKey: 'tasks.detail.transferMessage', confirmKey: 'tasks.detail.transfer', requireOpinion: false },
};
const currentAction = computed(() => ({
  ...actionMeta[actionKind.value],
  title: t(actionMeta[actionKind.value].titleKey),
  message: t(actionMeta[actionKind.value].messageKey),
  confirm: t(actionMeta[actionKind.value].confirmKey),
}));

/* ---------------------------------------------------------- 纯确认动作（共享 ConfirmDialog） */
const confirmVisible = ref(false);
const confirmKind = ref<ConfirmKind>('execute');
const confirmMeta = computed(() => {
  const name = taskName.value;
  const config: Record<ConfirmKind, { icon: 'question' | 'warning' | 'danger'; title: string; description: string; ok: string }> = {
    execute: { icon: 'question', title: t('tasks.detail.executeConfirmTitle', { name }), description: t('tasks.detail.executeMessage'), ok: t('tasks.detail.confirmExecute') },
    cancel: { icon: 'warning', title: t('tasks.detail.cancelConfirmTitle', { name }), description: t('tasks.detail.cancelMessage'), ok: t('tasks.detail.cancel') },
    delete: { icon: 'danger', title: t('tasks.detail.deleteConfirmTitle', { name }), description: t('tasks.detail.deleteMessage'), ok: t('tasks.detail.delete') },
  };
  return config[confirmKind.value];
});

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
function durationLabel(value: string) {
  /* 操作记录耗时：去掉数据中的内嵌空格，统一为「耗时8分钟」紧凑写法 */
  return value.replace(/\s+/g, '');
}
function flowTitle(type: TaskRecord['flow'][number]['type']) { return t(`tasks.create.${type === 'submit' ? 'submit' : type === 'review' ? 'review' : 'end'}`); }
function flowStateLabel(value: TaskRecord['flow'][number]['status']) {
  return t(`tasks.detail.flow${value === 'completed' ? 'Done' : value === 'current' ? 'Current' : 'Pending'}`);
}
function flowAssignee(value: string) {
  const submitterPrefix = '发起人：';
  const memberPrefix = '指定成员：';
  if (value.startsWith(submitterPrefix)) return `${t('tasks.create.submitter')}: ${value.slice(submitterPrefix.length)}`;
  if (value.startsWith(memberPrefix)) return `${t('tasks.create.designatedMember')}: ${value.slice(memberPrefix.length)}`;
  if (value === '流程未结束') return t('tasks.create.notEnded');
  if (value === '流程已结束') return t('tasks.create.ended');
  return value;
}
function statusColor(status: TaskStatus) { return status === 'completed' ? 'green' : status === 'in-progress' ? 'arcoblue' : status === 'pending' ? 'orange' : status === 'rejected' || status === 'cancelled' ? 'red' : 'gray'; }
function priorityColor(priority: TaskRecord['priority']) { return priority === 'urgent' || priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'gray'; }

function canHandle() { return Boolean(route.query.mode === 'execute' && task.value && ['pending', 'in-progress'].includes(task.value.status)); }
function openAction(kind: FormActionKind) {
  actionKind.value = kind;
  actionForm.opinion = handlingOpinion.value;
  actionForm.assignee = '';
  actionForm.returnNodeId = '';
  returnNodeError.value = false;
  actionVisible.value = true;
}
function openConfirm(kind: ConfirmKind) { confirmKind.value = kind; confirmVisible.value = true; }
function goBack() { void router.push({ name: 'tasks' }); }

/** 表单弹窗：必填说明为空时禁止提交（PRD §9），转交需选定成员；成功后才写回任务记录。 */
function performAction() {
  if (!task.value || actionLoading.value || !canHandle()) return;
  if (actionKind.value === 'recall' && task.value.creator !== currentTaskUser) return;
  const kind = actionKind.value;
  if (kind === 'return' && !returnNodeOptions.value.some(node => node.value === actionForm.returnNodeId)) {
    returnNodeError.value = true;
    return;
  }
  if (actionMeta[kind].requireOpinion && !actionForm.opinion.trim()) { Message.warning(t('tasks.create.opinionRequired')); return; }
  if (kind === 'transfer' && (!actionForm.assignee || actionForm.assignee === currentTaskUser)) { Message.warning(t('tasks.detail.transferRequired')); return; }
  actionLoading.value = true;
  window.setTimeout(() => {
    const current = task.value;
    if (!current) { actionLoading.value = false; return; }
    const opinion = actionForm.opinion.trim();
    current.handlingOpinion = handlingOpinion.value.trim() || opinion;
    current.handlingAttachments = handlingFiles.value.map(file => ({ id: file.uid, name: file.name ?? '', size: file.file?.size ?? 0, type: file.file?.type ?? '' }));
    current.copiedUsers = [...new Set([...current.copiedUsers, ...copiedMembers.value])];
    current.copiedRoles = [...copiedRoles.value];
    if (kind === 'submit' || kind === 'approve') {
      const index = current.flow.findIndex(node => node.status === 'current');
      const next = current.flow[index + 1];
      if (index >= 0) current.flow[index]!.status = 'completed';
      if (next && next.type !== 'end') {
        next.status = 'current';
        current.status = 'in-progress';
      } else {
        current.flow.forEach(node => { node.status = 'completed'; });
        current.status = 'completed';
      }
      appendTaskRecord(current, kind, opinion);
    } else if (kind === 'transfer') {
      current.assignees = [actionForm.assignee];
      current.flow = current.flow.map((node) => node.type === 'review' ? { ...node, assignee: `指定成员：${actionForm.assignee}` } : node);
      appendTaskRecord(current, 'transfer', t('tasks.detail.recordTransferred', { member: actionForm.assignee }) + (opinion ? `：${opinion}` : ''));
    } else if (kind === 'reject' || kind === 'return') {
      const index = current.flow.findIndex(node => node.status === 'current');
      const previous = kind === 'return' ? current.flow.findIndex(node => node.id === actionForm.returnNodeId) : Math.max(0, index - 1);
      if (previous < 0) { actionLoading.value = false; return; }
      current.assignees = [current.flow[previous]!.assignee.replace(/^(发起人|指定成员)：/, '')];
      current.flow.forEach((node, nodeIndex) => { node.status = nodeIndex < previous ? 'completed' : nodeIndex === previous ? 'current' : 'pending'; });
      current.status = 'pending';
      appendTaskRecord(current, kind, opinion);
    }
    else if (kind === 'finish') updateTaskStatus(current, 'completed', 'finish', opinion);
    else if (kind === 'recall') updateTaskStatus(current, 'recalled', 'recall', opinion);
    actionVisible.value = false;
    actionLoading.value = false;
    Message.success(t('tasks.detail.actionSuccess', { action: currentAction.value.title }));
    goBack();
  }, 240);
}

/** 纯确认动作：状态流转与删除都通过点名任务的二次确认（PRD §9 / DESIGN.md · Button）。 */
function performConfirm() {
  const current = task.value;
  if (!current) return;
  if (confirmKind.value === 'execute') {
    updateTaskStatus(current, 'in-progress', 'execute', t('tasks.detail.recordStarted'));
    Message.success(t('tasks.detail.executeSuccess'));
  } else if (confirmKind.value === 'cancel') {
    updateTaskStatus(current, 'cancelled', 'cancel', t('tasks.detail.recordCancelled'));
    Message.success(t('tasks.detail.actionSuccess', { action: t('tasks.detail.cancel') }));
  } else {
    const index = taskRecords.findIndex((item) => item.id === current.id);
    if (index >= 0) taskRecords.splice(index, 1);
    Message.success(t('tasks.detail.deleteSuccess'));
    confirmVisible.value = false;
    void router.replace({ name: 'tasks' });
    return;
  }
  confirmVisible.value = false;
}
</script>

<template>
  <main v-if="task" class="task-detail-page">
    <!-- 子路由粘性操作带：父级链接 + 当前对象 + 状态 + 关键操作；内容区不再显示页面标题 -->
    <header ref="opBand" class="detail-op-band" :class="{ 'is-stuck': stuck }">
      <nav class="detail-crumbs" :aria-label="t('tasks.detail.breadcrumb')">
        <router-link class="detail-crumb-link" :to="{ name: 'tasks' }">{{ t('tasks.detail.back') }}</router-link>
        <span class="detail-crumb-sep" aria-hidden="true">/</span>
        <span class="detail-crumb-current" aria-current="page" :title="taskName">{{ taskName }}</span>
        <a-tag class="detail-status" :color="statusColor(task.status)">{{ statusLabel(task.status) }}</a-tag>
      </nav>

    </header>

    <div class="detail-grid">
      <div class="detail-main">
        <section class="detail-group" aria-labelledby="detail-info-title">
          <h2 id="detail-info-title" class="detail-group-title">{{ t('tasks.detail.overview') }}</h2>
          <div class="task-detail-fields">
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.taskId') }}</span><span class="app-detail-value">{{ task.id }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.priority') }}</span><span class="app-detail-value"><a-tag :color="priorityColor(task.priority)">{{ priorityLabel(task.priority) }}</a-tag></span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.createdAt') }}</span><span class="app-detail-value">{{ task.createdAt }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.create.deadline') }}</span><span class="app-detail-value">{{ task.deadline }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.sourceApp') }}</span><span class="app-detail-value">{{ appLabel(task.sourceApp) }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.targetApp') }}</span><span class="app-detail-value">{{ appLabel(task.targetApp) }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.vehicle') }}</span><span class="app-detail-value">{{ task.vehicle || '—' }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('tasks.fields.project') }}</span><span class="app-detail-value">{{ projectLabel(task.project) }}</span></div>
            <div class="app-detail-row wide"><span class="app-detail-label">{{ t('tasks.detail.description') }}</span><span class="app-detail-value">{{ taskText('description') || '—' }}</span></div>
            <div class="app-detail-row wide">
              <span class="app-detail-label">{{ t('tasks.detail.attachments') }}</span>
              <span class="app-detail-value">
                <span class="task-attachment-list">
                  <span v-for="attachment in task.attachments" :key="attachment.id" class="task-attachment"><IconFile />{{ attachment.name }}</span>
                  <span v-if="!task.attachments.length">{{ t('tasks.detail.noAttachments') }}</span>
                </span>
                <small v-if="task.attachments.length" class="app-detail-note">{{ t('tasks.detail.attachmentUnavailable') }}</small>
              </span>
            </div>
          </div>
        </section>

        <section class="detail-group" aria-labelledby="detail-content-title">
          <h2 id="detail-content-title" class="detail-group-title">{{ t('tasks.detail.taskContent') }}</h2>
          <p class="task-content">{{ taskText('content') || t('tasks.detail.noOpinion') }}</p>
        </section>

        <section v-if="canHandle()" class="detail-group" aria-labelledby="detail-handle-title">
          <h2 id="detail-handle-title" class="detail-group-title">{{ t('tasks.detail.handle') }}</h2>
          <a-form class="handling-form" layout="vertical" :model="{ handlingOpinion }">
            <a-form-item>
              <template #label><span class="app-field-label">{{ t(isReview ? 'taskHandling.reviewOpinion' : 'tasks.detail.handlingOpinion') }}</span></template>
              <a-textarea v-model="handlingOpinion" :max-length="500" :placeholder="t('tasks.detail.input')" :auto-size="{ minRows: 3, maxRows: 6 }" />
            </a-form-item>
            <a-form-item>
              <template #label><span class="app-field-label">{{ t('tasks.detail.attachments') }}</span></template>
              <a-upload v-model:file-list="handlingFiles" draggable multiple :auto-upload="false" :limit="5" accept=".doc,.docx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg" :on-before-upload="beforeHandlingUpload">
                <template #upload-button>
                  <div class="handling-upload"><IconPlus /><span>{{ t('taskHandling.upload') }}</span><small>{{ t('taskHandling.fileHelp') }}</small></div>
                </template>
              </a-upload>
            </a-form-item>
            <a-form-item>
              <template #label><span class="app-field-label">{{ t('taskHandling.copy') }}</span></template>
              <div class="handling-copy">
                <div class="handling-copy-type"><span>{{ t('taskHandling.type') }}</span><a-radio-group v-model="copyType"><a-radio value="users">{{ t('taskHandling.users') }}</a-radio><a-radio value="roles">{{ t('taskHandling.roles') }}</a-radio></a-radio-group></div>
                <a-select v-if="copyType === 'users'" v-model="copiedMembers" multiple allow-search allow-clear :options="memberOptions" :placeholder="t('tasks.detail.input')" :aria-label="t('taskHandling.users')" />
                <a-select v-else v-model="copiedRoles" multiple allow-search allow-clear :options="roles.map(role => ({ value: role.id, label: role.name }))" :placeholder="t('tasks.detail.input')" :aria-label="t('taskHandling.roles')" />
              </div>
            </a-form-item>
          </a-form>
          <div class="handle-actions">
            <a-button v-if="!isReview" class="app-btn-neutral" @click="openAction('return')">{{ t('tasks.detail.return') }}</a-button>
            <a-button class="app-btn-neutral" @click="openAction('finish')">{{ t('tasks.detail.finish') }}</a-button>
            <a-button class="app-btn-neutral" @click="openAction('transfer')">{{ t('tasks.detail.transfer') }}</a-button>
            <a-button v-if="task.creator === currentTaskUser" class="app-btn-neutral" @click="openAction('recall')">{{ t('tasks.detail.recall') }}</a-button>
            <a-button v-if="isReview" status="danger" class="handling-reject" @click="openAction('reject')">{{ t('tasks.detail.reject') }}</a-button>
            <a-button type="primary" :loading="actionLoading" @click="submitHandling">{{ t(isReview ? 'tasks.actionsLog.approve' : 'tasks.detail.submit') }}</a-button>
          </div>
        </section>
      </div>

      <aside class="detail-side" :aria-label="t('tasks.detail.sideLabel')">
        <section class="detail-group" aria-labelledby="detail-flow-title">
          <h2 id="detail-flow-title" class="detail-group-title">{{ t('tasks.detail.flow') }}</h2>
          <div class="detail-flow">
            <div v-for="node in task.flow" :key="node.id" class="detail-flow-node" :class="`is-${node.status}`" :aria-label="`${flowTitle(node.type)} · ${flowStateLabel(node.status)}`">
              <div class="detail-flow-heading">
                <span class="detail-flow-title">{{ flowTitle(node.type) }}</span>
              </div>
              <p class="detail-flow-assignee">{{ flowAssignee(node.assignee) }}</p>
            </div>
          </div>
        </section>
        <section class="detail-group" aria-labelledby="detail-records-title">
          <h2 id="detail-records-title" class="detail-group-title">{{ t('tasks.detail.records') }}</h2>
          <a-timeline v-if="task.records.length">
            <a-timeline-item v-for="record in task.records" :key="record.id" dot-color="arcoblue">
              <div class="detail-record-heading"><strong>{{ actionLabel(record.action) }} | {{ record.operator }}</strong></div>
              <p class="detail-record-detail">{{ recordDetail(record.detail) }}</p>
              <small class="detail-record-time">{{ record.time }}<template v-if="record.duration"><span class="detail-record-sep">|</span><span>{{ durationLabel(record.duration) }}</span></template></small>
            </a-timeline-item>
          </a-timeline>
          <a-empty v-else :description="t('tasks.detail.noRecords')" />
        </section>
      </aside>
    </div>

    <!-- 表单弹窗：带标题头 + 描边 footer（DESIGN.md · Dialog / Department dialog action block） -->
    <a-modal v-model:visible="actionVisible" class="detail-form-dialog" :width="560" :title="currentAction.title" :mask-closable="!actionLoading" :esc-to-close="!actionLoading">
      <p v-if="actionKind !== 'return'" class="detail-form-message">{{ currentAction.message }}</p>
      <a-form :model="actionForm" layout="vertical">
        <a-form-item v-if="actionKind === 'return'" required :validate-status="returnNodeError ? 'error' : undefined" :help="returnNodeError ? t('taskReturn.required') : undefined">
          <template #label><span class="app-field-label">{{ t('taskReturn.node') }}</span></template>
          <a-select v-model="actionForm.returnNodeId" :options="returnNodeOptions" :placeholder="t('taskReturn.select')" :aria-label="t('taskReturn.node')" @change="returnNodeError = false" />
        </a-form-item>
        <a-form-item v-if="actionKind === 'transfer'" required>
          <template #label><span class="app-field-label">{{ t('tasks.detail.transferTo') }}</span></template>
          <a-select v-model="actionForm.assignee" :options="memberOptions.filter((member) => member !== currentTaskUser).map((value) => ({ value, label: value }))" />
        </a-form-item>
        <a-form-item :required="currentAction.requireOpinion">
          <template #label><span class="app-field-label">{{ t(actionKind === 'return' ? 'taskReturn.description' : 'tasks.detail.opinion') }}</span></template>
          <a-textarea v-model="actionForm.opinion" :placeholder="t('tasks.detail.input')" :max-length="500" :auto-size="{ minRows: 4, maxRows: 6 }" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button class="app-btn-neutral" :disabled="actionLoading" @click="actionVisible = false">{{ t('designSystem.cancel') }}</a-button>
        <a-button type="primary" :loading="actionLoading" @click="performAction">{{ actionKind === 'return' ? t('designSystem.confirm') : currentAction.confirm }}</a-button>
      </template>
    </a-modal>

    <!-- 纯确认：统一四段式 ConfirmDialog，标题点名任务 -->
    <ConfirmDialog
      :visible="confirmVisible"
      :icon="confirmMeta.icon"
      :title="confirmMeta.title"
      :description="confirmMeta.description"
      :ok-text="confirmMeta.ok"
      @update:visible="confirmVisible = $event"
      @confirm="performConfirm"
    />
  </main>
  <main v-else class="task-not-found">
    <a-result status="404" :title="t('tasks.detail.notFound')">
      <template #extra><a-button type="primary" @click="goBack">{{ t('tasks.detail.backToTasks') }}</a-button></template>
    </a-result>
  </main>
</template>

<style scoped>
/* 页面外侧间距统一由应用外壳提供。 */
.task-detail-page { display: flex; flex-direction: column; gap: 12px; align-items: stretch; min-height: calc(100dvh - 88px); padding-left: 0; }
.task-not-found { min-height: calc(100dvh - 88px); margin-left: 0; padding: 16px; border-radius: 2px; background: var(--app-surface); }

/* 白色 sticky 操作带：常态无描边，吸顶用 Level-4 阴影；面包屑 14px，当前项 600 且非链接 */
.detail-op-band { position: sticky; top: 56px; z-index: 5; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 16px; padding: 12px 16px; border-radius: 2px; background: var(--app-surface); transition: box-shadow 160ms ease; }
.detail-op-band.is-stuck { box-shadow: var(--app-shadow-4); }
.detail-crumbs { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; line-height: 22px; }
.detail-crumb-link { flex: none; color: var(--color-text-2); text-decoration: none; }
.detail-crumb-link:hover, .detail-crumb-link:focus-visible { color: var(--app-accent); }
.detail-crumb-sep { flex: none; color: var(--color-text-3); }
.detail-crumb-current { min-width: 0; overflow: hidden; color: var(--color-text-1); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.detail-status { flex: none; margin-left: 4px; }
.detail-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-left: auto; }

/* 独立白卡分组：16px 内边距 / 2px 圆角 / 12px 模块间距，卡片之间不再嵌套 */
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: start; gap: 12px; }
.detail-main, .detail-side { display: grid; gap: 12px; min-width: 0; }
.detail-group { min-width: 0; padding: 16px; border-radius: 2px; background: var(--app-surface); }
.detail-group-title { margin: 0 0 12px; color: var(--color-text-1); font-size: 16px; font-weight: 600; line-height: 24px; }

/* 只读事实：共享 .app-detail-row 的标签/值列与冒号令牌，宽字段跨两列 */
.task-detail-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; }
.task-detail-fields .wide { grid-column: 1 / -1; }
.task-attachment-list { display: flex; flex-wrap: wrap; gap: 12px; }
.task-attachment { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-1); }
.app-detail-note { display: block; margin-top: 4px; color: var(--color-text-3); font-size: 12px; line-height: 20px; }
.task-content { margin: 0; color: var(--color-text-1); font-size: 14px; line-height: 22px; white-space: pre-wrap; overflow-wrap: anywhere; }

/* 任务处理：只读摘要 + 右对齐操作行，用空白而非分隔线分区 */
.task-handle-summary { margin-bottom: 16px; }
.handle-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

/* 流程节点：双段卡（彩色表头 + 白底正文），状态由表头配色区分；卡片间居中竖线连接，无圆点/无独立状态徽标 */
.detail-flow { display: grid; gap: 16px; position: relative; }
.detail-flow-node { position: relative; border: 1px solid var(--app-primary-light-bg); border-radius: 4px; background: var(--app-surface); }
.detail-flow-node.is-current { border-color: var(--app-color-warning); }
/* 表头段：非当前浅蓝（主题浅色），当前橙；当前表头白字 */
.detail-flow-heading { padding: 8px 12px; border-radius: 3px 3px 0 0; background: var(--color-primary-light-1); color: var(--color-text-1); font-size: 14px; font-weight: 600; line-height: 22px; }
.detail-flow-node.is-current .detail-flow-heading { background: var(--app-color-warning); color: var(--color-white); }
/* 正文段：白底、常规字重 */
.detail-flow-assignee { margin: 0; padding: 8px 12px; border-radius: 0 0 3px 3px; background: var(--app-surface); color: var(--color-text-2); font-size: 14px; line-height: 22px; }
/* 卡片间居中竖线：连接相邻节点（无圆点/箭头） */
.detail-flow-node:not(:last-child)::after { content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%); width: 1px; height: 16px; background: var(--app-divider); }
.detail-record-heading { font-size: 14px; line-height: 22px; }
.detail-record-detail { margin: 4px 0; color: var(--color-text-2); font-size: 14px; line-height: 22px; overflow-wrap: anywhere; }
.detail-record-time { color: var(--color-text-3); font-size: 12px; line-height: 20px; }
.detail-record-sep { margin: 0 8px; color: var(--color-text-3); }

/* 表单弹窗文案：14/400/22，字段标签与控件由全局规则接管 */
.detail-form-message { margin: 0 0 16px; color: var(--color-text-1); font-size: 14px; line-height: 22px; }

@media (max-width: 960px) {
  .detail-grid { grid-template-columns: 1fr; }
  .detail-side { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .detail-op-band { align-items: flex-start; flex-direction: column; }
  .detail-actions { margin-left: 0; }
  .task-detail-fields { grid-template-columns: 1fr; }
  .task-detail-fields .wide { grid-column: auto; }
  .handle-actions { justify-content: flex-start; }
}
@media (max-width: 900px) {
  /* 外壳在窄屏自己提供左右 16px 画布，页面不再补左侧 gutter */
  .task-detail-page { padding-left: 0; }
  .task-not-found { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .detail-op-band { transition: none; }
}
</style>

<style scoped>
.handling-form { margin-top: 16px; }
.handling-form :deep(.arco-upload) { width: 100%; }
.handling-upload { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 112px; background: var(--color-fill-1); border: 1px dashed var(--app-control-border); }
.handling-upload > svg { font-size: 24px; color: var(--color-text-3); }
.handling-upload small, .handling-copy-type > span { color: var(--color-text-3); }
.handling-copy { display: grid; gap: 12px; width: 100%; }
.handling-copy-type { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.handle-actions { justify-content: flex-end; flex-wrap: wrap; }
.handling-reject { border: 1px solid currentColor; }
</style>
