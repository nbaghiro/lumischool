import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import {
    colourOf,
    mix,
    nameOf,
    paintFill,
    parseRecipe,
    recipeText,
    type Recipe,
} from "../../pigment";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { shine } from "./kit";

export const paintPots = defineDrawing({
    id: "paintpots",
    family: "art",
    title: "Paint pots to mix",
    group: "Structures",
    about: "Pots of paint with a plus between them and an equals before the pot they make. A pot can be a pan's colour or a mix; two pots of yellow and one of blue is two parts to one. The pot at the end is the mix worked out the way paint mixes, a question mark, or empty to paint in. A pot can itself be a question mark, and then `makes` gives the whole mix the pot at the end shows. Each pot carries its name on a label, so the question still reads on paper.",
    params: { pots: ["blue", "yellow"], result: "mix", labels: true, makes: "" },
    settings: {
        pots: { kind: "words", most: 5 },
        result: { kind: "one of", of: ["mix", "?", "empty"] },
        labels: { kind: "flag" },
        makes: { kind: "text", most: 24 },
    },
    takes: [
        {
            label: "Blue and yellow make",
            params: { pots: ["blue", "yellow"], result: "mix", labels: true, makes: "" },
        },
        {
            label: "Red and white make what",
            params: { pots: ["red", "white"], result: "?", labels: true, makes: "" },
        },
        {
            label: "Two yellows and a blue",
            params: { pots: ["yellow", "yellow", "blue"], result: "mix", labels: true, makes: "" },
        },
        {
            label: "Blue and what make green",
            params: { pots: ["blue", "?"], result: "mix", labels: true, makes: "blue+yellow" },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.pots.length) * 6 + 4, h: p.labels ? 7 : 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const jar = (x: number, hex: string | null, label: string, i: number) => {
            const top = 1 * U,
                bottom = 5.6 * U,
                l = x + 0.5 * U,
                r = x + 3.5 * U;
            const body = `M${l} ${top + 12}Q${l} ${bottom} ${l + 14} ${bottom}L${r - 14} ${bottom}Q${r} ${bottom} ${r} ${top + 12}`;
            if (hex)
                pen.path(
                    g,
                    `M${l + 3} ${top + 26}L${r - 3} ${top + 26}L${r - 3} ${bottom - 12}Q${r - 3} ${bottom - 3} ${r - 14} ${bottom - 3}L${l + 14} ${bottom - 3}Q${l + 3} ${bottom - 3} ${l + 3} ${bottom - 12}Z`,
                    "ruler",
                    paintFill(c, hex),
                    { strokeWidth: 0 },
                );
            pen.path(g, body, "pencil", null, { strokeWidth: 2.2 });
            pen.ellipse(
                g,
                x + 2 * U,
                top + 12,
                3 * U,
                0.9 * U,
                "pencil",
                hex ? paintFill(c, hex) : c.pen.fill("card"),
                { strokeWidth: 2 },
            );
            if (hex) shine(c, x + 1.3 * U, top + 3.2 * U, 0.7 * U);
            if (p.labels && label) {
                pen.rect(g, x + 0.8 * U, 3.3 * U, 2.4 * U, 1.3 * U, "ruler", c.pen.fill("card"), {
                    strokeWidth: 1.2,
                });
                say(c, x + 2 * U, 4.25 * U, label, label.length > 6 ? 10 : 12);
            }
            a[i < 0 ? "result" : `pot(${i})`] = [x + 2 * U, top, "up"];
        };
        const sign = (x: number, s: string) => num(c, x + 1 * U, 3.7 * U, s, 26, "middle", c.t.ink);
        p.pots.forEach((s, i) => {
            const x = i * 6 * U;
            const r = parseRecipe(s);
            if (s.trim() === "?") {
                jar(x, null, "", i);
                num(c, x + 2 * U, 4.3 * U, "?", 30, "middle", c.t.pen);
            } else jar(x, colourOf(s), r ? recipeText(r) : s, i);
            sign(x + 4 * U, i === p.pots.length - 1 ? "=" : "+");
        });
        const whole = parseRecipe(p.makes);
        if (whole) {
            jar(p.pots.length * 6 * U, mix(whole), p.labels ? nameOf(mix(whole)).name : "", -1);
            return a;
        }
        const x = p.pots.length * 6 * U,
            all: Recipe = [];
        for (const s of p.pots)
            for (const part of parseRecipe(s) ?? []) {
                const had = all.find((q) => q.pigment === part.pigment);
                if (had) had.parts += part.parts;
                else all.push({ ...part });
            }
        if (p.result === "mix" && all.length)
            jar(x, mix(all), p.labels ? nameOf(mix(all)).name : "", -1);
        else {
            jar(x, null, "", -1);
            if (p.result === "?") num(c, x + 2 * U, 4.3 * U, "?", 30, "middle", c.t.pen);
        }
        return a;
    },
    describe: (p) =>
        `${p.pots.length} pots of paint in a row, a plus sign between them and an equals sign before the pot at the end${p.labels ? ", each pot with a paper label" : ""}.`,
});
