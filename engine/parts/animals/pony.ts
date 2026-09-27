// A pony seen from the side, drawn the way the Pup family is: round-ended limbs, an oval barrel and a
// few firm lines, with a pose for each moment of a canter and a jump. The box never changes with the
// pose, so a game moves the whole box along its own arc and the pony does not shift under its feet.
// With `horn` it is a unicorn.
import { part, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const PONY_POSES = [
    "stand",
    "canter1",
    "canter2",
    "canter3",
    "gather",
    "leap",
    "air",
    "land",
    "skid",
] as const;
export type PonyPose = (typeof PONY_POSES)[number];
const COATS = ["chestnut", "palomino", "grey", "berry", "sky"] as const;
type Coat = (typeof COATS)[number];

const COAT: Record<Coat, { coat: TokenName; mane: TokenName; words: string }> = {
    chestnut: { coat: "tang", mane: "ink-soft", words: "an orange-brown coat and a dark mane" },
    palomino: { coat: "glow", mane: "card", words: "a golden coat and a white mane" },
    grey: { coat: "card", mane: "ink-soft", words: "a white coat and a grey mane" },
    berry: { coat: "berry", mane: "card", words: "a pink coat and a white mane" },
    sky: { coat: "sky", mane: "card", words: "a blue coat and a white mane" },
};

const POSE_WORD: Record<PonyPose, string> = {
    stand: "standing still",
    canter1: "cantering with its hind legs under it",
    canter2: "cantering with its legs stretched out",
    canter3: "cantering on its leading foreleg",
    gather: "gathering itself to jump",
    leap: "pushing off to jump",
    air: "in the air with its legs folded",
    land: "landing on its forelegs",
    skid: "stopping short with its forelegs braced",
};

/** A leg as two angles from straight down, forwards positive: the upper bone, then the lower. */
type Leg = readonly [number, number];

interface Shape {
    /** Near fore, far fore, near hind, far hind. */
    legs: readonly [Leg, Leg, Leg, Leg];
    /** Degrees the body turns about its middle, nose up below nought. */
    tilt: number;
    /** Units the body sits lower than standing, for a gather or a stop. */
    sink: number;
    /** Degrees the tail swings up from hanging. */
    tail: number;
}

// Each pose is drawn rather than angled, so a canter reads as a canter and a landing as a landing.
const SHAPES: Record<PonyPose, Shape> = {
    stand: {
        legs: [
            [4, 0],
            [-4, -2],
            [-3, 2],
            [5, 4],
        ],
        tilt: 0,
        sink: 0,
        tail: 0,
    },
    canter1: {
        legs: [
            [34, -30],
            [18, -18],
            [22, 8],
            [8, 0],
        ],
        tilt: -4,
        sink: 1,
        tail: 20,
    },
    canter2: {
        legs: [
            [30, 18],
            [2, -4],
            [-12, -12],
            [12, 4],
        ],
        tilt: -1,
        sink: 0,
        tail: 30,
    },
    canter3: {
        legs: [
            [8, 3],
            [-18, -14],
            [-34, -26],
            [-24, -44],
        ],
        tilt: 3,
        sink: -1,
        tail: 30,
    },
    gather: {
        legs: [
            [40, -30],
            [26, -40],
            [24, 14],
            [16, 8],
        ],
        tilt: -10,
        sink: 3,
        tail: 18,
    },
    leap: {
        legs: [
            [84, -12],
            [72, -24],
            [-38, -30],
            [-50, -42],
        ],
        tilt: -14,
        sink: 0,
        tail: 34,
    },
    air: {
        legs: [
            [88, -26],
            [78, -38],
            [34, -100],
            [22, -110],
        ],
        tilt: -2,
        sink: 0,
        tail: 40,
    },
    land: {
        legs: [
            [26, 14],
            [14, 4],
            [-48, -70],
            [-58, -80],
        ],
        tilt: 14,
        sink: 0,
        tail: 42,
    },
    skid: {
        legs: [
            [36, 30],
            [28, 22],
            [26, 20],
            [18, 12],
        ],
        tilt: -12,
        sink: 3,
        tail: 12,
    },
};

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
    list.find((x) => x === v) ?? fallback;

export interface PonyParams {
    pose: string;
    facing: number;
    coat: string;
    horn: boolean;
}

/** A thick line with round ends, for a leg: its outline as points, each end a half circle. */
function capsule(a: [number, number], b: [number, number], w: number): [number, number][] {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        ux = (b[0] - a[0]) / d,
        uy = (b[1] - a[1]) / d;
    const out: [number, number][] = [];
    for (let i = 0; i <= 6; i++) {
        const t = (i / 6) * Math.PI,
            c = Math.cos(t),
            s = Math.sin(t);
        out.push([b[0] + w * (-uy * c + ux * s), b[1] + w * (ux * c + uy * s)]);
    }
    for (let i = 0; i <= 6; i++) {
        const t = (i / 6) * Math.PI,
            c = Math.cos(t),
            s = Math.sin(t);
        out.push([a[0] + w * (uy * c - ux * s), a[1] + w * (-ux * c - uy * s)]);
    }
    return out;
}

const W = 6 * U,
    H = 5 * U,
    FEET = H - 4;
/** Upper and lower bone, in units: together they reach from the joints to the feet. */
const BONE = 17;
/** The body is drawn standing on a line at 86, and set down onto the box's feet line by `DROP`. */
const DROP = FEET - 86;
/** The fore and hind joints, and the middle the body turns about. */
const FORE: [number, number] = [80, 86 - 2 * BONE];
const HIND: [number, number] = [38, 86 - 2 * BONE];
const MID: [number, number] = [59, 48];

export const pony = defineDrawing<PonyParams>({
    id: "pony",
    family: "animals",
    title: "Pony",
    group: "Characters",
    about: "A pony seen from the side in the poses of a canter and a jump: standing, three beats of the canter, the gather, the push off, the air, the landing and a sudden stop. Its coat comes in five colours, and with a horn it is a unicorn.",
    params: { pose: "stand", facing: 1, coat: "chestnut", horn: false },
    settings: {
        pose: { kind: "one of", of: PONY_POSES },
        facing: { kind: "one of", of: [1, -1] },
        coat: { kind: "one of", of: COATS },
        horn: { kind: "flag" },
    },
    takes: [
        { label: "Standing", params: { pose: "stand", facing: 1, coat: "chestnut", horn: false } },
        {
            label: "Cantering",
            params: { pose: "canter2", facing: 1, coat: "palomino", horn: false },
        },
        { label: "Gathering", params: { pose: "gather", facing: 1, coat: "grey", horn: false } },
        {
            label: "Over a fence",
            params: { pose: "air", facing: 1, coat: "chestnut", horn: false },
        },
        {
            label: "A unicorn landing",
            params: { pose: "land", facing: -1, coat: "berry", horn: true },
        },
        { label: "Stopping short", params: { pose: "skid", facing: 1, coat: "sky", horn: false } },
    ],
    box: () => ({ w: 6, h: 5 }),
    draw: (c, p): RawAnchors => {
        const pose = pick(PONY_POSES, p.pose, "stand"),
            coat = COAT[pick(COATS, p.coat, "chestnut")],
            dir = p.facing < 0 ? -1 : 1,
            shape = SHAPES[pose];
        const rad = (shape.tilt * Math.PI) / 180,
            cos = Math.cos(rad),
            sin = Math.sin(rad);
        // drawn facing right about the body's middle, then turned by the tilt and mirrored for a left face
        const at = (x: number, y: number): [number, number] => {
            const dx = x - MID[0],
                dy = y + shape.sink - MID[1];
            const rx = MID[0] + dx * cos - dy * sin,
                ry = MID[1] + dx * sin + dy * cos + DROP;
            return [dir > 0 ? rx : W - rx, ry];
        };
        const { pen, g } = c;
        const hide = pen.fill(coat.coat),
            far = pen.fill(coat.coat, "hachure", { hachureGap: 3.5, fillWeight: 0.8 }),
            hair = pen.fill(coat.mane),
            ink = { fill: c.t.ink, fillStyle: "solid" } as const;
        const line = calm(c, 1.6);

        // the joints are fixed on the body, and each bone turns by the pose's own angle, so a leg is
        // straight down its bones whatever the body's tilt does
        const leg = (joint: [number, number], l: Leg, near: boolean, thick: number) => {
            const j = at(...joint);
            const bend = (a: number): [number, number] => [
                dir * Math.sin((a * Math.PI) / 180) * BONE,
                Math.cos((a * Math.PI) / 180) * BONE,
            ];
            const [ux, uy] = bend(l[0]),
                knee: [number, number] = [j[0] + ux, j[1] + uy];
            const [lx, ly] = bend(l[1]),
                hoof: [number, number] = [knee[0] + lx, knee[1] + ly];
            const fill = near ? hide : far;
            pen.polygon(g, capsule(j, knee, thick), "pencil", fill, calm(c, near ? 1.5 : 1.2));
            pen.polygon(
                g,
                capsule(knee, hoof, thick * 0.7),
                "pencil",
                fill,
                calm(c, near ? 1.4 : 1.1),
            );
            pen.circle(g, hoof[0], hoof[1], thick * 1.5, "ruler", ink, {
                strokeWidth: 0.6,
                ...FIRM,
            });
            return hoof;
        };

        // far legs, then the tail, behind the barrel
        leg(FORE, shape.legs[1], false, 4.2);
        leg(HIND, shape.legs[3], false, 5);
        const root = at(30, 42);
        const swing = part(c, "tail", root, { dir });
        const up = (shape.tail * Math.PI) / 180;
        const tip: [number, number] = [
            root[0] - dir * Math.sin(up + 0.35) * 22,
            root[1] + Math.cos(up + 0.35) * 22,
        ];
        const mid: [number, number] = [
            root[0] - dir * Math.sin(up + 0.9) * 13,
            root[1] + Math.cos(up + 0.9) * 13,
        ];
        swing.pen.path(
            swing.g,
            `M${root[0]} ${root[1] - 4}Q${mid[0] - dir * 6} ${mid[1] - 3} ${tip[0]} ${tip[1]}Q${mid[0] + dir * 3} ${mid[1] + 6} ${root[0] + dir * 2} ${root[1] + 4}Z`,
            "pencil",
            hair,
            calm(c, 1.4),
        );

        // the neck is laid before the barrel, so the barrel closes over where they meet
        pen.polygon(g, [at(72, 36), at(88, 13), at(99, 16), at(90, 44)], "pencil", hide, line);
        const [bx, by] = at(58, 48);
        pen.ellipse(g, bx, by, 64, 30, "pencil", hide, calm(c, 1.8));

        leg(FORE, shape.legs[0], true, 4.6);
        leg(HIND, shape.legs[2], true, 5.6);

        // the head is its own part, so a page's idle can nod it; a game holds it still
        const poll = at(93, 12);
        const head = part(c, "head", poll, { dir });
        const q = (x: number, y: number) => at(x, y).join(" ");
        head.pen.path(
            head.g,
            `M${q(88, 12)}Q${q(95, 6)} ${q(102, 12)}Q${q(110, 18)} ${q(115, 26)}Q${q(117, 33)} ${q(109, 34)}Q${q(100, 33)} ${q(94, 28)}Q${q(86, 24)} ${q(88, 12)}Z`,
            "pencil",
            hide,
            calm(c, 1.6),
        );
        head.pen.polygon(head.g, [at(89, 11), at(92, 1), at(97, 10)], "pencil", hide, calm(c, 1.3));
        const eyes = part(head, "eyes", at(98, 17));
        const [ex, ey] = at(98, 17);
        eyes.pen.circle(eyes.g, ex, ey, 4.4, "ruler", ink, { strokeWidth: 0.5, ...FIRM });
        plain(eyes, { kind: "circle", cx: ex + dir * 0.7, cy: ey - 0.7, r: 0.8, fill: c.t.card });
        const [nx, ny] = at(111, 29);
        head.pen.circle(head.g, nx, ny, 2.4, "ruler", ink, { strokeWidth: 0.4, ...FIRM });
        if (p.horn) {
            head.pen.polygon(
                head.g,
                [at(92, 8), at(103, -6), at(97, 10)],
                "pencil",
                pen.fill("glow"),
                calm(c, 1.3),
            );
        }

        // the mane in tufts down the crest, and a forelock between the ears
        const crest = [
            [93, 7],
            [86, 16],
            [80, 25],
            [74, 33],
        ] as const;
        let d = "";
        for (const [i, [x, y]] of crest.entries()) {
            const [ax, ay] = at(x, y),
                [ox, oy] = at(x - 9, y - 1),
                next = crest[i + 1];
            const [tx, ty] = next ? at(next[0], next[1]) : at(70, 40);
            d += `${i === 0 ? `M${ax} ${ay}` : ""}Q${ox} ${oy} ${tx} ${ty}`;
        }
        const [wx, wy] = at(75, 38),
            [cx0, cy0] = at(93, 11);
        pen.path(g, `${d}L${wx} ${wy}L${cx0} ${cy0}Z`, "pencil", hair, calm(c, 1.3));
        pen.path(
            g,
            `M${at(92, 6).join(" ")}Q${at(99, 8).join(" ")} ${at(99, 14).join(" ")}Q${at(96, 10).join(" ")} ${at(92, 10).join(" ")}Z`,
            "pencil",
            hair,
            calm(c, 1.1),
        );

        const nose = at(114, 28),
            back = at(58, 34);
        return {
            head: [...at(93, 2), "up"],
            face: [nose[0], nose[1], dir > 0 ? "right" : "left"],
            back: [back[0], back[1], "up"],
            feet: [W / 2, FEET, "down"],
        };
    },
    describe: (p) => {
        const pose = pick(PONY_POSES, p.pose, "stand"),
            coat = COAT[pick(COATS, p.coat, "chestnut")];
        return `A ${p.horn ? "unicorn" : "pony"} seen from the side, facing ${p.facing < 0 ? "left" : "right"}, ${POSE_WORD[pose]}, with ${coat.words}.`;
    },
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4.6 },
            tail: { is: "wiggle", deg: 12, period: 2.4, cycles: 3 },
            head: { is: "wiggle", deg: 4, period: 5.2, cycles: 1 },
        },
    },
});
