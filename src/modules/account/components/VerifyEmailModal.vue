<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { useCodeSender } from '../composables/useCodeSender';

const props = defineProps<{ visible: boolean; currentEmail: string }>();
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'verified'): void;
}>();

const { t } = useI18n();
const { remaining, start } = useCodeSender();
const code = ref('');
const error = ref('');

watch(
  () => props.visible,
  (open) => {
    if (open) {
      code.value = '';
      error.value = '';
    }
  },
);

const DEMO_CODE = '123456';

function sendCode() {
  if (remaining.value > 0) return;
  Message.info(t('account.demoCode'));
  start();
}

function submit() {
  if (!code.value.trim()) {
    error.value = t('account.code') + t('designSystem.required');
    return;
  }
  if (code.value.trim() !== DEMO_CODE) {
    error.value = t('loginExtra.codeError');
    return;
  }
  error.value = '';
  emit('verified');
}
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="t('account.verifyEmailTitle')"
    class="account-dialog"
    :width="440"
    @cancel="close"
  >
    <div class="verify-form">
      <div class="verify-current">
        <span class="verify-label">{{ t('account.currentEmail') }}</span>
        <span class="verify-value">{{ currentEmail }}</span>
      </div>
      <p class="verify-hint">{{ t('account.verifyEmailHint') }}</p>

      <label class="verify-field-label" for="ve-code">{{ t('account.code') }}</label>
      <div class="verify-code-row">
        <a-input
          id="ve-code"
          v-model="code"
          :placeholder="t('account.codePlaceholder')"
          :max-length="6"
          inputmode="numeric"
          autocomplete="one-time-code"
          @input="error = ''"
        />
        <a-button
          class="app-btn-neutral verify-send"
          :disabled="remaining > 0"
          @click="sendCode"
        >
          {{ remaining ? t('loginExtra.resend', { count: remaining }) : t('loginExtra.send') }}
        </a-button>
      </div>
      <p v-if="error" class="verify-error">{{ error }}</p>
    </div>

    <template #footer>
      <a-button class="app-btn-neutral" @click="close">{{ t('designSystem.cancel') }}</a-button>
      <a-button type="primary" @click="submit">{{ t('account.next') }}</a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.verify-form { display: flex; flex-direction: column; }
.verify-current { display: flex; align-items: baseline; gap: 12px; }
.verify-label { color: var(--color-text-3); font-size: 14px; line-height: 22px; }
.verify-value { color: var(--color-text-1); font-size: 14px; line-height: 22px; font-weight: 500; overflow-wrap: anywhere; }
.verify-hint { margin: 8px 0 20px; color: var(--color-text-3); font-size: 13px; line-height: 20px; }
.verify-field-label { display: block; margin-bottom: 6px; color: var(--color-text-2); font-size: 14px; line-height: 22px; }
.verify-code-row { display: flex; gap: 12px; }
.verify-code-row :deep(.arco-input-wrapper) { flex: 1; }
.verify-send { flex: none; min-width: 104px; }
.verify-error { margin: 6px 0 0; color: rgb(var(--danger-6)); font-size: 12px; line-height: 20px; }
</style>
