// The games' texture pages: each look a sprite asks for (a shelf drawing with its settings, seed, crop
// and size) is drawn once through the SVG renderer at the size it is shown, decoded, and packed into a
// page of the GPU's; a thousand sprites with one look cost one place in a page. See
// .docs/game-engine.md, "Looks and texture pages".
import type { Anchors } from "../ink/surface";
import type { Rect } from "../motion/geometry";
import type { Part } from "../motion/scene";
import { U } from "../paper";
import type { Drawing } from "../parts/drawing";
import { loop as penLoop, starSticker, tick as penTick } from "../parts/marks";
import type { CanvasGl, GlTexture } from "./gl";
import { standalone } from "./raster";
import { readTokens } from "./read-tokens";
import { SvgPen, el, render } from "./svg";

export interface LookSpec {
    art: string;
    params?: Record<string, unknown>;
    seed?: number;
    /** A part of the drawing, in squares from its top-left corner, drawn instead of the whole. */
    crop?: Rect;
    /** Squares across it is shown at, instead of its own box. */
    size?: number;
    /** A teacher's pen on the drawing's own anchors: a loop round a number, a tick, a star. */
    marks?: Part["marks"];
}

/** A look placed in a page: where it is in the page's unit square, and its size in squares. */
export interface Placed {
    texture: GlTexture;
    u: number;
    v: number;
    uw: number;
    vh: number;
    w: number;
    h: number;
    /** Squares drawn round the box on every side, for the ink a whole drawing lets past its edge. */
    pad: number;
    anchors: Anchors;
}

const PAGE = 2048;
/** Clear pixels round each look, so a page's neighbours never bleed into it when it is scaled. */
const GAP = 2;
/** Pixels to a square are drawn in half-octave steps, so a zoom does not draw a look again at every size. */
const STEPS = 2;
const DECODING = 4;
/**
 * Squares kept past a whole drawing's box at the least, and at the most: between them, as far as its
 * ink reaches, since a drawing may overflow its box. A crop is cut exactly.
 */
const MARGIN = { least: 0.5, most: 4 };
/** User units a stroke's half width and the pen's wobble add past the shapes getBBox measures. */
const INK = 3;
/** Milliseconds of a frame spent writing decoded looks into pages. */
const UPLOADING = 6;

interface Shelf {
    y: number;
    h: number;
    x: number;
}
interface Page {
    texture: GlTexture;
    shelves: Shelf[];
    top: number;
    used: number;
}
interface Entry {
    placed: Placed | null;
    page: Page | null;
    pending: boolean;
    failed: boolean;
    used: number;
}
interface Decoded {
    key: string;
    image: HTMLImageElement;
    url: string;
    pw: number;
    ph: number;
    w: number;
    h: number;
    pad: number;
    anchors: Anchors;
}

/** How far a drawing's ink reaches past its box, in squares, rounded up to a quarter and kept within the margins. */
function reach(svg: SVGSVGElement, box: { w: number; h: number }): number {
    let b: DOMRect;
    try {
        b = svg.getBBox();
    } catch {
        return MARGIN.least;
    }
    const over = Math.max(-b.x, -b.y, b.x + b.width - box.w * U, b.y + b.height - box.h * U, 0);
    const squares = Math.ceil(((over + INK) / U) * 4) / 4;
    return Math.max(MARGIN.least, Math.min(MARGIN.most, squares));
}

export const lookKey = (s: LookSpec): string =>
    `${s.art}|${JSON.stringify(s.params ?? null)}|${s.seed ?? 4127}|${s.crop ? `${s.crop.x},${s.crop.y},${s.crop.w},${s.crop.h}` : ""}|${s.size ?? ""}${s.marks?.length ? `|${JSON.stringify(s.marks)}` : ""}`;

/** The pen's marks drawn into a drawing at its anchors, in user units. */
export function penMarks(
    svg: SVGSVGElement,
    anchors: Anchors,
    marks: NonNullable<Part["marks"]>,
    host: HTMLElement,
): void {
    const t = readTokens(host);
    for (const m of marks) {
        const a = anchors[m.at];
        if (!a) continue;
        const g = el("g", { class: "mark" }, svg);
        const ctx = {
            pen: new SvgPen(svg, { seed: 91, t, paper: false, roughness: 1 }),
            g,
            t,
            paper: false,
        };
        const x = a.x * U,
            y = a.y * U;
        if (m.mark === "star") starSticker(ctx, x, y + 16, 13);
        else if (m.mark === "tick") penTick(ctx, x - 10, y, 1.1);
        else penLoop(ctx, x, y + 20, 26, 30);
    }
}

/** Pixels to a square, rounded to the step a look is drawn at. */
export const stepOf = (px: number): number =>
    2 ** (Math.round(Math.log2(Math.max(1, px)) * STEPS) / STEPS);

/** How many bytes of pages a device may hold: less on a phone, where the map once ran out. */
export function budgetOf(): number {
    const memory =
        typeof navigator === "object" && "deviceMemory" in navigator
            ? Number(navigator.deviceMemory)
            : 8;
    const phone = typeof navigator === "object" && /iPhone|iPod/.test(navigator.userAgent);
    return (phone || memory < 4 ? 48 : 96) * 1024 * 1024;
}

