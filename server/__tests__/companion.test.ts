import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PackLesson, PackQuestion } from "../../engine/pack";
import { contextOf, IN_CALL } from "../companion";

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
const where = {
    lesson: lesson.id,
    level: "medium" as const,
    n: 1,
    variant: "a=9,b=8",
    hints: 1,
    tries: 1,
    said: "Not yet. Have another look.",
    worked: false,
};

describe("what the companion is told", () => {
    it("tells the lesson and the question, and the hints already open", () => {
        const told = contextOf(read, where);
        assert.match(told, /A little bridge to ten/);
        assert.match(told, /To add 8 and 5, fill the frame first/);
        assert.match(told, /9 and 8 make how many\?/);
        assert.match(told, /Make a ten from the 9 first/);
        assert.match(told, /frame \(a tenframe\)/);
        assert.match(told, /Not yet\. Have another look\./);
    });

    it("never tells an answer, an explanation, an unopened hint or the notes for grown-ups", () => {
        const told = contextOf(read, where);
        assert.doesNotMatch(told, /17/);
        assert.doesNotMatch(told, /seven are left over/);
        assert.doesNotMatch(told, /Ten and seven more/);
        assert.doesNotMatch(told, /real counters|counting from one/);
        // a box the child writes in is not a part to ring
        assert.doesNotMatch(told, /answer \(a number-input\)/);
    });

    it("tells only the lesson when no question is open", () => {
        const told = contextOf(read, { ...where, n: null });
        assert.match(told, /no question open/);
        assert.doesNotMatch(told, /9 and 8/);
    });

    it("carries the earlier talk, and keeps a context sent during a call under the app message limit", () => {
        const earlier = Array.from({ length: 30 }, (_, i) => ({
            who: i % 2 ? "child" : "companion",
            words: `Line ${i} ${"and more words ".repeat(30)}`,
        }));
        const whole = contextOf(read, where, earlier);
        assert.match(whole, /What was said earlier in this sitting/);
        assert.match(whole, /Line 29/);
        const sent = contextOf(read, where, earlier, IN_CALL);
        assert.ok(Buffer.byteLength(sent) <= IN_CALL, `${Buffer.byteLength(sent)} bytes`);
        // the question and the newest line survive the cut
        assert.match(sent, /9 and 8 make how many\?/);
        assert.match(sent, /Line 29/);
    });
});
