import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, say, soft } from "../lettering";

/**
 * Each wrap as a model rather than a measurement, in the order a classroom test finds. `loss` is how
 * many degrees a cup of hot water loses every ten minutes, chosen so a reading lands on a thermometer
 * mark; `lets` is the share of the room's warmth that reaches an ice cube, against a bare cup's.
 */
const NO_WRAP = { name: "no wrap", loss: 20, lets: 1 };
const WRAPS: Record<string, { name: string; loss: number; lets: number }> = {
    none: NO_WRAP,
    paper: { name: "paper", loss: 15, lets: 0.625 },
    bubble: { name: "bubble wrap", loss: 10, lets: 0.5 },
    foil: { name: "foil", loss: 10, lets: 0.5 },
    cloth: { name: "cloth", loss: 5, lets: 0.375 },
    wool: { name: "wool", loss: 5, lets: 0.125 },
};

const ROOMS = [5, 10, 15, 20, 25, 30] as const;

/** A cup of hot water after so many minutes: it cools by its wrap's loss, and no further than the room. */
export const cupReading = (wrap: string, start: number, minutes: number, room = 20): number =>
    Math.max(room, Math.round(start) - ((WRAPS[wrap] ?? NO_WRAP).loss * Math.round(minutes)) / 10);

/**
 * The warmth that has reached an ice cube, in degrees times minutes over ten. A cube melts once it has
 * taken `MELT`, and only then does the water warm, towards the room.
 */
const MELT = 10;
const warmth = (wrap: string, room: number, minutes: number): number =>
    (Math.max(0, room) * (WRAPS[wrap] ?? NO_WRAP).lets * Math.max(0, Math.round(minutes))) / 10;

/** How much of a cup's ice cube has melted, from 0 to 1. */
export const iceMelted = (wrap: string, room: number, minutes: number): number =>
    Math.min(1, warmth(wrap, room, minutes) / MELT);

/** A cup that started with an ice cube at 0 degrees: 0 while any ice is left, then rising towards the room, to the nearest five. */
export const iceReading = (wrap: string, room: number, minutes: number): number =>
    Math.min(room, 5 * Math.round(Math.max(0, warmth(wrap, room, minutes) - MELT) / 5));

