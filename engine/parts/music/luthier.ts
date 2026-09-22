// The wood and the strings: a tint, a string's gauge, two colours mixed, the woods a fill is cut from,
// a rosette round a sound hole and a string at its thickness, which the fretboard, the lane, the guitar
// and the ukulele draw with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";

/** A lighter mix of a colour with white, for a wash under things that have to be read. */
export function tint(hex: string, keep: number): string {
    const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1] ?? "0", 16);
    const mix = (v: number) =>
        Math.round(255 - (255 - v) * keep)
            .toString(16)
            .padStart(2, "0");
    return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

/** A string's thickness follows its pitch, not its place, so the ukulele's high G is drawn thin. */
export function gauge(t: { strings: number[] }, string: number): number {
    const n = t.strings.length;
    const pitch = t.strings[n - string] ?? 60;
    const lower = t.strings.filter((p) => p < pitch).length;
    return 1 + (n - 1 - lower) * 0.45;
}

/** Two colours mixed, `share` of the second, for the woods the palette has no token for. */
export function mix(a: string, b: string, share: number): string {
    const read = (hex: string) => /^#([0-9a-f]{6})$/i.exec(hex.trim())?.[1];
    const x = read(a),
        y = read(b);
    if (!x || !y) return a;
    const ch = (h: string, k: number) => parseInt(h.slice(k, k + 2), 16);
    const out = [0, 2, 4].map((k) =>
        Math.round(ch(x, k) * (1 - share) + ch(y, k) * share)
            .toString(16)
            .padStart(2, "0"),
    );
    return `#${out.join("")}`;
}

export type Wood = "top" | "koa" | "board" | "neck" | "hole" | "bone" | "wire" | "shell";

/**
 * The fills an instrument is made of. On screen they are mixed from the palette, since it has no
 * brown: a pale spruce top, a dark rosewood fingerboard, a warmer neck and head, bone for the nut and
 * saddle and silver for the frets. On paper each is a hatch of its own, as every colour on the shelf
 * is, and the bone and the wire stay white so a fret still cuts across the hatching.
 */
export function wood<G>(
    c: Ctx<G>,
    kind: Wood,
): {
    fill: string;
    fillStyle: "solid" | "hachure" | "dots" | "cross-hatch";
    hachureAngle?: number;
    hachureGap?: number;
    fillWeight?: number;
} {
    const { t } = c;
    if (c.paper) {
        if (kind === "bone" || kind === "wire") return { fill: t.card, fillStyle: "solid" };
        if (kind === "hole") return { fill: t.ink, fillStyle: "solid" };
        if (kind === "shell")
            return { fill: t.ink, fillStyle: "cross-hatch", hachureGap: 5, fillWeight: 0.6 };
        if (kind === "top" || kind === "koa")
            return {
                fill: t.ink,
                fillStyle: "dots",
                hachureGap: kind === "koa" ? 7 : 10,
                fillWeight: 1,
            };
        if (kind === "board")
            return {
                fill: t.ink,
                fillStyle: "hachure",
                hachureAngle: 12,
                hachureGap: 9,
                fillWeight: 0.6,
            };
        return {
            fill: t.ink,
            fillStyle: "hachure",
            hachureAngle: -50,
            hachureGap: 6,
            fillWeight: 0.6,
        };
    }
    const colour: Record<Wood, string> = {
        top: tint(mix(t.glow, t.tang, 0.55), 0.42),
        koa: tint(mix(t.tang, t.ink, 0.18), 0.5),
        shell: mix(t.tang, t.ink, 0.5),
        board: mix(t.tang, t.ink, 0.64),
        neck: mix(t.tang, t.ink, 0.3),
        hole: mix(t.ink, t.tang, 0.12),
        bone: tint(t.glow, 0.22),
        wire: mix(t.card, t["ink-soft"], 0.28),
    };
    return { fill: colour[kind], fillStyle: "solid" };
}

/**
 * A sound hole with its rosette: the dark hole, a band of small tiles round it between two rings,
 * and the rings themselves. The rosette is what makes a circle read as a guitar rather than a hole.
 */
export function rosette<G>(c: Ctx<G>, g: G, cu: number, cv: number, r: number): void {
    const { pen } = c;
    pen.circle(g, cu, cv, (r + 0.62 * U) * 2, "ruler", null, { strokeWidth: 1.5 });
    const tiles = Math.max(18, Math.round((2 * Math.PI * (r + 0.34 * U)) / 7));
    for (let i = 0; i < tiles; i++) {
        const a = (i / tiles) * Math.PI * 2;
        const r0 = r + 0.14 * U,
            r1 = r + 0.52 * U;
        const stroke = i % 2 ? c.t.ink : c.paper ? c.t.ink : c.t.tang;
        pen.line(
            g,
            cu + Math.cos(a) * r0,
            cv + Math.sin(a) * r0,
            cu + Math.cos(a) * r1,
            cv + Math.sin(a) * r1,
            "ruler",
            { strokeWidth: i % 2 ? 1 : 2.2, stroke },
        );
    }
    pen.circle(g, cu, cv, (r + 0.14 * U) * 2, "ruler", null, { strokeWidth: 1.2 });
    pen.circle(g, cu, cv, r * 2, "ruler", wood(c, "hole"), { strokeWidth: 1.6 });
}

/** A string: a pale casing and the string on it, so it shows over dark wood and over the sound hole. */
export function stringLine<G>(
    c: Ctx<G>,
    g: G,
    pts: [number, number][],
    weight: number,
    wound: boolean,
): void {
    c.pen.linear(g, pts, "ruler", { strokeWidth: weight + 2.4, stroke: c.t.card });
    c.pen.linear(g, pts, "ruler", {
        strokeWidth: weight,
        stroke: wound ? c.t.ink : c.t["ink-soft"],
    });
}
