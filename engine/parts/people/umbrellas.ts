// People walking in the rain under umbrellas, for the town on market day: kit figures in the walk
// pose, a grown-up and a child sharing one umbrella and others under their own. Each umbrella shows
// the same number of panels, coloured and white in turn, so they can be counted in equal groups.
import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { placePerson, type PersonParams } from "./figure";
import { person } from "./person";

type Pt = [number, number];

export interface UmbrellasParams {
    /** 1 to 3 umbrellas; the first is the shared one. */
    count: number;
    /** 1 draws raindrops and puddles, 0 a dry spell with the umbrellas still up. */
    rain: number;
}

const SIZE = 0.62,
    PANELS = 4;
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/**
 * Each umbrella: its marker, its half-width, who holds it and who walks under it with them (offset
 * from the handle), and how far the group reaches either side of the handle, for even gaps.
 */
const GROUPS: {
    marker: Marker;
    half: number;
    holder: Partial<PersonParams>;
    with: { look: Partial<PersonParams>; dx: number }[];
    reach: [number, number];
}[] = [
    {
        marker: "berry",
        half: 38,
        reach: [38, 38],
        holder: { age: "grownup", tone: 5, hair: "bun", colour: "black", top: "mint", dir: 1 },
        with: [
            {
                look: {
                    age: "child",
                    tone: 5,
                    hair: "coily",
                    colour: "black",
                    top: "glow",
                    dir: 1,
                },
                dx: 14,
            },
        ],
    },
    {
        marker: "sky",
        half: 27,
        reach: [27, 27],
        holder: {
            age: "grownup",
            tone: 1,
            hair: "short",
            colour: "brown",
            top: "tang",
            glasses: true,
            dir: -1,
        },
        with: [],
    },
    {
        marker: "mint",
        half: 27,
        reach: [27, 37],
        holder: { age: "older", tone: 3, hair: "scarf", top: "berry", aid: "cane", dir: -1 },
        with: [],
    },
];

const countOf = (p: UmbrellasParams) => Math.max(1, Math.min(GROUPS.length, Math.round(p.count)));

/** An open umbrella seen from the side, its panels between the ribs coloured and white in turn. Returns the tip. */
function umbrella<G>(c: Ctx<G>, cx: number, rim: number, half: number, marker: Marker): Pt {
    const { pen, g } = c,
        apex = rim - half * 0.62,
        sag = Math.min(4, half * 0.12),
        crown = apex + half * 0.05;
    const tip = (i: number) => cx - half + (2 * half * i) / PANELS;
    const mid = (i: number) => (tip(i) + tip(i + 1)) / 2;
    for (let i = 0; i < PANELS; i++) {
        const d = `M${cx} ${apex}Q${tip(i)} ${crown} ${tip(i)} ${rim}Q${mid(i)} ${rim - 2 * sag} ${tip(i + 1)} ${rim}Q${tip(i + 1)} ${crown} ${cx} ${apex}Z`;
        // the fill keeps to the drawn shape, so a colour never spills past the outline
        pen.path(g, d, "ruler", pen.fill(i % 2 ? "card" : marker), {
            strokeWidth: 0.1,
            stroke: "none",
            roughness: 0.05,
            ...FIRM,
        });
    }
    let edge = `M${tip(0)} ${rim}Q${tip(0)} ${crown} ${cx} ${apex}Q${tip(PANELS)} ${crown} ${tip(PANELS)} ${rim}`;
    for (let i = PANELS - 1; i >= 0; i--) edge += `Q${mid(i)} ${rim - 2 * sag} ${tip(i)} ${rim}`;
    pen.path(g, `${edge}Z`, "ruler", null, { strokeWidth: 1.8, ...FIRM });
    for (let i = 1; i < PANELS; i++)
        pen.path(g, `M${cx} ${apex}Q${tip(i)} ${crown} ${tip(i)} ${rim}`, "ruler", null, {
            strokeWidth: 1.2,
            ...FIRM,
        });
    for (let i = 0; i <= PANELS; i++)
        pen.circle(
            g,
            tip(i),
            rim,
            3.4,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6, ...FIRM },
        );
    pen.line(g, cx, apex, cx, apex - 6, "ruler", { strokeWidth: 1.8, ...FIRM });
    return [cx, apex - 6];
}

/** A raindrop, point up. */
const drop = <G>(c: Ctx<G>, x: number, y: number) =>
    c.pen.path(
        c.g,
        `M${x} ${y - 6}Q${x + 3.6} ${y + 0.5} ${x} ${y + 3.4}Q${x - 3.6} ${y + 0.5} ${x} ${y - 6}Z`,
        "ruler",
        c.pen.fill("sky"),
        { strokeWidth: 1.2, ...FIRM },
    );

