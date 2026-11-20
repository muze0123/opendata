<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <main class="placeholder-page">
    <h2 class="placeholder-title">{{ t('nav.tasks') }}</h2>
    <a-empty :description="t('pending.description')" />
  </main>
</template>

<style scoped>
.placeholder-page {
  padding: 16px;
  background: var(--app-surface);
  border-radius: 2px;
  min-height: calc(100vh - 56px - 32px);
}
.placeholder-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; line-height: 24px; color: var(--color-text-1); }
.placeholder-page :deep(.arco-empty) { padding: 96px 0; }
</style>
