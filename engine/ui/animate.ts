// Plays drawings' declared motion on any page that asks for it. Everything a page plays shares one
// stage: one watch on what is on screen, one frame budget and one answer to reduced motion, print
// and a hidden tab. The movement is worked out in engine/motion/animation.ts, and handed to the
// browser as keyframes it plays without this file: a whole drawing's, and each part's inside it. A
// spinning part, which coasts to rest where it looks as drawn, and a recording that seeks the clock
// are drawn here frame by frame. See .docs/animation.md.
import "./animate.css";
import {
    EASE,
    INTENSITY,
    POKE,
    REST,
    amplitudeAt,
    boostAt,
    choose,
    combine,
    keyframesOf,
    matrixOf,
    movesOf,
    nextCap,
    onScreen,
    poseOf,
    seedOf,
    spinSettle,
    towards,
    turnedAt,
    type Animation as Declared,
    type Envelope,
    type Intensity,
    type Move,
    type PartMove,
    type PartPlace,
    type Pose,
} from "../motion/animation";
import { ticker, type Ticker } from "../motion/loop";
import type { Resolved } from "../parts/drawing";

export interface Site {
    /** How much motion the site asks for: a name, or a number where 1 is normal. */
    intensity?: Intensity | number;
    /**
     * When a drawing settles. "never": it moves whenever it is on screen. A number: it moves for that
     * many seconds after it comes into view and then settles, and a pointer over it wakes it again.
     * A site can also settle its drawings itself, with `settle(true)`, as the journal does while a
     * child is working.
     */
    settle?: "never" | number;
    /** Seconds to wake and to settle. */
    wake?: number;
    rest?: number;
    /** The most drawings from this site that move at once. */
    most?: number;
    /**
     * How many screen pixels one of the site's own pixels is, where the site draws on a stage
     * scaled by a camera (a world's roll or the country); read whenever keyframes are made, and
     * `rescale()` makes them again once the camera has settled. Elsewhere it is 1.
     */
    zoom?: () => number;
}

export interface Playing {
    readonly motion: Resolved;
    /** Its moment now, bigger for a moment and dying away. Nothing records it. */
    poke(): void;
    stop(): void;
}

export interface Group {
    /**
     * Play one rendered drawing with the motion it resolved to. It is seeded by `id`, or by the id
     * `render()` stamped on it, and `key` tells apart copies of one drawing on a page. `frame` is the
     * box the drawing fills, which moves in its place when it is laid out as a box rather than inline.
     */
    play(
        svg: SVGSVGElement,
        o: { motion: Resolved; id?: string; key?: string | number; frame?: HTMLElement },
    ): Playing;
    settle(on: boolean): void;
    /** For a site that settles after a while: move again for that long, as a pointer passing over does. */
    wake(): void;
    set(o: Partial<Site>): void;
    /** The site's zoom has changed: keyframes are made again where the change is enough to see. */
    rescale(): void;
    /** Settle everything and let it go. */
    stop(): void;
    /** Release immediately when the owning scene leaves the page. */
    dispose(): void;
}

interface Part extends PartPlace {
    el: SVGGElement;
    move: PartMove;
    seed: number;
    wrote: boolean;
    /** Its cycle, and the wake, poke or settle playing before or instead of it. */
    track: Animation | null;
    passing: Animation | null;
}

interface Inst {
    svg: SVGSVGElement;
    /** What the whole drawing's movement is written to: the svg, or the box it fills. */
    frame: HTMLElement | SVGSVGElement;
    group: G;
    motion: Resolved;
    seed: number;
    /** Stage time it was first played at; its own clock starts there. */
    born: number;
    body: Move[];
    parts: Part[];
    weight: Declared["weight"];
    /** The frame's size on the page, in pixels. */
    w: number;
    h: number;
    seen: boolean;
    share: number;
    allowed: boolean;
    env: Envelope;
    /** The spin clock at the start of `env`. */
    turned: number;
    poked: number;
    /** For a site that settles after a while: when this one does. */
    quiet: number;
    timer: ReturnType<typeof setTimeout> | undefined;
    wrote: boolean;
    origin: string;
    /** When its parts were last drawn. */
    partsAt: number;
    /** The whole drawing's cycle, and the wake, poke or settle playing before or instead of it. */
    track: Animation | null;
    passing: Animation | null;
    /** The size and intensity the keyframes playing now were made for, or null when none play. */
    made: { w: number; h: number; level: number; zoom: number } | null;
}

