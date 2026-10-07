import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { DRESSED, placePerson } from "../people/figure";

export const santaSleigh = defineDrawing<{ stride: number; wave: boolean }>({
    id: "santasleigh",
    family: "travel",
    title: "Santa and his sleigh",
    group: "Characters",
    about: "Santa in a curled red sleigh, with a sack of presents and a leaping reindeer on a golden harness.",
    params: { stride: 0, wave: false },
    settings: { stride: { kind: "whole", min: 0, max: 3 }, wave: { kind: "flag" } },
    takes: [
        { label: "Flying over the rooftops", params: { stride: 0, wave: false } },
        { label: "A Christmas wave", params: { stride: 2, wave: true } },
    ],
    box: () => ({ w: 12, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const edge = { strokeWidth: 1.4, roughness: 0.35 };
        const path = (d: string, fill: "berry" | "glow" | "card" | null = null) =>
            pen.path(g, d, "pencil", fill ? pen.fill(fill, "solid") : null, edge);
        const line = (x: number, y: number, a: number, b: number) =>
            pen.line(g, x * U, y * U, a * U, b * U, "pencil", edge);
        const circle = (x: number, y: number, r: number, fill: "berry" | "glow" | "card") =>
            pen.circle(g, x * U, y * U, r * U, "pencil", pen.fill(fill, "solid"), edge);
        path(`M${4.8 * U} ${3.6 * U}Q${6.9 * U} ${4.6 * U} ${8.8 * U} ${2.9 * U}`);
        path(`M${4.5 * U} ${3.5 * U}Q${6.9 * U} ${3.7 * U} ${8.7 * U} ${2.7 * U}`);
        pen.ellipse(g, 1.8 * U, 3.35 * U, 2.2 * U, 2.7 * U, "pencil", pen.fill("glow"), edge);
        line(1.4, 2.4, 2.3, 2.4);
        placePerson(
            c,
            {
                ...DRESSED,
                pose: p.wave ? "wave" : "hold",
                age: "older",
                tone: 2,
                hair: "bald",
                colour: "grey",
                top: "berry",
                wear: "trousers",
                bottom: "berry",
                glasses: true,
                hearing: "none",
                aid: "none",
                mood: "happy",
                dir: 1,
                holding: "",
            },
            3.65 * U,
            5.3 * U,
            { size: 0.54 },
        );
        path(
            `M${3.26 * U} ${2.06 * U}Q${3.65 * U} ${2.25 * U} ${4.04 * U} ${2.06 * U}Q${4 * U} ${2.8 * U} ${3.65 * U} ${2.95 * U}Q${3.28 * U} ${2.7 * U} ${3.26 * U} ${2.06 * U}Z`,
            "card",
        );
        path(
            `M${3.2 * U} ${1.65 * U}Q${3.4 * U} ${0.7 * U} ${3.98 * U} ${0.9 * U}L${4.55 * U} ${1.45 * U}Q${3.9 * U} ${1.2 * U} ${4.08 * U} ${1.68 * U}Z`,
            "berry",
        );
        line(3.2, 1.68, 4.08, 1.68);
        circle(4.55, 1.45, 0.32, "card");
        path(
            `M${0.6 * U} ${3.7 * U}Q${2.7 * U} ${4.3 * U} ${4.6 * U} ${3.6 * U}L${5.2 * U} ${2.9 * U}Q${6.2 * U} ${3.3 * U} ${5.4 * U} ${4.2 * U}L${4.7 * U} ${4.8 * U}H${1.2 * U}Z`,
            "berry",
        );
        path(`M${0.8 * U} ${5.3 * U}H${5.2 * U}Q${6.2 * U} ${5.2 * U} ${6.15 * U} ${4.6 * U}`);
        line(1.7, 4.6, 1.9, 5.3);
        line(4.4, 4.6, 4.2, 5.3);
        pen.ellipse(g, 8.8 * U, 3.1 * U, 2.7 * U, 1.5 * U, "pencil", pen.fill("glow"), edge);
        path(
            `M${9.45 * U} ${3 * U}L${9.6 * U} ${1.9 * U}Q${9.8 * U} ${1.55 * U} ${10.15 * U} ${1.65 * U}L${10.85 * U} ${2.1 * U}Q${11.05 * U} ${2.5 * U} ${10.4 * U} ${2.55 * U}L${10.05 * U} ${3.4 * U}Z`,
            "glow",
        );
        line(9.85, 1.75, 9.6, 0.65);
        line(9.65, 0.95, 9.05, 0.55);
        line(9.6, 1.25, 10.2, 0.75);
        line(9.8, 1.8, 9.2, 1.45);
        circle(10.75, 2.3, 0.3, "berry");
        line(10.12, 1.97, 10.18, 1.97);
        const stride = Math.sin((Math.round(p.stride) / 4) * Math.PI * 2) * 0.5;
        for (const [x, sign] of [
            [7.9, -1],
            [9.45, 1],
        ]) {
            if (x === undefined || sign === undefined) continue;
            line(x, 3.5, x + sign * (0.55 + stride), 4.15);
            line(x + sign * (0.55 + stride), 4.15, x + sign * 0.25, 4.7);
        }
        line(7.6, 2.85, 7.1, 2.4);
        line(9.65, 2.55, 9.95, 2.9);
        circle(9.65, 3, 0.3, "glow");
        return { middle: [6 * U, 3 * U, "up"], sack: [1.8 * U, 3.4 * U, "up"] };
    },
    describe: (p) =>
        `Santa ${p.wave ? "waves" : "holds the reins"} in a red sleigh with a sack of gifts, pulled by a reindeer with branching antlers.`,
    motion: { still: "The game moves the sleigh and steps the reindeer's legs while flying." },
});
