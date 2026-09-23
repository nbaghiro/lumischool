import "./flight.css";
import { el, SvgPen as Pen } from "./svg";
import type { Tokens } from "../paper";
import { advance, loop, ticker } from "../motion/loop";
import { down, emptyPad, keyDir, spent, stickDir, up, type Dir } from "../motion/pad";
import { springAt, type Spring } from "../motion/spring";
import { hash, rand, type Camera, type Pt, type Overworld } from "../space";
import type { CanvasView } from "./view";
import {
    approach,
    landStep,
    type Landing,
    bearing,
    FLY,
    NOTCHES,
    step,
    takeOff,
    windFrom,
    type Field,
    type FlightEvent,
    type Plane,
    type Sky,
} from "../motion/plane";

import { nodeAt, wet } from "../space";
import { windAt } from "./map";
import { guideOf, placeArt } from "./scenery";
import { drawingOf, sizeFrom } from "./drawings";
import type { MapView } from "../space";

export interface FlyOptions {
    view: CanvasView;
    /** The flight's own layer in the map's world, over the guide's. */
    layer: HTMLElement;
    /** Where its controls go, over the map. */
    hud: HTMLElement;
    host: Element;
    t: Tokens;
    mapView: MapView;
    zoom?: () => number;
    from: number;
    /** Where the stars lead, if anywhere: a world whose way has just opened, or home. */
    to: number | null;
    still: boolean;
    say(words: string): void;
    landed(node: number): void;
    ended(): void;
}

export interface Flying {
    key(e: KeyboardEvent): boolean;
    stop(): void;
}

/** How much larger than its drawing the plane flies, so it reads as the thing to watch among the worlds. */
const PLANE = 2.5;
/** The camera's spring: quick enough to keep the plane in view, slow enough that a turn does not jolt. */
const FOLLOW: Spring = { hz: 0.7, zeta: 1 };

/** The field beside a world, under its name, running with the wind; on the water a ring of buoys. */
function fieldOf(map: Overworld, i: number): Field {
    const b = nodeAt(map, i)?.box ?? { x: 0, y: 0, w: 0, h: 0 };
    return { node: i, at: { x: b.x + b.w / 2, y: b.y + b.h + 600 }, angle: 0 };
}

