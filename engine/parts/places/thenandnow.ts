import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { kid } from "../stories/pictures";

/**
 * What a street can hold, each drawn in its own place so any set of them fits together. The year
 * each first appeared is not here: it is in engine/notation/chronicle.ts with its source, where the
 * history checker reads it.
 */
export const STREET_THINGS = [
    "horse and cart",
    "hot-air balloon",
    "bicycle",
    "motor car",
    "electric street light",
    "aeroplane",
    "television aerial",
    "mobile phone",
] as const;
export type StreetThing = (typeof STREET_THINGS)[number];

interface ThenAndNowParams {
    /** The year the street is drawn at, written on the sign when `sign` is 1. */
    year: number;
    sign: number;
    /** What is in the street, by name from STREET_THINGS. */
    things: string[];
}

const W = 30;
const H = 16;
const BASE = 12 * U;
/** Where each thing stands: its centre across, in squares. Sky things float; the rest stand on the street. */
const AT: Record<StreetThing, number> = {
    "horse and cart": 5.5,
    "hot-air balloon": 3,
    bicycle: 12.5,
    "motor car": 18.5,
    "electric street light": 24,
    aeroplane: 21,
    "television aerial": 14.5,
    "mobile phone": 27.4,
};
const isThing = (s: string): s is StreetThing => (STREET_THINGS as readonly string[]).includes(s);

function houses<G>(c: Ctx<G>, year: number, sign: boolean): number {
    const { pen, g } = c;
    const fronts: [number, number, "tang" | "sky" | "mint" | "berry"][] = [
        [1, 8, "tang"],
        [9, 11, "sky"],
        [20, 9, "mint"],
    ];
    let signX = 0;
    for (const [x0, w, wall] of fronts) {
        const x = x0 * U,
            top = BASE - 6 * U;
        pen.polygon(
            g,
            [
                [x - 4, top],
                [x + (w * U) / 2, top - 2.2 * U],
                [x + w * U + 4, top],
            ],
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 6 }),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, x, top, w * U, 6 * U, "pencil", pen.fill(wall, "hachure", { hachureGap: 11 }), {
            strokeWidth: 1.8,
        });
        for (let k = 1; k < w / 2.5; k++)
            pen.rect(
                g,
                x + k * 2.5 * U - 0.6 * U,
                top + 0.8 * U,
                1.2 * U,
                1.4 * U,
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 1.2,
                },
            );
        pen.rect(
            g,
            x + (w * U) / 2 - 0.8 * U,
            BASE - 2.8 * U,
            1.6 * U,
            2.8 * U,
            "pencil",
            pen.fill("card"),
            {
                strokeWidth: 1.4,
            },
        );
        if (w === 11) signX = x + 2.2 * U;
    }
    if (sign) {
        pen.rect(g, signX - 1.6 * U, BASE - 5.3 * U, 3.2 * U, 1.4 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.5,
        });
        num(c, signX, BASE - 4.25 * U, year, 15);
    }
    pen.line(g, 0, BASE, W * U, BASE, "ruler", { strokeWidth: 2 });
    pen.line(g, 0, BASE + 3 * U, W * U, BASE + 3 * U, "pencil", {
        strokeWidth: 1.2,
        stroke: c.t["ink-soft"],
    });
    return signX;
}

function wheel<G>(c: Ctx<G>, x: number, y: number, r: number, spokes = true): void {
    const { pen, g } = c;
    pen.circle(g, x, y, r * 2, "pencil", null, { strokeWidth: 1.6 });
    if (spokes)
        for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3])
            pen.line(
                g,
                x - Math.cos(a) * r,
                y - Math.sin(a) * r,
                x + Math.cos(a) * r,
                y + Math.sin(a) * r,
                "pencil",
                {
                    strokeWidth: 0.8,
                },
            );
}

