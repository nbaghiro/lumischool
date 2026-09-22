// A checked scene made concrete for one variant, and laid out in squares. Instantiating evaluates
// every expression, fills every template, replaces every role by its prop and expands every
// component, so layout and drawing only ever see concrete scenes. Layout resolves placements on the
// scene grid; anchors inside a drawing (s2.left-pan) are exact only once it is drawn, so here they
// resolve to the drawing's box.
import { cutLayout, cuttingOf, plankLayout, plankOf } from "../arrange";
import {
    evaluate,
    parseExpr,
    pieces,
    showValue,
    type Env,
    type Expr,
    type Piece,
    type Value,
} from "../expr";
import { lineTicks } from "../paper";
import {
    pyramidRows,
    shown,
    wrap,
    type Box,
    type CValue,
    type Opt,
    type Place,
    type TextVal,
} from "../scene";
import type { Define, Term, TNode, Val, ValueItem } from "./notation";
import { asset, assetNames, NOUNS, partBox, type NodeSpec } from "./vocabulary";

export const noun = (prop: string, many: boolean): string => {
    const f = NOUNS[prop];
    return f ? f[many ? 1 : 0] : many ? `${prop}s` : prop;
};

/** Fill a template. A bare role name reads as its singular noun. */
export function fill(
    ps: Piece[],
    env: Env,
    roles: Record<string, string>,
    blank: (name: string) => string = () => "□",
): string {
    return fillParts(ps, env, roles, blank).join("");
}

/** What each piece becomes, in order, so a renderer can tell a blank from the text around it. */
export function fillParts(
    ps: Piece[],
    env: Env,
    roles: Record<string, string>,
    blank: (name: string) => string = () => "□",
): string[] {
    return ps.map((p) => {
        if (p.k === "text") return p.v;
        if (p.k === "blank") return blank(p.name);
        if (p.k === "noun") return noun(roles[p.role] ?? p.role, p.many);
        if (p.e.t === "id") {
            const role = roles[p.e.name];
            if (role !== undefined && !env[p.e.name]) return noun(role, false);
        }
        return showValue(evaluate(p.e, env));
    });
}

/** tick(k) means the tick this variant's k picks, so the index is filled in before anything reads it. */
export const fillIndex = (r: string, env: Env): string =>
    r.replace(/\(([A-Za-z_]\w*)\)/g, (whole, id: string) => {
        const v = env[id];
        return v === undefined ? whole : `(${showValue(v)})`;
    });

export interface Concrete {
    type: string;
    id: string;
    spec: NodeSpec;
    v: Record<string, CValue>;
    place: Place | null;
    node: TNode;
    /** For a row or a column: the children it places, in order. */
    contains?: string[];
}
/** A mark drawn on top of another node: a tick, a loop, a highlighter swipe. */
export interface Mark {
    type: string;
    target: string;
    solution: boolean;
    v: Record<string, CValue>;
    node: TNode;
}
export interface SceneInstance {
    size: [number, number];
    nodes: Concrete[];
    arrows: { from: string; to: string; node: TNode }[];
    marks: Mark[];
}

const plain = (v: Value): number | boolean | string =>
    v.k === "num" ? v.v.n / v.v.d : v.k === "bool" ? v.v : showValue(v);
/** A value where a number is wanted: a list of expressions, or a coordinate. */
const numberOf = (v: Value, what: string): number => {
    if (v.k === "num") return v.v.n / v.v.d;
    if (v.k === "bool") return v.v ? 1 : 0;
    throw new Error(`${what} must be a number, not ${showValue(v)}`);
};
const count = (v: Value, what: string): number => {
    if (v.k !== "num" || v.v.d !== 1 || v.v.n < 0)
        throw new Error(`${what} must be a whole number, not ${showValue(v)}`);
    return v.v.n;
};
function termExpr(t: Term): Expr | null {
    if (t.k === "num") return parseExpr(t.v);
    if (t.k === "word" && /^[A-Za-z_]\w*$/.test(t.v)) return { t: "id", name: t.v };
    if (t.k === "expr") return parseExpr(t.v);
    return null;
}

const RELATIVE = ["right-of", "left-of", "below", "above"] as const;

