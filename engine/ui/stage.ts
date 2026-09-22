// The stage: the field a game is played on, and the one file the games reach the page through.
//
// It draws what a game gives it, through the ordinary renderer and the seeded pen, so every drawing
// is the shelf's own and the resting picture is the one that prints. It has two surfaces because
// games come in two shapes. A turn game gives a scene of keyed parts on a sheet of squares: a part
// whose place changed glides there on a spring, a part whose numeric setting changed is drawn again
// at values on the way (a beam swings and a jug fills with no animation code in the drawing), and a
// part the child is holding follows the pointer. An action game gives a frame of keyed sprites under
// a camera: each look is drawn once and every sprite that moves is its own layer, which the browser
// rasterises once and then only moves, measured against a canvas and PixiJS in .docs/engine.md.
// Both draw the same marks in ink over the drawings.
//
// Every motion is a closed-form function of the time it started or a step of the fixed loop, so a
// frame is a function of the frame's time. Under reduced motion nothing glides, swings, puffs or
// shakes: each scene is drawn at once, and nothing is lost, because the position is the picture.
import type { Anchors } from "../ink/surface";
import { atRest, poseAt, type Beat } from "../motion/beat";
import { ageOf, burst, bursts, stepBursts, type Bursts, type Style } from "../motion/burst";
import type { Cue } from "../motion/cues";
import type { Pt, Rect } from "../motion/geometry";
import { Recogniser, type Feel, type Gesture, type Sample } from "../motion/gesture";
import { ticker, type Ticker } from "../motion/loop";
import type { BurstKind, Frame, Mark, Part, Scene, ShowOptions, Sprite } from "../motion/scene";
import { SPRINGS, settled, springAt, type Spring } from "../motion/spring";
import { HANGING, sway, type Sway, type Swing } from "../motion/sway";
import { U } from "../paper";
import type { Drawing } from "../parts/drawing";
import { loop as penLoop, starSticker, tick as penTick } from "../parts/marks";
import { readTokens } from "./read-tokens";
import { SvgPen as Pen, el, render } from "./svg";

/** Marks into an SVG whose user unit is one square, which both surfaces' ink layers are. */
function drawMarks(g: SVGElement, marks: Mark[]): void {
    g.replaceChildren();
    for (const m of marks) {
        if (m.kind === "dots") {
            for (const p of m.pts)
                el(
                    "circle",
                    {
                        cx: p.x.toFixed(2),
                        cy: p.y.toFixed(2),
                        r: 0.13,
                        class: m.faint ? "dot faint" : "dot",
                    },
                    g,
                );
        } else if (m.kind === "line" && m.style === "stream") {
            // Water from a spout or a tap: a band as wide as it is running, edged in ink so it is
            // not colour alone.
            const mid = `${(m.a.x + m.b.x) / 2} ${(m.a.y + m.b.y) / 2 - (m.bend ?? 0) * 2}`;
            const d = m.bend
                ? `M${m.a.x} ${m.a.y}Q${mid} ${m.b.x} ${m.b.y}`
                : `M${m.a.x} ${m.a.y}L${m.b.x} ${m.b.y}`;
            const w = 0.14 + 0.32 * Math.max(0, Math.min(1, m.weight ?? 1));
            el("path", { d, class: "stream-edge", "stroke-width": (w + 0.09).toFixed(3) }, g);
            el("path", { d, class: "stream", "stroke-width": w.toFixed(3) }, g);
        } else if (m.kind === "line") {
            const cls = m.style && m.style !== "ink" ? m.style : "line";
            if (m.bend) {
                const mx = (m.a.x + m.b.x) / 2,
                    my = (m.a.y + m.b.y) / 2 - m.bend * 2;
                el(
                    "path",
                    { d: `M${m.a.x} ${m.a.y}Q${mx} ${my} ${m.b.x} ${m.b.y}`, class: cls },
                    g,
                );
            } else el("line", { x1: m.a.x, y1: m.a.y, x2: m.b.x, y2: m.b.y, class: cls }, g);
            const len = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y);
            if (m.head && len > 0.2) {
                const a = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x),
                    k = Math.min(0.55, len * 0.4);
                const wing = (s: number) =>
                    `${(m.b.x + k * Math.cos(a + Math.PI + s * 0.5)).toFixed(2)} ${(m.b.y + k * Math.sin(a + Math.PI + s * 0.5)).toFixed(2)}`;
                el(
                    "path",
                    {
                        d: `M${wing(-1)}L${m.b.x.toFixed(2)} ${m.b.y.toFixed(2)}L${wing(1)}`,
                        class: `${cls} head`,
                    },
                    g,
                );
            }
        } else if (m.kind === "ring") {
            el(
                "circle",
                {
                    cx: m.x,
                    cy: m.y,
                    r: m.r,
                    class: m.on ? "ring on" : m.solid ? "ring solid" : "ring",
                },
                g,
            );
        } else if (m.kind === "box") {
            el(
                "rect",
                {
                    x: m.x,
                    y: m.y,
                    width: m.w,
                    height: m.h,
                    rx: 0.3,
                    class: m.on ? "ring on" : "ring",
                },
                g,
            );
        } else if (m.kind === "puff") {
            el("circle", { cx: m.x, cy: m.y, r: m.r, class: "puff" }, g);
        } else {
            const t = el("text", { x: m.x, y: m.y, class: "word", "font-size": m.size ?? 0.8 }, g);
            t.textContent = m.text;
        }
    }
}

interface Glide {
    fromX: number;
    fromY: number;
    vx: number;
    vy: number;
    toX: number;
    toY: number;
    spring: Spring;
    t0: number;
}
interface Morph {
    per: Record<string, { from: number; to: number; v0: number; spring: Spring }>;
    t0: number;
}

interface Held {
    key: string;
    el: HTMLDivElement;
    art: string;
    /** The settings the part is drawn with right now, which differ from the scene's during a morph. */
    params: Record<string, unknown>;
    label: string;
    marks: NonNullable<Part["marks"]>;
    size: number;
    box: { w: number; h: number };
    anchors: Anchors;
    x: number;
    y: number;
    z: number;
    glide: Glide | null;
    morph: Morph | null;
    lifted: boolean;
    angle: number;
    squash: number;
    scale: number;
    pivot: Pt | null;
    hold: Pt | null;
    crop: Part["crop"] | null;
    /** How it hangs from the hand while carried, and where the hand was and how fast it was going at the last frame. */
    sway: Sway;
    hand: { x: number; vx: number } | null;
    /** Coming back upright after a carry: the angle and spin it was let go with, and when. */
    upright: { from: number; v0: number; t0: number } | null;
    /** The pose last written to the page, so a frame writes only what changed. */
    wrote: string;
}

