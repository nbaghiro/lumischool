import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "../outdoors/wash";

const PLACES = ["lawn", "pond", "meadow", "orchard", "dusk"] as const;
type Place = (typeof PLACES)[number];
const placeOf = (v: string): Place => PLACES.find((p) => p === v) ?? "lawn";

interface At {
    x: number;
    y: number;
}

/**
 * The table's measures in squares from its top left: the playfield between the left wall and the
 * shooter lane, the arch over the top, where the ball waits on the plunger, and the line below which
 * it has drained. The game plays on these and the drawing draws them, so the two cannot disagree.
 */
export const PINBALL = {
    w: 22,
    h: 36,
    left: 1,
    right: 19.3,
    lane: 21,
    arch: { x: 11, y: 7.5, rx: 10, ry: 6.5 },
    rest: { x: 20.15, y: 33.85 },
    floor: 34.4,
    drain: 35.6,
    mid: 10.15,
    ball: 0.55,
} as const;

/** The arch over the top, as points from the left wall round to the lane's outer wall. */
function archPoints(): At[] {
    const { x, y, rx, ry } = PINBALL.arch,
        out: At[] = [];
    for (let i = 0; i <= 18; i++) {
        const t = Math.PI + (i / 18) * Math.PI;
        out.push({ x: x + rx * Math.cos(t), y: y + ry * Math.sin(t) });
    }
    return out;
}

const mirror = (p: At): At => ({ x: PINBALL.left + PINBALL.right - p.x, y: p.y });

/** Every fixed wall: the arch, the sides, the lane and its floor, the inlane guides and the slingshots, whose faces kick. */
export function pinballWalls(): { a: At; b: At; kick?: number }[] {
    const P = PINBALL,
        arch = archPoints(),
        walls: { a: At; b: At; kick?: number }[] = [];
    for (let i = 1; i < arch.length; i++) {
        const a = arch[i - 1],
            b = arch[i];
        if (a && b) walls.push({ a, b });
    }
    walls.push(
        { a: { x: P.left, y: P.arch.y }, b: { x: P.left, y: 26 } },
        { a: { x: P.lane, y: P.arch.y }, b: { x: P.lane, y: P.floor } },
        { a: { x: P.right, y: 10.5 }, b: { x: P.right, y: P.floor } },
        { a: { x: P.right, y: P.floor }, b: { x: P.lane, y: P.floor } },
        { a: { x: P.left, y: 26 }, b: { x: 5.4, y: 30.3 } },
        { a: { x: P.right, y: 26 }, b: { x: 14.9, y: 30.3 } },
    );
    const sling: { a: At; b: At; kick?: number }[] = [
        { a: { x: 2.6, y: 21.8 }, b: { x: 4.6, y: 26.4 }, kick: 8 },
        { a: { x: 2.6, y: 21.8 }, b: { x: 2.6, y: 25 } },
        { a: { x: 2.6, y: 25 }, b: { x: 4.6, y: 26.4 } },
    ];
    for (const w of sling) walls.push(w, { ...w, a: mirror(w.a), b: mirror(w.b) });
    return walls;
}

/** The two flippers: where each pivots, how long it is, and the angles it rests at and swings up to, in radians clockwise from the right. */
export function pinballFlippers(): {
    side: "left" | "right";
    x: number;
    y: number;
    len: number;
    r: number;
    rest: number;
    up: number;
}[] {
    const pivot = { x: 5.9, y: 30.7 },
        other = mirror(pivot);
    return [
        { side: "left", ...pivot, len: 3.25, r: 0.42, rest: 0.5, up: -0.42 },
        { side: "right", ...other, len: 3.25, r: 0.42, rest: Math.PI - 0.5, up: Math.PI + 0.42 },
    ];
}

const FIELD: Record<Place, "mint" | "sky" | "glow"> = {
    lawn: "mint",
    pond: "mint",
    meadow: "glow",
    orchard: "mint",
    dusk: "sky",
};

const WORDS: Record<Place, string> = {
    lawn: "a green lawn",
    pond: "a lawn round a small pond",
    meadow: "a yellow meadow",
    orchard: "an orchard lawn",
    dusk: "a pale blue evening lawn",
};

