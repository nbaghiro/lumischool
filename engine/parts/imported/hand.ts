import { Pen } from "../../ink/pen";
import {
    group,
    imported,
    letter,
    type Ctx,
    type Hatch,
    type Imported,
    type RawAnchors,
    type Side,
} from "../../ink/surface";
import type { Animation } from "../../motion/animation";
import {
    TOKEN_NAMES,
    U,
    type FillStyle,
    type Level,
    type TokenName,
    type Tokens,
} from "../../paper";
import { defineDrawing, type Box, type Drawing, type Family } from "../drawing";
import { EXCALIDRAW, STROKES, SVG } from "./files";

/** An element of an Excalidraw scene, as much of it as is read and drawn. */
export interface ExcalidrawElement {
    type: "rectangle" | "ellipse" | "diamond" | "line" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    angle?: number;
    strokeColor?: string;
    backgroundColor?: string;
    fillStyle?: string;
    strokeWidth?: number;
    roughness?: number;
    seed?: number;
    points?: [number, number][];
    text?: string;
    fontSize?: number;
    fontFamily?: number;
}

/** What names a hand-drawn file on the shelf and says how it moves; the file itself is the drawing. */
interface Named {
    name: string;
    family: Family;
    title: string;
    about: string;
    describe: string;
    motion: Animation;
}

interface Flip {
    flip: boolean;
}

const AS_DRAWN: Flip = { flip: false };
const MIRRORED: Flip = { flip: true };

const OTHER_SIDE: Record<Side, Side> = { up: "up", down: "down", left: "right", right: "left" };

function fileOf<F extends { name: string }>(files: readonly F[], name: string): F {
    const f = files.find((x) => x.name === name);
    if (!f) throw new Error(`content/art/ has no file named ${name}`);
    return f;
}

/**
 * A hand-drawn file as a drawing, drawn as the file has it or mirrored, which is the choice a scene
 * makes when it places one: the anchors mirror with it, and left and right swap sides.
 */
function handDrawn(
    kind: "svg" | "excalidraw" | "strokes",
    n: Named,
    box: Box,
    draw: <G>(c: Ctx<G>, flipped: boolean) => RawAnchors,
): Drawing<Flip> {
    return defineDrawing({
        id: `${kind}.${n.name}`,
        family: n.family,
        title: n.title,
        group: "Imported",
        about: n.about,
        params: AS_DRAWN,
        settings: { flip: { kind: "flag" } },
        takes: [
            { label: "As drawn", params: AS_DRAWN },
            { label: "Mirrored", params: MIRRORED },
        ],
        box: () => box,
        draw: (c, p) => {
            if (!p.flip) return draw(c, false);
            const w = box.w * U;
            const raw = draw(group(c, { turn: [["matrix", -1, 0, 0, 1, w, 0]] }), true);
            const out: RawAnchors = {};
            for (const [k, [x, y, side]] of Object.entries(raw))
                out[k] = [w - x, y, OTHER_SIDE[side ?? "up"]];
            return out;
        },
        describe: () => n.describe,
        motion: n.motion,
    });
}

// a line is re-inked when the file draws it black, as a vector tool's export writes black
const BLACKS = new Set(["#000", "#000000", "black", "currentcolor", "#1e1e1e"]);
const SIDES: readonly Side[] = ["up", "down", "left", "right"];
const tokenNamed = (s: string): TokenName | undefined => TOKEN_NAMES.find((n) => n === s);

/** What a named fill paints: its colour on screen, and on paper white or its hatch; nothing for a name that is not a token. */
function filled(named: string, t: Tokens, paper: boolean): string | Hatch | undefined {
    if (named === "none") return "none";
    const name = tokenNamed(named);
    if (name === undefined) return undefined;
    if (!paper) return t[name];
    return name === "card" || name === "paper" ? "#FFFFFF" : { hatch: name, ink: t.ink };
}

/**
 * Hand-drawn SVG, as the file writes it. The anchors are taken out and returned, black lines are
 * re-inked, and a named fill (`data-fill`) is its colour on screen and on paper white or its hatch.
 * The conventions are checked by .scratchpad/scripts/check-art.mjs.
 */
const svgBox = (view: readonly number[]): Box => ({
    w: Math.round((view[2] ?? 40) / U),
    h: Math.round((view[3] ?? 40) / U),
});

