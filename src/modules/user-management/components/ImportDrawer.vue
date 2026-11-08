<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconFolder, IconDownload, IconCheckCircleFill, IconExclamationCircleFill } from '@arco-design/web-vue/es/icon';
import { useUserStore } from '../stores/users';
import { useLocaleStore } from '../../../app/stores/locale';
import {
  buildUserTemplate,
  saveUserTemplate,
  parseUserWorkbook,
  type ParsedUserRow,
  type UserTemplateFile,
} from '../data/workbook';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (event: 'update:visible', value: boolean): void }>();

const { t } = useI18n();
const store = useUserStore();
const localeStore = useLocaleStore();
const locale = localeStore.locale === 'en-US' ? 'en-US' : 'zh-CN';

const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref('');
const parsing = ref(false);
const dragging = ref(false);
const fileError = ref('');
const parsedRows = ref<ParsedUserRow[]>([]);
const importing = ref(false);

/** 预生成模版：点击时可同步触发下载，避免 await 打断用户手势（DESIGN.md · Batch import）。 */
const templateFile = ref<UserTemplateFile | null>(null);
const templatePreparing = ref(false);
const templateError = ref(false);

const validRows = computed(() => parsedRows.value.filter((row) => row.errors.length === 0));
const invalidRows = computed(() => parsedRows.value.filter((row) => row.errors.length > 0));

async function prepareTemplate() {
  templateFile.value = null;
  templateError.value = false;
  templatePreparing.value = true;
  try {
    templateFile.value = await buildUserTemplate(locale);
  } catch {
    templateError.value = true;
  } finally {
    templatePreparing.value = false;
  }
}

function downloadTemplate() {
  if (templateFile.value) {
    saveUserTemplate(templateFile.value);
    return;
  }
  if (templateError.value) void prepareTemplate();
}

function openPicker() {
  fileInput.value?.click();
}

function resetFile() {
  fileName.value = '';
  parsedRows.value = [];
  fileError.value = '';
  dragging.value = false;
  importing.value = false;
  parsing.value = false;
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    resetFile();
    void prepareTemplate();
  },
);

async function handleFile(file: File) {
  // 替换文件时先清掉上一次的解析结果，再做校验
  fileName.value = file.name;
  parsedRows.value = [];
  fileError.value = '';
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileError.value = t('userManagement.import.invalidFile');
    return;
  }
  parsing.value = true;
  try {
    const buffer = await file.arrayBuffer();
    const result = await parseUserWorkbook(buffer, locale);
    parsedRows.value = result.rows;
    if (!result.rows.length) fileError.value = t('userManagement.import.emptyFile');
  } catch {
    fileError.value = t('userManagement.import.fail');
  } finally {
    parsing.value = false;
  }
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) void handleFile(file);
  target.value = '';
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
}

function handleImport() {
  const valid = validRows.value;
  if (!valid.length || importing.value) return;
  importing.value = true;
  window.setTimeout(() => {
    const count = store.importUsers(
      valid.map((row) => ({
        name: row.name,
        account: row.account,
        phone: row.phone,
        email: row.email,
        deptId: row.deptId as string,
        roleIds: row.roleIds,
        enabled: row.enabled,
        joinedAt: new Date().toISOString().slice(0, 10),
        lastLogin: '',
        note: '',
        owner: false,
      })),
    );
    importing.value = false;
    Message.success(t('userManagement.import.success', { count }));
    close();
  }, 350);
}

function close() {
  resetFile();
  emit('update:visible', false);
}
</script>

