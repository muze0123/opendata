<script setup lang="ts">
import { IconArrowLeft, IconEdit, IconInfoCircle, IconPlus } from '@arco-design/web-vue/es/icon';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n({ useScope: 'global' });
function goBack() { router.back(); }
</script>

<template>
  <main class="orchestration-page">
    <header class="orchestration-header"><div><a-button type="text" @click="goBack"><IconArrowLeft />{{ t('tasks.orchestration.back') }}</a-button><h1>{{ t('tasks.orchestration.title') }}</h1><p>{{ t('tasks.orchestration.subtitle') }}</p></div><a-button type="primary" disabled><IconEdit />{{ t('tasks.orchestration.save') }}</a-button></header>
    <section class="orchestration-surface"><a-alert type="info" show-icon><template #icon><IconInfoCircle /></template>{{ t('tasks.orchestration.previewOnly') }}</a-alert><div class="orchestration-flow"><div class="orchestration-node orchestration-node--done"><strong>{{ t('tasks.create.submit') }}</strong><span>{{ t('tasks.orchestration.submitter') }}{{ t('tasks.orchestration.separator') }}张三</span></div><div class="orchestration-line" /><div class="orchestration-node orchestration-node--current"><strong>{{ t('tasks.create.review') }}</strong><span>{{ t('tasks.orchestration.designatedMember') }}{{ t('tasks.orchestration.separator') }}李四</span><a-button size="mini" type="text" disabled><IconEdit />{{ t('tasks.orchestration.configure') }}</a-button></div><div class="orchestration-line" /><div class="orchestration-node"><strong>{{ t('tasks.create.end') }}</strong><span>{{ t('tasks.create.ended') }}</span></div><button class="add-node" type="button" disabled :aria-label="t('tasks.orchestration.addNode')" :title="t('tasks.orchestration.addNode')"><IconPlus /></button></div></section>
  </main>
</template>

<style scoped>
.orchestration-page { min-height: calc(100dvh - 88px); padding: 0; background: var(--app-page); }.orchestration-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; max-width: 1100px; margin: 0 auto 16px; }.orchestration-header h1 { margin: 8px 0 4px; font-size: 18px; font-weight: 600; line-height: 26px; }.orchestration-header p { margin: 0; color: var(--color-text-3); }.orchestration-surface { max-width: 1100px; min-height: 460px; margin: 0 auto; padding: 24px; background: var(--color-bg-2); }.orchestration-flow { display: flex; align-items: center; justify-content: center; gap: 16px; min-height: 280px; }.orchestration-node { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 180px; padding: 18px; border: 1px solid var(--color-border-2); border-radius: 6px; background: var(--color-fill-1); }.orchestration-node--done { border-color: var(--color-primary-light-3); background: var(--color-primary-light-1); }.orchestration-node--current { border-color: var(--color-warning-6); background: var(--color-warning-light-1); }.orchestration-node span { color: var(--color-text-3); font-size: 13px; }.orchestration-node .arco-btn { align-self: flex-start; padding: 0; }.orchestration-line { width: 56px; height: 1px; background: var(--color-border-3); }.add-node { display: grid; place-items: center; width: 28px; height: 28px; border: 1px dashed var(--color-border-3); border-radius: 50%; color: var(--color-text-4); background: transparent; }
@media (max-width: 720px) { .orchestration-header { align-items: flex-start; flex-direction: column; }.orchestration-flow { align-items: stretch; flex-direction: column; }.orchestration-line { width: 1px; height: 32px; margin-inline: auto; } }
</style>
