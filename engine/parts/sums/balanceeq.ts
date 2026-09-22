import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

export const balanceEquation = defineDrawing({
    id: "balanceeq",
    family: "sums",
    title: "Balanced equation",
    group: "Structures",
    about: "A beam with an expression written on each pan, level because the two sides are equal. Taking the same thing off both sides is a move a child can see here before they can write it.",
    params: { left: "3 + ?", right: "10" },
    settings: { left: { kind: "text", most: 8 }, right: { kind: "text", most: 8 } },
    takes: [
        { label: "Three and something make ten", params: { left: "3 + ?", right: "10" } },
        { label: "Both sides written", params: { left: "2 \u00d7 6", right: "12" } },
        { label: "An unknown on each side", params: { left: "n + 4", right: "2n" } },
    ],
    box: () => ({ w: 18, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 9 * U,
            beam = 2.6 * U,
            a: RawAnchors = {};
        pen.line(g, cx, beam, cx, 7.4 * U, "ruler", { strokeWidth: 4 });
        pen.rect(
            g,
            cx - 2 * U,
            7.4 * U,
            4 * U,
            0.5 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, cx - 6.4 * U, beam, cx + 6.4 * U, beam, "ruler", { strokeWidth: 3.2 });
        pen.circle(
            g,
            cx,
            beam,
            14,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        (
            [
                [cx - 4.4 * U, p.left, "left"],
                [cx + 4.4 * U, p.right, "right"],
            ] as const
        ).forEach(([x, text, name]) => {
            pen.line(g, x, beam, x - 1.4 * U, beam + 1.4 * U, "pencil", { strokeWidth: 1.3 });
            pen.line(g, x, beam, x + 1.4 * U, beam + 1.4 * U, "pencil", { strokeWidth: 1.3 });
            pen.path(
                g,
                roundedRect(x - 2.2 * U, beam + 1.4 * U, 4.4 * U, 2.2 * U, 8),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 2 },
            );
            const size = text.length > 5 ? 20 : 24;
            say(c, x, beam + 2.8 * U, text, size);
            a[name] = [x, beam + 1.4 * U, "up"];
        });
        num(c, cx, 9.4 * U, "=", 26);
        a.pivot = [cx, beam, "up"];
        return a;
    },
    describe: () =>
        "A balance with a level beam on a stand, a white card on each pan with an expression written on it and an equals sign under the stand.",
    motion: { still: "Which way it tips is the answer." },
});
