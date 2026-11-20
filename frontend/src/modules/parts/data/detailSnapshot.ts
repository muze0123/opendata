import { emptyPart, seedPart, type Part } from './parts';

const prefix = 'opendata:part-detail:';

/** Preserve a read-only record across tabs until a detail API is available.
 *  File objects cannot be serialized; only the attachment name survives the cache. */
export function cachePartDetail(part: Part): void {
  const safe: Part = {
    ...part,
    certificateFile: part.certificateFile ? { name: part.certificateFile.name } : undefined,
    brandFile: part.brandFile ? { name: part.brandFile.name } : undefined,
  };
  localStorage.setItem(`${prefix}${part.id}`, JSON.stringify(safe));
}

export function readPartDetail(id: string): Part | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(`${prefix}${id}`) ?? 'null');
    if (!value || value.id !== id || typeof value.code !== 'string' || typeof value.name !== 'string') return;
    return { ...emptyPart(), ...seedPart(value) };
  } catch { return; }
}
