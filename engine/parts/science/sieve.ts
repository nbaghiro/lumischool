import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { pieces, heap, countFor } from "./apparatus";
import { MIXABLES, passes } from "./substances";

export const sieve = defineDrawing({
    id: "sieve",
    family: "science",
    title: "Sieve over a bowl",
    group: "Structures",
    about: "A kitchen sieve over a bowl with a dry mixture in it. Shaken, what is smaller than the holes falls through into the bowl and what is bigger stays in the sieve, so pebbles stay and sand goes through, and a fine sieve keeps sand and lets flour through. `holes` is the size of the holes (1 fine, 2 a kitchen sieve, 3 a garden riddle), and the checker sorts the mixture by the same rule. With `shaken` at 0 it is the mixture before, for a prediction.",
    params: { mixture: ["pebbles", "sand"], holes: 2, shaken: 1, names: 1, holesname: 0 },
    settings: {
        mixture: { kind: "words", most: 3 },
        holes: { kind: "whole", min: 1, max: 3 },
        shaken: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
        holesname: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Pebbles stay, sand goes through",
            params: { mixture: ["pebbles", "sand"], holes: 2, shaken: 1, names: 1, holesname: 0 },
        },
        {
            label: "A fine sieve keeps the sand",
            params: { mixture: ["sand", "flour"], holes: 1, shaken: 1, names: 1, holesname: 1 },
        },
        {
            label: "Before shaking",
            params: { mixture: ["peas", "rice"], holes: 3, shaken: 0, names: 1, holesname: 1 },
        },
    ],
    box: (p) => ({ w: 13, h: p.names > 0 ? 12 : 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            holes = Math.max(1, Math.min(3, Math.round(p.holes)));
        const things = p.mixture.filter((k) => MIXABLES[k] && !MIXABLES[k].liquid).slice(0, 3);
        const cx = 5.6 * U,
            rimY = 3.2 * U,
            sw = 7.6 * U,
            sh = 2.9 * U,
            bowlTop = 7.2 * U,
            bowlBase = 10.4 * U;
        // the bowl
        pen.path(
            g,
            `M${cx - 4.3 * U} ${bowlTop}Q${cx - 4 * U} ${bowlBase} ${cx} ${bowlBase}Q${cx + 4 * U} ${bowlBase} ${cx + 4.3 * U} ${bowlTop}`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 7 }),
            { strokeWidth: 2.2 },
        );
        pen.ellipse(g, cx, bowlTop, 8.6 * U, 1.1 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        const fell = p.shaken > 0 ? things.filter((k) => passes(k, holes)) : [];
        const kept = things.filter((k) => !fell.includes(k));
        fell.forEach((k, i) =>
            (MIXABLES[k]?.size ?? 9) <= 1
                ? heap(
                      c,
                      k,
                      cx + (i - (fell.length - 1) / 2) * 2.4 * U,
                      bowlTop + 0.35 * U,
                      3.6 * U,
                      1 * U,
                      200 + i,
                  )
                : pieces(
                      c,
                      k,
                      cx - 2.8 * U + i * 0.4 * U,
                      bowlTop - 0.1 * U,
                      5.6 * U - i * 0.8 * U,
                      0.5 * U,
                      countFor(k),
                      200 + i,
                  ),
        );
        // the sieve: a bowl of mesh with its rim and handle
        const mesh = `M${cx - sw / 2} ${rimY}Q${cx - sw / 2 + 4} ${rimY + sh} ${cx} ${rimY + sh}Q${cx + sw / 2 - 4} ${rimY + sh} ${cx + sw / 2} ${rimY}Z`;
        const gap = [0, 3.2, 5, 7.5][holes] ?? 5;
        pen.path(
            g,
            mesh,
            "pencil",
            c.paper
                ? { fill: t.ink, fillStyle: "cross-hatch", hachureGap: gap + 1, fillWeight: 0.5 }
                : {
                      fill: t["ink-soft"],
                      fillStyle: "cross-hatch",
                      hachureGap: gap,
                      fillWeight: 0.6,
                  },
            { strokeWidth: 2 },
        );
        kept.forEach((k, i) =>
            (MIXABLES[k]?.size ?? 9) <= 1
                ? heap(
                      c,
                      k,
                      cx + (i - (kept.length - 1) / 2) * 2.2 * U,
                      rimY + 1.9 * U,
                      3.4 * U,
                      1.1 * U,
                      100 + i,
                  )
                : pieces(
                      c,
                      k,
                      cx - 2.6 * U,
                      rimY + 0.1 * U + i * 0.25 * U,
                      5.2 * U,
                      1.1 * U,
                      countFor(k),
                      100 + i,
                  ),
        );
        pen.ellipse(g, cx, rimY, sw, 1.1 * U, "pencil", null, { strokeWidth: 2.4 });
        pen.path(
            g,
            roundedRect(cx + sw / 2 - 2, rimY - 0.2 * U, 3.3 * U, 0.42 * U, 0.2 * U),
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.7 },
        );
        if (p.shaken > 0 && fell.length)
            for (let k = 0; k < 4; k++)
                pieces(
                    c,
                    fell[k % fell.length] ?? "",
                    cx - 1.2 * U + k * 0.8 * U,
                    rimY + sh + 0.4 * U,
                    0.3 * U,
                    2 * U,
                    1,
                    300 + k,
                );
        if (p.names > 0)
            soft(
                c,
                cx,
                11.4 * U,
                things.map((k) => MIXABLES[k]?.name ?? k).join(" and ") +
                    (p.holesname > 0
                        ? `, ${["", "fine holes", "small holes", "big holes"][holes]}`
                        : ""),
                13,
            );
        a.sieve = [cx, rimY - 0.6 * U, "up"];
        a.bowl = [cx + 4.3 * U, bowlTop + 1.5 * U, "right"];
        return a;
    },
    describe: (p) =>
        `A kitchen sieve held over a bowl${p.shaken > 0 ? ", a dry mixture shaken through it, some fallen into the bowl and the rest left in the sieve" : ", a dry mixture lying in it before it is shaken"}${p.names > 0 ? ", named underneath" : ""}.`,
    reads: true,
});
