import assert from "node:assert/strict";
import { test } from "node:test";
import { PALETTE, PRINT } from "../../paper";
import {
    BIRD,
    COLOURS,
    files,
    icon,
    lockup,
    markArt,
    motionCss,
    profile,
    social,
    svgFile,
    wordArt,
    type Small,
} from "../brand";

const SMALL: Small[] = [16, 24, 32];

const coloursIn = (text: string): Set<string> =>
    new Set((text.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((c) => c.toLowerCase()));

test("the logo is drawn in the palette, with the glow's two shades as the only colours of its own", () => {
    const palette = new Set(
        [...Object.values(PALETTE.desk), ...Object.values(PALETTE.paper), ...Object.values(PRINT)]
            .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
            .map((c) => c.toLowerCase()),
    );
    const own = new Set([COLOURS.wash, COLOURS.ruled]);
    const drawn = [
        ...Object.values(files(BIRD)),
        ...SMALL.map((px) => svgFile(BIRD.small(px))),
        svgFile(profile(BIRD)),
        svgFile(social(BIRD)),
    ];
    for (const text of drawn) {
        for (const c of coloursIn(text)) {
            assert.ok(palette.has(c) || own.has(c), `${c} is not in engine/paper.ts's palette`);
        }
    }
    assert.equal(
        COLOURS.ink,
        PALETTE.desk.ink,
        "the word stands on the desk, as the top bar's does",
    );
    assert.equal(COLOURS.print, PRINT.ink);
});

test("every file is a well-formed drawing that reaches nothing outside itself", () => {
    for (const [name, text] of Object.entries(files(BIRD))) {
        assert.match(
            text,
            /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 [\d.]+ [\d.]+"/,
            `${name} has no viewBox`,
        );
        assert.doesNotMatch(text, /NaN|undefined|Infinity/, `${name} has a number that is not one`);
        assert.equal(
            (text.match(/<svg/g) ?? []).length,
            (text.match(/<\/svg>/g) ?? []).length,
            `${name} leaves an svg open`,
        );
        assert.doesNotMatch(
            text,
            /<(image|script|foreignObject)[\s>]|href="http/,
            `${name} reaches outside itself`,
        );
        assert.match(text, /<title>lumischool<\/title>/, `${name} has no name for a screen reader`);
    }
    assert.match(
        files(BIRD)["mark-animated.svg"] ?? "",
        /<style>/,
        "the moving mark carries its loop",
    );
});

test("the one-colour files use the print ink and nothing else but paper", () => {
    for (const name of [
        "mark-ink.svg",
        "wordmark-ink.svg",
        "lockup-horizontal-ink.svg",
        "lockup-stacked-ink.svg",
    ]) {
        const colours = coloursIn(files(BIRD)[name] ?? "");
        colours.delete(COLOURS.print.toLowerCase());
        colours.delete(COLOURS.paper.toLowerCase());
        assert.deepEqual([...colours], [], `${name} uses a second colour`);
    }
});

test("each small size is the bird on no ground, filled white and inside its square", () => {
    for (const px of SMALL) {
        const a = BIRD.small(px);
        assert.deepEqual([a.w, a.h], [px, px], `the ${px} px drawing is ${a.w} by ${a.h}`);
        const first = a.body.slice(0, a.body.indexOf("/>"));
        assert.doesNotMatch(
            first,
            new RegExp(`fill="${COLOURS.glow}"`),
            `${px} px stands on a tile`,
        );
        assert.ok(!a.body.includes(COLOURS.ruled), `${px} px has a ruled page behind it`);
        assert.ok(
            a.body.includes(`fill="${COLOURS.paper}"`),
            `${px} px has no white facets, so it would vanish on a dark tab strip`,
        );
        for (const [, d = ""] of a.body.matchAll(/ d="([^"]*[MLZ][^"]*)"/g)) {
            if (/[a-z]/.test(d)) continue;
            for (const v of (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)) {
                assert.ok(v >= 0 && v <= px, `${px} px draws at ${v}, outside its square`);
            }
        }
    }
    assert.match(BIRD.small(16).body, /<path d="M\d+ \d+h1v1h-1Z"/, "the 16 px eye is not a pixel");
    assert.notEqual(svgFile(BIRD.small(16)), svgFile(BIRD.small(32)));
    assert.equal(files(BIRD)["favicon.svg"], svgFile(BIRD.small(16), { title: "lumischool" }));
});

test("the mark is drawn the same every time, and the lockups, icons and images keep their shapes", () => {
    assert.equal(svgFile(markArt(BIRD)), svgFile(markArt(BIRD)));
    for (const a of [icon(BIRD), icon(BIRD, { safe: true }), profile(BIRD)]) assert.equal(a.w, a.h);
    const h = lockup(BIRD, "horizontal");
    const st = lockup(BIRD, "stacked");
    assert.ok(h.w > h.h * 2.5, `the horizontal lockup is ${h.w} by ${h.h}`);
    assert.ok(st.w / st.h < h.w / h.h, "the stacked lockup is no squarer than the horizontal one");
    assert.ok(BIRD.word().w > 500, "the word lost its letters");
    const s = social(BIRD);
    assert.deepEqual([s.w, s.h], [1200, 630]);
    assert.ok(s.body.includes(lockup(BIRD, "horizontal").body), "the link preview has no lockup");
});

test("the word alone is the lockups' word, never moves, and its file is named for a screen reader", () => {
    const word = wordArt(BIRD);
    assert.ok(lockup(BIRD, "horizontal", { moving: true }).body.includes(word.body));
    assert.ok(lockup(BIRD, "stacked", { moving: true }).body.includes(word.body));
    assert.doesNotMatch(wordArt(BIRD, { moving: true }).body, /b-moving/);
    assert.match(svgFile(word, { title: "lumischool" }), /role="img"><title>lumischool<\/title>/);
});

/** The keyframes in a stylesheet, as name to offset to declarations, timing functions left out. */
function keyframes(css: string): Map<string, Map<string, string>> {
    const out = new Map<string, Map<string, string>>();
    for (const [, name = "", body = ""] of css.matchAll(
        /@keyframes ([\w-]+)\{((?:[^{}]*\{[^{}]*\})*)\}/g,
    )) {
        const frames = new Map<string, string>();
        for (const [, offsets = "", decl = ""] of body.matchAll(/([\d.%,]+)\{([^}]*)\}/g)) {
            const kept = decl
                .split(";")
                .filter((d) => d !== "" && !d.startsWith("animation-timing-function"))
                .join(";");
            for (const o of offsets.split(",")) frames.set(o, kept);
        }
        out.set(name, frames);
    }
    return out;
}

