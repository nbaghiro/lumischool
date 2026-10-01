import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** At most this many stops fit on the card. */
const MOST = 5;
const rowsOf = (items: readonly string[]) => Math.max(1, Math.min(MOST, items.length));
/** The card's size in squares: wide enough for "then 2 more than 10", and a line for each stop. */
const listBox = (rows: number) => ({ w: 12, h: Math.ceil(2.4 + rows * 1.3) });

export const deliveryList = defineDrawing({
    id: "deliverylist",
    family: "travel",
    title: "Delivery list",
    group: "Props",
    about: "A clipboard pinned to a van's dashboard with the round's stops written one under another, a box beside each that is ticked when that parcel is delivered, and an arrow at the stop that comes next.",
    params: { items: ["8", "then 15", "then 23"], done: [1, 0, 0], next: 1 },
    settings: {
        items: { kind: "words", most: MOST },
        done: { kind: "numbers", min: 0, max: 1, most: MOST },
        next: { kind: "whole", min: -1, max: MOST - 1 },
    },
    takes: [
        {
            label: "One delivered",
            params: { items: ["8", "then 15", "then 23"], done: [1, 0, 0], next: 1 },
        },
        {
            label: "Any order",
            params: { items: ["70", "30", "50"], done: [0, 0, 0], next: -1 },
        },
        {
            label: "All delivered",
            params: { items: ["a quarter", "three quarters"], done: [1, 1], next: -1 },
        },
    ],
    box: (p) => listBox(rowsOf(p.items)),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            rows = rowsOf(p.items),
            w = listBox(rows).w * U,
            h = listBox(rows).h * U;
        pen.path(
            g,
            roundedRect(0.1 * U, 0.4 * U, w - 0.2 * U, h - 0.5 * U, 10),
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
            calm(c, 2),
        );
        pen.path(
            g,
            roundedRect(0.5 * U, 0.9 * U, w - U, h - 1.4 * U, 6),
            "ruler",
            pen.fill("card"),
            calm(c, 1.4),
        );
        pen.rect(
            g,
            w / 2 - 1.3 * U,
            0.1 * U,
            2.6 * U,
            0.8 * U,
            "ruler",
            pen.fill("ink"),
            calm(c, 1),
        );
        cap(c, w / 2, 1.8 * U, "DELIVERIES", 11);
        for (let i = 0; i < rows; i++) {
            const y = (2.3 + i * 1.3) * U,
                ticked = (p.done[i] ?? 0) > 0;
            pen.rect(g, 1.1 * U, y, 0.8 * U, 0.8 * U, "ruler", pen.fill("card"), calm(c, 1.3));
            if (ticked)
                pen.linear(
                    g,
                    [
                        [1.2 * U, y + 0.4 * U],
                        [1.45 * U, y + 0.7 * U],
                        [2.0 * U, y - 0.05 * U],
                    ],
                    "pencil",
                    { strokeWidth: 2.6, stroke: c.paper ? c.t.ink : c.t.ok },
                );
            say(
                c,
                2.4 * U,
                y + 0.68 * U,
                String(p.items[i] ?? ""),
                13,
                "start",
                ticked ? c.t["ink-soft"] : c.t.ink,
            );
            if (i === p.next)
                pen.linear(
                    g,
                    [
                        [w - 0.9 * U, y + 0.1 * U],
                        [w - 1.4 * U, y + 0.4 * U],
                        [w - 0.9 * U, y + 0.7 * U],
                    ],
                    "pencil",
                    { strokeWidth: 2.2, stroke: c.paper ? c.t.ink : c.t.pen },
                );
        }
        return { top: [w / 2, 0, "up"], middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) => {
        const items = p.items.slice(0, MOST).map(String),
            ticked = items.filter((_, i) => (p.done[i] ?? 0) > 0).length;
        return `A delivery list on a clipboard with ${items.length} ${items.length === 1 ? "stop" : "stops"} written on it, ${items.join(", ")}, and ${ticked} of them ticked off as delivered.`;
    },
    motion: { still: "A list is read, and the ticks on it are the only thing that changes." },
});
