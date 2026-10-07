import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const bowlingPin = defineDrawing({
    id: "bowlingpin",
    family: "sport",
    title: "Numbered bowling pin",
    group: "Props",
    about: "A white wooden skittle with a red neck band, broad rounded foot and a clearly written number.",
    params: { n: 1, fallen: false },
    settings: { n: { kind: "whole", min: 1, max: 10 }, fallen: { kind: "flag" } },
    takes: [
        { label: "One standing", params: { n: 1, fallen: false } },
        { label: "Five down", params: { n: 5, fallen: true } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p): RawAnchors => {
        const turned = p.fallen ? group(c, { turn: [["rotate", 90, 1.5 * U, 1.5 * U]] }) : c;
        const inner = group(turned, { turn: [["translate", 0.5 * U, 0]] });
        const { pen, g } = inner;
        pen.path(
            g,
            `M ${0.55 * U} ${2.8 * U} C ${0.1 * U} ${2.3 * U}, ${0.4 * U} ${1.6 * U}, ${0.75 * U} ${1.15 * U} L ${0.75 * U} ${0.9 * U} C ${0.2 * U} ${0.2 * U}, ${1.8 * U} ${0.2 * U}, ${1.25 * U} ${0.9 * U} L ${1.25 * U} ${1.15 * U} C ${1.6 * U} ${1.6 * U}, ${1.9 * U} ${2.3 * U}, ${1.45 * U} ${2.8 * U} Z`,
            "pencil",
            pen.fill(p.fallen ? "paper" : "card"),
            { strokeWidth: 1.5 },
        );
        pen.rect(g, 0.7 * U, 1.02 * U, 0.6 * U, 0.22 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 0.6,
        });
        num(inner, U, 2.3 * U, Math.max(1, Math.min(10, Math.round(p.n))), 20);
        return { middle: [1.5 * U, 1.5 * U, "up"], foot: [1.5 * U, 2.8 * U, "down"] };
    },
    describe: (p) =>
        `A white wooden bowling pin ${p.fallen ? "lying down" : "standing upright"}, with a rounded head, red neck band and the number ${p.n} on its broad belly.`,
    motion: { still: "A pin stands still until struck, then the game carries its fall and spin." },
});
