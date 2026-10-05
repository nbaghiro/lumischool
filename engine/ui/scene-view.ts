// A turn game's board drawn by the GPU: the scene's keyed parts as sprites through the game view, the
// springs, sways and beats stepped here, the marks as the view's ink, and each part's caption
// in the page over the canvas. It is the surface the hands controller works, so every binding plays on
// it unchanged. See .docs/game-engine.md, "Turn games".
import type { Anchors } from "../ink/surface";
import { atRest, poseAt, type Beat, type Voicing } from "../motion/beat";
import type { Cue } from "../motion/cues";
import type { Pt, Rect } from "../motion/geometry";
import { Recogniser, type Sample } from "../motion/gesture";
import { ticker, type Ticker } from "../motion/loop";
import type { BurstKind, Mark, Part, Scene, ShowOptions, Sprite } from "../motion/scene";
import { SPRINGS, settled, springAt, type Spring } from "../motion/spring";
import { HANGING, sway, type Sway, type Swing } from "../motion/sway";
import type { Drawing } from "../parts/drawing";
import { lookKey } from "./game-atlas";
import type { Board, PointerHooks } from "./game-host";
import { BURSTS, type FieldView } from "./game-view";
import { render } from "./svg";

export interface SceneViewOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    /** Whether motion is off, asked every time: prefers-reduced-motion, or a page's own switch. */
    still(): boolean;
    /** What draws the frames: the game view with its ink at `INK`, or the still view without WebGL2. */
    view: FieldView & { preload?(sprites: readonly Sprite[]): void; stop?(): void };
    /** Called once per frame while anything is moving, after the parts have been drawn. */
    onFrame?(t: number, dt: number): void;
    now?: () => number;
    schedule?: (f: (nowMs: number) => void) => void;
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
    art: string;
    /** The settings the part is drawn with right now, which differ from the scene's during a morph. */
    params: Record<string, unknown>;
    label: string;
    marks: NonNullable<Part["marks"]>;
    size: number;
    box: { w: number; h: number };
    x: number;
    y: number;
    z: number;
    glide: Glide | null;
    morph: Morph | null;
    lifted: boolean;
    /** Its place in the order things were picked up, so the last one lifted is on top. */
    raised: number;
    angle: number;
    squash: number;
    scale: number;
    pivot: Pt | null;
    hold: Pt | null;
    crop: Part["crop"] | null;
    sway: Sway;
    hand: { x: number; vx: number } | null;
    upright: { from: number; v0: number; t0: number } | null;
    tags: Set<string>;
}

const SEED = 4127;
/** Room under a labelled part for its caption, in squares. */
const LABEL = 1.2;
/** How a carried thing hangs from the hand. */
const CARRY: Swing = { length: 2.4, g: 60, damping: 3.2, most: 0.42 };
/** The pen's depth: parts are under its marks, and a lifted part over them. */
export const INK = 150;
/** A lifted part is drawn this much bigger, about a point this far down it. */
const LIFTED = { k: 1.08, oy: 0.6 };
const GHOST = 0.42;
/** The longest a burst's motes fly, in seconds, so the board keeps drawing until they land. */
const MOTES = Math.max(...Object.values(BURSTS).map((b) => b.life)) + 0.2;
/** The win's star: the shelf's star sticker, cut out. */
const STAR = {
    art: "stickers",
    params: { kinds: ["star"], word: "" },
    crop: { x: 0.4, y: 1.2, w: 3.6, h: 3.6 },
    size: 1.8,
};

const numeric = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const differs = (a: Record<string, unknown>, b: Record<string, unknown>): boolean =>
    Object.keys(b).some((k) =>
        typeof b[k] === "object" && b[k] !== null
            ? JSON.stringify(a[k]) !== JSON.stringify(b[k])
            : a[k] !== b[k],
    );

const shapeOf = (p: Record<string, unknown>): string =>
    JSON.stringify(Object.fromEntries(Object.entries(p).filter(([, v]) => !numeric(v))));

