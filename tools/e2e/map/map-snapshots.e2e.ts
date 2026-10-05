// The map's snapshots against the map as it draws now, in Google Chrome. The snapshots were drawn on
// macOS and are compared there; the folder's own shape is checked without a browser in
// tools/scripts/__tests__/map-snapshots.test.ts.

import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import type { Area } from "../../../engine/ui/snapshot";
import { COUNTRY } from "../../../engine/ui/snapshots/country";
import { SITE } from "../../../engine/ui/snapshots/site";
import {
    buildHarness,
    compareAll,
    difference,
    fileOf,
    FRAMINGS,
    openChrome,
    OUT,
    photograph,
    SAME,
} from "../../scripts/map-snapshots";

const AGAIN = "run npm run map:snapshots, which needs Google Chrome";
const SNAPSHOTS = [...COUNTRY, ...SITE];

const near = (a: Area | undefined, b: Area | undefined): boolean =>
    a !== undefined &&
    b !== undefined &&
    Math.abs(a.x - b.x) <= 1 &&
    Math.abs(a.y - b.y) <= 1 &&
    Math.abs(a.w - b.w) <= 1 &&
    Math.abs(a.h - b.h) <= 1;

// one Chrome of its own draws every framing, so the device projects add nothing
test.describe("the map's snapshots", () => {
    test.describe.configure({ mode: "serial", timeout: 600_000 });

    let browser: Browser;

    test.beforeAll(async () => {
        test.skip(test.info().project.name !== "desktop", "drawn once, on the desktop project");
        browser = await openChrome();
    });

    test.afterAll(async () => {
        if (test.info().project.name === "desktop") await browser.close();
    });

    test("every snapshot is the map as it draws now, and stands where the map now draws", async () => {
        const harness = await buildHarness();
        try {
            const changed: string[] = [];
            for (const f of FRAMINGS) {
                const fresh = await photograph(browser, harness.dist, f);
                const kept = SNAPSHOTS.find((s) => fileOf(s) === f.file);
                const d = await difference(
                    browser,
                    fresh.webp,
                    readFileSync(join(OUT, `${f.file}.webp`)),
                );
                const placed =
                    kept !== undefined &&
                    near(fresh.snapshot.world, kept.world) &&
                    Object.keys(fresh.snapshot.aims).every((k) =>
                        near(fresh.snapshot.aims[k], kept.aims[k]),
                    );
                if (d.mean > SAME.mean || d.far > SAME.far || !placed) {
                    changed.push(
                        `${f.file} (mean difference ${d.mean.toFixed(2)}, ${(d.far * 100).toFixed(2)}% far apart${placed ? "" : ", placed elsewhere"})`,
                    );
                }
            }
            expect(
                changed,
                `the map has changed since these snapshots were made; ${AGAIN}`,
            ).toEqual([]);
        } finally {
            await rm(harness.dir, { recursive: true, force: true });
        }
    });

    test("every snapshot shows where the page that opens on it puts it, with no live map behind it", async () => {
        const compared = await compareAll(browser);
        expect(compared.length, "no page was compared").toBeGreaterThan(0);
        const over = compared
            .filter((r) => !r.ok)
            .map(
                (r) =>
                    `${r.file} on ${r.path} at ${r.width}x${r.height} (mean difference ${r.mean.toFixed(2)}, ${(r.far * 100).toFixed(2)}% far apart)`,
            );
        expect(over, `a snapshot no longer shows where its page puts it; ${AGAIN}`).toEqual([]);
    });
});
