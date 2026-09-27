// What the developer's tools work out, apart from the page: which tools the address opens, the
// physics worlds in a game's state, the inspector's ink, the sprite under the pointer, and a tape as
// text. The panel in game-tools-panel.tsx draws it. See .docs/game-engine.md.
import { isBodies, type Bodies, type Survey } from "../motion/bodies";
import type { Pt } from "../motion/geometry";
import type { Frame, Mark, Sprite } from "../motion/scene";
import { readTape, type Tape } from "../motion/tape";

export type Tool = "inspect" | "tune" | "replay" | "perf";

export const TOOLS: readonly { id: Tool; label: string }[] = [
    { id: "inspect", label: "Inspect" },
    { id: "tune", label: "Tuning" },
    { id: "replay", label: "Replay" },
    { id: "perf", label: "Frame" },
];

/** The tools an address opens: every one for `tools=1`, the frame readout alone for `perf=1`. */
export function toolsFrom(search: string): Tool[] {
    const q = new URLSearchParams(search);
    if (q.get("tools") === "1") return TOOLS.map((t) => t.id);
    if (q.get("perf") === "1") return ["perf"];
    return [];
}

/** Shift, alt and D together open and shut the tools. The key's code, since alt changes the letter on a Mac. */
export const isChord = (e: { code: string; shiftKey: boolean; altKey: boolean }): boolean =>
    e.code === "KeyD" && e.shiftKey && e.altKey;

/** The physics worlds a game keeps in its state, looked for two levels down. */
export function worldsIn(state: unknown): Bodies[] {
    const out: Bodies[] = [];
    const seen = new Set<object>();
    const look = (v: unknown, depth: number): void => {
        if (typeof v !== "object" || v === null || seen.has(v)) return;
        seen.add(v);
        if (isBodies(v)) {
            out.push(v);
            return;
        }
        if (depth === 0) return;
        const values: unknown[] = Object.values(v);
        for (const x of values) look(x, depth - 1);
    };
    look(state, 2);
    return out;
}

const STYLE = {
    awake: "ink",
    asleep: "aim",
    fixed: "thin",
    sensor: "crash",
} as const satisfies Record<Survey["bodies"][number]["state"], string>;

/** How big a sprite is taken to be when it does not say: most shelf drawings are two or three squares across. */
const REACH = 1.5;

const reach = (sp: Sprite): number => (sp.size ? sp.size / 2 : REACH) * (sp.scale ?? 1);

const centre = (sp: Sprite): Pt => (sp.stand ? { x: sp.x, y: sp.y - reach(sp) } : sp);

/**
 * The inspector's ink: each body's outline, heavy while it is awake, dashed once it sleeps, faint
 * when it is fixed and red when it is a sensor; each joint as a rod with its two ends ringed; and a
 * box round the picked sprite.
 */
export function inkOf(surveys: readonly Survey[], picked: Sprite | null): Mark[] {
    const out: Mark[] = [];
    for (const sv of surveys) {
        for (const b of sv.bodies)
            for (const poly of b.outline)
                poly.forEach((a, i) => {
                    const next = poly[(i + 1) % poly.length];
                    if (next) out.push({ kind: "line", a, b: next, style: STYLE[b.state] });
                });
        for (const j of sv.joints) {
            out.push({ kind: "line", a: j.a, b: j.b, style: "rod" });
            for (const end of [j.a, j.b])
                out.push({ kind: "ring", x: end.x, y: end.y, r: 0.2, solid: true });
        }
    }
    if (picked) {
        const r = reach(picked),
            c = centre(picked);
        out.push({ kind: "box", x: c.x - r, y: c.y - r, w: 2 * r, h: 2 * r, on: true });
    }
    return out;
}

export const withInk = (f: Frame, marks: readonly Mark[]): Frame =>
    marks.length ? { ...f, marks: [...f.marks, ...marks] } : f;

/**
 * The sprite under a point in the world: the nearest whose reach holds it, the topmost of equals.
 * Readouts fixed to the view and scenery at another depth are passed over, since they are not where
 * the world says they are.
 */
export function pick(f: Frame, at: Pt): Sprite | null {
    let best: Sprite | null = null,
        bestD = Infinity;
    for (const sp of f.sprites) {
        if (sp.fixed || (sp.depth !== undefined && sp.depth !== 1)) continue;
        const c = centre(sp);
        const d = Math.hypot(at.x - c.x, at.y - c.y);
        if (d > reach(sp)) continue;
        if (d < bestD - 1e-9 || (Math.abs(d - bestD) <= 1e-9 && (sp.z ?? 0) > (best?.z ?? 0))) {
            best = sp;
            bestD = d;
        }
    }
    return best;
}

const num = (n: number): string => String(Number(n.toFixed(2)));

/** A sprite as rows of name and value for the inspector. */
export function spriteRows(sp: Sprite): [string, string][] {
    const rows: [string, string][] = [
        ["key", sp.key],
        ["art", sp.art],
        ["at", `${num(sp.x)}, ${num(sp.y)}`],
    ];
    if (sp.angle) rows.push(["angle", `${num((sp.angle * 180) / Math.PI)}°`]);
    if (sp.z !== undefined) rows.push(["z", String(sp.z)]);
    if (sp.size !== undefined) rows.push(["size", num(sp.size)]);
    for (const [k, v] of Object.entries(sp.params ?? {}))
        rows.push([k, typeof v === "number" ? num(v) : JSON.stringify(v)]);
    return rows;
}

export function bytesText(n: number): string {
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(0)} kB`;
    return `${n} B`;
}

export const tapeText = (t: Tape): string => JSON.stringify(t);

/** A tape pasted or loaded as text: the tape, or what is wrong with it. */
export function readTapeText(text: string): Tape | string {
    let v: unknown;
    try {
        v = JSON.parse(text);
    } catch {
        return "that is not JSON";
    }
    return readTape(v);
}
