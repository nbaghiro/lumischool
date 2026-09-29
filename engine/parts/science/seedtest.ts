import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, say, soft } from "../lettering";
import { lightFill } from "./apparatus";

/**
 * How many of a dish's seeds have sprouted after a week. A cress seed needs water, air and warmth to
 * germinate and does not need light, since it grows on the food stored in the seed; of the seeds
 * that have all three, the packet's share (`rate` per cent) sprout.
 */
export const sprouted = (
    seeds: number,
    rate: number,
    water: number,
    air: number,
    warmth: number,
): number =>
    water > 0 && air > 0 && warmth > 0
        ? Math.round((Math.round(seeds) * Math.max(0, Math.min(100, rate))) / 100)
        : 0;

const CONDITIONS = ["water", "air", "warmth", "light"] as const;
const LEFT = 4.6 * U,
    PITCH = 5 * U,
    RIM = 5.6 * U;

type Dish = { water: number; air: number; warmth: number; light: number };

/** A cress seedling standing on the cotton wool: a hook of root, a stalk and two round seed leaves. */
function seedling<G>(c: Ctx<G>, x: number, y: number, dark: boolean, back: boolean): void {
    const { pen, g } = c,
        tall = (dark ? 2.6 * U : 1.5 * U) + (back ? 0.55 * U : 0),
        top = y - tall;
    pen.curve(
        g,
        [
            [x, y],
            [x - 2, y + 3],
            [x, y + 6],
        ],
        "ruler",
        { strokeWidth: 1.1 },
    );
    pen.curve(
        g,
        [
            [x, y],
            [x + 2, y - tall / 2],
            [x, top],
        ],
        "ruler",
        { strokeWidth: 1.3 },
    );
    // grown in the dark, a seedling is tall and pale, since it makes no green without light
    const leaf = dark ? pen.fill("glow", "solid") : pen.fill("mint", "solid");
    for (const s of [-1, 1])
        pen.ellipse(g, x + s * 4, top - 2, 7.5, 5, "ruler", leaf, { strokeWidth: 1.1 });
}

