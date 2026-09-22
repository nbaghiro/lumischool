# Content notation

Status: accepted direction, prototyped in `scratchpad/` (September 2026).

## Summary

Every piece of lumischool content is written in one text notation: practice items, the scenes inside them, reusable scene components, and lessons. The text is the source of truth. It is what we store, review, diff, version and hand to authors and to AI. Code reads it into a typed tree in memory, and every other form (the rendered lesson, the printed sheet, the studio's forms) is derived from that tree on demand. JSON is not a stored or exchanged format.

The notation separates a small, fixed syntax from a vocabulary that grows. The syntax only knows about nodes, values, children and comments. What a node means, which values and settings it takes and which children it allows all come from a type registry. Adding a new visual, activity, lesson section or checker is a registry entry, never a parser change, which is what lets the platform extend to new subjects and formats without touching its core.

## Why the text is the source of truth

We considered keeping a JSON document as the canonical form and treating the text as an authoring view over it. We rejected that because the text is what people read, review and reason about, and a format nobody reads should not be the one we trust.

Our frontend and backend are both TypeScript, so one parser serves the child app, the studio and the server, and they can exchange the text itself. JSON only comes back if an outside consumer needs it, and then it is produced from the tree on demand.

The concerns that pointed towards JSON are handled as follows:

- AI writes the notation and receives the parser's and checker's errors, with line and column, until the file passes. This is the loop LlamaTrade's agent uses with its strategy language. The `content/` folder serves as the example set.
- The studio edits the typed tree and saves it through the canonical formatter, so a change made in a form is a small diff in the text.
- Live tutor sessions sync what happens inside a scene (answers, marks, ink), not the scene definition, so the text never changes during a session.
- Replays refer to an item by the hash of its canonical text, plus node ids and anchor names.
- For content written in the studio rather than in the repository, we store the text with that hash, plus fields recomputed from it on each write for querying (skills, visual types, parameter ranges).

## Requirements

We tested each option against the content we actually write: parametric scenes, fill-in items, lessons, thinking problems with code-backed answers, courses and skill graphs, and printed sheets.

1. A new visual, activity, section or checker type must not require a grammar change.
2. Nesting must be uniform at any depth: lesson, section, scene, node, and feedback inside feedback.
3. Prose must be comfortable to write: lesson text, notes for grown-ups, hints, solutions.
4. Maths is written the way teachers write it, infix and with exact arithmetic.
5. Answer blanks can sit inside text or an equation, as WeBWorK's PGML allows with `[_]{$answer}`.
6. Feedback can branch, as in STACK's potential response trees and Numbas's marking notes, rather than being one flat list of mistakes.
7. Scenes can be defined once and reused with parameters.
8. There is one canonical layout, so a studio edit is a small, stable diff and comments survive.
9. AI can write it reliably and repair it from precise errors.
10. The parser and tooling stay small, and nothing in a file can execute code.

## Options considered

| | Line syntax | S-expressions | Node notation | Markdown with blocks | HCL style | YAML |
|---|---|---|---|---|---|---|
| New types without grammar change | no | yes | yes | partly | yes | yes |
| Uniform nesting | no | yes | yes | partly | yes | yes |
| Prose | partly | poor | yes, text blocks | yes | partly | partly |
| Infix maths | yes | no | yes | partly | yes | no |
| One node per line, stable diffs | yes | partly | yes | partly | partly | partly |
| Canonical formatting from the studio | yes | yes | yes | no | yes | no |
| Familiar to AI | partly | yes | yes | yes | yes | yes |
| Parser cost | small | smallest | small | large | medium | none |

The first prototype used a line syntax. It read well for one flat item, but its statements (`let`, `where`, `misread`) were built into the parser, so every new feature needed a grammar change. S-expressions pass the structural tests but make prose awkward (strings everywhere) and push maths into prefix form, which curriculum authors find hard to read. Markdown with embedded blocks is the reverse: good for prose, but it has many equivalent ways to write the same thing, which makes canonical formatting from a visual editor hard, and most of our content is structure rather than prose. HCL-style blocks spread one scene node over several lines. YAML would leave every expression in a string. The node notation is the only option that met every requirement.

## Design

### Syntax

A file is a tree of nodes. One node is one line:

```
node   := type value* key=value* { children }?
value  := number            12, 0.35, -3
        | word              s1, s2.right-pan, frame.cell(9), bonds.make-ten, ?
        | size              32x16
        | list              [heavy, mid * a]
        | text              "How many {light.many}?"
        | text block        """ on the following lines, closed by """
        | expression        (a * b != a + b), 2..4, canvas(1, 1)
```

- An expression that contains spaces goes in parentheses. The formatter adds or removes them as needed, so `a*b` becomes `(a * b)` and `(n)` becomes `n`.
- A text block holds prose. Its lines are dedented on reading and re-indented on writing.
- Comments start with `#`. They are kept above a node, at the end of a line, before a closing brace and at the end of a file.
- The canonical layout uses two-space indentation and single spaces between values. We chose not to align columns across lines, because alignment makes one longer id rewrite every line around it.
- The lexical rules for strings, numbers and comments follow KDL, but the notation is not KDL-compatible, because its values include expressions.

### Vocabulary

The registry declares every node type. A declaration says whether the first value is an id, which positional values and flags the type takes, its settings and the kind of each, which children it allows, and for scene nodes their anchors, box and capacity. The checker, the studio's forms, the renderer and the verifier all read the same declarations.

The prototype registers these types:

- Files: `item`, `lesson`, `define`.
- Inside an item: `title`, `difficulty`, `let`, `where`, `roles`, `scene`, `answer`, `check`, `feedback`, `when`, `say`, `hint`, and `level`.
- Scene nodes: `balance`, `tenframe`, `numberline`, `numberbond`, `barmodel`, `fraction`, `clock`, `matchsticks`, `props`, `text`, `equation`, `number-input`, `columns`, `guide`, `arrow`, `use`.
- Inside a lesson: `goal`, `grown-ups`, the sections `look`, `do`, `story`, `try`, `remember`, `example`, `exercises`, `puzzle` and `warm-up`, the blocks `say`, `scene`, `practice`, `show` and `worked`, and `level`.

Answers that an expression cannot state are checked by TypeScript functions registered by name, for example `check matchsticks.one-move from="6+4=4"`. Every code checker can also list its solutions, so the verifier can prove a puzzle is solvable before it ships.

### Processing

```
text ─parse→ syntax tree (generic, lossless: types, values, settings, children, comments, positions)
     ─check against the registry→ typed documents (item, lesson, component)
     ─instantiate with parameters→ concrete scenes → layout → draw, grade, print
studio edits the typed tree → syntax tree → formatter → text (the text is what is stored)
```

The formatter, the syntax checks and the syntax tree view are generic, so they work unchanged for types added later.

### Expressions

Expressions use exact rational arithmetic, so `1/3 + 1/6` is exactly `1/2` and `0.1 + 0.2 == 0.3` is true; a number too large to represent exactly is an error rather than a silently wrong answer. The language has comparisons, `and`, `or`, `not`, ranges (`2..10 by 2`), sets (`{1, 3, 5}`), `if ... then ... else`, and a fixed list of functions. It has no loops, no user-defined functions and no input or output, and the same inputs always give the same result.

How a number is written says how it is shown. A literal with a decimal point carries its places as a display hint, so `1.40` is shown as `1.40`, `2.35 + 1.40` is `3.75`, and `1.50 * 2` is `3.00`, which is what money needs. The hint travels with the value through a calculation and takes the wider of the two operands, so a price stays in pence. It is only a display hint: the value is still the exact rational, comparisons ignore it, and a number that does not terminate in base ten is shown as the fraction it is rather than rounded. Two functions override it where the default is wrong: `decimals(x, 2)` shows at least two places, and `plain(x)` drops them, which is what a place-value question wants when `0.35 * 100` should read as `35`. A number written without a point, and any fraction, is shown as a whole number or a fraction as before, so fraction lessons are unaffected.

### Text templates

A reference to an anchor can be indexed by a parameter as well as by a number: `line.tick(k)`, `frame.cell(i)` and `g.bar(n)` name the anchor that this variant's value picks, and the index is filled in before the checker and the renderer see it, so a question can point at a different place in every version.

Text can contain placeholders. `{n}` and `{a * b}` are expressions. `{heavy}` and `{light.many}` are a role's noun in the singular and plural, which also handles irregular plurals and matters for translation. `{?more}` is a blank the child fills in, bound to `answer more=(10 - n)`.

## Examples

An item with a component, two feedback rules and a hint:

```
item balance.chain v=1 skills=[multiplication.scaling] {
  title "Balance chain"
  let a=2..3 b=2..4
  where (a * b != a + b)  # 2 and 2 would hide the adding mistake
  roles heavy=cube mid=ball light=star

  scene 32x16 {
    use chain-scene heavy=heavy mid=mid light=light a=a b=b
    text ask "How many {light.many} balance 1 {heavy}?" narrate below=s1 gap=1
    number-input answer right-of=ask gap=1
  }

  answer (a * b)
  feedback {
    when (answer == a + b) point=s2.right-pan {
      say "Swap each {mid} for its {light.many}, one {mid} at a time."
    }
    when (answer == b) point=s1 {
      say "That is one {mid}. The {heavy} weighs {a} of them."
    }
  }
  hint "How many {light.many} is one {mid}?"
}
```

The component it uses:

```
define chain-scene heavy mid light a b {
  balance s1 left=[heavy] right=[mid * a] at=canvas(1, 1)
  balance s2 left=[mid] right=[light * b] right-of=s1 gap=2
}
```

An item with a blank inside the equation:

```
item bonds.make-ten v=1 skills=[bonds-to-10] {
  title "Make ten"
  let n=1..9

  scene 26x8 {
    tenframe frame count=n color=berry at=canvas(1, 1)
    equation eq "{n} + {?more} = 10" right-of=frame gap=1
  }

  answer more=(10 - n)
  feedback {
    when (more == n) point=frame {
      say "That is how many are in the frame. Count the empty squares."
    }
  }
}
```

A lesson in the teach format:

```
lesson making-ten v=1 format=teach grade=1 unit=2 {
  title "Making ten"
  goal "Find the number that makes 10 with any number from 1 to 9."

  look {
    scene 26x8 {
      tenframe frame count=7 color=berry at=canvas(1, 1)
      equation eq "7 + {?more} = 10" right-of=frame gap=1
    }
    say """
      Ten is a friendly number. Count the counters,
      then count the empty squares. Together they make ten.
      """
  }
  do {
    practice bonds.make-ten count=4 seed=3
  }
  story {
    show story.apples-to-ten n=6
  }

  grown-ups """
    If every question still needs counting, stay on this lesson another day.
    """
}
```

## Lesson formats and outputs

A lesson declares one of four formats, and the format decides which sections it usually has and how it is laid out:

| Format | Sections | Used for |
|---|---|---|
| teach | look, do, story, try, remember | introducing a skill |
| puzzles | puzzle (with stars) | thinking problems the child works alone |
| worked | example, exercises, try | a worked example in the teacher's pen, then practice |
| review | warm-up, exercises, puzzle | spaced review across earlier skills |

Each lesson renders in two outputs from the same file. On screen, sections are pages the child steps through, and an answer key can be switched on for grown-ups. In print, the lesson is laid out on 5 mm squared paper, one digit per square, question numbers in the margin, and paginated so a section heading never ends a page on its own. The goal, the notes for grown-ups, the answers, the hints and the solutions to code-checked puzzles go on a separate grown-ups sheet and never appear on the child's pages.

## Levels

Added 15 September 2026.

A lesson can hold three levels, easy, medium and hard, and the lesson as written is medium. The header lists the levels it has, as in `levels=[easy, medium, hard]`, and anything that differs by level sits inside a `level` container or in a setting that starts with a level's name, so `easy-count=2` asks for two questions at easy and leaves the count as written everywhere else. A level is resolved on the syntax tree before the checker reads the file, which means every level is checked and verified as a plain lesson, and a reader that knows nothing of levels gets medium. An item can narrow or widen a parameter's range at a level and add a `where` line, a hint or its own scene, but it cannot add a parameter, because a new parameter would rename every version the lesson as written already asks.

### The words

`level` names one or more of the three levels and holds its content between braces: `level easy { ... }`, `level easy medium { ... }`. A level cannot hold another level, and a lesson that uses a level in a container or a prefixed setting has to declare it in `levels=`; medium is always declared, since it is the file itself.

In an item a level holds `let`, `set`, `where`, `hint` and `scene`, and nothing else can change by level. A `let` or `set` inside a level names a parameter or value the item already declares and replaces its range at that level (`let n=6..9`); a `where` is added after the item's own `where` lines; a `hint` is added after the item's hints; a `scene` replaces the item's scene. The item's title, answer, checker, roles and feedback are the same at every level.

In a lesson a level holds whole blocks inside a section, or whole sections at the top of the lesson. A section whose blocks all belong to other levels is not there at that level. On a `practice`, `show` or `worked` block a setting written `easy-x=` or `hard-x=` replaces `x` at that level and is dropped at the others (`easy-count=2`, `hard-a=9`, `hard-seed=7`); `count=0` at a level removes the block; and `level=medium` on a block makes it use the item as written while the lesson is at another level, which is how an easy level works one of medium's own versions in the teacher's pen, and how a `show` whose pinned version sits outside a band the item gives that level is kept. The grown-ups line at a level is the one sentence that says what the level changes.

An item may carry `difficulty` after its title: an expression in the item's parameters that gives each version a number, larger for harder, as in `difficulty (10 - n)`. It is not shown to anyone. The verifier uses it to hold the order of the levels, below, and an item whose versions have no honest order carries no line and counts for nothing.

On the Grown-ups side the levels are called easier, as written and harder; the child never sees a level named. Each level prints as its own lesson, with the level's name and its own grown-ups line on the grown-ups sheet and nothing on the child's pages, and a level may print at most one child's sheet over the lesson as written.

### How a level resolves

Resolution happens on the syntax tree, before the registry checks the file: the root's `level` containers are read, the content for the level asked for is merged in as above, the other levels' containers and every prefixed setting are dropped, and the result is a plain item or lesson that the checker, the verifier, the renderer and the pack treat exactly as they treat a file that never mentioned levels. A file that mentions no level resolves to itself at medium. A level's hash is taken over that level's resolved canonical text (over the file itself when it has no levels, so the hash is what it always was), so the pack carries one hash per level and an edit to easy leaves medium's hash alone.

The verifier runs over every level. At an item, `let` and `set` inside a level may only name what the item declares, a `show` at a level must name a version that level allows, and the mean difficulty must rise strictly from easy to medium to hard wherever the item has bands. At a lesson, each level is measured as the mean over its questions of the version's difficulty against the item's versions as written (the item's medium mean subtracted, divided by its spread, which is at least 1), so 0 is a question as hard as the item's average version as written; the measure must rise from easy to medium to hard, a fall is an error and a rise of 0.05 or less is a warning, and the test suite holds the list of warnings, so a flat level fails it. A second test holds that the lesson as written asks the same questions after a level is added as before it, so a level never changes medium.

### Example: making ten

The pilot's grade 1 lesson, with its first item. The item gives each version a difficulty, one to nine empty squares to fill, and an easy band that keeps to the ones a child can see at a glance:

```
item bonds.make-ten v=1 skills=[bonds-to-10] {
  title "Make ten"
  difficulty (10 - n)
  let n=1..9
  level easy {
    let n=6..9  # one to four empty squares, and never n = 5, where counting the counters is also right
  }

  scene 26x8 {
    tenframe frame count=n color=berry at=canvas(1, 1)
    equation eq "{n} + {?more} = 10" right-of=frame gap=1
  }

  answer more=(10 - n)
}
```

The lesson declares its levels and changes what it asks by level without a second copy of anything:

```
lesson g1-making-ten v=1 format=teach grade=1 unit=2 subject=maths levels=[easy, medium, hard] {
  do {
    practice bonds.make-ten count=1 hard-count=0 seed=3
    practice bonds.under-the-cup count=2 seed=4
    level easy {
      worked add.bridge-ten a=8 b=5
    }
    practice add.bridge-ten count=2 seed=3
    practice add.two-frames count=1 easy-count=2 seed=4
    practice add.missing-past-ten count=1 easy-count=0 hard-count=2 seed=9
  }
  try stars=2 {
    show add.balance-sides a=7 b=5 c=8 easy-a=6 easy-b=4 easy-c=7 hard-a=9 hard-b=7 hard-c=8
  }
  try stars=3 {
    level easy medium {
      show bonds.three-cups t=10 easy-t=9
    }
    level hard {
      show bonds.two-cups-all-ways t=13
    }
  }
  level easy {
    grown-ups "At this level the first number is eight or nine, so one or two counters move across, a worked example comes before the adding, and the missing-part question is left for another day."
  }
  level hard {
    grown-ups "At this level three or four counters move across, the totals reach eighteen, and the last question asks for every pair that makes a total. A child who starts at nine and works down will not miss one."
  }
}
```

At easy the first practice block draws its one question from `n=6..9`, a worked bridge-ten example comes before the bridge-ten practice, the two frames are asked twice, the missing part is not asked, the balance is pinned at 6, 4 and 7 and the three cups at 9. At medium every level container and prefixed setting is gone and the lesson is the file as written. At hard the make-ten block is not there, the missing part is asked twice, the balance is pinned at 9, 7 and 8, and the three-star shows every pair for 13 instead of the cups. The lesson measures -0.29 at easy, -0.09 at medium and 0.30 at hard against its items as written (medium sits below 0 because its own seeds draw the plainer versions), and prints five, four and five child sheets.

## Verification

The verifier runs over every file on every change, and the build refuses content with errors.

- Before any variant is built, it checks names and references: every expression reads only parameters it may read, every role in a list or template is declared, every placement and every `point` names a node and an anchor that exist, every blank and input has an answer and every answer has somewhere to go, and every item a lesson names exists.
- It then builds every variant the parameters allow. When there are more than 10,000, it checks a seeded sample of 400 that meet the `where` lines instead.
- For each variant the answer must evaluate to a number, a balance pan may hold at most six props, a ten frame shows 0 to 10 counters, and the scene must fit its size.
- A feedback rule that is also true for the correct answer is reported, since it cannot tell that mistake apart from a right answer.
- A code checker must list at least one solution.
- A lesson's `show` and `worked` settings must name a variant the item actually allows.
- Every level of a file is verified as a plain document, and the order of the levels is held as the Levels section says.

In the prototype this caught mistakes in our own examples. A scene was 30 squares wide when its two balances needed 31. Several questions were too long for their scenes, which is what led to the `width` setting for wrapped text. It also reports the variant where 2 + 2 equals 2 × 2, which is why the balance chain has its `where` line, and the variant `n = 5` in "make ten", where counting what is in the frame gives the right answer by accident.

## Costs and risks

A notation of our own has no ecosystem. We write and maintain the parser, the formatter, the editor highlighting and later a language server ourselves. The generic syntax keeps these small, since none of them know about individual node types.

Some teachers may prefer forms to text. The studio's forms, generated from the registry, would then be their main surface, and the text serves reviewers, diffs, experienced authors and AI.

Changing a node type's settings changes what existing files mean. Because the syntax tree is generic, such a change can ship with a migration that rewrites affected files mechanically, and the hash of the canonical text tells us which content changed.

## Open questions

- How translations are stored: alongside the text in the same file, or in separate files keyed by node path.
- How node types are versioned, and how a file pins the version of the vocabulary it was written against.
- When to build editor support: syntax highlighting first, then a language server that reuses the parser.
- How lesson flow reacts to the child, for example moving to an easier item after two misses, and whether that belongs in the lesson file or in the scheduler.

## Prototype

The prototype lives in `scratchpad/`:

- `src/lang/`: the syntax (`syntax.ts`), expressions (`expr.ts`, `rational.ts`), text templates, the registry, the checker and typed documents, instantiation, layout, the verifier, code checkers, the workspace that links files, and the scene and lesson renderers.
- `content/`: eleven items, one component and four lessons, one in each format.
- `lessons.html`: each lesson on screen or in print.
- `lang.html`: an editor for every content file, with live checks, previews and the syntax tree.
- `npm test` covers the expression language, the syntax round trip, the checks and the verification of all content.

References: [WeBWorK PGML](https://wiki.openwebwork.org/wiki/Introduction_to_PGML), [STACK potential response trees](https://docs.stack-assessment.org/en/Authoring/Potential_response_trees/), [Numbas marking algorithms](https://docs.numbas.org.uk/en/latest/marking-algorithm.html), [Penrose](https://www.cs.cmu.edu/~jssunshi/assets/pdf/penrose.pdf), [D2](https://d2lang.com/), [KDL](https://kdl.dev/spec/), [Markdoc](https://markdoc.dev/docs/overview), and LlamaTrade's `.docs/strategy-dsl.md`.
