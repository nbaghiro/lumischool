import assert from "node:assert/strict";
import { test } from "node:test";
import {
    factsOf,
    firstSceneOf,
    paragraphs,
    pieceOf,
    readIndex,
    readLesson,
    readScene,
    sectionLabel,
    tagOf,
    type PackLesson,
} from "../pack";

const scene = {
    size: [10, 4],
    nodes: [
        {
            type: "text",
            id: "ask",
            v: {
                text: {
                    pieces: [
                        { k: "text", v: "Six and " },
                        { k: "expr", e: { t: "id", name: "a" }, src: "a" },
                    ],
                    parts: [],
                    filled: "Six and 4",
                    blanks: [],
                },
            },
            place: { rel: "at", x: 0, y: 0 },
        },
    ],
    arrows: [],
    marks: [],
    boxes: { ask: { x: 0, y: 0, w: 10, h: 2 } },
};

const question = (variant: string, n = 1): Record<string, unknown> => ({
    n,
    variant,
    env: { a: { k: "num", v: { n: 4, d: 1 } } },
    answers: { answer: "10" },
    labels: null,
    ask: "Six and 4",
    hints: ["Count on from six."],
    feedback: [
        {
            when: { t: "bin", op: "==", l: { t: "id", name: "answer" }, r: { t: "num", v: "2" } },
            say: ["That is six take away four."],
            point: null,
            children: [],
        },
    ],
    scene,
    arranged: null,
    explain: null,
});

const lesson = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    pack: 1,
    id: "g1-adding",
    source: "lessons/g1-04-adding.lumi",
    title: "Adding",
    goal: null,
    grade: 1,
    unit: 4,
    subject: "maths",
    format: "teach",
    art: ["text"],
    levels: {
        medium: {
            hash: "medium-hash",
            grownUps: [],
            sections: [
                {
                    type: "do",
                    stars: null,
                    blocks: [
                        { k: "say", text: "Count on." },
                        {
                            k: "ask",
                            how: "practice",
                            item: {
                                id: "add.on",
                                hash: "i",
                                title: null,
                                skills: ["add.count-on"],
                                check: null,
                            },
                            questions: [question("a=4")],
                            again: [[question("a=5")], [question("a=3")]],
                        },
                        {
                            k: "ask",
                            how: "worked",
                            item: {
                                id: "add.worked",
                                hash: "w",
                                title: "Worked",
                                skills: ["add.count-on", "add.bonds"],
                                check: null,
                            },
                            questions: [question("a=1", 0)],
                            again: [],
                        },
                    ],
                },
            ],
        },
    },
    ...over,
});

const read = (v: unknown): PackLesson => {
    const r = readLesson(v);
    assert.ok(r.ok, r.ok ? "" : r.problem);
    return r.lesson;
};

test("a lesson's file reads back as the lesson it holds", () => {
    const l = read(lesson());
    assert.equal(l.levels.medium.hash, "medium-hash");
    assert.equal(l.levels.medium.sections[0]?.blocks.length, 3);
});

test("a reader skips fields it does not know, so a preview or a new field of a level can be added", () => {
    const medium = (lesson().levels as { medium: Record<string, unknown> }).medium;
    const l = lesson({
        preview: { questions: 2 },
        levels: { medium: { ...medium, levelNote: "later" }, harder: { anything: true } },
    });
    assert.ok(readLesson(l).ok);
});

test("easy and hard are read like medium when a lesson declares them, and a broken one is refused", () => {
    const medium = (lesson().levels as { medium: Record<string, unknown> }).medium;
    const levelled = read(lesson({ levels: { medium, easy: { ...medium, hash: "easy-hash" } } }));
    assert.equal(levelled.levels.easy?.hash, "easy-hash");
    assert.deepEqual(Object.keys(factsOf(levelled, "lessons/x.json", null).levels), [
        "easy",
        "medium",
    ]);
    const broken = readLesson(lesson({ levels: { medium, hard: { hash: "h" } } }));
    assert.ok(!broken.ok && /levels\.hard/.test(broken.problem));
});

test("a lesson of another format, or without medium, is refused with the reason", () => {
    const other = readLesson(lesson({ pack: 2 }));
    assert.ok(!other.ok && /format 2/.test(other.problem));
    const bare = readLesson(lesson({ levels: {} }));
    assert.ok(!bare.ok && /levels\.medium/.test(bare.problem));
});

test("a question whose rule is not an expression is refused, and says where", () => {
    const bad = lesson();
    const medium = (bad.levels as { medium: { sections: { blocks: Record<string, unknown>[] }[] } })
        .medium;
    const ask = medium.sections[0]?.blocks[1];
    assert.ok(ask);
    ask.questions = [
        {
            ...question("a=4"),
            feedback: [{ when: { t: "bin", op: "**" }, say: [], point: null, children: [] }],
        },
    ];
    const r = readLesson(bad);
    assert.ok(!r.ok);
    assert.match(r.problem, /questions\[0\]: feedback\[0\]: when: "\*\*" is not an operator/);
});

