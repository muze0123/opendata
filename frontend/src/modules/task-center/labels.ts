import { useI18n } from 'vue-i18n';
import type { TaskAppCode, TaskProjectCode } from './data/tasks';

/**
 * 任务模块的枚举字典渲染。
 *
 * 为什么「一个枚举一个函数」而不是通用的 t(namespace, code)：
 * key 用模板串写死前缀，`scripts/i18n.mjs` 才能把它识别成
 * `tasks.appLabels.<code>` 这样的动态 key 模式，继续守住"字典不许漏项"。
 * 一旦包成通用函数，前缀就变成运行时变量，提取脚本再也看不到它。
 *
 * 字典缺项时返回 code 本身，而不是 `tasks.appLabels.xxx` 这样的 key 路径：
 * 界面上看到 code 能立刻判断是枚举值没配文案，看到 key 路径只会被当成乱码。
 */
export function useTaskLabels() {
  const { t, te } = useI18n({ useScope: 'global' });

  function appLabel(code: TaskAppCode): string {
    const key = `tasks.appLabels.${code}`;
    return te(key) ? t(key) : code;
  }

  function projectLabel(code: TaskProjectCode): string {
    const key = `tasks.projectLabels.${code}`;
    return te(key) ? t(key) : code;
  }

  return { appLabel, projectLabel };
}
