import type { Composer } from "vue-i18n";
export const nodeLabel = (t: Composer["t"], code: string) =>
  t(`workflow.nodes.${code}`);
export const typeLabel = (t: Composer["t"], code: string) =>
  t(`workflow.types.${code}`);
export const valueLabel = (t: Composer["t"], code: string) =>
  t(`workflow.values.${code}`);
export const fieldLabel = (t: Composer["t"], code: string) =>
  t(`workflow.fields.${code}`);
export const roleLabel = (t: Composer["t"], code: string) =>
  t(`workflow.projectRoles.${code}`);
