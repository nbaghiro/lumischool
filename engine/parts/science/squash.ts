import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned, say, soft } from "../lettering";
import { type Pt, lightFill } from "./apparatus";
import { SHAPES } from "./substances";

const ACTIONS = ["squash", "bend", "twist", "stretch"] as const;

/** A thing from SHAPES as it is, or as it looks while `action` is done to it, centred on (x, y). */
function shapeOf<G>(
    c: Ctx<G>,
    thing: string,
    action: string,
    acted: boolean,
    x: number,
    y: number,
): void {
    const { pen, g } = c,
        t = c.t;
    if (thing === "sponge") {
        const w = (acted ? 4.2 : 3.4) * U,
            h = (acted ? 1 : 2.1) * U;
        pen.path(
            g,
            roundedRect(x - w / 2, y - h / 2, w, h, 6),
            "pencil",
            lightFill(c, "glow", "solid"),
            { strokeWidth: 1.8 },
        );
        const r = rng(41);
        for (let k = 0; k < 8; k++)
            pen.ellipse(
                g,
                x + (r() - 0.5) * (w - 14),
                y + (r() - 0.5) * (h - 10),
                acted ? 6 : 5,
                acted ? 2.5 : 5,
                "pencil",
                null,
                { strokeWidth: 1, stroke: t["ink-soft"] },
            );
        return;
    }
    if (thing === "clay") {
        if (acted) {
            pen.ellipse(g, x, y + 0.3 * U, 4.2 * U, 1.15 * U, "pencil", pen.fill("berry"), {
                strokeWidth: 1.8,
            });
            for (const dx of [-0.9, 0, 0.9])
                pen.ellipse(g, x + dx * U, y + 0.2 * U, 0.6 * U, 0.32 * U, "pencil", null, {
                    strokeWidth: 0.9,
                    stroke: t["ink-soft"],
                });
        } else {
            pen.circle(g, x, y, 2.6 * U, "pencil", pen.fill("berry"), { strokeWidth: 1.8 });
            pen.arc(
                g,
                x - 0.2 * U,
                y - 0.2 * U,
                1.3 * U,
                1.3 * U,
                Math.PI * 1.1,
                Math.PI * 1.5,
                "pencil",
                { strokeWidth: 1.6, stroke: t.card },
            );
        }
        return;
    }
    if (thing === "band") {
        const w = (acted ? 4.4 : 2.4) * U,
            h = (acted ? 0.55 : 1.4) * U;
        pen.ellipse(g, x, y, w, h, "pencil", null, {
            strokeWidth: 5,
            stroke: c.paper ? t["ink-soft"] : t.tang,
        });
        pen.ellipse(g, x, y, w + 5, h + 5, "pencil", null, { strokeWidth: 1.1 });
        pen.ellipse(g, x, y, Math.max(4, w - 5), Math.max(2, h - 5), "pencil", null, {
            strokeWidth: 1.1,
        });
        return;
    }
    if (thing === "spring") {
        const len = (acted ? (action === "squash" ? 1.5 : 4.2) : 2.7) * U,
            turns = 7,
            h = 1.6 * U;
        const pts: Pt[] = [];
        for (let k = 0; k <= turns * 12; k++) {
            const u = k / (turns * 12);
            pts.push([
                x - len / 2 + u * len + Math.sin(u * turns * Math.PI * 2) * 3,
                y - (Math.cos(u * turns * Math.PI * 2) * h) / 2,
            ]);
        }
        pen.curve(g, pts, "pencil", { strokeWidth: 1.8, stroke: c.paper ? t.ink : t["ink-soft"] });
        for (const s of [-1, 1])
            pen.line(g, x + (s * len) / 2, y, x + s * (len / 2 + 0.3 * U), y, "pencil", {
                strokeWidth: 1.8,
            });
        return;
    }
    if (thing === "pipecleaner") {
        let pts: Pt[];
        if (!acted)
            pts = [
                [x - 1.8 * U, y],
                [x, y],
                [x + 1.8 * U, y],
            ];
        else if (action === "bend")
            pts = [
                [x - 1.4 * U, y - 1.1 * U],
                [x - 0.7 * U, y + 0.45 * U],
                [x, y + 0.85 * U],
                [x + 0.7 * U, y + 0.45 * U],
                [x + 1.4 * U, y - 1.1 * U],
            ];
        else
            pts = Array.from({ length: 25 }, (_, k): Pt => [
                x - 1.8 * U + k * 0.15 * U,
                y + Math.sin(k * 0.95) * 0.42 * U,
            ]);
        pen.curve(g, pts, "pencil", { strokeWidth: 9, stroke: c.paper ? t["ink-soft"] : t.mint });
        const r = rng(83);
        for (let k = 0; k < pts.length - 1; k++) {
            const [x0, y0] = pts[k] ?? [0, 0],
                [x1, y1] = pts[k + 1] ?? [0, 0],
                per = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
            for (let j = 0; j < per; j++) {
                const u = (j + r()) / per,
                    px = x0 + (x1 - x0) * u,
                    py = y0 + (y1 - y0) * u,
                    ang = r() * Math.PI * 2;
                pen.line(
                    g,
                    px + Math.cos(ang) * 2,
                    py + Math.sin(ang) * 2,
                    px + Math.cos(ang) * 7.5,
                    py + Math.sin(ang) * 7.5,
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.paper ? t.ink : "#3E8A63" },
                );
            }
        }
        return;
    }
    if (thing === "foil") {
        if (acted) {
            const r = rng(19),
                pts: Pt[] = [];
            for (let k = 0; k < 11; k++) {
                const ang = (k / 11) * Math.PI * 2,
                    rr = (0.95 + r() * 0.35) * U;
                pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]);
            }
            pen.polygon(
                g,
                pts,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
                { strokeWidth: 1.6 },
            );
            for (let k = 0; k < 4; k++)
                pen.line(
                    g,
                    x + (r() - 0.5) * U,
                    y + (r() - 0.5) * U,
                    x + (r() - 0.5) * U,
                    y + (r() - 0.5) * U,
                    "pencil",
                    { strokeWidth: 0.9, stroke: t["ink-soft"] },
                );
        } else {
            pen.polygon(
                g,
                [
                    [x - 2 * U, y + 0.7 * U],
                    [x - 1.3 * U, y - 0.8 * U],
                    [x + 2 * U, y - 0.8 * U],
                    [x + 1.3 * U, y + 0.7 * U],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.5 }),
                { strokeWidth: 1.6 },
            );
            pen.line(g, x - 0.4 * U, y - 0.4 * U, x + 0.2 * U, y + 0.3 * U, "pencil", {
                strokeWidth: 0.9,
                stroke: t["ink-soft"],
            });
        }
        return;
    }
    if (thing === "ball") {
        const w = (acted ? 3.4 : 2.6) * U,
            h = (acted ? 1.6 : 2.6) * U;
        pen.ellipse(g, x, y + (acted ? 0.5 * U : 0), w, h, "pencil", pen.fill("tang"), {
            strokeWidth: 1.8,
        });
        pen.arc(g, x, y + (acted ? 0.5 * U : 0), w * 0.9, h * 0.35, 0.2, Math.PI - 0.2, "pencil", {
            strokeWidth: 1.1,
        });
        if (!acted)
            pen.arc(
                g,
                x - 0.3 * U,
                y - 0.35 * U,
                1.3 * U,
                1.3 * U,
                Math.PI * 1.1,
                Math.PI * 1.5,
                "pencil",
                { strokeWidth: 1.6, stroke: t.card },
            );
        return;
    }
    say(c, x, y + 6, "?", 18);
}

