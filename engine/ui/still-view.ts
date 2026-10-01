// A turn game's board for a browser without WebGL2: each frame the scene view gives, drawn as the
// shelf's SVG with no motes and no motion, so the game stays playable. See .docs/game-engine.md, P3.
import type { Pt } from "../motion/geometry";
import type { Frame, Mark, Pool, Sprite, Water } from "../motion/scene";
import { surfaceAt } from "../motion/surface";
import type { Drawing } from "../parts/drawing";
import { lookKey, penMarks } from "./game-atlas";
import { STROKES, type FieldView } from "./game-view";
import { el, render } from "./svg";

interface Shown {
    look: string;
    box: HTMLDivElement;
    w: number;
    h: number;
}

/** The depth of the pen's marks among the parts, as the scene view has it. */
const MARKS = 150;

export class StillView implements FieldView {
    readonly el: HTMLDivElement;
    sq = 20;
    readonly stats = {
        drawings: 0,
        drawMs: 0,
        sprites: 0,
        moving: 0,
        frameMs: 0,
        pages: 0,
        bytes: 0,
    };
    private readonly art: Map<string, Drawing<unknown>>;
    private readonly ink: SVGSVGElement;
    /** Each water, an SVG of its own at its depth, drawn again each frame. */
    private layers: SVGSVGElement[] = [];
    private readonly shown = new Map<string, Shown>();
    private view = { w: 1, h: 1 };
    private camera = { x: 0.5, y: 0.5 };

