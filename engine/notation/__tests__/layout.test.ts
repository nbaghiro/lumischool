// Nodes and layout: choices, marks, anchors that come from the values, imported art, rows and
// columns, the sizes on the grid, a node that draws several blanks, and the width of a printed
// sheet, which every scene in the corpus has to fit.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Level } from "../../pack";
import { SCENE_COLS } from "../../paper";
import { instantiate, layout, sizeOf, type Concrete } from "../instantiate";
import { checkDoc, parse, Workspace, type TNode } from "../notation";
import { PARTS, PLACE_KEYS } from "../vocabulary";
import { content } from "./helpers";

const PATH = "items/one.lumi";
const build = (src: string): { ws: Workspace; issues: string[] } => {
    const ws = new Workspace({ [PATH]: src });
    return {
        ws,
        issues: (ws.files.get(PATH)?.issues ?? []).map((i) => `${i.level}: ${i.message}`),
    };
};
/** An item around a scene, with the answer it should have. */
const wrap = (scene: string, rest = "answer 3", head = ""): string =>
    `item t.one v=1 {\n${head}  scene ${scene}\n  ${rest}\n}\n`;
const filled = (v: unknown): string =>
    typeof v === "object" && v !== null && "filled" in v ? String(v.filled) : "";
const labelsOf = (v: unknown): string[] =>
    Array.isArray(v)
        ? v.map((o: unknown) =>
              typeof o === "object" && o !== null && "label" in o ? String(o.label) : "",
          )
        : [];
/** The item's scene made concrete for its first variant, or with nothing to fill. */
const instanceOf = (ws: Workspace, first = false): ReturnType<typeof instantiate> => {
    const item = ws.items.get("t.one");
    assert.ok(item?.scene);
    const variant = first ? ws.reports.get("t.one")?.variants[0] : undefined;
    return instantiate(item.scene, variant?.env ?? {}, item.roles, ws.defines);
};

const CHOICE = wrap(
    `20x8 {\n    choice pick options=["Yes", "No"] at=canvas(1, 1)\n  }`,
    'answer pick=(if n > 1 then "Yes" else "No")',
    "  let n=1..3\n",
);

test("a choice takes the answer that names one of its options", () => {
    const { ws, issues } = build(CHOICE);
    assert.deepEqual(issues, []);
    const r = ws.reports.get("t.one");
    assert.ok(r);
    assert.deepEqual(
        r.variants.map((v) => v.answers.pick),
        ["No", "Yes", "Yes"],
    );
    // the answer key shows the option's label, not the word that names it
    assert.deepEqual(r.variants[0]?.labels, { pick: "No" });
});

test("an answer that names no option, or two options that read the same, are errors", () => {
    assert.deepEqual(build(CHOICE.replace('if n > 1 then "Yes" else "No"', '"Maybe"')).issues, [
        'error: answer pick is "Maybe", which is not one of the options (Yes, No) (n = 1; n = 2; n = 3)',
    ]);
    assert.deepEqual(build(CHOICE.replace('"Yes", "No"', '"Yes", "Yes"')).issues, [
        'error: pick has two options that read "Yes" (n = 1; n = 2; n = 3)',
        'error: answer pick is "No", which is not one of the options (Yes, Yes) (n = 1)',
        'error: pick has 2 options that the answer "Yes" could name (n = 2; n = 3)',
    ]);
});

test("options can be props, by role or by name, and the label is the prop's noun", () => {
    const { ws, issues } = build(
        wrap(
            `20x8 {\n    choice pick options=[small, star] at=canvas(1, 1)\n  }`,
            'answer pick=(if n > 1 then "small" else "star")',
            "  let n=1..2\n  roles small=circle\n",
        ),
    );
    assert.deepEqual(issues, []);
    assert.deepEqual(
        ws.reports.get("t.one")?.variants.map((v) => v.labels?.pick),
        ["star", "circle"],
    );
});

