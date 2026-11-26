<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconEye, IconDownload, IconFile, IconFilePdf } from '@arco-design/web-vue/es/icon';
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
/** 标准文件图标：PDF 用 IconFilePdf，Word（.doc/.docx）用通用 IconFile（Arco 无 Word 专用图标），与抽屉一致 */
function attachmentIconOf(name: string) { return name.toLowerCase().endsWith('.pdf') ? IconFilePdf : IconFile; }
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
        <div class="app-detail-row reg-file-row"><span class="app-detail-label">{{ t('regulations.regulationFile') }}</span><span class="app-detail-value">
          <div v-if="record.attachments.length" class="attach-list">
            <div v-for="attachment in record.attachments" :key="attachment.name" class="attach-item">
              <component :is="attachmentIconOf(attachment.name)" :size="16" class="attach-icon" />
              <span class="attach-name">{{ attachment.name }}</span>
              <a-button type="text" size="mini" :aria-label="t('regulations.preview')" :title="t('regulations.preview')" @click="previewAttachment(attachment)"><template #icon><IconEye :size="16" /></template></a-button>
              <a-button type="text" size="mini" :aria-label="t('regulations.download')" :title="t('regulations.download')" @click="downloadAttachment(attachment)"><template #icon><IconDownload :size="16" /></template></a-button>
            </div>
          </div>
          <span v-else>—</span>
        </span></div>
      </section>
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
/* 「法规文件」字段行：与基本信息字段同构（flex 横排、8px 间距、垂直居中），避免出现
   两列 grid 造成的 5px 标签错位与标签-文件间大片空白；值列可收缩，长文件名正常换行 */
.reg-file-row { display: flex; align-items: center; gap: var(--mt-ds-space-2); }
.reg-file-row .app-detail-label { flex: none; }
.reg-file-row .app-detail-value { flex: 1; min-width: 0; white-space: normal; }
/* 附件行：类型徽标 + 文件名 + 预览/下载紧随文件名右侧（与零部件详情一致），行高 32px、间距 8px；
   2026-11-20 用户要求：预览/下载按钮紧跟文件名，不再被推到行尾，故文件名不设 flex:1 */
.attach-list { display:flex; flex-direction:column; gap:8px; }
.attach-item { display:flex; align-items:center; flex-wrap:wrap; gap:8px; min-height:32px; }
/* 标准文件图标（与抽屉一致）：PDF=IconFilePdf，Word=IconFile；统一 Text-3 色，图标形状本身区分类型 */
.attach-icon { flex: none; color: var(--color-text-3); }
.attach-name { min-width:0; color:var(--color-text-1); font-size:14px; line-height:22px; overflow-wrap:anywhere; }
@media(max-width:1000px) { .basic-grid { grid-template-columns:1fr; } }
</style>
