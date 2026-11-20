<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconLock, IconUser } from '@arco-design/web-vue/es/icon';
import opendataLogo from '../../../assets/opendata-logo.svg';
import { useAuthStore } from '../stores/auth';
import ForgotPasswordForm from '../components/ForgotPasswordForm.vue';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 登录面板内的视图切换：'login' 登录，'forgot' 忘记密码（同面板切换，非独立子页面）
const view = ref<'login' | 'forgot'>('login');

const method = ref('password');
const remaining = ref(0);
const sentEmail = ref('');
const expiresAt = ref(0);
const timer = window.setInterval(() => { remaining.value = Math.max(0, Math.ceil((expiresAt.value - Date.now()) / 1000) - 240); }, 1000);
onUnmounted(() => window.clearInterval(timer));

// 图形验证码（本地模拟）：生成 4 位易辨识字符，排除 0/O/1/I/L 等易混字符
const CAPTCHA_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const captchaInput = ref('');
const captchaCode = ref('');
function generateCaptcha() {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  captchaCode.value = code;
  captchaInput.value = '';
}
generateCaptcha();

const loading = ref(false);
const errorMessage = ref('');
const form = reactive({
  email: '',
  code: '',
  username: authStore.rememberedCredential?.username ?? '',
  password: authStore.rememberedCredential?.password ?? '',
  remember: !!authStore.rememberedCredential,
});

// 每个验证码字符的轻微旋转与蓝色深浅变化，模拟图形验证码的干扰效果
function captchaCharStyle(idx: number) {
  const angles = [-8, 6, -5, 9];
  const colors = ['rgb(var(--primary-6))', 'rgb(var(--primary-7))', 'rgb(var(--primary-6))', 'rgb(var(--primary-7))'];
  return {
    transform: `rotate(${angles[idx % angles.length]}deg)`,
    color: colors[idx % colors.length],
  };
}

watch(method, () => { errorMessage.value = ''; generateCaptcha(); });

function sendCode() {
  if (remaining.value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMessage.value = t('loginExtra.emailError');
    return;
  }
  sentEmail.value = form.email;
  expiresAt.value = Date.now() + 300000;
  remaining.value = 60;
  Message.info(t('loginExtra.demoCode'));
}

