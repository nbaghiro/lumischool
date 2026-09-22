import { roundedRect } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { critter } from "../stories/pictures";

type Pt = [number, number];

const KINDS = ["sheep", "duck", "cow", "pig"] as const;

/** Which animal is seen, in the words that fit, and never how many. */
function describeAnimals(p: { kind: string; count: number; label: string }): string {
    const one = p.count === 1;
    const look =
        p.kind === "duck"
            ? one
                ? "yellow with an orange beak"
                : "each yellow with an orange beak"
            : p.kind === "cow"
              ? one
                  ? "white with dark patches and four legs"
                  : "each white with dark patches and four legs"
              : p.kind === "pig"
                ? one
                    ? "pink with a curly tail"
                    : "each pink with a curly tail"
                : one
                  ? "a cloud of fleece on four legs"
                  : "each a cloud of fleece on four legs";
    const who =
        p.kind === "duck"
            ? one
                ? "A duck"
                : "Ducks"
            : p.kind === "cow"
              ? one
                  ? "A cow"
                  : "Cows"
              : p.kind === "pig"
                ? one
                    ? "A pig"
                    : "Pigs"
                : one
                  ? "A sheep"
                  : "Sheep";
    return `${who} standing ${one ? "" : "in a line "}on a strip of grass, ${look}${p.label ? ", with a label under them" : ""}.`;
}

function animal<G>(c: Ctx<G>, kind: string, x: number, base: number, s = 1): void {
    const { pen, g } = c,
        w = 1.7 * U * s,
        h = 1.1 * U * s;
    // the reading pictures' pig, a little larger, so a field of pigs stands with the sheep and the cows
    if (kind === "pig") {
        critter(c, "pig", x, base, 1.2 * s);
        return;
    }
    if (kind === "duck") {
        pen.ellipse(g, x, base - h * 0.7, w * 1.2, h * 1.1, "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        pen.circle(g, x + w * 0.5, base - h * 1.7, h * 0.85, "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        pen.polygon(
            g,
            [
                [x + w * 0.85, base - h * 1.75],
                [x + w * 1.3, base - h * 1.6],
                [x + w * 0.85, base - h * 1.45],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.2 },
        );
        pen.circle(
            g,
            x + w * 0.55,
            base - h * 1.85,
            3.5 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        for (const dx of [-0.2, 0.3])
            pen.line(g, x + dx * w, base - h * 0.1, x + dx * w, base, "pencil", {
                strokeWidth: 1.4,
                stroke: c.t.tang,
            });
        return;
    }
    if (kind === "cow") {
        pen.path(
            g,
            roundedRect(x - w, base - h * 1.9, w * 2, h * 1.3, 12 * s),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        for (const [dx, dy] of [
            [-0.45, -1.5],
            [0.35, -1.2],
        ] as const) {
            pen.ellipse(
                g,
                x + dx * w,
                base + dy * h,
                w * 0.5,
                h * 0.45,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
                { strokeWidth: 1 },
            );
        }
        pen.circle(g, x - w * 1.05, base - h * 2.1, h * 0.8, "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        pen.circle(
            g,
            x - w * 1.25,
            base - h * 2.2,
            3.5 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        for (const dx of [-0.7, -0.2, 0.3, 0.75])
            pen.line(g, x + dx * w, base - h * 0.6, x + dx * w, base, "pencil", {
                strokeWidth: 2,
                stroke: c.t.ink,
            });
        return;
    }
    // A sheep: a cloud of fleece on four legs, which is the outline a child draws for one.
    const bumps = 7;
    const pts: Pt[] = Array.from({ length: bumps }, (_, i) => {
        const t = (i / bumps) * Math.PI * 2;
        return [x + w * Math.cos(t), base - h * 1.2 + h * 0.95 * Math.sin(t)];
    });
    pen.polygon(g, pts, "doodle", pen.fill("card"), { strokeWidth: 2 });
    pen.circle(
        g,
        x - w * 0.95,
        base - h * 1.5,
        h * 0.8,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.6 },
    );
    pen.circle(
        g,
        x - w * 1.15,
        base - h * 1.6,
        3.2 * s,
        "ruler",
        { fill: c.t.card, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );
    for (const dx of [-0.55, -0.1, 0.35, 0.75])
        pen.line(g, x + dx * w, base - h * 0.45, x + dx * w, base, "pencil", { strokeWidth: 2 });
}

export const animals = defineDrawing({
    id: "animals",
    family: "animals",
    title: "Animals in a field",
    group: "Props",
    about: "Sheep, ducks, cows or pigs standing on one line, so they can be counted and so legs can be counted too. Four legs each is the times table a child will actually check by looking.",
    params: { kind: "sheep", count: 4, label: "" },
    settings: {
        kind: { kind: "one of", of: KINDS },
        count: { kind: "whole", min: 1, max: 8 },
        label: { kind: "text", most: 20 },
    },
    takes: [
        { label: "Four sheep", params: { kind: "sheep", count: 4, label: "" } },
        { label: "Three ducks", params: { kind: "duck", count: 3, label: "" } },
        { label: "Two cows, labelled", params: { kind: "cow", count: 2, label: "in the field" } },
        { label: "Six sheep", params: { kind: "sheep", count: 6, label: "" } },
        { label: "Three pigs", params: { kind: "pig", count: 3, label: "" } },
    ],
    box: (p) => ({ w: p.count * 4 + 2, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 6 * U,
            a: RawAnchors = {};
        for (let i = 0; i < p.count; i++) {
            const x = 2.6 * U + i * 4 * U;
            animal(c, p.kind, x, base - (i % 2) * 0.3 * U);
            a[`animal(${i})`] = [x, base - 3.2 * U, "up"];
        }
        pen.line(g, 0.4 * U, base, (p.count * 4 + 1.6) * U, base, "pencil", { strokeWidth: 2.2 });
        for (let k = 0; k < p.count * 2; k++) {
            const gx = U + k * 2 * U;
            pen.line(g, gx, base, gx - 5, base - 12, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t.ok,
            });
            pen.line(g, gx + 4, base, gx + 9, base - 10, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t.ok,
            });
        }
        if (p.label) say(c, ((p.count * 4 + 2) * U) / 2, 7.6 * U, p.label, 16);
        return a;
    },
    describe: (p) => describeAnimals(p),
    motion: { body: { is: "breathe", amt: 0.03 } },
});