export class SceneView implements Board {
    private readonly o: SceneViewOptions;
    private readonly view: SceneViewOptions["view"];
    private readonly held = new Map<string, Held>();
    private readonly layers = new Map<string, Mark[]>();
    private readonly labels: HTMLDivElement;
    private readonly captions = new Map<string, HTMLSpanElement>();
    private readonly anchorsOf = new Map<string, Anchors>();
    private readonly tick: Ticker;
    private size = { w: 0, h: 0 };
    private fitted = "";
    private rec: Recogniser | null = null;
    private hooks: PointerHooks | null = null;
    private grabbed: string | null = null;
    private order = 0;
    private more = false;
    private star: { at: Pt; scale: number } | null = null;
    private motesUntil = -1;
    private playing: {
        beat: Beat;
        scene: Scene;
        t0: number;
        done: number;
        hear: (c: Cue, how?: Voicing) => void;
        marked: string;
        /** The parts whose settings the beat moves, drawn from the stepped looks while it plays. */
        moving: Set<string>;
    } | null = null;

    constructor(o: SceneViewOptions) {
        this.o = o;
        this.view = o.view;
        this.view.el.classList.add("scene");
        this.labels = document.createElement("div");
        this.labels.className = "scene-labels";
        this.view.el.appendChild(this.labels);
        this.tick = ticker({
            now: o.now ?? (() => performance.now()),
            schedule: o.schedule ?? ((f) => requestAnimationFrame(f)),
            onFrame: (t, dt) => this.frame(t, dt),
        });
        this.view.el.addEventListener("pointermove", this.hover);
    }

    /** The element that takes the board's focus: the view's own. */
    get sheet(): HTMLElement {
        return this.view.el;
    }

    get time(): number {
        return this.tick.now();
    }

    /** Pixels to a square, as the page set it on the board. */
    get sq(): number {
        const v = parseFloat(getComputedStyle(this.o.host).getPropertyValue("--sq"));
        return Number.isFinite(v) && v > 0 ? v : 20;
    }

    get room(): number {
        return this.o.host.clientWidth || 0;
    }

    get bounds(): { w: number; h: number } {
        return this.size;
    }

    get stats(): { renders: number; ms: number } {
        return { renders: this.view.stats.drawings, ms: this.view.stats.drawMs };
    }

