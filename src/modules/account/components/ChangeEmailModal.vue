<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { useCodeSender } from '../composables/useCodeSender';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'saved', email: string): void;
}>();

const { t } = useI18n();
const { remaining, start } = useCodeSender();
const email = ref('');
const code = ref('');
const emailError = ref('');
const codeError = ref('');

const DEMO_CODE = '123456';
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));

watch(
  () => props.visible,
  (open) => {
    if (open) {
      email.value = '';
      code.value = '';
      emailError.value = '';
      codeError.value = '';
    }
  },
);

function sendCode() {
  if (remaining.value > 0) return;
  if (!emailValid.value) {
    emailError.value = t('userManagement.form.validation.emailInvalid');
    return;
  }
  Message.info(t('account.demoCode'));
  start();
}

function submit() {
  let ok = true;
  if (!emailValid.value) {
    emailError.value = t('userManagement.form.validation.emailInvalid');
    ok = false;
  } else {
    emailError.value = '';
  }
  if (!code.value.trim()) {
    codeError.value = t('account.code') + t('designSystem.required');
    ok = false;
  } else if (code.value.trim() !== DEMO_CODE) {
    codeError.value = t('loginExtra.codeError');
    ok = false;
  } else {
    codeError.value = '';
  }
  if (!ok) return;
  emit('saved', email.value.trim());
  emit('update:visible', false);
}
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="t('account.changeEmailTitle')"
    class="account-dialog"
    :width="440"
    @cancel="close"
  >
    <div class="change-form">
      <p class="change-hint">{{ t('account.changeEmailHint') }}</p>

      <label class="change-field-label" for="ce-email">{{ t('account.newEmail') }}</label>
      <a-input
        id="ce-email"
        v-model="email"
        :placeholder="t('userManagement.form.emailPlaceholder')"
        autocomplete="email"
        allow-clear
        @input="emailError = ''"
      />
      <p v-if="emailError" class="change-error">{{ emailError }}</p>

      <label class="change-field-label" for="ce-code">{{ t('account.code') }}</label>
      <div class="change-code-row">
        <a-input
          id="ce-code"
          v-model="code"
          :placeholder="t('account.codePlaceholder')"
          :max-length="6"
          inputmode="numeric"
          autocomplete="one-time-code"
          @input="codeError = ''"
        />
        <a-button
          class="app-btn-neutral change-send"
          :disabled="remaining > 0"
          @click="sendCode"
        >
          {{ remaining ? t('loginExtra.resend', { count: remaining }) : t('loginExtra.send') }}
        </a-button>
      </div>
      <p v-if="codeError" class="change-error">{{ codeError }}</p>
    </div>

    <template #footer>
      <a-button class="app-btn-neutral" @click="close">{{ t('designSystem.cancel') }}</a-button>
      <a-button type="primary" @click="submit">{{ t('account.confirm') }}</a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.change-form { display: flex; flex-direction: column; }
.change-hint { margin: 0 0 20px; color: var(--color-text-3); font-size: 13px; line-height: 20px; }
.change-field-label { display: block; margin: 16px 0 6px; color: var(--color-text-2); font-size: 14px; line-height: 22px; }
.change-field-label:first-of-type { margin-top: 0; }
.change-code-row { display: flex; gap: 12px; }
.change-code-row :deep(.arco-input-wrapper) { flex: 1; }
.change-send { flex: none; min-width: 104px; }
.change-error { margin: 6px 0 0; color: rgb(var(--danger-6)); font-size: 12px; line-height: 20px; }
</style>
