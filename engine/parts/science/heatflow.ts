import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, penned, say, soft } from "../lettering";

/**
 * How many of a rod's five wax-stuck beads have dropped after ten minutes with one end in hot water,
 * best conductor first. Heat creeps along a rod more slowly the further it has to go, so after a
 * shorter time the count is this times the square root of the share of ten minutes, rounded down.
 */
export const BEADS_IN_TEN = {
    copper: 5,
    aluminium: 4,
    brass: 3,
    steel: 2,
    glass: 0,
    wood: 0,
    plastic: 0,
} as const;
type Rod = keyof typeof BEADS_IN_TEN;
const isRod = (s: string): s is Rod => s in BEADS_IN_TEN;
const RODS = Object.keys(BEADS_IN_TEN).filter(isRod);

export const beadsFallen = (rod: string, minutes: number): number =>
    isRod(rod)
        ? Math.floor(
              BEADS_IN_TEN[rod] * Math.sqrt(Math.max(0, Math.min(10, Math.round(minutes))) / 10) +
                  1e-9,
          )
        : 0;

/**
 * The hut's thermometers from the ceiling down, in degrees, with the heater low by the floor (0) or
 * high by the ceiling (1). Warm air rises from the heater: from low down it carries the warmth round
 * the whole room, and from high up it stays under the ceiling and the floor stays cold.
 */
export const roomReadings = (heater: number): readonly [number, number, number] =>
    Math.round(heater) === 1 ? [27, 17, 12] : [22, 20, 18];

/**
 * How many degrees a can of water warms in each ten minutes in strong sun, from 20 °C, by its outside:
 * a matt black can takes in most of the sunlight that falls on it, a white one little and a shiny
 * one least, since it reflects nearly all of it. Over the first half hour the warming is steady.
 */
export const RISE_IN_TEN = { black: 6, white: 2, silver: 1 } as const;
type Can = keyof typeof RISE_IN_TEN;
const isCan = (s: string): s is Can => s in RISE_IN_TEN;
const CANS = Object.keys(RISE_IN_TEN).filter(isCan);
const CAN_WORDS: Record<Can, string> = {
    black: "matt black",
    white: "white",
    silver: "shiny silver",
};

/** A can's reading in degrees after `minutes` in the sun, which is read to the ten minutes below it and at most 30. */
export const canReading = (can: string, minutes: number): number =>
    20 +
    (isCan(can) ? RISE_IN_TEN[can] : 0) *
        Math.floor(Math.max(0, Math.min(30, Math.round(minutes))) / 10);

const ROW = 2.8 * U;

/** A small thermometer standing upright with its bulb at the bottom. */
function thermometer<G>(c: Ctx<G>, x: number, y: number): void {
    const { pen, g } = c;
    pen.path(
        g,
        roundedRect(x - 0.2 * U, y - 1.6 * U, 0.4 * U, 1.5 * U, 5),
        "ruler",
        pen.fill("card"),
        {
            strokeWidth: 1.3,
        },
    );
    pen.circle(g, x, y, 0.55 * U, "ruler", pen.fill("berry"), { strokeWidth: 1.3 });
    pen.line(g, x, y - 0.3 * U, x, y - 1.1 * U, "ruler", { strokeWidth: 2.2, stroke: c.t.berry });
}

