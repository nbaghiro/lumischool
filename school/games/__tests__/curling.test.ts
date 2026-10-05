// Curling on the pond: every variation of every level is won by throws the solver found, by the keys
// and by a finger, and those pads replay to the same pond; sweeping carries a stone further; a stone
// short of the hog line comes off; the rings score 4 to 1; blue's throws are the same every time; a
// press made at random rarely wins; the state is plain data; and only shelf drawings are drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import {
    CURL_LEVELS,
    ICE,
    POND,
    curlingGame,
    endScore,
    ringOf,
    startCurl,
    type CurlState,
    readings,
} from "../curling";
import { CURL_VARIANTS, curlWay, openCurlConfiguration } from "../curling-challenges";

const level = (i: number) => {
    const L = CURL_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};

const play = (s: CurlState, pads: readonly Pad[]) => {
    for (const p of pads)
        curlingGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
    for (let i = 0; i < 60 * 40 && !curlingGame.won(s) && curlingGame.still.settling?.(s); i++)
        curlingGame.step(s, emptyPad());
};

test("every variation of every level is won by the keys and by a finger, and the same pads replay to the same pond", () => {
    for (let phase = 0; phase < CURL_LEVELS.length; phase++)
        for (let variant = 0; variant < CURL_VARIANTS; variant++)
            for (const hands of ["keys", "touch"] as const) {
                const c = { phase, variant };
                const way = curlWay(c, hands);
                assert.ok(way, `${phase}/${variant} by ${hands}: no way found`);
                const a = openCurlConfiguration(c),
                    b = openCurlConfiguration(c);
                play(a, way);
                play(b, way);
                assert.ok(curlingGame.won(a), `${phase}/${variant} by ${hands}: not won`);
                assert.equal(JSON.stringify(a.stones), JSON.stringify(b.stones));
            }
});

test("a stone is pulled back from the hack and let go, and holding the ice sweeps it further", () => {
    const throwIt = (sweep: boolean) => {
        const s = startCurl(level(0));
        const at = { x: POND.hack, y: POND.mid };
        curlingGame.step(s, { ...emptyPad(), touch: at });
        curlingGame.step(s, { ...emptyPad(), touch: { x: at.x - 3.6, y: at.y } });
        curlingGame.step(s, { ...emptyPad(), lifted: { x: at.x - 3.6, y: at.y } });
        assert.equal(s.mode, "glide");
        for (let i = 0; i < 60 * 30 && s.mode === "glide"; i++)
            curlingGame.step(
                s,
                sweep ? { ...emptyPad(), touch: { x: 30 + (i % 2), y: 17 } } : emptyPad(),
            );
        return s.stones.find((x) => x.team === "ours");
    };
    const plain = throwIt(false),
        swept = throwIt(true);
    assert.ok(plain && swept);
    assert.ok(swept.out || swept.x > plain.x + 2, "sweeping did not carry the stone on");
});

test("a tap on the stone changes its curl, and the stone bends the way it was turned", () => {
    const s = startCurl(level(3));
    const at = { x: POND.hack, y: POND.mid };
    assert.equal(s.curl, 1);
    curlingGame.step(s, { ...emptyPad(), touch: at });
    curlingGame.step(s, { ...emptyPad(), lifted: at });
    assert.equal(s.curl, -1);
    const b = startCurl(level(3));
    curlingGame.step(b, { ...emptyPad(), brake: true });
    assert.equal(b.curl, -1);
});

test("a stone short of the hog line comes off, and the rings score 4 at the button down to 1", () => {
    const s = startCurl(level(2));
    curlingGame.step(s, { ...emptyPad(), go: true, tapped: true });
    for (let i = 0; i < 60 * 30 && s.mode === "glide"; i++) curlingGame.step(s, emptyPad());
    assert.equal(s.stones.filter((x) => !x.out).length, 0, "a short stone stayed on");
    assert.match(s.note, /hog line/);
    const at = (dx: number) =>
        ringOf({
            id: 9,
            team: "ours",
            x: POND.tee + dx,
            y: POND.mid,
            vx: 0,
            vy: 0,
            spin: 0,
            turn: 0,
            out: false,
        });
    assert.deepEqual(
        [0, 1.5, 2.5, 3.5, 4.5].map((d) => at(d)),
        [4, 3, 2, 1, 0],
    );
});

