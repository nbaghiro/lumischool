import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { drawProp } from "../props";
import { named } from "../stories/pictures";

export const children = defineDrawing({
    id: "children",
    family: "people",
    title: "Children",
    group: "Characters",
    about: 'A row of children, each one able to hold something. Everything shared out at this age is shared between people, and a person on the page is what stops "between four" being an abstraction.',
    params: { count: 3, holding: "", names: [] as string[], each: 0 },
    settings: {
        count: { kind: "whole", min: 1, max: 6 },
        holding: { kind: "text", most: 12 },
        names: { kind: "words", most: 6 },
        each: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Three children", params: { count: 3, holding: "", names: [], each: 0 } },
        {
            label: "Named",
            params: { count: 3, holding: "", names: ["Ann", "Ben", "Cat"], each: 0 },
        },
        { label: "Two apples each", params: { count: 4, holding: "apple", names: [], each: 2 } },
        { label: "One each", params: { count: 2, holding: "star", names: ["Sam", "Jo"], each: 1 } },
    ],
    box: (p) => ({ w: p.count * 4 + 1, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 8.4 * U,
            a: RawAnchors = {};
        const shirts: Marker[] = ["sky", "berry", "mint", "tang", "glow"];
        for (let i = 0; i < p.count; i++) {
            const cx = 2.5 * U + i * 4 * U,
                head = 3.2 * U,
                hip = 6.2 * U;
            pen.line(g, cx - 0.5 * U, hip, cx - 0.6 * U, base, "pencil", { strokeWidth: 2.4 });
            pen.line(g, cx + 0.5 * U, hip, cx + 0.6 * U, base, "pencil", { strokeWidth: 2.4 });
            for (const s of [-1, 1])
                pen.line(g, cx + s * 0.6 * U, base, cx + s * 0.95 * U, base, "pencil", {
                    strokeWidth: 2.4,
                });
            pen.path(
                g,
                `M${cx - 0.85 * U} ${hip}L${cx - 0.62 * U} ${head + 0.8 * U}H${cx + 0.62 * U}L${cx + 0.85 * U} ${hip}Z`,
                "pencil",
                pen.fill(shirts[i % shirts.length], "solid", { hachureGap: 7 }),
                { strokeWidth: 2 },
            );
            // The arm on the near side carries whatever the child is holding.
            pen.curve(
                g,
                [
                    [cx - 0.62 * U, head + 1.1 * U],
                    [cx - 1.15 * U, head + 1.8 * U],
                    [cx - 1.1 * U, head + 2.5 * U],
                ],
                "pencil",
                { strokeWidth: 2 },
            );
            pen.curve(
                g,
                [
                    [cx + 0.62 * U, head + 1.1 * U],
                    [cx + 1.15 * U, head + 1.8 * U],
                    [cx + 1.1 * U, head + 2.5 * U],
                ],
                "pencil",
                { strokeWidth: 2 },
            );
            pen.circle(g, cx, head, 1.7 * U, "pencil", pen.fill("card"), { strokeWidth: 2.2 });
            pen.path(
                g,
                `M${cx - 0.81 * U} ${head - 0.25 * U}A${0.85 * U} ${0.85 * U} 0 0 1 ${cx + 0.81 * U} ${head - 0.25 * U}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            for (const s of [-1, 1])
                pen.circle(
                    g,
                    cx + s * 0.3 * U,
                    head + 0.1 * U,
                    5,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.6 },
                );
            pen.arc(g, cx, head + 0.4 * U, 0.8 * U, 0.5 * U, 0.35, Math.PI - 0.35, "pencil", {
                strokeWidth: 1.4,
            });
            if (p.holding) {
                const n = Math.max(1, p.each || 1);
                for (let k = 0; k < n; k++)
                    drawProp(c, p.holding, cx + 1.1 * U, head + 2.5 * U - k * 0.85 * U, 28);
            }
            const name = p.names[i];
            if (name) say(c, cx, 9.6 * U, name, 15);
            a[`child(${i})`] = [cx, head - 1.7 * U, "up"];
            a[`hands(${i})`] = [cx + 1.1 * U, head + 2.5 * U, "right"];
        }
        pen.line(g, 0.4 * U, base, (p.count * 4 + 0.6) * U, base, "pencil", { strokeWidth: 2 });
        if (p.each && p.holding)
            num(c, ((p.count * 4 + 1) * U) / 2, 10.6 * U, `${p.each} each`, 16);
        return a;
    },
    describe: (p) =>
        `${p.count > 1 ? "Children standing in a row on a line, each" : "A child standing on a line"} with a round face, short hair and a coloured shirt${p.holding ? `, holding ${named(p.holding)} in one hand` : ""}${p.names.length ? ", with a name written under each" : ""}.`,
});
