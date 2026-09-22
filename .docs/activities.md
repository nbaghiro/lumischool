# Activities

Status: proposed, September 2026, with three activities prototyped in `scratchpad/play.html` and their model in `scratchpad/src/play/`. It answers a question [product.md](product.md) leaves open. The owner wants mini games built from our characters and items that are genuinely fun, and wants parents, and in a bounded form children, to make their own with AI. The same document rules out points and streaks a child works for instead of working for the maths, rewards that gate the next lesson, and a hidden algorithm choosing what a child sees. This says how all of that holds at once.

The centre of the document is that an activity is declared rather than coded: a mechanic is a small piece of kernel code that says what it can be filled with, and an activity is data that fills it. Everything else follows from that, including whether a model can write one and whether we can promise a child it is playable.

## The distinction the whole document rests on

A game built around a worksheet and a game whose moves are the mathematics look similar in a screenshot and are not the same product. Filling a ten frame against the clock is a worksheet with a timer: the maths is a toll the child pays to get the next round, and the thing they get better at is paying tolls faster. Balancing a scale by choosing what to put in a pan is a game whose moves are the mathematics: there is no arithmetic step separate from the move, and a child who plays it well has understood equivalence, because nothing else would let them play it well.

The practical test when we are unsure: take the drawing away, replace it with a text box, and ask whether the activity still exists. A worksheet with a timer survives that, because the drawing was decoration. Balancing pans does not, because the pans were the question.

The corollary is that scoring is not needed and not wanted. In an activity of this kind, winning is the feedback, the board shows how far off the child is at every moment, and a number on top of that would only tell them something the board already told them. We keep the small rewards [product.md](product.md) allows, the stickers and the rosette already on the shelf, and they mark that a thing was finished rather than how well.

## What an activity is

An activity is a third kind of content, beside a question and a lesson.

A question is one scene, one answer and the feedback for the mistakes we expect. It is proved correct once, it is the same for every child who gets that version, and it prints.

A lesson is a short file that names the questions it wants, in one of four formats, and lays them out for screen and for paper.

An activity is a starting position, a declared set of legal moves, and a condition that says it is won. It has parameters the way a question has parameters, so one activity is hundreds of versions. It is proved playable rather than proved correct, it differs between two children because they move differently, and it does not print.

Three sentences that separate them: a question asks the child to say something, a lesson decides what to ask today, an activity asks the child to do something and lets the board answer.

## Declared, not coded

There were two ways to build this and they are not close.

An activity could be a code module with a configuration file. Every activity is then bespoke: an author cannot write one, a model certainly cannot, nothing about it is checkable, and the promise below is a comment rather than a gate. We have already seen in the small what that costs, when nine drawings added in one sitting could not be tested and two of them were wrong, which is why drawings now target a surface rather than building elements directly.

Or the notation could grow a general rule language that can express any game. That is a programming language with state and loops, inside a file format we chose partly because nothing in a file can execute code, and it makes the search the prover has to do unbounded.

We take neither, and use the shape that already works for drawings. A part declares its settings, its anchors, its box and its capacity in one file, plus a draw function, and content only configures it; nobody writes drawing code in a `.lumi` file, and there are around two hundred parts because each one is small. Mechanics work the same way. A mechanic is a small module in the kernel that declares what it can be filled with and implements six functions over a position. An activity is data that names a mechanic and fills it in, with parameters and ranges like any question.

The requirement that a parent can ask for a game and get one settles this rather than merely favouring it. Generation of the coded form means generating code, and we are not going to ship generated code to a child's machine, or review it, or promise anything about it. Generation of the declared form is the loop we already run for questions: a model writes the text, the gate proves it, the errors come back with a line and a column, and a person previews and accepts. Nothing new has to be invented for the model, and the guardrail is the same gate that already stands between an author and a child.

What we give up is that an activity needing a mechanic we do not have cannot be written, and the answer is to write the mechanic or drop the activity. A mechanic is a deliberate, reviewed piece of kernel work with tests, roughly a week rather than an afternoon, which is the right price for something that changes what the product can promise. The set stays small, ten to fifteen, because a mechanic is a kind of play rather than a kind of picture, and most new activities turn out to be new fills of one we have.

## What a mechanic declares

