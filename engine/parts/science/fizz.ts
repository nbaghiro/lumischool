import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, say } from "../lettering";
import { type Pt, LIQUID, glassPath, liquid, gleam, bubble } from "./apparatus";

export const fizz = defineDrawing({
    id: "fizz",
    family: "science",
    title: "Baking soda and vinegar",
    group: "Structures",
    about: "The kitchen's favourite reaction, drawn as the joyful thing it is: a jar of vinegar on a tray and a spoon of baking soda, then the fizz as the powder goes in, then foam climbing up and over the rim with bubbles popping at the top, then the jar gone quiet. The bubbles are a gas that was not there before, carbon dioxide, which is why it cannot be undone. `spoons` is how much baking soda went in, and the foam climbs higher with more of it, so jars side by side can be compared.",
    params: { stage: 2, spoons: 2, tag: "" },
    settings: {
        stage: { kind: "whole", min: 0, max: 3 },
        spoons: { kind: "whole", min: 1, max: 3 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "Before", params: { stage: 0, spoons: 2, tag: "" } },
        { label: "Fizzing", params: { stage: 1, spoons: 2, tag: "" } },
        { label: "Foam over the top", params: { stage: 2, spoons: 3, tag: "" } },
        { label: "One spoon, less foam", params: { stage: 2, spoons: 1, tag: "A" } },
        { label: "All done", params: { stage: 3, spoons: 2, tag: "" } },
    ],
    box: () => ({ w: 9, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            stage = Math.max(0, Math.min(3, Math.round(p.stage))),
            spoons = Math.max(1, Math.min(3, Math.round(p.spoons)));
        const lx = 2 * U,
            rx = 6.6 * U,
            top = 5.2 * U,
            base = 10.6 * U,
            level = top + 2.3 * U,
            cx = (lx + rx) / 2;
        pen.path(
            g,
            `M${0.4 * U} ${base + 0.2 * U}H${8.6 * U}L${8.2 * U} ${base + 0.8 * U}H${0.8 * U}Z`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 6 }),
            { strokeWidth: 1.8 },
        );
        if (stage === 3)
            pen.ellipse(
                g,
                cx + 2.2 * U,
                base + 0.15 * U,
                2 * U,
                0.35 * U,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1 },
            );
        liquid(
            c,
            lx,
            rx,
            level,
            base,
            pen.fill(LIQUID, "hachure", { hachureGap: 7, fillWeight: 0.7 }),
            12,
        );
        const r = rng(23 + spoons);
        if (stage === 1 || stage === 2)
            for (let k = 0; k < 10; k++)
                bubble(
                    c,
                    lx + 0.5 * U + r() * (rx - lx - 1 * U),
                    level + 0.4 * U + r() * (base - level - 0.8 * U),
                    5 + r() * 6,
                );
        if (stage === 3)
            for (let k = 0; k < 3; k++)
                bubble(c, lx + 0.8 * U + k * 1.4 * U, level + 0.5 * U + k * 0.4 * U, 5);
        if (stage >= 1) {
            // what is left of the powder, settled on the bottom
            pen.path(
                g,
                `M${lx + 0.6 * U} ${base - 3}Q${cx} ${base - 0.5 * U} ${rx - 0.6 * U} ${base - 3}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
        }
        if (stage === 2) {
            // foam up and over the rim, higher for more baking soda, with bubbles popping at the top
            const crown = top - (0.6 + spoons * 0.9) * U;
            const foam =
                `M${lx - 0.2 * U} ${top + 1.6 * U}Q${lx - 0.5 * U} ${top + 0.3 * U} ${lx - 0.1 * U} ${top - 0.3 * U}Q${lx - 0.4 * U} ${crown + 0.8 * U} ${lx + 0.9 * U} ${crown + 0.3 * U}` +
                `Q${cx - 0.3 * U} ${crown - 0.4 * U} ${cx + 0.6 * U} ${crown + 0.2 * U}Q${rx + 0.2 * U} ${crown + 0.1 * U} ${rx + 0.2 * U} ${top - 0.2 * U}Q${rx + 0.7 * U} ${top + 0.4 * U} ${rx + 0.3 * U} ${top + 1.9 * U}` +
                `Q${rx + 0.1 * U} ${level + 0.2 * U} ${rx - 0.2 * U} ${level}H${lx + 0.2 * U}Q${lx - 0.1 * U} ${level + 0.2 * U} ${lx - 0.2 * U} ${top + 1.6 * U}Z`;
            pen.path(g, foam, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            for (let k = 0; k < 12 + spoons * 4; k++)
                bubble(
                    c,
                    lx + r() * (rx - lx),
                    crown + 0.5 * U + r() * (level - crown - 0.8 * U),
                    4 + r() * 7,
                );
            for (const [dx, dy] of [
                [-0.8, -0.6],
                [1.3, -0.3],
                [0.2, -1.1],
            ] as Pt[]) {
                const px = cx + dx * U,
                    py = crown + dy * U;
                for (let k = 0; k < 5; k++) {
                    const th = (k / 5) * Math.PI * 2;
                    pen.line(
                        g,
                        px + Math.cos(th) * 4,
                        py + Math.sin(th) * 4,
                        px + Math.cos(th) * 10,
                        py + Math.sin(th) * 10,
                        "pencil",
                        { strokeWidth: 1.4, stroke: t.pen },
                    );
                }
            }
            say(c, cx + 2.6 * U, crown - 0.3 * U, "pop", 13, "start", t.pen);
        }
        pen.path(g, glassPath(lx, rx, top, base, 12), "pencil", null, { strokeWidth: 2.4 });
        pen.line(g, lx - 4, top, rx + 4, top, "pencil", { strokeWidth: 1.6 });
        gleam(c, lx + 0.35 * U, level + 0.4 * U, base - 0.5 * U);
        if (stage === 0) {
            // the spoon of baking soda held over the jar
            pen.path(g, `M${cx + 0.4 * U} ${2.6 * U}L${8.4 * U} ${0.9 * U}`, "pencil", null, {
                strokeWidth: 3.2,
                stroke: t["ink-soft"],
            });
            pen.ellipse(
                g,
                cx - 0.1 * U,
                2.75 * U,
                1.9 * U,
                0.95 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            pen.path(
                g,
                `M${cx - 0.9 * U} ${2.7 * U}Q${cx - 0.1 * U} ${1.7 * U} ${cx + 0.7 * U} ${2.7 * U}Z`,
                "pencil",
                pen.fill("card", "dots"),
                { strokeWidth: 1.2 },
            );
        }
        if (p.tag) {
            patch(c, 1 * U, 1.3 * U, 30, 24);
            num(c, 1 * U, 1.8 * U, p.tag, 22);
        }
        a.jar = [cx, top - 2.8 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A jar of vinegar on a tray${p.stage === 0 ? " with a spoon of baking soda held over it" : p.stage === 1 ? ", baking soda just tipped in and bubbles rising all through it" : p.stage === 2 ? ", white foam climbing up and over its rim with bubbles popping at the top" : ", gone quiet again, a few bubbles left and a puddle on the tray"}${p.tag ? ", a letter in the corner" : ""}.`,
    reads: true,
});
