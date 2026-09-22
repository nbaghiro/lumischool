import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, slot, soft, wide } from "../lettering";

export const letterValue = defineDrawing({
    id: "letter",
    family: "sums",
    title: "A letter for a number",
    group: "Structures",
    about: "A letter on a card with its value written under it, next to an expression that uses it. Substitution is a swap, and the drawing says so by putting the card and the expression side by side.",
    params: {
        letters: [{ name: "a", value: "4" }] as { name: string; value: string }[],
        expression: "3a + 1",
        answer: "",
    },
    settings: {
        letters: { kind: "fixed" },
        expression: { kind: "text", most: 10 },
        answer: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "a is four",
            params: { letters: [{ name: "a", value: "4" }], expression: "3a + 1", answer: "" },
        },
        {
            label: "Answered",
            params: { letters: [{ name: "a", value: "4" }], expression: "3a + 1", answer: "13" },
        },
        {
            label: "Two letters",
            params: {
                letters: [
                    { name: "a", value: "5" },
                    { name: "b", value: "2" },
                ],
                expression: "a \u00d7 b",
                answer: "",
            },
        },
    ],
    box: (p) => ({ w: p.letters.length * 4 + Math.ceil(wide(p.expression, 26) / U) + 9, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.letters.forEach((L, i) => {
            const x = (0.5 + i * 4) * U;
            pen.path(g, roundedRect(x, U, 3 * U, 3.4 * U, 8), "ruler", pen.fill("card"), {
                strokeWidth: 2,
            });
            num(c, x + 1.5 * U, 3.2 * U, L.name, 34);
            say(c, x + 1.5 * U, 5.4 * U, `= ${L.value}`, 18);
            a[`letter(${L.name})`] = [x + 1.5 * U, U, "up"];
        });
        const ex = (p.letters.length * 4 + 1) * U;
        num(c, ex, 3.4 * U, p.expression, 26, "start");
        const eq = ex + wide(p.expression, 26) + 0.6 * U;
        num(c, eq, 3.4 * U, "=", 24, "start");
        slot(c, eq + 1.4 * U, 2 * U, 3 * U, 2.2 * U, p.answer || undefined);
        soft(c, ex, 6 * U, "work it out", 14, "start");
        a.expression = [ex, 3.4 * U, "left"];
        a.answer = [eq + 2.9 * U, 2 * U, "up"];
        return a;
    },
    describe: () =>
        "A letter on a white card with its value written under it, beside an expression written large with an equals sign and an empty box after it.",
});
