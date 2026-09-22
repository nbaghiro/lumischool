import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { cap, num, numOn, patch, say, wide } from "../lettering";

/** The mono face runs wider than the reading face, so anything patched under it needs the room. */
const monoW = (s: string, size: number): number => wide(s, size) * 1.25 + 10;

export const ticket = defineDrawing({
    id: "ticket",
    family: "travel",
    title: "Ticket",
    group: "Props",
    about: "A printed ticket with where it is from and to, the date, the time, the seat and the price, torn along a perforated edge. It holds several values at once, which is what a two step question needs.",
    params: { from: "Ash", to: "Bray", date: "12 May", time: "09:15", price: "£4.50", seat: "12A" },
    settings: {
        from: { kind: "text", most: 10 },
        to: { kind: "text", most: 10 },
        date: { kind: "text", most: 8 },
        time: { kind: "text", most: 5 },
        price: { kind: "text", most: 7 },
        seat: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "A single",
            params: {
                from: "Ash",
                to: "Bray",
                date: "12 May",
                time: "09:15",
                price: "\u00a34.50",
                seat: "12A",
            },
        },
        {
            label: "Later, dearer",
            params: {
                from: "Bray",
                to: "Cole",
                date: "12 May",
                time: "17:40",
                price: "\u00a37.20",
                seat: "3C",
            },
        },
    ],
    box: () => ({ w: 18, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x = U,
            w = 16 * U,
            top = U,
            h = 8 * U,
            px = 12.4 * U,
            stub = 14.7 * U;
        pen.path(g, roundedRect(x, top, w, h, 9), "ruler", pen.fill("card"), { strokeWidth: 2.4 });
        pen.rect(
            g,
            x + 6,
            top + 6,
            w - 12,
            1.4 * U - 7,
            "ruler",
            pen.fill("sky", "solid", { hachureGap: 9, fillWeight: 0.55 }),
            { strokeWidth: 0 },
        );
        patch(
            c,
            x + 0.7 * U + monoW("train ticket", 12) / 2 - 5,
            top + 0.86 * U,
            monoW("train ticket", 12),
            23,
        );
        cap(c, x + 0.7 * U, top + 0.95 * U, "train ticket", 12, "start", c.t.ink);
        patch(
            c,
            x + w - 0.7 * U - monoW("single", 12) / 2 + 5,
            top + 0.86 * U,
            monoW("single", 12),
            23,
        );
        cap(c, x + w - 0.7 * U, top + 0.95 * U, "single", 12, "end", c.t.ink);
        pen.line(g, x + 5, top + 1.4 * U, x + w - 5, top + 1.4 * U, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        // The perforation is a column of punched holes, which is what tells the stub from the ticket.
        for (let k = 0; k < 8; k++)
            pen.circle(g, px, (1.7 + k * 0.85) * U, 7, "ruler", null, {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        cap(c, 1.7 * U, 3.5 * U, "from", 11, "start");
        say(c, 1.7 * U, 5.05 * U, p.from, 20, "start");
        cap(c, 7.9 * U, 3.5 * U, "to", 11, "start");
        say(c, 7.9 * U, 5.05 * U, p.to, 20, "start");
        pen.arrow(g, [6.2 * U, 4.6 * U], [7.5 * U, 4.6 * U], c.t.ink, 0.02);
        cap(c, 1.7 * U, 6.6 * U, "date", 11, "start");
        say(c, 1.7 * U, 8.1 * U, p.date, 18, "start");
        cap(c, 7.9 * U, 6.6 * U, "time", 11, "start");
        num(c, 7.9 * U, 8.1 * U, p.time, 18, "start");
        cap(c, stub, 3.5 * U, "seat", 11);
        num(c, stub, 5.05 * U, p.seat, 20);
        pen.path(
            g,
            roundedRect(13 * U, 6.1 * U, 3.4 * U, 1.9 * U, 8),
            "ruler",
            pen.fill("glow", "solid", { hachureGap: 7, fillWeight: 0.7 }),
            { strokeWidth: 1.6 },
        );
        numOn(c, stub, 7.35 * U, p.price, 19);
        return {
            from: [1.7 * U, 5.4 * U, "down"],
            to: [7.9 * U, 5.4 * U, "down"],
            price: [stub, 6.1 * U, "up"],
            seat: [stub, 3.1 * U, "up"],
            ticket: [x + w / 2, top, "up"],
        };
    },
    describe: () =>
        "A printed train ticket with its origin and destination, the date, the time, the seat number and the price in a yellow box, torn along a row of punched holes.",
    motion: { still: STILL.text },
    reads: true,
});
