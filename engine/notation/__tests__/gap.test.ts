import assert from "node:assert/strict";
import test from "node:test";
import { factsOf, partsOf, readBook, readLesson, sittingsOf } from "../../pack";
import { compileLesson, compileVolume, volumeFile } from "../compile";
import { Workspace } from "../notation";
import { CHECKERS } from "../verify";
import { BOOK_LESSON, SAMPLES, VOLUME } from "./samples";

/** Every issue of a workspace, as `path level: message`. */
const issuesOf = (ws: Workspace): string[] =>
    [...ws.files.values()].flatMap((f) =>
        f.issues.map((i) => `${f.path} ${i.level}: ${i.message}`),
    );

const withSamples = (changed: Record<string, string>): string[] =>
    issuesOf(new Workspace({ ...SAMPLES, ...changed }));

test("the three samples verify with nothing to say", () => {
    assert.deepEqual(issuesOf(new Workspace(SAMPLES)), []);
});

test("a question citing a book gets its answer from the one line that holds the words", () => {
    const ws = new Workspace(SAMPLES);
    const report = ws.reports.get("book.sample-line");
    assert.deepEqual(
        report?.variants.map((v) => v.answers.answer),
        ["6", "2"],
    );
});

test("book.line refuses words no line holds, words across two lines, words two lines hold and a chapter the volume lacks", () => {
    const line = SAMPLES["items/book-sample-line.lumi"] ?? "";
    const cite = (holds: string, chapter = "{pick(k, 1, 3)}"): string[] =>
        withSamples({
            "items/book-sample-line.lumi": line.replace(
                /check book\.line .*/,
                `check book.line book=willows-sample chapter="${chapter}" holds="${holds}"`,
            ),
        });
    assert.ok(cite("a pail of lemonade").some((i) => i.includes("no line of chapter 1")));
    assert.ok(
        cite("all the morning, spring-cleaning his").some((i) =>
            i.includes("runs across two lines"),
        ),
    );
    assert.ok(cite("of whitewash").some((i) => i.includes("all hold")));
    assert.ok(cite("an aching back", "9").some((i) => i.includes("has no chapter 9")));
});

test("a sitting may cite only the chapters read by then, of its own volume", () => {
    const early = BOOK_LESSON.replace(
        "sitting chapters=[1, 2] {\n    show book.sample-line k=0",
        "sitting chapters=[1, 2] {\n    show book.sample-line k=1",
    );
    assert.ok(
        withSamples({ "lessons/book-sample.lumi": early }).some((i) =>
            i.includes("cites chapter 3, which this sitting has not read yet"),
        ),
    );
});

test("a book lesson reads every chapter once and in order, from a volume that exists", () => {
    const skipped = BOOK_LESSON.replace("sitting chapters=[3]", "sitting chapters=[2]");
    assert.ok(
        withSamples({ "lessons/book-sample.lumi": skipped }).some((i) =>
            i.includes("reads each chapter once and in order"),
        ),
    );
    const missing = BOOK_LESSON.replace("book=willows-sample", "book=willows");
    assert.ok(
        withSamples({ "lessons/book-sample.lumi": missing }).some((i) =>
            i.includes('there is no volume "willows"'),
        ),
    );
    const teach = BOOK_LESSON.replace("format=book", "format=teach");
    assert.ok(
        withSamples({ "lessons/book-sample.lumi": teach }).some((i) =>
            i.includes("a sitting belongs to a book lesson"),
        ),
    );
});

test("a volume is used only with its whole public-domain record, and only once it holds", () => {
    const without = VOLUME.replace(/ {2}edition .*\n/, "");
    assert.ok(
        withSamples({ "books/willows-sample.lumi": without }).some((i) =>
            i.includes("which printed edition"),
        ),
    );
    const recent = VOLUME.replace("died=1932", "died=1990");
    assert.ok(
        withSamples({ "books/willows-sample.lumi": recent }).some((i) =>
            i.includes("less than seventy full years ago"),
        ),
    );
    const late = VOLUME.replace("published 1908", "published 1950");
    assert.ok(
        withSamples({ "books/willows-sample.lumi": late }).some((i) =>
            i.includes("still in copyright in the United States"),
        ),
    );
    const basis = VOLUME.replace(/ {2}public-domain .*\n/, "");
    assert.ok(
        withSamples({ "books/willows-sample.lumi": basis }).some((i) =>
            i.includes("why it is in the public domain"),
        ),
    );
});

