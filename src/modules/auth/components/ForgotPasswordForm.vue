<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconEmail } from '@arco-design/web-vue/es/icon';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const emit = defineEmits(['back', 'done']);

const form = reactive({ email: '', code: '' });
const loading = ref(false);
const errorMessage = ref('');
const remaining = ref(0);
const sentEmail = ref('');
const expiresAt = ref(0);
const timer = window.setInterval(() => {
  remaining.value = Math.max(0, Math.ceil((expiresAt.value - Date.now()) / 1000) - 240);
}, 1000);
onUnmounted(() => window.clearInterval(timer));

// 返回登录视图；本组件为登录面板内的切换视图，状态均为本地响应式，未落库
function goBack() {
  emit('back');
}

function sendCode() {
  if (remaining.value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMessage.value = t('loginExtra.emailError');
    return;
  }
  if (form.email.trim().toLowerCase() !== authStore.boundEmail.toLowerCase()) {
    errorMessage.value = t('forgot.emailNotBound');
    return;
  }
  sentEmail.value = form.email;
  expiresAt.value = Date.now() + 300000;
  remaining.value = 60;
  Message.info(t('loginExtra.demoCode'));
}

async function handleSubmit() {
  if (loading.value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.email.trim().toLowerCase() !== authStore.boundEmail.toLowerCase()) {
    errorMessage.value = t('forgot.emailNotBound');
    return;
  }
  if (sentEmail.value !== form.email || Date.now() >= expiresAt.value || form.code !== authStore.resetCode) {
    errorMessage.value = t('loginExtra.codeError');
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  const wasLocked = authStore.accountLocked;
  try {
    await authStore.resetPassword(form.email);
    Message.success(wasLocked ? t('forgot.successUnlocked') : t('forgot.success'));
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    emit('done');
  } catch {
    errorMessage.value = t('forgot.emailNotBound');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="forgot-form">
    <h2 class="forgot-title">{{ t('forgot.title') }}</h2>
    <p class="forgot-desc">{{ t('forgot.desc') }}</p>

    <a-alert v-if="errorMessage" class="forgot-alert" type="error" show-icon>
      {{ errorMessage }}
    </a-alert>

    <a-form :model="form" layout="vertical" @submit-success="handleSubmit">
      <a-form-item field="email" :hide-asterisk="true" :hide-label="true">
        <a-input
          v-model="form.email"
          :placeholder="t('forgot.emailPlaceholder')"
          autocomplete="email"
          allow-clear
        >
          <template #prefix><IconEmail /></template>
        </a-input>
      </a-form-item>

      <a-form-item field="code" :hide-asterisk="true" :hide-label="true">
        <a-input
          v-model="form.code"
          :placeholder="t('forgot.codePlaceholder')"
          :max-length="6"
          autocomplete="one-time-code"
          inputmode="numeric"
        >
          <template #suffix>
            <button
              type="button"
              class="forgot-send"
              :disabled="remaining > 0 || loading"
              @click="sendCode"
            >{{ remaining ? t('loginExtra.resend', { count: remaining }) : t('forgot.sendCode') }}</button>
          </template>
        </a-input>
      </a-form-item>

      <a-button
        class="forgot-submit"
        type="primary"
        html-type="submit"
        long
        :loading="loading"
      >
        {{ t('forgot.submit') }}
      </a-button>
    </a-form>
    <button type="button" class="forgot-back-link" @click="goBack">{{ t('forgot.back') }}</button>
  </div>
</template>

<style scoped>
.forgot-form { width: 100%; }
.forgot-title { margin: 0 0 8px; color: var(--color-text-1); font-size: 20px; font-weight: 600; }
.forgot-desc { margin: 0 0 24px; color: var(--color-text-3); font-size: 14px; line-height: 1.6; }
.forgot-alert { margin-bottom: 16px; }
.forgot-send { border: none; background: transparent; cursor: pointer; padding: 0 6px; color: rgb(var(--primary-6)); font-size: 13px; white-space: nowrap; transition: color .2s; }
.forgot-send:hover:not(:disabled) { color: rgb(var(--primary-7)); }
.forgot-send:disabled { color: var(--color-text-3); cursor: not-allowed; }
.forgot-submit { margin-top: 24px; height: 52px; font-size: 16px; font-weight: 600; }
.forgot-back-link {
  display: block;
  width: 100%;
  margin-top: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 0;
  color: rgb(var(--primary-6));
  font-size: 14px;
  text-align: center;
  transition: color .2s;
}
.forgot-back-link:hover { color: rgb(var(--primary-7)); }
@media (max-width: 480px) {
  .forgot-submit { height: 48px; }
}
</style>
