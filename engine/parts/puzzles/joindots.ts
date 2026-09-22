import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { BOX, SHAPE_IDS, layout, type Dot } from "./dots";

/**
 * Join the dots, laid out by the same function a round in a world's sky uses (dots.ts, which the
 * scratchpad's game reads too), so the shelf's drawing and the game's dots are one set of dots.
 * `joined` draws the line that far round.
 */
export const joinDots = defineDrawing({
    id: "joindots",
    family: "puzzles",
    title: "Join the dots",
    group: "Structures",
    about: "Numbered dots that make a picture when they are joined in order: counting on in ones, in a times table, back past zero or in tenths, with a few dots beside them whose numbers are not in the count. Joined all the way round, the picture is closed and lightly coloured in.",
    params: { shape: "kite", start: 1, step: 1, places: 0, decoys: 0, joined: 0, seed: 1 },
    settings: {
        shape: { kind: "one of", of: SHAPE_IDS },
        start: { kind: "number", min: -100, max: 1000, step: 0.1 },
        step: { kind: "number", min: -100, max: 100, step: 0.1 },
        places: { kind: "whole", min: 0, max: 2 },
        decoys: { kind: "whole", min: 0, max: 8 },
        joined: { kind: "whole", min: 0, max: 12 },
        seed: { kind: "whole", min: 1, max: 9999 },
    },
    takes: [
        {
            label: "A kite, counting on in ones",
            params: { shape: "kite", start: 1, step: 1, places: 0, decoys: 0, joined: 0, seed: 1 },
        },
        {
            label: "A boat in twos, half joined",
            params: { shape: "boat", start: 2, step: 2, places: 0, decoys: 3, joined: 4, seed: 3 },
        },
        {
            label: "A rocket in fives, with dots not in the count",
            params: {
                shape: "rocket",
                start: 5,
                step: 5,
                places: 0,
                decoys: 4,
                joined: 0,
                seed: 7,
            },
        },
        {
            label: "A whale counting back past zero, closed",
            params: {
                shape: "whale",
                start: 12,
                step: -2,
                places: 0,
                decoys: 4,
                joined: 11,
                seed: 5,
            },
        },
        {
            label: "A balloon in steps of two tenths",
            params: {
                shape: "balloon",
                start: 0.2,
                step: 0.2,
                places: 1,
                decoys: 3,
                joined: 6,
                seed: 9,
            },
        },
    ],
    box: () => ({ w: BOX.w, h: BOX.h }),
    draw: (c, p) => {
        const { pen, g, t } = c,
            a: RawAnchors = {};
        const shape = SHAPE_IDS.find((s) => s === p.shape) ?? "kite";
        const places = Math.max(0, Math.min(2, Math.round(Number(p.places) || 0)));
        const r = layout({
            shape,
            count: { start: Number(p.start) || 0, step: Number(p.step) || 1, places },
            decoys: Math.max(0, Math.round(Number(p.decoys) || 0)),
            seed: Math.round(Number(p.seed) || 1),
        });
        const n = r.dots.length,
            joined = Math.max(0, Math.min(n, Math.round(Number(p.joined) || 0)));
        const at = (d: Dot): [number, number] => [d.x * U, d.y * U];
        if (joined >= n)
            pen.polygon(
                g,
                r.dots.map(at),
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 7, fillWeight: 0.8 }),
                { stroke: "none" },
            );
        for (let k = 0; k < joined; k++) {
            const d0 = r.dots[k],
                d1 = r.dots[(k + 1) % n];
            if (d0 && d1)
                pen.line(g, ...at(d0), ...at(d1), "pencil", { stroke: t.ink, strokeWidth: 1.8 });
        }
        const put = (d: Dot, name: string) => {
            pen.circle(
                g,
                d.x * U,
                d.y * U,
                6.5,
                "ruler",
                { fill: t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            num(c, d.lx * U, d.ly * U + 4.5, d.label, 13);
            a[name] = [d.x * U, d.y * U, "up"];
        };
        r.dots.forEach((d, k) => put(d, `dot(${k})`));
        r.decoys.forEach((d, k) => put(d, `decoy(${k})`));
        return a;
    },
    describe: (p) => {
        const n = layout({
            shape: SHAPE_IDS.find((s) => s === p.shape) ?? "kite",
            count: {
                start: Number(p.start) || 0,
                step: Number(p.step) || 1,
                places: Math.max(0, Math.min(2, Math.round(Number(p.places) || 0))),
            },
            decoys: Math.max(0, Math.round(Number(p.decoys) || 0)),
            seed: Math.round(Number(p.seed) || 1),
        });
        const joined = Math.max(0, Math.min(n.dots.length, Math.round(Number(p.joined) || 0)));
        return `Numbered black dots laid out in the outline of a picture, each number written beside its dot${n.decoys.length > 0 ? ", with extra dots among them" : ""}${joined >= n.dots.length ? ", a pencil line right round them, shaded in" : joined > 0 ? ", a pencil line joining some in order" : ", no line joining them yet"}.`;
    },
    motion: {
        still: "A child joins its dots with a pencil and reads their numbers, so it holds still.",
    },
});
