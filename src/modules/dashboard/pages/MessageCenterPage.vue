<script setup lang="ts">
import { messageTypeLabel, messageDetailLabel } from "../../messages/labels";
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessagesStore } from '../../messages/store';
const { t } = useI18n();
const store = useMessagesStore();
const tab = ref('notifications');
const onlyUnread = ref(false);
const page = ref(1);
const expanded = ref<string[]>([]);
const filtered = computed(() => store.records.filter(x => x.announcement === (tab.value === 'announcements') && (!onlyUnread.value || x.read === false)));
const unreadFiltered = computed(() => filtered.value.filter(x => !x.read));
const visible = computed(() => tab.value === 'announcements' ? filtered.value : filtered.value.slice((page.value - 1) * 10, page.value * 10));
function count(announcement: boolean) { return store.records.filter(x => x.announcement === announcement && !x.read).length; }
function read(id: string) { const item = store.records.find(x => x.id === id); if (item) item.read = true; if (item?.announcement) expanded.value = expanded.value.includes(id) ? expanded.value.filter(x => x !== id) : [...expanded.value, id]; }
watch(tab, () => { onlyUnread.value = false; page.value = 1; });
watch(onlyUnread, () => page.value = 1);
watch(() => filtered.value.length, n => page.value = Math.min(page.value, Math.max(1, Math.ceil(n / 10))));
</script>
<template>
  <section class="message-center" :aria-label="t('mc.title')">
    <div class="message-toolbar">
      <a-tabs v-model:active-key="tab"><a-tab-pane key="notifications"><template #title>{{ t('mc.notifications') }} <a-badge v-if="count(false)" :count="count(false)" /></template></a-tab-pane><a-tab-pane key="announcements"><template #title>{{ t('mc.announcements') }} <a-badge v-if="count(true)" :count="count(true)" /></template></a-tab-pane></a-tabs>
      <div class="message-actions"><a-button @click="store.simulate()">{{ t('mc.simulate') }}</a-button><router-link to="/settings/messages">{{ t('mc.settings') }}</router-link></div>
    </div>
    <div class="list-toolbar"><span>{{ t('mc.total', { count: filtered.length }) }}</span><div v-if="tab === 'notifications'" class="message-actions"><a-checkbox v-model="onlyUnread">{{ t('mc.onlyUnread') }}</a-checkbox><a-button v-if="unreadFiltered.length" @click="unreadFiltered.forEach(x => x.read = true)">{{ t('mc.markAll', { count: unreadFiltered.length }) }}</a-button></div></div>
    <div class="message-list"><button v-for="item in visible" :key="item.id" class="message-row" :class="{ 'is-read': item.read }" :aria-expanded="item.announcement ? expanded.includes(item.id) : undefined" @click="read(item.id)"><span class="read-dot" :class="{ hidden: item.read }" /><span class="message-body"><span>{{ item.announcement ? t('mc.release') : messageTypeLabel(t, item.type) }} · {{ item.resource }}</span><span v-if="!item.announcement || expanded.includes(item.id)" class="message-description">{{ item.announcement ? t('mc.releaseDetail') : messageDetailLabel(t, item.type) }}</span><span class="read-label">{{ t(item.read ? 'mc.read' : 'mc.unread') }}</span></span><time>{{ item.time }}</time></button><a-empty v-if="!visible.length" :description="t('mc.empty')" /></div>
    <div v-if="tab === 'notifications'" class="message-pagination"><a-pagination v-model:current="page" :total="filtered.length" :page-size="10" show-total /></div>
  </section>
</template>
<style scoped>
.message-center { background: var(--app-surface); min-height: calc(100dvh - 88px); padding: 0 24px 24px; margin-left: 0; }
.message-toolbar,.list-toolbar,.message-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.message-toolbar :deep(.arco-tabs) { flex:1; min-width:280px; }
.message-toolbar a { color:var(--app-accent); text-decoration:none; }
.list-toolbar { padding:20px 0; color:var(--color-text-2); }
.message-row { width:100%; display:flex; align-items:baseline; gap:12px; padding:20px 12px; border:0; border-bottom:1px solid var(--app-divider); background:transparent; color:var(--color-text-1); text-align:left; font:inherit; font-weight:400; cursor:pointer; }
.message-row:hover { background:var(--color-fill-1); }
.message-row:focus-visible { outline:2px solid var(--app-accent); outline-offset:-2px; }
.read-dot { width:8px; height:8px; border-radius:50%; background:var(--app-accent); flex:none; }
.hidden { visibility:hidden; }
.message-body { flex:1; min-width:0; overflow-wrap:anywhere; }
.message-description { display:block; margin-top:8px; color:var(--color-text-2); line-height:1.7; white-space:pre-line; }
.read-label { display:block; margin-top:6px; font-size:12px; color:var(--color-text-3); }
.is-read { color:var(--color-text-3); }
time { flex:none; font-family:monospace; color:var(--color-text-3); font-size:12px; }
.message-pagination { display:flex; justify-content:flex-end; padding-top:24px; }
@media(max-width:760px) { .message-center { margin:0; padding:0 16px 16px; } .message-row { flex-wrap:wrap; } time { margin-left:20px; } }
</style>