export function instantiate(
    scene: { size: [number, number]; nodes: TNode[] },
    env: Env,
    roles: Record<string, string>,
    defines: Map<string, Define>,
    prefix = "",
): SceneInstance {
    const out: SceneInstance = { size: scene.size, nodes: [], arrows: [], marks: [] };
    const name = (id: string): string => (prefix ? `${prefix}-${id}` : id);
    const index = (r: string): string => fillIndex(r, env);
    const ref = (raw: string): string => {
        const r = index(raw);
        if (!prefix) return r;
        if (!r.includes(".")) return name(r);
        const [head = "", ...rest] = r.split(".");
        return `${name(head)}.${rest.join(".")}`;
    };

    emit(scene.nodes, null);
    return out;

    function emit(nodes: TNode[], inside: { id: string; count: number } | null): string[] {
        const made: string[] = [];
        for (const n of nodes) {
            if (n.type === "arrow") {
                const from = n.args.from;
                const to = n.args.to;
                if (from?.k === "ref" && to?.k === "ref")
                    out.arrows.push({ from: ref(from.v), to: ref(to.v), node: n });
                continue;
            }
            if (n.spec.overlay) {
                const target = n.args.target;
                if (target?.k === "ref") {
                    const v: Record<string, CValue> = {};
                    for (const [k, x] of Object.entries(n.props)) {
                        if (x.k === "num") v[k] = x.v;
                        else if (x.k === "word") v[k] = x.v;
                        else if (x.k === "size") v[k] = [x.w, x.h].join("x");
                    }
                    out.marks.push({
                        type: n.type,
                        target: ref(target.v),
                        solution: n.flags.includes("solution"),
                        v,
                        node: n,
                    });
                }
                continue;
            }
            if (n.type === "use") {
                const comp =
                    n.args.component?.k === "ref" ? defines.get(n.args.component.v) : undefined;
                if (!comp)
                    throw new Error(
                        `there is no component "${n.args.component?.k === "ref" ? n.args.component.v : "?"}"`,
                    );
                const innerEnv: Env = { ...env };
                const innerRoles: Record<string, string> = { ...roles };
                for (const [k, v] of Object.entries(n.open)) {
                    const t = v.k === "any" ? v.t : null;
                    if (!t) throw new Error(`cannot bind ${k} to that value`);
                    const role = t.k === "word" ? roles[t.v] : undefined;
                    if (role !== undefined) {
                        innerRoles[k] = role;
                        continue;
                    }
                    const e = termExpr(t);
                    if (!e) throw new Error(`cannot bind ${k} to that value`);
                    innerEnv[k] = evaluate(e, env);
                }
                const as = n.props.as?.k === "word" ? n.props.as.v : "";
                const inner = instantiate(
                    { size: scene.size, nodes: comp.nodes },
                    innerEnv,
                    innerRoles,
                    defines,
                    as ? name(as) : prefix,
                );
                out.nodes.push(...inner.nodes);
                out.arrows.push(...inner.arrows);
                out.marks.push(...inner.marks);
                continue;
            }
            const c: Concrete = {
                type: n.type,
                id: name(n.id ?? `${n.type}${out.nodes.length}`),
                spec: n.spec,
                v: {},
                place: null,
                node: n,
            };
            const put = (key: string, x: Val): void => {
                switch (x.k) {
                    case "expr":
                        c.v[key] = plain(evaluate(x.e, env));
                        break;
                    case "text": {
                        const ps = pieces(x.v);
                        const parts = fillParts(ps, env, roles);
                        c.v[key] = {
                            pieces: ps,
                            parts,
                            filled: parts.join(""),
                            blanks: ps.flatMap((p) => (p.k === "blank" ? [p.name] : [])),
                        };
                        break;
                    }
                    case "items":
                        c.v[key] = x.v.flatMap((it) =>
                            Array<string>(
                                it.times ? count(evaluate(it.times, env), `${it.role} ×`) : 1,
                            ).fill(roles[it.role] ?? it.role),
                        );
                        break;
                    case "exprs":
                        c.v[key] = x.v.map((e) =>
                            e ? numberOf(evaluate(e, env), `${n.type} ${key}`) : null,
                        );
                        break;
                    case "word":
                        c.v[key] = x.v;
                        break;
                    case "ref":
                        c.v[key] = ref(x.v);
                        break;
                    case "values":
                        c.v[key] = x.v.map((o) => option(o, env, roles));
                        break;
                    case "num":
                        c.v[key] = x.v;
                        break;
                    case "words":
                        c.v[key] = x.v;
                        break;
                    default:
                        break;
                }
            };
            for (const [k, x] of Object.entries(n.args)) put(k, x);
            for (const f of n.flags) c.v[f] = true;
            for (const [k, x] of Object.entries(n.props)) {
                if (["at", "right-of", "left-of", "below", "above", "gap"].includes(k)) continue;
                put(k, x);
            }
            const p = n.props;
            const gap = p.gap?.k === "num" ? p.gap.v : 0;
            if (p.at?.k === "any") {
                const t = p.at.t;
                if (t.k === "word" && !/^[A-Za-z_]\w*$/.test(t.v))
                    c.place = { rel: "on", of: ref(t.v) };
                else {
                    const e = termExpr(t);
                    if (e?.t === "call" && e.fn === "canvas" && e.args.length === 2) {
                        const [x = 0, y = 0] = e.args.map((a) =>
                            numberOf(evaluate(a, env), "canvas(x, y)"),
                        );
                        c.place = { rel: "at", x, y };
                    } else if (t.k === "word") c.place = { rel: "on", of: ref(t.v) };
                    else throw new Error(`at= takes canvas(x, y) or a node such as s2.left-pan`);
                }
            }
            for (const rel of RELATIVE) {
                const r = p[rel];
                if (r?.k === "ref") c.place = { rel, of: ref(r.v), gap };
            }
            if (inside) c.place = { rel: "in", of: inside.id, index: inside.count++ };
            out.nodes.push(c);
            made.push(c.id);
            if (n.spec.container) c.contains = emit(n.children, { id: c.id, count: 0 });
        }
        return made;
    }
}

