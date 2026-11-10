<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconClose, IconSend, IconUser } from '@arco-design/web-vue/es/icon';
import assistantAvatar from '../assets/ai-assistant-avatar.svg';

/** 平台级 AI 助手形态沿用天枢：右下角入口 + 图标上方的对话面板。
 *  本轮按用户裁决改为纯头像入口、420×560 面板与 OpenData 本地化示例问答；
 *  未接入在线模型，回复仍是本地模拟（与天枢一致）。 */
interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  key?: string;
  text?: string;
}

const { t } = useI18n({ useScope: 'global' });
const visible = ref(false);
const draft = ref('');
const panelRef = ref<HTMLElement | null>(null);
const launcherRef = ref<HTMLButtonElement | null>(null);
const messageListRef = ref<HTMLElement | null>(null);
const messages = ref<ChatMessage[]>([
  { id: 1, role: 'assistant', key: 'assistant.welcome' },
  { id: 2, role: 'user', key: 'assistant.question' },
  { id: 3, role: 'assistant', key: 'assistant.tasks' },
]);
let nextId = 4;

/** 模拟回复：按问题里的业务关键词给出对应的功能指引，其余落到演示态提示。 */
function answerKeyFor(question: string): string {
  if (/任务|待办|审批|task|todo|approval/i.test(question)) return 'assistant.tasks';
  if (/证书|合规|certificate|compliance/i.test(question)) return 'assistant.certificates';
  if (/消息|通知|铃铛|message|notice/i.test(question)) return 'assistant.messages';
  if (/数据|目录|材料|规则|data|catalog|rule/i.test(question)) return 'assistant.data';
  return 'assistant.unavailable';
}

function scrollToLatest() {
  nextTick(() => {
    if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  });
}

function openAssistant() {
  visible.value = true;
  scrollToLatest();
  nextTick(() => panelRef.value?.querySelector('input')?.focus());
}

function closeAssistant(restoreFocus = true) {
  visible.value = false;
  if (restoreFocus) nextTick(() => launcherRef.value?.focus());
}

function sendMessage() {
  const question = draft.value.trim();
  if (!question) return;
  messages.value.push({ id: nextId++, role: 'user', text: question });
  messages.value.push({ id: nextId++, role: 'assistant', key: answerKeyFor(question) });
  draft.value = '';
  scrollToLatest();
}

function onOutsideClick(event: PointerEvent) {
  const target = event.target;
  if (!visible.value || !(target instanceof Node)) return;
  if (!panelRef.value?.contains(target) && !launcherRef.value?.contains(target)) closeAssistant(false);
}

function onEscape(event: KeyboardEvent) {
  if (visible.value && event.key === 'Escape') closeAssistant();
}

onMounted(() => {
  document.addEventListener('pointerdown', onOutsideClick);
  document.addEventListener('keydown', onEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutsideClick);
  document.removeEventListener('keydown', onEscape);
});
</script>

<template>
  <div class="assistant-root">
    <section v-if="visible" id="assistant-panel" ref="panelRef" class="assistant-panel" role="dialog" :aria-label="t('assistant.title')" aria-modal="false">
      <header class="assistant-header">
        <img class="assistant-header-avatar" :src="assistantAvatar" alt="" />
        <h2>{{ t('assistant.title') }}</h2>
        <button class="assistant-close" type="button" :aria-label="t('assistant.close')" @click="closeAssistant()"><IconClose :size="18" /></button>
      </header>
      <div ref="messageListRef" class="assistant-messages" role="log" aria-live="polite" aria-relevant="additions">
        <div v-for="message in messages" :key="message.id" class="assistant-message" :class="`assistant-message--${message.role}`">
          <span class="assistant-message-avatar" aria-hidden="true">
            <img v-if="message.role === 'assistant'" class="assistant-message-avatar-image" :src="assistantAvatar" alt="" />
            <IconUser v-else :size="16" />
          </span>
          <p>{{ message.key ? t(message.key) : message.text }}</p>
        </div>
      </div>
      <form class="assistant-compose" @submit.prevent="sendMessage">
        <a-input v-model="draft" :placeholder="t('assistant.placeholder')" :aria-label="t('assistant.placeholder')" :max-length="500" />
        <button class="assistant-send" type="submit" :disabled="!draft.trim()" :aria-label="t('assistant.send')" :title="t('assistant.send')"><IconSend :size="19" /></button>
      </form>
    </section>
    <button ref="launcherRef" class="assistant-launcher" type="button" :aria-label="t('assistant.open')" :title="t('assistant.open')" aria-haspopup="dialog" :aria-expanded="visible" aria-controls="assistant-panel" @click="visible ? closeAssistant() : openAssistant()">
      <img class="assistant-launcher-image" :src="assistantAvatar" alt="" />
    </button>
  </div>
