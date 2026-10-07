import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "../outdoors/wash";

const PLACES = [
    "meadow",
    "street",
    "playroom",
    "orchard",
    "castle",
    "snow",
    "space",
    "sea",
    "paper",
] as const;
type Place = (typeof PLACES)[number];
const placeOf = (v: string): Place => PLACES.find((p) => p === v) ?? "meadow";

/**
 * The frame's measures in squares from its top left: the sign the target is written on, and the field
 * the ball plays in, open at its foot where the tray is. The game plays on these and the drawing draws
 * them, so the two cannot disagree.
 */
export const KNOCKFRAME = {
    w: 24,
    h: 37,
    field: { x: 1, y: 4, w: 22, h: 33 },
    /** The sign over the field, in the frame's squares. */
    sign: { x: 1, y: 0.3, w: 22, h: 3.2 },
} as const;

const F = KNOCKFRAME.field;

const WORDS: Record<Place, string> = {
    meadow: "a summer sky over a grassy meadow",
    street: "a pale town sky over a pavement",
    playroom: "a playroom wall over a wooden floor",
    orchard: "a sky over an orchard's grass",
    castle: "a high blue sky over a hillside",
    snow: "a winter sky with falling snow over snowy ground",
    space: "a pale night sky with stars",
    sea: "a sky over the sea's waves",
    paper: "plain squared paper",
};

