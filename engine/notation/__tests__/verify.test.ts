// The checkers written in code, each proved over the corpus and over probes: the music checkers
// against the instruments' books, the chemistry and physics checkers against the tables the drawings
// are drawn from, the coding checkers by running the program, and the paint checkers with the paint
// box's own mixing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { done, mazeWorld } from "../../coding";
import { chordOf, type TuningName } from "../../sound/fretted";
import { isolates, stateAt, SUBSTANCES } from "../chemistry";
import { solve } from "../coding";
import { questions } from "../lessons";
import { parse, Workspace, type Node } from "../notation";
import { CHECKERS } from "../verify";
import { content } from "./helpers";

const files = content();
const corpus = new Workspace(files);
const answersOf = (id: string, key = "pick"): string[] | undefined =>
    corpus.reports.get(id)?.variants.map((v) => String(v.answers[key]));

test("music.chord proves the chord exists for the instrument and lists the notes a right strum sounds", () => {
    const chord = CHECKERS["music.chord"];
    assert.ok(chord);
    assert.deepEqual(chord.solutions({ chord: "C", tuning: "uke" }), ["C: G4, C4, E4, C5"]);
    assert.deepEqual(chord.solutions({ chord: "Em", tuning: "guitar" }), [
        "Em: E2, B2, E3, G3, B3, E4",
    ]);
    assert.throws(
        () => chord.solutions({ chord: "F", tuning: "guitar" }),
        /the guitar chords we teach are/,
    );
    assert.throws(
        () => chord.solutions({ chord: "C", tuning: "banjo" }),
        /tuning= is uke or guitar/,
    );
});

test("every chord a content file writes is one its instrument's book has", () => {
    // A chord name one book has and the other does not draws as an empty box with a question mark,
    // so it is refused here, over every file, rather than found on a printed page.
    const bad: string[] = [];
    const tuningOf = (s: string): TuningName => (s === "guitar" ? "guitar" : "uke");
    const walk = (nodes: Node[], path: string): void => {
        for (const n of nodes) {
            if (["fretboard", "chordbox", "chordchange", "strumtrack"].includes(n.type)) {
                const props = Object.fromEntries(
                    n.parts.flatMap((p) => (p.k === "prop" ? [[p.key, p.value] as const] : [])),
                );
                const tuning = tuningOf(props.tuning?.k === "word" ? props.tuning.v : "uke");
                for (const key of ["chord", "from", "to"]) {
                    const v = props[key];
                    if (v?.k !== "word" || v.v === "none") continue;
                    if (
                        !chordOf(n.type === "strumtrack" ? "uke" : tuning, v.v) &&
                        !chordOf("guitar", v.v)
                    )
                        bad.push(`${path}: ${n.type} ${key}=${v.v}`);
                    else if (n.type !== "strumtrack" && !chordOf(tuning, v.v))
                        bad.push(`${path}: ${n.type} ${key}=${v.v} on the ${tuning}`);
                }
            }
            if (n.children) walk(n.children, path);
        }
    };
    for (const [path, src] of Object.entries(files)) walk(parse(src).doc.nodes, path);
    assert.deepEqual(bad, []);
});

test("a way of separating gets a thing out only when nothing else goes the same way", () => {
    assert.equal(isolates("magnet", "iron", ["sand"], false), true);
    assert.equal(isolates("magnet", "sand", ["iron"], false), false);
    assert.equal(
        isolates("filter", "sand", ["salt"], true),
        true,
        "the salt dissolves and goes through",
    );
    assert.equal(
        isolates("filter", "sand", ["iron"], true),
        false,
        "the iron stays on the paper too",
    );
    assert.equal(isolates("evaporate", "salt", [], true), true);
    assert.equal(
        isolates("evaporate", "salt", ["sand"], true),
        false,
        "the sand is left behind with it",
    );
    assert.equal(isolates("sieve", "pebbles", ["sand"], false), true);
    assert.equal(isolates("sieve", "salt", ["sand"], false), false, "the grains are the same size");
    assert.equal(isolates("sieve", "pebbles", ["sand"], true), false, "a sieve is used dry");
});

test("a state is only asked well away from a melting or boiling point", () => {
    assert.deepEqual(stateAt("water", -10), { word: "solid" });
    assert.deepEqual(stateAt("water", 50), { word: "liquid" });
    assert.deepEqual(stateAt("water", 110), { word: "gas" });
    for (const t of [0, 3, -4, 100, 97, 104])
        assert.ok("problem" in stateAt("water", t), `water at ${t}`);
    assert.deepEqual(
        stateAt("water", 5),
        { word: "liquid" },
        "five degrees clear of a point is far enough",
    );
    assert.ok("problem" in stateAt("chocolate", 33));
    assert.deepEqual(stateAt("oxygen", 20), { word: "gas" });
    assert.deepEqual(stateAt("mercury", 20), { word: "liquid" });
    assert.equal(
        SUBSTANCES.sugar,
        undefined,
        "sugar breaks down before it melts, so it has no melting point to ask",
    );
});

