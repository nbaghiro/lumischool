// A pack's scene (engine/scene.ts) drawn on a page's paper with the shelf's drawings. The scene never
// mentions pixels: the pack carries its boxes in squares, each node type maps to a drawing, and
// arrows join anchors after drawing. The nodes the vocabulary names by hand are drawn here from the
// drawings this file imports; every other part is drawn from the catalogue's drawing of that name,
// which the page loads first (`scenes`), as it loads the drawings its worlds name.
import {
    cutAreas,
    cutLayout,
    cuttingOf,
    plankAreas,
    plankLayout,
    plankOf,
    plankRest,
    plankStacks,
    type Arrangement,
} from "../arrange";
import { piecesOf, sizeOf } from "../motion/cuts";
import type { PackLesson } from "../pack";
import { MARKERS, PRINT, U, type Marker } from "../paper";
import { dotArray } from "../parts/counting/array";
import { barModel } from "../parts/counting/barmodel";
import { hundredSquare } from "../parts/counting/hundred";
import { numberBond } from "../parts/counting/numberbond";
import { numberLine } from "../parts/counting/numberline";
import { tallyMarks } from "../parts/counting/tally";
import { tenFrame } from "../parts/counting/tenframe";
import { barGraph } from "../parts/data/bargraph";
import { lineGraph } from "../parts/data/linegraph";
import { pictureGraph } from "../parts/data/picgraph";
import { dataTable } from "../parts/data/table";
import { longCake } from "../parts/food/longcake";
import { fractionBar } from "../parts/fractions/fraction.bar";
import { fractionCircle } from "../parts/fractions/fraction.circle";
import { guideV } from "../parts/guide/guide.firefly";
import { matchPairs } from "../parts/letters/match";
import { highlight, loop, tick } from "../parts/marks";
import { massSet } from "../parts/measuring/masses";
import { rulerCm } from "../parts/measuring/ruler";
import { coinRow } from "../parts/money/coins";
import { rhythmBar } from "../parts/music/staff";
import { speechBubble } from "../parts/page/bubble";
import { choiceCards } from "../parts/page/choice";
import { noteCard } from "../parts/page/note";
import { headRow } from "../parts/people/heads";
import { placeValue } from "../parts/place/placevalue";
import { drawProp } from "../parts/props";
import { balance } from "../parts/puzzles/balance";
import { matchsticks } from "../parts/puzzles/matchsticks";
import { patternStrip } from "../parts/puzzles/pattern";
import { fulcrum } from "../parts/science/fulcrum";
import { partsDiagram, type PartsOf } from "../parts/science/parts";
import { seesawPlank } from "../parts/science/seesawplank";
import { seesawProps } from "../parts/science/seesawprops";
import { angleFig } from "../parts/shapes/angle";
import { gridSquares } from "../parts/shapes/grid";
import { ellShape } from "../parts/shapes/lshape";
import { mirrorShape } from "../parts/shapes/mirror";
import { bubbleTail } from "../parts/speech";
import { diceV } from "../parts/sport/prop.dice";
import { orderRows } from "../parts/stories/sequence";
import { areaGrid } from "../parts/sums/areagrid";
import { busStop } from "../parts/sums/longdiv";
import { numberPyramid } from "../parts/sums/pyramid";
import { clock } from "../parts/time/clock";
import { mapGrid, type MapThing } from "../parts/travel/gridmap";
import { writingRules } from "../parts/writing/handwriting";
import { wordBoxes } from "../parts/writing/word-input";
import {
    paramsOf,
    pyramidRows,
    shown,
    wrap,
    type Box,
    type CValue,
    type Opt,
    type Scene,
    type SceneNode,
    type TextVal,
} from "../scene";
import { drawingOf, loadDrawings } from "./drawings";
import { readTokens } from "./read-tokens";
import { SvgPen as Pen, defineVisual, el, render, text } from "./svg";

export interface SceneOptions {
    output?: "screen" | "paper";
    /** Answers to show in the inputs, in the teacher's pen: input or blank name → value. */
    key?: Record<string, string>;
    seed?: number;
    /** For a part the child arranges, by id: what is on it, and whether it has been let go (the props away, the pieces measured). */
    arranged?: Record<string, { places: Arrangement; checked: boolean }>;
    /** A pen loop round this anchor, which is where a feedback rule points. */
    point?: string;
}

/**
 * A pack's scene drawn into a box on the page's paper, laid out as the pack carries it: with `key`,
 * the answers written into their boxes in the teacher's pen, by the answer's name; with `point`, a
 * pen loop round the part a feedback rule names; with `arranged`, a part the child arranges drawn
 * with what is on it, and let go once `checked`.
 */
export type SceneDrawer = (host: Element, scene: Scene, o: SceneOptions) => SVGSVGElement;

