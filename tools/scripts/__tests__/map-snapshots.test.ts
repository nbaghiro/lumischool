import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, test } from "node:test";
import type { Browser } from "@playwright/test";
import type { Area } from "../../../engine/ui/snapshot";
import { COUNTRY } from "../../../engine/ui/snapshots/country";
import { SITE } from "../../../engine/ui/snapshots/site";
import {
    buildHarness,
    compareAll,
    difference,
    fileOf,
    FRAMINGS,
    MODULES,
    openChrome,
    OUT,
    photograph,
    SAME,
} from "../map-snapshots";

const AGAIN = "run npm run map:snapshots, which needs Google Chrome";

test("every framing has its image within its budget, and the folder holds nothing else", () => {
    const expected = [
        ...MODULES.map(([name]) => `${name}.ts`),
        ...FRAMINGS.map((f) => `${f.file}.webp`),
    ].sort();
    assert.deepEqual(readdirSync(OUT).sort(), expected);
    for (const f of FRAMINGS) {
        const bytes = statSync(join(OUT, `${f.file}.webp`)).size;
        assert.ok(bytes <= f.budget, `${f.file}.webp weighs ${bytes} bytes, over ${f.budget}`);
    }
});

const SNAPSHOTS = [...COUNTRY, ...SITE];

test("country.ts and site.ts describe exactly the framings there are, each its own kind", () => {
    assert.deepEqual(SNAPSHOTS.map(fileOf).sort(), FRAMINGS.map((f) => f.file).sort(), AGAIN);
    assert.ok(COUNTRY.every((s) => !s.sample) && SITE.every((s) => s.sample), AGAIN);
    for (const f of FRAMINGS) {
        const snapshot = SNAPSHOTS.find((s) => fileOf(s) === f.file);
        assert.equal(snapshot?.sample, f.sample, `${f.file}; ${AGAIN}`);
        assert.equal(snapshot?.across, f.across, `${f.file}; ${AGAIN}`);
    }
});

let browser: Browser | null = null;
let harness: { dir: string; dist: string } | null = null;
let why = "";

before(async () => {
    if (why) return;
    try {
        browser = await openChrome();
    } catch {
        why = "drawing the map again needs Google Chrome, which did not start";
        return;
    }
    harness = await buildHarness();
});

after(async () => {
    await browser?.close();
    if (harness) await rm(harness.dir, { recursive: true, force: true });
});

const near = (a: Area | undefined, b: Area | undefined): boolean =>
    a !== undefined &&
    b !== undefined &&
    Math.abs(a.x - b.x) <= 1 &&
    Math.abs(a.y - b.y) <= 1 &&
    Math.abs(a.w - b.w) <= 1 &&
    Math.abs(a.h - b.h) <= 1;

test("every snapshot is the map as it draws now, and stands where the map now draws", async (t) => {
    if (why || !browser || !harness) {
        t.skip(why || "the map could not be drawn");
        return;
    }
    const changed: string[] = [];
    for (const f of FRAMINGS) {
        const fresh = await photograph(browser, harness.dist, f);
        const kept = SNAPSHOTS.find((s) => fileOf(s) === f.file);
        const d = await difference(browser, fresh.webp, readFileSync(join(OUT, `${f.file}.webp`)));
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
    assert.deepEqual(changed, [], `the map has changed since these snapshots were made; ${AGAIN}`);
});

test("every snapshot stands where the live map draws, on the page that opens on it, and looks like it", async (t) => {
    if (why || !browser) {
        t.skip(why || "the map could not be drawn");
        return;
    }
    const compared = await compareAll(browser);
    assert.ok(compared.length > 0, "no page was compared");
    const over = compared
        .filter((r) => !r.ok)
        .map(
            (r) =>
                `${r.file} on ${r.path} at ${r.width}x${r.height} (mean difference ${r.mean.toFixed(2)}, ${(r.far * 100).toFixed(2)}% far apart)`,
        );
    assert.deepEqual(
        over,
        [],
        `a snapshot no longer matches the live map it stands in for; ${AGAIN}`,
    );
});
