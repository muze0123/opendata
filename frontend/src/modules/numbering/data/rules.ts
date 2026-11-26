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

/**
 * Local display fixtures for the modules that actually exist under 基础数据库.
 * The parts row mirrors that module's built-in segment editor defaults; the
 * certificate and regulation rows mirror their seeded code samples. No backend
 * business configuration is implied by these fixtures.
 */
export const numberingRules: readonly NumberingRule[] = [
  {
    id: 'mock-parts',
    locationKeys: ['nav.data', 'parts.title'],
    fixedCharacters: 'DDY',
    variableCharacters: 'ABCD',
    fixedYear: 2026,
    sequenceDigits: 4,
    previewExample: 'DDY-ABCD-2026-0001',
  },
  {
    id: 'mock-certificates',
    locationKeys: ['nav.data', 'certificates.title'],
    fixedCharacters: 'CERT',
    variableCharacters: null,
    fixedYear: 2024,
    sequenceDigits: 3,
    previewExample: 'CERT-2024-001',
  },
  {
    id: 'mock-regulations',
    locationKeys: ['nav.data', 'regulations.title'],
    fixedCharacters: 'GB',
    variableCharacters: null,
    fixedYear: 2024,
    sequenceDigits: 3,
    previewExample: 'GB-2024-001',
  },
];
