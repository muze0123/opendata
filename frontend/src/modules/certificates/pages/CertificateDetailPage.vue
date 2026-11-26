<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconEye, IconDownload, IconFile, IconFilePdf } from '@arco-design/web-vue/es/icon';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import AttachmentPreview from '../../parts/components/AttachmentPreview.vue';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import { statusRole } from '../../../shared/status';
import { libraryRecords, libraryProjects, libraryTimeline, type LibraryEntry } from '../data/library';

const route = useRoute();
const { t } = useI18n();
const taskCenter = useTaskCenterStore();
const label = (key: string) => t(`certificateLibrary.${key}`);
const statusLabel = (code: string) => t(`certificateLibrary.statuses.${code}`);
const priorityRole = { urgent: 'danger', high: 'warning', medium: 'info', low: 'neutral' } as const;
type TagRole = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
interface DetailField { key: string; label: string; value: string; role?: TagRole }

const current = computed(() => libraryRecords.value.find(row => row.id === route.params.id));
const selectedProject = computed(() => libraryProjects.find(project => project.id === current.value?.project));

const basicFields = computed<DetailField[]>(() => {
  const row = current.value;
  if (!row) return [];
  const fields: DetailField[] = [
    { key: 'project', label: label('taskNumber'), value: row.project || '—' },
  ];
  const project = selectedProject.value;
  if (project) {
    for (const key of ['name', 'brand', 'series', 'model', 'priority', 'owner', 'createdAt', 'deadline'] as const) {
      fields.push({
        key: `project-${key}`,
        label: t(`certificateLibrary.taskInfo.${key}`),
        value: key === 'priority' ? t(`certificateLibrary.priorities.${project.priority}`) : project[key] || '—',
        role: key === 'priority' ? priorityRole[project.priority] : undefined,
      });
    }
  }
  return fields;
});

/* ---------------------------------------- 证书文件预览 / 下载（与法规详情页一致） */
const previewedFile = ref<{ name: string; file?: File }>();
function previewFile(file: { name: string; file?: File }) {
  // 台账默认只有文件名（File 不可序列化），刷新后仅提示，不打开空预览
  if (!file.file || !(file.file instanceof Blob)) { Message.info(label('fileUnavailable')); return; }
  previewedFile.value = file;
}
function downloadFile(file: { name: string; file?: File }) {
  if (!file.file || !(file.file instanceof Blob)) { Message.info(label('fileUnavailable')); return; }
  const time = new Date().toLocaleString('sv-SE');
  taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'certificate', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(file.file), fileName: file.name });
  taskCenter.open('download');
}
/** 标准文件图标：PDF 用 IconFilePdf，其余用通用 IconFile（与法规详情一致） */
function fileIconOf(name: string) { return name.toLowerCase().endsWith('.pdf') ? IconFilePdf : IconFile; }

/** 法规与证书：与基础信息一致的只读字段网格；每条法规一组，证书名称右侧补状态、有效期至右侧补证书文件。 */
const regulationGroups = computed(() => {
  const row = current.value;
  if (!row) return [];
  return row.entries.map((entry: LibraryEntry, index): DetailField[] => [
    { key: `regulation-${index}`, label: label('regulation'), value: entry.regulation || '—' },
    { key: `regulationName-${index}`, label: label('regulationName'), value: entry.regulationName || '—' },
    { key: `number-${index}`, label: label('number'), value: entry.number || '—' },
    { key: `name-${index}`, label: label('name'), value: entry.name || row.name || '—' },
    { key: `status-${index}`, label: label('certificateStatus'), value: statusLabel(row.status), role: statusRole(row.status, 'certificates') },
    { key: `issuer-${index}`, label: label('issuer'), value: entry.issuer || '—' },
    { key: `agency-${index}`, label: label('agency'), value: entry.agency || '—' },
    { key: `issued-${index}`, label: label('issued'), value: entry.issued || '—' },
    { key: `expires-${index}`, label: label('expires'), value: entry.expires || '—' },
  ]);
});

const timeline = computed(() => current.value ? libraryTimeline(current.value) : []);
function eventLabel(action: string) { return t(`certificateLibrary.events.${action}`); }
</script>

