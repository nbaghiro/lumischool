import type { Ctx, RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const AQUAROOMS = ["petshop", "tunnel", "classroom"] as const;
type Aquaroom = (typeof AQUAROOMS)[number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const W = 32,
    H = 16;

function fish<G>(c: Ctx<G>, x: number, y: number, s: number, tone: Marker, left = false): void {
    const { pen, g } = c,
        d = left ? -1 : 1;
    pen.path(
        g,
        `M${x + d * s} ${y}Q${x} ${y - s * 0.55} ${x - d * s * 0.6} ${y}Q${x} ${y + s * 0.55} ${x + d * s} ${y}Z`,
        "pencil",
        pen.fill(tone),
        calm(c, 1),
    );
    pen.path(
        g,
        `M${x - d * s * 0.5} ${y}L${x - d * s * 1.1} ${y - s * 0.4}L${x - d * s * 1.1} ${y + s * 0.4}Z`,
        "pencil",
        pen.fill(tone),
        calm(c, 1),
    );
}

function petshop<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    // three rows of little tanks on shelves along the back wall
    for (let row = 0; row < 3; row++) {
        const y = (1.5 + row * 3.6) * U;
        pen.rect(
            g,
            0.5 * U,
            y + 2.8 * U,
            (W - 1) * U,
            0.35 * U,
            "ruler",
            pen.fill("tang", "solid"),
            {
                ...calm(c, 1),
            },
        );
        for (let i = 0; i < 6; i++) {
            const x = (1.2 + i * 5.1) * U;
            pen.rect(
                g,
                x,
                y,
                4.2 * U,
                2.8 * U,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 7 }),
                {
                    ...calm(c, 1.1),
                },
            );
            const tones: Marker[] = ["berry", "glow", "tang", "mint", "sky", "berry"];
            const tone = tones[(i + row) % tones.length] ?? "glow";
            fish(c, x + 1.4 * U, y + 1.2 * U, 0.5 * U, tone);
            fish(c, x + 2.8 * U, y + 1.9 * U, 0.4 * U, tone, true);
        }
    }
    pen.path(
        g,
        roundedRect(11 * U, 12.4 * U, 10 * U, 2.2 * U, 6),
        "ruler",
        pen.fill("card"),
        calm(c, 1.4),
    );
    say(c, 16 * U, 13.9 * U, "Pets and fish", 18);
}

function tunnel<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    // the great window of the tunnel, arched over the walkway, with the sea's fish beyond it
    pen.path(
        g,
        `M${0.5 * U} ${H * U}L${0.5 * U} ${6 * U}Q${0.5 * U} ${0.5 * U} ${(W / 2) * U} ${0.5 * U}Q${(W - 0.5) * U} ${0.5 * U} ${(W - 0.5) * U} ${6 * U}L${(W - 0.5) * U} ${H * U}Z`,
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 8 }),
        calm(c, 2),
    );
    for (const x of [8, 16, 24])
        pen.line(g, x * U, 1.2 * U, x * U, H * U, "ruler", { strokeWidth: 1.6 });
    for (const [x, y, s, tone, left] of [
        [4, 5, 0.7, "glow", false],
        [6, 6, 0.6, "glow", false],
        [5, 7.4, 0.6, "glow", false],
        [20, 4, 0.9, "berry", true],
        [27, 8, 0.7, "tang", true],
        [12, 9, 0.5, "mint", false],
        [13.4, 9.6, 0.5, "mint", false],
    ] as const)
        fish(c, x * U, y * U, s * U, tone, left);
    // a ray gliding over the walkway
    pen.path(
        g,
        `M${17 * U} ${10 * U}Q${19 * U} ${8 * U} ${21 * U} ${10 * U}Q${19 * U} ${11 * U} ${17 * U} ${10 * U}Z`,
        "pencil",
        pen.fill("card"),
        calm(c, 1.2),
    );
    pen.line(g, 21 * U, 10 * U, 23 * U, 11 * U, "pencil", { strokeWidth: 1 });
    pen.rect(
        g,
        0,
        (H - 1.2) * U,
        W * U,
        1.2 * U,
        "ruler",
        pen.fill("ink-soft", "solid"),
        calm(c, 1),
    );
}

function classroom<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.rect(g, 2 * U, 1.5 * U, 14 * U, 7 * U, "ruler", pen.fill("card"), calm(c, 2));
    say(c, 9 * U, 3.6 * U, "Our class fish", 22);
    fish(c, 6.5 * U, 6 * U, 1.1 * U, "glow");
    fish(c, 11.5 * U, 5.6 * U, 0.9 * U, "berry", true);
    pen.rect(
        g,
        19 * U,
        1.5 * U,
        10 * U,
        6 * U,
        "ruler",
        pen.fill("sky", "hachure", { hachureGap: 6 }),
        {
            ...calm(c, 1.6),
        },
    );
    pen.line(g, 24 * U, 1.5 * U, 24 * U, 7.5 * U, "ruler", { strokeWidth: 1.6 });
    pen.line(g, 19 * U, 4.5 * U, 29 * U, 4.5 * U, "ruler", { strokeWidth: 1.6 });
    // children's pictures pinned along the wall
    const tones: Marker[] = ["berry", "glow", "mint", "tang", "sky", "berry", "glow"];
    for (const [i, tone] of tones.entries()) {
        const x = (2 + i * 4) * U;
        pen.rect(g, x, 10 * U, 3 * U, 2.4 * U, "ruler", pen.fill("card"), calm(c, 1));
        fish(c, x + 1.5 * U, 11.2 * U, 0.7 * U, tone, i % 2 === 1);
    }
}

export const aquaroom = defineDrawing<{ place: Aquaroom }>({
    id: "aquaroom",
    family: "places",
    title: "Rooms with fish tanks",
    group: "Structures",
    about: "The rooms behind a fish tank, wide and drawn plainly enough to stand behind one: a pet shop with rows of little tanks on shelves, the tunnel of a big public aquarium with the sea's fish beyond its arched window, and a classroom with a board and the children's pictures.",
    params: { place: "petshop" },
    settings: { place: { kind: "one of", of: AQUAROOMS } },
    takes: [
        { label: "The pet shop", params: { place: "petshop" } },
        { label: "The aquarium tunnel", params: { place: "tunnel" } },
        { label: "A classroom", params: { place: "classroom" } },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p): RawAnchors => {
        if (p.place === "tunnel") tunnel(c);
        else if (p.place === "classroom") classroom(c);
        else petshop(c);
        return { floor: [(W / 2) * U, H * U, "down"] };
    },
    describe: (p) =>
        p.place === "tunnel"
            ? "The tunnel of a big public aquarium, with a great arched window over the walkway and shoals of fish and a ray swimming beyond it."
            : p.place === "classroom"
              ? "A classroom wall with a board about the class fish, a window, and a row of children's pictures of fish pinned below."
              : "The back wall of a pet shop lined with shelves of little fish tanks, each with bright fish, over a sign reading pets and fish.",
    motion: {
        still: "A backdrop stays still behind the tanks, which move in front of it.",
    },
});
