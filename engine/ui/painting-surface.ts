import { paintingValue } from "../painting";
// The painted sheet: which paint is where and how thick it lies, and the brushes, fills and prints
// that change it. A pixel holds a paint and a thickness, never a colour; a paint is a recipe, and its
// colour comes from mix.ts, so yellow brushed over blue on the sheet mixes the way it mixes in the
// tray. A painting is its list of marks, and this replays them; the pixels are only ever a view.
// See .docs/art.md, "The painting tool".
import { gcd } from "../numbers";
import { getStroke } from "perfect-freehand";
import type { Brush, Mirror, PaintMark, PaintPart } from "../answer";
import { PIGMENTS, isPigment, mixAmounts } from "../pigment";

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** A shape's coverage from 0 to 1 over w by h pixels, centred on its middle. */
export interface Mask {
    w: number;
    h: number;
    a: Float32Array;
}
/**
 * A print block or a stencil's shape at `px` pixels across, faced the other way when flipped and
 * turned by `turn` radians; a print leaves its carved lines as paper, a stencil is the whole shape.
 */
export type ShapeSource = (
    shape: string,
    px: number,
    flip: boolean,
    turn: number,
    carve: boolean,
) => Mask | null;

/**
 * Each brush's nib in squares (small, middle, big) and how perfect-freehand should shape it. The
 * sizes a child picks from are these three, and a mark keeps the size it was made at.
 */
export const BRUSH: Record<
    Brush,
    { sizes: [number, number, number]; thinning: number; smoothing: number; streamline: number }
> = {
    pencil: { sizes: [0.1, 0.16, 0.26], thinning: 0.55, smoothing: 0.5, streamline: 0.45 },
    crayon: { sizes: [0.35, 0.55, 0.9], thinning: 0.08, smoothing: 0.6, streamline: 0.5 },
    marker: { sizes: [0.22, 0.38, 0.6], thinning: 0, smoothing: 0.6, streamline: 0.55 },
    water: { sizes: [0.6, 1, 1.7], thinning: 0.35, smoothing: 0.72, streamline: 0.6 },
    blend: { sizes: [0.6, 1, 1.6], thinning: 0.1, smoothing: 0.7, streamline: 0.6 },
    eraser: { sizes: [0.5, 0.9, 1.6], thinning: 0, smoothing: 0.6, streamline: 0.5 },
};

const N = PIGMENTS.length;
/** A mix is kept to forty-eighths of each pigment, so a sheet holds hundreds of paints, not millions. */
const GRID = 48;
/** A glaze's share of a pixel is kept to sixteenths, which is finer than the eye can tell apart. */
const SHARE = 16;

export const amountsOfPaint = (paint: readonly PaintPart[]): number[] =>
    PIGMENTS.map((p) => paint.filter((x) => x.pigment === p).reduce((s, x) => s + x.parts, 0));

/** One place a mark lands under a mirror, and how a print or a stencil laid there is turned. */
export interface Copy {
    at: (x: number, y: number) => [number, number];
    turn: number;
    flip: boolean;
}

/**
 * Where a mark lands again: across the middle, across both middles (a flip top to bottom is a flip
 * side to side turned half round), or six times round the centre a sixth of a turn apart.
 */
export function copiesOf(mirror: Mirror, w: number, h: number): Copy[] {
    const same: Copy = { at: (x, y) => [x, y], turn: 0, flip: false };
    if (mirror === "two") return [same, { at: (x, y) => [w - x, y], turn: 0, flip: true }];
    if (mirror === "four")
        return [
            same,
            { at: (x, y) => [w - x, y], turn: 0, flip: true },
            { at: (x, y) => [x, h - y], turn: Math.PI, flip: true },
            { at: (x, y) => [w - x, h - y], turn: Math.PI, flip: false },
        ];
    if (mirror === "six")
        return Array.from({ length: 6 }, (_, k): Copy => {
            const a = (k * Math.PI) / 3,
                cos = Math.cos(a),
                sin = Math.sin(a),
                cx = w / 2,
                cy = h / 2;
            return {
                at: (x, y) => [
                    cx + (x - cx) * cos - (y - cy) * sin,
                    cy + (x - cx) * sin + (y - cy) * cos,
                ],
                turn: a,
                flip: false,
            };
        });
    return [same];
}
export const mirrored = (
    mirror: Mirror,
    w: number,
    h: number,
): ((x: number, y: number) => [number, number])[] => copiesOf(mirror, w, h).map((c) => c.at);

