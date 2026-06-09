import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("invoice item row quantity input", () => {
  it("does not coerce empty quantity back to 1 on every keystroke", () => {
    const source = readFileSync(join(here, "invoice-item-row.tsx"), "utf8");

    expect(source).not.toContain("Number(e.target.value) || 1");
    expect(source).toContain("useEditableInteger");
    expect(source).toContain("QuantityInput");
  });
});
