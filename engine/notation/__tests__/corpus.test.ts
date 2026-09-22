// The build gate over content/curriculum/: the whole corpus parses, checks and verifies, and the
// checker catches what an author gets wrong.
import assert from "node:assert/strict";
import { test } from "node:test";
import { instantiate } from "../instantiate";
import { questions, type Question } from "../lessons";
import { parse, Workspace, type Node } from "../notation";
import { REGISTRY, SCENE_TYPES } from "../vocabulary";
import { content } from "./helpers";

const files = content();
const ws = new Workspace(files);
const issuesOf = (w: Workspace, path: string): string[] =>
    (w.files.get(path)?.issues ?? []).map((i) => `${i.level}: ${i.message}`);
const filled = (v: unknown): string =>
    typeof v === "object" && v !== null && "filled" in v ? String(v.filled) : "";

test("all content checks: no errors, and only the two warnings we expect", () => {
    const all = [...ws.files.values()].flatMap((f) =>
        f.issues.map((i) => `${f.path} ${i.level}: ${i.message}`),
    );
    assert.deepEqual(
        all.filter((i) => i.includes(" error: ")),
        [],
    );
    assert.deepEqual(all, [
        "items/apples-to-ten.lumi warning: this rule is also true for the correct answer, so it cannot tell the mistake apart (n = 5)",
        "items/make-ten.lumi warning: this rule is also true for the correct answer, so it cannot tell the mistake apart (n = 5)",
    ]);
});

test("every scene node type the vocabulary names by hand is used by the content", () => {
    const used = new Set<string>();
    const walk = (nodes: Node[]): void => {
        nodes.forEach((n) => {
            used.add(n.type);
            if (n.children) walk(n.children);
        });
    };
    for (const src of Object.values(files)) walk(parse(src).doc.nodes);
    const unused = SCENE_TYPES.filter((t) => !used.has(t));
    assert.deepEqual(unused, [], `unused scene types: ${unused.join(", ")}`);
    // and nothing in the content names a type the vocabulary does not know
    assert.deepEqual(
        [...used].filter((t) => !REGISTRY[t]),
        [],
    );
});

test("the balance item keeps five variants, and its scene comes from the component", () => {
    const item = ws.items.get("balance.chain");
    const r = ws.reports.get("balance.chain");
    assert.ok(item?.scene && r);
    const [first] = r.variants;
    assert.ok(first);
    assert.deepEqual(
        r.variants.map((v) => `${v.values.a}×${v.values.b}=${v.answers.answer}`),
        ["2×3=6", "2×4=8", "3×2=6", "3×3=9", "3×4=12"],
    );
    const inst = instantiate(item.scene, first.env, item.roles, ws.defines);
    assert.deepEqual(
        inst.nodes.map((n) => n.id),
        ["s1", "s2", "ask", "answer"],
    );
    assert.deepEqual(inst.nodes[0]?.v.right, ["ball", "ball"]);
    assert.equal(filled(inst.nodes[2]?.v.text), "How many stars balance 1 cube?");
});

test("a code checker proves the matchstick puzzle is solvable, and lists every solution", () => {
    assert.deepEqual(ws.reports.get("matchsticks.fix")?.solutions, ["0+4=4", "8-4=4"]);
});

test("huge parameter ranges are sampled, and every sample meets the where lines", () => {
    const r = ws.reports.get("columns.add");
    assert.ok(r);
    assert.equal(r.sampled, true);
    assert.equal(r.variants.length, 400);
    for (const v of r.variants) {
        const a = Number(v.values.a);
        const b = Number(v.values.b);
        assert.ok(a + b < 10000 && (a % 10) + (b % 10) >= 10, `${a} + ${b}`);
    }
});

test("a sampled item says what it actually checked, instead of claiming there are no variants", () => {
    const probe = (where: string): string => `item probe.one v=1 {
  title "Probe"
  let a=1..300 b=1..300
  where (${where})
  scene 20x8 {
    text ask "What is {a} plus {b}?" narrate at=canvas(1, 1)
    number-input answer below=ask gap=1
  }
  answer (a + b)
}
`;
    const of = (where: string): string[] =>
        issuesOf(new Workspace({ ...files, "items/probe.lumi": probe(where) }), "items/probe.lumi");
    // Nothing in the sample passes: the message may not claim that no variant exists, only that none was drawn.
    assert.deepEqual(of("a + b == 1"), [
        "error: no variant passed the where conditions in 8000 random draws, out of about 90000 the ranges allow;" +
            " narrow the ranges so they can be listed, or loosen the conditions",
    ]);
    // Few pass, so the checks below cover less of the item and the author is told so.
    assert.deepEqual(of("a % 97 == 0"), [
        "warning: only 76 of 400 sampled variants passed the where conditions, so these checks cover less of the item than usual",
    ]);
});

