<script setup lang="ts">
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconCheckCircle,
  IconClose,
  IconCloseCircle,
  IconExclamationCircle,
  IconInfoCircle,
  IconQuestionCircle,
} from '@arco-design/web-vue/es/icon';

/**
 * 全站统一的「提示 / 问号确认 / 告警 / 成功」类居中弹窗（DESIGN.md · Confirmation dialogs）。
 * 参考稿四段式结构：状态图标 → 标题 → 可选副标题 → 底部操作区；
 * 外壳固定 560×250px（--mt-ds-confirm-width / --mt-ds-confirm-height，2026-11-08 用户裁决），
 * 标题栏不放文字，只保留**钉在右上角**的 X；按钮渲染在 Arco 的独立 footer 区块里。
 * 状态图标与标题**同一水平、同一行**（2026-11-08 用户裁决）：图标放在与标题首行绑定的定高槽里，
 * 副标题只留在右侧文案列，不会把图标相对整块文案继续下推。
 *
 * 按钮文案默认走 i18n 的 common.*，调用方应传入业务文案 t(...)。
 * 组件只做模板挂载（不命令式挂载），保证 useI18n() 的注入上下文可用。
 */
type IconKind = 'question' | 'info' | 'warning' | 'success' | 'danger';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** 状态图标语义：question 问号确认 / info 提示 / warning 告警 / success 成功 / danger 危险。 */
    icon?: IconKind;
    title: string;
    /** 副标题：单段文本或多行文本（多行逐行渲染、统一左对齐）。 */
    description?: string | string[];
    /** 单按钮模式（纯提示）：只显示一个「我知道了」。 */
    single?: boolean;
    okText?: string;
    cancelText?: string;
    ackText?: string;
    okLoading?: boolean;
    cancelDisabled?: boolean;
    /** false 时 X / Esc / 遮罩 / 取消都不允许关闭，用于进行中的异步操作。 */
    dismissible?: boolean;
    width?: number | string;
  }>(),
  {
    icon: 'question',
    description: '',
    single: false,
    okLoading: false,
    cancelDisabled: false,
    dismissible: true,
    width: 'var(--mt-ds-confirm-width)',
  },
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useI18n();
const titleId = useId();

const iconComponents = {
  question: IconQuestionCircle,
  info: IconInfoCircle,
  warning: IconExclamationCircle,
  success: IconCheckCircle,
  danger: IconCloseCircle,
};
const iconComponent = computed(() => iconComponents[props.icon]);
const descriptionLines = computed(() =>
  Array.isArray(props.description)
    ? props.description.filter(Boolean)
    : props.description
      ? [props.description]
      : [],
);

function close() {
  if (!props.dismissible) return;
  emit('update:visible', false);
}
function onCancel() {
  if (props.cancelDisabled) return;
  close();
}
</script>

<template>
  <a-modal
    :visible="visible"
    :width="width"
    :title="''"
    :closable="false"
    role="dialog"
    aria-modal="true"
    :esc-to-close="dismissible"
    :aria-labelledby="titleId"
    :mask-closable="dismissible"
    class="app-confirm-dialog"
    @cancel="close"
  >
    <template #title>
      <a-button v-if="dismissible" type="text" class="mt-confirm-close" :aria-label="t('designSystem.close')" @click="close"><IconClose /></a-button>
    </template>
    <div class="app-confirm-main">
      <span class="app-confirm-icon-slot">
        <component
          :is="iconComponent"
          class="app-confirm-icon"
          :class="`app-confirm-icon-${icon}`"
        />
      </span>
      <div class="app-confirm-copy">
        <p :id="titleId" class="app-confirm-title">{{ title }}</p>
        <p v-for="(line, index) in descriptionLines" :key="index" class="app-confirm-desc">{{ line }}</p>
      </div>
    </div>

    <template #footer>
      <a-button v-if="single" type="primary" @click="close">{{ ackText ?? t('designSystem.acknowledge') }}</a-button>
      <template v-else>
        <a-button class="app-btn-neutral" :disabled="cancelDisabled" @click="onCancel">
          {{ cancelText ?? t('designSystem.cancel') }}
        </a-button>
        <a-button type="primary" :loading="okLoading" @click="!okLoading && emit('confirm')">
          {{ okText ?? t('designSystem.confirm') }}
        </a-button>
      </template>
    </template>
  </a-modal>
