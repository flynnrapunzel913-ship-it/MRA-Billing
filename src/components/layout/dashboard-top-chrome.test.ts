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
  it("uses two-row chrome with true-centered title and navigation", () => {
    const floatingHeader = readFileSync(join(layoutDir, "floating-header.tsx"), "utf8");
    const dashboardShell = readFileSync(join(layoutDir, "dashboard-shell.tsx"), "utf8");
    const navDock = readFileSync(join(layoutDir, "nav-dock.tsx"), "utf8");
    const adminShell = readFileSync(join(layoutDir, "admin-dashboard-shell.tsx"), "utf8");

    expect(globalsCss).toContain(".dashboard-top-chrome");
    expect(globalsCss).toContain("--dashboard-chrome-z");

    expect(floatingHeader).toContain("grid-cols-[1fr_auto_1fr]");
    expect(floatingHeader).toContain("AcademyLogo");
    expect(floatingHeader).toContain("Billing System");
    expect(floatingHeader).toContain("SessionControlPill");
    expect(floatingHeader).not.toContain("bg-transparent");
    expect(floatingHeader).not.toContain("sticky top-0");

    expect(dashboardShell).toContain("dashboard-top-chrome");
    expect(dashboardShell).toContain("max-w-[1400px]");
    expect(dashboardShell).toContain("FloatingHeader");
    expect(dashboardShell).toContain("NavDock");
    expect(dashboardShell).not.toContain("row-span");

    expect(navDock).toContain("w-fit");
    expect(navDock).toContain("mx-auto");
    expect(navDock).toContain("justify-center");

    expect(adminShell).not.toContain("dashboard-top-chrome");
  });
});
