<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconUpload, IconFolder, IconDownload } from '@arco-design/web-vue/es/icon';
import { parseCsv } from '../data/csv';
import ExcelJS from 'exceljs';
import { validateVehicle, today } from '../data/validation';
import type { Vehicle } from '../data/vehicles';
const props = defineProps<{ directory: string; path: string; production: boolean; pattern: string; rows: Vehicle[]; users: string[] }>();
const emit = defineEmits<{ imported: [rows: Vehicle[]] }>();
const { t } = useI18n();
const visible = ref(false);
const dragging = ref(false);
const file = ref<File>();
const busy = ref(false);
const error = ref('');
const failures = ref<{ row: number; code: string; reason: string }[]>([]);
let generation = 0;
let templateUrl = '';
const templateReady = ref(false);
const preparing = ref(false);
onBeforeUnmount(() => { generation++; if (templateUrl) URL.revokeObjectURL(templateUrl); });
const input = ref<HTMLInputElement>();
async function buildTemplate() {
  preparing.value = true; templateReady.value = false;
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Vehicles');
  sheet.addRow(props.production ? ['VIN', 'effective', 'region', 'owner', 'description'] : ['code', 'effective']);
  sheet.addRow(props.production ? ['L1234567890123456', today(), 'china', '', ''] : ['TEST-001', today()]);
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    if (templateUrl) URL.revokeObjectURL(templateUrl);
    templateUrl = URL.createObjectURL(new Blob([buffer as BlobPart])); templateReady.value = true;
  } catch { error.value = 'fileError'; }
  finally { preparing.value = false; }
}
function open() {
  visible.value = true; file.value = undefined; error.value = ''; failures.value = [];
  void buildTemplate();
}
function download() { const link = document.createElement('a'); link.href = templateUrl; link.download = `${t('vehicles.title')}导入模版.xlsx`; link.click(); }
function choose(selected?: File) { file.value = selected; failures.value = []; error.value = ''; }
function close() { generation++; busy.value = false; visible.value = false; }
async function submit() {
  if (!file.value || busy.value) return;
  if (!/\.(xlsx|csv)$/i.test(file.value.name) || file.value.size > 20 * 1024 * 1024) { error.value = 'fileError'; return; }
  const token = ++generation; busy.value = true; error.value = ''; failures.value = [];
  try {
    const workbook = new ExcelJS.Workbook();
    const bytes = await file.value.arrayBuffer();
    if (/\.csv$/i.test(file.value.name)) { const sheet = workbook.addWorksheet('Vehicles'); for (const row of parseCsv(new TextDecoder('utf-8', { fatal: true }).decode(bytes))) sheet.addRow(row); }
    else await workbook.xlsx.load(bytes);
    const sheet = workbook.worksheets[0]; if (!sheet) throw Error();
    const expected = props.production ? ['VIN', 'effective', 'region', 'owner', 'description'] : ['code', 'effective'];
    if (expected.some((key, index) => sheet.getRow(1).getCell(index + 1).text !== key)) { error.value = 'templateError'; return; }
    const pending: Vehicle[] = []; const invalid: typeof failures.value = [];
    if (sheet.rowCount < 2) { error.value = 'rowLimit'; return; }
    for (let index = 2; index <= sheet.rowCount; index++) {
      const row = sheet.getRow(index);
      if (!row.hasValues) continue;
      const text = (column: number) => { const cell = row.getCell(column); return cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text.trim(); };
      const record: Vehicle = { id: crypto.randomUUID(), directory: props.directory, production: props.production, code: text(1), effective: text(2), region: props.production ? text(3) : '', owner: props.production ? text(4) : '', description: props.production ? text(5) : '', created: new Date().toLocaleString('sv-SE').slice(0, 16) };
      const reason = validateVehicle(record, props.production, [...props.rows, ...pending], props.directory, props.pattern, props.users);
      if (reason) invalid.push({ row: index, code: record.code, reason }); else pending.push(record);
    }
    // Yield before committing so closing the processing dialog can roll back the whole batch.
    await new Promise(resolve => setTimeout(resolve, 300));
    if (token !== generation) return;
    failures.value = invalid;
    if (!pending.length && !invalid.length) { error.value = 'rowLimit'; return; }
    emit('imported', pending);
    if (!invalid.length) close();
    else error.value = 'importFailed';
  } catch { if (token === generation) error.value = 'fileError'; }
  finally { if (token === generation) busy.value = false; }
}
</script>
<template>
  <a-button class="app-btn-neutral" @click="open"><template #icon><IconUpload /></template>{{ t('vehicles.import') }}</a-button>
  <a-drawer class="app-import-drawer" :visible="visible" placement="right" :title="t('batchImport.title')" :width="'min(560px, 100vw)'" @cancel="close">
    <section class="import-block app-import-block">
      <p class="import-path">{{ path }}</p>
      <input ref="input" type="file" accept=".xlsx,.csv" hidden @change="choose(($event.target as HTMLInputElement).files?.[0])" />
      <div class="app-import-target" :class="{ 'is-dragging': dragging }" role="button" tabindex="0" :aria-label="t('batchImport.upload')" @click="!busy && input?.click()" @keydown.enter.prevent="!busy && input?.click()" @keydown.space.prevent="!busy && input?.click()" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="!busy && (choose($event.dataTransfer?.files[0]), dragging = false)">
        <IconFolder :size="32" />
        <p class="app-import-target-name">{{ file?.name || t('batchImport.hint') }}</p>
        <a-button type="primary" :disabled="busy" @click.stop="input?.click()">{{ t(file ? 'batchImport.reupload' : 'batchImport.upload') }}</a-button>
      </div>
      <div class="app-import-notes"><p class="app-import-notes-title">{{ t('batchImport.notesTitle') }}</p><p class="app-import-notes-lines">{{ t('vehicles.importHelp') }}</p></div>
      <a-button type="text" class="app-import-template" :loading="preparing" :disabled="preparing || busy || !!failures.length" @click="templateReady ? download() : buildTemplate()">
        <template #icon><IconDownload /></template>{{ t(preparing ? 'batchImport.templatePreparing' : templateReady ? 'batchImport.template' : 'batchImport.templateRetry') }}
      </a-button>
      <a-alert v-if="error" type="error">{{ t(`vehicles.${error}`) }}</a-alert>
    </section>
    <section v-if="failures.length" class="import-block app-import-block">
      <a-table :data="failures" :columns="[{ title: t('vehicles.row'), dataIndex: 'row', width: 60 }, { title: t('vehicles.code'), dataIndex: 'code' }, { title: t('vehicles.reason'), slotName: 'reason' }]" :pagination="{ pageSize: 10 }"><template #reason="{ record }">{{ t(`vehicles.${record.reason}`) }}</template></a-table>
    </section>
    <template #footer><a-space :size="12"><a-button class="app-btn-neutral" @click="close">{{ t('batchImport.cancel') }}</a-button><a-button type="primary" :loading="busy" :disabled="!file || !!failures.length" @click="submit">{{ t('batchImport.confirm') }}</a-button></a-space></template>
  </a-drawer>
</template>
<style scoped>
.import-block { padding: 16px; margin-bottom: 16px; background: var(--app-surface); border-radius: 2px; min-width: 0; }
.import-path { margin: 0 0 16px; color: var(--color-text-2); overflow-wrap: anywhere; }
.import-block :deep(table) { table-layout: fixed; width: 100%; }
.import-block :deep(td) { overflow-wrap: anywhere; white-space: normal; }
</style>
