import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** Every stylesheet under engine/ui and apps, by path from the root. */
function stylesheets(dir: string): string[] {
    return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const path = `${dir}/${e.name}`;
        if (e.isDirectory())
            return e.name === "node_modules" || e.name === "mobile" ? [] : stylesheets(path);
        return e.name.endsWith(".css") ? [path] : [];
    });
}

// engine/__tests__/paper.test.ts holds palette.css to PALETTE, its triplets included.
describe("see-through palette colours", () => {
    // An early color-mix() drops the alpha of a palette colour mixed with transparent in a shadow
    // (Android WebView 113 draws the card's soft shadow as a solid band), so see-through palette
    // colours are written rgb(var(--x-rgb) / N%).
    it("are written with the palette's triplets", () => {
        const found = [...stylesheets("engine/ui"), ...stylesheets("apps")].flatMap((path) =>
            [
                ...readFileSync(join(ROOT, path), "utf8").matchAll(
                    /color-mix\(in srgb, var\(--[a-z0-9-]+\) [0-9.]+%, transparent\)/g,
                ),
            ].map((m) => `${path}: ${m[0]}`),
        );
        assert.deepEqual(found, []);
    });
});