const NS = "http://www.w3.org/2000/svg";
const SHAPES = "path, rect, circle, ellipse, polygon, polyline, line";
const AT_REST = "matrix(1, 0, 0, 1, 0, 0)";

const stage = {
    insts: new Set<Inst>(),
    bySvg: new WeakMap<SVGSVGElement, Inst>(),
    counts: new Map<string, number>(),
    reduce:
        typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null,
    hidden: typeof document !== "undefined" && document.hidden,
    printing: false,
    /** Seconds since the stage began, which every drawing's clock is measured from. */
    time: 0,
    last: -1,
    /** The frame budget: how many may move, what our own work cost and how many frames came late. */
    cap: 48,
    own: 0,
    frames: 0,
    late: 0,
    since: 0,
    /** The display's own frame interval, followed from below, so a 30 Hz screen's frames are not all counted late. */
    interval: 1 / 60,
    /** Set by a recording script, which seeks the clock: every drawing is then drawn here frame by frame. */
    manual: false,
    /** Set by a measuring script to take the budget away, so the cost of everything on screen moving can be seen. */
    unlimited: false,
    /** Set by a measuring script to play only whole drawings or only parts, to see what each costs. */
    only: "" as "" | "body" | "parts",
    tk: null as Ticker | null,
    io: null as IntersectionObserver | null,
    /** A drawing drawn bigger or smaller moves by a different amount, so its size is measured again when it changes. */
    ro: null as ResizeObserver | null,
};

const BUDGET = { min: 6, max: 64, ms: 4 };
/** Updates are capped near 60 a second: idle movement is slow, and a 120 Hz display need not draw it twice as often. */
const STEP = 1 / 62;
/**
 * A whole drawing moves on the compositor and costs no painting; a part moving inside a drawing
 * repaints the drawing. So parts are drawn at most 30 times a second, which is smooth for movement
 * this slow, and a drawing with parts counts as three against the budget.
 */
const PART_STEP = 1 / 31;
const PART_WEIGHT = 3;

const reduced = (): boolean => stage.reduce?.matches === true;
/** `?animdebug` gives a recording script the clock and the budget's figures; read as the module loads, before a page rewrites its address. */
const DEBUG =
    typeof location !== "undefined" && new URLSearchParams(location.search).has("animdebug");

/** A spinning part is drawn here, since its settle coasts to where it looks as drawn. */
const byHand = (p: Part): boolean => stage.manual || p.move.is === "spin";

function start(): void {
    if (stage.tk) return;
    stage.tk = ticker({
        now: () => performance.now(),
        schedule: (f) => requestAnimationFrame(f),
        onFrame: (time, dt) => frame(time, dt),
    });
    stage.io = new IntersectionObserver(
        (entries) => {
            const area = Math.max(1, innerWidth * innerHeight);
            for (const e of entries) {
                const inst = stage.bySvg.get(e.target as SVGSVGElement);
                if (!inst) continue;
                const r = e.intersectionRect;
                const cx = r.left + r.width / 2 - innerWidth / 2;
                const cy = r.top + r.height / 2 - innerHeight / 2;
                const middle = 1 - Math.min(0.6, Math.hypot(cx / innerWidth, cy / innerHeight));
                inst.seen = e.isIntersecting;
                inst.share = ((r.width * r.height) / area) * middle;
                if (inst.seen) {
                    measure(inst);
                    quietFor(inst);
                }
            }
            budget();
        },
        { rootMargin: "60px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    stage.ro = new ResizeObserver((entries) => {
        for (const e of entries) {
            const inst = stage.bySvg.get(e.target as SVGSVGElement);
            if (!inst) continue;
            measure(inst);
            rekey(inst);
        }
    });
    stage.reduce?.addEventListener("change", () => {
        if (reduced()) restAll();
        else retargetAll();
    });
    document.addEventListener("visibilitychange", () => {
        stage.hidden = document.hidden;
        if (stage.hidden) restAll();
        else retargetAll();
    });
    // Printing never sees a drawing mid-movement: everything is put back as drawn before the page is laid out for paper.
    addEventListener("beforeprint", () => {
        stage.printing = true;
        restAll();
    });
    addEventListener("afterprint", () => {
        stage.printing = false;
        retargetAll();
    });
    if (DEBUG) {
        Object.assign(window, {
            __animation: {
                stats,
                seek,
                manual: (on: boolean) => {
                    restAll();
                    stage.manual = on;
                    retargetAll();
                },
                unlimited: (on: boolean) => {
                    stage.unlimited = on;
                    budget();
                },
                only: (what: "" | "body" | "parts") => {
                    restAll();
                    stage.only = what;
                    retargetAll();
                },
            },
        });
    }
}