export function svgDrawing(n: Named): Drawing<Flip> {
    const { view, shapes } = fileOf(SVG, n.name);
    const [x0 = 0, y0 = 0] = view;
    return handDrawn("svg", n, svgBox(view), (c) => {
        const anchors: RawAnchors = {};
        const drawn: Imported["shapes"][number][] = [];
        for (const s of shapes) {
            const at = (k: string): string | undefined => s.attrs.find(([a]) => a === k)?.[1];
            const anchor = at("data-anchor");
            if (anchor !== undefined) {
                const side = at("data-side") ?? "up";
                anchors[anchor] = [
                    Number(at("cx") ?? null) - x0,
                    Number(at("cy") ?? null) - y0,
                    SIDES.find((x) => x === side),
                ];
                continue;
            }
            const attrs: [string, string | Hatch][] = s.attrs.map(([k, v]) => [
                k,
                k === "stroke" && BLACKS.has(v.toLowerCase()) ? c.t.ink : v,
            ]);
            const named = at("data-fill");
            const fill = named ? filled(named, c.t, c.paper) : undefined;
            if (fill !== undefined) {
                const i = attrs.findIndex(([k]) => k === "fill");
                if (i < 0) attrs.push(["fill", fill]);
                else attrs[i] = ["fill", fill];
            }
            drawn.push({ tag: s.tag, attrs });
        }
        imported(c, { from: [x0, y0], shapes: drawn });
        return anchors;
    });
}

function hsl(hex: string): [number, number, number] | null {
    const m = /^#?([0-9a-f]{6})/i.exec(hex);
    if (!m?.[1]) return null;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
}

/** Any colour as a token by its hue, so an Excalidraw scene follows the palette and prints as hatching. */
function tokenFor(color: string | undefined, role: "stroke" | "fill"): TokenName | null {
    if (!color || color === "transparent") return null;
    const c = hsl(color);
    if (!c) return role === "stroke" ? "ink" : null;
    const [h, s, l] = c;
    if (s < 0.18) return role === "stroke" ? "ink" : l > 0.85 ? "card" : "ink-soft";
    if (h < 20 || h >= 330) return "berry";
    if (h < 45) return "tang";
    if (h < 70) return "glow";
    if (h < 170) return role === "stroke" ? "ok" : "mint";
    if (h < 260) return role === "stroke" ? "pen" : "sky";
    return "berry";
}

const LEVEL: readonly Level[] = ["ruler", "pencil", "doodle"];
const STYLE: Partial<Record<string, FillStyle>> = {
    hachure: "hachure",
    "cross-hatch": "cross-hatch",
    solid: "solid",
    zigzag: "zigzag",
};

/**
 * An Excalidraw scene. Excalidraw draws with rough.js and keeps a seed and a roughness on every
 * element, so each is drawn by a pen on its own seed, with roughness 0, 1 and 2 as ruler, pencil and
 * doodle, and its colours taken to tokens by hue. Its box is the drawing's bounds with a square of
 * margin all round; a text element whose text starts with `@` is an anchor.
 */
