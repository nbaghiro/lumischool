import { type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill, rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { LIQUID, gleam, bubble, lettered, paint } from "./apparatus";
import { METALS_IN_ACID, hydrogenBubbles } from "./substances";

/** A strip of metal leaning in a tube from above the liquid to near its foot, with its hydrogen bubbles clinging and rising. */
function strip<G>(
    c: Ctx<G>,
    x: number,
    level: number,
    bottom: number,
    metal: number,
    hydrogen: number,
    seed: number,
): void {
    const { pen, g } = c,
        top = level - 0.5 * U,
        foot = bottom - 0.45 * U;
    pen.polygon(
        g,
        [
            [x - 4, top],
            [x + 1, top],
            [x + 5, foot],
            [x, foot],
        ],
        "ruler",
        pen.fill(metal === 4 ? "tang" : "ink-soft", "hachure", { hachureGap: 2.5 }),
        { strokeWidth: 1.3 },
    );
    const r = rng(seed * 31);
    for (let k = 0; k < hydrogen; k++) {
        const t = (k + 0.5) / hydrogen,
            y = level + 6 + t * (foot - level - 8),
            side = k % 2 ? 1 : -1;
        bubble(c, x + 0.5 + t * 4 + side * (5 + r()), y, 4.8 + r() * 1.4);
    }
}

/** A test tube, `len` long and `w` wide, hanging from its lip at (x, top), filled to `fill` of its length. */
function tube<G>(
    c: Ctx<G>,
    x: number,
    top: number,
    len: number,
    w: number,
    fill: number,
    stuff: Fill,
    bubbles = 0,
    bung = false,
    seed = 1,
    metal = 0,
    hydrogen = 0,
): { level: number } {
    const { pen, g } = c,
        lx = x - w / 2,
        rx = x + w / 2,
        bottom = top + len;
    const level = bottom - Math.max(0, Math.min(0.9, fill)) * (len - w / 2);
    if (fill > 0)
        pen.path(
            g,
            `M${lx + 2.5} ${level}V${bottom - w / 2}A${w / 2 - 2.5} ${w / 2 - 2.5} 0 0 0 ${rx - 2.5} ${bottom - w / 2}V${level}Z`,
            "ruler",
            stuff,
            { strokeWidth: 0 },
        );
    if (fill > 0) pen.line(g, lx + 2.5, level, rx - 2.5, level, "ruler", { strokeWidth: 1.4 });
    if (metal > 0) strip(c, x, level, bottom, metal, hydrogen, seed);
    const r = rng(seed);
    for (let k = 0; k < bubbles; k++)
        bubble(
            c,
            x + (r() - 0.5) * (w - 10),
            level + 5 + r() * (bottom - level - w * 0.6),
            3.5 + r() * 3.5,
        );
    for (let k = 0; k < Math.min(3, Math.ceil(bubbles / 3)); k++)
        bubble(c, x + (r() - 0.5) * w * 0.5, level - 5 - k * 7, 4 + r() * 2);
    pen.path(
        g,
        `M${lx} ${top}V${bottom - w / 2}A${w / 2} ${w / 2} 0 0 0 ${rx} ${bottom - w / 2}V${top}`,
        "ruler",
        null,
        { strokeWidth: 2 },
    );
    pen.ellipse(g, x, top, w + 6, 6, "ruler", null, { strokeWidth: 1.5 });
    gleam(c, lx + 4, top + 8, bottom - w * 0.7, 2.2);
    if (bung)
        pen.polygon(
            g,
            [
                [lx - 3, top - 0.55 * U],
                [rx + 3, top - 0.55 * U],
                [rx - 1, top + 0.35 * U],
                [lx + 1, top + 0.35 * U],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.6 },
        );
    return { level };
}

const metalAt = (metals: readonly number[], i: number): number =>
    Math.max(0, Math.min(4, Math.round(Number(metals[i] ?? 0))));

/** A wooden test-tube rack for `n` tubes, `w` squares apart, with its top plank at `top`. */
function rack<G>(c: Ctx<G>, x0: number, width: number, top: number, base: number): void {
    const { pen, g } = c,
        wood = pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8, hachureAngle: 75 });
    pen.rect(g, x0, base - 0.5 * U, width, 0.5 * U, "pencil", wood, { strokeWidth: 1.8 });
    for (const x of [x0 + 0.1 * U, x0 + width - 0.6 * U])
        pen.rect(g, x, top, 0.5 * U, base - 0.5 * U - top, "pencil", wood, { strokeWidth: 1.6 });
    pen.rect(g, x0 - 0.2 * U, top, width + 0.4 * U, 0.55 * U, "pencil", wood, { strokeWidth: 1.8 });
}

