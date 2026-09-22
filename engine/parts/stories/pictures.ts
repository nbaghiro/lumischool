// The small pictures the stories draw with: the reading cast (seven animals and a child that stand
// on a box, in a boat or beside a house), the icons a story map and a stamp carry, the pictures a
// child pins up, and the caption lines under them. Shared by the stories, the animals and the
// places, and listed as construction in the catalogue suite.
import { starPoints } from "../../ink/pen";
import { type Ctx } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { drawProp } from "../props";
import { faceAt } from "../speech";

/** The colours a party's balloons, a child's pictures and a library's books take, in turn. */
export const PARTY: Marker[] = ["berry", "sky", "glow", "mint", "tang"];

/** A prop's name as a description says it: several of them, or one. */
export const named = (item: string, n = 2): string => {
    const word = item === "circle" ? "round counter" : item;
    return n === 1 ? `${/^[aeiou]/.test(word) ? "an" : "a"} ${word}` : `${word}s`;
};

export const pip = <G>(c: Ctx<G>, x: number, y: number, d = 5) =>
    c.pen.circle(
        c.g,
        x,
        y,
        d,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );

export const CRITTERS = ["cat", "dog", "hen", "duck", "fox", "pig", "rabbit"] as const;

/** One animal standing or sitting on `base`, centred on x. At s = 1 it is about two and a half squares tall. */
export function critter<G>(c: Ctx<G>, kind: string, x: number, base: number, s = 1, dir = 1): void {
    const { pen, g } = c,
        X = (n: number) => x + dir * n * s,
        Y = (n: number) => base - n * s,
        w = Math.max(1, 1.8 * s);
    const eye = (ax: number, ay: number) => pip(c, X(ax), Y(ay), Math.max(3, 4.5 * s));
    if (kind === "cat") {
        pen.curve(
            g,
            [
                [X(-13), Y(7)],
                [X(-28), Y(12)],
                [X(-25), Y(30)],
                [X(-17), Y(34)],
            ],
            "pencil",
            { strokeWidth: w * 1.4 },
        );
        pen.ellipse(
            g,
            X(-2),
            Y(14),
            34 * s,
            28 * s,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 * s + 1 }),
            { strokeWidth: w },
        );
        pen.polygon(
            g,
            [
                [X(3), Y(38)],
                [X(5), Y(52)],
                [X(12), Y(42)],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: w },
        );
        pen.polygon(
            g,
            [
                [X(15), Y(42)],
                [X(21), Y(52)],
                [X(22), Y(37)],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: w },
        );
        pen.circle(
            g,
            X(12),
            Y(33),
            25 * s,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 * s + 1 }),
            { strokeWidth: w },
        );
        eye(15, 35);
        pen.circle(g, X(22), Y(31), 4 * s, "ruler", pen.fill("berry"), { strokeWidth: 0.6 });
        for (const dy of [-2, 3])
            pen.line(g, X(22), Y(29), X(32), Y(29 + dy), "pencil", {
                strokeWidth: 0.7,
                stroke: c.t["ink-soft"],
            });
        for (const dx of [2, 9])
            pen.line(g, X(dx), Y(6), X(dx), Y(0), "pencil", { strokeWidth: w });
    } else if (kind === "dog") {
        const coat = pen.fill("tang", "hachure", { hachureGap: 4 * s + 1, fillWeight: 0.9 });
        pen.curve(
            g,
            [
                [X(-19), Y(26)],
                [X(-27), Y(34)],
                [X(-29), Y(42)],
            ],
            "pencil",
            { strokeWidth: w * 1.5 },
        );
        for (const lx of [-14, -7, 8, 14])
            pen.line(g, X(lx), Y(16), X(lx), Y(0), "pencil", { strokeWidth: w * 2.2 });
        pen.ellipse(g, X(0), Y(23), 42 * s, 20 * s, "pencil", coat, { strokeWidth: w });
        pen.circle(g, X(19), Y(34), 21 * s, "pencil", coat, { strokeWidth: w });
        pen.ellipse(g, X(28), Y(30), 13 * s, 9 * s, "pencil", pen.fill("card"), {
            strokeWidth: w * 0.8,
        });
        pip(c, X(34), Y(31), Math.max(3, 5 * s));
        pen.polygon(
            g,
            [
                [X(12), Y(44)],
                [X(7), Y(32)],
                [X(12), Y(29)],
                [X(17), Y(42)],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: w * 0.8 },
        );
        eye(21, 37);
        pen.arc(g, X(13), Y(25), 14 * s, 6 * s, 0.2, Math.PI - 0.2, "pencil", {
            strokeWidth: w * 1.6,
            stroke: c.t.berry,
        });
    } else if (kind === "hen") {
        for (const k of [0, 1, 2])
            pen.curve(
                g,
                [
                    [X(-12), Y(14 + k * 4)],
                    [X(-22 - k * 2), Y(22 + k * 6)],
                    [X(-15 - k * 3), Y(32 + k * 4)],
                ],
                "pencil",
                { strokeWidth: w * 1.3 },
            );
        pen.ellipse(g, X(-1), Y(16), 32 * s, 26 * s, "pencil", pen.fill("card"), {
            strokeWidth: w * 1.1,
        });
        pen.arc(g, X(-3), Y(17), 18 * s, 12 * s, 0.2, Math.PI - 0.4, "pencil", {
            strokeWidth: w * 0.8,
        });
        for (const k of [0, 1, 2])
            pen.circle(g, X(8 + k * 4), Y(41 - (k % 2) * 1.5), 6 * s, "pencil", pen.fill("berry"), {
                strokeWidth: 0.7,
            });
        pen.circle(g, X(12), Y(31), 17 * s, "pencil", pen.fill("card"), { strokeWidth: w * 1.1 });
        pen.polygon(
            g,
            [
                [X(19), Y(33)],
                [X(27), Y(30)],
                [X(19), Y(28)],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: w * 0.8 },
        );
        pen.ellipse(g, X(18), Y(25), 4 * s, 6 * s, "pencil", pen.fill("berry"), {
            strokeWidth: 0.6,
        });
        eye(14, 33);
        for (const lx of [-3, 5])
            pen.line(g, X(lx), Y(4), X(lx), Y(0), "pencil", {
                strokeWidth: w * 1.2,
                stroke: c.t.tang,
            });
    } else if (kind === "duck") {
        pen.ellipse(g, X(-2), Y(12), 36 * s, 20 * s, "pencil", pen.fill("glow"), {
            strokeWidth: w,
        });
        pen.polygon(
            g,
            [
                [X(-18), Y(14)],
                [X(-26), Y(22)],
                [X(-15), Y(19)],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: w * 0.8 },
        );
        pen.circle(g, X(12), Y(28), 17 * s, "pencil", pen.fill("glow"), { strokeWidth: w });
        pen.polygon(
            g,
            [
                [X(19), Y(29)],
                [X(29), Y(26)],
                [X(19), Y(24)],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: w * 0.8 },
        );
        pen.arc(g, X(-4), Y(12), 18 * s, 10 * s, 0.2, Math.PI - 0.2, "pencil", {
            strokeWidth: w * 0.8,
        });
        eye(14, 30);
        for (const lx of [-4, 4])
            pen.line(g, X(lx), Y(3), X(lx), Y(0), "pencil", {
                strokeWidth: w * 1.2,
                stroke: c.t.tang,
            });
    } else if (kind === "fox") {
        const coat = pen.fill("tang");
        pen.path(
            g,
            `M${X(-16)} ${Y(20)}Q${X(-40)} ${Y(30)} ${X(-40)} ${Y(14)}Q${X(-30)} ${Y(8)} ${X(-16)} ${Y(14)}Z`,
            "pencil",
            coat,
            { strokeWidth: w },
        );
        pen.circle(g, X(-37), Y(17), 8 * s, "pencil", pen.fill("card"), { strokeWidth: w * 0.7 });
        for (const lx of [-11, -4, 8, 13])
            pen.line(g, X(lx), Y(14), X(lx), Y(0), "pencil", { strokeWidth: w * 1.6 });
        pen.ellipse(g, X(0), Y(19), 36 * s, 17 * s, "pencil", coat, { strokeWidth: w });
        pen.polygon(
            g,
            [
                [X(9), Y(38)],
                [X(12), Y(48)],
                [X(16), Y(40)],
            ],
            "pencil",
            coat,
            { strokeWidth: w * 0.8 },
        );
        pen.polygon(
            g,
            [
                [X(17), Y(40)],
                [X(23), Y(48)],
                [X(24), Y(37)],
            ],
            "pencil",
            coat,
            { strokeWidth: w * 0.8 },
        );
        pen.polygon(
            g,
            [
                [X(8), Y(36)],
                [X(24), Y(38)],
                [X(36), Y(27)],
                [X(22), Y(22)],
                [X(10), Y(26)],
            ],
            "pencil",
            coat,
            { strokeWidth: w },
        );
        pen.polygon(
            g,
            [
                [X(22), Y(22)],
                [X(36), Y(27)],
                [X(22), Y(27)],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: w * 0.6 },
        );
        pip(c, X(36), Y(27), Math.max(3, 4.5 * s));
        eye(20, 33);
    } else if (kind === "pig") {
        const skin = pen.fill("berry", "hachure", { hachureGap: 5 * s + 1, fillWeight: 0.6 });
        pen.curve(
            g,
            [
                [X(-19), Y(22)],
                [X(-26), Y(26)],
                [X(-22), Y(31)],
                [X(-19), Y(26)],
                [X(-24), Y(22)],
            ],
            "pencil",
            { strokeWidth: w },
        );
        for (const lx of [-12, -5, 7, 13])
            pen.line(g, X(lx), Y(12), X(lx), Y(0), "pencil", { strokeWidth: w * 2.4 });
        pen.ellipse(g, X(-1), Y(19), 40 * s, 26 * s, "pencil", skin, { strokeWidth: w });
        pen.circle(g, X(17), Y(25), 22 * s, "pencil", skin, { strokeWidth: w });
        pen.polygon(
            g,
            [
                [X(10), Y(33)],
                [X(12), Y(42)],
                [X(18), Y(35)],
            ],
            "pencil",
            skin,
            { strokeWidth: w * 0.8 },
        );
        pen.ellipse(g, X(28), Y(23), 9 * s, 11 * s, "pencil", pen.fill("card"), {
            strokeWidth: w * 0.8,
        });
        for (const dy of [-2, 2]) pip(c, X(28), Y(23 + dy), Math.max(2, 2.5 * s));
        eye(19, 29);
    } else {
        const fur = pen.fill("ink-soft", "hachure", { hachureGap: 4 * s + 1, fillWeight: 0.6 });
        pen.circle(g, X(-15), Y(12), 10 * s, "pencil", pen.fill("card"), { strokeWidth: w * 0.8 });
        pen.ellipse(g, X(-2), Y(14), 30 * s, 26 * s, "pencil", fur, { strokeWidth: w });
        for (const [ex, tilt] of [
            [7, -3],
            [13, 3],
        ] as const)
            pen.ellipse(g, X(ex + tilt), Y(48), 7 * s, 22 * s, "pencil", fur, {
                strokeWidth: w * 0.9,
            });
        pen.circle(g, X(10), Y(31), 18 * s, "pencil", fur, { strokeWidth: w });
        pen.circle(g, X(18), Y(29), 4 * s, "ruler", pen.fill("berry"), { strokeWidth: 0.6 });
        eye(13, 33);
        pen.line(g, X(6), Y(4), X(6), Y(0), "pencil", { strokeWidth: w * 1.3 });
    }
}

