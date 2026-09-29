import assert from "node:assert/strict";
import { test } from "node:test";
import {
    factsOf,
    firstSceneOf,
    MOST_PAGES,
    paragraphs,
    pieceOf,
    printedPages,
    blocksOf,
    laidOut,
    stepsOf,
    readIndex,
    readLesson,
    readScene,
    sectionLabel,
    sittingsOf,
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

const medium = (questions = [question("a=4")]) => ({
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
                    questions,
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
});

const lesson = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    pack: 2,
    id: "g1-adding",
    source: "lessons/g1-04-adding.lumi",
    title: "Adding",
    goal: null,
    grade: 1,
    unit: 4,
    subject: "maths",
    format: "teach",
    art: ["text"],
    levels: { medium: medium() },
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
    const l = lesson({
        preview: { questions: 2 },
        levels: { medium: { ...medium(), levelNote: "later" }, harder: { anything: true } },
    });
    assert.ok(readLesson(l).ok);
});

test("easy and hard are read like medium when a lesson declares them, and a broken one is refused", () => {
    const level = medium();
    const levelled = read(
        lesson({ levels: { medium: level, easy: { ...level, hash: "easy-hash" } } }),
    );
    assert.equal(levelled.levels.easy?.hash, "easy-hash");
    assert.deepEqual(factsOf(levelled, "lessons/x.json", null).levels, ["easy", "medium"]);
    const broken = readLesson(lesson({ levels: { medium: level, hard: { hash: "h" } } }));
    assert.ok(!broken.ok && /levels\.hard/.test(broken.problem));
});

test("a lesson of another format, or without medium, is refused with the reason", () => {
    const other = readLesson(lesson({ pack: 3 }));
    assert.ok(!other.ok && /format 3/.test(other.problem));
    const bare = readLesson(lesson({ levels: {} }));
    assert.ok(!bare.ok && /levels\.medium/.test(bare.problem));
});

test("a question whose rule is not an expression is refused, and says where", () => {
    const bad = medium([
        {
            ...question("a=4"),
            feedback: [{ when: { t: "bin", op: "**" }, say: [], point: null, children: [] }],
        },
    ]);
    const r = readLesson(lesson({ levels: { medium: bad } }));
    assert.ok(!r.ok);
    assert.match(r.problem, /questions\[0\]: feedback\[0\]: when: "\*\*" is not an operator/);
});

test("a scene with a part placed nowhere a place can be is refused", () => {
    const bad = medium([
        {
            ...question("a=4"),
            scene: {
                ...scene,
                nodes: [{ type: "text", id: "ask", v: {}, place: { rel: "beside" } }],
            },
        },
    ]);
    const r = readLesson(lesson({ levels: { medium: bad } }));
    assert.ok(!r.ok && /"beside" is not a kind of place/.test(r.problem));
});

test("a lesson's facts hold the levels it declares, its first drawing's file and its skills, and nothing of its sections", () => {
    const facts = factsOf(
        read(lesson()),
        "lessons/g1-adding-0123456789.json",
        "scenes/g1-adding-abcdef0123.json",
    );
    assert.deepEqual(facts.levels, ["medium"]);
    assert.equal(facts.first, "scenes/g1-adding-abcdef0123.json");
    assert.deepEqual(facts.skills, ["add.count-on", "add.bonds"]);
    assert.ok(!("items" in facts) && !("sections" in facts));
    const index = readIndex(JSON.parse(JSON.stringify({ pack: 2, lessons: [facts] })));
    assert.ok(index.ok);
    assert.ok(readIndex({ pack: 2, lessons: [{ ...facts, first: null }] }).ok);
    assert.ok(!readIndex({ pack: 2, lessons: [{ ...facts, levels: [] }] }).ok);
    assert.ok(!readIndex({ pack: 2, lessons: [{ ...facts, levels: ["medium", "extreme"] }] }).ok);
    assert.ok(!readIndex({ pack: 2, lessons: [{ ...facts, first: 3 }] }).ok);
});

