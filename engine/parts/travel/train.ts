import { part, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A carriage is as wide as its windows, with half a window of body at each end. */
const carW = (windows: number): number => windows * 1.5 + 1;

type Train = { carriages: number; windows: number };

const trainSpan = (p: Train): number =>
    5.8 + p.carriages * carW(p.windows) + (p.carriages - 1) * 0.6;

/** A long train is squeezed along its length to the width of a page rather than running off it.
 *  The carriages stay identical to each other, so what is being counted does not change. */
const trainFit = (p: Train): number => Math.min(1, 34 / trainSpan(p));

export const train = defineDrawing({
    id: "train",
    family: "travel",
    title: "Train",
    group: "Props",
    about: "An engine and a line of identical carriages, each with the same windows and some of the seats taken. Identical carriages are equal groups, so the whole train is a times table that can be counted.",
    params: { carriages: 3, windows: 4, on: 6 },
    settings: {
        carriages: { kind: "whole", min: 1, max: 6 },
        windows: { kind: "whole", min: 1, max: 6 },
        on: { kind: "whole", min: 0, max: 36 },
    },
    takes: [
        { label: "Three carriages", params: { carriages: 3, windows: 4, on: 6 } },
        { label: "Two, fuller", params: { carriages: 2, windows: 5, on: 9 } },
        { label: "Empty", params: { carriages: 4, windows: 4, on: 0 } },
    ],
    box: (p) => ({ w: Math.ceil(trainSpan(p) * trainFit(p)) + 2, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            k = trainFit(p),
            span = trainSpan(p) * k,
            w = (Math.ceil(span) + 2) * U;
        const x0 = (w - span * U) / 2,
            rail = 7.3 * U,
            a: RawAnchors = {};
        // Along the train, squares are worth k of a square; across it they are worth a square.
        const X = (sq: number) => x0 + sq * k * U,
            W = (sq: number) => sq * k * U;
        // The track goes down first, so every wheel sits on top of it rather than behind it.
        pen.line(g, 0.4 * U, rail, w - 0.4 * U, rail, "pencil", { strokeWidth: 2.4 });
        pen.line(g, 0.4 * U, rail + 0.5 * U, w - 0.4 * U, rail + 0.5 * U, "pencil", {
            strokeWidth: 1.3,
            stroke: c.t["ink-soft"],
        });
        for (let s = 1; s * U < w - 0.8 * U; s++) {
            pen.line(g, s * U, rail, s * U, rail + 0.5 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
        }
        const lTop = 3.5 * U,
            lBot = 6.3 * U;
        for (const [dx, dy, d] of [
            [1.15, 1.85, 0.85],
            [1.95, 1.5, 0.68],
            [2.65, 1.3, 0.54],
        ] as const) {
            pen.circle(
                part(c, "steam", [X(dx), dy * U]).g,
                X(dx),
                dy * U,
                d * k * U,
                "doodle",
                pen.fill("card"),
                { strokeWidth: 1.3 },
            );
        }
        pen.rect(
            g,
            X(0.7),
            2.5 * U,
            W(0.8),
            U,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 10, fillWeight: 0.5 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${X(0.2)} ${lBot}V${lTop + 0.5 * U}Q${X(0.2)} ${lTop} ${X(0.9)} ${lTop}` +
                `H${X(3.2)}V${2.7 * U}H${X(5.2)}V${lBot}Z`,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2.6 },
        );
        pen.rect(g, X(3.6), 3.1 * U, W(1.3), 1.2 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.6,
        });
        for (const [wx, d] of [
            [1.5, 1.6],
            [2.9, 1.3],
            [4.3, 1.3],
        ] as const) {
            pen.circle(
                g,
                X(wx),
                rail - (d * k * U) / 2,
                d * k * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 2 },
            );
            pen.circle(g, X(wx), rail - (d * k * U) / 2, 0.4 * k * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.2,
            });
        }
        const top = 3.3 * U,
            bot = 6.1 * U,
            cw = W(carW(p.windows));
        for (let i = 0; i < p.carriages; i++) {
            const cx = X(5.8 + i * (carW(p.windows) + 0.6));
            pen.line(g, cx - W(0.6), 5.7 * U, cx, 5.7 * U, "pencil", { strokeWidth: 2 });
            pen.path(
                g,
                roundedRect(cx, top, cw, bot - top, 8),
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 2.4 },
            );
            pen.line(g, cx + 8, top + 0.35 * U, cx + cw - 8, top + 0.35 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            for (let n = 0; n < p.windows; n++) {
                const wx = cx + W(0.7 + n * 1.5),
                    wy = top + 0.6 * U,
                    ww = W(1.1);
                pen.rect(g, wx, wy, ww, 1.1 * U, "ruler", pen.fill("card"), { strokeWidth: 1.5 });
                // Passengers fill the seats from the front of the train, so a part-full carriage is honest.
                if (i * p.windows + n < p.on) {
                    pen.circle(
                        g,
                        wx + ww / 2,
                        wy + 0.42 * U,
                        0.5 * k * U,
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.2 },
                    );
                    pen.path(
                        g,
                        `M${wx + 3} ${wy + 1.1 * U}Q${wx + ww / 2} ${wy + 0.58 * U} ${wx + ww - 3} ${wy + 1.1 * U}Z`,
                        "pencil",
                        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
                        { strokeWidth: 1.2 },
                    );
                }
            }
            for (const s of [1, carW(p.windows) - 1]) {
                pen.circle(
                    g,
                    cx + W(s),
                    rail - 0.6 * k * U,
                    1.2 * k * U,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                    { strokeWidth: 1.8 },
                );
            }
            a[`carriage(${i})`] = [cx + cw / 2, top, "up"];
        }
        a.loco = [X(2.6), 2.5 * U, "up"];
        a.track = [w / 2, rail + 0.5 * U, "down"];
        return a;
    },
    describe: (p) =>
        `An engine with a funnel and puffs of steam pulling ${p.carriages === 1 ? "one blue carriage" : "a line of identical blue carriages"} along a track, each with the same row of windows and some seats taken.`,
    motion: {
        body: { is: "breathe", amt: 0.025, period: 3.1 },
        parts: { steam: { is: "flow", lift: 6, dx: 3, period: 2.9, wave: 0.45 } },
    },
});
