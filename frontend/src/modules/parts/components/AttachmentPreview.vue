<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import '@vue-office/docx/lib/v3/index.css';
import type { PartAttachment } from '../data/parts';
const props = defineProps<{ attachment?: PartAttachment }>();
const emit = defineEmits<{ close: []; download: [attachment: PartAttachment] }>();
const { t } = useI18n();
// @vue-office 已在 vite optimizeDeps.exclude（预打包 chunk 图 bug，见 vite.config.ts），
// 深路径直接引各自动态导入的 .mjs ESM 构建（默认导出即组件）。
const OfficePdf = defineAsyncComponent(() => import('@vue-office/pdf/lib/v3/vue-office-pdf.mjs').then(module => module.default as Component));
const OfficeDocx = defineAsyncComponent(() => import('@vue-office/docx/lib/v3/vue-office-docx.mjs').then(module => module.default as Component));
const kind = computed(() => props.attachment?.name.split('.').pop()?.toLowerCase());
const src = ref('');
const failed = ref(false);
const loading = ref(false);
function revoke() { if (src.value) URL.revokeObjectURL(src.value); src.value = ''; }
function load() {
  revoke();
  failed.value = false;
  loading.value = true;
  if (props.attachment?.file) src.value = URL.createObjectURL(props.attachment.file);
  else { failed.value = true; loading.value = false; }
}
function error() { failed.value = true; loading.value = false; }
watch(() => props.attachment, load, { immediate: true });
onBeforeUnmount(revoke);
</script>
<template>
  <a-modal :visible="!!attachment" :title="attachment?.name" :width="880" :mask-closable="true" :esc-to-close="true" @cancel="emit('close')">
    <div class="attachment-preview" :aria-busy="loading">
      <div v-if="failed" class="preview-state">{{ t('parts.previewError') }}<a-button @click="load">{{ t('parts.previewRetry') }}</a-button></div>
      <template v-else-if="src">
        <p v-if="loading && ['pdf', 'docx', 'png'].includes(kind ?? '')" role="status">{{ t('parts.previewLoading') }}</p>
        <OfficePdf v-if="kind === 'pdf'" :src="src" @rendered="loading = false" @error="error" />
        <OfficeDocx v-else-if="kind === 'docx'" :src="src" @rendered="loading = false" @error="error" />
        <img v-else-if="kind === 'png'" :src="src" :alt="attachment?.name" @load="loading = false" @error="error" />
        <p v-else>{{ t('parts.previewUnsupported') }}</p>
      </template>
    </div>
    <template #footer><a-button @click="emit('close')">{{ t('parts.cancel') }}</a-button><a-button v-if="attachment" type="primary" @click="emit('download', attachment)">{{ t('parts.downloadFile') }}</a-button></template>
  </a-modal>
</template>
<style scoped>
.attachment-preview { height: min(62vh, 620px); overflow: auto; background: var(--app-surface); color: var(--color-text-1); }
.attachment-preview img { display: block; max-width: 100%; margin: auto; }
.preview-state { display: flex; align-items: center; justify-content: center; gap: 16px; height: 100%; }
.attachment-preview :deep(.vue-office-pdf), .attachment-preview :deep(.vue-office-docx) { min-height: 100%; }
</style>
