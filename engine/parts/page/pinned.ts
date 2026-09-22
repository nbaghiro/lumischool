import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { tape } from "../marks";

export const pinnedCard = defineDrawing({
    id: "pinned",
    family: "page",
    title: "Card on the page",
    group: "Marks",
    about: "A card held down four ways: taped, clipped, pinned, or with its own corner turned. Whatever is on the card belongs to a person rather than to the worksheet, which is the point of it.",
    params: {
        hold: "tape",
        lines: ["Remember to", "check the units."],
        width: 12,
        size: 16,
        align: "start",
    },
    settings: {
        hold: { kind: "one of", of: ["tape", "clip", "pin", "fold"] },
        lines: { kind: "words", most: 6 },
        width: { kind: "whole", min: 6, max: 24 },
        size: { kind: "whole", min: 12, max: 24 },
        align: { kind: "one of", of: ["start", "middle"] },
    },
    takes: [
        {
            label: "Taped",
            params: {
                hold: "tape",
                lines: ["Remember to", "check the units."],
                width: 12,
                size: 16,
                align: "start",
            },
        },
        {
            label: "Clipped",
            params: {
                hold: "clip",
                lines: ["Show your working."],
                width: 12,
                size: 16,
                align: "start",
            },
        },
        {
            label: "Pinned",
            params: {
                hold: "pin",
                lines: ["Homework:", "page 24."],
                width: 11,
                size: 16,
                align: "start",
            },
        },
        {
            label: "Corner turned",
            params: {
                hold: "fold",
                lines: ["Come back", "to this one."],
                width: 11,
                size: 16,
                align: "start",
            },
        },
    ],
    box: (p) => ({ w: p.width, h: p.lines.length * 2 + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = (p.width - 2) * U,
            x = U,
            y = 1.4 * U,
            h = (p.lines.length * 2 + 2.6) * U;
        const fold = 1.3 * U;
        if (p.hold === "fold") {
            pen.path(
                g,
                `M${x} ${y}H${x + w - fold}L${x + w} ${y + fold}V${y + h}H${x}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 2 },
            );
            pen.path(
                g,
                `M${x + w - fold} ${y}V${y + fold}H${x + w}Z`,
                "pencil",
                pen.fill("grid", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.6 },
            );
        } else {
            pen.rect(g, x, y, w, h, "pencil", pen.fill("card"), { strokeWidth: 2 });
        }
        if (p.hold === "tape") tape(c, x + w / 2 - 34, y - 10, 68, 20, -5);
        if (p.hold === "pin") {
            pen.circle(g, x + w / 2, y + 2, 18, "pencil", pen.fill("berry"), { strokeWidth: 1.6 });
            pen.circle(g, x + w / 2 - 4, y - 2, 6, "pencil", pen.fill("card"), {
                strokeWidth: 0.8,
            });
        }
        if (p.hold === "clip") {
            const cxp = x + w - 1.6 * U;
            for (const [inset, wide2] of [
                [0, 0.42],
                [5, 0.26],
            ] as const) {
                pen.path(
                    g,
                    `M${cxp - wide2 * U} ${y - 0.5 * U + inset}V${y + 1.5 * U - inset}` +
                        `q0 ${0.34 * U} ${wide2 * U} ${0.34 * U}q${wide2 * U} 0 ${wide2 * U} ${-0.34 * U}V${y - 0.2 * U + inset}`,
                    "pencil",
                    null,
                    { strokeWidth: 2, stroke: c.t["ink-soft"] },
                );
            }
        }
        // Lines are written from the left at the size of a note, or centred and larger when a card carries
        // one thing to be read from across a room, such as a rule; centred lines sit in the body below the pin.
        const size = Number(p.size) || 16,
            middle = p.align === "middle";
        p.lines.forEach((line, i) => {
            if (!middle) {
                say(c, x + 0.7 * U, y + (1.5 + i * 1.7) * U, line, size, "start");
                return;
            }
            const step = Math.max(1.7 * U, size * 1.3),
                first = y + U + (h - U - (p.lines.length - 1) * step) / 2 + size * 0.35;
            say(c, x + w / 2, first + i * step, line, size, "middle");
        });
        const a: RawAnchors = { card: [x + w / 2, y, "up"], hold: [x + w / 2, y - 0.4 * U, "up"] };
        return a;
    },
    describe: (p) => {
        const how =
            p.hold === "clip"
                ? "held by a paper clip at its top right corner"
                : p.hold === "pin"
                  ? "held by a round pin at the top"
                  : p.hold === "fold"
                    ? "with its top right corner turned down"
                    : "held by a strip of tape across its top";
        return `A white card on the page, ${how}, with ${p.lines.length === 1 ? "one line" : "lines"} of writing ${p.align === "middle" ? "centred on it" : "on it from the left"}.`;
    },
});
