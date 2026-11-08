<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconSearch, IconRefresh } from '@arco-design/web-vue/es/icon';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { initialRegulations, REGION_CODES, countries, type Regulation } from '../data/regulations';
import { regulationLabel } from '../labels';
const { t } = useI18n();
const rows = ref<Regulation[]>(structuredClone(initialRegulations));
const tab = ref('list');
const filters = reactive({ code: '', region: '', country: '', dates: [] as string[] });
const applied = ref({ code: '', region: '', country: '', dates: [] as string[] });
const page = ref(1);
const records = computed(() => rows.value.filter(row => row.code.toLowerCase().includes(applied.value.code.toLowerCase()) && (!applied.value.region || row.region === applied.value.region) && (!applied.value.country || row.country === applied.value.country) && (!applied.value.dates.length || row.date >= applied.value.dates[0]! && row.date <= applied.value.dates[1]!)));
function search(reset = false) {
  if (reset) Object.assign(filters, { code: '', region: '', country: '', dates: [] });
  applied.value = { ...filters, dates: [...(filters.dates ?? [])] }; page.value = 1;
}
const columns = computed(() => ['id','code','name','region','country','date','creator','version','status','operations'].map(key => ({ title: t(`regulations.${key}`), dataIndex: key, slotName: key, width: key === 'operations' ? 280 : key === 'name' ? 220 : 150 })));
const selected = ref<Regulation>();
const visible = ref(false);
const mode = ref<'create'|'edit'|'detail'|'review'>('detail');
const form = reactive<Regulation>({ ...initialRegulations[0]!, attachments: [] });
const baseline = ref('');
const error = ref('');
const decision = ref('approve');
const discard = ref(false);
let exit: (() => void) | undefined;
let cancelExit: (() => void) | undefined;
const editable = computed(() => mode.value === 'create' || mode.value === 'edit');
function open(value: typeof mode.value, row?: Regulation) {
  mode.value = value; error.value = ''; decision.value = 'approve';
  Object.assign(form, row ? structuredClone({ ...row, attachments: [...row.attachments] }) : { id: `LAW-${String(rows.value.length + 1).padStart(4,'0')}`, code: '', name: '', region: 'asia', country: 'china', date: new Date().toISOString().slice(0,10), creator: '张三', version: 'V1.0.0', status: 'pending', note: '', attachments: [], opinion: '' });
  baseline.value = JSON.stringify(form); visible.value = true;
}
function close() {
  if (mode.value !== 'detail' && JSON.stringify(form) !== baseline.value) { cancelExit = undefined; exit = () => { visible.value = false; }; discard.value = true; }
  else visible.value = false;
}
onBeforeRouteLeave(() => {
  if (!visible.value || mode.value === 'detail' || JSON.stringify(form) === baseline.value) return true;
  discard.value = true;
  return new Promise<boolean>(resolve => { exit = () => resolve(true); cancelExit = () => resolve(false); });
});
function save() {
  if (editable.value && (!form.code.trim() || !form.name.trim() || !form.version.trim() || !form.region || !form.country) || mode.value === 'review' && !form.opinion.trim()) { error.value = t('regulations.required'); return; }
  if (editable.value && rows.value.some(row => row.id !== form.id && row.code.toLowerCase() === form.code.trim().toLowerCase())) { error.value = t('regulations.duplicate'); return; }
  const record = { ...form, code: form.code.trim(), name: form.name.trim(), attachments: [...form.attachments] };
  if (mode.value === 'review') record.status = decision.value === 'approve' ? 'completed' : 'rejected';
  const index = rows.value.findIndex(row => row.id === record.id);
  if (index < 0) rows.value.push(record); else rows.value[index] = record;
  visible.value = false; Message.success(t('regulations.saved'));
}
function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) {
    if (!/\.(docx?|pdf)$/i.test(file.name) || file.size > 20 * 1024 * 1024) { Message.error(t('regulations.fileError')); continue; }
    if (!form.attachments.includes(file.name)) form.attachments.push(file.name);
  }
  input.value = '';
}
</script>