export interface StageOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    seed?: number;
    /** Whether motion is off, asked every time: prefers-reduced-motion, or a page's own switch. */
    still(): boolean;
    /** Called once per frame while anything is moving, after the parts have been drawn. */
    onFrame?(t: number, dt: number): void;
    // The clock and the frame scheduler are handed to the ticker, so they are fields rather than
    // methods: a method read off this object would carry `this` with it.
    now?: () => number;
    schedule?: (f: (nowMs: number) => void) => void;
}

export interface PointerHooks {
    /** Which handle a press at this point picks up, or null for nothing. In sheet squares. */
    hit(p: Pt): string | null;
    on(g: Gesture, key: string | null): void;
    feel?: Partial<Feel>;
}

const numeric = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Whether any setting in `b` is not what `a` has. */
const differs = (a: Record<string, unknown>, b: Record<string, unknown>): boolean =>
    Object.keys(b).some((k) =>
        typeof b[k] === "object" && b[k] !== null
            ? JSON.stringify(a[k]) !== JSON.stringify(b[k])
            : a[k] !== b[k],
    );

/** How a carried thing hangs from the hand. */
const CARRY: Swing = { length: 2.4, g: 60, damping: 3.2, most: 0.42 };

/** The settings that are not numbers, as a string, so two scenes can be compared on them alone. */
const shapeOf = (p: Record<string, unknown>): string =>
    JSON.stringify(Object.fromEntries(Object.entries(p).filter(([, v]) => !numeric(v))));

/** Room under a labelled part for its caption, in squares. */
const LABEL = 1.2;

/**
 * A turn game's board on the page: the scene's parts as keyed drawings on a sheet of squares, the
 * marks over them, the beat a move plays, and the pointer the child works them with.
 */
export class Stage {
    readonly sheet: HTMLDivElement;
    private readonly overlay: SVGSVGElement;
    private readonly held = new Map<string, Held>();
    private readonly layers = new Map<string, SVGGElement>();
    /** How many times a drawing was rendered, and the milliseconds it took, for the page's figures. */
    readonly stats = { renders: 0, ms: 0 };
    private readonly tick: Ticker;
    private size = { w: 0, h: 0 };
    private rec: Recogniser | null = null;
    private hooks: PointerHooks | null = null;
    private grabbed: string | null = null;
    private order = 0;
    /** Set by `wake` during a frame, so a frame that asks for another is not the last. */
    private more = false;
    private readonly o: StageOptions;
    /** The beat being played, the scene it ends on, when it started and how far its cues and bursts have fired. */
    private playing: {
        beat: Beat;
        scene: Scene;
        t0: number;
        done: number;
        hear: (c: Cue) => void;
        marked: string;
    } | null = null;
    private readonly motes: Motes;
    private readonly moteLooks = new Map<string, Look>();
    /** Pixels to a square as of the last frame that had motes, so a mote does not read the stylesheet. */
    private px = 20;

    constructor(o: StageOptions) {
        this.o = o;
        this.sheet = document.createElement("div");
        this.sheet.className = "sheet squared";
        this.overlay = el("svg", { class: "ink overlay", "aria-hidden": "true" });
        this.sheet.appendChild(this.overlay);
        o.host.appendChild(this.sheet);
        this.motes = new Motes(
            this.sheet,
            () => this.overlay,
            (pick) => this.moteLook(pick),
        );
        this.tick = ticker({
            now: o.now ?? (() => performance.now()),
            schedule: o.schedule ?? ((f) => requestAnimationFrame(f)),
            onFrame: (t, dt) => this.frame(t, dt),
        });
    }

    /** Seconds on the stage's clock, as of now, which every motion is a function of. */
    get time(): number {
        return this.tick.now();
    }

    /** Pixels to a square, as the page's stylesheet set it. */
    get sq(): number {
        const v = parseFloat(getComputedStyle(this.sheet).getPropertyValue("--sq"));
        return Number.isFinite(v) && v > 0 ? v : 20;
    }

    /** The width the stage has on the page, in pixels. */
    get room(): number {
        return this.o.host.clientWidth || 0;
    }

    get bounds(): { w: number; h: number } {
        return this.size;
    }

    /** A client point in sheet squares, the same units every part's place is in. */
    toSquares(clientX: number, clientY: number): Pt {
        const r = this.sheet.getBoundingClientRect(),
            sq = this.sq;
        return { x: (clientX - r.left) / sq - 1, y: (clientY - r.top) / sq - 1 };
    }

    /**
     * Draw a scene. Parts without a place are laid in a row under the placed ones, which is how a
     * mechanic whose drawings have no places of their own (a machine and its table) is shown.
     */
    show(scene: Scene, o: ShowOptions = {}): void {
        if (this.playing && !o.jump) this.cut();
        const still = this.o.still();
        const seen = new Set<string>();
        const flow: Held[] = [];
        const fresh = new Set<Held>();
        scene.parts.forEach((part, i) => {
            const key = part.key ?? (part.at ? `at:${i}` : `row:${i}`);
            seen.add(key);
            let h = this.held.get(key);
            const at = part.at ?? (h ? { x: this.goalX(h), y: this.goalY(h) } : { x: 0, y: 0 });
            if (!h) {
                h = this.make(key, part, at);
                fresh.add(h);
                this.draw(h, part.params);
                this.moveTo(h, at.x, at.y);
            } else {
                this.update(h, part, at, o, still);
            }
            h.pivot = part.pivot ?? null;
            h.hold = part.hold ?? null;
            if (!h.lifted && !h.upright)
                this.setPose(h, part.angle ?? 0, part.squash ?? 0, part.scale ?? 1);
            if (!part.at) flow.push(h);
            h.z = part.z ?? 10 + i;
            h.el.style.zIndex = String(h.lifted ? 200 + this.order : h.z);
        });
        if (!o.keep) {
            // The list is taken before any is dropped, since dropping walks the same map.
            const gone = [...this.held.values()].filter((h) => !seen.has(h.key));
            for (const h of gone) {
                h.el.remove();
                this.held.delete(h.key);
            }
        }
        if (flow.length) {
            let top = 0;
            for (const h of this.held.values())
                if (!flow.includes(h)) top = Math.max(top, this.goalY(h) + this.tall(h) + 1);
            let x = 0;
            for (const h of flow) {
                if (this.goalX(h) !== x || this.goalY(h) !== top) {
                    if (still || o.jump || fresh.has(h)) this.moveTo(h, x, top);
                    else this.glide(h.key, { x, y: top }, o.glide);
                }
                x += h.box.w + 2;
            }
        }
        this.resize(scene);
        if (this.live()) this.tick.start();
        else this.o.onFrame?.(this.time, 0);
    }

    /** Forget every part and mark, for a new round. */
    clear(): void {
        for (const h of this.held.values()) h.el.remove();
        this.held.clear();
        for (const g of this.layers.values()) g.remove();
        this.layers.clear();
        this.overlay.querySelector("[data-sticker]")?.remove();
        this.playing = null;
        this.motes.clear();
    }