/** The arrows that say what is being done: pressed together, pulled apart, bent at both ends or twisted. */
function actionArrows<G>(c: Ctx<G>, action: string, x: number, y: number): void {
    const { pen, g } = c,
        col = c.t.pen;
    if (action === "squash") {
        pen.arrow(g, [x, y - 2.3 * U], [x, y - 0.9 * U], col, 0);
        pen.arrow(g, [x, y + 2.3 * U], [x, y + 0.9 * U], col, 0);
    } else if (action === "stretch") {
        pen.arrow(g, [x - 1.6 * U, y - 1.1 * U], [x - 2.6 * U, y - 1.1 * U], col, 0);
        pen.arrow(g, [x + 1.6 * U, y - 1.1 * U], [x + 2.6 * U, y - 1.1 * U], col, 0);
    } else if (action === "bend") {
        pen.arrow(g, [x - 2.1 * U, y - 2.1 * U], [x - 1.4 * U, y - 1.2 * U], col, 0.25);
        pen.arrow(g, [x + 2.1 * U, y - 2.1 * U], [x + 1.4 * U, y - 1.2 * U], col, -0.25);
    } else {
        for (const s of [-1, 1]) {
            pen.arc(
                g,
                x + s * 1.9 * U,
                y,
                0.9 * U,
                1.6 * U,
                -Math.PI * 0.4,
                Math.PI * 0.4,
                "pencil",
                { strokeWidth: 2, stroke: col },
            );
            pen.arrow(
                g,
                [x + s * 1.95 * U, y + 0.55 * U],
                [x + s * 1.75 * U, y + 0.78 * U],
                col,
                0,
                0,
            );
        }
    }
}

