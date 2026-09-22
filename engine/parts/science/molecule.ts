import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft, wide } from "../lettering";
import { type Pt, ATOMS, atomBall } from "./apparatus";
import { MOLECULES, atomsIn } from "./substances";

/** One molecule, ball and stick, centred at (x, y). */
function ballAndStick<G>(
    c: Ctx<G>,
    kind: string,
    x: number,
    y: number,
    scale: number,
    letters: boolean,
): void {
    const m = MOLECULES[kind];
    if (!m) return;
    const at = (i: number): Pt => [
        x + (m.atoms[i]?.[1] ?? 0) * U * scale,
        y + (m.atoms[i]?.[2] ?? 0) * U * scale,
    ];
    for (const [i, j, n] of m.bonds) {
        const [x0, y0] = at(i),
            [x1, y1] = at(j),
            L = Math.hypot(x1 - x0, y1 - y0) || 1,
            nx = -(y1 - y0) / L,
            ny = (x1 - x0) / L;
        for (let k = 0; k < n; k++) {
            const o = (k - (n - 1) / 2) * 5;
            c.pen.line(c.g, x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o, "ruler", {
                strokeWidth: 2.4,
                stroke: c.t["ink-soft"],
            });
        }
    }
    m.atoms.forEach(([el0], i) => {
        const [ax, ay] = at(i);
        atomBall(c, el0, ax, ay, scale, letters);
    });
}

export const molecule = defineDrawing({
    id: "molecule",
    family: "science",
    title: "Molecules, ball and stick",
    group: "Structures",
    about: "Molecules as a model kit builds them, for a grade four stretch: each atom a ball with its letter, each bond a stick. Water is one oxygen and two hydrogens, bent; carbon dioxide is a carbon between two oxygens; oxygen and nitrogen in the air are two atoms of the same element joined; methane is a carbon with four hydrogens. Real atoms have no colour and are far too small to see, and the key says the colours are only to tell them apart. `count` draws that many molecules, so atoms can be counted.",
    params: { kind: "water", count: 1, key: 1, letters: 1 },
    settings: {
        kind: { kind: "one of", of: Object.keys(MOLECULES) },
        count: { kind: "whole", min: 1, max: 4 },
        key: { kind: "whole", min: 0, max: 1 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Water", params: { kind: "water", count: 1, key: 1, letters: 1 } },
        { label: "Three waters", params: { kind: "water", count: 3, key: 1, letters: 1 } },
        {
            label: "Carbon dioxide",
            params: { kind: "carbon-dioxide", count: 2, key: 1, letters: 1 },
        },
        { label: "Oxygen", params: { kind: "oxygen", count: 2, key: 1, letters: 1 } },
        { label: "Methane", params: { kind: "methane", count: 1, key: 1, letters: 1 } },
    ],
    box: (p) => ({
        w: Math.max(
            12,
            Math.max(1, Math.min(4, Math.round(p.count))) *
                (p.kind === "carbon-dioxide" || p.kind === "methane" ? 6 : 5) +
                1,
        ),
        h: p.key > 0 ? 8 : 6,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            n = Math.max(1, Math.min(4, Math.round(p.count))),
            cell = (p.kind === "carbon-dioxide" || p.kind === "methane" ? 6 : 5) * U;
        const w = Math.max(12 * U, n * cell + U),
            x0 = (w - n * cell) / 2;
        for (let i = 0; i < n; i++) {
            ballAndStick(c, p.kind, x0 + (i + 0.5) * cell, 2.9 * U, 1.2, p.letters > 0);
            a[`molecule(${i})`] = [x0 + (i + 0.5) * cell, 0.6 * U, "up"];
        }
        if (p.key > 0) {
            // the key, laid out by how long each name is, and saying what the colours are for
            const els = Object.keys(atomsIn(p.kind)),
                widths = els.map(
                    (e) => 1.2 * U + wide(`${e} ${ATOMS[e]?.name ?? ""}`, 12) + 0.8 * U,
                );
            let kx = (w - widths.reduce((s0, v) => s0 + v, 0)) / 2;
            els.forEach((e, i) => {
                atomBall(c, e, kx + 0.45 * U, 6.1 * U, 0.8, false);
                say(c, kx + 1.1 * U, 6.1 * U + 5, `${e} ${ATOMS[e]?.name ?? ""}`, 12, "start");
                kx += widths[i] ?? 0;
            });
            soft(c, w / 2, 7.4 * U, "colours only tell the atoms apart", 11);
        }
        return a;
    },
    describe: (p) =>
        `A molecule as a ball and stick model, each atom a ball${p.letters > 0 ? " with its letter" : ""} and each bond a stick between two balls${p.count > 1 ? ", drawn several times" : ""}${p.key > 0 ? ", a key underneath" : ""}.`,
    reads: true,
});
