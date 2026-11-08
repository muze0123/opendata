<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconLock, IconUser } from '@arco-design/web-vue/es/icon';
import opendataLogo from '../../../assets/opendata-logo.svg';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const method = ref('password');
const verified = ref(false);
const slider = ref(0);
const remaining = ref(0);
const sentEmail = ref('');
const expiresAt = ref(0);
const timer = window.setInterval(() => { remaining.value = Math.max(0, Math.ceil((expiresAt.value - Date.now()) / 1000) - 240); }, 1000);
onUnmounted(() => window.clearInterval(timer));
watch(method, () => { verified.value = false; slider.value = 0; errorMessage.value = ''; });
function verifySlider() {
  verified.value = slider.value === 100;
  if (!verified.value) slider.value = 0;
}
function sendCode() {
  if (remaining.value || !verified.value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMessage.value = t('loginExtra.emailError');
    return;
  }
  sentEmail.value = form.email;
  expiresAt.value = Date.now() + 300000;
  remaining.value = 60;
  Message.info(t('loginExtra.demoCode'));
}
const loading = ref(false);
const errorMessage = ref('');
const form = reactive({
  email: '',
  code: '',
  username: '',
  password: '',
  remember: false,
});

async function handleSubmit() {
  if (loading.value) return;

  if (!verified.value) { errorMessage.value = t('loginExtra.verifyFirst'); return; }
  if (method.value === 'email' && (sentEmail.value !== form.email || Date.now() >= expiresAt.value || form.code !== '123456')) {
    errorMessage.value = t('loginExtra.codeError');
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    if (method.value === 'email') await authStore.loginEmail(form.email, form.remember);
    else await authStore.login(form.username, form.password, form.remember);
    Message.success(t('login.success'));
    const requestedRedirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/home';
    const redirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      && router.resolve(requestedRedirect).matched.some((record) => record.meta.requiresAuth)
      ? requestedRedirect : '/home';
    await router.replace(redirect);
  } catch {
    errorMessage.value = t('login.invalid');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <!-- Brand panel -->
    <section class="login-brand-panel" aria-label="Open Data Platform">
      <header class="login-brand">
        <span class="login-brand-mark" aria-hidden="true"><img :src="opendataLogo" alt="" /></span>
        <span>{{ t('shell.appName') }}</span>
      </header>
      <div class="login-brand-content">
        <h2>{{ t('login.brandTitle') }}</h2>
        <p>{{ t('login.subtitle') }}</p>
      </div>
    </section>

    <!-- Login form -->
    <section class="login-form-panel" aria-labelledby="login-title">
      <div class="login-form-shell">
        <div class="login-mobile-brand">
          <span class="default-brand-mark" aria-hidden="true"><img :src="opendataLogo" alt="" /></span>
          <span>{{ t('shell.appName') }}</span>
        </div>
        <div class="login-header">
          <h1 id="login-title">{{ t('login.title') }}</h1>
        </div>

        <a-radio-group v-model="method" type="button" class="login-method" :disabled="loading" :aria-label="t('loginExtra.method')">
          <a-radio value="password">{{ t('loginExtra.passwordTab') }}</a-radio>
          <a-radio value="email">{{ t('loginExtra.emailTab') }}</a-radio>
        </a-radio-group>
        <a-alert v-if="errorMessage" class="login-alert" type="error" show-icon>
          {{ errorMessage }}
        </a-alert>

        <a-form
          :key="method"
          :model="form"
          layout="vertical"
          scroll-to-first-error
          @submit-success="handleSubmit"
        >
          <a-form-item
            v-if="method === 'password'"
            field="username"
            :rules="[{ required: true, message: t('login.usernamePlaceholder') }]"
          >
            <template #label><span class="app-field-label">{{ t('login.username') }}</span></template>
            <a-input
              v-model="form.username"
              :placeholder="t('login.usernamePlaceholder')"
              autocomplete="username"
              allow-clear
            >
              <template #prefix><IconUser /></template>
            </a-input>
          </a-form-item>

          <a-form-item
            v-if="method === 'password'"
            field="password"
            :rules="[{ required: true, message: t('login.passwordPlaceholder') }]"
          >
            <template #label><span class="app-field-label">{{ t('login.password') }}</span></template>
            <a-input-password
              v-model="form.password"
              :placeholder="t('login.passwordPlaceholder')"
              autocomplete="current-password"
            >
              <template #prefix><IconLock /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="method === 'email'" field="email" :label="t('loginExtra.email')" :rules="[{ required: true, type: 'email', message: t('loginExtra.emailError') }]">
            <a-input v-model="form.email" :placeholder="t('loginExtra.emailError')" autocomplete="email" />
          </a-form-item>
          <div class="login-verification">
            <span id="verification-label">{{ verified ? t('loginExtra.verified') : t('loginExtra.slide') }}</span>
            <a-slider v-model="slider" :disabled="verified || loading" :aria-label="t('loginExtra.slide')" @change="verifySlider" />
          </div>
          <a-form-item v-if="method === 'email'" field="code" :label="t('loginExtra.code')" :rules="[{ required: true, match: /^\d{6}$/, message: t('loginExtra.codeError') }]">
            <a-input v-model="form.code" :max-length="6" autocomplete="one-time-code" inputmode="numeric" />
            <a-button class="send-code" :disabled="!verified || remaining > 0 || loading" @click="sendCode">{{ remaining ? t('loginExtra.resend', { count: remaining }) : t('loginExtra.send') }}</a-button>
          </a-form-item>
          <p class="login-mock-note">{{ t('loginExtra.mock') }}</p>
          <div class="login-options">
            <a-checkbox v-model="form.remember">{{ t('login.remember') }}</a-checkbox>
          </div>

          <a-button
            class="login-submit"
            type="primary"
            html-type="submit"
            long
            :loading="loading"
          >
            {{ t('login.submit') }}
          </a-button>
        </a-form>

      </div>
    </section>
  </main>
</template>

<style scoped>
.login-method { display: flex; margin-bottom: 24px; }
.login-method :deep(.arco-radio-button) { flex: 1; text-align: center; }
.login-verification { padding: 12px 16px; margin-bottom: 24px; background: var(--color-fill-1); border-radius: var(--app-radius-control); color: var(--color-text-2); }
.send-code { margin-left: 8px; flex-shrink: 0; }
.login-mock-note { color: var(--color-text-3); margin: 0 0 20px; font-size: 12px; }
</style>
