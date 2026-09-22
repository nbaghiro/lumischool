import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

/** The tick inside a step marker: small, and the same shape as the one on a sticker. */
function bigTickMark<G>(c: Ctx<G>, x: number, y: number): void {
    c.pen.linear(
        c.g,
        [
            [x - 9, y],
            [x - 2, y + 8],
            [x + 10, y - 9],
        ],
        "pencil",
        { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.ok },
    );
}

export const stepDots = defineDrawing({
    id: "steps",
    family: "page",
    title: "Steps along the page",
    group: "Marks",
    about: 'Numbered markers for the parts of a lesson, with the one you are on filled in. It answers "how much of this is left", which is the question a child asks before any of the maths ones.',
    params: { steps: 4, done: 2, labels: [] as string[] },
    settings: {
        steps: { kind: "whole", min: 1, max: 15 },
        done: { kind: "whole", min: 0, max: 15 },
        labels: { kind: "fixed" },
    },
    takes: [
        { label: "Four steps, on the third", params: { steps: 4, done: 2, labels: [] } },
        {
            label: "Named",
            params: { steps: 3, done: 0, labels: ["Warm up", "Practice", "Challenge"] },
        },
        { label: "Nearly done", params: { steps: 5, done: 4, labels: [] } },
    ],
    box: (p) => ({ w: p.steps * 4 + 1, h: p.labels.length ? 6 : 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cy = 2 * U,
            a: RawAnchors = {};
        pen.line(g, 2.5 * U, cy, (p.steps * 4 - 1.5) * U, cy, "pencil", {
            strokeWidth: 2,
            stroke: c.t["ink-soft"],
        });
        for (let i = 0; i < p.steps; i++) {
            const cx = (i * 4 + 2.5) * U,
                done = i < p.done,
                here = i === p.done;
            pen.circle(
                g,
                cx,
                cy,
                here ? 1.9 * U : 1.5 * U,
                "pencil",
                pen.fill(here ? "glow" : done ? "mint" : "card"),
                { strokeWidth: here ? 2.6 : 1.8 },
            );
            if (done) bigTickMark(c, cx, cy);
            else num(c, cx, cy + 7, i + 1, here ? 20 : 17);
            const label = p.labels[i];
            if (label) soft(c, cx, 4.6 * U, label, 13);
            a[`step(${i + 1})`] = [cx, cy - 1.9 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A row of round markers joined by a line and numbered, with a tick on each one done and the one reached drawn larger${p.labels.length ? ", with a name under each" : ""}.`,
});
