import type { Composer } from 'vue-i18n';
import type { ACTION_CODES, MODULE_CODES } from './data/roles';
export function actionLabel(t: Composer['t'], code: typeof ACTION_CODES[number]) { return t(`roleManagement.actions.${code}`); }
export function moduleLabel(t: Composer['t'], code: typeof MODULE_CODES[number]) { return t(`roleManagement.modules.${code}`); }
