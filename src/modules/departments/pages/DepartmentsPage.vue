<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message, type ButtonProps } from '@arco-design/web-vue';
import { IconCaretDown, IconCaretRight, IconBranch } from '@arco-design/web-vue/es/icon';
import { useDepartmentStore } from '../../user-management/stores/departments';
import { useUserStore } from '../../user-management/stores/users';
import { buildDepartmentTree, type Department } from '../../user-management/data/users';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
/** Arco 的 ButtonProps 未声明 class，运行时透传是支持的，这里单独收敛类型。 */
const neutralCancelButtonProps = { class: 'app-btn-neutral' } as unknown as ButtonProps;
const { t } = useI18n();
const store = useDepartmentStore();
const users = useUserStore();
const expanded = ref(store.departments.map(d => d.id));
const selected = ref('');
const draft = ref(''); const query = ref('');
const count = (id: string) => users.users.filter(u => store.subtreeIds(id).includes(u.deptId)).length;
function matches(d: Department): boolean {
 return query.value.split('，').filter(Boolean).some(k => d.name.toLowerCase().includes(k.toLowerCase()));
}
const rows = computed(() => {
 const result: (Department & { level: number })[] = [];
 function visit(parent: string | null, level: number) {
  for (const d of store.departments.filter(d => d.parent === parent)) {
   if (query.value && !store.subtreeIds(d.id).some(id => matches(store.getById(id)!))) continue;
   result.push({ ...d, level });
   if (query.value || expanded.value.includes(d.id)) visit(d.id, level + 1);
  }
 } visit(null, 0); return result;
});
function toggle(id: string) { expanded.value = expanded.value.includes(id) ? expanded.value.filter(x => x !== id) : [...expanded.value, id]; }
const visible = ref(false); const target = ref<Department | null>(null); const child = ref(false);
const form = reactive({ name: '', parent: '' });
const submitted = ref(false); const saving = ref(false);
const options = computed(() => buildDepartmentTree(store.departments.filter(d => !target.value || !store.subtreeIds(target.value.id).includes(d.id))));
const errors = computed(() => ({
 name: !form.name.trim() ? t('departments.required') : [...form.name.trim()].length > 20 ? t('departments.length') : store.departments.some(d => d.id !== target.value?.id && d.name === form.name.trim()) ? t('departments.duplicate') : '',
 parent: !store.getById(form.parent) || (target.value && store.subtreeIds(target.value.id).includes(form.parent)) ? t('departments.invalid') : '',
}));
function open(d: Department | null, parent = store.rootId, asChild = false) {
 target.value = d; child.value = asChild; Object.assign(form, { name: d?.name ?? '', parent: d?.parent ?? parent });
 submitted.value = false; visible.value = true;
}
/* 居中弹窗：X / 取消直接关闭，不做「放弃未保存修改」二次确认（DESIGN.md · Dialog）。 */
function close() { visible.value = false; }
function save() {
 if (saving.value) return; submitted.value = true;
 if (errors.value.name || errors.value.parent) return;
 saving.value = true;
 const name = form.name.trim();
 const record = target.value
  ? (store.updateDepartment(target.value.id, { name, parent: form.parent }), target.value)
  : store.addDepartment({ name, parent: form.parent, leaders: [] });
 expanded.value = [...new Set([...expanded.value, record.id, form.parent])];
 Message.success(t(target.value ? 'departments.updated' : 'departments.created')); visible.value = false; saving.value = false;
}
const removing = ref<Department | null>(null); const removeVisible = ref(false);
const removeCount = computed(() => removing.value ? count(removing.value.id) : 0);
function remove(d: Department) { removing.value = d; removeVisible.value = true; }
function confirmRemove() {
 if (!removing.value || removeCount.value || removing.value.parent === null) return;
 const ids = store.subtreeIds(removing.value.id); if (ids.includes(selected.value)) selected.value = '';
 store.removeDepartment(removing.value.id); removeVisible.value = false; Message.success(t('departments.deleted'));
}
const dragging = ref(''); const dropId = ref(''); const after = ref(false); const invalid = ref(false);
function resetDrag() { dragging.value = ''; dropId.value = ''; invalid.value = false; }
function start(e: DragEvent, d: Department) {
 if (!d.parent || (e.target as HTMLElement).closest('button,a,input')) { e.preventDefault(); return; }
 dragging.value = d.id; e.dataTransfer?.setData('text/plain', d.id);
 const row = e.currentTarget as HTMLElement; const rect = row.getBoundingClientRect(); e.dataTransfer?.setDragImage(row, e.clientX - rect.left, e.clientY - rect.top);
}
function over(e: DragEvent, d: Department) {
 if (!dragging.value || dragging.value === d.id) return;
 e.preventDefault(); dropId.value = d.id; invalid.value = store.getById(dragging.value)?.parent !== d.parent;
 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); after.value = e.clientY >= rect.top + rect.height / 2;
}
function move(sourceId: string, destination: Department, insertAfter: boolean) {
 const source = store.getById(sourceId); if (!source || source.id === destination.id) return;
 if (!source.parent || source.parent !== destination.parent) { Message.warning(t('departments.siblings')); return; }
 const list = [...store.departments]; list.splice(list.indexOf(source), 1); list.splice(list.findIndex(d => d.id === destination.id) + Number(insertAfter), 0, source);
 if (list.every((d,i) => d.id === store.departments[i]?.id)) return;
 store.departments = list; Message.success(t('departments.sorted'));
}
function drop(e: DragEvent, d: Department) { e.preventDefault(); move(dragging.value,d,after.value); resetDrag(); }
function keyboard(e: KeyboardEvent, d: Department) {
 if (!e.altKey || !['ArrowUp','ArrowDown'].includes(e.key) || !d.parent) return;
 e.preventDefault(); const siblings = store.departments.filter(x => x.parent === d.parent); const down = e.key === 'ArrowDown'; const destination = siblings[siblings.findIndex(x => x.id === d.id) + (down ? 1 : -1)];
 if (destination) move(d.id,destination,down);
}
</script>
<template>
 <section class="departments-page">
  <div class="toolbar">
   <a-space><a-button type="primary" @click="open(null)">{{ t('departments.add') }}</a-button><a-button @click="expanded = expanded.length ? [] : store.departments.map(d => d.id)"><template #icon><IconBranch /></template>{{ t('departments.expand') }}</a-button></a-space>
   <form class="search" role="search" @submit.prevent="query = draft.trim()">
    <a-input-search v-model="draft" allow-clear :aria-label="t('departments.searchPlaceholder')" :placeholder="t('departments.placeholder')" @search="query = draft.trim()" @clear="query = ''" />
   </form>
  </div>
  <div class="table-scroll"><table><thead><tr><th>{{ t('departments.name') }}</th><th>{{ t('departments.count') }}</th><th>{{ t('departments.actions') }}</th></tr></thead>
   <tbody><tr v-for="d in rows" :key="d.id" :draggable="!!d.parent" tabindex="0" :title="d.parent ? t('departments.keyboard') : undefined" :class="{ selected: selected === d.id, dragging: dragging === d.id, before: dropId === d.id && !invalid && !after, after: dropId === d.id && !invalid && after, invalid: dropId === d.id && invalid }" @click="selected = d.id" @keydown="keyboard($event,d)" @dragstart="start($event,d)" @dragover="over($event,d)" @drop="drop($event,d)" @dragend="resetDrag" @dragleave="dropId = ''">
    <td><div class="name" :style="{ paddingLeft: `${d.level * 20}px` }"><a-button v-if="store.departments.some(x => x.parent === d.id)" class="department-toggle" type="text" size="mini" :aria-label="t('departments.toggle',{name:d.name})" :aria-expanded="!!query || expanded.includes(d.id)" @click.stop="toggle(d.id)"><IconCaretDown v-if="query || expanded.includes(d.id)"/><IconCaretRight v-else /></a-button><span v-else class="spacer"/><IconBranch v-if="!d.parent"/><span :class="{ root: !d.parent }">{{ d.name }}</span></div></td>
    <td class="number">{{ count(d.id) }}</td><td><div class="actions"><a-button type="text" @click.stop="open(null,d.id,true)">{{ t('departments.child') }}</a-button><a-button v-if="d.parent" type="text" @click.stop="open(d)">{{ t('departments.edit') }}</a-button><a-button v-if="d.parent" type="text" status="danger" @click.stop="remove(d)">{{ t('departments.delete') }}</a-button></div></td>
   </tr><tr v-if="!rows.length"><td colspan="3"><a-empty :description="t('departments.empty')" /></td></tr></tbody>
  </table></div>
  <a-modal class="department-dialog" :visible="visible" :width="640" :title="t(target ? 'departments.editTitle' : child ? 'departments.child' : 'departments.add')" :mask-closable="false" :ok-text="t('departments.confirm')" :cancel-text="t('departments.cancel')" :cancel-button-props="neutralCancelButtonProps" :ok-loading="saving" @ok="save" @cancel="close">
   <a-form :model="form" layout="vertical" class="department-form" @submit-success="save">
    <a-form-item field="name" required :validate-status="submitted && errors.name ? 'error' : undefined" :help="submitted ? errors.name : ''"><template #label><span class="app-field-label">{{ t('departments.name') }}</span></template><a-input v-model="form.name" :max-length="20" show-word-limit /></a-form-item>
    <a-form-item field="parent" required :validate-status="submitted && errors.parent ? 'error' : undefined" :help="submitted ? errors.parent : ''"><template #label><span class="app-field-label">{{ t('departments.parent') }}</span></template><a-tree-select v-model="form.parent" :data="options" :field-names="{ key: 'id', title: 'name', children: 'children' }" tree-default-expand-all allow-search :placeholder="t('departments.searchPlaceholder')" /></a-form-item>
   </a-form>
  </a-modal>
  <ConfirmDialog
    :visible="removeVisible"
    :icon="removeCount ? 'info' : 'question'"
    :title="t(removeCount ? 'departments.blockedTitle' : 'departments.deleteTitle')"
    :description="removeCount ? t('departments.blocked',{name:removing?.name,count:removeCount}) : t('departments.deleteBody',{name:removing?.name,count:removing ? store.subtreeIds(removing.id).length - 1 : 0})"
    :single="!!removeCount"
    :ack-text="t('departments.ack')"
    :cancel-text="t('departments.cancel')"
    :ok-text="t('departments.delete')"
    @update:visible="removeVisible = $event"
    @confirm="confirmRemove"
  />
 </section>
