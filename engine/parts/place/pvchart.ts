import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";
import { PLACE_FILL, columns } from "./columns";

export const pvChart = defineDrawing({
    id: "pvchart",
    family: "place",
    title: "Place value chart",
    group: "Structures",
    about: "One named column per digit, four squares wide, with the point drawn as the heavy rule between ones and tenths. The body holds the digit, counters worth that much, or nothing at all to write in.",
    params: { value: "2405", show: "digits" },
    settings: {
        value: { kind: "text", most: 8 },
        show: { kind: "one of", of: ["digits", "counters", "none"] },
    },
    takes: [
        { label: "2405 in digits", params: { value: "2405", show: "digits" } },
        { label: "In counters", params: { value: "247", show: "counters" } },
        { label: "With tenths", params: { value: "32.7", show: "digits" } },
        { label: "Empty, to fill in", params: { value: "000", show: "blank" } },
    ],
    box: (p) => ({ w: columns(p.value).length * 4 + 1, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cols = columns(p.value),
            cw = 4 * U,
            x0 = U / 2,
            top = U,
            body = 2 * U,
            h = 4 * U;
        const a: RawAnchors = {};
        cols.forEach((col, i) => {
            const x = x0 + i * cw;
            cap(
                c,
                x + cw / 2,
                top + 10,
                col.head,
                12,
                "middle",
                col.part ? c.t["ink-soft"] : c.t.ink,
            );
            pen.rect(g, x, body, cw, h, "ruler", null, { strokeWidth: 1.4 });
            if (p.show === "digits") num(c, x + cw / 2, body + h / 2 + 12, col.digit, 34);
            else if (p.show === "counters") {
                // Counters fill from the bottom, three to a row, each row centred, so two of them are not
                // a lopsided pair. Nine is the most a column can hold before it has to be exchanged.
                const n = Number(col.digit) || 0;
                for (let k = 0; k < n; k++) {
                    const row = Math.floor(k / 3),
                        inRow = Math.min(3, n - row * 3);
                    const cx = x + cw / 2 + ((k % 3) - (inRow - 1) / 2) * 22,
                        cy = body + h - 18 - row * 22;
                    pen.circle(
                        g,
                        cx,
                        cy,
                        18,
                        "ruler",
                        pen.fill(PLACE_FILL[(cols.length - 1 - i) % PLACE_FILL.length], "solid", {
                            hachureGap: 4,
                        }),
                        { strokeWidth: 1.3 },
                    );
                }
            }
            a[`col(${col.head})`] = [x + cw / 2, top, "up"];
            a[`cell(${i})`] = [x + cw / 2, body + h, "down"];
        });
        pen.line(g, x0, body, x0 + cols.length * cw, body, "ruler", { strokeWidth: 2 });
        pen.rect(g, x0, body, cols.length * cw, h, "ruler", null, { strokeWidth: 2.4 });
        // The point is a column edge, not a dot after a digit: this is the one rule drawn heavy.
        const point = cols.findIndex((col) => col.part);
        if (point > 0) {
            const px = x0 + point * cw;
            pen.line(g, px, top, px, body + h + 6, "ruler", { strokeWidth: 3 });
            pen.circle(
                g,
                px,
                body + h + 14,
                8,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        }
        return a;
    },
    describe: (p) =>
        `A place value chart with a named column for each digit, ruled in ink${p.show === "counters" ? ", coloured counters stacked in each column" : p.show === "digits" ? ", a large digit written in each column" : ", the columns empty"}.`,
});