/** One option as the child sees it (the label) and as an answer must name it (the value). */
function option(o: ValueItem, env: Env, roles: Record<string, string>): Opt {
    if (o.k === "text") {
        const label = fill(pieces(o.v), env, roles);
        return { kind: "text", label, value: label };
    }
    if (o.k === "word") {
        // A role or a prop names a picture; anything else that is a parameter reads as its value, the
        // same way {n} does inside text.
        const param = !roles[o.v] && !NOUNS[o.v] ? env[o.v] : undefined;
        if (param) {
            const shown = showValue(param);
            return { kind: param.k === "str" ? "text" : "num", label: shown, value: shown };
        }
        const prop = roles[o.v] ?? o.v;
        return { kind: "prop", label: noun(prop, false), value: o.v, prop };
    }
    const v = evaluate(o.e, env);
    const shown = showValue(v);
    return { kind: v.k === "str" ? "text" : "num", label: shown, value: shown };
}

/** A line of text a node holds, once filled; undefined where the setting is not text. */
export const textOf = (c: Concrete, key = "text"): TextVal | undefined => {
    const x = c.v[key];
    return typeof x === "object" && !Array.isArray(x) ? x : undefined;
};

/** Average width of an Andika glyph at 17 px, in squares of 20 px; the same estimate wrap() breaks lines by. */
const CHAR_W = 0.45;

/** A card in a choice: wide enough for its label, or square for a picture. */
const cardWidth = (o: Opt): number =>
    o.kind === "prop" ? 3 : Math.max(3, Math.ceil(o.label.length * 0.62) + 2);
/** Tally marks: a five is four uprights and a stroke across, then the odd ones. */
const tallyWidth = (count: number): number => {
    const fives = Math.floor(count / 5);
    const rest = count % 5;
    return fives * 3 + (rest ? rest * 0.6 + 0.4 : 0);
};
// The same formulas as the drawings, repeated here the way tallyWidth is, because layout has to know
// a node's size without loading the drawing code. TODO: delete these in favour of each drawing's own
// box() once the renderer's hand-written nodes are drawings on the shelf.
/** Every column of a table is as wide as the longest thing in it. */
const tableCol = (entries: string[]): number =>
    Math.max(3, Math.ceil(Math.max(0, ...entries.map((s) => s.length)) * 0.55) + 1);
