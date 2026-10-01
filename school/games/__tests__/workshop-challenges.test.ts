import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { stepWorkshop, type WorkshopState } from "../workshops";
import {
    workshopChallenge,
    workshopChallengeCount,
    openWorkshopConfiguration,
    isWorkshopConfiguration,
    cargoPlan,
} from "../workshop-challenges";

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

test("every generated cargo arrangement is delivered by dragging its crates to the plan and letting go", () => {
    for (let phase = 0; phase < 4; phase++)
        for (let seed = 0; seed < workshopChallengeCount(phase); seed++) {
            const s = openWorkshopConfiguration(workshopChallenge(seed, phase)),
                plan = cargoPlan(s.definition);
            wait(s, 60);
            for (const [i, p] of s.definition.pieces.entries()) {
                const body = s.objects.get(p.id);
                assert.ok(body);
                const at = s.world.where(body),
                    x = plan[i] ?? 30;
                stepWorkshop(s, { ...emptyPad(), touch: { x: at.x, y: at.y } });
                assert.equal(s.held, p.id);
                for (let n = 0; n < 90; n++)
                    stepWorkshop(s, { ...emptyPad(), touch: { x, y: 10 } });
                stepWorkshop(s, { ...emptyPad(), lifted: { x, y: 10 } });
                for (let n = 0; n < 900 && (s.held || s.placing); n++) wait(s, 1);
                wait(s, 30);
            }
            for (let n = 0; n < 600 && s.phase !== "won"; n++) wait(s, 1);
            assert.equal(s.phase, "won", `cargo phase ${phase}, seed ${seed}`);
            assert.ok(s.goals.done.includes("balanced"));
            assert.ok(s.goals.done.includes("delivered"));
        }
});
