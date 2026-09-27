// An action game's world drawn by the GPU: the frame a game gives, as instanced sprites from texture pages, the marks as lines and discs, and bursts as sprites, over the
// paper's grid, in one canvas. The words a game writes stay in the page over the canvas, and with
// `probe=1` in the address a hidden copy of every sprite's box stays in the page for the tests that
// find sprites by key. See .docs/game-engine.md.
import { ageOf, burst, bursts, stepBursts, type Bursts, type Style } from "../motion/burst";
import { keepInside } from "../motion/camera";
import { HALO, lightsOf } from "../motion/lights";
import type { BurstKind, Frame, Mark, Pool, Sprite, Water } from "../motion/scene";
import { ripplesOf, WAVES } from "../motion/surface";
import type { Pt } from "../motion/geometry";
import type { TokenName, Tokens } from "../paper";
import type { Drawing } from "../parts/drawing";
import { GameAtlas, type LookSpec, type Placed } from "./game-atlas";
import {
    DOT,
    RIPPLES,
    SEGMENT,
    SPRITE,
    canvasGl,
    glDensity,
    type CanvasGl,
    type GlDraw,
    type GlTexture,
} from "./gl";
import { readTokens } from "./read-tokens";

/** One shelf drawing a burst throws, whole or cut out of a bigger drawing. */
export interface MoteLook {
    art: string;
    params?: Record<string, unknown>;
    crop?: { x: number; y: number; w: number; h: number };
}

type MoteStyle = Style & { looks: MoteLook[] };

/** How each kind of burst flies and which shelf drawing it throws. Looks are chosen round the list, so sparkles come in several colours. */
export const BURSTS: Record<BurstKind, MoteStyle> = {
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
export const BURST_STYLES = new Map<string, MoteStyle>(Object.entries(BURSTS));

/** What draws a game's frames: the GPU's view, or a turn game's still picture without WebGL2. */
export interface FieldView {
    readonly el: HTMLElement;
    sq: number;
    readonly stats: {
        drawings: number;
        drawMs: number;
        sprites: number;
        moving: number;
        frameMs: number;
        /** The atlas's pages of drawn looks, and the bytes they hold on the GPU. */
        pages: number;
        bytes: number;
    };
    fit(
        view: { w: number; h: number },
        world: { w: number; h: number },
        room: { w: number; h: number },
        seen: "side" | "above",
    ): void;
    clear(): void;
    draw(f: Frame, dt: number): void;
    puff(x: number, y: number, n: number): void;
    burst(kind: BurstKind, x: number, y: number, n: number, dir?: number): void;
    shake(amount: number): void;
    toWorld(clientX: number, clientY: number): { x: number; y: number };
    readonly px: number;
    /** True while the view cannot draw, as after the GPU lost its context; the game waits. */
    readonly halted?: boolean;
    /** Resolves once every look drawn so far is ready to show. */
    ready?(): Promise<void>;
}

interface Ink {
    colour: TokenName;
    width: number;
    dash: readonly number[];
    alpha: number;
    round: boolean;
}
/** The pen's styles for lines, in squares, which the still view draws with too. */
export const STROKES: Record<string, Ink> = {
    line: { colour: "ink", width: 0.1, dash: [], alpha: 1, round: true },
    aim: { colour: "pen", width: 0.125, dash: [0.35, 0.3], alpha: 1, round: true },
    crash: { colour: "berry", width: 0.15, dash: [0.25, 0.25], alpha: 1, round: false },
    rod: { colour: "ink", width: 0.17, dash: [], alpha: 1, round: true },
    thin: { colour: "ink-soft", width: 0.06, dash: [], alpha: 1, round: false },
    ring: { colour: "pen", width: 0.125, dash: [0.45, 0.35], alpha: 0.6, round: false },
    solid: { colour: "pen", width: 0.125, dash: [], alpha: 0.5, round: false },
    on: { colour: "pen", width: 0.175, dash: [], alpha: 1, round: false },
    puff: { colour: "ink-soft", width: 0.075, dash: [], alpha: 1, round: false },
};

/** A camera for a layer: the world's own, a far or near layer moved by its share, or the fixed one. */
interface Layer {
    order: number;
    camera: { x: number; y: number; z: number };
}

/** A growable list of floats, so a frame fills one buffer and makes no garbage. */
class Floats {
    data = new Float32Array(4096);
    n = 0;
    push(...xs: number[]): void {
        if (this.n + xs.length > this.data.length) {
            const bigger = new Float32Array(Math.max(this.data.length * 2, this.n + xs.length));
            bigger.set(this.data.subarray(0, this.n));
            this.data = bigger;
        }
        this.data.set(xs, this.n);
        this.n += xs.length;
    }
}

export interface GameViewOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    still(): boolean;
    /** Keeps a hidden copy of every sprite's box in the page, for the tests that find sprites by key. */
    probe?: boolean;
    /** The depth above which a world sprite is drawn over the pen's marks: 50 for an action game, 150 for a turn game. */
    inkAt?: number;
}

