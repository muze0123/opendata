<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * 角色列文本：无标签底色，多个角色用「、」连接；
 * 宽度不够时按实际可用宽度截断，尾部用「+n」灰底胶囊补齐（2026-11-06 用户裁决）。
 *
 * 截断尺寸不靠字符数猜：容器宽度由 ResizeObserver 取真实内容宽，
 * 文本宽度用与单元格同字体的 canvas 度量，逐个减少可见角色直到「文本 + 间距 + +n 胶囊」放得下。
 */
const props = defineProps<{ names: string[] }>();

const SEPARATOR = '、';
const BADGE_GAP = 6;
const BADGE_PADDING = 12;

const cell = ref<HTMLElement | null>(null);
const available = ref(0);
let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!cell.value) return;
  observer = new ResizeObserver((entries) => {
    available.value = entries[0]?.contentRect.width ?? 0;
  });
  observer.observe(cell.value);
});

onBeforeUnmount(() => observer?.disconnect());

let context: CanvasRenderingContext2D | null = null;
function textWidth(text: string, font: string): number {
  if (!context) context = document.createElement('canvas').getContext('2d');
  if (!context) return text.length * 14;
  context.font = font;
  return context.measureText(text).width;
}

const parts = computed<{ text: string; more: number }>(() => {
  const names = props.names;
  if (!names.length) return { text: '', more: 0 };
  const full = names.join(SEPARATOR);
  const width = available.value;
  const node = cell.value;
  if (!width || !node) return { text: full, more: 0 };

  const font = getComputedStyle(node).font;
  if (textWidth(full, font) <= width) return { text: full, more: 0 };

  for (let keep = names.length - 1; keep >= 1; keep -= 1) {
    const text = names.slice(0, keep).join(SEPARATOR);
    const badge = `+${names.length - keep}`;
    const needed = textWidth(text, font) + BADGE_GAP + textWidth(badge, font) + BADGE_PADDING;
    if (needed <= width) return { text, more: names.length - keep };
  }
  // 极端窄列：至少保留第一个角色
  return { text: names[0], more: Math.max(names.length - 1, 0) };
});

const fullTitle = computed(() => props.names.join(SEPARATOR));
</script>

<template>
  <span ref="cell" class="role-list" :title="fullTitle">
    <span class="role-list-text">{{ parts.text }}</span>
    <span v-if="parts.more > 0" class="role-list-more">+{{ parts.more }}</span>
  </span>
</template>

<style scoped>
.role-list {
  display: flex; align-items: center; gap: 6px;
  min-width: 0; max-width: 100%;
  font-size: 14px; line-height: 22px;
}
.role-list-text {
  flex: 0 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--color-text-1);
}
/* 「+n」为灰底胶囊，角色名本身不带任何底色 */
.role-list-more {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  height: 20px; padding: 0 6px;
  border-radius: 4px;
  background: var(--color-fill-2);
  color: var(--color-text-2);
  font-size: 12px; line-height: 20px;
  white-space: nowrap;
}
</style>
