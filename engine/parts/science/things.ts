import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";
import { thingIcon } from "./wiring";

export const things = defineDrawing({
    id: "things",
    family: "science",
    title: "Things to test",
    group: "Props",
    about: "Everyday things in a lettered row: a nail, a paper clip, foil, a coin, a plastic ruler, an eraser, a lolly stick and a marble to try in a circuit or against a magnet, and a candle, a torch, a lamp, the sun, the moon and a mirror to ask which give out their own light. What each is made of and what it does is one table, and the checker marks from the same table.",
    params: { things: ["nail", "coin", "ruler", "foil"], letters: 1 },
    settings: {
        things: {
            kind: "words",
            most: 8,
            of: [
                "nail",
                "clip",
                "foil",
                "coin",
                "ruler",
                "eraser",
                "stick",
                "marble",
                "candle",
                "torch",
                "lamp",
                "sun",
                "moon",
                "mirror",
            ],
        },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "To test with a circuit or a magnet",
            params: {
                things: ["nail", "clip", "foil", "coin", "ruler", "eraser", "stick", "marble"],
                letters: 1,
            },
        },
        {
            label: "Which give out light",
            params: { things: ["candle", "torch", "lamp", "sun", "moon", "mirror"], letters: 1 },
        },
    ],
    box: (p) => ({ w: Math.ceil(Math.max(1, Math.min(8, p.things.length)) * 3.6 + 1), h: 6 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            list = p.things.slice(0, 8);
        list.forEach((kind, i) => {
            const x = (0.5 + 1.8 + i * 3.6) * U,
                y = 2.4 * U;
            thingIcon(c, kind, x, y);
            if (p.letters > 0) {
                patch(c, x, 5.1 * U - 5, 24, 20);
                say(c, x, 5.3 * U, "ABCDEFGH"[i] ?? "?", 17);
            }
            a[`thing(${i})`] = [x, 0.6 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "Everyday things drawn small in a lettered row, each in its own place, to test in a circuit, hold up to a magnet or ask which give out light.",
    reads: true,
});