    private make(key: string, part: Part, at: Pt): Held {
        const box = document.createElement("div");
        box.className = "placed";
        box.dataset.key = key;
        this.sheet.insertBefore(box, this.overlay);
        const h: Held = {
            key,
            el: box,
            art: part.art,
            params: { ...part.params },
            label: part.label ?? "",
            marks: part.marks ?? [],
            size: part.size ?? 0,
            box: { w: 1, h: 1 },
            anchors: {},
            x: at.x,
            y: at.y,
            z: 0,
            glide: null,
            morph: null,
            lifted: false,
            angle: 0,
            squash: 0,
            scale: 1,
            pivot: part.pivot ?? null,
            hold: part.hold ?? null,
            crop: part.crop ?? null,
            sway: HANGING,
            hand: null,
            upright: null,
            wrote: "",
        };
        this.held.set(key, h);
        return h;
    }

    private update(h: Held, part: Part, at: Pt, o: ShowOptions, still: boolean): void {
        const next = part.params;
        const artChanged =
            h.art !== part.art ||
            h.label !== (part.label ?? "") ||
            h.size !== (part.size ?? 0) ||
            JSON.stringify(h.marks) !== JSON.stringify(part.marks ?? []) ||
            shapeOf(h.params) !== shapeOf(next) ||
            JSON.stringify(h.crop) !== JSON.stringify(part.crop ?? null);
        // Which numeric settings differ from where the part is drawn now, or is heading.
        const goal = (k: string): number | undefined => {
            const heading = h.morph?.per[k]?.to;
            if (heading !== undefined) return heading;
            const drawn = h.params[k];
            return numeric(drawn) ? drawn : undefined;
        };
        const changed = Object.keys(next).filter(
            (k) => numeric(next[k]) && numeric(h.params[k]) && next[k] !== goal(k),
        );
        const morphable =
            !still &&
            !o.jump &&
            !artChanged &&
            changed.length > 0 &&
            changed.every((k) => o.morph?.[k]);
        if (morphable) {
            const per: Morph["per"] = h.morph ? { ...h.morph.per } : {};
            for (const k of changed) {
                const now = this.valueNow(h, k);
                const spring = o.morph?.[k];
                const to = next[k];
                if (spring && numeric(to)) per[k] = { from: now.x, to, v0: now.v, spring };
            }
            h.morph = { per, t0: this.time };
            const drawn = { ...next };
            for (const k of Object.keys(per)) drawn[k] = this.valueNow(h, k).x;
            this.draw(h, drawn);
        } else if (artChanged || changed.length || (o.jump && h.morph)) {
            // A change that is not morphed switches at once, and cancels any morph under way, so the
            // drawing is never at a value nobody asked for.
            h.morph = null;
            h.art = part.art;
            h.label = part.label ?? "";
            h.marks = part.marks ?? [];
            h.size = part.size ?? 0;
            h.crop = part.crop ?? null;
            this.draw(h, next);
        }
        if (at.x !== this.goalX(h) || at.y !== this.goalY(h)) {
            if (still || o.jump) this.moveTo(h, at.x, at.y);
            else this.glide(h.key, at, o.glide ?? SPRINGS.snap);
        }
    }

    private goalX(h: Held): number {
        return h.glide ? h.glide.toX : h.x;
    }
    private goalY(h: Held): number {
        return h.glide ? h.glide.toY : h.y;
    }
    private tall(h: Held): number {
        return h.box.h + (h.label ? LABEL : 0);
    }

    private valueNow(h: Held, k: string): { x: number; v: number } {
        const m = h.morph?.per[k];
        if (!m || !h.morph) {
            const v = h.params[k];
            return { x: numeric(v) ? v : 0, v: 0 };
        }
        return springAt(m.spring, m.from, m.to, m.v0, this.time - h.morph.t0);
    }

    private draw(h: Held, params: Record<string, unknown>): void {
        const visual = this.o.art.get(h.art);
        h.params = { ...params };
        h.el.replaceChildren();
        if (!visual) {
            h.el.textContent = `no drawing called ${h.art}`;
            return;
        }
        const t0 = performance.now();
        const r = render<unknown>(visual, params, { seed: this.o.seed ?? 4127, host: h.el });
        const c = h.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
        const k = h.size ? h.size / c.w : 1;
        if (h.crop) {
            r.svg.setAttribute("viewBox", `${c.x * U} ${c.y * U} ${c.w * U} ${c.h * U}`);
            r.svg.style.setProperty("--h", String(c.h * k));
            r.svg.style.overflow = "hidden";
        }
        if (k !== 1 || h.crop) r.svg.style.setProperty("--w", String(c.w * k));
        if (h.marks.length) {
            const t = readTokens(h.el);
            for (const m of h.marks) {
                const a = r.anchors[m.at];
                if (!a) continue;
                const g = el("g", { class: "mark" }, r.svg);
                const ctx = {
                    pen: new Pen(r.svg, { seed: 91, t, paper: false, roughness: 1 }),
                    g,
                    t,
                    paper: false,
                };
                const x = a.x * U,
                    y = a.y * U;
                if (m.mark === "star") starSticker(ctx, x, y + 16, 13);
                else if (m.mark === "tick") penTick(ctx, x - 10, y, 1.1);
                // A ring round the label is what a teacher's pen does, and unlike a sticker it does
                // not sit on top of the number it is pointing at.
                else penLoop(ctx, x, y + 20, 26, 30);
            }
        }
        h.el.appendChild(r.svg);
        if (h.label) {
            const cap = document.createElement("span");
            cap.className = "label placed-label";
            cap.textContent = h.label;
            h.el.appendChild(cap);
        }
        h.box = { w: c.w * k, h: c.h * k };
        h.anchors = Object.fromEntries(
            Object.entries(r.anchors).map(([n, a]) => [
                n,
                { ...a, x: (a.x - c.x) * k, y: (a.y - c.y) * k },
            ]),
        );
        h.wrote = "";
        this.stats.renders++;
        this.stats.ms += performance.now() - t0;
    }

    private resize(scene: Scene): void {
        let w = scene.size?.w ?? 0,
            h = scene.size?.h ?? 0;
        for (const held of this.held.values()) {
            w = Math.max(w, this.goalX(held) + held.box.w);
            h = Math.max(h, this.goalY(held) + this.tall(held));
        }
        this.size = { w, h };
        this.sheet.style.setProperty("--w", String(w));
        this.sheet.style.setProperty("--h", String(h));
        this.overlay.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }

    private moveTo(h: Held, x: number, y: number): void {
        h.x = x;
        h.y = y;
        h.glide = null;
        h.el.style.setProperty("--x", String(x));
        h.el.style.setProperty("--y", String(y));
    }

    /** Put a part somewhere now, with no motion: what a drag does on every move of the pointer. */
    place(key: string, p: Pt): void {
        const h = this.held.get(key);
        if (h) this.moveTo(h, p.x, p.y);
    }

