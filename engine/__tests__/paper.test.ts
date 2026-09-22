import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
    FONTS,
    HAIR,
    HAIR_COLOURS,
    HATCH,
    MARKERS,
    PAGE_SIZES,
    PALETTE,
    PRINT,
    SKIN,
    SQUARE_MM,
    U,
    lineTicks,
    SCENE_COLS,
    SHEET_COLS,
    TEXT_COLS,
} from "../paper";

/** Every rule in a stylesheet that sets custom properties, by selector, with its values by name. */
function customProperties(css: string): Map<string, Record<string, string>> {
    const rules = new Map<string, Record<string, string>>();
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selector = "", body = ""] of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const set: Record<string, string> = {};
        for (const [, name = "", value = ""] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
            set[name] = value.trim();
        }
        if (Object.keys(set).length) rules.set(selector.replace(/\s+/g, " ").trim(), set);
    }
    return rules;
}

test("the palette is palette.css token for token, and its square is the square", () => {
    const css = readFileSync(new URL("../ui/palette.css", import.meta.url), "utf8");
    const desk = {
        ...PALETTE.desk,
        sq: `${U}px`,
        "print-grid": PRINT.grid.toLowerCase(),
        "f-hand": FONTS.hand,
        "f-read": FONTS.read,
        "f-mono": FONTS.mono,
    };
    assert.deepEqual(
        customProperties(css),
        new Map([
            [":root", desk],
            [".squared, .paper, .paper-light, .on-paper", PALETTE.paper],
        ]),
    );
});

test("a number line's ticks are one square apart whatever its step", () => {
    assert.equal(lineTicks(0, 10, 1), 11);
    assert.equal(lineTicks(0, 1, 0.1), 11, "tenths are as wide as ones");
    assert.equal(lineTicks(0, 100, 10), 11);
    assert.equal(lineTicks(0, 0.3, 0.1), 4, "floating point does not lose a tick");
    assert.equal(lineTicks(3, 3, 1), 2, "a line has two ticks at least");
    assert.equal(lineTicks(0, 5, 0), 6, "a step of nothing counts in ones");
});

test("every sheet is portrait, and A3 is A4 doubled, so one composition prints on both", () => {
    for (const [size, { w, h }] of Object.entries(PAGE_SIZES)) assert.ok(w < h, size);
    assert.equal(PAGE_SIZES.A3.w, PAGE_SIZES.A4.h);
    assert.equal(PAGE_SIZES.A3.h, PAGE_SIZES.A4.w * 2);
    assert.equal(Math.floor(PAGE_SIZES.A4.w / SQUARE_MM), 42, "A4 is 42 squares across");
});

test("printed, every marker is the ink and its own hatch, so objects stay distinct", () => {
    const hatches = new Set<string>();
    for (const m of MARKERS) {
        assert.equal(PRINT[m], PRINT.ink, `${m} prints in colour`);
        const hatch = HATCH[m];
        assert.ok(hatch, `${m} has no hatch`);
        hatches.add(`${hatch.angle ?? ""} ${hatch.style ?? ""}`);
    }
    assert.equal(hatches.size, MARKERS.length, "two markers print as the same hatch");
});

test("a scene has the sheet's width past the margin, and a line of text is narrower still", () => {
    assert.equal(SHEET_COLS, 42);
    assert.equal(SCENE_COLS, 37);
    assert.ok(TEXT_COLS < SCENE_COLS);
});

test("every skin tone has a print grey, lighter for a lighter tone, and every hair colour prints", () => {
    const grey = (hex: string): number => parseInt(hex.slice(1, 3), 16);
    assert.equal(SKIN.length, 6);
    for (const [i, tone] of SKIN.entries()) {
        assert.match(tone.print, /^#([0-9A-F]{2})\1\1$/, `tone ${i + 1} prints in a colour`);
        const before = SKIN[i - 1];
        if (before) assert.ok(grey(tone.print) < grey(before.print), `tone ${i + 1} is not deeper`);
    }
    for (const colour of HAIR_COLOURS) {
        const h = HAIR[colour];
        assert.match(h.screen, /^#[0-9A-F]{6}$/, colour);
        assert.ok(
            typeof h.print === "number" ? h.print > 0 : ["dots", "open"].includes(h.print),
            colour,
        );
    }
});