test("an option that is not a parameter, a role or a prop is reported", () => {
    assert.deepEqual(
        build(
            wrap(
                `20x8 {\n    choice pick options=[giraffe, star] at=canvas(1, 1)\n  }`,
                'answer pick="star"',
            ),
        ).issues,
        [
            'error: choice options: "giraffe" is not a parameter, a role, or a prop the renderer knows',
        ],
    );
});

test("marks attach to a node or an anchor, and a solution mark is kept apart", () => {
    const src = wrap(
        `24x12 {\n    tenframe f count=3 at=canvas(1, 1)\n    loop f.cell(2) solution\n    tick f\n` +
            `    number-input answer right-of=f gap=1\n  }`,
    );
    const { ws, issues } = build(src);
    assert.deepEqual(issues, []);
    const inst = instanceOf(ws);
    assert.deepEqual(
        inst.marks.map((m) => `${m.type} ${m.target}${m.solution ? " solution" : ""}`),
        ["loop f.cell(2) solution", "tick f"],
    );
    // a mark is not a box, so it neither takes room in the scene nor counts as an overlap
    assert.deepEqual(
        inst.nodes.map((n) => n.id),
        ["f", "answer"],
    );
});

test("a mark that names a node or an anchor that is not there is reported", () => {
    assert.deepEqual(
        build(
            wrap(
                `24x12 {\n    tenframe f count=3 at=canvas(1, 1)\n    loop g.cell(2)\n    number-input answer right-of=f gap=1\n  }`,
            ),
        ).issues,
        ['error: loop: there is no node "g" in the scene'],
    );
    assert.deepEqual(
        build(
            wrap(
                `24x12 {\n    tenframe f count=3 at=canvas(1, 1)\n    tick f.cell(12)\n    number-input answer right-of=f gap=1\n  }`,
            ),
        ).issues.map((s) => s.split(";")[0]),
        ['error: tick: "tenframe" has no anchor "cell(12)"'],
    );
});

test("anchors a node's values make are known to the checker", () => {
    const ok = build(
        wrap(
            `30x14 {\n    ruler r cm=10 length=4 at=canvas(1, 0)\n    number-input answer below=r gap=1\n` +
                `    loop r.tick(10)\n  }`,
        ),
    );
    assert.deepEqual(ok.issues, []);
    const tooFar = build(
        wrap(
            `30x14 {\n    ruler r cm=10 length=4 at=canvas(1, 0)\n    number-input answer below=r gap=1\n` +
                `    loop r.tick(11)\n  }`,
        ),
    );
    assert.deepEqual(
        tooFar.issues.map((s) => s.split(";")[0]),
        ['error: loop: "ruler" has no anchor "tick(11)"'],
    );
});

test("art takes its size and its anchors from the file, and an unknown name says what there is", () => {
    const { ws, issues } = build(
        wrap(
            `20x10 {\n    art pic asset="sun" at=canvas(1, 1)\n    number-input answer right-of=pic gap=1\n    tick pic.centre\n  }`,
        ),
    );
    assert.deepEqual(issues, []);
    const boxes = layout(instanceOf(ws)).boxes;
    assert.deepEqual(boxes.get("pic"), { x: 1, y: 1, w: 6, h: 6 });
    const missing = build(
        wrap(
            `20x10 {\n    art pic asset="dragon" at=canvas(1, 1)\n    number-input answer right-of=pic gap=1\n  }`,
        ),
    );
    // The list it offers is whatever is in the art folder, which grows, so the test checks the shape
    // of the message and that a known asset is among the names rather than pinning the whole list.
    assert.match(
        missing.issues[0] ?? "",
        /there is no art asset "dragon"; the art folder has [a-z0-9, -]+/,
    );
    assert.match(missing.issues[0] ?? "", /\bsun\b/);
});

