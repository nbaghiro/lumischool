// The map of the worlds on a page, drawn from the view the page was given (engine/space.ts MapView):
// a child's own map in the children's view, the sample child's on the site, and the map behind a
// page's cards (backdrop.tsx). What the viewer may do comes with the view as its limits; the page
// only draws it. The guide stands at a place, walks the ways between places, and the camera keeps to
// the country the limits allow. The map is painted by map.ts from the drawings the page loaded
// (drawings.ts).

import "./overworld.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { collapse, easeInOut, timeline, valueAt } from "../motion/timeline";
import { ticker } from "../motion/loop";
import {
    aimedAt,
    type AimedAt,
    along,
    cameraBetween,
    cameraOn,
    clamp,
    fitRect,
    intersects,
    neighbour,
    nodeAt,
    toScreen,
    type Arrow,
    type Camera,
    type MapAim,
    type MapPlace,
    type MapView,
    type Rect,
} from "../space";
import { idle, still } from "./art";
import type { MapPainted } from "./map";
import { announce } from "./say";
import { CanvasView } from "./view";
import { mapPainter } from "./painters";

/** Where a page finds the map's places and buttons on the page, to write its own words beside them. */
export interface MapAt {
    /** A place's picture in the page's pixels, or null when it is off the screen. */
    place(i: number): DOMRect | null;
    /** The map's own buttons and words, which a page's own keep clear of. */
    controls(): DOMRect[];
}

/** A place's words: what its button says, which is its name and its state. */
const nameOf = (view: MapView, i: number): string => {
    const label = view.places[i]?.shown?.label ?? "";
    return label.split(". ")[0] ?? "";
};

const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

