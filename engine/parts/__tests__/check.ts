import { Pen } from "../../ink/pen";
import {
    recorder,
    type GroupOf,
    type Imported,
    type Mark,
    type RawAnchors,
    type Turn,
} from "../../ink/surface";
import { PALETTE, PRINT } from "../../paper";
import { CATALOG } from "../catalog";
import type { Drawing, Family } from "../drawing";

const { margin: _margin, ...SCREEN } = PALETTE.paper;

type Loader = () => Promise<Drawing<unknown>>;

/** The catalogue's lines, by family and then by id. */
export const LINES: Partial<Record<Family, Readonly<Record<string, Loader>>>> = CATALOG;

/** Every drawing in the catalogue, loaded. */
export const catalogued = async (): Promise<Drawing<unknown>[]> =>
    Promise.all(
        Object.values(LINES).flatMap((family) => Object.values(family ?? {}).map((load) => load())),
    );

export const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** A drawing drawn onto the recorder, as a page would draw it on screen or on paper. */
export function drawn<P>(
    d: Drawing<P>,
    p: P,
    o: { paper: boolean; seed?: number },
): { marks: Mark[]; anchors: RawAnchors } {
    const marks: Mark[] = [];
    const t = o.paper ? PRINT : SCREEN;
    const pen = new Pen(recorder, { seed: o.seed ?? 4127, t, paper: o.paper, roughness: 1 });
    const anchors = d.draw({ pen, ink: recorder, g: marks, t, paper: o.paper }, p);
    return { marks, anchors };
}

type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const times = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
];

function matrixOf(turn: Turn): Matrix {
    const [name, ...written] = turn;
    // a turn's number may come already written (a drawing's `x.toFixed(1)`), and reads back as a number
    const args = written.map(Number);
    const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = args;
    switch (name) {
        case "translate":
            return [1, 0, 0, 1, a, b];
        case "scale":
            return [a, 0, 0, args.length > 1 ? b : a, 0, 0];
        case "matrix":
            return [a, b, c, d, e, f];
        case "rotate": {
            const r = (a * Math.PI) / 180;
            const cos = Math.cos(r);
            const sin = Math.sin(r);
            return [cos, sin, -sin, cos, b - cos * b + sin * c, c - sin * b - cos * c];
        }
    }
}

/** Every mark with the groups it is drawn inside, outermost first. */
export function* everyMark(
    marks: readonly Mark[],
    within: readonly GroupOf[] = [],
): Generator<{ mark: Mark; within: readonly GroupOf[] }> {
    for (const mark of marks) {
        yield { mark, within };
        if (mark.kind === "group") yield* everyMark(mark.marks, [...within, mark.o]);
        if (mark.kind === "clip") yield* everyMark(mark.marks, within);
    }
}

/** The names of the parts a drawing drew, one entry per copy. */
export const partsIn = (marks: readonly Mark[]): string[] =>
    [...everyMark(marks)].flatMap(({ mark }) =>
        mark.kind === "group" && mark.o.part ? [mark.o.part.name] : [],
    );

const ARGS: Partial<Record<string, number>> = {
    M: 2,
    L: 2,
    T: 2,
    H: 1,
    V: 1,
    C: 6,
    S: 4,
    Q: 4,
    A: 7,
};

/** The points a path's absolute commands pass through or pull towards, enough to bound it. */
function pointsOf(d: string): [number, number][] {
    const out: [number, number][] = [];
    const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
    let command = "M";
    let x = 0;
    let y = 0;
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i] ?? "";
        if (/^[A-Za-z]$/.test(token)) {
            command = token.toUpperCase();
            i += 1;
            if (command === "Z") continue;
        }
        const n = ARGS[command] ?? 2;
        const args = tokens.slice(i, i + n).map(Number);
        i += Math.max(n, 1);
        if (command === "H") x = args[0] ?? x;
        else if (command === "V") y = args[0] ?? y;
        else if (command === "A") {
            x = args[5] ?? x;
            y = args[6] ?? y;
        } else {
            for (let k = 0; k + 1 < args.length; k += 2) out.push([args[k] ?? 0, args[k + 1] ?? 0]);
            x = args[n - 2] ?? x;
            y = args[n - 1] ?? y;
            continue;
        }
        out.push([x, y]);
    }
    return out;
}