/** A scene's bounds: where its ink starts, and its size with a square of margin all round. */
function excalidrawBounds(elements: readonly ExcalidrawElement[]): {
    at: [number, number];
    box: Box;
} {
    const corners = elements.flatMap((e): [number, number][] =>
        e.points?.length
            ? e.points.map(([px, py]): [number, number] => [e.x + px, e.y + py])
            : [
                  [e.x, e.y],
                  [e.x + e.width, e.y + e.height],
              ],
    );
    const xs = corners.map((q) => q[0]);
    const ys = corners.map((q) => q[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
        at: [U - minX, U - minY],
        box: {
            w: Math.ceil((Math.max(...xs) - minX + 2 * U) / U),
            h: Math.ceil((Math.max(...ys) - minY + 2 * U) / U),
        },
    };
}

export function excalidrawDrawing(n: Named): Drawing<Flip> {
    const { elements } = fileOf(EXCALIDRAW, n.name);
    const {
        at: [ox, oy],
        box,
    } = excalidrawBounds(elements);
    return handDrawn("excalidraw", n, box, (c, flipped) => {
        const anchors: RawAnchors = {};
        for (const e of elements) {
            const x = e.x + ox;
            const y = e.y + oy;
            const w = e.width;
            const h = e.height;
            if (e.type === "text" && e.text?.startsWith("@")) {
                anchors[e.text.slice(1).trim()] = [x, y + h / 2, "up"];
                continue;
            }
            const at = e.angle
                ? group(c, { turn: [["rotate", (e.angle * 180) / Math.PI, x + w / 2, y + h / 2]] })
                : c;
            const pen = new Pen(c.ink ?? c.pen.ink, { ...c.pen.o, seed: e.seed ?? 1 });
            const level = LEVEL[Math.max(0, Math.min(2, e.roughness ?? 1))] ?? "pencil";
            const st = tokenFor(e.strokeColor, "stroke") ?? "ink";
            const fl = tokenFor(e.backgroundColor, "fill");
            const fill = fl ? pen.fill(fl, STYLE[e.fillStyle ?? "hachure"] ?? "hachure") : null;
            const extra = {
                stroke: c.paper ? c.t.ink : c.t[st],
                strokeWidth: (e.strokeWidth ?? 1) * 1.4,
            };
            if (e.type === "text") {
                // a mirrored picture is useful and mirror writing is not, so a line is turned back about
                // its own point, and its side turns with it
                const size = e.fontSize ?? 20;
                const face = e.fontFamily === 2 ? "read" : e.fontFamily === 3 ? "mono" : "hand";
                const turned = flipped
                    ? { anchor: "end" as const, turn: [["matrix", -1, 0, 0, 1, 2 * x, 0]] as const }
                    : { anchor: "start" as const };
                (e.text ?? "").split("\n").forEach((line, i) => {
                    letter(at, {
                        x,
                        y: y + size * (0.9 + i * 1.25),
                        s: line,
                        face,
                        weight: 500,
                        size,
                        fill: extra.stroke,
                        ...turned,
                    });
                });
            } else if (e.type === "rectangle") pen.rect(at.g, x, y, w, h, level, fill, extra);
            else if (e.type === "ellipse")
                pen.ellipse(at.g, x + w / 2, y + h / 2, w, h, level, fill, extra);
            else if (e.type === "diamond") {
                const diamond: [number, number][] = [
                    [x + w / 2, y],
                    [x + w, y + h / 2],
                    [x + w / 2, y + h],
                    [x, y + h / 2],
                ];
                pen.polygon(at.g, diamond, level, fill, extra);
            } else if (e.points) {
                const pts = e.points.map(([px, py]): [number, number] => [x + px, y + py]);
                const first = pts[0];
                const last = pts.at(-1);
                const closed =
                    first !== undefined &&
                    last !== undefined &&
                    pts.length > 2 &&
                    Math.hypot(first[0] - last[0], first[1] - last[1]) < 2;
                if (closed && fill) pen.polygon(at.g, pts.slice(0, -1), level, fill, extra);
                else pen.linear(at.g, pts, level, extra);
            }
        }
        return anchors;
    });
}

/** A stroke file from the drawing pad: the strokes with their pressure, and the box and anchors it carries. */
export function strokesDrawing(n: Named): Drawing<Flip> {
    const { asset } = fileOf(STROKES, n.name);
    return handDrawn("strokes", n, asset.box, (c) => {
        for (const s of asset.strokes) c.pen.stroke(c.g, s);
        const out: RawAnchors = {};
        for (const [k, v] of Object.entries(asset.anchors ?? {}))
            out[k] = [v.x * U, v.y * U, v.side];
        return out;
    });
}

/**
 * What the notation needs of a hand-drawn file before anything is drawn: its size in squares and the
 * names of its anchors, so a scene can be laid out and checked without a page (engine/notation/vocabulary.ts).
 */
export interface HandDrawnFile {
    name: string;
    file: string;
    kind: "svg" | "excalidraw" | "strokes";
    box: Box;
    anchors: readonly string[];
}

export const handDrawnFiles = (): HandDrawnFile[] => [
    ...SVG.map((f) => ({
        name: f.name,
        file: f.file,
        kind: "svg" as const,
        box: svgBox(f.view),
        anchors: f.shapes.flatMap((s) =>
            s.attrs.flatMap(([k, v]) => (k === "data-anchor" ? [v] : [])),
        ),
    })),
    ...EXCALIDRAW.map((f) => ({
        name: f.name,
        file: f.file,
        kind: "excalidraw" as const,
        box: excalidrawBounds(f.elements).box,
        anchors: f.elements.flatMap((e) =>
            e.type === "text" && e.text?.startsWith("@") ? [e.text.slice(1).trim()] : [],
        ),
    })),
    ...STROKES.map((f) => ({
        name: f.name,
        file: f.file,
        kind: "strokes" as const,
        box: f.asset.box,
        anchors: Object.keys(f.asset.anchors ?? {}),
    })),
];