test("a scene with a part placed nowhere a place can be is refused", () => {
    const bad = lesson();
    const medium = (bad.levels as { medium: { sections: { blocks: Record<string, unknown>[] }[] } })
        .medium;
    const ask = medium.sections[0]?.blocks[1];
    assert.ok(ask);
    ask.questions = [
        {
            ...question("a=4"),
            scene: {
                ...scene,
                nodes: [{ type: "text", id: "ask", v: {}, place: { rel: "beside" } }],
            },
        },
    ];
    const r = readLesson(bad);
    assert.ok(!r.ok && /"beside" is not a kind of place/.test(r.problem));
});

test("a lesson's facts hold each level's hash, its first drawing's file and its skills, and nothing of its sections", () => {
    const facts = factsOf(
        read(lesson()),
        "lessons/g1-adding-0123456789.json",
        "scenes/g1-adding-abcdef0123.json",
    );
    assert.deepEqual(facts.levels.medium, { hash: "medium-has" });
    assert.equal(facts.first, "scenes/g1-adding-abcdef0123.json");
    assert.deepEqual(facts.skills, ["add.count-on", "add.bonds"]);
    assert.ok(!("items" in facts) && !("sections" in facts.levels.medium));
    const index = readIndex(JSON.parse(JSON.stringify({ pack: 1, lessons: [facts] })));
    assert.ok(index.ok);
    assert.ok(readIndex({ pack: 1, lessons: [{ ...facts, first: null }] }).ok);
    assert.ok(!readIndex({ pack: 1, lessons: [{ ...facts, levels: {} }] }).ok);
    assert.ok(!readIndex({ pack: 1, lessons: [{ ...facts, first: 3 }] }).ok);
});

test("a lesson's first drawing is its first scene block, or else its first question's scene, as its own file", () => {
    const l = read(lesson());
    assert.deepEqual(
        firstSceneOf(l),
        scene,
        "the question's scene, since the lesson has no scene block",
    );
    const medium = (lesson().levels as { medium: { sections: { blocks: unknown[] }[] } }).medium;
    const other = { ...scene, size: [6, 2] };
    const withBlock = read(
        lesson({
            levels: {
                medium: {
                    ...medium,
                    sections: [
                        {
                            ...medium.sections[0],
                            blocks: [
                                { k: "scene", scene: other },
                                ...(medium.sections[0]?.blocks ?? []),
                            ],
                        },
                    ],
                },
            },
        }),
    );
    assert.deepEqual(firstSceneOf(withBlock), other);
    const file = readScene(JSON.parse(JSON.stringify({ pack: 1, lesson: l.id, scene: other })));
    assert.ok(file.ok && file.first.lesson === "g1-adding");
    assert.ok(!readScene({ pack: 1, lesson: l.id, scene: { size: [1] } }).ok);
    assert.ok(!readScene({ pack: 2, lesson: l.id, scene: other }).ok);
});

test("a block's text is set as paragraphs, with strong and emphasised runs", () => {
    assert.deepEqual(
        paragraphs("A ruler starts at **zero**,\nnot at its edge.\n\nRead *carefully*."),
        [
            [
                { text: "A ruler starts at ", strong: false, em: false },
                { text: "zero", strong: true, em: false },
                { text: ", not at its edge.", strong: false, em: false },
            ],
            [
                { text: "Read ", strong: false, em: false },
                { text: "carefully", strong: false, em: true },
                { text: ".", strong: false, em: false },
            ],
        ],
    );
});

test("a section is labelled by its type, a puzzle numbered, and stars shown where a section has them", () => {
    assert.deepEqual(
        [
            sectionLabel("look", 0, null),
            sectionLabel("try", 0, 2),
            sectionLabel("puzzle", 2, 3),
            sectionLabel("stretch", 0, null),
        ],
        ["Look", "Try this ★★☆", "Puzzle 2 ★★★", "stretch"],
    );
});

test("a lesson is tagged with its subject unless it is maths, its grade and its unit", () => {
    assert.deepEqual(
        [
            tagOf({ subject: "maths", grade: 1, unit: 6 }),
            tagOf({ subject: "physics", grade: 4, unit: null }),
        ],
        ["Grade 1 · Unit 6", "Physics · Grade 4"],
    );
});

test("a piece a grown-up looks at is writing or a painting by the item's checker, and nothing for an item the machine marks", () => {
    const check = (name: string) => ({ check: { name, settings: {} } });
    assert.equal(pieceOf(check("writing.by-eye")), "writing");
    assert.equal(pieceOf(check("art.by-eye")), "painting");
    assert.equal(pieceOf(check("paint.mixes")), null);
    assert.equal(pieceOf({ check: null }), null);
});
