<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import AppFormLayout from '../../../design/components/AppFormLayout.vue';
import AppFieldLabel from '../../../design/components/AppFieldLabel.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { emailSettings, smsSettings } from '../data/settings';
const { t } = useI18n();
const tab = ref('email');
const email = reactive({ ...emailSettings });
const sms = reactive({ ...smsSettings });
const checked = ref(false);
const busy = ref(false);
const resetOpen = ref(false);
const testOpen = ref(false);
const recipient = ref('');
const testChecked = ref(false);
const testError = ref(false);
const root = ref<HTMLElement>();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isSms = computed(() => tab.value === 'sms');
const fields = computed(() => isSms.value ? ['status','platform','endpoint','keyId','appId','secret','signature','limit'] : ['server','ssl','port','sender','auth','password']);
function required(field: string) { return !['ssl','status','keyId','limit'].includes(field) && (!isSms.value || sms.enabled); }
function value(field: string): unknown { return ({ ...email, ...sms } as Record<string, unknown>)[field]; }
function error(field: string) {
  if (!checked.value || (isSms.value && !sms.enabled)) return '';
  const v = value(field);
  if (required(field) && ((typeof v === 'string' && !v.trim()) || v === undefined)) return t('thirdParty.required');
  if (field === 'sender' && !emailPattern.test(email.sender)) return t('thirdParty.invalidEmail');
  if (field === 'port' && (!Number.isInteger(email.port) || Number(email.port) < 1 || Number(email.port) > 65535)) return t('thirdParty.invalidPort');
  if (field === 'limit' && (!Number.isInteger(sms.limit) || Number(sms.limit) < 1)) return t('thirdParty.invalidLimit');
  if (field === 'endpoint') { try { const url = new URL(sms.endpoint); if (!['https:','http:'].includes(url.protocol)) throw new Error(); } catch { return t('thirdParty.invalidUrl'); } }
  return '';
}
async function validate() {
  checked.value = true;
  if (!fields.value.some(field => error(field))) return true;
  await nextTick();
  const item = root.value?.querySelector<HTMLElement>('.arco-form-item-status-error');
  item?.scrollIntoView({ block: 'nearest' });
  item?.querySelector<HTMLElement>('input,button')?.focus();
  return false;
}
async function save() {
  if (busy.value || !await validate()) return;
  busy.value = true;
  try { if (isSms.value) Object.assign(smsSettings, sms); else Object.assign(emailSettings, email); Message.success(t('thirdParty.saved')); }
  finally { busy.value = false; }
}
async function openTest() {
  if (!await validate()) return;
  recipient.value = ''; testChecked.value = false; testError.value = false; testOpen.value = true;
}
const recipientError = computed(() => !testChecked.value ? '' : (isSms.value ? /^\+?[1-9]\d{6,14}$/.test(recipient.value) : emailPattern.test(recipient.value)) ? '' : t(isSms.value ? 'thirdParty.invalidPhone' : 'thirdParty.invalidEmail'));
async function sendTest() {
  if (busy.value) return;
  testChecked.value = true;
  if (recipientError.value) { await nextTick(); document.getElementById('notification-recipient')?.focus(); return; }
  // A real transport must replace this unavailable result once its API is agreed.
  busy.value = true;
  try { await new Promise(resolve => setTimeout(resolve, 250)); testError.value = true; }
  finally { busy.value = false; }
}
function resetPassword() { email.password = ''; resetOpen.value = false; nextTick(() => document.getElementById('notification-password')?.focus()); }
</script>

