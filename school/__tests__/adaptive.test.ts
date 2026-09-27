import assert from "node:assert/strict";
import { test } from "node:test";
import {
    acceptMove,
    authoredMove,
    choicesFor,
    groundedNumbers,
    nextHelp,
    startHelp,
} from "../adaptive";
import { adaptiveContext } from "../adaptive";
import type { AdaptiveContext, TutorMove } from "../adaptive";
import type { PackQuestion } from "../../engine/pack";

const question = (over: Partial<PackQuestion>): PackQuestion => ({
    n: 1,
    variant: "",
    env: {},
    answers: {},
    labels: null,
    ask: "",
    hints: [],
    feedback: [],
    scene: null,
    arranged: null,
    explain: null,
    ...over,
});

/** A scene of one part, placed nowhere, which is all the tutor reads of it. */
const drawing = (id: string, type: string): PackQuestion["scene"] => ({
    size: [10, 4],
    nodes: [{ id, type, v: {}, place: null }],
    arrows: [],
    marks: [],
    boxes: {},
});

const context = (over: Partial<AdaptiveContext> = {}): AdaptiveContext => ({
    lessonId: "g1-counting-to-twenty",
    questionN: 3,
    variant: "t=9,b=3",
    ask: "How many more beads are pushed across on the top wire than on the bottom wire?",
    answer: "6",
    hints: [
        "The beads pushed across sit together at the left of each wire.",
        "Read each wire in fives.",
    ],
    quantities: [
        { id: "top", what: "beads on the top wire", value: 9 },
        { id: "bottom", what: "beads on the bottom wire", value: 3 },
        { id: "difference", what: "how many more", value: 6, revealing: true },
    ],
    ringable: [
        { ref: "frame", what: "the whole rekenrek", spans: ["frame"] },
        { ref: "frame.row(0)", what: "the top wire", spans: ["frame.bead(0,0)"] },
    ],
    tries: [],
    made: [],
    checks: [],
    ...over,
});
const move = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    kind: "ask",
    say: "Look at the top wire.",
    ring: "frame.row(0)",
    quantityId: "top",
    prompt: "How many beads are pushed across on the top wire?",
    choices: [5, 9],
    why: "count one wire first",
    ...over,
});

test("a move the tutor may make is accepted whole", () => {
    const out = acceptMove(move(), context());
    assert.ok("move" in out);
    assert.equal(out.move.kind, "ask");
    assert.equal(out.move.ring, "frame.row(0)");
    assert.deepEqual(out.move.check?.choices, [5, 9]);
    assert.equal(out.move.check?.correct, 9);
    assert.equal(out.move.repaired, null);
});

test("a number the question does not hold is refused", () => {
    const out = acceptMove(move({ say: "There are 42 beads on the top wire." }), context());
    assert.ok("refused" in out);
    assert.equal(out.refused.reason, "number");
});

test("a part the picture does not draw is refused", () => {
    const out = acceptMove(move({ ring: "frame.row(7)" }), context());
    assert.ok("refused" in out);
    assert.equal(out.refused.reason, "ring");
});

test("a line that breaks the guide's voice is refused", () => {
    const out = acceptMove(move({ say: "I think you can count the top wire." }), context());
    assert.ok("refused" in out);
    assert.equal(out.refused.reason, "say");
});

test("the tutor may not check the quantity the question asks for", () => {
    const out = acceptMove(move({ quantityId: "difference" }), context());
    assert.ok("refused" in out);
    assert.match(out.refused.detail, /the question's own answer/);
});

test("choices that miss the right answer are replaced rather than the move refused", () => {
    const out = acceptMove(move({ choices: [4, 5] }), context());
    assert.ok("move" in out);
    assert.ok(out.move.check?.choices.includes(9));
    assert.match(out.move.repaired ?? "", /came from the question/);
});

test("the checker owns the answer, whatever the model says it is", () => {
    const out = acceptMove(move({ correct: 5 }), context());
    assert.ok("move" in out);
    assert.equal(out.move.check?.correct, 9);
});

test("the authored fallback walks the question's own hints in turn", () => {
    const first = authoredMove(context());
    assert.equal(first.origin, "authored");
    assert.equal(first.say, context().hints[0]);
    const second = authoredMove(context({ made: ["authored:show"] }));
    assert.equal(second.say, context().hints[1]);
});

test("the ground holds the wires, the steps between them and what the child has tried", () => {
    const numbers = groundedNumbers(
        context({ tries: [{ answer: "12", correct: false, told: null }] }),
    );
    assert.ok([3, 4, 5, 6, 7, 8, 9, 10, 12].every((n) => numbers.has(n)));
    assert.ok(!numbers.has(42));
});

test("choices sit either side of the right answer", () => {
    assert.deepEqual(choicesFor(3, new Set([2, 3, 4, 9])), [2, 3, 4]);
});

test("a skill's ground is inherited by any question of that skill, and a question with none is left to the guide", () => {
    const rekenrek = question({
        n: 3,
        variant: "t=9,b=3",
        env: { t: { k: "num", v: { n: 9, d: 1 } }, b: { k: "num", v: { n: 3, d: 1 } } },
        answers: { answer: "6" },
        ask: "How many more beads are pushed across on the top wire than on the bottom wire?",
        hints: ["Read each wire in fives."],
        scene: drawing("frame", "rekenrek"),
    });
    const taught = adaptiveContext({
        lessonId: "l",
        skills: ["subtraction.compare"],
        question: rekenrek,
        tries: [],
        made: [],
    });
    assert.ok(taught);
    assert.equal(taught.quantities.find((q) => q.id === "top")?.value, 9);
    // The question's own answer is the destination, never a check of the tutor's own.
    assert.equal(taught.quantities.find((q) => q.id === "difference")?.revealing, true);
    // A row rings its own beads rather than the anchor at its left end.
    assert.deepEqual(taught.ringable.find((r) => r.ref === "frame.row(1)")?.spans, [
        "frame.bead(1,0)",
        "frame.bead(1,1)",
        "frame.bead(1,2)",
    ]);
    const plain = question({
        n: 1,
        variant: "",
        env: {},
        answers: { answer: "4" },
        ask: "What is two and two?",
        hints: [],
        scene: drawing("words", "text"),
    });
    assert.equal(
        adaptiveContext({
            lessonId: "l",
            skills: ["reading.blend"],
            question: plain,
            tries: [],
            made: [],
        }),
        null,
    );
});

test("a help ends when the tutor hands back, and keeps what it has already said", () => {
    const first: TutorMove = {
        kind: "show",
        say: "Look at the bottom wire.",
        ring: "frame.row(1)",
        check: null,
        origin: "authored",
        repaired: null,
    };
    const help = startHelp({ lessonId: "l", questionN: 3, variant: "t=9,b=3", move: first });
    assert.equal(help.revision, 0);
    assert.equal(help.made.length, 1);
    const asked: TutorMove = {
        kind: "ask",
        say: "Count the bottom wire.",
        ring: "frame.row(1)",
        check: { quantityId: "bottom", prompt: "How many?", choices: [2, 3, 4], correct: 3 },
        origin: "gemini",
        repaired: null,
    };
    const second = nextHelp(help, null, asked);
    assert.equal(second.revision, 1);
    assert.equal(second.status, "presenting");
    const wrong = nextHelp(second, 2, asked);
    assert.equal(wrong.wrong, 1);
    assert.equal(wrong.checks.at(-1)?.correct, false);
    const back: TutorMove = { ...first, kind: "hand-back", say: "You are ready." };
    assert.equal(nextHelp(wrong, 3, back).status, "ended");
});
