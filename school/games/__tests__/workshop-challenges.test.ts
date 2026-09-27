import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { stepWorkshop, type WorkshopState } from "../workshops";
import {
    workshopChallenge,
    workshopChallengeCount,
    openWorkshopConfiguration,
    isWorkshopConfiguration,
} from "../workshop-challenges";

const CARGO_ROUTES = [
    [28, 32],
    [26, 29, 32],
    [24, 27, 30, 33],
    [22.5, 24.8, 27.3, 30.5, 33.2],
];
const wait = (s: WorkshopState, ticks: number) => {
    for (let tick = 0; tick < ticks; tick++) stepWorkshop(s, emptyPad());
};

test("workshop catalogue is deterministic, distinct within a phase and rejects unverified geometry", () => {
    for (let phase = 0; phase < 4; phase++) {
        const seen = new Set<string>();
        for (let seed = 0; seed < workshopChallengeCount(phase); seed++) {
            const configuration = workshopChallenge(seed, phase);
            assert.deepEqual(configuration, workshopChallenge(seed, phase));
            seen.add(JSON.stringify(configuration));
            const stored: unknown = JSON.parse(JSON.stringify(configuration));
            assert.ok(isWorkshopConfiguration(stored));
            assert.deepEqual(openWorkshopConfiguration(stored).definition, configuration.level);
            configuration.level.target = 999;
            assert.equal(isWorkshopConfiguration(configuration), false);
        }
        assert.equal(seen.size, workshopChallengeCount(phase));
    }
    assert.equal(isWorkshopConfiguration(null), false);
    assert.equal(isWorkshopConfiguration({ kind: "marble", phase: 0 }), false);
});

test("every generated cargo arrangement can be dragged, balanced and delivered with the common primary action", () => {
    for (const [phase, targets] of CARGO_ROUTES.entries())
        for (let seed = 0; seed < workshopChallengeCount(phase); seed++) {
            const s = openWorkshopConfiguration(workshopChallenge(seed, phase));
            wait(s, 120);
            for (const [i, p] of s.definition.pieces.entries()) {
                const body = s.objects.get(p.id);
                assert.ok(body);
                const x = targets[(i + (phase === 0 ? 0 : seed)) % targets.length];
                assert.notEqual(x, undefined);
                if (x === undefined) throw new Error("Missing cargo witness");
                const at = s.world.where(body);
                stepWorkshop(s, { ...emptyPad(), touch: { x: at.x, y: at.y } });
                assert.equal(s.held, p.id);
                stepWorkshop(s, { ...emptyPad(), touch: { x: at.x, y: 8 } });
                stepWorkshop(s, { ...emptyPad(), touch: { x, y: 8 } });
                for (let n = 0; n < 360; n++)
                    stepWorkshop(s, { ...emptyPad(), touch: { x, y: 20 } });
                stepWorkshop(s, { ...emptyPad(), lifted: { x, y: 20 } });
                wait(s, 180);
            }
            wait(s, 180);
            stepWorkshop(s, { ...emptyPad(), tapped: true });
            assert.equal(s.phase, "won", `cargo phase ${phase}, seed ${seed}`);
            assert.ok(s.goals.done.includes("balanced"));
            assert.ok(s.goals.done.includes("delivered"));
        }
});