</template>

<style scoped>
/* 全局悬浮层：高于产品壳（header 20 / sidebar 10），低于 Arco 模态与弹层。 */
.assistant-root { position: relative; z-index: 900; }
/* 2026-11-09 用户裁决：入口只用换色后的机器人头像，不保留天枢的 48px 圆形主色按钮。 */
.assistant-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 2;
  display: grid; place-items: center; width: 56px; height: 56px;
  padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer;
  transition: transform 180ms ease, filter 180ms ease;
}
.assistant-launcher-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.assistant-launcher:hover, .assistant-launcher:focus-visible {
  transform: scale(1.06);
  filter: drop-shadow(0 0 10px var(--app-accent)) drop-shadow(var(--app-assistant-shadow));
}
.assistant-launcher:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 3px; }
.assistant-launcher:active { transform: scale(1); }
/* 2026-11-09 用户裁决：面板结构照搬天枢，尺寸 372×420 → 420×560。
   贴入口正上方：24px 底距 + 56px 头像 + 16px 间距 = bottom 96px。 */
.assistant-panel {
  position: fixed; right: 24px; bottom: 96px; z-index: 1;
  display: flex; flex-direction: column; width: min(420px, calc(100vw - 32px));
  height: min(560px, calc(100dvh - 120px)); min-height: 280px;
  overflow: hidden; border-radius: 8px; color: var(--color-text-1);
  background: var(--color-bg-popup); box-shadow: var(--app-assistant-panel-shadow);
}
.assistant-header { display: flex; align-items: center; gap: 8px; flex: none; min-height: 52px; padding: 0 16px; border-bottom: 1px solid var(--color-border-2); }
.assistant-header-avatar { flex: none; width: 28px; height: 28px; object-fit: contain; }
.assistant-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.assistant-close { display: grid; place-items: center; width: 28px; height: 28px; margin-left: auto; border: 0; border-radius: 4px; color: var(--color-text-2); background: transparent; cursor: pointer; }
.assistant-close:hover { background: var(--color-fill-2); }
.assistant-close:focus-visible, .assistant-send:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 2px; }
.assistant-messages { flex: 1; min-height: 0; padding: 16px; overflow-y: auto; overscroll-behavior: contain; }
.assistant-message { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
.assistant-message--user { flex-direction: row-reverse; }
.assistant-message-avatar { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: var(--color-fill-2); }
.assistant-message-avatar-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.assistant-message--user .assistant-message-avatar { color: var(--color-text-2); background: var(--color-fill-3); }
.assistant-message p { max-width: 300px; margin: 0; padding: 10px 12px; border-radius: 4px; background: var(--color-fill-2); font-size: 13px; line-height: 1.55; white-space: pre-line; overflow-wrap: anywhere; }
.assistant-message--user p { color: var(--color-white); background: rgb(var(--primary-6)); }
.assistant-compose { display: flex; gap: 8px; flex: none; padding: 12px 16px 16px; }
.assistant-compose :deep(.arco-input-wrapper) { flex: 1; min-width: 0; background: var(--color-fill-2); }
.assistant-send { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border: 0; border-radius: 4px; color: var(--color-white); background: rgb(var(--primary-6)); cursor: pointer; }
.assistant-send:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 560px) {
  .assistant-launcher { right: 16px; bottom: 16px; }
  .assistant-panel { right: 16px; bottom: 88px; }
}
@media (prefers-reduced-motion: reduce) {
  .assistant-launcher { transition: none; }
}
</style>
