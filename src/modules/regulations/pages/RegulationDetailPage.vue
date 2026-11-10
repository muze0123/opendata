<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconLeft } from '@arco-design/web-vue/es/icon';
import { regulationRows } from '../data/regulations';
import { regulationLabel } from '../labels';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
const route = useRoute(); const router = useRouter(); const { t } = useI18n();
const record = computed(() => regulationRows.value.find(row => row.id === route.params.id));
const STATUS_COLOR: Record<string, string> = { pending: 'gray', reviewing: 'orange', completed: 'green', rejected: 'red' };
const review = ref(route.query.review === '1');
const decision = ref('approve'); const opinion = ref(''); const error = ref(false);
const discard = ref(false); let resolveExit: ((value: boolean) => void) | undefined;
onBeforeRouteLeave(() => {
  if (!opinion.value.trim()) return true;
  discard.value = true;
  return new Promise<boolean>(resolve => { resolveExit = resolve; });
});
const fields = ['code','name','region','country','version','status','date','creator','note'] as const;
const columns = computed(() => ['projectCode','projectName','brand','series','model','priority','status','operations'].map(key => ({ title: t(`regulations.${key}`), dataIndex: key, width: 150 })));
function submit() {
  if (!opinion.value.trim()) { error.value = true; return; }
  if (!record.value) return;
  record.value.status = decision.value === 'approve' ? 'completed' : 'rejected';
  record.value.opinion = opinion.value.trim(); opinion.value = ''; review.value = false; error.value = false;
  Message.success(t('regulations.reviewSaved'));
}
</script>
<template>
  <div class="detail-page">
    <header class="detail-header"><nav :aria-label="t('regulations.detailTitle')"><a-button class="app-btn-neutral detail-back" :aria-label="t('regulations.back')" @click="router.push('/data/regulations')"><IconLeft /></a-button><a-link @click="router.push('/data/regulations')">{{ t('regulations.title') }}</a-link><span class="detail-sep">/</span><span class="detail-current" aria-current="page">{{ t('regulations.detailTitle') }}</span></nav><a-button v-if="record && !review" type="primary" @click="review = true">{{ t('regulations.review') }}</a-button></header>
    <template v-if="record">
      <section class="detail-block"><div class="block-title"><h2>{{ t('regulations.basic') }}</h2><a-tag v-if="record" :color="STATUS_COLOR[record.status]" class="detail-status">{{ regulationLabel(t, record.status) }}</a-tag></div><div class="basic-grid"><div v-for="field in fields" :key="field" class="basic-field"><span class="app-detail-label">{{ t(`regulations.${field}`) }}</span><span>{{ ['region','country','status'].includes(field) ? regulationLabel(t,record[field]) : record[field] || '—' }}</span></div></div><h3>{{ t('regulations.attachments') }}</h3><div v-for="file in record.attachments" :key="file">{{ file }}</div><span v-if="!record.attachments.length">—</span></section>
      <section class="detail-block"><h2>{{ t('regulations.project') }}</h2><a-table :columns="columns" :data="[]" :pagination="false" :bordered="false" :scroll="{ x: 1200 }"><template #empty><a-empty :description="t('regulations.noProjects')" /></template></a-table></section>
      <section v-if="review" class="detail-block"><h2>{{ t('regulations.review') }}</h2><a-form :model="{ opinion, decision }" layout="vertical"><a-form-item><template #label><span class="app-field-label">{{ t('regulations.decision') }}</span></template><a-radio-group v-model="decision"><a-radio value="approve">{{ t('regulations.approve') }}</a-radio><a-radio value="reject">{{ t('regulations.reject') }}</a-radio></a-radio-group></a-form-item><a-form-item :validate-status="error ? 'error' : undefined" :help="error ? t('regulations.required') : ''"><template #label><span class="app-field-label">{{ t('regulations.opinion') }}</span></template><a-textarea v-model="opinion" :max-length="2000" /></a-form-item></a-form><a-button type="primary" @click="submit">{{ t('regulations.save') }}</a-button></section>
    </template><a-empty v-else :description="t('regulations.empty')" />
    <ConfirmDialog :visible="discard" :title="t('regulations.discard')" @update:visible="discard = $event; if (!$event) resolveExit?.(false)" @confirm="discard = false; resolveExit?.(true)" />
  </div>
</template>
<style scoped>
.detail-page { display:grid; gap:var(--mt-ds-space-4); min-width:0; }
.detail-header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:var(--mt-ds-space-3); padding:var(--mt-ds-space-4); background:var(--app-surface); border-radius:var(--mt-ds-control-radius); }
.detail-back { width:32px; height:32px; padding:0; flex:none; color:var(--color-text-3); }
.detail-back:hover { color:var(--app-accent); background:var(--color-fill-2); }
.detail-header .arco-link { color:var(--color-text-3); }
.detail-header .arco-link:hover { color:var(--app-accent); }
.detail-status { flex:none; }
.detail-sep { color:var(--color-text-3); }
.detail-current { color:var(--color-text-1); font-weight:var(--mt-ds-weight-title); }
.block-title { display:flex; align-items:center; gap:var(--mt-ds-space-2); margin:0 0 var(--mt-ds-space-3); }
.block-title h2 { margin:0; }
nav { display:flex; gap:var(--mt-ds-space-3); align-items:center; }
.detail-block { min-width:0; padding:var(--mt-ds-space-4); background:var(--app-surface); }
h2,h3 { margin:0 0 var(--mt-ds-space-3); font-size:var(--mt-ds-font-title); font-weight:var(--mt-ds-weight-title); }
.basic-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:var(--mt-ds-space-4); margin-bottom:var(--mt-ds-space-4); }
.basic-field { display:flex; gap:var(--mt-ds-space-2); overflow-wrap:anywhere; }
@media(max-width:1000px) { .basic-grid { grid-template-columns:1fr; } }
</style>
