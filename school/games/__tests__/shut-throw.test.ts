// Shut the box thrown by hand: every level is shut by the hand's own moves and by the tray's, a
// throw flies the way it was flicked and still shows the mechanic's fair dice, every beat starts on
// the board before it and ends exactly on the board after, and the same throw tumbles the same way.
import { test } from "node:test";
import assert from "node:assert/strict";
import { atRest, jumps, mismatches, poseAt, type Beat } from "../../../engine/motion/beat";
import type { Pt } from "../../../engine/motion/geometry";
import { SHELF_IDS } from "./shelf";
import { explore, nudge } from "../prove";
import { readBox, shutGame, THROW } from "../shut-hands";
import type { Choice, Ctx, Release } from "../hands";
import type { Position } from "../games";
import { sampled } from "./positions";

/** A stage that answers the box's anchors as the drawing lays them out, and draws nothing. */
const board: Ctx = {
    stage: {
        show() {},
        anchor: (_key: string, name: string): Pt | null => {
            const n = /^hinge\((\d+)\)$/.exec(name)?.[1];
            if (n) return { x: 1 + Number(n) * 3, y: 3 };
            if (name === "tray") return { x: 1.5, y: 5 };
            if (name === "trayEnd") return { x: 33, y: 14 };
            return null;
        },
        at: () => null,
        turned: () => 0,
        rect: () => null,
        z: () => 0,
        place() {},
        glide() {},
        follow() {},
        nudge() {},
        lift() {},
        tag() {},
        remove() {},
        marks() {},
        room: 1024,
    },
    minTarget: () => 44 / 20,
};

/** The move a die can be dropped or tapped for, wherever the hand may put it. */
function handMoves(pos: Position, session: ReturnType<typeof shutGame.open>): Set<number> {
    const out = new Set<number>();
    for (const h of session.handles(pos)) {
        const all: Choice[] = [
            ...(h.targets ?? []).map((t) => t.carries),
            ...(h.tap ? [h.tap] : []),
        ];
        for (const c of all) for (const m of c.moves) out.add(m);
    }
    return out;
}

const flicks: (Pt | null)[] = [null, { x: -20, y: -6 }, { x: 4, y: -18 }, { x: -9, y: 3 }];

test("every level is shut by moves a hand plays, and by the tray's, the dice thrown with a flick", () => {
    for (const level of shutGame.levels) {
        const r = level.round(),
            ex = explore(r),
            session = shutGame.open(r, board);
        let pos = r.start,
            played = 0;
        while (!pos.won && played < 200) {
            const m = nudge(ex, pos);
            assert.ok(m !== null, `${level.title}: no way on from ${pos.key}`);
            assert.ok(
                handMoves(pos, session).has(m),
                `${level.title}: the hand cannot play ${pos.moves[m]?.say}`,
            );
            pos = pos.moves[m]?.next() ?? pos;
            played++;
        }
        assert.ok(pos.won, `${level.title} is shut`);
    }
});

/** The beat a session gives a move, with a flick for a throw. */
function beatOf(
    session: ReturnType<typeof shutGame.open>,
    from: Position,
    to: Position,
    v: Pt | null,
    seed: number,
): {
    beat: Beat;
    hand: Release | null;
    was: ReturnType<typeof session.parts>;
    now: ReturnType<typeof session.parts>;
} {
    const was = session.parts(from),
        now = session.parts(to);
    const die = was.parts.find((p) => p.key === "die:0");
    const hand: Release | null =
        v && die?.at
            ? { key: "die:0", at: { x: die.at.x + 3, y: die.at.y - 2 }, v, angle: 0.2 }
            : null;
    const beat = session.beat?.(from, to, { was, now, hand, seed });
    assert.ok(beat);
    return { beat, hand, was, now };
}

test("every beat starts on the board before its move, or in the hand, and ends exactly on the board after", () => {
    let checked = 0;
    for (const level of shutGame.levels) {
        const r = level.round(),
            session = shutGame.open(r, board);
        for (const from of sampled(r, 30))
            from.moves.forEach((move, i) => {
                const to = move.next();
                for (const v of readBox(from).live ? [null] : flicks) {
                    const { beat, hand, was, now } = beatOf(session, from, to, v, i);
                    const where = `${level.title}: ${move.say} from ${from.key}`;
                    assert.ok(beat.length > 0, where);
                    assert.deepEqual(mismatches(beat, now), [], `${where} does not land`);
                    assert.deepEqual(
                        jumps(beat, now, was, hand ?? undefined),
                        [],
                        `${where} jumps`,
                    );
                    assert.deepEqual(mismatches(atRest(beat), now), [], `${where} at rest`);
                    checked++;
                }
            });
    }
    assert.ok(checked > 200, `only ${checked}`);
});

