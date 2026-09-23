// A viewport onto an infinite sheet of squared paper. The view owns the camera and turns pointer,
// wheel and keyboard input into camera moves; whoever uses it fills `world`, a layer laid out in
// world units that the view moves with one CSS transform. The paper itself is drawn on a canvas in
// screen space, so its lines stay one device pixel wide however far the child zooms.
import {
    clamp,
    clampCamera,
    cssTransform,
    easeInOutCubic,
    fitRect,
    flight,
    gridLines,
    panBy,
    paperLayers,
    pinch,
    readWheel,
    toScreen,
    toWorld,
    surfaceSizes,
    visibleRect,
    wheelFactor,
    zoomAt,
    type Camera,
    type Limits,
    type Pt,
    type Rect,
    type Size,
} from "../space";
import { readTokens } from "./read-tokens";

export interface ViewHooks {
    /** Everything worth looking at: what "show it all" fits, and what the camera is kept in reach of. */
    bounds(camera: Camera): Rect;
    /** Once per frame, after the camera moved or the viewport resized. */
    frame(cam: Camera, vp: Size): void;
    /** True when this pointer belongs to the caller (a pencil drawing) rather than to the camera. */
    claim?(e: PointerEvent): boolean;
    /** A tap that did not land on a control. Return true when it was used. */
    tap?(target: Element, world: Pt): boolean;
    /** A key the view does not handle itself. Return true when it was used. */
    key?(e: KeyboardEvent): boolean;
    /** The camera has come to rest. */
    settle?(cam: Camera): void;
    /** The host changed size, so a camera framed on the box is framed again. */
    resized?(vp: Size): void;
}

const motion = matchMedia("(prefers-reduced-motion: reduce)");
export const reducedMotion = () => motion.matches;

export class CanvasView {
    private static readonly surfaces = new Set<CanvasView>();
    private static sizePaper(): void {
        const views = [...CanvasView.surfaces];
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        const sizes = surfaceSizes(
            views.map((v) => ({ w: v.vp.w * dpr, h: v.vp.h * dpr })),
            4_000_000,
            2_000_000,
        );
        const changed = views.flatMap((v, i) => {
            const size = sizes[i];
            return size && (v.paper.width !== size.w || v.paper.height !== size.h)
                ? [{ v, size }]
                : [];
        });
        // Release old storage before allocating replacements, including during rotation.
        for (const { v } of changed) v.paper.width = v.paper.height = 0;
        for (const { v, size } of changed) {
            v.paper.width = size.w;
            v.paper.height = size.h;
            v.drawPaper();
            v.request();
        }
    }
    readonly world: HTMLDivElement;
    readonly paper: HTMLCanvasElement;
    cam: Camera = { x: 0, y: 0, z: 1 };
    vp: Size = { w: 1, h: 1 };
    limits: Limits = { min: 0.08, max: 3.2 };
    spaceHeld = false;
    /** Whether the wheel zooms and pans the view; a page that scrolls past the view leaves it the wheel. */
    takesWheel = true;
    private anim: { at(t: number): Camera; start: number; ms: number; to: Camera } | null = null;
    private glide: { vx: number; vy: number; t: number } | null = null;
    private raf = 0;
    private disposed = false;
    private readonly events = new AbortController();
    private readonly resizing: ResizeObserver;
    private pointers = new Map<number, Pt>();
    private drag: {
        id: number;
        from: Pt;
        last: Pt;
        moved: boolean;
        log: { t: number; x: number; y: number }[];
    } | null = null;
    private pair: [Pt, Pt] | null = null;
    private tapped = { t: 0, x: 0, y: 0 };
    private trackpadAt = -1e9;
    /** When the viewer last moved the paper themselves, by a finger, the wheel or a key, on `performance.now()`. */
    private movedAt = -1e9;
    private settleTimer = 0;
    private gridInk = "#D5E1EC";
    readonly host: HTMLElement;
    private readonly hooks: ViewHooks;

