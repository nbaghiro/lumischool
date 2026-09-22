import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { rounded, drawDie, drawTile } from "./dice";

/** The box's layout, in user units, for a box of `count` numbers: one number every 50 units along the rack. */
const BOX = { slot: 50, hinge: 76, tray: { top: 96, bottom: 244, side: 30 }, h: 13 } as const;

const boxWide = (count: number): number => Math.ceil((count * BOX.slot) / U) + 2;

/** Where the dice lie in the tray after a throw, spread out and each turned its own way, from the throw's number. */
function lying(
    count: number,
    dice: number,
    thrown: number,
): { x: number; y: number; turn: number }[] {
    const w = boxWide(count) * U,
        left = BOX.tray.side + 30,
        right = w - BOX.tray.side - 30;
    const gap = (right - left) / Math.max(1, dice);
    return Array.from({ length: dice }, (_, i) => {
        const r = (k: number): number =>
            (((Math.sin((thrown + 1) * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453) % 1) + 1) %
            1;
        return {
            x: left + gap * (i + 0.2 + r(1) * 0.6),
            y: BOX.tray.top + 34 + r(2) * (BOX.tray.bottom - BOX.tray.top - 68),
            turn: (r(3) - 0.5) * 50,
        };
    });
}

export const shutBox = defineDrawing({
    id: "shutbox",
    family: "sport",
    title: "Shut the box",
    group: "Props",
    about: "The game board for shut-the-box: a wooden box with a row of hinged numbers along the back and a felt tray in front for the dice. A number that is shut lies face down, and the same number is printed small on the rack behind it, so what is shut can still be read. Dice lie in the tray, or on the number they were put on. Drawn bare, it is the frame, the rack and the felt, for a game that places its numbers and dice as pieces of their own.",
    params: {
        count: 9,
        shut: [] as number[],
        dice: [] as number[],
        on: [] as number[],
        thrown: 0,
        bare: false,
    },
    settings: {
        count: { kind: "whole", min: 1, max: 13 },
        shut: { kind: "numbers", min: 1, max: 13, most: 13 },
        dice: { kind: "numbers", min: 1, max: 6, most: 3 },
        on: { kind: "numbers", min: 0, max: 13, most: 3 },
        thrown: { kind: "whole", min: 0, max: 99 },
        bare: { kind: "flag" },
    },
    takes: [
        {
            label: "Nine, all open",
            params: { count: 9, shut: [], dice: [], on: [], thrown: 0, bare: false },
        },
        {
            label: "Half shut, a throw of three",
            params: {
                count: 9,
                shut: [2, 5, 7, 9],
                dice: [2, 3, 6],
                on: [0, 0, 0],
                thrown: 4,
                bare: false,
            },
        },
        {
            label: "Twelve, a 2 waiting on 9",
            params: {
                count: 12,
                shut: [1, 4, 11, 12],
                dice: [2, 4, 6],
                on: [9, 0, 0],
                thrown: 6,
                bare: false,
            },
        },
        {
            label: "Bare, for the pieces",
            params: { count: 6, shut: [], dice: [], on: [], thrown: 0, bare: true },
        },
    ],
    box: (p) => ({ w: boxWide(p.count), h: BOX.h }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const w = boxWide(p.count) * U,
            h = BOX.h * U,
            t = BOX.tray;
        const left = (w - p.count * BOX.slot) / 2;
        pen.path(
            g,
            rounded(4, 4, w - 8, h - 8, 12, 12),
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 10, fillWeight: 0.9 }),
            { strokeWidth: 2.6 },
        );
        pen.rect(
            g,
            left - 6,
            14,
            p.count * BOX.slot + 12,
            BOX.hinge - 10,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        // The felt on a white ground, so the wood's grain stops at its edge.
        const felt = rounded(t.side, t.top, w - t.side * 2, t.bottom - t.top, 10, 10);
        pen.path(g, felt, "ruler", pen.fill("card"), { stroke: "none" });
        pen.path(
            g,
            felt,
            "ruler",
            pen.fill("mint", "hachure", { hachureGap: 5, fillWeight: 0.7, hachureAngle: -50 }),
            { strokeWidth: 2.2 },
        );
        for (let n = 1; n <= p.count; n++) {
            const x = left + (n - 0.5) * BOX.slot;
            soft(c, x, 46, String(n), 13);
            a[`hinge(${n})`] = [x, BOX.hinge, "down"];
            a[`tile(${n})`] = [x, BOX.hinge - 24, "up"];
            if (!p.bare) drawTile(c, x, BOX.hinge, n, p.shut.includes(n) ? 1 : 0);
        }
        a.tray = [t.side, t.top, "up"];
        a.trayEnd = [w - t.side, t.bottom, "down"];
        if (!p.bare) {
            const spots = lying(p.count, p.dice.length, p.thrown);
            p.dice.forEach((f, i) => {
                const n = p.on[i] ?? 0;
                const onTile = n > 0 && n <= p.count;
                const x = onTile ? left + (n - 0.5) * BOX.slot : (spots[i]?.x ?? 0);
                const y = onTile
                    ? (p.shut.includes(n) ? BOX.hinge + 4 : BOX.hinge - 26) - i * 6
                    : (spots[i]?.y ?? 0);
                drawDie(c, x, y, onTile ? 22 : 32, f, 0, onTile ? 0 : (spots[i]?.turn ?? 0));
            });
        }
        return a;
    },
    describe: (p) =>
        p.bare
            ? "A wooden shut-the-box board drawn bare, a frame with a numbered rack along the back and a green felt tray in front for the dice."
            : `A wooden shut-the-box board, a row of hinged numbers standing along the back${p.shut.length > 0 ? ", some pushed down flat" : ""}, and a green felt tray in front${p.dice.length > 0 ? " with dice lying in it" : ""}.`,
});
