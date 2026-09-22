import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, clamp } from "./nature";

export const starfish = defineDrawing({
    id: "starfish",
    family: "animals",
    title: "Starfish",
    group: "Characters",
    about: "Starfish lying on the sand, each with its arms spread evenly round the middle and a row of bumps along every arm. A five-armed starfish looks the same turned a fifth of the way round, which is symmetry a child can trace with a finger.",
    params: { count: 2, arms: 5 },
    settings: { count: { kind: "whole", min: 1, max: 4 }, arms: { kind: "whole", min: 4, max: 7 } },
    takes: [
        { label: "Two, five arms", params: { count: 2, arms: 5 } },
        { label: "Three", params: { count: 3, arms: 5 } },
        { label: "One with six arms", params: { count: 1, arms: 6 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 4) * 4 + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 4),
            k = clamp(p.arms, 4, 7),
            a: RawAnchors = {};
        const COLS: ("tang" | "berry" | "glow")[] = ["tang", "berry", "glow", "berry"];
        for (let i = 0; i < n; i++) {
            const cx = (2.5 + i * 4) * U,
                cy = 2.55 * U,
                R = 2.2 * U,
                r = 0.78 * U,
                rot = -Math.PI / 2 + i * 0.31,
                pts: Pt[] = [];
            for (let j = 0; j < k * 2; j++) {
                const ang = rot + (j * Math.PI) / k,
                    rr = j % 2 ? r : R;
                pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
            }
            pen.path(g, ring(pts), "pencil", pen.fill(COLS[i]), { strokeWidth: 1.7 });
            for (let j = 0; j < k; j++) {
                const ang = rot + (j * 2 * Math.PI) / k;
                for (const t of [0.34, 0.56, 0.76])
                    pen.circle(
                        g,
                        cx + Math.cos(ang) * R * t * 0.9,
                        cy + Math.sin(ang) * R * t * 0.9,
                        5.2 - t * 3,
                        "ruler",
                        pen.fill("card"),
                        { strokeWidth: 0.7 },
                    );
            }
            pen.circle(g, cx, cy, 0.42 * U, "ruler", pen.fill("card"), { strokeWidth: 1 });
            a[`star(${i})`] = [cx + Math.cos(rot) * R * 0.8, cy + Math.sin(rot) * R * 0.8, "up"];
        }
        return a;
    },
    describe: () =>
        "Starfish lying on the sand, each with its arms spread evenly round the middle and a row of pale bumps along every arm.",
});