/** The divisor, the bracket, the dividend and room for "r ▢". */
const busStopWidth = (n: string, by: string): number =>
    Math.ceil(by.length * 1.5 + n.length * 1.6 + 6);
// A row of text is as wide as its longest entry, and a diagram has a fixed box per shape.
const textW = (entries: string[]): number =>
    Math.ceil(Math.max(0, ...entries.map((s) => s.length)) * 0.5);
const orderWidth = (items: string[]): number => Math.max(10, textW(items) + 4);
const matchWidth = (left: string[], right: string[]): number =>
    Math.max(7, textW(left) + 3) + Math.max(6, textW(right) + 3) + 2;
const PLANT = { w: 9, h: 12 };
const PARTS_BOX: Record<string, { w: number; h: number }> = {
    plant: PLANT,
    fish: { w: 13, h: 9 },
    island: { w: 13, h: 10 },
};

export function sizeOf(c: Concrete): { w: number; h: number } {
    const v = c.v;
    const txt = (k: string): string => textOf(c, k)?.filled ?? "";
    const n = (k: string, fallback = 0): number => {
        const x = v[k];
        return typeof x === "number" ? x : fallback;
    };
    const opts = (k: string): Opt[] => {
        const x = v[k];
        return Array.isArray(x)
            ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
            : [];
    };
    const nums = (k: string): number[] => {
        const x = v[k];
        return Array.isArray(x) ? x.map((o) => (typeof o === "number" ? o : Number(o) || 0)) : [];
    };
    const len = (k: string): number => {
        const x = v[k];
        return Array.isArray(x) ? x.length : 0;
    };
    switch (c.type) {
        case "choice": {
            const list = opts("options");
            const w = Math.max(3, ...list.map(cardWidth));
            return v.stack === "column"
                ? { w, h: list.length * 4 - 1 }
                : { w: list.length * (w + 1) - 1, h: 3 };
        }
        case "art": {
            const a = asset(txt("asset"));
            if (!a)
                throw new Error(
                    `there is no art asset "${txt("asset")}"; the art folder has ${assetNames().join(", ")}`,
                );
            return a.box;
        }
        case "grid": {
            const cell = n("cell", 2);
            return { w: n("cols") * cell + 2, h: n("rows") * cell + 2 };
        }
        case "hundred": {
            const rows = Math.ceil(n("to", 100) / 10) - Math.floor((n("from", 1) - 1) / 10);
            return { w: 22, h: rows * 2 + 2 };
        }
        case "ruler":
            return { w: n("cm") * 2 + 3, h: 7 };
        case "placevalue":
            return {
                w: Math.ceil((n("tens") * 18 + 16 + Math.ceil(n("ones") / 5) * 14 + 16) / 20),
                h: 6,
            };
        case "array":
            return { w: n("cols") + 1, h: n("rows") + 1 };
        case "dice":
            return { w: Math.ceil(len("faces") * 2.5 + 0.5), h: 3 };
        case "coins":
            return {
                w: (n("quarters") + n("dimes") + n("nickels") + n("pennies")) * 2 + 1,
                h: 3,
            };
        case "pattern":
            return { w: n("count") * 3 + 1, h: 4 };
        case "tally":
            return { w: Math.ceil(tallyWidth(n("count"))) + 1, h: 3 };
        case "picgraph": {
            const labels = opts("labels");
            const lw = Math.max(4, ...labels.map((o) => Math.ceil(o.label.length * 0.45) + 1));
            return {
                w: lw + Math.max(...nums("counts"), 1) * 2 + 2,
                h: labels.length * 2 + 2,
            };
        }
        case "bargraph": {
            const labels = opts("labels");
            const max = Math.max(n("max", 0), ...nums("values"), 1);
            return { w: labels.length * 3 + 4, h: max + 4 };
        }
        case "bubble":
        case "note": {
            const s = txt("text");
            const width = n("width", Math.min(18, Math.ceil(s.length * 0.45) + 3));
            const lines = wrap(s, width - 1).length;
            return { w: width, h: c.type === "bubble" ? lines * 2 + 2 : lines + 2 };
        }
        case "numberline":
            return {
                w: lineTicks(Number(v.from ?? 0), Number(v.to ?? 10), Number(v.step ?? 1)) + 1,
                h: 5,
            };
        case "fraction":
            return v.shape === "bar" ? { w: 12, h: 3 } : { w: 5, h: 5 };
        case "matchsticks":
            return { w: Math.ceil((txt("eq").length * 42 + 10) / 20), h: 5 };
        case "props":
            return { w: Number(v.count) * 2 + 1, h: 3 };
        case "text": {
            const full = Math.ceil(txt("text").length * CHAR_W) + 1;
            return v.width
                ? { w: Number(v.width), h: 2 * wrap(txt("text"), Number(v.width)).length }
                : { w: full, h: 2 };
        }
        case "equation":
            return { w: txt("text").replace(/\s+/g, "").length * 2, h: 2 };
        case "number-input":
            return { w: Number(v.width ?? 4), h: 2 };
        case "columns": {
            const digits =
                v.op === "mul"
                    ? String(Number(v.a) * Number(v.b)).length
                    : Math.max(shown(v.a).length, shown(v.b).length);
            return { w: digits + 2, h: 5 };
        }
        case "table": {
            const cols = Math.max(1, n("cols", 1));
            const head = opts("head");
            const cells = opts("cells");
            const rows = (head.length ? 1 : 0) + Math.ceil(cells.length / cols);
            return {
                w: cols * tableCol([...head, ...cells].map((o) => o.label)) + 1,
                h: rows * 2 + 1,
            };
        }
        case "linegraph": {
            const labels = opts("labels");
            return {
                w: labels.length * 3 + 4,
                h: Math.max(n("max", 0), ...nums("values"), 1) + 4,
            };
        }
        case "angle": {
            const arm = n("arm", 5);
            return { w: arm * 2 + 2, h: arm * 2 + 2 };
        }
        case "lshape": {
            const cell = n("cell", 2);
            return { w: n("w") * cell + 4, h: n("h") * cell + 4 };
        }
        case "mirror": {
            const s = n("size", 6);
            return { w: s + 2, h: s + 2 };
        }
        case "pyramid": {
            const rows = pyramidRows(len("cells"));
            return { w: rows * 4 + 1, h: rows * 2 + 1 };
        }
        case "longdiv":
            return { w: busStopWidth(shown(v.n), shown(v.by)), h: 5 };
        case "areagrid":
            return { w: 4 + 2 * 5 + 7, h: 2 + 2 * 3 };
        case "heads":
            return { w: n("count") * 2 + 1, h: 4 };
        case "word-input": {
            const list = opts("options");
            return {
                w: (n("letters") || Math.max(1, ...list.map((o) => o.label.length))) * 2,
                h: 2,
            };
        }
        case "sequence": {
            const items = opts("items").map((o) => o.label);
            return { w: orderWidth(items), h: items.length * 3 };
        }
        case "match": {
            const left = opts("left").map((o) => o.label);
            const right = opts("right").map((o) => o.label);
            return { w: matchWidth(left, right), h: Math.max(left.length, right.length) * 3 };
        }
        case "parts":
            return PARTS_BOX[shown(v.of)] ?? PLANT;
        case "staff":
            return { w: len("notes") * 3 + 4, h: 5 };
        case "handwriting":
            return { w: n("width", 26), h: n("rows", 1) * 4 };
        case "gridmap":
            return { w: n("cols") * 2 + 3, h: n("rows") * 2 + 3 };
        case "balance-plank": {
            const p = plankOf(v);
            return typeof p === "string" ? { w: 4, h: 2 } : plankLayout(p).box;
        }
        case "fair-cut": {
            const s = cuttingOf(v);
            return typeof s === "string" ? { w: 4, h: 2 } : cutLayout(s).box;
        }
    }
    // A part read off the shelf is sized by the drawing itself, which is the only place its size is
    // written down.
    const own = partBox(c.type, c.v);
    if (own) return own;
    const [w, h] = c.spec.box ?? [4, 2];
    return { w, h };
}

