export function parsePositiveIntInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function commitIntegerInput(
  raw: string,
  options: { min: number; emptyFallback: number }
): number {
  const parsed = parsePositiveIntInput(raw);
  if (parsed === null || parsed < options.min) {
    return options.emptyFallback;
  }
  return parsed;
}

export function effectiveIntegerValue(
  committed: number,
  draft: string | null
): number {
  if (draft === null || draft === "") return committed;
  return parsePositiveIntInput(draft) ?? committed;
}
