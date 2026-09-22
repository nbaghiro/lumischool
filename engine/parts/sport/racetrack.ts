import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, soft } from "../lettering";

/** A runner seen from straight above: shoulders, both arms out, and the head on top of them. */
function runnerAbove<G>(c: Ctx<G>, x: number, y: number): void {
    const { pen, g } = c;
    pen.ellipse(g, x, y, 1.15 * U, 0.7 * U, "pencil", pen.fill("sky", "solid", { hachureGap: 5 }), {
        strokeWidth: 1.6,
    });
    for (const s of [-1, 1]) {
        pen.curve(
            g,
            [
                [x - 0.3 * U, y + s * 0.28 * U],
                [x + 0.12 * U, y + s * 0.58 * U],
                [x + 0.46 * U, y + s * 0.34 * U],
            ],
            "pencil",
            { strokeWidth: 1.6 },
        );
    }
    pen.circle(g, x, y, 0.72 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
}

export const raceTrack = defineDrawing({
    id: "racetrack",
    family: "sport",
    title: "Race track",
    group: "Structures",
    about: "Lanes from above with a runner part way along each one, and a scale under the track in metres. How far along a runner is asks for a fraction of the whole length, so the track is ruled rather than sketched.",
    params: { lanes: 4, along: [0.9, 0.6, 0.75, 0.4], metres: 100 },
    settings: {
        lanes: { kind: "whole", min: 1, max: 8 },
        along: { kind: "numbers", min: 0, max: 1, most: 8 },
        metres: { kind: "whole", min: 1, max: 1000 },
    },
    takes: [
        { label: "Four lanes", params: { lanes: 4, along: [0.9, 0.6, 0.75, 0.4], metres: 100 } },
        {
            label: "Six lanes",
            params: { lanes: 6, along: [0.95, 0.8, 0.65, 0.5, 0.35, 0.2], metres: 200 },
        },
        { label: "At the start", params: { lanes: 3, along: [0, 0, 0], metres: 60 } },
    ],
    box: (p) => ({ w: 29, h: p.lanes * 2 + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const x0 = 3 * U,
            len = 24 * U,
            x1 = x0 + len,
            top = 1.4 * U,
            laneH = 2 * U,
            bottom = top + p.lanes * laneH;
        pen.rect(g, x0, top, len, p.lanes * laneH, "ruler", null, { strokeWidth: 2 });
        for (let i = 1; i < p.lanes; i++)
            pen.line(g, x0, top + i * laneH, x1, top + i * laneH, "ruler", { strokeWidth: 1.2 });
        // The finish is a chequered band rather than a flag, so it is still a finish in black ink.
        for (let r = 0; r < p.lanes * 2; r++) {
            for (let k = 0; k < 2; k++) {
                if ((r + k) % 2) continue;
                pen.rect(
                    g,
                    x1 - (2 - k) * 0.4 * U,
                    top + r * U,
                    0.4 * U,
                    U,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.5 },
                );
            }
        }
        pen.line(g, x0, top, x0, bottom, "ruler", { strokeWidth: 3 });
        pen.line(g, x1, top, x1, bottom, "ruler", { strokeWidth: 3 });
        cap(c, x0, top - 0.4 * U, "start", 11, "start");
        cap(c, x1, top - 0.4 * U, "finish", 11, "end");
        for (let i = 0; i < p.lanes; i++) {
            const y = top + i * laneH,
                mid = y + laneH / 2;
            num(c, x0 - 0.6 * U, mid + 6, i + 1, 15, "end");
            // The runner stands on a ruled line across the lane: the line is the position, the drawing
            // of the runner only says who is standing there.
            const at = Math.min(1, Math.max(0, p.along[i] ?? 0)),
                x = x0 + len * at;
            pen.line(g, x, y + 4, x, y + laneH - 4, "ruler", { strokeWidth: 1.2 });
            runnerAbove(c, x, mid);
            a[`lane(${i + 1})`] = [x0 - 0.6 * U, mid, "left"];
            a[`runner(${i + 1})`] = [x, mid - 0.8 * U, "up"];
        }
        const sy = bottom + U;
        pen.line(g, x0, sy, x1, sy, "ruler", { strokeWidth: 1.8 });
        for (let i = 0; i <= 10; i++) {
            const x = x0 + (len * i) / 10,
                big = i % 2 === 0;
            pen.line(g, x, sy - (big ? 9 : 5), x, sy + (big ? 9 : 5), "ruler", {
                strokeWidth: big ? 1.6 : 1,
            });
            if (big) num(c, x, sy + 1.05 * U, Math.round((p.metres * i) / 10), 13);
        }
        soft(c, x1 + 0.35 * U, sy + 5, "m", 12, "start");
        a.start = [x0, top, "up"];
        a.finish = [x1, top, "up"];
        a.scale = [x0 + len / 2, sy, "down"];
        return a;
    },
    describe: () =>
        "Running lanes seen from above with a runner standing in each, a chequered finish band at the end, and a scale in metres ruled under the track.",
    reads: true,
});