    /**
     * Send a part somewhere on a spring, from wherever it is and however fast it is already going, or as
     * fast as a hand let it go (`v0`, squares a second) when it was not already on its way.
     */
    glide(key: string, to: Pt, spring: Spring = SPRINGS.snap, v0?: Pt): void {
        const h = this.held.get(key);
        if (!h) return;
        if (this.o.still()) {
            this.moveTo(h, to.x, to.y);
            return;
        }
        const v = h.glide || !v0 ? this.velocity(h) : { vx: v0.x, vy: v0.y };
        if (h.x === to.x && h.y === to.y && v.vx === 0 && v.vy === 0) {
            h.glide = null;
            return;
        }
        h.glide = {
            fromX: h.x,
            fromY: h.y,
            vx: v.vx,
            vy: v.vy,
            toX: to.x,
            toY: to.y,
            spring,
            t0: this.time,
        };
        this.tick.start();
    }

    /**
     * Keep a part on a place that is itself moving, such as a pan while the beam swings: a part at
     * rest is put there, a part on its way is sent on to the new place, and a held part is left alone.
     */
    follow(key: string, to: Pt): void {
        const h = this.held.get(key);
        if (!h || h.lifted) return;
        if (h.glide) {
            if (h.glide.toX !== to.x || h.glide.toY !== to.y) this.glide(key, to, h.glide.spring);
        } else if (h.x !== to.x || h.y !== to.y) this.moveTo(h, to.x, to.y);
    }

    private velocity(h: Held): { vx: number; vy: number } {
        if (!h.glide) return { vx: 0, vy: 0 };
        const t = this.time - h.glide.t0;
        return {
            vx: springAt(h.glide.spring, h.glide.fromX, h.glide.toX, h.glide.vx, t).v,
            vy: springAt(h.glide.spring, h.glide.fromY, h.glide.toY, h.glide.vy, t).v,
        };
    }

    /** A small push off a part's place that springs straight back: the bump against a buffer. */
    nudge(key: string, by: Pt): void {
        const h = this.held.get(key);
        if (!h || this.o.still()) return;
        const to = { x: h.x, y: h.y };
        this.moveTo(h, h.x + by.x, h.y + by.y);
        this.glide(key, to, SPRINGS.snap);
    }

    lift(key: string, on: boolean): void {
        if (on) this.settle();
        const h = this.held.get(key);
        if (!h) return;
        h.lifted = on;
        h.el.classList.toggle("lifted", on);
        h.el.style.zIndex = String(on ? 200 + ++this.order : h.z);
        if (on) {
            h.sway = HANGING;
            h.hand = null;
            h.upright = null;
        } else if (h.hold && h.angle !== 0) {
            // It turns about its pivot from here on rather than about the hand, so it is moved by what
            // that change would shift it, and the drawing stays exactly where the hand left it.
            const was = h.hold,
                now = h.pivot ?? { x: h.box.w / 2, y: h.box.h / 2 };
            const c = Math.cos(h.angle),
                s = Math.sin(h.angle),
                dx = was.x - now.x,
                dy = was.y - now.y;
            h.lifted = false;
            this.moveTo(h, h.x + dx - (c * dx - s * dy), h.y + dy - (s * dx + c * dy));
            h.upright = { from: h.angle, v0: h.sway.spin, t0: this.time };
            h.wrote = "";
            this.setPose(h, h.angle, h.squash, h.scale);
            this.tick.start();
        }
    }

    /** How far a part is turned, in clockwise radians, as it is drawn now. */
    turned(key: string): number {
        return this.held.get(key)?.angle ?? 0;
    }

    /** Where a part turns: the hand while it is carried and hangs from one, its pivot otherwise, its middle when it has neither. */
    private origin(h: Held): Pt {
        return h.lifted && h.hold ? h.hold : (h.pivot ?? { x: h.box.w / 2, y: h.box.h / 2 });
    }

    private setPose(h: Held, angle: number, squash: number, scale: number): void {
        h.angle = angle;
        h.squash = squash;
        h.scale = scale;
        const o = this.origin(h);
        const wrote = `${angle.toFixed(4)} ${squash.toFixed(3)} ${scale.toFixed(3)} ${o.x.toFixed(2)} ${o.y.toFixed(2)}`;
        if (wrote === h.wrote) return;
        h.wrote = wrote;
        const st = h.el.style;
        st.setProperty("--a", angle.toFixed(4));
        st.setProperty("--s", squash.toFixed(3));
        st.setProperty("--k", scale.toFixed(3));
        st.setProperty("--ox", o.x.toFixed(2));
        st.setProperty("--oy", o.y.toFixed(2));
    }

    /** One frame of a carried thing swaying from the hand, from how the hand's speed across changed. */
    private carry(h: Held, dt: number): void {
        if (dt <= 0) return;
        const was = h.hand ?? { x: h.x, vx: 0 };
        const vx = was.vx + ((h.x - was.x) / dt - was.vx) * Math.min(1, dt * 18);
        h.hand = { x: h.x, vx };
        h.sway = sway(h.sway, (vx - was.vx) / dt, dt, CARRY);
        this.setPose(h, h.sway.angle, 0, 1);
    }

    /** Whether a beat is playing, which the page leaves the board to. */
    get busy(): boolean {
        return this.playing !== null;
    }

    /**
     * Play a move's beat, which ends on `scene`. A beat already playing is finished first, and under
     * reduced motion only the beat's sounds are left and the scene is drawn at once.
     */
    play(beat: Beat, scene: Scene, hear: (c: Cue) => void): void {
        this.settle();
        const b = this.o.still() ? atRest(beat) : beat;
        if (b.length <= 0) {
            for (const c of b.cues) hear(c.cue);
            this.show(scene);
            return;
        }
        this.show(
            { parts: [...scene.parts, ...b.extra], size: scene.size },
            { keep: true, jump: true },
        );
        for (const tr of b.tracks) {
            const h = this.held.get(tr.key);
            if (h) h.upright = null;
        }
        this.playing = { beat: b, scene, t0: this.time, done: -1, hear, marked: "" };
        this.applyBeat(0);
        this.tick.start();
    }

    /** Finish a beat now, leaving the scene it ends on. */
    settle(): void {
        const p = this.playing;
        if (!p) return;
        this.cut();
        this.show(p.scene);
    }

    private cut(): void {
        this.playing = null;
        this.marks("beat", []);
    }