<template>
<section ref="root" class="notification-settings" :aria-label="t('thirdParty.title')">
  <a-tabs v-model:active-key="tab" @change="checked = false">
    <a-tab-pane key="email" :title="t('thirdParty.email')" />
    <a-tab-pane key="sms" :title="t('thirdParty.sms')" />
  </a-tabs>
  <a-form :model="isSms ? sms : email" layout="vertical" @submit="save">
    <div class="notification-grid">
      <AppFormLayout v-for="field in fields" :key="tab + field">
        <a-form-item :required="required(field)" :validate-status="error(field) ? 'error' : undefined" :help="error(field)">
          <template #label><AppFieldLabel :text="t(`thirdParty.${field}`)" /></template>
          <a-input v-if="field === 'server'" v-model="email.server" :input-attrs="{ 'aria-label': t('thirdParty.server') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.server') })" />
          <a-radio-group v-else-if="field === 'ssl'" v-model="email.ssl" :aria-label="t('thirdParty.ssl')"><a-radio :value="true">{{ t('thirdParty.enabled') }}</a-radio><a-radio :value="false">{{ t('thirdParty.disabled') }}</a-radio></a-radio-group>
          <a-input-number v-else-if="field === 'port'" v-model="email.port" :min="1" :max="65535" :precision="0" :input-attrs="{ 'aria-label': t('thirdParty.port') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.port') })" />
          <a-input v-else-if="field === 'sender'" v-model="email.sender" :input-attrs="{ 'aria-label': t('thirdParty.sender') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.sender') })" />
          <a-select v-else-if="field === 'auth'" v-model="email.auth" :aria-label="t('thirdParty.auth')" :placeholder="t('thirdParty.select')"><a-option value="LOGIN">LOGIN</a-option><a-option value="PLAIN">PLAIN</a-option></a-select>
          <div v-else-if="field === 'password'" class="password-field"><a-input-password :input-attrs="{ id: 'notification-password', 'aria-label': t('thirdParty.password') }" v-model="email.password" autocomplete="new-password" /><a-button type="text" @click="resetOpen = true">{{ t('thirdParty.reset') }}</a-button></div>
          <a-radio-group v-else-if="field === 'status'" v-model="sms.enabled" :aria-label="t('thirdParty.status')"><a-radio :value="true">{{ t('thirdParty.enabled') }}</a-radio><a-radio :value="false">{{ t('thirdParty.disabled') }}</a-radio></a-radio-group>
          <a-select v-else-if="field === 'platform'" v-model="sms.platform" :disabled="!sms.enabled" :aria-label="t('thirdParty.platform')" :placeholder="t('thirdParty.select')"><a-option value="custom">{{ t('thirdParty.custom') }}</a-option></a-select>
          <a-input v-else-if="field === 'endpoint'" v-model="sms.endpoint" :disabled="!sms.enabled" :input-attrs="{ 'aria-label': t('thirdParty.endpoint') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.endpoint') })" />
          <a-input v-else-if="field === 'keyId'" v-model="sms.keyId" :disabled="!sms.enabled" :input-attrs="{ 'aria-label': t('thirdParty.keyId') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.keyId') })" />
          <a-input v-else-if="field === 'appId'" v-model="sms.appId" :disabled="!sms.enabled" :input-attrs="{ 'aria-label': t('thirdParty.appId') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.appId') })" />
          <a-input-password v-else-if="field === 'secret'" v-model="sms.secret" :disabled="!sms.enabled" autocomplete="new-password" :input-attrs="{ 'aria-label': t('thirdParty.secret') }" />
          <a-input v-else-if="field === 'signature'" v-model="sms.signature" :disabled="!sms.enabled" :input-attrs="{ 'aria-label': t('thirdParty.signature') }" :placeholder="t('thirdParty.input', { field: t('thirdParty.signature') })" />
          <div v-else-if="field === 'limit'" class="limit-field"><span>{{ t('thirdParty.monthly') }}</span><a-input-number v-model="sms.limit" :disabled="!sms.enabled" :min="1" :precision="0" mode="button" :input-attrs="{ 'aria-label': t('thirdParty.limit') }" /><span>{{ t('thirdParty.times') }}</span><span class="sent-count">{{ t('thirdParty.sent', { count: 0 }) }}</span></div>
        </a-form-item>
      </AppFormLayout>
    </div>
    <a-space><a-button type="primary" html-type="submit" :loading="busy">{{ t('thirdParty.save') }}</a-button><a-button :disabled="busy || (isSms && !sms.enabled)" @click="openTest">{{ t(isSms ? 'thirdParty.testSms' : 'thirdParty.testEmail') }}</a-button></a-space>
  </a-form>
  <ConfirmDialog v-model:visible="resetOpen" :title="t('thirdParty.resetTitle')" :description="t('thirdParty.resetBody')" @confirm="resetPassword" />
  <a-modal v-model:visible="testOpen" :title="t(isSms ? 'thirdParty.testSms' : 'thirdParty.testEmail')" :mask-closable="false" :closable="!busy" :esc-to-close="!busy" :width="'min(560px, calc(100vw - 32px))'" :footer="false">
    <a-form :model="{ recipient }" layout="vertical" @submit="sendTest">
      <a-form-item required :validate-status="recipientError ? 'error' : undefined" :help="recipientError"><template #label><AppFieldLabel :text="t(isSms ? 'thirdParty.recipientPhone' : 'thirdParty.recipientEmail')" /></template><a-input v-model="recipient" :input-attrs="{ id: 'notification-recipient', 'aria-label': t(isSms ? 'thirdParty.recipientPhone' : 'thirdParty.recipientEmail') }" @input="testError = false" /></a-form-item>
      <p v-if="testError" class="send-error" role="alert">{{ t('thirdParty.unavailable') }}</p>
      <a-space><a-button :disabled="busy" @click="testOpen = false">{{ t('thirdParty.cancel') }}</a-button><a-button type="primary" html-type="submit" :loading="busy">{{ t('thirdParty.send') }}</a-button></a-space>
    </a-form>
  </a-modal>
</section>
</template>

<style scoped>
/* Stretch this route through the shell; its padding owns the 16px bottom gutter. */
:global(.product-body:has(.notification-settings)) { align-items: stretch; }
:global(.product-main:has(> .notification-settings)) { display: flex; flex-direction: column; }
.notification-settings { flex: 1; padding: var(--mt-ds-space-6); background: var(--app-surface); min-width: 0; }
.notification-grid { display: grid; grid-template-columns: repeat(2, minmax(0, var(--mt-ds-form-width))); gap: 0 var(--mt-ds-space-6); margin-top: var(--mt-ds-space-4); }
.password-field { display: flex; width: 100%; gap: var(--mt-ds-space-2); }
.password-field > .arco-input-wrapper { flex: 1; min-width: 0; }
.limit-field { display: flex; align-items: center; gap: var(--mt-ds-space-2); flex-wrap: wrap; }
.limit-field .arco-input-number { width: var(--mt-ds-filter-width); }
.sent-count { color: var(--mt-ds-text-secondary); }
.send-error { color: var(--app-color-danger); margin-bottom: var(--mt-ds-space-4); }
@media (max-width: 1100px) { .notification-grid { grid-template-columns: minmax(0, var(--mt-ds-form-width)); } }
</style>