/** A row or a column is as big as its children and the spaces between them. */
function groupSize(
    n: Concrete,
    sized: (c: Concrete) => { w: number; h: number },
    byId: Map<string, Concrete>,
): { w: number; h: number } {
    const kids = (n.contains ?? [])
        .flatMap((id) => {
            const c = byId.get(id);
            return c ? [c] : [];
        })
        .map(sized);
    if (!kids.length) return { w: 1, h: 1 };
    const space = typeof n.v.space === "number" ? n.v.space : 1;
    const along =
        kids.reduce((s, k) => s + (n.spec.container === "row" ? k.w : k.h), 0) +
        space * (kids.length - 1);
    const across = Math.max(...kids.map((k) => (n.spec.container === "row" ? k.h : k.w)));
    return n.spec.container === "row" ? { w: along, h: across } : { w: across, h: along };
}
const cross = (total: number, size: number, align: string): number =>
    align === "centre" ? Math.round((total - size) / 2) : align === "end" ? total - size : 0;

export function layout(scene: SceneInstance): { boxes: Map<string, Box>; problems: string[] } {
    const byId = new Map(scene.nodes.map((n) => [n.id, n] as const));
    const boxes = new Map<string, Box>();
    const problems: string[] = [];
    const busy = new Set<string>();
    const sized = (c: Concrete): { w: number; h: number } =>
        c.spec.container ? groupSize(c, sized, byId) : sizeOf(c);
    const place = (n: Concrete): Box => {
        const done = boxes.get(n.id);
        if (done) return done;
        if (busy.has(n.id)) throw new Error(`the placement of ${n.id} goes round in a circle`);
        busy.add(n.id);
        const { w, h } = sized(n);
        const p = n.place;
        let b: Box;
        if (!p) {
            problems.push(`${n.id} has no placement`);
            b = { x: 0, y: 0, w, h };
        } else if (p.rel === "at") b = { x: p.x, y: p.y, w, h };
        else {
            const [id = "", anchor] = p.of.split(".");
            const target = byId.get(id);
            if (!target) throw new Error(`there is no node "${id}"`);
            const t = place(target);
            if (p.rel === "in") {
                const space = typeof target.v.space === "number" ? target.v.space : 1;
                const sibs = (target.contains ?? []).flatMap((x) => {
                    const c = byId.get(x);
                    return c ? [c] : [];
                });
                const align = typeof target.v.align === "string" ? target.v.align : "start";
                let off = 0;
                for (const sib of sibs.slice(0, p.index))
                    off += (target.spec.container === "row" ? sized(sib).w : sized(sib).h) + space;
                b =
                    target.spec.container === "row"
                        ? { x: t.x + off, y: t.y + cross(t.h, h, align), w, h }
                        : { x: t.x + cross(t.w, w, align), y: t.y + off, w, h };
            } else if (p.rel === "on") {
                const ax = anchor?.includes("left")
                    ? t.x
                    : anchor?.includes("right")
                      ? t.x + t.w
                      : t.x + t.w / 2;
                const ay = anchor?.includes("top")
                    ? t.y
                    : anchor?.includes("bottom")
                      ? t.y + t.h
                      : t.y + t.h / 2;
                b = { x: Math.round(ax - w / 2), y: Math.round(ay - h), w, h };
            } else if (p.rel === "right-of") b = { x: t.x + t.w + p.gap, y: t.y, w, h };
            else if (p.rel === "left-of") b = { x: t.x - p.gap - w, y: t.y, w, h };
            else if (p.rel === "below") b = { x: t.x, y: t.y + t.h + p.gap, w, h };
            else b = { x: t.x, y: t.y - p.gap - h, w, h };
        }
        busy.delete(n.id);
        boxes.set(n.id, b);
        return b;
    };
    const placed = scene.nodes.map((n) => ({ n, b: place(n) }));
    const [W, H] = scene.size;
    for (const { n, b } of placed)
        if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H)
            problems.push(`${n.id} does not fit the ${W}x${H} scene`);
    const solid = placed.filter(({ n }) => n.type !== "guide" && !n.spec.container);
    for (const [i, { n, b: a }] of solid.entries())
        for (const { n: m, b: c } of solid.slice(i + 1))
            if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h)
                problems.push(`${n.id} and ${m.id} overlap`);
    return { boxes, problems };
}