/**
 * Seconds on the stage's clock, now. The ticker keeps counting while it is stopped, so a drawing
 * played while nothing was moving starts its clock at the right time rather than at the last frame.
 */
const clock = (): number => (stage.manual ? stage.time : (stage.tk?.now() ?? 0));
const local = (inst: Inst): number => clock() - inst.born;

function kick(): void {
    if (stage.manual || !stage.tk) return;
    stage.tk.start();
}

/** For a site that settles after a while: the drawing moves that long from now, unless something wakes it again. */
function quietFor(i: Inst): void {
    const { settle } = i.group.site;
    if (settle === undefined || settle === "never") return;
    i.quiet = local(i) + settle;
    clearTimeout(i.timer);
    i.timer = setTimeout(() => retarget(i), settle * 1000 + 20);
}

/** Which drawings may move, from the budget and from how much of the screen each one takes. */
function budget(): void {
    const groups = new Map<G, Inst[]>();
    for (const i of stage.insts) {
        if (!i.seen) {
            i.allowed = false;
            continue;
        }
        const list = groups.get(i.group);
        if (list) list.push(i);
        else groups.set(i.group, [i]);
    }
    for (const [g, list] of groups) {
        // most important first, until the cost of what moves reaches the cap; a drawing with parts costs more
        const cap = stage.unlimited ? Infinity : Math.min(stage.cap, g.site.most ?? BUDGET.max);
        const weighed = list.map((i) => ({ key: i, weight: i.share, moving: i.env.to > 0 }));
        let spent = 0;
        for (const i of choose(weighed, list.length)) {
            const cost = i.parts.length ? PART_WEIGHT : 1;
            i.allowed = i.motion.still === null && spent + cost <= cap;
            if (i.allowed) spent += cost;
        }
    }
    retargetAll();
}

function want(i: Inst): number {
    const { settle } = i.group.site;
    const moving =
        !reduced() &&
        !stage.hidden &&
        !stage.printing &&
        i.motion.still === null &&
        i.seen &&
        i.allowed &&
        !i.group.settled &&
        !i.group.stopping &&
        (settle === undefined || settle === "never" || local(i) < i.quiet);
    return moving ? 1 : 0;
}

function retarget(i: Inst): void {
    const target = want(i);
    const t = local(i);
    if (target === i.env.to) return;
    const a = amplitudeAt(i.env, t);
    const turned = turnedAt(i.env, i.turned, t);
    let dur = target > a ? (i.group.site.wake ?? EASE.wake) : (i.group.site.rest ?? EASE.settle);
    if (target < a) {
        for (const p of i.parts) {
            if (p.move.is !== "spin") continue;
            const rev = p.move.rev ?? 20;
            dur = Math.max(dur, spinSettle(turned, rev, p.move.symmetry ?? 1, a, dur));
        }
    }
    i.turned = turned;
    i.env = { from: a, to: target, at: t, dur };
    if (!stage.manual) {
        if (target > 0) wakeAll(i, t, a, dur);
        else settleAll(i, dur);
    }
    kick();
}

function retargetAll(): void {
    for (const i of stage.insts) retarget(i);
    kick();
}

type Window = { at: number; dur: number; from: number; poked?: number };

