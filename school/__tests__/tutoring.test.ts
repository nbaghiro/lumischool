import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
    frameOf,
    readTeachingMaterial,
    reduceTeaching,
    startTeaching,
    type TeachingState,
} from "../../engine/teaching";
import { TEACHING_MATERIALS } from "../tutoring-materials";
import { acceptTutorProposal, nextTeaching } from "../tutoring";

for (const material of TEACHING_MATERIALS) {
    test(`${material.id}: fresh independent checks follow support, ending without lesson credit`, () => {
        let state = startTeaching(material);
        const phases = new Set<string>();
        for (let i = 0; i < 40 && state.status !== "ended"; i++) {
            const f = frameOf(material, state.step.frameId);
            phases.add(f.phase);
            state = nextTeaching(material, state, {
                operationId: randomUUID(),
                expectedRevision: state.revision,
                action: f.question ? "answer" : "continue",
                ...(f.question ? { answer: f.question.correct } : {}),
            });
        }
        assert.equal(state.status, "ended");
        assert.ok(phases.has("independent"));
        assert.ok(phases.has("recap"));
        assert.ok(state.history.some((h) => h.correct === true));
    });
    test(`${material.id}: repeated confusion ends instead of trapping the learner`, () => {
        let state = startTeaching(material);
        for (let i = 0; i < 40 && state.status !== "ended"; i++) {
            const f = frameOf(material, state.step.frameId);
            state = nextTeaching(material, state, {
                operationId: randomUUID(),
                expectedRevision: state.revision,
                action: f.question ? "answer" : "continue",
                ...(f.question
                    ? { answer: f.question.choices.find((c) => c !== f.question?.correct) }
                    : {}),
            });
        }
        assert.equal(state.status, "ended");
        assert.equal(state.assisted, true);
    });
    test(`${material.id}: malformed materials and model moves never render`, () => {
        assert.equal(readTeachingMaterial({ ...material, first: "missing" }), null);
        assert.equal(
            acceptTutorProposal(
                { frameId: "missing", caption: "hello", spokenText: "hello", factIds: [] },
                material,
                [material.first],
            ),
            null,
        );
        assert.equal(
            acceptTutorProposal(
                {
                    frameId: material.first,
                    caption: "Go to https://example.com",
                    spokenText: "hello",
                    factIds: [`${material.first}.0`],
                },
                material,
                [material.first],
            ),
            null,
        );
        assert.equal(
            acceptTutorProposal(
                {
                    frameId: material.first,
                    caption: "Add 99999",
                    spokenText: "Add 99999",
                    factIds: [`${material.first}.0`],
                },
                material,
                [material.first],
            ),
            null,
        );
    });
}
test("paused and ended boards ignore in-flight results", () => {
    const m = TEACHING_MATERIALS[0];
    assert.ok(m);
    const initial = startTeaching(m);
    const next: TeachingState = { ...initial, revision: 1 };
    const requested = reduceTeaching(initial, { kind: "request" });
    const paused = reduceTeaching(requested, { kind: "pause" });
    assert.equal(
        reduceTeaching(paused, { kind: "accept", expectedRevision: 0, state: next }),
        paused,
    );
    assert.equal(
        reduceTeaching(requested, { kind: "accept", expectedRevision: 1, state: next }),
        requested,
    );
    const ended = reduceTeaching(requested, { kind: "end" });
    assert.equal(
        reduceTeaching(ended, { kind: "accept", expectedRevision: 0, state: next }),
        ended,
    );
});
