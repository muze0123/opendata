<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconScan } from '@arco-design/web-vue/es/icon';
import { settings, ROLE_CODES, type Setting, type Role } from '../data/settings';
const { t } = useI18n(); const router = useRouter();
const rows = reactive(settings.map(r => ({ ...r, roles: [...r.roles] })));
const current = ref<Setting>(); const roles = ref<Role[]>([]); const channel = ref(false); const binding = ref(false); const invalid = ref(false);
const columns = computed(() => ['name','description','bubble','inbox','channel','roles','actions'].map((key,i) => ({title:t(`messageSettings.${key}`),slotName:key,width:[180,320,140,150,180,190,80][i]})));
function toggle(row:Setting,key:'bubble'|'inbox',value:boolean) {row[key]=value;if(key==='bubble'&&value)row.inbox=true;if(key==='inbox'&&!value)row.bubble=false;Message.success(t('messageSettings.saved'));}
function edit(row:Setting){current.value=row;roles.value=[...row.roles];channel.value=row.wechat;invalid.value=false;}
function save(){if(!roles.value.length){invalid.value=true;Message.error(t('messageSettings.required'));return false;}if(current.value){current.value.roles=[...roles.value];current.value.wechat=channel.value;}current.value=undefined;Message.success(t('messageSettings.saved'));return true;}
function changeChannel(value:boolean){if(value){Message.warning(t('messageSettings.first'));binding.value=true;}else channel.value=false;}
</script>
<template>
<section class="settings" :aria-label="t('messageSettings.title')">
<div class="toolbar"><a-alert type="warning"><div>{{ t('messageSettings.notice') }}</div><div>{{ t('messageSettings.rule') }}</div></a-alert><div class="actions"><a-button @click="binding=true">{{ t('messageSettings.bind') }}</a-button><a-button type="primary" @click="router.push('/messages')">{{ t('messageSettings.center') }}</a-button></div></div>
<a-table :columns="columns" :data="rows" row-key="id" :pagination="false" :bordered="false" :scroll="{x:1240}">
<template #name="{record}">{{ t(`messageSettings.type${record.id}`) }}</template>
<template #description="{record}">{{ t(`messageSettings.desc${record.id}`) }}</template>
<template #bubble="{record}"><a-tooltip :content="t('messageSettings.hint')"><a-switch :model-value="record.bubble" :aria-label="t(`messageSettings.type${record.id}`)+' '+t('messageSettings.bubble')" @change="toggle(record,'bubble',Boolean($event))" /></a-tooltip></template>
<template #inbox="{record}"><a-switch :model-value="record.inbox" :aria-label="t(`messageSettings.type${record.id}`)+' '+t('messageSettings.inbox')" @change="toggle(record,'inbox',Boolean($event))" /></template>
<template #channel="{record}"><div>{{ t('messageSettings.system') }}</div><div v-if="record.wechat" class="secondary">{{ t('messageSettings.wechat') }}</div></template>
<template #roles="{record}"><div v-for="role in record.roles" :key="role">{{ t(`messageSettings.${role}`) }}</div></template>
<template #actions="{record}"><a-button type="text" @click="edit(record)">{{ t('messageSettings.edit') }}</a-button></template>
</a-table>
<a-modal :visible="!!current" :title="t('messageSettings.editTitle',{name:current?t(`messageSettings.type${current.id}`):''})" :ok-text="t('messageSettings.confirm')" :cancel-text="t('messageSettings.cancel')" :on-before-ok="save" @cancel="current=undefined">
<a-form :model="{ roles, channel }" layout="vertical"><a-form-item :label="t('messageSettings.roles')" required :help="invalid&&!roles.length?t('messageSettings.required'):''" :validate-status="invalid&&!roles.length?'error':undefined"><a-checkbox-group v-model="roles" direction="vertical"><a-checkbox v-for="role in ROLE_CODES" :key="role" :value="role">{{ t(`messageSettings.${role}`) }}</a-checkbox></a-checkbox-group></a-form-item><a-form-item :label="t('messageSettings.channel')"><div class="channels"><a-checkbox :model-value="true" disabled>{{ t('messageSettings.system') }}</a-checkbox><a-checkbox :model-value="channel" @change="changeChannel(Boolean($event))">{{ t('messageSettings.wechat') }}</a-checkbox></div></a-form-item></a-form>
</a-modal>
<a-modal v-model:visible="binding" :title="t('messageSettings.binding')" :width="460" :footer="false" :mask-closable="true"><div class="binding"><div class="qr"><IconScan /><span>{{ t('messageSettings.placeholder') }}</span></div><p>{{ t('messageSettings.scan') }}</p><p>{{ t('messageSettings.follow') }}</p><a-alert>{{ t('messageSettings.unavailable') }}</a-alert><div class="features"><p>{{ t('messageSettings.features') }}</p><p>{{ t('messageSettings.feature1') }}</p><p>{{ t('messageSettings.feature2') }}</p></div></div></a-modal>
</section>
</template>
<style scoped>
.settings{padding:16px;background:var(--app-surface);min-width:0}.toolbar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px}.toolbar>.arco-alert{flex:1;min-width:280px;line-height:24px}.actions{display:flex;gap:8px;flex-wrap:wrap}.channels{display:grid;gap:12px}.secondary{color:var(--color-text-3)}.binding{text-align:center;max-height:60vh;overflow:auto}.qr{width:120px;height:120px;margin:8px auto 20px;background:var(--color-fill-2);color:var(--color-text-3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.qr svg{font-size:36px}.features{text-align:left;background:var(--color-fill-1);padding:12px 16px;margin-top:20px}.settings :deep(.arco-table-th),.settings :deep(.arco-table-td){font-weight:400}
</style>
