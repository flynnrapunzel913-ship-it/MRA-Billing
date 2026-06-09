import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layoutDir = dirname(fileURLToPath(import.meta.url));
const globalsCss = readFileSync(
  join(layoutDir, "../../app/globals.css"),
  "utf8"
);

describe("dashboard top chrome layout", () => {
  it("uses absolute sides with viewport-centered title and navigation stack", () => {
    const dashboardShell = readFileSync(join(layoutDir, "dashboard-shell.tsx"), "utf8");
    const floatingHeader = readFileSync(join(layoutDir, "floating-header.tsx"), "utf8");
    const navDock = readFileSync(join(layoutDir, "nav-dock.tsx"), "utf8");
    const adminShell = readFileSync(join(layoutDir, "admin-dashboard-shell.tsx"), "utf8");

    expect(globalsCss).toContain(".dashboard-top-chrome");
    expect(globalsCss).toContain("--dashboard-chrome-z");

    expect(dashboardShell).toContain("dashboard-top-chrome");
    expect(dashboardShell).toContain("absolute left-0 top-1/2");
    expect(dashboardShell).toContain("absolute right-0 top-1/2");
    expect(dashboardShell).toContain("absolute left-1/2 top-0");
    expect(dashboardShell).toContain("-translate-x-1/2");
    expect(dashboardShell).toContain("flex-col items-center");
    expect(dashboardShell).not.toContain("grid-cols-[1fr_auto_1fr]");
    expect(dashboardShell).not.toContain("row-span");

    expect(floatingHeader).toContain("Billing System");
    expect(floatingHeader).not.toContain("SessionControlPill");

    expect(navDock).toContain("justify-center");
    expect(navDock).not.toContain("col-span-3");

    expect(adminShell).not.toContain("dashboard-top-chrome");
  });
});
