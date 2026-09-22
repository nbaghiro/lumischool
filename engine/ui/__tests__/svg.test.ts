import assert from "node:assert/strict";
import { test } from "node:test";
import type { Options } from "roughjs/bin/core";
import type { Fill, Stroke } from "../../ink/pen";
import { PALETTE, PRINT, U, type Level } from "../../paper";
import { clip, letter, plain, type Surface } from "../../ink/surface";
import { defineDrawing } from "../../parts/drawing";
import { SvgPen, defineVisual, drawStroke, el, render, svgSurface, text, type Ctx } from "../svg";

/** Just enough of a document for el() and rough.js's SVG renderer, serialised in attribute order. */
class FakeElement {
    readonly tagName: string;
    readonly ownerDocument: FakeDocument;
    readonly attributes = new Map<string, string>();
    readonly children: FakeElement[] = [];
    readonly style = { setProperty: (): void => undefined };
    textContent = "";

    constructor(tagName: string, ownerDocument: FakeDocument) {
        this.tagName = tagName;
        this.ownerDocument = ownerDocument;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    appendChild(child: FakeElement): FakeElement {
        this.children.push(child);
        return child;
    }

    get outerHTML(): string {
        const attrs = [...this.attributes].map(([k, v]) => ` ${k}="${v}"`).join("");
        const inner = this.textContent + this.children.map((c) => c.outerHTML).join("");
        return `<${this.tagName}${attrs}>${inner}</${this.tagName}>`;
    }
}

class FakeDocument {
    createElementNS(_ns: string, tag: string): FakeElement {
        return new FakeElement(tag, this);
    }
}

Object.assign(globalThis, { document: new FakeDocument() });

const { margin: _margin, ...SCREEN } = PALETTE.paper;

/** Two pens on one seed: one draws through the surface, the other as the pen drew before it. */
const pair = (paper: boolean): [SvgPen, SvgPen] => {
    const o = { seed: 4127, t: paper ? PRINT : SCREEN, paper, roughness: 1 };
    return [new SvgPen(el("svg"), o), new SvgPen(el("svg"), o)];
};

const before = (
    p: SvgPen,
    g: Element,
    make: (o: Options) => SVGGElement,
    level: Level,
    fill: Fill,
    extra: Options = {},
): void => {
    const base = p.opt(level, extra);
    if (fill) g.appendChild(make({ ...base, ...fill, stroke: "none" }));
    g.appendChild(make(base));
};

const TRIANGLE: [number, number][] = [
    [0, 0],
    [40, 0],
    [20, 30],
];
const ZIGZAG: [number, number][] = [
    [0, 0],
    [20, 10],
    [40, 0],
];
const HILL: [number, number][] = [
    [0, 0],
    [20, 30],
    [40, 0],
];
const DASH: Options = { strokeLineDash: [4, 7], strokeLineDashOffset: 2 };

const CASES: Record<
    string,
    { now: (p: SvgPen, g: Element) => void; was: (p: SvgPen, g: Element) => void }
> = {
    "a rectangle with a colour fill": {
        now: (p, g) => p.rect(g, 0, 0, 60, 40, "ruler", p.fill("sky")),
        was: (p, g) => before(p, g, (o) => p.rc.rectangle(0, 0, 60, 40, o), "ruler", p.fill("sky")),
    },
    "a circle filled with the glow, dotted on paper": {
        now: (p, g) => p.circle(g, 30, 30, 40, "pencil", p.fill("glow")),
        was: (p, g) => before(p, g, (o) => p.rc.circle(30, 30, 40, o), "pencil", p.fill("glow")),
    },
    "an ellipse filled with tang, cross-hatched on paper": {
        now: (p, g) => p.ellipse(g, 30, 20, 50, 30, "doodle", p.fill("tang")),
        was: (p, g) =>
            before(p, g, (o) => p.rc.ellipse(30, 20, 50, 30, o), "doodle", p.fill("tang")),
    },
    "a polygon, whose solid fill is even-odd": {
        now: (p, g) => p.polygon(g, TRIANGLE, "ruler", p.fill("mint")),
        was: (p, g) => before(p, g, (o) => p.rc.polygon(TRIANGLE, o), "ruler", p.fill("mint")),
    },
    "a path with a fill and a dash": {
        now: (p, g) => p.path(g, "M0 0L40 10L10 40Z", "pencil", p.fill("berry"), DASH),
        was: (p, g) =>
            before(p, g, (o) => p.rc.path("M0 0L40 10L10 40Z", o), "pencil", p.fill("berry"), DASH),
    },
    "a line, a linear path, a curve and an arc": {
        now: (p, g) => {
            p.line(g, 0, 0, 40, 40, "ruler", DASH);
            p.linear(g, ZIGZAG);
            p.curve(g, HILL, "doodle");
            p.arc(g, 30, 30, 50, 50, 0, Math.PI, "pencil", { strokeWidth: 3 });
        },
        was: (p, g) => {
            g.appendChild(p.rc.line(0, 0, 40, 40, p.opt("ruler", DASH)));
            g.appendChild(p.rc.linearPath(ZIGZAG, p.opt()));
            g.appendChild(p.rc.curve(HILL, p.opt("doodle")));
            const arc = p.opt("pencil", { strokeWidth: 3 });
            g.appendChild(p.rc.arc(30, 30, 50, 50, 0, Math.PI, false, arc));
        },
    },
};

test("the SVG pen builds what rough.js's own SVG renderer built, attribute for attribute", () => {
    for (const [name, { now, was }] of Object.entries(CASES)) {
        for (const paper of [false, true]) {
            const [a, b] = pair(paper);
            const ga = el("g");
            const gb = el("g");
            now(a, ga);
            was(b, gb);
            assert.equal(ga.outerHTML, gb.outerHTML, `${name}${paper ? " on paper" : ""}`);
            assert.match(ga.outerHTML, /<path d="M/, name);
        }
    }
});

test("a stroke is one path with its outline, colour and opacity, from the pen or on its own", () => {
    const stroke: Stroke = {
        tool: "pencil",
        color: "pen",
        size: 6,
        points: [
            [0, 0],
            [1, 1],
            [2, 0.5],
        ],
    };
    const alone = el("g");
    drawStroke(alone, stroke, PRINT.ink);
    const [pen] = pair(true);
    const drawn = el("g");
    pen.stroke(drawn, stroke);
    assert.equal(drawn.outerHTML, alone.outerHTML);
    assert.match(
        alone.outerHTML,
        /^<g><path d="M[^"]+Z" fill="#161616" opacity="1"><\/path><\/g>$/,
    );
});

test("a drawing renders the same from one seed, and on paper carries nothing for animation", () => {
    const box = defineVisual({
        id: "box",
        title: "Box",
        group: "Props",
        about: "A box with a colour fill, one square high.",
        params: { w: 2 },
        box: (p) => ({ w: p.w, h: 1 }),
        draw: (c, p) => {
            c.pen.rect(c.g, 0, 0, p.w * U, U, "ruler", c.pen.fill("sky"));
            return { top: [(p.w * U) / 2, 0] };
        },
    });
    const a = render(box, { w: 3 }, { seed: 9, output: "paper" });
    const b = render(box, { w: 3 }, { seed: 9, output: "paper" });
    const c = render(box, { w: 3 }, { seed: 10, output: "paper" });
    assert.equal(a.svg.outerHTML, b.svg.outerHTML);
    assert.notEqual(a.svg.outerHTML, c.svg.outerHTML);
    assert.doesNotMatch(a.svg.outerHTML, /data-group/);
    assert.deepEqual(a.anchors, { top: { x: 1.5, y: 0, side: "up" } });
    assert.deepEqual(a.box, { w: 3, h: 1 });
});

const INK = "#161616";
const HAND = { x: 30, y: 43, s: "Maya", face: "hand", weight: 600, size: 16, fill: INK } as const;

// Each `was` is what a drawing on the shelf builds for itself today with `el` and `text`.
const SURFACE: Record<
    string,
    { now: (ink: Surface<Element>, g: Element) => void; was: (g: Element) => void }
> = {
    "a number in the reading face": {
        now: (ink, g) => ink.letter(g, { ...HAND, s: "12", face: "read", anchor: "middle" }),
        was: (g) => text(g, 30, 43, "12", `font:600 16px var(--f-read);fill:${INK}`),
    },
    "a capital in the mono face, letter-spaced": {
        now: (ink, g) =>
            ink.letter(g, {
                ...HAND,
                s: "NAME",
                face: "mono",
                weight: 500,
                size: 8.5,
                anchor: "start",
                spacing: 0.08,
            }),
        was: (g) =>
            text(
                g,
                30,
                43,
                "NAME",
                `font:500 8.5px var(--f-mono);letter-spacing:.08em;fill:${INK}`,
                "start",
            ),
    },
    "a name in the teacher's hand, informal and bouncing": {
        now: (ink, g) => ink.letter(g, { ...HAND, anchor: "middle", informal: 100, bounce: 30 }),
        was: (g) =>
            text(
                g,
                30,
                43,
                "Maya",
                `font:600 16px var(--f-hand);font-variation-settings:'INFM' 100,'BNCE' 30;fill:${INK}`,
            ),
    },
    "an italic mark in the hand": {
        now: (ink, g) =>
            ink.letter(g, { ...HAND, s: "mf", anchor: "end", italic: true, informal: 40 }),
        was: (g) =>
            text(
                g,
                30,
                43,
                "mf",
                `font:italic 600 16px var(--f-hand);font-variation-settings:'INFM' 40;fill:${INK}`,
                "end",
            ),
    },
    "a letter to trace over, as a dashed outline": {
        now: (ink, g) =>
            ink.letter(g, {
                ...HAND,
                s: "a",
                anchor: "middle",
                fill: "none",
                outline: { stroke: INK, width: 1.2, dash: "3 4" },
            }),
        was: (g) =>
            text(
                g,
                30,
                43,
                "a",
                `font:600 16px var(--f-hand);fill:none;stroke:${INK};stroke-width:1.2;stroke-dasharray:3 4`,
            ),
    },
    "a hand-drawn file's shapes, as the file writes them": {
        now: (ink, g) =>
            ink.imported(g, {
                from: [0, 20],
                shapes: [
                    {
                        tag: "path",
                        attrs: [
                            ["data-fill", "sky"],
                            ["d", "M8 20H32"],
                            ["stroke", INK],
                            ["fill", "#FFFFFF"],
                        ],
                    },
                ],
            }),
        was: (g) => {
            const file = el("g", { transform: "translate(0 -20)" }, g);
            el("path", { "data-fill": "sky", d: "M8 20H32", stroke: INK, fill: "#FFFFFF" }, file);
        },
    },
    "a place name set along a postmark's ring": {
        now: (ink, g) =>
            ink.letter(g, {
                ...HAND,
                s: "LEEDS",
                face: "mono",
                size: 9.5,
                anchor: "middle",
                spacing: 0.14,
                along: { d: "M8 20A12 12 0 0 1 32 20", offset: 50 },
            }),
        was: (g) => {
            el("path", { id: "postmark-1-1", d: "M8 20A12 12 0 0 1 32 20", fill: "none" }, g);
            const words = el(
                "text",
                {
                    style: `font:600 9.5px var(--f-mono);letter-spacing:.14em;fill:${INK}`,
                    "text-anchor": "middle",
                },
                g,
            );
            el("textPath", { href: "#postmark-1-1", startOffset: "50%" }, words).textContent =
                "LEEDS";
        },
    },
    "a white patch under a number, and a disc with a line round it": {
        now: (ink, g) => {
            ink.plain(g, { kind: "rect", x: 4, y: 5, w: 20, h: 12, r: 3, fill: "#FFFFFF" });
            ink.plain(g, {
                kind: "circle",
                cx: 5,
                cy: 6,
                r: 2,
                fill: "#FFFFFF",
                stroke: INK,
                width: 1,
            });
            ink.plain(g, { kind: "ellipse", cx: 5, cy: 6, rx: 4, ry: 2, fill: INK, opacity: 0.2 });
        },
        was: (g) => {
            el("rect", { x: 4, y: 5, width: 20, height: 12, rx: 3, fill: "#FFFFFF" }, g);
            el(
                "circle",
                { cx: 5, cy: 6, r: 2, fill: "#FFFFFF", stroke: INK, "stroke-width": 1 },
                g,
            );
            el("ellipse", { cx: 5, cy: 6, rx: 4, ry: 2, fill: INK, opacity: 0.2 }, g);
        },
    },
    "a line with round ends, a marker's wash laid off its line, and a shadow laid at a cut-out's place and size":
        {
            now: (ink, g) => {
                ink.plain(g, {
                    kind: "path",
                    d: "M0 0L10 10",
                    fill: "none",
                    stroke: INK,
                    width: 1.4,
                    cap: "round",
                    join: "round",
                });
                ink.plain(g, {
                    kind: "path",
                    d: "M0 0L4 4Z",
                    shift: [-1.3, 1.3],
                    fill: "#8cc7ef",
                    stroke: "none",
                });
                ink.plain(g, {
                    kind: "path",
                    d: "M0 0L4 4Z",
                    turn: [
                        ["translate", 62, 33],
                        ["scale", 0.48],
                    ],
                    fill: "#1B254022",
                });
                ink.plain(g, {
                    kind: "path",
                    d: "M2 2H8",
                    fill: "none",
                    stroke: INK,
                    width: 1,
                    dash: "2 3",
                    cap: "round",
                    opacity: 0.5,
                });
            },
            was: (g) => {
                el(
                    "path",
                    {
                        d: "M0 0L10 10",
                        fill: "none",
                        stroke: INK,
                        "stroke-width": 1.4,
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                    },
                    g,
                );
                el(
                    "path",
                    {
                        d: "M0 0L4 4Z",
                        transform: "translate(-1.3 1.3)",
                        fill: "#8cc7ef",
                        stroke: "none",
                    },
                    g,
                );
                el(
                    "path",
                    {
                        d: "M0 0L4 4Z",
                        transform: "translate(62 33) scale(0.48)",
                        fill: "#1B254022",
                    },
                    g,
                );
                el(
                    "path",
                    {
                        d: "M2 2H8",
                        fill: "none",
                        stroke: INK,
                        "stroke-width": 1,
                        "stroke-dasharray": "2 3",
                        "stroke-linecap": "round",
                        opacity: 0.5,
                    },
                    g,
                );
            },
        },
    "groups turned, round, faded, named for a guide's styles and hooked for a page": {
        now: (ink, g) => {
            ink.group(g, {
                turn: [
                    ["translate", 40, 10],
                    ["scale", -1, 1],
                ],
            });
            ink.group(g, {
                turn: [
                    ["translate", 12, 30],
                    ["rotate", -20],
                ],
            });
            ink.group(g, { round: true });
            ink.group(g, { layer: "g-flutter", origin: [29, 34], flap: -9 });
            ink.group(g, { layer: "g-shut", opacity: 0 });
            ink.group(g, { data: { key: "C4", layer: "lit" }, hidden: true });
            ink.group(g, { part: { name: "wing", pivot: [61.25, 38], dir: -1 } });
        },
        was: (g) => {
            el("g", { transform: "translate(40 10) scale(-1 1)" }, g);
            el("g", { transform: "translate(12 30) rotate(-20)" }, g);
            el("g", { "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
            el("g", { class: "g-flutter", style: "transform-origin:29px 34px;--flap:-9deg" }, g);
            el("g", { class: "g-shut", opacity: 0 }, g);
            el("g", { "data-key": "C4", "data-layer": "lit" }, g).setAttribute(
                "visibility",
                "hidden",
            );
            el("g", { "data-part": "wing", "data-pivot": "61.3 38.0", "data-dir": -1 }, g);
        },
    },
    "a clip to a rectangle, a polygon and a path": {
        now: (ink, g) => {
            ink.clip(g, { kind: "rect", x: 10, y: 0, w: 80, h: 40 });
            ink.clip(g, {
                kind: "polygon",
                points: [
                    [0, 0],
                    [10, 0],
                    [5, 8],
                ],
            });
            ink.clip(g, { kind: "path", d: "M0 0H9V9Z" });
        },
        was: (g) => {
            el(
                "rect",
                { x: 10, y: 0, width: 80, height: 40 },
                el("clipPath", { id: "lane-1-1" }, g),
            );
            el("g", { "clip-path": "url(#lane-1-1)" }, g);
            el("polygon", { points: "0,0 10,0 5,8" }, el("clipPath", { id: "lane-1-2" }, g));
            el("g", { "clip-path": "url(#lane-1-2)" }, g);
            el("path", { d: "M0 0H9V9Z" }, el("clipPath", { id: "lane-1-3" }, g));
            el("g", { "clip-path": "url(#lane-1-3)" }, g);
        },
    },
    "a glow that fades from its middle, and a hatch as a tile": {
        now: (ink, g) => {
            const stops = [0, 45, 100].map((at, i) => ({
                at,
                color: "#f5c542",
                opacity: [0.42, 0.231, 0][i] ?? 0,
            }));
            const fill = ink.pattern(g, { kind: "radial", stops });
            ink.plain(g, { kind: "circle", cx: 30, cy: 30, r: 28, fill });
            const dots = { kind: "circle", cx: 3, cy: 3, r: 1, fill: INK } as const;
            ink.pattern(g, { kind: "tile", w: 6, h: 6, turn: [["rotate", -41]], marks: [dots] });
        },
        was: (g) => {
            const grad = el("radialGradient", { id: "guide-glow-1-1" }, el("defs", {}, g));
            el("stop", { offset: "0%", "stop-color": "#f5c542", "stop-opacity": 0.42 }, grad);
            el("stop", { offset: "45%", "stop-color": "#f5c542", "stop-opacity": 0.231 }, grad);
            el("stop", { offset: "100%", "stop-color": "#f5c542", "stop-opacity": 0 }, grad);
            el("circle", { cx: 30, cy: 30, r: 28, fill: "url(#guide-glow-1-1)" }, g);
            const tile = {
                id: "guide-glow-1-2",
                width: 6,
                height: 6,
                patternUnits: "userSpaceOnUse",
                patternTransform: "rotate(-41)",
            };
            el("circle", { cx: 3, cy: 3, r: 1, fill: INK }, el("pattern", tile, el("defs", {}, g)));
        },
    },
};

const KEYS: Record<string, string> = {
    "a place name set along a postmark's ring": "postmark",
    "a clip to a rectangle, a polygon and a path": "lane",
    "a glow that fades from its middle, and a hatch as a tile": "guide.glow",
};

test("the SVG surface builds what the shelf's drawings built for themselves, attribute for attribute", () => {
    for (const [name, { now, was }] of Object.entries(SURFACE)) {
        const a = el("g");
        const b = el("g");
        now(svgSurface(KEYS[name] ?? "case"), a);
        was(b);
        assert.equal(a.outerHTML, b.outerHTML, name);
    }
});

test("each render mints its own ids, counted per drawing, so one drawing never shifts another's", () => {
    const region = { kind: "rect", x: 0, y: 0, w: 1, h: 1 } as const;
    const first = (key: string): string => {
        const g = el("g");
        svgSurface(key).clip(g, region);
        return /id="([^"]+)"/.exec(g.outerHTML)?.[1] ?? "";
    };
    assert.equal(first("fretboard"), "fretboard-1-1");
    assert.equal(first("ukulele"), "ukulele-1-1");
    assert.equal(first("fretboard"), "fretboard-2-1");
    svgSurface("guitar");
    assert.equal(first("guitar"), "guitar-1-1", "a render that mints nothing counts for nothing");
});

test("a drawing that describes itself is named for a screen reader, and one beside its word is hidden", () => {
    const tick = {
        id: "tick",
        title: "Tick",
        group: "Marks",
        about: "A tick.",
        params: { big: false },
        box: () => ({ w: 1, h: 1 }),
        draw: (c: Ctx): RawAnchors => {
            c.pen.line(c.g, 0, 10, 20, 0, "ruler");
            return { drop: [20, 20, "down", 30] };
        },
    } as const;
    type RawAnchors = Record<string, [number, number, "down", number]>;
    const named = render(
        defineVisual({ ...tick, describe: (p) => (p.big ? "A large tick." : "A tick.") }),
        { big: true },
        { output: "paper" },
    );
    assert.match(named.svg.outerHTML, /^<svg [^>]*role="img" aria-label="A large tick\."/);
    assert.deepEqual(named.anchors, { drop: { x: 1, y: 1, side: "down", reach: 1.5 } });

    const hidden = render(defineVisual({ ...tick, describe: () => null }), undefined, {
        output: "paper",
    });
    assert.match(hidden.svg.outerHTML, /aria-hidden="true"/);
    assert.doesNotMatch(hidden.svg.outerHTML, /role=|aria-label/);

    const unnamed = render(defineVisual(tick), undefined, { output: "paper" });
    assert.doesNotMatch(unnamed.svg.outerHTML, /role=|aria-/);
});

test("a drawing on the contract is handed the surface, and an anchor keeps how far a thing may land from it", () => {
    const label = defineDrawing({
        id: "label",
        family: "page",
        title: "Label",
        group: "Props",
        about: "A name on a white patch.",
        params: { name: "Ada" },
        settings: { name: { kind: "text", most: 12 } },
        takes: [
            { label: "Short", params: { name: "Ada" } },
            { label: "Long", params: { name: "Theodora" } },
        ],
        box: () => ({ w: 4, h: 2 }),
        draw: (c, p) => {
            plain(c, { kind: "rect", x: 4, y: 6, w: 72, h: 28, r: 3, fill: "#FFFFFF" });
            const at = { x: 40, y: 26, s: p.name, weight: 600, size: 16, fill: c.t.ink };
            letter(c, { ...at, face: "hand", anchor: "middle" });
            return { tag: [40, 40, "down", 20] };
        },
        describe: (p) => `A white label with the name ${p.name} written on it by hand.`,
    });
    const { svg, anchors } = render(label, { name: "Ada" }, { output: "paper" });
    assert.match(
        svg.outerHTML,
        /^<svg [^>]*data-visual="label" role="img" aria-label="A white label with the name Ada written on it by hand\."><g><rect x="4" y="6" width="72" height="28" rx="3" fill="#FFFFFF"><\/rect><text x="40" y="26" text-anchor="middle" style="font:600 16px var\(--f-hand\);fill:#161616">Ada<\/text><\/g><\/svg>$/,
    );
    assert.deepEqual(anchors, { tag: { x: 2, y: 2, side: "down", reach: 1 } });
});

test("a drawing on the contract keeps its own ids when a drawing drawn on the pen's surface mints one on the same page", () => {
    const cut = { kind: "rect", x: 0, y: 0, w: 20, h: 20 } as const;
    const two = [
        { label: "One", params: {} },
        { label: "Two", params: {} },
    ];
    const clipped = defineDrawing({
        id: "clipped",
        family: "page",
        title: "Clipped",
        group: "Props",
        about: "A square cut to itself.",
        params: {},
        settings: {},
        takes: two,
        box: () => ({ w: 1, h: 1 }),
        draw: (c) => {
            clip(c, cut);
            return {};
        },
        describe: () => null,
    });
    const handed = defineVisual({
        id: "handed",
        title: "Handed",
        group: "Props",
        about: "A drawing handed no surface, as the scratchpad's are.",
        params: {},
        box: () => ({ w: 1, h: 1 }),
        draw: (c) => {
            clip(c, cut);
            return {};
        },
    });
    const ids = (svg: Element): string[] =>
        [...svg.outerHTML.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? "");
    const first = ids(render(clipped, {}, { output: "paper" }).svg);
    const between = ids(render(handed, {}, { output: "paper" }).svg);
    const second = ids(render(clipped, {}, { output: "paper" }).svg);
    assert.deepEqual([first, second], [["clipped-1-1"], ["clipped-2-1"]]);
    assert.match(between[0] ?? "", /^svg-\d+-1$/, "the pen's surface mints under its own name");
});