/** Keyframes on one element: `window`'s wake or poke, then the cycle from where the first ends, so the two meet without a jump. */
function playOn(
    el: Element,
    moves: readonly Move[],
    o: Parameters<typeof keyframesOf>[1],
    window: Window,
): [Animation, Animation] {
    const cycle = keyframesOf(moves, o);
    const into = keyframesOf(moves, { ...o, window });
    const passing = el.animate(into.frames, { duration: window.dur * 1000 });
    const track = el.animate(cycle.frames, {
        duration: cycle.duration * 1000,
        delay: window.dur * 1000,
        iterations: Infinity,
        iterationStart: ((window.at + window.dur) % cycle.duration) / cycle.duration,
    });
    // Cancelled once it has handed over, so only one animation changes the element's transform. The
    // cycle is then paused and played at once, which does not move its clock but has the browser
    // look again at where it plays it: two animations on one element's transform keep each other
    // off the compositor, and the browser does not look again on its own when one of them goes, so
    // without this the cycle would stay on the main thread and cost the page a frame of style,
    // layerize and commit for as long as it ran (.docs/animation.md, "Performance").
    passing.onfinish = () => {
        passing.cancel();
        track.pause();
        track.play();
    };
    return [passing, track];
}

/** The whole drawing and every part the browser can play, waking from `from` of full strength over `dur` seconds, or poked. */
function wakeAll(i: Inst, t: number, from: number, dur: number, poked?: number): void {
    const zoom = i.group.zoom();
    const o = { seed: i.seed, weight: i.weight, w: i.w, h: i.h, level: i.group.level(), zoom };
    const window = { at: t, dur, from, poked };
    stopAll(i);
    if (i.body.length && stage.only !== "parts") {
        i.frame.style.transformOrigin = "0 0";
        [i.passing, i.track] = playOn(i.frame, i.body, o, window);
    }
    for (const p of stage.only === "body" ? [] : i.parts) {
        if (byHand(p)) continue;
        p.el.style.transformBox = "view-box";
        p.el.style.transformOrigin = "0 0";
        p.el.setAttribute("data-anim-moved", "");
        p.wrote = true;
        const place = { pivot: p.pivot, dir: p.dir, lag: p.lag };
        [p.passing, p.track] = playOn(p.el, [p.move], { ...o, seed: p.seed, part: place }, window);
    }
    i.made = { w: i.w, h: i.h, level: o.level, zoom };
}

/** Everything the browser plays for a drawing eased back to rest from wherever it is now. */
function settleAll(i: Inst, dur: number): void {
    if (!i.made) return;
    const moving: { el: Element; own: { passing: Animation | null } }[] = [];
    if (i.track || i.passing) moving.push({ el: i.frame, own: i });
    for (const p of i.parts) if (p.track || p.passing) moving.push({ el: p.el, own: p });
    // every pose is read before any animation is cancelled, so none is read mid-change
    const from = moving.map(({ el }) => {
        const now = getComputedStyle(el);
        return {
            transform: now.transform === "none" ? AT_REST : now.transform,
            opacity: now.opacity,
        };
    });
    stopAll(i);
    i.made = null;
    let last: Animation | null = null;
    for (const [k, { el, own }] of moving.entries()) {
        const back = el.animate([from[k] ?? {}, { transform: AT_REST, opacity: "1" }], {
            duration: dur * 1000,
            easing: "ease-in-out",
        });
        own.passing = back;
        last = back;
    }
    if (!last) return;
    last.onfinish = () => {
        if (i.made) return;
        stopAll(i);
        unwrite(i);
        if (i.group.stopping) release(i);
    };
}

function stopAll(i: Inst): void {
    for (const own of [i, ...i.parts]) {
        own.track?.cancel();
        own.track = null;
        own.passing?.cancel();
        own.passing = null;
    }
}

/** What playing keyframes wrote besides the keyframes themselves. */
function unwrite(i: Inst): void {
    i.frame.style.removeProperty("transform-origin");
    for (const p of i.parts) {
        if (byHand(p) || !p.wrote) continue;
        p.el.style.removeProperty("transform-box");
        p.el.style.removeProperty("transform-origin");
        p.el.removeAttribute("data-anim-moved");
        p.wrote = false;
    }
}

