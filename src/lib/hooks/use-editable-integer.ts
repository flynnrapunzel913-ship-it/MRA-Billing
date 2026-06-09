import { useCallback, useEffect, useState } from "react";
import {
  commitIntegerInput,
  effectiveIntegerValue,
  parsePositiveIntInput,
} from "@/lib/numeric-input";

type UseEditableIntegerOptions = {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  /** Applied when the field is left empty on blur. Defaults to `min`. */
  emptyFallback?: number;
};

/**
 * Controlled integer input that allows temporary empty draft text while editing.
 * Commits parsed values on valid keystrokes; enforces minimum on blur.
 */
export function useEditableInteger({
  value,
  onCommit,
  min = 1,
  emptyFallback,
}: UseEditableIntegerOptions) {
  const [draft, setDraft] = useState<string | null>(null);
  const fallback = emptyFallback ?? min;

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const displayValue = draft ?? String(value);

  const handleChange = useCallback(
    (raw: string) => {
      if (raw !== "" && !/^\d+$/.test(raw)) return;
      setDraft(raw);
      if (raw === "") return;
      const parsed = parsePositiveIntInput(raw);
      if (parsed !== null && parsed >= min) {
        onCommit(parsed);
      }
    },
    [min, onCommit]
  );

  const handleBlur = useCallback(() => {
    if (draft === null) return;
    onCommit(commitIntegerInput(draft, { min, emptyFallback: fallback }));
    setDraft(null);
  }, [draft, fallback, min, onCommit]);

  const effectiveValue = effectiveIntegerValue(value, draft);

  return {
    displayValue,
    effectiveValue,
    handleChange,
    handleBlur,
  };
}
