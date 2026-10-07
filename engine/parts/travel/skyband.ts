import { clip, pattern, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "../outdoors/wash";

const KINDS = ["aurora", "nebula", "earthcurve", "comets", "wash", "cumulus"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "aurora";

const TONES = ["sky", "pen", "berry", "mint"] as const;
type Tone = (typeof TONES)[number];
const toneOf = (v: string): Tone => TONES.find((k) => k === v) ?? "sky";

const W = 36,
    H = 12;
const BOX: Record<Kind, { w: number; h: number }> = {
    aurora: { w: W, h: H },
    nebula: { w: W, h: H },
    earthcurve: { w: W, h: H },
    comets: { w: W, h: H },
    wash: { w: W, h: H },
    cumulus: { w: 14, h: 8 },
};

const WORDS: Record<Kind, string> = {
    aurora: "Soft curtains of green, blue and pink light hanging in folds from rippling ribbons high in the sky, the aurora a robot flies up through on its way to space",
    nebula: "A soft cloud of pink, blue and yellow dust far out in space, glowing brightest in its middle and sprinkled with little twinkling stars",
    earthcurve:
        "The Earth from the edge of space, its blue sea and green lands curving away below with wisps of cloud and a glowing line of air along its rim",
    comets: "Two little comets streaking across the far sky, each a bright yellow head trailing a long soft tail behind it",
    wash: "A soft wash of colour across the whole sky, fading out at its top and its foot, laid behind a climb so the sky deepens higher up",
    cumulus:
        "A tall white cumulus cloud of round puffs piled on a flat foot, lit from above and shaded soft blue underneath, drifting far behind the play",
};

/** A small four-pointed star, its middle at x, y and its points r out. */
const twinkle = (x: number, y: number, r: number): string =>
    `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

/** A circle as four curves, in user units, so a cloud's puffs join into one outline. */
const ring = (x: number, y: number, r: number): string => {
    const k = 0.5523 * r;
    return `M${x - r} ${y}C${x - r} ${y - k} ${x - k} ${y - r} ${x} ${y - r}C${x + k} ${y - r} ${x + r} ${y - k} ${x + r} ${y}C${x + r} ${y + k} ${x + k} ${y + r} ${x} ${y + r}C${x - k} ${y + r} ${x - r} ${y + k} ${x - r} ${y}Z`;
};

/** The Earth's rim, the top of a circle of 34.9 squares whose top is 3 squares down the middle of the band. */
const EARTH = { r: 34.9, cx: 18, cy: 37.9 };
const rimAt = (x: number, r = EARTH.r): number =>
    EARTH.cy - Math.sqrt(Math.max(0, r * r - (x - EARTH.cx) * (x - EARTH.cx)));
const rimPath = (r: number, from = 0, to = W): string => {
    let d = "";
    for (let x = from; x <= to + 1e-6; x += 1) d += `${d ? "L" : "M"}${x * U} ${rimAt(x, r) * U}`;
    return d;
};

/** The puffs of a cumulus, in squares: their middles and sizes, in two shapes. */
const PUFFS: readonly (readonly [number, number, number])[][] = [
    [
        [3.1, 5.2, 1.9],
        [5.6, 4.0, 2.5],
        [8.7, 3.4, 2.9],
        [11.3, 4.8, 2.1],
        [7.2, 5.4, 2.1],
    ],
    [
        [2.8, 5.4, 1.7],
        [5.0, 3.6, 2.4],
        [7.6, 2.9, 2.6],
        [10.0, 4.2, 2.3],
        [11.9, 5.4, 1.5],
    ],
];
const FOOT = 6.6;

function aurora<G>(c: Ctx<G>, n: number): void {
    const ribbons = [
        { tone: c.t.mint, base: 2.6, amp: 1.3, ph: 0 },
        { tone: c.t.sky, base: 3.4, amp: 1.1, ph: 0.6 },
        { tone: c.t.berry, base: 4.2, amp: 0.9, ph: 1.2 },
    ] as const;
    ribbons.forEach((rb, r) => {
        const top = (x: number) =>
            rb.base +
            rb.amp * Math.sin((x / W) * Math.PI * 2.4 + rb.ph + n) +
            0.35 * Math.sin(x / 4.5 + rb.ph * 2 + n);
        if (c.paper) {
            let d = "";
            for (let x = 1; x <= W - 1; x += 1) d += `${d ? "L" : "M"}${x * U} ${top(x) * U}`;
            c.pen.path(c.g, d, "pencil", null, { strokeWidth: 0.9, roughness: 0.4 });
            for (let i = 0; i < 6; i++) {
                const x = 2 + i * 6 + r * 2;
                c.pen.line(c.g, x * U, top(x) * U, x * U, (top(x) + 2.2) * U, "pencil", {
                    strokeWidth: 0.6,
                    roughness: 0.4,
                });
            }
            return;
        }
        // each curtain is two soft sheets hanging from the ribbon, the shorter over the longer, so the light is brightest at the top and fades as it hangs
        const hang = (x: number) =>
            3.4 - r * 0.6 + 1.2 * Math.sin(x / 3.1 + rb.ph + n * 2) + 0.5 * Math.sin(x / 1.7 + r);

        for (const [f, o] of [
            [1, 0.16],
            [0.45, 0.2],
        ] as const) {
            let d = "";
            for (let x = 0.5; x <= W - 0.5; x += 0.5) d += `${d ? "L" : "M"}${x * U} ${top(x) * U}`;
            for (let x = W - 0.5; x >= 0.5; x -= 0.5)
                d += `L${x * U} ${(top(x) + hang(x) * f) * U}`;
            plain(c, { kind: "path", d: `${d}Z`, fill: rb.tone, opacity: o });
        }
        for (let i = 0, x = 1.2; x < W - 1; i++, x += 1.6 + hash(i, r + n * 5) * 1.2)
            plain(c, {
                kind: "path",
                d: `M${x * U} ${top(x) * U}V${(top(x) + hang(x) * (0.6 + hash(i, r + 9) * 0.35)) * U}`,
                fill: "none",
                stroke: rb.tone,
                width: 0.3 * U,
                cap: "round",
                opacity: 0.28,
            });
        let d = "";
        for (let x = 0.5; x <= W - 0.5; x += 0.5) d += `${d ? "L" : "M"}${x * U} ${top(x) * U}`;
        plain(c, {
            kind: "path",
            d,
            fill: "none",
            stroke: rb.tone,
            width: 1.3 * U,
            opacity: 0.14,
            cap: "round",
        });
        plain(c, {
            kind: "path",
            d,
            fill: "none",
            stroke: rb.tone,
            width: 0.3 * U,
            opacity: 0.55,
            cap: "round",
        });
    });
}

function nebula<G>(c: Ctx<G>, n: number): void {
    if (!c.paper)
        for (const [i, [x, y, rx, ry, tone, o]] of (
            [
                [11, 6, 10, 4.8, c.t.berry, 0.42],
                [21, 5, 11, 4.4, c.t.sky, 0.4],
                [16, 6.5, 6, 3, c.t.glow, 0.38],
                [28, 7, 7, 3.4, c.t.berry, 0.3],
                [7, 4.5, 5, 2.6, c.t.mint, 0.25],
                [25, 3.5, 5, 2.2, c.t.card, 0.6],
            ] as const
        ).entries()) {
            const fill = pattern(c, {
                kind: "radial",
                stops: [
                    { at: 0, color: tone, opacity: o },
                    { at: 55, color: tone, opacity: o * 0.45 },
                    { at: 100, color: tone, opacity: 0 },
                ],
            });
            plain(c, {
                kind: "ellipse",
                cx: (x + (hash(i, n + 3) - 0.5) * 3 * n) * U,
                cy: y * U,
                rx: rx * U,
                ry: ry * U,
                fill,
            });
        }
    else
        c.pen.path(
            c.g,
            `M${6 * U} ${7 * U}C${8 * U} ${2 * U} ${18 * U} ${2 * U} ${20 * U} ${5.5 * U}S${15 * U} ${9.5 * U} ${13 * U} ${7 * U}`,
            "pencil",
            null,
            { strokeWidth: 0.9, roughness: 0.4 },
        );
    for (let i = 0; i < 18; i++) {
        const x = (1 + hash(i, 11 + n) * (W - 2)) * U,
            y = (1 + hash(i, 13 + n) * (H - 2)) * U,
            r = (0.12 + hash(i, 17 + n) * 0.22) * U;
        c.pen.path(c.g, twinkle(x, y, r), "pencil", c.pen.fill("glow"), {
            strokeWidth: 0.6,
            roughness: 0.2,
        });
    }
}

function earth<G>(c: Ctx<G>): void {
    const disc = `${rimPath(EARTH.r)}L${W * U} ${H * U}L0 ${H * U}Z`;
    const lands: readonly (readonly [number, number, number])[] = [
        [5.5, 1.6, 0.8],
        [12, 2.4, 0.6],
        [17.5, 1.5, 1.1],
        [25, 1.9, 0.9],
        [31.5, 2.6, 0.7],
    ];
    // a land is a ring of eight points pulled in and out, joined smoothly through their midpoints
    const land = (x: number, below: number, s: number) => {
        const y = rimAt(x) + below,
            pts = Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2,
                    k = 0.65 + 0.5 * hash(i, Math.round(x * 7));
                return [x + Math.cos(a) * 2.3 * s * k, y + Math.sin(a) * 1.1 * s * k] as const;
            }),
            at = (i: number) => pts[i % pts.length] ?? [x, y],
            midOf = (i: number) => {
                const [ax, ay] = at(i),
                    [bx, by] = at(i + 1);
                return [((ax + bx) / 2) * U, ((ay + by) / 2) * U] as const;
            };
        let d = `M${midOf(0)[0]} ${midOf(0)[1]}`;
        for (let i = 1; i <= pts.length; i++) {
            const [px, py] = at(i),
                [mx, my] = midOf(i);
            d += `Q${px * U} ${py * U} ${mx} ${my}`;
        }
        return `${d}Z`;
    };
    if (!c.paper) {
        // a thin glow of air above the rim, brightest where it meets the sea
        for (const [dr, w, o] of [
            [1.0, 0.9, 0.12],
            [0.55, 0.6, 0.2],
            [0.22, 0.35, 0.4],
        ] as const)
            plain(c, {
                kind: "path",
                d: rimPath(EARTH.r + dr),
                fill: "none",
                stroke: c.t.sky,
                width: w * U,
                cap: "round",
                opacity: o,
            });
        plain(c, { kind: "path", d: disc, fill: c.t.sky, opacity: 0.5 });
        plain(c, {
            kind: "path",
            d: `${rimPath(EARTH.r - 3, 3, 33)}L${33 * U} ${H * U}L${3 * U} ${H * U}Z`,
            fill: c.t.sky,
            opacity: 0.22,
        });
        for (const [x, below, s] of lands)
            plain(c, { kind: "path", d: land(x, below, s), fill: c.t.mint, opacity: 0.85 });
        // wisps of cloud over the sea and the lands
        const wisps = clip(c, { kind: "path", d: disc });
        for (let i = 0; i < 9; i++) {
            const x = 2 + i * 3.8 + hash(i, 41) * 1.5,
                y = rimAt(x) + 1 + hash(i, 43) * 6,
                l = 1.4 + hash(i, 47) * 1.6;
            plain(wisps, {
                kind: "path",
                d: `M${(x - l) * U} ${y * U}Q${x * U} ${(y - 0.5) * U} ${(x + l) * U} ${(y + 0.15) * U}`,
                fill: "none",
                stroke: c.t.card,
                width: 0.3 * U,
                cap: "round",
                opacity: 0.85,
            });
        }
        plain(c, {
            kind: "path",
            d: rimPath(EARTH.r - 0.1),
            fill: "none",
            stroke: c.t.card,
            width: 0.2 * U,
            opacity: 0.9,
        });
    }
    c.pen.path(c.g, rimPath(EARTH.r), "pencil", null, {
        strokeWidth: 1.3,
        stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        roughness: 0.3,
    });
    for (const [x, below, s] of lands)
        c.pen.path(c.g, land(x, below, s), "pencil", null, {
            strokeWidth: 0.9,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            roughness: 0.35,
        });
}

function comets<G>(c: Ctx<G>): void {
    for (const [x, y, len, dip] of [
        [26, 3, 14, 2.5],
        [12, 8, 10, 1.6],
    ] as const) {
        const hx = x * U,
            hy = y * U,
            tx = (x - len) * U,
            ty = (y - dip) * U,
            line = {
                strokeWidth: 0.8,
                stroke: c.paper ? c.t.ink : c.t["glow-ink"],
                roughness: 0.4,
            };
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${hx} ${hy - 0.5 * U}Q${(x - len / 2) * U} ${(y - dip / 2 - 0.9) * U} ${tx} ${ty}Q${(x - len / 2) * U} ${(y - dip / 2 + 0.6) * U} ${hx} ${hy + 0.5 * U}Z`,
                fill: c.t.glow,
                opacity: 0.35,
            });
        c.pen.path(
            c.g,
            `M${hx} ${hy - 0.5 * U}Q${(x - len / 2) * U} ${(y - dip / 2 - 0.9) * U} ${tx} ${ty}`,
            "pencil",
            null,
            line,
        );
        c.pen.path(
            c.g,
            `M${hx} ${hy + 0.5 * U}Q${(x - len / 2) * U} ${(y - dip / 2 + 0.6) * U} ${tx} ${ty}`,
            "pencil",
            null,
            line,
        );
        c.pen.circle(c.g, hx, hy, 1.3 * U, "pencil", c.pen.fill("glow"), {
            strokeWidth: 1.2,
            roughness: 0.3,
        });
    }
}

