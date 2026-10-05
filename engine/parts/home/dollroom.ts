import { group, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

/** The marker a room or a swatch is washed in, for the game that sets it. */
export type { Marker };

export const ROOM_KINDS = ["room", "stairs"] as const;
export const PAPERS = ["plain", "stripes", "spots", "flowers"] as const;
export const FLOORS = ["boards", "tiles", "carpet"] as const;
/** A side of a room: an outside wall, or a wall it shares with the room beside it, with a doorway through. */
export const SIDES = ["wall", "door"] as const;

export interface RoomParams {
    w: number;
    kind: (typeof ROOM_KINDS)[number];
    paper: (typeof PAPERS)[number];
    tone: Marker;
    floor: (typeof FLOORS)[number];
    window: boolean;
    left: (typeof SIDES)[number];
    right: (typeof SIDES)[number];
}

/** A room is one storey of a dollhouse: three squares tall, in step with STOREY in school/games/dollhouse.ts. */
export const ROOM_H = 3;
/** How deep the floor is drawn, in squares, so things stand on its top. */
export const ROOM_FLOOR = 0.3;
/** How thick an outside wall is drawn, in squares; a room's things keep inside it. */
export const ROOM_WALL = 0.22;
/** How tall a doorway through a shared wall is, in squares above the floor, so a person walks through it. */
const DOOR_H = 2.1;

const one = <T extends string>(of: readonly T[], v: unknown, d: T): T =>
    of.find((x) => x === v) ?? d;
const widthOf = (v: unknown): number => Math.max(2, Math.min(8, Math.round(Number(v) || 4)));

/** A room's box drawn at `x`, `y` (its top left, in units) into `c`: wall, paper, floor, window or stairs. */
export function drawRoom<G>(c: Ctx<G>, x: number, y: number, p: RoomParams): void {
    const { pen } = c,
        gc = group(c, { turn: [["translate", x, y]] }),
        g = gc.g;
    const w = widthOf(p.w) * U,
        h = ROOM_H * U,
        tone = one(MARKERS, p.tone, "sky"),
        floorTop = h - ROOM_FLOOR * U;
    pen.rect(g, 1, 1, w - 2, h - 2, "pencil", pen.fill("card"), { strokeWidth: 0.6 });
    // the back wall a shade darker than the front, so the room reads as a box looked into
    if (!c.paper)
        plain(gc, {
            kind: "rect",
            x: 1,
            y: 1,
            w: w - 2,
            h: floorTop - 1,
            fill: c.t.ink,
            opacity: 0.06,
        });
    if (p.kind === "stairs") {
        const steps = 6,
            run = (w - 0.5 * U) / steps,
            rise = (floorTop - 0.2 * U) / steps;
        const pts: [number, number][] = [[0.25 * U, floorTop]];
        for (let i = 0; i < steps; i++) {
            const sx = 0.25 * U + i * run,
                sy = floorTop - (i + 1) * rise;
            pts.push([sx, sy], [sx + run, sy]);
        }
        pts.push([0.25 * U + steps * run, floorTop]);
        pen.polygon(g, pts, "pencil", pen.fill("tang"), { strokeWidth: 1.4 });
        pen.line(g, 0.4 * U, floorTop - 1 * U, w - 0.5 * U, 0.6 * U, "ruler", { strokeWidth: 1.6 });
        for (let i = 1; i < steps; i += 2) {
            const sx = 0.25 * U + i * run + run / 2,
                rail = floorTop - 1 * U - ((sx - 0.4 * U) / (w - 0.9 * U)) * (floorTop - 1.6 * U);
            pen.line(g, sx, rail, sx, floorTop - (i + 1) * rise, "ruler", { strokeWidth: 1 });
        }
    } else {
        const paper = one(PAPERS, p.paper, "plain");
        if (paper === "plain")
            pen.rect(
                g,
                2,
                2,
                w - 4,
                floorTop - 3,
                "pencil",
                pen.fill(tone, "hachure", { hachureGap: 7 }),
                {
                    stroke: "none",
                },
            );
        if (paper === "stripes")
            for (let sx = 0.35 * U; sx < w - 0.2 * U; sx += 0.7 * U)
                pen.rect(g, sx, 2, 0.16 * U, floorTop - 3, "pencil", pen.fill(tone), {
                    stroke: "none",
                });
        if (paper === "spots" || paper === "flowers")
            for (let row = 0; row * 0.75 * U < floorTop - 0.5 * U; row++)
                for (let sx = 0.4 * U + (row % 2) * 0.4 * U; sx < w - 0.3 * U; sx += 0.8 * U) {
                    const sy = 0.45 * U + row * 0.75 * U;
                    if (paper === "spots")
                        pen.circle(g, sx, sy, 0.2 * U, "pencil", pen.fill(tone), {
                            stroke: "none",
                        });
                    else
                        for (const [dx, dy] of [
                            [0, -0.1],
                            [0.1, 0],
                            [0, 0.1],
                            [-0.1, 0],
                        ] as const)
                            pen.circle(
                                g,
                                sx + dx * U,
                                sy + dy * U,
                                0.13 * U,
                                "pencil",
                                pen.fill(tone),
                                {
                                    stroke: "none",
                                },
                            );
                }
        if (p.window && widthOf(p.w) >= 3) {
            const ww = 1.2 * U,
                wx = w / 2 - ww / 2,
                wy = 0.45 * U;
            pen.rect(g, wx, wy, ww, 1 * U, "pencil", pen.fill("sky"), { strokeWidth: 1.4 });
            pen.line(g, wx + ww / 2, wy, wx + ww / 2, wy + 1 * U, "ruler", { strokeWidth: 1 });
            pen.line(g, wx, wy + 0.5 * U, wx + ww, wy + 0.5 * U, "ruler", { strokeWidth: 1 });
            pen.rect(
                g,
                wx - 0.12 * U,
                wy + 1 * U,
                ww + 0.24 * U,
                0.14 * U,
                "pencil",
                pen.fill("card"),
                {
                    strokeWidth: 1,
                },
            );
        }
    }
    const floor = one(FLOORS, p.floor, "boards");
    pen.rect(
        g,
        1,
        floorTop,
        w - 2,
        ROOM_FLOOR * U - 1,
        "pencil",
        floor === "carpet"
            ? pen.fill(tone)
            : floor === "boards"
              ? pen.fill("tang", "hachure")
              : pen.fill("card"),
        { strokeWidth: 1 },
    );
    if (floor === "tiles")
        for (let tx = 0.5 * U; tx < w - 0.2 * U; tx += 0.5 * U)
            pen.line(g, tx, floorTop, tx, h - 1, "ruler", { strokeWidth: 0.8 });
    // the ceiling's cut edge across the top, and the side walls: thick outside, and a shared wall with
    // a doorway through it, drawn last and heaviest so the room reads as a box cut open
    const wall = ROOM_WALL * U;
    pen.rect(g, 1, 1, w - 2, 0.2 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
    for (const side of ["left", "right"] as const) {
        const at = side === "left" ? 1 : w - 1 - wall,
            kind = one(SIDES, p[side], "wall");
        if (kind === "wall")
            pen.rect(g, at, 1, wall, h - 2, "pencil", pen.fill("card"), { strokeWidth: 2.2 });
        else {
            const top = floorTop - DOOR_H * U;
            pen.rect(g, at, 1, wall * 0.6, top - 1, "pencil", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            pen.line(g, at, top, at + wall * 0.6, top, "ruler", { strokeWidth: 1.4 });
        }
    }
    pen.line(g, 1, h - 1, w - 1, h - 1, "ruler", { strokeWidth: 2.4 });
}

export const dollRoom = defineDrawing<RoomParams>({
    id: "dollroom",
    family: "home",
    title: "Dollhouse room",
    group: "Structures",
    about: "One room of a dollhouse seen cut open from the front, three squares tall and two to eight wide, with wallpaper in plain, stripes, spots or flowers, a floor of boards, tiles or carpet, and a window; or a flight of stairs with a handrail climbing to the room above.",
    params: {
        w: 4,
        kind: "room",
        paper: "stripes",
        tone: "berry",
        floor: "boards",
        window: true,
        left: "wall",
        right: "wall",
    },
    settings: {
        w: { kind: "whole", min: 2, max: 8 },
        kind: { kind: "one of", of: ROOM_KINDS },
        paper: { kind: "one of", of: PAPERS },
        tone: { kind: "one of", of: MARKERS },
        floor: { kind: "one of", of: FLOORS },
        window: { kind: "flag" },
        left: { kind: "one of", of: SIDES },
        right: { kind: "one of", of: SIDES },
    },
    takes: [
        {
            label: "A bedroom with striped paper",
            params: {
                w: 4,
                kind: "room",
                paper: "stripes",
                tone: "berry",
                floor: "boards",
                window: true,
                left: "wall",
                right: "wall",
            },
        },
        {
            label: "A wide room with spots",
            params: {
                w: 7,
                kind: "room",
                paper: "spots",
                tone: "sky",
                floor: "carpet",
                window: true,
                left: "wall",
                right: "wall",
            },
        },
        {
            label: "A small tiled room",
            params: {
                w: 2,
                kind: "room",
                paper: "flowers",
                tone: "mint",
                floor: "tiles",
                window: false,
                left: "wall",
                right: "wall",
            },
        },
        {
            label: "A plain room",
            params: {
                w: 5,
                kind: "room",
                paper: "plain",
                tone: "glow",
                floor: "boards",
                window: false,
                left: "wall",
                right: "wall",
            },
        },
        {
            label: "A room with doorways both sides",
            params: {
                w: 4,
                kind: "room",
                paper: "spots",
                tone: "mint",
                floor: "carpet",
                window: true,
                left: "door",
                right: "door",
            },
        },
        {
            label: "A flight of stairs",
            params: {
                w: 2,
                kind: "stairs",
                paper: "plain",
                tone: "tang",
                floor: "boards",
                window: false,
                left: "wall",
                right: "wall",
            },
        },
    ],
    box: (p) => ({ w: widthOf(p.w), h: ROOM_H }),
    draw: (c, p): RawAnchors => {
        drawRoom(c, 0, 0, p);
        const w = widthOf(p.w) * U;
        return {
            floor: [w / 2, (ROOM_H - ROOM_FLOOR) * U, "up"],
            middle: [w / 2, (ROOM_H * U) / 2, "up"],
        };
    },
    describe: (p) =>
        p.kind === "stairs"
            ? "A flight of wooden stairs inside a dollhouse room seen cut open, the steps climbing from the bottom left to the top right with a handrail."
            : `A dollhouse room seen cut open from the front, ${widthOf(p.w)} squares wide and three tall, with ${MARKER_WORD[one(MARKERS, p.tone, "sky")]} ${one(PAPERS, p.paper, "plain") === "plain" ? "painted walls" : `${one(PAPERS, p.paper, "plain")} on the wallpaper`}, a floor of ${one(FLOORS, p.floor, "boards")}${p.left === "door" || p.right === "door" ? ", a doorway" : ""}${p.window && widthOf(p.w) >= 3 ? " and a window" : ""}.`,
    motion: {
        still: "A room is part of a house, so it holds still while people move about inside it.",
    },
});
