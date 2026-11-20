<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconCamera } from '@arco-design/web-vue/es/icon';
import { useUserProfileStore } from '../../../app/stores/userProfile';
import { useUserStore } from '../../user-management/stores/users';
import { departments, getRoleName } from '../../user-management/data/users';
import avatarPlaceholder from '../../../assets/user-avatar-placeholder.svg';
import VerifyPhoneModal from '../components/VerifyPhoneModal.vue';
import ChangePhoneModal from '../components/ChangePhoneModal.vue';
import VerifyEmailModal from '../components/VerifyEmailModal.vue';
import ChangeEmailModal from '../components/ChangeEmailModal.vue';
import ChangePasswordModal from '../components/ChangePasswordModal.vue';

const { t } = useI18n();
const profile = useUserProfileStore();
const users = useUserStore();

const member = computed(() => users.users.find((user) => user.owner));

const avatarFailed = ref(false);
const avatar = computed(() =>
  avatarFailed.value ? avatarPlaceholder : profile.profile.avatarUrl || avatarPlaceholder,
);

const deptMap = new Map(departments.map((d) => [d.id, d]));
function deptChain(deptId: string): string {
  const names: string[] = [];
  let current = deptMap.get(deptId);
  while (current) {
    names.unshift(current.name);
    current = current.parent ? deptMap.get(current.parent) : undefined;
  }
  return names.join(' / ') || '—';
}

function maskPhone(value: string): string {
  if (!value) return '—';
  return value.length <= 7 ? value : `${value.slice(0, 3)}****${value.slice(-4)}`;
}
function maskEmail(value: string): string {
  if (!value) return '—';
  const at = value.indexOf('@');
  if (at <= 0) return value;
  return `${value.slice(0, Math.min(3, at))}***${value.slice(at)}`;
}

const info = computed(() => {
  const m = member.value;
  if (!m) return null;
  return {
    name: m.name,
    loginAccount: m.account || '—',
    department: deptChain(m.deptId),
    roles: m.roleIds.map(getRoleName).join(' / ') || '—',
    email: maskEmail(m.email),
    phone: maskPhone(m.phone),
    rawEmail: m.email,
    rawPhone: m.phone,
  };
});

type ModalKind = 'verifyPhone' | 'changePhone' | 'verifyEmail' | 'changeEmail' | 'password';
const active = ref<ModalKind | null>(null);

// 头像：直接调用系统文件选择，校验类型（JPG / PNG）与大小（≤ 2MB）后写入档案
const avatarInput = ref<HTMLInputElement | null>(null);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_ACCEPT = ['image/jpeg', 'image/png'];

function openFilePicker() {
  avatarInput.value?.click();
}

function onAvatarFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  if (!AVATAR_ACCEPT.includes(file.type)) {
    Message.error(t('account.avatarFormatHint'));
    return;
  }
  if (file.size > MAX_AVATAR_SIZE) {
    Message.error(t('account.avatarFormatHint'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    profile.setUserCenterProfile({ ...profile.profile, avatarUrl: String(reader.result) });
    avatarFailed.value = false;
    Message.success(t('userManagement.form.updated'));
  };
  reader.readAsDataURL(file);
}

function openPassword() {
  active.value = 'password';
}

function openPhone() {
  active.value = 'verifyPhone';
}
function onPhoneVerified() {
  active.value = 'changePhone';
}
function onPhoneSaved(phone: string) {
  if (member.value) users.updateUser(member.value.id, { phone });
  Message.success(t('userManagement.form.updated'));
}

function openEmail() {
  active.value = 'verifyEmail';
}
function onEmailVerified() {
  active.value = 'changeEmail';
}
function onEmailSaved(email: string) {
  if (member.value) users.updateUser(member.value.id, { email });
  Message.success(t('userManagement.form.updated'));
}
</script>

<template>
  <div class="account-page" :aria-label="t('account.title')">
    <div class="account-card">
      <dl v-if="info" class="account-fields">
        <div class="account-row account-row--avatar">
          <dt>{{ t('account.avatar') }}</dt>
          <dd class="account-avatar-cell">
            <a-avatar :size="64"><img :src="avatar" alt="" @error="avatarFailed = true" /></a-avatar>
            <button type="button" class="account-avatar-edit" @click="openFilePicker">
              <IconCamera />
              <span>{{ t('account.uploadAvatar') }}</span>
            </button>
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png"
              class="account-avatar-input"
              @change="onAvatarFile"
            />
          </dd>
        </div>
        <div class="account-row"><dt>{{ t('account.name') }}</dt><dd>{{ info.name }}</dd></div>
        <div class="account-row"><dt>{{ t('account.username') }}</dt><dd>{{ info.loginAccount }}</dd></div>
        <div class="account-row"><dt>{{ t('account.department') }}</dt><dd>{{ info.department }}</dd></div>
        <div class="account-row"><dt>{{ t('account.roles') }}</dt><dd>{{ info.roles }}</dd></div>
        <div class="account-row"><dt>{{ t('account.email') }}</dt><dd>{{ info.email }}</dd></div>
        <div class="account-row"><dt>{{ t('account.boundPhone') }}</dt><dd>{{ info.phone }}</dd></div>
      </dl>

      <div class="account-actions">
        <a-button class="app-btn-neutral" @click="openPassword">{{ t('account.changePassword') }}</a-button>
        <a-button class="app-btn-neutral" @click="openPhone">{{ t('account.changePhone') }}</a-button>
        <a-button class="app-btn-neutral" @click="openEmail">{{ t('account.changeEmail') }}</a-button>
      </div>
    </div>

    <VerifyPhoneModal
      :visible="active === 'verifyPhone'"
      :current-phone="info ? maskPhone(info.rawPhone) : ''"
      @update:visible="active = null"
      @verified="onPhoneVerified"
    />
    <ChangePhoneModal
      :visible="active === 'changePhone'"
      @update:visible="active = null"
      @saved="onPhoneSaved"
    />
    <VerifyEmailModal
      :visible="active === 'verifyEmail'"
      :current-email="info ? maskEmail(info.rawEmail) : ''"
      @update:visible="active = null"
      @verified="onEmailVerified"
    />
    <ChangeEmailModal
      :visible="active === 'changeEmail'"
      @update:visible="active = null"
      @saved="onEmailSaved"
    />
    <ChangePasswordModal :visible="active === 'password'" @update:visible="active = null" />
  </div>
</template>

<style scoped>
.account-page { background: var(--app-surface); padding: 24px 24px 16px; min-height: 360px; }
.account-card { max-width: 640px; }
.account-fields { margin: 0; display: grid; gap: 20px; }
.account-row { display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: start; }
dt { color: var(--color-text-3); font-size: 14px; line-height: 22px; }
dd { margin: 0; color: var(--color-text-1); font-size: 14px; line-height: 22px; overflow-wrap: anywhere; }
.account-row--avatar { align-items: center; }
.account-avatar-cell { display: flex; align-items: center; gap: 16px; }
.account-avatar-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 0;
  color: rgb(var(--primary-6));
  font-size: 14px;
  line-height: 22px;
  transition: color .2s;
}
.account-avatar-edit:hover { color: rgb(var(--primary-7)); }
.account-avatar-input { display: none; }
.account-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
@media (max-width: 600px) {
  .account-page { padding: 12px 12px 16px; }
  .account-row { grid-template-columns: 80px 1fr; gap: 12px; }
}
</style>