<template>
  <a-drawer
    :visible="visible"
    :width="560"
    :title="t('userManagement.import.title')"
    class="um-import-drawer"
    @cancel="close"
  >
    <div class="um-import-block">
      <!-- 上传区：指针、键盘（内部主按钮）、拖拽三种方式 -->
      <div
        class="um-dropzone"
        :class="{ 'is-dragging': dragging, 'is-error': Boolean(fileError) }"
        @click="openPicker"
        @drop.prevent="onDrop"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
      >
        <input ref="fileInput" type="file" accept=".xlsx" class="um-file-hidden" @change="onInputChange" />
        <IconFolder :size="28" class="um-dropzone-icon" />
        <p v-if="!fileName" class="um-dropzone-text">{{ t('userManagement.import.uploadHint') }}</p>
        <p v-else class="um-dropzone-file">{{ fileName }}</p>
        <a-button
          v-if="!fileName"
          type="primary"
          class="um-dropzone-action"
          @click.stop="openPicker"
        >{{ t('userManagement.import.upload') }}</a-button>
        <a-button
          v-else
          type="primary"
          class="um-dropzone-action"
          @click.stop="openPicker"
        >{{ t('userManagement.import.reupload') }}</a-button>
        <p v-if="parsing" class="um-dropzone-status">
          <a-spin :size="14" />
          <span>{{ t('userManagement.import.parsing') }}</span>
        </p>
      </div>

      <p v-if="fileError" class="um-import-error">{{ fileError }}</p>

      <!-- 解析结果：可导入行数 + 有问题的行明细 -->
      <div v-if="parsedRows.length" class="um-import-result">
        <p class="um-import-summary">
          <IconCheckCircleFill v-if="!invalidRows.length" class="um-ok" />
          <IconExclamationCircleFill v-else class="um-warn" />
          <span>{{ t('userManagement.import.validSummary', { count: validRows.length }) }}</span>
          <span v-if="invalidRows.length" class="um-import-summary-error">
            · {{ t('userManagement.import.invalidSummary', { count: invalidRows.length }) }}
          </span>
        </p>
        <ul v-if="invalidRows.length" class="um-error-list">
          <li v-for="row in invalidRows" :key="row.index">
            <strong>#{{ row.index }}</strong> {{ row.errors.join('；') }}
          </li>
        </ul>
      </div>

      <!-- 注意事项子区块（亮色 var(--app-import-help-surface)，暗色随主题语义底） -->
      <div class="um-import-notes">
        <p class="um-import-notes-title">{{ t('userManagement.import.notesTitle') }}</p>
        <ul class="um-import-notes-list">
          <li>{{ t('userManagement.import.note1') }}</li>
          <li>{{ t('userManagement.import.note2') }}</li>
          <li>{{ t('userManagement.import.columnHint') }}</li>
        </ul>
      </div>

      <button
        type="button"
        class="um-import-template"
        :disabled="templatePreparing || (!templateFile && !templateError)"
        @click="downloadTemplate"
      >
        <IconDownload :size="14" />
        <span v-if="templatePreparing">{{ t('userManagement.import.templatePreparing') }}</span>
        <span v-else-if="templateError" class="um-import-template-error">{{ t('userManagement.import.templateRetry') }}</span>
        <span v-else>{{ t('userManagement.import.downloadTemplate') }}</span>
      </button>
    </div>

    <template #footer>
      <div class="um-import-footer">
        <a-button class="app-btn-neutral" @click="close">{{ t('userManagement.delete.cancel') }}</a-button>
        <a-button
          type="primary"
          :loading="importing"
          :disabled="!validRows.length || parsing || importing"
          @click="handleImport"
        >{{ t('userManagement.import.confirm') }}</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<style scoped>
/* 业务抽屉表面（画布底 / 白色内容区块）由 global.css 按 .um-import-drawer 统一提供：
   抽屉容器由 Arco 内部渲染，不带本文件的 scope id，scoped :deep() 无法命中。 */
.um-import-block {
  display: flex; flex-direction: column; gap: 16px;
  padding: 16px; background: var(--app-surface); border-radius: 2px;
}

/* 上传目标：虚线语义描边 + 居中文件夹图标 + 说明/文件名 + 主按钮 */
.um-dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 24px 16px; border: 1px dashed var(--app-control-border); border-radius: 2px;
  background: var(--app-surface); cursor: pointer; text-align: center;
}
.um-dropzone:hover, .um-dropzone.is-dragging { border-color: var(--app-accent); }
.um-dropzone.is-dragging { background: var(--color-primary-light-1); }
.um-dropzone.is-error { border-color: rgb(var(--danger-6)); }
.um-dropzone-icon { color: var(--app-accent); }
.um-dropzone-text { margin: 0; font-size: 14px; line-height: 22px; color: var(--color-text-2); }
.um-dropzone-file { margin: 0; font-size: 14px; line-height: 22px; color: var(--color-text-1); word-break: break-all; }
.um-dropzone-action { margin-top: 2px; }
.um-dropzone-status { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; line-height: 18px; color: var(--color-text-3); }
.um-file-hidden { display: none; }

.um-import-error { margin: 0; font-size: 12px; line-height: 18px; color: rgb(var(--danger-6)); }

.um-import-result { display: flex; flex-direction: column; gap: 8px; }
.um-import-summary { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 14px; line-height: 22px; color: var(--color-text-1); }
.um-import-summary-error { color: rgb(var(--danger-6)); }
.um-ok { color: rgb(var(--success-6)); }
.um-warn { color: rgb(var(--warning-6)); }
.um-error-list {
  max-height: 160px; overflow: auto; margin: 0; padding: 8px 12px 8px 28px;
  border-radius: 2px; background: var(--app-surface-soft);
  font-size: 12px; line-height: 20px; color: var(--color-text-2);
}
.um-error-list li { margin-bottom: 2px; }

/* 注意事项子区块 */
.um-import-notes { padding: 12px 16px; border-radius: 2px; background: var(--app-import-help-surface); }
body[arco-theme='dark'] .um-import-notes { background: var(--color-fill-2); }
.um-import-notes-title { margin: 0 0 6px; font-size: 13px; line-height: 20px; font-weight: 600; color: var(--color-text-1); }
.um-import-notes-list { margin: 0; padding-left: 18px; font-size: 12px; line-height: 20px; color: var(--color-text-2); }

/* 模版下载命令：文字型链接按钮，准备中显示加载态，失败保留重试入口 */
.um-import-template {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  padding: 0; border: 0; background: transparent; cursor: pointer;
  font: inherit; font-size: 13px; line-height: 20px; color: var(--app-accent);
}
.um-import-template:hover:not(:disabled) { text-decoration: underline; text-underline-offset: 2px; }
.um-import-template:disabled { color: var(--color-text-3); cursor: default; }
.um-import-template-error { color: rgb(var(--danger-6)); }

.um-import-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