<template>
  <AttachmentPreview v-if="previewedFile" :attachment="previewedFile" @close="previewedFile = undefined" @download="downloadFile" />
  <main class="library-page">
    <AppDetailHeader :ancestor-to="'/data/certificates'" :ancestor-label="label('title')" :current-label="label('detailTitle')" />
    <template v-if="current">
      <section class="detail-block" :aria-label="label('base')">
        <div class="block-header"><h2>{{ label('base') }}</h2></div>
        <dl class="app-detail-list certificate-facts">
          <div v-for="field in basicFields" :key="field.key" class="app-detail-row">
            <dt class="app-detail-label">{{ field.label }}</dt>
            <dd class="app-detail-value">
              <AppStatusTag v-if="field.role" :label="field.value" :role="field.role" />
              <template v-else>{{ field.value }}</template>
            </dd>
          </div>
        </dl>
      </section>

      <section class="detail-block" :aria-label="label('regulations')">
        <div class="block-header"><h2>{{ label('regulations') }}</h2></div>
        <a-empty v-if="!regulationGroups.length" :description="label('emptyRegulations')" />
        <template v-for="(group, groupIndex) in regulationGroups" :key="group[0]?.key ?? String(groupIndex)">
          <dl class="app-detail-list certificate-facts" :class="{ 'regulation-group': groupIndex > 0 }">
            <div v-for="field in group" :key="field.key" class="app-detail-row">
              <dt class="app-detail-label">{{ field.label }}</dt>
              <dd class="app-detail-value">
                <AppStatusTag v-if="field.role" :label="field.value" :role="field.role" />
                <template v-else>{{ field.value }}</template>
              </dd>
            </div>
            <div class="app-detail-row cert-file-row">
              <dt class="app-detail-label">{{ label('certificateFile') }}</dt>
              <dd class="app-detail-value">
                <div v-if="current.entries[groupIndex]?.file" class="attach-item">
                  <component :is="fileIconOf(current.entries[groupIndex]!.file!.name)" :size="16" class="attach-icon" />
                  <span class="attach-name">{{ current.entries[groupIndex]!.file!.name }}</span>
                  <a-button type="text" size="mini" :aria-label="label('preview')" :title="label('preview')" @click="previewFile(current.entries[groupIndex]!.file!)"><template #icon><IconEye :size="16" /></template></a-button>
                  <a-button type="text" size="mini" :aria-label="label('download')" :title="label('download')" @click="downloadFile(current.entries[groupIndex]!.file!)"><template #icon><IconDownload :size="16" /></template></a-button>
                </div>
                <span v-else>—</span>
              </dd>
            </div>
          </dl>
        </template>
      </section>

      <section class="detail-block" :aria-label="label('timeline')">
        <div class="block-header"><h2>{{ label('timeline') }}</h2></div>
        <a-empty v-if="!timeline.length" :description="label('noTimeline')" />
        <a-timeline v-else class="processing-timeline">
          <a-timeline-item v-for="event in timeline" :key="event.id">
            <div class="timeline-heading"><strong>{{ eventLabel(event.action) }}</strong><time>{{ event.time }}</time></div>
            <p>{{ t('certificateLibrary.eventDescription', { actor: event.actor, action: eventLabel(event.action), name: current.name }) }}</p>
            <p v-if="event.comment" class="event-comment">{{ t('certificateLibrary.eventOpinion', { comment: event.comment }) }}</p>
          </a-timeline-item>
        </a-timeline>
      </section>
    </template>
    <a-empty v-else :description="label('notFound')" />
  </main>
</template>

<style scoped>
.library-page { display: grid; align-content: start; gap: var(--mt-ds-space-3); min-width: 0; }
.detail-block { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.block-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-4); }
h2 { margin: 0; font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
.certificate-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--mt-ds-space-4); margin: 0; text-align: left; }
.certificate-facts .app-detail-row { display: flex; align-items: baseline; gap: var(--mt-ds-space-2); min-width: 0; }
.certificate-facts dt { flex-shrink: 0; }
.certificate-facts dt, .certificate-facts dd { margin: 0; font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); }
/* 多条法规时组间用细分隔线区分，与 12px 模块节奏一致 */
.certificate-facts.regulation-group { border-top: 1px solid var(--app-divider); padding-top: var(--mt-ds-space-4); }
/* 证书文件字段行：与法规详情附件行同构——类型徽标 + 文件名 + 预览/下载紧跟文件名右侧。
   选择器须带 .certificate-facts 前缀提高特异性，否则 align-items:center 会被上面的
   .certificate-facts .app-detail-row { align-items: baseline } 覆盖，标签相对 32px 附件行下错位 8px */
.certificate-facts .cert-file-row { display: flex; align-items: center; gap: var(--mt-ds-space-2); }
.cert-file-row .app-detail-label { flex: none; }
.cert-file-row .app-detail-value { flex: 1; min-width: 0; white-space: normal; }
.attach-item { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-height: 32px; }
.attach-icon { flex: none; color: var(--color-text-3); }
.attach-name { min-width: 0; color: var(--color-text-1); font-size: 14px; line-height: 22px; overflow-wrap: anywhere; }
.timeline-heading { display: flex; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-4); }
.timeline-heading time { color: var(--color-text-3); }
.processing-timeline p { margin: var(--mt-ds-space-2) 0 0; line-height: var(--mt-ds-line-body); overflow-wrap: anywhere; }
.event-comment { color: var(--color-text-2); white-space: pre-wrap; }
.processing-timeline :deep(.arco-timeline-item:not(.arco-timeline-item-last)) { padding-bottom: var(--mt-ds-space-6); }
@media (max-width: 900px) { .certificate-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .certificate-facts { grid-template-columns: minmax(0, 1fr); } }
</style>