test("a flick changes how the dice fly and never what they show: the faces are the mechanic's fair throw", () => {
    const level = shutGame.levels[2];
    assert.ok(level);
    const r = level.round(),
        session = shutGame.open(r, board);
    const throwsAt = sampled(r, 400).filter((p) => !readBox(p).live && !p.won);
    assert.ok(throwsAt.length > 5);
    for (const from of throwsAt) {
        const [move] = from.moves;
        assert.ok(move);
        const to = move.next(),
            faces = readBox(to).dice;
        const paths = flicks.map((v) => {
            const { beat, now } = beatOf(session, from, to, v, 5);
            const shown = now.parts
                .filter((p) => p.key?.startsWith("die:"))
                .map((p) => p.params.face);
            assert.deepEqual(shown, faces, "the board after the throw shows the mechanic's dice");
            // from the moment the dice leave the hand they tumble on the faces they will show
            const leaving = poseAt(beat, now, 0.2);
            assert.deepEqual(
                [0, 1].map((k) => leaving.get(`die:${k}`)?.params.face),
                faces,
                "and the tumble turns up those faces",
            );
            const mid = beat.tracks.find((t) => t.key === "die:0" && t.ch === "x" && t.at > 0.3);
            return mid?.from;
        });
        assert.ok(new Set(paths).size >= 3, "different flicks fly different ways");
    }
});

test("a hard flick is heard on the walls and jolts the box, and the same throw tumbles the same way", () => {
    const r = shutGame.levels[0]?.round();
    assert.ok(r);
    const session = shutGame.open(r, board),
        from = r.start,
        to = from.moves[0]?.next();
    assert.ok(to);
    const hard = beatOf(session, from, to, { x: -22, y: -8 }, 3).beat;
    assert.ok(hard.cues.filter((c) => c.cue === "bump").length >= 1);
    assert.ok(hard.tracks.some((t) => t.key === "box" && t.ch === "angle"));
    const soft = beatOf(session, from, to, null, 3).beat;
    assert.ok(!soft.tracks.some((t) => t.key === "box"), "a throw from where they lie does not");
    assert.deepEqual(beatOf(session, from, to, { x: -22, y: -8 }, 3).beat, hard);
    assert.notDeepEqual(beatOf(session, from, to, { x: -22, y: -8 }, 4).beat, hard);
});

test("the throw's drawings are on the shelf, and the flick's range is sound", () => {
    const r = shutGame.levels[4]?.round();
    assert.ok(r);
    const session = shutGame.open(r, board);
    for (const p of session.parts(r.start).parts) assert.ok(SHELF_IDS.has(p.art), p.art);
    assert.ok(SHELF_IDS.has(shutGame.cover.art));
    assert.ok(THROW.min > 0 && THROW.min < THROW.max && THROW.dead < THROW.min);
    assert.ok(!/[—!]/.test(shutGame.hint));
});

test("a throw lands on the thrown faces, bounces lower each time, steps through few looks, and never leaves the dice overlapping", () => {
    let throws = 0;
    for (const level of shutGame.levels) {
        const r = level.round(),
            session = shutGame.open(r, board);
        for (const from of sampled(r, 60).filter((p) => !readBox(p).live && !p.won)) {
            const [move] = from.moves;
            const to = move?.next();
            if (!to) continue;
            for (const v of flicks)
                for (const seed of [1, 2, 3]) {
                    const { beat, now } = beatOf(session, from, to, v, seed);
                    const where = `${level.title} from ${from.key}`;
                    assert.ok(beat.length >= 0.8 && beat.length <= 2.2, `${where}: ${beat.length}`);
                    // the turn on the table is the sprite's angle, so the drawing never animates it
                    assert.ok(!beat.tracks.some((t) => t.ch === "param:turn"), where);
                    const dice = now.parts.filter((p) => p.key?.startsWith("die:"));
                    for (const die of dice) {
                        const key = die.key ?? "";
                        const rolls = beat.sets
                            .filter((x) => x.key === key && typeof x.params?.roll === "number")
                            .map((x) => Number(x.params?.roll));
                        for (const roll of rolls)
                            assert.ok(Math.abs(roll * 12 - Math.round(roll * 12)) < 1e-9, where);
                        const looks = new Set(rolls);
                        assert.ok(looks.size <= 120, `${where}: ${looks.size} looks`);
                        const end = poseAt(beat, now, beat.length).get(key);
                        assert.equal(end?.params.face, die.params.face, where);
                        const peaks: number[] = [];
                        for (const t of beat.tracks.filter(
                            (x) => x.key === key && x.ch === "scale",
                        ))
                            peaks.push(Math.max(t.from, t.to));
                        assert.ok(peaks.length > 0 && Math.max(...peaks) > 1.05, where);
                    }
                    const [a, b] = dice;
                    if (a?.at && b?.at)
                        assert.ok(
                            Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) >= 2,
                            `${where}: the dice overlap at rest`,
                        );
                    throws++;
                }
        }
    }
    assert.ok(throws > 50, `only ${throws}`);
});
