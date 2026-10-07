import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const shipwreck = defineDrawing<{ mast: boolean }>({
    id: "shipwreck",
    family: "travel",
    title: "Shipwreck",
    group: "Props",
    about: "An old wooden ship run aground on a beach and tipped on its side, seen a little from above: a broken hull with gaps in its planks, ribs showing through and a snapped mast lying across the sand.",
    params: { mast: true },
    settings: { mast: { kind: "flag" } },
    takes: [
        { label: "With its broken mast", params: { mast: true } },
        { label: "Just the hull", params: { mast: false } },
    ],
    box: () => ({ w: 9, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const hull = `M${0.4 * U} ${2.4 * U}Q${1.2 * U} ${4.6 * U} ${4.6 * U} ${4.5 * U}Q${7.6 * U} ${4.4 * U} ${8.6 * U} ${2.6 * U}L${7.4 * U} ${1.4 * U}Q${4.6 * U} ${2.4 * U} ${1.8 * U} ${1.2 * U}Z`;
        if (!c.paper) plain(c, { kind: "path", d: hull, fill: c.t.card });
        pen.path(g, hull, "pencil", pen.fill("tang", "hachure", { hachureGap: 5 }), {
            strokeWidth: 1.9,
        });
        // the planks along the hull, and the gap where it broke, with the ribs inside it
        for (const k of [0.35, 0.6, 0.82])
            pen.path(
                g,
                `M${(0.4 + k * 0.6) * U} ${(2.4 + k * 1.6) * U}Q${4.6 * U} ${(2.6 + k * 1.6) * U} ${(8.4 - k * 0.8) * U} ${(2.6 + k * 1.4) * U}`,
                "pencil",
                null,
                { strokeWidth: 1, roughness: 0.6 },
            );
        pen.path(
            g,
            `M${4 * U} ${2.1 * U}L${4.6 * U} ${3.3 * U}L${5.6 * U} ${2.9 * U}L${6 * U} ${2.1 * U}`,
            "pencil",
            pen.fill("ink", c.paper ? "hachure" : "solid", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        for (const x of [4.6, 5.1, 5.6])
            pen.line(g, x * U, 2.3 * U, (x - 0.1) * U, 3.2 * U, "pencil", {
                strokeWidth: 1.4,
                stroke: c.paper ? c.t.ink : c.t.tang,
            });
        if (p.mast) {
            pen.line(g, 3.2 * U, 2 * U, 6.8 * U, 0.4 * U, "pencil", { strokeWidth: 3.2 });
            pen.line(g, 5.4 * U, 1.05 * U, 5.9 * U, 1.9 * U, "pencil", { strokeWidth: 1.6 });
            pen.path(
                g,
                `M${6.3 * U} ${0.6 * U}Q${7.4 * U} ${0.9 * U} ${7.2 * U} ${1.7 * U}L${6.1 * U} ${1.2 * U}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.1 },
            );
        }
        a.bow = [8.6 * U, 2.6 * U, "right"];
        a.foot = [4.6 * U, 4.5 * U, "down"];
        return a;
    },
    describe: (p) =>
        `An old wooden ship run aground and tipped on its side, its hull broken open with ribs showing${p.mast ? ", and its snapped mast lying across the sand" : ""}.`,
    motion: { still: "A wreck lies where the sea left it." },
});