// A tileable texture of the paper's tooth, the same for every sheet so a painting replays the same.
const TEX = 256;
function hash(x: number, y: number, seed: number): number {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t: number): number => t * t * (3 - 2 * t);
/** Value noise that wraps every `period` cells, so a texture built from it tiles. */
function lattice(x: number, y: number, period: number, seed: number): number {
    const x0 = Math.floor(x),
        y0 = Math.floor(y),
        fx = smooth(x - x0),
        fy = smooth(y - y0);
    const at = (i: number, j: number) =>
        hash(((i % period) + period) % period, ((j % period) + period) % period, seed);
    const a = at(x0, y0),
        b = at(x0 + 1, y0),
        c = at(x0, y0 + 1),
        d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function texture(cells: number[], weights: number[], seed: number): Float32Array {
    const t = new Float32Array(TEX * TEX);
    let lo = Infinity,
        hi = -Infinity;
    for (let y = 0; y < TEX; y++)
        for (let x = 0; x < TEX; x++) {
            let v = 0;
            cells.forEach((cell, k) => {
                v += paintingValue(weights[k]) * lattice(x / cell, y / cell, TEX / cell, seed + k);
            });
            t[y * TEX + x] = v;
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
        }
    for (let i = 0; i < t.length; i++) t[i] = (paintingValue(t[i]) - lo) / (hi - lo || 1);
    return t;
}
let textures: { fine: Float32Array; tooth: Float32Array; granule: Float32Array } | null = null;
const tex = () =>
    (textures ??= {
        fine: texture([1, 2, 4], [0.5, 0.3, 0.2], 11),
        tooth: texture([2, 4, 8], [0.45, 0.35, 0.2], 23),
        granule: texture([4, 8, 16], [0.3, 0.4, 0.3], 37),
    });

/**
 * The grain a pencil or a crayon leaves, as a pattern in the paint's colour, for the easel to draw a
 * stroke with while it is still being made. It is the same tooth the finished mark is laid with.
 */
export function grainPattern(
    ctx: CanvasRenderingContext2D,
    brush: Brush,
    rgb: readonly number[],
    scale: number,
): CanvasPattern | null {
    if (brush !== "pencil" && brush !== "crayon") return null;
    const t = tex(),
        c = document.createElement("canvas");
    c.width = TEX;
    c.height = TEX;
    const g = c.getContext("2d");
    if (!g) return null;
    const img = g.createImageData(TEX, TEX);
    for (let i = 0; i < TEX * TEX; i++) {
        const a =
            brush === "pencil"
                ? 0.82 * (0.28 + 0.72 * paintingValue(t.fine[i]))
                : 0.95 * clamp01((paintingValue(t.tooth[i]) - 0.3) / 0.26);
        img.data[i * 4] = paintingValue(rgb[0]);
        img.data[i * 4 + 1] = paintingValue(rgb[1]);
        img.data[i * 4 + 2] = paintingValue(rgb[2]);
        img.data[i * 4 + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(c, "repeat");
    pattern?.setTransform(new DOMMatrix().scale(scale / 24));
    return pattern;
}

/** A smooth wobble in squares, for a ragged crayon edge and a watercolour's wandering one. */
const wobble = (x: number, y: number, seed: number): number => lattice(x, y, 1 << 20, seed) - 0.5;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Blur in place, box by box, three times, which is close to a gaussian and costs four adds a pixel. */
function blur(a: Float32Array, w: number, h: number, r: number): Float32Array {
    if (r < 1) return a;
    const tmp = new Float32Array(a.length),
        n = 2 * r + 1;
    for (let pass = 0; pass < 3; pass++) {
        for (let y = 0; y < h; y++) {
            let s = 0;
            for (let x = -r; x <= r; x++)
                s += paintingValue(a[y * w + Math.min(w - 1, Math.max(0, x))]);
            for (let x = 0; x < w; x++) {
                tmp[y * w + x] = s / n;
                s +=
                    paintingValue(a[y * w + Math.min(w - 1, x + r + 1)]) -
                    paintingValue(a[y * w + Math.max(0, x - r)]);
            }
        }
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let y = -r; y <= r; y++)
                s += paintingValue(tmp[Math.min(h - 1, Math.max(0, y)) * w + x]);
            for (let y = 0; y < h; y++) {
                a[y * w + x] = s / n;
                s +=
                    paintingValue(tmp[Math.min(h - 1, y + r + 1) * w + x]) -
                    paintingValue(tmp[Math.max(0, y - r) * w + x]);
            }
        }
    }
    return a;
}

interface Paint {
    amounts: Float32Array;
    rgb: [number, number, number];
}
type Laid = Extract<PaintMark, { k: "stencil" }>;
/** How much bigger than its hole a stencil card is, across. The easel draws the card this size too. */
export const CARD = 1.6;
/** What one mark changed: the pixels it touched, or the stencil it laid or lifted. */
interface Patch {
    r: Rect;
    paint: Uint16Array;
    thick: Uint8Array;
    was?: { open: Float32Array | null; laid: Laid[] };
}

/** A canvas for rasterising a mark's shape. The page has one; the tests never reach it. */
let scratch: CanvasRenderingContext2D | null = null;
function canvasOf(w: number, h: number): CanvasRenderingContext2D {
    if (!scratch) {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d canvas");
        scratch = ctx;
    }
    const c = scratch.canvas;
    if (c.width < w || c.height < h) {
        c.width = Math.max(c.width, w);
        c.height = Math.max(c.height, h);
    }
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.clearRect(0, 0, w, h);
    return scratch;
}

/** perfect-freehand's outline as a closed curve through the midpoints, as its README draws it. */
export function trace(ctx: CanvasRenderingContext2D, pts: number[][]): void {
    if (pts.length < 3) return;
    const first = paintingValue(pts[0]);
    ctx.moveTo(paintingValue(first[0]), paintingValue(first[1]));
    for (let i = 0; i < pts.length; i++) {
        const p = paintingValue(pts[i]),
            q = paintingValue(pts[(i + 1) % pts.length]);
        ctx.quadraticCurveTo(
            paintingValue(p[0]),
            paintingValue(p[1]),
            (paintingValue(p[0]) + paintingValue(q[0])) / 2,
            (paintingValue(p[1]) + paintingValue(q[1])) / 2,
        );
    }
    ctx.closePath();
}

/** The outline of a stroke in pixels, with the edge roughened for the brushes whose edge is rough. */
export function outline(
    brush: Brush,
    size: number,
    points: readonly number[],
    scale: number,
    seed: number,
    last = true,
): number[][] {
    const k = BRUSH[brush],
        input: number[][] = [];
    let measured = false;
    for (let i = 0; i + 2 < points.length; i += 3) {
        input.push([
            paintingValue(points[i]) * scale,
            paintingValue(points[i + 1]) * scale,
            points[i + 2] || 0.5,
        ]);
        if (paintingValue(points[i + 2]) > 0) measured = true;
    }
    const out = getStroke(input, {
        size: size * scale,
        thinning: k.thinning,
        smoothing: k.smoothing,
        streamline: k.streamline,
        simulatePressure: !measured,
        last,
    });
    const rough = brush === "water" ? 0.07 : brush === "crayon" ? 0.035 : 0;
    if (!rough) return out;
    const f = brush === "water" ? 1.4 : 5,
        amp = rough * scale * 2;
    return out.map(([x, y]) => [
        x + amp * wobble((x / scale) * f, (y / scale) * f, seed),
        y + amp * wobble((x / scale) * f + 91, (y / scale) * f + 37, seed + 5),
    ]);
}

export class Surface {
    readonly w: number;
    readonly h: number;
    /** Pixels per square. The record is in squares, so the same painting draws at any scale. */
    readonly scale: number;
    readonly W: number;
    readonly H: number;
    /** The sheet's printed lines, which a fill stops at as a child's own lines stop it. */
    lines: Float32Array | null = null;
    private readonly paintAt: Uint16Array;
    private readonly thick: Uint8Array;
    private readonly paints: Paint[] = [{ amounts: new Float32Array(N), rgb: [255, 255, 255] }];
    private readonly byKey = new Map<string, number>();
    private readonly memo = new Map<number, number>();
    private readonly patches: Patch[] = [];
    private readonly shapes: ShapeSource | null;
    /** Where paint can reach while a stencil lies on the sheet, from 0 (covered) to 1 (open). */
    private open: Float32Array | null = null;
    /** The stencil lying on the sheet now, which the easel draws over the paint. */
    laid: Laid[] = [];

    constructor(o: { w: number; h: number; scale: number; shapes?: ShapeSource }) {
        this.w = o.w;
        this.h = o.h;
        this.scale = o.scale;
        this.W = Math.round(o.w * o.scale);
        this.H = Math.round(o.h * o.scale);
        this.paintAt = new Uint16Array(this.W * this.H);
        this.thick = new Uint8Array(this.W * this.H);
        this.shapes = o.shapes ?? null;
    }

    /** The paint for a recipe or a mix of amounts, made once and kept. */
    private idOf(amounts: ArrayLike<number>): number {
        let total = 0;
        for (let j = 0; j < N; j++) total += Math.max(0, amounts[j] ?? 0);
        if (total <= 0) return 0;
        // largest remainder, so the forty-eighths always add up to the whole
        const raw = Array.from(
            { length: N },
            (_, j) => (Math.max(0, amounts[j] ?? 0) / total) * GRID,
        );
        const whole = raw.map(Math.floor);
        let left = GRID - whole.reduce((s, v) => s + v, 0);
        raw.map((v, j): [number, number] => [v - Math.floor(v), j])
            .sort((a, b) => paintingValue(b[0]) - paintingValue(a[0]))
            .forEach(([, j]) => {
                if (left > 0) {
                    whole[j] = paintingValue(whole[j]) + 1;
                    left--;
                }
            });
        const key = whole.join(",");
        const had = this.byKey.get(key);
        if (had !== undefined) return had;
        if (this.paints.length >= 65535) return this.paints.length - 1;
        const exact = new Float32Array(whole.map((v) => v / GRID));
        this.paints.push({ amounts: exact, rgb: mixAmounts(exact) });
        this.byKey.set(key, this.paints.length - 1);
        return this.paints.length - 1;
    }

    /** Paint q laid over paint p, with q making up `share` sixteenths of what is there. */
    private blend(p: number, q: number, share: number): number {
        if (share <= 0) return p;
        if (share >= SHARE) return q;
        const key = (p * 65536 + q) * (SHARE + 1) + share;
        const had = this.memo.get(key);
        if (had !== undefined) return had;
        const a = paintingValue(this.paints[p]).amounts,
            b = paintingValue(this.paints[q]).amounts,
            t = share / SHARE;
        const id = this.idOf(
            Array.from(
                { length: N },
                (_, j) => paintingValue(a[j]) * (1 - t) + paintingValue(b[j]) * t,
            ),
        );
        this.memo.set(key, id);
        return id;
    }

    /** Lay paint `id` on pixel i at thickness d, mixing with whatever is already there. */
    private deposit(i: number, id: number, d: number): void {
        if (this.open) d *= paintingValue(this.open[i]);
        if (d <= 0.004) return;
        const a = paintingValue(this.thick[i]) / 255,
            was = this.paintAt[i];
        if (!was || a === 0) {
            this.paintAt[i] = id;
            this.thick[i] = Math.round(Math.min(1, d) * 255);
            return;
        }
        if (was !== id) this.paintAt[i] = this.blend(was, id, Math.round((d / (a + d)) * SHARE));
        this.thick[i] = Math.round(Math.min(1, a + d - a * d) * 255);
    }

    private save(r: Rect): void {
        const paint = new Uint16Array(r.w * r.h),
            thick = new Uint8Array(r.w * r.h);
        for (let y = 0; y < r.h; y++) {
            const from = (r.y + y) * this.W + r.x;
            paint.set(this.paintAt.subarray(from, from + r.w), y * r.w);
            thick.set(this.thick.subarray(from, from + r.w), y * r.w);
        }
        this.patches.push({ r, paint, thick });
        if (this.patches.length > 60) this.patches.shift();
    }

    /** How many marks can be taken back without replaying the painting from the start. */
    get undoable(): number {
        return this.patches.length;
    }

    /** Takes the last mark back, returning what changed, or null when it has to be replayed instead. */
    undo(): Rect | null {
        const p = this.patches.pop();
        if (!p) return null;
        if (p.was) {
            this.open = p.was.open;
            this.laid = p.was.laid;
        }
        for (let y = 0; y < p.r.h; y++) {
            const to = (p.r.y + y) * this.W + p.r.x;
            this.paintAt.set(p.paint.subarray(y * p.r.w, (y + 1) * p.r.w), to);
            this.thick.set(p.thick.subarray(y * p.r.w, (y + 1) * p.r.w), to);
        }
        return p.r;
    }

    clear(): void {
        this.paintAt.fill(0);
        this.thick.fill(0);
        this.patches.length = 0;
        this.open = null;
        this.laid = [];
    }

    private clip(x0: number, y0: number, x1: number, y1: number): Rect | null {
        const x = Math.max(0, Math.floor(x0)),
            y = Math.max(0, Math.floor(y0));
        const w = Math.min(this.W, Math.ceil(x1)) - x,
            h = Math.min(this.H, Math.ceil(y1)) - y;
        return w > 0 && h > 0 ? { x, y, w, h } : null;
    }

    /** Puts a mark on the sheet. `n` is its place in the painting, which seeds its rough edges. */
    apply(m: PaintMark, n: number): Rect | null {
        if (m.k === "lift" || m.k === "stencil") {
            this.patches.push({
                r: { x: 0, y: 0, w: 0, h: 0 },
                paint: new Uint16Array(0),
                thick: new Uint8Array(0),
                was: { open: this.open, laid: this.laid },
            });
            if (m.k === "lift") {
                this.open = null;
                this.laid = [];
            } else this.lay(m);
            return null;
        }
        const copies = copiesOf(m.mirror, this.w, this.h);
        if (m.k === "fill")
            return this.fill(
                m.paint,
                copies.map((c) => c.at(m.x, m.y)),
            );
        if (m.k === "stamp") return this.stamp(m, copies);
        return this.stroke(
            m,
            copies.map((c) => c.at),
            n,
        );
    }

    /** Where a laid shape covers the sheet, every copy of it under the mirror, from 0 to 1. */
    private cover(
        shape: string,
        size: number,
        x: number,
        y: number,
        flip: boolean,
        copies: Copy[],
        carve: boolean,
    ): { mask: Float32Array; r: Rect } | null {
        if (!this.shapes) return null;
        const s = this.scale,
            px = Math.max(4, Math.round(size * s));
        const placed: { mask: Mask; x: number; y: number }[] = [];
        for (const c of copies) {
            const mask = this.shapes(shape, px, c.flip ? !flip : flip, c.turn, carve);
            if (!mask) continue;
            const [cx, cy] = c.at(x, y);
            placed.push({
                mask,
                x: Math.round(cx * s - mask.w / 2),
                y: Math.round(cy * s - mask.h / 2),
            });
        }
        if (!placed.length) return null;
        const r = this.clip(
            Math.min(...placed.map((p) => p.x)),
            Math.min(...placed.map((p) => p.y)),
            Math.max(...placed.map((p) => p.x + p.mask.w)),
            Math.max(...placed.map((p) => p.y + p.mask.h)),
        );
        if (!r) return null;
        const mask = new Float32Array(r.w * r.h);
        for (const p of placed)
            for (let yy = 0; yy < p.mask.h; yy++)
                for (let xx = 0; xx < p.mask.w; xx++) {
                    const X = p.x + xx - r.x,
                        Y = p.y + yy - r.y;
                    if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) continue;
                    mask[Y * r.w + X] = Math.max(
                        paintingValue(mask[Y * r.w + X]),
                        paintingValue(p.mask.a[yy * p.mask.w + xx]),
                    );
                }
        return { mask, r };
    }

    /**
     * A stencil laid on the sheet: a card with a hole lets paint through only inside the shape, and
     * the card itself, a square `CARD` times the shape's size, keeps it off around the hole; a shape
     * keeps paint off where it lies. Several can lie at once, as Anna Atkins laid several plants on one
     * sheet, and paint reaches the paper only where nothing laid covers it.
     */
    private lay(m: Laid): void {
        const copies = copiesOf(m.mirror, this.w, this.h);
        const got = this.cover(m.shape, m.size, m.x, m.y, false, copies, false);
        const open = new Float32Array(this.W * this.H).fill(1);
        if (m.hole)
            for (const c of copies) {
                const [cx, cy] = c.at(m.x, m.y),
                    half = (m.size * CARD * this.scale) / 2;
                const r = this.clip(
                    Math.round(cx * this.scale - half),
                    Math.round(cy * this.scale - half),
                    Math.round(cx * this.scale + half),
                    Math.round(cy * this.scale + half),
                );
                if (r)
                    for (let y = r.y; y < r.y + r.h; y++)
                        open.fill(0, y * this.W + r.x, y * this.W + r.x + r.w);
            }
        if (got)
            for (let y = 0; y < got.r.h; y++)
                for (let x = 0; x < got.r.w; x++) {
                    const v = paintingValue(got.mask[y * got.r.w + x]),
                        i = (got.r.y + y) * this.W + got.r.x + x;
                    open[i] = m.hole
                        ? Math.max(paintingValue(open[i]), v)
                        : Math.min(paintingValue(open[i]), 1 - v);
                }
        const before = this.open;
        if (before)
            for (let i = 0; i < open.length; i++)
                open[i] = Math.min(paintingValue(open[i]), paintingValue(before[i]));
        this.open = open;
        this.laid = [...this.laid, m];
    }

    private stroke(
        m: Extract<PaintMark, { k: "stroke" }>,
        copies: ((x: number, y: number) => [number, number])[],
        n: number,
    ): Rect | null {
        const s = this.scale,
            shapes = copies
                .map((f) => {
                    const pts: number[] = [];
                    for (let i = 0; i + 2 < m.points.length; i += 3) {
                        const [x, y] = f(
                            paintingValue(m.points[i]),
                            paintingValue(m.points[i + 1]),
                        );
                        pts.push(x, y, paintingValue(m.points[i + 2]));
                    }
                    return outline(m.brush, m.size, pts, s, n * 7 + 1);
                })
                .filter((o) => o.length > 2);
        if (!shapes.length) return null;
        const soft =
            m.brush === "water" || m.brush === "blend" ? Math.max(2, Math.round(0.28 * s)) : 0;
        let x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity;
        for (const o of shapes)
            for (const [x = 0, y = 0] of o) {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
            }
        const r = this.clip(x0 - soft - 2, y0 - soft - 2, x1 + soft + 2, y1 + soft + 2);
        if (!r) return null;
        const ctx = canvasOf(r.w, r.h);
        ctx.translate(-r.x, -r.y);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (const o of shapes) trace(ctx, o);
        ctx.fill("nonzero");
        const px = ctx.getImageData(0, 0, r.w, r.h).data,
            mask = new Float32Array(r.w * r.h);
        for (let i = 0; i < mask.length; i++) mask[i] = paintingValue(px[i * 4 + 3]) / 255;
        this.save(r);
        const t = tex(),
            k = 24 / s;
        const at = (x: number, y: number, a: Float32Array) =>
            paintingValue(
                a[(Math.floor(y * k) & (TEX - 1)) * TEX + (Math.floor(x * k) & (TEX - 1))],
            );
        if (m.brush === "eraser") {
            for (let y = 0; y < r.h; y++)
                for (let x = 0; x < r.w; x++) {
                    const i = (r.y + y) * this.W + r.x + x,
                        v =
                            paintingValue(mask[y * r.w + x]) *
                            (this.open ? paintingValue(this.open[i]) : 1);
                    if (v <= 0) continue;
                    this.thick[i] = Math.round(paintingValue(this.thick[i]) * (1 - 0.96 * v));
                    if (this.thick[i] < 3) {
                        this.thick[i] = 0;
                        this.paintAt[i] = 0;
                    }
                }
            return r;
        }
        if (m.brush === "blend") {
            this.blendIn(r, mask, soft);
            return r;
        }
        const id = this.idOf(amountsOfPaint(m.paint));
        const edge = soft ? blur(Float32Array.from(mask), r.w, r.h, soft) : null;
        for (let y = 0; y < r.h; y++)
            for (let x = 0; x < r.w; x++) {
                const j = y * r.w + x,
                    v = paintingValue(mask[j]);
                if (v <= 0) continue;
                const X = r.x + x,
                    Y = r.y + y;
                let d: number;
                if (m.brush === "pencil") d = v * 0.82 * (0.28 + 0.72 * at(X, Y, t.fine));
                else if (m.brush === "crayon")
                    d = v * 0.95 * clamp01((at(X, Y, t.tooth) - 0.3) / 0.26);
                else if (m.brush === "marker") d = v * 0.86;
                else {
                    // a wash lies thicker where it dried at its edge, and settles into the paper's grain
                    const rim = edge ? clamp01((v - paintingValue(edge[j])) * 2.6) : 0;
                    d = v * 0.3 * (1 + 1.5 * rim) * (0.76 + 0.48 * at(X, Y, t.granule));
                }
                this.deposit(Y * this.W + X, id, d);
            }
        return r;
    }

    /**
     * The blender: under the stroke, each pixel's paint is mixed with its neighbours', so two colours
     * that meet run into each other the way a damp brush or a finger blends them. Paint and thickness
     * both spread; bare paper next to paint takes a little of it.
     */
    private blendIn(r: Rect, mask: Float32Array, radius: number): void {
        const n = r.w * r.h,
            amounts = Array.from({ length: N }, () => new Float32Array(n)),
            thick = new Float32Array(n);
        for (let y = 0; y < r.h; y++)
            for (let x = 0; x < r.w; x++) {
                const j = y * r.w + x,
                    i = (r.y + y) * this.W + r.x + x,
                    t = paintingValue(this.thick[i]) / 255;
                thick[j] = t;
                if (!t) continue;
                const a = paintingValue(this.paints[paintingValue(this.paintAt[i])]).amounts;
                for (let c = 0; c < N; c++) paintingValue(amounts[c])[j] = paintingValue(a[c]) * t;
            }
        const spread = amounts.map((a) => blur(Float32Array.from(a), r.w, r.h, radius)),
            spreadT = blur(Float32Array.from(thick), r.w, r.h, radius);
        const mixed = new Float32Array(N);
        for (let y = 0; y < r.h; y++)
            for (let x = 0; x < r.w; x++) {
                const j = y * r.w + x,
                    i = (r.y + y) * this.W + r.x + x;
                const v =
                    paintingValue(mask[j]) * 0.85 * (this.open ? paintingValue(this.open[i]) : 1);
                if (v <= 0.01 || (thick[j] === 0 && paintingValue(spreadT[j]) < 0.02)) continue;
                const t = paintingValue(thick[j]) * (1 - v) + paintingValue(spreadT[j]) * v;
                if (t < 0.012) {
                    this.thick[i] = 0;
                    this.paintAt[i] = 0;
                    continue;
                }
                for (let c = 0; c < N; c++)
                    mixed[c] =
                        paintingValue(paintingValue(amounts[c])[j]) * (1 - v) +
                        paintingValue(paintingValue(spread[c])[j]) * v;
                this.paintAt[i] = this.idOf(mixed);
                this.thick[i] = Math.round(Math.min(1, t) * 255);
            }
    }

    /** The paper's own colour under a pixel once paint is on it, for telling where a fill should stop. */
    private looks(i: number): number {
        const a = paintingValue(this.thick[i]) / 255;
        if (a < 0.08) return 0xffffff;
        const [r, g, b] = paintingValue(this.paints[paintingValue(this.paintAt[i])]).rgb;
        const o = (c: number) => Math.round(255 * (1 - a) + c * a);
        return (o(r) << 16) | (o(g) << 8) | o(b);
    }

    /**
     * A fill poured at each point: the area that looks like the pixel it was poured on, stopped by the
     * sheet's lines and by paint of another colour. Small gaps in a line are closed first, the way a
     * hand-drawn outline needs, and the paint then reaches a little under the line so no white rim
     * shows. Every point's area is found before any paint goes down, so a mirrored fill paints once.
     */
    private fill(paint: readonly PaintPart[], at: [number, number][]): Rect | null {
        const W = this.W,
            H = this.H,
            s = this.scale,
            gap = Math.max(1, Math.round(0.08 * s));
        const region = new Uint8Array(W * H),
            look = new Uint32Array(W * H);
        for (let i = 0; i < W * H; i++) look[i] = this.looks(i);
        let x0 = W,
            y0 = H,
            x1 = 0,
            y1 = 0,
            any = false;
        for (const [sx, sy] of at) {
            const px = Math.floor(sx * s),
                py = Math.floor(sy * s);
            if (px < 0 || py < 0 || px >= W || py >= H || region[py * W + px]) continue;
            const seed = paintingValue(look[py * W + px]);
            const sr = seed >> 16,
                sg = (seed >> 8) & 255,
                sb = seed & 255;
            const wall = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i++) {
                const c = paintingValue(look[i]);
                const far =
                    Math.abs((c >> 16) - sr) +
                        Math.abs(((c >> 8) & 255) - sg) +
                        Math.abs((c & 255) - sb) >
                    48;
                if (
                    far ||
                    (this.lines && paintingValue(this.lines[i]) > 0.3) ||
                    (this.open && paintingValue(this.open[i]) < 0.5)
                )
                    wall[i] = 1;
            }
            const shut = dilate(wall, W, H, gap);
            any = true;
            if (shut[py * W + px]) {
                region[py * W + px] = 1;
                continue;
            }
            const wide = dilate(flood(shut, W, H, px, py), W, H, gap + 1);
            for (let i = 0; i < W * H; i++) if (wide[i]) region[i] = 1;
        }
        if (!any) return null;
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
                if (region[y * W + x]) {
                    x0 = Math.min(x0, x);
                    y0 = Math.min(y0, y);
                    x1 = Math.max(x1, x);
                    y1 = Math.max(y1, y);
                }
        const r = this.clip(x0, y0, x1 + 1, y1 + 1);
        if (!r) return null;
        this.save(r);
        const id = this.idOf(amountsOfPaint(paint)),
            t = tex(),
            k = 24 / s;
        for (let y = r.y; y < r.y + r.h; y++)
            for (let x = r.x; x < r.x + r.w; x++) {
                const i = y * W + x;
                if (!region[i]) continue;
                const g = paintingValue(
                    t.granule[
                        (Math.floor(y * k) & (TEX - 1)) * TEX + (Math.floor(x * k) & (TEX - 1))
                    ],
                );
                this.deposit(i, id, 0.84 * (0.9 + 0.1 * g));
            }
        return r;
    }

    private stamp(m: Extract<PaintMark, { k: "stamp" }>, copies: Copy[]): Rect | null {
        // a mirrored copy of a print is the block turned over, so it faces the other way
        const got = this.cover(m.stamp, m.size, m.x, m.y, m.flip, copies, true);
        if (!got) return null;
        const { mask: cover, r } = got;
        this.save(r);
        const id = this.idOf(amountsOfPaint(m.paint)),
            t = tex(),
            k = 24 / this.scale;
        for (let y = 0; y < r.h; y++)
            for (let x = 0; x < r.w; x++) {
                const v = paintingValue(cover[y * r.w + x]);
                if (v <= 0) continue;
                const X = r.x + x,
                    Y = r.y + y;
                // a block never takes the ink evenly: the grain shows through the print
                const g = paintingValue(
                    t.tooth[
                        (Math.floor(Y * k) & (TEX - 1)) * TEX + (Math.floor(X * k) & (TEX - 1))
                    ],
                );
                this.deposit(Y * this.W + X, id, v * 0.9 * clamp01(0.35 + g * 1.1));
            }
        return r;
    }

    /** Draws the paint onto a canvas the sheet's size, all of it or the part that changed. */
    draw(ctx: CanvasRenderingContext2D, r: Rect = { x: 0, y: 0, w: this.W, h: this.H }): void {
        if (r.w <= 0 || r.h <= 0) return;
        const img = ctx.createImageData(r.w, r.h),
            d = img.data;
        for (let y = 0; y < r.h; y++) {
            let i = (r.y + y) * this.W + r.x,
                o = y * r.w * 4;
            for (let x = 0; x < r.w; x++, i++, o += 4) {
                const a = this.thick[i];
                if (!a) continue;
                const c = paintingValue(this.paints[paintingValue(this.paintAt[i])]).rgb;
                d[o] = c[0];
                d[o + 1] = c[1];
                d[o + 2] = c[2];
                d[o + 3] = a;
            }
        }
        ctx.putImageData(img, r.x, r.y);
    }

    /**
     * The recipe under a point in squares, in the smallest whole parts that say it (yellow 2 and blue
     * 1), for the dropper to put back on the brush; null on bare paper.
     */
    paintAtPoint(x: number, y: number): PaintPart[] | null {
        const px = Math.floor(x * this.scale),
            py = Math.floor(y * this.scale);
        if (px < 0 || py < 0 || px >= this.W || py >= this.H) return null;
        const i = py * this.W + px;
        if (paintingValue(this.thick[i]) < 20) return null;
        const a = paintingValue(this.paints[paintingValue(this.paintAt[i])]).amounts;
        const sixths = PIGMENTS.map((_, j) => Math.round(paintingValue(a[j]) * 6));
        const d = sixths.reduce((g, v) => (v ? gcd(g, v) : g), 0) || 1;
        const out: PaintPart[] = [];
        PIGMENTS.forEach((p, j) => {
            if (paintingValue(sixths[j]) > 0 && isPigment(p))
                out.push({ pigment: p, parts: paintingValue(sixths[j]) / d });
        });
        return out.length ? out : null;
    }
}