test("a row places its children, and align=centre centres them across it", () => {
    const { ws, issues } = build(
        wrap(
            `24x12 {\n    row line at=canvas(0, 0) space=1 align=centre {\n      guide g\n      tenframe f count=3\n    }\n` +
                `    number-input answer below=line gap=1\n  }`,
        ),
    );
    assert.deepEqual(issues, []);
    const inst = instanceOf(ws);
    const boxes = layout(inst).boxes;
    assert.deepEqual(inst.nodes.find((n) => n.id === "line")?.contains, ["g", "f"]);
    assert.deepEqual(boxes.get("line"), { x: 0, y: 0, w: 16, h: 6 });
    assert.deepEqual(boxes.get("g"), { x: 0, y: 2, w: 3, h: 3 });
    assert.deepEqual(boxes.get("f"), { x: 4, y: 0, w: 12, h: 6 });
    // the row is the box that follows, not its children
    assert.deepEqual(boxes.get("answer"), { x: 0, y: 7, w: 4, h: 2 });
});

test("a column stacks its children, and a child cannot place itself", () => {
    const { ws } = build(
        wrap(
            `24x16 {\n    column stack at=canvas(1, 1) space=0 {\n      tally t count=6\n      tally u count=11\n    }\n` +
                `    number-input answer below=stack gap=1\n  }`,
        ),
    );
    const boxes = layout(instanceOf(ws)).boxes;
    assert.deepEqual(boxes.get("t"), { x: 1, y: 1, w: 5, h: 3 });
    assert.deepEqual(boxes.get("u"), { x: 1, y: 4, w: 8, h: 3 });
    assert.deepEqual(
        build(
            wrap(
                `24x16 {\n    column stack at=canvas(1, 1) {\n      tally t count=6 at=canvas(2, 2)\n    }\n` +
                    `    number-input answer below=stack gap=1\n  }`,
            ),
        ).issues,
        ['error: a column places its children, so "tally" cannot also have at'],
    );
});

test("the structures are sized from their values", () => {
    const { ws } = build(
        wrap(
            `40x26 {\n    ruler r cm=10 length=4 at=canvas(0, 0)\n    tally t count=13 right-of=r gap=1\n` +
                `    hundred h from=1 to=40 below=r gap=0\n    coins c quarters=1 pennies=2 right-of=h gap=1\n` +
                `    grid gr rows=2 cols=3 shade=4 below=h gap=0\n    pattern p unit=[a] count=4 right-of=gr gap=1\n` +
                `    number-input answer right-of=p gap=1\n  }`,
            "answer 3",
            "  roles a=circle\n",
        ),
    );
    const boxes = layout(instanceOf(ws)).boxes;
    const size = (id: string): string => `${boxes.get(id)?.w}x${boxes.get(id)?.h}`;
    assert.equal(size("r"), "23x7"); // one centimetre is two squares, plus a square at each end
    assert.equal(size("t"), "10x3"); // two fives and three ones
    assert.equal(size("h"), "22x10"); // four rows of ten, two squares to a cell
    assert.equal(size("c"), "7x3");
    assert.equal(size("gr"), "8x6");
    assert.equal(size("p"), "13x4");
});

test("a column of multiplication is as wide as its product, not as its longest input", () => {
    const { ws } = build(
        wrap(`20x8 {\n    columns sum a=986 b=7 op=mul at=canvas(1, 1)\n  }`, "answer 6902"),
    );
    const [node] = instanceOf(ws).nodes;
    assert.ok(node);
    const box = (op: string): { w: number; h: number } => {
        const c: Concrete = { ...node, v: { ...node.v, op } };
        return sizeOf(c);
    };
    assert.deepEqual(box("add"), { w: 5, h: 5 });
    assert.deepEqual(box("mul"), { w: 6, h: 5 }); // 6,902 needs four digit squares
});

// several blanks, a word a parameter picks, a parameter in a list, a decimal kept as written

const WALL = `item t.one v=1 {
  let a=2..4 b=2..4
  scene 20x10 {
    pyramid wall cells=[a, b, ?] blanks=[top] at=canvas(1, 1)
  }
  answer top=(a + b)
}
`;

test("a node can draw several blanks, and each one takes an answer of its own", () => {
    const { ws, issues } = build(WALL);
    assert.deepEqual(issues, []);
    assert.deepEqual(ws.reports.get("t.one")?.variants[0]?.answers, { top: "4" });
});

