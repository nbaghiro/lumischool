import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned } from "../lettering";
import { ray, mirrorStrip, headAt } from "./optics";

/** Whether a periscope shows what is over the wall: only when its two mirrors are parallel. */
export const periscopeSees = (flip: number): boolean => !(flip > 0);

export const periscope = defineDrawing({
    id: "periscope",
    family: "science",
    title: "Periscope",
    group: "Structures",
    about: "A child behind a wall looking into a periscope, and a bird on the other side. Light from the bird goes in at the top, turns down at one mirror and out to the eye at the other, which only happens when the two mirrors are parallel; with `flip` at 1 the top mirror faces the wrong way and the light goes out of the top instead. With `show` at 0 the light's path is left to draw.",
    params: { tall: 6, flip: 0, show: 1, tag: "" },
    settings: {
        tall: { kind: "whole", min: 4, max: 8 },
        flip: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "Seeing over the wall", params: { tall: 6, flip: 0, show: 1, tag: "" } },
        { label: "A mirror the wrong way", params: { tall: 6, flip: 1, show: 1, tag: "" } },
        { label: "Draw the light", params: { tall: 5, flip: 0, show: 0, tag: "" } },
    ],
    box: (p) => ({ w: 15, h: Math.max(4, Math.min(8, Math.round(p.tall))) + 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            tall = Math.max(4, Math.min(8, Math.round(p.tall)));
        const ground = (tall + 5.4) * U,
            eyeY = ground - 2.4 * U,
            topY = eyeY - tall * U,
            tx = 7.6 * U,
            tw = 1.8 * U;
        if (p.tag) num(c, 14.2 * U, 1.3 * U, p.tag, 22, "end");
        pen.line(g, 0, ground, 15 * U, ground, "ruler", { strokeWidth: 2.4 });
        // the wall, higher than the child's head and lower than the periscope's top window
        const wallTop = Math.max(topY + 2.2 * U, eyeY - 2.6 * U),
            wx = 4.2 * U;
        pen.rect(
            g,
            wx,
            wallTop,
            2 * U,
            ground - wallTop,
            "ruler",
            pen.fill("berry", "hachure", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
        for (let y = wallTop + 0.8 * U, k = 0; y < ground - 0.2 * U; y += 0.8 * U, k++) {
            pen.line(g, wx, y, wx + 2 * U, y, "ruler", { strokeWidth: 1 });
            pen.line(
                g,
                wx + (k % 2 ? 0.6 : 1.3) * U,
                y - 0.8 * U,
                wx + (k % 2 ? 0.6 : 1.3) * U,
                y,
                "ruler",
                { strokeWidth: 1 },
            );
        }
        // the bird on its post, level with the top window
        const by = topY + 0.8 * U;
        pen.line(g, 1.6 * U, by + 0.7 * U, 1.6 * U, ground, "pencil", { strokeWidth: 2 });
        pen.ellipse(g, 1.7 * U, by, 1.6 * U, 1.1 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.6,
        });
        pen.circle(g, 2.5 * U, by - 0.45 * U, 0.8 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.6,
        });
        pen.polygon(
            g,
            [
                [2.85 * U, by - 0.5 * U],
                [3.3 * U, by - 0.35 * U],
                [2.85 * U, by - 0.25 * U],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1 },
        );
        pen.circle(
            g,
            2.6 * U,
            by - 0.55 * U,
            4,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        a.bird = [1.8 * U, by - 0.9 * U, "up"];
        // the tube, open at the top on the bird's side and at the bottom on the child's
        const L = tx,
            R = tx + tw,
            top = topY - 0.1 * U,
            bot = eyeY + 1 * U;
        pen.path(
            g,
            `M${L} ${top}H${R}V${eyeY - 0.8 * U}M${R} ${eyeY + 0.8 * U}V${bot}H${L}V${topY + 1.6 * U}`,
            "ruler",
            null,
            { strokeWidth: 2.6 },
        );
        pen.polygon(
            g,
            [
                [L, topY + 1.6 * U],
                [L, bot],
                [R, bot],
                [R, eyeY + 0.8 * U],
                [R, eyeY - 0.8 * U],
                [R, top],
                [L, top],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 9, fillWeight: 0.5 }),
            { strokeWidth: 0 },
        );
        const mid = tx + tw / 2,
            h = 0.72 * U,
            flipped = !periscopeSees(p.flip);
        mirrorStrip(
            c,
            flipped ? [mid - h, by + h] : [mid - h, by - h],
            flipped ? [mid + h, by - h] : [mid + h, by + h],
        );
        mirrorStrip(c, [mid - h, eyeY - h], [mid + h, eyeY + h]);
        headAt(c, 12 * U, eyeY, -1);
        a.eye = [12 * U, eyeY - 1.6 * U, "up"];
        if (p.show > 0) {
            if (flipped)
                ray(c, [
                    [3.3 * U, by],
                    [mid, by],
                    [mid, topY - 1.6 * U],
                ]);
            else
                ray(c, [
                    [3.3 * U, by],
                    [mid, by],
                    [mid, eyeY],
                    [11 * U, eyeY],
                ]);
        }
        if (p.show > 0 && flipped) penned(c, 12.3 * U, eyeY - 1.9 * U, "?", 22);
        return a;
    },
    describe: (p) =>
        `A child behind a wall looking into a periscope, two mirrors in a tall tube${p.flip > 0 ? ", the top one turned the wrong way" : ""}, and a bird beyond the wall.`,
    reads: true,
});
