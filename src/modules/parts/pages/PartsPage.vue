<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { usePartsStore } from '../stores/parts';
import { Message, type FormInstance } from '@arco-design/web-vue';
import { IconPlus } from '@arco-design/web-vue/es/icon';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import emptyDot from '../../../assets/parts-empty-dot.svg';
import { DEVELOPMENT_CODES, LEVEL_CODES, INTERFACE_CODES, PROTOCOL_CODES, suppliers, emptyPart, type Part, type Segment, type HardwareVersion } from '../data/parts';
import { developmentLabel, levelLabel, scanLabel } from '../labels';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { rows, initialized, custom, lockedSegments, lockedSeparator, lockedDigits, serial } = storeToRefs(usePartsStore());
const query = reactive({ code: '', name: '', supplier: '' });
const applied = ref({ ...query });
const filtered = computed(() => rows.value.filter(row => row.code.toLowerCase().includes(applied.value.code.toLowerCase()) && row.name.toLowerCase().includes(applied.value.name.toLowerCase()) && (!applied.value.supplier || row.supplier === applied.value.supplier)));
const detail = computed(() => rows.value.find(row => row.id === route.params.id));
const columns = computed(() => ['code', 'name', 'level', 'supplier', 'material', 'owner', 'securityOwner', 'actions'].map(key => ({ title: t(`parts.${key}`), dataIndex: key, slotName: key === 'level' || key === 'actions' ? key : undefined, width: key === 'actions' ? 180 : 150 })));
const drawer = ref(false);
const formRef = ref<FormInstance>();
const form = reactive(emptyPart());
const variable = ref('');
const snapshot = ref('');
const dirty = computed(() => drawer.value && snapshot.value !== JSON.stringify({ form, variable: variable.value }));
const discard = ref(false);
const pendingLeave = ref<((allow: boolean) => void)>();
function closeDrawer() {
  if (dirty.value) { discard.value = true; return; }
  drawer.value = false;
}
function open(row?: Part) {
  Object.assign(form, JSON.parse(JSON.stringify(row ?? emptyPart())));
  variable.value = '';
  snapshot.value = JSON.stringify({ form, variable: variable.value });
  drawer.value = true;
  formRef.value?.clearValidate();
}
const fields = ['name', 'abbreviation', 'level', 'development', 'supplier', 'material', 'ip', 'owner', 'securityOwner'] as const;
const required = ['name', 'abbreviation', 'level', 'development', 'owner', 'securityOwner'];
const rules = computed(() => Object.fromEntries(required.map(field => [field, [{ required: true, message: t('parts.required') }, { validator: (value: string, callback: (error?: string) => void) => callback(value?.trim() ? undefined : t('parts.required')) }]])));
const ruleVisible = ref(false);
const separator = ref('-');
const digits = ref(4);
const segments = ref<Segment[]>([{ id: 'fixed', kind: 'fixed', value: 'DDY' }, { id: 'variable', kind: 'variable', value: 'ABCD' }, { id: 'year', kind: 'year', value: '2026' }]);
const preview = computed(() => [...segments.value.map(s => s.value), '1'.padStart(digits.value, '0')].join(separator.value));
const generatedCode = computed(() => custom.value ? [...lockedSegments.value.map(s => s.kind === 'variable' ? variable.value.trim() : s.value), String(serial.value).padStart(lockedDigits.value, '0')].join(lockedSeparator.value) : `PART-${String(serial.value).padStart(4, '0')}`);
function addSegment(kind: Segment['kind']) { segments.value.push({ id: crypto.randomUUID(), kind, value: kind === 'year' ? String(new Date().getFullYear()) : '' }); }
function configure() {
  if (!segments.value.length || segments.value.some(s => !/^[A-Za-z0-9]+$/.test(s.value))) { Message.error(t('parts.invalidRule')); return false; }
  lockedSegments.value = JSON.parse(JSON.stringify(segments.value));
  lockedSeparator.value = separator.value;
  lockedDigits.value = digits.value;
  custom.value = true;
  initialized.value = true;
  ruleVisible.value = false;
  open();
  return true;
}
async function save() {
  if (await formRef.value?.validate()) { formRef.value?.scrollToField(required.find(field => !String(form[field as keyof Part]).trim()) ?? 'name'); return; }
  if (form.ip && !/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(form.ip)) { Message.error(t('parts.invalidIp')); return; }
  if (!form.id && custom.value && lockedSegments.value.some(s => s.kind === 'variable') && !/^[A-Za-z0-9]+$/.test(variable.value.trim())) { Message.error(t('parts.invalidVariable')); return; }
  const record = JSON.parse(JSON.stringify({ ...form, name: form.name.trim(), abbreviation: form.abbreviation.trim(), code: form.id ? form.code : generatedCode.value })) as Part;
  if (rows.value.some(row => row.id !== record.id && (row.code === record.code || row.name === record.name))) { Message.error(t('parts.duplicate')); return; }
  if (record.id) rows.value.splice(rows.value.findIndex(row => row.id === record.id), 1, record);
  else { rows.value.push({ ...record, id: crypto.randomUUID() }); serial.value++; }
  initialized.value = true;
  drawer.value = false;
  Message.success(t('parts.saved'));
}
const deleting = ref<Part>();
function remove() { rows.value.splice(rows.value.findIndex(row => row.id === deleting.value?.id), 1); deleting.value = undefined; }
const selectedHardware = ref('');
const hardware = computed(() => detail.value?.hardware.find(hw => hw.id === selectedHardware.value) ?? detail.value?.hardware[0]);
const versionVisible = ref(false);
const versionKind = ref<'hardware' | 'software'>('hardware');
const version = reactive({ name: '', note: '', interfaces: [] as string[], protocols: [] as string[], method: 'json', fileName: '' });
function openVersion(kind: 'hardware' | 'software') {
  versionKind.value = kind;
  Object.assign(version, { name: '', note: '', interfaces: [], protocols: [], method: 'json', fileName: '' });
  versionVisible.value = true;
}
function saveVersion() {
  const versions = versionKind.value === 'hardware' ? detail.value?.hardware : hardware.value?.software;
  if (!version.name.trim() || !versions) { Message.error(t('parts.required')); return false; }
  if (versions.some(v => v.name === version.name.trim())) { Message.error(t('parts.duplicate')); return false; }
  if (versionKind.value === 'hardware') {
    const hw: HardwareVersion = { id: crypto.randomUUID(), name: version.name.trim(), note: version.note, software: [] };
    detail.value!.hardware.push(hw);
    selectedHardware.value = hw.id;
  } else hardware.value!.software.push({ id: crypto.randomUUID(), name: version.name.trim(), interfaces: [...version.interfaces], protocols: [...version.protocols], scan: version.fileName ? 'queued' : 'unconfigured', fileName: version.fileName });
  versionVisible.value = false;
  Message.success(t('parts.saved'));
  return true;
}
function upload(file: File) {
  const accepted = version.method === 'json' ? /\.json$/i : /\.(bin|zip|hex)$/i;
  if (!accepted.test(file.name) || file.size > 20 * 1024 * 1024) { Message.error(t('parts.fileError')); return false; }
  version.fileName = file.name;
  return false;
}
const deletingHardware = ref<HardwareVersion>();
function removeHardware() { if (detail.value) detail.value.hardware = detail.value.hardware.filter(hw => hw.id !== deletingHardware.value?.id); deletingHardware.value = undefined; }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) event.preventDefault(); }
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave((_to, _from, next) => { if (!dirty.value) next(); else { pendingLeave.value = allow => next(allow); discard.value = true; } });
watch(discard, value => { if (!value) { pendingLeave.value?.(false); pendingLeave.value = undefined; } });
function confirmDiscard() { drawer.value = false; pendingLeave.value?.(true); pendingLeave.value = undefined; discard.value = false; }
</script>