const ARROWS: readonly Arrow[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

/**
 * The camera bounds the limits allow: what the map knows of the country, or all of it. A child's
 * map is the whole sea, so its bounds are the layout's. */
function boundsOf(view: MapView): Rect {
    const k = view.reach.known;
    if (view.limits.pan === "all" || !k || !k.length) return view.layout.bounds;
    const x0 = Math.min(...k.map((c) => c.x - c.r * 0.6)),
        y0 = Math.min(...k.map((c) => c.y - c.r * 0.6));
    const x1 = Math.max(...k.map((c) => c.x + c.r * 0.6)),
        y1 = Math.max(...k.map((c) => c.y + c.r * 0.6));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The zoom a map may draw back to. A map that is a screen, a child's and a grown-up's alike, is the
 * sea with all four lands in it, and its floor is the scale that covers the window with the country
 * rather than the one that fits the country into it: drawn back all the way, sea reaches every edge
 * and there is never paper past it on any side, and what the window cannot hold is there to drag
 * to, the top and bottom of the country on a wide window and the open water beside it either way
 * (`SEA_SIDES`). It is worked out from the window again whenever the window changes size. A map
 * laid in a page, the site's and the backdrops', keeps its floor as it was, since its aim frames
 * it. The frame a map opens on is a separate thing, a child's own land, and a phone opens closer
 * still. */
const zoomLimits = (
    view: MapView,
    vp: { w: number; h: number },
    screen: boolean,
): { min: number; max: number } => ({
    min:
        view.limits.zoomOut === "everything" && !screen
            ? 0.028
            : Math.min(0.9, Math.max(vp.w / view.layout.core.w, vp.h / view.layout.core.h)),
    max: 0.9,
});

export function Overworld(props: {
    view: MapView;
    /**
     * Where the guide stands and the camera looks, whenever it changes: a place's index, or "all" for
     * every world where the limits let the map draw back that far. Left out, the guide stands where
     * the view says the child is.
     */
    focus?: number | "all";
    /** The map takes the wheel to zoom, unless the page around it scrolls. */
    wheel?: boolean;
    /**
     * With it, a place the viewer may go into has a Go in button. The map dives into the place first
     * and hands back where its picture ended on the screen, so the page can open the world there and
     * the two views read as one movement; null when the map cut, under reduced motion.
     */
    onGoIn?: (place: number, at: DOMRect | null) => void;
    /**
     * The map opens on a place the viewer is coming back out of, with its picture where the world
     * left it, and pulls back to the map's own camera. Ignored under reduced motion, which cuts.
     */
    arrive?: { place: number; from: DOMRect };
    /**
     * A place whose way is not open was tapped, focused or pointed at, and null when the viewer leaves
     * it or the camera moves. The page says what opens it, and the map then says nothing of its own:
     * no card, no line, and a tap that does not travel.
     */
    onLocked?: (at: { place: MapPlace; how: "tap" | "focus" | "hover" } | null) => void;
    /**
     * Where the places and the buttons are on the page, whenever the camera comes to rest, so a page
     * may put its own words beside them, and null once the camera leaves what it was told.
     */
    onView?: (at: MapAt | null) => void;
    class?: string;
    /** The heading a screen reader finds the map by. */
    title: string;
    /**
     * A page's backdrop looks where its aim says rather than at the guide's frame, with `aimCamera`
     * giving the camera for the aimed point and the size of the aimed place's picture, from the box
     * and what stands over it as they are now (backdrop.tsx), and flies to a new aim in about a
     * second and a half, or cuts there under reduced motion.
     */
    aim?: MapAim;
    aimCamera?: (aimed: AimedAt, aim: MapAim) => Camera;
    /** Without the hud there is nothing to press or read: no buttons, no words, and nothing takes the pointer or the keyboard. */
    hud?: boolean;
    /** Paint the first frame in short tasks with a pause between each, while a snapshot stands in for the map. */
    steps?: boolean;
    /** With it, the drawings that travel the country ride it (the train over the strait, the ship out of the bay), keeping clear of `keepOff`. */
    life?: { keepOff(): readonly (Element | DOMRect)[] };
    /** The day whose doings play once the first frame is there: the way opened drawing in, the stamp pressing on, what a lesson lit. Nothing plays when it is left out. */
    play?: string;
    /** Once the first frame is all there. */
    onDrawn?: () => void;
}): JSX.Element {
    let host: HTMLElement | undefined;
    let view: CanvasView | undefined;
    let painted: MapPainted | undefined;
    let pending: { piece: MapPainted["pieces"][number]; done: boolean }[] = [];
    let brush = 0;
    /**
     * A movement is under way, or the map has gone into a place and is done: it stays busy from then
     * on, since the page is opening the world. Without that the settle after the dive, on a camera
     * resting inside the place, counted as a pinch in and went in again every 0.8 s.
     */
    let busy = false;
    let drawn = false;
    /** The pull-back out of a world runs once, on the first map this page draws, and never on a redraw. */
    let rose = false;
    let riders: { rebuild(): void } | null = null;
    let rebuildRiders = false;
    /** Draws run one after another, so a view that changes while its first frame is painted in steps never paints over the next. */
    let drawing: Promise<void> = Promise.resolve();
    const quiet = still();
    const hud = (): boolean => props.hud !== false;
    const [focus, setFocus] = createSignal<number>(props.view.here ?? 0);
    /**
     * Whether the viewer has a place: on a child's map the child's own from the start, and on a map
     * with nobody on it none until the viewer taps one or walks to one with the arrows, so the map
     * opens with every place equal, no ring and no name. */
    const [chosen, setChosen] = createSignal(
        props.view.here !== null || typeof props.focus === "number",
    );
    const [at, setAt] = createSignal<"frame" | "all">("frame");
    const [card, setCard] = createSignal<MapPlace | null>(null);
    const [ready, setReady] = createSignal(false);

    const place = (i: number): MapPlace | undefined => props.view.places[i];
    const grown = (): boolean => props.view.limits.travel === "everywhere";
    const mayEnter = (i: number): boolean => {
        const p = place(i);
        return (
            !!p &&
            p.open &&
            props.view.limits.goIn !== "none" &&
            p.state !== "next" &&
            p.state !== "behind"
        );
    };
    /** What was last said about a locked place, so the page hears of it leaving exactly once. */
    let told: { i: number; how: "tap" | "focus" | "hover" } | null = null;
    /** Tell the page about a place with no way in. Whether the page took it: the map then says nothing itself. */
    const locked = (i: number, how: "tap" | "focus" | "hover"): boolean => {
        const p = place(i);
        if (!p || p.open || !props.onLocked) return false;
        told = { i, how };
        props.onLocked({ place: p, how });
        return true;
    };
    /** A place the page was told about is left: by the pointer, by the keyboard, or by the camera moving. */
    const unlocked = (i?: number, how?: "focus" | "hover"): void => {
        if (!told || !props.onLocked) return;
        if (i !== undefined && (told.i !== i || told.how !== how)) return;
        told = null;
        props.onLocked(null);
    };

    /**
     * The frame a map opens on and comes back to: a child's own region, or every world. A phone's
     * narrow window cannot show the region at a size a child can read, so there it opens on the place
     * the guide stands at, with the ways leading off it.
     */
    const frame = (v: CanvasView): Camera => {
        const n = v.vp.w < 700 ? nodeAt(props.view.layout, focus()) : undefined;
        const r: Rect = n
            ? { x: n.box.x - 520, y: n.box.y - 420, w: n.box.w + 1040, h: n.box.h + 1180 }
            : props.view.frame;
        return fitRect(r, v.vp, 24, v.limits);
    };
    // A page that explicitly asks for every world must fit the country, rather than stop at the
    // interactive map's zoom floor and cut its outer lands off.
    const everything = (v: CanvasView): Camera => fitRect(props.view.layout.core, v.vp, 24);

    /** The camera a backdrop's aim asks for. */
    const aimed = (aim: MapAim): Camera | null => {
        const at = aimedAt(props.view.layout, props.view.here, aim);
        return at && props.aimCamera ? props.aimCamera(at, aim) : null;
    };

    const say = (text: string): void => announce(text);

    /**
     * The place the keyboard is on. Focus moves to it when the map already has it, or when the map
     * has just become the screen a viewer moves between, since the keys are the way round a map with
     * nothing laid over it (.docs/journal.md) and a viewer should not have to find something to tap
     * first. A map laid in a page, the site's section and the backdrops, is never pulled to. The ring
     * round the place follows `:focus-visible`, so a keyboard keeps the mark it steers by and a finger
     * is given no mark it did not ask for.
     */
    function focusNode(i: number, take = false): void {
        const had = (!!host && host.contains(document.activeElement)) || take;
        painted?.nodes.forEach((b, k) => {
            if (b) b.tabIndex = k === i ? 0 : -1;
        });
        if (had) painted?.nodes[i]?.focus({ preventScroll: true });
        painted?.nodes.forEach((b, k) => {
            if (b) b.classList.toggle("focus", had && k === i && b.matches(":focus-visible"));
        });
        setFocus(i);
    }

    /** Whether this map is a screen a viewer moves between, rather than one laid in a page that scrolls. */
    const isScreen = (): boolean => !!props.onGoIn && props.wheel !== false && hud();

    /** Paint what the camera can see, a few milliseconds at a time, until it is all there. */
    function paintNear(): void {
        if (!view || brush) return;
        const step = (): void => {
            brush = 0;
            if (!view) return;
            // a map that pans has a screen's width of country ready round it; a backdrop flies a little and paints as it goes
            const t0 = performance.now(),
                seen = view.visible(props.aim ? 160 : Math.max(view.vp.w, 600)),
                z = view.cam.z;
            const todo = pending.filter(
                (p) =>
                    !p.done &&
                    (!p.piece.minZ || z >= p.piece.minZ) &&
                    intersects(p.piece.rect, seen),
            );
            for (const p of todo) {
                p.done = true;
                p.piece.paint();
                if (performance.now() - t0 > 10) break;
            }
            if (todo.some((p) => !p.done)) brush = window.setTimeout(step, 0);
            else if (!drawn && painted) firstFrame(painted);
        };
        brush = window.setTimeout(step, 0);
    }

    /** The camera the page was last told about, so it hears once when the map moves away from it. */
    let toldAt: Camera | null = null;

    /**
     * Where the places and the buttons are now, in the page's own pixels, for a page that writes beside
     * them. A place wholly off the screen has no rectangle.
     */
    function tellView(): void {
        const v = view,
            h = host;
        if (!v || !h || !props.onView) return;
        toldAt = { ...v.cam };
        props.onView({
            place: (i) => placeRect(i),
            controls: () =>
                [...h.querySelectorAll(".ow-home, .ow-where, .ow-card")].map((e) =>
                    e.getBoundingClientRect(),
                ),
        });
    }

    /**
     * A place's picture in the page's own pixels. Null when the map is not drawn or the place has
     * nothing drawn of it, and, unless `anywhere`, when it is off the screen.
     */
    function placeRect(i: number, anywhere = false): DOMRect | null {
        const v = view,
            h = host;
        if (!v || !h) return null;
        const n = nodeAt(props.view.layout, i);
        if (!n || !place(i)?.shown) return null;
        const r = h.getBoundingClientRect();
        const a = toScreen(v.cam, v.vp, { x: n.box.x, y: n.box.y }),
            b = toScreen(v.cam, v.vp, { x: n.box.x + n.box.w, y: n.box.y + n.box.h });
        if (!anywhere && (b.x < 0 || a.x > r.width || b.y < 0 || a.y > r.height)) return null;
        return new DOMRect(r.left + a.x, r.top + a.y, b.x - a.x, b.y - a.y);
    }

    /** The camera that puts a place's picture where the world it is coming out of left it. */
    function cameraBack(v: CanvasView, back: { place: number; from: DOMRect }): Camera | null {
        const n = nodeAt(props.view.layout, back.place),
            h = host;
        if (!n || !h) return null;
        const r = h.getBoundingClientRect();
        return cameraOn(
            n.box,
            {
                x: back.from.left - r.left,
                y: back.from.top - r.top,
                w: back.from.width,
                h: back.from.height,
            },
            v.vp,
        );
    }

    /** Out of the place the child came back from, to where the map stands, as one pull-back. */
    function rise(v: CanvasView, from: Camera, to: Camera): void {
        const tl = timeline([
            { name: "out", from: 0, to: 1, at: 0, dur: 0.62, ease: easeInOut },
            { name: "fade", from: 0, to: 1, at: 0, dur: 0.22 },
        ]);
        busy = true;
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) {
                    busy = false;
                    return false;
                }
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "out", t)));
                if (host) host.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                busy = false;
                return false;
            },
        }).start();
    }

    /** The camera has left what the page was told: its words go until the map comes to rest again. */
    function moved(cam: Camera): void {
        unlocked();
        if (!toldAt || !props.onView) return;
        if (toldAt.x === cam.x && toldAt.y === cam.y && toldAt.z === cam.z) return;
        toldAt = null;
        props.onView(null);
    }

    /** The first frame is all there: the page hears of it, the day's doings play, and the drawings that travel the country set off once the page is idle. */
    function firstFrame(p: MapPainted): void {
        const first = !drawn;
        drawn = true;
        // the map takes the keyboard as it opens, so the zoom keys, the arrows, Enter and Escape all
        // work from the moment it is shown; the camera does not move for it. With no place chosen the
        // host takes it rather than a place, so nothing is ringed
        if (first && isScreen()) {
            if (chosen()) focusNode(focus(), true);
            else host?.focus({ preventScroll: true });
        }
        props.onDrawn?.();
        p.shown();
        tellView();
        if (!props.life) return;
        void idle().then(() => {
            if (painted !== p || !view) return;
            const v = view;
            riders = p.life(() => v.cam);
        });
    }

    function onFrame(cam: Camera): void {
        if (!view) return;
        moved(cam);
        const s = view.world.style;
        s.setProperty("--mz", String(cam.z));
        s.setProperty("--miz", String(1 / cam.z));
        s.setProperty("--iz", String(1 / cam.z));
        s.setProperty("--mgrow", clamp(0.2 / cam.z, 1, 3.4).toFixed(3));
        view.world.dataset.far = cam.z < 0.12 ? "1" : "";
        // drawn back from the land toward the sea, where its banner and key are too small to read
        // (overworld.css): more than three tenths out from the zoom the land fills the window at
        view.world.dataset.sea = cam.z < frame(view).z * 0.7 ? "1" : "";
        // the waves drift 22 units either way, which is less than a pixel this far out, so they rest there
        view.world.classList.toggle("ow-calm", cam.z * 22 < 1);
        paintNear();
    }

    function arrived(i: number, via?: string): void {
        const n = nodeAt(props.view.layout, i),
            p = place(i);
        if (!n || !p || !painted) return;
        painted.token.classList.toggle("away", i !== props.view.here);
        setChosen(true);
        focusNode(i);
        const name = lower(nameOf(props.view, i));
        const way = via ? `${via.charAt(0).toUpperCase()}${via.slice(1)} to ${name}. ` : "";
        say(`${way}${p.shown?.label ?? ""}${mayEnter(i) && props.onGoIn ? " Enter goes in." : ""}`);
    }

    /**
     * One step along a way, from a place to the one next to it: the guide walks the way and the camera
     * goes with it, lifting a little in the middle so both ends are in view. Under reduced motion it is
     * a cut to the next place.
     */
    function travel(to: number, dur = 1.1, then?: () => void): void {
        const v = view,
            p = painted;
        if (!v || !p || busy) return;
        const from = focus(),
            m = props.view.layout,
            n = m.nodes.length;
        const off = m.sides[Math.max(from, to) - n],
            spur = !!off && off.host === Math.min(from, to);
        if (!spur && Math.abs(to - from) !== 1) {
            travelTo(to);
            return;
        }
        const way = spur && off ? off.road : m.roads[Math.min(from, to)];
        if (!way) return;
        const forward = spur ? to >= n : to > from;
        const z0 = clamp(v.cam.z, 0.1, 0.32);
        const cross = spur && off ? off.i - n : Math.min(from, to);
        const said = spur
            ? (forward ? props.view.country.spurs : props.view.country.spursBack)[cross]
            : (forward ? props.view.country.crossings : props.view.country.back)[cross];
        busy = true;
        host?.setAttribute("data-travel", "on");
        p.ride(way.kind);
        const tl = timeline(
            [{ name: "s", from: 0, to: 1, at: 0, dur, ease: easeInOut }],
            [
                { at: dur / 2, cue: "half" },
                { at: dur, cue: "arrive" },
            ],
        );
        const run = quiet ? collapse(tl) : tl;
        let last = -1;
        const done = (): void => {
            p.token.classList.remove("mid");
            p.ride(null);
            busy = false;
            host?.removeAttribute("data-travel");
            arrived(to, said);
            then?.();
        };
        if (run.length === 0) {
            const end = along(way, forward ? 1 : 0);
            p.place(end, forward ? end.dx : -end.dx);
            v.set({ x: end.x, y: end.y - 120, z: z0 });
            done();
            return;
        }
        const tk = ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                const t = Math.min(time, run.length),
                    s = valueAt(run, "s", t),
                    q = along(way, forward ? s : 1 - s);
                p.place(q, forward ? q.dx : -q.dx);
                v.set({ x: q.x, y: q.y - 120, z: z0 * (1 - 0.3 * Math.sin(Math.PI * s)) });
                if (last < dur / 2 && t >= dur / 2) p.token.classList.add("mid");
                last = t;
                if (t < run.length) return true;
                done();
                return false;
            },
        });
        tk.start();
    }

    /** Travel to any place the viewer may: along the ways a hop at a time when it is near, by air when it is far. */
    function travelTo(target: number): void {
        const v = view,
            p = painted;
        if (!v || !p || busy || target === focus()) return;
        const there = place(target);
        if (!there?.open) {
            // the page explains a locked place in one message of its own, or the map says it itself
            if (locked(target, "tap")) return;
            setCard(there ?? null);
            say(`The way to ${lower(nameOf(props.view, target))} opens as you learn.`);
            return;
        }
        const m = props.view.layout,
            n0 = m.nodes.length,
            off = m.sides[target - n0],
            here = m.sides[focus() - n0];
        if ((off && off.host === focus()) || (here && here.host === target)) {
            travel(target);
            return;
        }
        const hops = off || here ? Infinity : Math.abs(target - focus());
        if (hops > 3) {
            const n = nodeAt(m, target);
            if (!n) return;
            v.flyTo({ x: n.stand.x, y: n.stand.y - 120, z: clamp(v.cam.z, 0.1, 0.32) });
            p.place(n.stand, 1);
            arrived(target);
            return;
        }
        const next = (): void => {
            if (focus() !== target)
                travel(focus() + Math.sign(target - focus()), hops > 1 ? 0.6 : 1.1, next);
        };
        next();
    }

    /**
     * Whether the camera has come to rest inside a place the viewer may go into, far enough in that
     * the place fills the screen: pinching into a world is the way in, as tapping it is.
     */
    function dived(cam: Camera): boolean {
        const v = view,
            i = focus(),
            n = nodeAt(props.view.layout, i);
        if (!v || !n || !props.onGoIn || busy || !mayEnter(i)) return false;
        const covers = n.box.w * cam.z > v.vp.w * 0.62 || n.box.h * cam.z > v.vp.h * 0.62;
        const inside =
            cam.x > n.box.x - n.box.w * 0.3 &&
            cam.x < n.box.x + n.box.w * 1.3 &&
            cam.y > n.box.y - n.box.h * 0.3 &&
            cam.y < n.box.y + n.box.h * 1.3;
        if (!covers || !inside) return false;
        goIn(i);
        return true;
    }

    /**
     * Going into a place from the map: the camera dives into its picture while the map fades, and then
     * the page opens the world, which arrives from its horizon (world.tsx). A cut under reduced motion.
     */
    function goIn(i: number): void {
        const v = view,
            n = nodeAt(props.view.layout, i),
            go = props.onGoIn;
        if (!v || !n || !go || busy) return;
        if (!mayEnter(i)) {
            locked(i, "tap");
            return;
        }
        busy = true;
        if (quiet) {
            go(i, null);
            return;
        }
        const from = { ...v.cam },
            to: Camera = {
                x: n.box.x + n.box.w / 2,
                y: n.box.y + n.box.h * 0.45,
                z: clamp((v.vp.w / n.box.w) * 1.15, 0.2, 0.9),
            };
        // The place is left standing while the map falls away behind it, so what the child tapped is
        // the last thing they see and the world opens where it was (.docs/journal.md).
        const tl = timeline([
            { name: "dive", from: 0, to: 1, at: 0, dur: 0.6, ease: easeInOut },
            { name: "fade", from: 1, to: 0, at: 0.42, dur: 0.24 },
        ]);
        const tk = ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "dive", t)));
                if (host) host.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                go(i, placeRect(i, true));
                return false;
            },
        });
        tk.start();
    }

    function home(): void {
        const v = view;
        if (!v) return;
        setAt("frame");
        v.flyTo(frame(v));
        say(grown() ? "The map." : "Your part of the map. It grows as you go.");
    }

    /**
     * The rect the camera is fenced to. A child's map is the sea, and the sea covers the window at
     * every zoom: the camera's middle keeps far enough inside the sea that its edge never comes into
     * the window, so there is never paper past it on any side, and what the window cannot hold is
     * there to drag to. clampCamera lets a hand drag on until 80 pixels of its rect are left, so it is
     * given the sea drawn in by half the window and by that slack, which puts its two limits exactly
     * half a window inside the sea, meeting in the middle where the window is as wide as the sea. The
     * zoom the last frame drew with stands in for the one being fenced, which the flight's last frames
     * make the same.
     */
    const fenced = (): Rect => {
        const b = boundsOf(props.view);
        const v = view;
        if (!v || (props.view.limits.pan !== "own" && !isScreen())) return b;
        const z = Math.max(v.cam.z, v.limits.min);
        const hx = v.vp.w / (2 * z),
            hy = v.vp.h / (2 * z);
        const gx = Math.max(0, v.vp.w / 2 - 80) / z,
            gy = Math.max(0, v.vp.h / 2 - 80) / z;
        return {
            x: b.x + hx + gx,
            y: b.y + hy + gy,
            w: b.w - 2 * (hx + gx),
            h: b.h - 2 * (hy + gy),
        };
    };

    function showAll(): void {
        const v = view;
        if (!v || props.view.limits.zoomOut !== "everything") return;
        setAt("all");
        v.flyTo(everything(v));
        say(`Every world: ${props.view.layout.nodes.length} of them.`);
    }

    function onKey(e: KeyboardEvent): boolean {
        if (!view) return false;
        if (e.type === "keyup") return false;
        const arrow = ARROWS.find((a) => a === e.key);
        if (arrow && !e.shiftKey) {
            // the arrows walk between the places the viewer may travel to, so one press goes on along
            // the run and one goes back; a place with no way in is reached by Tab or by panning, and
            // says it is not open as it takes the keyboard
            const to = neighbour(props.view.layout, focus(), arrow, (i) => !!place(i)?.open);
            if (to === null) {
                const shut = neighbour(
                    props.view.layout,
                    focus(),
                    arrow,
                    (i) => place(i)?.shown !== null,
                );
                say(
                    shut === null
                        ? `No way that way from ${lower(nameOf(props.view, focus()))}.`
                        : `${nameOf(props.view, shut)} is not open yet.`,
                );
                return true;
            }
            travelTo(to);
            return true;
        }
        if (e.key === "Enter" && !(e.target instanceof Element && e.target.closest("button"))) {
            if (chosen()) goIn(focus());
            return true;
        }
        if (e.key === "Escape") {
            if (card()) setCard(null);
            else home();
            return true;
        }
        if (e.key === "Home") {
            travelTo(0);
            return true;
        }
        // the view's own 0 fits its fence, which on a child's map is the sea drawn in; home is what it means
        if (e.key === "0" && props.view.limits.pan === "own") {
            home();
            return true;
        }
        if (e.key === "t" || e.key === "T") {
            if (props.view.here !== null) travelTo(props.view.here);
            return true;
        }
        return false;
    }

    /** Draw the view into the layer: the ground, the places, the ways and the guide, and wire its buttons. */
    function draw(v: CanvasView): void {
        drawing = drawing.then(() => drawNow(v));
    }

    async function drawNow(v: CanvasView): Promise<void> {
        painted?.stop();
        painted = undefined;
        riders = null;
        drawn = false;
        v.world.replaceChildren();
        v.world.classList.remove("ow");
        pending = [];
        // the painter's code comes with the first map a page draws, not with the page
        const { paintMapView } = await mapPainter();
        if (!host || v !== view) return;
        const p = await paintMapView({
            host,
            world: v.world,
            view: props.view,
            still: quiet,
            pause: props.steps ? () => new Promise((done) => setTimeout(done, 0)) : undefined,
            play: props.play,
            riders: props.life,
            zoom: () => v.cam.z,
        });
        if (v !== view) {
            p.stop();
            return;
        }
        painted = p;
        pending = p.pieces.map((piece) => ({ piece, done: false }));
        p.nodes.forEach((b, i) => {
            if (!b) return;
            b.classList.add("ow-node");
            b.addEventListener("click", () => {
                setCard(null);
                if (focus() === i) {
                    // the first tap on a map with nobody on it chooses the place; the next goes in
                    if (chosen()) goIn(i);
                    else arrived(i);
                    return;
                }
                travelTo(i);
            });
            b.addEventListener("focus", () => locked(i, "focus"));
            b.addEventListener("blur", () => unlocked(i, "focus"));
            b.addEventListener("pointerenter", () => locked(i, "hover"));
            b.addEventListener("pointerleave", () => unlocked(i, "hover"));
        });
        const first =
            props.focus === undefined || props.focus === "all" ? props.view.here : props.focus;
        const start = first ?? 0;
        const n = nodeAt(props.view.layout, start);
        if (n) p.place(n.stand, 1);
        p.token.classList.toggle("away", start !== props.view.here);
        focusNode(start);
        v.limits = zoomLimits(props.view, v.vp, isScreen());
        const c = props.aim ? aimed(props.aim) : null;
        const all = !c && props.focus === "all";
        setAt(all ? "all" : "frame");
        const rest = c ?? (all ? everything(v) : frame(v));
        // Coming back out of a world: the map opens with the place where the world left it and pulls
        // back to where it stands, so the two views are one movement (.docs/journal.md).
        const back = props.arrive && !quiet && !rose ? cameraBack(v, props.arrive) : null;
        rose = true;
        v.set(back ?? rest);
        // a map drawn again after a dive left the host faded out
        if (host) host.style.opacity = back ? "0" : "1";
        if (back) rise(v, back, rest);
        // a backdrop shows the map as it stands; the colour washes out only as a child's own map opens
        if (!props.aim) p.wash();
        setReady(true);
    }

    onMount(() => {
        if (!host) return;
        const v = new CanvasView(host, {
            bounds: () => fenced(),
            frame: (cam) => onFrame(cam),
            key: (e) => onKey(e),
            settle: (cam) => {
                paintNear();
                // pinched into a place until it fills the screen: going in is what that gesture means
                if (dived(cam)) return;
                // what idles is sized for the zoom the camera has come to rest at
                painted?.rescale();
                if (rebuildRiders) {
                    rebuildRiders = false;
                    riders?.rebuild();
                }
                tellView();
            },
            resized: () => {
                // the view measures its host as it is made, which is before `view` is set, so the
                // first size is read by the mount below and this hook takes the changes after it
                const w = view;
                if (!w) return;
                // the floor covers the window with the sea, so it moves with the window
                w.limits = zoomLimits(props.view, w.vp, isScreen());
                if (w.cam.z < w.limits.min) w.set({ ...w.cam, z: w.limits.min });
                const c = props.aim ? aimed(props.aim) : null;
                if (c && ready()) w.set(c);
                tellView();
            },
        });
        view = v;
        // a page that scrolls past the map leaves it the wheel, and so does a backdrop, which nothing reaches
        if (props.wheel === false || !hud()) v.takesWheel = false;
        draw(v);
    });
    createEffect(
        on(
            () => props.view,
            () => {
                if (view) draw(view);
            },
            { defer: true },
        ),
    );
    createEffect(
        on(
            () => props.aim,
            (aim) => {
                const v = view;
                const c = v && aim && ready() ? aimed(aim) : null;
                if (!v || !c) return;
                rebuildRiders = true;
                v.flyTo(c, 1400);
            },
            { defer: true },
        ),
    );
    createEffect(
        on(
            () => props.focus,
            (f) => {
                const v = view;
                if (!v || !ready()) return;
                if (f === "all") showAll();
                else if (typeof f === "number") {
                    if (Math.abs(f - focus()) === 1) travel(f);
                    else travelTo(f);
                }
            },
            { defer: true },
        ),
    );
    onCleanup(() => {
        clearTimeout(brush);
        painted?.stop();
        view?.stop();
        // a settle or a frame still on its way finds no map to move
        view = undefined;
    });

    const where = (): string => {
        const p = place(focus());
        return p?.shown ? nameOf(props.view, focus()) : "";
    };
    return (
        <section
            ref={(el) => {
                host = el;
            }}
            class={`ow-host${props.class ? ` ${props.class}` : ""}`}
            classList={{ ready: ready() }}
            aria-label={props.title}
            data-travel-limit={props.view.limits.travel}
            inert={!hud()}
        >
            <Show when={hud()}>
                <h1 class="sr">{props.title}</h1>
                {/* A child's map says where they are in the guide's line and in the place's own
                    lettering, so the chip is only for a viewer reading the whole country (18 September 2026). */}
                <Show when={grown() && chosen()}>
                    <p class="hud ow-where" aria-hidden="true">
                        {where()}
                    </p>
                </Show>
                <div class="hud ow-home">
                    <Show when={props.view.here !== null && focus() !== props.view.here}>
                        <button
                            type="button"
                            class="ow-btn"
                            onClick={() => {
                                if (props.view.here !== null) travelTo(props.view.here);
                            }}
                        >
                            Where I am
                        </button>
                    </Show>
                    <Show when={props.view.limits.zoomOut === "everything"}>
                        <button
                            type="button"
                            class="ow-btn"
                            onClick={() => (at() === "all" ? home() : showAll())}
                        >
                            {at() === "all" ? "This year" : "Every world"}
                        </button>
                    </Show>
                </div>
                <Show when={card()}>
                    {(c) => (
                        <div class="hud ow-card" role="note">
                            <p class="ow-card-name">{c().shown?.name ?? ""}</p>
                            <p>The way here opens as you learn.</p>
                            <button type="button" class="ow-btn" onClick={() => setCard(null)}>
                                Back to the map
                            </button>
                        </div>
                    )}
                </Show>
            </Show>
        </section>
    );
}
