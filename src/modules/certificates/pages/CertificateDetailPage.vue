<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconLeft } from '@arco-design/web-vue/es/icon';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { certificateRows, certificateReviews } from '../data/certificates';

type CertStatus = 'draft' | 'reviewing' | 'completed' | 'rejected';
type CertAction = 'submit' | 'approve' | 'reject' | 'withdraw' | 'transfer' | 'resubmit';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const record = computed(() => certificateRows.value.find(row => row.id === route.params.id));

const STATUS_COLOR: Record<CertStatus, string> = {
  draft: 'gray',
  reviewing: 'orange',
  completed: 'green',
  rejected: 'red',
};

const actionLabels: Record<CertAction, string> = {
  submit: t('certificates.submit'),
  approve: t('certificates.approveAction'),
  reject: t('certificates.rejectAction'),
  withdraw: t('certificates.withdraw'),
  transfer: t('certificates.transfer'),
  resubmit: t('certificates.resubmit'),
};

// 顶部操作区按状态驱动：仅「审核中」展示 同意/驳回/撤回/转交；其余状态给出各自操作。
const actionsByStatus = computed<CertAction[]>(() => {
  switch (record.value?.status) {
    case 'draft': return ['submit'];
    case 'reviewing': return ['withdraw', 'transfer', 'reject', 'approve'];
    case 'rejected': return ['resubmit'];
    case 'completed': return [];
    default: return [];
  }
});

/** 高亮（主操作）的动作：同意（审核中）与提交（草稿）。其余为中性次级按钮。 */
const PRIMARY_ACTIONS: CertAction[] = ['approve', 'submit'];

// 基础信息展示真实证书字段，避免展示无数据的占位项目字段。
const basicFields = ['code', 'name', 'project', 'regulation', 'issuer', 'authority', 'issued', 'expires'] as const;

const columns = computed(() => ['regulation', 'regulationName', 'code', 'issuer', 'authority', 'issued', 'expires', 'attachment'].map(key => ({ title: t(`certificates.${key}`), dataIndex: key, width: 180 })));
const certificateData = computed(() => record.value ? [{ ...record.value, regulationName: '—', attachment: '—' }] : []);
const history = computed(() => certificateReviews.value.filter(row => row.certificateId === record.value?.id));
const reviewColumns = computed(() => [
  { title: t('certificates.reviewer'), dataIndex: 'reviewer' },
  { title: t('certificates.conclusion'), slotName: 'conclusion' },
  { title: t('certificates.opinion'), dataIndex: 'opinion' },
  { title: t('certificates.reviewTime'), dataIndex: 'time' },
]);

const CONCLUSION_META: Record<string, { color: string; key: string }> = {
  completed: { color: 'green', key: 'approvePass' },
  rejected: { color: 'red', key: 'approveReject' },
  submitted: { color: 'arcoblue', key: 'submitted' },
  withdrawn: { color: 'gray', key: 'withdrawn' },
  transferred: { color: 'orange', key: 'transferred' },
};

function pushReview(conclusion: string, opinion: string) {
  if (!record.value) return;
  certificateReviews.value.unshift({
    certificateId: record.value.id,
    reviewer: '—',
    conclusion: conclusion as 'completed' | 'rejected',
    opinion: opinion.trim() || '—',
    time: new Date().toLocaleString('sv-SE'),
  });
}

// 通用确认弹窗（同意 / 提交 / 撤回 / 重新提交）
const confirmVisible = ref(false);
const confirmTitle = ref('');
const confirmDescription = ref('');
let confirmRun: (() => void) | undefined;
function askConfirm(title: string, description: string, run: () => void) {
  confirmTitle.value = title;
  confirmDescription.value = description;
  confirmRun = run;
  confirmVisible.value = true;
}
function onConfirm() {
  confirmRun?.();
  confirmVisible.value = false;
  confirmRun = undefined;
}

// 驳回：打开抽屉填写意见后落驳回
const reviewOpen = ref(false);
const opinion = ref('');
function openReject() {
  opinion.value = '';
  reviewOpen.value = true;
}
function submitReject() {
  if (!record.value || !opinion.value.trim()) return;
  record.value.status = 'rejected';
  pushReview('rejected', opinion.value);
  reviewOpen.value = false;
  opinion.value = '';
  Message.success(t('certificates.reviewSaved'));
}

