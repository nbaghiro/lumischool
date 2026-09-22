import assert from "node:assert/strict";
import { test } from "node:test";
import { PALETTE, PRINT, U } from "../../paper";
import { Pen, type Stroke } from "../pen";
import {
    clip,
    group,
    letter,
    part,
    pattern,
    plain,
    recorder,
    type Ctx,
    type Mark,
    type RawAnchors,
    type Visual,
} from "../surface";

const { margin: _margin, ...SCREEN } = PALETTE.paper;

const pen = (paper: boolean, seed = 4127): Pen<Mark[]> =>
    new Pen(recorder, { seed, t: paper ? PRINT : SCREEN, paper, roughness: 1 });

const shapes = (marks: readonly Mark[]) =>
    marks.map((m) => {
        assert.equal(m.kind, "shape");
        return m.kind === "shape" ? m.traces : [];
    });

test("a filled shape is two marks, its fill under its outline", () => {
    const marks: Mark[] = [];
    const p = pen(false);
    p.rect(marks, 0, 0, 3 * U, 2 * U, "ruler", p.fill("sky"));
    const [fill, outline] = shapes(marks);
    assert.equal(marks.length, 2);
    assert.ok(fill?.length && fill.every((t) => t.stroke === "none" && t.fill === SCREEN.sky));
    assert.ok(outline?.length);
    for (const t of outline) {
        assert.deepEqual([t.stroke, t.strokeWidth, t.fill], [SCREEN.ink, 1.8, "none"]);
    }
});

test("on paper a colour fill is hatching in ink, and the outline is the one the screen draws", () => {
    const onScreen: Mark[] = [];
    const onPaper: Mark[] = [];
    const s = pen(false);
    const p = pen(true);
    s.rect(onScreen, 0, 0, 60, 40, "ruler", s.fill("sky"), { stroke: "#000" });
    p.rect(onPaper, 0, 0, 60, 40, "ruler", p.fill("sky"), { stroke: "#000" });
    const [hatch] = shapes(onPaper);
    assert.ok(hatch?.length && hatch.every((t) => t.stroke === PRINT.ink && t.fill === "none"));
    assert.deepEqual(onPaper[1], onScreen[1]);
});

test("the same seed draws the same marks, dotted fills included, and another seed does not", () => {
    const draw = (seed: number): Mark[] => {
        const marks: Mark[] = [];
        const p = pen(true, seed);
        p.circle(marks, 30, 30, 40, "pencil", p.fill("glow"));
        p.arrow(marks, [0, 0], [60, 20]);
        p.arc(marks, 30, 30, 50, 50, 0, Math.PI, "doodle");
        return marks;
    };
    assert.deepEqual(draw(7), draw(7));
    assert.notDeepEqual(draw(7), draw(8));
});

test("dashes and a polygon's even-odd fill reach the surface as rough.js draws them", () => {
    const marks: Mark[] = [];
    const p = pen(false);
    p.polygon(
        marks,
        [
            [0, 0],
            [40, 0],
            [20, 30],
        ],
        "ruler",
        p.fill("mint"),
    );
    p.line(marks, 0, 0, 40, 40, "ruler", { strokeLineDash: [4, 7] });
    const [fill, , line] = shapes(marks);
    assert.ok(fill?.every((t) => t.fillRule === "evenodd"));
    assert.ok(line?.length && line.every((t) => t.dash === "4 7" && t.fillRule === undefined));
});

test("a stroke with pressure is one outline, in its colour on screen and grey on paper", () => {
    const stroke: Stroke = {
        tool: "marker",
        color: "sky",
        size: 8,
        points: [
            [0, 0, 0.4],
            [1, 1, 0.6],
            [2, 0.5, 0.5],
        ],
    };
    const onScreen: Mark[] = [];
    const onPaper: Mark[] = [];
    pen(false).stroke(onScreen, stroke);
    pen(true).stroke(onPaper, stroke);
    assert.equal(onScreen.length, 1);
    const [a] = onScreen;
    const [b] = onPaper;
    assert.ok(a?.kind === "outline" && b?.kind === "outline");
    assert.match(a.d, /^M\S+ Q\S+ \S+ T.+Z$/);
    assert.deepEqual([a.fill, a.opacity], [SCREEN.sky, 0.95]);
    assert.deepEqual([b.d, b.fill, b.opacity], [a.d, "#C8C8C8", 0.95]);
});