export class GameView implements FieldView {
    readonly el: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly words: HTMLDivElement;
    private readonly mirror: HTMLDivElement | null;
    private readonly gl: CanvasGl;
    private readonly atlas: GameAtlas;
    private readonly o: GameViewOptions;
    private tokens: Tokens | null = null;
    private readonly density = glDensity();
    sq = 24;
    readonly stats = {
        drawings: 0,
        drawMs: 0,
        sprites: 0,
        moving: 0,
        frameMs: 0,
        pages: 0,
        bytes: 0,
    };
    private cam = { x: 0, y: 0, zoom: 1 };
    private view = { w: 36, h: 20 };
    /** The view the game drew for, which the field shows whole inside `view`. */
    private authored = { w: 36, h: 20 };
    private seen: "side" | "above" = "side";
    private size = { w: 0, h: 0 };
    private shaken = { a: 0, t: 0 };
    private pool: Bursts = bursts(256, 7);
    private lost = false;
    private frames = 0;
    private rest = { at: "", since: 0 };
    private shown: Frame | null = null;
    private again = 0;
    private later: ReturnType<typeof setTimeout> | undefined;
    /** Each live sprite's settings as last given, and the frame they last changed on. */
    private readonly lively = new Map<string, { raw: string; since: number }>();
    /** True while drawing a frame that took no time, as reduced motion and a redraw do: it is drawn exactly. */
    private atRest = false;
    /** The last look each sprite was drawn with, so a sprite whose new look is still being drawn keeps its old one. */
    private readonly last = new Map<string, Placed>();
    private readonly spans: HTMLSpanElement[] = [];
    private readonly mirrored = new Map<string, HTMLDivElement>();
    private readonly sprites = new Floats();
    private readonly dots = new Floats();
    private readonly lights = new Floats();
    /** Every pool's drops in one frame, end to end, and how far they are filled and in which frame. */
    private drops = new Float32Array(0);
    private dropsAt = 0;
    private dropsFrame = -1;
    private readonly lines = new Map<string, Floats>();
    /** Seconds the view has drawn moving frames for, the clock of a frame that keeps none. */
    private clock = 0;

