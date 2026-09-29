import assert from "node:assert/strict";
import test from "node:test";
import {
    bookPages,
    linesHolding,
    markWords,
    noticeOf,
    pieceOf,
    readBook,
    type PackBook,
} from "../pack";

const BOOK: PackBook = {
    pack: 2,
    id: "sample",
    title: "A sample",
    author: "An author",
    published: 1900,
    died: 1920,
    edition: "The first edition",
    basis: "The author died more than seventy years ago.",
    chapters: [
        { n: 1, title: "One", paragraphs: [["a b", "c d", "e f"], ["g h"]] },
        { n: 2, title: "Two", paragraphs: [["i j"]] },
    ],
};

test("a dictation is marked word by word, a word left out or put in marking only itself", () => {
    const sentence = "The badger lives under the hill.";
    assert.equal(markWords(sentence, "the Badger lives under the hill").right, true);
    const spelt = markWords(sentence, "The bagder lives undr the hill.");
    assert.equal(spelt.right, false);
    assert.deepEqual(
        spelt.words.filter((w) => !w.right).map((w) => [w.word, w.wrote]),
        [
            ["badger", "bagder"],
            ["under", "undr"],
        ],
    );
    const short = markWords(sentence, "The badger under the hill.");
    assert.deepEqual(
        short.words.map((w) => w.wrote === null),
        [false, false, true, false, false, false],
    );
    const long = markWords(sentence, "The old badger lives under the hill.");
    assert.deepEqual(long.extra, ["old"]);
    assert.ok(long.words.every((w) => w.right));
    assert.equal(long.right, false);
});

test("a piece's notice list is read from its checker, and only for a piece", () => {
    const recited = {
        check: {
            name: "reading.recited",
            settings: { "look-for": "x", notice: '["Every line", "No page"]' },
        },
    };
    assert.equal(pieceOf(recited), "spoken");
    assert.deepEqual(noticeOf(recited), ["Every line", "No page"]);
    assert.deepEqual(noticeOf({ check: { name: "writing.by-eye", settings: {} } }), []);
    assert.deepEqual(
        noticeOf({ check: { name: "coding.runs", settings: { notice: '["a", "b"]' } } }),
        [],
    );
    assert.equal(pieceOf({ check: { name: "music.sung", settings: {} } }), "sung");
    assert.equal(pieceOf({ check: { name: "art.made", settings: {} } }), "made");
});

test("a chapter's lines are numbered through it, and words are found on the lines that hold them", () => {
    const one = BOOK.chapters[0]?.paragraphs ?? [];
    assert.deepEqual(linesHolding(one, "c  d"), [2]);
    assert.deepEqual(linesHolding(one, "g h"), [4]);
    assert.deepEqual(linesHolding(one, "b c"), []);
});

test("a sitting's chapters are pages that never hold two chapters, numbered as the chapter numbers its lines", () => {
    const pages = bookPages(BOOK, [1, 2], 3);
    assert.deepEqual(
        pages.map((p) => [p.chapter, p.opens, p.lines.map((l) => l.n)]),
        [
            [1, true, [1, 2, 3]],
            [1, false, [4]],
            [2, true, [1]],
        ],
    );
    assert.deepEqual(
        pages[1]?.lines.map((l) => l.starts),
        [true],
    );
});

test("a book's file is read only whole", () => {
    assert.ok(readBook(JSON.parse(JSON.stringify(BOOK))).ok);
    const { edition: _edition, ...without } = BOOK;
    const read = readBook(without);
    assert.equal(read.ok, false);
});
