import type { Composer } from 'vue-i18n';
import type { MessageCode } from './store';
export function messageTypeLabel(t: Composer['t'], code: MessageCode) {
  return t(`mc.types.${code}`);
}
export function messageDetailLabel(t: Composer['t'], code: MessageCode) {
  return t(`mc.details.${code}`);
}
