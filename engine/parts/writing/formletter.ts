import { plain, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

type Pt = [number, number];

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

const FAMILIES: Record<string, { letters: string; name: string }> = {
    ladder: { letters: "litjuy", name: "a ladder letter" },
    bridge: { letters: "rnmhbpk", name: "a bridge letter" },
    curly: { letters: "cadosgqef", name: "a curly letter" },
    zigzag: { letters: "vwxz", name: "a zigzag letter" },
};

const familyOf = (ch: string): string =>
    Object.keys(FAMILIES).find((k) => FAMILIES[k]?.letters.includes(ch)) ?? "curly";

/** Points round an ellipse, from one angle to another in degrees; 0 is to the right, 90 is down. */
function arc(cx: number, cy: number, rx: number, from: number, to: number, ry = rx): Pt[] {
    const n = Math.max(6, Math.ceil(Math.abs(to - from) / 10));
    return Array.from({ length: n + 1 }, (_, i) => {
        const t = ((from + ((to - from) * i) / n) * Math.PI) / 180;
        return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Pt;
    });
}

const bowlL = (x: number) => arc(x + 0.35, -0.5, 0.35, -20, -360, 0.5);

const bowlR = (x: number) => arc(x + 0.35, -0.5, 0.35, 180, 530, 0.5);

/** Each letter's width and its strokes in order; a stroke of one point is a dot. */
const LETTER_A: { w: number; s: Pt[][] } = {
    w: 0.85,
    s: [[...bowlL(0.07), [0.77, -1], [0.77, 0]]],
};
const STROKES: Record<string, { w: number; s: Pt[][] }> = {
    a: LETTER_A,
    b: { w: 0.85, s: [[[0.1, -2], [0.1, 0], [0.1, -0.5], ...bowlR(0.1)]] },
    c: { w: 0.8, s: [arc(0.45, -0.5, 0.38, -40, -320, 0.5)] },
    d: { w: 0.85, s: [[...bowlL(0.07), [0.77, -2], [0.77, 0]]] },
    e: { w: 0.85, s: [[[0.1, -0.5], [0.8, -0.5], ...arc(0.45, -0.5, 0.35, 0, -310, 0.5)]] },
    f: {
        w: 0.75,
        s: [
            [...arc(0.5, -1.6, 0.3, -20, -180, 0.4), [0.2, 0]],
            [
                [0, -1],
                [0.55, -1],
            ],
        ],
    },
    g: {
        w: 0.85,
        s: [[...bowlL(0.07), [0.77, -1], [0.77, 0.55], ...arc(0.47, 0.55, 0.3, 0, 160, 0.3)]],
    },
    h: {
        w: 0.8,
        s: [[[0.1, -2], [0.1, 0], [0.1, -0.6], ...arc(0.4, -0.6, 0.3, 180, 360), [0.7, 0]]],
    },
    i: {
        w: 0.4,
        s: [
            [
                [0.2, -1],
                [0.2, 0],
            ],
            [[0.2, -1.45]],
        ],
    },
    j: {
        w: 0.6,
        s: [[[0.45, -1], [0.45, 0.55], ...arc(0.25, 0.55, 0.2, 0, 160, 0.3)], [[0.45, -1.45]]],
    },
    k: {
        w: 0.75,
        s: [
            [
                [0.1, -2],
                [0.1, 0],
            ],
            [
                [0.68, -1],
                [0.12, -0.4],
                [0.7, 0],
            ],
        ],
    },
    l: {
        w: 0.4,
        s: [
            [
                [0.2, -2],
                [0.2, 0],
            ],
        ],
    },
    m: {
        w: 1.1,
        s: [
            [
                [0.08, -1],
                [0.08, 0],
                [0.08, -0.62],
                ...arc(0.3, -0.62, 0.22, 180, 360),
                [0.52, 0],
                [0.52, -0.62],
                ...arc(0.74, -0.62, 0.22, 180, 360),
                [0.96, 0],
            ],
        ],
    },
    n: {
        w: 0.8,
        s: [[[0.1, -1], [0.1, 0], [0.1, -0.6], ...arc(0.4, -0.6, 0.3, 180, 360), [0.7, 0]]],
    },
    o: { w: 0.9, s: [arc(0.45, -0.5, 0.4, -90, -445, 0.5)] },
    p: { w: 0.85, s: [[[0.1, -1], [0.1, 0.9], [0.1, -0.5], ...bowlR(0.1)]] },
    q: { w: 0.85, s: [[...bowlL(0.07), [0.77, -1], [0.77, 0.9]]] },
    r: { w: 0.7, s: [[[0.1, -1], [0.1, 0], [0.1, -0.55], ...arc(0.4, -0.6, 0.3, 180, 320)]] },
    s: {
        w: 0.75,
        s: [[...arc(0.38, -0.75, 0.28, -20, -270, 0.25), ...arc(0.38, -0.25, 0.3, -90, 160, 0.25)]],
    },
    t: {
        w: 0.7,
        s: [
            [[0.3, -1.7], [0.3, -0.2], ...arc(0.5, -0.2, 0.2, 180, 60)],
            [
                [0.05, -1],
                [0.6, -1],
            ],
        ],
    },
    u: {
        w: 0.8,
        s: [[[0.1, -1], [0.1, -0.35], ...arc(0.4, -0.35, 0.3, 180, 0), [0.7, -1], [0.7, 0]]],
    },
    v: {
        w: 0.8,
        s: [
            [
                [0.05, -1],
                [0.4, 0],
                [0.75, -1],
            ],
        ],
    },
    w: {
        w: 1.1,
        s: [
            [
                [0.05, -1],
                [0.3, 0],
                [0.55, -0.75],
                [0.8, 0],
                [1.05, -1],
            ],
        ],
    },
    x: {
        w: 0.75,
        s: [
            [
                [0.05, -1],
                [0.7, 0],
            ],
            [
                [0.7, -1],
                [0.05, 0],
            ],
        ],
    },
    y: {
        w: 0.8,
        s: [
            [
                [0.1, -1],
                [0.1, -0.35],
                ...arc(0.4, -0.35, 0.3, 180, 0),
                [0.7, -1],
                [0.7, 0.55],
                ...arc(0.45, 0.55, 0.25, 0, 160, 0.3),
            ],
        ],
    },
    z: {
        w: 0.75,
        s: [
            [
                [0.08, -1],
                [0.68, -1],
                [0.08, 0],
                [0.72, 0],
            ],
        ],
    },
};

/** How far along a stroke each point is, so an arrow can be put a share of the way along it. */
function along(pts: Pt[]): number[] {
    const d = [0];
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1] ?? [0, 0],
            [bx, by] = pts[i] ?? [0, 0];
        d.push((d[i - 1] ?? 0) + Math.hypot(bx - ax, by - ay));
    }
    return d;
}