    private applyBeat(u: number): void {
        const p = this.playing;
        if (!p) return;
        for (const [key, pose] of poseAt(p.beat, p.scene, u)) {
            const h = this.held.get(key);
            if (!h || h.lifted) continue;
            if (h.x !== pose.x || h.y !== pose.y) this.moveTo(h, pose.x, pose.y);
            h.pivot = pose.pivot;
            if (pose.z !== null && pose.z !== h.z) {
                h.z = pose.z;
                h.el.style.zIndex = String(h.z);
            }
            this.setPose(h, pose.angle, pose.squash, pose.scale);
            if (differs(h.params, pose.params)) this.draw(h, pose.params);
        }
        for (const b of p.beat.bursts)
            if (b.at > p.done && b.at <= u) this.burst(b.kind, b.x, b.y, b.n, b.dir);
        for (const c of p.beat.cues) if (c.at > p.done && c.at <= u) p.hear(c.cue);
        p.done = u;
        const on = p.beat.marks
            .filter((m) => u >= m.at && u < m.at + m.dur)
            .flatMap((m) => m.marks);
        const marked = JSON.stringify(on);
        if (marked !== p.marked) {
            p.marked = marked;
            this.marks("beat", on);
        }
        if (u >= p.beat.length) this.settle();
    }

    /** A burst of small things over the sheet, from a point in squares. Nothing under reduced motion. */
    private burst(kind: BurstKind, x: number, y: number, n: number, dir?: number): void {
        if (this.o.still()) return;
        this.motes.throw(kind, x, y, n, dir);
    }

    private moteLook(pick: MoteLook): { key: string; look: Look } | null {
        const key = `${pick.art}|${JSON.stringify(pick.params ?? null)}|${pick.crop ? `${pick.crop.x},${pick.crop.y}` : ""}|${this.px}`;
        const had = this.moteLooks.get(key);
        if (had) return { key, look: had };
        const v = this.o.art.get(pick.art);
        if (!v) return null;
        const r = render<unknown>(v, pick.params ?? v.params, { seed: 3, host: this.sheet });
        const box = pick.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
        const w = this.px,
            hh = (box.h / box.w) * this.px;
        r.svg.setAttribute("viewBox", `${box.x * U} ${box.y * U} ${box.w * U} ${box.h * U}`);
        r.svg.setAttribute("aria-hidden", "true");
        Object.assign(r.svg.style, {
            width: `${w}px`,
            height: `${hh}px`,
            maxWidth: "none",
            overflow: pick.crop ? "hidden" : "visible",
        });
        const look = { svg: r.svg, w, h: hh };
        this.moteLooks.set(key, look);
        return { key, look };
    }

    /** Take a part off the sheet that no scene will name again, such as a ghost of a landing. */
    remove(key: string): void {
        this.held.get(key)?.el.remove();
        this.held.delete(key);
    }

    /** A class on a part, for the page's look of it: one that can be picked up, a ghost of a landing. */
    tag(key: string, cls: string, on: boolean): void {
        this.held.get(key)?.el.classList.toggle(cls, on);
    }

    at(key: string): Pt | null {
        const h = this.held.get(key);
        return h ? { x: h.x, y: h.y } : null;
    }

    /** How high a part is stacked, so a press on two overlapping parts picks up the top one. */
    z(key: string): number {
        return Number(this.held.get(key)?.el.style.zIndex ?? 0);
    }

    /** A part's box on the sheet, in squares. */
    rect(key: string): Rect | null {
        const h = this.held.get(key);
        return h ? { x: h.x, y: h.y, w: h.box.w, h: h.box.h } : null;
    }

    /** One of a part's own anchors, in sheet squares, as the part is drawn right now. */
    anchor(key: string, name: string): Pt | null {
        const h = this.held.get(key);
        const a = h?.anchors[name];
        return h && a ? { x: h.x + a.x, y: h.y + a.y } : null;
    }

    /** Whether anything is still moving. */
    live(): boolean {
        if (this.playing || this.motes.alive) return true;
        for (const h of this.held.values())
            if (h.glide || h.morph || h.upright || (h.lifted && h.hold)) return true;
        return this.rec?.active ?? false;
    }

    /** A named layer of marks over the parts, replaced as a whole: the targets, an aim, a crash. */
    marks(layer: string, marks: Mark[]): void {
        let g = this.layers.get(layer);
        if (!g) {
            g = el("g", { "data-layer": layer }, this.overlay);
            this.layers.set(layer, g);
        }
        drawMarks(g, marks);
    }

    /**
     * The win's star sticker, drawn once by the marks pen and scaled by the page's timeline. A scale
     * of nought takes it away.
     */
    sticker(at: Pt, scale: number): void {
        let g = this.overlay.querySelector<SVGGElement>("g[data-sticker]");
        if (scale <= 0) {
            g?.remove();
            return;
        }
        const cx = at.x,
            cy = at.y - 1.3;
        if (!g) {
            g = el("g", { "data-sticker": "" }, this.overlay);
            const inner = el("g", { transform: `scale(${1 / U})` }, g);
            const t = readTokens(this.sheet);
            starSticker(
                {
                    pen: new Pen(this.overlay, { seed: 91, t, paper: false, roughness: 1 }),
                    g: inner,
                    t,
                    paper: false,
                },
                cx * U,
                cy * U,
                16,
            );
        }
        g.setAttribute(
            "transform",
            `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`,
        );
    }

    private frame(t: number, dt: number): boolean {
        const still = this.o.still();
        for (const h of this.held.values()) {
            if (h.lifted && h.hold && !still) this.carry(h, dt);
            else if (h.upright) {
                const s = springAt(
                    SPRINGS.swing,
                    h.upright.from,
                    0,
                    h.upright.v0,
                    t - h.upright.t0,
                );
                const done = still || settled(s, 0);
                if (done) h.upright = null;
                this.setPose(h, done ? 0 : s.x, h.squash, h.scale);
            }
            if (h.morph) {
                const drawn = { ...h.params };
                let all = true;
                for (const [k, m] of Object.entries(h.morph.per)) {
                    const s = springAt(m.spring, m.from, m.to, m.v0, t - h.morph.t0);
                    drawn[k] = s.x;
                    if (!settled(s, m.to)) all = false;
                }
                if (all) {
                    for (const [k, m] of Object.entries(h.morph.per)) drawn[k] = m.to;
                    h.morph = null;
                }
                this.draw(h, drawn);
            }
            if (h.glide) {
                const g = h.glide,
                    u = t - g.t0;
                const sx = springAt(g.spring, g.fromX, g.toX, g.vx, u),
                    sy = springAt(g.spring, g.fromY, g.toY, g.vy, u);
                if (settled(sx, g.toX) && settled(sy, g.toY)) this.moveTo(h, g.toX, g.toY);
                else {
                    h.x = sx.x;
                    h.y = sy.x;
                    h.el.style.setProperty("--x", String(sx.x));
                    h.el.style.setProperty("--y", String(sy.x));
                }
            }
        }
        if (this.playing) this.applyBeat(t - this.playing.t0);
        if (this.motes.alive) {
            this.px = this.sq;
            this.motes.step(dt, still, this.px, 1);
        }
        if (this.rec && this.hooks)
            for (const g of this.rec.poll(this.clock())) this.hooks.on(g, this.grabbed);
        this.more = false;
        this.o.onFrame?.(t, dt);
        return this.live() || this.more;
    }

