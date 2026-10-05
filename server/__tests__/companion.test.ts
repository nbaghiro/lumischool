import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PackLesson, PackQuestion } from "../../engine/pack";
import { explainScript, stepWords } from "../companion";

const question = (over: Partial<PackQuestion>): PackQuestion => ({
    n: 1,
    variant: "a=9,b=8",
    env: {},
    answers: { answer: "17" },
    labels: null,
    ask: "9 and 8 make how many?",
    hints: ["Make a ten from the 9 first.", "Ten and seven more."],
    feedback: [],
    scene: {
        size: [20, 6],
        nodes: [
            { type: "tenframe", id: "frame", v: {}, place: null },
            { type: "number-input", id: "answer", v: {}, place: null },
        ],
        arrows: [],
        marks: [],
        boxes: { frame: { x: 0, y: 0, w: 10, h: 6 }, answer: { x: 12, y: 2, w: 4, h: 2 } },
    },
    arranged: null,
    explain: "Nine and one make ten, and seven are left over.",
    ...over,
});

const lesson: PackLesson = {
    pack: 2,
    id: "g1-bridge",
    source: "lessons/g1-05-bridge.lumi",
    title: "A little bridge to ten",
    goal: "Add by making a ten first.",
    grade: 1,
    unit: 5,
    subject: "maths",
    format: "teach",
    art: [],
    levels: {
        medium: {
            hash: "medium-hash",
            grownUps: ["Let them use real counters if the frame is hard to see."],
            sections: [
                {
                    type: "look",
                    stars: null,
                    blocks: [
                        { k: "say", text: "To add 8 and 5, fill the frame first." },
                        { k: "grown-ups", text: "Watch for counting from one." },
                        {
                            k: "ask",
                            how: "practice",
                            item: {
                                id: "add.bridge",
                                hash: "h",
                                title: null,
                                skills: [],
                                check: null,
                            },
                            questions: [question({})],
                            again: [],
                        },
                    ],
                },
            ],
        },
    },
};

const read = (id: string): PackLesson | null => (id === lesson.id ? lesson : null);
const where = { lesson: lesson.id, level: "medium" as const, n: 1, variant: "a=9,b=8" };

describe("what the companion says", () => {
    it("explains a lesson in its own words, with no answer in them", () => {
        const said = explainScript(lesson, "medium");
        assert.match(said, /This lesson is called A little bridge to ten\./);
        assert.match(said, /Today we will add by making a ten first\./);
        assert.match(said, /To add 8 and 5, fill the frame first\./);
        assert.doesNotMatch(said, /17|real counters|counting from one/);
    });

    it("says a step in words it builds from the pack, never words a page sends", () => {
        assert.equal(
            stepWords(read, { kind: "hint", ...where, rung: 1 }).words,
            "Ten and seven more.",
        );
        assert.match(stepWords(read, { kind: "line", line: "step-worked" }).words, /worked out/);
        assert.match(stepWords(read, { kind: "explain", ...where }).words, /This lesson is called/);
        assert.throws(() => stepWords(read, { kind: "line", line: "anything at all" }));
        assert.throws(() => stepWords(read, { kind: "hint", ...where, rung: 9 }));
        assert.throws(() => stepWords(read, { kind: "words", words: "Say this." }));
    });

    it("walks a question through every hint and its explanation to the answer", () => {
        const said = stepWords(read, { kind: "answer", ...where }).words;
        assert.match(said, /^Here is how it works, step by step\./);
        assert.match(said, /Make a ten from the 9 first\. Ten and seven more\./);
        assert.match(said, /Nine and one make ten, and seven are left over\./);
        assert.match(said, /So the answer is 17\.$/);
    });
});