test("naming the wrong number of blanks is reported, and so is a blank with no answer", () => {
    assert.deepEqual(build(WALL.replace("blanks=[top]", "blanks=[top, extra]")).issues, [
        'error: "extra" takes an answer, but there is no answer extra=...',
        "error: wall draws 1 blank but blanks= names 2 (a = 2, b = 2; a = 2, b = 3; a = 2, b = 4; a = 3, b = 2; and 5 more)",
    ]);
    assert.deepEqual(build(WALL.replace("answer top=(a + b)", "answer other=(a + b)")).issues, [
        'error: "top" takes an answer, but there is no answer top=...',
        "error: answer other has nowhere to go: add an input with that name or a {?other} blank",
    ]);
});

const MIRROR = `item t.one v=1 {
  let s={"square", "ell"}
  scene 16x20 {
    mirror fig shape=s line=vertical size=7 at=canvas(1, 1)
    choice pick options=["Yes", "No"] below=fig gap=1
  }
  answer pick=(if s == "ell" then "No" else "Yes")
}
`;

test("a parameter can choose a word setting, and a value outside the list is reported", () => {
    const { ws, issues } = build(MIRROR);
    assert.deepEqual(issues, []);
    assert.deepEqual(
        ws.reports.get("t.one")?.variants.map((v) => `${v.values.s}=${v.answers.pick}`),
        ["square=Yes", "ell=No"],
    );
    assert.deepEqual(build(MIRROR.replace('{"square", "ell"}', '{"square", "oval"}')).issues, [
        'error: mirror shape is "oval", which is not one of square, rectangle, isosceles, ell, hexagon, circle (s = oval)',
    ]);
});

test("a parameter in a list of values reads as its value, while a role still names a picture", () => {
    const { ws, issues } = build(`item t.one v=1 {
  let n=7..8
  roles thing=apple
  scene 24x12 {
    table t cols=2 head=["Class", "Books"] cells=["Red", n, "Blue", thing] at=canvas(1, 1)
    number-input answer below=t gap=1
  }
  answer n
}
`);
    assert.deepEqual(issues, []);
    const inst = instanceOf(ws, true);
    assert.deepEqual(labelsOf(inst.nodes[0]?.v.cells), ["Red", "7", "Blue", "apple"]);
});

test("a decimal is shown the way it was written, and keeps its places through a calculation", () => {
    const { ws, issues } = build(`item t.one v=1 {
  let v={1.5, 2.25}
  scene 26x8 {
    text ask "A ribbon is {v} metres long." at=canvas(1, 1)
    number-input answer below=ask gap=1
  }
  answer (v * 100)
}
`);
    assert.deepEqual(issues, []);
    const inst = instanceOf(ws, true);
    // 1.5 is held exactly and shown as it was written, so the page reads "1.5 metres" and the answer
    // keeps the place it inherits from it.
    assert.equal(ws.reports.get("t.one")?.variants[0]?.answers.answer, "150.0");
    assert.equal(filled(inst.nodes[0]?.v.text), "A ribbon is 1.5 metres long.");
});

// a scene has to fit the paper it prints on

// A printed A4 sheet is 42 squares across and a scene is placed at column 5, beside the margin rule,
// so 37 squares is everything a scene can have. Two numbers are checked, because a scene has two
// widths: the declared one, which the sheet reserves and the notation writes, and the used one, where
// the drawings actually end. A scene wider than its contents is its own fault: inside a question card
// the whole scene is scaled to the card, so a box holding less drawing than it declares shrinks it.
const SCENE_LIMIT = SCENE_COLS;
const corpus = new Workspace(content());

const usedBox = (inst: ReturnType<typeof instantiate>): { w: number; h: number } => {
    const { boxes } = layout(inst);
    let w = 0;
    let h = 0;
    for (const b of boxes.values()) {
        w = Math.max(w, b.x + b.w);
        h = Math.max(h, b.y + b.h);
    }
    return { w: Math.ceil(w), h: Math.ceil(h) };
};

interface SceneSize {
    where: string;
    declared: number;
    used: number;
    declaredH: number;
    usedH: number;
}

