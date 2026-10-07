// The field's readouts never sit on each other: every word a game writes and every readout it draws
// (a board, a picker, a strip, a counter) is laid out as the GPU view lays it out, on a desktop, a
// wide screen and a phone held upright (and turned, for a game that asks), at each level's start and through a few seconds of play, and
// no two may overlap or run off the field. See "Readouts never overlap" in .docs/games.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    keepInside,
    LETTER,
    portrait,
    readoutLayout,
    type Readout,
    uprightSquare,
    type Size,
} from "../../../engine/motion/camera";
import { emptyPad, spent, type Dir, type Pad } from "../../../engine/motion/pad";
import { heldUpright, type Frame, type Mark, type Sprite } from "../../../engine/motion/scene";
import { loaderOf } from "../../../engine/parts/catalog";
import type { Box } from "../../../engine/parts/drawing";
import { GAMES } from "../catalogue";
import type { ActionGame } from "../game";

/** The field's room in pixels, as the page measures it at 1440 by 900, at 1920 wide, and on a phone of 390 by 844. */
const ROOMS: { name: string; room: Size }[] = [
    { name: "desktop", room: { w: 1416, h: 724 } },
    { name: "wide", room: { w: 1896, h: 785 } },
    { name: "phone", room: { w: 382, h: 624 } },
];
/** A phone turned on its side, which a game too wide to crop asks for (`portrait.hint`) and is checked on as well, since a child may not turn it. */
const TURNED = { name: "phone turned", room: { w: 820, h: 294 } };

/** How far two pieces may touch, in squares, before they overlap: a stroke's width. */
const TOUCH = 0.08;

/** Fixed drawings that are scenery pinned to the sky rather than readouts. */
const SCENERY = new Set(["moon"]);
/** Drawings in the world that are readouts: a scoreboard, a slate, a sign a number is written on. */
const READOUTS = new Set(["scoreboard", "chalkslate", "pocketsign", "sidingboard"]);

/** Pairs that overlap on purpose, by game and the two pieces' names, each with its reason. */
const MEANT: { game: string; a: RegExp; b: RegExp; why: string }[] = [];