/** A chevron on a stroke a share of the way along it, pointing the way the pencil goes. */
function chevron<G>(c: Ctx<G>, pts: Pt[], at: number): void {
    const d = along(pts),
        total = (d[d.length - 1] ?? 0) || 1;
    let i = d.findIndex((x) => x >= at * total);
    if (i < 1) i = 1;
    const [x0, y0] = pts[i - 1] ?? [0, 0],
        [x1, y1] = pts[i] ?? [0, 0];
    const t = (at * total - (d[i - 1] ?? 0)) / Math.max(1e-6, (d[i] ?? 0) - (d[i - 1] ?? 0));
    const x = x0 + (x1 - x0) * t,
        y = y0 + (y1 - y0) * t,
        ang = Math.atan2(y1 - y0, x1 - x0);
    const tip: Pt = [x + 6 * Math.cos(ang), y + 6 * Math.sin(ang)];
    for (const s of [-1, 1]) {
        const b = ang + Math.PI + s * 0.62;
        c.pen.line(
            c.g,
            tip[0],
            tip[1],
            tip[0] + 12 * Math.cos(b),
            tip[1] + 12 * Math.sin(b),
            "ruler",
            { stroke: c.t.pen, strokeWidth: 3 },
        );
    }
}

const LETTER_X = 3;

