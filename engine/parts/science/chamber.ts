import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, penned, say, soft } from "../lettering";
import { DRESSED, placePerson, type PersonParams } from "../people/figure";
import { candleOn, curls, gleam } from "./apparatus";

/** What is sealed in: `place` 0 a bell jar, 1 the lander's cabin. */
interface Sealed {
    place: number;
    plants: number;
    candle: number;
    people: number;
    light: number;
    hours: number;
}

// shares of the air in hundredths of a per cent, so every step is a whole number
const START = { o2: 2100, co2: 4 };
/** A candle goes out when the oxygen is down to 16 per cent. */
const CANDLE_OUT = 1600;
/**
 * Paraffin wax burns as C25H52 + 38 O2 -> 25 CO2 + 26 H2O, so the 5 points of oxygen a candle uses
 * make 5 x 25 / 38 = 3.29 points of carbon dioxide.
 */
const CANDLE_CO2 = Math.round(((START.o2 - CANDLE_OUT) * 25) / 38);
/**
 * Points an hour, in hundredths. A plant in light takes in one carbon dioxide for each oxygen it
 * gives out (6 CO2 + 6 H2O -> C6H12O6 + 6 O2), net of its own breathing; in the dark it only
 * breathes, using one oxygen for each carbon dioxide it gives out. A person breathes the same way.
 * The cabin holds more air than the jar, so the same plant changes it less.
 */
const RATES = [
    { photo: 50, dark: 10, person: 0 },
    { photo: 25, dark: 5, person: 25 },
] as const;

const placeOf = (p: Sealed): 0 | 1 => (Math.round(p.place) === 1 ? 1 : 0);
const plantsIn = (p: Sealed): number =>
    Math.max(0, Math.min(placeOf(p) === 1 ? 4 : 2, Math.round(p.plants)));
const peopleIn = (p: Sealed): number =>
    placeOf(p) === 1 ? Math.max(0, Math.min(3, Math.round(p.people))) : 0;
const candleIn = (p: Sealed): boolean => placeOf(p) === 0 && Math.round(p.candle) === 1;
const hoursOf = (p: Sealed): number => Math.max(0, Math.min(24, Math.round(p.hours)));

/**
 * The oxygen and carbon dioxide after `hours`, in hundredths of a per cent. A candle burns out within
 * the first hour, then each hour the breathing is added and the plants in light take in what carbon
 * dioxide there is, up to their rate.
 */
export function airAfter(p: Sealed): { o2: number; co2: number } {
    let { o2, co2 } = START;
    const hours = hoursOf(p);
    if (hours === 0) return { o2, co2 };
    const rate = RATES[placeOf(p)],
        plants = plantsIn(p),
        lit = Math.round(p.light) === 1;
    if (candleIn(p)) {
        o2 = CANDLE_OUT;
        co2 += CANDLE_CO2;
    }
    for (let h = 0; h < hours; h++) {
        const breathed = peopleIn(p) * rate.person + (lit ? 0 : plants * rate.dark),
            used = Math.min(breathed, o2);
        o2 -= used;
        co2 += used;
        const taken = lit ? Math.min(plants * rate.photo, co2) : 0;
        co2 -= taken;
        o2 += taken;
    }
    return { o2, co2 };
}

/** Whether a candle lit in air with this much oxygen, in hundredths of a per cent, keeps burning. */
export const candleBurns = (o2: number): boolean => o2 > CANDLE_OUT;

const percent = (hundredths: number): string =>
    `${(hundredths / 100).toFixed(2).replace(/\.?0+$/, "")}%`;