test("the loop ends exactly as it began, so a copy that stops is the drawing and nothing else", () => {
    const frames = keyframes(motionCss(BIRD));
    assert.ok(frames.size > 0, "the bird has no loop");
    for (const [name, f] of frames) {
        assert.ok(f.has("0%") && f.has("100%"), `${name} has no first or last keyframe`);
        assert.equal(f.get("0%"), f.get("100%"), `${name} starts and ends on different drawings`);
    }
});

test("the loop moves only by transform and opacity, never below half brightness", () => {
    for (const [name, f] of keyframes(motionCss(BIRD))) {
        for (const decl of f.values()) {
            for (const d of decl.split(";").filter((x) => x !== "")) {
                const [prop = "", value = ""] = d.split(":");
                assert.ok(
                    ["transform", "opacity"].includes(prop),
                    `${name} animates ${prop}, which would repaint rather than move`,
                );
                if (prop === "opacity") assert.ok(Number(value) >= 0.5, `${name} dims to ${value}`);
            }
        }
    }
});

test("the loop stops under reduced motion and in print, and keeps inside the shelf's lengths", () => {
    const css = motionCss(BIRD);
    assert.match(
        css,
        /@media \(prefers-reduced-motion:reduce\)\{\.b-moving \*\{animation:none!important\}\}/,
    );
    assert.match(css, /@media print\{\.b-moving \*\{animation:none!important\}\}/);
    assert.match(css, /\.b-still \.b-moving \*/);
    assert.ok(BIRD.loop >= 2.9 && BIRD.loop <= 4.5, `the loop is ${BIRD.loop} s`);
});