const CELL = 5;

const FORM_TOP = 1.8;

const formW = (p: { copies: number; write: number }) =>
    2 + CELL * (1 + Math.max(0, p.copies) + Math.max(0, p.write));

/** A small picture of a family's shape, so the name has something to point at before it is read. */
function familyIcon<G>(c: Ctx<G>, family: string, x: number, y: number): void {
    const { pen, g } = c,
        s = { stroke: c.t.pen, strokeWidth: 1.8 };
    if (family === "ladder") {
        pen.line(g, x - 7, y - 12, x - 7, y + 12, "pencil", s);
        pen.line(g, x + 7, y - 12, x + 7, y + 12, "pencil", s);
        for (const k of [-6, 0, 6]) pen.line(g, x - 7, y + k, x + 7, y + k, "pencil", s);
    } else if (family === "bridge") {
        pen.path(
            g,
            `M${x - 13} ${y + 10}V${y}A${13} ${11} 0 0 1 ${x + 13} ${y}V${y + 10}`,
            "pencil",
            null,
            s,
        );
        pen.line(g, x - 16, y + 10, x + 16, y + 10, "pencil", s);
    } else if (family === "zigzag") {
        pen.linear(
            g,
            [
                [x - 14, y - 8],
                [x - 7, y + 8],
                [x, y - 8],
                [x + 7, y + 8],
                [x + 14, y - 8],
            ],
            "pencil",
            s,
        );
    } else {
        pen.linear(g, arc(x, y, 12, -30, -330), "pencil", s);
        pen.linear(g, arc(x, y, 5, -30, -330), "pencil", s);
    }
}