/**
 * Every scene in the corpus: where it is, what it declares, and where its drawings end. An item's
 * versions are laid out at every level, not at medium alone, because a `level` block may widen a
 * parameter's range and those versions lay out larger than the file as written does. A level that
 * replaces the scene outright declares its own size and is left to the file as written.
 */
function scenes(): SceneSize[] {
    const out: SceneSize[] = [];
    const LEVELS: Level[] = ["easy", "medium", "hard"];
    for (const [id, item] of corpus.items) {
        if (!item.scene) continue;
        let used = 0;
        let usedH = 0;
        for (const level of LEVELS) {
            const at = corpus.itemAt(id, level);
            const scene = at?.scene;
            if (
                !scene ||
                scene.size[0] !== item.scene.size[0] ||
                scene.size[1] !== item.scene.size[1]
            )
                continue;
            for (const v of corpus.reportFor(at)?.variants ?? []) {
                try {
                    const box = usedBox(instantiate(scene, v.env, at.roles, corpus.defines));
                    used = Math.max(used, box.w);
                    usedH = Math.max(usedH, box.h);
                } catch {
                    /* a variant that will not lay out is the verifier's finding, not this one's */
                }
            }
        }
        if (used)
            out.push({
                where: `item ${id}`,
                declared: item.scene.size[0],
                used,
                declaredH: item.scene.size[1],
                usedH,
            });
    }
    for (const [lid, lesson] of corpus.lessons) {
        const walk = (nodes: TNode[]): void => {
            for (const b of nodes) {
                if (b.type === "scene" && b.args.size?.k === "size") {
                    const declared = b.args.size.w;
                    try {
                        const inst = instantiate(
                            { size: [declared, b.args.size.h], nodes: b.children },
                            {},
                            {},
                            corpus.defines,
                        );
                        const box = usedBox(inst);
                        out.push({
                            where: `lesson ${lid}`,
                            declared,
                            used: box.w,
                            declaredH: b.args.size.h,
                            usedH: box.h,
                        });
                    } catch {
                        /* ditto */
                    }
                }
                if (b.children.length) walk(b.children);
            }
        };
        walk(lesson.node.children);
    }
    return out;
}

const ALL = scenes();

test("no scene is wider than a printed sheet can hold", () => {
    const over = [...new Set(ALL.filter((s) => s.used > SCENE_LIMIT).map((s) => s.where))].sort();
    assert.deepEqual(
        over,
        [],
        `these scenes run past the ${SCENE_LIMIT} squares a sheet leaves:\n  ${over.join("\n  ")}`,
    );
});

test("no scene declares more width than a printed sheet can hold", () => {
    const over = [
        ...new Set(ALL.filter((s) => s.declared > SCENE_LIMIT).map((s) => s.where)),
    ].sort();
    assert.deepEqual(
        over,
        [],
        `these scenes reserve more than ${SCENE_LIMIT} squares:\n  ${over.join("\n  ")}`,
    );
});

test("a scene is not much wider than the drawings in it", () => {
    // Eight squares of slack is generous: it allows a scene sized for a variant wider than the one
    // measured, and still catches a box that was guessed rather than measured. Fifteen of 366 scenes
    // are over that today, so the count is a ratchet rather than a rule, and it only goes down.
    const loose = ALL.filter((s) => s.declared - s.used > 8)
        .map((s) => `${s.where}: ${s.declared} declared, ${s.used} used`)
        .sort();
    assert.ok(
        loose.length <= 15,
        `${loose.length} scenes are more than eight squares wider than their contents, which was 15:\n  ${loose.join("\n  ")}`,
    );
});

test("a scene is not much taller than the drawings in it", () => {
    // A scene reserves its declared height on the printed sheet, so a row it declares and does not
    // draw is blank paper under every copy of the question. Four rows of slack is allowed rather than
    // none because a few of the music parts paint a label up to two rows below their own box, and
    // because a scene sized for a version wider or taller than the ones measured here is not a mistake.
    const loose = ALL.filter((s) => s.declaredH - s.usedH > 4)
        .map((s) => `${s.where}: ${s.declaredH} rows declared, ${s.usedH} drawn`)
        .sort();
    assert.deepEqual(
        loose,
        [],
        `these scenes reserve rows they never draw:\n  ${loose.join("\n  ")}`,
    );
});