    /** The milliseconds clock pointer samples are stamped with. Only its consistency matters. */
    private clock(): number {
        return (this.o.now ?? (() => performance.now()))();
    }

    /** Ask for one more frame, for a page running a timeline of its own on the stage's clock. */
    wake(): void {
        this.more = true;
        this.tick.start();
    }

    pointer(hooks: PointerHooks): () => void {
        this.hooks = hooks;
        const rec = new Recogniser(hooks.feel);
        this.rec = rec;
        const sample = (e: PointerEvent, kind: Sample["kind"]): Sample => {
            const p = this.toSquares(e.clientX, e.clientY);
            return { id: e.pointerId, kind, x: p.x, y: p.y, t: this.clock() };
        };
        const feed = (e: PointerEvent, kind: Sample["kind"]): void => {
            for (const g of rec.feed(sample(e, kind))) hooks.on(g, this.grabbed);
        };
        const down = (e: PointerEvent): void => {
            if (rec.active || e.button !== 0) return;
            const p = this.toSquares(e.clientX, e.clientY);
            this.grabbed = hooks.hit(p);
            if (this.grabbed === null) return;
            this.settle();
            e.preventDefault();
            this.sheet.setPointerCapture(e.pointerId);
            feed(e, "down");
            this.tick.start();
        };
        const move = (e: PointerEvent): void => {
            if (rec.active) {
                e.preventDefault();
                feed(e, "move");
            }
        };
        const up = (e: PointerEvent): void => {
            if (rec.active) {
                feed(e, "up");
                this.grabbed = null;
            }
        };
        const cancel = (e: PointerEvent): void => {
            if (rec.active) {
                feed(e, "cancel");
                this.grabbed = null;
            }
        };
        this.sheet.addEventListener("pointerdown", down);
        this.sheet.addEventListener("pointermove", move);
        this.sheet.addEventListener("pointerup", up);
        this.sheet.addEventListener("pointercancel", cancel);
        return () => {
            this.sheet.removeEventListener("pointerdown", down);
            this.sheet.removeEventListener("pointermove", move);
            this.sheet.removeEventListener("pointerup", up);
            this.sheet.removeEventListener("pointercancel", cancel);
            this.rec = null;
            this.hooks = null;
        };
    }
}

interface Look {
    svg: SVGSVGElement;
    w: number;
    h: number;
}
interface Placed {
    el: HTMLDivElement;
    look: string;
    layer: string;
    transform: string;
    w: number;
    h: number;
    moves: boolean;
    z: number;
    faint: boolean;
    alpha: number;
}

/** One shelf drawing a burst throws, whole or cut out of a bigger drawing. */
interface MoteLook {
    art: string;
    params?: Record<string, unknown>;
    crop?: { x: number; y: number; w: number; h: number };
}

type MoteStyle = Style & { looks: MoteLook[] };

/** How each kind of burst flies and which shelf drawing it throws. Looks are chosen round the list, so sparkles come in several colours. */
const BURSTS: Record<BurstKind, MoteStyle> = {
    dust: {
        life: 0.55,
        speed: 2.4,
        spread: Math.PI,
        fall: -1.2,
        drag: 5,
        spin: 1.5,
        size: 1,
        grow: 0.9,
        looks: [{ art: "arcade.puff" }],
    },
    sparkle: {
        life: 0.8,
        speed: 5.5,
        spread: Math.PI,
        fall: 5,
        drag: 2.2,
        spin: 5,
        size: 0.9,
        grow: -0.5,
        looks: (["glow", "berry", "sky", "mint"] as const).map((tone) => ({
            art: "fx.sparkle",
            params: { tone },
        })),
    },
    splash: {
        life: 0.7,
        speed: 6.5,
        spread: 0.75,
        fall: 22,
        drag: 0.6,
        spin: 0,
        size: 0.55,
        grow: 0,
        looks: [{ art: "fx.drop" }],
    },
    bubble: {
        life: 1.6,
        speed: 1.2,
        spread: 0.6,
        fall: -3.5,
        drag: 1.2,
        spin: 0,
        size: 0.7,
        grow: 0.4,
        looks: [{ art: "bubbles", crop: { x: 3.2, y: 1.2, w: 2.4, h: 2.4 } }],
    },
};

/** A mote's kind is a plain name in the pool, and this is how it finds the style it was thrown with. */
const BURST_STYLES = new Map<string, MoteStyle>(Object.entries(BURSTS));

/** The motes of the bursts over a surface, one element to a slot of the pool, so a burst makes no garbage. */
class Motes {
    private pool: Bursts = bursts(64, 7);
    private els: { el: HTMLDivElement; look: string }[] = [];
    private readonly host: HTMLElement;
    private readonly before: () => Node;
    private readonly lookOf: (pick: MoteLook) => { key: string; look: Look } | null;

    constructor(
        host: HTMLElement,
        before: () => Node,
        lookOf: (pick: MoteLook) => { key: string; look: Look } | null,
    ) {
        this.host = host;
        this.before = before;
        this.lookOf = lookOf;
    }

    get alive(): boolean {
        return this.pool.motes.length > 0;
    }

    throw(kind: BurstKind, x: number, y: number, n: number, dir?: number): void {
        burst(this.pool, kind, { x, y }, n, BURSTS[kind], dir);
    }

    clear(): void {
        for (const m of this.els) m.el.remove();
        this.els = [];
        this.pool = bursts(64, 7);
    }

    /** Steps the pool and moves each mote. `sq` is pixels to a square, and `inset` how many squares in from the surface's corner its places start. */
    step(dt: number, still: boolean, sq: number, inset = 0): void {
        if (still) this.pool.motes = [];
        else stepBursts(this.pool, dt);
        const ms = this.pool.motes;
        ms.forEach((m, i) => {
            const style = BURST_STYLES.get(m.kind);
            if (!style) return;
            const pick =
                style.looks[Math.floor(m.life * 997) % style.looks.length] ?? style.looks[0];
            const found = pick ? this.lookOf(pick) : null;
            if (!found) return;
            let slot = this.els[i];
            if (!slot || slot.look !== found.key) {
                slot?.el.remove();
                const d = document.createElement("div");
                d.className = "sprite moves mote";
                d.appendChild(found.look.svg.cloneNode(true));
                d.style.width = `${found.look.w}px`;
                d.style.height = `${found.look.h}px`;
                this.host.insertBefore(d, this.before());
                slot = { el: d, look: found.key };
                this.els[i] = slot;
            }
            const u = ageOf(m),
                k = Math.max(0.05, m.size * (1 + m.grow * u));
            slot.el.style.transform = `translate(${((m.x + inset) * sq - found.look.w / 2).toFixed(1)}px, ${((m.y + inset) * sq - found.look.h / 2).toFixed(1)}px) rotate(${m.angle.toFixed(2)}rad) scale(${k.toFixed(2)})`;
            slot.el.style.opacity = (1 - u * u).toFixed(2);
            slot.el.hidden = false;
        });
        for (let i = ms.length; i < this.els.length; i++) {
            const slot = this.els[i];
            if (slot && !slot.el.hidden) slot.el.hidden = true;
        }
    }
}