/** Keyframes made again when the drawing's size, its site's zoom or its site's intensity has changed enough to see. */
function rekey(i: Inst): void {
    const m = i.made;
    if (!m || [i, ...i.parts].some((own) => own.passing)) return;
    const level = i.group.goal();
    const zoom = i.group.zoom();
    const same =
        Math.abs(i.w - m.w) < 0.1 * m.w &&
        Math.abs(i.h - m.h) < 0.1 * m.h &&
        Math.abs(zoom - m.zoom) < 0.1 * m.zoom;
    if (same && level === m.level) return;
    const t = local(i);
    const o = { seed: i.seed, weight: i.weight, w: i.w, h: i.h, level, zoom };
    const again = (el: Element, moves: readonly Move[], oo: Parameters<typeof keyframesOf>[1]) => {
        const cycle = keyframesOf(moves, oo);
        return el.animate(cycle.frames, {
            duration: cycle.duration * 1000,
            iterations: Infinity,
            iterationStart: (t % cycle.duration) / cycle.duration,
        });
    };
    if (i.track) {
        i.track.cancel();
        i.track = again(i.frame, i.body, o);
    }
    for (const p of i.parts) {
        if (!p.track) continue;
        p.track.cancel();
        const place = { pivot: p.pivot, dir: p.dir, lag: p.lag };
        p.track = again(p.el, [p.move], { ...o, seed: p.seed, part: place });
    }
    i.made = { w: i.w, h: i.h, level, zoom };
}

/** Put every drawing back exactly as drawn, at once: for print, a hidden tab and reduced motion, where easing would itself be motion. */
function restAll(): void {
    for (const i of stage.insts) {
        i.env = { from: 0, to: 0, at: local(i), dur: 0 };
        clear(i);
    }
}

/** Remove everything the player wrote, so the drawing is exactly as `render()` left it. A spin starts again from where it was drawn. */
function clear(i: Inst): void {
    i.turned = 0;
    stopAll(i);
    unwrite(i);
    i.made = null;
    if (i.wrote) {
        const s = i.svg.style;
        for (const k of [
            "translate",
            "rotate",
            "scale",
            "transform",
            "transform-origin",
            "opacity",
            "will-change",
        ]) {
            s.removeProperty(k);
        }
        i.wrote = false;
        i.origin = "";
    }
    for (const p of i.parts) {
        if (!p.wrote) continue;
        p.el.removeAttribute("transform");
        p.el.style.removeProperty("opacity");
        p.el.removeAttribute("data-anim-moved");
        p.wrote = false;
    }
}

function measure(i: Inst): void {
    const w = i.frame.clientWidth || i.frame.getBoundingClientRect().width;
    const h = i.frame.clientHeight || i.frame.getBoundingClientRect().height;
    if (w > 0 && h > 0) {
        i.w = w;
        i.h = h;
    }
}

const fmt = (x: number): string => (Math.abs(x) < 5e-4 ? "0" : x.toFixed(3));

/** One frame drawn here: the whole drawing when a recording seeks, and the parts inside it. */
function draw(i: Inst, t: number, level: number): void {
    const w = i.group.level() * level * boostAt(t - i.poked);
    const forced = t - i.poked < 2 ? t - i.poked : -1;
    const turned = turnedAt(i.env, i.turned, t);
    const size = Math.max(i.w, i.h),
        zoom = i.group.zoom();
    if (i.body.length && stage.manual && stage.only !== "parts") {
        let raw: Pose = { ...REST };
        for (const m of i.body) raw = combine(raw, poseOf(m, t, i.seed, i.weight, turned, forced));
        const p = onScreen(towards(raw, w), size, false, zoom);
        const s = i.svg.style;
        s.translate = `${fmt(p.x)}px ${fmt(p.y)}px`;
        s.rotate = `${fmt(p.r)}deg`;
        s.scale = `${fmt(p.sx)} ${fmt(p.sy)}`;
        if (p.k !== 0) s.transform = `skewX(${fmt(-p.k)}deg)`;
        else s.removeProperty("transform");
        if (p.o < 1) s.opacity = fmt(p.o);
        else s.removeProperty("opacity");
        const pivot = i.body[0]?.pivot ?? [0.5, 1];
        const origin = `${((p.px ?? pivot[0]) * 100).toFixed(1)}% ${((p.py ?? pivot[1]) * 100).toFixed(1)}%`;
        if (origin !== i.origin) {
            s.transformOrigin = origin;
            i.origin = origin;
        }
        if (!i.wrote) s.willChange = "transform";
        i.wrote = true;
    }
    if (t - i.partsAt < PART_STEP && i.env.to > 0) return;
    i.partsAt = t;
    for (const part of stage.only === "body" ? [] : i.parts) {
        if (!byHand(part)) continue;
        const raw = poseOf(part.move, t - part.lag, part.seed, i.weight, turned - part.lag, forced);
        const q = onScreen(towards(raw, part.move.is === "spin" ? 1 : w), size, true, zoom);
        if (part.dir < 0) q.r = -q.r;
        const mx = matrixOf(q, [part.pivot[0], part.pivot[1]]);
        part.el.setAttribute("transform", `matrix(${mx.map(fmt).join(" ")})`);
        if (q.o < 1) part.el.style.opacity = fmt(q.o);
        else part.el.style.removeProperty("opacity");
        if (!part.wrote) part.el.setAttribute("data-anim-moved", "");
        part.wrote = true;
    }
}