function dishAt<G>(c: Ctx<G>, i: number, d: Dish, seeds: number, grown: number, after: boolean) {
    const { pen, g } = c,
        cx = LEFT + i * PITCH + PITCH / 2,
        w = 4.4 * U;
    pen.path(
        g,
        `M${cx - w / 2} ${RIM}V${RIM + 0.7 * U}Q${cx - w / 2} ${RIM + 1.1 * U} ${cx - w / 2 + 8} ${RIM + 1.1 * U}H${cx + w / 2 - 8}Q${cx + w / 2} ${RIM + 1.1 * U} ${cx + w / 2} ${RIM + 0.7 * U}V${RIM}`,
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.8 },
    );
    // the cotton wool, wet or dry, and water over the seeds when they have no air
    pen.path(
        g,
        `M${cx - w / 2 + 3} ${RIM + 0.7 * U}q6 -6 12 0t12 0t12 0t12 0t12 0t12 0t12 0H${cx + w / 2 - 3}`,
        "ruler",
        null,
        { strokeWidth: 1.1 },
    );
    if (d.water > 0 && d.air > 0)
        pen.rect(
            g,
            cx - w / 2 + 3,
            RIM + 0.75 * U,
            w - 6,
            0.3 * U,
            "ruler",
            lightFill(c, "sky", "hachure", 3),
            {
                stroke: "none",
            },
        );
    const n = Math.max(1, Math.min(10, Math.round(seeds))),
        row = Math.ceil(n / 2);
    // the back row first, so the front row's seedlings stand in front of it
    for (const k of [...Array(n).keys()].sort((u, v) => Number(v >= row) - Number(u >= row))) {
        const r = k < row ? 0 : 1,
            j = r === 0 ? k : k - row,
            count = r === 0 ? row : n - row,
            x = cx - ((count - 1) / 2) * 0.8 * U + j * 0.8 * U + r * 0.4 * U,
            y = RIM + 0.55 * U - r * 0.18 * U,
            up = Math.floor(((k + 1) * grown) / n) > Math.floor((k * grown) / n);
        if (after && up) seedling(c, x, y, d.light === 0, r === 1);
        pen.ellipse(g, x, y, 7, 5, "ruler", pen.fill("tang", "solid"), { strokeWidth: 1 });
    }
    if (d.air === 0) {
        pen.rect(
            g,
            cx - w / 2 + 2,
            RIM - 0.9 * U,
            w - 4,
            1.5 * U,
            "ruler",
            lightFill(c, "sky", "hachure", 4),
            {
                stroke: "none",
            },
        );
        pen.line(g, cx - w / 2 + 2, RIM - 0.9 * U, cx + w / 2 - 2, RIM - 0.9 * U, "ruler", {
            strokeWidth: 1.2,
        });
        pen.rect(
            g,
            cx - w / 2 + 2,
            RIM - 1.25 * U,
            w - 4,
            0.35 * U,
            "ruler",
            pen.fill("glow", "solid"),
            {
                strokeWidth: 1,
            },
        );
        soft(c, cx, RIM - 1.5 * U, "oil", 11);
        pen.path(
            g,
            `M${cx - w / 2} ${RIM}V${RIM - 1.35 * U}M${cx + w / 2} ${RIM}V${RIM - 1.35 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.8 },
        );
    }
    say(c, cx, 1 * U, "ABCD"[i] ?? "?", 16);
    return cx;
}

function seedCut<G>(c: Ctx<G>, names: boolean, a: RawAnchors): void {
    const { pen, g } = c,
        cx = 5.4 * U,
        cy = 5 * U;
    // a broad bean split along its length: the seed coat round two halves of food store, with the
    // tiny root and shoot tucked in at the scar where it was joined to the pod
    const outline = (k: number, dy: number): string => {
        const at = (u: number, v: number): string => `${cx + u * k * U} ${cy + dy + v * k * U}`;
        return `M${at(-4, 0)}C${at(-4.2, -3.4)} ${at(3.6, -3.8)} ${at(4, -0.2)}C${at(4.3, 3)} ${at(0.8, 3.4)} ${at(-0.2, 2.4)}C${at(-1, 1.9)} ${at(-1.6, 2.9)} ${at(-2.6, 2.6)}C${at(-3.6, 2.3)} ${at(-3.9, 1.4)} ${at(-4, 0)}Z`;
    };
    pen.path(g, outline(1, 0), "ruler", lightFill(c, "tang", "solid"), { strokeWidth: 2 });
    pen.path(
        g,
        outline(0.88, -0.1 * U),
        "ruler",
        c.paper ? pen.fill("card") : pen.fill("glow", "solid"),
        {
            strokeWidth: 1.2,
        },
    );
    const hx = cx - 0.9 * U,
        hy = cy + 1.75 * U;
    pen.path(
        g,
        `M${hx} ${hy}Q${hx - 0.5 * U} ${hy + 0.4 * U} ${hx - 0.4 * U} ${hy + 0.9 * U}Q${hx + 0.1 * U} ${hy + 0.6 * U} ${hx + 0.3 * U} ${hy + 0.05 * U}Z`,
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.3 },
    );
    pen.path(
        g,
        `M${hx + 0.1 * U} ${hy - 0.1 * U}Q${hx + 0.3 * U} ${hy - 0.9 * U} ${hx + 0.9 * U} ${hy - 1.2 * U}Q${hx + 0.8 * U} ${hy - 0.6 * U} ${hx + 0.4 * U} ${hy - 0.2 * U}Z`,
        "ruler",
        pen.fill("mint", "solid"),
        { strokeWidth: 1.3 },
    );
    const parts: readonly (readonly [string, [number, number], number])[] = [
        ["seed coat", [cx + 1.5 * U, cy - 2.42 * U], 1.6 * U],
        ["food store", [cx + 1.6 * U, cy - 0.6 * U], 3.6 * U],
        ["shoot", [hx + 0.75 * U, hy - 1.05 * U], 5.6 * U],
        ["root", [hx - 0.35 * U, hy + 0.75 * U], 7.6 * U],
    ];
    parts.forEach(([name, [x, y], ly], k) => {
        const lx = 11 * U;
        pen.line(g, x, y, lx - 0.2 * U, ly - 0.3 * U, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        plain(c, { kind: "circle", cx: x, cy: y, r: 2.5, fill: c.t.ink, stroke: "none", width: 0 });
        if (names) say(c, lx, ly, name, 13, "start");
        else say(c, lx, ly, "ABCD"[k] ?? "?", 15, "start");
        a[`part(${k})`] = [lx, ly - 0.3 * U, "right"];
    });
}

export const seedtest = defineDrawing({
    id: "seedtest",
    family: "science",
    title: "What a seed needs",
    group: "Structures",
    about: "A fair test of what cress seeds need to sprout. With `mode` 0, up to four dishes of `seeds` seeds on cotton wool, lettered, each with `water`, `air`, `warmth` and `light` set to 1 or 0 (a dry dish, seeds under boiled water sealed with oil, a dish in the fridge, a dish in a dark cupboard), and a table under them saying which. With `after` 1 it is a week later: a seed sprouts only with water, air and warmth, light or not, and of those the packet's share `rate` per cent do (`sprouted`); in the dark they grow tall and pale. With `mode` 1 a broad bean is split open to its seed coat, its food store and the tiny root and shoot, named or lettered (`names`).",
    params: {
        mode: 0,
        water: [1, 0, 1, 1],
        air: [1, 1, 0, 1],
        warmth: [1, 1, 1, 1],
        light: [1, 1, 1, 0],
        seeds: 10,
        rate: 100,
        after: 1,
        names: 1,
    },
    settings: {
        mode: { kind: "whole", min: 0, max: 1 },
        water: { kind: "numbers", min: 0, max: 1, most: 4 },
        air: { kind: "numbers", min: 0, max: 1, most: 4 },
        warmth: { kind: "numbers", min: 0, max: 1, most: 4 },
        light: { kind: "numbers", min: 0, max: 1, most: 4 },
        seeds: { kind: "whole", min: 2, max: 10 },
        rate: { kind: "number", min: 0, max: 100, step: 10 },
        after: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Four dishes a week later",
            params: {
                mode: 0,
                water: [1, 0, 1, 1],
                air: [1, 1, 0, 1],
                warmth: [1, 1, 1, 1],
                light: [1, 1, 1, 0],
                seeds: 10,
                rate: 100,
                after: 1,
                names: 1,
            },
        },
        {
            label: "Three dishes as they are set up",
            params: {
                mode: 0,
                water: [1, 1, 1],
                air: [1, 1, 1],
                warmth: [1, 0, 1],
                light: [1, 1, 0],
                seeds: 8,
                rate: 100,
                after: 0,
                names: 1,
            },
        },
        {
            label: "Warm or in the fridge, eight in ten sprout",
            params: {
                mode: 0,
                water: [1, 1],
                air: [1, 1],
                warmth: [1, 0],
                light: [1, 1],
                seeds: 10,
                rate: 80,
                after: 1,
                names: 1,
            },
        },
        {
            label: "A bean split open, named",
            params: {
                mode: 1,
                water: [],
                air: [],
                warmth: [],
                light: [],
                seeds: 10,
                rate: 100,
                after: 0,
                names: 1,
            },
        },
        {
            label: "A bean split open, lettered",
            params: {
                mode: 1,
                water: [],
                air: [],
                warmth: [],
                light: [],
                seeds: 10,
                rate: 100,
                after: 0,
                names: 0,
            },
        },
    ],
    box: (p) =>
        Math.round(p.mode) === 1
            ? { w: 16, h: 10 }
            : {
                  w: Math.ceil((LEFT + Math.max(1, Math.min(4, p.water.length)) * PITCH) / U + 0.4),
                  h: 12,
              },
    draw: (c, p) => {
        const a: RawAnchors = {};
        if (Math.round(p.mode) === 1) {
            seedCut(c, p.names > 0, a);
            return a;
        }
        const n = Math.max(1, Math.min(4, p.water.length)),
            after = p.after > 0;
        for (let i = 0; i < n; i++) {
            const d: Dish = {
                water: p.water[i] ?? 1,
                air: p.air[i] ?? 1,
                warmth: p.warmth[i] ?? 1,
                light: p.light[i] ?? 1,
            };
            const cx = dishAt(
                c,
                i,
                d,
                p.seeds,
                sprouted(p.seeds, p.rate, d.water, d.air, d.warmth),
                after,
            );
            CONDITIONS.forEach((name, r) => {
                say(c, cx, 8.4 * U + r * U, d[name] > 0 ? "yes" : "no", 13);
            });
            a[`dish(${i})`] = [cx, 1.4 * U, "up"];
        }
        CONDITIONS.forEach((name, r) => {
            say(c, 0.3 * U, 8.4 * U + r * U, name, 13, "start");
            c.pen.line(c.g, 0.2 * U, 7.7 * U + r * U, LEFT + n * PITCH, 7.7 * U + r * U, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        });
        cap(c, 0.3 * U, 1 * U, after ? "a week later" : "day 1", 11, "start");
        if (after && p.rate < 100)
            penned(c, 0.3 * U, 2.2 * U, `${Math.round(p.rate)} in 100`, 13, "start");
        return a;
    },
    describe: (p) =>
        Math.round(p.mode) === 1
            ? "A broad bean split open along its length, showing its seed coat, the food store inside and the tiny root and shoot, with lines to their labels."
            : `${["One dish", "Two dishes", "Three dishes", "Four dishes"][Math.max(1, Math.min(4, p.water.length)) - 1]} of cress seeds on cotton wool, lettered, with a table under them saying which have water, air, warmth and light.`,
    reads: true,
    motion: {
        still: "Which dish sprouted is the answer, so the seedlings hold still to be compared.",
    },
});