export interface FieldOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    /** Whether motion is reduced, asked every frame. */
    still(): boolean;
}

/**
 * An action game's world on the page. Each drawing is drawn once through the seeded pen, the first
 * time a sprite asks for that look, and every sprite with that look is a copy of it. A sprite that
 * never moves is painted into the paper with everything else that stays. The paper is one layer the
 * size of the world, with the 5 mm grid on it, moved by the camera; a sprite with a depth goes on a
 * layer of its own that the camera moves by that share, far layers under the world and near ones
 * over it, and a fixed sprite goes on a layer that never moves. There is no canvas.
 */
export class Field {
    readonly el: HTMLDivElement;
    private readonly paper: HTMLDivElement;
    private readonly world: HTMLDivElement;
    private readonly ink: SVGSVGElement;
    /** The layers other than the world, by depth, and "fixed" for the view's own. */
    private readonly layers = new Map<string, HTMLDivElement>();
    /** Pixels to a square at a zoom of one. */
    sq = 24;
    readonly stats = { drawings: 0, drawMs: 0, sprites: 0, moving: 0, frameMs: 0 };
    private readonly o: FieldOptions;
    private readonly looks = new Map<string, Look>();
    private readonly placed = new Map<string, Placed>();
    /** The look each live sprite has now, by the sprite's key. */
    private readonly lived = new Map<string, string>();
    private readonly motes: Motes;
    private shaken = { a: 0, t: 0 };
    private marked = "";
    private cam = { x: 0, y: 0, zoom: 1 };
    private view = { w: 36, h: 20 };
    private size = { w: 0, h: 0 };
    /** Whether the view was grown to the room, in which case the camera is kept inside the world. */
    private grown = false;

    constructor(o: FieldOptions) {
        this.o = o;
        this.el = document.createElement("div");
        this.el.className = "field";
        this.paper = document.createElement("div");
        this.paper.className = "field-paper squared";
        this.world = document.createElement("div");
        this.world.className = "world";
        this.ink = el("svg", { class: "ink", "aria-hidden": "true" });
        this.world.appendChild(this.ink);
        this.el.append(this.paper, this.world);
        o.host.appendChild(this.el);
        this.motes = new Motes(
            this.world,
            () => this.ink,
            (pick) => this.lookOf({ ...pick, seed: 3, size: 1 }),
        );
    }

    /** Sizes the field to the room it has: whole pixels to a square, and the view's squares across. */
    fit(
        view: { w: number; h: number },
        world: { w: number; h: number },
        room: { w: number; h: number },
        grow = false,
    ): void {
        // Never wider than the room, so a phone held upright never scrolls sideways to see a field.
        const sq = Math.max(
            6,
            Math.min(40, Math.floor(Math.min(room.w / view.w, room.h / view.h))),
        );
        // A field drawn full-bleed shows as much more of its world round the game's view as the room has.
        const shown = grow
            ? {
                  w: Math.max(view.w, Math.min(world.w, room.w / sq)),
                  h: Math.max(view.h, Math.min(world.h, room.h / sq)),
              }
            : view;
        const changed =
            sq !== this.sq ||
            shown.w !== this.view.w ||
            shown.h !== this.view.h ||
            world.w !== this.size.w ||
            world.h !== this.size.h;
        this.view = { ...shown };
        this.grown = grow;
        if (!changed && this.el.style.width) return;
        this.sq = sq;
        this.size = { ...world };
        this.el.style.width = `${shown.w * sq}px`;
        this.el.style.height = `${shown.h * sq}px`;
        this.el.style.setProperty("--sq", `${sq}px`);
        for (const d of [this.paper, this.world]) {
            d.style.width = `${world.w * sq}px`;
            d.style.height = `${world.h * sq}px`;
        }
        this.ink.setAttribute("viewBox", `0 0 ${world.w} ${world.h}`);
        this.ink.setAttribute("width", String(world.w * sq));
        this.ink.setAttribute("height", String(world.h * sq));
        // A new square size is a new drawing size, so every look is drawn again at it.
        this.clear();
    }

    /** Forget every sprite, mote and look, for a new game or a new square size. */
    clear(): void {
        for (const p of this.placed.values()) p.el.remove();
        for (const l of this.layers.values()) l.remove();
        this.layers.clear();
        this.placed.clear();
        this.looks.clear();
        this.lived.clear();
        this.motes.clear();
        this.marked = "";
        this.ink.replaceChildren();
    }

    private lookOf(s: {
        key?: string;
        live?: boolean;
        art: string;
        params?: Record<string, unknown>;
        seed?: number;
        crop?: Sprite["crop"];
        size?: number;
    }): { key: string; look: Look } | null {
        const key = `${s.art}|${JSON.stringify(s.params ?? null)}|${s.seed ?? 0}|${s.crop ? `${s.crop.x},${s.crop.y},${s.crop.w},${s.crop.h}` : ""}|${s.size ?? ""}`;
        const had = this.looks.get(key);
        if (had) return { key, look: had };
        // A live sprite keeps only the look it has now, so a needle swinging through a hundred readings
        // leaves one behind, not a hundred.
        if (s.live && s.key) {
            const was = this.lived.get(s.key);
            if (was) this.looks.delete(was);
            this.lived.set(s.key, key);
        }
        const v = this.o.art.get(s.art);
        if (!v) return null;
        const t0 = performance.now();
        const r = render<unknown>(v, s.params ?? v.params, {
            seed: s.seed ?? 4127,
            host: this.world,
        });
        const box = s.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
        const across = s.size ?? box.w;
        const w = across * this.sq,
            h = ((across * box.h) / box.w) * this.sq;
        r.svg.setAttribute("viewBox", `${box.x * U} ${box.y * U} ${box.w * U} ${box.h * U}`);
        r.svg.setAttribute("width", String(w));
        r.svg.setAttribute("height", String(h));
        r.svg.setAttribute("aria-hidden", "true");
        // The page's rule for drawings sizes them from their whole box and lets them overflow it, which
        // is right for a car whose arrow reaches past it and wrong for a bead cut out of a string.
        Object.assign(r.svg.style, {
            width: `${w}px`,
            height: `${h}px`,
            maxWidth: "none",
            overflow: s.crop ? "hidden" : "visible",
        });
        const look = { svg: r.svg, w, h };
        this.looks.set(key, look);
        this.stats.drawings++;
        this.stats.drawMs += performance.now() - t0;
        return { key, look };
    }