function cumulus<G>(c: Ctx<G>, n: number): void {
    const puffs = PUFFS[n % PUFFS.length] ?? [],
        all = puffs.map(([x, y, r]) => ring(x * U, y * U, r * U)).join(""),
        left = Math.min(...puffs.map(([x, , r]) => x - r * 0.8)),
        right = Math.max(...puffs.map(([x, , r]) => x + r * 0.8));
    if (c.paper) {
        for (const [x, y, r] of puffs)
            c.pen.path(
                c.g,
                `M${(x - r * 0.95) * U} ${Math.min(FOOT, y + r * 0.3) * U}Q${(x - r) * U} ${(y - r) * U} ${x * U} ${(y - r) * U}Q${(x + r) * U} ${(y - r) * U} ${(x + r * 0.95) * U} ${Math.min(FOOT, y + r * 0.3) * U}`,
                "pencil",
                null,
                { strokeWidth: 0.9, roughness: 0.4 },
            );
        c.pen.line(c.g, left * U, FOOT * U, right * U, FOOT * U, "pencil", {
            strokeWidth: 0.9,
            roughness: 0.4,
        });
        return;
    }
    // cut flat at its foot, as a cumulus sits on the level where its air stops rising
    const body = clip(c, { kind: "rect", x: 0, y: 0, w: 14 * U, h: FOOT * U });
    // the outlines go down first and the white over them, so only the cloud's outer edge keeps a line
    for (const [x, y, r] of puffs)
        plain(body, {
            kind: "path",
            d: ring(x * U, y * U, r * U),
            fill: "none",
            stroke: c.t["ink-soft"],
            width: 2.2,
            opacity: 0.6,
        });
    plain(body, { kind: "path", d: all, fill: c.t.card });
    const shade = clip(body, { kind: "path", d: all });
    for (const [h, o] of [
        [2.4, 0.12],
        [1.4, 0.16],
        [0.6, 0.2],
    ] as const)
        plain(shade, {
            kind: "rect",
            x: 0,
            y: (FOOT - h) * U,
            w: 14 * U,
            h: h * U,
            fill: c.t.sky,
            opacity: o,
        });
    plain(c, {
        kind: "path",
        d: `M${left * U} ${FOOT * U}H${right * U}`,
        fill: "none",
        stroke: c.t["ink-soft"],
        width: 1.1,
        cap: "round",
        opacity: 0.6,
    });
}

