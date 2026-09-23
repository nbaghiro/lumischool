// Chrome covers desktop, tablet and phone layouts; WebKit also exercises the phone browser engine.
// Run `npx playwright install webkit` before the phone-webkit project.

import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** The installed Chrome, with a profile Playwright makes and deletes itself, and no component updates. */
const CHROME = {
    browserName: "chromium" as const,
    channel: "chrome",
    launchOptions: { args: ["--disable-component-update"] },
};

export default defineConfig({
    testDir: import.meta.dirname,
    testMatch: /.*\.e2e\.ts$/,
    globalSetup: join(import.meta.dirname, "ready.ts"),
    outputDir: join(tmpdir(), "lumischool-e2e"),
    workers: 1,
    fullyParallel: false,
    reporter: "list",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.E2E_BASE ?? "http://localhost:8500",
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "phone-webkit",
            use: {
                ...devices["iPhone 15"],
                browserName: "webkit",
                viewport: { width: 390, height: 844 },
            },
        },
        { name: "desktop", use: { ...CHROME, viewport: { width: 1440, height: 900 } } },
        {
            name: "ipad",
            use: {
                ...devices["iPad (gen 7) landscape"],
                ...CHROME,
                viewport: { width: 1024, height: 768 },
            },
        },
        {
            name: "phone",
            use: { ...devices["iPhone 15"], ...CHROME, viewport: { width: 390, height: 844 } },
        },
    ],
});
