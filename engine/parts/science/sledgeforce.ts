import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, soft } from "../lettering";
import { lightFill } from "./apparatus";

export type SledgeMotion =
    "speeds up" | "keeps a steady speed" | "slows down" | "starts to move" | "stays still";

const total = (forces: readonly number[]): number => forces.reduce((s, f) => s + f, 0);

/**
 * The forces holding the sledge back as they act. On a still sledge there is no air, and friction
 * pushes back only as hard as the sledge is pulled, up to the most it can give, which is `back[0]`.
 */
export function sledgeBack(
    forward: readonly number[],
    back: readonly number[],
    moving: number,
): number[] {
    if (moving > 0) return [...back];
    const pull = total(forward),
        most = back[0] ?? 0;
    return pull > 0 && most > 0 ? [Math.min(pull, most)] : [];
}

/** What the forces along the snow do to the sledge: only the difference between them changes its speed. */
export function sledgeMotion(
    forward: readonly number[],
    back: readonly number[],
    moving: number,
): SledgeMotion {
    const net = total(forward) - total(sledgeBack(forward, back, moving));
    if (moving > 0) return net > 0 ? "speeds up" : net < 0 ? "slows down" : "keeps a steady speed";
    return net > 0 ? "starts to move" : "stays still";
}

const SLEDGE_X = 9 * U;
/** The sledge's length along the snow, runner to the tip of its curl. */
const LENGTH = 10.3 * U;
/** The longest arrow along the snow, in squares, drawn for the largest force along it. */
const LONGEST = 6;
/** The most room the weight and the snow's push have, above the load and below the snow. */
const UPRIGHT = 3.4;
/** An arrow shorter than this, in squares, no longer reads, so the upright pair takes a scale of its own. */
const SHORTEST = 0.8;

function arrow<G>(c: Ctx<G>, x: number, y: number, dx: number, dy: number, label: string): void {
    const { pen, g } = c,
        len = Math.hypot(dx, dy),
        ux = dx / len,
        uy = dy / len,
        head = Math.min(13, len * 0.45),
        side = (head * 8) / 13;
    pen.line(g, x, y, x + dx, y + dy, "ruler", { strokeWidth: 3 });
    pen.polygon(
        g,
        [
            [x + dx, y + dy],
            [x + dx - ux * head - uy * side, y + dy - uy * head + ux * side],
            [x + dx - ux * head + uy * side, y + dy - uy * head - ux * side],
        ],
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1.2 },
    );
    if (label && dy === 0) {
        patch(c, x + dx / 2, y - 0.45 * U - 5, label.length * 9 + 8, 18);
        num(c, x + dx / 2, y - 0.45 * U, label, 14);
    } else if (label) {
        const ly = y + dy + (dy > 0 ? -0.2 * U : 0.6 * U);
        patch(c, x - 0.4 * U - label.length * 4, ly - 5, label.length * 9 + 8, 18);
        num(c, x - 0.4 * U, ly, label, 14, "end");
    }
}

/** A loaded sledge side on, its runner curling up at the front, drawn in outline so it prints as one. */
function loaded<G>(c: Ctx<G>, x0: number, snow: number): void {
    const { pen, g } = c,
        deck = snow - 1.4 * U,
        tip = x0 + LENGTH;
    pen.path(
        g,
        `M${x0} ${snow - 3}L${tip - 1.6 * U} ${snow - 3}Q${tip - 0.2 * U} ${snow - 3} ${tip - 0.2 * U} ${snow - 1.3 * U}Q${tip - 0.2 * U} ${snow - 2.4 * U} ${tip - 1 * U} ${snow - 2.1 * U}`,
        "ruler",
        null,
        { strokeWidth: 2.2 },
    );
    for (const x of [0.6, 3.6, 6.6])
        pen.line(g, x0 + x * U, snow - 3, x0 + x * U, deck + 6, "ruler", { strokeWidth: 1.6 });
    pen.rect(g, x0, deck, 8.2 * U, 6, "ruler", lightFill(c, "tang"), { strokeWidth: 1.6 });
    pen.rect(g, x0 + 0.5 * U, deck - 1.6 * U, 3.4 * U, 1.6 * U, "ruler", lightFill(c, "sky"), {
        strokeWidth: 1.7,
    });
    pen.rect(g, x0 + 4.2 * U, deck - 1.2 * U, 3.6 * U, 1.2 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.7,
    });
    for (const x of [1.6, 2.8, 5.3, 6.7])
        pen.line(g, x0 + x * U, deck - (x < 4 ? 1.6 : 1.2) * U, x0 + x * U, deck, "ruler", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
    pen.line(g, tip - 1 * U, snow - 2.1 * U, tip + 0.1 * U, snow - 2.3 * U, "pencil", {
        strokeWidth: 1.2,
        stroke: c.t["ink-soft"],
    });
}

