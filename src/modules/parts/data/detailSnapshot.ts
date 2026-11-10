import { emptyPart, type Part } from './parts';
const prefix = 'opendata:part-detail:';
// Preserve a read-only record across tabs until a detail API is available.
export function cachePartDetail(part: Part): void {
  localStorage.setItem(`${prefix}${part.id}`, JSON.stringify(part));
}
export function readPartDetail(id: string): Part | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(`${prefix}${id}`) ?? 'null');
    if (!value || value.id !== id || typeof value.code !== 'string' || typeof value.name !== 'string') return;
    return { ...emptyPart(), ...value };
  } catch { return; }
}
