// Children running along a strip of track, for the sports ground's rare sight, where they go by on
// the far track: kit figures in the run pose, drawn smaller with the kit's weights so they read small.
import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { placePerson, type PersonParams } from "../people/figure";
import { person } from "../people/person";

interface RunnersParams {
    /** 1 to 4 runners. */
    count: number;
    /** 1 writes a number on each runner's shirt, 0 leaves the shirts plain. */
    numbers: number;
}

const SIZE = 0.75;

/**
 * The line from the front. `reach` is how far a runner's figure goes behind and ahead of the feet, in
 * the kit's units, so the gaps between runners are even rather than the gaps between their feet.
 */
const LINE: { look: Partial<PersonParams>; number: number; reach: [number, number] }[] = [
    { look: { tone: 2, hair: "long", colour: "auburn", top: "berry" }, number: 6, reach: [30, 36] },
    {
        look: { tone: 5, hair: "puffs", colour: "black", top: "sky", aid: "wheelchair" },
        number: 3,
        reach: [33, 55],
    },
    {
        look: {
            tone: 3,
            hair: "short",
            colour: "brown",
            top: "glow",
            glasses: true,
            mood: "excited",
        },
        number: 8,
        reach: [30, 36],
    },
    {
        look: { tone: 6, hair: "braids", colour: "black", top: "mint", hearing: "aid" },
        number: 5,
        reach: [30, 36],
    },
];

const countOf = (p: RunnersParams) => Math.max(1, Math.min(LINE.length, Math.round(p.count)));

export const runners = defineDrawing<RunnersParams>({
    id: "runners",
    family: "sport",
    title: "Runners",
    group: "Characters",
    about: "Children running in a line along a strip of running track, seen from the side, one of them in a racing wheelchair. Each has a race number, on the shirt or on the side of the racing chair, so the runners can be counted, their numbers read and put in order, and who is in front said.",
    params: { count: 4, numbers: 1 },
    settings: {
        count: { kind: "whole", min: 1, max: 4 },
        numbers: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Four runners", params: { count: 4, numbers: 1 } },
        { label: "Two runners", params: { count: 2, numbers: 1 } },
        { label: "Three, plain shirts", params: { count: 3, numbers: 0 } },
        { label: "One runner", params: { count: 1, numbers: 1 } },
    ],
    box: () => ({ w: 14, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = countOf(p);
        const W = 14 * U;
        const a: RawAnchors = {};
        const far = 4.85 * U;
        const lane = 5.2 * U;
        const base = 5.5 * U;
        const near = 5.8 * U;
        // on paper the track opens to a single light hatch: it is wider than four squares and the runners' feet are on it
        const surface = pen.fill(
            "tang",
            "solid",
            c.paper ? { fillStyle: "hachure", hachureGap: 7, fillWeight: 0.7 } : {},
        );
        pen.path(g, `M${0.15 * U} ${far}H${W - 0.15 * U}V${near}H${0.15 * U}Z`, "ruler", surface, {
            strokeWidth: 0.1,
            stroke: "none",
            roughness: 0.2,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        pen.line(g, 0.15 * U, lane, W - 0.15 * U, lane, "ruler", {
            strokeWidth: 2.2,
            stroke: c.t.card,
            disableMultiStroke: true,
        });
        pen.line(g, 0.15 * U, far, W - 0.15 * U, far, "pencil", { strokeWidth: 1.6 });
        pen.line(g, 0.15 * U, near, W - 0.15 * U, near, "pencil", { strokeWidth: 1.8 });

        const line = LINE.slice(0, n);
        const span = (r: (typeof LINE)[number]) => (r.reach[0] + r.reach[1]) * SIZE;
        const gap = (W - line.reduce((t, r) => t + span(r), 0)) / (n + 1);
        let left = gap;
        // laid out from the back of the line to the front, all running to the right
        for (let i = n - 1; i >= 0; i--) {
            const r = LINE[i];
            if (!r) continue;
            const x = left + r.reach[0] * SIZE;
            left += span(r) + gap;
            const rc = part(c, "runner", [x, base]);
            const at = placePerson(
                rc,
                { ...person.params, ...r.look, age: "child", pose: "run", dir: 1 },
                x,
                base,
                { size: SIZE, seed: i + 1 },
            );
            const card = at.chair ?? at.chest;
            if (p.numbers > 0 && card) {
                rc.pen.rect(rc.g, card[0] - 7.5, card[1] - 6.5, 15, 13, "ruler", pen.fill("card"), {
                    strokeWidth: 1.1,
                    disableMultiStroke: true,
                    preserveVertices: true,
                });
                num(rc, card[0], card[1] + 4.4, r.number, 12);
            }
            const head = at.head;
            if (head) a[`runner(${i + 1})`] = [head[0], head[1], "up"];
        }
        a.track = [W / 2, near, "down"];
        return a;
    },
    describe: (p) => describeRunners(p),
    motion: {
        parts: {
            runner: { is: "idle", deg: 2, period: 3.4, wave: 0.35 },
            eyes: { is: "blink", period: 4.2 },
        },
    },
});

/** What a screen reader says: who is running and how, never how many, since a question may ask. */
function describeRunners(p: RunnersParams): string {
    const numbered = p.numbers > 0;
    if (countOf(p) === 1)
        return `A child running along a strip of running track, seen from the side, ${numbered ? "with a race number on their shirt" : "in a plain shirt"}.`;
    return `Children with different skin tones and hair run in a line along a running track, seen from the side, one in a racing wheelchair${numbered ? ", each with a race number" : ""}.`;
}
