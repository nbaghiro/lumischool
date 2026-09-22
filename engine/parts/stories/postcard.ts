import { group } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { icon } from "./pictures";
import { say, soft } from "../lettering";
import { rows } from "./rows";

/** A postcard's message, wrapped to the left half of the card. */
const postLines = (text: string, lines: number): string[] =>
    text
        ? rows(text, 40)
        : Array.from({ length: Math.max(1, Math.min(8, Math.round(lines))) }, () => "");

export const postcard = defineDrawing({
    id: "postcard",
    family: "stories",
    title: "A postcard",
    group: "Structures",
    about: "A postcard as it is laid out: the message on the left with its greeting and the name it is signed with, and on the right a stamp, a postmark with the date and the address on ruled lines. A letter's parts each have a job, and the message is short enough to read for clues about where it was sent from. With no message it is ruled lines to write one on.",
    params: {
        greeting: "Dear Sam,",
        text: "The sea was rough today and the ship rocked all night. We saw a whale this morning!",
        closing: "Love from",
        from: "",
        to: ["Sam Reed", "12 Mill Lane", "Ash"],
        stamp: "ship",
        date: "3 May",
        lines: 4,
    },
    settings: {
        greeting: { kind: "text", most: 20 },
        text: { kind: "text", most: 200 },
        closing: { kind: "text", most: 20 },
        from: { kind: "text", most: 20 },
        to: { kind: "words", most: 4 },
        stamp: { kind: "one of", of: ["ship", "lighthouse", "whale", "none"] },
        date: { kind: "text", most: 12 },
        lines: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        {
            label: "From the sea",
            params: {
                greeting: "Dear Sam,",
                text: "The sea was rough today and the ship rocked all night. We saw a whale this morning!",
                closing: "Love from",
                from: "Nell",
                to: ["Sam Reed", "12 Mill Lane", "Ash"],
                stamp: "ship",
                date: "3 May",
                lines: 4,
            },
        },
        {
            label: "A lighthouse stamp",
            params: {
                greeting: "Hello Gran,",
                text: "We are staying by the harbour. Every night the lamp at the top goes round and round.",
                closing: "See you soon,",
                from: "Ravi",
                to: ["Mrs Shah", "4 Hill Road", "Bray"],
                stamp: "lighthouse",
                date: "9 Aug",
                lines: 4,
            },
        },
    ],
    box: (p) => ({
        w: 34,
        h: Math.max(13, Math.ceil(3.6 + postLines(p.text, p.lines).length * 1.6 + 4.2)),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            body = postLines(p.text, p.lines),
            H = Math.max(13, Math.ceil(3.6 + body.length * 1.6 + 4.2)) * U;
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, 33.2 * U, H - 0.8 * U, 8),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        pen.line(g, 20.6 * U, 1.4 * U, 20.6 * U, H - 1.4 * U, "pencil", {
            strokeWidth: 1.3,
            stroke: c.t["ink-soft"],
        });
        if (p.greeting) say(c, 1.4 * U, 2.2 * U, p.greeting, 17, "start");
        body.forEach((line, i) => {
            if (line) say(c, 1.4 * U, (3.8 + i * 1.6) * U, line, 16, "start");
            else
                pen.line(g, 1.4 * U, (3.9 + i * 1.6) * U, 19.6 * U, (3.9 + i * 1.6) * U, "ruler", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
        });
        const end = (3.8 + body.length * 1.6 + 0.6) * U;
        if (p.closing) say(c, 1.4 * U, end, p.closing, 16, "start");
        if (p.from) say(c, 1.4 * U, end + 1.6 * U, p.from, 17, "start");
        const sx = 29.2 * U,
            sy = 1 * U,
            sw = 3.6 * U,
            sh = 4.2 * U;
        // With no picture the stamp is still there, plain, so the card still looks like a postcard.
        pen.rect(g, sx, sy, sw, sh, "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
            strokeLineDash: [3, 3],
        });
        pen.rect(
            g,
            sx + 0.3 * U,
            sy + 0.3 * U,
            sw - 0.6 * U,
            sh - 0.6 * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
            { strokeWidth: 1.1 },
        );
        if (p.stamp !== "none") {
            const inner = group(c, {
                turn: [
                    ["translate", sx + sw / 2, sy + sh - 0.5 * U],
                    ["scale", 0.72],
                    ["translate", -sx - sw / 2, -(sy + sh - 0.5 * U)],
                ],
            });
            if (p.stamp === "whale") {
                const wx = sx + sw / 2,
                    wy = sy + sh - 1.5 * U;
                pen.path(
                    inner.g,
                    `M${wx - 1.4 * U} ${wy}Q${wx - 1.2 * U} ${wy - 1.2 * U} ${wx + 0.2 * U} ${wy - 1 * U}Q${wx + 1.2 * U} ${wy - 0.8 * U} ${wx + 1.3 * U} ${wy}Q${wx} ${wy + 0.5 * U} ${wx - 1.4 * U} ${wy}Z`,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 1.4 },
                );
                pen.polygon(
                    inner.g,
                    [
                        [wx - 1.3 * U, wy - 0.1 * U],
                        [wx - 2 * U, wy - 0.7 * U],
                        [wx - 1.9 * U, wy + 0.4 * U],
                    ],
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 1.2 },
                );
                pen.line(inner.g, wx + 0.3 * U, wy - 1 * U, wx + 0.3 * U, wy - 1.8 * U, "pencil", {
                    strokeWidth: 1.2,
                    stroke: c.t.sky,
                });
            } else
                icon(
                    inner,
                    p.stamp === "ship" ? "boat" : "lighthouse",
                    sx + sw / 2,
                    sy + sh - 0.5 * U,
                );
        }
        const mx = sx - 2.2 * U,
            my = sy + 2.2 * U;
        pen.circle(g, mx, my, 3 * U, "pencil", null, { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
        if (p.date) soft(c, mx, my + 5, p.date, 12);
        for (const k of [0, 1, 2])
            pen.curve(
                g,
                [
                    [mx - 3.4 * U, my - 0.5 * U + k * 0.5 * U],
                    [mx - 2.7 * U, my - 0.8 * U + k * 0.5 * U],
                    [mx - 1.6 * U, my - 0.5 * U + k * 0.5 * U],
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
        p.to.forEach((line, i) => {
            const y = (7.6 + i * 1.8) * U;
            pen.line(g, 21.4 * U, y + 6, 32.8 * U, y + 6, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
            say(c, 21.6 * U, y, line, 16, "start");
        });
        return {
            message: [1.4 * U, 1.4 * U, "up"],
            stamp: [sx + sw / 2, sy, "up"],
            address: [27 * U, 6.4 * U, "up"],
        };
    },
    describe: () =>
        "A postcard laid out with the message on the left under a greeting, and on the right a stamp, a round postmark and an address on ruled lines.",
});
