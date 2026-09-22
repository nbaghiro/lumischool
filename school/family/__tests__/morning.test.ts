import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PackLesson, PackQuestion, PackSection } from "../../../engine/pack";
import {
    attentionOf,
    clockAt,
    clockOfMinutes,
    minutesOfClock,
    paceFor,
    startedAt,
    lengthRange,
    lessonMinutes,
    minutesOf,
    morning,
    shapeOf,
    type Learner,
    type LessonShape,
    type Took,
} from "../morning";

const lesson = (over: Partial<LessonShape>): LessonShape => ({
    id: "g1-a",
    title: "Taking away",
    grade: 1,
    subject: "maths",
    sections: [
        { type: "look", label: "Look", questions: 0 },
        { type: "try", label: "Try", questions: 4 },
        { type: "exercises", label: "Practice", questions: 8 },
    ],
    ...over,
});

const learner = (over: Partial<Learner>): Learner => ({
    child: "k1",
    name: "Ivy",
    lessons: [lesson({})],
    ...over,
});

describe("who a section needs", () => {
    it("teaches a look and leaves practice alone", () => {
        assert.equal(attentionOf("look", 1), "with-you");
        assert.equal(attentionOf("example", 4), "with-you");
        assert.equal(attentionOf("exercises", 1), "alone");
        assert.equal(attentionOf("remember", 1), "alone");
    });

    it("reads a story aloud only while the child cannot read it", () => {
        assert.equal(attentionOf("story", 1), "read-aloud");
        assert.equal(attentionOf("story", 2), "read-aloud");
        assert.equal(attentionOf("story", 3), "alone");
    });
});

describe("how long a lesson takes", () => {
    it("never gives a section less than the floor", () => {
        assert.equal(minutesOf({ type: "exercises", label: "Practice", questions: 0 }, 1), 2);
    });

    it("counts questions more slowly for a younger child", () => {
        const s = { type: "exercises", label: "Practice", questions: 8 };
        assert.ok(minutesOf(s, 1) > minutesOf(s, 4));
    });

    it("answers with a range around the estimate", () => {
        const l = lesson({});
        const [low, high] = lengthRange(l);
        assert.ok(low < lessonMinutes(l) && lessonMinutes(l) < high);
    });
});

describe("the morning's order", () => {
    it("never needs the adult in two places at once", () => {
        const m = morning("9:00", [
            learner({}),
            learner({ child: "k2", name: "Rosie", lessons: [lesson({ id: "g3-a", grade: 3 })] }),
        ]);
        const taught = m.blocks.filter((b) => b.attention !== "alone");
        for (const a of taught)
            for (const b of taught)
                if (a !== b)
                    assert.ok(a.to <= b.from || b.to <= a.from, `${a.label} met ${b.label}`);
        assert.ok(m.resolved > 0);
    });

    it("keeps each child's sections in the order the lesson has them", () => {
        const m = morning("9:00", [learner({ lessons: [lesson({}), lesson({ id: "g1-b" })] })]);
        assert.deepEqual(
            m.blocks.map((b) => `${b.lesson}:${b.section}`),
            ["g1-a:look", "g1-a:try", "g1-a:exercises", "g1-b:look", "g1-b:try", "g1-b:exercises"],
        );
    });

    it("says how long it runs and how much of it is yours", () => {
        const m = morning("9:00", [learner({})]);
        assert.equal(m.minutes, lessonMinutes(lesson({})));
        assert.ok(m.withYou > 0 && m.withYou < m.minutes);
    });

    it("has nothing to say about a day with no lessons", () => {
        const m = morning("9:00", [learner({ lessons: [] })]);
        assert.deepEqual(m.blocks, []);
        assert.equal(m.minutes, 0);
    });

    it("reads the clock past the hour", () => {
        assert.equal(clockAt("9:00", 75), "10:15");
        assert.equal(clockAt("9:30", 0), "9:30");
    });
});

