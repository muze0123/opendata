<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserProfileStore } from '../../../app/stores/userProfile';
import { useUserStore } from '../../user-management/stores/users';
import { getDepartmentName, getRoleName } from '../../user-management/data/users';
import avatarPlaceholder from '../../../assets/user-avatar-placeholder.svg';
defineProps<{ compact?: boolean }>();
const { t } = useI18n();
const profile = useUserProfileStore();
const users = useUserStore();
const member = computed(() => users.users.find(user => user.owner));
const failed = ref(false);
const avatar = computed(() => failed.value ? avatarPlaceholder : profile.profile.avatarUrl || avatarPlaceholder);
</script>

<template>
  <section class="account-summary" :class="{ 'is-compact': compact }" :aria-label="t('account.center')">
    <a-avatar :size="48"><img :src="avatar" alt="" @error="failed = true" /></a-avatar>
    <div v-if="compact" class="account-identity">
      <div class="account-identity-name">{{ member?.account || '—' }}（{{ profile.profile.displayName }}）</div>
      <div class="account-identity-department">{{ member ? getDepartmentName(member.deptId) : '—' }}</div>
      <div class="account-identity-roles" :aria-label="t('account.roles')">
        <a-tag v-for="role in member?.roleIds" :key="role">{{ getRoleName(role) }}</a-tag>
      </div>
    </div>
    <dl v-else>
      <div><dt>{{ t('account.username') }}</dt><dd>{{ member?.account || '—' }}</dd></div>
      <div><dt>{{ t('account.name') }}</dt><dd>{{ profile.profile.displayName }}</dd></div>
      <div><dt>{{ t('account.department') }}</dt><dd>{{ member ? getDepartmentName(member.deptId) : '—' }}</dd></div>
      <div><dt>{{ t('account.roles') }}</dt><dd>{{ member?.roleIds.map(getRoleName).join(' / ') || '—' }}</dd></div>
    </dl>
  </section>
</template>

<style scoped>
.account-summary { padding: 16px 12px; color: var(--color-text-1); }
dl { margin: 20px 0 0; display: grid; gap: 16px; }
dl > div { display: grid; grid-template-columns: minmax(80px, 1fr) 2fr; gap: 16px; }
dt { color: var(--color-text-3); font-weight: 400; }
dd { margin: 0; overflow-wrap: anywhere; font-weight: 400; }
.account-summary.is-compact { display: flex; align-items: flex-start; gap: 16px; padding: 12px 12px 24px; }
.is-compact :deep(.arco-avatar) { flex: none; }
.account-identity { min-width: 0; flex: 1; }
/* 2026-11-08 用户裁决：气泡弹窗中的登录账号与姓名文本为 14px；行高等其余属性保持不变 */
.account-identity-name { font-size: 14px; line-height: 24px; overflow-wrap: anywhere; }
.account-identity-department { margin-top: 4px; color: var(--color-text-3); font-size: 12px; line-height: 20px; overflow-wrap: anywhere; }
.account-identity-roles { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
</style>
