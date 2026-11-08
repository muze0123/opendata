import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Part, Segment } from '../data/parts';
export const usePartsStore = defineStore('parts', () => {
  const rows = ref<Part[]>([]);
  const initialized = ref(false);
  const custom = ref(false);
  const lockedSegments = ref<Segment[]>([]);
  const lockedSeparator = ref('-');
  const lockedDigits = ref(4);
  const serial = ref(1);
  return { rows, initialized, custom, lockedSegments, lockedSeparator, lockedDigits, serial };
});