export const sledgeForce = defineDrawing({
    id: "sledgeforce",
    family: "science",
    title: "Forces on a sledge",
    group: "Structures",
    about: "A sledge on the snow with the forces along the snow drawn as arrows, each as long as its size in newtons says: pulls forward on the rope (`forward`), and friction and the air pushing back (`back`). Only the difference between forward and back changes how the sledge moves: a moving sledge speeds up when the forward forces are bigger, keeps a steady speed when they balance and slows down when the back forces are bigger. On a sledge standing still (`moving` at 0) the first `back` is the most friction can give, written at the top: friction pushes back only as hard as the sledge is pulled, up to that most, so its arrow matches the pull and there is none without a pull, and the sledge stays still until the pull is more than the most. `weight` draws its weight down and the snow's equal push up, which balance, on the same scale as the other arrows; when a weight is so much bigger that the forces along the snow would be too short to read on its scale, the upright pair is drawn to a smaller scale and the drawing says so. With `show` at 1 what the sledge does is written under it, and `names` writes the name of each force.",
    params: { forward: [120], back: [80], weight: 0, moving: 1, show: 0, names: 1 },
    settings: {
        forward: { kind: "numbers", min: 0, max: 1000, most: 3 },
        back: { kind: "numbers", min: 0, max: 1000, most: 2 },
        weight: { kind: "whole", min: 0, max: 5000 },
        moving: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Pulled harder than it is held back",
            params: { forward: [120], back: [80], weight: 0, moving: 1, show: 1, names: 1 },
        },
        {
            label: "Balanced, at a steady speed",
            params: { forward: [60, 40], back: [70, 30], weight: 0, moving: 1, show: 1, names: 1 },
        },
        {
            label: "Its weight and the snow's push",
            params: { forward: [90], back: [90], weight: 600, moving: 0, show: 0, names: 1 },
        },
    ],
    box: (p) => ({ w: 28, h: p.weight > 0 ? 12 : 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            forward = p.forward.slice(0, 3).filter((f) => f > 0),
            given = p.back.slice(0, 2).filter((b) => b > 0),
            back = sledgeBack(forward, given, p.moving),
            weight = Math.max(0, Math.round(p.weight)),
            snow = (weight > 0 ? 8.2 : 7.4) * U,
            along = [...forward, ...back],
            biggest = Math.max(1, ...along),
            smallest = Math.min(biggest, ...along),
            // one scale for every arrow, unless the weight dwarfs the forces along the snow so far
            // that on its scale they would be too short to read
            common = weight > 0 ? Math.min(LONGEST / biggest, UPRIGHT / weight) : LONGEST / biggest,
            apart = weight > 0 && smallest * common < SHORTEST,
            scale = apart ? LONGEST / biggest : common,
            size = (f: number): number => f * scale * U,
            upright = apart ? UPRIGHT * U : weight * scale * U;
        pen.line(g, 0, snow, 28 * U, snow, "pencil", { strokeWidth: 2.2 });
        for (const x of [1.2, 4.6, 21.4, 24.6])
            pen.line(g, x * U, snow + 0.5 * U, (x + 1.4) * U, snow + 0.5 * U, "pencil", {
                strokeWidth: 1,
                stroke: c.t.sky,
            });
        loaded(c, SLEDGE_X, snow);
        const front = SLEDGE_X + LENGTH + 0.1 * U,
            rear = SLEDGE_X - 0.1 * U;
        forward.forEach((f, i) => {
            const y = snow - 2.3 * U - i * 1.5 * U;
            arrow(c, front, y, size(f), 0, `${f} N`);
            if (p.names > 0) soft(c, front + size(f) + 0.3 * U, y + 5, "pull", 11, "start");
            a[`forward(${i})`] = [front + size(f) / 2, y, "up"];
        });
        back.forEach((b, i) => {
            const y = snow - 1.4 * U - i * 1.5 * U;
            arrow(c, rear, y, -size(b), 0, `${b} N`);
            if (p.names > 0)
                soft(c, rear - size(b) - 0.3 * U, y + 5, i === 0 ? "friction" : "air", 11, "end");
            a[`back(${i})`] = [rear - size(b) / 2, y, "up"];
        });
        if (weight > 0) {
            // the weight pulls down from under the sledge, and the snow's push stands on the load
            const mx = SLEDGE_X + 4.1 * U,
                w = `${weight} N`;
            arrow(c, mx, snow + 2, 0, upright, `${p.names > 0 ? "weight " : ""}${w}`);
            arrow(c, mx, snow - 3.1 * U, 0, -upright, `${p.names > 0 ? "snow " : ""}${w}`);
            if (apart) soft(c, 27.6 * U, 1 * U, "up and down: a smaller scale", 11, "end");
        }
        const words = sledgeMotion(forward, given, p.moving),
            most = given[0];
        cap(c, 2.6 * U, 1 * U, p.moving > 0 ? "moving" : "standing still", 11);
        if (p.moving <= 0 && most !== undefined)
            soft(c, 0.5 * U, 1.9 * U, `friction can hold it with up to ${most} N`, 11, "start");
        if (p.show > 0) {
            const x = weight > 0 ? 20 * U : 14 * U,
                y = (weight > 0 ? 11.2 : 9.2) * U;
            patch(c, x, y - 5, words.length * 9, 20);
            soft(c, x, y, `it ${words}`, 14);
        }
        a.sledge = [SLEDGE_X + 5 * U, snow - 3.1 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A sledge on the snow with ${p.forward.length === 1 ? "a pull" : "pulls"} forward and friction back drawn as arrows in newtons${p.weight > 0 ? ", and its weight and the snow's push up" : ""}.`,
    reads: true,
});