export const pinballTable = defineDrawing<{ place: string }>({
    id: "pinballtable",
    family: "sport",
    title: "Garden pinball table",
    group: "Props",
    about: "A pinball table seen from above with a garden for its playfield: a wooden rim, an arch over the top, a shooter lane down the right, two inlanes and two slingshots. The place sets the lawn.",
    params: { place: "lawn" },
    settings: { place: { kind: "one of", of: PLACES } },
    takes: [
        { label: "A green lawn", params: { place: "lawn" } },
        { label: "A pond in the middle", params: { place: "pond" } },
        { label: "An evening lawn", params: { place: "dusk" } },
    ],
    box: () => ({ w: PINBALL.w, h: PINBALL.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            P = PINBALL,
            place = placeOf(p.place),
            arch = archPoints(),
            pt = (q: At) => `${q.x * U} ${q.y * U}`;
        // the wooden rim, inset by the pencil's wobble so it stays in its box
        pen.rect(
            g,
            0.2 * U,
            0.2 * U,
            (P.w - 0.4) * U,
            (P.h - 0.4) * U,
            "pencil",
            pen.fill("tang"),
            {
                strokeWidth: 1.8,
                roughness: 0.4,
            },
        );
        const field = `M${pt({ x: P.left, y: P.drain })}L${arch.map(pt).join("L")}L${pt({ x: P.lane, y: P.drain })}Z`;
        pen.path(g, field, "pencil", pen.fill("card", "solid"), { strokeWidth: 0, stroke: "none" });
        wash(c, field, FIELD[place], 0.28, true);
        if (place === "pond")
            pen.ellipse(g, 10.2 * U, 18.5 * U, 7 * U, 3.4 * U, "pencil", pen.fill("sky"), {
                strokeWidth: 1,
                stroke: c.t.sky,
                roughness: 0.4,
            });
        // tufts of grass across the lawn, the same each time the table is drawn
        for (let y = 9; y < 29; y += 2.6)
            for (let x = 2.5; x < 18.5; x += 3.1) {
                const k = hash(x, y),
                    tx = (x + k * 1.4) * U,
                    ty = (y + k * 0.9) * U;
                if (
                    place === "pond" &&
                    Math.hypot((tx / U - 10.2) / 3.6, (ty / U - 18.5) / 1.8) < 1
                )
                    continue;
                pen.path(
                    g,
                    `M${tx} ${ty}l${-0.15 * U} ${-0.4 * U}M${tx} ${ty}l${0.02 * U} ${-0.5 * U}M${tx} ${ty}l${0.2 * U} ${-0.38 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 0.8, stroke: c.t.mint },
                );
            }
        // the shooter lane, a plain strip down the right
        pen.rect(
            g,
            P.right * U,
            10.5 * U,
            (P.lane - P.right) * U,
            (P.floor - 10.5) * U,
            "pencil",
            pen.fill("paper", "solid"),
            { strokeWidth: 0, stroke: "none" },
        );
        // the aprons either side of the drain, wood like the rim
        const apron = [
            { x: P.left, y: 26 },
            { x: 5.4, y: 30.3 },
            { x: 6.4, y: 33.6 },
            { x: 6.4, y: P.drain },
            { x: P.left, y: P.drain },
        ];
        for (const side of [apron, apron.map(mirror)])
            pen.polygon(
                g,
                side.map((q): [number, number] => [q.x * U, q.y * U]),
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.2, roughness: 0.3 },
            );
        for (const w of pinballWalls())
            pen.linear(
                g,
                [
                    [w.a.x * U, w.a.y * U],
                    [w.b.x * U, w.b.y * U],
                ],
                "pencil",
                {
                    strokeWidth: w.kick ? 2.6 : 1.8,
                    stroke: w.kick ? c.t.berry : c.t.ink,
                    roughness: 0.3,
                },
            );
        return {
            plunger: [P.rest.x * U, P.floor * U, "down"],
            top: [P.arch.x * U, (P.arch.y - P.arch.ry) * U, "up"],
        };
    },
    describe: (p) =>
        `A garden pinball table seen from above, ${WORDS[placeOf(p.place)]} inside a wooden rim, with an arch over the top, a shooter lane and two slingshots.`,
    motion: { still: "The table stands still; the ball, the flippers and the bumpers move on it." },
});
