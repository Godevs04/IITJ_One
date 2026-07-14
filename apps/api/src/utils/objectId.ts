import { ObjectId } from '../db';

/** Strict ObjectId check (rejects truncated / non-hex strings that `isValid` accepts). */
export function isStrictObjectId(id: string): boolean {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}
