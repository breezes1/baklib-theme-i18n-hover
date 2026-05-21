export function getByPath(obj: unknown, dotPath: string): string | undefined {
  if (!obj || !dotPath) {
    return undefined;
  }

  const value = dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

  return typeof value === 'string' ? value : undefined;
}