/** The points that bound a hand-drawn file's shape, taken unturned, since the files turn a shape a few degrees at most. */
function shapeBounds(s: Imported["shapes"][number]): [number, number][] {
    const n = (k: string): number => {
        const v = s.attrs.find(([a]) => a === k)?.[1];
        return typeof v === "string" ? Number(v) : 0;
    };
    const d = s.attrs.find(([a]) => a === "d")?.[1];
    if (typeof d === "string") return pointsOf(d);
    if (s.tag === "rect")
        return [
            [n("x"), n("y")],
            [n("x") + n("width"), n("y") + n("height")],
        ];
    const [rx, ry] = s.tag === "circle" ? [n("r"), n("r")] : [n("rx"), n("ry")];
    return [
        [n("cx") - rx, n("cy") - ry],
        [n("cx") + rx, n("cy") + ry],
    ];
}

/** The points that bound one mark, before any group it is in turns it. */
function boundsOf(mark: Mark): [number, number][] {
    switch (mark.kind) {
        case "shape":
            return mark.traces.flatMap((t) => pointsOf(t.d));
        case "outline":
            return pointsOf(mark.d);
        case "plain": {
            const p = mark.p;
            if (p.kind === "rect")
                return [
                    [p.x, p.y],
                    [p.x + p.w, p.y + p.h],
                ];
            if (p.kind === "circle")
                return [
                    [p.cx - p.r, p.cy - p.r],
                    [p.cx + p.r, p.cy + p.r],
                ];
            if (p.kind === "ellipse")
                return [
                    [p.cx - p.rx, p.cy - p.ry],
                    [p.cx + p.rx, p.cy + p.ry],
                ];
            const [dx = 0, dy = 0] = p.shift ?? [];
            const own = (p.turn ?? []).reduce((acc, t) => times(acc, matrixOf(t)), IDENTITY);
            return pointsOf(p.d).map(([x, y]) => [
                own[0] * x + own[2] * y + own[4] + dx,
                own[1] * x + own[3] * y + own[5] + dy,
            ]);
        }
        case "letter": {
            const l = mark.l;
            if (l.along) return pointsOf(l.along.d);
            // lettering is taken at its reading face's usual width
            const w = l.s.length * l.size * 0.56;
            const left = l.anchor === "start" ? l.x : l.anchor === "end" ? l.x - w : l.x - w / 2;
            const own = (l.turn ?? []).reduce((acc, t) => times(acc, matrixOf(t)), IDENTITY);
            const corners: [number, number][] = [
                [left, l.y - l.size * 0.8],
                [left + w, l.y + l.size * 0.2],
            ];
            return corners.map(([x, y]) => [
                own[0] * x + own[2] * y + own[4],
                own[1] * x + own[3] * y + own[5],
            ]);
        }
        case "imported": {
            const [x0, y0] = mark.f.from;
            return mark.f.shapes.flatMap(shapeBounds).map(([x, y]) => [x - x0, y - y0]);
        }
        case "group":
        case "clip":
        case "pattern":
            return [];
    }
}

/** How far the ink reaches, in user units. */
export function reachOf(marks: readonly Mark[]): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
} {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const { mark, within } of everyMark(marks)) {
        const m = within
            .flatMap((o) => o.turn ?? [])
            .reduce((acc, t) => times(acc, matrixOf(t)), IDENTITY);
        for (const [px, py] of boundsOf(mark)) {
            const x = m[0] * px + m[2] * py + m[4];
            const y = m[1] * px + m[3] * py + m[5];
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
        }
    }
    return { x0, y0, x1, y1 };
}

/** Every colour the marks put on the page, a pattern's own colours included and its reference not. */
export const coloursIn = (marks: readonly Mark[]): Set<string> =>
    new Set(
        [...everyMark(marks)]
            .flatMap(({ mark }) => {
                switch (mark.kind) {
                    case "shape":
                        return mark.traces.flatMap((t) => [t.stroke, t.fill]);
                    case "outline":
                        return [mark.fill];
                    case "letter":
                        return [mark.l.fill, mark.l.outline?.stroke ?? "none"];
                    case "plain":
                        return [mark.p.fill ?? "none", mark.p.stroke ?? "none"];
                    case "pattern":
                        return mark.p.kind === "radial"
                            ? mark.p.stops.map((s) => s.color)
                            : mark.p.marks.flatMap((m) => [m.fill ?? "none", m.stroke ?? "none"]);
                    case "imported":
                        return mark.f.shapes.flatMap((s) =>
                            s.attrs.flatMap(([k, v]) =>
                                (k === "stroke" || k === "fill") && typeof v === "string"
                                    ? [v]
                                    : [],
                            ),
                        );
                    case "group":
                    case "clip":
                        return [];
                }
            })
            .filter((c) => !c.startsWith("url(")),
    );

export const letteringIn = (marks: readonly Mark[]) =>
    [...everyMark(marks)].flatMap(({ mark }) => (mark.kind === "letter" ? [mark.l] : []));
