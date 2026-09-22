// A world's term as a place, drawn from the view the page was given (engine/space.ts TrailView): the
// trail through the world's own land with a stop for each day, the guide standing at today, the
// landmarks lit by the lessons beside them, and the moment waiting at the trail's end. A finished
// day's paper is the day's own sheet, drawn into the box its stop was given as the camera comes near
// it, with the postcard standing there until it arrives; nothing moves when it lands, since the box
// comes from the day's number. Zooming in on a stop, or tapping it, hands over to the roll at that
// day; pulling back past the place hands back to the map. The world round the trail is painted by the
// roll's own painter (.docs/journal.md, "A world as a place").

import "./place.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { easeInOut, timeline, valueAt } from "../motion/timeline";
import { ticker } from "../motion/loop";
import type { Tokens } from "../paper";
import {
    cameraBetween,
    clamp,
    fitRect,
    intersects,
    keepIn,
    labelGrow,
    stopNear,
    TILE,
    toScreen,
    type Camera,
    type Pt,
    type Rect,
    type SheetView,
    type Stop,
    type TrailView,
    type WorldView,
} from "../space";
import { animate, type Group } from "./animate";
import { still } from "./art";
import { worldPainter } from "./painters";
import { bloom, playMoment } from "./player";
import { readTokens } from "./read-tokens";
import { announce } from "./say";
import { el, SvgPen } from "./svg";
import { CanvasView } from "./view";
import { WayOut } from "./wayout";

/** The zoom at which a stop the camera has come to rest on hands over to the roll. */
const IN_AT = 0.4;
/**
 * Pulling back until the world is seen across hands back to the map: the zoom that fits the place's
 * width, a little further out, and the camera may be pulled a little further still, which is the room
 * the gesture needs.
 */
const OUT_AT = 0.86;
const PULL = 0.82;

interface Laid {
    stop: Stop;
    paper: HTMLElement;
    plate: SVGSVGElement;
    stamp: HTMLElement | null;
    /** The lessons whose sheets are in the box already, so one is laid once. */
    laid: Set<string>;
}

