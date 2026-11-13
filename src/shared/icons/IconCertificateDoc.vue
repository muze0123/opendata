<script setup lang="ts">
/**
 * 基础数据库 · 证书：认证文书 + 圆形印章与绶带。
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
    <rect x="3" y="3" width="18" height="12" rx="2" />
    <path d="M6 6h12M6 9h9" />
    <circle cx="12" cy="18" r="3" />
    <path d="M10 20l-1 3 3-1 3 1-1-3" />
  </svg>
</template>