    /** A client point in sheet squares, the same units every part's place is in. */
    toSquares(clientX: number, clientY: number): Pt {
        // the view's camera stands on the sheet's middle, so its world is the sheet's squares wherever the sheet sits in the room
        return this.view.toWorld(clientX, clientY);
    }

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
            } else this.update(h, part, at, o, still);
            h.pivot = part.pivot ?? null;
            h.hold = part.hold ?? null;
            if (!h.lifted && !h.upright) {
                h.angle = part.angle ?? 0;
                h.squash = part.squash ?? 0;
                h.scale = part.scale ?? 1;
            }
            if (!part.at) flow.push(h);
            h.z = part.z ?? 10 + i;
        });
        if (!o.keep) {
            const gone = [...this.held.values()].filter((h) => !seen.has(h.key));
            for (const h of gone) this.drop(h.key);
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
        this.wake();
    }

    loaded(art: string): void {
        for (const h of this.held.values()) if (h.art === art) this.draw(h, h.params);
        this.wake();
    }

    clear(): void {
        this.held.clear();
        this.layers.clear();
        for (const c of this.captions.values()) c.remove();
        this.captions.clear();
        this.star = null;
        this.playing = null;
        this.motesUntil = -1;
        this.fitted = "";
        this.view.clear();
    }

    /** Frees the GPU's context, for a player that is closing. */
    stop(): void {
        this.tick.stop();
        this.view.el.removeEventListener("pointermove", this.hover);
        this.clear();
        this.labels.remove();
        if (this.view.stop) this.view.stop();
        else this.view.el.remove();
    }

    /** Resolves once the board as it stands is drawn with every look in its pages. */
    ready(): Promise<void> {
        this.paint(0);
        return this.view.ready?.() ?? Promise.resolve();
    }

    private make(key: string, part: Part, at: Pt): Held {
        const h: Held = {
            key,
            art: part.art,
            params: { ...part.params },
            label: part.label ?? "",
            marks: part.marks ?? [],
            size: part.size ?? 0,
            box: { w: 1, h: 1 },
            x: at.x,
            y: at.y,
            z: 0,
            glide: null,
            morph: null,
            lifted: false,
            raised: 0,
            angle: 0,
            squash: 0,
            scale: 1,
            pivot: part.pivot ?? null,
            hold: part.hold ?? null,
            crop: part.crop ?? null,
            sway: HANGING,
            hand: null,
            upright: null,
            tags: new Set(),
        };
        this.held.set(key, h);
        this.draw(h, part.params);
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
            // a change that is not morphed switches at once and cancels a morph under way, so the
            // drawing is never at a value nobody asked for
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

    /** Takes a part's settings and measures its box, which its drawing says without being drawn. */
    private draw(h: Held, params: Record<string, unknown>): void {
        h.params = { ...params };
        const drawing = this.o.art.get(h.art);
        if (!drawing) {
            h.box = { w: 1, h: 1 };
            return;
        }
        const b = drawing.box(h.params);
        const c = h.crop ?? { x: 0, y: 0, w: b.w, h: b.h };
        const k = h.size ? h.size / c.w : 1;
        h.box = { w: c.w * k, h: c.h * k };
    }

    private resize(scene: Scene): void {
        let w = scene.size?.w ?? 0,
            h = scene.size?.h ?? 0;
        for (const held of this.held.values()) {
            w = Math.max(w, this.goalX(held) + held.box.w);
            h = Math.max(h, this.goalY(held) + this.tall(held));
        }
        this.size = { w, h };
        this.view.el.style.setProperty("--w", String(w));
        this.view.el.style.setProperty("--h", String(h));
        this.fit();
    }

    /**
     * Sizes the view to the room the board has, at the page's square, with the sheet in its middle: the
     * paper fills the room as it does under an action game, and the page still measures the board it will see.
     */
    private fit(): void {
        const sq = this.sq,
            view = { w: this.size.w + 2, h: this.size.h + 2 };
        const room = {
            w: Math.max(view.w * sq, this.o.host.clientWidth),
            h: Math.max(view.h * sq, this.o.host.clientHeight),
        };
        const fit = `${sq} ${view.w} ${view.h} ${room.w} ${room.h}`;
        if (fit === this.fitted) return;
        this.fitted = fit;
        this.view.fit(view, view, room, "above", sq);
    }

    /** Pixels from the view's top left to the sheet's, the margin the room leaves round the sheet. */
    private sheetOffset(sq: number): Pt {
        const el = this.view.el;
        return {
            x: (el.offsetWidth - (this.size.w + 2) * sq) / 2,
            y: (el.offsetHeight - (this.size.h + 2) * sq) / 2,
        };
    }

    private moveTo(h: Held, x: number, y: number): void {
        h.x = x;
        h.y = y;
        h.glide = null;
    }

    place(key: string, p: Pt): void {
        const h = this.held.get(key);
        if (!h) return;
        this.moveTo(h, p.x, p.y);
        this.wake();
    }

    glide(key: string, to: Pt, spring: Spring = SPRINGS.snap, v0?: Pt): void {
        const h = this.held.get(key);
        if (!h) return;
        if (this.o.still()) {
            this.moveTo(h, to.x, to.y);
            this.wake();
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
        this.wake();
    }

    follow(key: string, to: Pt): void {
        const h = this.held.get(key);
        if (!h || h.lifted) return;
        if (h.glide) {
            if (h.glide.toX !== to.x || h.glide.toY !== to.y) this.glide(key, to, h.glide.spring);
        } else if (h.x !== to.x || h.y !== to.y) {
            this.moveTo(h, to.x, to.y);
            this.wake();
        }
    }

    private velocity(h: Held): { vx: number; vy: number } {
        if (!h.glide) return { vx: 0, vy: 0 };
        const t = this.time - h.glide.t0;
        return {
            vx: springAt(h.glide.spring, h.glide.fromX, h.glide.toX, h.glide.vx, t).v,
            vy: springAt(h.glide.spring, h.glide.fromY, h.glide.toY, h.glide.vy, t).v,
        };
    }

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
        if (on) {
            h.raised = ++this.order;
            h.sway = HANGING;
            h.hand = null;
            h.upright = null;
        } else if (h.hold && h.angle !== 0) {
            // it turns about its pivot from here on rather than about the hand, so it is moved by what
            // that change would shift it, and the drawing stays exactly where the hand left it
            const was = h.hold,
                now = h.pivot ?? { x: h.box.w / 2, y: h.box.h / 2 };
            const c = Math.cos(h.angle),
                s = Math.sin(h.angle),
                dx = was.x - now.x,
                dy = was.y - now.y;
            this.moveTo(h, h.x + dx - (c * dx - s * dy), h.y + dy - (s * dx + c * dy));
            h.upright = { from: h.angle, v0: h.sway.spin, t0: this.time };
        }
        this.wake();
    }

    turned(key: string): number {
        return this.held.get(key)?.angle ?? 0;
    }

    /** Where a part turns: the hand while it is carried and hangs from one, its pivot otherwise, its middle when it has neither. */
    private origin(h: Held): Pt {
        return h.lifted && h.hold ? h.hold : (h.pivot ?? { x: h.box.w / 2, y: h.box.h / 2 });
    }

    private carry(h: Held, dt: number): void {
        if (dt <= 0) return;
        const was = h.hand ?? { x: h.x, vx: 0 };
        const vx = was.vx + ((h.x - was.x) / dt - was.vx) * Math.min(1, dt * 18);
        h.hand = { x: h.x, vx };
        h.sway = sway(h.sway, (vx - was.vx) / dt, dt, CARRY);
        h.angle = h.sway.angle;
        h.squash = 0;
        h.scale = 1;
    }

    get busy(): boolean {
        return this.playing !== null;
    }

    play(beat: Beat, scene: Scene, hear: (c: Cue, how?: Voicing) => void): void {
        this.settle();
        const b = this.o.still() ? atRest(beat) : beat;
        if (b.length <= 0) {
            for (const c of b.cues) hear(c.cue, c.how);
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
        const moving = new Set(
            b.tracks.filter((tr) => tr.ch.startsWith("param:")).map((tr) => tr.key),
        );
        this.playing = { beat: b, scene, t0: this.time, done: -1, hear, marked: "", moving };
        this.preload(b, scene, moving);
        this.applyBeat(0);
        this.wake();
    }

    /** Asks for every look the beat will show before it shows it, so a tumbling die has its faces. */
    private preload(b: Beat, scene: Scene, moving: Set<string>): void {
        if (!this.view.preload) return;
        const seen = new Set<string>();
        const out: Sprite[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++)
            for (const [key, pose] of poseAt(b, scene, (b.length * i) / steps)) {
                const h = this.held.get(key);
                if (!h) continue;
                const spec = {
                    key,
                    art: h.art,
                    params: pose.params,
                    seed: SEED,
                    crop: h.crop ?? undefined,
                    size: h.size || undefined,
                    marks: h.marks.length ? h.marks : undefined,
                    live: moving.has(key) || undefined,
                };
                const id = `${key}|${lookKey(spec)}`;
                if (seen.has(id)) continue;
                seen.add(id);
                out.push({ ...spec, x: 0, y: 0 });
            }
        this.view.preload(out);
    }

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
            if (pose.z !== null) h.z = pose.z;
            h.angle = pose.angle;
            h.squash = pose.squash;
            h.scale = pose.scale;
            if (differs(h.params, pose.params)) this.draw(h, pose.params);
        }
        for (const b of p.beat.bursts)
            if (b.at > p.done && b.at <= u) this.burst(b.kind, b.x, b.y, b.n, b.dir);
        for (const c of p.beat.cues) if (c.at > p.done && c.at <= u) p.hear(c.cue, c.how);
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

    private burst(kind: BurstKind, x: number, y: number, n: number, dir?: number): void {
        if (this.o.still()) return;
        this.view.burst(kind, x, y, n, dir);
        this.motesUntil = this.time + MOTES;
    }

    remove(key: string): void {
        this.drop(key);
        this.wake();
    }

    private drop(key: string): void {
        this.held.delete(key);
        this.captions.get(key)?.remove();
        this.captions.delete(key);
    }

    /** A class on a part, for its look: `grab` shows a hand over it, and a `ghost` is seen through. */
    tag(key: string, cls: string, on: boolean): void {
        const h = this.held.get(key);
        if (!h || h.tags.has(cls) === on) return;
        if (on) h.tags.add(cls);
        else h.tags.delete(cls);
        this.wake();
    }

    at(key: string): Pt | null {
        const h = this.held.get(key);
        return h ? { x: h.x, y: h.y } : null;
    }

    z(key: string): number {
        const h = this.held.get(key);
        return h ? this.depth(h) : 0;
    }

    private depth(h: Held): number {
        return h.lifted ? 200 + h.raised : h.z;
    }

    rect(key: string): Rect | null {
        const h = this.held.get(key);
        return h ? { x: h.x, y: h.y, w: h.box.w, h: h.box.h } : null;
    }

    /**
     * One of a part's own anchors, in sheet squares, as the part is drawn right now. The drawing is
     * drawn off the page once for each look to find them, as the atlas does when it draws the look.
     */
    anchor(key: string, name: string): Pt | null {
        const h = this.held.get(key);
        if (!h) return null;
        const a = this.anchorsFor(h)[name];
        return a ? { x: h.x + a.x, y: h.y + a.y } : null;
    }

    private anchorsFor(h: Held): Anchors {
        const drawing = this.o.art.get(h.art);
        if (!drawing) return {};
        const id = lookKey({
            art: h.art,
            params: h.params,
            crop: h.crop ?? undefined,
            size: h.size || undefined,
        });
        const had = this.anchorsOf.get(id);
        if (had) return had;
        const r = render<unknown>(drawing, h.params, { seed: SEED, host: this.view.el });
        const c = h.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
        const k = h.size ? h.size / c.w : 1;
        const anchors: Anchors = Object.fromEntries(
            Object.entries(r.anchors).map(([n, a]) => [
                n,
                { ...a, x: (a.x - c.x) * k, y: (a.y - c.y) * k },
            ]),
        );
        // a morph asks at every value on its way, so the list is kept short
        if (this.anchorsOf.size > 256) this.anchorsOf.clear();
        this.anchorsOf.set(id, anchors);
        return anchors;
    }

    live(): boolean {
        if (this.playing || this.time < this.motesUntil) return true;
        for (const h of this.held.values())
            if (h.glide || h.morph || h.upright || (h.lifted && h.hold)) return true;
        return this.rec?.active ?? false;
    }

    marks(layer: string, marks: Mark[]): void {
        const had = this.layers.get(layer);
        if (!had && !marks.length) return;
        this.layers.set(layer, marks);
        this.wake();
    }

    /** The win's star sticker, scaled by the page's timeline. A scale of nought takes it away. */
    sticker(at: Pt, scale: number): void {
        this.star = scale > 0 ? { at, scale } : null;
        this.wake();
    }

    wake(): void {
        this.more = true;
        this.tick.start();
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
                h.angle = done ? 0 : s.x;
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
                }
            }
        }
        if (this.playing) this.applyBeat(t - this.playing.t0);
        if (this.rec && this.hooks)
            for (const g of this.rec.poll(this.clock())) this.hooks.on(g, this.grabbed);
        this.more = false;
        this.o.onFrame?.(t, dt);
        const again = this.live() || this.more;
        // the last frame of a motion is drawn at rest, so every look is exact and the test copy is current
        this.paint(again ? dt : 0);
        return again;
    }

    /** One of a part's sprites: its box turned about its pivot, grown about its foot, and lifted about a point near its middle. */
    private spriteOf(h: Held): Sprite {
        const lifted = h.lifted;
        const k = lifted ? LIFTED.k : h.scale,
            oy = lifted ? LIFTED.oy * h.box.h : h.box.h;
        const o = this.origin(h),
            a = h.angle;
        const dx = h.box.w / 2 - o.x,
            dy = oy + (h.box.h / 2 - oy) * k - o.y;
        const c = Math.cos(a),
            s = Math.sin(a);
        return {
            key: h.key,
            art: h.art,
            params: h.params,
            seed: SEED,
            x: h.x + o.x + c * dx - s * dy,
            y: h.y + o.y + s * dx + c * dy,
            angle: a || undefined,
            z: this.depth(h),
            crop: h.crop ?? undefined,
            size: h.size || undefined,
            squash: lifted ? undefined : h.squash || undefined,
            scale: k === 1 ? undefined : k,
            alpha: h.tags.has("ghost") ? GHOST : undefined,
            live: !!h.morph || !!this.playing?.moving.has(h.key) || undefined,
            marks: h.marks.length ? h.marks : undefined,
        };
    }

    private paint(dt: number): void {
        this.fit();
        const sq = this.sq,
            { w, h } = this.size;
        const view = { w: w + 2, h: h + 2 };
        const sprites = [...this.held.values()].map((p) => this.spriteOf(p));
        if (this.star)
            sprites.push({
                key: "sticker",
                ...STAR,
                seed: 91,
                x: this.star.at.x,
                y: this.star.at.y - 1.3,
                scale: this.star.scale,
                z: 190,
            });
        this.view.draw(
            {
                sprites,
                marks: [...this.layers.values()].flat(),
                camera: { x: w / 2, y: h / 2 },
                view,
                world: view,
            },
            dt,
        );
        this.caption(sq);
        this.describe();
    }

    /** Each labelled part's caption under it, in the page, where a reader finds it. */
    private caption(sq: number): void {
        const o = this.sheetOffset(sq);
        for (const h of this.held.values()) {
            let c = this.captions.get(h.key);
            if (!h.label) {
                c?.remove();
                this.captions.delete(h.key);
                continue;
            }
            if (!c) {
                c = document.createElement("span");
                c.className = "label placed-label";
                this.labels.appendChild(c);
                this.captions.set(h.key, c);
            }
            if (c.textContent !== h.label) c.textContent = h.label;
            c.style.width = `${(h.box.w * sq).toFixed(1)}px`;
            c.style.transform = `translate(${((h.x + 1) * sq + o.x).toFixed(1)}px, ${((h.y + 1 + h.box.h) * sq + o.y).toFixed(1)}px)`;
        }
    }

    /** The test copy of each part says what its drawing says. */
    private describe(): void {
        for (const d of this.view.el.querySelectorAll<HTMLElement>(".field-probe > [data-key]")) {
            const h = this.held.get(d.dataset.key ?? "");
            const said = h ? (this.o.art.get(h.art)?.describe?.(h.params) ?? "") : "";
            if (d.textContent !== said) d.textContent = said;
        }
    }

    private clock(): number {
        return (this.o.now ?? (() => performance.now()))();
    }

    /** A hand over a part that can be picked up, and a closed one while it is held. */
    private readonly hover = (e: PointerEvent): void => {
        const el = this.view.el;
        if (this.rec?.active) {
            el.style.cursor = "grabbing";
            return;
        }
        const p = this.toSquares(e.clientX, e.clientY);
        let over = false;
        for (const h of this.held.values())
            if (
                h.tags.has("grab") &&
                p.x >= h.x &&
                p.x <= h.x + h.box.w &&
                p.y >= h.y &&
                p.y <= h.y + h.box.h
            )
                over = true;
        el.style.cursor = over ? "grab" : "";
    };

    pointer(hooks: PointerHooks): () => void {
        this.hooks = hooks;
        const rec = new Recogniser(hooks.feel);
        this.rec = rec;
        const el = this.view.el;
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
            el.setPointerCapture(e.pointerId);
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
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", cancel);
        return () => {
            el.removeEventListener("pointerdown", down);
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
            el.removeEventListener("pointercancel", cancel);
            this.rec = null;
            this.hooks = null;
        };
    }
}