function frame(time: number, dt: number): boolean {
    if (time - stage.last < STEP && dt > 0) return true;
    stage.last = time;
    stage.time = time;
    return tick(dt);
}

/** A frame of the work done here. It asks for another only while a part or a seeking recording moves. */
function tick(dt: number): boolean {
    const t0 = performance.now();
    let busy = false;
    for (const i of stage.insts) {
        if (!i.svg.isConnected) {
            release(i);
            continue;
        }
        const t = local(i);
        const { settle } = i.group.site;
        if (settle !== undefined && settle !== "never" && i.env.to > 0 && t >= i.quiet) retarget(i);
        const a = amplitudeAt(i.env, t);
        if (a <= 0 && i.env.to === 0 && t >= i.env.at + i.env.dur) {
            if (i.wrote || i.parts.some((p) => p.wrote)) clear(i);
            if (i.group.stopping) release(i);
            continue;
        }
        if (!stage.manual && !i.parts.some(byHand)) continue;
        // a spinning part keeps turning, at the envelope's speed, through the whole of a settle
        draw(i, t, a);
        busy = true;
    }
    stage.own += performance.now() - t0;
    stage.frames++;
    if (dt > 0) {
        stage.interval = dt < stage.interval ? dt : stage.interval * 0.995 + dt * 0.005;
        if (dt > 1.6 * stage.interval) stage.late++;
    }
    if (stage.time - stage.since >= 1) {
        const frames = Math.max(1, stage.frames);
        stage.cap = nextCap(stage.cap, stage.own / frames, stage.late / frames, BUDGET);
        stage.own = 0;
        stage.frames = 0;
        stage.late = 0;
        stage.since = stage.time;
        budget();
    }
    return busy;
}

function stats(): { playing: number; moving: number; cap: number; ownMs: number; time: number } {
    let moving = 0;
    for (const i of stage.insts) if (i.env.to > 0 || amplitudeAt(i.env, local(i)) > 0) moving++;
    return {
        playing: stage.insts.size,
        moving,
        cap: stage.cap,
        ownMs: stage.own / Math.max(1, stage.frames),
        time: clock(),
    };
}

/** For recording: stop the clock and draw every drawing as it is at `t` seconds. */
function seek(t: number): void {
    if (!stage.manual) {
        restAll();
        stage.manual = true;
        retargetAll();
    }
    stage.tk?.stop();
    stage.time = t;
    tick(1 / 60);
}

function release(i: Inst): void {
    clear(i);
    clearTimeout(i.timer);
    stage.io?.unobserve(i.svg);
    stage.ro?.unobserve(i.svg);
    stage.insts.delete(i);
    stage.bySvg.delete(i.svg);
    i.svg.removeAttribute("data-anim");
    if (i.frame !== i.svg) i.frame.removeAttribute("data-anim-frame");
}

/** The drawing's frames: one, or three when it boils. A part is found and moved in each. */
function framesOf(svg: SVGSVGElement): Element[] {
    const boil = svg.querySelector(":scope > g.boil");
    if (boil) return Array.from(boil.children);
    const first = svg.querySelector(":scope > g");
    return first ? [first] : [svg];
}