/** Cans of water in the sun, each with a thermometer, under a sun whose rays reach them across the gap. */
function cansInSun<G>(
    c: Ctx<G>,
    cans: readonly string[],
    minutes: number,
    show: boolean,
): RawAnchors {
    const { pen, g } = c,
        a: RawAnchors = {},
        list = cans.slice(0, 3).filter(isCan),
        ground = 11 * U,
        sun: [number, number] = [2 * U, 2 * U];
    pen.circle(g, sun[0], sun[1], 2.4 * U, "ruler", pen.fill("glow"), { strokeWidth: 1.8 });
    for (let k = 0; k < 8; k++) {
        const t = (k * Math.PI) / 4;
        pen.line(
            g,
            sun[0] + 1.5 * U * Math.cos(t),
            sun[1] + 1.5 * U * Math.sin(t),
            sun[0] + 1.95 * U * Math.cos(t),
            sun[1] + 1.95 * U * Math.sin(t),
            "ruler",
            { strokeWidth: 1.5 },
        );
    }
    pen.line(g, 0, ground, 20 * U, ground, "pencil", { strokeWidth: 2 });
    list.forEach((can, i) => {
        const x = 7 * U + i * 4.8 * U,
            w = 2.6 * U,
            top = ground - 3.6 * U;
        pen.arrow(
            g,
            [x - w / 2 - 2.2 * U, top - 0.2 * U],
            [x - w / 2 + 0.1 * U, top + 1.3 * U],
            c.t.tang,
            0,
        );
        const fill = can === "black" ? pen.fill("ink") : pen.fill("card");
        pen.rect(g, x - w / 2, top, w, ground - top, "ruler", fill, { strokeWidth: 1.8 });
        pen.ellipse(g, x, top, w, 0.7 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        if (can === "silver")
            for (const dx of [-0.75, -0.45, 0.8])
                pen.line(g, x + dx * U, top + 0.7 * U, x + dx * U, ground - 0.5 * U, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
        // the thermometer stands up out of the water, its bulb hidden inside the can
        pen.rect(g, x - 0.2 * U, top - 2.6 * U, 0.4 * U, 2.7 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        pen.line(g, x, top - 0.1 * U, x, top - 1.6 * U, "ruler", {
            strokeWidth: 2.2,
            stroke: c.t.berry,
        });
        say(c, x - 0.9 * U, top - 1.4 * U, "ABC"[i] ?? "?", 15, "end");
        if (show) num(c, x + 0.5 * U, top - 1.4 * U, `${canReading(can, minutes)} °C`, 14, "start");
        else penned(c, x + 0.9 * U, top - 1.2 * U, "?", 20);
        soft(c, x, ground + 1 * U, CAN_WORDS[can], 12);
        a[`can(${i})`] = [x, top - 2.6 * U, "up"];
    });
    soft(
        c,
        10 * U,
        ground + 1.9 * U,
        `${Math.round(minutes)} minutes in the sun, all at 20 °C to start`,
        11,
    );
    a.sun = [sun[0], sun[1], "down"];
    return a;
}

export const heatflow = defineDrawing({
    id: "heatflow",
    family: "science",
    title: "Heat on the move",
    group: "Structures",
    about: "Three ways heat moves. With `mode` 0, rods of different materials (`rods`) stand out from a tank of hot water, each with five beads stuck on with wax every 2 cm; heat is passed along the rod from particle to particle, and a bead drops when the wax under it melts. After ten minutes copper has dropped all five, aluminium four, brass three, steel two, and glass, wood and plastic none, and after a shorter `minutes` fewer, since heat creeps along more slowly the further it goes. `thick` draws a rod thicker, which a fair test keeps the same. With `mode` 1 the research hut is cut open to show a heater low by the floor or high by the ceiling (`heater`) and three thermometers from the ceiling down: warm air rises from the heater and cool air sinks, so a heater low down turns the air round the whole room and reads 22, 20 and 18 degrees, and one up high warms only the air under the ceiling and reads 27, 17 and 12. With `mode` 2 cans of water (`cans`: matt black, white or shiny silver) stand in strong sun for `insun` minutes (0, 10, 20 or 30), each with a thermometer: the sun's heat crosses empty space as radiation, and from 20 °C a black can warms 6 degrees in each ten minutes, a white one 2 and a shiny one 1, since it reflects nearly all of it. With `show` at 0 the beads or the readings wait under a question mark.",
    params: {
        mode: 0,
        rods: ["copper", "steel", "glass"],
        thick: [1, 1, 1],
        minutes: 10,
        heater: 0,
        show: 1,
        cans: ["black", "white", "silver"],
        insun: 30,
    },
    settings: {
        mode: { kind: "whole", min: 0, max: 2 },
        rods: { kind: "words", most: 4, of: RODS },
        thick: { kind: "numbers", min: 1, max: 2, most: 4 },
        minutes: { kind: "whole", min: 0, max: 10 },
        heater: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        cans: { kind: "words", most: 3, of: CANS },
        insun: { kind: "number", min: 0, max: 30, step: 10 },
    },
    takes: [
        {
            label: "Three rods after ten minutes",
            params: {
                mode: 0,
                rods: ["copper", "steel", "glass"],
                thick: [1, 1, 1],
                minutes: 10,
                heater: 0,
                show: 1,
                cans: ["black", "white", "silver"],
                insun: 30,
            },
        },
        {
            label: "Four rods, one thicker, waiting",
            params: {
                mode: 0,
                rods: ["aluminium", "brass", "wood", "copper"],
                thick: [1, 2, 1, 1],
                minutes: 5,
                heater: 0,
                show: 0,
                cans: ["black", "white", "silver"],
                insun: 30,
            },
        },
        {
            label: "The heater by the floor",
            params: {
                mode: 1,
                rods: [],
                thick: [],
                minutes: 10,
                heater: 0,
                show: 1,
                cans: ["black", "white", "silver"],
                insun: 30,
            },
        },
        {
            label: "The heater by the ceiling",
            params: {
                mode: 1,
                rods: [],
                thick: [],
                minutes: 10,
                heater: 1,
                show: 1,
                cans: ["black", "white", "silver"],
                insun: 30,
            },
        },
        {
            label: "Three cans after half an hour in the sun",
            params: {
                mode: 2,
                rods: [],
                thick: [],
                minutes: 10,
                heater: 0,
                show: 1,
                cans: ["black", "white", "silver"],
                insun: 30,
            },
        },
        {
            label: "Two cans in the sun, waiting",
            params: {
                mode: 2,
                rods: [],
                thick: [],
                minutes: 10,
                heater: 0,
                show: 0,
                cans: ["silver", "black"],
                insun: 20,
            },
        },
    ],
    box: (p) =>
        Math.round(p.mode) === 2
            ? { w: 20, h: 13 }
            : Math.round(p.mode) === 1
              ? { w: 20, h: 12 }
              : { w: 22, h: Math.ceil(Math.max(1, Math.min(4, p.rods.length)) * 2.8 + 2.2) },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            show = p.show > 0;
        if (Math.round(p.mode) === 2) return cansInSun(c, p.cans, p.insun, show);
        if (Math.round(p.mode) === 1) {
            // the hut in section: floor, walls and a sloping roof, with the heater on the left wall
            const floor = 11 * U,
                left = 1.2 * U,
                right = 14 * U,
                ceil = 3 * U,
                high = Math.round(p.heater) === 1;
            pen.polygon(
                g,
                [
                    [left - 0.4 * U, ceil + 0.4 * U],
                    [(left + right) / 2, 0.4 * U],
                    [right + 0.4 * U, ceil + 0.4 * U],
                ],
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1.8 },
            );
            pen.rect(g, left, ceil, right - left, floor - ceil, "ruler", null, {
                strokeWidth: 2.4,
            });
            pen.line(g, 0, floor, 20 * U, floor, "pencil", { strokeWidth: 2.2 });
            pen.rect(g, right - 0.1 * U, 5 * U, 0.3 * U, 3 * U, "ruler", pen.fill("sky"), {
                strokeWidth: 1.2,
            });
            const hy = high ? ceil + 0.6 * U : floor - 2.2 * U;
            pen.rect(g, left + 0.1 * U, hy, 1.1 * U, 1.6 * U, "ruler", pen.fill("tang"), {
                strokeWidth: 1.6,
            });
            for (let k = 0; k < 4; k++)
                pen.line(
                    g,
                    left + 0.3 * U + k * 0.25 * U,
                    hy + 0.2 * U,
                    left + 0.3 * U + k * 0.25 * U,
                    hy + 1.4 * U,
                    "ruler",
                    { strokeWidth: 1 },
                );
            soft(c, left + 0.1 * U, high ? hy + 2.3 * U : hy - 0.4 * U, "heater", 11, "start");
            a.heater = [left + 0.65 * U, hy, "up"];
            // the air turning: up from the heater, across, down the far side and back along the floor
            const loop = (top: number, bottom: number, x0: number, x1: number) => {
                pen.arrow(g, [x0, bottom], [x0, top], c.t.berry, 0.1);
                pen.arrow(g, [x0 + 0.4 * U, top - 0.2 * U], [x1, top - 0.2 * U], c.t.berry, 0.05);
                pen.arrow(g, [x1 + 0.3 * U, top], [x1 + 0.3 * U, bottom], c.t.sky, 0.1);
                pen.arrow(
                    g,
                    [x1, bottom + 0.2 * U],
                    [x0 + 0.4 * U, bottom + 0.2 * U],
                    c.t.sky,
                    0.05,
                );
            };
            if (high) loop(ceil + 0.9 * U, ceil + 3.2 * U, left + 1.8 * U, 9.4 * U);
            else loop(ceil + 1.1 * U, floor - 1.6 * U, left + 1.8 * U, 9.4 * U);
            const readings = roomReadings(p.heater);
            readings.forEach((t, i) => {
                const y = ceil + 2.2 * U + i * 2.6 * U,
                    x = 11.2 * U;
                thermometer(c, x, y);
                say(c, x - 0.9 * U, y - 0.4 * U, "ABC"[i] ?? "?", 15, "end");
                if (show) num(c, x + 0.8 * U, y - 0.4 * U, `${t} °C`, 14, "start");
                else penned(c, x + 1.3 * U, y - 0.2 * U, "?", 20);
                a[`reading(${i})`] = [x, y - 1.6 * U, "up"];
            });
            cap(c, 17.4 * U, 7 * U, "outside", 11);
            cap(c, 17.4 * U, 7.8 * U, "0 °C", 11);
            return a;
        }
        const list = p.rods.slice(0, 4).filter(isRod),
            n = Math.max(1, list.length),
            tankW = 3.2 * U,
            tankH = n * ROW + 0.4 * U,
            first = 5.2 * U;
        // the tank of hot water, with steam rising off it
        pen.rect(g, 0.4 * U, 1.2 * U, tankW, tankH, "ruler", null, { strokeWidth: 2 });
        pen.rect(
            g,
            0.5 * U,
            1.6 * U,
            tankW - 0.2 * U,
            tankH - 0.5 * U,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { stroke: "none" },
        );
        for (const x of [1.1, 2, 2.9])
            pen.path(
                g,
                `M${x * U} ${1.1 * U}q${0.3 * U} ${-0.3 * U} 0 ${-0.6 * U}t0 ${-0.5 * U}`,
                "pencil",
                null,
                { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
            );
        cap(c, 2 * U, tankH + 2.1 * U, "hot water", 11);
        list.forEach((rod, i) => {
            const y = 1.2 * U + 0.3 * U + i * ROW + ROW / 2,
                thick = Math.round(p.thick[i] ?? 1) === 2 ? 0.55 * U : 0.3 * U,
                end = 17.4 * U,
                fallen = show ? beadsFallen(rod, p.minutes) : 0;
            pen.rect(
                g,
                1.8 * U,
                y - thick / 2,
                end - 1.8 * U,
                thick,
                "ruler",
                pen.fill(
                    rod === "copper" ? "tang" : rod === "wood" ? "card" : "ink-soft",
                    "hachure",
                    { hachureGap: 3 },
                ),
                {
                    strokeWidth: 1.4,
                },
            );
            say(c, end + 0.5 * U, y + 5, "ABCD"[i] ?? "?", 15, "start");
            soft(c, end + 1.4 * U, y + 5, rod, 11, "start");
            for (let k = 0; k < 5; k++) {
                const x = first + k * 2.5 * U,
                    by = y + thick / 2 + 0.35 * U;
                if (k < fallen) {
                    pen.circle(g, x, by, 0.55 * U, "ruler", null, {
                        strokeWidth: 1,
                        stroke: c.t["ink-soft"],
                        strokeLineDash: [2, 3],
                    });
                } else {
                    pen.circle(g, x, by, 0.55 * U, "ruler", pen.fill("berry"), {
                        strokeWidth: 1.2,
                    });
                }
                if (i === 0) soft(c, x, 1.2 * U - 0.1 * U, `${(k + 1) * 2} cm`, 11);
            }
            if (!show) penned(c, first + 5 * U, y + 1.2 * U, "?", 18);
            a[`rod(${i})`] = [end - 1 * U, y - thick / 2, "up"];
        });
        if (show) soft(c, 11 * U, tankH + 2.1 * U, `after ${Math.round(p.minutes)} minutes`, 11);
        return a;
    },
    describe: (p) =>
        Math.round(p.mode) === 2
            ? `Cans of water painted ${p.cans
                  .filter(isCan)
                  .map((k) => CAN_WORDS[k])
                  .join(
                      " and ",
                  )} standing in the sunshine, each with a thermometer standing up out of it.`
            : Math.round(p.mode) === 1
              ? "The research hut cut open, with a heater on one wall, arrows for the air turning and three thermometers from the ceiling to the floor."
              : `Rods of ${p.rods.slice(0, 4).join(", ")} standing out from a tank of hot water, each with beads stuck along it with wax.`,
    reads: true,
});