test("every format is in use, and every block resolves to questions", () => {
    assert.deepEqual([...new Set([...ws.lessons.values()].map((l) => l.format))].sort(), [
        "puzzles",
        "review",
        "teach",
        "worked",
    ]);
    const count = (id: string): Question[] => {
        const lesson = ws.lessons.get(id);
        assert.ok(lesson, id);
        return [...questions(ws, lesson).values()].flat();
    };
    assert.deepEqual(
        count("g1-making-ten").map((q) => q.n),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.deepEqual(
        count("g1-shape-puzzles").map((q) => q.item.id),
        [
            "balance.pairs",
            "shape.count-sides",
            "pattern.next",
            "balance.star-ball",
            "pattern.growing",
            "pattern.geese-v",
            "pattern.far-along",
            "matchsticks.fix",
            "add.triangle-all",
            "money.dimes-and-nickels",
        ],
    );
    assert.deepEqual(
        count("g1-year-review")[9]?.variant.values,
        { a: "3", b: "2" },
        "the review's puzzle is the balance chain it asks for",
    );
    const worked = count("g3-adding-in-columns")[0];
    assert.ok(worked);
    assert.equal(worked.worked, true);
    assert.equal(worked.variant.answers.sum, "632");
    assert.equal(count("g1-year-review").length, 10);
    // Fifteen lessons in each of the four grades, and the strands beyond maths alongside them.
    const maths = [...ws.lessons.values()].filter((l) => l.subject === "maths");
    for (const grade of [1, 2, 3, 4])
        assert.equal(maths.filter((l) => l.grade === grade).length, 15, `grade ${grade}`);
    assert.ok(
        [...ws.lessons.values()].some((l) => l.subject !== "maths"),
        "the other subjects are still here",
    );
});

test("the checker catches what an author gets wrong", () => {
    const edit = (path: string, from: string, to: string): Workspace => {
        const src = files[path] ?? "";
        assert.ok(src.includes(from), from);
        return new Workspace({ ...files, [path]: src.replace(from, to) });
    };
    assert.deepEqual(
        issuesOf(
            edit(
                "items/balance-chain.lumi",
                "  where (a * b != a + b)  # 2 and 2 would hide the adding mistake\n",
                "",
            ),
            "items/balance-chain.lumi",
        ),
        [
            "warning: this rule is also true for the correct answer, so it cannot tell the mistake apart (a = 2, b = 2)",
        ],
    );
    assert.deepEqual(
        issuesOf(
            edit("items/balance-pairs.lumi", "  where (c * k <= 6)  # a pan holds six props\n", ""),
            "items/balance-pairs.lumi",
        ),
        ["error: s right pan holds 9 props; a balance holds at most 6 (c = 3, k = 3)"],
    );
    assert.deepEqual(
        issuesOf(
            edit("items/make-ten.lumi", "  answer more=(10 - n)\n", ""),
            "items/make-ten.lumi",
        ),
        ['error: when: unknown name "more"', 'error: the item has no "answer" and no "check"'],
    );
    assert.deepEqual(
        issuesOf(
            edit(
                "lessons/g1-14-shape-puzzles.lumi",
                "show balance.star-ball k=3",
                "show balance.star-bal k=3",
            ),
            "lessons/g1-14-shape-puzzles.lumi",
        ),
        ['error: there is no item "balance.star-bal" (did you mean "balance.star-ball"?)'],
    );
    assert.deepEqual(
        issuesOf(
            edit(
                "lessons/g1-15-year-review.lumi",
                "show balance.chain a=3 b=2",
                "show balance.chain a=2 b=2",
            ),
            "lessons/g1-15-year-review.lumi",
        ),
        ["error: no variant of balance.chain has a = 2, b = 2 (a where line rules it out)"],
    );
    assert.deepEqual(
        issuesOf(
            edit("items/balance-chain.lumi", "point=s2.right-pan", "point=s2.right-pann"),
            "items/balance-chain.lumi",
        ).map((s) => s.split(";")[0]),
        ['error: point: "balance" has no anchor "right-pann"'],
    );
});

test("a workspace that verifies when read checks an item only once its report is read, and reports it the same", () => {
    const drawn = new Workspace(files, { verify: "when read" });
    assert.equal(drawn.lessons.size, ws.lessons.size);
    assert.equal(drawn.items.size, ws.items.size);
    assert.equal(drawn.reports.size, 0, "nothing is verified before it is read");
    assert.deepEqual(drawn.reports.get("columns.add"), ws.reports.get("columns.add"));
    assert.equal(drawn.reports.size, 1);
    assert.equal(drawn.reports.get("no.such.item"), undefined);
});

test("every lesson draws the same questions and answers when its items are verified as they are read", () => {
    const drawn = new Workspace(files, { verify: "when read" });
    const brief = (w: Workspace, id: string): unknown[] | null => {
        const l = w.lessons.get(id);
        return l
            ? [...questions(w, l).values()].flat().map((q) => ({
                  n: q.n,
                  item: q.item.id,
                  values: q.variant.values,
                  answers: q.variant.answers,
                  worked: q.worked,
              }))
            : null;
    };
    const ids = [...ws.lessons.keys()].sort();
    assert.ok(ids.length > 40, `only ${ids.length} lessons`);
    for (const id of ids) {
        assert.deepEqual(brief(drawn, id), brief(ws, id), `${id} draws different questions`);
        const l = ws.lessons.get(id);
        assert.ok(l);
        for (const q of [...questions(ws, l).values()].flat())
            assert.deepEqual(
                drawn.reports.get(q.item.id),
                ws.reports.get(q.item.id),
                `${id}: the report on ${q.item.id} differs`,
            );
    }
});

const components = Object.fromEntries(
    Object.entries(files).filter(([p]) => p.startsWith("components/")),
);
const probe = (src: string): Workspace => new Workspace({ ...components, "items/probe.lumi": src });
const issues = (w: Workspace): string[] =>
    [...w.files.values()].flatMap((f) => f.issues.map((i) => `${i.level}: ${i.message}`));

test("a set value is in every version and never in its name, and a level may change it", () => {
    const src = `item probe.set v=1 skills=[bonds-to-10] {
  title "Probe"
  difficulty (total - n)
  set total=10
  let n=1..9
  where (n < total)
  level hard {
    set total=12
    let n=1..6
  }

  scene 30x8 {
    text ask "{n} and how many more make {total}?" at=canvas(1, 1)
    number-input answer right-of=ask gap=1
  }

  answer (total - n)
}
`;
    const w = probe(src);
    assert.deepEqual(issues(w), []);
    const medium = w.itemAt("probe.set", "medium");
    const hard = w.itemAt("probe.set", "hard");
    const mv = medium ? (w.reportFor(medium)?.variants ?? []) : [];
    const hv = hard ? (w.reportFor(hard)?.variants ?? []) : [];
    assert.deepEqual(Object.keys(mv[0]?.values ?? {}), ["n"]);
    assert.equal(mv[0]?.answers.answer, "9");
    assert.equal(hv[0]?.answers.answer, "11");
    assert.equal(hv.length, 6);
});

const GLOCK = (notes: string, low: string): string => `item probe.play v=1 skills=[music.keys] {
  title "Probe"
  let low=${low}

  scene 32x32 {
    notes staff clef=treble notes=[C5, D5, E5] at=canvas(1, 0)
    text ask "Play the two notes on the glockenspiel, one after the other." width=30 below=staff gap=1
    glockenspiel glock from=C5 bars=5 below=ask gap=1
  }

  check music.plays notes=${notes}
  hint "Find the bar with the first note on it."
}
`;

test("a played item may name a parameter in its notes, and every version is proved", () => {
    assert.deepEqual(issues(probe(GLOCK("[{low}, E5]", '{"C5", "D5"}'))), []);
    const bad = issues(probe(GLOCK("[{low}, E5]", '{"C5", "Q9"}')));
    assert.ok(
        bad.some((i) => i.startsWith("error:") && i.includes("low = Q9")),
        bad.join("\n"),
    );
});

test("a look-for that names something the item does not have is refused", () => {
    const src = `item probe.write v=1 skills=[writing.composing] {
  title "Probe"
  let n=2..3

  scene 34x16 {
    text ask "Write {n} sentences about the sea." width=32 at=canvas(1, 1)
    writinglines rules lines=3 width=32 below=ask gap=1
  }

  check writing.by-eye look-for="{n} whole sentences, each with a capital letter and a full stop, about {m}."
}
`;
    const found = issues(probe(src));
    assert.ok(
        found.some((i) => i.includes("check look-for") && i.includes("{m}")),
        found.join("\n"),
    );
    assert.deepEqual(issues(probe(src.replace(", about {m}.", "."))), []);
});

test("the grade 4 content is verified with the rest, and every grade 4 item has its answers", () => {
    const g4 = [...ws.items.values()].filter((i) =>
        ws.file("item", i.id).path.startsWith("items/g4-"),
    );
    assert.ok(g4.length >= 27, `only ${g4.length} grade 4 items`);
    for (const item of g4) {
        const r = ws.reports.get(item.id);
        assert.ok(r);
        assert.ok(r.variants.length > 0 || r.solutions?.length, `${item.id} has no variants`);
        assert.deepEqual(
            r.issues.filter((i) => i.level === "error"),
            [],
            item.id,
        );
    }
});
