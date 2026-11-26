<script setup lang="ts">
/**
 * 商标富文本编辑器（所见即所得），2026-11-23 用户裁决：商标字段由输入框改为富文本。
 *
 * 与 HMG 项目 RichValue 同源：wangEditor + 白名单只读渲染；工具栏按 HMG 2026-11-17
 * 用户裁决移除加粗（bold）/斜体（italic），其余字体/字号/下划线/删除线/颜色/背景色/
 * 对齐/列表/缩进/链接/图片/表格保留。内容模型为 HTML，只读态经 safeRichHtml 白名单过滤。
 *
 * 图片本地化：上传图片（uploadImage 菜单）与 Ctrl+V 粘贴截图走同一个 customUpload，
 * 经白名单校验后读成 data URL 内联，避免依赖不存在的图片上传服务；超限或格式不支持时提示用户。
 */
import { computed, onBeforeUnmount, shallowRef, type ShallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { i18nChangeLanguage } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';
import { isRichImage, readRichImage, RICH_IMAGE_MAX_BYTES, RICH_IMAGE_TYPES, safeRichHtml } from '../utils/richText';

const props = defineProps<{ label: string; inputId?: string }>();
const value = defineModel<string>({ default: '' });
const { t, locale } = useI18n();
i18nChangeLanguage(locale.value === 'en-US' ? 'en' : 'zh-CN');

const toolbarConfig = {
  toolbarKeys: [
    'fontFamily', 'fontSize',
    // bold / italic 已按裁决移除
    'underline', 'through',
    'color', 'bgColor',
    'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyJustify',
    'bulletedList', 'numberedList',
    'indent', 'delIndent',
    'insertLink', 'unLink', 'insertImage', 'uploadImage', 'insertTable',
  ],
};
interface WangEditor { destroy?: () => void }
type InsertImage = (url: string, alt: string, href: string) => void;
const editorRef: ShallowRef<WangEditor | null> = shallowRef<WangEditor | null>(null);

/** wangEditor 对上传与粘贴图片都走该回调；读成 data URL 后直接插入编辑器。 */
async function uploadRichImage(file: File, insert: InsertImage) {
  if (!isRichImage(file)) { Message.error(t('parts.richImageUnsupported')); return; }
  if (file.size > RICH_IMAGE_MAX_BYTES) { Message.error(t('parts.richImageTooLarge')); return; }
  try {
    insert(await readRichImage(file), file.name, '');
  } catch {
    Message.error(t('parts.richImageFailed'));
  }
}

const editorConfig = {
  placeholder: t('parts.richPlaceholder'),
  autoFocus: false,
  MENU_CONF: {
    uploadImage: {
      allowedFileTypes: [...RICH_IMAGE_TYPES],
      maxFileSize: RICH_IMAGE_MAX_BYTES,
      // 0 = 不走 wangEditor 内置 base64 分支，统一由 customUpload 校验并插入
      base64LimitSize: 0,
      customUpload: uploadRichImage,
    },
  } as Record<string, unknown>,
};

const preview = computed(() => safeRichHtml(value.value || ''));

function handleCreated(editor: WangEditor) { editorRef.value = editor; }
onBeforeUnmount(() => { editorRef.value?.destroy?.(); });
</script>

<template>
  <div class="rich-value" :aria-label="label">
    <div class="rich-toolbar-host">
      <Toolbar :editor="editorRef" :default-config="toolbarConfig" mode="default" />
    </div>
    <div :id="inputId" class="rich-editor-host" :aria-label="label">
      <Editor v-model="value" :default-config="editorConfig" :mode="'default'" @on-created="handleCreated" />
    </div>
  </div>
</template>

<style scoped>
.rich-value { width: 100%; max-width: 100%; min-width: 0; }
.rich-toolbar-host { border: 1px solid var(--app-control-border); border-bottom: 0; background: var(--app-surface); }
.rich-editor-host { border: 1px solid var(--app-control-border); background: var(--app-surface); min-height: 200px; }
.rich-value :deep(.w-e-text-container) { background: var(--app-surface); min-height: 200px; }
.rich-value :deep(.w-e-text-placeholder) { color: var(--color-text-4); }
.rich-value :deep(.w-e-toolbar .w-e-bar-item button:hover),
.rich-value :deep(.w-e-toolbar .w-e-bar-item button.active) { color: var(--app-color-primary); }
</style>