Two halves, and the split matters because only the first half is ever shown to an author or a model.

The first half is the contract, and it is data. It says which drawings the mechanic puts on the board, what slots an activity fills and which pieces each slot accepts, how many pieces a slot takes, and what settings it has with the kind and range of each. The checker reads it to reject a bad fill, the studio generates a form from it, and a generator is given it as the description of what it may write. In the prototype it looks like this, for `weigh`:

```
mechanic weigh {
  doc "Put a thing in a pan or take one out, until the beam is level."
  reversible
  draws [balance]
  slot fixed from=[prop.cube, prop.ball, prop.star, prop.apple] count=1..3
    doc "What is already in the left pan, and not the child's to move."
  slot tray from=[prop.cube, prop.ball, prop.star, prop.apple] count=1..3
    doc "What the child has to work with. Two kinds is enough at grade one."
  setting pans  kind=pick    values=[right, both]
  setting worth kind=numbers range=1..20
  setting count kind=numbers range=1..9
}
```

The second half is the code, and nobody outside the kernel sees it: a position type, a move type, and the functions the prover and the runtime need. There are six, and the interface is deliberately small enough that a mechanic cannot quietly grow a way to surprise us.

| Function | What it gives back |
|---|---|
| `moves(position)` | the legal moves here, in a fixed order |
| `apply(position, move)` | the position that move leads to, as a new value |
| `won(position)` | whether this position is won |
| `board(position)` | the drawings to put on the board and the parameters for each |
| `say(position)`, `sayMove(move)` | the position and one move in words |
| `accepts(fill)` | what is wrong with this fill, in sentences |

`apply` returning a new value rather than changing the one it was given is a rule and not a detail: it is what makes undo free, what makes a move log enough to rebuild every position in an attempt, and what lets the prover walk the graph without copying anything.

`accepts` is the part worth arguing about, because it is where a generated activity is caught. A fill can be legal against the contract and still be nonsense: a balance whose left pan weighs forty when nothing in the tray can reach it, a number line whose flag is not on the line, a set of rule cards where two read the same so naming one is ambiguous. Each of those would search cleanly and come out unwinnable, and "no sequence of legal moves reaches a win" is not much use to whoever wrote it. So the mechanic says which part of the fill is wrong, in a sentence, and that sentence is what goes back to the model or the parent. The prototype's three mechanics carry twenty of these between them.

## What an activity declares

One file, and all of it data. This is the form a model writes, a studio form edits and a reviewer reads:

```
activity weigh.exchange v=1 kind=weigh skills=[equivalence] grade=2 {
  title "Balance the pans"
  goal "Make the beam level."
  let a=2..4 b=2..3
  where (a != b)
  pieces fixed=[cube] tray=[ball, star]
  set pans=right
  set worth=[cube=(a * b), ball=b, star=1]
  set count=[ball=4, star=2]
  promise solution=2..4 patience=2.5 branch=8 positions=20000
  paper balance.chain
}
```

Eight things are in there and none of them needs a change to the syntax.

`kind` names the mechanic. `let` and `where` are exactly what an item has today, so one activity is many versions and the ranges are checked the same way. `pieces` fills the mechanic's slots with part ids. `set` gives the mechanic's settings, and a setting may be an expression over the parameters, which is what makes `worth=(a * b)` a family of activities rather than one. `promise` carries the bounds the prover checks. `paper` names the companion a family prints instead, which the paper section below is about.

`answer` and `check` do not appear. An activity has no answer, and that is exactly where the current core stops.

Only one registry change has any weight: a mechanic's settings have to come from the mechanic's own declaration, the way a part's settings come from the part's declaration, so the checker, the studio's forms, the prover and a generator all read one source. That is the same discipline `check:parts` already guards for drawings.

One small piece of wording is unsettled. `patience=2.5` reads as an exact value and means "at least". Writing `patience>=2.5` would read correctly and needs a comparison in the value grammar; `patience-min=2.5` needs nothing at all and is uglier. We should probably take the ugly one.

## The art catalogue is the palette and the boundary

A slot lists the part ids it accepts, and every one of those has to be a drawing that exists. That single rule does three things.