// A row of whatever prop the item names: a counter, a shape, a coin or a piece of fruit. It is the
// renderer's own rather than a drawing on the shelf, as it was, so its markup stays as it was.
const propRow = defineVisual({
    id: "props",
    title: "Props",
    group: "Props",
    about: "",
    params: { count: 3, prop: "apple" },
    box: (p) => ({ w: p.count * 2 + 1, h: 3 }),
    draw: (c, p) => {
        const a: Record<string, [number, number, "up"]> = {};
        for (let i = 0; i < p.count; i++) {
            drawProp(c, p.prop, 30 + i * 40, 30, 32);
            a[`item(${i})`] = [30 + i * 40, 10, "up"];
        }
        return a;
    },
});

/** A line of text a node holds, once filled, or undefined where the setting is not text. */
const textOf = (c: SceneNode, k = "text"): TextVal | undefined => {
    const x = c.v[k];
    return typeof x === "object" && !Array.isArray(x) ? x : undefined;
};
const numOr = (v: CValue | undefined): number | "?" => (typeof v === "number" ? v : "?");
/** The numbers in a list of expressions, with a `?` as NaN, as a drawing reads them. */
const nums = (v: CValue | undefined): number[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "number" ? x : Number(x))) : [];
const nullable = (v: CValue | undefined): (number | null)[] =>
    Array.isArray(v)
        ? v.map((x) => (x === null ? null : typeof x === "number" ? x : Number(x)))
        : [];
const words = (v: CValue | undefined): string[] =>
    Array.isArray(v)
        ? v.map((x) => (typeof x === "object" && x !== null ? x.label : String(x)))
        : [];
const options = (v: CValue | undefined): Opt[] =>
    Array.isArray(v) ? v.flatMap((x) => (typeof x === "object" && x !== null ? [x] : [])) : [];
const labels = (v: CValue | undefined): string[] => options(v).map((o) => o.label);
const markerOf = (v: CValue | undefined, fallback: Marker): Marker =>
    MARKERS.find((m) => m === v) ?? fallback;
const word = (v: CValue | undefined, fallback: string): string =>
    typeof v === "string" ? v : fallback;
const partsOf = (v: CValue | undefined): PartsOf => (v === "fish" || v === "island" ? v : "plant");
const thingOf = (v: CValue | undefined): MapThing =>
    v === "tree" || v === "boat" || v === "bridge" ? v : "hut";

/** The boxes a child fills in, in the scene's square coordinates, keyed by answer name. */
export function inputBoxes(scene: Scene): Record<string, Box> {
    const out: Record<string, Box> = {};
    const put = (name: string, box: Box): void => {
        out[name] = box;
    };
    for (const c of scene.nodes) {
        const b = scene.boxes[c.id];
        if (!b) continue;
        if (c.type === "number-input" || c.type === "word-input") put(c.id, b);
        else if (c.type === "columns") {
            const a = shown(c.v.a);
            const d = shown(c.v.b);
            const add = word(c.v.op, "add") === "add";
            const mul = word(c.v.op, "add") === "mul";
            const result = String(
                mul
                    ? Number(c.v.a) * Number(c.v.b)
                    : add
                      ? Number(c.v.a) + Number(c.v.b)
                      : Number(c.v.a) - Number(c.v.b),
            );
            const span = mul ? result.length : Math.max(a.length, d.length) + (add ? 1 : 0);
            put(c.id, { x: b.x + b.w - span, y: b.y + 3, w: span, h: 1 });
        } else if (c.type === "equation") {
            let cell = 0;
            const text = textOf(c);
            for (const [i, part] of (text?.pieces ?? []).entries()) {
                if (part.k === "blank")
                    put(part.name, {
                        x: b.x + cell * 2 + 0.15,
                        y: b.y + 0.15,
                        w: 1.7,
                        h: 1.7,
                    });
                cell +=
                    part.k === "blank"
                        ? 1
                        : Array.from(text?.parts[i] ?? "").filter((x) => x.trim()).length;
            }
        } else if (c.type === "pyramid") {
            const cells = nullable(c.v.cells);
            const names = words(c.v.blanks);
            const rows = pyramidRows(cells.length);
            let cell = 0;
            let blank = 0;
            for (let row = 0; row < rows; row++)
                for (let column = 0; column < rows - row; column++, cell++)
                    if (cells[cell] === null) {
                        const name = names[blank++];
                        if (name)
                            put(name, {
                                x: b.x + row * 2 + column * 4 + 0.5,
                                y: b.y + (rows - 1 - row) * 2 + 0.5,
                                w: 4,
                                h: 2,
                            });
                    }
        } else if (c.type === "longdiv") {
            const [quotient, remainder] = words(c.v.blanks);
            const divisor = shown(c.v.by);
            const dividend = shown(c.v.n);
            const x = b.x + 0.5 + divisor.length * 1.5;
            if (quotient)
                put(quotient, { x: x + 0.4, y: b.y + 0.5, w: dividend.length * 1.6, h: 1.7 });
            if (remainder)
                put(remainder, {
                    x: x + dividend.length * 1.6 + 2.2,
                    y: b.y + 0.5,
                    w: 1.6,
                    h: 1.7,
                });
        } else if (c.type === "areagrid") {
            const names = words(c.v.blanks);
            for (let row = 0; row < 2; row++)
                for (let column = 0; column < 2; column++) {
                    const name = names[row * 2 + column];
                    if (name)
                        put(name, {
                            x: b.x + 4 + column * 5,
                            y: b.y + 2 + row * 3,
                            w: 5,
                            h: 3,
                        });
                }
            const total = names[4];
            if (total) put(total, { x: b.x + 15, y: b.y + 1.5, w: 4.4, h: 2 });
        } else if (c.type === "sequence") {
            words(c.v.blanks).forEach((name, i) =>
                put(name, { x: b.x + 0.1, y: b.y + i * 3 + 0.1, w: 1.8, h: 1.8 }),
            );
        } else if (c.type === "match") {
            const left = labels(c.v.left);
            const width = Math.max(
                7,
                Math.ceil(Math.max(0, ...left.map((x) => x.length)) * 0.5) + 3,
            );
            words(c.v.blanks).forEach((name, i) =>
                put(name, { x: b.x + width - 1.9, y: b.y + i * 3 + 0.1, w: 1.8, h: 1.8 }),
            );
        }
    }
    return out;
}

