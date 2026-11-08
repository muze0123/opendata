<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconSearch } from '@arco-design/web-vue/es/icon';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { certificates, STATUS_CODES, type Certificate } from '../data/certificates';
const { t } = useI18n();
const rows = ref(certificates.map(row => ({ ...row })));
const query = reactive({ code: '', project: '', status: '' });
const applied = ref({ ...query });
const visible = ref(false);
const readonly = ref(false);
const deleting = ref<Certificate>();
const error = ref('');
const fields = ['code', 'project', 'regulation', 'issuer', 'authority', 'issued', 'expires'] as const;
const form = reactive<Certificate>({ ...certificates[0]!, id: '', code: '' });
const filtered = computed(() => rows.value.filter(row => row.code.toLowerCase().includes(applied.value.code.toLowerCase()) && row.project.toLowerCase().includes(applied.value.project.toLowerCase()) && (!applied.value.status || row.status === applied.value.status)));
const columns = computed(() => [...fields, 'status'].map(key => ({ title: t(`certificates.${key}`), dataIndex: key, slotName: key === 'status' ? 'status' : undefined, width: key === 'code' ? 190 : 150 })).concat([{ title: t('certificates.operations'), dataIndex: 'operations', slotName: 'operations', width: 190 }]));
function open(row?: Certificate, view = false) {
  Object.assign(form, row ?? { id: '', code: '', project: '', regulation: '', issuer: '', authority: '', issued: '', expires: '', status: 'draft' });
  readonly.value = view;
  error.value = '';
  visible.value = true;
}
function save() {
  if (readonly.value) { visible.value = false; return; }
  if (fields.filter(field => field !== 'expires').some(field => !form[field].trim())) { error.value = 'required'; return; }
  if (rows.value.some(row => row.code === form.code.trim() && row.id !== form.id)) { error.value = 'duplicate'; return; }
  if (form.expires && form.expires < form.issued) { error.value = 'dateError'; return; }
  const record = { ...form, code: form.code.trim() };
  const index = rows.value.findIndex(row => row.id === form.id);
  if (index >= 0) rows.value[index] = record;
  else rows.value.unshift({ ...record, id: crypto.randomUUID() });
  visible.value = false;
  Message.success(t('certificates.saved'));
}
function remove() {
  rows.value = rows.value.filter(row => row.id !== deleting.value?.id);
  deleting.value = undefined;
}
</script>

<template>
  <main class="certificate-page">
    <a-form :model="query" layout="inline" class="filters" @submit-success="applied = { ...query }">
      <a-form-item v-for="field in ['code', 'project'] as const" :key="field" :label="t(`certificates.${field}`)"><a-input v-model="query[field]" allow-clear /></a-form-item>
      <a-form-item :label="t('certificates.status')"><a-select v-model="query.status" allow-clear :options="STATUS_CODES.map(value => ({ value, label: t(`certificates.${value}`) }))" /></a-form-item>
      <a-space><a-button type="primary" html-type="submit"><template #icon><IconSearch /></template>{{ t('certificates.search') }}</a-button><a-button @click="Object.assign(query, { code: '', project: '', status: '' }); applied = { ...query }">{{ t('certificates.reset') }}</a-button></a-space>
    </a-form>
    <section class="list">
      <div class="toolbar"><a-button type="primary" @click="open()"><template #icon><IconPlus /></template>{{ t('certificates.create') }}</a-button></div>
      <a-table row-key="id" :columns="columns" :data="filtered" :scroll="{ x: 1390 }" :pagination="{ pageSize: 10, showTotal: true, showPageSize: true }">
        <template #empty><a-empty :description="t('certificates.empty')" /></template>
        <template #status="{ record }"><a-tag :color="record.status === 'completed' ? 'green' : record.status === 'rejected' ? 'red' : record.status === 'reviewing' ? 'arcoblue' : 'gray'">{{ t(`certificates.${record.status}`) }}</a-tag></template>
        <template #operations="{ record }"><a-space><a-link @click="open(record, true)">{{ t('certificates.view') }}</a-link><a-link @click="open(record)">{{ t('certificates.edit') }}</a-link><a-link status="danger" @click="deleting = record">{{ t('certificates.delete') }}</a-link></a-space></template>
      </a-table>
    </section>
    <a-modal v-model:visible="visible" :title="t(`certificates.${readonly ? 'view' : form.id ? 'edit' : 'create'}`)" :width="600" :ok-text="t('certificates.save')" :cancel-text="t('certificates.cancel')" :on-before-ok="() => { save(); return !visible; }">
      <a-form :model="form" layout="vertical">
        <a-alert v-if="error" type="error">{{ t(`certificates.${error}`) }}</a-alert>
        <a-form-item v-for="field in fields" :key="field" :label="t(`certificates.${field}`)" :required="!readonly && field !== 'expires'">
          <span v-if="readonly">{{ form[field] || '—' }}</span>
          <a-date-picker v-else-if="field === 'issued' || field === 'expires'" v-model="form[field]" />
          <a-input v-else v-model="form[field]" :max-length="120" />
        </a-form-item>
      </a-form>
    </a-modal>
    <ConfirmDialog :visible="!!deleting" :title="t('certificates.confirmDelete')" :description="deleting?.code" @update:visible="deleting = undefined" @confirm="remove" />
  </main>
</template>

<style scoped>
.certificate-page { display: grid; gap: 16px; min-width: 0; }
.filters, .list { padding: 20px; background: var(--app-surface); border-radius: var(--app-radius, 4px); }
.filters { gap: 16px; }
.filters :deep(.arco-input-wrapper), .filters :deep(.arco-select) { width: 200px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
@media (max-width: 760px) { .toolbar { flex-wrap: wrap; } .filters { padding: 16px; } }
</style>
