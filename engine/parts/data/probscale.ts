import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";

const WORDS = ["impossible", "unlikely", "even chance", "likely", "certain"];

export const probScale = defineDrawing({
    id: "probscale",
    family: "data",
    title: "Probability scale",
    group: "Structures",
    about: "Nought to one with the five words written under it, so an event can be pegged to a place rather than to a number. The written fraction above and the word below have to agree.",
    params: {
        marks: [
            { at: 0.5, label: "a head" },
            { at: 1, label: "tomorrow" },
        ] as { at: number; label: string }[],
        numbers: true,
    },
    settings: { marks: { kind: "fixed" }, numbers: { kind: "flag" } },
    takes: [
        {
            label: "Two events",
            params: {
                marks: [
                    { at: 0.5, label: "a head" },
                    { at: 1, label: "tomorrow" },
                ],
                numbers: true,
            },
        },
        { label: "Words only", params: { marks: [], numbers: false } },
        {
            label: "Unlikely",
            params: { marks: [{ at: 0.25, label: "rain today" }], numbers: true },
        },
    ],
    box: () => ({ w: 26, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 3 * U,
            w = 20 * U,
            y = 4 * U,
            a: RawAnchors = {};
        const at = (v: number) => x0 + Math.max(0, Math.min(1, v)) * w;
        pen.line(g, x0 - 12, y, x0 + w + 12, y, "ruler", { strokeWidth: 2.4 });
        for (let k = 0; k <= 4; k++) {
            const x = x0 + (k * w) / 4,
                end = k === 0 || k === 4;
            pen.line(g, x, y - 10, x, y + 10, "ruler", { strokeWidth: end || k === 2 ? 2 : 1.2 });
            if (p.numbers)
                num(
                    c,
                    x,
                    y + 28,
                    k === 0 ? "0" : k === 4 ? "1" : k === 2 ? "1/2" : k === 1 ? "1/4" : "3/4",
                    14,
                );
            soft(c, x, y + (p.numbers ? 50 : 30), WORDS[k] ?? "", 13);
            a[`mark(${WORDS[k]})`] = [x, y, "up"];
        }
        p.marks.forEach((m, i) => {
            const x = at(m.at);
            pen.circle(g, x, y, 13, "ruler", pen.fill("berry"), { strokeWidth: 1.8 });
            pen.line(g, x, y - 13, x, y - 1.5 * U, "pencil", { strokeWidth: 1.6, stroke: c.t.pen });
            say(
                c,
                x,
                y - 1.7 * U,
                m.label,
                15,
                x > x0 + w * 0.85 ? "end" : x < x0 + w * 0.15 ? "start" : "middle",
                c.t.pen,
            );
            a[`event(${i})`] = [x, y - 1.9 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A probability scale from impossible to certain with ticks along it${p.numbers ? " and the fractions written under them" : ""}, and labelled arrows pointing to marks on the line.`,
});