async function handleSubmit() {
  if (loading.value) return;

  if (captchaInput.value.trim().toLowerCase() !== captchaCode.value.toLowerCase()) {
    errorMessage.value = t('loginExtra.captchaError');
    generateCaptcha();
    return;
  }
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
    <section class="login-brand-panel" aria-label="OpenData">
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
    <section class="login-form-panel">
      <div class="login-form-shell">
        <div class="login-mobile-brand">
          <span class="default-brand-mark" aria-hidden="true"><img :src="opendataLogo" alt="" /></span>
          <span>{{ t('shell.appName') }}</span>
        </div>

        <template v-if="view === 'login'">
        <div class="login-method" role="tablist" :aria-label="t('loginExtra.method')">
          <button type="button" class="login-tab" :class="{ 'is-active': method === 'password' }" role="tab" :aria-selected="method === 'password'" :disabled="loading" @click="method = 'password'">{{ t('loginExtra.passwordTab') }}</button>
          <span class="login-tab-sep" aria-hidden="true">|</span>
          <button type="button" class="login-tab" :class="{ 'is-active': method === 'email' }" role="tab" :aria-selected="method === 'email'" :disabled="loading" @click="method = 'email'">{{ t('loginExtra.emailTab') }}</button>
        </div>
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
            :hide-asterisk="true" :hide-label="true"
            :rules="[{ required: true, message: t('login.usernamePlaceholder') }]"
          >
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
            :hide-asterisk="true" :hide-label="true"
            :rules="[{ required: true, message: t('login.passwordPlaceholder') }]"
          >
            <a-input-password
              v-model="form.password"
              :placeholder="t('login.passwordPlaceholder')"
              autocomplete="current-password"
            >
              <template #prefix><IconLock /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="method === 'email'" field="email" :hide-asterisk="true" :hide-label="true" :rules="[{ required: true, type: 'email', message: t('loginExtra.emailError') }]">
            <a-input v-model="form.email" :placeholder="t('loginExtra.emailPlaceholder')" autocomplete="email" allow-clear />
          </a-form-item>
          <a-form-item v-if="method === 'email'" field="code" :hide-asterisk="true" :hide-label="true" :rules="[{ required: true, match: /^\d{6}$/, message: t('loginExtra.codeError') }]">
            <a-input v-model="form.code" :placeholder="t('loginExtra.codePlaceholder')" :max-length="6" autocomplete="one-time-code" inputmode="numeric">
              <template #suffix>
                <button
                  type="button"
                  class="send-code"
                  :disabled="remaining > 0 || loading"
                  @click="sendCode"
                >{{ remaining ? t('loginExtra.resend', { count: remaining }) : t('loginExtra.send') }}</button>
              </template>
            </a-input>
          </a-form-item>
          <div class="login-captcha">
            <div class="login-captcha-row">
              <a-input
                v-model="captchaInput"
                class="login-captcha-input"
                :placeholder="t('loginExtra.captchaPlaceholder')"
                :max-length="4"
                autocomplete="off"
              />
              <button
                type="button"
                class="login-captcha-code"
                :title="t('loginExtra.refreshCaptcha')"
                :aria-label="t('loginExtra.refreshCaptcha')"
                @click="generateCaptcha"
              >
                <span class="login-captcha-text">
                  <span
                    v-for="(ch, idx) in captchaCode.split('')"
                    :key="idx"
                    class="login-captcha-char"
                    :style="captchaCharStyle(idx)"
                  >{{ ch }}</span>
                </span>
                <span class="login-captcha-noise" aria-hidden="true"></span>
                <span class="login-captcha-noise login-captcha-noise--two" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="login-options">
            <a-checkbox v-model="form.remember">{{ t('login.remember') }}</a-checkbox>
            <a-button type="text" class="login-forgot" @click="view = 'forgot'">{{ t('login.forgot') }}</a-button>
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
        </template>
        <ForgotPasswordForm v-else @back="view = 'login'" @done="view = 'login'" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-method { display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 24px; }
.login-tab { border: none; background: transparent; cursor: pointer; padding: 4px 0; font-size: 16px; font-weight: 500; color: var(--color-text-3); transition: color .2s; }
.login-tab.is-active { color: rgb(var(--primary-6)); font-weight: 600; }
.login-tab:disabled { cursor: not-allowed; opacity: .6; }
.login-tab-sep { color: var(--color-border-2); }
.login-captcha { margin-bottom: 16px; }
.login-captcha-row { display: flex; align-items: stretch; gap: 12px; }
.login-captcha-input { flex: 1; }
.login-captcha-code {
  position: relative;
  width: 124px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-2);
  border-radius: var(--app-radius-control);
  background: linear-gradient(135deg, rgb(var(--primary-1)), rgb(var(--primary-2)));
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color .2s, box-shadow .2s, transform .1s;
}
.login-captcha-code:hover { border-color: rgb(var(--primary-6)); box-shadow: 0 0 0 2px rgb(var(--primary-3)); }
.login-captcha-code:active { transform: scale(.98); }
.login-captcha-text { display: flex; gap: 8px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 22px; font-weight: 700; user-select: none; }
.login-captcha-char { display: inline-block; }
.login-captcha-noise {
  position: absolute;
  left: 4px; right: 4px; top: 52%;
  height: 1px;
  background: rgb(var(--primary-4));
  transform: rotate(-7deg);
  pointer-events: none;
}
.login-captcha-noise--two { top: 46%; transform: rotate(6deg); background: rgb(var(--primary-3)); }
.login-options { display: flex; justify-content: space-between; align-items: center; }
.login-forgot { color: rgb(var(--primary-6)); font-size: 13px; text-decoration: none; transition: color .2s; }
.login-forgot:hover { color: rgb(var(--primary-7)); }
.send-code { border: none; background: transparent; cursor: pointer; padding: 0 6px; color: rgb(var(--primary-6)); font-size: 13px; white-space: nowrap; transition: color .2s; }
.send-code:hover:not(:disabled) { color: rgb(var(--primary-7)); }
.send-code:disabled { color: var(--color-text-3); cursor: not-allowed; }
</style>
