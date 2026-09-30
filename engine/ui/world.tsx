import { sceneWork } from "./scene-work";
// A year's roll on a page, drawn from the view the page was given (engine/space.ts WorldView): the
// worlds a child walks through, one stretch a term, with the days as rows down the column and each
// day's sheets on them. A child arrives from the map: the horizon of the term they went into puts
// itself together, the guide says its line, and the camera comes down the roll to today. The sheets
// are the page's: a lesson the page drew (lesson.tsx) is laid where the roll puts it and read at a
// zoom that fits it, and any other sheet is a card with its title. A view given again while the roll
// is open, as the record is read again after a sheet is finished, is drawn where the camera stands,
// so what the day did plays in front of the child. The drawings come through the loader
// (drawings.ts) and play through the root's player.

import "./world.css";
import { smallDevice } from "./device";
import {
    batch,
    createEffect,
    createMemo,
    createSignal,
    For,
    Index,
    on,
    onCleanup,
    onMount,
    Show,
    untrack,
    type JSX,
} from "solid-js";
import { easeInOut, timeline, valueAt } from "../motion/timeline";
import { ticker } from "../motion/loop";
import {
    cameraBetween,
    cameraOn,
    clamp,
    DAY_AT,
    FAR_AT,
    flight,
    intersects,
    visibleRect,
    labelGrow,
    rollLevelOf,
    type Camera,
    type Rect,
    type RollLevel,
    type SheetView,
    type WorldView,
} from "../space";
import { still } from "./art";
import { announce } from "./say";
import { claim, hold, release } from "./handoff";
import type { WorldPainted } from "./scenery";
import { CanvasView } from "./view";
import { worldPainter } from "./painters";
import type { Scene } from "./map-scene";
import type { Group } from "./animate";
import { readTokens } from "./read-tokens";
import { WayOut } from "./wayout";
import { landingRow } from "./paper";
import { mapHook } from "./map-diagnostics";

/** What a sheet raises to ask for something on it to be seen (lesson.tsx raises it by this name). */
const REVEAL = "lumischool:reveal";

/** The room left round something the sheet asks to be seen, in px. */
const FOLLOW_PAD = 16;
/** How long the viewer's own hand holds the paper before a sheet's ask to be seen is acted on, in ms. */
const LEFT_ALONE = 1000;
/** How long an ask waits for that hand to stop before it is let go, in ms. */
const ASK_WAITS = 2500;
/** How long the viewer's hands have to be off the paper before the roll is drawn again under them, in ms. */
const STILL_FOR = 200;

/** How long the world's horizon has to put itself together before the camera comes down to today, in ms. */
const ARRIVING = 800;
/** The longest the camera takes from the horizon down to today, however far down the roll it is, in ms. */
const ARRIVAL_FLIGHT = 800;
/** The longest a roll arriving from the map waits for what it grows from to be drawn, in ms. */
const GROW_WAITS = 150;

/** A day as a child reads it on a sheet's corner: "Monday, September 7". */
/** A view's key, worked out once for each view, since a year's view is large and is asked for often. */
const viewKeys = new WeakMap<WorldView, Map<string, string>>();
const keyOf = (view: WorldView, play: string | undefined): string => {
    let byPlay = viewKeys.get(view);
    if (!byPlay) viewKeys.set(view, (byPlay = new Map<string, string>()));
    const p = play ?? "";
    let key = byPlay.get(p);
    if (key === undefined) byPlay.set(p, (key = JSON.stringify([view, play])));
    return key;
};

/** How long a roll's scene is kept for the next roll a page opens, before it is let go. */
const SPARE_FOR = 10 * 60_000;
/** The scene of the last roll a page closed, kept drawn for the next (map-smoothness-plan.md, phase 2). */
let spare: { scene: Scene; still: boolean; expiry: ReturnType<typeof setTimeout> } | null = null;
/** The spare scene for a roll drawn `still` or not, which a scene is made as and keeps. */
const takeSpare = (still: boolean): Scene | null => {
    const s = spare;
    if (!s) return null;
    clearTimeout(s.expiry);
    spare = null;
    if (s.still === still) return s.scene;
    s.scene.stop();
    return null;
};
const keepSpare = (scene: Scene, still: boolean): void => {
    // a phone holds one GPU context at a time, the map's, and draws a roll again from the kept pixels
    if (smallDevice) {
        scene.stop();
        return;
    }
    scene.park();
    if (spare) {
        clearTimeout(spare.expiry);
        spare.scene.stop();
    }
    spare = {
        scene,
        still,
        expiry: setTimeout(() => {
            if (spare?.scene === scene) spare = null;
            scene.stop();
        }, SPARE_FOR),
    };
};

const longDay = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

