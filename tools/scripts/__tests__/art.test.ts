import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { compile, OUT } from "../art";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));

test("the generated module holds every hand-drawn file in content/art/ as it is now", async () => {
    assert.equal(
        readFileSync(join(ROOT, OUT), "utf8"),
        await compile(ROOT),
        `${OUT} is out of date: run node --import ./tools/scripts/resolve.ts tools/scripts/art.ts`,
    );
});
