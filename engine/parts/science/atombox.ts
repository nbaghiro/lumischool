import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { atomBall } from "./apparatus";
import { MOLECULES } from "./substances";

export const atombox = defineDrawing({
    id: "atombox",
    family: "science",
    title: "A box of molecules",
    group: "Structures",
    about: "A closed box of gas drawn as its molecules, far apart and each made of atoms touching: up to two kinds at once, so the box can be one pure substance or a mixture of two. `a` and `b` name the kinds and `na` and `nb` how many of each, which is what a question counts from: molecules, atoms, kinds of atom, and whether it is an element (one kind of atom), a compound (atoms of different kinds joined) or a mixture.",
    params: { a: "oxygen", na: 4, b: "none", nb: 0 },
    settings: {
        a: { kind: "one of", of: Object.keys(MOLECULES) },
        na: { kind: "whole", min: 0, max: 6 },
        b: { kind: "one of", of: ["none", ...Object.keys(MOLECULES)] },
        nb: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Pure oxygen", params: { a: "oxygen", na: 4, b: "none", nb: 0 } },
        { label: "Air: oxygen and nitrogen", params: { a: "nitrogen", na: 4, b: "oxygen", nb: 2 } },
        { label: "Steam", params: { a: "water", na: 5, b: "none", nb: 0 } },
    ],
    box: () => ({ w: 11, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const list = [
            ...Array.from({ length: Math.max(0, Math.min(6, Math.round(p.na))) }, () => p.a),
            ...(p.b !== "none"
                ? Array.from({ length: Math.max(0, Math.min(6, Math.round(p.nb))) }, () => p.b)
                : []),
        ];
        pen.rect(g, 0.6 * U, 0.8 * U, 9.8 * U, 8.6 * U, "ruler", null, { strokeWidth: 2.6 });
        pen.rect(
            g,
            0.3 * U,
            0.3 * U,
            10.4 * U,
            0.5 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
        const cols = list.length <= 4 ? 2 : 3,
            rows = Math.ceil(list.length / cols),
            r = rng(61 + list.length);
        list.forEach((kind, i) => {
            const col = i % cols,
                row = Math.floor(i / cols);
            const x = 0.6 * U + ((col + 0.5) / cols) * 9.8 * U + (r() - 0.5) * 0.8 * U,
                y = 0.8 * U + ((row + 0.5) / Math.max(1, rows)) * 8.6 * U + (r() - 0.5) * 0.6 * U;
            const m = MOLECULES[kind];
            if (!m) return;
            // atoms touching, with no sticks: the way a box of molecules is drawn once the model kit is put away
            const s = 0.62;
            m.atoms.forEach(([e, dx, dy]) =>
                atomBall(c, e, x + dx * U * s, y + dy * U * s, 0.7, false),
            );
        });
        a.box = [5.5 * U, 0.3 * U, "up"];
        return a;
    },
    describe: () =>
        "A closed box drawn as a frame with a lid, molecules scattered inside it, each drawn as its atoms touching with no sticks.",
    reads: true,
});
