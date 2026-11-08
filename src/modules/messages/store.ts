import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
export const EXCEPTION_CODES = ['sync_failed', 'quality_alert', 'license_expiring'] as const;
export const REMINDER_CODES = ['task_assigned', 'export_ready', 'review_pending'] as const;
export type MessageCode = typeof EXCEPTION_CODES[number] | typeof REMINDER_CODES[number];
export interface PlatformMessage { id: string; type: MessageCode; announcement: boolean; read: boolean; time: string; resource: string }
export const useMessagesStore = defineStore('platform-messages', () => {
  const codes = [...EXCEPTION_CODES, ...REMINDER_CODES];
  const records = ref<PlatformMessage[]>(Array.from({ length: 26 }, (_, i) => ({ id: `MSG-${i + 1}`, type: codes[i % codes.length]!, announcement: i > 23, read: i % 4 === 0, time: `2026-11-${String(7 - Math.floor(i / 6)).padStart(2, '0')} ${String(16 - i % 6).padStart(2, '0')}:30`, resource: `DATA-${String(101 + i)}` })));
  const unread = computed(() => records.value.filter(x => !x.read).length);
  const arrival = ref<PlatformMessage | null>(null);
  function simulate() {
    const now = new Date();
    const item: PlatformMessage = { id: `MSG-${Date.now()}`, type: 'sync_failed', announcement: false, read: false, time: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, resource: 'DATA-128' };
    records.value.unshift(item); arrival.value = item;
  }
  return { records, unread, arrival, simulate };
});