    constructor(host: HTMLElement, hooks: ViewHooks) {
        this.host = host;
        this.hooks = hooks;
        this.paper = document.createElement("canvas");
        this.paper.className = "paper";
        // the canvas takes the keyboard itself, so the keys that move it reach it wherever the view
        // is opened, without a control on the page to tab to first
        if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
        this.world = document.createElement("div");
        this.world.className = "world";
        host.prepend(this.paper, this.world);
        this.colors();
        this.resizing = new ResizeObserver(() => this.measure());
        this.resizing.observe(host);
        CanvasView.surfaces.add(this);
        this.measure();
        const options = { signal: this.events.signal };
        host.addEventListener("pointerdown", this.down, options);
        host.addEventListener("pointermove", this.move, options);
        host.addEventListener("pointerup", this.up, options);
        host.addEventListener("pointercancel", this.up, options);
        host.addEventListener("wheel", this.wheel, { ...options, passive: false });
        host.addEventListener("keydown", this.keydown, options);
        host.addEventListener(
            "keyup",
            (e) => {
                if (e.key === " ") this.spaceHeld = false;
            },
            options,
        );
        // focusing an off-screen node makes the browser try to scroll the box; the camera moves instead
        host.addEventListener(
            "scroll",
            () => {
                host.scrollLeft = 0;
                host.scrollTop = 0;
            },
            options,
        );
    }

    /** Re-read the paper colour after a theme change. */
    colors(): void {
        if (this.disposed) return;
        this.gridInk = readTokens(this.host).grid;
        this.request();
    }

    private measure(): void {
        if (this.disposed) return;
        const w = this.host.clientWidth || 1,
            h = this.host.clientHeight || 1;
        const changed = w !== this.vp.w || h !== this.vp.h;
        this.vp = { w, h };
        CanvasView.sizePaper();
        this.request();
        if (changed) this.hooks.resized?.(this.vp);
    }

    private fence(c: Camera): Camera {
        return clampCamera(c, this.hooks.bounds(c), this.vp, this.limits);
    }
    /** Where the camera is heading: moves chain from there, so a held key does not crawl. */
    private get goal(): Camera {
        return this.anim?.to ?? this.cam;
    }

