import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** The board's width and height, in squares. */
export const SIDINGBOARD = { w: 6, h: 5 } as const;

export const sidingBoard = defineDrawing({
    id: "sidingboard",
    family: "travel",
    title: "Siding board",
    group: "Props",
    about: "The sign at the end of a siding, on one short post beside the buffer stop: the siding's letter in a ring, what the siding is waiting for (a number the wagons in it must add up to, the order they must stand in, or the word spare), and on a chalk line under it what the siding holds so far. A tick says it is made up.",
    params: { name: "A", wants: "10", has: "", done: 0 },
    settings: {
        name: { kind: "text", most: 1 },
        wants: { kind: "text", most: 9 },
        has: { kind: "text", most: 16 },
        done: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Siding A wants ten", params: { name: "A", wants: "10", has: "", done: 0 } },
        { label: "Six and four", params: { name: "A", wants: "10", has: "6 + 4", done: 1 } },
        { label: "Made up in order", params: { name: "A", wants: "1 2 3", has: "1 2 3", done: 1 } },
        { label: "A spare siding", params: { name: "B", wants: "spare", has: "3", done: 0 } },
    ],
    box: () => ({ ...SIDINGBOARD }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = SIDINGBOARD.w * U,
            h = SIDINGBOARD.h * U,
            top = 0.2 * U,
            bottom = 4.2 * U;
        pen.rect(
            g,
            w / 2 - 0.2 * U,
            bottom - 0.3 * U,
            0.4 * U,
            h - bottom + 0.3 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 }),
            calm(c, 1.4),
        );
        pen.path(
            g,
            roundedRect(0.2 * U, top, w - 0.4 * U, bottom - top, 8),
            "ruler",
            pen.fill(p.done ? "mint" : "card"),
            calm(c, 2.2),
        );
        pen.circle(g, 1.2 * U, top + 1.05 * U, 0.72 * U, "ruler", pen.fill("glow"), calm(c, 1.6));
        say(c, 1.2 * U, top + 1.35 * U, String(p.name), 17, "middle", c.t.ink);
        const wants = String(p.wants),
            word = /[a-z]/i.test(wants);
        if (word) say(c, w / 2 + 0.6 * U, top + 2.35 * U, wants, 15, "middle", c.t["ink-soft"]);
        else num(c, w / 2 + 0.6 * U, top + 2.55 * U, wants, wants.length > 3 ? 18 : 26);
        const has = String(p.has);
        pen.line(g, 0.7 * U, top + 3.1 * U, w - 0.7 * U, top + 3.1 * U, "pencil", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        if (has) say(c, w / 2, top + 3.6 * U, has, 13, "middle", c.t.pen);
        if (p.done)
            pen.linear(
                g,
                [
                    [w - 1.25 * U, top + 0.6 * U],
                    [w - 0.95 * U, top + 0.95 * U],
                    [w - 0.5 * U, top + 0.3 * U],
                ],
                "pencil",
                { strokeWidth: 2.8, stroke: c.paper ? c.t.ink : c.t.ok },
            );
        return { board: [w / 2, top, "up"], feet: [w / 2, h, "down"] };
    },
    describe: (p) =>
        `A signboard on a wooden post with the letter ${String(p.name)} in a yellow ring, ${String(p.wants)} written under it${String(p.has) ? `, and ${String(p.has)} on a line below` : ""}${p.done ? ", ticked" : ""}.`,
    motion: { still: "A board is read, and the tick on it is the only thing that changes." },
});
