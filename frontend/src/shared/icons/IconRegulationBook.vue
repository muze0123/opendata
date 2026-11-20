<script setup lang="ts">
/**
 * 基础数据库 · 法规：条文法典（展开的卷册）。
 * 24×24 线性网格，坐标落在 3 的倍数上，16px 渲染时描边缩放为 1px 整像素。
 * 描边使用 currentColor，颜色由菜单项继承（选中态自动跟随品牌青）。
 */
withDefaults(defineProps<{ size?: number | string }>(), { size: 16 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 6C9 3 6 3 3 3v15c3 0 6 0 9 3 3-3 6-3 9-3V3c-3 0-6 0-9 3z" />
    <path d="M12 6v15" />
    <path d="M15 9h3M15 12h3" />
  </svg>
</template>