export function World(props: {
    /** A fixed illustration frames its lesson directly and refits when its box changes. */
    preview?: boolean;
    view: WorldView;
    /** The page's own sheet for a lesson, laid where the roll puts it; without one a sheet is a card with its title. */
    sheet?: (s: SheetView) => HTMLElement | null;
    /**
     * Changes when the page's own sheets do, which each sheet's slot reads, so a sheet the page has
     * drawn since takes its place without the roll being laid out again.
     */
    sheetsAt?: () => unknown;
    /** With it, today's sheet has an Open button. */
    onOpen?: (lesson: string) => void;
    /**
     * Past days' sheets with nothing of the page's own are near where the camera has come to rest at
     * reading distance: the page may draw them as they were left and hand them back through `sheet`,
     * and the roll then lays out round them, keeping the day under the camera where it was. Each
     * lesson is named once, with the others that came near at the same rest.
     */
    lookBack?: (lessons: readonly string[]) => void;
    /** Hold at the illustrated entrance until the actual destination sheets are measured. */
    waiting?: boolean;
    /** Return directly to the overworld; null means an immediate reduced-motion transition. */
    onOut?: (at: DOMRect | null) => void;
    /**
     * Where the place stood on the map the child came in from, so the world opens there and grows to
     * its horizon. Whatever a page draws for a world, a roll or a layout of its own, picks the dive
     * up from this box (.docs/journal.md, the map's transitions). Ignored under reduced motion,
     * which cuts.
     */
    from?: DOMRect;
    /**
     * The sheet the camera lands on, and this far down it, in the roll's units: today's, at its first
     * question still to do for a sitting picked up again, or the one a grown-up opened the roll at.
     * The top of the day without.
     */
    land?: { lesson: string; y: number };
    /** The day the reader explicitly opens instead of the default destination. */
    open?: string;
    /** The day whose doings play as the roll is painted: the landmark it lit, the creature it brought, its moment. */
    play?: string;
    /** The roll takes the wheel to move, unless the page around it scrolls. */
    wheel?: boolean;
    class?: string;
    /** The heading a screen reader finds the roll by. */
    title: string;
}): JSX.Element {
    let host: HTMLElement | undefined;
    let sheets: HTMLDivElement | undefined;
    let view: CanvasView | undefined;
    const [pageForm, setPageForm] = createSignal(false);
    let canvasZoom = 1;
    /** A change of form asked for as the roll first draws, done once it has arrived. */
    let formAsked = false;
    /** Where the arrival is coming down to, drawn ahead while the horizon puts itself together. */
    let landingAhead: Camera | null = null;
    /** What the child last worked in on a sheet, which a change of form keeps where it was on the screen. */
    let reading: Element | null = null;
    function changeForm(): void {
        const v = view;
        if (!v || busy) return;
        if (!arrived) {
            formAsked = !formAsked;
            return;
        }
        const h = host,
            kept = reading?.isConnected && h ? reading.getBoundingClientRect() : null,
            box = h?.getBoundingClientRect();
        // how far from the middle of the window it is, and where that is on the roll
        const off = kept && box ? kept.top + kept.height / 2 - (box.top + v.vp.h / 2) : 0,
            y = v.cam.y + off / v.cam.z;
        if (!pageForm()) {
            canvasZoom = v.cam.z;
            v.setPage(layout().o.sheet);
            setPageForm(true);
        } else {
            v.setPage(null);
            setPageForm(false);
            v.set({ ...v.cam, z: canvasZoom });
        }
        if (kept) {
            // at the new scale it may be further from the middle than the window reaches, so it is
            // brought in to within a line of the edge
            const reach = Math.max(0, v.vp.h / 2 - 80);
            const on = Math.max(-reach, Math.min(reach, off));
            v.set({ ...v.cam, y: y - on / v.cam.z });
        }
        v.present();
    }
    function arrive(): void {
        arrived = true;
        if (!formAsked) return;
        formAsked = false;
        // after the camera the arrival sets, which follows it
        requestAnimationFrame(changeForm);
    }
    const followFocus = (e: FocusEvent): void => {
        const el = e.target;
        if (!(el instanceof HTMLElement) || !el.closest("[data-lesson]")) return;
        reading = el;
        // the roll clips what is past its edge rather than scrolling to it, so a child tabbing to
        // something out of sight is taken to it, as a sheet's own ask to be seen is
        const r = el.getBoundingClientRect(),
            box = host?.getBoundingClientRect();
        if (
            box &&
            el.matches(":focus-visible") &&
            (r.top < box.top || r.bottom > box.bottom || r.left < box.left || r.right > box.right)
        )
            bring(el, Date.now() + ASK_WAITS);
    };
    let painted: WorldPainted | undefined;
    /**
     * The GPU's picture of the roll's ground and drawings (map-scene.ts), drawn from `source`, which is
     * never laid out; what it lifts out of it (words and CSS's own shapes) goes into `lifted`, a layer of
     * the world under the sheets. It lasts as long as the roll, so a roll drawn again keeps its textures.
     */
    let scene: Scene | null = null;
    let source: HTMLDivElement | undefined;
    let lifted: HTMLDivElement | undefined;
    let pending: {
        piece: WorldPainted["pieces"][number];
        done: boolean;
        release?: () => void;
    }[] = [];
    let brush = 0;
    const [failed, setFailed] = createSignal(false);
    /** The wait between the arrival and the camera coming down to today, cleared when the roll goes. */
    let arriving = 0;
    const [arrivalDue, setArrivalDue] = createSignal(false);
    /** A sheet's ask waiting for the viewer's hand to leave the paper, cleared when the roll goes. */
    let asking = 0;
    let level: RollLevel = "day";
    /** The way out is under way: nothing else moves the camera or hands over again. */
    let busy = false;
    /** Whether the child is on the way back to the map, so the roll is held over it as it goes. */
    let leaving = false;
    // a map or a roll held over the page as it goes waits for this roll to draw (handoff.ts)
    claim();
    let root: HTMLElement | undefined;
    const quiet = still() || !!props.preview;
    const [ready, setReady] = createSignal(false);
    const [paintedLayout, setPaintedLayout] = createSignal<WorldView["layout"]>();
    /** Whether the camera is moving, for the way out to stay out of sight while it does. */
    const [moving, setMoving] = createSignal(false);

    const [displayed, setDisplayed] = createSignal(props.view);
    const layout = (): WorldView["layout"] => displayed().layout;
    const narrow = (): boolean => (view?.vp.w ?? 1024) < 700;
    const name = (world: string): string => displayed().pictures[world]?.name ?? "";

    /** Whether a row holds a sheet the page drew, which is read close, rather than cards. */
    const owned = (r: number): boolean =>
        (displayed().days[r]?.sheets ?? []).some((sheet) => props.sheet?.(sheet) !== null);

    /**
     * The camera that reads a row's sheet at the top of the screen: a lesson fills the width it can,
     * so its boxes and buttons keep a finger's size, and a card leaves the world beside it in view.
     */
    function readAt(v: CanvasView, y: number, own: boolean): Camera {
        const l = layout();
        const beside = narrow() ? 24 : own ? 40 : 800;
        const z = clamp((v.vp.w - 24) / (l.o.sheet + beside), 0.5, 1);
        const from = narrow() ? 40 : 50;
        return { x: 0, y: y - from / z + v.vp.h / (2 * z), z };
    }

    /**
     * The camera that opens a term's horizon in the box the map left the place in, as the child comes
     * in. A little further back than the box, since the world grows out of it while the map is still
     * fading over it: the eye reads the movement as going on rather than as a pair of pictures swapped.
     */
    function cameraIn(v: CanvasView, term: number, box: DOMRect): Camera | null {
        const s = layout().stretches.find((x) => x.term === term);
        if (!s || !host) return null;
        const r = host.getBoundingClientRect(),
            k = 0.84;
        const w = box.width * k,
            h = box.height * k;
        return cameraOn(
            s.horizon,
            {
                x: box.left - r.left + (box.width - w) / 2,
                y: box.top - r.top + (box.height - h) / 2,
                w,
                h,
            },
            v.vp,
        );
    }

    /** The camera that opens a day's row in the box the place left its paper in, for the dive in. */
    function cameraOnBox(v: CanvasView, y: number, box: DOMRect): Camera | null {
        if (!host) return null;
        const r = host.getBoundingClientRect(),
            l = layout();
        const z = clamp(box.width / l.o.sheet, 0.04, 1.4);
        return {
            x: (box.left - r.left + box.width / 2 - v.vp.w / 2) / z,
            y: y + (v.vp.h / 2 - (box.top - r.top + box.height / 2)) / z,
            z,
        };
    }

    /** Out of the place's box to the world's own horizon, as one movement with the map's dive. */
    /** The roll grows out of `from` to `to`, fading in unless the map it came from fades out over it. */
    function grow(v: CanvasView, from: Camera, to: Camera, fade = true): void {
        const tl = timeline([
            { name: "in", from: 0, to: 1, at: 0, dur: 0.45, ease: easeInOut },
            { name: "fade", from: 0, to: 1, at: 0, dur: 0.24 },
        ]);
        v.locked = true;
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) return false;
                const t = Math.min(time, tl.length);
                v.setNow(cameraBetween(from, to, valueAt(tl, "in", t)));
                if (host && fade) host.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                v.locked = false;
                return false;
            },
        }).start();
    }

    /** Pull back into the overworld, handing its transition the departing viewport box. */
    function out(): void {
        const v = view,
            go = props.onOut,
            h = host;
        if (!v || !go || busy) return;
        if (v.readingPage) {
            v.setPage(null);
            setPageForm(false);
        }
        if (quiet || !h) {
            leaving = true;
            go(null);
            return;
        }
        busy = true;
        leaving = true;
        v.locked = true;
        // the map's rise out of the place is the movement, with the roll fading off it, so the roll
        // hands over at once rather than pulling back on its own first
        const r = h.getBoundingClientRect();
        const w = Math.min(r.width * 0.42, r.height * 0.66);
        go(new DOMRect(r.left + (r.width - w) / 2, r.top + (r.height - w * 0.62) / 2, w, w * 0.62));
    }

    /** The camera on a term's horizon, as the child arrives. */
    function horizonCam(v: CanvasView, term: number): Camera {
        const s = layout().stretches.find((x) => x.term === term);
        if (!s) return v.cam;
        const z = clamp(
            Math.min(v.vp.w / (s.horizon.w + 80), v.vp.h / (s.horizon.h + 60)),
            0.18,
            0.6,
        );
        return { x: 0, y: s.horizon.y + Math.max(s.horizon.h / 2, v.vp.h / (2 * z) - 20), z };
    }

    /** The day the place handed the roll over at, the row of the sheet the page lands on, today's row, the last row of a term, or a term's card. */
    function landing(term?: number): { y: number; own: boolean; says: string } | null {
        const l = layout();
        const row = landingRow(props.view, { day: props.open, lesson: props.land?.lesson, term });
        if (row) {
            const i = l.rows.indexOf(row);
            const titles = (displayed().days[i]?.sheets ?? []).map((s) => s.title).join(" and ");
            const k = props.land ? row.day.lessons.indexOf(props.land.lesson) : -1;
            const within = k >= 0 ? row.sheets[k] : undefined;
            return {
                y: within && props.land ? within.y + props.land.y - 60 : row.flag.y - 40,
                own: owned(i),
                says: row.day.state === "today" ? `Today, ${titles}.` : `${titles}.`,
            };
        }
        const i = l.stretches.findIndex((s) => s.card && (term === undefined || s.term === term));
        const card = l.stretches[i]?.card;
        return card
            ? {
                  y: card.y - 40,
                  own: false,
                  says:
                      props.view.stretches[i]?.card?.says ??
                      "The lessons here are still being written.",
              }
            : null;
    }

    /** The near set last asked for, so the page hears of it only when it changes. */
    let asked = "";
    /** Whether the child's arrival is over: no past sheet is asked for before, so the roll is not laid out again under the camera coming down to today. */
    let arrived = false;
    createEffect(() => {
        if (!arrivalDue() || props.waiting || !ready() || paintedLayout() !== props.view.layout)
            return;
        const v = view;
        if (!v || busy) return;
        setArrivalDue(false);
        arrive();
        // the flight down takes over from the lead the roll had on today
        landingAhead = null;
        const at = landing(props.view.arrival?.term);
        if (at) {
            const camera = readAt(v, at.y, at.own);
            if (quiet) v.set(camera);
            else v.flyTo(camera, Math.min(ARRIVAL_FLIGHT, flight(v.cam, camera, v.vp).ms));
        }
    });
    /**
     * Asks the page for the past sheets near where the camera rests at reading distance, which it
     * draws as they were left. It names every one that is near, not only the new ones, so the page
     * can let go of the sheets that are not near any more and a term can be walked without growth.
     */
    function lookBackNear(): void {
        const v = view,
            ask = props.lookBack;
        // far out a sheet is only its cover, so there is nothing to draw; nearer than that a past day
        // is worth drawing, and the level carries rollLevelOf's hysteresis, which a bare zoom does not
        if (!v || !ask || !arrived || v.flying || level !== "day") return;
        const seen = v.visible(Math.max(v.vp.h, 700) * 2);
        const near = layout().rows.flatMap((row, r) =>
            row.day.state === "today" || !intersects(row.rect, seen)
                ? []
                : (displayed().days[r]?.sheets ?? []).map((sheet) => sheet.lesson),
        );
        // the sheet the keyboard is in stays, since letting it go would drop the child's place
        const active = document.activeElement;
        const holding =
            active && host?.contains(active)
                ? active.closest("[data-lesson]")?.getAttribute("data-lesson")
                : null;
        if (holding && !near.includes(holding)) near.push(holding);
        const key = near.join(",");
        if (key === asked) return;
        asked = key;
        ask(near);
    }

    /** Paint nearby scenery within the document’s shared frame allowance. */
    function paintNear(): void {
        if (!view || brush) return;
        const step = (deadline: number): void => {
            brush = 0;
            if (!view) return;
            // painted a window ahead each way, as far as the scene draws ahead (map-scene.ts), so a
            // pan meets pieces already drawn
            const margin = Math.max(view.vp.w, view.vp.h) * (smallDevice ? 0.5 : 1),
                seen = view.visible(margin),
                keep = view.visible(margin * 2);
            // where a flight down the roll is going is painted as it sets off, and nothing is let go of
            // on the way (.docs/map-smoothness-plan.md, phase 3)
            const to = view.heading ?? landingAhead;
            const there = to
                ? visibleRect(to, { w: view.vp.w + margin * 2, h: view.vp.h + margin * 2 })
                : null;
            for (const p of pending) {
                if (
                    p.release &&
                    !to &&
                    (!intersects(p.piece.rect, keep) || (level === "far" && p.piece.detail))
                ) {
                    p.release();
                    p.release = undefined;
                    p.done = false;
                }
            }
            const todo = pending.filter(
                (p) =>
                    !p.done &&
                    ((!(level === "far" && p.piece.detail) && intersects(p.piece.rect, seen)) ||
                        (!!there && intersects(p.piece.rect, there))),
            );
            if (there)
                todo.sort(
                    (a, b) =>
                        Number(intersects(b.piece.rect, there)) -
                        Number(intersects(a.piece.rect, there)),
                );
            for (const p of todo) {
                p.done = true;
                p.release = p.piece.paint() ?? undefined;
                if (performance.now() >= deadline) break;
            }
            if (todo.some((p) => !p.done)) brush = sceneWork.schedule(step);
        };
        brush = sceneWork.schedule(step);
    }

    let resting = 0;
    /** The roll settles round a sheet the child is reading, a moment after the paper stops, and wakes when it moves. */
    function rest(on: boolean): void {
        clearTimeout(resting);
        painted?.settle(on);
        if (on) resting = window.setTimeout(() => host?.classList.add("mo-rest"), 1700);
        else host?.classList.remove("mo-rest");
    }

    /** The layer whose labels grow as the child draws back, and the covers that are read far off, found once per roll drawn. */
    let flags: HTMLElement | null = null;
    let covers: HTMLElement[] = [];
    const [overview, setOverview] = createSignal<{ from: number; to: number }[]>([]);
    let overviewKey = "";
    /** The zoom step, the rows and the zoom the covers were last written for. */
    let groupedAt: { scale: number; rows: unknown; iz: string } = { scale: 0, rows: null, iz: "" };
    /**
     * The zoom the paper's own rules read. A custom property set on the world is inherited by
     * everything on it, so writing these on the world every frame restyles the whole roll, which is
     * most of the work a pinch costs (measured at about 6,000 elements a frame). They are written
     * where they are read instead: `--grow` on the flags layer, whose dates, names and signs grow as
     * the child draws back; `--iz` on the covers, which are read only when the roll is far off; and
     * `--iz` on the world when the camera comes to rest, for the motion and the touch targets sized
     * by it, which have nothing to say mid-pinch. The rules are in world.css and arrange.css.
     */
    function zoomRead(cam: Camera, resting: boolean): void {
        const v = view;
        if (!v) return;
        flags ??= v.world.querySelector<HTMLElement>(".l-flags");
        flags?.style.setProperty("--grow", labelGrow(cam.z).toFixed(3));
        // read by sizes, which a hundredth does not change, and written only when it does
        const iz = (1 / cam.z).toFixed(2);
        const rows = layout().rows;
        const scale = 2 ** Math.floor(Math.log2(cam.z));
        // the days fall into the same groups until the zoom crosses a power of two
        const same = scale === groupedAt.scale && rows === groupedAt.rows && iz === groupedAt.iz;
        if (level !== "day" && !same) {
            const groups: { from: number; to: number }[] = [];
            const regroup = scale !== groupedAt.scale || rows !== groupedAt.rows;
            groupedAt = { scale, rows, iz };
            for (let i = 0; regroup && i < rows.length; i++) {
                const from = i;
                const first = rows[from];
                if (!first) continue;
                while (
                    i + 1 < rows.length &&
                    ((rows[i + 1]?.rect.y ?? Infinity) - first.rect.y) * scale < 76
                )
                    i++;
                groups.push({ from, to: i });
            }
            const key = groups.map((group) => `${group.from}:${group.to}`).join(",");
            if (regroup && key !== overviewKey) {
                overviewKey = key;
                setOverview(groups);
                covers = [];
            }
            if (!covers.length)
                covers = Array.from(
                    v.world.querySelectorAll<HTMLElement>(".j-cover, .wd-day-card"),
                );
            for (const c of covers) c.style.setProperty("--iz", iz);
        }
        if (resting) v.world.style.setProperty("--iz", iz);
    }

    function onFrame(cam: Camera): void {
        if (!view) return;
        if (scene) {
            // a page read by scrolling keeps the canvas in the window, as the view keeps its frame
            scene.canvas.style.transform = view.readingPage
                ? `translateY(${host?.scrollTop ?? 0}px)`
                : "";
            scene.frame(cam, view.vp, view.heading ?? landingAhead);
        }
        setMoving(true);
        const lv = view.readingPage ? "day" : rollLevelOf(cam.z, level);
        if (lv !== level) {
            level = lv;
            view.world.dataset.level = lv;
            // what is shown at the new level has its covers written afresh
            groupedAt = { scale: 0, rows: null, iz: "" };
            covers = [];
        }
        zoomRead(cam, false);
        rest(false);
        paintNear();
    }

    function onSettle(cam: Camera): void {
        setMoving(false);
        if (busy) return;
        // pulled back past the sheets: return directly to the overworld
        if (props.onOut && arrived && !view?.readingPage && cam.z < FAR_AT) {
            out();
            return;
        }
        zoomRead(cam, true);
        if (waiting && view) {
            waiting = false;
            retryDraw(view);
        }
        paintNear();
        // what idles is sized for the zoom the camera has come to rest at
        painted?.rescale();
        rest(cam.z >= DAY_AT);
        lookBackNear();
    }

    function toToday(animate = true): void {
        const v = view,
            at = landing();
        if (!v || !at) return;
        const cam = readAt(v, at.y, at.own);
        if (animate && !quiet) v.flyTo(cam);
        else v.set(cam);
        announce(at.says);
    }

    function onKey(e: KeyboardEvent): boolean {
        if (e.type === "keyup") return false;
        if (e.key === "Escape" && props.onOut) {
            out();
            return true;
        }
        if (e.key === "t" || e.key === "T") {
            toToday();
            return true;
        }
        return false;
    }

    /** The camera a roll comes to rest at as it opens: where its arrival lands, before any flight on to today. */
    /** The camera a roll opened from a place's box starts at, as the arrival below takes it. */
    function growStart(v: CanvasView, from: DOMRect): Camera | null {
        const arrival = props.view.arrival;
        const at0 = landing(arrival?.term);
        if (props.open && at0 && !props.waiting) return cameraOnBox(v, at0.y, from);
        if (arrival) return cameraIn(v, arrival.term, from);
        return null;
    }
    function opening(v: CanvasView): Camera {
        const arrival = props.view.arrival;
        const at0 = landing(arrival?.term);
        if (props.open && at0 && !props.waiting) return readAt(v, at0.y, at0.own);
        if ((arrival && !quiet) || props.waiting) return horizonCam(v, arrival?.term ?? 0);
        return at0 ? readAt(v, at0.y, at0.own) : v.cam;
    }

    let drawn = false;
    /** What this visit has played of the day, kept across the roll's paintings (scenery.ts). */
    const played = new Set<string>();
    /** A roll to be drawn again once the camera stops. */
    let waiting = false;
    /** The layout the roll was last drawn with, so one drawn again keeps the day under the camera. */
    let before: WorldView["layout"] | null = null;
    /** The camera that keeps the same day at the same place on the screen after the roll lays out again. */
    function anchored(
        v: CanvasView,
        was: WorldView["layout"] | null,
        next: WorldView["layout"],
    ): Camera | null {
        if (!was) return null;
        const rows = was.rows.filter((row) => row.flag.y <= v.cam.y);
        const at = rows.at(-1) ?? was.rows[0];
        if (!at) return null;
        const now = next.rows.find((row) => row.day.id === at.day.id);
        return now ? { ...v.cam, y: now.flag.y + (v.cam.y - at.flag.y) } : null;
    }
    /** Each draw's number: a roll drawn again while the painter's code is on its way paints once, not twice. */
    let drawing = 0;
    let model = "";
    /** The model a roll is being prepared for, until it is shown or given up. */
    let preparing = "";
    let cancelPreparation: (() => void) | undefined;
    /** Whether the roll's first drawing is under way, which a newer view waits for rather than cancels. */
    let firstDrawing = false;
    /** A newer view came while the first drawing was under way, to be drawn once the roll has opened. */
    let openedBehind = false;
    function retryDraw(v: CanvasView): void {
        // a roll that keeps being given views as its sheets land would otherwise never open
        if (firstDrawing) {
            openedBehind = true;
            return;
        }
        cancelPreparation?.();
        setFailed(false);
        void draw(v).catch(() => {
            // a first drawing that failed is over, so the button that asks again draws again
            firstDrawing = false;
            openedBehind = false;
            if (view === v) setFailed(true);
        });
    }
    async function draw(v: CanvasView): Promise<void> {
        const n = ++drawing;
        // the painter's and the renderer's code come with the first roll a page draws, not with the page
        const [{ paintWorldView }, { mapScene }] = await Promise.all([
            worldPainter(),
            import("./map-scene"),
        ]);
        if (!host || !source || !lifted || v !== view || n !== drawing) return;
        if (!scene) {
            const kept = takeSpare(quiet);
            const see: Group["see"] = (changes) => painted?.see?.(changes);
            if (kept) {
                kept.rebind(source, lifted, see);
                kept.unpark(host, v.frame);
                scene = kept;
            } else
                scene = mapScene({
                    host,
                    under: v.frame,
                    hidden: source,
                    overlay: lifted,
                    tokens: readTokens(host),
                    see,
                    still: quiet,
                    tiles: true,
                });
        }
        const next = props.view;
        const key = keyOf(next, props.play);
        if (model === key) {
            batch(() => {
                setDisplayed(next);
                before = next.layout;
                setPaintedLayout(next.layout);
            });
            return;
        }
        const was = before;
        preparing = key;
        const stage = document.createElement("div");
        const staged = document.createElement("div");
        const replacement = paintWorldView({
            host,
            world: stage,
            hidden: staged,
            played,
            view: next,
            still: quiet,
            grown: next.limits.sheets === "look",
            ...(props.play === undefined ? {} : { play: props.play }),
            zoom: () => v.cam.z,
        });
        const prepared: typeof pending = replacement.pieces.map((piece) => ({
            piece,
            done: false,
        }));
        // the first roll is drawn under the camera it opens at, before anything of it is shown, so it
        // arrives whole rather than a piece at a time (.docs/map-smoothness-plan.md, phase 1)
        if (!drawn) setDisplayed(next);
        const first = drawn ? null : opening(v);
        // where a roll come in from a place starts as it grows out of the place's box, which shows
        // more of the world than where it opens, drawn first as well, so the grow shows nothing unmade
        const growFrom = first && !quiet && props.from ? growStart(v, props.from) : null;
        if (first) {
            firstDrawing = true;
            // it waits unseen, where it will open, so nothing of it shows at another place meanwhile
            v.set(first);
            if (host) host.style.opacity = "0";
        }
        {
            const complete = await new Promise<boolean>((resolve) => {
                let work = 0;
                const cancel = (): void => {
                    if (preparing === key) preparing = "";
                    sceneWork.cancel(work);
                    for (const p of prepared) p.release?.();
                    replacement.stop();
                    if (cancelPreparation === cancel) cancelPreparation = undefined;
                    resolve(false);
                };
                cancelPreparation = cancel;
                const step = (deadline: number): void => {
                    if (
                        view !== v ||
                        n !== drawing ||
                        (!first && !(props.view === next || keyOf(props.view, props.play) === key))
                    ) {
                        cancel();
                        return;
                    }
                    if (!first && (v.flying || v.movedAgo() < STILL_FOR)) {
                        waiting = true;
                        cancel();
                        return;
                    }
                    const cam = first ?? anchored(v, was, next.layout) ?? v.cam;
                    const margin = Math.min(320, v.vp.h / 2);
                    const room = { w: v.vp.w + margin * 2, h: v.vp.h + margin * 2 };
                    const seen = visibleRect(cam, room);
                    const grows = growFrom ? visibleRect(growFrom, room) : null;
                    const todo = prepared.filter(
                        (p) =>
                            !p.done &&
                            !(level === "far" && p.piece.detail) &&
                            (intersects(p.piece.rect, seen) ||
                                (!!grows && intersects(p.piece.rect, grows))),
                    );
                    try {
                        for (const p of todo) {
                            p.release = p.piece.paint() ?? undefined;
                            p.done = true;
                            if (performance.now() >= deadline) break;
                        }
                    } catch {
                        cancel();
                        setFailed(true);
                        return;
                    }
                    if (todo.some((p) => !p.done)) work = sceneWork.schedule(step);
                    else {
                        cancelPreparation = undefined;
                        resolve(true);
                    }
                };
                work = sceneWork.schedule(step);
            });
            if (!complete) {
                firstDrawing = false;
                return;
            }
            // the GPU draws the new pieces before they are shown, from a source beside the one on
            // screen, under the camera the roll will have once the day under it is kept in place
            if (scene) {
                staged.className = "wd-source";
                host.append(staged);
                // a scene that has not been framed yet has no window to draw the staged source for
                if (!drawn) scene.frame(v.cam, v.vp);
                const readied = (async (): Promise<void> => {
                    await scene?.prepare(staged, first ?? anchored(v, was, next.layout) ?? v.cam);
                    // then where it grows from, which what is drawn sharp already is not drawn again for
                    if (growFrom && view === v && n === drawing)
                        await scene?.prepare(staged, growFrom);
                })();
                // arriving, the roll grows after a moment whatever it has, and what is not drawn yet
                // fades in as it grows, rather than the map holding the page still; drawn again in
                // place, it is shown only once it is all there
                await (first
                    ? Promise.race([readied, new Promise((done) => setTimeout(done, GROW_WAITS))])
                    : readied);
                if (
                    view !== v ||
                    n !== drawing ||
                    (!first && !(props.view === next || keyOf(props.view, props.play) === key))
                ) {
                    firstDrawing = false;
                    if (preparing === key) preparing = "";
                    staged.remove();
                    for (const p of prepared) p.release?.();
                    replacement.stop();
                    return;
                }
            }
        }
        // Keep the previous ink until the replacement's visible pieces can be presented together.
        sceneWork.cancel(brush);
        brush = 0;
        painted?.stop();
        for (const p of pending) p.release?.();
        for (const c of Array.from(v.world.children)) if (c !== sheets && c !== lifted) c.remove();
        v.world.append(...Array.from(stage.children));
        source.replaceChildren(...Array.from(staged.children));
        staged.remove();
        v.world.classList.add("j-world");
        painted = replacement;
        pending = prepared;
        const keep = drawn ? anchored(v, was, next.layout) : null;
        batch(() => {
            setDisplayed(next);
            if (keep && keep.y !== v.cam.y) v.shift(0, keep.y - v.cam.y);
        });
        v.present();
        before = next.layout;
        model = key;
        if (preparing === key) preparing = "";
        scene.frame(v.cam, v.vp);
        flags = null;
        covers = [];
        zoomRead(v.cam, true);
        v.limits = { min: 0.08, max: 1.2 };
        // a roll drawn again while it is open keeps the camera where the child has it, and arrives no second time
        const again = drawn;
        drawn = true;
        // a view that came while the roll first drew is drawn now, as any view is once the camera rests
        if (firstDrawing) {
            firstDrawing = false;
            if (openedBehind) {
                openedBehind = false;
                queueMicrotask(() => {
                    if (view === v) retryDraw(v);
                });
            }
        }
        // a view a child moves between takes the keyboard as it opens; one laid in a page does not
        if (!again && props.onOut) host.focus({ preventScroll: true });
        if (again) {
            // a sheet drawn or grown above the camera moves nothing the viewer is looking at
            paintNear();
            rest(v.cam.z >= DAY_AT);
            setReady(true);
            setPaintedLayout(layout());
            return;
        }
        // the map the child came from was held over the page until now, and fades out over the roll
        const handed = release(true);
        if (host) host.style.opacity = "1";
        const at0 = landing(props.view.arrival?.term);
        // the place hands the roll a day and the box its paper ended in: the roll opens there and
        // grows out of it, which is the dive the map and the world already share
        if (props.open && at0 && !props.waiting) {
            const to = readAt(v, at0.y, at0.own);
            const box = props.from && !quiet ? cameraOnBox(v, at0.y, props.from) : null;
            v.set(box ?? to);
            if (host) host.style.opacity = box && !handed ? "0" : "1";
            arrive();
            paintNear();
            if (box) grow(v, box, to, !handed);
            announce(at0.says);
            setReady(true);
            setPaintedLayout(layout());
            return;
        }
        const arrival = props.view.arrival;
        if (arrival && !quiet) {
            // the horizon first, put together as the child arrives, then down the roll to today
            const open = horizonCam(v, arrival.term);
            // coming in from the map: the world opens in the place's own box and grows out of it
            const came = props.from ? cameraIn(v, arrival.term, props.from) : null;
            v.set(came ?? open);
            if (host) host.style.opacity = came && !handed ? "0" : "1";
            paintNear();
            painted.assemble(arrival.term);
            announce(`${name(props.view.open)}. ${arrival.says}`);
            if (came) grow(v, came, open, !handed);
            // while the horizon puts itself together, today is painted and drawn, so the camera
            // coming down to it finds it drawn
            const today = landing(arrival.term);
            landingAhead = today ? readAt(v, today.y, today.own) : null;
            if (landingAhead) {
                scene?.frame(v.cam, v.vp, landingAhead);
                paintNear();
            }
            arriving = window.setTimeout(() => {
                if (view !== v || busy) return;
                // a child who has moved the paper themselves is not taken back, which is their own
                // hand and nothing else: a move the roll made as the world put itself together, or a
                // sheet asking to be seen, used to cancel the landing and leave the roll at the horizon
                if (v.movedAgo() < ARRIVING) {
                    landingAhead = null;
                    arrive();
                    return;
                }
                setArrivalDue(true);
            }, ARRIVING);
        } else if (props.waiting) {
            v.set(horizonCam(v, props.view.arrival?.term ?? 0));
            paintNear();
            setArrivalDue(true);
        } else {
            const at = landing(arrival?.term);
            if (at) v.set(readAt(v, at.y, at.own));
            arrive();
            paintNear();
            announce(
                arrival
                    ? `${name(props.view.open)}. ${arrival.says} ${at?.says ?? ""}`
                    : (at?.says ?? ""),
            );
        }
        setReady(true);
        setPaintedLayout(layout());
    }

    /**
     * A sheet asks for something on it to be seen, as when a question becomes the one to do now: the
     * camera brings the whole of it into the window, its buttons at the foot included, drawing back
     * only as far as it must to hold it and never closer than it was. Only what a sheet asks for moves
     * the camera, so a child tapping their way down a sheet is left where they are, and an ask that
     * arrives while the viewer's own hand has the paper waits for the hand to stop rather than being
     * dropped, for up to ASK_WAITS, after which the paper is taken to be theirs and the ask is let go.
     */
    const bring = (el: HTMLElement, until: number): void => {
        const v = view;
        if (!v || !host || !el.isConnected) return;
        const left = LEFT_ALONE - v.movedAgo();
        if (left > 0) {
            if (Date.now() > until) return;
            clearTimeout(asking);
            asking = window.setTimeout(() => bring(el, until), left + 16);
            return;
        }
        const r = el.getBoundingClientRect(),
            h = host.getBoundingClientRect();
        const room = { w: h.width - FOLLOW_PAD * 2, h: h.height - FOLLOW_PAD * 2 };
        // drawn back only if what is asked for cannot be held as it is, and never closer than it was
        const z = Math.min(v.cam.z, (room.w * v.cam.z) / r.width, (room.h * v.cam.z) / r.height);
        // and then moved the least that brings it in, so what the child was looking at stays where it
        // can: a question taller than the window shows its top rather than its middle
        const near = (lo: number, hi: number, from: number, to: number): number =>
            hi - lo > to - from ? lo - from : lo < from ? lo - from : hi > to ? hi - to : 0;
        const dx = near(r.left, r.right, h.left + FOLLOW_PAD, h.right - FOLLOW_PAD);
        const dy = near(r.top, r.bottom, h.top + FOLLOW_PAD, h.bottom - FOLLOW_PAD);
        if (!dx && !dy && z === v.cam.z) return;
        const cam = { x: v.cam.x + dx / v.cam.z, y: v.cam.y + dy / v.cam.z, z };
        if (quiet) v.set(cam);
        else v.flyTo(cam);
    };

    const follow = (e: Event): void => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        clearTimeout(asking);
        bring(el, Date.now() + ASK_WAITS);
    };

    onMount(() => {
        if (!host) return;
        sheets?.addEventListener(REVEAL, follow);
        sheets?.addEventListener("focusin", followFocus);
        const v = new CanvasView(host, {
            // the scene draws the paper's grid under the drawings
            paper: false,
            bounds: () => layout().bounds,
            // Mouse drags begun on lesson text select text; space-drag still moves the canvas.
            claim: (e) =>
                e.pointerType === "mouse" &&
                e.button === 0 &&
                !view?.spaceHeld &&
                e.target instanceof Element &&
                !!e.target.closest(".j-sheet"),
            // About two short sheets and their gap. Keep this independent of measured lesson
            // heights so background preparation cannot change the zoom limit under a gesture.
            // Scripted entrances still use the wider camera limits below.
            zoomLimits: (vp) => ({ min: clamp(vp.h / 1400, 0.5, 1.2), max: 1.2 }),
            frame: (cam) => onFrame(cam),
            key: (e) => onKey(e),
            settle: (cam) => onSettle(cam),
            resized: () => {
                if (view?.readingPage) {
                    view.setPage(layout().o.sheet);
                    return;
                }
                if (!props.preview && drawn && arrived && view && !view.flying) {
                    view.zoomBy(1, undefined, false);
                    return;
                }
                if (!props.preview || !drawn || !view) return;
                const at = landing(props.view.arrival?.term);
                if (at) view.set(readAt(view, at.y, at.own));
            },
        });
        view = v;
        v.world.dataset.level = "day";
        source = document.createElement("div");
        source.className = "wd-source";
        host.append(source);
        lifted = document.createElement("div");
        lifted.className = "j-layer wd-lifted";
        v.world.append(lifted);
        // the sheets move with the camera, so their layer lives in the world the view moves
        if (sheets) v.world.append(sheets);
        if (props.wheel === false) v.takesWheel = false;
        retryDraw(v);
        // the bake (tools/scripts/art-bake.ts) paints the whole roll and has its scene draw all of it
        // at `t` pixels to a unit
        mapHook("rollBake", async (t = 1) => {
            if (view !== v || !scene) return;
            for (const p of pending)
                if (!p.done) {
                    p.done = true;
                    p.release = p.piece.paint() ?? undefined;
                }
            await scene.bake(t);
        });
    });
    createEffect(
        on(
            () => props.view,
            () => {
                const v = view;
                if (!v) return;
                // a view the same as the one drawn draws nothing again, but is shown, since the paper it
                // names may have landed; one the same as the one being drawn must not cancel it
                const key = keyOf(props.view, props.play);
                if (key === model) {
                    batch(() => {
                        setDisplayed(props.view);
                        before = props.view.layout;
                        setPaintedLayout(props.view.layout);
                    });
                    return;
                }
                if (key === preparing) return;
                // nothing is swapped under a camera that is moving: the roll is drawn again once it stops
                if (v.flying || v.movedAgo() < STILL_FOR) waiting = true;
                else retryDraw(v);
            },
            { defer: true },
        ),
    );
    onCleanup(() => {
        release(false, "map");
        cancelPreparation?.();
        sceneWork.cancel(brush);
        clearTimeout(arriving);
        clearTimeout(asking);
        clearTimeout(resting);
        sheets?.removeEventListener(REVEAL, follow);
        sheets?.removeEventListener("focusin", followFocus);
        const held = pending,
            was = painted,
            s = scene,
            v = view;
        pending = [];
        scene = null;
        view = undefined;
        const gone = (): void => {
            for (const p of held) p.release?.();
            was?.stop();
            // the next roll opened takes up this one's scene, and with it what it drew
            if (s) keepSpare(s, quiet);
            v?.dispose();
        };
        // a roll left for the map stays on the screen until the map has drawn where it opens
        // held over the page however the page goes, the way out's own known to be taken over by the
        // map, and any other claimed by the map or world that comes, or let go if none does
        if ((leaving || ready()) && root) hold(root, "roll", gone, { claimed: leaving });
        else gone();
    });

    const rows = createMemo(
        () =>
            new Map(
                layout().rows.flatMap((row, r) =>
                    row.sheets.flatMap((rect, k) => {
                        const sheet = displayed().days[r]?.sheets[k];
                        return sheet
                            ? [
                                  [
                                      `${row.day.id}:${sheet.lesson}:${k}`,
                                      { rect, sheet, today: row.day.state === "today" },
                                  ] as const,
                              ]
                            : [];
                    }),
                ),
            ),
    );

    return (
        <section
            ref={(el) => {
                root = el;
            }}
            class={`wd${props.class ? ` ${props.class}` : ""}${ready() ? " ready" : ""}`}
            aria-label={props.title}
        >
            <h1 class="sr">{props.title}</h1>
            <Show when={failed()}>
                <output class="map-load-error">
                    <span>This world could not finish loading.</span>
                    <button
                        type="button"
                        onClick={() => {
                            if (view) retryDraw(view);
                        }}
                    >
                        Try again
                    </button>
                </output>
            </Show>
            <Show when={props.onOut}>
                <WayOut
                    over={() => host}
                    moving={moving}
                    out={() => out()}
                    label="Back to the map"
                    alternative={{
                        label: pageForm() ? "Canvas view" : "Page view",
                        change: changeForm,
                    }}
                />
            </Show>
            <div
                ref={(el) => {
                    host = el;
                }}
                class="wd-host"
            >
                <div
                    ref={(el) => {
                        sheets = el;
                    }}
                    class="j-layer l-sheets wd-sheets"
                >
                    <div class="wd-overview">
                        <Index each={overview()}>
                            {(at) => {
                                const row = () => layout().rows[at().from];
                                const day = () => displayed().days[at().from];
                                return (
                                    <button
                                        type="button"
                                        class="wd-day-card"
                                        style={{
                                            left: "0",
                                            top: `${row()?.rect.y ?? 0}px`,
                                            width: `max(${layout().o.sheet}px, calc(180px * var(--iz, 1)))`,
                                        }}
                                        onClick={() => {
                                            const v = view;
                                            const r = row();
                                            if (!v || !r) return;
                                            const camera = readAt(v, r.flag.y - 40, true);
                                            if (quiet) v.set(camera);
                                            else v.flyTo(camera);
                                        }}
                                    >
                                        <span class="label">
                                            {day()?.label ?? `Day ${row()?.day.n ?? 1}`}
                                        </span>
                                        <span class="hand">
                                            {at().to > at().from
                                                ? `${at().to - at().from + 1} days to explore`
                                                : day()
                                                      ?.sheets.map((sheet) => sheet.title)
                                                      .join(" · ")}
                                        </span>
                                    </button>
                                );
                            }}
                        </Index>
                    </div>
                    <For each={[...rows().keys()]}>
                        {(key) => {
                            const first = rows().get(key);
                            if (!first) return null;
                            const r = () => rows().get(key) ?? first;
                            let shown: HTMLElement | null = null;
                            const own = (): HTMLElement | null => {
                                props.sheetsAt?.();
                                const sheet = r().sheet;
                                // Publish prepared content with its committed row, not on a cache notification.
                                const next = untrack(() => props.sheet?.(sheet) ?? null);
                                // today's is the lesson the child is working in, and keeps the sheet it
                                // showed, with what they have written in it, when the page draws it again
                                if (r().today && next && shown?.isConnected) return shown;
                                shown = next;
                                return next;
                            };
                            return (
                                <Sheet
                                    rect={r().rect}
                                    sheet={r().sheet}
                                    today={r().today}
                                    own={own()}
                                    onOpen={props.onOpen}
                                />
                            );
                        }}
                    </For>
                </div>
            </div>
        </section>
    );
}

