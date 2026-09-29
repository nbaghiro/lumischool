import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, wide } from "../lettering";
import { parse, type Step } from "../../coding";
import { KIND_FILL, kindOfLine } from "./listing";

/** The size the words in a shape are written at, and the gap an arrow spans between two shapes, in squares. */
const SIZE = 14;
const GAP = 1;

type Shape = "oval" | "box" | "io" | "call" | "diamond";

/** One shape of the chart, placed in squares: its centre, its size, its words and the line it draws. */
interface Placed {
    shape: Shape;
    x: number;
    y: number;
    w: number;
    h: number;
    words: string[];
    line: number;
    fill: TokenName;
}

interface Chart {
    shapes: Placed[];
    /** Each a polyline in squares, with an arrowhead at its last point when `head` is set. */
    arrows: { pts: [number, number][]; head: boolean }[];
    labels: { x: number; y: number; s: string }[];
}

/** A laid-out run of steps: how far it reaches either side of the line the flow runs down, and how tall it is. */
interface Laid {
    l: number;
    r: number;
    h: number;
    /** The flow never comes out of the bottom, as after a repeat for ever. */
    ends: boolean;
    put(chart: Chart, x: number, y: number): void;
}

const textW = (s: string): number => wide(s, SIZE) / U;

/** The words of a long question split over two lines, so a diamond stays near the width of a box. */
function wrap(s: string): string[] {
    if (s.length <= 16) return [s];
    const ws = s.split(" ");
    let best: string[] = [s],
        most = Infinity;
    for (let i = 1; i < ws.length; i++) {
        const a = ws.slice(0, i).join(" "),
            b = ws.slice(i).join(" ");
        const longer = Math.max(a.length, b.length);
        if (longer < most) {
            most = longer;
            best = [a, b];
        }
    }
    return best;
}

function sized(
    shape: Shape,
    words: string[],
    line: number,
    fill: TokenName,
): Omit<Placed, "x" | "y"> {
    const widest = Math.max(0, ...words.map(textW));
    if (shape === "diamond") {
        // the words sit where the diamond is still wide enough for them
        const h = words.length > 1 ? 4 : 3;
        return { shape, words, line, fill, h, w: Math.max(6, (widest + 0.6) / 0.62 + 0.6) };
    }
    const pad = shape === "box" ? 1.4 : shape === "oval" ? 2.2 : 2.6;
    return { shape, words, line, fill, h: 2, w: Math.max(shape === "oval" ? 5 : 4, widest + pad) };
}

const one = (s: Omit<Placed, "x" | "y">): Laid => ({
    l: s.w / 2,
    r: s.w / 2,
    h: s.h,
    ends: false,
    put: (chart, x, y) => chart.shapes.push({ ...s, x, y: y + s.h / 2 }),
});

function sequence(parts: Laid[]): Laid {
    const cut = parts.findIndex((p) => p.ends);
    const run = cut < 0 ? parts : parts.slice(0, cut + 1);
    return {
        l: Math.max(0, ...run.map((p) => p.l)),
        r: Math.max(0, ...run.map((p) => p.r)),
        h: run.reduce((h, p) => h + p.h, 0) + GAP * Math.max(0, run.length - 1),
        ends: cut >= 0,
        put(chart, x, y) {
            let at = y;
            run.forEach((p, i) => {
                if (i) {
                    chart.arrows.push({
                        pts: [
                            [x, at],
                            [x, at + GAP],
                        ],
                        head: true,
                    });
                    at += GAP;
                }
                p.put(chart, x, at);
                at += p.h;
            });
        },
    };
}

