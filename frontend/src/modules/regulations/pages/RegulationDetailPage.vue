<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconEye, IconDownload } from '@arco-design/web-vue/es/icon';
import { regulationRows, type RegulationAttachment } from '../data/regulations';
import { regulationLabel } from '../labels';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AttachmentPreview from '../../parts/components/AttachmentPreview.vue';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
const route = useRoute(); const router = useRouter(); const { t } = useI18n();
const taskCenter = useTaskCenterStore();
const record = computed(() => regulationRows.value.find(row => row.id === route.params.id));
/** 状态五态标签颜色：待提交/已撤回 灰、审批中 橙、已完成 绿、已驳回 红（与列表一致）；
    2026-11-20 用户裁决：基本信息标题右侧不再放状态标签，状态仅在字段行内展示 */
const STATUS_COLOR: Record<string, string> = { submitting: 'gray', reviewing: 'orange', completed: 'green', rejected: 'red', withdrawn: 'gray' };
/** 顶部「审核」按钮仅审批中状态可见（审批人视角入口） */
const reviewable = computed(() => record.value?.status === 'reviewing');
const review = ref(route.query.review === '1');
const decision = ref('approve'); const opinion = ref(''); const error = ref(false);
const discard = ref(false); let resolveExit: ((value: boolean) => void) | undefined;
onBeforeRouteLeave(() => {
  if (!opinion.value.trim()) return true;
  discard.value = true;
  return new Promise<boolean>(resolve => { resolveExit = resolve; });
});
const fields = ['code','name','region','country','version','status','date','creator','note'] as const;
const columns = computed(() => ['projectCode','projectName','brand','series','model','priority','status','operations'].map(key => ({ title: t(`regulations.${key}`), dataIndex: key, width: 150 })));
function submit() {
  if (!opinion.value.trim()) { error.value = true; return; }
  if (!record.value) return;
  record.value.status = decision.value === 'approve' ? 'completed' : 'rejected';
  record.value.opinion = opinion.value.trim(); opinion.value = ''; review.value = false; error.value = false;
  Message.success(t('regulations.reviewSaved'));
}
/* ---------------------------------------- 附件预览 / 下载（与零部件详情页一致） */
const previewedAttachment = ref<RegulationAttachment>();
function previewAttachment(attachment: RegulationAttachment) {
  // 刷新/跨标签页后仅剩文件名（File 不可序列化），直接提示而非打开空预览。
  if (!attachment.file || !(attachment.file instanceof Blob)) { Message.info(t('regulations.fileUnavailable')); return; }
  previewedAttachment.value = attachment;
}
function downloadAttachment(attachment: RegulationAttachment) {
  if (!attachment.file || !(attachment.file instanceof Blob)) { Message.info(t('regulations.fileUnavailable')); return; }
  const time = new Date().toLocaleString('sv-SE');
  taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'regulation', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(attachment.file), fileName: attachment.name });
  taskCenter.open('download');
}
function attachmentIconOf(name: string) { return name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'doc'; }
</script>
<template>
  <AttachmentPreview v-if="previewedAttachment" :attachment="previewedAttachment" @close="previewedAttachment = undefined" @download="downloadAttachment" />
  <div class="detail-page">
    <AppDetailHeader ancestor-to="/data/regulations" :ancestor-label="t('regulations.title')" :current-label="t('regulations.detailTitle')" :nav-aria-label="t('regulations.detailTitle')">
      <template v-if="record && reviewable && !review" #actions>
        <a-button type="primary" @click="review = true">{{ t('regulations.review') }}</a-button>
      </template>
    </AppDetailHeader>
    <template v-if="record">
      <section class="detail-block"><div class="block-title"><h2>{{ t('regulations.basic') }}</h2></div><div class="basic-grid"><div v-for="field in fields" :key="field" class="basic-field"><span class="app-detail-label">{{ t(`regulations.${field}`) }}</span><span v-if="field === 'status'"><a-tag :color="STATUS_COLOR[record.status]">{{ t(`regulations.statuses.${record.status}`) }}</a-tag></span><span v-else>{{ ['region','country'].includes(field) ? regulationLabel(t,record[field]) : record[field] || '—' }}</span></div></div>
        <h3>{{ t('regulations.attachments') }}</h3>
        <div v-if="record.attachments.length" class="attach-list">
          <div v-for="attachment in record.attachments" :key="attachment.name" class="attach-item">
            <span class="attach-icon" :data-type="attachmentIconOf(attachment.name)">{{ attachmentIconOf(attachment.name) === 'pdf' ? 'PDF' : 'DOC' }}</span>
            <span class="attach-name">{{ attachment.name }}</span>
            <a-button type="text" size="mini" :aria-label="t('regulations.preview')" :title="t('regulations.preview')" @click="previewAttachment(attachment)"><template #icon><IconEye :size="16" /></template></a-button>
            <a-button type="text" size="mini" :aria-label="t('regulations.download')" :title="t('regulations.download')" @click="downloadAttachment(attachment)"><template #icon><IconDownload :size="16" /></template></a-button>
          </div>
        </div>
        <span v-else>—</span>
      </section>
      <section class="detail-block"><h2>{{ t('regulations.project') }}</h2><a-table :columns="columns" :data="[]" :pagination="false" :bordered="false" :scroll="{ x: 1200 }"><template #empty><a-empty :description="t('regulations.noProjects')" /></template></a-table></section>
      <section v-if="review" class="detail-block"><h2>{{ t('regulations.review') }}</h2><a-form :model="{ opinion, decision }" layout="vertical"><a-form-item><template #label><span class="app-field-label">{{ t('regulations.decision') }}</span></template><a-radio-group v-model="decision"><a-radio value="approve">{{ t('regulations.approve') }}</a-radio><a-radio value="reject">{{ t('regulations.reject') }}</a-radio></a-radio-group></a-form-item><a-form-item :validate-status="error ? 'error' : undefined" :help="error ? t('regulations.required') : ''"><template #label><span class="app-field-label">{{ t('regulations.opinion') }}</span></template><a-textarea v-model="opinion" :max-length="2000" /></a-form-item></a-form><a-button type="primary" @click="submit">{{ t('regulations.save') }}</a-button></section>
    </template><a-empty v-else :description="t('regulations.empty')" />
    <ConfirmDialog :visible="discard" :title="t('designSystem.unsavedChanges')" @update:visible="discard = $event; if (!$event) resolveExit?.(false)" @confirm="discard = false; resolveExit?.(true)" />
  </div>