function pivotOf(el: SVGGElement, origin: readonly [number, number]): [number, number] {
    try {
        const b = el.getBBox();
        return [b.x + b.width * origin[0], b.y + b.height * origin[1]];
    } catch {
        return [0, 0];
    }
}

/**
 * A hand-drawn file's elements, by the order it draws them, gathered into a group per copy so each
 * copy can move. The group is new and draws nothing itself, so the drawing looks the same.
 */
function wrap(
    frame: Element,
    of: readonly (readonly number[])[],
    paths: boolean,
    name: string,
): SVGGElement[] {
    const leaves = Array.from(frame.querySelectorAll(paths ? "path" : SHAPES)).filter(
        (e) => !e.closest("defs, pattern, [data-anim-part]"),
    );
    const out: SVGGElement[] = [];
    for (const copy of of) {
        const els = copy.map((k) => leaves[k]).filter((e) => e !== undefined);
        const first = els[0];
        const parent = first?.parentNode;
        if (!first || !parent || els.length !== copy.length) continue;
        const g = document.createElementNS(NS, "g");
        g.setAttribute("data-anim-part", name);
        parent.insertBefore(g, first);
        for (const e of els) g.appendChild(e);
        out.push(g);
    }
    return out;
}

/** The elements a part is made of in one frame: groups the drawing tagged, or a hand-drawn file's elements by draw order. */
function partEls(frame: Element, name: string, move: PartMove): SVGGElement[] {
    if (move.pick) return Array.from(frame.querySelectorAll<SVGGElement>(move.pick));
    if (!move.of) return Array.from(frame.querySelectorAll<SVGGElement>(`[data-part="${name}"]`));
    const done = Array.from(frame.querySelectorAll<SVGGElement>(`[data-anim-part="${name}"]`));
    return done.length ? done : wrap(frame, move.of, move.paths === true, name);
}