/** A plant in a pot, its pot's foot at (x, base). */
function potPlant<G>(c: Ctx<G>, x: number, base: number): void {
    const { pen, g } = c;
    pen.polygon(
        g,
        [
            [x - 0.8 * U, base - 1.1 * U],
            [x + 0.8 * U, base - 1.1 * U],
            [x + 0.6 * U, base],
            [x - 0.6 * U, base],
        ],
        "pencil",
        pen.fill("tang", "hachure", { hachureGap: 5 }),
        { strokeWidth: 1.6 },
    );
    const top = base - 3.6 * U;
    pen.curve(
        g,
        [
            [x, base - 1.1 * U],
            [x + 0.15 * U, base - 2.4 * U],
            [x, top],
        ],
        "pencil",
        { strokeWidth: 1.6, stroke: c.t.ok },
    );
    for (const [dx, y, s] of [
        [-1, base - 1.8 * U, -1],
        [1, base - 2.4 * U, 1],
        [-1, base - 3 * U, -1],
        [0.2, top, 1],
    ] as const) {
        const tip = x + dx * 1.1 * U;
        pen.path(
            g,
            `M${x} ${y}Q${(x + tip) / 2} ${y - 0.7 * U} ${tip} ${y - 0.3 * U * s}Q${(x + tip) / 2} ${y + 0.3 * U} ${x} ${y}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.2 },
        );
    }
}

/** A tray of two seedlings under the grow lamp, its foot at (x, base). */
function tray<G>(c: Ctx<G>, x: number, base: number): void {
    const { pen, g } = c;
    pen.rect(
        g,
        x - 0.65 * U,
        base - 0.5 * U,
        1.3 * U,
        0.5 * U,
        "pencil",
        pen.fill("tang", "hachure", { hachureGap: 5 }),
        { strokeWidth: 1.4 },
    );
    for (const dx of [-0.3, 0.3]) {
        const sx = x + dx * U,
            top = base - 1.5 * U;
        pen.line(g, sx, base - 0.5 * U, sx, top, "pencil", { strokeWidth: 1.3, stroke: c.t.ok });
        for (const side of [-1, 1])
            pen.ellipse(
                g,
                sx + side * 0.2 * U,
                top + (side < 0 ? 2 : 0),
                0.4 * U,
                0.22 * U,
                "pencil",
                pen.fill("mint"),
                {
                    strokeWidth: 1,
                },
            );
    }
}

/** A lamp hanging on its flex, shining when it is on. */
function lamp<G>(c: Ctx<G>, x: number, y: number, on: boolean): void {
    const { pen, g } = c;
    pen.line(g, x, y - 1.4 * U, x, y - 0.5 * U, "ruler", { strokeWidth: 1.4 });
    pen.path(
        g,
        `M${x - 0.9 * U} ${y + 0.2 * U}Q${x} ${y - 1 * U} ${x + 0.9 * U} ${y + 0.2 * U}Z`,
        "ruler",
        pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
        { strokeWidth: 1.6 },
    );
    // on paper the rays say it is on, since a dotted bulb reads as a face
    pen.circle(g, x, y + 0.35 * U, 0.6 * U, "ruler", pen.fill(on && !c.paper ? "glow" : "card"), {
        strokeWidth: 1.3,
    });
    if (on)
        for (const a of [-60, -25, 25, 60]) {
            const r = ((a + 90) * Math.PI) / 180,
                cx = Math.cos(r),
                cy = Math.sin(r);
            pen.line(
                g,
                x + cx * 0.8 * U,
                y + 0.35 * U + cy * 0.8 * U,
                x + cx * 1.5 * U,
                y + 0.35 * U + cy * 1.5 * U,
                "ruler",
                {
                    strokeWidth: 1.6,
                    stroke: c.t["glow-ink"],
                },
            );
        }
}

const CREW: PersonParams[] = [3, 5, 1].map((tone, i): PersonParams => ({
    pose: "stand",
    age: "grownup",
    tone,
    hair: ["short", "bun", "curly"][i] ?? "short",
    colour: ["black", "brown", "auburn"][i] ?? "black",
    top: "sky",
    wear: "trousers",
    ...DRESSED,
    bottom: "sky",
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: "happy",
    dir: 1,
    holding: "",
}));

export const chamber = defineDrawing({
    id: "chamber",
    family: "science",
    title: "A sealed chamber of air",
    group: "Structures",
    about: "Air sealed in, with a card for its oxygen and carbon dioxide. With `place` 0 a glass bell jar on a plate holds up to two potted plants (`plants`) and a candle (`candle` 1); with `place` 1 the lander's cabin holds up to three crew (`people`) and up to four trays of seedlings. `light` 1 switches the lamp on, and `hours` (0 to 24) is how long since it was sealed; `show` 0 hides the shares under question marks. The shares start at 21% and 0.04%. The candle burns out within the first hour at 16% oxygen, making 3.29 points of carbon dioxide (paraffin wax, 25 CO2 for 38 O2). Each hour a person breathes 0.25 points of oxygen into carbon dioxide; a plant in the dark breathes 0.1 in the jar and 0.05 in the cabin; a plant in light takes in carbon dioxide and gives out as much oxygen, 0.5 points an hour in the jar and 0.25 in the cabin, while there is carbon dioxide to take.",
    params: { place: 0, plants: 1, candle: 1, people: 0, light: 1, hours: 4, show: 1 },
    settings: {
        place: { kind: "whole", min: 0, max: 1 },
        plants: { kind: "whole", min: 0, max: 4 },
        candle: { kind: "whole", min: 0, max: 1 },
        people: { kind: "whole", min: 0, max: 3 },
        light: { kind: "whole", min: 0, max: 1 },
        hours: { kind: "whole", min: 0, max: 24 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A plant and a candle in the light",
            params: { place: 0, plants: 1, candle: 1, people: 0, light: 1, hours: 4, show: 1 },
        },
        {
            label: "Just sealed, the candle burning",
            params: { place: 0, plants: 1, candle: 1, people: 0, light: 0, hours: 0, show: 1 },
        },
        {
            label: "Two plants in the dark, asked",
            params: { place: 0, plants: 2, candle: 0, people: 0, light: 0, hours: 10, show: 0 },
        },
        {
            label: "The cabin, two crew and two trays",
            params: { place: 1, plants: 2, candle: 0, people: 2, light: 1, hours: 12, show: 1 },
        },
        {
            label: "The cabin, three crew and the lamp off",
            params: { place: 1, plants: 4, candle: 0, people: 3, light: 0, hours: 6, show: 1 },
        },
    ],
    box: (p) => (placeOf(p) === 1 ? { w: 30, h: 15 } : { w: 24, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cabin = placeOf(p) === 1,
            lit = Math.round(p.light) === 1,
            hours = hoursOf(p),
            plants = plantsIn(p);
        if (cabin) {
            const floor = 12.8 * U;
            const hull = (m: number): string =>
                `M${(1 + m) * U} ${(14 - m) * U}L${(1 + m) * U} ${5 * U}Q${(1 + m) * U} ${(1.4 + m) * U} ${5 * U} ${(1.4 + m) * U}L${15 * U} ${(1.4 + m) * U}Q${(19 - m) * U} ${(1.4 + m) * U} ${(19 - m) * U} ${5 * U}L${(19 - m) * U} ${(14 - m) * U}Z`;
            pen.path(g, hull(0), "pencil", pen.fill("ink-soft", "hachure", { hachureGap: 10 }), {
                strokeWidth: 2.4,
            });
            pen.path(g, hull(0.6), "ruler", pen.fill("card"), { strokeWidth: 1.4 });
            pen.line(g, 1.6 * U, floor, 18.4 * U, floor, "ruler", { strokeWidth: 2 });
            pen.circle(
                g,
                3.6 * U,
                4.6 * U,
                2 * U,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 6 }),
                {
                    strokeWidth: 2,
                },
            );
            cap(c, 3.6 * U, 7 * U, "window", 11);
            const crew = peopleIn(p);
            for (let i = 0; i < crew; i++) {
                const look = CREW[i];
                if (look)
                    placePerson(c, look, (5.6 + i * 2.4) * U, floor - 2, {
                        size: 0.72,
                        seed: i + 1,
                    });
            }
            // the shelf of trays under the grow lamp
            pen.rect(
                g,
                11.8 * U,
                9 * U,
                6.6 * U,
                0.3 * U,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                {
                    strokeWidth: 1.4,
                },
            );
            for (const x of [12.4, 17.8])
                pen.line(g, x * U, 9.3 * U, x * U, floor, "ruler", { strokeWidth: 1.4 });
            for (let i = 0; i < plants; i++) tray(c, (12.7 + i * 1.6) * U, 9 * U);
            lamp(c, 15.1 * U, 5.2 * U, lit);
            a.cabin = [10 * U, 1.4 * U, "up"];
            a.trays = [15.1 * U, 9 * U, "up"];
        } else {
            const plate = 13 * U,
                left = 1.4 * U,
                right = 12.6 * U;
            pen.rect(
                g,
                0.6 * U,
                plate,
                12.8 * U,
                0.6 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                {
                    strokeWidth: 1.8,
                },
            );
            const jar = `M${left} ${plate}L${left} ${5.4 * U}Q${left} ${2.2 * U} ${7 * U} ${2.2 * U}Q${right} ${2.2 * U} ${right} ${5.4 * U}L${right} ${plate}`;
            if (plants > 0)
                for (let i = 0; i < plants; i++) potPlant(c, (3.6 + i * 2.8) * U, plate);
            if (candleIn(p)) {
                const x = 10 * U;
                candleOn(c, x, plate, 2 * U, hours === 0);
                if (hours > 0) curls(c, x, plate - 3.2 * U, 2, 1.4 * U);
                a.candle = [x, plate - 3 * U, "up"];
            }
            pen.path(g, jar, "ruler", null, { strokeWidth: 2 });
            pen.circle(g, 7 * U, 1.6 * U, 1 * U, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
            gleam(c, left + 0.6 * U, 5 * U, 11 * U, 3);
            lamp(c, 16 * U, 2.2 * U, lit);
            a.jar = [7 * U, 2.2 * U, "up"];
        }
        // the card that reads the air
        const x0 = cabin ? 20.4 * U : 14.6 * U,
            y0 = 5.6 * U,
            w = 9 * U,
            air = airAfter(p),
            show = p.show > 0;
        pen.rect(g, x0, y0, w, 7.2 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        soft(c, x0 + w / 2, y0 + 1.2 * U, hours === 0 ? "just sealed" : `after ${hours} hours`, 13);
        const row = (y: number, name: string, value: number, key: string): void => {
            say(c, x0 + 0.4 * U, y, name, 14, "start");
            if (show) num(c, x0 + w - 0.4 * U, y + 1.2 * U, percent(value), 17, "end");
            else penned(c, x0 + w - 1 * U, y + 1.3 * U, "?", 20);
            a[key] = [x0 + w, y, "right"];
        };
        row(y0 + 2.8 * U, "oxygen", air.o2, "oxygen");
        row(y0 + 5.2 * U, "carbon dioxide", air.co2, "co2");
        return a;
    },
    describe: (p) => {
        const plants = plantsIn(p),
            lamp = Math.round(p.light) === 1 ? "a lamp shining on it" : "its lamp switched off";
        if (placeOf(p) === 1) {
            const crew = peopleIn(p);
            return `The lander's cabin cut open, with ${crew === 0 ? "no crew" : crew === 1 ? "one of the crew" : `${["", "", "two", "three"][crew] ?? "the"} crew`}, ${plants === 0 ? "no seedlings" : "trays of seedlings on a shelf"}, ${lamp}, and a card for the oxygen and carbon dioxide.`;
        }
        const things = [
            plants === 0 ? "" : plants === 1 ? "a potted plant" : "two potted plants",
            candleIn(p) ? "a candle" : "",
        ].filter(Boolean);
        return `A glass bell jar sealed on a plate over ${things.length ? things.join(" and ") : "nothing but air"}, ${lamp}, and a card for the oxygen and carbon dioxide inside.`;
    },
    reads: true,
    motion: { still: "The shares of the air are read off its card, so it holds still." },
});
