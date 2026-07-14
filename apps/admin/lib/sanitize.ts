/**
 * Strip Mongo / server-only fields before admin writes.
 * Zod ignores unknown keys, but cleaning keeps payload schemas tidy.
 */
export function stripMeta<T extends Record<string, unknown>>(
  doc: T,
): Omit<T, '_id'> {
  const copy = { ...doc };
  delete copy._id;
  return copy;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
