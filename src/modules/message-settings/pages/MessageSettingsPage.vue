<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { settings, ROLE_CODES, type Setting, type Role } from '../data/settings';
const { t } = useI18n(); const router = useRouter();
const rows = reactive(settings.map(r => ({ ...r, roles: [...r.roles] })));
const current = ref<Setting>(); const roles = ref<Role[]>([]); const invalid = ref(false);
const columns = computed(() => ['name','description','bubble','inbox','roles','actions'].map((key,i) => ({title:t(`messageSettings.${key}`),slotName:key,width:[180,320,140,150,190,80][i]})));
function toggle(row:Setting,key:'bubble'|'inbox',value:boolean) {row[key]=value;if(key==='bubble'&&value)row.inbox=true;if(key==='inbox'&&!value)row.bubble=false;Message.success(t('messageSettings.saved'));}
function edit(row:Setting){current.value=row;roles.value=[...row.roles];invalid.value=false;}
function save(){if(!roles.value.length){invalid.value=true;Message.error(t('messageSettings.required'));return false;}if(current.value){current.value.roles=[...roles.value];}current.value=undefined;Message.success(t('messageSettings.saved'));return true;}
</script>
<template>
<section class="settings" :aria-label="t('messageSettings.title')">
<div class="toolbar"><a-alert type="warning"><div>{{ t('messageSettings.notice') }}</div><div>{{ t('messageSettings.rule') }}</div><template #action><a-button type="primary" @click="router.push('/messages')">{{ t('messageSettings.center') }}</a-button></template></a-alert></div>
<a-table :columns="columns" :data="rows" row-key="id" :pagination="false" :bordered="false" :scroll="{x:1060}">
<template #name="{record}">{{ t(`messageSettings.type${record.id}`) }}</template>
<template #description="{record}">{{ t(`messageSettings.desc${record.id}`) }}</template>
<template #bubble="{record}"><a-tooltip :content="t('messageSettings.hint')"><a-switch :model-value="record.bubble" :aria-label="t(`messageSettings.type${record.id}`)+' '+t('messageSettings.bubble')" @change="toggle(record,'bubble',Boolean($event))" /></a-tooltip></template>
<template #inbox="{record}"><a-switch :model-value="record.inbox" :aria-label="t(`messageSettings.type${record.id}`)+' '+t('messageSettings.inbox')" @change="toggle(record,'inbox',Boolean($event))" /></template>
<template #roles="{record}"><div v-for="role in record.roles" :key="role">{{ t(`messageSettings.${role}`) }}</div></template>
<template #actions="{record}"><a-button type="text" @click="edit(record)">{{ t('messageSettings.edit') }}</a-button></template>
</a-table>
<a-modal :visible="!!current" :title="t('messageSettings.editTitle',{name:current?t(`messageSettings.type${current.id}`):''})" :ok-text="t('messageSettings.confirm')" :cancel-text="t('messageSettings.cancel')" :on-before-ok="save" @cancel="current=undefined">
<a-form :model="{ roles }" layout="vertical"><a-form-item :label="t('messageSettings.roles')" required :help="invalid&&!roles.length?t('messageSettings.required'):''" :validate-status="invalid&&!roles.length?'error':undefined"><a-checkbox-group v-model="roles" direction="vertical"><a-checkbox v-for="role in ROLE_CODES" :key="role" :value="role">{{ t(`messageSettings.${role}`) }}</a-checkbox></a-checkbox-group></a-form-item></a-form>
</a-modal>
</section>
</template>
<style scoped>
.settings{padding:16px;background:var(--app-surface);min-width:0}.toolbar{margin-bottom:20px}.toolbar>.arco-alert{line-height:24px}.toolbar :deep(.arco-alert-action){flex-shrink:0}.settings :deep(.arco-table-th),.settings :deep(.arco-table-td){font-weight:400}
</style>