<template>
  <div class="regulations-page">
    <a-tabs v-model:active-key="tab"><a-tab-pane key="list" :title="t('regulations.list')" /><a-tab-pane key="relations" :title="t('regulations.relations')" /></a-tabs>
    <template v-if="tab === 'list'">
      <form class="filters" @submit.prevent="search()">
        <label><span class="app-field-label">{{ t('regulations.code') }}</span><a-input v-model="filters.code" allow-clear /></label>
        <label><span class="app-field-label">{{ t('regulations.region') }}</span><a-select v-model="filters.region" allow-clear @change="filters.country = ''"><a-option v-for="code in REGION_CODES" :key="code" :value="code">{{ regulationLabel(t,code) }}</a-option></a-select></label>
        <label><span class="app-field-label">{{ t('regulations.country') }}</span><a-select v-model="filters.country" :disabled="!filters.region" allow-clear><a-option v-if="filters.region" :value="countries[filters.region as keyof typeof countries]">{{ regulationLabel(t,countries[filters.region as keyof typeof countries]) }}</a-option></a-select></label>
        <label><span class="app-field-label">{{ t('regulations.date') }}</span><a-range-picker v-model="filters.dates" /></label>
        <a-button type="primary" html-type="submit"><template #icon><IconSearch /></template>{{ t('regulations.search') }}</a-button><a-button @click="search(true)"><template #icon><IconRefresh /></template>{{ t('regulations.reset') }}</a-button>
      </form>
      <section class="list-panel">
        <div class="toolbar"><a-button type="primary" @click="open('create')"><template #icon><IconPlus /></template>{{ t('regulations.create') }}</a-button><span>{{ t('regulations.mock') }}</span></div>
        <a-table :columns="columns" :data="records" row-key="id" :scroll="{ x: 1700 }" :pagination="{ current: page, pageSize: 2, total: records.length, showTotal: true }" @page-change="page = $event">
          <template #region="{ record }">{{ regulationLabel(t,record.region) }}</template><template #country="{ record }">{{ regulationLabel(t,record.country) }}</template>
          <template #status="{ record }"><a-tag :color="record.status === 'completed' ? 'green' : record.status === 'rejected' ? 'red' : 'gray'">{{ regulationLabel(t,record.status) }}</a-tag></template>
          <template #operations="{ record }"><a-space><a-link @click="open('detail',record)">{{ t('regulations.detail') }}</a-link><a-link @click="open('edit',record)">{{ t('regulations.edit') }}</a-link><a-link @click="open('review',record)">{{ t('regulations.review') }}</a-link><a-link @click="selected = record; tab = 'relations'">{{ t('regulations.relations') }}</a-link></a-space></template>
          <template #empty><a-empty :description="t('regulations.empty')" /></template>
        </a-table>
      </section>
    </template>
    <section v-else class="list-panel"><a-select :model-value="selected?.id" @change="selected = rows.find(row => row.id === $event)"><template #label>{{ selected?.code }}</template><a-option v-for="row in rows" :key="row.id" :value="row.id">{{ row.code }} · {{ row.name }}</a-option></a-select><h3>{{ t('regulations.project') }}</h3><a-empty :description="t('regulations.noProjects')" /></section>
    <a-drawer :visible="visible" :width="800" :title="t(`regulations.${mode}`)" :mask-closable="false" @cancel="close">
      <a-form :model="form" layout="vertical" :disabled="!editable">
        <a-form-item v-for="key in ['id','code','name','version'] as const" :key="key" :required="key !== 'id'"><template #label><span class="app-field-label">{{ t(`regulations.${key}`) }}</span></template><a-input v-model="form[key]" :disabled="key === 'id' || !editable" :max-length="200" /></a-form-item>
        <a-form-item required><template #label><span class="app-field-label">{{ t('regulations.region') }}</span></template><a-select v-model="form.region" @change="form.country = countries[form.region]"><a-option v-for="code in REGION_CODES" :key="code" :value="code">{{ regulationLabel(t,code) }}</a-option></a-select></a-form-item>
        <a-form-item required><template #label><span class="app-field-label">{{ t('regulations.country') }}</span></template><a-select v-model="form.country"><a-option :value="countries[form.region]">{{ regulationLabel(t,countries[form.region]) }}</a-option></a-select></a-form-item>
        <a-form-item><template #label><span class="app-field-label">{{ t('regulations.note') }}</span></template><a-textarea v-model="form.note" :max-length="2000" /></a-form-item>
      </a-form>
      <section><h3>{{ t('regulations.attachments') }}</h3><template v-if="editable"><input type="file" multiple accept=".doc,.docx,.pdf" :aria-label="t('regulations.upload')" @change="upload"><p>{{ t('regulations.fileHelp') }}</p></template><div v-for="(file,index) in form.attachments" :key="file">{{ file }} <a-button v-if="editable" type="text" @click="form.attachments.splice(index,1)">{{ t('regulations.remove') }}</a-button></div></section>
      <section v-if="mode === 'review'"><h3>{{ t('regulations.review') }}</h3><label><span class="app-field-label">{{ t('regulations.decision') }}</span><a-radio-group v-model="decision"><a-radio value="approve">{{ t('regulations.approve') }}</a-radio><a-radio value="reject">{{ t('regulations.reject') }}</a-radio></a-radio-group></label><label><span class="app-field-label">{{ t('regulations.opinion') }}</span><a-textarea v-model="form.opinion" :max-length="2000" /></label></section>
      <a-alert v-if="error" type="error">{{ error }}</a-alert>
      <template #footer><a-space><a-button @click="close">{{ t('regulations.cancel') }}</a-button><a-button v-if="mode !== 'detail'" type="primary" @click="save">{{ t('regulations.save') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog :visible="discard" @update:visible="discard = $event; if (!$event) cancelExit?.()" :title="t('regulations.discard')" @confirm="discard = false; exit?.()" />
  </div>
</template>

<style scoped>
.regulations-page { display: grid; gap: 16px; }
.filters,.list-panel { padding:16px; background:var(--app-surface); border-radius:2px; }
.filters { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
.filters label { display:flex; gap:8px; align-items:center; }
.filters :deep(.arco-input-wrapper),.filters :deep(.arco-select) { width:180px; }
.filters :deep(.arco-picker-range) { width:260px; }
.toolbar { display:flex; flex-wrap:wrap; gap:16px; align-items:center; margin-bottom:16px; }
.toolbar span { color:var(--color-text-3); }
h3 { font-size:16px; font-weight:600; line-height:24px; }
section label { display:block; margin-bottom:16px; }
</style>