/** A puddle seen edge on, lying in the pavement, with a splash where a drop lands in it. */
function puddle<G>(c: Ctx<G>, x: number, y: number): void {
    c.pen.path(
        c.g,
        `M${x - 17} ${y}Q${x} ${y + 8} ${x + 17} ${y}Q${x} ${y + 1.5} ${x - 17} ${y}Z`,
        "ruler",
        c.pen.fill("sky"),
        { strokeWidth: 1.2, roughness: 0.2, ...FIRM },
    );
    for (const d of [-1, 1])
        c.pen.line(c.g, x + d * 2.5, y - 2.5, x + d * 5.5, y - 7.5, "ruler", {
            strokeWidth: 1.2,
            ...FIRM,
        });
}

export const umbrellas = defineDrawing<UmbrellasParams>({
    id: "umbrellas",
    family: "people",
    title: "Umbrellas in the rain",
    group: "Characters",
    about: "People walking in the rain under umbrellas: a grown-up and a child share one, and the others carry their own. Every umbrella shows four panels, coloured and white in turn, so the umbrellas, the people under them and the panels can all be counted.",
    params: { count: 3, rain: 1 },
    settings: { count: { kind: "whole", min: 1, max: 3 }, rain: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Three umbrellas in the rain", params: { count: 3, rain: 1 } },
        { label: "Sharing one", params: { count: 1, rain: 1 } },
        { label: "Two, after the rain", params: { count: 2, rain: 0 } },
    ],
    box: () => ({ w: 12, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = countOf(p),
            wet = p.rain > 0,
            W = 12 * U,
            base = 6.75 * U,
            a: RawAnchors = {};
        const groups = GROUPS.slice(0, n);
        const gap = (W - groups.reduce((t, s) => t + s.reach[0] + s.reach[1], 0)) / (n + 1);
        const centres: number[] = [];
        let left = gap;
        for (const s of groups) {
            centres.push(left + s.reach[0]);
            left += s.reach[0] + s.reach[1] + gap;
        }
        const gaps = [gap / 2, ...groups.map((s, i) => (centres[i] ?? 0) + s.reach[1] + gap / 2)];

        pen.line(g, 0.15 * U, base + 0.5, W - 0.15 * U, base + 0.5, "pencil", { strokeWidth: 1.8 });
        if (wet) for (const [i, x] of gaps.entries()) if (i > 0 && i < n) puddle(c, x, base + 0.5);

        groups.forEach((s, i) => {
            const cx = centres[i] ?? W / 2,
                d = s.holder.dir ?? 1;
            const wc = part(c, "walker", [cx, base]);
            const heads: number[] = [];
            s.with.forEach((m, j) => {
                const at = placePerson(
                    wc,
                    { ...person.params, ...m.look, pose: "walk" },
                    cx + m.dx,
                    base,
                    { size: SIZE, seed: i * 4 + j + 2 },
                );
                if (at.head) heads.push(at.head[1]);
            });
            const at = placePerson(
                wc,
                { ...person.params, ...s.holder, pose: "walk" },
                cx - d * 16,
                base,
                { size: SIZE, grip: true, seed: i * 4 + 1 },
            );
            if (at.head) heads.push(at.head[1]);
            const hand = at.hand ?? [cx, base - 70];
            const rim = Math.min(...heads) - 4;
            wc.pen.line(wc.g, hand[0], hand[1], hand[0], rim, "ruler", {
                strokeWidth: 2.2,
                ...FIRM,
            });
            const top = umbrella(wc, hand[0], rim, s.half, s.marker);
            a[`umbrella(${i + 1})`] = [top[0], top[1], "up"];
        });

        if (wet) {
            for (const [i, x] of gaps.entries()) {
                const y = base - (i % 2 ? 3.6 : 2.4) * U;
                drop(c, x - 1, y);
                drop(c, x + 2, y + 1.3 * U);
            }
        }
        a.ground = [W / 2, base, "down"];
        return a;
    },
    describe: (p) => describeUmbrellas(p),
    motion: {
        parts: {
            walker: { is: "idle", deg: 1.6, period: 3.8, wave: 0.5 },
            eyes: { is: "blink", period: 4.6 },
        },
    },
});

/** What a screen reader says: who walks under what, never how many, since a question may ask. */
function describeUmbrellas(p: UmbrellasParams): string {
    const wet = p.rain > 0;
    const where = wet ? "in the rain past puddles" : "along a street";
    if (countOf(p) === 1)
        return `A grown-up and a child walking ${where}, sharing an umbrella with coloured and white panels.`;
    return `People walking ${where} under umbrellas with coloured and white panels. A grown-up and a child share the first, and the others each carry their own.`;
}