<template>
  <main class="parts-page">
    <template v-if="route.params.id">
      <div class="detail-toolbar"><a-link @click="router.push('/data/parts')">{{ t('parts.title') }}</a-link><strong v-if="detail">{{ detail.name }} · {{ detail.code }}</strong><a-button @click="router.push('/data/parts')">{{ t('parts.back') }}</a-button></div>
      <template v-if="detail">
        <section class="region"><h3>{{ t('parts.basic') }}</h3><a-descriptions :column="{ xs: 1, sm: 2, lg: 3 }" layout="inline-horizontal">
          <a-descriptions-item v-for="field in ['code', ...fields] as const" :key="field"><template #label><span class="app-detail-label">{{ t(`parts.${field}`) }}</span></template>{{ field === 'level' ? levelLabel(t, detail.level) : field === 'development' ? developmentLabel(t, detail.development) : detail[field] || '—' }}</a-descriptions-item>
        </a-descriptions></section>
        <section class="region"><h3>{{ t('parts.versions') }}</h3><div class="version-layout">
          <aside class="hardware"><div class="toolbar"><strong>{{ t('parts.hardware') }}</strong><a-button @click="openVersion('hardware')"><IconPlus />{{ t('parts.add') }}</a-button></div>
            <div v-for="hw in detail.hardware" :key="hw.id" class="hardware-item" :class="{ selected: hw.id === hardware?.id }"><button type="button" @click="selectedHardware = hw.id">{{ hw.name }}<small>{{ t('parts.softwareCount', { count: hw.software.length }) }}</small></button><a-button type="text" status="danger" @click="deletingHardware = hw">{{ t('parts.delete') }}</a-button></div>
            <a-empty v-if="!detail.hardware.length" :description="t('parts.empty')" />
          </aside>
          <div class="software"><div class="toolbar"><strong>{{ t('parts.software') }}</strong><a-button type="primary" :disabled="!hardware" @click="openVersion('software')">{{ t('parts.addSoftware') }}</a-button></div><p v-if="hardware?.note">{{ hardware.note }}</p>
            <div class="software-grid"><article v-for="sw in hardware?.software" :key="sw.id" class="software-card"><div class="toolbar"><strong>{{ sw.name }}</strong><a-tag :color="sw.scan === 'failed' ? 'red' : sw.scan === 'available' ? 'green' : 'gray'">{{ scanLabel(t, sw.scan) }}</a-tag></div><p><span class="app-detail-label">{{ t('parts.interfaces') }}</span><a-tag v-for="item in sw.interfaces" :key="item">{{ item }}</a-tag><span v-if="!sw.interfaces.length">—</span></p><p><span class="app-detail-label">{{ t('parts.protocols') }}</span><a-tag v-for="item in sw.protocols" :key="item">{{ item }}</a-tag><span v-if="!sw.protocols.length">—</span></p><p v-if="sw.fileName">{{ sw.fileName }}</p><a-alert v-if="sw.scan === 'queued'" type="info">{{ t('parts.scanMock') }}</a-alert></article></div>
            <a-empty v-if="!hardware?.software.length" :description="t('parts.empty')" />
          </div>
        </div></section>
        <section class="region"><h3>{{ t('parts.projects') }}</h3><a-empty :description="t('parts.noProjects')" /></section>
      </template><a-empty v-else :description="t('parts.missing')" />
    </template>
    <section v-else-if="!initialized && !rows.length" class="initial region">
      <div class="empty-illustration" aria-hidden="true"><div class="empty-sheet"><div class="empty-top"/><div v-for="n in 3" :key="n" class="empty-line"><img :src="emptyDot" alt="" /><span /></div></div></div>
      <p>{{ t('parts.initialHelp') }}</p><a-space wrap><a-button type="primary" @click="custom = false; open()">{{ t('parts.direct') }}</a-button><a-button @click="ruleVisible = true">{{ t('parts.customRule') }}</a-button></a-space>
    </section>
    <template v-else>
      <a-form :model="query" layout="inline" class="region filters" @submit-success="applied = { ...query }"><a-form-item v-for="field in ['code', 'name'] as const" :key="field"><template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template><a-input v-model="query[field]" allow-clear :placeholder="t('parts.input')" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('parts.supplier') }}</span></template><a-select v-model="query.supplier" :options="suppliers" allow-clear :placeholder="t('parts.all')" /></a-form-item><a-space><a-button type="primary" html-type="submit">{{ t('parts.search') }}</a-button><a-button @click="Object.assign(query, { code: '', name: '', supplier: '' }); applied = { ...query }">{{ t('parts.reset') }}</a-button></a-space></a-form>
      <section class="region"><div class="toolbar"><a-button type="primary" @click="open()"><template #icon><IconPlus /></template>{{ t('parts.create') }}</a-button></div><a-table :columns="columns" :data="filtered" row-key="id" :scroll="{ x: 1230 }" :pagination="{ pageSize: 10, showTotal: true, showPageSize: true }"><template #level="{ record }">{{ levelLabel(t, record.level) }}</template><template #actions="{ record }"><a-space><a-link @click="router.push(`/data/parts/${record.id}`)">{{ t('parts.detail') }}</a-link><a-link @click="open(record)">{{ t('parts.edit') }}</a-link><a-link status="danger" @click="deleting = record">{{ t('parts.delete') }}</a-link></a-space></template><template #empty><a-empty :description="t('parts.noMatch')" /></template></a-table></section>
    </template>
    <a-drawer :visible="drawer" :width="560" :title="t(form.id ? 'parts.edit' : 'parts.create')" :mask-closable="false" :esc-to-close="true" @cancel="closeDrawer" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="part-form" scroll-to-first-error>
        <a-form-item v-if="custom && !form.id && lockedSegments.some(segment => segment.kind === 'variable')"><template #label><span class="app-field-label">{{ t('parts.code') }}</span></template><a-input v-model="variable" :placeholder="t('parts.variable')" :max-length="20" show-word-limit /><div class="preview">{{ generatedCode }}</div></a-form-item>
        <a-form-item v-for="field in fields" :key="field" :field="field"><template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template>
          <a-select v-if="field === 'level'" v-model="form.level" :options="LEVEL_CODES.map(value => ({ value, label: levelLabel(t, value) }))" :placeholder="t('parts.select')" />
          <a-select v-else-if="field === 'development'" v-model="form.development" :options="DEVELOPMENT_CODES.map(value => ({ value, label: developmentLabel(t, value) }))" :placeholder="t('parts.select')" />
          <a-select v-else-if="field === 'supplier'" v-model="form.supplier" :options="suppliers" allow-clear :placeholder="t('parts.select')" />
          <a-input v-else v-model="form[field]" :max-length="field === 'abbreviation' ? 20 : 100" show-word-limit :placeholder="t('parts.input')" />
        </a-form-item>
      </a-form>
      <template #footer><a-space><a-button @click="closeDrawer">{{ t('parts.cancel') }}</a-button><a-button type="primary" @click="save">{{ t('parts.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <a-modal v-model:visible="ruleVisible" :title="t('parts.customRule')" :width="720" :on-before-ok="configure">
      <a-alert>{{ t('parts.ruleLock') }}</a-alert><a-form :model="{}" layout="vertical" class="rule-form"><a-form-item><template #label><span class="app-field-label">{{ t('parts.separator') }}</span></template><a-radio-group v-model="separator" :options="['-', '_', '/']" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('parts.digits') }}</span></template><a-radio-group v-model="digits" :options="[4, 6, 8]" /></a-form-item></a-form>
      <a-space wrap><a-button v-for="kind in ['fixed', 'variable', 'year'] as const" :key="kind" @click="addSegment(kind)"><IconPlus />{{ t(`parts.${kind}`) }}</a-button></a-space>
      <div class="segments"><div v-for="segment in segments" :key="segment.id" class="segment"><div class="toolbar"><span>{{ t(`parts.${segment.kind}`) }}</span><a-button size="mini" type="text" :aria-label="t('parts.removeSegment')" @click="segments = segments.filter(item => item.id !== segment.id)">×</a-button></div><a-input v-model="segment.value" :max-length="20" :aria-label="t(`parts.${segment.kind}`)" /></div><div class="segment"><span>{{ t('parts.sequence') }}</span><a-input :model-value="'1'.padStart(digits, '0')" disabled /></div></div><p class="preview"><span class="app-detail-label">{{ t('parts.preview') }}</span>{{ preview }}</p>
    </a-modal>
    <a-modal v-model:visible="versionVisible" :title="t(versionKind === 'hardware' ? 'parts.addHardware' : 'parts.addSoftware')" :width="560" :on-before-ok="saveVersion"><a-form :model="version" layout="vertical"><a-form-item required><template #label><span class="app-field-label">{{ t(versionKind === 'hardware' ? 'parts.hardware' : 'parts.software') }}</span></template><a-input v-model="version.name" :max-length="40" :placeholder="t('parts.input')" /></a-form-item><a-form-item v-if="versionKind === 'hardware'"><template #label><span class="app-field-label">{{ t('parts.note') }}</span></template><a-textarea v-model="version.note" :max-length="500" show-word-limit /></a-form-item><template v-else><a-form-item v-for="field in ['interfaces', 'protocols'] as const" :key="field"><template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template><a-select v-model="version[field]" multiple :options="field === 'interfaces' ? INTERFACE_CODES : PROTOCOL_CODES" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('parts.sbomMethod') }}</span></template><a-radio-group v-model="version.method" @change="version.fileName = ''"><a-radio value="json">{{ t('parts.json') }}</a-radio><a-radio value="firmware">{{ t('parts.firmware') }}</a-radio></a-radio-group></a-form-item><a-upload :key="version.method" draggable :accept="version.method === 'json' ? '.json' : '.bin,.zip,.hex'" :auto-upload="true" :show-file-list="false" :on-before-upload="upload" /><p>{{ version.fileName || t('parts.fileHelp') }}</p></template></a-form></a-modal>
    <ConfirmDialog v-model:visible="discard" :title="t('parts.discard')" @confirm="confirmDiscard" />
    <ConfirmDialog :visible="!!deleting" :title="t('parts.confirmDelete')" :description="deleting?.name" @update:visible="deleting = undefined" @confirm="remove" />
    <ConfirmDialog :visible="!!deletingHardware" :title="t('parts.confirmDeleteHardware')" :description="deletingHardware?.name" @update:visible="deletingHardware = undefined" @confirm="removeHardware" />
  </main>