export const squash = defineDrawing({
    id: "squash",
    family: "science",
    title: "Squash, bend, twist, stretch",
    group: "Structures",
    about: "A thing before, while it is squashed, bent, twisted or stretched, and after it is let go: a sponge, a rubber band, a spring and a rubber ball spring back, and modelling clay, a pipe cleaner and foil stay the new shape. What each does is one table, so the third picture is drawn from the same rule the checker marks by. With `after` at 0 the third picture waits under a question mark, for a prediction.",
    params: { thing: "sponge", action: "squash", after: 1 },
    settings: {
        thing: { kind: "one of", of: Object.keys(SHAPES) },
        action: { kind: "one of", of: ACTIONS },
        after: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A sponge springs back", params: { thing: "sponge", action: "squash", after: 1 } },
        { label: "Clay stays squashed", params: { thing: "clay", action: "squash", after: 1 } },
        { label: "A band stretched", params: { thing: "band", action: "stretch", after: 1 } },
        {
            label: "Bend a pipe cleaner",
            params: { thing: "pipecleaner", action: "bend", after: 1 },
        },
        {
            label: "Twist it, and predict",
            params: { thing: "pipecleaner", action: "twist", after: 0 },
        },
        { label: "Foil scrunched", params: { thing: "foil", action: "squash", after: 1 } },
        { label: "A spring stretched", params: { thing: "spring", action: "stretch", after: 1 } },
        { label: "A ball squashed", params: { thing: "ball", action: "squash", after: 1 } },
    ],
    box: () => ({ w: 20, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            y = 3.4 * U;
        const does = SHAPES[p.thing]?.actions[p.action];
        const xs: [number, number, number] = [3.2 * U, 10 * U, 16.8 * U];
        for (const x of xs)
            pen.path(g, roundedRect(x - 3 * U, 0.4 * U, 6 * U, 6 * U, 10), "pencil", null, {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
                strokeLineDash: [2, 6],
            });
        shapeOf(c, p.thing, p.action, false, xs[0], y);
        shapeOf(c, p.thing, p.action, true, xs[1], y);
        actionArrows(c, p.action, xs[1], y);
        if (p.after > 0 && does) shapeOf(c, p.thing, p.action, does === "stays", xs[2], y);
        else penned(c, xs[2], y + 10, "?", 34);
        for (const x of [6.5 * U, 13.3 * U]) num(c, x, y + 7, "→", 22);
        const words = ["before", `${p.action} it`, "let go"];
        xs.forEach((x, i) => soft(c, x, 7.5 * U, words[i] ?? "", 13));
        a.before = [xs[0], 0.4 * U, "up"];
        a.acted = [xs[1], 0.4 * U, "up"];
        a.after = [xs[2], 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `The same ${SHAPES[p.thing]?.name ?? "thing"} drawn three times in a row: as it is, while it is ${p.action === "squash" ? "squashed" : p.action === "bend" ? "bent" : p.action === "twist" ? "twisted" : "stretched"} with arrows, and ${p.after > 0 ? "after it is let go" : "a question mark for after it is let go"}.`,
    reads: true,
});
