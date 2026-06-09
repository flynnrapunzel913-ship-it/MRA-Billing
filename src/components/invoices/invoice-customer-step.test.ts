import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("invoice customer step persistence guard", () => {
  it("does not persist customers before invoice creation", () => {
    const source = readFileSync(join(here, "invoice-customer-step.tsx"), "utf8");

    expect(source).not.toContain("prepareCustomerStep");
    expect(source).not.toContain('method: "POST"');
    expect(source).not.toContain('fetch("/api/customers",');
    expect(source).toContain("Customer is saved when the invoice is created");
  });
});