/** The cards a child can choose in a scene, in the scene's square coordinates, keyed by answer name. */
export function choiceBoxes(scene: Scene): Record<string, { value: string; box: Box }[]> {
    const out: Record<string, { value: string; box: Box }[]> = {};
    for (const c of scene.nodes) {
        if (c.type !== "choice") continue;
        const b = scene.boxes[c.id];
        if (!b) continue;
        const choices = options(c.v.options);
        const width = Math.max(
            3,
            ...choices.map((choice) => Math.max(3, Math.ceil(choice.label.length * 0.62) + 2)),
        );
        out[c.id] = choices.map((choice, i) => ({
            value: choice.value,
            box: {
                x: b.x + (word(c.v.stack, "row") === "column" ? 0 : i * (width + 1)),
                y: b.y + (word(c.v.stack, "row") === "column" ? i * 4 : 0),
                w: width,
                h: 3,
            },
        }));
    }
    return out;
}

/**
 * The drawings a scene places that this renderer does not draw itself, by the loader's name: a part
 * read off the shelf by its id, and a hand-drawn file as `file:<name>`. A page loads them before it
 * draws (`scenes`).
 */
export function drawingsOf(scene: Scene): string[] {
    const out = new Set<string>();
    for (const c of scene.nodes) {
        if (c.type === "art") out.add(`file:${textOf(c, "asset")?.filled ?? ""}`);
        else if (!DRAWN.has(c.type)) out.add(c.type);
    }
    return [...out];
}

/** Every scene a pack lesson holds at any level: its scene blocks, and its questions' scenes, the draws for another day included. */
export const scenesIn = (lesson: PackLesson): Scene[] =>
    Object.values(lesson.levels).flatMap((at) =>
        at.sections.flatMap((s) =>
            s.blocks.flatMap((b) =>
                b.k === "scene"
                    ? [b.scene]
                    : b.k === "ask"
                      ? [...b.questions, ...b.again.flat()].flatMap((q) =>
                            q.scene ? [q.scene] : [],
                        )
                      : [],
            ),
        ),
    );

/** The drawer of the scenes given, with the drawings they name loaded first, so it draws them whole. */
export async function scenes(of: readonly Scene[]): Promise<SceneDrawer> {
    const refs = [...new Set(of.flatMap(drawingsOf))];
    await loadDrawings(refs);
    return renderLaidOut;
}