/**
 * A child standing on `base`, centred on x, with a face that shows `mood`. `look` picks the hair
 * and the shirt, so two children in one picture can be told apart in black and white. About five
 * squares tall at s = 1.
 */
export function kid<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    s: number,
    look: number,
    mood: string,
    dir = 1,
): { head: [number, number]; hand: [number, number] } {
    const { pen, g } = c,
        u = U * s,
        shirts: Marker[] = ["sky", "berry", "mint", "tang"];
    const hip = base - 2 * u,
        shoulder = base - 3.5 * u,
        headY = base - 4.4 * u,
        r = 0.95 * u;
    for (const sx of [-0.35, 0.35])
        pen.line(g, x + sx * u, hip, x + sx * u * 1.1, base, "pencil", {
            strokeWidth: 2.2 * s + 0.4,
        });
    const skirt = look % 2 === 1;
    pen.path(
        g,
        skirt
            ? `M${x - 0.55 * u} ${shoulder}H${x + 0.55 * u}L${x + 0.95 * u} ${hip + 0.2 * u}H${x - 0.95 * u}Z`
            : `M${x - 0.6 * u} ${shoulder}H${x + 0.6 * u}L${x + 0.7 * u} ${hip}H${x - 0.7 * u}Z`,
        "pencil",
        pen.fill(shirts[look % shirts.length], "solid", { hachureGap: 6 }),
        { strokeWidth: 1.8 * s + 0.3 },
    );
    const hand: [number, number] = [x + dir * 1.15 * u, shoulder + 1.3 * u];
    pen.curve(
        g,
        [[x + dir * 0.55 * u, shoulder + 0.2 * u], [x + dir * 0.95 * u, shoulder + 0.7 * u], hand],
        "pencil",
        { strokeWidth: 1.8 * s + 0.3 },
    );
    pen.curve(
        g,
        [
            [x - dir * 0.55 * u, shoulder + 0.2 * u],
            [x - dir * 0.85 * u, shoulder + 0.8 * u],
            [x - dir * 0.8 * u, shoulder + 1.4 * u],
        ],
        "pencil",
        { strokeWidth: 1.8 * s + 0.3 },
    );
    faceAt(c, x, headY, r, mood, [0, 1, 2, 3][look % 4]);
    // The fourth look is a grandparent: a bun on top and glasses, so an old face and a child's differ.
    if (look % 4 === 3) {
        pen.circle(
            g,
            x,
            headY - r * 1.05,
            r * 0.7,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        for (const sx of [-1, 1])
            pen.circle(g, x + sx * r * 0.36, headY + r * 0.02, r * 0.5, "ruler", null, {
                strokeWidth: 1.3,
            });
        pen.line(g, x - r * 0.11, headY, x + r * 0.11, headY, "ruler", { strokeWidth: 1.2 });
    }
    return { head: [x, headY - r * (look % 4 === 3 ? 1.4 : 1)], hand };
}

export const ICONS = [
    "cottage",
    "gate",
    "bridge",
    "boat",
    "tree",
    "cloud",
    "sun",
    "puddle",
    "key",
    "cake",
    "lantern",
    "lighthouse",
    "tent",
    "star",
    "moon",
    "hill",
    "nest",
    "ball",
    "apple",
    "girl",
    "boy",
    ...CRITTERS,
] as const;

/** A small picture about three squares tall, standing on `base` and centred on x. */
export function icon<G>(c: Ctx<G>, kind: string, x: number, base: number): void {
    const { pen, g } = c;
    if ((CRITTERS as readonly string[]).includes(kind)) {
        critter(c, kind, x, base, 0.85);
        return;
    }
    if (kind === "ball" || kind === "apple") {
        drawProp(c, kind, x, base - 0.8 * U, 34);
        return;
    }
    if (kind === "girl" || kind === "boy") {
        kid(c, x, base, 0.62, kind === "girl" ? 1 : 0, "happy");
        return;
    }
    if (kind === "cottage") {
        pen.rect(g, x - 1.4 * U, base - 1.8 * U, 2.8 * U, 1.8 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.6,
        });
        pen.polygon(
            g,
            [
                [x - 1.8 * U, base - 1.8 * U],
                [x, base - 3.2 * U],
                [x + 1.8 * U, base - 1.8 * U],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.rect(g, x - 0.3 * U, base - 1.1 * U, 0.6 * U, 1.1 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.2,
        });
        pen.rect(g, x + 0.6 * U, base - 1.4 * U, 0.6 * U, 0.6 * U, "ruler", pen.fill("glow"), {
            strokeWidth: 1,
        });
    } else if (kind === "gate") {
        for (const s of [-1, 1])
            pen.rect(
                g,
                x + s * 1.4 * U - 0.2 * U,
                base - 2.2 * U,
                0.4 * U,
                2.2 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.4 },
            );
        for (const y of [1.7, 1.1, 0.5])
            pen.line(g, x - 1.2 * U, base - y * U, x + 1.2 * U, base - y * U, "pencil", {
                strokeWidth: 1.8,
            });
        pen.line(g, x - 1.2 * U, base - 0.5 * U, x + 1.2 * U, base - 1.7 * U, "pencil", {
            strokeWidth: 1.4,
        });
    } else if (kind === "bridge") {
        pen.path(
            g,
            `M${x - 1.9 * U} ${base}V${base - 1.6 * U}H${x + 1.9 * U}V${base}H${x + 1 * U}Q${x} ${base - 1.2 * U} ${x - 1 * U} ${base}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.curve(
            g,
            [
                [x - 0.9 * U, base - 0.15 * U],
                [x, base - 0.35 * U],
                [x + 0.9 * U, base - 0.15 * U],
            ],
            "pencil",
            { strokeWidth: 1.2, stroke: c.t.sky },
        );
    } else if (kind === "boat") {
        pen.line(g, x, base - 0.6 * U, x, base - 3 * U, "ruler", { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [x + 3, base - 2.9 * U],
                [x + 3, base - 0.8 * U],
                [x + 1.4 * U, base - 0.8 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.3 },
        );
        pen.path(
            g,
            `M${x - 1.7 * U} ${base - 0.7 * U}H${x + 1.7 * U}Q${x + 1.4 * U} ${base} ${x + 1 * U} ${base}H${x - 1 * U}Q${x - 1.4 * U} ${base} ${x - 1.7 * U} ${base - 0.7 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.6 },
        );
    } else if (kind === "tree") {
        pen.rect(
            g,
            x - 0.2 * U,
            base - 1.4 * U,
            0.4 * U,
            1.4 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.3 },
        );
        pen.circle(g, x, base - 2.2 * U, 2.4 * U, "doodle", pen.fill("mint"), { strokeWidth: 1.6 });
    } else if (kind === "cloud") {
        for (const [dx, dy, d] of [
            [-0.8, -2.1, 1.4],
            [0.1, -2.6, 1.7],
            [0.9, -2.1, 1.3],
        ] as const)
            pen.circle(g, x + dx * U, base + dy * U, d * U, "doodle", pen.fill("card"), {
                strokeWidth: 1.4,
            });
        for (const dx of [-0.8, 0, 0.8])
            pen.line(g, x + dx * U, base - 1.2 * U, x + dx * U - 4, base - 0.3 * U, "pencil", {
                strokeWidth: 1.4,
                stroke: c.t.sky,
            });
    } else if (kind === "sun") {
        pen.circle(g, x, base - 1.6 * U, 1.6 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.5 });
        for (let k = 0; k < 8; k++) {
            const t = (k / 8) * Math.PI * 2;
            pen.line(
                g,
                x + Math.cos(t) * 1.1 * U,
                base - 1.6 * U + Math.sin(t) * 1.1 * U,
                x + Math.cos(t) * 1.5 * U,
                base - 1.6 * U + Math.sin(t) * 1.5 * U,
                "pencil",
                { strokeWidth: 1.3 },
            );
        }
    } else if (kind === "puddle") {
        pen.ellipse(
            g,
            x,
            base - 0.4 * U,
            3.6 * U,
            0.8 * U,
            "doodle",
            pen.fill("sky", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.4 },
        );
        for (const [dx, d] of [
            [-0.6, 0.8],
            [0.7, 0.6],
        ] as const)
            pen.ellipse(g, x + dx * U, base - 0.45 * U, d * U, 0.25 * U, "pencil", null, {
                strokeWidth: 0.9,
            });
    } else if (kind === "key") {
        pen.circle(g, x - 0.9 * U, base - 1.4 * U, 1.1 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.5,
        });
        pen.circle(g, x - 0.9 * U, base - 1.4 * U, 0.4 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1,
        });
        pen.line(g, x - 0.35 * U, base - 1.4 * U, x + 1.5 * U, base - 1.4 * U, "pencil", {
            strokeWidth: 2.4,
        });
        for (const dx of [0.8, 1.3])
            pen.line(g, x + dx * U, base - 1.4 * U, x + dx * U, base - 0.9 * U, "pencil", {
                strokeWidth: 2,
            });
    } else if (kind === "cake") {
        pen.rect(
            g,
            x - 1.3 * U,
            base - 1.4 * U,
            2.6 * U,
            1.4 * U,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.5 },
        );
        pen.ellipse(g, x, base - 1.4 * U, 2.6 * U, 0.6 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.3,
        });
        pen.rect(g, x - 3, base - 2.3 * U, 6, 0.8 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1,
        });
        pen.ellipse(g, x, base - 2.5 * U, 6, 9, "pencil", pen.fill("glow"), { strokeWidth: 0.8 });
    } else if (kind === "lantern") {
        pen.rect(g, x - 0.7 * U, base - 2.3 * U, 1.4 * U, 1.8 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.5,
        });
        pen.polygon(
            g,
            [
                [x - 0.9 * U, base - 2.3 * U],
                [x, base - 3 * U],
                [x + 0.9 * U, base - 2.3 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.3 },
        );
        pen.rect(
            g,
            x - 0.9 * U,
            base - 0.5 * U,
            1.8 * U,
            0.5 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.3 },
        );
    } else if (kind === "lighthouse") {
        pen.polygon(
            g,
            [
                [x - 0.6 * U, base - 2.4 * U],
                [x + 0.6 * U, base - 2.4 * U],
                [x + 0.9 * U, base],
                [x - 0.9 * U, base],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.5 },
        );
        pen.polygon(
            g,
            [
                [x - 0.7 * U, base - 1.6 * U],
                [x + 0.7 * U, base - 1.6 * U],
                [x + 0.8 * U, base - 0.8 * U],
                [x - 0.8 * U, base - 0.8 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.1 },
        );
        pen.rect(g, x - 0.45 * U, base - 3.1 * U, 0.9 * U, 0.7 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.3,
        });
    } else if (kind === "tent") {
        pen.polygon(
            g,
            [
                [x - 1.8 * U, base],
                [x, base - 2.6 * U],
                [x + 1.8 * U, base],
            ],
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [x - 0.5 * U, base],
                [x, base - 1.3 * U],
                [x + 0.5 * U, base],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
    } else if (kind === "star") {
        pen.polygon(g, starPoints(x, base - 1.5 * U, 1.4 * U), "pencil", pen.fill("glow"), {
            strokeWidth: 1.5,
        });
    } else if (kind === "moon") {
        pen.path(
            g,
            `M${x + 0.3 * U} ${base - 3 * U}A${1.4 * U} ${1.4 * U} 0 1 0 ${x + 0.3 * U} ${base - 0.2 * U}A${1 * U} ${1.2 * U} 0 1 1 ${x + 0.3 * U} ${base - 3 * U}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.5 },
        );
    } else if (kind === "hill") {
        pen.path(
            g,
            `M${x - 1.9 * U} ${base}Q${x - 0.6 * U} ${base - 3 * U} ${x + 0.4 * U} ${base - 2.6 * U}Q${x + 1.4 * U} ${base - 2.2 * U} ${x + 1.9 * U} ${base}Z`,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
    } else if (kind === "nest") {
        for (const dx of [-0.35, 0.35])
            pen.ellipse(
                g,
                x + dx * U,
                base - 1 * U,
                0.7 * U,
                0.95 * U,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.2 },
            );
        pen.path(
            g,
            `M${x - 1.5 * U} ${base - 0.9 * U}Q${x} ${base + 0.3 * U} ${x + 1.5 * U} ${base - 0.9 * U}Z`,
            "doodle",
            pen.fill("tang", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.5 },
        );
    }
}

/** A small picture a child might pin up, drawn inside a box: a sun, a house, a flower, a fish, a tree, a boat. */
export function kidPicture<G>(
    c: Ctx<G>,
    k: number,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    const { pen, g } = c,
        cx = x + w / 2,
        cy = y + h / 2,
        o = { strokeWidth: 1 };
    switch (k % 6) {
        case 0:
            pen.circle(g, cx, cy, h * 0.5, "pencil", pen.fill("glow"), o);
            for (let i = 0; i < 6; i++) {
                const t = (i / 6) * Math.PI * 2;
                pen.line(
                    g,
                    cx + Math.cos(t) * h * 0.3,
                    cy + Math.sin(t) * h * 0.3,
                    cx + Math.cos(t) * h * 0.44,
                    cy + Math.sin(t) * h * 0.44,
                    "pencil",
                    o,
                );
            }
            break;
        case 1:
            pen.rect(
                g,
                cx - w * 0.25,
                cy - h * 0.05,
                w * 0.5,
                h * 0.4,
                "pencil",
                pen.fill("tang"),
                o,
            );
            pen.polygon(
                g,
                [
                    [cx - w * 0.32, cy - h * 0.05],
                    [cx, cy - h * 0.38],
                    [cx + w * 0.32, cy - h * 0.05],
                ],
                "pencil",
                pen.fill("berry"),
                o,
            );
            break;
        case 2:
            for (let i = 0; i < 5; i++) {
                const t = (i / 5) * Math.PI * 2;
                pen.circle(
                    g,
                    cx + Math.cos(t) * h * 0.18,
                    cy - h * 0.08 + Math.sin(t) * h * 0.18,
                    h * 0.22,
                    "pencil",
                    pen.fill("berry"),
                    o,
                );
            }
            pen.line(g, cx, cy + h * 0.1, cx, y + h - 3, "pencil", o);
            break;
        case 3:
            pen.ellipse(g, cx, cy, w * 0.5, h * 0.36, "pencil", pen.fill("sky"), o);
            pen.polygon(
                g,
                [
                    [cx - w * 0.24, cy],
                    [cx - w * 0.4, cy - h * 0.15],
                    [cx - w * 0.4, cy + h * 0.15],
                ],
                "pencil",
                pen.fill("sky"),
                o,
            );
            break;
        case 4:
            pen.line(g, cx, y + h - 3, cx, cy, "pencil", { strokeWidth: 1.6, stroke: c.t.tang });
            pen.circle(g, cx, cy - h * 0.1, h * 0.52, "pencil", pen.fill("mint"), o);
            break;
        default:
            pen.path(
                g,
                `M${cx - w * 0.3} ${cy + h * 0.1}H${cx + w * 0.3}L${cx + w * 0.2} ${cy + h * 0.28}H${cx - w * 0.2}Z`,
                "pencil",
                pen.fill("tang"),
                o,
            );
            pen.polygon(
                g,
                [
                    [cx, cy + h * 0.08],
                    [cx, cy - h * 0.35],
                    [cx + w * 0.22, cy + h * 0.02],
                ],
                "pencil",
                pen.fill("card"),
                o,
            );
    }
}

/** Breaks a caption into lines of at most `max` characters, keeping words whole. */
export function lines(s: string, max: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const w of s.split(/\s+/).filter(Boolean)) {
        if (line && `${line} ${w}`.length > max) {
            out.push(line);
            line = w;
        } else line = line ? `${line} ${w}` : w;
    }
    if (line) out.push(line);
    return out;
}
