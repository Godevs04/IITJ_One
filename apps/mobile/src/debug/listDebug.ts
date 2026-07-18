type RuntimeDebugContext = {
  route: string;
  screen: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __IITJ_ONE_RUNTIME_DEBUG_CONTEXT__: RuntimeDebugContext | undefined;
}

function getRuntimeDebugContext(): RuntimeDebugContext | undefined {
  return globalThis.__IITJ_ONE_RUNTIME_DEBUG_CONTEXT__;
}

function formatKey(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
}

export function setRuntimeDebugContext(context: RuntimeDebugContext): void {
  if (!__DEV__) return;
  globalThis.__IITJ_ONE_RUNTIME_DEBUG_CONTEXT__ = context;
}

export function debugListKeys<T>(
  componentName: string,
  listName: string,
  items: readonly T[],
  keyForItem: (item: T, index: number) => unknown,
): void {
  if (!__DEV__) return;

  const keys = items.map((item, index) => {
    try {
      return keyForItem(item, index);
    } catch (error) {
      return `[[key-error:${error instanceof Error ? error.message : String(error)}]]`;
    }
  });

  const formattedKeys = keys.map(formatKey);
  const duplicateKeys = formattedKeys.filter((key, index) => formattedKeys.indexOf(key) !== index);
  const uniqueDuplicateKeys = Array.from(new Set(duplicateKeys));
  const undefinedKeys = keys.filter((key) => key === undefined).length;
  const nullKeys = keys.filter((key) => key === null).length;
  const hasErrors = uniqueDuplicateKeys.length > 0 || undefinedKeys > 0 || nullKeys > 0;

  if (hasErrors) {
    const context = getRuntimeDebugContext();
    console.warn(`⚠️ [${componentName}] ${listName} key validation failed!`);
    console.warn(`  route=${context?.route ?? 'unknown'}`);
    console.warn(`  screen=${context?.screen ?? 'unknown'}`);
    console.warn(`  length=${items.length}`);
    console.warn(`  duplicates=${uniqueDuplicateKeys.join(', ')}`);
    console.warn(`  undefinedKeys=${undefinedKeys}`);
    console.warn(`  nullKeys=${nullKeys}`);
    console.warn(`  keys:`, formattedKeys);
  }
}

export function debugKeyExtractor<T>(
  componentName: string,
  listName: string,
  item: T,
  index: number,
  keyForItem: (item: T, index: number) => unknown,
): unknown {
  if (!__DEV__) {
    return keyForItem(item, index);
  }

  const key = keyForItem(item, index);
  const formattedKey = formatKey(key);

  if (key === null || key === undefined) {
    const context = getRuntimeDebugContext();
    console.warn(`⚠️ [${componentName}] ${listName} keyExtractor returned null or undefined!`);
    console.warn(`  route=${context?.route ?? 'unknown'}`);
    console.warn(`  screen=${context?.screen ?? 'unknown'}`);
    console.warn(`  index=${index}`);
    console.warn(`  key=${formattedKey}`);
  }

  return key;
}