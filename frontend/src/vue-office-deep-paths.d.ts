/**
 * @vue-office 深路径 ESM 构建的模块声明。
 * 该包已从 vite optimizeDeps 排除（预打包 chunk 图 bug，见 vite.config.ts），
 * 应用直接按 .mjs 深路径引入；包自身 d.ts 未覆盖深路径，这里补最小类型。
 */
declare module '@vue-office/pdf/lib/v3/vue-office-pdf.mjs' {
  import type { DefineComponent } from 'vue';
  const OfficePdf: DefineComponent<{ src: string; [key: string]: unknown }>;
  export default OfficePdf;
}

declare module '@vue-office/docx/lib/v3/vue-office-docx.mjs' {
  import type { DefineComponent } from 'vue';
  const OfficeDocx: DefineComponent<{ src: string; [key: string]: unknown }>;
  export default OfficeDocx;
}