// 转交：打开抽屉填写接收人
const transferOpen = ref(false);
const transferTarget = ref('');
const transferError = ref(false);
function openTransfer() {
  transferTarget.value = '';
  transferError.value = false;
  transferOpen.value = true;
}
function submitTransfer() {
  if (!transferTarget.value.trim()) { transferError.value = true; return; }
  if (!record.value) return;
  pushReview('transferred', t('certificates.transferTo', { name: transferTarget.value.trim() }));
  transferOpen.value = false;
  transferTarget.value = '';
  Message.success(t('certificates.transferredTip'));
}

function runAction(action: CertAction) {
  if (!record.value) return;
  switch (action) {
    case 'submit':
      askConfirm(t('certificates.submit'), t('certificates.submitConfirm'), () => {
        record.value!.status = 'reviewing';
        pushReview('submitted', '');
        Message.success(t('certificates.reviewSaved'));
      });
      break;
    case 'approve':
      askConfirm(t('certificates.approveAction'), t('certificates.approveConfirmDesc'), () => {
        record.value!.status = 'completed';
        pushReview('completed', '');
        Message.success(t('certificates.reviewSaved'));
      });
      break;
    case 'withdraw':
      askConfirm(t('certificates.withdraw'), t('certificates.withdrawConfirm'), () => {
        record.value!.status = 'draft';
        pushReview('withdrawn', '');
        Message.success(t('certificates.reviewSaved'));
      });
      break;
    case 'resubmit':
      askConfirm(t('certificates.resubmit'), t('certificates.resubmitConfirm'), () => {
        record.value!.status = 'reviewing';
        pushReview('submitted', '');
        Message.success(t('certificates.reviewSaved'));
      });
      break;
    case 'reject':
      openReject();
      break;
    case 'transfer':
      openTransfer();
      break;
  }
}
</script>

<template>
  <div class="certificate-detail-page">
    <header class="detail-header">
      <div class="detail-left">
        <nav class="detail-breadcrumb" :aria-label="t('certificates.detailTitle')">
          <a-button type="text" class="detail-back" :aria-label="t('certificates.backList')" @click="router.push('/data/certificates')"><IconLeft /></a-button>
          <a-link @click="router.push('/data/certificates')">{{ t('certificates.title') }}</a-link>
          <span class="detail-sep">/</span>
          <span class="detail-current" aria-current="page">{{ t('certificates.detailTitle') }}</span>
        </nav>
      </div>
      <div class="detail-actions">
        <a-button
          v-if="record && record.status === 'draft'"
          class="app-btn-neutral"
          :aria-label="t('certificates.cancel')"
          @click="router.push('/data/certificates')"
        >{{ t('certificates.cancel') }}</a-button>
        <a-button
          v-for="action in actionsByStatus"
          :key="action"
          :type="PRIMARY_ACTIONS.includes(action) ? 'primary' : 'secondary'"
          :class="{ 'app-btn-neutral': !PRIMARY_ACTIONS.includes(action) }"
          @click="runAction(action)"
        >{{ actionLabels[action] }}</a-button>
      </div>
    </header>

    <a-empty v-if="!record" :description="t('certificates.unavailable')" />

    <template v-else>
      <section class="detail-block">
        <div class="block-title">
          <h2>{{ t('certificates.basicInfo') }}</h2>
          <a-tag v-if="record" :color="STATUS_COLOR[record.status as CertStatus]" class="detail-status">{{ t(`certificates.${record.status}`) }}</a-tag>
        </div>
        <div class="basic-grid">
          <div v-for="field in basicFields" :key="field" class="basic-field">
            <span class="app-detail-label">{{ t(`certificates.${field}`) }}</span>
            <span class="app-detail-value">{{ record[field] || '—' }}</span>
          </div>
        </div>
      </section>

      <section class="detail-block">
        <h2>{{ t('certificates.regulationsCertificates') }}</h2>
        <a-table :columns="columns" :data="certificateData" :pagination="false" :scroll="{ x: 1440 }" row-key="id" :bordered="false" :stripe="false" />
      </section>

      <section class="detail-block">
        <h2>{{ t('certificates.reviewHistory') }}</h2>
        <a-table :columns="reviewColumns" :data="history" :pagination="false" :scroll="{ x: 800 }" :bordered="false" :stripe="false">
          <template #conclusion="{ record: item }">
            <a-tag :color="CONCLUSION_META[item.conclusion]?.color ?? 'gray'">{{ t(`certificates.${CONCLUSION_META[item.conclusion]?.key ?? 'submitted'}`) }}</a-tag>
          </template>
        </a-table>
      </section>
    </template>

    <a-drawer :visible="reviewOpen" :width="560" :title="t('certificates.rejectAction')" @cancel="reviewOpen = false">
      <label class="app-field-label" for="certificate-review-opinion">{{ t('certificates.opinion') }}</label>
      <a-textarea id="certificate-review-opinion" v-model="opinion" :max-length="1000" :placeholder="t('certificates.required')" />
      <template #footer>
        <a-space>
          <a-button class="app-btn-neutral" @click="reviewOpen = false">{{ t('certificates.cancel') }}</a-button>
          <a-button type="primary" :disabled="!opinion.trim()" @click="submitReject">{{ t('certificates.rejectAction') }}</a-button>
        </a-space>
      </template>
    </a-drawer>

    <a-drawer :visible="transferOpen" :width="500" :title="t('certificates.transfer')" @cancel="transferOpen = false">
      <a-form :model="{}" layout="vertical">
        <a-form-item :validate-status="transferError ? 'error' : undefined" :help="transferError ? t('certificates.transferEmpty') : ''">
          <template #label><span class="app-field-label">{{ t('certificates.transferTarget') }}</span></template>
          <a-input v-model="transferTarget" :placeholder="t('certificates.transferPlaceholder')" :max-length="40" @input="transferError = false" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-space>
          <a-button class="app-btn-neutral" @click="transferOpen = false">{{ t('certificates.cancel') }}</a-button>
          <a-button type="primary" @click="submitTransfer">{{ t('certificates.transferConfirm') }}</a-button>
        </a-space>
      </template>
    </a-drawer>

    <ConfirmDialog v-model:visible="confirmVisible" :title="confirmTitle" :description="confirmDescription" @confirm="onConfirm" />
  </div>
