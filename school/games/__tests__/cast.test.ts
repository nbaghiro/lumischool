// Gone fishing: a cast comes down where its arc meets the water, a fish takes the hook only within
// its reach, and nothing leaves the water but onto the pan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";

/** Every way to fill a pan of `holds` from a sea, as the fish's indices, each fish at most once. */
function panfuls(n: number, holds: number): number[][] {
    const out: number[][] = [];
    const walk = (from: number, got: number[]): void => {
        if (got.length === holds) {
            out.push(got);
            return;
        }
        for (let i = from; i < n; i++) walk(i + 1, [...got, i]);
    };
    walk(0, []);
    return out;
}

/** A cast played by a finger: press on the float at the rod, pull it back by `pull` squares from there, let go, and step until the cast has come to something. */
async function castBy(
    s: import("../cast").CastState,
    pull: { x: number; y: number },
): Promise<void> {
    const cast = await import("../cast");
    const pad = emptyPad(),
        at = { x: s.float.x, y: s.float.y };
    pad.touch = at;
    cast.step(s, pad);
    spent(pad);
    pad.touch = { x: at.x + pull.x, y: at.y + pull.y };
    cast.step(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    cast.step(s, pad);
    spent(pad);
    for (
        let i = 0;
        i < 60 * 20 &&
        (s.phase === "fly" ||
            s.phase === "sink" ||
            s.phase === "reel" ||
            s.flights.length > 0 ||
            s.home);
        i++
    ) {
        cast.step(s, pad);
        spent(pad);
    }
}

test("every fishing level's weight can be made with as many fish as the pan holds, and a pan filled at random makes it at most one time in five", async () => {
    const { CAST_LEVELS, start } = await import("../cast");
    for (const [level, L] of CAST_LEVELS.entries()) {
        const s = start(level),
            values = s.fish.map((f) => L.kinds[f.kind]?.value ?? 0),
            all = panfuls(values.length, L.holds);
        const makes = all.filter(
            (p) => Math.abs(p.reduce((a, i) => a + (values[i] ?? 0), 0) - L.target) < 1e-9,
        );
        assert.ok(makes.length > 0, `${L.title} cannot be made`);
        assert.ok(makes.length / all.length <= 0.2, `${L.title}: ${makes.length} of ${all.length}`);
    }
});

test("a cast comes down where its arc meets the water", async () => {
    const cast = await import("../cast");
    const { landing } = await import("../../../engine/motion/flight");
    for (const pull of [
        { x: -3, y: 2 },
        { x: -4.5, y: 1 },
        { x: -1.5, y: 1.2 },
    ]) {
        const s = cast.start(0);
        for (const f of s.fish) f.cool = 1e9;
        const want = landing(cast.TIP, cast.launchOf(pull), cast.G, cast.SEA.surface);
        await castBy(s, pull);
        assert.ok(
            want && s.landed[0] !== undefined && Math.abs(s.landed[0] - want.at.x) < 0.3,
            `${JSON.stringify(pull)} landed at ${s.landed[0]}, the arc says ${want?.at.x}`,
        );
        assert.equal(s.phase, "bed", "with no fish looking, the hook sinks to the bottom");
    }
});

test("a fish takes the hook only within its reach, and the first fish to reach it is the one that takes it", async () => {
    const cast = await import("../cast");
    const s = cast.start(0),
        pad = emptyPad(),
        x = 34;
    const light = s.fish.findIndex((f) => f.kind === 0),
        heavy = s.fish.findIndex((f) => f.kind === s.L.kinds.length - 1);
    s.fish.forEach((f, i) => {
        if (i !== light && i !== heavy) {
            f.x = cast.SEA.left;
            f.cool = 1e9;
        }
    });
    for (const i of [light, heavy]) {
        const f = s.fish[i];
        if (f) {
            f.dir = 1;
            f.x = x - 2.5;
            f.y = f.lane;
        }
    }
    cast.plop(s, x, []);
    for (let n = 0; n < 60 * 15 && s.phase === "sink"; n++) {
        cast.step(s, pad);
        spent(pad);
    }
    assert.equal(s.line, light, "the light fish near the top meets the sinking hook first");
    const far = cast.start(0);
    for (const f of far.fish) {
        f.x = cast.SEA.left;
        f.dir = -1;
    }
    cast.plop(far, 45, []);
    for (let n = 0; n < 60 * 15 && far.phase === "sink"; n++) {
        for (const f of far.fish)
            assert.ok(
                Math.hypot(
                    cast.mouthOf(far, f).x - far.hook.x,
                    cast.mouthOf(far, f).y - far.hook.y,
                ) > cast.CASTING.reach.value || far.line !== null,
            );
        cast.step(far, pad);
        spent(pad);
    }
    assert.equal(far.phase, "bed", "no fish within reach, no bite");
});

test("throwing a fish back always makes room on the pan, and a full pan that is not the weight never wins", async () => {
    const cast = await import("../cast");
    for (const [level, L] of cast.CAST_LEVELS.entries()) {
        const s = cast.start(level),
            pad = emptyPad();
        const wrong = panfuls(s.fish.length, L.holds).find(
            (p) =>
                Math.abs(
                    p.reduce((a, i) => a + (L.kinds[s.fish[i]?.kind ?? 0]?.value ?? 0), 0) -
                        L.target,
                ) > 1e-9,
        );
        assert.ok(wrong);
        for (const i of wrong ?? []) {
            const f = s.fish[i];
            if (f) {
                f.at = "pan";
                s.pan.push(i);
            }
        }
        for (let n = 0; n < 60 * 3; n++) {
            cast.step(s, pad);
            spent(pad);
        }
        assert.equal(s.won, false, `${L.title}: a wrong pan does not win`);
        assert.ok(cast.castGame.back?.(s));
        for (let n = 0; n < 60 * 3; n++) {
            cast.step(s, pad);
            spent(pad);
        }
        assert.equal(s.pan.length, L.holds - 1);
        assert.equal(s.fish[wrong?.at(-1) ?? 0]?.at, "sea", "the fish is back in the sea");
    }
});

test("the same casts give the same sea, fish for fish", async () => {
    const cast = await import("../cast");
    const play = async () => {
        const s = cast.start(2);
        for (const pull of [
            { x: -3, y: 2 },
            { x: -4, y: 1.5 },
            { x: -2, y: 2.5 },
            { x: -4.8, y: 0.8 },
        ]) {
            await castBy(s, pull);
            if (s.phase === "bed") {
                const pad = emptyPad();
                pad.tapped = true;
                cast.step(s, pad);
                spent(pad);
                for (let i = 0; i < 60 * 5; i++) cast.step(s, pad);
            }
        }
        return JSON.stringify({ fish: s.fish, pan: s.pan, steps: s.steps, landed: s.landed });
    };
    assert.equal(await play(), await play());
});

test("nothing leaves the water but onto the pan, whatever the casts", async () => {
    const cast = await import("../cast");
    const rand = seeded(4242);
    for (const level of [0, 3, 5]) {
        const s = cast.start(level),
            pad = emptyPad();
        for (let n = 0; n < 60 * 60; n++) {
            if (s.phase === "rest" && !s.home && !s.flights.length && n % 90 === 0) {
                if (s.pan.length >= s.L.holds) cast.castGame.back?.(s);
                else cast.castWith(s, cast.launchOf({ x: -1 - rand() * 4, y: rand() * 3 }), []);
            }
            if (s.phase === "bed") pad.tapped = true;
            cast.step(s, pad);
            spent(pad);
            for (const f of s.fish) {
                if (f.at !== "sea") continue;
                assert.ok(
                    f.y > cast.SEA.surface &&
                        f.y < cast.BED &&
                        f.x > cast.SEA.left - 3 &&
                        f.x < cast.SEA.right + 3,
                    `a fish left the water at ${f.x}, ${f.y}`,
                );
            }
        }
        // A won round has tipped its catch from the pan into the basket, and the pan still names those fish.
        assert.equal(
            s.fish.filter((f) => f.at === "pan" || f.at === "basket").length,
            s.pan.length,
        );
    }
});

test("under reduced motion a cast is worked out to its bite or to the bottom", async () => {
    const cast = await import("../cast");
    const s = cast.start(0),
        pad = emptyPad();
    const press = () => {
        for (let i = 0; i < cast.castGame.still.press(s); i++) {
            cast.step(s, pad);
            spent(pad);
        }
        let n = 0;
        while (cast.castGame.still.settling?.(s) && n++ < 60 * 30) cast.step(s, emptyPad());
    };
    pad.pressed.push("right");
    press();
    pad.tapped = true;
    press();
    assert.ok(
        s.phase === "bed" || s.pan.length === 1,
        `after a cast the hook is on the bottom or a fish is on the pan, not ${s.phase}`,
    );
    assert.ok(!cast.castGame.still.settling?.(s));
});

test("every drawing the fishing draws over a minute of casting is on the shelf", async () => {
    const cast = await import("../cast");
    const known = SHELF_IDS;
    const rand = seeded(99);
    for (const level of [0, 5]) {
        const s = cast.start(level),
            pad = emptyPad();
        for (let n = 0; n <= 60 * 60; n++) {
            if (s.phase === "rest" && !s.home && !s.flights.length && n % 120 === 0)
                cast.castWith(s, cast.launchOf({ x: -2 - rand() * 3, y: 1 + rand() * 2 }), []);
            if (s.phase === "bed") pad.tapped = true;
            cast.step(s, pad);
            spent(pad);
            if (n % 30 === 0)
                for (const sp of [...cast.frame(s).sprites, ...cast.frame(s, true).sprites])
                    assert.ok(
                        known.has(sp.art),
                        `${sp.key} asks for ${sp.art}, which is not on the shelf`,
                    );
        }
    }
});
