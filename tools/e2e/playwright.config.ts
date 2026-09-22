// The tests against the running apps (.docs/local.md, "The end-to-end tests"): `npm run test:e2e`,
// with `npm run dev` already serving 8500 and the API on 8501, in the installed Google Chrome, at a
// laptop's, an iPad's and a phone's size. One at a time, since every case shares the local database
// and its limits on codes. A case is a `*.e2e.ts` file here, and the steps they share are steps.ts.

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
    globalTeardown: join(import.meta.dirname, "done.ts"),
    outputDir: join(tmpdir(), "lumischool-e2e"),
    workers: 1,
    fullyParallel: false,
    reporter: "list",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        ...CHROME,
        baseURL: process.env.E2E_BASE ?? "http://localhost:8500",
        trace: "retain-on-failure",
    },
    projects: [
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
