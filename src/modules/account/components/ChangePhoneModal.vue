<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { useCodeSender } from '../composables/useCodeSender';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'saved', phone: string): void;
}>();

const { t } = useI18n();
const { remaining, start } = useCodeSender();
const phone = ref('');
const code = ref('');
const phoneError = ref('');
const codeError = ref('');

const DEMO_CODE = '123456';
const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value.trim()));

watch(
  () => props.visible,
  (open) => {
    if (open) {
      phone.value = '';
      code.value = '';
      phoneError.value = '';
      codeError.value = '';
    }
  },
);

function sendCode() {
  if (remaining.value > 0) return;
  if (!phoneValid.value) {
    phoneError.value = t('userManagement.form.validation.phoneInvalid');
    return;
  }
  Message.info(t('account.demoCode'));
  start();
}

function submit() {
  let ok = true;
  if (!phoneValid.value) {
    phoneError.value = t('userManagement.form.validation.phoneInvalid');
    ok = false;
  } else {
    phoneError.value = '';
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
  emit('saved', phone.value.trim());
  emit('update:visible', false);
}
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="t('account.changePhoneTitle')"
    class="account-dialog"
    :width="440"
    @cancel="close"
  >
    <div class="change-form">
      <p class="change-hint">{{ t('account.changePhoneHint') }}</p>

      <label class="change-field-label" for="cp-phone">{{ t('account.newPhone') }}</label>
      <a-input
        id="cp-phone"
        v-model="phone"
        :placeholder="t('userManagement.form.phonePlaceholder')"
        :max-length="11"
        autocomplete="tel"
        @input="phoneError = ''"
      />
      <p v-if="phoneError" class="change-error">{{ phoneError }}</p>

      <label class="change-field-label" for="cp-code">{{ t('account.code') }}</label>
      <div class="change-code-row">
        <a-input
          id="cp-code"
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