/**
 * Settings named like a placement word that the shelf held when the vocabulary began reading the
 * whole catalogue, none of them placed by a lesson: `seesawplank` is drawn only through `balance-
 * plank`, and the hedge and the railway are the worlds' pieces. Each is for its drawing's owner to
 * rename; the list is checked both ways, so fix one and this test says to take it out. */
const KNOWN_CLASHES = ["hedge.gap", "railway.at", "railway.gap", "seesawplank.gap"];

test("no drawing names a setting like a placement keyword", () => {
    // `at`, `gap`, `below`, `above`, `right-of` and `left-of` place a part on the canvas, so a part
    // that also declares a setting of that name can never be given one: instantiate reads the word as
    // a placement and drops the setting without a word, which is the worst kind of failure because the
    // checker accepts the line. Five drawings had one, and two items carried a wrong threshold for
    // weeks because of it.
    const clashes: string[] = [];
    for (const [id, part] of PARTS) {
        const params = part.d.params;
        if (typeof params !== "object" || params === null) continue;
        for (const key of Object.keys(params))
            if (PLACE_KEYS.includes(key)) clashes.push(`${id}.${key}`);
    }
    clashes.sort();
    const fresh = clashes.filter((c) => !KNOWN_CLASHES.includes(c));
    assert.deepEqual(
        fresh,
        [],
        `these settings can never be written in a scene, because the word places the part instead:\n  ${fresh.join("\n  ")}`,
    );
    const fixed = KNOWN_CLASHES.filter((c) => !clashes.includes(c));
    assert.deepEqual(
        fixed,
        [],
        `these are renamed and should come out of KNOWN_CLASHES:\n  ${fixed.join("\n  ")}`,
    );
});

test("a fixed-word setting written with a parameter's name is refused, and a declared choice is not", () => {
    // The solid once took only a fixed word, so `kind=k` drew the word "k" (a cube) while the answer
    // key varied with k. It now lists the words it accepts, and a parameter may pick one of them.
    const solid = new Workspace({
        ...content(),
        "items/probe-solid.lumi": `item probe.solid v=1 skills=[shapes.solids] {
  title "Probe"
  let k={"cube", "sphere"}

  scene 12x14 {
    solid shape kind=k label="" at=canvas(1, 1)
    number-input answer below=shape gap=1
  }

  answer 1
}
`,
    });
    assert.deepEqual(
        solid.reports.get("probe.solid")?.issues.map((i) => i.message),
        [],
    );
    const v = solid.reports
        .get("probe.solid")
        ?.variants.map((x) => x.values.k)
        .sort();
    assert.deepEqual(v, ["cube", "sphere"]);
});

test("a parameter named like one of a setting's words is refused, since it would read as the word", () => {
    const solid = new Workspace({
        ...content(),
        "items/probe-clash.lumi": `item probe.clash v=1 skills=[shapes.solids] {
  title "Probe"
  let cube={"cube", "sphere"}

  scene 12x14 {
    solid shape kind=cube label="" at=canvas(1, 1)
    number-input answer below=shape gap=1
  }

  answer 1
}
`,
    });
    const issues = solid.reports.get("probe.clash")?.issues.map((i) => i.message) ?? [];
    assert.ok(
        issues.some((m) => m.includes("is a parameter and also one of the words kind takes")),
        issues.join(" | "),
    );
});

test("gap= on its own is refused, since it only means something beside a relative placement", () => {
    const r = parse(`item probe.gap v=1 skills=[x.y] {
  title "Probe"

  scene 30x8 {
    text ask "Hello" at=canvas(1, 1) gap=2
  }

  answer 1
}
`);
    const issues = checkDoc(r.doc).issues.map((i) => i.message);
    assert.ok(
        issues.some((m) => m.startsWith("gap= only means something")),
        issues.join(" | "),
    );
});
