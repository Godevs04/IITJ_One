/**
 * Shared shape for local-only user data (Mess QR, Laundry prefs, favorites,
 * search history, ...). Today every implementation is on-device
 * (AsyncStorage settings + FileSystem for binary assets). A future
 * cloud-backed implementation can satisfy the same interface — swapping the
 * provider — without any UI changes.
 */
export interface LocalStore<T> {
  get(): Promise<T>;
  save(value: T): Promise<void>;
}
