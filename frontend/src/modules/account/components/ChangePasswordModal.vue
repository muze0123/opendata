<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'saved'): void;
}>();

const { t } = useI18n();
const current = ref('');
const next = ref('');
const confirm = ref('');
const errors = ref<{ current?: string; next?: string; confirm?: string }>({});

watch(
  () => props.visible,
  (open) => {
    if (open) {
      current.value = '';
      next.value = '';
      confirm.value = '';
      errors.value = {};
    }
  },
);

function submit() {
  const next3 = { current: '', next: '', confirm: '' } as typeof errors.value;
  if (!current.value.trim()) next3.current = t('account.currentPassword') + t('designSystem.required');
  if (!next.value.trim()) next3.next = t('account.newPassword') + t('designSystem.required');
  else if (next.value.trim().length < 6) next3.next = t('userManagement.form.validation.passwordTooShort');
  if (!confirm.value.trim()) next3.confirm = t('account.confirmPassword') + t('designSystem.required');
  else if (next.value.trim() && confirm.value.trim() !== next.value.trim()) next3.confirm = t('userManagement.form.validation.passwordMismatch');
  errors.value = next3;
  if (next3.current || next3.next || next3.confirm) return;
  emit('saved');
  emit('update:visible', false);
  Message.success(t('userManagement.form.updated'));
}
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="t('account.changePasswordTitle')"
    class="account-dialog"
    :width="440"
    @cancel="close"
  >
    <div class="pwd-form">
      <label class="pwd-field-label" for="pw-current">{{ t('account.currentPassword') }}</label>
      <a-input
        id="pw-current"
        v-model="current"
        type="password"
        :placeholder="t('login.passwordPlaceholder')"
        autocomplete="current-password"
        allow-clear
        @input="errors.current = ''"
      />
      <p v-if="errors.current" class="pwd-error">{{ errors.current }}</p>

      <label class="pwd-field-label" for="pw-next">{{ t('account.newPassword') }}</label>
      <a-input
        id="pw-next"
        v-model="next"
        type="password"
        :placeholder="t('login.passwordPlaceholder')"
        autocomplete="new-password"
        allow-clear
        @input="errors.next = ''"
      />
      <p v-if="errors.next" class="pwd-error">{{ errors.next }}</p>

      <label class="pwd-field-label" for="pw-confirm">{{ t('account.confirmPassword') }}</label>
      <a-input
        id="pw-confirm"
        v-model="confirm"
        type="password"
        :placeholder="t('login.passwordPlaceholder')"
        autocomplete="new-password"
        allow-clear
        @input="errors.confirm = ''"
      />
      <p v-if="errors.confirm" class="pwd-error">{{ errors.confirm }}</p>
    </div>

    <template #footer>
      <a-button class="app-btn-neutral" @click="close">{{ t('designSystem.cancel') }}</a-button>
      <a-button type="primary" @click="submit">{{ t('account.confirm') }}</a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.pwd-form { display: flex; flex-direction: column; }
.pwd-field-label { display: block; margin: 16px 0 6px; color: var(--color-text-2); font-size: 14px; line-height: 22px; }
.pwd-field-label:first-of-type { margin-top: 0; }
.pwd-error { margin: 6px 0 0; color: rgb(var(--danger-6)); font-size: 12px; line-height: 20px; }
</style>