</template>
<style scoped>
.detail-page { display:grid; gap:var(--mt-ds-space-3); align-content:start; min-width:0; }
.detail-block { min-width:0; padding:var(--mt-ds-space-4); background:var(--app-surface); border-radius:var(--mt-ds-control-radius); }
h2,h3 { margin:0 0 var(--mt-ds-space-3); font-size:var(--mt-ds-font-title); font-weight:var(--mt-ds-weight-title); }
.block-title { display:flex; align-items:center; gap:var(--mt-ds-space-2); margin:0 0 var(--mt-ds-space-3); }
.block-title h2 { margin:0; }
.basic-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:var(--mt-ds-space-4); margin-bottom:var(--mt-ds-space-4); }
.basic-field { display:flex; gap:var(--mt-ds-space-2); overflow-wrap:anywhere; }
/* 附件行：类型徽标 + 文件名 + 预览/下载紧随文件名右侧（与零部件详情一致），行高 32px、间距 8px；
   2026-11-20 用户要求：预览/下载按钮紧跟文件名，不再被推到行尾，故文件名不设 flex:1 */
.attach-list { display:flex; flex-direction:column; gap:8px; }
.attach-item { display:flex; align-items:center; flex-wrap:wrap; gap:8px; min-height:32px; }
.attach-icon { flex:none; min-width:36px; padding:0 6px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:2px; font-size:10px; font-weight:600; letter-spacing:.5px; color:var(--color-text-3); background:var(--color-fill-2); }
.attach-icon[data-type='pdf'] { color: rgb(var(--danger-6)); }
.attach-name { min-width:0; color:var(--color-text-1); font-size:14px; line-height:22px; overflow-wrap:anywhere; }
@media(max-width:1000px) { .basic-grid { grid-template-columns:1fr; } }
</style>
