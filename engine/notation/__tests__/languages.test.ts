import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileLesson } from "../compile";
import { alsoFor, forgiven, readPhrasebook } from "../languages";
import { parse, Workspace } from "../notation";

const ES = `phrasebook es v=1 lenient=[acute, diaeresis] {
  name "Spanish"
  variety "Castilian"
  entry greet.hello "hola" say="OH-lah"
  entry greet.bye "adiós" also=["adio"]
}
`;
const FR = `phrasebook fr v=1 lenient=[acute, grave, circumflex, diaeresis, cedilla] {
  name "French"
  entry greet.hello "bonjour"
}
`;
const ITEM = `item language.hello-name v=1 skills=[language.greetings] {
  title "Which word?"
  let k=0..1

  scene 20x7 {
    column all at=canvas(1, 1) space=1 align=start {
      text ask "Which word says it?" width=16
      choice pick options=["[[greet.hello]]", "[[greet.bye]]"]
    }
  }

  answer pick=(pick(k, "[[greet.hello]]", "[[greet.bye]]"))
}
`;
const WRITE = `item language.bye-write v=1 skills=[language.greetings] {
  title "Write it"
  let k=0..0

  scene 20x5 {
    column all at=canvas(1, 1) space=1 align=start {
      text ask "Write goodbye." width=16
      word-input word options=["[[greet.bye]]"] accents=loose
    }
  }

  answer word=("[[greet.bye]]")
}
`;
const LESSON = `lesson language-hello v=1 format=teach grade=1 unit=1 subject=language {
  title "[[greet.hello|cap]] and [[greet.bye]]"
  do {
    show language.hello-name k=0
    show language.bye-write k=0
  }
}
`;
const files = (more: Record<string, string> = {}): Record<string, string> => ({
    "languages/es.lumi": ES,
    "languages/fr.lumi": FR,
    "items/language-hello-name.lumi": ITEM,
    "items/language-bye-write.lumi": WRITE,
    "lessons/language-01-hello.lumi": LESSON,
    ...more,
});

describe("phrasebooks", () => {
    it("reads each entry with its other spellings and its line for the grown-up", () => {
        const { book, issues } = readPhrasebook(parse(ES).doc, "languages/es.lumi");
        assert.deepEqual(issues, []);
        assert.equal(book?.entries.get("greet.bye")?.text, "adiós");
        assert.deepEqual(book?.entries.get("greet.bye")?.also, ["adio"]);
        assert.equal(book?.entries.get("greet.hello")?.say, "OH-lah");
        assert.deepEqual(book?.lenient, ["acute", "diaeresis"]);
    });

    it("refuses a key twice, a phrase that would break a string, and a file named for another language", () => {
        const src = `phrasebook es v=1 {
  entry greet.hello "hola"
  entry greet.hello "hola"
  entry greet.quote "say \\"hi\\""
}
`;
        const { issues } = readPhrasebook(parse(src).doc, "languages/fr.lumi");
        const said = issues.map((i) => i.message).join("\n");
        assert.match(said, /already in the phrasebook/);
        assert.match(said, /cannot hold/);
        assert.match(said, /is the file es\.lumi/);
    });
});

describe("language variants", () => {
    it("writes a lesson out once per language that has every phrase, with its own ids and language", () => {
        const ws = new Workspace(files());
        const es = ws.lessons.get("language-hello.es");
        assert.equal(es?.language, "es");
        assert.equal(es?.title, "Hola and adiós");
        assert.ok(ws.items.has("language.hello-name.es"));
        assert.ok(!ws.lessons.has("language-hello"), "the template itself is not a lesson");
        assert.ok(!ws.lessons.has("language-hello.fr"));
        assert.deepEqual(
            ws.coverage.find((c) => c.language === "fr")?.missing,
            ["greet.bye"],
            "French lacks a phrase, so the lesson is not offered in it",
        );
        assert.equal(
            ws.files
                .get("lessons/language-01-hello.lumi")
                ?.issues.filter((i) => i.level === "error").length,
            0,
        );
    });

    it("refuses language= written on a language lesson, since the compiler sets it", () => {
        const ws = new Workspace(
            files({
                "lessons/language-01-hello.lumi": LESSON.replace(
                    "subject=language",
                    "subject=language language=es",
                ),
            }),
        );
        const said =
            ws.files
                .get("lessons/language-01-hello.lumi")
                ?.issues.map((i) => i.message)
                .join("\n") ?? "";
        assert.match(said, /set by the compiler/);
    });

    it("offers a lesson with a part written per language only in the languages that have that part", () => {
        const lesson = LESSON.replace(
            "  do {",
            '  language es {\n    grown-ups "Castilian."\n  }\n  do {',
        );
        const both = FR.replace(
            'entry greet.hello "bonjour"',
            'entry greet.hello "bonjour"\n  entry greet.bye "au revoir"',
        );
        const ws = new Workspace(
            files({ "lessons/language-01-hello.lumi": lesson, "languages/fr.lumi": both }),
        );
        assert.deepEqual(ws.lessons.get("language-hello.es")?.grownUps, ["Castilian."]);
        assert.ok(!ws.lessons.has("language-hello.fr"));
        assert.match(
            ws.coverage.find((c) => c.language === "fr")?.missing.join() ?? "",
            /fr version/,
        );
    });
});

describe("marking a typed phrase", () => {
    it("carries a variant's other spellings into the pack, with the forgiven marks where the box is loose", () => {
        const ws = new Workspace(files());
        const lesson = ws.lessons.get("language-hello.es");
        assert.ok(lesson);
        const packed = compileLesson(ws, lesson, () => "hash");
        const asked = Object.values(packed.levels)
            .flatMap((l) => l?.sections ?? [])
            .flatMap((s) => s.blocks)
            .flatMap((b) => (b.k === "ask" ? b.questions : []));
        assert.deepEqual(asked.find((q) => q.answers.word === "adiós")?.also, {
            word: ["adio", "adios"],
        });
    });

    it("forgives only the language's lenient marks, so a tilde that makes a letter stays", () => {
        assert.equal(forgiven("adiós", ["acute", "diaeresis"]), "adios");
        assert.equal(forgiven("año", ["acute", "diaeresis"]), "año");
        assert.equal(forgiven("pingüino", ["acute", "diaeresis"]), "pinguino");
    });

    it("takes the phrase's other spellings always, and their unaccented forms only in a lenient box", () => {
        const accept = { also: { adiós: ["adio"] }, lenient: ["acute" as const] };
        assert.deepEqual(alsoFor("adiós", accept, false), ["adio"]);
        assert.deepEqual(alsoFor("adiós", accept, true), ["adio", "adios"]);
        assert.deepEqual(alsoFor("hola", undefined, true), []);
    });
});
