// The snapshots' folder and descriptions, without a browser; drawing them again is
// tools/e2e/map/map-snapshots.e2e.ts.

import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { COUNTRY } from "../../../engine/ui/snapshots/country";
import { SITE } from "../../../engine/ui/snapshots/site";
import { fileOf, FRAMINGS, MODULES, OUT } from "../map-snapshots";

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