/** A pivot the drawing gave the part: `data-pivot`, or the `transform-origin` a guide's layer carries for its own styles. */
function pivotGiven(el: Element): [number, number] | null {
    const [x, y, ...rest] = el.getAttribute("data-pivot")?.split(" ").map(Number) ?? [];
    if (x !== undefined && y !== undefined && rest.length === 0) {
        if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
    }
    const o = /transform-origin:\s*(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(
        el.getAttribute("style") ?? "",
    );
    return o ? [Number(o[1]), Number(o[2])] : null;
}

/** A guide's wing flaps the way its `--flap` says, so the two wings of a firefly lift together. */
function dirOf(el: Element): number {
    if (Number(el.getAttribute("data-dir")) < 0) return -1;
    const flap = /--flap:\s*(-?[\d.]+)deg/.exec(el.getAttribute("style") ?? "");
    return flap && Number(flap[1]) > 0 ? -1 : 1;
}

function partsOf(svg: SVGSVGElement, a: Declared, seed: number): Part[] {
    const out: Part[] = [];
    for (const [name, move] of Object.entries(a.parts ?? {})) {
        for (const frame of framesOf(svg)) {
            partEls(frame, name, move).forEach((el, i) => {
                const symmetry = Number(el.getAttribute("data-symmetry")) || undefined;
                out.push({
                    el,
                    wrote: false,
                    track: null,
                    passing: null,
                    pivot: move.pivot ?? pivotGiven(el) ?? pivotOf(el, move.origin ?? [0.5, 0.5]),
                    move: symmetry ? { ...move, symmetry } : move,
                    // copies in a wave share one clock, offset; copies without one each keep their own
                    seed: move.wave ? seed : seed + i * 7919,
                    lag: i * (move.wave ?? 0),
                    dir: dirOf(el),
                });
            });
        }
    }
    return out;
}

/** A body move in drawing units, as the harbour declares them, turned into a share of the drawing's larger side. */
function inShares(m: Move, svg: SVGSVGElement): Move {
    if (!m.units) return m;
    const vb = svg.viewBox.baseVal;
    const side = Math.max(vb.width || 1, vb.height || 1);
    return {
        ...m,
        units: false,
        lift: m.lift !== undefined ? m.lift / side : undefined,
        dx: m.dx !== undefined ? m.dx / side : undefined,
    };
}

const intensityOf = (x: Intensity | number | undefined): number =>
    typeof x === "number" ? x : INTENSITY[x ?? "normal"];

class G implements Group {
    site: Site;
    settled = false;
    stopping = false;
    private from: number;
    private to: number;
    private at = 0;

    constructor(site: Site) {
        this.site = { settle: "never", ...site };
        this.from = intensityOf(this.site.intensity);
        this.to = this.from;
    }

    /** The site's intensity now, eased over half a second when it changes, so a slider never jolts. */
    level(): number {
        return this.from + (this.to - this.from) * Math.min(1, (clock() - this.at) / 0.5);
    }

    /** The intensity the site is easing towards. */
    goal(): number {
        return this.to;
    }

    /** Screen pixels per pixel of the site's own, now. */
    zoom(): number {
        return this.site.zoom?.() ?? 1;
    }

    play(
        svg: SVGSVGElement,
        o: { motion: Resolved; id?: string; key?: string | number; frame?: HTMLElement },
    ): Playing {
        start();
        this.stopping = false;
        const existing = stage.bySvg.get(svg);
        if (existing) {
            existing.group = this;
            retarget(existing);
            return handle(existing);
        }
        const id = o.id ?? svg.getAttribute("data-visual") ?? "";
        const n = stage.counts.get(id) ?? 0;
        stage.counts.set(id, n + 1);
        const seed = seedOf(id, o.key ?? n);
        const { motion } = o;
        const still = motion.still !== null;
        // a transform does nothing to an inline box, so an inline frame leaves the movement on the svg
        const boxed = o.frame && getComputedStyle(o.frame).display !== "inline" ? o.frame : svg;
        if (boxed !== svg) boxed.setAttribute("data-anim-frame", "");
        const inst: Inst = {
            svg,
            frame: boxed,
            group: this,
            motion,
            seed,
            born: clock(),
            body: movesOf(motion.anim).map((m) => inShares(m, svg)),
            parts: still ? [] : partsOf(svg, motion.anim, seed),
            weight: motion.anim.weight,
            w: 160,
            h: 160,
            seen: false,
            share: 0,
            allowed: false,
            env: { from: 0, to: 0, at: 0, dur: 0 },
            turned: 0,
            poked: -99,
            quiet: Infinity,
            timer: undefined,
            wrote: false,
            origin: "",
            partsAt: -1,
            track: null,
            passing: null,
            made: null,
        };
        svg.setAttribute("data-anim", still ? "still" : "moves");
        stage.insts.add(inst);
        stage.bySvg.set(svg, inst);
        stage.io?.observe(svg);
        stage.ro?.observe(svg);
        return handle(inst);
    }

    settle(on: boolean): void {
        this.settled = on;
        retargetAll();
    }

    wake(): void {
        for (const i of stage.insts) if (i.group === this && i.seen) quietFor(i);
        retargetAll();
    }

    set(o: Partial<Site>): void {
        if (o.intensity !== undefined) {
            this.from = this.level();
            this.to = intensityOf(o.intensity);
            this.at = clock();
        }
        this.site = { ...this.site, ...o };
        for (const i of stage.insts) if (i.group === this) rekey(i);
        retargetAll();
    }

    rescale(): void {
        for (const i of stage.insts) if (i.group === this) rekey(i);
    }

    stop(): void {
        this.stopping = true;
        retargetAll();
        kick();
    }

    dispose(): void {
        this.stopping = true;
        for (const i of stage.insts) if (i.group === this) release(i);
    }
}

function handle(i: Inst): Playing {
    return {
        get motion() {
            return i.motion;
        },
        poke: () => {
            if (reduced() || !i.seen) return;
            const t = local(i);
            i.poked = t;
            quietFor(i);
            retarget(i);
            if (!stage.manual && i.env.to > 0) wakeAll(i, t, amplitudeAt(i.env, t), POKE, t);
            kick();
        },
        stop: () => release(i),
    };
}

/** A site's handle on the page's one animation stage. Nothing moves until a drawing is played through it. */
export function animate(site: Site = {}): Group {
    return new G(site);
}