/** A decision: yes carries on down, no goes out to the right and comes back in below both ways. */
function decision(ask: Omit<Placed, "x" | "y">, yes: Laid, no: Laid): Laid {
    const dh = ask.h,
        dw = ask.w;
    const nx = Math.max(dw / 2, yes.r) + 1.5 + no.l;
    const body = Math.max(yes.h, no.h);
    const m = dh + GAP + body + GAP;
    return {
        l: Math.max(dw / 2, yes.l),
        r: nx + Math.max(no.r, 0.3),
        h: m,
        ends: yes.ends && no.ends,
        put(chart, x, y) {
            chart.shapes.push({ ...ask, x, y: y + dh / 2 });
            chart.labels.push({ x: x + 0.9, y: y + dh + 0.75, s: "yes" });
            chart.labels.push({ x: x + dw / 2 + 0.9, y: y + dh / 2 - 0.35, s: "no" });
            const top = y + dh + GAP;
            if (yes.h) {
                chart.arrows.push({
                    pts: [
                        [x, y + dh],
                        [x, top],
                    ],
                    head: true,
                });
                yes.put(chart, x, top);
                if (!yes.ends)
                    chart.arrows.push({
                        pts: [
                            [x, top + yes.h],
                            [x, y + m],
                        ],
                        head: false,
                    });
            } else
                chart.arrows.push({
                    pts: [
                        [x, y + dh],
                        [x, y + m],
                    ],
                    head: false,
                });
            const right: [number, number] = [x + dw / 2, y + dh / 2];
            if (no.h) {
                chart.arrows.push({
                    pts: [right, [x + nx, y + dh / 2], [x + nx, top]],
                    head: true,
                });
                no.put(chart, x + nx, top);
                if (!no.ends)
                    chart.arrows.push({
                        pts: [
                            [x + nx, top + no.h],
                            [x + nx, y + m],
                            [x, y + m],
                        ],
                        head: true,
                    });
            } else
                chart.arrows.push({
                    pts: [right, [x + nx, y + dh / 2], [x + nx, y + m], [x, y + m]],
                    head: true,
                });
        },
    };
}

/**
 * A loop: the question comes first, no goes down through the lines it holds and an arrow runs back up
 * the left to ask again, and yes leaves by the right. A repeat for ever has no question and no way out.
 */
function loop(ask: Omit<Placed, "x" | "y"> | null, body: Laid): Laid {
    const join = 1,
        dh = ask?.h ?? 0,
        dw = ask?.w ?? 0;
    const top = join + (ask ? dh + GAP : 0);
    const bottom = top + body.h;
    const lx = Math.max(dw / 2, body.l) + 1,
        rx = Math.max(dw / 2, body.r) + 1;
    return {
        l: lx + 0.3,
        r: ask ? rx + 0.3 : body.r,
        h: bottom + (ask ? 1.6 : 0.8),
        ends: !ask,
        put(chart, x, y) {
            chart.arrows.push({
                pts: [
                    [x, y],
                    [x, y + join],
                ],
                head: !ask,
            });
            if (ask) {
                chart.shapes.push({ ...ask, x, y: y + join + dh / 2 });
                chart.labels.push({ x: x + 0.9, y: y + join + dh + 0.75, s: "no" });
                chart.labels.push({ x: x + dw / 2 + 0.9, y: y + join + dh / 2 - 0.35, s: "yes" });
                chart.arrows.push({
                    pts: [
                        [x, y + join + dh],
                        [x, y + top],
                    ],
                    head: true,
                });
            }
            body.put(chart, x, y + top);
            if (!body.ends)
                chart.arrows.push({
                    pts: [
                        [x, y + bottom],
                        [x, y + bottom + 0.8],
                        [x - lx, y + bottom + 0.8],
                        [x - lx, y + 0.5],
                        [x, y + 0.5],
                    ],
                    head: true,
                });
            if (ask)
                chart.arrows.push({
                    pts: [
                        [x + dw / 2, y + join + dh / 2],
                        [x + rx, y + join + dh / 2],
                        [x + rx, y + bottom + 1.6],
                        [x, y + bottom + 1.6],
                    ],
                    head: true,
                });
        },
    };
}