function thing<G>(c: Ctx<G>, t: StreetThing, x: number): [number, number] {
    const { pen, g } = c,
        road = BASE + 1.8 * U;
    switch (t) {
        case "horse and cart": {
            // the horse walks left, the cart behind it
            const hx = x - 2.6 * U,
                coat = pen.fill("tang", "hachure", { hachureGap: 7 });
            for (const dx of [-1, -0.6, 0.6, 1])
                pen.line(g, hx + dx * U, road - 1.7 * U, hx + dx * U, road, "pencil", {
                    strokeWidth: 1.8,
                });
            pen.ellipse(g, hx, road - 2 * U, 2.8 * U, 1.2 * U, "pencil", coat, {
                strokeWidth: 1.6,
            });
            pen.polygon(
                g,
                [
                    [hx - 1.2 * U, road - 2.2 * U],
                    [hx - 1.7 * U, road - 3.3 * U],
                    [hx - 1.2 * U, road - 3.5 * U],
                    [hx - 0.6 * U, road - 2.5 * U],
                ],
                "pencil",
                coat,
                { strokeWidth: 1.5 },
            );
            pen.ellipse(g, hx - 1.9 * U, road - 3.2 * U, 1.1 * U, 0.55 * U, "pencil", coat, {
                strokeWidth: 1.4,
            });
            pen.curve(
                g,
                [
                    [hx + 1.35 * U, road - 2.2 * U],
                    [hx + 1.7 * U, road - 1.8 * U],
                    [hx + 1.6 * U, road - 1.1 * U],
                ],
                "pencil",
                { strokeWidth: 1.8 },
            );
            pen.rect(g, x - 0.6 * U, road - 2.6 * U, 3 * U, 1.3 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.6,
            });
            pen.line(g, hx + 1.3 * U, road - 1.9 * U, x - 0.6 * U, road - 1.9 * U, "pencil", {
                strokeWidth: 1.3,
            });
            wheel(c, x + 0.9 * U, road - 0.8 * U, 0.8 * U);
            return [x, road - 3.2 * U];
        }
        case "hot-air balloon": {
            const y = 1.6 * U;
            pen.circle(g, x, y, 2.2 * U, "pencil", pen.fill("berry", "hachure"), {
                strokeWidth: 1.7,
            });
            pen.line(g, x - 0.9 * U, y + 0.9 * U, x - 0.35 * U, y + 2 * U, "pencil", {
                strokeWidth: 1,
            });
            pen.line(g, x + 0.9 * U, y + 0.9 * U, x + 0.35 * U, y + 2 * U, "pencil", {
                strokeWidth: 1,
            });
            pen.rect(g, x - 0.4 * U, y + 2 * U, 0.8 * U, 0.6 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.2,
            });
            return [x, y - 1.3 * U];
        }
        case "bicycle": {
            const r = 0.8 * U,
                y = road - r;
            wheel(c, x - 1.1 * U, y, r);
            wheel(c, x + 1.1 * U, y, r);
            pen.linear(
                g,
                [
                    [x - 1.1 * U, y],
                    [x - 0.2 * U, y - 1.1 * U],
                    [x + 0.7 * U, y - 1.1 * U],
                    [x + 1.1 * U, y],
                    [x, y],
                    [x - 0.2 * U, y - 1.1 * U],
                ],
                "ruler",
                {
                    strokeWidth: 1.5,
                    stroke: c.t.berry,
                },
            );
            pen.line(g, x + 0.7 * U, y - 1.1 * U, x + 0.8 * U, y - 1.6 * U, "ruler", {
                strokeWidth: 1.4,
            });
            return [x, y - 1.8 * U];
        }
        case "motor car": {
            const y = road - 0.7 * U;
            pen.path(
                g,
                `M${x - 2.6 * U} ${y}V${y - 1.2 * U}L${x - 1.4 * U} ${y - 1.4 * U}L${x - 0.8 * U} ${y - 2.4 * U}H${x + 1.2 * U}L${x + 1.8 * U} ${y - 1.4 * U}L${x + 2.6 * U} ${y - 1.2 * U}V${y}Z`,
                "pencil",
                pen.fill("sky", "solid"),
                { strokeWidth: 1.7 },
            );
            pen.rect(g, x - 0.6 * U, y - 2.1 * U, 1.5 * U, 0.7 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1,
            });
            wheel(c, x - 1.6 * U, y, 0.65 * U, false);
            wheel(c, x + 1.6 * U, y, 0.65 * U, false);
            return [x, y - 2.5 * U];
        }
        case "electric street light": {
            pen.line(g, x, BASE + 0.4 * U, x, BASE - 5.6 * U, "ruler", { strokeWidth: 2.2 });
            pen.line(g, x, BASE - 5.6 * U, x - 1 * U, BASE - 5.6 * U, "ruler", { strokeWidth: 2 });
            pen.circle(g, x - 1 * U, BASE - 5.1 * U, 0.8 * U, "pencil", pen.fill("glow", "solid"), {
                strokeWidth: 1.3,
            });
            return [x, BASE - 6 * U];
        }
        case "aeroplane": {
            const y = 1.6 * U;
            pen.ellipse(g, x, y, 4 * U, 0.8 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.polygon(
                g,
                [
                    [x - 0.3 * U, y],
                    [x + 0.5 * U, y - 1.3 * U],
                    [x + 1 * U, y - 1.3 * U],
                    [x + 0.6 * U, y],
                ],
                "pencil",
                pen.fill("sky"),
                {
                    strokeWidth: 1.3,
                },
            );
            pen.polygon(
                g,
                [
                    [x - 1.8 * U, y],
                    [x - 2.2 * U, y - 0.9 * U],
                    [x - 1.7 * U, y - 0.9 * U],
                    [x - 1.2 * U, y],
                ],
                "pencil",
                pen.fill("sky"),
                {
                    strokeWidth: 1.2,
                },
            );
            return [x, y - 1.3 * U];
        }
        case "television aerial": {
            const y = BASE - 8.2 * U;
            pen.line(g, x, y + 1.9 * U, x, y - 0.6 * U, "ruler", { strokeWidth: 1.6 });
            for (const k of [0, 0.5, 1])
                pen.line(
                    g,
                    x - 1 * U + k * 0.3 * U,
                    y + k * 0.6 * U - 0.4 * U,
                    x + 1 * U - k * 0.3 * U,
                    y + k * 0.6 * U - 0.4 * U,
                    "ruler",
                    {
                        strokeWidth: 1.3,
                    },
                );
            return [x, y - 0.8 * U];
        }
        case "mobile phone": {
            const { head } = kid(c, x, BASE + 0.4 * U, 0.72, 2, "happy", -1);
            const px = head[0] - 1.05 * U,
                py = head[1] + 0.9 * U;
            pen.line(g, x - 0.3 * U, BASE - 1.9 * U, px + 0.3 * U, py + 0.9 * U, "pencil", {
                strokeWidth: 1.8,
            });
            pen.rect(g, px, py - 0.2 * U, 0.6 * U, 1.1 * U, "ruler", pen.fill("ink"), {
                strokeWidth: 1,
            });
            return [x, BASE - 3.6 * U];
        }
    }
}