/**
 * One sheet on the roll: the page's own, laid where the roll puts it, or a card with the lesson's
 * title and its state. Today's has Open when the page gives the sheet somewhere to open to; a done
 * one says the day it was finished; the next is closed.
 */
function Sheet(props: {
    rect: Rect;
    sheet: SheetView;
    today: boolean;
    own: HTMLElement | null;
    onOpen?: (lesson: string) => void;
}): JSX.Element {
    const at = (): JSX.CSSProperties => ({
        left: `${props.rect.x}px`,
        top: `${props.rect.y}px`,
        width: `${props.rect.w}px`,
    });
    // a sheet finished today is still in today's row, and it is finished
    const open = (): boolean => props.today && props.sheet.state === "today" && !props.sheet.on;
    const label = (): string =>
        open() ? "Today" : props.sheet.state === "done" ? "Finished" : "Coming up";
    return (
        <Show
            when={props.own}
            // keyed, so a sheet drawn again in place of the one shown takes its place
            keyed
            fallback={
                <article
                    class="j-sheet squared wd-sheet"
                    classList={{ today: props.today }}
                    style={{ ...at(), "min-height": `${props.rect.h}px` }}
                    data-lesson={props.sheet.lesson}
                    aria-label={`${props.sheet.title}, ${open() ? "today" : props.sheet.state}`}
                >
                    <div class="j-strip">
                        <span class="label">{label()}</span>
                        <span class="date hand">
                            {props.sheet.on ? longDay(props.sheet.on) : ""}
                        </span>
                    </div>
                    <h2 class="wd-sheet-title hand">{props.sheet.title}</h2>
                    <Show when={open() && props.onOpen}>
                        <button
                            type="button"
                            class="ow-btn today wd-open"
                            onClick={() => props.onOpen?.(props.sheet.lesson)}
                        >
                            Open
                        </button>
                    </Show>
                    <Show when={props.sheet.on}>
                        {(on) => <p class="wd-sheet-note">Finished on {longDay(on())}.</p>}
                    </Show>
                    <div class="j-cover" aria-hidden="true">
                        <span class="label">{label()}</span>
                        <span class="t hand">{props.sheet.title}</span>
                    </div>
                </article>
            }
        >
            {(el) => {
                createEffect(() => {
                    el.style.left = `${props.rect.x}px`;
                    el.style.top = `${props.rect.y}px`;
                    // the height the roll has laid the sheet at, not the one its paper measured: paper
                    // that lands before the roll is laid out round it would cover the sheet after it
                    // until then; today's grows as the child works it, and the roll with it
                    el.style.minHeight = `${props.rect.h}px`;
                    el.style.maxHeight = props.today ? "" : `${props.rect.h}px`;
                    el.style.overflow = props.today ? "" : "clip";
                    el.classList.toggle("today", props.today);
                });
                return el;
            }}
        </Show>
    );
}