interface Piece {
    name: string;
    word: boolean;
    fixed: boolean;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

const boxes = new Map<string, ((p: Record<string, unknown>) => Box) | null>();

async function boxOf(s: Sprite): Promise<Box | null> {
    if (!boxes.has(s.art)) {
        const load = loaderOf(s.art);
        const d = load ? await load() : null;
        boxes.set(s.art, d ? (p) => d.box({ ...asRecord(d.params), ...p }) : null);
    }
    const f = boxes.get(s.art);
    return f ? f(s.params ?? {}) : null;
}

const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === "object" && v !== null ? Object.fromEntries(Object.entries(v)) : {};

/** The field as the GPU view fits it to a room: its square in pixels, the squares shown, and whether it follows the focus. */
function fit(view: Size, room: Size, keep: number | undefined) {
    const whole = Math.max(6, Math.floor(Math.min(room.w / view.w, room.h / view.h)));
    const upright = portrait(room) && keep !== undefined && keep < view.w;
    const sq = upright && keep !== undefined ? uprightSquare(view, room, keep, whole) : whole;
    const grown = (r: number, v: number): number => (r - v * sq < 1 ? v : r / sq);
    const following = upright && sq > whole;
    return {
        sq,
        following,
        phone: portrait(room),
        shown: { w: following ? room.w / sq : grown(room.w, view.w), h: grown(room.h, view.h) },
        authored: view,
    };
}

/** The readouts of a frame, in the shown field's squares from its top left. */
async function piecesOf(
    given: Frame,
    field: ReturnType<typeof fit>,
    seen: "side" | "above",
): Promise<{ pieces: Piece[]; hidden: string[] }> {
    const { shown, sq } = field;
    // held upright, a frame that offers an upright layout for its readouts is drawn with it, as the view does
    const turned = field.following && given.upright !== undefined;
    const f = turned ? heldUpright(given) : given;
    const authored = turned ? (given.upright ?? field.authored) : field.authored;
    const zoom = f.camera.zoom ?? 1;
    const aim = field.following ? (f.focus ?? f.camera) : f.camera;
    const kept = keepInside(aim, shown, f.world, zoom, seen === "side");
    const cam = {
        x: f.world.w * zoom <= shown.w ? aim.x : kept.x,
        y: f.world.h * zoom <= shown.h && seen === "above" ? aim.y : kept.y,
    };
    const fixed: Readout[] = [];
    for (const s of f.sprites) {
        if (!s.fixed) continue;
        const b = await boxOf(s);
        const c = s.crop ?? { x: 0, y: 0, w: b?.w ?? 1, h: b?.h ?? 1 };
        const k = ((s.size ?? c.w) / c.w) * (s.scale ?? 1);
        fixed.push({ key: s.key, x: s.x, y: s.y, w: c.w * k, h: c.h * k, stand: s.stand });
    }
    const layout = readoutLayout(
        [
            ...fixed,
            ...f.marks.flatMap((m) =>
                m.kind === "word" && m.fixed
                    ? [{ x: m.x, y: m.y, size: m.size, text: wordOf(m, field.phone) }]
                    : [],
            ),
        ],
        authored,
        shown,
        field.phone ? 14 / sq : 0,
    );
    const out: Piece[] = [];
    // every fixed drawing covers the world's words, which the view hides under it
    const covers: Piece[] = [],
        hidden: string[] = [];
    for (const s of f.sprites) {
        const shows = s.fixed ? !SCENERY.has(s.art) : READOUTS.has(s.art);
        if ((!shows && !s.fixed) || (s.alpha ?? 1) <= 0.05) continue;
        const b = await boxOf(s);
        if (!b) continue;
        const c = s.crop ?? { x: 0, y: 0, w: b.w, h: b.h };
        const at = s.fixed
            ? layout.at(s)
            : {
                  x: shown.w / 2 + (s.x - cam.x * (s.depth ?? 1)) * zoom,
                  y: shown.h / 2 + (s.y - cam.y) * zoom,
                  k: zoom,
              };
        const k = ((s.size ?? c.w) / c.w) * (s.scale ?? 1) * at.k;
        const w = c.w * k,
            h = c.h * k;
        const y = at.y - (s.stand ? h / 2 : 0);
        const piece = {
            name: `${s.art} ${s.key}`,
            word: false,
            fixed: s.fixed === true,
            x0: at.x - w / 2,
            y0: y - h / 2,
            x1: at.x + w / 2,
            y1: y + h / 2,
        };
        if (s.fixed) covers.push(piece);
        if (shows) out.push(piece);
    }
    for (const m of f.marks) {
        if (m.kind !== "word") continue;
        const text = wordOf(m, field.phone);
        if (!text.trim()) continue;
        const { x, y, k } = m.fixed
            ? layout.at(m)
            : {
                  x: shown.w / 2 + (m.x - cam.x) * zoom,
                  y: shown.h / 2 + (m.y - cam.y) * zoom,
                  k: zoom,
              };
        const size = Math.max(field.phone ? 14 : 0, (m.size ?? 0.8) * sq * k) / sq;
        const w = text.length * LETTER * size;
        const piece = {
            name: `"${text}"`,
            word: true,
            fixed: m.fixed === true,
            x0: x - w / 2,
            y0: y - 0.8 * size,
            x1: x + w / 2,
            y1: y + 0.2 * size,
        };
        const under = m.fixed
            ? undefined
            : covers.find((c) => meet(piece, c) && piece.x1 > 0 && piece.x0 < shown.w);
        if (under) hidden.push(`${piece.name} is hidden under ${under.name}`);
        else out.push(piece);
    }
    return {
        pieces: out.filter((p) => p.x1 > 0 && p.x0 < shown.w && p.y1 > 0 && p.y0 < shown.h),
        hidden,
    };
}

/** What a word says on the field: its shorter way on a phone, where it gives one. */
const wordOf = (m: Extract<Mark, { kind: "word" }>, phone: boolean): string =>
    phone && m.phone !== undefined ? m.phone : m.text;

const inside = (a: Piece, b: Piece): boolean =>
    a.x0 >= b.x0 - TOUCH && a.x1 <= b.x1 + TOUCH && a.y0 >= b.y0 - TOUCH && a.y1 <= b.y1 + TOUCH;
const meet = (a: Piece, b: Piece): boolean =>
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > TOUCH &&
    Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > TOUCH;

/** What is wrong with a frame's readouts: two that overlap, or a fixed one off the field. */
function faults(game: string, pieces: Piece[], shown: Size): string[] {
    const out: string[] = [];
    for (const p of pieces)
        if (
            p.fixed &&
            (p.x0 < -TOUCH || p.y0 < -TOUCH || p.x1 > shown.w + TOUCH || p.y1 > shown.h + TOUCH)
        )
            out.push(`${p.name} runs off the field`);
    for (let i = 0; i < pieces.length; i++)
        for (let j = i + 1; j < pieces.length; j++) {
            const a = pieces[i],
                b = pieces[j];
            if (!a || !b || !meet(a, b)) continue;
            // a word written on its own board, or a chip inside its strip, is one readout
            const nested = a.word && b.word ? false : inside(a, b) || inside(b, a);
            if (nested) continue;
            if (
                MEANT.some(
                    (m) =>
                        m.game === game &&
                        ((m.a.test(a.name) && m.b.test(b.name)) ||
                            (m.a.test(b.name) && m.b.test(a.name))),
                )
            )
                continue;
            out.push(`${a.name} overlaps ${b.name}`);
        }
    return out;
}

/** A small seeded hand: a held arrow, a tap of the big button or a touch somewhere on the view, changing four times a second. */
function hands(seed: number, view: Size, camera: { x: number; y: number }) {
    let n = seed;
    const rand = (): number => (n = (n * 1103515245 + 12345) >>> 0) / 4294967296;
    const dirs: Dir[] = ["left", "right", "up", "down"];
    return (): Pad => {
        const pad = emptyPad();
        const r = rand();
        if (r < 0.3) {
            const d = dirs[Math.floor(rand() * 4)] ?? "right";
            pad.held = d;
            pad.holding = [d];
            pad.pressed = [d];
        } else if (r < 0.5) {
            pad.go = true;
            pad.tapped = true;
        } else if (r < 0.8) {
            const at = {
                x: camera.x + (rand() - 0.5) * view.w,
                y: camera.y + (rand() - 0.5) * view.h,
            };
            pad.touch = at;
            pad.hover = at;
        }
        return pad;
    };
}

const SECONDS = 6;

async function check<S>(game: ActionGame<S>): Promise<string[]> {
    const out: string[] = [];
    for (let level = 0; level < game.levels.length; level++) {
        const s = game.start(level);
        const first = game.frame(s, true);
        const frames: { at: number; f: Frame }[] = [{ at: 0, f: first }];
        const next = hands(level * 7919 + 13, first.view, first.camera);
        let pad = next();
        for (let step = 1; step <= SECONDS * game.rate; step++) {
            if (step % Math.max(1, Math.round(game.rate / 4)) === 0) pad = next();
            game.step(s, pad);
            spent(pad);
            if (step % game.rate === 0)
                frames.push({ at: step / game.rate, f: game.frame(s, true) });
        }
        const turned = game.portrait?.hint === true;
        for (const { name, room } of turned ? [...ROOMS, TURNED] : ROOMS) {
            const field = fit(first.view, room, game.portrait?.keep);
            for (const { at, f } of frames) {
                const { pieces, hidden } = await piecesOf(f, field, game.seen ?? "side");
                // a word in the world may pass under a readout as the view moves, but not sit there at the start
                const found = [
                    ...faults(game.id, pieces, field.shown),
                    ...(at === 0 ? hidden : []),
                ];
                for (const fault of found)
                    out.push(`${game.id} level ${level + 1}, ${name}, ${at} s: ${fault}`);
            }
        }
    }
    return out;
}

test("no two readouts on a game's field overlap, and none runs off it, on a desktop, a wide screen and a phone", async () => {
    const all: string[] = [];
    for (const g of GAMES) if (g.group === "action") all.push(...(await check(g)));
    const seen = new Set<string>();
    const unique = all.filter((f) => {
        const k = f.replace(/, [\d.]+ s:/, ":");
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    assert.deepEqual(unique, []);
});