test("a lesson's first drawing is its first scene block, or else its first question's scene, as its own file", () => {
    const l = read(lesson());
    assert.deepEqual(
        firstSceneOf(l),
        scene,
        "the question's scene, since the lesson has no scene block",
    );
    const level = medium();
    const other = { ...scene, size: [6, 2] };
    const withBlock = read(
        lesson({
            levels: {
                medium: {
                    ...level,
                    sections: [
                        {
                            ...level.sections[0],
                            blocks: [
                                { k: "scene", scene: other },
                                ...(level.sections[0]?.blocks ?? []),
                            ],
                        },
                    ],
                },
            },
        }),
    );
    assert.deepEqual(firstSceneOf(withBlock), other);
    const file = readScene(JSON.parse(JSON.stringify({ pack: 2, lesson: l.id, scene: other })));
    assert.ok(file.ok && file.first.lesson === "g1-adding");
    assert.ok(!readScene({ pack: 2, lesson: l.id, scene: { size: [1] } }).ok);
    assert.ok(!readScene({ pack: 3, lesson: l.id, scene: other }).ok);
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

/**
 * A lesson whose sections hold `tall` questions each, or as many as `tall` says for each, drawn a
 * whole 36 by 28 squares, each a page's half. An `example` section is a worked example.
 */
const drawnLesson = (types: readonly string[], tall: number | readonly number[]): PackLesson =>
    read(
        lesson({
            levels: {
                medium: {
                    hash: "m",
                    grownUps: [],
                    sections: types.map((type, i) => ({
                        type,
                        stars: null,
                        blocks: [
                            {
                                k: "ask",
                                how: type === "example" ? "worked" : "practice",
                                item: { id: "i", hash: "h", title: null, skills: [], check: null },
                                questions: Array.from(
                                    { length: typeof tall === "number" ? tall : (tall[i] ?? 1) },
                                    (_, n) => ({
                                        ...question(`a=${n}`, type === "example" ? 0 : n + 1),
                                        scene: { ...scene, size: [36, 28] },
                                    }),
                                ),
                                again: [],
                            },
                        ],
                    })),
                },
            },
        }),
    );

test("a printed sheet is estimated a page for every question too tall to share one", () => {
    const one = drawnLesson(["do"], 1);
    assert.equal(printedPages(one, one.levels.medium.sections), 1);
    // 28 rows each and a row between: a second never fits under the first on a page of 55
    const four = drawnLesson(["do"], 4);
    assert.equal(printedPages(four, four.levels.medium.sections), 4);
});

const whole = (...sections: number[]) => sections.map((section) => ({ section, from: 0, to: 1 }));

test("a lesson that fits in five pages prints as one sitting, in its order", () => {
    const l = drawnLesson(["look", "do", "try", "remember"], 1);
    assert.deepEqual(sittingsOf(l, l.levels.medium), [whole(0, 1, 2, 3)]);
});

test("a longer lesson splits at the section end that makes its sittings most even", () => {
    const l = drawnLesson(["look", "do", "try", "remember"], [2, 1, 2, 1]);
    assert.ok(printedPages(l, l.levels.medium.sections) > MOST_PAGES);
    assert.deepEqual(sittingsOf(l, l.levels.medium), [
        [
            { section: 0, from: 0, to: 2 },
            { section: 1, from: 0, to: 1 },
        ],
        [
            { section: 2, from: 0, to: 2 },
            { section: 3, from: 0, to: 1 },
        ],
    ]);
});

test("where it is as even, the tries print as a sitting of their own and the Remember closes the one before", () => {
    const l = drawnLesson(["look", "look", "try", "try", "try", "remember"], 1);
    assert.deepEqual(sittingsOf(l, l.levels.medium), [whole(0, 1, 5), whole(2, 3, 4)]);
});

test("a long review prints its puzzles as the second sitting", () => {
    const l = drawnLesson(["warm-up", "exercises", "puzzle", "puzzle"], 2);
    const two = (section: number) => ({ section, from: 0, to: 2 });
    assert.deepEqual(sittingsOf(l, l.levels.medium), [
        [two(0), two(1)],
        [two(2), two(3)],
    ]);
});

test("a long lesson of puzzles alone is split where its halves print most evenly", () => {
    const l = drawnLesson(["puzzle", "puzzle", "puzzle", "puzzle", "puzzle", "puzzle"], 1);
    assert.deepEqual(sittingsOf(l, l.levels.medium), [whole(0, 1, 2), whole(3, 4, 5)]);
});

test("a long section is cut between its questions into as many sittings as keep each to five pages", () => {
    const eight = drawnLesson(["do"], 8);
    assert.deepEqual(sittingsOf(eight, eight.levels.medium), [
        [{ section: 0, from: 0, to: 4 }],
        [{ section: 0, from: 4, to: 8 }],
    ]);
    const twelve = drawnLesson(["do"], 12);
    const sittings = sittingsOf(twelve, twelve.levels.medium);
    assert.deepEqual(sittings, [
        [{ section: 0, from: 0, to: 4 }],
        [{ section: 0, from: 4, to: 8 }],
        [{ section: 0, from: 8, to: 12 }],
    ]);
    const sections = twelve.levels.medium.sections;
    sittings.forEach((sitting, k) =>
        assert.ok(
            printedPages(
                twelve,
                sitting.map((s) => {
                    const section = sections[s.section] ?? { type: "", stars: null, blocks: [] };
                    return { ...section, blocks: blocksOf(section, s.from, s.to) };
                }),
                k === 0 ? "sheet" : "sitting",
            ) <= MOST_PAGES,
        ),
    );
});

test("a sitting never ends between a worked example and the question after it", () => {
    // three and three would cut after the example, so the split is two and four
    const l = drawnLesson(["do", "example", "exercises"], [2, 1, 3]);
    assert.deepEqual(sittingsOf(l, l.levels.medium), [
        [{ section: 0, from: 0, to: 2 }],
        [
            { section: 1, from: 0, to: 1 },
            { section: 2, from: 0, to: 3 },
        ],
    ]);
});

test("a question block cut across sittings prints only its own questions in each", () => {
    const l = drawnLesson(["do"], 3);
    const section = l.levels.medium.sections[0] ?? { type: "", stars: null, blocks: [] };
    const asked = (from: number, to: number) =>
        blocksOf(section, from, to).flatMap((b) =>
            b.k === "ask" ? b.questions.map((q) => q.n) : [],
        );
    assert.deepEqual(asked(0, 1), [1]);
    assert.deepEqual(asked(1, 3), [2, 3]);
    assert.equal(stepsOf(section), 3);
});

test("the screen shows the sections whole and in order, and paper the sittings, each drawn once where they agree", () => {
    const moved = drawnLesson(["look", "look", "try", "try", "try", "remember"], 1);
    const laid = (l: PackLesson) =>
        laidOut(l.levels.medium, sittingsOf(l, l.levels.medium)).map(
            (x) => `${x.section}:${x.from}-${x.to} ${x.on}${x.starts ? ` ${x.starts}` : ""}`,
        );
    assert.deepEqual(laid(moved), [
        "0:0-1 both",
        "1:0-1 both",
        "5:0-1 paper",
        "2:0-1 both 2",
        "3:0-1 both",
        "4:0-1 both",
        "5:0-1 screen",
    ]);
    assert.deepEqual(laid(drawnLesson(["do"], 8)), [
        "0:0-4 paper",
        "0:4-8 paper 2",
        "0:0-8 screen",
    ]);
});