    /** The layer a depth draws on, made the first time it is asked for, kept in order: paper, far, world, near, fixed. */
    private layer(key: string): HTMLDivElement {
        if (key === "1") return this.world;
        const had = this.layers.get(key);
        if (had) return had;
        const d = document.createElement("div");
        d.className = key === "fixed" ? "layer fixed" : "layer";
        this.layers.set(key, d);
        const depth = (k: string) => (k === "fixed" ? Infinity : Number(k));
        const order = [...this.layers.keys()].sort((a, b) => depth(a) - depth(b));
        this.el.append(
            this.paper,
            ...order.filter((k) => depth(k) < 1).map((k) => this.layers.get(k) ?? d),
            this.world,
            ...order.filter((k) => depth(k) > 1).map((k) => this.layers.get(k) ?? d),
        );
        return d;
    }

    /** Draws a frame. `dt` is the frame's length in seconds, for the bursts and the shake. */
    draw(f: Frame, dt: number): void {
        const t0 = performance.now();
        const still = this.o.still();
        const seen = new Set<string>();
        let moving = 0;
        for (const s of f.sprites) {
            seen.add(s.key);
            const found = this.lookOf(s);
            if (!found) continue;
            const layer = s.fixed ? "fixed" : String(s.depth ?? 1);
            let p = this.placed.get(s.key);
            if (!p || p.look !== found.key || p.layer !== layer) {
                p?.el.remove();
                const d = document.createElement("div");
                d.className = s.still ? "sprite" : "sprite moves";
                d.dataset.key = s.key;
                d.appendChild(found.look.svg.cloneNode(true));
                d.style.width = `${found.look.w}px`;
                d.style.height = `${found.look.h}px`;
                const host = this.layer(layer);
                if (host === this.world) host.insertBefore(d, this.ink);
                else host.appendChild(d);
                p = {
                    el: d,
                    look: found.key,
                    layer,
                    transform: "",
                    w: found.look.w,
                    h: found.look.h,
                    moves: !s.still,
                    z: Number.NaN,
                    faint: false,
                    alpha: 1,
                };
                this.placed.set(s.key, p);
            }
            const x = s.x * this.sq - p.w / 2,
                y = s.y * this.sq - (s.stand ? p.h : p.h / 2);
            const q = still ? 0 : (s.squash ?? 0);
            // A squash keeps the drawing's base where it was, in the drawing's own turned frame.
            const squash =
                Math.abs(q) > 0.004
                    ? ` translateY(${((p.h * q) / 2).toFixed(1)}px) scale(${(1 + q).toFixed(3)}, ${(1 - q).toFixed(3)})`
                    : "";
            const grow =
                s.scale !== undefined && Math.abs(s.scale - 1) > 0.002
                    ? ` scale(${Math.max(0, s.scale).toFixed(3)})`
                    : "";
            const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)${s.angle ? ` rotate(${s.angle.toFixed(3)}rad)` : ""}${grow}${squash}${s.flip ? " scaleX(-1)" : ""}`;
            if (tf !== p.transform) {
                p.el.style.transform = tf;
                p.transform = tf;
            }
            if (p.z !== (s.z ?? 0)) {
                p.z = s.z ?? 0;
                p.el.style.zIndex = String(p.z);
            }
            if (p.faint !== (s.faint === true)) {
                p.faint = s.faint === true;
                p.el.classList.toggle("faint", p.faint);
            }
            const alpha = Math.max(0, Math.min(1, s.alpha ?? 1));
            if (Math.abs(alpha - p.alpha) > 0.01) {
                p.alpha = alpha;
                p.el.style.opacity = alpha >= 0.99 ? "" : alpha.toFixed(2);
            }
            if (p.moves) moving++;
        }
        for (const [k, p] of this.placed)
            if (!seen.has(k)) {
                p.el.remove();
                this.placed.delete(k);
            }
        this.stats.sprites = this.placed.size;
        this.stats.moving = moving;
        const key = JSON.stringify(f.marks);
        if (key !== this.marked) {
            this.marked = key;
            drawMarks(this.ink, f.marks);
        }
        this.motes.step(dt, still, this.sq);
        const zoom = f.camera.zoom ?? 1;
        // A grown view is kept inside the world, so the extra room shows more world and never blank paper.
        const keep = (at: number, half: number, size: number) =>
            this.grown && size >= 2 * half ? Math.max(half, Math.min(size - half, at)) : at;
        const camera = {
            x: keep(f.camera.x, this.view.w / 2 / zoom, this.size.w),
            y: keep(f.camera.y, this.view.h / 2 / zoom, this.size.h),
        };
        this.cam = { x: camera.x, y: camera.y, zoom };
        let sx = 0,
            sy = 0;
        if (this.shaken.a > 0.01 && !still) {
            this.shaken.t += dt;
            const k = this.shaken.a * Math.exp(-this.shaken.t * 9);
            sx = Math.sin(this.shaken.t * 53) * k * this.sq;
            sy = Math.cos(this.shaken.t * 41) * k * this.sq * 0.6;
            if (k < 0.01) this.shaken.a = 0;
        }
        // A layer's depth is the share of the camera's travel across that it moves by; up and down,
        // every layer moves with the world.
        const at = (depth: number) => {
            const tx = (this.view.w * this.sq) / 2 - camera.x * depth * this.sq * zoom + sx * depth;
            const ty = (this.view.h * this.sq) / 2 - camera.y * this.sq * zoom + sy;
            return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)${zoom !== 1 ? ` scale(${zoom.toFixed(4)})` : ""}`;
        };
        const world = at(1);
        this.world.style.transform = world;
        this.paper.style.transform = world;
        for (const [k, l] of this.layers) if (k !== "fixed") l.style.transform = at(Number(k));
        this.stats.frameMs = performance.now() - t0;
    }

    /** A little dust where something landed. Nothing under reduced motion. */
    puff(x: number, y: number, n: number): void {
        this.burst("dust", x, y, n);
    }

    /** A burst of small things thrown from a point round `dir`, straight up when left out. Nothing under reduced motion. */
    burst(kind: BurstKind, x: number, y: number, n: number, dir?: number): void {
        if (this.o.still()) return;
        this.motes.throw(kind, x, y, n, dir);
    }

    shake(amount: number): void {
        if (this.o.still()) return;
        this.shaken = { a: Math.max(this.shaken.a, amount), t: 0 };
    }

    /** A point on the page as a place in the world, in squares, through the camera the last frame used. */
    toWorld(clientX: number, clientY: number): { x: number; y: number } {
        const r = this.el.getBoundingClientRect();
        const k = this.sq * this.cam.zoom;
        return {
            x: this.cam.x + (clientX - r.left - (this.view.w * this.sq) / 2) / k,
            y: this.cam.y + (clientY - r.top - (this.view.h * this.sq) / 2) / k,
        };
    }

    /** Pixels on screen for one square of the world right now, for the forty four pixel floor. */
    get px(): number {
        return this.sq * this.cam.zoom;
    }
}