test("an end is scored as real curling scores it: only stones nearer than the other side's nearest", () => {
    const s = startCurl(level(7));
    const put = (team: "ours" | "theirs", dx: number, id: number) =>
        s.stones.push({
            id,
            team,
            x: POND.tee + dx,
            y: POND.mid,
            vx: 0,
            vy: 0,
            spin: 0,
            turn: 0,
            out: false,
        });
    s.stones = [];
    put("ours", 0.2, 1);
    put("ours", 1, 2);
    put("theirs", 1.6, 3);
    put("ours", 2.4, 4);
    assert.deepEqual(endScore(s), { ours: 2, theirs: 0 });
});

test("blue's throws land the same every time for a seed", () => {
    const run = () => {
        const s = startCurl(level(7), 7, 3);
        for (let i = 0; i < 60 * 20 && !(s.mode === "aim" && s.turn === "ours"); i++)
            curlingGame.step(s, emptyPad());
        return JSON.stringify(s.stones);
    };
    assert.equal(run(), run());
});

test("presses made at random rarely win a level", () => {
    for (let phase = 0; phase < CURL_LEVELS.length; phase++) {
        let wins = 0;
        for (let t = 0; t < 10; t++) {
            let seed = (t + 1) * 9973 + phase;
            const rnd = () => {
                seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
                return seed / 4294967296;
            };
            const s = openCurlConfiguration({ phase, variant: 0 });
            const dirs: Dir[] = ["up", "down", "left", "right"];
            for (let i = 0; i < 60 * 60 && !curlingGame.won(s); i++) {
                const p = emptyPad(),
                    r = rnd();
                if (r < 0.3) {
                    const d = dirs[Math.floor(rnd() * 4)] ?? "up";
                    p.holding = [d];
                    p.held = d;
                } else if (r < 0.32) {
                    p.tapped = true;
                    p.go = true;
                } else if (r < 0.34) p.brake = true;
                curlingGame.step(s, p);
            }
            if (curlingGame.won(s)) wins++;
        }
        assert.ok(wins <= 2, `level ${phase} won ${wins} of 10 at random`);
    }
});

test("the state is plain data, the frame draws only shelf drawings, and the tuning is sound", () => {
    for (let phase = 0; phase < CURL_LEVELS.length; phase++) {
        const s = curlingGame.start(phase, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (let i = 0; i < 90; i++) curlingGame.step(s, emptyPad());
        for (const rest of [false, true])
            for (const sp of curlingGame.frame(s, rest).sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        const L = CURL_LEVELS[phase];
        assert.ok(
            L && !/[—!]/.test(`${L.goal} ${L.prompt}`),
            "a goal with a dash or an exclamation",
        );
    }
    assert.deepEqual(faults(ICE), []);
});

test("under reduced motion a throw settles where the stones stop", () => {
    const s = startCurl(level(0));
    curlingGame.step(s, { ...emptyPad(), go: true, tapped: true });
    assert.ok(curlingGame.still.settling?.(s));
    for (let i = 0; i < 60 * 40 && curlingGame.still.settling?.(s); i++)
        curlingGame.step(s, emptyPad());
    assert.equal(curlingGame.still.settling?.(s), false);
    const f = curlingGame.frame(s, true);
    assert.ok(!f.sprites.some((sp) => sp.art === "snowflake"), "snow falls under reduced motion");
});

test("two stones that read the same to the half square are read to the tenth, so the nearer never reads as a tie", () => {
    assert.deepEqual(readings(1.4, 1.6), ["1.4", "1.6"]);
    assert.deepEqual(readings(1.38, 1.62), ["1.4", "1.6"]);
    assert.deepEqual(readings(1.2, 2.6), ["1", "2.5"]);
    assert.deepEqual(readings(2, 2), ["2", "2"]);
});