export const knockFrame = defineDrawing<{ place: string }>({
    id: "knockframe",
    family: "sport",
    title: "Knock-down frame",
    group: "Structures",
    about: "The tall wooden frame a knock-down game is played in: a post each side and a beam across the top that a ball bounces off, a sign over it for the target, and the field open at its foot where the tray catches the ball. The place sets the picture behind.",
    params: { place: "meadow" },
    settings: { place: { kind: "one of", of: PLACES } },
    takes: [
        { label: "The meadow", params: { place: "meadow" } },
        { label: "The playroom", params: { place: "playroom" } },
        { label: "The snow", params: { place: "snow" } },
        { label: "Out in space", params: { place: "space" } },
        { label: "The sea", params: { place: "sea" } },
    ],
    box: () => ({ w: KNOCKFRAME.w, h: KNOCKFRAME.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            place = placeOf(p.place),
            x0 = F.x * U,
            y0 = F.y * U,
            x1 = (F.x + F.w) * U,
            y1 = (F.y + F.h) * U,
            field = `M${x0} ${y0}H${x1}V${y1}H${x0}Z`,
            at = (x: number, y: number): [number, number] => [(F.x + x) * U, (F.y + y) * U],
            band = (from: number, to: number) =>
                `M${x0} ${(F.y + from) * U}H${x1}V${(F.y + to) * U}H${x0}Z`,
            soft = c.paper ? c.t.ink : c.t["ink-soft"];
        pen.path(g, field, "pencil", pen.fill("card", "solid"), { strokeWidth: 0, stroke: "none" });
        const sky = place === "space" ? 0.26 : place === "playroom" || place === "paper" ? 0 : 0.12;
        if (sky > 0) wash(c, band(0, 31), "sky", sky, place === "space");
        if (place === "playroom") {
            wash(c, band(0, 31), "glow", 0.12, false);
            for (let x = 1; x < F.w; x += 3)
                pen.line(g, ...at(x, 0.2), ...at(x, 30.8), "pencil", {
                    strokeWidth: 0.5,
                    stroke: soft,
                    roughness: 0.2,
                });
        }
        if (place === "space" || place === "snow")
            for (let i = 0; i < 26; i++) {
                const [sx, sy] = at(0.6 + hash(i, 3) * (F.w - 1.2), 0.6 + hash(i, 5) * 26);
                if (place === "space")
                    pen.path(
                        g,
                        `M${sx - 0.2 * U} ${sy}H${sx + 0.2 * U}M${sx} ${sy - 0.2 * U}V${sy + 0.2 * U}`,
                        "pencil",
                        null,
                        {
                            strokeWidth: 0.8,
                            stroke: c.paper ? c.t.ink : c.t.glow,
                            roughness: 0.1,
                        },
                    );
                else
                    pen.circle(g, sx, sy, 0.22 * U, "pencil", pen.fill("card", "solid"), {
                        strokeWidth: 0.5,
                        stroke: soft,
                        roughness: 0.1,
                    });
            }
        if (place === "meadow" || place === "orchard" || place === "castle")
            if (!c.paper)
                plain(c, {
                    kind: "circle",
                    cx: x1 - 2.4 * U,
                    cy: y0 + 2.4 * U,
                    r: 1.4 * U,
                    fill: c.t.glow,
                    opacity: 0.45,
                });
        // the ground under the tray, its own colour in each place
        const ground: Record<Place, "mint" | "tang" | "sky" | "glow" | null> = {
            meadow: "mint",
            street: null,
            playroom: "tang",
            orchard: "mint",
            castle: "mint",
            snow: null,
            space: null,
            sea: "sky",
            paper: null,
        };
        const tone = ground[place];
        if (tone) wash(c, band(31, F.h), tone, place === "sea" ? 0.35 : 0.3, place === "sea");
        if (place === "sea")
            for (const y of [31.6, 32.4])
                for (let x = 0.4 + (y > 32 ? 1 : 0); x + 1.4 < F.w; x += 2.6) {
                    const [wx, wy] = at(x, y);
                    pen.path(
                        g,
                        `M${wx} ${wy}Q${wx + 0.7 * U} ${wy - 0.4 * U} ${wx + 1.4 * U} ${wy}`,
                        "pencil",
                        null,
                        {
                            strokeWidth: 0.8,
                            stroke: c.paper ? c.t.ink : c.t.sky,
                        },
                    );
                }
        if (place === "snow" || place === "street")
            pen.line(g, ...at(0, 31.2), ...at(F.w, 31.2), "pencil", {
                strokeWidth: 0.8,
                stroke: soft,
                roughness: 0.3,
            });
        // the posts and the beam the ball bounces off, inset by the pencil's wobble so they stay in the box
        for (const x of [0.15, F.x + F.w])
            pen.rect(
                g,
                x * U,
                (F.y - 0.6) * U,
                (F.x - 0.15) * U,
                (F.h + 0.45) * U,
                "pencil",
                pen.fill("tang", "solid"),
                {
                    strokeWidth: 1.6,
                    roughness: 0.35,
                },
            );
        pen.rect(
            g,
            0.15 * U,
            (F.y - 0.7) * U,
            (KNOCKFRAME.w - 0.3) * U,
            0.7 * U,
            "pencil",
            pen.fill("tang", "solid"),
            {
                strokeWidth: 1.6,
                roughness: 0.35,
            },
        );
        const s = KNOCKFRAME.sign;
        pen.rect(
            g,
            (s.x + 0.2) * U,
            s.y * U,
            (s.w - 0.4) * U,
            s.h * U,
            "pencil",
            pen.fill("card", "solid"),
            {
                strokeWidth: 1.3,
                roughness: 0.25,
            },
        );
        for (const x of [s.x + 2, s.x + s.w - 2])
            pen.line(g, x * U, (s.y + s.h) * U, x * U, (F.y - 0.7) * U, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t.ink,
                roughness: 0.2,
            });
        return {
            sign: [(s.x + s.w / 2) * U, (s.y + s.h / 2) * U, "up"],
            field: [(F.x + F.w / 2) * U, (F.y + F.h / 2) * U, "up"],
        };
    },
    describe: (p) =>
        `A tall wooden frame with posts, a top beam and a sign for the target, open at its foot, with ${WORDS[placeOf(p.place)]} behind.`,
    motion: { still: "The frame stands still around the game." },
});
