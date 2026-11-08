export const STATUS_CODES = ['draft', 'reviewing', 'completed', 'rejected'] as const;
export interface Certificate {
  id: string;
  code: string;
  project: string;
  regulation: string;
  issuer: string;
  authority: string;
  issued: string;
  expires: string;
  status: typeof STATUS_CODES[number];
}
export const certificates: Certificate[] = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1).padStart(4, '0'),
  code: `CERT-2024-${String(i + 1).padStart(3, '0')}`,
  project: ['PROJ-0001', 'PROJ-0012', 'PROJ-0003'][i % 3]!,
  regulation: ['GB-2024-001', 'EU-2023-011', 'ECE-R43'][i % 3]!,
  issuer: '中汽研', authority: ['中汽研', 'TÜV 南德', 'SGS'][i % 3]!,
  issued: '2024-01-10', expires: '2027-01-09', status: STATUS_CODES[i % 4]!,
}));
