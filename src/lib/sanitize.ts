/**
 * Sanitização de dados para o Firestore.
 *
 * Regras:
 * 1. Remove todas as chaves cujo valor seja `undefined` (Firestore rejeita).
 * 2. Substitui `NaN` por `0`.
 * 3. Substitui `Infinity` / `-Infinity` por `0`.
 * 4. Processa recursivamente objetos e arrays.
 * 5. Nunca remove chaves com valor `null` (Firestore aceita null).
 * 6. Arrays: filtra itens `undefined`, substitui `NaN`/`Infinity` por `0`.
 */
export function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return null as unknown as T;
  if (typeof v === "number") {
    if (!isFinite(v) || isNaN(v)) return 0 as unknown as T;
    return v;
  }
  if (typeof v !== "object") return v;

  if (Array.isArray(v)) {
    return v
      .filter((item) => item !== undefined)
      .map((item) => sanitize(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val === undefined) continue;          // Remove undefined
    result[k] = sanitize(val);
  }
  return result as T;
}
