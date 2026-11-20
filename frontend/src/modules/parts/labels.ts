import type { Composer } from 'vue-i18n';
import type { Part, SoftwareVersion } from './data/parts';
export function levelLabel(t: Composer['t'], code: Part['level']) { return code ? t(`parts.levels.${code}`) : '—'; }
export function developmentLabel(t: Composer['t'], code: Part['development']) { return code ? t(`parts.developments.${code}`) : '—'; }
export function scanLabel(t: Composer['t'], code: SoftwareVersion['scan']) { return t(`parts.scans.${code}`); }