export function Place(props: {
    /** The view the page draws, whose `trail` is the term this place is of. */
    view: WorldView;
    /** The page's own sheet for a lesson, as the roll takes it: a finished day's paper. */
    sheet?: (s: SheetView) => HTMLElement | null;
    /**
     * The finished days whose paper is near the camera now, every one of them each time the near set
     * changes, so the page can draw what came near and let go of what did not (apps/kids/child.tsx).
     */
    lookBack?: (lessons: readonly string[]) => void;
    /** Into a day: the place dives into its stop and hands the page the box the roll opens in. */
    onIn?: (day: string, at: DOMRect | null) => void;
    /** Out of the world: the place pulls back and hands the page the box the map opens the place in. */
    onOut?: (at: DOMRect | null) => void;
    /** Where the view being left put the world on the screen, so the place grows out of it. */
    from?: DOMRect;
    /** The day the place opens on: the one the roll was reading, or the guide's stop without one. */
    at?: string;
    /** The day whose doings play as the place is painted: the landmark it lit, the creature it brought. */
    play?: string;
    class?: string;
    /** The heading a screen reader finds the place by. */
    title: string;
}): JSX.Element {
    let host: HTMLElement | undefined;
    let view: CanvasView | undefined;
    let group: Group | null = null;
    let pending: { rect: Rect; paint: () => void; done: boolean }[] = [];
    let laid: Laid[] = [];
    let token: HTMLElement | undefined;
    let flags: HTMLElement | null = null;
    let nodes: HTMLElement | null = null;
    let izAt = "";
    let brush = 0;
    /** The waits a moment's own light is played on, cleared when the place goes. */
    const playing: number[] = [];
    let drawing = 0;
    let level = "days";
    /** A handover is under way: nothing else moves the camera or hands over again. */
    let busy = false;
    /** Whether the place has been drawn once, so a view given again keeps the camera where it is. */
    let drew = false;
    /** The near set last asked for, null until one has been, so an empty set is not mistaken for it. */
    let asked: string | null = null;
    const quiet = still();
    const [ready, setReady] = createSignal(false);
    /** Whether the camera is moving, for the way back to stay out of sight while it does. */
    const [moving, setMoving] = createSignal(false);

    const trail = (): TrailView => {
        const t = props.view.trail;
        if (!t) throw new Error("a place is drawn from a view that has no trail");
        return t;
    };
    const bounds = (): Rect => trail().layout.land.bounds;

    /** The place as the painters read a world: its land, one stretch of a roll with no column in it. */
    const asRoll = (): WorldView => ({
        ...props.view,
        open: trail().world,
        layout: trail().layout.land,
        days: [],
        next: null,
        standings: trail().standings,
        arrival: null,
        stretches: [trail().sky],
        trail: null,
    });

    const whole = (v: CanvasView): Camera => fitRect(bounds(), v.vp, 12);
    /** The zoom at which the place is seen across the screen, which is as far back as the place goes. */
    const across = (v: CanvasView): number => (v.vp.w / bounds().w) * OUT_AT;
    /** The camera a few days wide, on a point: the distance the place is read at. */
    const daysAt = (v: CanvasView, at: Pt): Camera => {
        const t = trail();
        const z = clamp(
            Math.min(v.vp.h / (TILE * 2.2), v.vp.w / (t.layout.step * 3.4)),
            across(v) * 1.3,
            0.34,
        );
        return { x: at.x, y: at.y - TILE * 0.1, z };
    };
    /** The camera that fills the screen with a day's paper, which is where the roll takes over. */
    const readCam = (v: CanvasView, stop: Stop): Camera => ({
        x: stop.paper.x + stop.paper.w / 2,
        y: stop.paper.y + stop.paper.h / 2,
        z: Math.min(1.1, Math.max(IN_AT * 1.2, (v.vp.w - 40) / stop.paper.w)),
    });
    /** A world rectangle as a box on the screen, for the view picking the movement up from it. */
    const onScreen = (r: Rect): DOMRect | null => {
        const v = view;
        if (!v || !host) return null;
        const h = host.getBoundingClientRect();
        const a = toScreen(v.cam, v.vp, { x: r.x, y: r.y });
        return new DOMRect(h.left + a.x, h.top + a.y, r.w * v.cam.z, r.h * v.cam.z);
    };
    const stopOf = (day: string): Stop | undefined =>
        trail().layout.stops.find((s) => s.key === day);
    /** The stop the place opens on: the day it was handed, or the one the guide stands at. */
    const opensOn = (): Stop | undefined => {
        const t = trail();
        return (
            (props.at ? stopOf(props.at) : undefined) ??
            t.layout.stops[t.guide] ??
            t.layout.stops[0]
        );
    };

    /** Paint what the camera can see, a few milliseconds at a time, or all of it at once. */
    function paintNear(all = false): void {
        if (!view || brush) return;
        const step = (): void => {
            brush = 0;
            const v = view;
            if (!v) return;
            const t0 = performance.now(),
                seen = v.visible(Math.max(v.vp.w, v.vp.h, 700));
            const todo = pending.filter((p) => !p.done && intersects(p.rect, seen));
            for (const p of todo) {
                p.done = true;
                p.paint();
                if (!all && performance.now() - t0 > 10) break;
            }
            if (todo.some((p) => !p.done)) brush = window.setTimeout(step, 0);
        };
        if (all) step();
        else brush = window.setTimeout(step, 0);
    }

    /**
     * The zoom the paper's own rules read, written where it is read rather than on the world, since a
     * custom property on the world is inherited by everything on it and writing it every frame
     * restyles the whole place (engine/ui/world.tsx says what that cost the roll).
     */
    function zoomRead(cam: Camera, resting: boolean): void {
        const v = view;
        if (!v) return;
        flags?.style.setProperty("--grow", labelGrow(cam.z).toFixed(3));
        const iz = (1 / cam.z).toFixed(3);
        // a stop stays 44 px across at any camera, including while the place is still growing out of
        // the roll, so its zoom is written every frame on the one layer that reads it (the stops),
        // never on the world, where an inherited property would restyle the whole place each frame
        if (nodes && iz !== izAt) {
            izAt = iz;
            nodes.style.setProperty("--iz", iz);
        }
        if (resting) {
            v.world.style.setProperty("--iz", iz);
            v.world.style.setProperty("--mgrow", clamp(0.2 / cam.z, 1, 3.4).toFixed(3));
        }
    }

    /** The finished days whose paper is near the camera, which the page draws and lets go of. */
    function askPaper(): void {
        const v = view,
            ask = props.lookBack;
        if (!v || !ask || busy || level === "far") return;
        const t = trail();
        const seen = v.visible(Math.max(v.vp.w, v.vp.h, 700));
        const near = t.layout.stops.flatMap((s, i) =>
            intersects(s.paper, seen)
                ? (t.stops[i]?.sheets ?? []).flatMap((sheet) =>
                      sheet.state === "done" ? [sheet.lesson] : [],
                  )
                : [],
        );
        const key = near.join(",");
        if (key === asked) return;
        asked = key;
        ask(near);
    }

    /**
     * The page's sheet for every day of the term, read in one go. Reading them all, rather than only
     * the ones a stop is waiting for, is what keeps the effect below following the page: a run that
     * read none, as the first one does before the place is drawn, would track nothing and never run
     * again, and a day's paper would never arrive.
     */
    function sheetsNow(): Map<string, HTMLElement> {
        const have = new Map<string, HTMLElement>();
        for (const stop of props.view.trail?.stops ?? [])
            for (const sheet of stop.sheets) {
                const el = props.sheet?.(sheet);
                if (el) have.set(sheet.lesson, el);
            }
        return have;
    }

    /** A day's own sheets, laid in the box its stop was given, scaled to stand in it whole. */
    function layPaper(have: ReadonlyMap<string, HTMLElement>): void {
        const t = props.view.trail;
        if (!t) return;
        for (const [i, one] of laid.entries()) {
            // a day's paper the page has let go of leaves its box to the postcard again
            if (one.laid.size && !one.paper.querySelector(".j-sheet, .ls-sheet")) {
                one.laid.clear();
                one.paper.classList.remove("drawn");
            }
            for (const sheet of t.stops[i]?.sheets ?? []) {
                if (sheet.state !== "done" || one.laid.has(sheet.lesson)) continue;
                const paper = have.get(sheet.lesson);
                if (!paper) continue;
                one.laid.add(sheet.lesson);
                const box = one.stop.paper;
                paper.style.left = "0px";
                paper.style.top = "0px";
                one.paper.append(paper);
                const w = paper.offsetWidth || box.w,
                    h = paper.offsetHeight || box.h;
                const k = Math.min(1, box.w / w, box.h / h);
                paper.style.transform = `translate(${Math.round((box.w - w * k) / 2)}px, 0) scale(${k.toFixed(3)})`;
                one.paper.classList.add("drawn");
            }
        }
    }

    /** A line through the trail's samples between two distances along it, as SVG path data. */
    function along(from: number, to: number, every = 3): string {
        const s = trail().layout.samples;
        const pts = s.filter(
            (q, i) => q.s >= from && q.s <= to && (i % every === 0 || q.s + 12 * every > to),
        );
        return pts.map((q, i) => `${i ? "L" : "M"}${Math.round(q.x)} ${Math.round(q.y)}`).join("");
    }

    /** The postcard a stop shows: the question the day is about, its lesson small under it, the day, and a stamp. */
    function postcard(i: number, stop: Stop, art: Painter): HTMLElement | null {
        const said = trail().stops[i];
        if (!said || stop.state === "ahead") return null;
        const world = props.view.pictures[trail().world];
        const card = document.createElement("div");
        card.className = "pl-card";
        if (stop.state === "next") {
            card.className = "line hand";
            card.textContent = "Where you go next";
            return card;
        }
        const line = (cls: string, text: string): void => {
            if (!text) return;
            const s = document.createElement("span");
            s.className = cls;
            s.textContent = text;
            card.append(s);
        };
        line("hook hand", said.hook ?? said.names);
        line("name", said.hook ? said.names : "");
        line("when hand", said.when);
        if (said.stamp) {
            const st = stampOf(said.stamp, i, art);
            if (st) card.append(st);
        }
        if (world)
            for (const tp of art.tape(
                { x: 0, y: 0, w: stop.paper.w, h: stop.paper.h },
                `var(--${world.light.accent})`,
            ))
                card.append(tp);
        return card;
    }

    /** A stamp from the place itself, the way a passport is stamped where you went: its creature in a ring. */
    function stampOf(id: string, i: number, art: Painter): HTMLElement | null {
        if (!host) return null;
        const st = document.createElement("div");
        st.className = "pl-stamp";
        st.style.setProperty("--tilt", `${((i * 37) % 22) - 11}deg`);
        const ref = props.view.art[id];
        const a = art.placeArt(ref, 0, 0, host, { seed: 500 + i, cls: "pl-stamp-art" });
        if (a) {
            const size = art.artSize(ref),
                k = Math.min(1, 96 / Math.max(1, size.w), 96 / Math.max(1, size.h));
            a.style.left = `${(150 - size.w * k) / 2}px`;
            a.style.top = `${(150 - size.h * k) / 2}px`;
            a.style.transform = `scale(${k})`;
            a.style.transformOrigin = "0 0";
            st.append(a);
        }
        return st;
    }

    /** The day still to come, standing in the world: a buoy where the ground is water, a post elsewhere. */
    function marker(i: number, t: Tokens): SVGSVGElement {
        const W = 300,
            H = 460;
        const world = props.view.pictures[trail().world];
        const svg = el("svg", {
            class: "pl-marker",
            viewBox: `0 0 ${W} ${H}`,
            "aria-hidden": "true",
        });
        const pen = new SvgPen(svg, { seed: 700 + i, t, paper: false, roughness: 1 });
        const g = el("g", {}, svg);
        const ink = t["ink-soft"];
        const ground = world?.ground ?? "meadow";
        if (ground === "shore" || ground === "sea" || ground === "reeds") {
            pen.circle(g, W / 2, H - 120, 150, "pencil", null, { stroke: ink, strokeWidth: 4 });
            pen.line(g, W / 2 - 74, H - 150, W / 2 + 74, H - 150, "pencil", {
                stroke: ink,
                strokeWidth: 3,
            });
            pen.line(g, W / 2, H - 195, W / 2, H - 310, "pencil", { stroke: ink, strokeWidth: 5 });
            pen.polygon(
                g,
                [
                    [W / 2, H - 310],
                    [W / 2 + 92, H - 282],
                    [W / 2, H - 254],
                ],
                "pencil",
                null,
                { stroke: ink, strokeWidth: 3 },
            );
        } else {
            pen.line(g, W / 2, H - 20, W / 2, H - 330, "pencil", { stroke: ink, strokeWidth: 9 });
            pen.rect(g, W / 2 - 118, H - 400, 236, 96, "pencil", null, {
                stroke: ink,
                strokeWidth: 4,
            });
        }
        return svg;
    }

    type Painter = Awaited<ReturnType<typeof worldPainter>>;

    /** Draw the place: the world round the trail from the roll's painter, and the trail's own on top. */
    async function draw(v: CanvasView): Promise<void> {
        const n = ++drawing;
        const art = await worldPainter();
        if (!host || v !== view || n !== drawing) return;
        const t = trail();
        group?.stop();
        v.world.replaceChildren();
        v.world.className = "world j-world pl-world";
        v.world.dataset.level = level;
        const tokens = readTokens(host);
        const layer = (cls: string, into: HTMLElement = v.world): HTMLElement => {
            const d = document.createElement("div");
            d.className = `j-layer ${cls}`;
            into.append(d);
            return d;
        };
        const fade = layer("pl-fade");
        const L = {
            ground: layer("l-ground", fade),
            trail: layer("pl-l-trail"),
            art: layer("l-art"),
            cards: layer("pl-l-cards"),
            flags: layer("l-flags"),
            token: layer("pl-l-token"),
            nodes: layer("pl-l-nodes"),
        };
        flags = L.flags;
        nodes = L.nodes;
        izAt = "";
        group = quiet
            ? null
            : animate({ intensity: "calm", settle: 30, most: 24, zoom: () => v.cam.z });
        const land = t.layout.land;
        const view0 = asRoll();
        const finished = t.moment !== null;
        const painted = art.paintStretch(view0, 0, tokens, host, L.ground, {
            finished,
            label: t.label,
            play: group,
            walked: Infinity,
        });
        pending = [];

        // past the next day the land is plain paper, fading out over a tile, as a child's map fades
        const X = land.x1 + 900;
        fade.style.left = `${-X}px`;
        fade.style.top = "0px";
        fade.style.width = `${X * 2}px`;
        fade.style.height = `${land.bounds.h + TILE}px`;
        L.ground.style.left = `${X}px`;
        const known = t.layout.known;
        fade.style.maskImage = fade.style.webkitMaskImage =
            known >= land.bounds.h
                ? "none"
                : `linear-gradient(to bottom, #000 0, #000 ${Math.round(known - TILE * 0.75)}px, rgba(0,0,0,.18) ${Math.round(known - TILE * 0.2)}px, transparent ${Math.round(known + TILE * 0.2)}px)`;
        const beyond = (y: number): boolean => y > known - TILE * 0.2;

        painted.pieces.forEach((piece, k) =>
            pending.push({
                rect: piece.rect,
                done: false,
                paint: () => {
                    if (k > 0 && beyond(piece.rect.y)) return;
                    for (const e of piece.paint()) {
                        if (
                            e instanceof HTMLElement &&
                            e.classList.contains("gate") &&
                            finished &&
                            t.moment === props.play &&
                            !quiet
                        )
                            playing.push(
                                window.setTimeout(() => playMoment(e, L.art, quiet), 1400),
                            );
                        (e.classList.contains("j-name") || e.classList.contains("j-greet")
                            ? L.flags
                            : L.art
                        ).append(e);
                    }
                },
            }),
        );
        art.sceneryPieces(view0, host, () => "summer", { play: group }).forEach((piece, i) => {
            const s = land.scenery[i];
            if (!s) return;
            pending.push({
                rect: piece.rect,
                done: false,
                paint: () => {
                    const foot = piece.rect.y + piece.rect.h;
                    if (s.kind !== "moment" && beyond(foot)) return;
                    for (const e of piece.paint()) {
                        if (
                            e instanceof HTMLElement &&
                            e.classList.contains("reach") &&
                            e.classList.contains("lit") &&
                            t.standings[i]?.on === props.play &&
                            !quiet
                        )
                            bloom(e, quiet);
                        if (
                            e instanceof HTMLElement &&
                            e.classList.contains("moment") &&
                            e.classList.contains("inked") &&
                            t.moment === props.play &&
                            !quiet
                        )
                            playMoment(e, L.art, quiet);
                        (e.classList.contains("j-reach") || e.classList.contains("j-note")
                            ? L.flags
                            : L.art
                        ).append(e);
                    }
                },
            });
        });

        // the trail the child has walked, highlighted the way a child marks a route on a map, and
        // past the next day a pencil line trailing off into the paper
        const box = { x: -X, y: 0, w: X * 2, h: land.bounds.h + TILE };
        const svg = el("svg", {
            class: "pl-walked",
            viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`,
            "aria-hidden": "true",
        });
        svg.style.left = `${box.x}px`;
        svg.style.top = `${box.y}px`;
        svg.style.width = `${box.w}px`;
        svg.style.height = `${box.h}px`;
        L.trail.append(svg);
        if (t.layout.walked > 0)
            el("path", { d: along(0, t.layout.walked), class: "pl-hl", stroke: tokens.glow }, svg);
        if (t.layout.drawn < t.layout.length) {
            const end = Math.min(t.layout.length, t.layout.drawn + t.layout.step * 1.4),
                parts = 5;
            const span = (end - t.layout.drawn) / parts;
            for (let k = 0; k < parts; k++)
                el(
                    "path",
                    {
                        d: along(
                            t.layout.drawn + k * span,
                            t.layout.drawn + (k + 1) * span + 12,
                            2,
                        ),
                        class: "pl-pencil",
                        stroke: tokens["ink-soft"],
                        opacity: String(0.7 * (1 - k / parts)),
                    },
                    svg,
                );
        }

        // the stops: a plate on the trail for every day drawn, its paper above it, and a button on it
        laid = [];
        const world = props.view.pictures[t.world];
        t.layout.stops.forEach((stop, i) => {
            const said = t.stops[i];
            const r = 84;
            const plate = el("svg", {
                class: `pl-plate ${stop.state}`,
                viewBox: `${-r - 20} ${-r - 20} ${2 * r + 40} ${2 * r + 40}`,
                "aria-hidden": "true",
            });
            plate.style.left = `${stop.at.x - r - 20}px`;
            plate.style.top = `${stop.at.y - r - 20}px`;
            plate.style.width = `${2 * r + 40}px`;
            plate.style.height = `${2 * r + 40}px`;
            const pen = new SvgPen(plate, { seed: 300 + i, t: tokens, paper: false, roughness: 1 });
            const g = el("g", {}, plate);
            const accent = world ? world.light.accent : "glow";
            if (stop.state === "done") {
                pen.circle(
                    g,
                    0,
                    0,
                    r * 2,
                    "pencil",
                    { fill: tokens.card, fillStyle: "solid" },
                    { stroke: tokens.ink, strokeWidth: 4 },
                );
                pen.circle(g, 0, 0, r * 1.45, "pencil", pen.fill(accent), {
                    stroke: tokens.ink,
                    strokeWidth: 2,
                });
                // a tick in the teacher's pen, the way a finished page is marked
                pen.curve(
                    g,
                    [
                        [-r * 0.38, 0],
                        [-r * 0.1, r * 0.3],
                        [r * 0.42, -r * 0.34],
                    ],
                    "pencil",
                    { stroke: tokens.pen, strokeWidth: 9 },
                );
            } else if (stop.state === "today") {
                pen.circle(
                    g,
                    0,
                    0,
                    r * 2,
                    "pencil",
                    { fill: tokens.glow, fillStyle: "solid" },
                    { stroke: tokens.ink, strokeWidth: 6 },
                );
                pen.circle(
                    g,
                    0,
                    0,
                    r * 1.2,
                    "pencil",
                    { fill: tokens.card, fillStyle: "solid" },
                    { stroke: tokens.ink, strokeWidth: 2.5 },
                );
            } else if (stop.state === "next") {
                pen.circle(
                    g,
                    0,
                    0,
                    r * 2,
                    "pencil",
                    { fill: tokens.card, fillStyle: "solid" },
                    { stroke: tokens["ink-soft"], strokeWidth: 3, strokeLineDash: [14, 12] },
                );
            }
            if (stop.state !== "ahead") L.trail.append(plate);

            const paper = document.createElement("div");
            paper.className = `pl-paper ${stop.state}`;
            paper.style.left = `${stop.paper.x}px`;
            paper.style.top = `${stop.paper.y}px`;
            paper.style.width = `${stop.paper.w}px`;
            paper.style.height = `${stop.paper.h}px`;
            paper.style.setProperty("--lean", `${(((i * 53) % 5) - 2) * 0.7}deg`);
            if (world) paper.style.setProperty("--accent", `var(--${world.light.accent})`);
            if (stop.state === "next") paper.append(marker(i, tokens));
            const card = postcard(i, stop, art);
            if (card) paper.append(card);
            if (stop.state !== "ahead") L.cards.append(paper);

            const b = document.createElement("button");
            b.type = "button";
            b.className = `pl-stop ${stop.state}`;
            b.style.left = `${stop.at.x - 120}px`;
            b.style.top = `${stop.at.y - 120}px`;
            b.setAttribute(
                "aria-label",
                stop.state === "today"
                    ? `Today: ${said?.names ?? ""}`
                    : stop.state === "done"
                      ? `${said?.when ?? ""}: ${said?.names ?? ""}, finished`
                      : "Where you go next",
            );
            if (stop.state === "ahead") b.disabled = true;
            else {
                b.addEventListener("click", () => dive(stop));
                L.nodes.append(b);
            }
            laid.push({
                stop,
                paper,
                plate,
                stamp: card?.querySelector<HTMLElement>(".pl-stamp") ?? null,
                laid: new Set(),
            });
        });

        // the guide, where the child is, in a pool of lamplight, with who has joined walking behind
        const tk = document.createElement("div");
        tk.className = "pl-token ow-token";
        const glow = document.createElement("div");
        glow.className = "ow-glow";
        tk.append(glow);
        const who = document.createElement("div");
        who.className = "who";
        if (world)
            who.append(art.guideOf(world, "cheer", 230, host, undefined, group ?? undefined));
        tk.append(who);
        t.followers.slice(-3).forEach((f, k) => {
            const ref = props.view.art[f.art];
            const size = art.artSize(ref),
                s = Math.min(0.6, 120 / Math.max(1, size.h), 170 / Math.max(1, size.w));
            const a = host
                ? art.placeArt(ref, 0, 0, host, {
                      seed: 400 + k,
                      cls: "follower",
                      flip: true,
                      play: group,
                  })
                : null;
            if (!a) return;
            a.style.left = `${-130 - k * 120 - size.w * s}px`;
            a.style.top = `${-size.h * s + 6}px`;
            a.style.transform = `scale(${s})`;
            a.style.transformOrigin = "0 0";
            if (f.on === props.play && !quiet) a.classList.add("pl-joined");
            tk.append(a);
        });
        const here = document.createElement("div");
        here.className = "ow-here";
        here.textContent = "You are here";
        tk.append(here);
        L.token.append(tk);
        token = tk;
        const at = t.layout.stops[t.guide];
        stand(
            at
                ? { x: at.at.x - (land.o.sheet >= 600 ? 400 : 330), y: at.at.y + 60 }
                : t.layout.start,
        );

        // what the last day did: the stamp pressed on its stop, and its plate with it
        if (!quiet && props.play)
            for (const one of laid) {
                if (one.stop.state !== "done" || one.stop.date !== props.play) continue;
                one.stamp?.classList.add("pressed");
                one.plate.classList.add("pressed");
            }

        v.limits = { min: across(v) * PULL, max: 1.2 };
        // a place drawn again, as the record is read again after a day is finished, keeps the camera
        const again = drew;
        drew = true;
        if (again) {
            zoomRead(v.cam, true);
            paintNear(true);
            layPaper(sheetsNow());
            setReady(true);
            askPaper();
            return;
        }
        const open = opensOn();
        const to = open ? daysAt(v, open.at) : whole(v);
        const from = props.from && !quiet ? cameraFrom(v, open, props.from) : null;
        v.set(from ?? to);
        zoomRead(v.cam, true);
        paintNear(true);
        layPaper(sheetsNow());
        if (from) grow(v, from, to);
        announce(
            `${props.view.pictures[t.world]?.name ?? ""}. Tap a day to read it, or pull back for the map.`,
        );
        setReady(true);
        if (props.onIn) host.focus({ preventScroll: true });
        askPaper();
    }

    /** Where the guide stands, beside a stop and facing it. */
    function stand(at: Pt): void {
        if (!token) return;
        token.style.left = `${at.x}px`;
        token.style.top = `${at.y + 30}px`;
    }

    /**
     * The camera that opens the place in the box the view being left ended in, so the two views are
     * one movement: the day's own paper where that view left it, and the place grows out of it.
     */
    function cameraFrom(v: CanvasView, stop: Stop | undefined, box: DOMRect): Camera | null {
        if (!stop || !host) return null;
        const r = host.getBoundingClientRect();
        const z = clamp(box.width / stop.paper.w, 0.05, 1.4);
        return {
            x:
                stop.paper.x +
                stop.paper.w / 2 -
                (box.left - r.left + box.width / 2 - v.vp.w / 2) / z,
            y:
                stop.paper.y +
                stop.paper.h / 2 -
                (box.top - r.top + box.height / 2 - v.vp.h / 2) / z,
            z,
        };
    }

    /** Out of the box the other view left, back to the place, as one movement with its pull-back. */
    function grow(v: CanvasView, from: Camera, to: Camera): void {
        const tl = timeline([
            { name: "out", from: 0, to: 1, at: 0, dur: 0.5, ease: easeInOut },
            { name: "fade", from: 0, to: 1, at: 0, dur: 0.22 },
        ]);
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) return false;
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "out", t)));
                if (host) host.style.opacity = String(valueAt(tl, "fade", t));
                return t < tl.length;
            },
        }).start();
    }

    /** Into a day: the place dives into its paper and the roll takes over there. */
    function dive(stop: Stop): void {
        const v = view,
            go = props.onIn;
        if (!v || !go || busy || stop.state === "ahead") return;
        if (quiet) {
            go(stop.key, onScreen(stop.paper));
            return;
        }
        busy = true;
        const from = { ...v.cam },
            to = readCam(v, stop);
        const tl = timeline([
            { name: "in", from: 0, to: 1, at: 0, dur: 0.55, ease: easeInOut },
            { name: "fade", from: 1, to: 0, at: 0.4, dur: 0.18 },
        ]);
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) {
                    busy = false;
                    return false;
                }
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "in", t)));
                if (host) host.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                busy = false;
                go(stop.key, onScreen(stop.paper));
                return false;
            },
        }).start();
    }

    /** Back to the map: the place pulls back and fades, and the map opens the place in the box it left. */
    function out(): void {
        const v = view,
            go = props.onOut,
            h = host;
        if (!v || !go || busy) return;
        if (quiet || !h) {
            go(null);
            return;
        }
        busy = true;
        const from = { ...v.cam },
            to = { ...from, z: from.z * 0.6 };
        const tl = timeline([
            { name: "out", from: 0, to: 1, at: 0, dur: 0.45, ease: easeInOut },
            { name: "fade", from: 1, to: 0, at: 0.24, dur: 0.21 },
        ]);
        ticker({
            now: () => performance.now(),
            schedule: (f) => requestAnimationFrame(f),
            onFrame: (time) => {
                if (view !== v) {
                    busy = false;
                    go(null);
                    return false;
                }
                const t = Math.min(time, tl.length);
                v.set(cameraBetween(from, to, valueAt(tl, "out", t)));
                h.style.opacity = String(valueAt(tl, "fade", t));
                if (t < tl.length) return true;
                busy = false;
                const r = h.getBoundingClientRect();
                const w = Math.min(r.width * 0.42, r.height * 0.66);
                go(
                    new DOMRect(
                        r.left + (r.width - w) / 2,
                        r.top + (r.height - w * 0.62) / 2,
                        w,
                        w * 0.62,
                    ),
                );
                return false;
            },
        }).start();
    }

    function onFrame(cam: Camera): void {
        const v = view;
        if (!v) return;
        setMoving(true);
        const lv = cam.z < across(v) * 1.5 ? "far" : cam.z < IN_AT * 0.75 ? "days" : "day";
        if (lv !== level) {
            level = lv;
            v.world.dataset.level = lv;
        }
        zoomRead(cam, false);
        paintNear();
    }

    function onSettle(cam: Camera): void {
        setMoving(false);
        const v = view;
        if (!v || busy) return;
        zoomRead(cam, true);
        paintNear();
        group?.rescale();
        // the camera is held inside the place: a hand that has taken it past the edge is brought back
        const kept = keepIn(bounds(), v.vp, cam);
        if (Math.abs(kept.x - cam.x) * cam.z > 1 || Math.abs(kept.y - cam.y) * cam.z > 1) {
            v.flyTo(kept, 280);
            return;
        }
        if (cam.z >= IN_AT) {
            const near = stopNear(trail().layout.stops, cam, trail().layout.step);
            if (near) {
                dive(near);
                return;
            }
        }
        if (cam.z <= across(v) && props.onOut) {
            out();
            return;
        }
        askPaper();
    }

    function onKey(e: KeyboardEvent): boolean {
        if (e.type === "keyup") return false;
        if (e.key === "Escape" && props.onOut) {
            out();
            return true;
        }
        if (e.key === "t" || e.key === "T") {
            const v = view,
                t = trail();
            const at = t.layout.stops[t.guide];
            if (v && at) {
                v.flyTo(daysAt(v, at.at));
                announce(`${t.stops[t.guide]?.when || "Today"}.`);
            }
            return true;
        }
        return false;
    }

    onMount(() => {
        if (!host) return;
        // a world with no day on it yet is no place to stand in, so the page is handed straight back
        if (!props.view.trail) {
            queueMicrotask(() => props.onOut?.(null));
            return;
        }
        const v = new CanvasView(host, {
            bounds: () => bounds(),
            frame: (cam) => onFrame(cam),
            settle: (cam) => onSettle(cam),
            key: (e) => onKey(e),
        });
        view = v;
        v.world.dataset.level = level;
        void draw(v);
    });
    // paper the page has drawn since arrives in the box its stop was given, without moving anything
    createEffect(() => layPaper(sheetsNow()));
    createEffect(
        on(
            () => props.view,
            () => {
                const v = view;
                if (v && !busy) void draw(v);
            },
            { defer: true },
        ),
    );
    onCleanup(() => {
        clearTimeout(brush);
        for (const t of playing) clearTimeout(t);
        group?.stop();
        view?.stop();
    });

    return (
        <section class={`pl${props.class ? ` ${props.class}` : ""}`} classList={{ ready: ready() }}>
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
                ref={(e) => {
                    host = e;
                }}
                class="pl-host"
            />
        </section>
    );
}