export class GameAtlas {
    private readonly gl: CanvasGl;
    private readonly art: Map<string, Drawing<unknown>>;
    private readonly stage: HTMLElement;
    private readonly budget: number;
    private readonly entries = new Map<string, Entry>();
    private readonly specs = new Map<string, { spec: LookSpec; step: number }>();
    private pages: Page[] = [];
    private queue: string[] = [];
    private decoded: Decoded[] = [];
    private decoding = 0;
    private frame = 0;
    private readonly waiting: (() => void)[] = [];
    /** The looks each live sprite has had, newest last, so a needle's readings do not pile up. */
    private readonly lived = new Map<string, string[]>();
    readonly stats = { looks: 0, drawn: 0, drawMs: 0, pages: 0, bytes: 0 };

    constructor(o: {
        gl: CanvasGl;
        art: Map<string, Drawing<unknown>>;
        host: HTMLElement;
        budget?: number;
    }) {
        this.gl = o.gl;
        this.art = o.art;
        this.budget = o.budget ?? budgetOf();
        // a drawing has computed colours and fonts only while it is on the page, so it is drawn off to one side
        this.stage = document.createElement("div");
        this.stage.className = "on-paper";
        this.stage.setAttribute("aria-hidden", "true");
        Object.assign(this.stage.style, {
            position: "absolute",
            left: "-100000px",
            top: "0",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            pointerEvents: "none",
        });
        o.host.appendChild(this.stage);
    }

    /** Starts a new frame, for the least-recently-used order of pages. */
    tick(): void {
        this.frame++;
    }

    /**
     * The look drawn at `px` pixels to a square, or the nearest size of it already drawn while the
     * sharper one is on its way; null until any is ready. `sharpen` asks for the size wanted, and is
     * false while the camera moves, so a zoom draws nothing again until it rests.
     */
    get(spec: LookSpec, px: number, sharpen = true, live?: string): Placed | null {
        const base = lookKey(spec),
            step = stepOf(px),
            key = `${base}@${step}`;
        const had = this.entries.get(key);
        if (had?.placed) {
            had.used = this.frame;
            if (had.page) had.page.used = this.frame;
            return had.placed;
        }
        let near: Placed | null = null;
        for (const [k, e] of this.entries)
            if (e.placed && k.startsWith(`${base}@`)) {
                near = e.placed;
                e.used = this.frame;
                if (e.page) e.page.used = this.frame;
                break;
            }
        if (!had && (sharpen || !near)) this.ask(key, spec, step, live);
        return near;
    }

    /** Asks for every look a level will draw, and resolves once all of them are in pages. */
    preload(specs: readonly LookSpec[], px: number): Promise<void> {
        for (const s of specs) this.get(s, px, true);
        return this.ready();
    }

    ready(): Promise<void> {
        if (!this.queue.length && !this.decoding && !this.decoded.length) return Promise.resolve();
        return new Promise((done) => this.waiting.push(done));
    }

    get busy(): boolean {
        return this.queue.length > 0 || this.decoding > 0 || this.decoded.length > 0;
    }

    private ask(key: string, spec: LookSpec, step: number, live?: string): void {
        if (this.entries.has(key)) return;
        this.entries.set(key, {
            placed: null,
            page: null,
            pending: true,
            failed: false,
            used: this.frame,
        });
        this.specs.set(key, { spec, step });
        if (live) {
            // a live sprite keeps its stepped looks and a few exact ones, so a needle swinging back finds its reading still drawn
            const list = this.lived.get(live) ?? [];
            list.push(key);
            while (list.length > 40) {
                const old = list.shift();
                if (old) this.forget(old);
            }
            this.lived.set(live, list);
        }
        this.queue.push(key);
        this.pump();
    }

    private forget(key: string): void {
        this.entries.delete(key);
        this.specs.delete(key);
    }

