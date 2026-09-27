import type { Rect } from "../../engine/space";
import type { CellLines, LineGroup, LineRun } from "../../engine/ui/map-tile-schema";

/** A stroke this narrow is under two pixels at the finest raster level, so it is drawn as a vector. */
export const LINE_WIDTH = 16;

export interface Stroke {
    /** Strokes with the same group composite together; -1 is no group. */
    group: number;
    alpha: number;
    stroke: string;
    width: number;
    dash: number[];
    d: string;
}

const MASKS = /(?:ow-fade-[xy]-m|m-known|m-reach)$/;

/**
 * Removes the thin strokes from an exported layer and returns them in drawing order. Runs in the
 * export page, after every CSS opacity has been written onto its element as an attribute.
 */
export function takeStrokes(svg: SVGSVGElement): Stroke[] {
    const all = [...svg.querySelectorAll<SVGElement>("*")].filter((n) => !n.closest("defs"));
    const strokes: Stroke[] = [];
    const groups = new Map<Element, number>();
    let first = -1;
    all.forEach((node, at) => {
        const width = Number(node.getAttribute("stroke-width"));
        const thin =
            node.tagName === "path" &&
            node.getAttribute("fill") === "none" &&
            (node.getAttribute("stroke") ?? "none") !== "none" &&
            width > 0 &&
            width < LINE_WIDTH;
        const paints = ["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"];
        if (!thin) {
            if (first >= 0 && paints.includes(node.tagName))
                throw new Error(
                    "A shape is drawn over a thin stroke; lines must be each layer's top",
                );
            return;
        }
        if (first < 0) first = at;
        let alpha = 1,
            group = -1;
        for (let n: Element | null = node; n && n !== svg; n = n.parentElement) {
            for (const name of ["transform", "filter", "clip-path", "stroke-opacity", "style"])
                if (n.hasAttribute(name)) throw new Error(`A thin stroke sits under ${name}`);
            const mask = n.getAttribute("mask");
            if (mask && !MASKS.test(mask.replace(/^url\(#|\)$/g, "")))
                throw new Error(`A thin stroke sits under an unknown mask ${mask}`);
            const opacity = n.getAttribute("opacity");
            if (opacity === null || Number(opacity) === 1) continue;
            if (n === node) throw new Error("A thin stroke has its own opacity");
            alpha *= Number(opacity);
            if (group < 0) {
                group = groups.get(n) ?? groups.size;
                groups.set(n, group);
            }
        }
        const dash = (node.getAttribute("stroke-dasharray") ?? "")
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number);
        strokes.push({
            group,
            alpha,
            stroke: node.getAttribute("stroke") ?? "",
            width,
            dash,
            d: node.getAttribute("d") ?? "",
        });
        const wrapper = node.parentElement;
        node.remove();
        if (
            wrapper &&
            wrapper.tagName === "g" &&
            !wrapper.attributes.length &&
            !wrapper.children.length
        )
            wrapper.remove();
    });
    return strokes;
}

const tenth = (t: number) => String(t / 10);
function join(values: number[]): string {
    let out = "";
    for (const v of values) {
        const s = tenth(v);
        out += out && !s.startsWith("-") ? ` ${s}` : s;
    }
    return out;
}

/** Each subpath of an absolute M/L/C path on its own, rounded to a tenth of a unit and written relative. */
export function subpaths(d: string): { d: string; box: Rect }[] {
    const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
    const out: { d: string; box: Rect }[] = [];
    let current: { d: string; xs: number[]; ys: number[] } | null = null;
    let x = 0,
        y = 0,
        command = "";
    const close = () => {
        if (current && current.d.includes("M") && current.xs.length > 1) {
            const left = Math.min(...current.xs) / 10,
                top = Math.min(...current.ys) / 10;
            out.push({
                d: current.d,
                box: {
                    x: left,
                    y: top,
                    w: Math.max(...current.xs) / 10 - left,
                    h: Math.max(...current.ys) / 10 - top,
                },
            });
        }
    };
    for (let i = 0; i < tokens.length;) {
        const token = tokens[i] ?? "";
        if (/[A-Za-z]/.test(token)) {
            if (!"MLC".includes(token)) throw new Error(`Unsupported path command ${token}`);
            command = token;
            i++;
            continue;
        }
        const arity = { M: 2, L: 2, C: 6 }[command];
        if (!arity) throw new Error("Path data before a command");
        const values = tokens.slice(i, i + arity).map((v) => Math.round(Number(v) * 10));
        if (values.length < arity || values.some((v) => !Number.isFinite(v)))
            throw new Error("Truncated path data");
        i += arity;
        if (command === "M") {
            close();
            [x, y] = [values[0] ?? 0, values[1] ?? 0];
            current = { d: `M${join([x, y])}`, xs: [x], ys: [y] };
            command = "L";
            continue;
        }
        if (!current) throw new Error("Path data before a move");
        const relative = values.map((v, k) => v - (k % 2 ? y : x));
        current.d += (command === "C" ? "c" : "l") + join(relative);
        for (let k = 0; k < arity; k += 2) {
            current.xs.push(values[k] ?? 0);
            current.ys.push(values[k + 1] ?? 0);
        }
        [x, y] = [values[arity - 2] ?? 0, values[arity - 1] ?? 0];
    }
    close();
    return out;
}

/** Bins per side of a cell: a frame's block then strokes a few bins rather than whole cells. */
const BINS = 16;

/**
 * Every stroke's subpaths, each in the one cell its centre falls in so nothing is drawn twice,
 * grouped and merged by style in drawing order and binned by place within the cell. `bleed` is how
 * far any stroke reaches past its cell.
 */
export function cellLines(
    layers: Partial<Record<"pencil" | "colour", Stroke[]>>,
    grid: { bounds: Rect; span: number; columns: number; rows: number },
): { cells: Map<number, CellLines>; bleed: number } {
    const cells = new Map<number, CellLines>();
    const last = new Map<string, number>();
    const bin = grid.span / BINS;
    const binned = new Map<LineRun, Map<string, LineRun["parts"][number]>>();
    let bleed = 0;
    const cellOf = (at: number, from: number, count: number) =>
        Math.min(count - 1, Math.max(0, Math.floor((at - from) / grid.span)));
    for (const layer of ["pencil", "colour"] as const)
        for (const s of layers[layer] ?? []) {
            const pad = s.width / 2 + 1;
            for (const sub of subpaths(s.d)) {
                const mx = sub.box.x + sub.box.w / 2,
                    my = sub.box.y + sub.box.h / 2;
                const cx = cellOf(mx, grid.bounds.x, grid.columns),
                    cy = cellOf(my, grid.bounds.y, grid.rows);
                const left = grid.bounds.x + cx * grid.span,
                    top = grid.bounds.y + cy * grid.span;
                const reach = {
                    x: sub.box.x - pad,
                    y: sub.box.y - pad,
                    w: sub.box.w + 2 * pad,
                    h: sub.box.h + 2 * pad,
                };
                bleed = Math.max(
                    bleed,
                    left - reach.x,
                    top - reach.y,
                    reach.x + reach.w - (left + grid.span),
                    reach.y + reach.h - (top + grid.span),
                );
                const id = cy * grid.columns + cx;
                const cell = cells.get(id) ?? {};
                cells.set(id, cell);
                const groups: LineGroup[] = (cell[layer] ??= []);
                const key = `${id}/${layer}`;
                let group = groups.at(-1);
                if (!group || last.get(key) !== s.group) {
                    group = { alpha: s.alpha, runs: [] };
                    groups.push(group);
                    last.set(key, s.group);
                }
                let run = group.runs.at(-1);
                if (
                    !run ||
                    run.stroke !== s.stroke ||
                    run.width !== s.width ||
                    run.dash.join() !== s.dash.join()
                ) {
                    run = { stroke: s.stroke, width: s.width, dash: s.dash, parts: [] };
                    group.runs.push(run);
                }
                const place = `${Math.min(BINS - 1, Math.floor((mx - left) / bin))},${Math.min(BINS - 1, Math.floor((my - top) / bin))}`;
                const parts = binned.get(run) ?? new Map<string, LineRun["parts"][number]>();
                binned.set(run, parts);
                const part = parts.get(place);
                if (part) {
                    part.d += sub.d;
                    part.box = union(part.box, reach);
                } else {
                    const fresh = { box: reach, d: sub.d };
                    parts.set(place, fresh);
                    run.parts.push(fresh);
                }
            }
        }
    for (const cell of cells.values())
        for (const groups of Object.values(cell))
            for (const group of groups)
                for (const run of group.runs)
                    for (const part of run.parts) part.box = rounded(part.box);
    return { cells, bleed: Math.ceil(bleed) };
}

const union = (a: Rect, b: Rect): Rect => {
    const x = Math.min(a.x, b.x),
        y = Math.min(a.y, b.y);
    return {
        x,
        y,
        w: Math.max(a.x + a.w, b.x + b.w) - x,
        h: Math.max(a.y + a.h, b.y + b.h) - y,
    };
};
const rounded = (r: Rect): Rect => {
    const x = Math.floor(r.x),
        y = Math.floor(r.y);
    return { x, y, w: Math.ceil(r.x + r.w) - x, h: Math.ceil(r.y + r.h) - y };
};
