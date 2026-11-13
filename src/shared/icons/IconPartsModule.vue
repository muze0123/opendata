<script setup lang="ts">
/**
 * 基础数据库 · 零部件：模块化组件 / 芯片。
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
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </svg>
</template>