    private pump(): void {
        while (this.decoding < DECODING && this.queue.length) {
            const key = this.queue.shift();
            const want = key === undefined ? undefined : this.specs.get(key);
            if (key === undefined || !want) continue;
            const v = this.art.get(want.spec.art);
            if (!v) {
                // a drawing still loading is asked for again by the next frame that draws it
                this.forget(key);
                continue;
            }
            this.decoding++;
            const t0 = performance.now();
            const r = render<unknown>(v, want.spec.params ?? v.params, {
                seed: want.spec.seed ?? 4127,
                host: this.stage,
            });
            if (want.spec.marks?.length) penMarks(r.svg, r.anchors, want.spec.marks, this.stage);
            const box = want.spec.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
            const across = want.spec.size ?? box.w;
            const w = across,
                h = (across * box.h) / box.w;
            this.stage.appendChild(r.svg);
            const margin = want.spec.crop ? 0 : reach(r.svg, r.box),
                pad = (margin * across) / box.w;
            const pw = Math.max(1, Math.min(PAGE - 2 * GAP, Math.round((w + 2 * pad) * want.step))),
                ph = Math.max(1, Math.min(PAGE - 2 * GAP, Math.round((h + 2 * pad) * want.step)));
            const anchors: Anchors = {};
            for (const [name, a] of Object.entries(r.anchors))
                anchors[name] = {
                    ...a,
                    x: ((a.x - box.x) * w) / box.w,
                    y: ((a.y - box.y) * h) / box.h,
                };
            void standalone(
                r.svg,
                {
                    x: (box.x - margin) * U,
                    y: (box.y - margin) * U,
                    w: (box.w + 2 * margin) * U,
                    h: (box.h + 2 * margin) * U,
                },
                pw,
                ph,
                {
                    without: [],
                    only: null,
                    unit: 1,
                },
            )
                .then(async (text) => {
                    r.svg.remove();
                    if (!text) throw new Error("not an svg");
                    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
                    const image = new Image(pw, ph);
                    image.src = url;
                    try {
                        await image.decode();
                    } catch (error) {
                        URL.revokeObjectURL(url);
                        throw error;
                    }
                    this.decoded.push({ key, image, url, pw, ph, w, h, pad, anchors });
                    this.stats.drawn++;
                    this.stats.drawMs += performance.now() - t0;
                })
                .catch(() => {
                    r.svg.remove();
                    const e = this.entries.get(key);
                    if (e) Object.assign(e, { pending: false, failed: true });
                })
                .finally(() => {
                    this.decoding--;
                    this.pump();
                    this.settle();
                });
        }
    }

    /** Writes what has decoded into pages, for as long as the frame allows. */
    upload(): void {
        const started = performance.now();
        while (this.decoded.length && performance.now() - started < UPLOADING) {
            const d = this.decoded.shift();
            if (!d) break;
            URL.revokeObjectURL(d.url);
            const e = this.entries.get(d.key);
            if (!e) continue;
            const spot = this.place(d.pw, d.ph);
            if (!spot || !this.gl.write(spot.page.texture, spot.x, spot.y, d.image)) {
                Object.assign(e, { pending: false, failed: true });
                continue;
            }
            d.image.removeAttribute("src");
            e.pending = false;
            e.page = spot.page;
            e.placed = {
                texture: spot.page.texture,
                u: spot.x / PAGE,
                v: spot.y / PAGE,
                uw: d.pw / PAGE,
                vh: d.ph / PAGE,
                w: d.w,
                h: d.h,
                pad: d.pad,
                anchors: d.anchors,
            };
        }
        this.stats.looks = [...this.entries.values()].filter((e) => e.placed).length;
        this.settle();
    }

    private settle(): void {
        if (this.busy) return;
        for (const done of this.waiting.splice(0)) done();
    }

    /** A place for `w` by `h` pixels: on a shelf with room, a new shelf, or a new page within the budget. */
    private place(w: number, h: number): { page: Page; x: number; y: number } | null {
        const fits = (p: Page) => {
            for (const s of p.shelves)
                if (h <= s.h && s.x + w + GAP <= PAGE) {
                    const at = { page: p, x: s.x + GAP, y: s.y + GAP };
                    s.x += w + GAP;
                    return at;
                }
            if (p.top + h + 2 * GAP <= PAGE) {
                const s: Shelf = { y: p.top, h: h + GAP, x: w + GAP };
                p.shelves.push(s);
                p.top += h + GAP;
                return { page: p, x: GAP, y: s.y + GAP };
            }
            return null;
        };
        for (const p of this.pages) {
            const at = fits(p);
            if (at) return at;
        }
        while ((this.pages.length + 1) * PAGE * PAGE * 4 > this.budget && this.evict());
        const texture = this.gl.page(PAGE, PAGE);
        if (!texture) return null;
        const page: Page = { texture, shelves: [], top: 0, used: this.frame };
        this.pages.push(page);
        this.stats.pages = this.pages.length;
        this.stats.bytes = this.pages.length * PAGE * PAGE * 4;
        return fits(page);
    }

    /** Drops the page used longest ago, and every look in it; false when there is none to drop. */
    private evict(): boolean {
        const old = [...this.pages].sort((a, b) => a.used - b.used)[0];
        // a frame asks for its looks as it goes, so a page the last frame drew may still be on screen
        if (!old || old.used >= this.frame - 1) return false;
        this.pages = this.pages.filter((p) => p !== old);
        this.gl.release(old.texture);
        for (const [k, e] of this.entries) if (e.page === old) this.forget(k);
        this.stats.pages = this.pages.length;
        this.stats.bytes = this.pages.length * PAGE * PAGE * 4;
        return true;
    }

    /** After the GPU lost its context: every page is gone, and every look asked for is drawn again. */
    rebuild(): void {
        this.pages = [];
        this.decoded = [];
        const again = [...this.specs.keys()];
        for (const k of again) {
            const e = this.entries.get(k);
            if (e) Object.assign(e, { placed: null, page: null, pending: true, failed: false });
        }
        this.queue = again;
        this.pump();
    }

    stop(): void {
        for (const p of this.pages) this.gl.release(p.texture);
        this.pages = [];
        this.entries.clear();
        this.specs.clear();
        this.queue = [];
        this.decoded = [];
        this.stage.remove();
    }
}