    constructor(o: GameViewOptions) {
        this.o = o;
        this.el = document.createElement("div");
        this.el.className = "field field-gl";
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("aria-hidden", "true");
        Object.assign(this.canvas.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            display: "block",
        });
        this.words = document.createElement("div");
        this.words.className = "field-words on-paper";
        this.el.append(this.canvas, this.words);
        this.mirror = o.probe ? document.createElement("div") : null;
        if (this.mirror) {
            this.mirror.className = "field-probe";
            this.mirror.setAttribute("aria-hidden", "true");
            this.el.append(this.mirror);
        }
        this.gl = canvasGl(this.canvas, () => {
            this.lost = false;
            this.atlas.rebuild();
            if (this.shown) this.draw(this.shown, 0);
        });
        this.gl.setDensity(this.density);
        this.canvas.addEventListener("webglcontextlost", () => {
            this.lost = true;
        });
        this.atlas = new GameAtlas({ gl: this.gl, art: o.art, host: this.el });
        o.host.appendChild(this.el);
    }

    get halted(): boolean {
        return this.lost;
    }

    /** Resolves once every look asked for so far is in a page. */
    ready(): Promise<void> {
        return this.atlas.ready();
    }

    fit(
        view: { w: number; h: number },
        world: { w: number; h: number },
        room: { w: number; h: number },
        seen: "side" | "above",
    ): void {
        // the square is the largest that shows the whole authored view, and the field then fills the room
        const sq = Math.max(6, Math.floor(Math.min(room.w / view.w, room.h / view.h)));
        const shown = { w: Math.max(view.w, room.w / sq), h: Math.max(view.h, room.h / sq) };
        this.view = { ...shown };
        this.authored = { ...view };
        this.seen = seen;
        this.sq = sq;
        this.size = { ...world };
        this.el.style.width = `${shown.w * sq}px`;
        this.el.style.height = `${shown.h * sq}px`;
        this.el.style.setProperty("--sq", `${sq}px`);
    }

    clear(): void {
        cancelAnimationFrame(this.again);
        clearTimeout(this.later);
        this.again = 0;
        this.shown = null;
        this.last.clear();
        this.lively.clear();
        this.pool = bursts(256, 7);
        for (const s of this.spans) s.remove();
        this.spans.length = 0;
        for (const m of this.mirrored.values()) m.remove();
        this.mirrored.clear();
    }

    /** Frees the GPU's context and every page, for a player that is closing. */
    stop(): void {
        this.clear();
        this.atlas.stop();
        this.gl.stop();
        this.el.remove();
    }

    /**
     * A live sprite's settings as they are drawn: while a number among them is still changing it is
     * rounded to one of `LIVE_STEPS` steps across the range its drawing allows, so a swinging needle
     * reuses the looks it has had; once it has held still for a few frames it is drawn exactly, so a
     * reading a child checks is the reading the game has.
     */
    private liveParams(s: Sprite): Record<string, unknown> | undefined {
        const params = s.params;
        if (!params) return params;
        const raw = JSON.stringify(params),
            was = this.lively.get(s.key);
        if (!was || was.raw !== raw) this.lively.set(s.key, { raw, since: this.frames });
        const since = this.lively.get(s.key)?.since ?? this.frames;
        if (this.atRest || this.frames - since >= LIVE_REST) return params;
        return this.stepParams(s.art, params);
    }

    /** A live sprite's settings rounded to the steps it is drawn at while they move. */
    private stepParams(art: string, params: Record<string, unknown>): Record<string, unknown> {
        const drawing = this.o.art.get(art);
        if (!drawing) return params;
        const table: object = drawing.settings;
        const out: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(params)) {
            const setting: unknown = name in table ? Reflect.get(table, name) : undefined;
            const range = rangeOf(setting);
            out[name] =
                range && typeof value === "number"
                    ? stepped(value, range.min, range.max, range.whole)
                    : value;
        }
        return out;
    }

    /** Asks for looks a scene is about to show, such as every face of a die before it tumbles, so none is late. */
    preload(sprites: readonly Sprite[]): void {
        const px = this.sq * this.cam.zoom * this.density;
        for (const s of sprites)
            this.atlas.get(
                {
                    art: s.art,
                    params: s.live && s.params ? this.stepParams(s.art, s.params) : s.params,
                    seed: s.seed,
                    crop: s.crop,
                    size: s.size,
                    marks: s.marks,
                },
                px,
                true,
                s.live ? s.key : undefined,
            );
    }

    private look(
        s: LookSpec & { key?: string; live?: boolean },
        px: number,
        sharpen: boolean,
    ): Placed | null {
        const params =
            s.live && s.key ? this.liveParams({ ...s, key: s.key, x: 0, y: 0 }) : s.params;
        const found = this.atlas.get(
            { art: s.art, params, seed: s.seed, crop: s.crop, size: s.size, marks: s.marks },
            px,
            sharpen,
            s.live && s.key ? s.key : undefined,
        );
        if (found && s.key) this.last.set(s.key, found);
        return found ?? (s.key ? (this.last.get(s.key) ?? null) : null);
    }

    draw(f: Frame, dt: number): void {
        const t0 = performance.now();
        this.frames++;
        this.atRest = dt === 0;
        this.atlas.tick();
        this.atlas.upload();
        if (!this.tokens && this.el.isConnected) this.tokens = readTokens(this.words);
        const tokens = this.tokens;
        const still = this.o.still();
        const zoom = f.camera.zoom ?? 1;
        // a world smaller than the field is centred in it, or stood on its foot when the scene is side-on
        const camera = keepInside(f.camera, this.view, this.size, zoom, this.seen === "side");
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
        const z = this.sq * zoom;
        // a look is drawn sharper only once the camera has rested, so a zoom draws nothing again on its way
        const at = `${camera.x.toFixed(2)},${camera.y.toFixed(2)},${zoom.toFixed(3)}`;
        if (at !== this.rest.at) this.rest = { at, since: t0 };
        const resting = t0 - this.rest.since > 200;
        const layerOf = (s: Sprite): Layer => {
            if (s.fixed)
                return {
                    order: Infinity,
                    camera: { x: this.view.w / 2, y: this.view.h / 2, z: this.sq },
                };
            const d = s.depth ?? 1;
            return {
                order: d,
                camera: { x: camera.x * d - (sx * d) / z, y: camera.y - sy / z, z },
            };
        };
        const world = { x: camera.x - sx / z, y: camera.y - sy / z, z };
        const ordered = f.sprites
            .map((s, i) => ({ s, i, layer: layerOf(s) }))
            .sort(
                (a, b) => a.layer.order - b.layer.order || (a.s.z ?? 0) - (b.s.z ?? 0) || a.i - b.i,
            );
        const draws: GlDraw[] = [];
        const buf = this.sprites;
        buf.n = 0;
        let batch: {
            texture: GlTexture;
            camera: Layer["camera"];
            order: number;
            start: number;
        } | null = null;
        const flush = (): void => {
            if (!batch) return;
            const count = buf.n / SPRITE - batch.start;
            if (count > 0)
                draws.push({
                    kind: "sprites",
                    texture: batch.texture,
                    instances: buf.data.subarray(batch.start * SPRITE),
                    count,
                    camera: batch.camera,
                });
            batch = null;
        };
        const put = (
            placed: Placed,
            layer: Layer,
            c: Pt,
            angle: number,
            hx: number,
            hy: number,
            alpha: number,
        ): void => {
            if (!batch || batch.texture !== placed.texture || batch.order !== layer.order) {
                flush();
                batch = {
                    texture: placed.texture,
                    camera: layer.camera,
                    order: layer.order,
                    start: buf.n / SPRITE,
                };
            }
            const cos = Math.cos(angle),
                sin = Math.sin(angle);
            // the shared layout in gl.ts: centre, the two half axes, crop, premultiplied colour, tone and mask
            buf.push(
                c.x,
                c.y,
                hx * cos,
                hx * sin,
                -hy * sin,
                hy * cos,
                placed.u,
                placed.v,
                placed.uw,
                placed.vh,
                alpha,
                alpha,
                alpha,
                alpha,
                0,
                1,
                1,
                1,
                0,
            );
        };
        let moving = 0,
            drawn = 0,
            inkedAt = -1;
        if (!still) this.clock += dt;
        // waves and flickers stand still under reduced motion, at the clock's start
        const time = still ? 0 : (f.time ?? this.clock);
        const waters = [
            ...(f.water ?? []).map((w) => ({ z: w.z ?? 3, w, pool: null })),
            ...(f.liquid ?? []).map((pool) => ({ z: pool.z ?? 3, w: null, pool })),
        ].sort((a, b) => a.z - b.z);
        const pour = (under: number): void => {
            while (waters.length && (waters[0]?.z ?? 3) < under) {
                const next = waters.shift();
                if (!next || !tokens) continue;
                flush();
                if (next.w) draws.push(this.water(next.w, tokens, time, still, world));
                if (next.pool) draws.push(this.drawn(next.pool, tokens, world));
            }
        };
        const motes = (): void => {
            // the bursts fly in the world, over its sprites and under the pen's marks
            if (still) this.pool.motes = [];
            else stepBursts(this.pool, dt);
            const layer: Layer = { order: 1, camera: world };
            for (const m of this.pool.motes) {
                const style = BURST_STYLES.get(m.kind);
                const pick = style
                    ? (style.looks[Math.floor(m.life * 997) % style.looks.length] ?? style.looks[0])
                    : undefined;
                if (!pick) continue;
                const placed = this.look({ ...pick, seed: 3, size: 1 }, z * this.density, true);
                if (!placed) continue;
                const u = ageOf(m),
                    k = Math.max(0.05, m.size * (1 + m.grow * u));
                put(
                    placed,
                    layer,
                    { x: m.x, y: m.y },
                    m.angle,
                    (placed.w / 2 + placed.pad) * k,
                    (placed.h / 2 + placed.pad) * k,
                    1 - u * u,
                );
            }
        };
        const place = (s: Sprite, layer: Layer): void => {
            const px = (s.fixed ? this.sq : z) * this.density;
            const placed = this.look(s, px, resting);
            if (!placed) return;
            const w = placed.w,
                h = placed.h;
            const q = still ? 0 : (s.squash ?? 0);
            const grow = s.scale !== undefined ? Math.max(0, s.scale) : 1;
            const a = s.angle ?? 0;
            // a squash keeps the base where it was, in the drawing's own turned frame
            const drop = (h * q * grow) / 2;
            // a fixed readout keeps its place as a share of the authored view, so one in a corner stays in the field's corner
            const at = s.fixed
                ? {
                      x: s.x * (this.view.w / this.authored.w),
                      y: s.y * (this.view.h / this.authored.h),
                  }
                : s;
            const c = {
                x: at.x - Math.sin(a) * drop,
                y: at.y - (s.stand ? h / 2 : 0) + Math.cos(a) * drop,
            };
            const alpha = Math.max(0, Math.min(1, s.alpha ?? 1)) * (s.faint ? 0.35 : 1);
            put(
                placed,
                layer,
                c,
                a,
                (w / 2 + placed.pad) * (1 + q) * grow * (s.flip ? -1 : 1),
                (h / 2 + placed.pad) * (1 - q) * grow,
                alpha,
            );
            drawn++;
            if (!s.still) moving++;
        };
        const shading = !!tokens && (!!f.lights?.length || f.sprites.some((s) => !!s.glow));
        // what glows under the pen's depth is drawn over the lights' wash, so its own halo does not tint it
        const lifted: { s: Sprite; layer: Layer }[] = [];
        const ink = (): void => {
            pour(Infinity);
            flush();
            if (shading && tokens) draws.push(this.shade(f, tokens, time, still, world));
            for (const l of lifted) place(l.s, l.layer);
            motes();
            flush();
            inkedAt = draws.length;
        };
        for (const { s, layer } of ordered) {
            // the pen's marks sit over the world's sprites up to the ink's depth
            if (
                inkedAt < 0 &&
                (layer.order > 1 || (layer.order === 1 && (s.z ?? 0) > (this.o.inkAt ?? 50)))
            )
                ink();
            if (layer.order === 1 && inkedAt < 0) pour(s.z ?? 0);
            if (shading && inkedAt < 0 && layer.order === 1 && s.glow) {
                lifted.push({ s, layer });
                continue;
            }
            place(s, layer);
        }
        if (inkedAt < 0) ink();
        flush();
        if (tokens) draws.splice(inkedAt, 0, ...this.ink(f.marks, tokens, world));
        this.gl.draw(
            { x: world.x, y: world.y, z },
            { w: this.view.w * this.sq, h: this.view.h * this.sq },
            {
                grid: tokens ? { colour: tokens.grid, layers: [{ step: 1, alpha: 1 }] } : undefined,
                draws,
            },
        );
        this.lettering(f.marks, world, z);
        this.shown = f;
        // a frame drawn while looks were still on their way is drawn again when they land, which a
        // game at rest under reduced motion would not otherwise do
        clearTimeout(this.later);
        if (!resting)
            this.later = setTimeout(() => {
                if (this.shown && !this.lost) this.draw(this.shown, 0);
            }, 220);
        if (this.atlas.busy && !this.again)
            this.again = requestAnimationFrame(() => {
                this.again = 0;
                if (this.shown && !this.lost) this.draw(this.shown, 0);
            });
        if (this.mirror && (dt === 0 || this.frames % 4 === 0)) {
            this.probe(ordered);
            // what a test checks the canvas by: how much it drew, where its camera is, and where the
            // grid's lines fall, in the page's pixels
            const cw = (this.view.w * this.sq) / 2,
                ch = (this.view.h * this.sq) / 2;
            this.el.dataset.drawn = String(drawn);
            this.el.dataset.camera = `${world.x.toFixed(3)},${world.y.toFixed(3)},${zoom.toFixed(3)}`;
            this.el.dataset.grid = `${(cw - world.x * z).toFixed(2)},${(ch - world.y * z).toFixed(2)},${z.toFixed(3)}`;
        }
        this.stats.sprites = drawn;
        this.stats.moving = moving;
        this.stats.drawings = this.atlas.stats.drawn;
        this.stats.drawMs = this.atlas.stats.drawMs;
        this.stats.pages = this.atlas.stats.pages;
        this.stats.bytes = this.atlas.stats.bytes;
        this.stats.frameMs = performance.now() - t0;
    }

    /** One water, as the GPU draws it: the palette's hue under the surface, deepening towards the pen. */
    private water(
        w: Water,
        tokens: Tokens,
        time: number,
        still: boolean,
        camera: { x: number; y: number; z: number },
    ): GlDraw {
        const ripples = still ? [] : ripplesOf(w);
        const floats = new Float32Array(ripples.length * RIPPLES);
        ripples.forEach((r, i) => floats.set([r.x, r.age, r.size], i * RIPPLES));
        const hue = tokens[w.hue ?? "sky"];
        return {
            kind: "water",
            x0: w.x,
            x1: w.x + w.w,
            level: w.level,
            bottom: w.bottom,
            waves: w.waves ?? WAVES,
            flow: w.flow ?? 0,
            time,
            ripples: floats,
            count: ripples.length,
            shallow: hue,
            deep: mixed(hue, tokens.pen, 0.35),
            edge: tokens.ink,
            light: tokens.card,
            camera,
        };
    }

    /** Drops of water as one body of water: each drop's field reaches twice its size, so neighbours run together. */
    private drawn(p: Pool, tokens: Tokens, camera: { x: number; y: number; z: number }): GlDraw {
        const n = Math.floor(p.drops.length / 2);
        // each pool keeps its own stretch of the buffer, since the frame is drawn after all are made
        if (this.dropsFrame !== this.frames) {
            this.dropsFrame = this.frames;
            this.dropsAt = 0;
        }
        if (this.drops.length < this.dropsAt + n * DOT)
            this.drops = new Float32Array(Math.max(1024, (this.dropsAt + n * DOT) * 2));
        const start = this.dropsAt;
        for (let i = 0; i < n; i++)
            this.drops.set(
                [p.drops[i * 2] ?? 0, p.drops[i * 2 + 1] ?? 0, p.r * 2.2, 0, 0, 0, 0],
                start + i * DOT,
            );
        this.dropsAt += n * DOT;
        const hue = tokens[p.hue ?? "sky"];
        return {
            kind: "liquid",
            drops: this.drops.subarray(start, start + n * DOT),
            count: n,
            fill: hue,
            edge: mixed(hue, tokens.pen, 0.6),
            camera,
        };
    }

    /** The frame's lights, washed over the world drawn so far. */
    private shade(
        f: Frame,
        tokens: Tokens,
        time: number,
        still: boolean,
        camera: { x: number; y: number; z: number },
    ): GlDraw {
        const lit = lightsOf(f, time, still);
        const buf = this.lights;
        buf.n = 0;
        for (const l of lit) {
            const [r, g, b] = rgb(tokens[l.hue]);
            buf.push(l.x, l.y, l.r, r * l.strength, g * l.strength, b * l.strength, l.strength);
        }
        return { kind: "shade", halo: HALO, lights: buf.data, count: lit.length, camera };
    }

    /** The pen's marks as lines and discs, in the world, each style one draw. */
    private ink(
        marks: Mark[],
        tokens: Tokens,
        camera: { x: number; y: number; z: number },
    ): GlDraw[] {
        for (const f of this.lines.values()) f.n = 0;
        this.dots.n = 0;
        const order: string[] = [];
        const styles = new Map<string, Ink>();
        const run = (key: string, ink: Ink): Floats => {
            let f = this.lines.get(key);
            if (!f) {
                f = new Floats();
                this.lines.set(key, f);
            }
            if (!styles.has(key)) {
                styles.set(key, ink);
                order.push(key);
            }
            return f;
        };
        // a stroke rounds its joins only when opaque, where rounds that overlap cannot show, and its
        // open ends only when its style's cap is round
        const path = (pts: Pt[], key: string, ink: Ink): void => {
            const f = run(key, ink);
            const first = pts[0],
                last = pts[pts.length - 1],
                closed = !!first && !!last && Math.hypot(last.x - first.x, last.y - first.y) < 1e-6,
                joins = ink.alpha === 1,
                open = closed ? joins : ink.round;
            let along = 0;
            for (let i = 0; i + 1 < pts.length; i++) {
                const a = pts[i],
                    b = pts[i + 1];
                if (!a || !b) continue;
                const l = Math.hypot(b.x - a.x, b.y - a.y);
                if (!l) continue;
                const ends =
                    ((i === 0 ? open : joins) ? 1 : 0) +
                    ((i + 2 === pts.length ? open : joins) ? 2 : 0);
                f.push(a.x, a.y, b.x, b.y, along, ends);
                along += l;
            }
        };
        const disc = (x: number, y: number, r: number, colour: string, alpha: number): void => {
            const [cr, cg, cb] = rgb(colour);
            this.dots.push(x, y, r, cr * alpha, cg * alpha, cb * alpha, alpha);
        };
        const circle = (x: number, y: number, r: number): Pt[] =>
            Array.from({ length: 49 }, (_, i) => ({
                x: x + Math.cos((i / 48) * Math.PI * 2) * r,
                y: y + Math.sin((i / 48) * Math.PI * 2) * r,
            }));
        const curve = (a: Pt, b: Pt, bend: number | undefined): Pt[] => {
            if (!bend) return [a, b];
            const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - bend * 2 };
            return Array.from({ length: 17 }, (_, i) => {
                const t = i / 16,
                    u = 1 - t;
                return {
                    x: u * u * a.x + 2 * u * t * m.x + t * t * b.x,
                    y: u * u * a.y + 2 * u * t * m.y + t * t * b.y,
                };
            });
        };
        const colour = (name: TokenName) => tokens[name];
        for (const m of marks) {
            if (m.kind === "dots") {
                for (const p of m.pts)
                    disc(p.x, p.y, 0.13, colour("pen"), m.faint ? 0.3 : (m.opacity ?? 1));
            } else if (m.kind === "line" && m.style === "stream") {
                const w = 0.14 + 0.32 * Math.max(0, Math.min(1, m.weight ?? 1));
                const pts = curve(m.a, m.b, m.bend);
                path(pts, `stream-edge:${w}`, {
                    colour: "ink-soft",
                    width: w + 0.09,
                    dash: [],
                    alpha: 1,
                    round: true,
                });
                path(pts, `stream:${w}`, {
                    colour: "sky",
                    width: w,
                    dash: [],
                    alpha: 1,
                    round: true,
                });
            } else if (m.kind === "line") {
                const name = m.style && m.style !== "ink" ? m.style : "line";
                const ink = STROKES[name] ?? STROKES.line;
                if (!ink) continue;
                path(curve(m.a, m.b, m.bend), name, ink);
                const len = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y);
                if (m.head && len > 0.2) {
                    const a = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x),
                        k = Math.min(0.55, len * 0.4);
                    const wing = (s: number): Pt => ({
                        x: m.b.x + k * Math.cos(a + Math.PI + s * 0.5),
                        y: m.b.y + k * Math.sin(a + Math.PI + s * 0.5),
                    });
                    path([wing(-1), m.b, wing(1)], `${name}:head`, { ...ink, dash: [] });
                }
            } else if (m.kind === "ring" || m.kind === "box") {
                const name = m.on ? "on" : m.kind === "ring" && m.solid ? "solid" : "ring";
                const ink = STROKES[name];
                if (!ink) continue;
                if (m.kind === "ring") {
                    if (m.on) disc(m.x, m.y, m.r, colour("glow"), 0.28);
                    path(circle(m.x, m.y, m.r), name, ink);
                } else {
                    const r = Math.min(0.3, m.w / 2, m.h / 2);
                    // from the top edge's left end, where an SVG rect starts its dashes
                    const pts: Pt[] = [{ x: m.x + r, y: m.y }];
                    const corner = (cx: number, cy: number, from: number) => {
                        for (let i = 0; i <= 6; i++) {
                            const t = from + (i / 6) * (Math.PI / 2);
                            pts.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
                        }
                    };
                    corner(m.x + m.w - r, m.y + r, -Math.PI / 2);
                    corner(m.x + m.w - r, m.y + m.h - r, 0);
                    corner(m.x + r, m.y + m.h - r, Math.PI / 2);
                    corner(m.x + r, m.y + r, Math.PI);
                    if (m.on) {
                        // the wash is a capsule as wide as the box is tall, which its rounded corners hide
                        const hh = Math.min(m.w, m.h) / 2;
                        const wash = run(`wash:${hh}`, {
                            colour: "glow",
                            width: hh * 2,
                            dash: [],
                            alpha: 0.28,
                            round: true,
                        });
                        const wide = m.w >= m.h;
                        wash.push(
                            wide ? m.x + hh : m.x + m.w / 2,
                            wide ? m.y + hh : m.y + hh,
                            wide ? m.x + m.w - hh : m.x + m.w / 2,
                            wide ? m.y + hh : m.y + m.h - hh,
                            0,
                            3,
                        );
                    }
                    path(pts, name, ink);
                }
            } else if (m.kind === "puff") {
                disc(m.x, m.y, m.r, colour("card"), 1);
                const ink = STROKES.puff;
                if (ink) path(circle(m.x, m.y, m.r), "puff", ink);
            }
        }
        const out: GlDraw[] = [];
        if (this.dots.n)
            out.push({ kind: "dots", discs: this.dots.data, count: this.dots.n / DOT, camera });
        for (const key of order) {
            const ink = styles.get(key),
                f = this.lines.get(key);
            if (!ink || !f || !f.n) continue;
            out.push({
                kind: "lines",
                segments: f.data,
                count: f.n / SEGMENT,
                colour: colour(ink.colour),
                width: ink.width,
                dash: ink.dash,
                round: ink.round,
                alpha: ink.alpha,
                camera,
            });
        }
        return out;
    }

    /** The words a game writes, in the page over the canvas, in the hand's font where a screen reader finds them. */
    private lettering(marks: Mark[], camera: { x: number; y: number }, z: number): void {
        let i = 0;
        const cw = (this.view.w * this.sq) / 2,
            ch = (this.view.h * this.sq) / 2;
        for (const m of marks) {
            if (m.kind !== "word") continue;
            let span = this.spans[i];
            if (!span) {
                span = document.createElement("span");
                this.words.appendChild(span);
                this.spans[i] = span;
            }
            if (span.textContent !== m.text) span.textContent = m.text;
            const x = cw + (m.x - camera.x) * z,
                y = ch + (m.y - camera.y) * z;
            const size = (m.size ?? 0.8) * z;
            span.style.fontSize = `${size.toFixed(1)}px`;
            span.style.setProperty("-webkit-text-stroke-width", `${(0.12 * z).toFixed(1)}px`);
            span.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -80%)`;
            span.hidden = false;
            i++;
        }
        for (let k = i; k < this.spans.length; k++) {
            const s = this.spans[k];
            if (s && !s.hidden) s.hidden = true;
        }
    }

    /** Keeps a hidden copy of each sprite's box, by its key, where the tests look for it. */
    private probe(ordered: { s: Sprite; layer: Layer }[]): void {
        const mirror = this.mirror;
        if (!mirror) return;
        const seen = new Set<string>();
        const cw = (this.view.w * this.sq) / 2,
            ch = (this.view.h * this.sq) / 2;
        // the world's camera, so a test can turn a place in squares into a point on the field
        mirror.dataset.camera = `${this.cam.x} ${this.cam.y} ${this.sq * this.cam.zoom}`;
        for (const { s, layer } of ordered) {
            const placed = this.last.get(s.key);
            if (!placed) continue;
            seen.add(s.key);
            const c = layer.camera;
            const grow = s.scale ?? 1;
            const w = placed.w * grow * c.z,
                h = placed.h * grow * c.z;
            const a = s.angle ?? 0;
            const x = cw + (s.x - c.x) * c.z,
                y = ch + (s.y - (s.stand ? placed.h / 2 : 0) - c.y) * c.z;
            let d = this.mirrored.get(s.key);
            if (!d) {
                d = document.createElement("div");
                d.dataset.key = s.key;
                mirror.appendChild(d);
                this.mirrored.set(s.key, d);
            }
            // turned about its centre as the sprite is, so its box and heading read the same
            Object.assign(d.style, {
                left: `${(x - w / 2).toFixed(1)}px`,
                top: `${(y - h / 2).toFixed(1)}px`,
                width: `${w.toFixed(1)}px`,
                height: `${h.toFixed(1)}px`,
                transform: a ? `rotate(${a.toFixed(3)}rad)` : "",
                zIndex: String(s.z ?? 0),
            });
            d.dataset.angle = String(a);
            d.dataset.z = String(s.z ?? 0);
        }
        for (const [k, d] of this.mirrored)
            if (!seen.has(k)) {
                d.remove();
                this.mirrored.delete(k);
            }
    }

    puff(x: number, y: number, n: number): void {
        this.burst("dust", x, y, n);
    }

    burst(kind: BurstKind, x: number, y: number, n: number, dir?: number): void {
        if (this.o.still()) return;
        burst(this.pool, kind, { x, y }, n, BURSTS[kind], dir);
    }

    shake(amount: number): void {
        if (this.o.still()) return;
        this.shaken = { a: Math.max(this.shaken.a, amount), t: 0 };
    }

    toWorld(clientX: number, clientY: number): { x: number; y: number } {
        const r = this.el.getBoundingClientRect();
        const k = this.sq * this.cam.zoom;
        return {
            x: this.cam.x + (clientX - r.left - (this.view.w * this.sq) / 2) / k,
            y: this.cam.y + (clientY - r.top - (this.view.h * this.sq) / 2) / k,
        };
    }

    get px(): number {
        return this.sq * this.cam.zoom;
    }
}

/** Steps a live number is rounded to while it moves, and frames it must hold still to be drawn exactly. */
const LIVE_STEPS = 32;
const LIVE_REST = 6;

/** The range a numeric setting allows, from its declaration on the drawing, or null for any other kind. */
function rangeOf(setting: unknown): { min: number; max: number; whole: boolean } | null {
    if (typeof setting !== "object" || setting === null) return null;
    const kind = "kind" in setting ? setting.kind : undefined,
        min = "min" in setting ? setting.min : undefined,
        max = "max" in setting ? setting.max : undefined;
    if (
        (kind !== "whole" && kind !== "number") ||
        typeof min !== "number" ||
        typeof max !== "number"
    )
        return null;
    return max > min ? { min, max, whole: kind === "whole" } : null;
}

function stepped(value: number, min: number, max: number, whole: boolean): number {
    const size = whole
        ? Math.max(1, Math.round((max - min) / LIVE_STEPS))
        : (max - min) / LIVE_STEPS;
    return min + Math.round((value - min) / size) * size;
}

/** Two hex colours mixed, `k` of the way from the first to the second, as a hex colour. */
function mixed(a: string, b: string, k: number): string {
    const p = rgb(a),
        q = rgb(b);
    return `#${p
        .map((v, i) =>
            Math.round((v + ((q[i] ?? 0) - v) * k) * 255)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/** A hex colour's channels from nought to one. */
function rgb(css: string): [number, number, number] {
    const hex = /^#([0-9a-f]{3,8})$/i.exec(css.trim())?.[1] ?? "000";
    const full = hex.length <= 4 ? hex.replace(/./g, (c) => c + c) : hex;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4)];
}
