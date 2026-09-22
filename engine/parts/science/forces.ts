import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

/** A force arrow: a shaft with a solid head, drawn in the ink a child reads as a line. */
function forceArrow<G>(c: Ctx<G>, x: number, y: number, dx: number, label: string): void {
    const { pen, g } = c,
        s = Math.sign(dx) || 1,
        len = Math.abs(dx);
    pen.line(g, x, y, x + dx, y, "ruler", { strokeWidth: 3 });
    pen.polygon(
        g,
        [
            [x + dx, y],
            [x + dx - s * 13, y - 8],
            [x + dx - s * 13, y + 8],
        ],
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1.2 },
    );
    if (label) {
        patch(c, x + dx / 2, y - 15, len * 0.8, 18);
        num(c, x + dx / 2, y - 10, label, 15);
    }
}

/** The thing a force acts on. Each one sits in a 5 by 4 square cell with its base on `bottom`. */
function thing<G>(c: Ctx<G>, kind: string, x: number, bottom: number): void {
    const { pen, g } = c,
        w = 4 * U,
        mid = x + 2.5 * U;
    if (kind === "ball") {
        pen.circle(g, mid, bottom - 1.6 * U, 3.2 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 2,
        });
        pen.arc(
            g,
            mid - 0.5 * U,
            bottom - 2.2 * U,
            1.4 * U,
            1.1 * U,
            Math.PI * 1.1,
            Math.PI * 1.7,
            "pencil",
            { strokeWidth: 1.4 },
        );
        return;
    }
    if (kind === "door") {
        pen.rect(g, mid - 1.6 * U, bottom - 4 * U, 3.2 * U, 4 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        pen.line(g, mid - 1.6 * U, bottom - 4 * U, mid - 1.6 * U, bottom, "ruler", {
            strokeWidth: 3.4,
        });
        pen.circle(g, mid + 1 * U, bottom - 2 * U, 11, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.4,
        });
        return;
    }
    if (kind === "trolley") {
        pen.path(
            g,
            roundedRect(mid - 1.9 * U, bottom - 2.6 * U, 3.8 * U, 1.8 * U, 6),
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 2.2 },
        );
        pen.line(g, mid + 1.9 * U, bottom - 2.6 * U, mid + 1.9 * U, bottom - 4.2 * U, "ruler", {
            strokeWidth: 2.2,
        });
        for (const dx of [-1.1, 1.1])
            pen.circle(g, mid + dx * U, bottom - 0.5 * U, 0.9 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.8,
            });
        return;
    }
    // a crate: the default, because a box with a face on it is what a force diagram draws
    pen.rect(g, mid - w / 2, bottom - 3.2 * U, w, 3.2 * U, "ruler", pen.fill("mint"), {
        strokeWidth: 2.2,
    });
    pen.line(g, mid - w / 2, bottom - 2.1 * U, mid + w / 2, bottom - 2.1 * U, "ruler", {
        strokeWidth: 1.2,
    });
    pen.line(g, mid, bottom - 3.2 * U, mid, bottom - 2.1 * U, "ruler", { strokeWidth: 1.2 });
}

/**
 * How long an arrow is drawn, in squares, for a force of that size. It has to grow with the force,
 * because at grade one the sizes are not written on and the length is then the only thing saying
 * which force is bigger. It is capped so the drawing keeps its box whatever number it is handed.
 */
const armFor = (v: number): number => Math.max(2.2, Math.min(5.2, 2 + v * 0.5));

export const forces = defineDrawing({
    id: "forces",
    family: "science",
    title: "Push and pull",
    group: "Structures",
    about: "A thing with the forces on it drawn as arrows: a push against its back, a pull from in front, and a force the other way that works against them. A bigger force is a longer arrow, so which one wins is visible before any number is read; with the sizes written on as well, the arrows are a sum.",
    params: { thing: "box", push: 0, pull: 0, oppose: 0, unit: "N", labels: true },
    settings: {
        thing: { kind: "one of", of: ["box", "ball", "door", "trolley"] },
        push: { kind: "whole", min: 0, max: 20 },
        pull: { kind: "whole", min: 0, max: 20 },
        oppose: { kind: "whole", min: 0, max: 20 },
        unit: { kind: "text", most: 3 },
        labels: { kind: "flag" },
    },
    takes: [
        {
            label: "A push against friction",
            params: { thing: "box", push: 8, pull: 0, oppose: 3, unit: "N", labels: true },
        },
        {
            label: "One push, no labels",
            params: { thing: "box", push: 4, pull: 0, oppose: 0, unit: "N", labels: false },
        },
        {
            label: "A trolley pulled",
            params: { thing: "trolley", push: 0, pull: 4, oppose: 0, unit: "N", labels: false },
        },
    ],
    box: (p) => ({ w: 5 + (p.push > 0 ? 6 : 0) + (p.pull > 0 || p.oppose > 0 ? 6 : 0) + 1, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            bottom = 6.4 * U,
            a: RawAnchors = {};
        const zoneL = p.push > 0 ? 6 : 0,
            zoneR = p.pull > 0 || p.oppose > 0 ? 6 : 0;
        const x = (zoneL + 0.5) * U;
        pen.line(g, 0, bottom, (5 + zoneL + zoneR + 1) * U, bottom, "ruler", { strokeWidth: 2.4 });
        thing(c, p.thing, x, bottom);
        const mid = x + 2.5 * U,
            y = bottom - 1.9 * U;
        const tag = (v: number) => (p.labels ? `${v} ${p.unit}` : "");
        if (p.push > 0) {
            const arm = armFor(p.push) * U;
            forceArrow(c, mid - 2.1 * U - arm, y, arm, tag(p.push));
            a.push = [mid - 2.1 * U - arm / 2, y, "up"];
            if (p.labels) soft(c, mid - 2.1 * U - arm / 2, bottom + 1.1 * U, "push", 14);
        }
        if (p.pull > 0) {
            const arm = armFor(p.pull) * U;
            forceArrow(c, mid + 2.1 * U, y, arm, tag(p.pull));
            a.pull = [mid + 2.1 * U + arm / 2, y, "up"];
            if (p.labels) soft(c, mid + 2.1 * U + arm / 2, bottom + 1.1 * U, "pull", 14);
        }
        if (p.oppose > 0) {
            // pointing back at the thing, lifted clear when a pull is already on this side
            const arm = armFor(p.oppose) * U,
                oy = p.pull > 0 ? y - 2.6 * U : y;
            forceArrow(c, mid + 2.1 * U + arm, oy, -arm, tag(p.oppose));
            a.oppose = [mid + 2.1 * U + arm / 2, oy, "down"];
        }
        a.thing = [mid, bottom - 3.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A ${p.thing} on a flat floor with the forces on it drawn as arrows, a longer arrow for a bigger force${p.labels ? ", each with its size written on" : ""}.`,
    reads: true,
});
