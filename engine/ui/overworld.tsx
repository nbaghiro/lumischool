import { sceneWork } from "./scene-work";
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
    visibleRect,
    type Arrow,
    type Camera,
    type MapAim,
    type MapPlace,
    type PlaceState,
    type MapView,
    type Rect,
} from "../space";
import { Drawing, idle, still } from "./art";
import type { MapPainted } from "./map";
import { announce } from "./say";
import type { CanvasView } from "./view";
import { mapPainter } from "./painters";
import type { Flying } from "./flight";
import { mapEvent, mapHook, mapVariant } from "./map-diagnostics";
import { claim, hold, release } from "./handoff";
import { readTokens } from "./read-tokens";
import { smallDevice } from "./device";

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
/** The states a place is drawn lit in (overworld.css), which a map whose goIn is "lit" may go into. */
const LIT: ReadonlySet<PlaceState> = new Set(["done", "here", "begun"]);

const ARROWS: readonly Arrow[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

interface Pending {
    piece: MapPainted["pieces"][number];
    done: boolean;
    release?: () => void;
    /** Painted to be drawn from afar, and kept until it has been (`warm`). */
    warming?: boolean;
}

/**
 * The map a page last drew, kept off the page when the page leaves it for a world, so coming back to
 * the same view takes it up again already painted and drawn rather than painting it anew.
 */
let parked: {
    key: string;
    painted: MapPainted;
    source: HTMLElement;
    overlay: HTMLElement;
    pending: Pending[];
    /** The place the page went into and where the camera stood before the dive, which it rises back to. */
    left: { place: number; cam: Camera } | null;
    expiry: ReturnType<typeof setTimeout>;
} | null = null;
/** The maps whose places have been painted and drawn from afar once (`warm`). */
const warmed = new WeakSet<MapPainted>();
/** How long a parked map is kept for a page that does not come back to it. */
const KEPT = 10 * 60_000;
/**
 * The longest the map waits for its view to be painted and drawn before rising out of a world, in ms;
 * what is not drawn by then fades in as it rises rather than holding the page still.
 */
const RISE_WAITS = 150;

const unpark = (): void => {
    if (!parked) return;
    release(false, "map");
    clearTimeout(parked.expiry);
    parked.painted.stop();
    parked = null;
};

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

/** The overview fits every region; the initial frame remains close to the child. */
const zoomLimits = (view: MapView, vp: { w: number; h: number }): { min: number; max: number } => ({
    min: Math.min(
        0.028,
        Math.max(1, vp.w - 48) / view.layout.core.w,
        Math.max(1, vp.h - 48) / view.layout.core.h,
    ),
    max: 0.9,
});

export function Overworld(props: {
    view: MapView;
    /**
     * Where the guide stands and the camera looks, whenever it changes: a place's index, or "all" for
     * every world, or "overview" for a closer atlas view. Left out, the guide stands where
     * the view says the child is.
     */
    focus?: number | "all" | "overview";
    /** The map takes the wheel to zoom, unless the page around it scrolls. */
    wheel?: boolean;
    /**
     * With it, a place the viewer may go into has a Go in button. The map dives into the place first
     * and hands back where its picture ended on the screen, so the page can open the world there and
     * the two views read as one movement; null when the map cut, under reduced motion.
     */
    onGoIn?: (place: number, at: DOMRect | null) => void;
    /** Intent to visit a place, early enough to prepare its real lessons behind the map. */
    onApproach?: (place: number) => void;
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
    /** What the map's note says of a place it will not go into, in place of the child's "opens as you learn". */
    shut?: string;
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
    /**
     * The zoom the words on the map are sized for rather than the camera's: a backdrop gives its
     * snapshot's, so the words grow with the map as the still's do, whatever the width of its box.
     */
    wordsAt?: number;
    /**
     * The page's framing of the aim, measured again as its cards come and move (backdrop.tsx): a new
     * one puts the camera where `aimCamera` now says, at once while the map is not yet shown and with
     * a short glide once it is.
     */
    reframe?: { key: string; glide: boolean };
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
    let disposed = false;
    let flying: Flying | null = null;
    let loadingFlight = false;
    let view: CanvasView | undefined;
    let painted: MapPainted | undefined;
    /** Where the painted map is kept for the GPU, off the page's layout. */
    let source: HTMLElement | undefined;
    let pending: Pending[] = [];
    let overlay: HTMLElement | undefined;
    /** What the map was painted from, which a parked map must match to be taken up again. */
    let paintKey = "";
    let listening: AbortController | undefined;
    let brush = 0;
    /** The idle work painting every place for the view of the whole country, once a map is shown. */
    let warming = 0;
    /**
     * A movement is under way, or the map has gone into a place and is done: it stays busy from then
     * on, since the page is opening the world. Without that the settle after the dive, on a camera
     * resting inside the place, counted as a pinch in and went in again every 0.8 s.
     */
    let busy = false;
    /** Taken down to go into a world, so held on the screen until the world has drawn (handoff.ts). */
    let entering = false;
    /** The place this map dived into and where its camera stood before, for the map it parks as. */
    let left: { place: number; cam: Camera } | null = null;
    // a roll held over the page as it goes waits for this map to draw (handoff.ts)
    claim();
    let drawn = false;
    let settling = false;
    /** The pull-back out of a world runs once, on the first map this page draws, and never on a redraw. */
    let rose = false;
    let riders: { rebuild(): void } | null = null;
    let rebuildRiders = false;
    /** Draws run one after another, so a view that changes while its first frame is painted in steps never paints over the next. */
    let drawing = false;
    let requested = 0;
    let completed = 0;
    let model = "";
    const quiet = still() || mapVariant === "no-motion";
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
    const [failed, setFailed] = createSignal(false);

    const place = (i: number): MapPlace | undefined => props.view.places[i];
    const grown = (): boolean => props.view.limits.travel === "everywhere";
    const mayEnter = (i: number): boolean => {
        const p = place(i);
        return (
            !!p &&
            p.open &&
            props.view.limits.goIn !== "none" &&
            (props.view.limits.goIn !== "lit" || LIT.has(p.state)) &&
            p.state !== "next" &&
            p.state !== "behind"
        );
    };
    /** A place with no way in is explained: by the page, or by the map's own note and its voice. */
    const explain = (i: number): void => {
        if (locked(i, "tap")) return;
        setCard(place(i) ?? null);
        say(props.shut ?? `The way to ${lower(nameOf(props.view, i))} opens as you learn.`);
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

    const nearPlace = (v: CanvasView, i: number): Camera | null => {
        const n = nodeAt(props.view.layout, i);
        if (!n) return null;
        const w = v.vp.w < 700 ? 4200 : 8400;
        const h = 5600;
        return fitRect(
            { x: n.box.x + n.box.w / 2 - w / 2, y: n.box.y + n.box.h / 2 - h / 2, w, h },
            v.vp,
            24,
            v.limits,
        );
    };

    const frame = (v: CanvasView): Camera => {
        const returning = typeof props.focus === "number" ? props.focus : props.arrive?.place;
        const selected = returning === undefined ? null : nearPlace(v, returning);
        if (selected) return selected;
        const n = v.vp.w < 700 ? nodeAt(props.view.layout, focus()) : undefined;
        const r: Rect = n
            ? { x: n.box.x - 520, y: n.box.y - 420, w: n.box.w + 1040, h: n.box.h + 1180 }
            : props.view.frame;
        return fitRect(r, v.vp, 24, v.limits);
    };
    // A page that explicitly asks for every world must fit the country, rather than stop at the
    // interactive map's zoom floor and cut its outer lands off.
    const everything = (v: CanvasView): Camera => fitRect(props.view.layout.core, v.vp, 24);
    const overview = (v: CanvasView): Camera => {
        const c = everything(v);
        return { ...c, y: c.y - props.view.layout.core.h * 0.04, z: c.z * 1.3 };
    };

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
        const step = (deadline: number): void => {
            brush = 0;
            if (!view) return;
            // painted a window ahead each way, as far as the scene draws ahead (map-scene.ts), so a
            // pan meets pieces already drawn; let go of only twice as far, so crossing an edge does
            // not paint a piece again
            const margin = props.aim
                    ? 160
                    : Math.max(view.vp.w, view.vp.h) * (smallDevice ? 0.5 : 1),
                seen = view.visible(margin),
                keep = view.visible(margin * 2),
                z = view.cam.z;
            // where a flight is going is painted as it sets off, first, so it is drawn by the time the
            // camera is there, and nothing is let go of on the way (.docs/map-smoothness-plan.md, phase 3)
            const to = view.heading ?? flying?.ahead() ?? null;
            const there = to
                ? visibleRect(to, { w: view.vp.w + margin * 2, h: view.vp.h + margin * 2 })
                : null;
            const ahead = (p: Pending): boolean =>
                !!there &&
                !!to &&
                (!p.piece.minZ || to.z >= p.piece.minZ) &&
                intersects(p.piece.rect, there);
            for (const p of pending) {
                if (
                    p.release &&
                    !p.warming &&
                    !to &&
                    !flying &&
                    (!intersects(p.piece.rect, keep) || z < (p.piece.minZ ?? 0) * 0.85)
                ) {
                    p.release();
                    p.release = undefined;
                    p.done = false;
                }
            }
            const todo = pending.filter(
                (p) =>
                    !p.done &&
                    (((!p.piece.minZ || z >= p.piece.minZ) && intersects(p.piece.rect, seen)) ||
                        ahead(p)),
            );
            const distance = (rect: Rect): number =>
                Math.hypot(
                    rect.x + rect.w / 2 - (view?.cam.x ?? 0),
                    rect.y + rect.h / 2 - (view?.cam.y ?? 0),
                );
            todo.sort(
                (a, b) =>
                    Number(ahead(b)) - Number(ahead(a)) ||
                    (b.piece.priority ?? 0) - (a.piece.priority ?? 0) ||
                    distance(a.piece.rect) - distance(b.piece.rect),
            );
            for (const p of todo) {
                p.done = true;
                p.release = p.piece.paint() ?? undefined;
                if (performance.now() >= deadline) break;
            }
            if (todo.some((p) => !p.done)) brush = sceneWork.schedule(step);
            else if (!drawn && painted && !settling) {
                // the snapshot under the map stays until the canvas holds everything it stands in for
                const p = painted;
                settling = true;
                void p.settled().then(() => {
                    settling = false;
                    if (painted === p && !drawn) firstFrame(p);
                });
            }
        };
        brush = sceneWork.schedule(step);
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
                [...h.querySelectorAll(".ow-home, .ow-card")].map((e) => e.getBoundingClientRect()),
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
    function rise(v: CanvasView, from: Camera, to: Camera, fade: boolean): void {
        const tl = timeline([
            { name: "out", from: 0, to: 1, at: 0, dur: 0.62, ease: easeInOut },
            { name: "fade", from: 0, to: 1, at: 0, dur: 0.22 },
        ]);
        busy = true;
        v.locked = true;
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) {
                    busy = false;
                    return false;
                }
                const t = Math.min(time, tl.length);
                v.setNow(cameraBetween(from, to, valueAt(tl, "out", t)));
                if (host && fade) host.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                busy = false;
                v.locked = false;
                painted?.scene.hold(null);
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
        const active = document.activeElement;
        // Finishing a background paint must not steal focus from a menu or form already in use.
        if (
            first &&
            isScreen() &&
            (!active || active === document.body || host?.contains(active))
        ) {
            if (chosen()) focusNode(focus(), true);
            else host?.focus({ preventScroll: true });
        }
        props.onDrawn?.();
        p.shown();
        tellView();
        if (first) void idle().then(() => warm(p));
        if (!props.life) return;
        void idle().then(() => {
            if (painted !== p || !view) return;
            const v = view;
            riders = p.life(() => v.cam);
        });
    }

    /**
     * Every place is painted in idle moments once the map is shown, and drawn at the size the whole
     * country shows it, so drawing back to every world finds them drawn; painted again as the camera
     * comes to them, they are found by their markup (map-scene.ts). Until then none is let go of.
     */
    function warm(p: MapPainted): void {
        const v = view;
        // a map come back to was warmed already, and one nobody goes into worlds from (a page's
        // journey, a backdrop) is not drawn back from, so has nothing to warm
        if (!v || painted !== p || mapVariant === "terrain" || warmed.has(p) || !props.onGoIn)
            return;
        warmed.add(p);
        const places = pending.filter((q) => (q.piece.priority ?? 0) >= 1);
        const step = (deadline: number): void => {
            warming = 0;
            if (painted !== p || view !== v) return;
            for (const q of places) {
                if (q.done) continue;
                q.done = q.warming = true;
                q.release = q.piece.paint() ?? undefined;
                if (performance.now() >= deadline) break;
            }
            if (places.some((q) => !q.done)) {
                warming = sceneWork.schedule(step);
                return;
            }
            void p.prepare(everything(v)).then(() => {
                for (const q of places) q.warming = false;
            });
        };
        warming = sceneWork.schedule(step);
    }

    let styledZoom = NaN;
    function onFrame(cam: Camera): void {
        if (!view) return;
        painted?.frame(cam, view.vp, view.heading ?? flying?.ahead() ?? null);
        moved(cam);
        setAt(cam.z <= everything(view).z * 1.4 ? "all" : "frame");
        // Inherited variables invalidate every drawing; panning must not rewrite them each frame.
        const z = Math.round((props.wordsAt ?? cam.z) * 10000) / 10000;
        if (z !== styledZoom && z > 0) {
            styledZoom = z;
            const sea = z < frame(view).z * 0.7;
            for (const w of source ? [view.world, source] : [view.world]) {
                const s = w.style;
                s.setProperty("--mz", String(z));
                s.setProperty("--miz", String(1 / z));
                s.setProperty("--iz", String(1 / z));
                s.setProperty("--mgrow", clamp(0.2 / z, 1, 3.4).toFixed(3));
                // written only when they change, since the scene reads every write to its source as a change
                // only lifted words hide far out, and they are in the world's layer, not the source
                const far = z < 0.12 ? "1" : "";
                if (w !== source && w.dataset.far !== far) w.dataset.far = far;
                // drawn back from the land toward the sea, where its banner and key are too small to read
                // (overworld.css): more than three tenths out from the zoom the land fills the window at
                if (w.dataset.sea !== (sea ? "1" : "")) w.dataset.sea = sea ? "1" : "";
                // the waves drift 22 units either way, which is less than a pixel this far out, so they rest there
                const calm = z * 22 < 1;
                if (w.classList.contains("ow-calm") !== calm) w.classList.toggle("ow-calm", calm);
            }
        }
        paintNear();
    }

    function arrived(i: number, via?: string): void {
        const n = nodeAt(props.view.layout, i),
            p = place(i);
        if (!n || !p || !painted) return;
        if (mayEnter(i)) props.onApproach?.(i);
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
        props.onApproach?.(to);
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
            if (later !== undefined && !busy) goFocus(later);
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
                v.setNow({ x: q.x, y: q.y - 120, z: z0 * (1 - 0.3 * Math.sin(Math.PI * s)) });
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
            explain(target);
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
        if (!v || !n || !props.onGoIn || busy || flying || !mayEnter(i)) return false;
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
            explain(i);
            return;
        }
        props.onApproach?.(i);
        busy = true;
        // the dive has the camera from here, and the world opens where the place is
        v.locked = true;
        if (quiet) {
            // the map stays on the screen as it is taken down, until the world has drawn (handoff.ts);
            // taken down before it has asked for the world, it goes with nothing held
            entering = true;
            go(i, null);
            return;
        }
        const from = { ...v.cam },
            to: Camera = {
                x: n.box.x + n.box.w / 2,
                y: n.box.y + n.box.h * 0.45,
                z: clamp((v.vp.w / n.box.w) * 1.15, 0.2, 0.9),
            };
        // the world covers the map by the dive's end, so nothing is drawn sharper for it, and the map
        // parks with the pixels of where it stood, which is where it rises back to
        painted?.scene.hold(from.z);
        left = { place: i, cam: from };
        // The map dives into the place and is held there while the world is drawn, then fades out over
        // it, so what the child tapped is the last thing they see and the world opens where it was
        // (.docs/journal.md).
        const tl = timeline([{ name: "dive", from: 0, to: 1, at: 0, dur: 0.45, ease: easeInOut }]);
        const tk = ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (disposed || view !== v) return false;
                const t = Math.min(time, tl.length);
                v.setNow(cameraBetween(from, to, valueAt(tl, "dive", t)));
                if (t < tl.length) return true;
                entering = true;
                go(i, placeRect(i, true));
                return false;
            },
        });
        tk.start();
    }

    async function startFly(): Promise<void> {
        const v = view,
            p = painted,
            h = host;
        if (!v || !p || !h || busy || flying || loadingFlight || !props.view.limits.fly) return;
        const from =
            props.view.landings.find((f) => f.node === focus())?.node ??
            props.view.landings[0]?.node;
        if (from === undefined) return;
        loadingFlight = true;
        let start: typeof import("./flight").fly;
        try {
            start = (await import("./flight")).fly;
        } catch {
            say("Flying could not load. Please try Fly again.");
            return;
        } finally {
            loadingFlight = false;
            queueMicrotask(() => void drain(v));
        }
        if (view !== v || painted !== p || busy) return;
        setCard(null);
        v.stop();
        p.token.classList.add("flying");
        mapEvent(0, "flight-start");
        flying = start({
            view: v,
            layer: source ?? v.world,
            hud: h,
            host: h,
            t: readTokens(h),
            mapView: props.view,
            zoom: () => nearPlace(v, from)?.z ?? v.cam.z,
            from,
            to: null,
            still: still(),
            say,
            landed: (i) => {
                const n = nodeAt(props.view.layout, i);
                if (n) p.place(n.stand, 1);
                arrived(i);
                const camera = nearPlace(v, i);
                if (camera) v.flyTo(camera);
                focusNode(i, true);
            },
            ended: () => {
                mapEvent(0, "flight-stop");
                flying = null;
                p.token.classList.remove("flying");
                void drain(v);
            },
        });
    }

    function home(): void {
        const v = view;
        if (!v || busy) return;
        setAt("frame");
        v.flyTo(nearPlace(v, chosen() ? focus() : (props.view.here ?? focus())) ?? frame(v));
        say(grown() ? "The map." : "Your part of the map. It grows as you go.");
    }

    /**
     * The rect the camera is fenced to. A child's map is the sea, and the sea covers the window at
     * every zoom: the camera's middle keeps far enough inside the sea that its edge never comes into
     * the window, so there is never paper past it on any side, and what the window cannot hold is
     * there to drag to. clampCamera lets a hand drag on until 80 pixels of its rect are left, so it is
     * given the sea drawn in by half the window and by that slack, which puts its two limits exactly
     * half a window inside the sea, meeting in the middle where the window is as wide as the sea. The
     * destination zoom determines its bounds, including before a flight begins.
     */
    const fenced = (camera: Camera): Rect => {
        const b = boundsOf(props.view);
        const v = view;
        if (!v || (props.view.limits.pan !== "own" && !isScreen())) return b;
        const z = Math.max(camera.z, v.limits.min);
        const hx = Math.min(b.w / 2, v.vp.w / (2 * z)),
            hy = Math.min(b.h / 2, v.vp.h / (2 * z));
        const gx = Math.max(0, v.vp.w / 2 - 80) / z,
            gy = Math.max(0, v.vp.h / 2 - 80) / z;
        return {
            x: b.x + hx + gx,
            y: b.y + hy + gy,
            w: b.w - 2 * (hx + gx),
            h: b.h - 2 * (hy + gy),
        };
    };

    /** A focus the page gave while the guide was walking, taken up when the walk ends so the map ends where the page is. */
    let later: typeof props.focus;
    function goFocus(f: typeof props.focus): void {
        const v = view;
        if (!v || !ready()) return;
        later = undefined;
        if (busy) {
            later = f;
            return;
        }
        if (f === "all") showAll();
        else if (f === "overview") v.flyTo(overview(v));
        else if (typeof f === "number") {
            const back = at() === "all";
            setAt("frame");
            if (f === focus()) {
                // back from every world to where the guide stands
                if (back) v.flyTo(frame(v));
            } else if (Math.abs(f - focus()) === 1) travel(f);
            else travelTo(f);
        }
    }

    function showAll(): void {
        const v = view;
        if (!v || busy || props.view.limits.zoomOut !== "everything") return;
        setAt("all");
        v.flyTo(everything(v));
        say(`Every world: ${props.view.layout.nodes.length} of them.`);
    }

    function onKey(e: KeyboardEvent): boolean {
        if (!view) return false;
        if (flying) return flying.key(e);
        if (e.key === "Enter" && e.repeat) return true;
        if (e.key.toLowerCase() === "p" && props.view.limits.fly) {
            void startFly();
            return true;
        }
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
        requested++;
        mapEvent(0, "model-request", requested);
        void drain(v);
    }

    async function drain(v: CanvasView): Promise<void> {
        if (drawing || flying || loadingFlight || disposed) return;
        drawing = true;
        try {
            while (completed !== requested && !disposed && !flying && !loadingFlight) {
                const revision = requested;
                const next = props.view;
                const key = JSON.stringify(next);
                if (key !== model && !(await drawNow(v, next, revision, key))) {
                    if (flying || loadingFlight || disposed) break;
                    continue;
                }
                if (revision === requested) model = key;
                completed = revision;
            }
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            drawing = false;
        }
    }

    /** Paints the pieces in view into a map to come, a few milliseconds at a time, before it is shown. */
    function paintIn(v: CanvasView, pieces: Pending[], at?: Camera): Promise<void> {
        return new Promise((done) => {
            const margin = Math.min(256, Math.max(v.vp.w, v.vp.h) / 2),
                seen = at
                    ? visibleRect(at, { w: v.vp.w + margin * 2, h: v.vp.h + margin * 2 })
                    : v.visible(margin),
                z = (at ?? v.cam).z;
            const todo = pieces.filter(
                (q) => (!q.piece.minZ || z >= q.piece.minZ) && intersects(q.piece.rect, seen),
            );
            const step = (deadline: number): void => {
                if (disposed) {
                    done();
                    return;
                }
                while (todo.length) {
                    const q = todo.shift();
                    if (!q) break;
                    q.done = true;
                    q.release = q.piece.paint() ?? undefined;
                    if (performance.now() >= deadline) break;
                }
                if (todo.length) sceneWork.schedule(step);
                else done();
            };
            sceneWork.schedule(step);
        });
    }

    async function drawNow(
        v: CanvasView,
        next: MapView,
        revision: number,
        viewKey: string,
    ): Promise<boolean> {
        const { paintMapView } = await mapPainter();
        if (!host || disposed || v !== view || revision !== requested) return false;
        const key = `${viewKey}|${props.play ?? ""}|${quiet}|${!!props.life}|${!!props.steps}`;
        // only a map worlds are gone into from parks, and only such a map takes up or lets go of the
        // one parked, so a page's own ground drawn meanwhile leaves the child's map where it waits
        const parks = !!props.onGoIn;
        const kept = parks && parked?.key === key ? parked : null;
        if (kept) {
            clearTimeout(kept.expiry);
            parked = null;
            // a map still held over the page as it is taken up again is parked first, then moved here
            release(false, "map");
        } else if (parks) unpark();
        const replacement = kept?.source ?? document.createElement("div");
        replacement.className = "ow ow-source";
        const layer = kept?.overlay ?? document.createElement("div");
        layer.className = "ow-over";
        host.append(replacement);
        // a map painted again under the one on screen, as after a lesson, is drawn with its scene, so
        // what the two share is drawn once (.docs/map-smoothness-plan.md, phase 2)
        const handing = !kept && painted ? painted : null;
        const p =
            kept?.painted ??
            (await paintMapView({
                host,
                world: replacement,
                overlay: layer,
                under: v.frame,
                view: next,
                still: quiet,
                pause: props.steps ? () => new Promise((done) => setTimeout(done, 0)) : undefined,
                play: props.play,
                riders: props.life,
                zoom: () => v.cam.z,
                ...(handing ? { scene: handing.scene } : {}),
            }));
        if (kept) p.unpark(host, v.frame);
        const gone = (): boolean =>
            disposed || v !== view || revision !== requested || !!flying || loadingFlight;
        if (gone()) {
            p.stop();
            replacement.remove();
            return false;
        }
        let prepared: Pending[] | null = null;
        if (handing) {
            prepared = (mapVariant === "terrain" ? [] : p.pieces).map((piece) => ({
                piece,
                done: false,
            }));
            await paintIn(v, prepared);
            await p.prepare(v.cam);
            if (gone() || painted !== handing) {
                for (const q of prepared) q.release?.();
                p.stop();
                replacement.remove();
                return false;
            }
            handing.handOver();
            p.take();
        }
        const replacing = !!painted;
        sceneWork.cancel(brush);
        sceneWork.cancel(warming);
        brush = 0;
        for (const piece of pending) piece.release?.();
        painted?.stop();
        riders = null;
        drawn = false;
        mapEvent(0, "model-swap", revision);
        source?.remove();
        source = replacement;
        overlay = layer;
        paintKey = key;
        v.world.replaceChildren(layer);
        v.world.classList.add("ow");
        painted = p;
        styledZoom = NaN;
        pending =
            kept?.pending ??
            prepared ??
            (mapVariant === "terrain" ? [] : p.pieces).map((piece) => ({
                piece,
                done: false,
            }));
        p.frame(v.cam, v.vp);
        listening?.abort();
        listening = new AbortController();
        const signal = listening.signal;
        p.nodes.forEach((b, i) => {
            if (!b) return;
            b.classList.add("ow-node");
            b.addEventListener(
                "click",
                () => {
                    setCard(null);
                    if (busy || flying || loadingFlight) return;
                    if (!place(i)?.open) {
                        explain(i);
                        return;
                    }
                    const camera = nearPlace(v, i);
                    const n = nodeAt(props.view.layout, i);
                    if (!camera || !n) return;
                    if (focus() === i && chosen() && v.cam.z >= camera.z * 0.9) {
                        goIn(i);
                        return;
                    }
                    // A map click frames its destination directly; keyboard travel follows the ways.
                    setAt("frame");
                    v.flyTo(camera, 1100);
                    p.place(n.stand, 1);
                    arrived(i);
                },
                { signal },
            );
            for (const [event, how] of [
                ["focus", "focus"],
                ["pointerenter", "hover"],
            ] as const)
                b.addEventListener(
                    event,
                    () => {
                        locked(i, how);
                        if (mayEnter(i)) props.onApproach?.(i);
                    },
                    { signal },
                );
            b.addEventListener("blur", () => unlocked(i, "focus"), { signal });
            b.addEventListener("pointerleave", () => unlocked(i, "hover"), { signal });
        });
        const first = replacing
            ? focus()
            : typeof props.focus === "number"
              ? props.focus
              : props.view.here;
        const start = first ?? 0;
        const n = nodeAt(props.view.layout, start);
        if (n) p.place(n.stand, 1);
        p.token.classList.toggle("away", start !== props.view.here);
        focusNode(start);
        v.limits = zoomLimits(props.view, v.vp);
        const c = props.aim ? aimed(props.aim) : null;
        const all = !c && props.focus === "all";
        setAt(all ? "all" : "frame");
        // back from the place it went into, the map rises to where it stood, which it kept drawn
        const stood =
            !c && props.arrive && kept?.left?.place === props.arrive.place ? kept.left.cam : null;
        const rest =
            c ??
            stood ??
            (all ? everything(v) : props.focus === "overview" ? overview(v) : frame(v));
        // Coming back out of a world: the map opens with the place where the world left it and pulls
        // back to where it stands, so the two views are one movement (.docs/journal.md).
        const back = props.arrive && !quiet && !rose ? cameraBack(v, props.arrive) : null;
        rose = true;
        v.set(replacing ? v.cam : (back ?? rest));
        // the rise draws as sharp as where it ends, whose pixels the map kept, and asks for nothing
        // at the zooms it passes through; a map that opens otherwise draws for its own camera
        p.scene.hold(back ? rest.z : null);
        // a map kept while the child was in a world draws where it opens under the roll held over
        // it, and the roll fades off it as it rises; one drawn afresh fades in as the roll fades out
        const ready = !!kept && !!back;
        if (ready) {
            // where it rises to, which shows the most of the map; where it rises from is the same
            // drawings magnified under the roll fading off it
            await Promise.race([
                (async () => {
                    await paintIn(v, pending, rest);
                    await p.prepare(rest);
                })(),
                new Promise((done) => setTimeout(done, RISE_WAITS)),
            ]);
            // only a map that has gone gives up the way back; a newer view come in meanwhile is
            // painted under this one as the map rises, as any view given again is
            if (disposed || v !== view) {
                release(false, "roll");
                return false;
            }
        }
        if (!replacing) release(true);
        if (host) host.style.opacity = back && !ready ? "0" : "1";
        if (back) rise(v, back, rest, !ready);
        // a backdrop shows the map as it stands; the colour washes out only as a child's own map opens
        if (!props.aim && !kept) p.wash();
        setReady(true);
        return true;
    }

    async function mount(): Promise<void> {
        const { CanvasView } = await mapPainter();
        if (!host || disposed) return;
        const v = new CanvasView(host, {
            // the squared paper is drawn by the map's GPU, under the terrain
            paper: false,
            bounds: (camera) => fenced(camera),
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
                styledZoom = NaN;
                // the floor covers the window with the sea, so it moves with the window
                w.limits = zoomLimits(props.view, w.vp);
                if (w.cam.z < w.limits.min) w.set({ ...w.cam, z: w.limits.min });
                const c = props.aim ? aimed(props.aim) : null;
                if (ready()) {
                    if (c) w.set(c);
                    else if (at() === "all") w.set(everything(w));
                }
                tellView();
            },
        });
        view = v;
        // a page that scrolls past the map leaves it the wheel, and so does a backdrop, which nothing reaches
        if (props.wheel === false || !hud()) v.takesWheel = false;
        draw(v);
        // the suite paints the same view again, as a record read again after a lesson paints it
        mapHook("mapRedraw", () => {
            if (view !== v || disposed) return;
            model = "";
            draw(v);
        });
        // the bake (tools/scripts/art-bake.ts) paints every piece that shows this close and has the
        // scene draw all of it at `t` pixels to a unit, and asks which worlds to open
        mapHook("mapBake", async (t = 1) => {
            const p = painted;
            if (view !== v || disposed || !p) return;
            for (const q of pending) {
                const shows = !q.piece.minZ || t >= q.piece.minZ;
                if (shows && !q.done) {
                    q.done = true;
                    q.release = q.piece.paint() ?? undefined;
                } else if (!shows && q.release) {
                    q.release();
                    q.release = undefined;
                    q.done = false;
                }
            }
            await p.scene.bake(t);
        });
        mapHook("mapWorlds", () => [
            ...new Set(props.view.places.flatMap((p) => (p.shown?.world ? [p.shown.world] : []))),
        ]);
    }
    onMount(() => {
        void mount().catch(() => setFailed(true));
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
            () => props.reframe,
            (r) => {
                const v = view;
                const c = v && r && props.aim && ready() ? aimed(props.aim) : null;
                if (!v || !c || !r) return;
                if (r.glide) v.flyTo(c, 600);
                else v.set(c);
            },
            { defer: true },
        ),
    );
    createEffect(
        on(
            () => props.focus,
            (f) => goFocus(f),
            { defer: true },
        ),
    );
    onCleanup(() => {
        disposed = true;
        sceneWork.cancel(brush);
        sceneWork.cancel(warming);
        flying?.stop();
        listening?.abort();
        if (painted && source && overlay && props.onGoIn) {
            // a page going into a world comes back to this map, so it waits drawn rather than going
            unpark();
            const p = painted,
                s = source,
                o = overlay,
                v = view;
            // the view holds the words over the canvas, so a map held over the page keeps it until it goes
            const park = (): void => {
                p.park();
                s.remove();
                o.remove();
                v?.dispose();
            };
            parked = {
                key: paintKey,
                painted,
                source,
                overlay,
                pending,
                left,
                expiry: setTimeout(unpark, KEPT),
            };
            // held over the page however the page goes to a world, the dive's own going in known to be
            // taken over, and any other claimed by the world as it comes, or let go if none does
            if ((entering || drawn) && host) hold(host, "map", park, { claimed: entering });
            else park();
        } else {
            for (const p of pending) p.release?.();
            painted?.stop();
            source?.remove();
            view?.dispose();
        }
        pending = [];
        // a settle or a frame still on its way finds no map to move
        view = undefined;
    });

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
            <Show when={failed() && hud()}>
                <output class="hud ow-card">
                    <p>The map could not finish loading.</p>
                    <button
                        type="button"
                        class="ow-btn"
                        onClick={() => {
                            setFailed(false);
                            if (view) draw(view);
                            else void mount().catch(() => setFailed(true));
                        }}
                    >
                        Try again
                    </button>
                </output>
            </Show>
            <Show when={hud()}>
                <h1 class="sr">{props.title}</h1>
                <fieldset class="hud ow-home">
                    <legend class="sr">Map controls</legend>
                    <Show when={props.view.limits.fly && props.view.landings.length > 0 && ready()}>
                        <button
                            type="button"
                            class="ow-btn"
                            onClick={startFly}
                            aria-label="Fly the paper plane (P)"
                        >
                            <Drawing
                                id="paperplane"
                                params={{ bank: 0 }}
                                seed={3}
                                class="ow-tool-art ow-tool-plane"
                            />
                        </button>
                    </Show>
                    <Show when={props.view.here !== null && focus() !== props.view.here}>
                        <button
                            type="button"
                            class="ow-btn"
                            onClick={() => {
                                if (props.view.here !== null) travelTo(props.view.here);
                            }}
                            aria-label="Where I am"
                        >
                            <Drawing
                                id="icon"
                                params={{ name: "locate", on: false }}
                                seed={2711}
                                class="ow-tool-art"
                            />
                        </button>
                    </Show>
                    <Show when={props.view.limits.zoomOut === "everything"}>
                        <button
                            type="button"
                            class="ow-btn ow-scope"
                            onClick={() => (at() === "all" ? home() : showAll())}
                            aria-label={at() === "all" ? "Near me" : "Every world"}
                        >
                            <Drawing
                                id="icon"
                                params={{ name: at() === "all" ? "locate" : "map", on: false }}
                                seed={2711}
                                class="ow-tool-art"
                            />
                            <span class="sr">{at() === "all" ? "Near me" : "Every world"}</span>
                        </button>
                    </Show>
                </fieldset>
                <Show when={card()}>
                    {(c) => (
                        <div class="hud ow-card" role="note">
                            <p class="ow-card-name">{c().shown?.name ?? ""}</p>
                            <p>{props.shut ?? "The way here opens as you learn."}</p>
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
