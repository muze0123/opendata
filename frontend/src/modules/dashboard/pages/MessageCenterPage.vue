<script setup lang="ts">
import { messageTypeLabel, messageDetailLabel } from "../../messages/labels";
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPagination from '../../../design/components/AppPagination.vue';
import { useMessagesStore, EXCEPTION_CODES, REMINDER_CODES, type PlatformMessage } from '../../messages/store';
const { t } = useI18n();
const store = useMessagesStore();
const tab = ref('notifications');
const onlyUnread = ref(false);
const page = ref(1);
const pageSize = ref(10);
const search = ref('');
const type = ref('all');
const dates = ref<string[]>([]);
const selected = ref<PlatformMessage | null>(null);
const detailOpen = ref(false);
const types = [...EXCEPTION_CODES, ...REMINDER_CODES];
const filtered = computed(() => store.records.filter(x => x.announcement === (tab.value === 'announcements') && (!onlyUnread.value || x.read === false) && (type.value === 'all' || x.type === type.value) && (!dates.value?.length || (x.time.slice(0, 10) >= dates.value[0]! && x.time.slice(0, 10) <= dates.value[1]!)) && `${x.resource} ${x.announcement ? t('mc.release') : messageTypeLabel(t, x.type)} ${messageDetailLabel(t, x.type)}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
const unreadFiltered = computed(() => filtered.value.filter(x => !x.read));
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
function count(announcement: boolean) { return store.records.filter(x => x.announcement === announcement && !x.read).length; }
function read(id: string) { const item = store.records.find(x => x.id === id); if (!item) return; item.read = true; selected.value = item; detailOpen.value = true; }
watch(tab, () => { onlyUnread.value = false; search.value = ''; type.value = 'all'; dates.value = []; page.value = 1; });
watch([onlyUnread, search, type, dates, pageSize], () => page.value = 1);
watch(() => filtered.value.length, n => page.value = Math.min(page.value, Math.max(1, Math.ceil(n / pageSize.value))));
</script>
<template>
  <section class="message-center" :aria-label="t('mc.title')">
    <div class="message-toolbar">
      <a-tabs v-model:active-key="tab"><a-tab-pane key="notifications"><template #title>{{ t('mc.notifications') }} <a-badge v-if="count(false)" :count="count(false)" /></template></a-tab-pane><a-tab-pane key="announcements"><template #title>{{ t('mc.announcements') }} <a-badge v-if="count(true)" :count="count(true)" /></template></a-tab-pane><template #extra><router-link to="/settings/messages">{{ t('mc.settings') }}</router-link></template></a-tabs>
    </div>
    <div v-if="tab === 'notifications'" class="list-toolbar"><div class="message-actions filters">
      <a-input-search v-model="search" allow-clear :placeholder="t('mc.search')" :aria-label="t('mc.search')" />
      <a-select v-model="type" :aria-label="t('mc.type')"><a-option value="all">{{ t('mc.all') }}</a-option><a-option v-for="code in types" :key="code" :value="code">{{ messageTypeLabel(t, code) }}</a-option></a-select>
      <a-range-picker v-model="dates" :aria-label="t('mc.dateRange')" />
    </div><div v-if="tab === 'notifications'" class="message-actions"><a-checkbox v-model="onlyUnread">{{ t('mc.onlyUnread') }}</a-checkbox><a-button :disabled="!unreadFiltered.length" @click="unreadFiltered.forEach(x => x.read = true)">{{ t('mc.markAll', { count: unreadFiltered.length }) }}</a-button></div></div>
    <div class="message-list"><button v-for="item in visible" :key="item.id" class="message-row" :class="{ 'is-read': item.read }" aria-haspopup="dialog" @click="read(item.id)"><span class="read-dot" :class="{ hidden: item.read }" /><span class="message-body"><span>{{ item.announcement ? t('mc.release') : messageTypeLabel(t, item.type) }} · {{ item.resource }}</span><span  class="message-description">{{ item.announcement ? t('mc.releaseDetail') : messageDetailLabel(t, item.type) }}</span></span><time>{{ item.time }}</time></button><a-empty v-if="!visible.length" :description="t('mc.empty')" /></div>
    <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="filtered.length" />
    <a-modal v-model:visible="detailOpen" :title="t('mc.detail')" :width="640" :footer="false">
      <article v-if="selected" class="message-detail"><p class="detail-title">{{ selected.announcement ? t('mc.release') : messageTypeLabel(t, selected.type) }} · {{ selected.resource }}</p><time>{{ selected.time }}</time><p class="detail-content">{{ selected.announcement ? t('mc.releaseDetail') : messageDetailLabel(t, selected.type) }}</p></article>
      <div class="detail-footer"><a-button @click="detailOpen = false">{{ t('mc.close') }}</a-button></div>
    </a-modal>
  </section>
</template>
<style scoped>
.message-center { background: var(--app-surface); min-height: calc(100dvh - 88px); padding: 0 24px 24px; margin-left: 0; }
.message-toolbar,.list-toolbar,.message-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.message-toolbar :deep(.arco-tabs) { width:100%; min-width:0; }
.message-toolbar :deep(.arco-tabs-nav-extra) { padding-left:var(--mt-ds-space-4); }
.message-toolbar a { color:var(--app-accent); text-decoration:none; }
.list-toolbar { padding:20px 0; color:var(--color-text-2); }
.message-row { width:100%; display:flex; align-items:baseline; gap:12px; padding:20px 12px; border:0; border-bottom:1px solid var(--app-divider); background:transparent; color:var(--color-text-1); text-align:left; font:inherit; font-weight:400; cursor:pointer; }
.message-row:hover { background:var(--color-fill-1); }
.message-row:focus-visible { outline:2px solid var(--app-accent); outline-offset:-2px; }
.read-dot { width:8px; height:8px; border-radius:50%; background:var(--app-accent); flex:none; }
.hidden { visibility:hidden; }
.message-body { flex:1; min-width:0; overflow-wrap:anywhere; }
.message-description { display:block; margin-top:8px; color:var(--color-text-2); line-height:1.7; white-space:pre-line; }
.filters { justify-content:flex-start; flex:1; }
.filters :deep(.arco-input-wrapper) { width:220px; }
.filters :deep(.arco-select-view) { width:160px; }
.filters :deep(.arco-picker-range) { width:280px; }
.message-detail { padding:var(--mt-ds-space-2) 0; }
.detail-title { font-size:var(--mt-ds-font-title); margin:0 0 var(--mt-ds-space-3); }
.detail-content { white-space:pre-line; line-height:var(--mt-ds-line-body); margin:var(--mt-ds-space-6) 0; color:var(--color-text-2); }
.detail-footer { display:flex; justify-content:flex-end; border-top:1px solid var(--app-divider); padding-top:var(--mt-ds-space-4); }
.is-read { color:var(--color-text-3); }
time { flex:none; font-family:monospace; color:var(--color-text-3); font-size:12px; }
.message-pagination { display:flex; justify-content:flex-end; padding-top:24px; }
@media(max-width:760px) { .message-center { margin:0; padding:0 16px 16px; } .message-row { flex-wrap:wrap; } time { margin-left:20px; } }
</style>
