/** Initial configurations are supplied by their owning business modules. */
export interface NumberingRule {
  id: string;
  /** Ordered menu / feature label keys from the owning module. */
  locationKeys: readonly string[];
  fixedCharacters: string | null;
  variableCharacters: string | null;
  fixedYear: number | null;
  sequenceDigits: number;
  /** Supplied by the owner: composition order is a business rule. */
  previewExample: string;
}

// Local display fixtures; these are not backend business configurations.
const modules = ['parts', 'controllers', 'vehicles', 'software', 'interfaces', 'sensors',
  'projects', 'activities', 'risks', 'tests', 'reports', 'documents'] as const;
export const numberingRules: readonly NumberingRule[] = modules.map((module, index) => {
  const fixedCharacters = ['PART', 'ECU', 'VEH', 'SW', 'IF', 'SEN', 'PRJ', 'ACT', 'RSK', 'TST', 'RPT', 'DOC'][index]!;
  const fixedYear = index % 3 === 0 ? null : 2026;
  const sequenceDigits = index % 2 === 0 ? 4 : 6;
  return {
    id: 'mock-' + module,
    locationKeys: ['nav.data', 'numbering.modules.' + module],
    fixedCharacters,
    variableCharacters: index % 2 === 0 ? 'CN' : null,
    fixedYear,
    sequenceDigits,
    previewExample: [fixedCharacters, index % 2 === 0 ? 'CN' : null, fixedYear,
      '1'.padStart(sequenceDigits, '0')].filter(value => value !== null).join('-'),
  };
});