function wash<G>(c: Ctx<G>, tone: Tone): void {
    if (c.paper) return;
    // a ramp of three squares at the top and the foot, so bands laid overlapping blend with no seam
    for (let y = 0; y < H; y += 0.5) {
        const mid = y + 0.25,
            ramp = Math.min(1, mid / 3, (H - mid) / 3);
        plain(c, {
            kind: "rect",
            x: 0,
            y: y * U,
            w: W * U,
            h: 0.55 * U,
            fill: c.t[tone],
            opacity: ramp,
        });
    }
}

export const skyBand = defineDrawing<{ kind: string; tone: string; n: number }>({
    id: "skyband",
    family: "travel",
    title: "Band of sky",
    group: "Props",
    about: "The sky high above the ground, drawn soft so it stays behind the play: an aurora's curtains, a nebula, the Earth curving away below, comets, a wash of sky colour, or a tall cumulus cloud.",
    params: { kind: "aurora", tone: "sky", n: 0 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        tone: { kind: "one of", of: TONES },
        n: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "An aurora", params: { kind: "aurora", tone: "sky", n: 0 } },
        { label: "A nebula", params: { kind: "nebula", tone: "sky", n: 0 } },
        { label: "The Earth below", params: { kind: "earthcurve", tone: "sky", n: 0 } },
        { label: "Comets", params: { kind: "comets", tone: "sky", n: 0 } },
        { label: "A wash of high sky", params: { kind: "wash", tone: "pen", n: 0 } },
        { label: "A cumulus cloud", params: { kind: "cumulus", tone: "sky", n: 0 } },
        { label: "Another cumulus", params: { kind: "cumulus", tone: "sky", n: 1 } },
    ],
    box: (p) => BOX[kindOf(p.kind)],
    draw: (c, p): RawAnchors => {
        const kind = kindOf(p.kind),
            n = Math.max(0, Math.round(p.n)),
            box = BOX[kind];
        if (kind === "aurora") aurora(c, n);
        else if (kind === "nebula") nebula(c, n);
        else if (kind === "earthcurve") earth(c);
        else if (kind === "comets") comets(c);
        else if (kind === "wash") wash(c, toneOf(p.tone));
        else cumulus(c, n);
        return { middle: [(box.w * U) / 2, (box.h * U) / 2, "up"] };
    },
    describe: (p) => `${WORDS[kindOf(p.kind)]}.`,
    motion: { still: "A band of sky holds still behind the play while the game climbs past it." },
});
