import { defineConfig } from 'vite';
import process from 'node:process';
import vue from '@vitejs/plugin-vue';
import { vitePluginForArco } from '@arco-plugins/vite-vue';

export default defineConfig(({ command, isPreview }) => {
  const target = process.env.OPENDATA_API_TARGET || `http://127.0.0.1:${process.env.OPENDATA_PORT || '4320'}`;
  const token = command === 'serve' && !isPreview ? process.env.OPENDATA_DEV_TOKEN : undefined;
  const headers: Record<string, string> = {};
  if (token) {
    if (token.length < 24) throw new Error('OPENDATA_DEV_TOKEN must contain at least 24 characters');
    headers.Authorization = `Bearer ${token}`;
    headers['X-Dev-Tenant'] = process.env.OPENDATA_DEV_TENANT || 'local-tenant';
    headers['X-Dev-User'] = process.env.OPENDATA_DEV_USER || 'alice';
  }
  return {
    plugins: [vue(), vitePluginForArco({ style: 'css' })],
    optimizeDeps: {
      // 2026-11-20：@vue-office/* 进入依赖预打包图后，esbuild 0.25 splitting 产出的
      // 共享 chunk 缺失顶层 __esm 初始化调用（chunk-MAC4KXYT 顶层调 defineComponent 时
      // @vue/shared 的 init_* 从未执行），全站白屏报 isFunction is not a function。
      // 将其排除出预打包、由应用深路径直接引 ESM 构建，恢复迁移前的 chunk 图。
      exclude: ['@vue-office/pdf', '@vue-office/docx'],
    },
    server: {
      host: token ? '127.0.0.1' : '0.0.0.0',
      allowedHosts: token ? ['localhost', '127.0.0.1'] : true,
      proxy: {
        '/api/workflow': 'http://127.0.0.1:4318',
        '/api/opendata': { target, headers },
      },
    },
    preview: {
      host: '0.0.0.0', allowedHosts: true,
      proxy: { '/api/workflow': 'http://127.0.0.1:4318', '/api/opendata': { target } },
    },
  };
});
