import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("invoice wizard customer lifecycle", () => {
  it("does not call customer persistence when advancing steps", () => {
    const source = readFileSync(join(here, "invoice-wizard.tsx"), "utf8");

    expect(source).not.toContain("prepareCustomerStep");
    expect(source).not.toContain('fetch("/api/customers"');
    expect(source).toContain("validateCustomerStep");
    expect(source).toContain("sanitizeMobileInput(customerMobile)");
  });
});