/** Grows the set pixels by r in every direction, a square at a time: cheap, and enough to close a gap. */
function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
    if (r < 1) return src;
    const tmp = new Uint8Array(src.length),
        out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
        let last = -Infinity;
        for (let x = 0; x < w; x++) {
            if (src[y * w + x]) last = x;
            if (x - last <= r) tmp[y * w + x] = 1;
        }
        last = Infinity;
        for (let x = w - 1; x >= 0; x--) {
            if (src[y * w + x]) last = x;
            if (last - x <= r) tmp[y * w + x] = 1;
        }
    }
    for (let x = 0; x < w; x++) {
        let last = -Infinity;
        for (let y = 0; y < h; y++) {
            if (tmp[y * w + x]) last = y;
            if (y - last <= r) out[y * w + x] = 1;
        }
        last = Infinity;
        for (let y = h - 1; y >= 0; y--) {
            if (tmp[y * w + x]) last = y;
            if (last - y <= r) out[y * w + x] = 1;
        }
    }
    return out;
}

/** Scanline flood fill from a seed over the unset pixels of `wall`. */
function flood(wall: Uint8Array, w: number, h: number, sx: number, sy: number): Uint8Array {
    const got = new Uint8Array(w * h),
        stack: number[] = [sx, sy];
    while (stack.length) {
        const y = stack.pop() ?? 0,
            x0 = stack.pop() ?? 0;
        let x = x0;
        while (x > 0 && !wall[y * w + x - 1] && !got[y * w + x - 1]) x--;
        let up = false,
            down = false;
        for (; x < w && !wall[y * w + x] && !got[y * w + x]; x++) {
            got[y * w + x] = 1;
            if (y > 0) {
                const open = !wall[(y - 1) * w + x] && !got[(y - 1) * w + x];
                if (open && !up) {
                    stack.push(x, y - 1);
                    up = true;
                } else if (!open) up = false;
            }
            if (y < h - 1) {
                const open = !wall[(y + 1) * w + x] && !got[(y + 1) * w + x];
                if (open && !down) {
                    stack.push(x, y + 1);
                    down = true;
                } else if (!open) down = false;
            }
        }
    }
    return got;
}

/** A whole painting drawn onto a fresh sheet, for a thumbnail, a grown-up's view or a reload. */
export function replay(
    marks: readonly PaintMark[],
    o: { w: number; h: number; scale: number; shapes?: ShapeSource; lines?: Float32Array | null },
): Surface {
    const s = new Surface(o);
    s.lines = o.lines ?? null;
    marks.forEach((m, n) => s.apply(m, n));
    return s;
}
