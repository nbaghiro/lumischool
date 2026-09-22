import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, say } from "../lettering";

/** Someone standing on a block, drawn upwards from the block's top. */
function winner<G>(c: Ctx<G>, cx: number, base: number, s: number): void {
    const { pen, g } = c;
    const hip = base - 1.5 * s,
        shoulder = base - 3 * s,
        head = base - 3.75 * s;
    for (const d of [-1, 1]) {
        pen.line(g, cx + d * 0.18 * s, hip, cx + d * 0.3 * s, base, "pencil", { strokeWidth: 2.4 });
        pen.line(g, cx + d * 0.3 * s, base, cx + d * 0.58 * s, base, "pencil", {
            strokeWidth: 2.4,
        });
    }
    pen.path(
        g,
        `M${cx - 0.6 * s} ${hip}L${cx - 0.42 * s} ${shoulder}H${cx + 0.42 * s}L${cx + 0.6 * s} ${hip}Z`,
        "pencil",
        pen.fill("berry", "solid", { hachureGap: 7, fillWeight: 0.6 }),
        { strokeWidth: 1.8 },
    );
    for (const d of [-1, 1]) {
        pen.curve(
            g,
            [
                [cx + d * 0.42 * s, shoulder + 0.12 * s],
                [cx + d * 0.82 * s, shoulder + 0.6 * s],
                [cx + d * 0.72 * s, hip + 0.1 * s],
            ],
            "pencil",
            { strokeWidth: 1.8 },
        );
    }
    pen.circle(g, cx, head, 1.2 * s, "pencil", pen.fill("card"), { strokeWidth: 2 });
    pen.path(
        g,
        `M${cx - 0.57 * s} ${head - 0.17 * s}A${0.6 * s} ${0.6 * s} 0 0 1 ${cx + 0.57 * s} ${head - 0.17 * s}Z`,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
        { strokeWidth: 1.6 },
    );
    for (const d of [-1, 1])
        pen.circle(
            g,
            cx + d * 0.22 * s,
            head + 0.06 * s,
            4.5,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
    pen.arc(g, cx, head + 0.3 * s, 0.6 * s, 0.36 * s, 0.35, Math.PI - 0.35, "pencil", {
        strokeWidth: 1.4,
    });
}

export const podium = defineDrawing({
    id: "podium",
    family: "sport",
    title: "Winners' podium",
    group: "Structures",
    about: "Three blocks six, four and two squares high, with someone standing on the places that were won. The heights are ruled in units of two squares, so the three to two to one is there to be counted.",
    params: { filled: [true, true, false], names: ["Ann", "Ben", ""] },
    settings: { filled: { kind: "fixed" }, names: { kind: "words", most: 3 } },
    takes: [
        {
            label: "First and second",
            params: { filled: [true, true, false], names: ["Ann", "Ben", ""] },
        },
        {
            label: "All three",
            params: { filled: [true, true, true], names: ["Ann", "Ben", "Cat"] },
        },
        { label: "Empty", params: { filled: [false, false, false], names: ["", "", ""] } },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            ground = 12.4 * U;
        // Second on the left, first in the middle, third on the right, the way they are stood on.
        const blocks = [
            { place: 2, x: 1, h: 4 },
            { place: 1, x: 5, h: 6 },
            { place: 3, x: 9, h: 2 },
        ];
        for (const b of blocks) {
            const x = b.x * U,
                w = 4 * U,
                top = ground - b.h * U,
                i = b.place - 1;
            pen.rect(
                g,
                x,
                top,
                w,
                b.h * U,
                "ruler",
                pen.fill("sky", "solid", { hachureGap: 9, fillWeight: 0.6 }),
                { strokeWidth: 2.2 },
            );
            for (let k = 1; k < b.h / 2; k++)
                pen.line(g, x + 6, top + k * 2 * U, x + w - 6, top + k * 2 * U, "ruler", {
                    strokeWidth: 1,
                });
            numOn(c, x + w / 2, top + 1.3 * U, b.place, 26);
            if (p.filled[i]) winner(c, x + w / 2, top, U);
            if (p.names[i]) say(c, x + w / 2, ground + 0.95 * U, p.names[i], 15);
            a[`place(${b.place})`] = [x + w / 2, top, "up"];
        }
        pen.line(g, 0.5 * U, ground, 13.5 * U, ground, "pencil", { strokeWidth: 2.4 });
        return a;
    },
    describe: (p) => {
        const standing = p.filled.filter(Boolean).length;
        return `Three blue blocks of different heights side by side, the tallest in the middle, each with its place number on the front${standing > 0 ? `, ${standing === 1 ? "a person" : "people"} standing on ${standing === 3 ? "all three" : "some"}` : ", all of them empty"}.`;
    },
    reads: true,
});