export function fly(o: FlyOptions): Flying {
    const { t, mapView } = o;
    const map = mapView.layout;
    const refOf = (id: string) => mapView.art[id];
    const sizeOf = (id: string, params?: Record<string, unknown>) => {
        const ref = refOf(id);
        const d = ref && drawingOf(ref.ref);
        return d && ref ? sizeFrom(d, ref.scale, { ...ref.params, ...params }) : { w: 0, h: 0 };
    };
    const node = (i: number) => nodeAt(map, i);
    const name = (i: number) => (mapView.places[i]?.shown?.name ?? "world").toLowerCase();
    const bounds = map.core;
    const open = (q: Pt) =>
        q.x >= bounds.x &&
        q.x <= bounds.x + bounds.w &&
        q.y >= bounds.y &&
        q.y <= bounds.y + bounds.h;
    const fields = mapView.landings;
    const sky: Sky = {
        bounds,
        open,
        fields,
        sights: mapView.sights.filter((s) => open(s.at)),
        stars: starsOn(map, o.from, o.to),
        wind: (q) => windAt(mapView.country, q),
    };
    const start = fields.find((f) => f.node === o.from) ?? fieldOf(map, o.from);
    const plane: Plane = takeOff(start.at, Math.PI);
    const pad = emptyPad(),
        lp = loop(FLY.rate);
    let on = true,
        cam: { c: Camera; v: Camera } = { c: { ...o.view.cam }, v: { x: 0, y: 0, z: 0 } };
    const z0 = o.view.cam.z;
    let landing: Landing | null = null;
    let parked = 0;
    let landingNode: number | null = null;

    const L = div("ow-fly");
    o.layer.append(L);
    const pen = new Pen(el("svg", {}), { seed: 9, t, paper: false, roughness: 1 });
    const place = (
        id: string,
        at: Pt,
        k: number,
        cls: string,
        params?: Record<string, unknown>,
        flip = false,
    ): HTMLElement | null => {
        const sz = sizeOf(id, params),
            a = placeArt(refOf(id), 0, 0, o.host, {
                seed: hash(`${id}${at.x}`),
                cls,
                params,
                flip,
            });
        if (!a) return null;
        a.style.left = `${at.x - (sz.w * k) / 2}px`;
        a.style.top = `${at.y - sz.h * k}px`;
        a.style.transformOrigin = "50% 100%";
        a.style.transform = `scale(${k})`;
        L.append(a);
        return a;
    };
    for (const f of fields) {
        const wetField = wet(mapView.country, f.at),
            r = { x: f.at.x - 620, y: f.at.y - 320, w: 1240, h: 640 };
        const svg = el("svg", {
            class: "ow-field",
            viewBox: `${r.x} ${r.y} ${r.w} ${r.h}`,
            "aria-hidden": "true",
        });
        Object.assign(svg.style, {
            left: `${r.x}px`,
            top: `${r.y}px`,
            width: `${r.w}px`,
            height: `${r.h}px`,
        });
        const g = el("g", {}, svg);
        if (wetField) {
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                pen.circle(
                    g,
                    f.at.x + Math.cos(a) * 420,
                    f.at.y + Math.sin(a) * 170,
                    70,
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 3 },
                );
            }
        } else {
            pen.rect(
                g,
                f.at.x - 540,
                f.at.y - 120,
                1080,
                240,
                "pencil",
                pen.fill("mint", "hachure", { hachureGap: 26, fillWeight: 5 }),
                { strokeWidth: 4 },
            );
            for (let x = -400; x <= 400; x += 160)
                pen.line(g, f.at.x + x, f.at.y, f.at.x + x + 80, f.at.y, "ruler", {
                    strokeWidth: 5,
                });
            for (const s of [-1, 1])
                pen.polygon(
                    g,
                    [
                        [f.at.x + s * 470, f.at.y - 70],
                        [f.at.x + s * 520, f.at.y],
                        [f.at.x + s * 470, f.at.y + 70],
                    ],
                    "ruler",
                    null,
                    { strokeWidth: 4 },
                );
        }
        L.append(svg);
        const w = sky.wind(f.at);
        place(
            "windsock",
            { x: f.at.x + (w.x >= 0 ? -700 : 700), y: f.at.y - 60 },
            2.2,
            "ow-sock",
            { wind: Math.min(1, Math.hypot(w.x, w.y) / 110), stripes: 5 },
            w.x < 0,
        );
    }
    const stars = sky.stars.map((s) => {
        const d = div("ow-star");
        d.style.left = `${s.x}px`;
        d.style.top = `${s.y}px`;
        const svg = el("svg", { viewBox: "-60 -60 120 120", "aria-hidden": "true" }, d);
        pen.polygon(svg, starPts(0, 0, 48, 20), "pencil", pen.fill("glow"), { strokeWidth: 5 });
        L.append(d);
        return d;
    });
    const sights = sky.sights.map((s) =>
        place(s.art, s.at, s.k ?? 0.7, "ow-sight", undefined, !!s.flip),
    );
    const rc = rand(hash(`${bounds.x},${bounds.y}`));
    const clouds = Array.from({ length: 7 }, () => {
        const at = { x: bounds.x + rc() * bounds.w, y: bounds.y + rc() * bounds.h };
        const c = placeArt(refOf("cloud"), 0, 0, o.host, {
            seed: Math.round(at.x),
            cls: "ow-cloud",
            params: { puffs: 3 + Math.floor(rc() * 3), rain: 0 },
        });
        if (c) L.append(c);
        return { at, el: c, k: 2.6 + rc() * 1.8 };
    });
    const shadow = placeArt(refOf("paperplane"), 0, 0, o.host, { seed: 3, cls: "ow-plane-shadow" });
    const craft = div("ow-plane");
    const body = placeArt(refOf("paperplane"), 0, 0, o.host, { seed: 3, cls: "ow-plane-body" });
    const picture = mapView.pictures[node(o.from)?.world ?? ""];
    const rider = picture ? guideOf(picture, "cheer", 84, o.host) : div("ow-rider");
    rider.classList.add("ow-rider");
    const psz = sizeOf("paperplane");
    if (body) {
        body.style.left = `${-psz.w / 2}px`;
        body.style.top = `${-psz.h / 2}px`;
        craft.append(body);
    }
    craft.append(rider);
    if (shadow) L.append(shadow);
    L.append(craft);
    const trail: HTMLElement[] = [];
    let lastDot: Pt = { x: plane.x, y: plane.y };

    const hud = div("hud ow-flyhud");
    hud.tabIndex = -1;
    hud.setAttribute("role", "group");
    hud.setAttribute(
        "aria-label",
        "Flying the paper plane. Left and right arrows steer, up and down change speed, L lands at the nearest world, Escape stops.",
    );
    const words = document.createElement("p");
    words.className = "sr ow-flywords";
    words.setAttribute("aria-live", "polite");
    const button = (label: string, cls: string, aria: string): HTMLButtonElement => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `ow-btn ow-flybtn ${cls}`;
        b.textContent = label;
        b.setAttribute("aria-label", aria);
        return b;
    };
    const stopBtn = button("Stop", "stop", "Stop flying and land at the nearest world");
    const left = button("↰", "steer", "Steer left"),
        right = button("↱", "steer", "Steer right");
    const lever = div("ow-lever");
    lever.setAttribute("role", "radiogroup");
    lever.setAttribute("aria-label", "Speed");
    const notchBtns = NOTCHES.map((label) => {
        const b = button(
            label,
            "notch",
            `${label}${label === "Land" ? ": comes down on a field" : ""}`,
        );
        b.setAttribute("role", "radio");
        b.addEventListener("click", () => setNotch(NOTCHES.indexOf(label)));
        lever.append(b);
        return b;
    });
    const landingHint = div("ow-landing-hint");
    landingHint.id = `flight-landing-${o.from}`;
    hud.setAttribute("aria-describedby", landingHint.id);
    stopBtn.setAttribute("aria-keyshortcuts", "L Escape");
    hud.append(stopBtn, left, lever, right, landingHint);
    o.hud.append(hud, words);
    const touch = div("hud ow-flytouch");
    o.hud.append(touch);
    const blockPointer = (e: Event) => e.stopPropagation();
    for (const layer of [hud, touch]) {
        for (const event of ["pointerdown", "pointermove", "pointerup", "pointercancel"])
            layer.addEventListener(event, blockPointer);
        layer.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            { passive: false },
        );
    }
    o.hud.dataset.fly = "on";
    hud.focus({ preventScroll: true });
    const keyup = (e: KeyboardEvent) => {
        const d = keyDir(e.key);
        if (d) up(pad, d);
    };
    o.hud.addEventListener("keyup", keyup);
    const release = () => {
        for (const d of pad.holding) up(pad, d);
    };
    window.addEventListener("blur", release);

    const hold = (b: HTMLButtonElement, d: Dir) => {
        b.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            b.classList.add("on");
            press(d);
        });
        for (const ev of ["pointerup", "pointerleave", "pointercancel"])
            b.addEventListener(ev, () => {
                b.classList.remove("on");
                up(pad, d);
            });
        b.addEventListener("click", (e) => {
            if (e.detail === 0) {
                press(d);
                up(pad, d);
            }
        });
    };
    hold(left, "left");
    hold(right, "right");
    stopBtn.addEventListener("click", requestLanding);
    let drag: { id: number; x: number; d: Dir | null } | null = null;
    touch.addEventListener("pointerdown", (e) => {
        drag = { id: e.pointerId, x: e.clientX, d: null };
        touch.setPointerCapture(e.pointerId);
    });
    touch.addEventListener("pointermove", (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const d: Dir | null =
            e.clientX - drag.x > 24 ? "right" : e.clientX - drag.x < -24 ? "left" : null;
        if (d !== drag.d) {
            if (drag.d) up(pad, drag.d);
            if (d) press(d);
            drag.d = d;
        }
    });
    const dragEnd = (e: PointerEvent) => {
        if (drag?.id === e.pointerId) {
            if (drag.d) up(pad, drag.d);
            drag = null;
        }
    };
    touch.addEventListener("pointerup", dragEnd);
    touch.addEventListener("pointercancel", dragEnd);

    let said = "",
        saidAt = 0;
    const tell = (s: string, force = false) => {
        const now = performance.now();
        if (!force && (s === said || now - saidAt < 1800)) return;
        said = s;
        saidAt = now;
        words.textContent = s;
        o.say(s);
    };

    function setNotch(n: number): void {
        if (landingNode !== null) return;
        const d: Dir = n > plane.notch ? "up" : "down";
        for (let k = 0; k < Math.abs(n - plane.notch); k++) pad.pressed.push(d);
        stepStill();
    }
    function press(d: Dir): void {
        if (landingNode !== null) return;
        down(pad, d);
        stepStill();
    }

    const handle = (evs: FlightEvent[]) => {
        for (const ev of evs) {
            if (ev.is === "notch")
                tell(
                    ev.notch === 0
                        ? "Land. The plane comes down on a field, and skims low anywhere else."
                        : `${NOTCHES[ev.notch]}.`,
                    true,
                );
            else if (ev.is === "caught") {
                stars[ev.star]?.classList.add("caught");
            } else if (ev.is === "spotted") spot(ev.sight);
            else if (ev.is === "turned") tell("Turning back towards the map.", true);
            else if (ev.is === "touch")
                tell(
                    ev.into
                        ? "Down, into the wind: a short, soft landing."
                        : "Down, with the wind behind: a long roll.",
                    true,
                );
            else touchdown(ev.node);
        }
    };
    const tk = ticker({
        now: () => performance.now(),
        schedule: (f) => requestAnimationFrame(f),
        onFrame: (_t, dt) => {
            if (!on) return false;
            const w0 = performance.now();
            if (landingNode === null) gamepad();
            advance(lp, dt, () => {
                if (!on) return;
                if (plane.phase === "down" && landingNode !== null) {
                    parked += lp.step;
                    L.style.opacity = String(Math.max(0, 1 - Math.max(0, parked - 0.25) / 0.3));
                    if (parked >= 0.55) land(landingNode);
                } else if (landing) {
                    landStep(plane, landing, lp.step);
                } else {
                    handle(step(plane, sky, pad, lp.step));
                }
                spent(pad);
            });
            draw(dt);
            work.push(performance.now() - w0);
            if (work.length > 120) work.shift();
            return on;
        },
    });

    /** Under reduced motion a press flies the plane a little way, and it is drawn once, where it got to. */
    function stepStill(): void {
        if (!o.still) return;
        for (let k = 0; k < 36 && on; k++) {
            if (k === 12)
                for (const d of ["left", "right"] as Dir[]) if (pad.holding.includes(d)) up(pad, d);
            handle(step(plane, sky, pad, 1 / FLY.rate));
            spent(pad);
        }
        draw(0);
    }

    function spot(i: number): void {
        const s = sky.sights[i],
            a = sights[i];
        if (!s || !a) return;
        a.classList.add("seen");
        const ring = el("svg", {
            class: "ow-spotted",
            viewBox: "-300 -300 600 600",
            "aria-hidden": "true",
        });
        Object.assign(ring.style, { left: `${s.at.x - 300}px`, top: `${s.at.y - 380}px` });
        pen.ellipse(ring, 0, 0, 520, 420, "pencil", null, {
            stroke: t.pen,
            strokeWidth: 9,
            roughness: 1.6,
        });
        const label = div("ow-spotname");
        label.textContent = s.name;
        Object.assign(label.style, { left: `${s.at.x}px`, top: `${s.at.y - 80}px` });
        L.append(ring, label);
        tell(`${s.name}, down there.`, true);
    }

    let lastWords = 0,
        lastNote = 0;
    const work: number[] = [];
    function note(): void {
        const now = performance.now();
        if (!o.still && now - lastNote < 100) return;
        lastNote = now;
        o.hud.dataset.plane =
            [plane.x, plane.y, plane.heading, plane.height, plane.notch]
                .map((v) => v.toFixed(2))
                .join(",") + `,${plane.phase}`;
        if (work.length)
            o.hud.dataset.flyWork = (work.reduce((a, x) => a + x, 0) / work.length).toFixed(2);
    }
    function draw(dt: number): void {
        if (!on) return;
        note();
        const destination =
            landingNode === null
                ? `L to land at ${name(nearest())}`
                : `Landing at ${name(landingNode)}`;
        if (landingHint.textContent !== destination) landingHint.textContent = destination;
        const k = PLANE * (1 + 0.28 * plane.height),
            lift = plane.height * 220,
            deg = (plane.heading * 180) / Math.PI;
        craft.style.transform = `translate(${plane.x}px, ${plane.y - lift}px) rotate(${deg.toFixed(1)}deg) scale(${k.toFixed(3)}, ${(k * (1 - 0.22 * Math.abs(plane.bank))).toFixed(3)})`;
        rider.style.transform = `rotate(${(-deg).toFixed(1)}deg)`;
        if (shadow)
            shadow.style.transform = `translate(${plane.x - psz.w / 2 + plane.height * 160}px, ${plane.y - psz.h / 2 + plane.height * 120}px) rotate(${deg.toFixed(1)}deg) scale(${PLANE})`;
        if (shadow) shadow.style.opacity = String(0.28 - 0.14 * plane.height);
        if (Math.hypot(plane.x - lastDot.x, plane.y - lastDot.y) > 110 && plane.phase === "air") {
            const d = div("ow-dot");
            d.style.transform = `translate(${plane.x}px, ${plane.y}px)`;
            L.insertBefore(d, L.firstChild);
            trail.push(d);
            if (trail.length > 70) trail.shift()?.remove();
            lastDot = { x: plane.x, y: plane.y };
        }
        for (const c of clouds) {
            if (!c.el) continue;
            const w = sky.wind(c.at);
            c.at.x += w.x * 0.35 * dt;
            c.at.y += w.y * 0.35 * dt;
            if (c.at.x > bounds.x + bounds.w + 1200) c.at.x = bounds.x - 1200;
            c.el.style.transform = `translate(${c.at.x}px, ${c.at.y}px) scale(${c.k})`;
            c.el.classList.toggle(
                "near",
                plane.height > 0.62 && Math.hypot(c.at.x - plane.x, c.at.y - plane.y) < 600,
            );
        }
        const want: Camera = {
            x: plane.x + plane.vx * 0.8,
            y: plane.y + plane.vy * 0.8,
            z: o.zoom?.() ?? z0,
        };
        if (o.still) cam = { c: want, v: { x: 0, y: 0, z: 0 } };
        else {
            const mx = springAt(FOLLOW, cam.c.x, want.x, cam.v.x, dt),
                my = springAt(FOLLOW, cam.c.y, want.y, cam.v.y, dt),
                mz = springAt(FOLLOW, cam.c.z, want.z, cam.v.z, dt);
            cam = { c: { x: mx.x, y: my.x, z: mz.x }, v: { x: mx.v, y: my.v, z: mz.v } };
        }
        if (on) o.view.set(cam.c);
        notchBtns.forEach((b, i) => b.setAttribute("aria-checked", String(i === plane.notch)));
        const now = performance.now();
        if (now - lastWords > 7000 && plane.phase === "air") {
            lastWords = now;
            const f = fields
                .map((x) => ({ x, d: Math.hypot(x.at.x - plane.x, x.at.y - plane.y) }))
                .sort((a, b) => a.d - b.d)[0];
            if (f)
                tell(
                    `${NOTCHES[plane.notch]}. ${cap(name(f.x.node))} is ${bearing(plane, f.x.at)}. The wind is from the ${windFrom(sky.wind(plane))}.`,
                );
        }
    }

    function gamepad(): void {
        const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
        if (!gp) return;
        const dir =
            stickDir(gp.axes[0] ?? 0, 0) ??
            (gp.buttons[14]?.pressed ? "left" : gp.buttons[15]?.pressed ? "right" : null);
        for (const d of ["left", "right"] as Dir[]) {
            if (d === dir && !pad.holding.includes(d)) down(pad, d);
            if (d !== dir && pad.holding.includes(d)) up(pad, d);
        }
        const a = !!gp.buttons[0]?.pressed,
            b = !!gp.buttons[1]?.pressed;
        if (a && !pads.a) pad.pressed.push("up");
        if (b && !pads.b) pad.pressed.push("down");
        pads.a = a;
        pads.b = b;
    }
    const pads = { a: false, b: false };

    function nearest(): number {
        return (
            fields
                .map((f) => ({ f, d: Math.hypot(f.at.x - plane.x, f.at.y - plane.y) }))
                .sort((a, b) => a.d - b.d)[0]?.f.node ?? o.from
        );
    }

    function touchdown(i: number): void {
        if (o.still) {
            land(i);
            return;
        }
        landingNode = i;
        L.style.animation = "none";
        hud.focus({ preventScroll: true });
        for (const b of [stopBtn, left, right, ...notchBtns]) b.disabled = true;
    }

    function requestLanding(): void {
        if (!on || landingNode !== null) return;
        const i = nearest();
        if (o.still) {
            land(i);
            return;
        }
        const field = fields.find((f) => f.node === i);
        if (!field) return;
        landing = approach(plane, field);
        touchdown(i);
        release();
        spent(pad);
        tell(`Landing at ${name(i)}.`, true);
    }

    function land(i: number): void {
        if (!on) return;
        stop();
        o.landed(i);
    }

    function stop(): void {
        if (!on) return;
        on = false;
        tk.stop();
        L.remove();
        hud.remove();
        words.remove();
        touch.remove();
        delete o.hud.dataset.fly;
        delete o.hud.dataset.plane;
        o.hud.removeEventListener("keyup", keyup);
        window.removeEventListener("blur", release);
        o.ended();
    }

    tell(
        o.to !== null
            ? `The stars lead to ${name(o.to)}. Put the lever on Land over its field.`
            : "Left and right steer; up and down change speed. Press L or Escape to land at the nearest world, or choose Land over a field.",
        true,
    );
    draw(0);
    if (!o.still) tk.start();

    return {
        key(e: KeyboardEvent): boolean {
            const enter = e.key === "Enter" && !(e.target instanceof HTMLButtonElement);
            if (e.key === "Escape" || e.key.toLowerCase() === "l" || enter) {
                e.stopPropagation();
                if (e.type === "keydown" && !e.repeat) requestLanding();
                return true;
            }
            const d = keyDir(e.key);
            if (e.type === "keyup") {
                if (d) up(pad, d);
                return !!d;
            }
            if (d) {
                if (!e.repeat || o.still) press(d);
                if (d === "up" || d === "down") up(pad, d);
                return true;
            }
            if (e.key === " " && e.target instanceof HTMLButtonElement) return false;
            if (e.key === " ") {
                if (!e.repeat) {
                    pad.tapped = true;
                    stepStill();
                }
                return true;
            }
            if (e.key === "Shift") {
                pad.pressed.push("down");
                stepStill();
                return true;
            }
            return false;
        },
        stop,
    };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const div = (cls: string): HTMLElement => {
    const d = document.createElement("div");
    d.className = cls;
    return d;
};

/** Stars along the ways from one world to another, a little way apart, clear of both ends. */
function starsOn(map: Overworld, from: number, to: number | null): Pt[] {
    if (to === null || to === from) return [];
    const lo = Math.min(from, to),
        hi = Math.max(from, to),
        off = map.sides[hi - map.nodes.length],
        pts: Pt[] = off ? [...off.road.samples] : [];
    if (!off) for (let i = lo; i < hi; i++) pts.push(...(map.roads[i]?.samples ?? []));
    if (to < from) pts.reverse();
    const out: Pt[] = [];
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i],
            previous = pts[i - 1];
        if (!p || !previous) continue;
        run += Math.hypot(p.x - previous.x, p.y - previous.y);
        if (run > 700) {
            run = 0;
            out.push({ x: p.x, y: p.y - 140 });
        }
    }
    return out.slice(1, -1);
}

function starPts(cx: number, cy: number, r: number, r2: number): [number, number][] {
    return Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
            rr = i % 2 ? r2 : r;
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as [number, number];
    });
}