export function renderLaidOut(host: Element, scene: Scene, o: SceneOptions): SVGSVGElement {
    const [W, H] = scene.size;
    const boxes = scene.boxes;
    const paper = o.output === "paper";
    const t = paper ? PRINT : readTokens(host);
    const svg = el("svg", { viewBox: `0 0 ${W * U} ${H * U}`, class: "scene-svg", role: "img" });
    svg.style.setProperty("--w", String(W));
    const pen = new Pen(svg, { seed: o.seed ?? 4127, t, paper, roughness: 1 });
    // Highlighter goes under the drawings; pen marks go over them.
    const under = el("g", {}, svg);
    const g = el("g", {}, svg);
    const anchors = new Map<string, { x: number; y: number }>();
    /** Areas an arranged part names, in pixels, which a pen loop goes round rather than a point. */
    const areaOf = new Map<string, Box>();
    const vopts = { host, output: o.output, seed: o.seed };
    const keyText = (x: number, y: number, s: string, size = 24): SVGTextElement =>
        text(
            g,
            x,
            y,
            s,
            `font:600 ${size}px var(--f-hand);font-variation-settings:'INFM' 100;fill:${t.pen}`,
        );
    const keyed = (name: string | undefined): string =>
        name === undefined ? "" : (o.key?.[name] ?? "");

    for (const c of scene.nodes) {
        const b = boxes[c.id];
        if (!b) continue;
        const x = b.x * U;
        const y = b.y * U;
        const v = c.v;
        let r: ReturnType<typeof render> | null = null;
        switch (c.type) {
            case "balance":
                r = render(
                    balance,
                    {
                        left: words(v.left).map(itemOf),
                        right: words(v.right).map(itemOf),
                        tilt: Number(v.tilt ?? 0),
                        label: textOf(c, "label")?.filled ?? "",
                    },
                    vopts,
                );
                break;
            case "tenframe":
                r = render(
                    tenFrame,
                    { count: Number(v.count), color: markerOf(v.color, "berry") },
                    vopts,
                );
                break;
            case "numberline": {
                let at = Number(v.start ?? v.from ?? 0);
                const jumps = nullable(v.jumps).map((j) => {
                    const a = at;
                    at += Number(j);
                    return { a, b: at, label: `+${j}` };
                });
                r = render(
                    numberLine,
                    {
                        from: Number(v.from ?? 0),
                        to: Number(v.to ?? 10),
                        step: Number(v.step ?? 1),
                        jumps,
                    },
                    vopts,
                );
                break;
            }
            case "numberbond": {
                const ps = nullable(v.parts);
                r = render(
                    numberBond,
                    {
                        whole: numOr(v.whole),
                        parts: [numOr(ps[0] ?? undefined), numOr(ps[1] ?? undefined)],
                    },
                    vopts,
                );
                break;
            }
            case "barmodel":
                r = render(
                    barModel,
                    {
                        whole: numOr(v.whole),
                        parts: nullable(v.parts).map((p) => numOr(p ?? undefined)),
                    },
                    vopts,
                );
                break;
            case "fraction":
                r =
                    v.shape === "bar"
                        ? render(fractionBar, { n: Number(v.n), k: Number(v.k) }, vopts)
                        : render(fractionCircle, { n: Number(v.n), k: Number(v.k) }, vopts);
                break;
            case "clock":
                r = render(clock, { h: Number(v.h), m: Number(v.m ?? 0) }, vopts);
                break;
            case "matchsticks":
                r = render(matchsticks, { eq: textOf(c, "eq")?.filled ?? "" }, vopts);
                break;
            case "guide":
                r = render(guideV, { pose: word(v.pose, "idle") }, vopts);
                break;
            case "props":
                r = render(propRow, { count: Number(v.count), prop: shown(v.prop) }, vopts);
                break;
            case "text": {
                const s = textOf(c)?.filled ?? "";
                const lines = v.width ? wrap(s, Number(v.width)) : [s];
                lines.forEach((line, i) =>
                    text(
                        g,
                        x,
                        y + 26 + i * 40,
                        line,
                        `font:700 17px var(--f-read);fill:${t.ink}`,
                        "start",
                    ),
                );
                break;
            }
            case "equation": {
                let cx = x;
                const tv = textOf(c);
                // walk the filled text, and the pieces alongside it to know where the blanks are
                const cellsOf: (string | { blank: string })[] = [];
                (tv?.pieces ?? []).forEach((p, i) => {
                    if (p.k === "blank") cellsOf.push({ blank: p.name });
                    else cellsOf.push(...Array.from(tv?.parts[i] ?? "").filter((ch) => ch.trim()));
                });
                for (const item of cellsOf) {
                    if (typeof item === "string")
                        text(g, cx + 20, y + 29, item, `font:700 26px var(--f-read);fill:${t.ink}`);
                    else {
                        pen.rect(g, cx + 3, y + 3, 34, 34, "ruler", null, { strokeWidth: 2 });
                        const written = keyed(item.blank);
                        if (written) keyText(cx + 20, y + 29, written, 26);
                    }
                    cx += 40;
                }
                break;
            }
            case "number-input": {
                pen.rect(g, x, y, b.w * U, b.h * U, "ruler", null, { strokeWidth: 2 });
                const written = keyed(c.id);
                if (written) keyText(x + (b.w * U) / 2, y + 28, written);
                break;
            }
            case "columns":
                columns(c, b);
                break;
            case "choice": {
                const list = options(v.options);
                const want = o.key?.[c.id];
                r = render(
                    choiceCards,
                    {
                        options: list,
                        stack: word(v.stack, "row"),
                        chosen: want === undefined ? -1 : list.findIndex((x) => x.value === want),
                    },
                    vopts,
                );
                break;
            }
            case "grid":
                r = render(
                    gridSquares,
                    {
                        rows: Number(v.rows),
                        cols: Number(v.cols),
                        shade: Number(v.shade ?? 0),
                        color: markerOf(v.color, "mint"),
                        cell: Number(v.cell ?? 2),
                    },
                    vopts,
                );
                break;
            case "hundred":
                r = render(
                    hundredSquare,
                    {
                        from: Number(v.from ?? 1),
                        to: Number(v.to ?? 100),
                        start: Number(v.start ?? 0),
                        add: Number(v.add ?? 0),
                        hide: nums(v.hide),
                    },
                    vopts,
                );
                break;
            case "ruler":
                r = render(
                    rulerCm,
                    {
                        cm: Number(v.cm),
                        length: Number(v.length),
                        start: Number(v.start ?? 0),
                        thing: word(v.thing, "pencil"),
                    },
                    vopts,
                );
                break;
            case "coins":
                r = render(
                    coinRow,
                    {
                        quarters: Number(v.quarters ?? 0),
                        dimes: Number(v.dimes ?? 0),
                        nickels: Number(v.nickels ?? 0),
                        pennies: Number(v.pennies ?? 0),
                    },
                    vopts,
                );
                break;
            case "pattern":
                r = render(
                    patternStrip,
                    {
                        unit: words(v.unit),
                        count: Number(v.count),
                        missing: Number(v.missing ?? v.count),
                    },
                    vopts,
                );
                break;
            case "tally":
                r = render(tallyMarks, { count: Number(v.count) }, vopts);
                break;
            case "placevalue":
                r = render(placeValue, { tens: Number(v.tens), ones: Number(v.ones) }, vopts);
                break;
            case "array":
                r = render(
                    dotArray,
                    { rows: Number(v.rows), cols: Number(v.cols), color: markerOf(v.color, "sky") },
                    vopts,
                );
                break;
            case "dice":
                r = render(diceV, { faces: nums(v.faces) }, vopts);
                break;
            case "picgraph":
                r = render(
                    pictureGraph,
                    { labels: labels(v.labels), counts: nums(v.counts), prop: shown(v.prop) },
                    vopts,
                );
                break;
            case "bargraph":
                r = render(
                    barGraph,
                    {
                        labels: labels(v.labels),
                        values: nums(v.values),
                        max: Number(v.max ?? 0),
                        color: markerOf(v.color, "sky"),
                    },
                    vopts,
                );
                break;
            case "art": {
                const d = drawingOf(`file:${textOf(c, "asset")?.filled ?? ""}`);
                if (d) r = render(d, d.params, vopts);
                break;
            }
            case "table":
                r = render(
                    dataTable,
                    { cols: Number(v.cols), head: labels(v.head), cells: labels(v.cells) },
                    vopts,
                );
                break;
            case "linegraph":
                r = render(
                    lineGraph,
                    {
                        labels: labels(v.labels),
                        values: nums(v.values),
                        max: Number(v.max ?? 0),
                        color: markerOf(v.color, "berry"),
                    },
                    vopts,
                );
                break;
            case "angle":
                r = render(
                    angleFig,
                    {
                        deg: Number(v.deg),
                        arm: Number(v.arm ?? 5),
                        label: textOf(c, "label")?.filled ?? "",
                        mark: word(v.mark, "arc"),
                        line: v.line === true,
                    },
                    vopts,
                );
                break;
            case "lshape":
                r = render(
                    ellShape,
                    {
                        w: Number(v.w),
                        h: Number(v.h),
                        cut: Number(v.cut),
                        deep: Number(v.deep),
                        corner: word(v.corner, "top-right"),
                        cell: Number(v.cell ?? 2),
                        squares: v.squares === true,
                    },
                    vopts,
                );
                break;
            case "mirror":
                r = render(
                    mirrorShape,
                    {
                        shape: shown(v.shape),
                        line: word(v.line, "vertical"),
                        size: Number(v.size ?? 6),
                    },
                    vopts,
                );
                break;
            case "pyramid": {
                const cells = nullable(v.cells);
                const names = words(v.blanks);
                let k = 0;
                r = render(
                    numberPyramid,
                    {
                        rows: pyramidRows(cells.length),
                        cells: cells.map((cell) =>
                            cell === null ? keyed(names[k++]) : String(cell),
                        ),
                        blank: cells.map((cell) => cell === null),
                    },
                    vopts,
                );
                break;
            }
            case "longdiv": {
                const names = words(v.blanks);
                r = render(
                    busStop,
                    {
                        n: shown(v.n),
                        by: shown(v.by),
                        quotient: keyed(names[0]),
                        remainder: keyed(names[1]),
                    },
                    vopts,
                );
                break;
            }
            case "areagrid": {
                const a = Number(v.a);
                const bb = Number(v.b);
                const names = words(v.blanks);
                r = render(
                    areaGrid,
                    {
                        cols: [Math.floor(a / 10) * 10, a % 10],
                        rows: [Math.floor(bb / 10) * 10, bb % 10],
                        cells: names.slice(0, 4).map((nm) => keyed(nm)),
                        total: keyed(names[4]),
                    },
                    vopts,
                );
                break;
            }
            case "heads":
                r = render(headRow, { count: Number(v.count), mark: Number(v.mark ?? 0) }, vopts);
                break;
            case "word-input":
                r = render(wordBoxes, { letters: b.w / 2, written: keyed(c.id) }, vopts);
                break;
            case "sequence":
                r = render(
                    orderRows,
                    { items: labels(v.items), numbers: words(v.blanks).map((nm) => keyed(nm)) },
                    vopts,
                );
                break;
            case "match":
                r = render(
                    matchPairs,
                    {
                        left: labels(v.left),
                        right: labels(v.right),
                        numbers: words(v.blanks).map((nm) => keyed(nm)),
                    },
                    vopts,
                );
                break;
            case "parts":
                r = render(partsDiagram, { of: partsOf(v.of) }, vopts);
                break;
            case "staff":
                r = render(rhythmBar, { notes: nums(v.notes), beats: Number(v.beats ?? 0) }, vopts);
                break;
            case "handwriting":
                r = render(
                    writingRules,
                    {
                        show: textOf(c, "show")?.filled ?? "",
                        rows: Number(v.rows ?? 1),
                        trace: Number(v.trace ?? 3),
                        width: b.w,
                    },
                    vopts,
                );
                break;
            case "gridmap":
                r = render(
                    mapGrid,
                    {
                        cols: Number(v.cols),
                        rows: Number(v.rows),
                        col: Number(v.col),
                        row: Number(v.row),
                        thing: thingOf(v.thing),
                    },
                    vopts,
                );
                break;
            case "balance-plank":
                plankNode(c, b);
                break;
            case "fair-cut":
                cutNode(c, b);
                break;
            case "bubble":
                r = render(
                    speechBubble,
                    { lines: wrap(textOf(c)?.filled ?? "", b.w - 1), width: b.w, tail: null },
                    vopts,
                );
                break;
            case "note":
                if (o.key || !v.solution)
                    r = render(
                        noteCard,
                        { lines: wrap(textOf(c)?.filled ?? "", b.w - 1), width: b.w },
                        vopts,
                    );
                break;
            default: {
                // A part read off the shelf, drawn from its own declaration with the anchors it returns,
                // once the page has loaded it. A part that has somewhere to write an answer (a `written`
                // setting) is given the key for its own id, so the answer key can fill it in the teacher's pen.
                const d = drawingOf(c.type);
                if (!d) break;
                const params = paramsOf(d, v);
                const written = o.key?.[c.id];
                if (written !== undefined && "written" in params) params.written = written;
                r = render(d, params, vopts);
            }
        }
        if (r) {
            r.svg.removeAttribute("class");
            r.svg.removeAttribute("style");
            // A nested viewport hides what reaches past it, and a drawing may reach past the box it
            // declares: a guide's halo, the number under a bead string's cut. It is an attribute
            // rather than a rule so that it travels with the markup into print and into a saved SVG.
            r.svg.setAttribute("overflow", "visible");
            for (const [k, val] of Object.entries({ x, y, width: b.w * U, height: b.h * U }))
                r.svg.setAttribute(k, String(val));
            g.appendChild(r.svg);
            for (const [name, a] of Object.entries(r.anchors))
                anchors.set(`${c.id}.${name}`, { x: b.x + a.x, y: b.y + a.y });
        }
    }

    function columns(c: SceneNode, b: Box): void {
        const a = shown(c.v.a);
        const bb = shown(c.v.b);
        const op = word(c.v.op, "add");
        const add = op === "add";
        const mul = op === "mul";
        const res = String(
            mul
                ? Number(c.v.a) * Number(c.v.b)
                : add
                  ? Number(c.v.a) + Number(c.v.b)
                  : Number(c.v.a) - Number(c.v.b),
        );
        // How many digit squares the answer row takes, which is also how far the rule runs.
        const span = mul ? res.length : Math.max(a.length, bb.length) + (add ? 1 : 0);
        const right = b.x + b.w;
        const cell = (
            col: number,
            row: number,
            s: string,
            style = `font:700 15px var(--f-read);fill:${t.ink}`,
        ): SVGTextElement => text(g, (col + 0.5) * U, (b.y + row) * U + 15, s, style);
        Array.from(a).forEach((d, i) => cell(right - a.length + i, 1, d));
        cell(right - span - 1, 2, mul ? "×" : add ? "+" : "−");
        Array.from(bb).forEach((d, i) => cell(right - bb.length + i, 2, d));
        pen.line(g, (right - span - 1) * U, (b.y + 3) * U, right * U, (b.y + 3) * U, "ruler", {
            strokeWidth: 2,
        });
        const key = o.key?.[c.id];
        if (key) {
            Array.from(key).forEach((d, i) =>
                cell(
                    right - key.length + i,
                    3,
                    d,
                    `font:600 16px var(--f-hand);font-variation-settings:'INFM' 100;fill:${t.pen}`,
                ),
            );
            if (add) {
                const da = Array.from(a).reverse().map(Number);
                const db = Array.from(bb).reverse().map(Number);
                let carry = 0;
                for (let k = 0; k < Math.max(da.length, db.length); k++) {
                    carry = (da[k] ?? 0) + (db[k] ?? 0) + carry >= 10 ? 1 : 0;
                    if (carry)
                        cell(right - k - 2, 0, "1", `font:600 11px var(--f-hand);fill:${t.pen}`);
                }
            }
        } else {
            pen.rect(g, (right - span) * U, (b.y + 3) * U + 2, span * U, U - 4, "ruler", null, {
                strokeWidth: 1.8,
            });
        }
    }

    const point = (ref: string): [number, number] | null => {
        const hit = anchors.get(ref);
        if (hit) return [hit.x * U, hit.y * U];
        const [id = ""] = ref.split(".");
        const b = boxes[id];
        return b ? [(b.x + b.w / 2) * U, (b.y + b.h / 2) * U] : null;
    };
    for (const a of scene.arrows) {
        const p = point(a.from);
        const q = point(a.to);
        if (p && q) pen.arrow(g, p, q, t.pen);
    }

    // Pen marks sit on top of whatever they point at; the ones that give the answer away are only
    // drawn when the answers are shown.
    const over = { pen, g, t, paper };
    const below = { pen, g: under, t, paper };
    for (const m of scene.marks) {
        if (m.solution && !o.key) continue;
        const at = area(m.target);
        if (!at) continue;
        if (m.type === "tick") tick(over, at.x + at.w + 6, at.y + at.h / 2 - 4, 1.1);
        else if (m.type === "loop") {
            const [sw, sh] = typeof m.v.size === "string" ? m.v.size.split("x").map(Number) : [];
            loop(
                over,
                at.x + at.w / 2,
                at.y + at.h / 2,
                sw === undefined ? at.w + 10 : sw * U,
                sh === undefined ? at.h + 8 : sh * U,
            );
        } else if (m.type === "highlight") {
            const y = at.y + at.h * 0.62;
            highlight(
                { ...below, t: { ...t, glow: t[markerOf(m.v.color, "glow")] } },
                at.x + 4,
                y,
                at.x + at.w - 4,
                y,
                Math.min(16, at.h * 0.5),
            );
        }
    }
    for (const c of scene.nodes) {
        const b = boxes[c.id];
        if (c.type !== "bubble" || typeof c.v.from !== "string" || !b) continue;
        const to = point(c.v.from);
        if (to) bubbleTail(over, { x: b.x * U, y: b.y * U, w: b.w * U, h: b.h * U }, to);
    }
    // Where the feedback rule for a child's answer points. Only the page asks for it, so it never prints.
    if (o.point) {
        const at = area(o.point);
        if (at) loop(over, at.x + at.w / 2, at.y + at.h / 2, at.w + 10, at.h + 8);
    }
    return svg;

    /** Where a mark lands: the area an arranged part gives the anchor, the anchor it names, or the whole node. */
    function area(ref: string): Box | null {
        const own = areaOf.get(ref);
        if (own) return own;
        const hit = anchors.get(ref);
        if (hit) return { x: (hit.x - 1) * U, y: (hit.y - 1) * U, w: 2 * U, h: 2 * U };
        const [id = ""] = ref.split(".");
        const b = boxes[id];
        return b ? { x: b.x * U, y: b.y * U, w: b.w * U, h: b.h * U } : null;
    }

    /** A shelf drawing placed at a point in squares, cropped to one piece of itself when it draws a set. */
    function put(
        r: ReturnType<typeof render>,
        at: { x: number; y: number },
        parent: Element,
        crop?: Box,
    ): void {
        r.svg.removeAttribute("class");
        r.svg.removeAttribute("style");
        // whole, the drawing shows what it draws outside its box; cropped, the viewport is the crop
        if (!crop) r.svg.setAttribute("overflow", "visible");
        const w = crop ? crop.w : r.box.w;
        const h = crop ? crop.h : r.box.h;
        if (crop)
            r.svg.setAttribute(
                "viewBox",
                `${crop.x * U} ${crop.y * U} ${crop.w * U} ${crop.h * U}`,
            );
        for (const [k, val] of Object.entries({
            x: at.x * U,
            y: at.y * U,
            width: w * U,
            height: h * U,
        }))
            r.svg.setAttribute(k, String(val));
        parent.appendChild(r.svg);
    }

    /** An arranged part's named areas, kept for a pen loop and as anchors at their middles. */
    function keep(id: string, b: Box, areas: Record<string, Box>): void {
        for (const [name, a] of Object.entries(areas)) {
            areaOf.set(`${id}.${name}`, {
                x: (b.x + a.x) * U,
                y: (b.y + a.y) * U,
                w: a.w * U,
                h: a.h * U,
            });
            anchors.set(`${id}.${name}`, { x: b.x + a.x + a.w / 2, y: b.y + a.y + a.h / 2 });
        }
    }

    /**
     * A see-saw plank from the shelf's drawings: the props while it is held level, the pivot stand, the
     * plank with the load and the weights stacked on their steps, and the weights on the grass. Let go,
     * it turns to the angle lever.ts rests it at. On paper with nothing placed, each open step has a
     * box over it to write the weights in.
     */
    function plankNode(c: SceneNode, b: Box): void {
        const p = plankOf(c.v);
        if (typeof p === "string") return;
        const L = plankLayout(p);
        const displayed = o.arranged?.[c.id];
        const places = displayed?.places ?? [];
        const checked = displayed?.checked === true;
        const at = (x: number, y: number): { x: number; y: number } => ({ x: b.x + x, y: b.y + y });
        // The props stand halfway between the last two steps, clear of the numbers under the plank.
        const reach = p.steps * p.gap;
        const underPlank = L.top + 0.76;
        const span = 2 * reach - p.gap;
        if (!checked)
            put(
                render(seesawProps, { span, tall: L.ground - underPlank }, vopts),
                at(L.mid - span / 2 - 1, underPlank),
                g,
            );
        put(render(fulcrum, { stone: false }, vopts), at(L.mid - 1.5, L.pivot - 0.3), g);
        const px = (b.x + L.mid) * U;
        const py = (b.y + L.pivot) * U;
        const turn = checked ? plankRest(p, places) : 0;
        const plank = el(
            "g",
            {
                transform: `rotate(${(turn * 180) / Math.PI} ${px} ${py})`,
                "data-lean": c.id,
                "data-pivot": `${px} ${py}`,
            },
            g,
        );
        put(
            render(seesawPlank, { steps: p.steps, gap: p.gap, numbers: true }, vopts),
            at(L.mid - reach - 1, L.top - 0.62),
            plank,
        );
        const weight = (kg: number, x: number, y: number, parent: Element): void =>
            put(
                render(massSet, { masses: [kg * 1000] }, vopts),
                at(x, y),
                parent,
                L.weight(kg).crop,
            );
        for (const s of plankStacks(p, L, places)) weight(s.kg, s.box.x, s.box.y, plank);
        p.bags.forEach((kg, i) => {
            const spot = L.grass[i];
            if (spot && !places.some((x) => x.piece === `bag(${i})`)) weight(kg, spot.x, spot.y, g);
        });
        if (paper && !displayed) {
            const w = Math.min(p.gap - 0.6, 1.6 * p.most + 0.8);
            const load = L.weight(p.load).body + 0.15;
            for (const s of p.open) {
                const y = L.top - (s === p.loadAt ? load : 0) - 2.4;
                pen.rect(
                    g,
                    (b.x + L.stepX(s) - w / 2) * U,
                    (b.y + y) * U,
                    w * U,
                    2 * U,
                    "ruler",
                    null,
                    {
                        strokeWidth: 1.8,
                    },
                );
            }
            text(
                g,
                (b.x + L.mid) * U,
                (b.y + L.caption + 1.3) * U,
                "Write the weights for each step in its box.",
                `font:700 15px var(--f-read);fill:${t.ink}`,
            );
        }
        keep(c.id, b, plankAreas(p, L, places));
    }

    /**
     * A long cake from the shelf's drawing, drawn as the pieces its cuts make, parted a little so each
     * one shows. Let go, each piece has its length in squares under it. On paper with nothing cut it
     * says how to answer, and the squares of the sheet are the measure.
     */
    function cutNode(c: SceneNode, b: Box): void {
        const s = cuttingOf(c.v);
        if (typeof s === "string") return;
        const L = cutLayout(s);
        const displayed = o.arranged?.[c.id];
        const places = displayed?.places ?? [];
        const cuts = places.map((x) => x.at).sort((x, y) => x - y);
        piecesOf(s.whole, cuts).forEach((pc, i) => {
            const x = b.x + L.pieceX(pc.from, i);
            put(
                render(
                    longCake,
                    { whole: s.whole, from: pc.from, to: pc.to, candles: s.candles, lit: false },
                    vopts,
                ),
                { x, y: b.y },
                g,
            );
            if (displayed?.checked)
                text(
                    g,
                    (x + 0.5 + sizeOf(pc) / 2) * U,
                    (b.y + L.sizes + 1.2) * U,
                    String(sizeOf(pc)),
                    `font:700 17px var(--f-read);fill:${t.ink}`,
                );
        });
        if (paper && !displayed)
            text(
                g,
                (b.x + 0.5) * U,
                (b.y + L.caption + 1.3) * U,
                "Draw a line where each cut goes.",
                `font:700 15px var(--f-read);fill:${t.ink}`,
                "start",
            );
        keep(c.id, b, cutAreas(s, L, places));
    }
}

/** The node types this file draws itself, so a page need not load a drawing for them. */
const DRAWN = new Set([
    "balance",
    "tenframe",
    "numberline",
    "numberbond",
    "barmodel",
    "fraction",
    "clock",
    "matchsticks",
    "guide",
    "props",
    "text",
    "equation",
    "number-input",
    "columns",
    "choice",
    "grid",
    "hundred",
    "ruler",
    "coins",
    "pattern",
    "tally",
    "placevalue",
    "array",
    "dice",
    "picgraph",
    "bargraph",
    "table",
    "linegraph",
    "angle",
    "lshape",
    "mirror",
    "pyramid",
    "longdiv",
    "areagrid",
    "heads",
    "word-input",
    "sequence",
    "match",
    "parts",
    "staff",
    "handwriting",
    "gridmap",
    "balance-plank",
    "fair-cut",
    "bubble",
    "note",
    "row",
    "column",
]);

const ITEMS = ["cube", "ball", "star", "apple"] as const;
type Item = (typeof ITEMS)[number];
/** A prop on a pan, as the balance draws one: anything it has no picture for is drawn as a star, as it always was. */
const itemOf = (s: string): Item => ITEMS.find((i) => i === s) ?? "star";