/** The words a step's shape carries, from the line as the block prints it. */
function chartOf(code: readonly string[], blank: number): { chart: Chart; w: number; h: number } {
    const p = parse(code);
    const text = new Map(p.lines.map((l) => [l.n, l.text.split(/\s+/).join(" ")]));
    const said = (n: number): string => text.get(n) ?? "";
    const blanked = (words: string[], line: number): string[] =>
        line && line === blank ? [] : words;
    const shaped = (shape: Shape, words: string[], line: number, fill: TokenName) =>
        sized(shape, blanked(words, line), line, fill);
    const ask = (s: string, line: number) =>
        shaped("diamond", wrap(`${s}?`), line, KIND_FILL.control);

    const lay = (steps: readonly Step[]): Laid => sequence(steps.map(step));
    function step(st: Step): Laid {
        const words = said(st.line);
        switch (st.t) {
            case "if":
                return decision(
                    ask(words.replace(/^if\s+/i, "").replace(/\s+then$/i, ""), st.line),
                    lay(st.ifTrue),
                    lay(st.otherwise),
                );
            case "repeat": {
                const times = words.replace(/^repeat\s+/i, "").replace(/\s+times$/i, "");
                return loop(ask(`done ${times} times`, st.line), lay(st.body));
            }
            case "until":
                return loop(ask(words.replace(/^repeat\s+until\s+/i, ""), st.line), lay(st.body));
            case "each":
                return loop(ask(`done every ${st.name} in ${st.list}`, st.line), lay(st.body));
            case "forever":
                return loop(null, lay(st.body));
            case "say":
                return one(shaped("io", [words], st.line, KIND_FILL.sound));
            case "call":
                return one(shaped("call", [words], st.line, KIND_FILL.proc));
            default:
                return one(shaped("box", [words], st.line, KIND_FILL[kindOfLine(words)]));
        }
    }
    const column = (start: string, line: number, steps: readonly Step[], end: string): Laid => {
        const body = lay(steps);
        const parts = [one(shaped("oval", [start], line, KIND_FILL.event))];
        if (steps.length) parts.push(body);
        if (!body.ends) parts.push(one(shaped("oval", [end], 0, KIND_FILL.event)));
        return sequence(parts);
    };
    const columns: { line: number; laid: Laid }[] = [];
    const others = p.scripts.length > 1 || p.procs.size > 0;
    for (const sc of p.scripts) {
        if (!sc.line && !sc.steps.length && others) continue;
        columns.push({
            line: sc.line,
            laid: column(sc.line ? said(sc.line) : "start", sc.line, sc.steps, "stop"),
        });
    }
    for (const proc of p.procs.values())
        columns.push({
            line: proc.line,
            laid: column(said(proc.line), proc.line, proc.body, "end"),
        });
    columns.sort((a, b) => a.line - b.line);

    const chart: Chart = { shapes: [], arrows: [], labels: [] };
    let x = 0.8,
        h = 0;
    for (const { laid } of columns) {
        laid.put(chart, x + laid.l, 0.8);
        x += laid.l + laid.r + 2;
        h = Math.max(h, laid.h);
    }
    return { chart, w: Math.max(6, Math.ceil(x - 1.2)), h: Math.ceil(h + 1.6) };
}

