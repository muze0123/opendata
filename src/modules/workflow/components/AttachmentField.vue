<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconUpload, IconDelete } from '@arco-design/web-vue/es/icon';
import type { Attachment } from '../data/model';
const props = defineProps<{ modelValue: Attachment[]; readonly?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [files: Attachment[]] }>();
const { t } = useI18n();
const input = ref<HTMLInputElement>();
const busy = ref(false);
const error = ref('');
async function read(files: File[]) {
  if (busy.value || !files.length) return;
  error.value = '';
  if (files.some(file => file.size > 20 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) {
    error.value = t('workflow.fileError');
    return;
  }
  busy.value = true;
  try {
    const attachments = await Promise.all(files.map(file => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error('aborted'));
      reader.readAsDataURL(file);
    })));
    emit('update:modelValue', [...props.modelValue, ...attachments]);
  } catch { error.value = t('workflow.fileReadError'); }
  finally { busy.value = false; if (input.value) input.value.value = ''; }
}
function drop(event: DragEvent) { if (!props.readonly) void read(Array.from(event.dataTransfer?.files ?? [])); }
</script>
<template>
  <div class="attachments">
    <div v-if="!readonly" class="attachment-drop" @dragover.prevent @drop.prevent="drop">
      <input ref="input" type="file" multiple accept="application/pdf,image/png,image/jpeg" :aria-label="t('workflow.attachments')" :disabled="busy" @change="read(Array.from(input?.files ?? []))" />
      <a-button :loading="busy" @click="input?.click()"><IconUpload />{{ t('workflow.uploadAttachments') }}</a-button>
      <p>{{ t('workflow.attachmentHelp') }}</p>
    </div>
    <p v-if="error" role="alert" class="attachment-error">{{ error }}</p>
    <div v-for="(file, index) in modelValue" :key="index" class="attachment-row">
      <a :href="file.data" :download="file.name">{{ file.name }}</a>
      <a-button v-if="!readonly" type="text" :aria-label="`${t('workflow.delete')} ${file.name}`" @click="emit('update:modelValue', modelValue.filter((_, i) => i !== index))"><IconDelete /></a-button>
    </div>
  </div>
</template>
<style scoped>
.attachments { width: 100%; }
.attachment-drop { padding: 16px; border: 1px dashed var(--app-divider); background: var(--app-fill-1); text-align: center; }
.attachment-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.attachment-drop p { margin: 8px 0 0; color: var(--app-text-secondary); }
.attachment-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-block: 8px; }
.attachment-row a { overflow-wrap: anywhere; color: var(--app-color-primary); }
.attachment-error { color: var(--app-color-danger); }
</style>
