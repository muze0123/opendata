import type { Vehicle } from './vehicles';
export const COUNTRY_CODES = ['china', 'germany', 'usa', 'brazil', 'southAfrica', 'australia'] as const;
export function today() { return new Date().toLocaleDateString('sv-SE'); }
export function validateVehicle(input: Pick<Vehicle, 'code' | 'effective' | 'region' | 'owner' | 'description'>, production: boolean, existing: Vehicle[], directory: string, pattern: string, users: string[]): string {
  if (!input.code.trim() || !input.effective || (production && !input.region)) return 'required';
  if (production && !/^[A-HJ-NPR-Z0-9]{17}$/.test(input.code)) return 'vinError';
  if (!production && input.code.length > 50) return 'codeLength';
  if (production && pattern && !new RegExp(pattern).test(input.code)) return 'vinPattern';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effective) || !Number.isFinite(Date.parse(input.effective)) || new Date(input.effective).toISOString().slice(0, 10) !== input.effective) return 'invalidDate';
  if (input.effective < today()) return 'pastDate';
  if (production && !COUNTRY_CODES.includes(input.region as typeof COUNTRY_CODES[number])) return 'invalidCountry';
  if (production && input.owner && !users.includes(input.owner)) return 'invalidOwner';
  if (input.description.length > 500) return 'descriptionLength';
  if (existing.some(row => row.directory === directory && row.code === input.code.trim())) return 'duplicate';
  return '';
}