export const flowchart = defineDrawing({
    id: "flowchart",
    family: "coding",
    title: "A flowchart",
    group: "Structures",
    about: "A program drawn as a flowchart, from the same `code` a program listing takes, so the listing, the blocks and the flowchart are three drawings of one program and cannot disagree. Each script starts at an oval and ends at a stop oval, a step is a box, what the program says is a slanted box, a block of the child's own is a box with double sides, and a question is a diamond with a yes way down and a no way out to the right. A repeat asks whether it is done before each round, and its lines lead back up to the question with an arrow down the left; a repeat for ever just leads back. Each script and each block of one's own is a column of its own. `blank` leaves the shape for one line empty, for a child to write the missing step in, and `run` lights the shape for the line running now. `sense` gives the world the program runs in its sensors, written as the program drawing takes them, so a flowchart of a thermostat can be run and what it does to the reading proved.",
    params: {
        code: ["repeat 3", "  forward 2", "  turn right", "say done"],
        blank: 0,
        run: 0,
        sense: [] as string[],
    },
    settings: {
        code: { kind: "words", most: 14 },
        blank: { kind: "whole", min: 0, max: 14 },
        run: { kind: "whole", min: 0, max: 14 },
        sense: { kind: "words", most: 3 },
    },
    takes: [
        {
            label: "A repeat, as a loop",
            params: {
                code: ["repeat 3", "  forward 2", "  turn right", "say done"],
                blank: 0,
                run: 0,
                sense: [],
            },
        },
        {
            label: "A heater that watches the room",
            params: {
                code: [
                    "repeat 20",
                    "  if temp is less than 18",
                    "    switch heater on",
                    "  if temp is more than 21",
                    "    switch heater off",
                    "  wait 1",
                ],
                blank: 3,
                run: 0,
                sense: ["temp starts 15 changes -1 heater 2"],
            },
        },
        {
            label: "If and otherwise",
            params: {
                code: [
                    "set n to 7",
                    "if n is more than 5",
                    "  say big",
                    "otherwise",
                    "  say small",
                ],
                blank: 0,
                run: 0,
                sense: [],
            },
        },
        {
            label: "Keep going until the flag",
            params: {
                code: ["repeat until at flag", "  if wall ahead", "    turn right", "  forward 1"],
                blank: 0,
                run: 0,
                sense: [],
            },
        },
        {
            label: "A message between two scripts",
            params: {
                code: [
                    "when the flag is tapped",
                    "say ready",
                    "broadcast go",
                    "when I receive go",
                    "jump 2",
                ],
                blank: 0,
                run: 0,
                sense: [],
            },
        },
    ],
    box: (p) => {
        const { w, h } = chartOf(p.code, p.blank);
        return { w, h };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const { chart } = chartOf(p.code, p.blank);
        const ink = c.paper ? c.t.ink : c.t["ink-soft"];
        for (const ar of chart.arrows) {
            const pts = ar.pts.map(([x, y]): [number, number] => [x * U, y * U]);
            pen.linear(g, pts, "ruler", { strokeWidth: 1.8, stroke: ink });
            const [tip, from] = [pts[pts.length - 1], pts[pts.length - 2]];
            if (!ar.head || !tip || !from) continue;
            const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
            const at = (d: number, turn: number): [number, number] => [
                tip[0] - d * Math.cos(ang + turn),
                tip[1] - d * Math.sin(ang + turn),
            ];
            pen.polygon(
                g,
                [tip, at(9, 0.45), at(9, -0.45)],
                "ruler",
                { fill: ink, fillStyle: "solid" },
                { strokeWidth: 1, stroke: ink },
            );
        }
        for (const s of chart.shapes) {
            const x = s.x * U,
                y = s.y * U,
                w = s.w * U,
                h = s.h * U;
            const empty = s.line > 0 && s.line === p.blank;
            const lit = s.line > 0 && s.line === p.run;
            const fill = empty ? null : pen.fill(lit ? "glow" : c.paper ? "card" : s.fill);
            const edge = empty
                ? { strokeWidth: 1.6, strokeLineDash: [6, 5], stroke: c.t["ink-soft"] }
                : { strokeWidth: 1.8 };
            if (s.shape === "diamond")
                pen.polygon(
                    g,
                    [
                        [x, y - h / 2],
                        [x + w / 2, y],
                        [x, y + h / 2],
                        [x - w / 2, y],
                    ],
                    "ruler",
                    fill,
                    edge,
                );
            else if (s.shape === "io") {
                const k = 0.6 * U;
                pen.polygon(
                    g,
                    [
                        [x - w / 2 + k, y - h / 2],
                        [x + w / 2, y - h / 2],
                        [x + w / 2 - k, y + h / 2],
                        [x - w / 2, y + h / 2],
                    ],
                    "ruler",
                    fill,
                    edge,
                );
            } else {
                const r = s.shape === "oval" ? h / 2 : 6;
                pen.path(g, roundedRect(x - w / 2, y - h / 2, w, h, r), "ruler", fill, edge);
                if (s.shape === "call")
                    for (const side of [-1, 1])
                        pen.line(
                            g,
                            x + side * (w / 2 - 0.5 * U),
                            y - h / 2,
                            x + side * (w / 2 - 0.5 * U),
                            y + h / 2,
                            "ruler",
                            { strokeWidth: 1.4 },
                        );
            }
            const lines = s.words;
            lines.forEach((t, i) =>
                say(c, x, y + 5 + (i - (lines.length - 1) / 2) * 0.85 * U, t, SIZE),
            );
            if (s.line) a[`box(${s.line})`] = [x, y - h / 2, "up"];
        }
        for (const l of chart.labels) say(c, l.x * U, l.y * U + 4, l.s, 12, "start", c.t.ink);
        return a;
    },
    describe: () =>
        "A flowchart: an oval to start, boxes for the steps and diamonds for the questions, joined by arrows, with a yes way and a no way from each diamond.",
    motion: {
        still: "It is read by following the arrows from shape to shape, and shapes that move are harder to follow.",
    },
});

/** The words the shape for one line holds, on one line, or null when the line has no shape of its own. */
export function shapeWords(code: readonly string[], line: number): string | null {
    const got = chartOf(code, 0).chart.shapes.find((s) => s.line === line);
    return got ? got.words.join(" ") : null;
}