    constructor(o: { host: HTMLElement; art: Map<string, Drawing<unknown>> }) {
        this.art = o.art;
        this.el = document.createElement("div");
        this.el.className = "game-field field-still";
        this.ink = el("svg", { "aria-hidden": "true" });
        Object.assign(this.ink.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
            zIndex: String(MARKS),
        });
        this.el.append(this.ink);
        o.host.appendChild(this.el);
    }

    get px(): number {
        return this.sq;
    }

    fit(
        view: { w: number; h: number },
        _world: unknown,
        room: { w: number; h: number },
        _seen?: "side" | "above",
        square?: number,
    ): void {
        const sq = square ?? Math.max(6, Math.floor(Math.min(room.w / view.w, room.h / view.h)));
        // the paper fills the room, as the GPU's view does; less than a pixel to spare is no room
        const grown = (r: number, v: number): number => (r - v * sq < 1 ? v : r / sq);
        this.sq = sq;
        this.view = { w: grown(room.w, view.w), h: grown(room.h, view.h) };
        this.el.style.width = `${this.view.w * sq}px`;
        this.el.style.height = `${this.view.h * sq}px`;
        this.el.style.setProperty("--sq", `${sq}px`);
    }

    clear(): void {
        for (const s of this.shown.values()) s.box.remove();
        this.shown.clear();
        this.ink.replaceChildren();
        for (const l of this.layers) l.remove();
        this.layers = [];
    }

    draw(f: Frame): void {
        const t0 = performance.now();
        this.camera = { x: f.camera.x, y: f.camera.y };
        const left = f.camera.x - this.view.w / 2,
            top = f.camera.y - this.view.h / 2,
            sq = this.sq;
        const seen = new Set<string>();
        for (const s of f.sprites) {
            const shown = this.look(s);
            if (!shown) continue;
            seen.add(s.key);
            const k = s.scale ?? 1,
                squash = s.squash ?? 0;
            const x = (s.x - left) * sq - shown.w / 2,
                y = (s.y - top) * sq - shown.h / 2;
            const style = shown.box.style;
            style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${s.angle ?? 0}rad) scale(${k * (1 + squash)}, ${k * (1 - squash)})`;
            style.zIndex = String(Math.round(s.z ?? 0));
            style.opacity = String(s.faint ? 0.35 : (s.alpha ?? 1));
        }
        for (const [key, s] of this.shown)
            if (!seen.has(key)) {
                s.box.remove();
                this.shown.delete(key);
            }
        this.ink.setAttribute("viewBox", `${left} ${top} ${this.view.w} ${this.view.h}`);
        this.ink.replaceChildren(...f.marks.flatMap((m) => this.mark(m)));
        for (const l of this.layers) l.remove();
        const box = `${left} ${top} ${this.view.w} ${this.view.h}`;
        this.layers = [
            ...(f.water ?? []).map((w) => this.layer(box, w.z ?? 3, this.water(w))),
            ...(f.liquid ?? []).map((p) => this.layer(box, p.z ?? 3, this.pool(p))),
        ];
        for (const l of this.layers) this.el.insertBefore(l, this.ink);
        this.stats.sprites = f.sprites.length;
        this.stats.frameMs = performance.now() - t0;
    }

    /** The sprite's box, drawn again only when its look or the square's size has changed. */
    private look(s: Sprite): Shown | null {
        const look = `${this.sq}|${lookKey(s)}`;
        const had = this.shown.get(s.key);
        if (had?.look === look) return had;
        const drawing = this.art.get(s.art);
        if (!drawing) return had ?? null;
        const t0 = performance.now();
        const r = render<unknown>(drawing, s.params ?? drawing.params, {
            seed: s.seed ?? 4127,
            host: this.el,
        });
        if (s.marks?.length) penMarks(r.svg, r.anchors, s.marks, this.el);
        const c = s.crop ?? { x: 0, y: 0, w: r.box.w, h: r.box.h };
        const k = ((s.size ?? c.w) / c.w) * this.sq;
        const box = had?.box ?? document.createElement("div");
        Object.assign(box.style, {
            position: "absolute",
            left: "0",
            top: "0",
            overflow: s.crop ? "hidden" : "visible",
            pointerEvents: "none",
            width: `${c.w * k}px`,
            height: `${c.h * k}px`,
        });
        Object.assign(r.svg.style, {
            position: "absolute",
            display: "block",
            maxWidth: "none",
            overflow: "visible",
            left: `${-c.x * k}px`,
            top: `${-c.y * k}px`,
            width: `${r.box.w * k}px`,
            height: `${r.box.h * k}px`,
        });
        box.replaceChildren(r.svg);
        if (!had) this.el.insertBefore(box, this.ink);
        const shown = { look, box, w: c.w * k, h: c.h * k };
        this.shown.set(s.key, shown);
        this.stats.drawings++;
        this.stats.drawMs += performance.now() - t0;
        return shown;
    }

    private layer(box: string, z: number, children: SVGElement[]): SVGSVGElement {
        const svg = el("svg", { "aria-hidden": "true", viewBox: box });
        Object.assign(svg.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
            zIndex: String(Math.round(z)),
        });
        svg.append(...children);
        return svg;
    }

    /** Water at rest: its surface at the clock's start, filled in its hue and edged in ink. */
    private water(w: Water): SVGElement[] {
        const pts: string[] = [];
        for (let x = w.x; x <= w.x + w.w + 1e-6; x += 0.25)
            pts.push(`${x.toFixed(2)} ${surfaceAt({ ...w, ripples: [] }, x, 0).toFixed(3)}`);
        const surface = `M ${pts.join(" L ")}`;
        return [
            el("path", {
                d: `${surface} L ${w.x + w.w} ${w.bottom} L ${w.x} ${w.bottom} Z`,
                style: `fill: var(--${w.hue ?? "sky"})`,
                "fill-opacity": 0.6,
            }),
            el("path", {
                d: surface,
                style: "stroke: var(--ink); fill: none",
                "stroke-width": 0.1,
            }),
        ];
    }

    /** Drops of water as discs, overlapping into one body where they are close. */
    private pool(p: Pool): SVGElement[] {
        const group = el("g", { style: `fill: var(--${p.hue ?? "sky"})`, "fill-opacity": 0.75 });
        for (let i = 0; i + 1 < p.drops.length; i += 2)
            group.append(
                el("circle", { cx: p.drops[i] ?? 0, cy: p.drops[i + 1] ?? 0, r: p.r * 1.3 }),
            );
        return [group];
    }

    /** One mark in the pen's styles, in squares. */
    private mark(m: Mark): SVGElement[] {
        const stroke = (
            name: string,
            extra: Record<string, string | number> = {},
            fill = "none",
        ): Record<string, string | number> => {
            const ink = STROKES[name] ?? STROKES.line;
            return {
                style: `stroke: var(--${ink?.colour ?? "ink"}); fill: ${fill}`,
                "stroke-width": ink?.width ?? 0.1,
                "stroke-dasharray": ink?.dash.join(" ") || "none",
                "stroke-linecap": ink?.round ? "round" : "butt",
                opacity: ink?.alpha ?? 1,
                ...extra,
            };
        };
        if (m.kind === "dots")
            return m.pts.map((p) =>
                el("circle", {
                    cx: p.x,
                    cy: p.y,
                    r: 0.13,
                    style: "fill: var(--pen)",
                    opacity: m.faint ? 0.3 : (m.opacity ?? 1),
                }),
            );
        if (m.kind === "line") {
            const d = curve(m.a, m.b, m.bend);
            if (m.style === "stream") {
                const w = 0.14 + 0.32 * Math.max(0, Math.min(1, m.weight ?? 1));
                return [
                    el("path", { d, ...stroke("thin", { "stroke-width": w + 0.09 }) }),
                    el("path", {
                        d,
                        style: "stroke: var(--sky); fill: none",
                        "stroke-width": w,
                        "stroke-linecap": "round",
                    }),
                ];
            }
            const name = m.style && m.style !== "ink" ? m.style : "line";
            const out = [el("path", { d, ...stroke(name) })];
            const len = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y);
            if (m.head && len > 0.2) {
                const a = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x),
                    k = Math.min(0.55, len * 0.4);
                const wing = (s: number): string =>
                    `${m.b.x + k * Math.cos(a + Math.PI + s * 0.5)} ${m.b.y + k * Math.sin(a + Math.PI + s * 0.5)}`;
                out.push(
                    el("path", {
                        d: `M ${wing(-1)} L ${m.b.x} ${m.b.y} L ${wing(1)}`,
                        ...stroke(name, { "stroke-dasharray": "none" }),
                    }),
                );
            }
            return out;
        }
        if (m.kind === "ring" || m.kind === "box") {
            const name = m.on ? "on" : m.kind === "ring" && m.solid ? "solid" : "ring";
            const shape = m.on
                ? stroke(name, { "fill-opacity": 0.28 }, "var(--glow)")
                : stroke(name);
            if (m.kind === "ring") return [el("circle", { cx: m.x, cy: m.y, r: m.r, ...shape })];
            const r = Math.min(0.3, m.w / 2, m.h / 2);
            return [el("rect", { x: m.x, y: m.y, width: m.w, height: m.h, rx: r, ...shape })];
        }
        if (m.kind === "word") {
            const t = el("text", {
                x: m.x,
                y: m.y,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                "font-size": m.size ?? 1,
                style: "fill: var(--pen); font-family: var(--f-hand); font-weight: 650",
            });
            t.textContent = m.text;
            return [t];
        }
        return [el("circle", { cx: m.x, cy: m.y, r: m.r, ...stroke("puff", {}, "var(--card)") })];
    }

    puff(): void {}
    burst(): void {}
    shake(): void {}

    toWorld(clientX: number, clientY: number): Pt {
        const r = this.el.getBoundingClientRect();
        return {
            x: this.camera.x + (clientX - r.left - (this.view.w * this.sq) / 2) / this.sq,
            y: this.camera.y + (clientY - r.top - (this.view.h * this.sq) / 2) / this.sq,
        };
    }
}

/** A straight line, or a quadratic arc whose middle is lifted by `bend` squares. */
function curve(a: Pt, b: Pt, bend: number | undefined): string {
    if (!bend) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - bend * 2 };
    return `M ${a.x} ${a.y} Q ${m.x} ${m.y} ${b.x} ${b.y}`;
}