A generated activity composes art that has already been drawn, so it looks like the product. There are around two hundred parts across twenty-eight categories, every one of them already through `check:art`, and a model choosing among them cannot produce something off-style, because it is not producing style at all.

A generator cannot ask for art nobody has drawn. A part id that is not in the catalogue is a checker error with a line and a column, like any other unknown name, and the repair loop handles it.

And a slot can be narrower than the catalogue. `weigh` accepts four props in a pan, not two hundred, because a balance pan holds things a child can count and a pizza is not one of them. The narrowing is the mechanic's judgement, written down once, rather than a rule a generator has to be trusted to follow.

Where a mechanic could sensibly take a whole family, the slot should name the family rather than listing its members, so a new drawing in that family becomes available to every activity that uses it without any activity changing. That needs the catalogue's groups to be addressable from a slot, which is one line in the parts index and is worth doing before the fourth mechanic.

## What the verifier checks

Two stages, and they fail differently on purpose. The first says the activity was written wrongly. The second says one of its versions plays badly.

The first stage runs before anything is built: names and references as the checker already does them, then the fill against the contract (every piece is a part the slot accepts, every slot's count is in range, every setting is of the right kind and in range, every setting the mechanic needs is present), then `accepts` for the things the contract cannot say.

The second stage is the prover, and it is a search. For each version the parameters allow, or a seeded sample when there are more than ten thousand, it walks the position graph from the start: ask the mechanic for the legal moves, apply each, key the position so repeats collapse, and stop at the declared cap. Then three passes over what it found. A reverse search from the won positions gives the distance to a win for every position, which settles the first clause and finds the dead ends. A dynamic program over position and moves remaining gives the exact chance that random legal play wins, which settles the third. The counts settle the fourth.

The distance to a win is worth as much as the proof. It is what lets the guide point at a useful move when a child has not moved for twenty seconds, and what lets the evidence say a child gave up two moves from the end rather than saying they gave up. It is computed once per version at build time, not in front of the child.

### The activity promise

This wording is the contract. Anything that generates or edits an activity can quote it to a parent, and anything that accepts one has to have seen it pass.

> **It can be won.** At least one sequence of legal moves from the starting position reaches a won position, in no more moves than the activity declares.
>
> **It has no dead ends.** From every position the child can reach, a won position is still reachable. Each mechanic meets this one of two ways and says which: either every move can be taken back, so a child can always retreat, or its moves are spent and the prover has to show that no sequence of legal moves can put a win out of reach. A position with no moves left is the end of the round rather than a dead end, and that is allowed.
>
> **It cannot be won by accident.** Where moves are spent, the chance that uniformly random legal play wins is under the declared threshold. Where moves can be taken back, random play arrives in the end and what must hold instead is that thinking is faster: the number of random moves it takes to win half the time must be at least the declared multiple of the shortest win.
>
> **Its difficulty is bounded.** The shortest win falls inside a declared band, no position offers more choices than the declared cap, and the search stayed inside the declared number of positions.
>
> **It can be read.** Every position has a text form, so it can be read aloud or by a screen reader, and the goal says in one sentence what winning means.

Random play is a weak model of a five-year-old poking at a screen, so the third clause is an upper bound on luck rather than a measurement of it, and we should say so rather than quoting it as though it were one.

Two other honest limits. The proof is about the declared move set, so if the code a child plays offers a move the declaration does not list, the proof is about a different game; the runtime may only offer moves the mechanic generates, and a test asserts that the page's controls come from `moves(position)` rather than a second list written by hand. And the prover says nothing about whether an activity is fun or whether it teaches the skill it claims. Those stay human judgements, which is why a generated activity is previewed and accepted by a person rather than published by the gate.

### The clause we got wrong first

The third clause started as one number, the chance that random play wins, and the prototype's first balance activity failed it at sixty per cent. The reason is worth keeping: a child stacking one-unit weights into a pan passes through every total on the way up, so if the target is reachable at all, aimless stacking reaches it. Tightening the activity until random play failed would have meant removing the small weights, which is removing the part a five-year-old can actually do.

So the clause splits by family, as written above. A mechanic whose moves are spent gets the chance of a win, because one shot is all there is. A mechanic whose moves can be taken back gets the ratio instead: random play wins in ten moves where thinking wins in three, so the activity is asking for something, and a child who fiddles still gets there, which is what a balance toy is for. The prover reports both numbers either way and gates on the one that applies.

### What it measured

The three prototyped activities, from the prover in `scratchpad/src/play/prove.ts`:

| Activity | Version | Positions | Shortest win | Ways to win | Dead ends | Ends without a win | Most choices | Random play wins | Aimless play |
|---|---|---|---|---|---|---|---|---|---|
| weigh | one pan | 15 | 3 | 2 | 0 | 0 | 4 | 60.1% in 12 | in 10, 3.3 times |
| weigh | either pan | 134 | 3 | 5 | 0 | 0 | 8 | 13.5% in 12 | not half the time |
| jump | 0 to 20 | 31 | 3 | 1 | 22 | 1 | 4 | 12.5% in 5 | not half the time |
| jump | -10 to 10 | 32 | 3 | 2 | 11 | 1 | 5 | 30.0% in 5 | not half the time |
| rule | each of nine | 151 | 2 | 15 | 0 | 120 | 12 | 11.1% | not applicable |

Two of these numbers are the interesting ones. The jump activity has twenty-two dead ends, which sounds alarming and is the mechanic working: overshooting the flag with no card left to come back is the mistake the activity is about, and because a move can be taken back it is a lesson rather than a wall. The rule activity has a shortest win of two moves, which the move graph reports because naming a card is always a legal move; the graph cannot tell a worked-out answer from a lucky guess, which is why that mechanic carries a check of its own, described next.

### Checks the graph cannot see

A mechanic may declare an audit over the version, reported by the prover beside its own findings. One mechanic needs it and the need is general.

For `rule`, the graph thinks every position is one move from a win, because naming a card is legal from anywhere. The clause we actually want is that the rule can be worked out: after any set of numbers the child has fed in, the numbers still in hand must be able to narrow the nine cards to one. That is a search over consistent cards rather than over positions, so it belongs to the mechanic, and the prototype runs it over all sixteen sets of feeds for all nine versions.

Any mechanic with hidden information will want the same hook, which is a reason to expect it rather than to treat `rule` as a special case.

## Which of the first ten can be declared

The set we would build, with the mechanic each rests on. The move column is the important one: in every row, making the move is the mathematics.

| Activity | Mechanic | One move | Won when | The art it fills with | Grades |
|---|---|---|---|---|---|
| Balance the pans | weigh | Put a thing in a pan, or take one out | The beam is level | balance, props, mass set | 1 to 4 |
| Land on the number | jump | Play one jump card onto the line | You land exactly on the flag | numberline, washing line | 1 to 4 |
| Find the rule | rule | Feed a number in, or name the rule | You name the rule it is using | machine, in-out table | 3 and 4 |
| Make the amount | pay | Take a coin out of the drawer, or put one back | The counter comes to the price | till drawer, price tag, purse, coin row | 1 to 4 |
| Write the program | program | Add an instruction, remove the last, or run it | The robot ends on the parcel | robot grid, map grid | 1 to 4 |
| Fill the pyramid | stack | Take a number from the tray and put it in a brick | Every brick is the two under it added | number pyramid, dominoes | 2 to 4 |
| Make it fair | spin | Colour one section, or clear it | Red comes up as often as the card asks | spinner, probability scale, counter bag | 2 to 4 |
| Right hoop | sort | Move a thing into a hoop, or out of both | Everything is where it belongs | sorting rings, Venn, Carroll, minibeasts | 1 to 3 |
| Share it out | cut | Choose where to cut, then give a piece to a plate | Everyone has the same amount | pizza, chocolate bar, plates, fraction wall | 1 to 3 |
| Fill the outline | build | Place a piece, turn it, or take it back | The outline is covered with no gaps | pattern blocks, tangram, geoboard | 1 to 4 |

Seven of the ten declare with nothing new. weigh, jump and rule are built and their contracts are in the prototype. pay is weigh with coins and a price, so it reuses most of it. program, stack and spin are numbers and a grid, and the spinner drawing already takes its sections as data.

Two need one named addition each, and it is the same kind of addition. `sort` has to know which hoop a thing belongs in, and "round" and "red" are properties of the drawing rather than of the activity, so a part needs declared attributes: a ball is round and red, a star is yellow and pointed. `cut` has to know how a given drawing can be divided, so a part needs to declare its divisibility: a pizza into sixths, a chocolate bar as four by three. Both are one field on a part declaration, both are checkable by `check:parts`, and both make the activity declarable instead of hard-coding a table of facts about art inside a mechanic. They are worth doing, and neither is first.

One resists declaration, and by the rule the owner set that is a reason not to build it first. `build` means covering an outline with pattern blocks or tangram pieces. Deciding whether a placement is legal and whether the outline is covered needs each piece's polygon, its allowed rotations and reflections, and a covering test. A part today declares a box, anchors and a capacity, not a shape, so making `build` declarative means giving parts a geometry, which is a large change to the thing the whole product's drawing rests on. It is also the mechanic where a generated fill would be hardest to prove, since the search is over placements in a plane rather than over counts. We should leave `build` until parts have geometry for some other reason, and not treat it as the tenth of ten.

Four we deliberately did not include. Anything timed. Anything where one child races another. Anything where a wrong move costs a life, because a life is a currency. And a memory game, which is a real game and is not mathematics, however many of our drawings it would use.

## Generation, and where the child's line sits

The surfaces belong to the work on AI in the product. What belongs here is what those surfaces are allowed to produce.

For a parent, generation is the full loop. They ask in words, a model is given the mechanic contracts, the palette each slot accepts and a few example activities, it writes an activity declaration, the gate runs both stages, and the parent previews the result and accepts or discards it. The model never sees a mechanic's code and never writes any. A failed gate goes back as sentences with a line and a column, which is the loop that already repairs questions. What the parent sees on accept should include the proof numbers, because "the shortest way to win is three moves and it cannot be won by luck more than one time in eight" is a thing a parent can judge, and "generated successfully" is not.

For a child, we agree with the owner's reading and would put the line in a specific place, for a reason that is not taste.

A child does not prompt a model, and the decisive argument is one we already enforce in the repository rather than a view about what is age-appropriate. `apps/kids` loads nothing from outside hosts and carries no third-party code, checked by `check:privacy`, so a child's build cannot call a model at all. Any free-text surface for a child would either break that guard or move the child onto the parent's build, and both are worse than not having it.

What a child gets instead is a builder made of choices, and it is not generation. It exposes part of an activity's declaration as picks: which character is in it, which objects it counts, how many of them, what the target is. Every combination of those picks is a version, and the build proves every one of them, so a child's choice cannot produce an unplayable game. That is the whole reason to draw the line there rather than somewhere else: the picks are safe because they were proved, and a prompt could not be.

This puts a real constraint on the builder's design, and it should be written down before anyone builds one. The picks multiply, so a builder offering four choices of five options each is six hundred and twenty five versions to prove, and the prover's cost per version is a search rather than an evaluation. A child builder therefore declares its picks in the activity, the build proves the cross product, and a builder whose cross product is over the cap has to offer fewer picks. We would rather a child chose between three things that certainly work than five things we sampled.

One thing we should not do, and it is tempting: let a child's picks reach beyond one activity, so they could choose the mechanic as well as the pieces. That turns the builder into a game maker, which is a different product, and it is the surface most likely to become the thing the child works for instead of the maths.

## Paper

The product's strongest constraint is that what is on screen is what prints, and an activity breaks it. There is no honest way to print a game whose moves are the mathematics, because the moves are what makes it one, and a printed board with the moves described in a caption is a worse worksheet than the worksheet we would have written instead.

So we say it plainly: activities are screen only, and they are outside the printable set. A week's print pack never contains one. The guard is the same shape as `check:print`: the paginator never sees an activity, and an activity named inside a printed lesson section is a build error rather than a blank page.

That would be a cheap answer on its own, because it would mean a family with a flat tablet loses part of the day. So every activity names a paper companion, and the companion is a different thing rather than a worse one. Three cases, from the three we built.

Some mechanics have a paper sibling that is already a question we write. The balance is the clearest: on screen the child makes the beam level by moving things, and on paper they read a balance that is already drawn and write how many light things balance one heavy one. Those are different tasks on the same skill, one solved by doing and one solved in the head, and the paper one is an item that exists anyway.

Some have a sibling that is the record rather than the play. The function machine on screen is the child choosing which number to feed in; on paper it is the in and out table with the rule hidden and two outputs missing, which is the `inout` drawing we already have. The screen version teaches choosing an informative test, the paper version teaches reading a rule off evidence someone else gathered, and we should be clear with ourselves that these are two skills and only the first is the game.

Some have no sibling worth printing, and then the companion is a short set of ordinary questions on the same skill. `paper=none` is not allowed, because we would rather print something plainer than let the day have a hole in it.

One consequence to accept: an activity cannot be the only place a skill is taught, since then the skill would not be printable. Activities carry skills the lessons also carry. That limits how load bearing an activity can be in the curriculum, and it is the right trade, because the printable year is the promise we sell.

## Where an activity lives

Inside a lesson, and beside it on the map, and nowhere else at first.

Inside a lesson, an activity is one block in the `try` section of a teach lesson or in the `puzzle` section of a puzzle sheet. That is the natural place: the child has met the idea in `look`, worked it in `do`, and `try` is where the lesson already puts the question that is harder than it needs to be. A lesson names at most one activity, because two would make the lesson long and would blur which skill the activity is evidence about.

On the map, the same activity is a small node hanging off its lesson, on a side path, so a child can reach it without going through the lesson and so it blocks nothing. Side paths that block nothing already exist in the year plan, so this costs a node type rather than a mechanism.

The third place, a room of its own that a child goes to, is what we are most careful about. A place whose purpose is playing is what turns into the thing the child works for, and it is one step from there to a currency. We will build one anyway, late, and keep it deliberately dull: a workshop that lists the activities whose lessons the child has reached, in map order, with no scores, no ordering of its own and no badges. It exists so a child who liked balancing pans on Tuesday can balance pans on Saturday, the parent can hide it, and nothing else depends on it. Activities a parent generated appear there too, in a section of their own, so a child can tell which ones came from home.

What a parent sees and controls, in the week view they already have: the activity in the day it belongs to with the minutes we expect, a switch that turns it off for that week or for good, the evidence below, the version band, which is the one difficulty control and is visible rather than inferred, and for a generated activity the proof it passed and a way to delete it. There is nothing to configure about rewards, because there are none.

## Playing one

How a child gets to one. From the end of the lesson, as one card in the `try` section with the guide beside it, or from the map's side node, or later from the workshop. Never from a notification, and never because they did well.

Reading load. The goal is one sentence at the reading level of the grade, and it is the only text on the board. Everything else is in the picture: what is in the tray, what is in the pans, how far the beam is off level. A child who cannot read the sentence can be told it once and then play, which is the test at grade one, and the text form that exists for the screen reader is the same sentence, so an adult reading aloud reads what is on the screen. The version's parameters are never on the child's board: for two of the three we built they are the answer.

Motor demands. Every move is a tap on a target of at least forty four device pixels, and no mechanic may require a drag, a double tap, a long press or a gesture. Two taps, the thing and then the place, is the pattern, and it works with a mouse, a finger and a keyboard without a second code path.

Keyboard. Every move in every mechanic is picking one of a small list, so the whole set is keyboard playable: arrow keys move between the moves on offer, enter plays one, backspace takes a move back where the mechanic allows it. We should refuse a mechanic that would need more than this.

Motion. Nothing in an activity may need motion to be read. The beam's tilt, the jumps drawn above the line and the table of numbers fed in are all in the drawing, so `prefers-reduced-motion` turns the movement off and loses nothing. A mechanic that cannot meet this, and a spinner being spun is the candidate, degrades to showing its result as a list rather than as an animation.

Length. One round is one to three minutes and it is a version rather than a level. When it is won, the activity offers another version of the same activity and says which one, and the child can stop. Nothing accumulates across rounds, and closing the page mid-round loses only the round.

Losing. No losing position blocks anything. A mechanic whose budget runs out shows the board as it stands, the guide in the retry pose, and two ways on: take the last move back, or start this version again. Nothing is taken away, because there is nothing to take away.

Stuck. After about twenty seconds with no move, the guide points at one legal move that reduces the distance to a win, using distances the prover already computed. It points, it does not move. After a second wait it says the move in words. This is the one place the activity acts on its own, and it is not the hidden adaptation [product.md](product.md) rules out: it changes nothing about what the child is doing, it is the same help a parent sitting beside them would give, and it is the same in every version.

After two failed attempts at a version, the third offers an easier version of the same activity, one fewer object or a smaller range, and says on screen that it is an easier one. A difficulty change a child can read is a different thing from a hidden algorithm choosing what they see, and saying it out loud is the whole difference. The parent sees that it happened.

## Evidence

An activity is a better source than a question, because a question records one answer and an activity records the approach.

One attempt is one record: the activity, the version, the seed for any run time randomness, when it started, the ordered moves with the gap in seconds before each, and how it ended (won, gave up, ran out of moves). The move log plus a pure `apply` rebuilds every position, so we store moves and not positions, which keeps the record small and makes a replay exact. The log is capped at a fixed number of moves per attempt so a child idly tapping cannot fill a disk, and the cap is recorded when it is hit.

Five things from that are worth showing a parent, and they are why the record has this shape. How far from a win they were when they stopped, in moves, which is the one thing an activity gives that a question cannot. Whether the moves got closer or wandered, which separates a child who is working from a child who is poking. How long the first move took, which is the thinking before anything was tried. How many times they took a move back, which is not a bad sign and is often the best one. And for a hidden-information mechanic, whether the numbers they chose to feed in actually narrowed the possibilities, which is a measure of the skill the activity is about.

What we do not record: nothing beyond the attempt, no per-child model, no comparison between families, no score. The evidence is the family's, it stays local until accounts exist, and a parent can delete an attempt or all of them. The skill graph reads the outcome the way it reads a question, as evidence about a skill rather than a score for a page, and an activity's evidence is weaker than a question's on purpose: a child who balanced the pans has shown something real and has not shown it as precisely as a child who wrote the right number.

## The contract with the AI surfaces

The work on generating and editing activities owns how a parent asks, what the model sees, the preview and accept flow and the guardrails. This document owns the activity model. The interface between them is four things, and they are all above rather than restated here.

The activity declaration, in the section "What an activity declares". That is the only artefact a generator produces. It produces no code and no drawings.

The mechanic contract, in the section "What a mechanic declares". That is what a generator is given, per mechanic, as the description of what it may write. It is data on the mechanic, so the prompt is built from the same source the checker and the studio's forms read, and it cannot drift from them.

The palette, in the section "The art catalogue is the palette and the boundary". A slot's list of accepted part ids is the closed set a generator chooses from, and the catalogue's one-line description and box size for each is what it should be shown alongside the id.

The promise, quoted verbatim in the section "The activity promise". That is the wording a surface may show a parent, and the five clauses are what passing the gate means. The gate returns the checker's existing `Issue` shape, with a line, a column and a sentence, so the repair loop is the one that already exists.

Two requests on the surfaces, which we do not own but which the model above assumes. A generated activity is accepted by a person and never published by the gate alone, because the gate cannot tell whether an activity is fun or whether it teaches its skill. And a generated activity is stored as the same text an author would have written, with the hash of its canonical form, so it is reviewable, diffable and repairable like everything else.

## Order of work

1. The core changes, in this order: a position in the scene, a win condition as a predicate, the mechanic contract in the registry, the prover. Nothing else can start honestly before the prover exists, because everything else would be unverified.
2. Three mechanics: weigh, jump and rule. They are the three shapes, and building them together is how we found out whether the interface was right before there were ten of them to change. This step is done in the prototype.
3. The `activity` node type and the checker changes, so the three are written rather than configured in code, and so a model can write the fourth. This is the step that makes everything in the generation section possible, and it should not slip behind more mechanics.
4. Lesson integration: the block in `try` and in `puzzle`, the paper companion setting, and the guard that keeps activities out of the print path.
5. The runtime: the move log, undo, the stuck nudge, the easier version after two failures, and the evidence record.
6. `pay`, `program` and `stack`, which need nothing new, to test whether a mechanic really is cheaper the second time.
7. Attributes and divisibility on parts, then `sort` and `cut`.
8. The map side node, the parent's week controls, and the child's builder of picks.
9. The workshop, last and dull, and only if the rest is in use.

`build` is not in the list. It waits for parts to have geometry.

## Open questions

Whether the position cap belongs to the activity or to the mechanic. An author setting a cap of twenty thousand is setting a number they have no way to reason about, which argues for the mechanic owning it and the activity only being told when it is exceeded. A generated activity makes this sharper, since a model has even less basis for the number.

How the prover's cost behaves on the build. A question's verification is cheap because a version is checked once; an activity's version needs a search, and ten activities with a thousand versions each is a different order of cost. A child's builder of picks multiplies it again. The likely answer is a seeded sample per change with the full set nightly, but we have not measured it.

Whether the cap on choices should count moves or choices. The rule mechanic offers twelve moves in one position, which reads as two choices on screen because the nine rule cards are one grid and the three numbers are another, and a cap that counts moves calls that twelve. Counting groups instead would describe what a child sees, and it would let a mechanic hide a wide choice behind a narrow one, which is the thing the cap exists to prevent.

Whether an activity can teach something no question teaches. Choosing an informative test in the rule mechanic is the candidate: we do not know how to ask that as a question, and if it turns out to be real, activities carry a skill of their own and the paper companion argument gets harder.

## The core changes this needs

The subjects study found that anything happening over time cannot be expressed today, and it is right. Seven things, in the order they block work.

A scene that is a function of a position and not only of parameters. `instantiate(scene, env)` is pure in the parameters, which is correct for a question, whose scene is fixed the moment the version is chosen. An activity's scene changes with every move. The smallest change is a second environment, `instantiate(scene, env, position)`, with the registry declaring which of a node's settings a position may write. Nothing about layout or drawing changes, because a position only ever supplies values a parameter could have supplied.

An answer that is a predicate rather than a number. Today a question's answer must evaluate to a number unless its node offers options, which [product.md](product.md) already names as the next piece of core work and which the grade four study reached independently. An activity is the third witness, and fixing it here fixes the life cycle that had to become four numbered boxes and the spelling that had to become a one item multiple choice.

A declared, enumerable move set. This cannot live in the expression language, which has no loops and should not gain any. It belongs in the mechanic beside the position type, and it is what makes the prover possible at all.

A prover that searches a graph rather than enumerating a cross product. `variantsOf` walks the product of the parameter domains, which is the right shape for a question and the wrong one for an activity. The activity prover is a bounded breadth first search per version with a visited set and a declared cap, and its cost is versions multiplied by positions, so the cap is what keeps the build honest.

Randomness at run time, recorded. Everything today is seeded from the version, which is what makes a drawing reproducible on screen, on paper and in a replay. A spinner a child spins needs a source that is not the version. The shape is a seeded stream per attempt with the seed stored in the attempt, so a replay reproduces the spin and the evidence stays a record rather than a guess.

Undo, which a pure `apply` plus the move log gives for nothing, provided positions are values and no mechanic changes one. That is a rule for the interface rather than a feature, and it is worth stating because the first mechanic written in a hurry will change one.

Time, which we are deliberately not adding. The only thing needing a clock is the nudge after twenty seconds, and that is a runtime policy in `features/play` rather than content. A duration in a notation file is the first line of the timed worksheet we rejected, so the notation should stay unable to express one. Sound is still missing, as [product.md](product.md) says, and none of these ten activities needs it.

## The prototype

`scratchpad/play.html` plays three activities, and `scratchpad/src/play/` holds the model as tested code with no DOM in it.

- `types.ts`: the mechanic interface, the contract, and the façade the prover and the page both work on, so neither carries a mechanic's type parameters.
- `prove.ts`: the search, the distances, the exact chance of random play winning, and the report.
- `weigh.ts`, `jump.ts`, `rule.ts`: the three mechanics, each with its contract and its refusals.
- `log.ts`: the attempt record and what a parent is shown from it.
- `activities.ts`: the three activities as data, which is what an authored file would produce.

The page shows the board through the real renderer with the real art, the moves as the mechanic groups them, the proof for the version being played, the record as it is being written, and the mechanic's contract. A move log can be replayed into a round from the address, which is the same mechanism the evidence would use. The one thing it does not do is read the activities from notation, because `src/lang/` belongs to other work; that is step three above and it is the step everything in the generation section waits on.
