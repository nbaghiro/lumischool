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
import { createEffect, createSignal, For, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { easeInOut, timeline, valueAt } from "../motion/timeline";
import { ticker } from "../motion/loop";
import {
    cameraBetween,
    cameraOn,
    clamp,
    DAY_AT,
    FAR_AT,
    intersects,
    labelGrow,
    rollLevelOf,
    type Camera,
    type DayView,
    type Rect,
    type RollLevel,
    type SheetView,
    type WorldView,
} from "../space";
import { still } from "./art";
import { announce } from "./say";
import type { WorldPainted } from "./scenery";
import { CanvasView } from "./view";
import { worldPainter } from "./painters";
import { WayOut } from "./wayout";

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
const ARRIVING = 1400;

/** A day as a child reads it on a sheet's corner: "Monday, September 7". */
const longDay = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

export function World(props: {
    view: WorldView;
    /** The page's own sheet for a lesson, laid where the roll puts it; without one a sheet is a card with its title. */
    sheet?: (s: SheetView) => HTMLElement | null;
    /**
     * The page's own element over a day, laid in roll units above the sheets and travelling with them:
     * called once for each day the roll draws, with that day and the whole row's rectangle, and null
     * for a day the page has nothing for. The layer takes no pointer, so the paper behind it still
     * drags; what the page puts in it does.
     */
    over?: (day: DayView, row: Rect) => HTMLElement | null;
    /** With it, today's sheet has an Open button. */
    onOpen?: (lesson: string) => void;
    /**
     * Past days' sheets with nothing of the page's own are near where the camera has come to rest at
     * reading distance: the page may draw them as they were left and hand them back through `sheet`,
     * and the roll then lays out round them, keeping the day under the camera where it was. Each
     * lesson is named once, with the others that came near at the same rest.
     */
    lookBack?: (lessons: readonly string[]) => void;
    /**
     * The way out of the roll, which is the place the world is seen as (engine/ui/place.tsx): pulling
     * back past the sheets hands over, and so does Escape. The roll pulls back and hands the page the
     * box the place should pick the movement up in, with the day the camera was on, so going out is
     * one movement; the box is null when it cut, under reduced motion.
     */
    onOut?: (at: DOMRect | null, day: string | null) => void;
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
    /** The day the roll opens at, when the place hands it over there rather than the map at today. */
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
    let above: HTMLDivElement | undefined;
    let view: CanvasView | undefined;
    let painted: WorldPainted | undefined;
    let pending: { piece: WorldPainted["pieces"][number]; done: boolean }[] = [];
    let brush = 0;
    /** The wait between the arrival and the camera coming down to today, cleared when the roll goes. */
    let arriving = 0;
    /** A sheet's ask waiting for the viewer's hand to leave the paper, cleared when the roll goes. */
    let asking = 0;
    let level: RollLevel = "day";
    /** The way out is under way: nothing else moves the camera or hands over again. */
    let busy = false;
    const quiet = still();
    const [ready, setReady] = createSignal(false);
    /** Whether the camera is moving, for the way out to stay out of sight while it does. */
    const [moving, setMoving] = createSignal(false);

    const layout = (): WorldView["layout"] => props.view.layout;
    const narrow = (): boolean => (view?.vp.w ?? 1024) < 700;
    const name = (world: string): string => props.view.pictures[world]?.name ?? "";

    /** Whether a row holds a sheet the page drew, which is read close, rather than cards. */
    const owned = (r: number): boolean =>
        (props.view.days[r]?.sheets ?? []).some((sheet) => props.sheet?.(sheet) !== null);

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
    function grow(v: CanvasView, from: Camera, to: Camera): void {
        const tl = timeline([
            { name: "in", from: 0, to: 1, at: 0, dur: 0.58, ease: easeInOut },
            { name: "fade", from: 0, to: 1, at: 0, dur: 0.24 },
        ]);
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) return false;
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "in", t)));
                if (host) host.style.opacity = String(valueAt(tl, "fade", t));
                return t < tl.length;
            },
        }).start();
    }

    /** The row the camera is on: the day a child reading the roll is at, for the place to open there. */
    function dayAt(v: CanvasView): string | null {
        let found: string | null = null;
        for (const row of layout().rows)
            if (row.flag.y - layout().o.band <= v.cam.y) found = row.day.id;
        return found;
    }

    /**
     * The way out of the roll: it pulls back and fades, and the page is handed the box in the middle
     * of it and the day it was on, for the place to open that day's paper in, so the two views are one
     * movement. The box's height is only a hint: the place fits the day's own paper to the width.
     */
    function out(): void {
        const v = view,
            go = props.onOut,
            h = host;
        if (!v || !go || busy) return;
        if (quiet || !h) {
            go(null, dayAt(v));
            return;
        }
        busy = true;
        const day = dayAt(v);
        const from = { ...v.cam },
            to = { ...from, z: from.z * 0.5 };
        const tl = timeline([
            { name: "out", from: 0, to: 1, at: 0, dur: 0.5, ease: easeInOut },
            { name: "fade", from: 1, to: 0, at: 0.26, dur: 0.24 },
        ]);
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) {
                    go(null, day);
                    return false;
                }
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "out", t)));
                h.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                const r = h.getBoundingClientRect();
                const w = Math.min(r.width * 0.42, r.height * 0.66);
                go(
                    new DOMRect(
                        r.left + (r.width - w) / 2,
                        r.top + (r.height - w * 0.62) / 2,
                        w,
                        w * 0.62,
                    ),
                    day,
                );
                return false;
            },
        }).start();
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
        const today = l.rows.find((r) => r.day.state === "today");
        const asked = props.open ? l.rows.find((r) => r.day.id === props.open) : undefined;
        const landed = l.rows.find(
            (r) => !!props.land && r.day.lessons.includes(props.land.lesson),
        );
        const row =
            asked ??
            landed ??
            (term !== undefined && today?.day.term !== term
                ? l.rows.filter((r) => r.day.term === term).at(-1)
                : (today ?? l.rows.at(-1)));
        if (row) {
            const i = l.rows.indexOf(row);
            const titles = (props.view.days[i]?.sheets ?? []).map((s) => s.title).join(" and ");
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
        if (!v || !ask || !arrived || v.flying || level === "far") return;
        const seen = v.visible(Math.max(v.vp.h, 700) * 2);
        const near = layout().rows.flatMap((row, r) =>
            row.day.state === "today" || !intersects(row.rect, seen)
                ? []
                : (props.view.days[r]?.sheets ?? []).map((sheet) => sheet.lesson),
        );
        const key = near.join(",");
        if (key === asked) return;
        asked = key;
        ask(near);
    }

    /** Paint what the camera can see; all of it at once with `all`, or a few milliseconds at a time. */
    function paintNear(all = false): void {
        if (!view || brush) return;
        const step = (): void => {
            brush = 0;
            if (!view) return;
            const t0 = performance.now(),
                seen = view.visible(Math.max(view.vp.h, 700));
            const todo = pending.filter((p) => !p.done && intersects(p.piece.rect, seen));
            for (const p of todo) {
                p.done = true;
                p.piece.paint();
                if (!all && performance.now() - t0 > 10) break;
            }
            if (todo.some((p) => !p.done)) brush = window.setTimeout(step, 0);
        };
        if (all) step();
        else brush = window.setTimeout(step, 0);
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
        const iz = String(1 / cam.z);
        if (level === "far") {
            if (!covers.length)
                covers = Array.from(v.world.querySelectorAll<HTMLElement>(".j-cover"));
            for (const c of covers) c.style.setProperty("--iz", iz);
        }
        if (resting) v.world.style.setProperty("--iz", iz);
    }

    function onFrame(cam: Camera): void {
        if (!view) return;
        setMoving(true);
        const lv = rollLevelOf(cam.z, level);
        if (lv !== level) {
            level = lv;
            view.world.dataset.level = lv;
        }
        zoomRead(cam, false);
        rest(false);
        paintNear();
    }

    function onSettle(cam: Camera): void {
        setMoving(false);
        if (busy) return;
        // pulled back past the sheets: the place the world is seen as takes over where the camera is
        if (props.onOut && arrived && cam.z < FAR_AT) {
            out();
            return;
        }
        zoomRead(cam, true);
        if (waiting && view) {
            waiting = false;
            void draw(view);
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

    let drawn = false;
    /** A roll to be drawn again once the camera stops. */
    let waiting = false;
    /** The layout the roll was last drawn with, so one drawn again keeps the day under the camera. */
    let before: WorldView["layout"] | null = null;
    /** The camera that keeps the same day at the same place on the screen after the roll lays out again. */
    function anchored(v: CanvasView, was: WorldView["layout"] | null): Camera | null {
        if (!was) return null;
        const rows = was.rows.filter((row) => row.flag.y <= v.cam.y);
        const at = rows.at(-1) ?? was.rows[0];
        if (!at) return null;
        const now = layout().rows.find((row) => row.day.id === at.day.id);
        return now ? { ...v.cam, y: now.flag.y + (v.cam.y - at.flag.y) } : null;
    }
    /** Each draw's number: a roll drawn again while the painter's code is on its way paints once, not twice. */
    let drawing = 0;
    async function draw(v: CanvasView): Promise<void> {
        const n = ++drawing;
        // the painter's code comes with the first roll a page draws, not with the page
        const { paintWorldView } = await worldPainter();
        if (!host || v !== view || n !== drawing) return;
        const was = before;
        before = layout();
        painted?.stop();
        for (const c of Array.from(v.world.children)) if (c !== sheets && c !== above) c.remove();
        v.world.classList.remove("j-world");
        painted = paintWorldView({
            host,
            world: v.world,
            view: props.view,
            still: quiet,
            grown: props.view.limits.sheets === "look",
            ...(props.play === undefined ? {} : { play: props.play }),
            zoom: () => v.cam.z,
        });
        pending = painted.pieces.map((piece) => ({ piece, done: false }));
        flags = null;
        covers = [];
        zoomRead(v.cam, true);
        v.limits = { min: 0.08, max: 1.2 };
        // a roll drawn again while it is open keeps the camera where the child has it, and arrives no second time
        const again = drawn;
        drawn = true;
        // a view a child moves between takes the keyboard as it opens; one laid in a page does not
        if (!again && props.onOut) host.focus({ preventScroll: true });
        if (again) {
            // a sheet drawn or grown above the camera moves nothing the viewer is looking at
            const keep = anchored(v, was);
            if (keep && keep.y !== v.cam.y) v.shift(0, keep.y - v.cam.y);
            paintNear(true);
            rest(v.cam.z >= DAY_AT);
            setReady(true);
            return;
        }
        const at0 = landing(props.view.arrival?.term);
        // the place hands the roll a day and the box its paper ended in: the roll opens there and
        // grows out of it, which is the dive the map and the world already share
        if (props.open && at0) {
            const to = readAt(v, at0.y, at0.own);
            const box = props.from && !quiet ? cameraOnBox(v, at0.y, props.from) : null;
            v.set(box ?? to);
            if (host) host.style.opacity = box ? "0" : "1";
            arrived = true;
            paintNear(true);
            if (box) grow(v, box, to);
            announce(at0.says);
            setReady(true);
            return;
        }
        const arrival = props.view.arrival;
        if (arrival && !quiet) {
            // the horizon first, put together as the child arrives, then down the roll to today
            const open = horizonCam(v, arrival.term);
            // coming in from the map: the world opens in the place's own box and grows out of it
            const came = props.from ? cameraIn(v, arrival.term, props.from) : null;
            v.set(came ?? open);
            if (host) host.style.opacity = came ? "0" : "1";
            paintNear(true);
            painted.assemble(arrival.term);
            announce(`${name(props.view.open)}. ${arrival.says}`);
            if (came) grow(v, came, open);
            const p = painted;
            arriving = window.setTimeout(() => {
                arrived = true;
                if (view !== v || painted !== p) return;
                // a child who has moved the paper themselves is not taken back, which is their own
                // hand and nothing else: a move the roll made as the world put itself together, or a
                // sheet asking to be seen, used to cancel the landing and leave the roll at the horizon
                if (v.movedAgo() < ARRIVING) return;
                const at = landing(arrival.term);
                if (at) v.flyTo(readAt(v, at.y, at.own));
            }, ARRIVING);
        } else {
            const at = landing(arrival?.term);
            if (at) v.set(readAt(v, at.y, at.own));
            arrived = true;
            paintNear(true);
            announce(
                arrival
                    ? `${name(props.view.open)}. ${arrival.says} ${at?.says ?? ""}`
                    : (at?.says ?? ""),
            );
        }
        setReady(true);
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
        const v = new CanvasView(host, {
            bounds: () => layout().bounds,
            frame: (cam) => onFrame(cam),
            key: (e) => onKey(e),
            settle: (cam) => onSettle(cam),
        });
        view = v;
        v.world.dataset.level = "day";
        // the sheets move with the camera, so their layer lives in the world the view moves, and the
        // page's own layer over them lives there too, after them
        if (sheets) v.world.append(sheets);
        if (above) v.world.append(above);
        if (props.wheel === false) v.takesWheel = false;
        void draw(v);
    });
    createEffect(
        on(
            () => props.view,
            () => {
                const v = view;
                if (!v) return;
                // nothing is swapped under a camera that is moving: the roll is drawn again once it stops
                if (v.flying || v.movedAgo() < STILL_FOR) waiting = true;
                else void draw(v);
            },
            { defer: true },
        ),
    );
    onCleanup(() => {
        clearTimeout(brush);
        clearTimeout(arriving);
        clearTimeout(asking);
        clearTimeout(resting);
        painted?.stop();
        view?.stop();
    });

    const overs = (): { rect: Rect; el: HTMLElement }[] =>
        layout().rows.flatMap((row, r) => {
            const day = props.view.days[r];
            const el = day ? (props.over?.(day, row.rect) ?? null) : null;
            return el ? [{ rect: row.rect, el }] : [];
        });

    const rows = (): { rect: Rect; sheet: SheetView; today: boolean }[] =>
        layout().rows.flatMap((row, r) =>
            row.sheets.flatMap((rect, k) => {
                const sheet = props.view.days[r]?.sheets[k];
                return sheet ? [{ rect, sheet, today: row.day.state === "today" }] : [];
            }),
        );

    return (
        <section
            class={`wd${props.class ? ` ${props.class}` : ""}`}
            classList={{ ready: ready() }}
            aria-label={props.title}
        >
            <h1 class="sr">{props.title}</h1>
            <Show when={props.onOut}>
                <WayOut
                    over={() => host}
                    moving={moving}
                    out={() => out()}
                    label="Back to the map"
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
                    <For each={rows()}>
                        {(r) => (
                            <Sheet
                                rect={r.rect}
                                sheet={r.sheet}
                                today={r.today}
                                own={props.sheet?.(r.sheet) ?? null}
                                onOpen={props.onOpen}
                            />
                        )}
                    </For>
                </div>
                <div
                    ref={(el) => {
                        above = el;
                    }}
                    class="j-layer wd-over"
                >
                    <For each={overs()}>
                        {(o) => (
                            <div
                                class="wd-over-at"
                                style={{
                                    left: `${o.rect.x}px`,
                                    top: `${o.rect.y}px`,
                                    width: `${o.rect.w}px`,
                                    height: `${o.rect.h}px`,
                                }}
                            >
                                {o.el}
                            </div>
                        )}
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
    const open = (): boolean => props.today && !props.sheet.on;
    const label = (): string => (open() ? "Today" : "Finished");
    return (
        <Show
            when={props.own}
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
            {(own) => {
                const el = own();
                el.style.left = `${props.rect.x}px`;
                el.style.top = `${props.rect.y}px`;
                el.classList.toggle("today", props.today);
                return el;
            }}
        </Show>
    );
}