export const wrapped = defineDrawing({
    id: "wrapped",
    family: "science",
    title: "Keeping it warm",
    group: "Structures",
    about: "Cups of hot water, each wrapped in something different, with a thermometer standing in each. They all start at the same temperature, and the reading after a while is worked out from the wrap, so the cup that stayed warmest is the one whose wrap let the least heat out. Every ten minutes a bare cup loses 20 degrees, paper 15, bubble wrap and foil 10, and cloth and wool 5, cooling no further than the room. With `ice` at 1 each cup holds an ice cube instead, starting at 0 degrees on a thermometer from 0 to 30, and the cube is drawn smaller the more it has melted: the reading stays at 0 while any ice is left, then rises towards the room. After twenty minutes in a room at 20 degrees the bare cup reads 20, paper 15, foil 10 and cloth 5, and in wool the ice has not melted, so it reads 0; a warmer room melts every cube faster. With `show` at 0 the thermometers wait under a question mark, for a prediction.",
    params: { wraps: ["none", "paper", "wool"], start: 80, minutes: 20, show: 1, ice: 0, room: 20 },
    settings: {
        wraps: { kind: "words", most: 4, of: ["none", "paper", "bubble", "foil", "cloth", "wool"] },
        start: { kind: "whole", min: 20, max: 100 },
        minutes: { kind: "whole", min: 0, max: 60 },
        show: { kind: "whole", min: 0, max: 1 },
        ice: { kind: "whole", min: 0, max: 1 },
        room: { kind: "one of", of: ROOMS },
    },
    takes: [
        {
            label: "Three wraps after twenty minutes",
            params: {
                wraps: ["none", "paper", "wool"],
                start: 80,
                minutes: 20,
                show: 1,
                ice: 0,
                room: 20,
            },
        },
        {
            label: "Four wraps after ten minutes",
            params: {
                wraps: ["wool", "none", "bubble", "paper"],
                start: 80,
                minutes: 10,
                show: 1,
                ice: 0,
                room: 20,
            },
        },
        {
            label: "Which stays warmer?",
            params: {
                wraps: ["bubble", "none"],
                start: 80,
                minutes: 20,
                show: 0,
                ice: 0,
                room: 20,
            },
        },
        {
            label: "Ice after twenty minutes",
            params: {
                wraps: ["paper", "foil", "cloth", "wool"],
                start: 80,
                minutes: 20,
                show: 1,
                ice: 1,
                room: 20,
            },
        },
        {
            label: "Ice after five minutes",
            params: {
                wraps: ["none", "foil", "wool"],
                start: 80,
                minutes: 5,
                show: 1,
                ice: 1,
                room: 20,
            },
        },
        {
            label: "Wool in a cool room",
            params: { wraps: ["wool"], start: 80, minutes: 20, show: 1, ice: 1, room: 10 },
        },
        {
            label: "Wool in a warm room",
            params: { wraps: ["wool"], start: 80, minutes: 20, show: 1, ice: 1, room: 25 },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(4, p.wraps.length)) * 5 + 1, h: p.ice > 0 ? 13 : 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            list = p.wraps.slice(0, 4),
            base = 10 * U,
            ice = p.ice > 0,
            room = ROOMS.find((r) => r === p.room) ?? 20,
            scaleTop = ice ? 30 : 80;
        list.forEach((wrap, i) => {
            const x = (0.5 + i * 5) * U,
                cx = x + 2.5 * U,
                cw = 3 * U,
                ch = 3.6 * U,
                top = base - ch;
            // the thermometer first, standing in the water, so the cup is drawn in front of its bottom
            const tx = cx + 0.5 * U,
                t0 = 1.2 * U,
                t1 = top + 1.4 * U,
                H = t1 - t0,
                reading = ice
                    ? iceReading(wrap, room, p.minutes)
                    : cupReading(wrap, p.start, p.minutes);
            pen.path(
                g,
                roundedRect(tx - 0.4 * U, t0 - 0.2 * U, 0.8 * U, H + 0.6 * U, 8),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            const mark = ice ? 5 : 10;
            for (let v = 0; v <= scaleTop; v += mark) {
                const y = t1 - (v / scaleTop) * H,
                    major = v % (2 * mark) === 0;
                pen.line(g, tx - 0.4 * U, y, tx - (major ? 0.05 : 0.2) * U, y, "ruler", {
                    strokeWidth: 1,
                });
                if (major) soft(c, tx - 0.55 * U, y + 4, String(v), 10, "end");
            }
            if (p.show > 0) {
                const y = t1 - (Math.min(scaleTop, reading) / scaleTop) * H;
                pen.rect(
                    g,
                    tx - 0.14 * U,
                    y,
                    0.28 * U,
                    t1 - y + 0.3 * U,
                    "ruler",
                    pen.fill("berry"),
                    { strokeWidth: 0.6, stroke: c.t.berry },
                );
            } else penned(c, tx + 0.9 * U, t0 + 0.6 * U, "?", 22);
            if (ice) {
                // the cube floats with its top above the rim, and shrinks as it melts
                const left = 1 - iceMelted(wrap, room, p.minutes),
                    side = 1.5 * U * (0.25 + 0.75 * left),
                    ix = cx - 0.7 * U,
                    iy = top - 0.15 * U;
                if (left > 0) {
                    pen.path(
                        g,
                        roundedRect(ix - side / 2, iy - side / 2, side, side, 4),
                        "ruler",
                        pen.fill(c.paper ? "card" : "sky", "hachure", {
                            hachureGap: 5,
                            fillWeight: 0.5,
                        }),
                        { strokeWidth: 1.6 },
                    );
                    pen.line(
                        g,
                        ix - side / 4,
                        iy - side / 4,
                        ix + side / 8,
                        iy - side / 4,
                        "ruler",
                        {
                            strokeWidth: 1.1,
                        },
                    );
                }
            }
            // the cup, and its wrap round the middle
            pen.path(
                g,
                `M${cx - cw / 2} ${top}L${cx - cw / 2 + 0.3 * U} ${base}H${cx + cw / 2 - 0.3 * U}L${cx + cw / 2} ${top}`,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 2 },
            );
            const wy = top + 0.7 * U,
                wh = ch - 1.3 * U;
            if (wrap === "wool") {
                pen.rect(
                    g,
                    cx - cw / 2 + 0.1 * U,
                    wy,
                    cw - 0.4 * U,
                    wh,
                    "pencil",
                    pen.fill("berry", "cross-hatch", { hachureGap: 5 }),
                    { strokeWidth: 1.6 },
                );
                for (let k = 0; k < 4; k++)
                    pen.arc(
                        g,
                        cx - 0.9 * U + k * 0.6 * U,
                        wy + 0.4 * U,
                        0.6 * U,
                        0.5 * U,
                        0,
                        Math.PI,
                        "pencil",
                        { strokeWidth: 1 },
                    );
            } else if (wrap === "bubble") {
                pen.rect(
                    g,
                    cx - cw / 2 + 0.1 * U,
                    wy,
                    cw - 0.4 * U,
                    wh,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
                for (let r = 0; r < 3; r++)
                    for (let k = 0; k < 4; k++)
                        pen.circle(
                            g,
                            cx - 1 * U + k * 0.62 * U + (r % 2) * 0.3 * U,
                            wy + 0.35 * U + r * 0.55 * U,
                            0.42 * U,
                            "ruler",
                            null,
                            { strokeWidth: 0.9 },
                        );
            } else if (wrap === "foil") {
                pen.rect(
                    g,
                    cx - cw / 2 + 0.1 * U,
                    wy,
                    cw - 0.4 * U,
                    wh,
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
                for (let k = 0; k < 2; k++) {
                    const y = wy + (0.45 + k * 0.7) * U;
                    pen.path(
                        g,
                        `M${cx - 1.15 * U} ${y}l${0.3 * U} ${-0.2 * U}l${0.35 * U} ${0.25 * U}l${0.3 * U} ${-0.25 * U}l${0.35 * U} ${0.2 * U}l${0.3 * U} ${-0.15 * U}`,
                        "ruler",
                        null,
                        { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
                    );
                }
            } else if (wrap === "cloth") {
                pen.rect(
                    g,
                    cx - cw / 2 + 0.1 * U,
                    wy,
                    cw - 0.4 * U,
                    wh,
                    "pencil",
                    pen.fill("mint", "hachure", { hachureGap: 6 }),
                    { strokeWidth: 1.6 },
                );
                for (const y of [wy + 0.2 * U, wy + wh - 0.2 * U])
                    pen.line(g, cx - cw / 2 + 0.3 * U, y, cx + cw / 2 - 0.5 * U, y, "ruler", {
                        strokeWidth: 1,
                        strokeLineDash: [3, 3],
                    });
            } else if (wrap === "paper") {
                pen.rect(
                    g,
                    cx - cw / 2 + 0.1 * U,
                    wy,
                    cw - 0.4 * U,
                    wh,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
                for (let k = 1; k < 3; k++)
                    pen.line(
                        g,
                        cx - cw / 2 + 0.3 * U,
                        wy + k * 0.6 * U,
                        cx + cw / 2 - 0.5 * U,
                        wy + k * 0.6 * U,
                        "pencil",
                        { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
                    );
            }
            cap(c, cx, base + 0.9 * U, WRAPS[wrap]?.name ?? wrap, 10);
            say(c, cx - 1.8 * U, 1.4 * U, "ABCD"[i] ?? "?", 16);
            a[`cup(${i})`] = [cx, top, "up"];
        });
        const mid = (list.length * 5 * U) / 2 + 0.5 * U;
        soft(c, mid, 11.8 * U, `after ${Math.round(p.minutes)} minutes`, 12);
        if (ice) soft(c, mid, 12.7 * U, `room at ${room} degrees`, 12);
        return a;
    },
    describe: (p) =>
        p.ice > 0
            ? "Cups of water in a row, each holding an ice cube and wrapped in something different or left bare, with a thermometer standing in each."
            : "Cups of hot water in a row, each wrapped in something different or left bare, with a thermometer standing in each and the minutes passed written below.",
    reads: true,
});