</template>

<style scoped>
.certificate-detail-page { display: grid; gap: var(--mt-ds-space-3); min-width: 0; }
/* 顶部操作带：无描边，左侧面包屑带 hover，右侧状态驱动的操作按钮 */
.detail-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--mt-ds-space-3); padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.detail-left { display: flex; align-items: center; gap: var(--mt-ds-space-3); flex-wrap: wrap; min-width: 0; }
.detail-breadcrumb { display: flex; align-items: center; gap: var(--mt-ds-space-1); }
.detail-back { width: 32px; height: 32px; padding: 0; flex: none; border: none; color: var(--color-text-3); }
.detail-back:hover { color: var(--app-accent); background: var(--color-fill-2); }
.detail-breadcrumb .arco-link { color: var(--color-text-3); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); }
.detail-breadcrumb .arco-link:hover { color: var(--app-accent); }
.detail-sep { color: var(--color-text-3); font-size: var(--mt-ds-font-body); line-height: var(--mt-ds-line-body); }
.detail-current { color: var(--color-text-1); font-size: var(--mt-ds-font-body); line-height: var(--mt-ds-line-body); font-weight: var(--mt-ds-weight-title); }
.block-title { display: flex; align-items: center; gap: var(--mt-ds-space-2); margin: 0 0 var(--mt-ds-space-3); }
.block-title h2 { margin: 0; }
.detail-status { flex: none; }
.detail-actions { display: flex; flex-wrap: wrap; gap: var(--mt-ds-space-2); }
/* 三个独立白色内容组：16px 内距、2px 圆角，区块标题 16px/600/24 */
.detail-block { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.detail-block h2 { margin: 0 0 var(--mt-ds-space-3); font-size: var(--mt-ds-font-title); font-weight: var(--mt-ds-weight-title); line-height: var(--mt-ds-line-title); }
/* 基础信息：栅栏左对齐，字段名(冒号)+参数左对齐，无描边无填充框 */
.basic-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--mt-ds-space-4); margin-bottom: var(--mt-ds-space-3); }
.basic-field { display: grid; gap: var(--mt-ds-space-1); min-width: 0; }
.basic-field .app-detail-label { font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); }
.basic-field .app-detail-value { font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); color: var(--color-text-1); overflow-wrap: anywhere; }
/* 数据列表样式（法规与证书、审核记录）：无外边框、无斑马纹、行间分隔线、400 字重、表头背景、行 hover */
.detail-block :deep(.arco-table), .detail-block :deep(.arco-table-container) { border: 0; }
.detail-block :deep(thead) { background: var(--app-table-header); }
.detail-block :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; }
.detail-block :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-surface); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail-block :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
.detail-block :deep(.arco-link), .detail-block :deep(.arco-tag) { font-weight: var(--mt-ds-weight-body); }
@media (max-width: 1200px) { .basic-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .basic-grid { grid-template-columns: minmax(0, 1fr); } .detail-header { padding: var(--mt-ds-space-3); } }
</style>
