import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";
import { placePerson, type PersonParams } from "../people/figure";

const CX = 10 * U;
const CY = 8 * U;
const RING = 6.2 * U;
const EARTH = 2 * U;
const MOON = 0.7 * U;

/**
 * Where place `k` is on the moon's ring, seen from above the north pole with the sun to the left:
 * 0 between the Earth and the sun, then anticlockwise, so 2 is below the Earth, 4 on the far side
 * and 6 above it. The angle is on the page, where down is positive.
 */
export const placeAngle = (k: number): number => Math.PI - (k * Math.PI) / 4;

/** Where the person stands at each time of day as the Earth turns anticlockwise: noon faces the sun. */
const TIMES = [Math.PI, Math.PI / 2, 0, -Math.PI / 2] as const;

const CHILD: PersonParams = {
    pose: "wave",
    age: "child",
    tone: 4,
    hair: "short",
    colour: "black",
    top: "berry",
    wear: "trousers",
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: "happy",
    dir: 1,
    holding: "",
};

/** A ball half lit from the left, as every ball in this picture is. */
function halfLit<G>(c: Ctx<G>, x: number, y: number, r: number, day: "glow" | "sky"): void {
    const { pen, g } = c;
    pen.circle(
        g,
        x,
        y,
        2 * r,
        "ruler",
        pen.fill("ink-soft", "hachure", { hachureGap: r > U ? 5 : 3, fillWeight: 0.7 }),
        {
            strokeWidth: 1.6,
        },
    );
    pen.path(
        g,
        `M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}Z`,
        "ruler",
        pen.fill(c.paper ? "card" : day),
        {
            strokeWidth: 1.6,
        },
    );
}

export const orbit = defineDrawing({
    id: "orbit",
    family: "science",
    title: "The Earth and the moon from above",
    group: "Structures",
    about: "The Earth and the moon's path round it, seen from high above the north pole, with sunlight coming from the left, so the half of each that faces left is lit and the other half is dark. The moon stands at one of eight places on its ring (`moon`, 0 to 7, or -1 for none): 0 between the Earth and the sun, then anticlockwise, so 2 is below the Earth, 4 on the far side and 6 above it. `places` draws all eight as empty circles lettered A to H, A at place 0; `arrow` shows the way the moon goes round; `person` stands a child on the Earth, where the turning Earth has carried them by `time`: 0 noon, facing the sun, 1 dusk, below, 2 midnight, on the far side, and 3 dawn, above. No moon's shape is named on the picture.",
    params: { moon: 2, places: 0, arrow: 1, person: 0, time: 0 },
    settings: {
        moon: { kind: "whole", min: -1, max: 7 },
        places: { kind: "whole", min: 0, max: 1 },
        arrow: { kind: "whole", min: 0, max: 1 },
        person: { kind: "whole", min: 0, max: 1 },
        time: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        {
            label: "The moon below the Earth",
            params: { moon: 2, places: 0, arrow: 1, person: 0, time: 0 },
        },
        {
            label: "Full, with every place",
            params: { moon: 4, places: 1, arrow: 1, person: 0, time: 0 },
        },
        {
            label: "Where does it go?",
            params: { moon: -1, places: 1, arrow: 0, person: 0, time: 0 },
        },
        {
            label: "A child at midnight",
            params: { moon: 4, places: 0, arrow: 0, person: 1, time: 2 },
        },
        { label: "A child at noon", params: { moon: 7, places: 0, arrow: 1, person: 1, time: 0 } },
    ],
    box: () => ({ w: 18, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            moon = Math.round(p.moon);
        // the sunlight, coming in from the left in straight lines
        for (const y of [3.5, 6.5, 9.5, 12.5])
            pen.arrow(g, [0.3 * U, y * U], [3 * U, y * U], c.t.glow, 0);
        soft(c, 1.6 * U, 15.4 * U, "sunlight", 12);
        pen.circle(g, CX, CY, 2 * RING, "pencil", null, {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [6, 6],
        });
        halfLit(c, CX, CY, EARTH, "sky");
        pen.path(
            g,
            `M${CX - 1.2 * U} ${CY - 0.9 * U}q${0.6 * U} ${-0.3 * U} ${0.9 * U} ${0.3 * U}t${-0.2 * U} ${0.9 * U}M${CX - 1.5 * U} ${CY + 0.6 * U}q${0.5 * U} ${0.1 * U} ${0.6 * U} ${0.6 * U}`,
            "pencil",
            null,
            { strokeWidth: 1.2, stroke: c.t.mint },
        );
        pen.circle(
            g,
            CX,
            CY,
            0.25 * U,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
        a.earth = [CX, CY - EARTH, "up"];
        for (let k = 0; k < 8; k++) {
            const t = placeAngle(k),
                x = CX + RING * Math.cos(t),
                y = CY + RING * Math.sin(t);
            if (k === moon) halfLit(c, x, y, MOON, "glow");
            else if (p.places > 0)
                pen.circle(g, x, y, 2 * MOON, "ruler", pen.fill("card"), {
                    strokeWidth: 1.2,
                    strokeLineDash: [4, 3],
                });
            if (p.places > 0) {
                const lx = CX + (RING + 1.4 * U) * Math.cos(t),
                    ly = CY + (RING + 1.4 * U) * Math.sin(t);
                say(c, lx, ly + 6, "ABCDEFGH"[k] ?? "?", 16);
            }
            a[`place(${k})`] = [x, y - MOON, "up"];
        }
        if (p.arrow > 0) {
            // an arc just outside the ring between places 2 and 4, its head showing the way round
            const from = placeAngle(3.5),
                to = placeAngle(2.5),
                r = RING + 0.6 * U,
                tip: [number, number] = [CX + r * Math.cos(from), CY + r * Math.sin(from)],
                ahead: [number, number] = [Math.sin(from), -Math.cos(from)];
            pen.arc(g, CX, CY, 2 * r, 2 * r, from, to, "pencil", {
                strokeWidth: 2,
                stroke: c.t.pen,
            });
            for (const s of [-1, 1]) {
                const turn = Math.atan2(ahead[1], ahead[0]) + Math.PI + s * 0.5;
                pen.line(
                    g,
                    tip[0],
                    tip[1],
                    tip[0] + 11 * Math.cos(turn),
                    tip[1] + 11 * Math.sin(turn),
                    "pencil",
                    {
                        strokeWidth: 2,
                        stroke: c.t.pen,
                    },
                );
            }
        }
        if (p.person > 0) {
            const t = TIMES[Math.max(0, Math.min(3, Math.round(p.time)))] ?? Math.PI,
                x = CX + EARTH * Math.cos(t),
                y = CY + EARTH * Math.sin(t),
                turned = group(c, {
                    turn: [
                        ["translate", Number(x.toFixed(2)), Number(y.toFixed(2))],
                        ["rotate", Number((((t + Math.PI / 2) * 180) / Math.PI).toFixed(1))],
                    ],
                });
            placePerson(turned, CHILD, 0, 0, { size: 0.45 });
            a.person = [
                CX + (EARTH + 1.2 * U) * Math.cos(t),
                CY + (EARTH + 1.2 * U) * Math.sin(t),
                "up",
            ];
        }
        return a;
    },
    describe: () =>
        "The Earth seen from above with the moon's round path about it and sunlight coming from the left, so one half of each ball is lit.",
    reads: true,
});
