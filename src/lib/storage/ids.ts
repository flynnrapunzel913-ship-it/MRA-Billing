const CUID_PATTERN = /^c[a-z0-9]{24}$/i;

export function normalizeCuid(raw: string): string | null {
  const id = raw?.trim();
  if (!id || !CUID_PATTERN.test(id)) return null;
  return id;
}