export const formLetter = defineDrawing({
    id: "formletter",
    family: "writing",
    title: "Where a letter starts",
    group: "Structures",
    about: "One letter drawn large on a four-line guide, with a dot where each stroke starts, a number for the order of the strokes and an arrow for the way the pencil goes. Copies to trace follow it, then room for the child's own. A letter is learned as a movement rather than a shape, which is why the start and the direction are the drawing.",
    params: { letter: "a", copies: 2, write: 1, label: true },
    settings: {
        letter: { kind: "one of", of: LETTERS },
        copies: { kind: "whole", min: 0, max: 4 },
        write: { kind: "whole", min: 0, max: 4 },
        label: { kind: "flag" },
    },
    takes: [
        {
            label: "a, with two to trace",
            params: { letter: "a", copies: 2, write: 1, label: true },
        },
        { label: "k, two strokes", params: { letter: "k", copies: 1, write: 1, label: true } },
        { label: "s, three to trace", params: { letter: "s", copies: 3, write: 0, label: false } },
        { label: "y, with a tail", params: { letter: "y", copies: 1, write: 1, label: true } },
    ],
    box: (p) => ({ w: formW(p), h: p.label ? 13 : 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const xs = LETTER_X * U,
            top = FORM_TOP * U,
            base = top + 2 * xs,
            W = formW(p) * U;
        const def = STROKES[p.letter] ?? LETTER_A;
        const Y = (y: number) => base + y * xs;
        pen.line(g, 0.5 * U, top, W - 0.5 * U, top, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        pen.line(g, 0.5 * U, Y(-1), W - 0.5 * U, Y(-1), "ruler", {
            strokeWidth: 1,
            strokeLineDash: [6, 7],
            stroke: c.t["ink-soft"],
        });
        pen.line(g, 0.5 * U, base, W - 0.5 * U, base, "ruler", { strokeWidth: 2 });
        pen.line(g, 0.5 * U, Y(0.9), W - 0.5 * U, Y(0.9), "ruler", {
            strokeWidth: 0.8,
            strokeLineDash: [2, 6],
            stroke: c.t["ink-soft"],
        });
        const cellX = (k: number) => (1 + k * CELL) * U + (CELL * U - def.w * xs) / 2;
        const toUser =
            (x0: number) =>
            (s: Pt[]): Pt[] =>
                s.map(([x, y]) => [x0 + x * xs, Y(y)]);
        const d = (s: Pt[]) =>
            s.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

        const model = def.s.map(toUser(cellX(0)));
        const wash = group(c, { opacity: c.paper ? 1 : 0.4 });
        for (const s of model) {
            if (s.length === 1)
                plain(wash, {
                    kind: "circle",
                    cx: (s[0] ?? [0, 0])[0],
                    cy: (s[0] ?? [0, 0])[1],
                    r: 9,
                    fill: c.paper ? c.t.grid : c.t.sky,
                });
            else
                plain(wash, {
                    kind: "path",
                    d: d(s),
                    fill: "none",
                    stroke: c.paper ? c.t.grid : c.t.sky,
                    width: 17,
                    cap: "round",
                    join: "round",
                });
        }
        for (const s of model) {
            if (s.length === 1)
                pen.circle(
                    g,
                    (s[0] ?? [0, 0])[0],
                    (s[0] ?? [0, 0])[1],
                    8,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 1 },
                );
            else
                plain(c, {
                    kind: "path",
                    d: d(s),
                    fill: "none",
                    stroke: c.t.ink,
                    width: 3,
                    cap: "round",
                    join: "round",
                });
        }
        def.s.forEach((raw, i) => {
            const s = model[i] ?? [];
            if (s.length > 1) {
                const long = (along(raw)[raw.length - 1] ?? 0) > 1.6;
                for (const at of long ? [0.22, 0.62, 0.9] : [0.55]) chevron(c, s, at);
            }
            const [sx, sy] = s[0] ?? [0, 0];
            pen.circle(g, sx, sy, 13, "ruler", c.pen.fill("berry"), { strokeWidth: 1.4 });
            // The number sits up and away from the letter, on the side its stroke starts from, so it
            // never lands on a stroke.
            const side = (raw[0] ?? [0, 0])[0] > def.w / 2 ? 1 : -1;
            const bx = sx + side * 0.42 * xs,
                by = sy - 0.42 * xs;
            pen.circle(g, bx, by, 22, "ruler", c.pen.fill("card"), {
                strokeWidth: 1.4,
                stroke: c.t.pen,
            });
            num(c, bx, by + 5, i + 1, 14, "middle", c.t.pen);
            a[`start(${i + 1})`] = [sx, sy, "up"];
        });
        a.model = [cellX(0) + (def.w * xs) / 2, top, "up"];

        for (let k = 1; k <= Math.max(0, p.copies); k++) {
            const x0 = cellX(k);
            for (const s of def.s.map(toUser(x0))) {
                if (s.length === 1)
                    plain(c, {
                        kind: "circle",
                        cx: (s[0] ?? [0, 0])[0],
                        cy: (s[0] ?? [0, 0])[1],
                        r: 4,
                        fill: "none",
                        stroke: c.t["ink-soft"],
                        width: 1.4,
                    });
                else
                    plain(c, {
                        kind: "path",
                        d: d(s),
                        fill: "none",
                        stroke: c.t["ink-soft"],
                        width: 2.2,
                        dash: "3 6",
                        cap: "round",
                    });
                pen.circle(
                    g,
                    (s[0] ?? [0, 0])[0],
                    (s[0] ?? [0, 0])[1],
                    9,
                    "ruler",
                    c.pen.fill("berry"),
                    {
                        strokeWidth: 1,
                    },
                );
            }
            a[`copy(${k - 1})`] = [x0 + (def.w * xs) / 2, top, "up"];
        }
        if (p.write > 0) a.write = [(1 + (1 + p.copies) * CELL + 0.5) * U, base, "up"];
        if (p.label) {
            const fam = familyOf(p.letter);
            familyIcon(c, fam, 1.9 * U, 11.9 * U);
            say(c, 3.1 * U, 12.2 * U, `${p.letter} is ${FAMILIES[fam]?.name ?? ""}`, 17, "start");
        }
        return a;
    },
    describe: () =>
        "One letter large on a four line guide, a dot where each stroke starts, a number for its order and an arrow for its way, and copies to trace.",
});