</template>

<style scoped>
.parts-page { display: grid; gap: 16px; min-width: 0; }
.region { padding: 16px; background: var(--app-surface); min-width: 0; }
.initial { min-height: calc(100dvh - 120px); display: flex; align-items: center; flex-direction: column; padding-top: clamp(80px, 20vh, 204px); box-sizing: border-box; }
.initial > p { max-width: 520px; text-align: center; color: var(--color-text-3); line-height: 22px; margin: 28px 0 40px; }
.empty-illustration { width: 160px; height: 120px; background: rgb(var(--primary-2)); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.empty-sheet { background: var(--app-surface); height: 100px; border-radius: 8px; overflow: hidden; }
.empty-top { height: 18px; background: rgb(var(--primary-3)); margin-bottom: 14px; }
.empty-line { display: flex; align-items: center; gap: 4px; padding: 0 8px; margin-bottom: 10px; }
.empty-line img { width: 8px; height: 8px; }
.empty-line span { width: 100px; height: 8px; background: var(--color-fill-2); border-radius: 4px; }
.toolbar, .detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-toolbar { margin: 0; padding: 16px; background: var(--app-surface); }
.filters { row-gap: 16px; }
.filters :deep(.arco-input-wrapper), .filters :deep(.arco-select) { width: 180px; }
h3 { margin: 0 0 16px; font-size: 16px; }
.part-form { width: 500px; max-width: 100%; }
.preview { background: var(--color-fill-2); padding: 12px; overflow-wrap: anywhere; }
.rule-form { margin-top: 16px; }
.segments { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.segment { width: 140px; border: 1px solid var(--color-border-2); padding: 8px; }
.segment .toolbar { margin-bottom: 4px; }
.version-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
.hardware { background: var(--color-fill-1); padding: 12px; }
.hardware-item { display: flex; align-items: center; border: 1px solid var(--color-border-2); margin-bottom: 12px; padding: 8px; border-radius: var(--app-radius-control); }
.hardware-item.selected { border-color: rgb(var(--primary-6)); background: var(--app-surface); }
.hardware-item > button:first-child { background: transparent; border: 0; color: var(--color-text-1); text-align: left; cursor: pointer; flex: 1; }
.hardware-item small { display: block; color: var(--color-text-3); margin-top: 8px; }
.software-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.software-card { padding: 16px; border: 1px solid var(--color-border-2); border-radius: var(--app-radius-control); overflow-wrap: anywhere; }
.software-card .arco-tag { margin: 4px; }
@media (max-width: 1000px) { .software-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .version-layout { grid-template-columns: 1fr; } .initial { padding-top: 80px; } }
</style>
