import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const bottle = defineDrawing({
    id: "bottle",
    family: "home",
    title: "Message in a bottle",
    group: "Props",
    about: "A green glass bottle lying on the sea with its neck to the right, corked, a rolled letter tied with string inside it and the water lapping along its side. Something that has come a long way, for a story to start from or a letter to be written back.",
    params: { cork: 1, letter: 1 },
    settings: {
        cork: { kind: "whole", min: 0, max: 1 },
        letter: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Corked, with a letter", params: { cork: 1, letter: 1 } },
        { label: "Open and empty", params: { cork: 0, letter: 0 } },
    ],
    box: () => ({ w: 5, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            sea = 2.2 * U,
            a: RawAnchors = {};
        const body = `M${0.55 * U} ${1.55 * U}Q${0.5 * U} ${0.95 * U} ${1.1 * U} ${0.9 * U}L${2.9 * U} ${0.95 * U}Q${3.35 * U} ${0.98 * U} ${3.55 * U} ${1.2 * U}L${4.05 * U} ${1.28 * U}L${4.05 * U} ${1.72 * U}L${3.55 * U} ${1.78 * U}Q${3.35 * U} ${2.02 * U} ${2.9 * U} ${2.05 * U}L${1.1 * U} ${2.1 * U}Q${0.5 * U} ${2.05 * U} ${0.55 * U} ${1.55 * U}Z`;
        pen.path(g, body, "pencil", pen.fill("mint"), calm(c, 1.7));
        if (p.letter > 0) {
            pen.rect(
                g,
                1.25 * U,
                1.22 * U,
                1.5 * U,
                0.52 * U,
                "pencil",
                pen.fill("card"),
                calm(c, 1.1),
            );
            pen.line(g, 1.25 * U, 1.35 * U, 2.75 * U, 1.35 * U, "pencil", calm(c, 0.8));
            // the string round the roll
            pen.line(g, 1.95 * U, 1.18 * U, 2.05 * U, 1.8 * U, "pencil", calm(c, 1.1));
        }
        // the light along the top of the glass, which on paper is a line of ink like any other
        pen.line(g, 1.1 * U, 1.05 * U, 2.7 * U, 1.07 * U, "pencil", {
            ...calm(c, 1.1),
            stroke: c.paper ? c.t.ink : c.t.card,
        });
        if (p.cork > 0)
            pen.rect(
                g,
                4.05 * U,
                1.3 * U,
                0.42 * U,
                0.4 * U,
                "pencil",
                pen.fill("tang"),
                calm(c, 1.2),
            );
        for (let x = 0.1 * U; x < 4.9 * U; x += 0.7 * U)
            pen.curve(
                g,
                [
                    [x, sea],
                    [x + 0.18 * U, sea - 0.14 * U],
                    [x + 0.35 * U, sea],
                    [x + 0.52 * U, sea - 0.14 * U],
                    [x + 0.7 * U, sea],
                ],
                "pencil",
                calm(c, 1.3),
            );
        a.neck = [4.3 * U, 1.5 * U, "right"];
        a.sea = [2.5 * U, sea, "down"];
        return a;
    },
    describe: (p) =>
        `A green glass bottle lying on the sea${p.cork > 0 ? ", corked" : ", open"}${p.letter > 0 ? ", a rolled letter tied with string inside it" : " and empty"}, and the water lapping at its side.`,
    motion: {
        body: { is: "float", lift: 5, dx: 0, deg: 4, pivot: [0.5, 0.8], period: 6.8, units: true },
    },
});