// The floor from .docs/audit.md, section 4: a way in, a core, and a two and a three star stretch.
test("every chemistry lesson asks ten questions from five items, with a stretch and hint ladders", () => {
    let lessons = 0;
    for (const [id, lesson] of corpus.lessons) {
        if (lesson.subject !== "chemistry") continue;
        lessons++;
        const qs = [...questions(corpus, lesson).values()].flat().filter((q) => !q.worked);
        assert.ok(qs.length >= 10, `${id} asks ${qs.length} questions`);
        assert.ok(
            new Set(qs.map((q) => q.item.id)).size >= 5,
            `${id} draws on fewer than five items`,
        );
        const stars = lesson.sections.map((s) => s.stars ?? 0);
        assert.ok(
            stars.includes(2) && stars.includes(3),
            `${id} needs a two and a three star question`,
        );
        for (const q of qs.slice(1))
            assert.ok(q.item.hints.length >= 2, `${q.item.id} in ${id} has one hint`);
    }
    assert.ok(lessons >= 28, `${lessons} chemistry lessons`);
});

// Tables inside items are checked by `chem.state table=`; a lesson's own look table is checked here.
test("a table of melting and boiling points drawn in a chemistry lesson agrees with SUBSTANCES", () => {
    let rows = 0;
    for (const [path, src] of Object.entries(files)) {
        if (!path.startsWith("lessons/chemistry-")) continue;
        for (const m of src.matchAll(/head=\["[^"]*", "Melts", "Boils"\] cells=(\[[^\]]*\])/g)) {
            const parsed: unknown = JSON.parse(m[1] ?? "[]");
            const cells: string[] = Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
            assert.ok(Array.isArray(parsed) && cells.length % 3 === 0, path);
            for (let i = 0; i < cells.length; i += 3) {
                const [name = "", melts = "", boils = ""] = cells.slice(i, i + 3);
                const s = Object.values(SUBSTANCES).find((x) => x.name === name.toLowerCase());
                assert.ok(s, `${path}: ${name} is not in SUBSTANCES`);
                assert.deepEqual([melts, boils], [String(s.lo), String(s.bp)], `${path}: ${name}`);
                assert.equal(s.lo, s.hi, `${path}: ${name} melts over a range`);
                rows++;
            }
        }
    }
    assert.ok(rows > 0);
});

const probe = (body: string): { issues: string[]; answers: Record<string, string>[] } => {
    const ws = new Workspace({
        "items/probe.lumi": `item probe.one v=1 skills=[coding.tracing] {\n  title "Probe"\n${body}}\n`,
    });
    const report = ws.reports.get("probe.one");
    return {
        issues: (report?.issues ?? []).map((i) => `${i.level}: ${i.message}`),
        answers: (report?.variants ?? []).map((v) => v.answers),
    };
};

test("coding.runs works the answer out by running the program, and holds a stated answer to it", () => {
    const scene = `  let a=1..2
  scene 24x16 {
    maze g cols=6 rows=4 code=["right {a}", "down 2"] at=canvas(1, 0)
    number-input col below=g gap=1
    number-input row right-of=col gap=1
  }
`;
    const ok = probe(`${scene}  check coding.runs of=g col=col row=row\n`);
    assert.deepEqual(ok.issues, []);
    assert.deepEqual(ok.answers, [
        { col: "2", row: "3" },
        { col: "3", row: "3" },
    ]);
    const wrong = probe(`${scene}  answer col=(a)\n  check coding.runs of=g col=col row=row\n`);
    assert.ok(
        wrong.issues.some((m) => m.includes("answer col is 1, but coding.runs works it out as 2")),
        wrong.issues.join(" | "),
    );
});

test("coding.runs refuses a debugging question whose bug could be on two lines", () => {
    const scene = (moves: string): string => `  scene 24x20 {
    turtle t cols=6 rows=6 col=1 row=6 moves=${moves} target=["right 3", "up 3", "left 3", "down 3"] at=canvas(1, 0)
    choice pick options=[1, 2, 3, 4] below=t gap=1
  }
  check coding.runs of=t goal=target pick=wrong
`;
    assert.deepEqual(probe(scene(`["right 3", "up 3", "left 2", "down 3"]`)).answers, [
        { pick: "3" },
    ]);
    // Two lines short by one: mending either leaves the other, so no single change works.
    assert.ok(
        probe(scene(`["right 2", "up 3", "left 2", "down 3"]`)).issues.some((m) =>
            m.includes("no change to a single line"),
        ),
    );
});

test("coding.builds proves a build task can be done, with the pad's own program or by searching", () => {
    const task = (tray: string, lines: number, key = ""): ReturnType<typeof probe> =>
        probe(`  scene 34x20 {
    maze g map=["S . # .", ". . # .", "# . . F"] at=canvas(1, 0)
    codepad answer tray=${tray} lines=${lines}${key} right-of=g gap=1
  }
  check coding.builds of=g goal=flag
`);
    const found = task(`["right 1", "down 1"]`, 4);
    assert.deepEqual(found.issues, []);
    assert.deepEqual(found.answers, [{ answer: "right 1, down 2, right 2" }]);
    assert.ok(
        task(`["right 1", "down 1"]`, 2).issues.some((m) => m.includes("no program of 2 blocks")),
    );
    assert.ok(
        task(`["right 1", "down 1"]`, 4, ` key=["down 1", "right 3"]`).issues.some((m) =>
            m.includes("does not do the job"),
        ),
    );
});

test("the prover finds a repeat when the slots are too few for the long way", () => {
    const w = mazeWorld({
        cols: 0,
        rows: 0,
        map: ["# # # F", "# # . .", "# . . #", "S . # #"],
        col: 1,
        row: 1,
        face: "right",
        flag: [],
        gems: [],
        rocks: [],
    });
    const code = solve(w, "flag", ["repeat 2", "right 1", "up 1"], 3);
    assert.deepEqual(code, ["repeat 3", "  right 1", "  up 1"]);
    assert.ok(code && done(code, w, "flag"));
});

test("the verifier proves the colour questions with the paint box's own mixing", () => {
    assert.deepEqual(answersOf("art.what-two-make"), ["green", "purple", "orange"]);
    assert.deepEqual(
        answersOf("art.dots-from-far"),
        ["orange", "pink", "purple"],
        "red and yellow dots mix in the eye to orange",
    );
    assert.deepEqual(
        answersOf("art.dots-vs-paint"),
        ["grey"],
        "blue and yellow dots mix in the eye to grey, where paint makes green",
    );
    // a question whose answer is not among its options is refused, with the colour named
    assert.deepEqual(corpus.files.get("items/art-what-two-make.lumi")?.issues ?? [], []);
    const withProbe = {
        ...files,
        "items/zz.lumi": `item art.zz v=1 {
  title "Probe"
  scene 36x13 {
    paintpots pots pots=["blue", "white"] result="?" labels=true at=canvas(1, 1)
    choice pick options=["green", "orange", "purple"] below=pots gap=1
  }
  check paint.mixes of=pots pick=name
}
`,
    };
    const issues =
        new Workspace(withProbe).files.get("items/zz.lumi")?.issues.map((i) => i.message) ?? [];
    assert.ok(
        issues.some((m) => m.includes("the mix is blue")),
        issues.join(" | "),
    );
});

test("every art lesson is verified, and every painting it asks for says what a grown-up looks for", () => {
    const lessons = [...corpus.lessons.values()].filter((l) => l.subject === "art");
    assert.ok(lessons.length >= 12, `${lessons.length} art lessons`);
    for (const g of [1, 2, 3, 4])
        assert.ok(
            lessons.filter((l) => l.grade === g).length >= 3,
            `grade ${g} has three art lessons`,
        );
    const art = [...corpus.files.entries()].filter(([p]) => p.includes("/art-"));
    for (const [p, f] of art)
        assert.deepEqual(
            f.issues.map((i) => i.message),
            [],
            p,
        );
    const byEye = [...corpus.items.values()].filter(
        (i) => i.id.startsWith("art.") && i.check?.name === "art.by-eye",
    );
    assert.ok(byEye.length >= 12, "a painting in every lesson");
    for (const i of byEye)
        assert.ok(
            corpus.reports.get(i.id)?.solutions?.[0]?.includes("Ask:"),
            `${i.id} gives the grown-up a question`,
        );
});

test("the new colour questions are proved by mixing: the missing pot, the same green, and how many greens", () => {
    assert.deepEqual(answersOf("art.missing-pot"), [
        "yellow",
        "blue",
        "yellow",
        "red",
        "blue",
        "red",
    ]);
    assert.ok(answersOf("art.same-green")?.every((a) => /^\d+ yellow and \d+ blue$/.test(a)));
    assert.deepEqual(
        answersOf("art.how-many-greens", "answer"),
        ["3", "7", "11"],
        "a mix made bigger is the same green",
    );
    // adding one to each part is a different green, however close, so it is never the answer
    const withProbe = {
        ...files,
        "items/zz.lumi": `item art.zz v=1 {
  title "Probe"
  scene 30x10 {
    choice pick options=["3 yellow and 2 blue", "4 yellow and 2 blue"] at=canvas(1, 1)
  }
  check paint.mixes pick=same as="yellow 2+blue"
}
`,
    };
    assert.deepEqual(
        new Workspace(withProbe).reports.get("art.zz")?.variants.map((v) => String(v.answers.pick)),
        ["4 yellow and 2 blue"],
    );
});

test("the shape, line and print questions are worked out from the drawings and the rule", () => {
    assert.deepEqual(
        answersOf("art.how-many-geometric", "answer"),
        ["4", "3", "4"],
        "a boat, a fish and a house",
    );
    assert.deepEqual(answersOf("art.more-geometric", "answer"), ["3", "1", "3"]);
    assert.deepEqual(
        answersOf("art.word-prints"),
        ["MUM", "WOW", "TOT", "AHA"],
        "only a word that reads the same backwards in symmetric letters prints true",
    );
    assert.deepEqual(answersOf("art.letter-prints"), ["A", "T", "M", "H"]);
    assert.equal(
        new Set(answersOf("art.one-line")).size,
        3,
        "the figure that cannot be drawn moves between A, B and C",
    );
});
