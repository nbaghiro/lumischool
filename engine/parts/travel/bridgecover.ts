import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { pupFamily } from "../animals/pupfamily";
import { PUPCAR, pupCar } from "./pupcar";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The Pup family's car halfway over a little bridge of wooden triangles above a stream: the picture the bridge game is chosen by. */
export const bridgeCover = defineDrawing({
    id: "bridgecover",
    family: "travel",
    title: "The pups' bridge",
    group: "Props",
    about: "The Pup family's red car driving over a little bridge a child has built across a stream, its road held up by wooden triangles, with the water running underneath.",
    params: { pups: 2 },
    settings: { pups: { kind: "whole", min: 0, max: 2 } },
    takes: [
        { label: "Two pups crossing", params: { pups: 2 } },
        { label: "The car on its own", params: { pups: 0 } },
    ],
    box: () => ({ w: 10, h: 6 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            deck = 3.7 * U;
        pen.rect(g, 1.6 * U, 4.4 * U, 6.8 * U, 1.4 * U, "pencil", pen.fill("sky"), {
            stroke: "none",
        });
        for (const [x, y] of [
            [2.6, 4.9],
            [5.2, 5.3],
            [6.6, 4.8],
        ] as const)
            pen.arc(g, x * U, y * U, 0.9 * U, 0.3 * U, Math.PI * 1.1, Math.PI * 1.9, "pencil", {
                strokeWidth: 1.1,
            });
        for (const [x0, x1, edge] of [
            [0.3, 2.0, 2.0],
            [8.0, 9.7, 8.0],
        ] as const) {
            pen.rect(
                g,
                x0 * U,
                deck,
                (x1 - x0) * U,
                5.85 * U - deck,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 8, hachureAngle: -41 }),
                { strokeWidth: 1.5 },
            );
            pen.rect(g, x0 * U, deck, (x1 - x0) * U, 0.45 * U, "pencil", pen.fill("mint"), {
                strokeWidth: 1.2,
            });
            pen.circle(g, edge * U, deck, 0.4 * U, "ruler", pen.fill("sky"), {
                strokeWidth: 1,
                ...FIRM,
            });
        }
        // the triangles under the road: the wood first, so the road lies over it
        const top: [number, number][] = [
            [2.0, 3.7],
            [3.5, 2.2],
            [5.0, 3.7],
            [6.5, 2.2],
            [8.0, 3.7],
        ];
        const wood = pen.fill("tang", "hachure", { hachureGap: 4, hachureAngle: 90 });
        for (let i = 0; i + 1 < top.length; i++) {
            const a = top[i],
                b = top[i + 1];
            if (!a || !b) continue;
            const dx = b[0] - a[0],
                dy = b[1] - a[1],
                l = Math.hypot(dx, dy),
                nx = (-dy / l) * 0.13 * U,
                ny = (dx / l) * 0.13 * U;
            pen.polygon(
                g,
                [
                    [a[0] * U + nx, a[1] * U + ny],
                    [b[0] * U + nx, b[1] * U + ny],
                    [b[0] * U - nx, b[1] * U - ny],
                    [a[0] * U - nx, a[1] * U - ny],
                ],
                "pencil",
                wood,
                { strokeWidth: 1.2, ...FIRM },
            );
        }
        pen.rect(g, 3.5 * U, 2.07 * U, 3 * U, 0.26 * U, "pencil", wood, {
            strokeWidth: 1.2,
            ...FIRM,
        });
        pen.rect(g, 1.9 * U, deck - 0.2 * U, 6.2 * U, 0.4 * U, "pencil", pen.fill("ink"), {
            strokeWidth: 1.3,
            ...FIRM,
        });
        for (const [x, y] of top)
            pen.circle(g, x * U, y * U, 0.32 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1,
                ...FIRM,
            });
        // the car, at a little over half its size, with its wheels on the road
        const k = 0.62,
            cx = 3.3 * U,
            cy = deck - 0.2 * U - PUPCAR.road * U * k;
        const inCar = group(c, {
            turn: [
                ["translate", cx, cy],
                ["scale", k],
            ],
        });
        const pups = Math.max(0, Math.min(2, Math.round(Number(p.pups) || 0)));
        for (const [i, member] of (["rufus", "pip"] as const).slice(0, pups).entries()) {
            const seat = PUPCAR.seats[i];
            if (!seat) continue;
            const s = 0.38;
            pupFamily.draw(
                group(inCar, {
                    turn: [
                        ["translate", (seat.x - 2 * s) * U, (seat.y + 0.55 - 5.6 * s) * U],
                        ["scale", s],
                    ],
                }),
                { member, pose: "sit", mood: "excited", dir: 1, gear: "none" },
            );
        }
        pupCar.draw(inCar, { paint: "berry" });
        return { car: [cx + 2.5 * U * k, cy, "up"] };
    },
    describe: (p) =>
        `The Pup family's red car${Number(p.pups) > 0 ? ", two pups inside," : ""} driving over a little bridge of road and wooden triangles built across a stream.`,
    motion: { still: "A cover holds still; the bridge game itself moves." },
});