test("a book lesson compiles with its book's facts and sittings, and its volume to a file of its own", () => {
    const ws = new Workspace(SAMPLES);
    const lesson = ws.lessons.get("book-sample");
    const volume = ws.volumes.get("willows-sample");
    assert.ok(lesson && volume);
    const compiled = compileLesson(ws, lesson, (kind, id) => `${kind}-${id}-0123456789abcdef`);
    const read = readLesson(JSON.parse(JSON.stringify(compiled)));
    assert.ok(read.ok, read.ok ? "" : read.problem);
    assert.equal(
        compiled.book?.file,
        volumeFile("willows-sample", "volume-willows-sample-0123456789abcdef"),
    );
    assert.deepEqual(
        compiled.levels.medium.sections.map((s) => s.chapters),
        [[1, 2], [3]],
    );
    assert.equal(partsOf(compiled), 2);
    const first = compiled.levels.medium.sections[0]?.blocks[0];
    assert.equal(
        first?.k === "ask" ? first.questions[0]?.explain : null,
        'Line 6 of chapter 1: "over his black fur, and an aching back and weary arms."',
    );
    const facts = factsOf(compiled, "lessons/book-sample.json", null);
    assert.equal(facts.parts, 2);
    assert.equal(facts.book, compiled.book?.file);
    assert.deepEqual(
        sittingsOf(compiled, compiled.levels.medium).map((s) => s.map((x) => x.section)),
        [[0], [1]],
    );
    const book = readBook(JSON.parse(JSON.stringify(compileVolume(volume))));
    assert.ok(book.ok, book.ok ? "" : book.problem);
    assert.deepEqual(
        book.book.chapters.map((c) => c.paragraphs.flat().length),
        [6, 2, 2],
    );
});

test("every piece a grown-up looks at or listens to has its checker, and a notice list is checked wherever it is written", () => {
    for (const name of [
        "writing.by-eye",
        "art.by-eye",
        "art.made",
        "reading.recited",
        "music.sung",
    ])
        assert.ok(CHECKERS[name], name);
    const look = "A whole verse from memory, in order, at a steady pace.";
    const recited = CHECKERS["reading.recited"];
    assert.ok(recited);
    assert.deepEqual(recited.settings, ["look-for", "notice"]);
    assert.throws(
        () => recited.solutions({ "look-for": look, notice: '["Only one"]' }),
        /two to five short points/,
    );
    const writing = CHECKERS["writing.by-eye"];
    assert.ok(writing);
    assert.deepEqual(writing.settings, ["look-for"]);
    assert.deepEqual(writing.solutions({ "look-for": look }), [look]);
    assert.throws(
        () => writing.solutions({ "look-for": look, notice: "[]" }),
        /two to five short points/,
    );
    const painting = CHECKERS["art.by-eye"];
    assert.deepEqual(painting?.settings, ["look-for", "notice", "ask"]);
});

test("a dictation is proved to mark each word misspelt or left out at that word, and its sentence is the answer", () => {
    const dictation = CHECKERS["writing.dictation"];
    assert.ok(dictation);
    assert.deepEqual(dictation.solutions({ text: "The Mole  had been working." }), [
        "The Mole had been working.",
    ]);
    assert.throws(() => dictation.solutions({ text: "Too short" }), /three to forty words/);
    assert.throws(() => dictation.solutions({ text: "One 2 three" }), /has no letters/);
    const ws = new Workspace(SAMPLES);
    assert.deepEqual(ws.reports.get("dictation.sample")?.variants[0]?.answers, {
        answer: "The Mole had been working very hard all the morning.",
    });
});

test("the moon's shapes answer by their astronomers' names as well as a child's words", () => {
    const ws = new Workspace({
        "items/moon.lumi": `item probe.moon v=1 skills=[physics.sky] {
  title "Moon"
  let d={3, 7, 11, 18, 22, 26}
  scene 36x30 {
    moonphases m from=d step=7 count=4 at=canvas(1, 0)
    choice pick options=["waxing crescent", "first quarter", "waxing gibbous", "waning gibbous", "last quarter", "waning crescent"] stack=column below=m gap=1
    choice word options=["crescent", "half moon", "gibbous"] stack=column right-of=pick gap=1
  }
  check physics.sky of=m pick="name(0)" word="phase(0)"
}
`,
    });
    const report = ws.reports.get("probe.moon");
    assert.deepEqual(
        (report?.issues ?? []).filter((i) => i.level === "error").map((i) => i.message),
        [],
    );
    assert.deepEqual(
        report?.variants.map((v) => [v.answers.pick, v.answers.word]),
        [
            ["waxing crescent", "crescent"],
            ["first quarter", "half moon"],
            ["waxing gibbous", "gibbous"],
            ["waning gibbous", "gibbous"],
            ["last quarter", "half moon"],
            ["waning crescent", "crescent"],
        ],
    );
});