</template>

<style scoped>
/* The shell styles below follow the teleported Arco container. */
/* 2026-11-08 用户裁决：图标与标题同一水平、同一行。
   外层改 flex-start，让图标槽与标题首行顶部对齐；槽高取标题行高 24px 并垂直居中 20px 图标，
   两者中心因此始终重合。副标题留在 .app-confirm-copy 内，不再把图标相对整块文案下推
   （旧的 align-items:center 在 1/2 行副标题时分别偏移 15px / 28px）。 */
.app-confirm-main { display: flex; align-items: flex-start; gap: var(--mt-ds-space-6); width: 100%; min-width: 0; }
.app-confirm-icon-slot {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mt-ds-confirm-icon);
  height: var(--mt-ds-line-title);
}
/* Arco 图标以 1em 渲染，去掉 :size 后由令牌单一控制尺寸（svg 宽高 = font-size = 20px） */
.app-confirm-icon { flex: none; font-size: var(--mt-ds-confirm-icon); color: var(--app-confirm-icon); }
.app-confirm-icon-success { color: rgb(var(--success-6)); }
.app-confirm-icon-danger { color: rgb(var(--danger-6)); }
.app-confirm-copy { min-width: 0; }
.mt-confirm-close { padding: 0; width: var(--mt-ds-control-height); height: var(--mt-ds-control-height); color: var(--mt-ds-text-secondary); }
.app-confirm-title {
  margin: 0;
  font-size: var(--mt-ds-font-title);
  font-weight: var(--mt-ds-weight-title);
  line-height: var(--mt-ds-line-title);
  color: var(--color-text-1);
  overflow-wrap: anywhere;
}
.app-confirm-desc {
  margin: var(--mt-ds-space-2) 0 0;
  font-size: var(--mt-ds-font-body);
  font-weight: var(--mt-ds-weight-body);
  line-height: var(--mt-ds-line-body);
  color: var(--app-confirm-desc);
  overflow-wrap: anywhere;
}
.app-confirm-desc + .app-confirm-desc { margin-top: var(--mt-ds-space-1); }
</style>

<style>
.app-confirm-dialog .arco-modal {
  display: inline-flex;
  flex-direction: column;
  /* 2026-11-08 用户裁决：二次弹窗高度固定 250px，不再随内容从 320px 最小高度继续长大；
     内容超高时由 body 内部滚动，header / footer 始终钉在上下两端。 */
  height: var(--mt-ds-confirm-height);
  min-height: 0;
  max-width: calc(100vw - var(--mt-ds-space-5) * 2);
  max-height: calc(100vh - var(--mt-ds-space-5) * 2);
}
.app-confirm-dialog .arco-modal-header {
  flex: none;
  height: var(--mt-ds-dialog-header-height);
  padding: 0 var(--mt-ds-space-5);
  justify-content: flex-end;
  border-bottom: 0;
}
/* 全局 .arco-modal .arco-modal-header .arco-modal-title（0,3,0）会把标题栏设成
   justify-content:flex-start + padding-right:24px，令 #title 插槽里的 X 跑到**左上角**。
   这里用 0,4,0 的选择器压过它，把 X 钉回右上角（距弹窗右边 20px、距上边 8px）。 */
.app-confirm-dialog .arco-modal .arco-modal-header .arco-modal-title {
  display: flex;
  justify-content: flex-end;
  padding-right: 0;
}
.app-confirm-dialog .arco-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  overflow-y: auto;
  padding: var(--mt-ds-space-6) var(--mt-ds-space-5);
}
/* 与「表单弹窗 footer 带 1px 上描边」相对：确认类弹窗的 footer 不描边，靠留白分区 */
body .app-confirm-dialog .arco-modal-footer {
  flex: none;
  padding: var(--mt-ds-space-4) var(--mt-ds-space-5) var(--mt-ds-space-5);
  border-top: 0;
  text-align: right;
}
@media (prefers-reduced-motion: reduce) {
  .app-confirm-dialog .arco-modal, .app-confirm-dialog .arco-modal-mask { animation: none !important; transition: none !important; }
}
</style>
