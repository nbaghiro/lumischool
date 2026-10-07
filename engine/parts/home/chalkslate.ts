import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say, wide } from "../lettering";

/** Letters as large as the slate's width allows for the line, never under the shelf's smallest. */
const fit = (s: string, room: number, most: number) =>
    Math.max(11, Math.min(most, room / Math.max(1, s.length * 0.56)));

export const chalkSlate = defineDrawing<{ top: string; sum: string }>({
    id: "chalkslate",
    family: "home",
    title: "Chalk scoreboard",
    group: "Props",
    about: "A small blackboard hung on a nail, the kind a family keeps a game's score on: what to make written small at the top, and the running sum chalked large underneath.",
    params: { top: "Make 7", sum: "2 + 3 + 2 = 7" },
    settings: { top: { kind: "text", most: 24 }, sum: { kind: "text", most: 28 } },
    takes: [
        { label: "A sum made", params: { top: "Make 7", sum: "2 + 3 + 2 = 7" } },
        { label: "Nothing yet", params: { top: "Make 10", sum: "0" } },
    ],
    box: () => ({ w: 9, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = 9 * U,
            chalk = c.paper ? c.t.ink : c.t.card;
        pen.line(g, w / 2, 0.15 * U, 1.2 * U, 0.75 * U, "ruler", {
            strokeWidth: 1,
            roughness: 0.2,
        });
        pen.line(g, w / 2, 0.15 * U, w - 1.2 * U, 0.75 * U, "ruler", {
            strokeWidth: 1,
            roughness: 0.2,
        });
        pen.rect(
            g,
            0.3 * U,
            0.7 * U,
            w - 0.6 * U,
            3.1 * U,
            "ruler",
            c.paper ? null : pen.fill("ink", "solid"),
            { strokeWidth: 2.6, roughness: 0.3, stroke: c.paper ? c.t.ink : c.t["ink-soft"] },
        );
        const room = w - 1.4 * U;
        say(c, w / 2, 1.75 * U, p.top, fit(p.top, room, 15), "middle", chalk);
        const big = fit(p.sum, room, 24);
        say(c, w / 2, 3.25 * U, p.sum, big, "middle", chalk);
        return {
            sum: [w / 2 + wide(p.sum, big) / 2, 3 * U, "right"],
            nail: [w / 2, 0.15 * U, "up"],
        };
    },
    describe: (p) =>
        `A small blackboard hung from a nail by a string, with ${p.top || "nothing"} chalked small at the top and ${p.sum || "nothing"} chalked large underneath.`,
    motion: { still: STILL.text },
});