const STREET_1850: ThenAndNowParams = {
    year: 1850,
    sign: 1,
    things: ["horse and cart", "hot-air balloon"],
};

export const thenAndNow = defineDrawing<ThenAndNowParams>({
    id: "thenandnow",
    family: "places",
    title: "A street then and now",
    group: "Props",
    about: "One street of houses drawn at a chosen year, with the year on a sign (`sign`: 1 shows it) and the things in it named in `things`: a horse and cart, a hot-air balloon, a bicycle, a motor car, an electric street light, an aeroplane, a television aerial, a mobile phone. Each thing first appeared in a known year, recorded with its source in the history checker's chronicle, so which thing could not have been in the street in the sign's year is proved from the picture.",
    params: STREET_1850,
    settings: {
        year: { kind: "whole", min: 1700, max: 2100 },
        sign: { kind: "whole", min: 0, max: 1 },
        things: { kind: "words", of: STREET_THINGS, most: 8 },
    },
    takes: [
        { label: "The street in 1850", params: STREET_1850 },
        {
            label: "The street today",
            params: {
                year: 2026,
                sign: 1,
                things: [
                    "bicycle",
                    "motor car",
                    "electric street light",
                    "aeroplane",
                    "television aerial",
                    "mobile phone",
                ],
            },
        },
        {
            label: "In 1900, one thing too new",
            params: {
                year: 1900,
                sign: 1,
                things: ["horse and cart", "bicycle", "electric street light", "mobile phone"],
            },
        },
        {
            label: "No year on the sign",
            params: { year: 1950, sign: 0, things: ["motor car", "television aerial", "bicycle"] },
        },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        const signX = houses(c, Math.round(p.year), Math.round(p.sign) === 1);
        a.sign = [signX, BASE - 5.3 * U, "up"];
        p.things.forEach((t, i) => {
            if (!isThing(t)) return;
            const [x, y] = thing(c, t, AT[t] * U);
            a[`thing(${i})`] = [x, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A street of houses${Math.round(p.sign) === 1 ? ` with the year ${Math.round(p.year)} on a sign` : ""}, drawn with ${p.things.length} things in the road, on the pavement, on the roofs and in the sky.`,
});
