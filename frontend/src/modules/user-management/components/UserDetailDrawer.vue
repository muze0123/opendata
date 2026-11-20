<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDepartmentStore } from '../stores/departments';
import { getRoleNames, type UserRecord } from '../data/users';

const props = defineProps<{
  visible: boolean;
  user: UserRecord | null;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'edit'): void;
}>();

const { t } = useI18n();
const deptStore = useDepartmentStore();
const none = computed(() => t('userManagement.detail.none'));

/** 手机号在只读详情里按「前 3 + **** + 后 4」脱敏。 */
function maskPhone(phone: string): string {
  if (!phone) return none.value;
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/** 参考稿的「基本信息」为纵向标签 + 值，字段顺序固定，不使用标签底色。 */
const facts = computed(() => {
  const user = props.user;
  if (!user) return [];
  return [
    { label: t('userManagement.detail.name'), value: user.name || none.value },
    { label: t('userManagement.detail.account'), value: user.account || none.value },
    { label: t('userManagement.detail.department'), value: deptStore.pathOf(user.deptId) },
    { label: t('userManagement.detail.roles'), value: user.roleIds.length ? getRoleNames(user.roleIds).join('、') : none.value },
    { label: t('userManagement.detail.email'), value: user.email || none.value },
    { label: t('userManagement.detail.phone'), value: maskPhone(user.phone) },
    { label: t('userManagement.detail.createdBy'), value: user.createdBy || none.value },
    { label: t('userManagement.detail.createdAt'), value: user.createdAt || none.value },
    { label: t('userManagement.detail.status'), value: user.enabled ? t('userManagement.status.enabled') : t('userManagement.status.disabled') },
  ];
});
</script>

<template>
  <a-drawer
    :visible="visible"
    :width="500"
    :title="t('userManagement.detail.title')"
    :footer="false"
    class="um-detail-drawer"
    @cancel="emit('update:visible', false)"
  >
    <div v-if="user" class="um-detail">
      <section class="um-detail-block">
        <h3 class="um-detail-section-title">{{ t('userManagement.detail.basicInfo') }}</h3>
        <dl class="um-detail-list">
          <div v-for="fact in facts" :key="fact.label" class="um-detail-item">
            <dt class="app-detail-label">{{ fact.label }}</dt>
            <dd class="app-detail-value">{{ fact.value }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </a-drawer>
</template>

<style scoped>
/* 抽屉表面由 global.css 按 .um-detail-drawer 提供
   （Arco 抽屉容器不带本文件的 scope id，scoped :deep() 不生效）。 */
.um-detail-block { padding: 16px; background: var(--app-surface); border-radius: 2px; }
.um-detail-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--color-text-1);
}
.um-detail-section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--app-primary-strong);
}
.um-detail-list { display: flex; flex-direction: column; gap: 20px; margin: 0; }
.um-detail-item { margin: 0; }
.um-detail-item dt { font-size: 12px; line-height: 18px; color: var(--color-text-3); }
.um-detail-item dd { margin: 4px 0 0; font-size: 14px; line-height: 22px; color: var(--color-text-1); }
</style>