</template>
<style scoped>
.departments-page { padding: 16px; background: var(--app-surface); border-radius: 2px; min-height: 100%; }
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:12px; }
.search { display:flex; width:200px; max-width:100%; gap:8px; }
.table-scroll { overflow-x:auto; }table { width:100%; min-width:720px; border-collapse:collapse; font-size:14px; color:var(--color-text-1); }
th,td { text-align:left; padding:12px; border-bottom:1px solid var(--color-border-2); }th { font-weight:600; background:var(--app-table-header); color:var(--color-text-1); line-height:22px; }th:first-child { width:36%; }td { position:relative; }
.name,.actions { display:flex; align-items:center; gap:8px; white-space:nowrap; }.actions { gap:12px; }.actions :deep(.arco-btn) { padding:0; }.spacer { width:24px; flex-shrink:0; }.root { font-weight:600; }.number { font-variant-numeric:tabular-nums; }
tr:hover td { background:var(--color-fill-1); }tr.selected td { background:var(--color-primary-light-1); }tr:focus-visible { outline:2px solid var(--app-accent); outline-offset:-2px; }tr.dragging { opacity:.55; cursor:grabbing; }tr.before td,tr.after td { background:var(--color-primary-light-1); }tr.before td::before,tr.after td::after { content:''; position:absolute; left:0; right:0; height:3px; background:var(--app-accent); pointer-events:none; border-radius:2px; }tr.before td::before { top:0; }tr.after td::after { bottom:0; }tr.invalid td { background:var(--color-danger-light-1); }.danger { color:rgb(var(--danger-6)); }
.name :deep(.department-toggle) { color:var(--color-text-3); background:transparent; }
.name :deep(.department-toggle:hover), .name :deep(.department-toggle:focus-visible) { color:var(--app-accent); background:transparent; }
.name :deep(.department-toggle:active) { background:transparent; }
.department-form { width:500px; max-width:100%; }.department-form :deep(.arco-form-item) { margin-bottom:16px; }.department-form :deep(.arco-form-item:last-child) { margin-bottom:0; }.department-form :deep(.arco-form-item-label) { color:var(--color-text-2); font-size:14px; font-weight:400; line-height:22px; }
@media(max-width:900px) { .search { width:100%; } }
</style>