describe("a lesson as the morning reads it", () => {
    const ask = (ns: number[]): PackSection["blocks"] => [
        {
            k: "ask",
            how: "practice",
            item: { id: "i1", hash: "h", title: null, skills: [], check: null },
            questions: ns.map((n): PackQuestion => ({
                n,
                variant: "a=1",
                env: {},
                answers: {},
                labels: null,
                ask: "",
                hints: [],
                feedback: [],
                scene: null,
                arranged: null,
                explain: null,
            })),
            again: [],
        },
    ];
    const packed: PackLesson = {
        pack: 1,
        id: "g1-a",
        source: "g1/a.lumi",
        title: "Taking away",
        goal: null,
        grade: 1,
        unit: 1,
        subject: "maths",
        format: "lesson",
        art: [],
        levels: {
            medium: {
                hash: "m",
                grownUps: [],
                sections: [
                    { type: "look", stars: null, blocks: [{ k: "say", text: "Look here" }] },
                    { type: "exercises", stars: null, blocks: ask([0, 1, 2, 3]) },
                    { type: "puzzle", stars: 2, blocks: ask([1]) },
                ],
            },
            easy: { hash: "e", grownUps: [], sections: [] },
        },
    };

    it("counts the questions a child answers and names the sections", () => {
        const shape = shapeOf(packed);
        assert.deepEqual(
            shape.sections.map((s) => [s.label, s.questions]),
            [
                ["Look", 0],
                ["Practice", 3],
                ["Puzzle 1 ★★☆", 1],
            ],
        );
    });

    it("falls back to medium for a level the lesson does not declare", () => {
        assert.equal(shapeOf(packed, "easy").sections.length, 0);
        assert.equal(shapeOf(packed, "hard").sections.length, 3);
    });
});

describe("what the family's own sittings say", () => {
    const took = (over: Partial<Took> & { minutes: number }): Took => ({
        child: "k1",
        subject: "maths",
        finished: true,
        ...over,
    });
    const many = (n: number, over: Partial<Took> & { minutes: number }): Took[] =>
        Array.from({ length: n }, () => took(over));

    it("says nothing until a child has sat down enough times", () => {
        const pace = paceFor(many(4, { minutes: 20 }), "k1", "maths");
        assert.equal(pace.minutes, null);
        assert.equal(pace.sittings, 4);
    });

    it("takes the subject's own sittings once there are enough of them", () => {
        const pace = paceFor(
            [...many(5, { minutes: 24 }), ...many(9, { minutes: 8, subject: "reading" })],
            "k1",
            "maths",
        );
        assert.deepEqual(pace, { minutes: 24, sittings: 5, subject: true });
    });

    it("falls back to the child's lessons at large, and never to another child's", () => {
        const mixed = [
            ...many(4, { minutes: 30 }),
            ...many(5, { minutes: 10, subject: "reading" }),
            ...many(9, { minutes: 90, child: "k2" }),
        ];
        const pace = paceFor(mixed, "k1", "writing");
        assert.equal(pace.subject, false);
        assert.equal(pace.sittings, 9);
        // the middle of their own nine, four at thirty and five at ten, and never the other child's
        assert.equal(pace.minutes, 10);
    });

    it("leaves out a tap that opened a lesson, a view left open, and a sitting never finished", () => {
        const noise = [
            ...many(8, { minutes: 20 }),
            took({ minutes: 1 }),
            took({ minutes: 400 }),
            took({ minutes: 20, finished: false }),
        ];
        assert.equal(paceFor(noise, "k1", "maths").sittings, 8);
    });

    it("reads the family's own start off the days they began, and not off too few", () => {
        assert.equal(startedAt([540, 545, 530, 555, 600]), "9:05");
        assert.equal(startedAt([540, 545, 530]), null);
        assert.equal(clockOfMinutes(minutesOfClock("8:35")), "8:35");
    });
});

describe("a morning laid out on the family's own times", () => {
    it("stretches a lesson to what it has taken, keeping the shares between its sections", () => {
        const table = lessonMinutes(lesson({}));
        const m = morning("9:00", [learner({ lessons: [lesson({ took: table * 2 })] })]);
        assert.equal(m.minutes, table * 2);
        assert.equal(m.timed, 1);
        assert.equal(m.guessed, 0);
        const look = lesson({}).sections[0];
        const first = m.blocks[0];
        assert.ok(look && first, "the morning has a first block");
        if (look && first) assert.ok(first.minutes > minutesOf(look, 1));
    });

    it("counts which lessons were laid out on the table and which on the family", () => {
        const m = morning("9:00", [
            learner({ lessons: [lesson({ took: 30 }), lesson({ id: "g1-b" })] }),
        ]);
        assert.equal(m.timed, 1);
        assert.equal(m.guessed, 1);
    });
});