test("a drawing that draws only with the pen draws onto the recorder, with no page", () => {
    const row: Visual<{ n: number }, Ctx<Mark[]>> = {
        id: "boxes",
        title: "Boxes",
        group: "Structures",
        about: "A row of answer boxes, one square each.",
        params: { n: 3 },
        box: (p) => ({ w: p.n, h: 1 }),
        draw: (c, p) => {
            const anchors: RawAnchors = {};
            for (let i = 0; i < p.n; i++) {
                c.pen.rect(c.g, i * U, 0, U, U, "ruler");
                anchors[`box(${i})`] = [i * U + U / 2, 0, "up"];
            }
            return anchors;
        },
    };
    const marks: Mark[] = [];
    const c = { pen: pen(true), ink: recorder, g: marks, t: PRINT, paper: true };
    const anchors = row.draw(c, { n: 4 });
    assert.equal(marks.length, 4);
    assert.deepEqual(Object.keys(anchors), ["box(0)", "box(1)", "box(2)", "box(3)"]);
    assert.deepEqual(row.box({ n: 4 }), { w: 4, h: 1 });
});

test("lettering, plain shapes, groups, clips and patterns reach the recorder in order, nested", () => {
    const marks: Mark[] = [];
    const c: Ctx<Mark[]> = { pen: pen(false), ink: recorder, g: marks, t: SCREEN, paper: false };
    const seven = { x: 10, y: 20, s: "7", face: "read", weight: 600, size: 16, fill: SCREEN.ink };
    letter(c, { ...seven, face: "read", anchor: "middle" });
    plain(c, { kind: "rect", x: 2, y: 8, w: 16, h: 14, r: 3, fill: "#FFFFFF" });
    const turned = group(c, { turn: [["rotate", 28, 190, 84]] });
    turned.pen.rect(turned.g, 0, 0, U, U, "ruler");
    const cut = clip(c, {
        kind: "polygon",
        points: [
            [0, 0],
            [40, 0],
            [20, 30],
        ],
    });
    plain(cut, { kind: "circle", cx: 5, cy: 5, r: 3, fill: SCREEN.sky });
    const glow = pattern(c, {
        kind: "radial",
        stops: [
            { at: 0, color: SCREEN.glow, opacity: 0.42 },
            { at: 100, color: SCREEN.glow, opacity: 0 },
        ],
    });
    plain(c, { kind: "circle", cx: 20, cy: 20, r: 10, fill: glow });
    assert.deepEqual(
        marks.map((m) => m.kind),
        ["letter", "plain", "group", "clip", "pattern", "plain"],
    );
    const [, , g, k, , last] = marks;
    assert.ok(g?.kind === "group" && g.marks.length === 1 && g.marks[0]?.kind === "shape");
    assert.ok(k?.kind === "clip" && k.marks[0]?.kind === "plain");
    assert.match(glow, /^url\(#.+\)$/);
    assert.ok(last?.kind === "plain" && last.p.fill === glow);
});

test("a part is a group of its own on screen, and on paper draws into the drawing's own group", () => {
    const onScreen: Mark[] = [];
    const screen = { pen: pen(false), ink: recorder, g: onScreen, t: SCREEN, paper: false };
    const wing = part(screen, "wing", [30, 12], { dir: -1 });
    const [m] = onScreen;
    assert.ok(m?.kind === "group");
    assert.deepEqual(m.o, { part: { name: "wing", pivot: [30, 12], dir: -1 } });
    assert.equal(wing.g, m.marks);

    const onPaper: Mark[] = [];
    const paper = { pen: pen(true), ink: recorder, g: onPaper, t: PRINT, paper: true };
    assert.equal(part(paper, "wing", [30, 12]), paper);
    assert.equal(onPaper.length, 0);
});