export const testtubes = defineDrawing({
    id: "testtubes",
    family: "science",
    title: "Test tubes in a rack",
    group: "Structures",
    about: 'Test tubes standing in a wooden rack, lettered, each filled to its own level with its own colour, some fizzing with bubbles and some stoppered. A colour is a mix from the paint box (`paints`, such as "blue+yellow"), worked out the way the art lessons mix it, so a tube a question calls green is the green the paint box makes; an empty paint is water. `fizz` is how many bubbles rise in each. `metals` stands a strip of metal in each tube (0 none, 1 magnesium, 2 zinc, 3 iron, 4 copper), and with `acid` at 1 the liquid is dilute acid and the strip gives off hydrogen: ten bubbles on magnesium, six on zinc, three on iron and none on copper, which is METALS_IN_ACID in substances.ts. In water (`acid` 0) no strip fizzes.',
    params: {
        fills: [0.4, 0.6, 0.3],
        paints: ["", "red", "blue+yellow"],
        fizz: [0, 0, 6],
        bungs: 0,
        letters: 1,
        metals: [] as number[],
        acid: 0,
    },
    settings: {
        fills: { kind: "numbers", min: 0, max: 1, most: 6 },
        paints: { kind: "words", most: 6 },
        fizz: { kind: "numbers", min: 0, max: 12, most: 6 },
        bungs: { kind: "whole", min: 0, max: 1 },
        letters: { kind: "whole", min: 0, max: 1 },
        metals: { kind: "numbers", min: 0, max: 4, most: 6 },
        acid: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Three colours, one fizzing",
            params: {
                fills: [0.4, 0.6, 0.3],
                paints: ["", "red", "blue+yellow"],
                fizz: [0, 0, 6],
                bungs: 0,
                letters: 1,
                metals: [],
                acid: 0,
            },
        },
        {
            label: "Five levels",
            params: {
                fills: [0.2, 0.5, 0.7, 0.35, 0.6],
                paints: ["", "", "", "", ""],
                fizz: [0, 0, 0, 0, 0],
                bungs: 0,
                letters: 1,
                metals: [],
                acid: 0,
            },
        },
        {
            label: "Stoppered",
            params: {
                fills: [0.5, 0.5, 0.5, 0.5],
                paints: ["yellow", "pink+sky", "blue+sky", "green"],
                fizz: [0, 0, 0, 0],
                bungs: 1,
                letters: 1,
                metals: [],
                acid: 0,
            },
        },
        {
            label: "Four metals in acid",
            params: {
                fills: [0.5, 0.5, 0.5, 0.5],
                paints: ["", "", "", ""],
                fizz: [0, 0, 0, 0],
                bungs: 0,
                letters: 1,
                metals: [1, 2, 3, 4],
                acid: 1,
            },
        },
        {
            label: "Magnesium and zinc in water",
            params: {
                fills: [0.5, 0.5],
                paints: ["", ""],
                fizz: [0, 0],
                bungs: 0,
                letters: 1,
                metals: [1, 2],
                acid: 0,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(6, p.fills.length)) * 2 + 3,
        h: p.letters > 0 ? 11 : 10,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            n = Math.max(1, Math.min(6, p.fills.length)),
            top = 1.6 * U,
            base = 9.8 * U,
            width = (n * 2 + 1.4) * U;
        rack(c, 0.8 * U, width, 3.4 * U, base);
        for (let i = 0; i < n; i++) {
            const x = (2.5 + i * 2) * U,
                paint0 = p.paints[i] ?? "";
            tube(
                c,
                x,
                top,
                7.2 * U,
                0.95 * U,
                Number(p.fills[i] ?? 0),
                paint0 ? paint(c, paint0) : c.pen.fill(LIQUID),
                Math.max(0, Math.min(12, Math.round(Number(p.fizz[i] ?? 0)))),
                p.bungs > 0,
                9 + i,
                metalAt(p.metals, i),
                hydrogenBubbles(metalAt(p.metals, i), p.acid),
            );
            if (p.letters > 0) lettered(c, x, 10.8 * U, i);
            a[`tube(${i})`] = [x, top - 0.6 * U, "up"];
        }
        // the rack's front plank goes over the tubes, which is what makes them stand in it
        c.pen.rect(
            c.g,
            0.6 * U,
            3.4 * U,
            width + 0.4 * U,
            0.55 * U,
            "pencil",
            c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8, hachureAngle: 75 }),
            { strokeWidth: 1.8 },
        );
        return a;
    },
    describe: (p) => {
        const strips = p.metals
            .slice(0, 6)
            .map((_m, i) => metalAt(p.metals, i))
            .filter((m) => m > 0);
        if (strips.length) {
            const names = strips.map((m) => METALS_IN_ACID[m]?.name ?? "metal"),
                last = names.pop() ?? "metal",
                listed = names.length ? `${names.join(", ")} and ${last}` : last,
                fizzing = strips.some((m) => hydrogenBubbles(m, p.acid) > 0);
            return `Glass test tubes in a wooden rack${p.letters > 0 ? ", lettered" : ""}, holding ${p.acid > 0 ? "dilute acid" : "water"}, with strips of ${listed} standing in them${fizzing ? ", bubbles on some" : ""}.`;
        }
        return `Glass test tubes standing in a row in a wooden rack${p.letters > 0 ? ", lettered" : ""}, each with its own liquid part way up it${p.bungs > 0 ? ", a stopper in each" : ""}${p.fizz.some((f) => Number(f) > 0) ? ", bubbles rising in some" : ""}.`;
    },
    reads: true,
});