    /** Ends any flight or glide, and the settle it would have come to: a view stopped as its page leaves fires no settle on a page that is gone. */
    stop(): void {
        this.anim = null;
        this.glide = null;
        clearTimeout(this.settleTimer);
    }
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stop();
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.resizing.disconnect();
        this.events.abort();
        for (const id of this.pointers.keys()) {
            if (this.host.hasPointerCapture(id)) this.host.releasePointerCapture(id);
        }
        this.pointers.clear();
        this.drag = null;
        this.pair = null;
        this.spaceHeld = false;
        this.paper.width = this.paper.height = 0;
        CanvasView.surfaces.delete(this);
        CanvasView.sizePaper();
        this.paper.remove();
        this.world.remove();
    }
    /** How long ago the viewer last moved the paper themselves, in ms. */
    movedAgo(): number {
        return performance.now() - this.movedAt;
    }
    /** Whether a camera move is under way, so a second one does not cut across it. */
    get flying(): boolean {
        return this.anim !== null;
    }

    /** Moves the camera by a world distance and keeps a glide or flight going, as when what it looks at has moved. */
    shift(dx: number, dy: number): void {
        if (this.disposed) return;
        const by = (c: Camera): Camera => ({ ...c, x: c.x + dx, y: c.y + dy });
        const a = this.anim;
        if (a) this.anim = { ...a, at: (t) => by(a.at(t)), to: by(a.to) };
        this.cam = this.fence(by(this.cam));
        this.request();
    }

    set(c: Camera): void {
        if (this.disposed) return;
        this.stop();
        this.cam = this.fence(c);
        this.request();
        this.settleSoon();
    }

    private run(at: (t: number) => Camera, ms: number, to: Camera): void {
        if (this.disposed) return;
        if (ms <= 0 || reducedMotion()) {
            this.set(to);
            return;
        }
        this.glide = null;
        this.anim = { at, ms, to, start: performance.now() };
        this.request();
    }

    flyTo(c: Camera, ms?: number): void {
        if (this.disposed) return;
        const to = this.fence(c),
            f = flight(this.cam, to, this.vp);
        this.run((t) => f.at(easeInOutCubic(t)), ms ?? f.ms, to);
    }

    fit(r: Rect, pad = 56, animate = true): void {
        if (this.disposed) return;
        const c = fitRect(r, this.vp, pad, this.limits);
        if (animate) this.flyTo(c);
        else this.set(c);
    }

    /** Zoom by a factor, about a screen point (the middle of the viewport by default). */
    zoomBy(k: number, at?: Pt, animate = true): void {
        if (this.disposed) return;
        const from = this.goal,
            s = at ?? { x: this.vp.w / 2, y: this.vp.h / 2 };
        const z = clamp(from.z * k, this.limits.min, this.limits.max);
        const to = this.fence(zoomAt(from, this.vp, z, s));
        if (!animate) {
            this.set(to);
            return;
        }
        this.run(
            (t) => zoomAt(from, this.vp, from.z * (z / from.z) ** easeInOutCubic(t), s),
            240,
            to,
        );
    }

    panScreen(dx: number, dy: number, animate = true): void {
        if (this.disposed) return;
        const to = this.fence(panBy(this.goal, dx, dy));
        if (!animate) {
            this.set(to);
            return;
        }
        const from = this.cam;
        this.run(
            (t) => {
                const e = easeInOutCubic(t);
                return {
                    x: from.x + (to.x - from.x) * e,
                    y: from.y + (to.y - from.y) * e,
                    z: to.z,
                };
            },
            190,
            to,
        );
    }

    /** The world rect on screen, grown by margin screen pixels: what has to be drawn. */
    visible(margin = 0): Rect {
        return visibleRect(this.cam, this.vp, margin);
    }
    screenOf(p: Pt): Pt {
        return toScreen(this.cam, this.vp, p);
    }
    worldOf(e: { clientX: number; clientY: number }): Pt {
        return toWorld(this.cam, this.vp, this.local(e));
    }
    private local(e: { clientX: number; clientY: number }): Pt {
        const r = this.host.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    private request(): void {
        if (!this.disposed && !this.raf) this.raf = requestAnimationFrame(this.tick);
    }

    private tick = (now: number): void => {
        this.raf = 0;
        if (this.disposed) return;
        let resting = false;
        if (this.anim) {
            const t = Math.min(1, (now - this.anim.start) / this.anim.ms);
            this.cam = this.fence(this.anim.at(t));
            if (t >= 1) {
                this.cam = this.anim.to;
                this.anim = null;
                resting = true;
            }
        } else if (this.glide) {
            this.movedAt = now;
            const dt = Math.min(48, now - this.glide.t);
            this.glide.t = now;
            this.cam = this.fence(panBy(this.cam, this.glide.vx * dt, this.glide.vy * dt));
            const k = 0.9 ** (dt / 16);
            this.glide.vx *= k;
            this.glide.vy *= k;
            if (Math.hypot(this.glide.vx, this.glide.vy) < 0.02) {
                this.glide = null;
                resting = true;
            }
        }
        this.world.style.transform = cssTransform(this.cam, this.vp);
        this.drawPaper();
        this.hooks.frame(this.cam, this.vp);
        if (this.anim || this.glide) this.request();
        if (resting && !this.disposed) this.hooks.settle?.(this.cam);
    };

    private settleSoon(): void {
        clearTimeout(this.settleTimer);
        if (this.disposed) return;
        this.settleTimer = window.setTimeout(() => this.hooks.settle?.(this.cam), 160);
    }

    private drawPaper(): void {
        const W = this.paper.width,
            H = this.paper.height,
            dpr = Math.min(W / this.vp.w, H / this.vp.h);
        if (!W || !H) return;
        const ctx = this.paper.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = this.gridInk;
        const o = toScreen(this.cam, this.vp, { x: 0, y: 0 }),
            lw = Math.max(1, dpr);
        for (const layer of paperLayers(this.cam.z)) {
            if (layer.alpha < 0.02) continue;
            ctx.globalAlpha = layer.alpha;
            const step = layer.step * this.cam.z * dpr;
            for (const x of gridLines(o.x * dpr, step, W)) ctx.fillRect(x, 0, lw, H);
            for (const y of gridLines(o.y * dpr, step, H)) ctx.fillRect(0, y, W, lw);
        }
        ctx.globalAlpha = 1;
    }

    /** Take over a pointer someone else started tracking (a finger that was drawing joins a pinch). */
    adopt(id: number, at: Pt): void {
        if (this.disposed) return;
        this.pointers.set(id, at);
        if (this.pointers.size === 2) this.pair = this.two();
    }

    /** The first two pointers down, or null with fewer. */
    private two(): [Pt, Pt] | null {
        const [a, b] = this.pointers.values();
        return a && b ? [a, b] : null;
    }

    private down = (e: PointerEvent): void => {
        if (e.target instanceof Element && e.target.closest(".hud")) return;
        if (this.hooks.claim?.(e)) return;
        if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
        this.stop();
        const p = this.local(e);
        this.pointers.set(e.pointerId, p);
        if (this.pointers.size === 1)
            this.drag = {
                id: e.pointerId,
                from: p,
                last: p,
                moved: false,
                log: [{ t: e.timeStamp, ...p }],
            };
        else if (this.pointers.size === 2) {
            this.drag = null;
            this.pair = this.two();
        }
    };

    private move = (e: PointerEvent): void => {
        if (!this.pointers.has(e.pointerId)) return;
        const p = this.local(e);
        this.pointers.set(e.pointerId, p);
        const now = this.pair && this.pointers.size >= 2 ? this.two() : null;
        if (this.pair && now) {
            this.movedAt = performance.now();
            this.cam = this.fence(pinch(this.cam, this.vp, this.pair, now, this.limits));
            this.pair = now;
            this.request();
            return;
        }
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved) {
            if (Math.hypot(p.x - d.from.x, p.y - d.from.y) < (e.pointerType === "touch" ? 10 : 5))
                return;
            d.moved = true;
            this.host.setPointerCapture(e.pointerId);
            this.host.classList.add("grabbing");
        }
        this.movedAt = performance.now();
        this.cam = this.fence(panBy(this.cam, p.x - d.last.x, p.y - d.last.y));
        d.last = p;
        d.log.push({ t: e.timeStamp, x: p.x, y: p.y });
        if (d.log.length > 12) d.log.shift();
        this.request();
    };

    private up = (e: PointerEvent): void => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.delete(e.pointerId);
        this.host.classList.remove("grabbing");
        if (this.pair) {
            this.pair = null;
            const rest = [...this.pointers.entries()][0];
            this.drag = rest
                ? { id: rest[0], from: rest[1], last: rest[1], moved: true, log: [] }
                : null;
            this.settleSoon();
            return;
        }
        const d = this.drag;
        this.drag = null;
        if (!d || d.id !== e.pointerId) return;
        if (d.moved) {
            const log = d.log.filter((s) => e.timeStamp - s.t < 90);
            const a = log[0],
                b = log.at(-1);
            if (a && b && b.t > a.t && !reducedMotion()) {
                const vx = (b.x - a.x) / (b.t - a.t),
                    vy = (b.y - a.y) / (b.t - a.t);
                if (Math.hypot(vx, vy) > 0.35) {
                    this.glide = { vx, vy, t: performance.now() };
                    this.request();
                    return;
                }
            }
            this.settleSoon();
            return;
        }
        const p = this.local(e);
        const target = e.target;
        if (!(target instanceof Element) || target.closest("button, a, input, select, label"))
            return;
        if (this.hooks.tap?.(target, toWorld(this.cam, this.vp, p))) {
            this.tapped.t = 0;
            return;
        }
        // two taps on empty paper zoom in there, the way a map does
        if (
            e.timeStamp - this.tapped.t < 340 &&
            Math.hypot(p.x - this.tapped.x, p.y - this.tapped.y) < 34
        ) {
            this.zoomBy(2, p);
            this.tapped.t = 0;
        } else this.tapped = { t: e.timeStamp, x: p.x, y: p.y };
    };

    private wheel = (e: WheelEvent): void => {
        if (!this.takesWheel) return;
        e.preventDefault();
        this.stop();
        this.movedAt = performance.now();
        const read = readWheel(e, this.trackpadAt, e.timeStamp);
        this.trackpadAt = read.trackpadAt;
        if (read.zoom) {
            const p = this.local(e);
            const z = clamp(this.cam.z * wheelFactor(e), this.limits.min, this.limits.max);
            this.cam = this.fence(zoomAt(this.cam, this.vp, z, p));
        } else {
            const k = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? this.vp.h : 1;
            const side = e.shiftKey && e.deltaX === 0;
            this.cam = this.fence(
                panBy(this.cam, -(side ? e.deltaY : e.deltaX) * k, -(side ? 0 : e.deltaY) * k),
            );
        }
        this.request();
        this.settleSoon();
    };

    private keydown = (e: KeyboardEvent): void => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target instanceof Element && e.target.closest("input, select, textarea")) return;
        if (e.key === " " && e.target === this.host) {
            this.spaceHeld = true;
            e.preventDefault();
            return;
        }
        if (this.hooks.key?.(e)) {
            e.preventDefault();
            return;
        }
        const step = e.shiftKey ? Math.min(this.vp.w, this.vp.h) * 0.4 : 110;
        switch (e.key) {
            case "ArrowLeft":
                this.panScreen(step, 0);
                break;
            case "ArrowRight":
                this.panScreen(-step, 0);
                break;
            case "ArrowUp":
                this.panScreen(0, step);
                break;
            case "ArrowDown":
                this.panScreen(0, -step);
                break;
            case "+":
            case "=":
                this.zoomBy(1.5);
                break;
            case "-":
            case "_":
                this.zoomBy(1 / 1.5);
                break;
            case "0":
            case "Home":
                this.fit(this.hooks.bounds(this.cam));
                break;
            default:
                return;
        }
        this.movedAt = performance.now();
        e.preventDefault();
    };
}
