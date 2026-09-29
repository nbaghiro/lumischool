# Coding

For the current root-versus-prototype inventory and implementation order, see
[Coding interaction migration](coding-migration.md) and its [item inventory](coding-migration-items.csv).
The historical implementation notes below describe the prototype; they are not a current parity report.

Status: built in the scratchpad, September 2026. This document covers the coding track: what was
thin about its first fifteen lessons, what current practice asks of coding between five and ten,
the principles the track now follows, the program model and the one interpreter that every drawing,
checker and runner shares, the eighteen building blocks with their screen and paper forms, how a
child's program becomes an answer, the scope and sequence across grades one to four, and the order
to build the rest in. It replaces the coding section of [tracks.md](tracks.md), which now points
here.

Built: a program model and interpreter in `engine/coding.ts` (moved from the scratchpad on 16 September 2026), a prover for build
tasks in `solve.ts`, two checkers in `prove.ts`, a runner, a block editor and the lesson page's
wiring in `runner.ts`, `editor.ts` and `lesson.ts`, and seventeen drawings in
`scratchpad/src/art/coding.ts`, fifteen of them new and two rebuilt. The fifteen coding lessons were
rewritten on the new blocks and sixteen new lessons were added, thirty one in all, on fifty nine
items. One answer kind, `program`, was added to `engine/answer.ts`.

## What was thin

The first fifteen lessons were a worksheet about programs rather than a place to program. Every
one of the twenty four items asked the child to read a program and name a number or pick an option,
and none asked them to write, arrange or change one; the one lesson that collected a written
program gave it to a grown-up to mark. On screen nothing ran. The lesson page drew the same picture
the printer drew, with empty boxes where the answers go, so a child on a tablet could look at a
program but could not press anything to see what it did.

The track also left out most of what the subject is. There were sequences, repeats, one nested
repeat, one decision about a number and one variable. There were no events, no conditions on what a
robot senses, no named blocks of one's own, no algorithms beyond putting steps in order, nothing on
data, binary, sorting or searching, and nothing a child could make that looked like anything: no
drawing of their own, no picture, no dance and no tune. "Turning as well as moving", the lesson that
should have introduced a robot's heading, used only up, down, left and right; no lesson anywhere
used forward or turn.

Underneath, the pieces did not agree with each other. A program was drawn in two unrelated ways, as
a numbered listing whose repeat was a separate bracket setting and as a strip of move cards under a
robot grid, and a third drawing, the turtle, walked a list of moves that could not repeat. The look
scene of the first lesson called the turtle a robot. The answer to "where does the robot stop" was
arithmetic the author wrote, `col=(1 + a + c)`, and nothing connected it to the program drawn beside
it: the listing and the grid each carried their own copy of the program, and the verifier checked
neither against the answer or against each other. A decision had its threshold fixed at 6 because
the number line's own setting shared a name with the notation's placement key.

The paper form was sound: a numbered grid, a program and boxes to write in, which is what a child
can do with a pencil. On screen the same pages were shown with nothing to press.

## What current practice asks

We read the current frameworks and the research on teaching programming to young children, listed
under Sources below. The research was done by fetching known documents directly rather than by
searching, so the reading is limited to what we knew to look for; where only an abstract was read,
the source list says so.

The frameworks agree on the order. The 2026 CSTA standards, which replace the 2017 grade bands with
a standard for each grade, start kindergarten on creating "a sequence of commands to solve a
problem or express an idea" and on finding the step that "does not work as expected". Grade one adds
explaining code with an event and a sequence, grade two adds iteration and fixing "a loop repeating
too few or too many times", with the example of a program that draws three sides of a square
instead of four. Conditions arrive at grade three, and variables build slowly: naming values that
change at grade one, identifying them in a program at grade three and tracing them at grade four.
Procedures are excluded until middle school, and nested iteration beyond one level is excluded
through grade five. The 2017 standards (1A-AP-10, 1B-AP-09, 1B-AP-10) and England's key stage one
and two programmes of study say the same in fewer words; key stage one already asks children to
"use logical reasoning to predict the behaviour of simple programs".

On directions, the evidence is developmental. Children use left and right on their own bodies from
about seven and on someone facing them at eight or nine, and half of eleven year olds still misapply
them to another person (Rigal, abstract only). Code.org's courses use compass moves first and turn
left and turn right from the course aimed at grades two and three; CS Unplugged starts with relative
moves at five but supports them with the child's own body. We found no controlled study comparing
the two orders. The practical reading is absolute moves first, relative moves around seven with the
body turning alongside, and never both in one activity.

On unplugged and plugged work, the evidence is mixed but leans one way. A meta-analysis of thirteen
studies reports a large effect for unplugged activities (Chen and others, abstract only), a study
of second graders found unplugged work followed by screen work beat screen work alone (del
Olmo-Muñoz and others, abstract only), and a smaller study found no difference in mastery but higher
self-efficacy (Hermans and Aivaloglou, abstract only). The National Centre for Computing Education
adds a condition we take seriously: unplugged work helps when the child is led back to the same idea
in computing terms. ScratchJr's designers found that Scratch assumed reading, coordinates and
numbers up to five hundred, and designed for a low floor, wide walls and a countable grid instead;
a later study found about a third of kindergartners finished only one entry task without a
curriculum around the tool, an effect gone by grade two and put down to reading.

On making, Papert's argument and ScratchJr's usage data point the same way. Children used most the
characters they had drawn themselves, and Say and Record were among the most used blocks; Resnick's
work calls for projects that are personally meaningful and shared. None of the sources measured a
sense of ownership directly at these ages, so we treat this as the design direction the field
agrees on rather than a measured effect.

On mistakes, Code.org names four kinds of bug a young child meets: a loop with the wrong count, a
missing block, an extra block and blocks in the wrong order. Grover's review adds off-by-one errors
and confusion about what is inside a loop. Papert noticed children erasing a program and starting
again rather than finding the line that went wrong, which is the habit a debugging lesson is for.

On paper, the established activities are graph paper programming, colour by numbers, the Kidbots
routine where a tester draws a line under the step where a program goes wrong, and sorting networks
walked on the ground. For assessment, the TechCheck instrument uses sequencing, shortest path,
missing symbol and obstacle maze items that a five to nine year old can answer unplugged in under
fifteen minutes, and the ScratchJr project rubric scores coding and design separately.

## The principles

Children run programs as well as read them. Every lesson has at least one scene that runs on
screen, and every build task is marked by running the child's own program.

There is one interpreter. A drawing that shows what a program does, the checker that proves the
answer key and the runner that animates the program on screen all call the same `run` in
`engine/coding.ts`, so the picture, the key and the animation cannot disagree. Where a scene shows a
listing beside the drawing that runs it, the checker refuses the item if the two differ.

A child guesses before running. A question that asks what the program it shows does offers Run and
Step only once it has been answered, and the run then says the child's answer before what the program
did, so running is how a prediction is checked and never how it is made. This is the predict step
that key stage one asks for and that PRIMM makes routine; we have not tested whether children use
Run to check once they may.

Arrow moves come first and forward and turn later, and the two are never mixed in one question.
Grade one moves by arrows on a numbered grid; grade two introduces a heading, which the robot's visor
and the turtle's head show on screen and in print.

Every building block has a paper form. The paper form of a block is the same drawing in black and white, with each
block white and a hatched tab down its edge so its words stay readable; the dashed slots of a pad are
where a child draws the blocks in; a maze prints with a dotted path to trace or with the robot left
out to draw in. Nothing a child needs lives only in motion: the reduced motion setting and the
printed page both show the resting state.

Debugging questions are proved to have exactly one wrong line, by trying every single change to
every line, so "which line is wrong" never has two right answers.

From grade one the track includes programs that make something rather than get somewhere:
colouring a picture from a program, a dance the robot does to a beat, a tune played on chime bars,
and a character on a stage that moves and speaks when the flag is tapped.

## The program model and its one interpreter

A program is a list of lines, nested by indentation, two spaces a level. In the notation it is a
list of quoted lines, `code=["repeat 3", "  right 2", "  up 1"]`, and a line may carry a parameter,
`"right {a}"`, which is filled for each variant before anything reads it. The lines are the words the
blocks print, so the blocks, the listing and the paper slots are three drawings of one list. We chose
lines over a bracketed text because the notation's braces are its placeholders, and over the old
pair of lists, `lines` and `indent`, because a line that carries its own depth reads the way a
program looks.

The language is small and forgiving about how a child phrases a line.

| Kind | Lines it reads | What it does |
|---|---|---|
| Arrow moves | `right 3`, `left`, `up 2`, `down n`, `go right 2` | moves that many squares and faces that way |
| Heading moves | `forward 2`, `back 1`, `turn left`, `turn right`, `turn around`, `face up`, `turn left 60` | moves along the heading, or turns on the spot; a turn with a number turns that many degrees, and a move along a heading that is not a quarter turn leaves the squares in one straight line, which is how a turtle draws a hexagon (added 28 September 2026) |
| Pen and paint | `pen up`, `pen down`, `pen red`, `paint blue`, `2 white 3 red 2 white` | draws a line, colours a square, or paints a row of pixels from the left |
| Gems | `pick up`, `collect` | a gem is also picked up by walking over it |
| Sound and dance | `play C`, `play E4 2`, `rest`, `clap 2`, `jump`, `spin`, `wave`, `stamp`, `hop`, `bow`, `say hello` | a note, a beat, a move, or words in a bubble |
| The lamp | `flash long`, `flash short`, `light red` and the rest of the palette, and `wait` for a dark beat | a long flash of two beats or a short one of one, or the lamp lit in one colour, each of which the run keeps in order (`flashes`, `flash(2)`, `lights`, `light(2)`); the lamp world of grade one's units 2 and 6, where a child reads flashes against a key as a message and a lamp's lights as a pattern (added 17 September 2026) |
| Names | `set n to 4`, `add 3 to n`, `take 1 from n`, `change n by 2`, `double n`, `set roll to random 1 to 6`, `take gap / 2 from cocoa` | a name holds one number; a count can be a name, `right n`; `random 1 to 6` is a whole number from 1 to 6, drawn when the line runs; a share, `/` or `÷`, has to come out whole, and one that does not is reported on its line rather than rounded (added 28 September 2026) |
| Lists | `set cargo to list 4, 7, 2`, `add 5 to cargo`, `replace item 2 of cargo with 9`, `item 2 of cargo`, `length of cargo` | a name holds a list of numbers counted from 1; add puts a number on the end, and item and length are numbers any line can use (added 28 September 2026) |
| Repeats through a list | `for each crate in cargo` | runs the lines further in once for each item, with the name holding the item; it walks the list as it was when the repeat began |
| Repeats | `repeat 3`, `repeat 3 times`, `repeat until at flag`, `repeat for ever` | runs the lines further in again; a repeat for ever has no count and no question, so its run ends at the step limit with a limit frame, as a repeat until whose question is never true does, and a program never runs without end (added 17 September 2026) |
| Decisions | `if wall ahead`, `if on a gem`, `if the number is more than 5`, `if n is more than 3 and n is less than 8`, `if not at flag`, `if n is not more than 5`, `otherwise` | runs one set of lines or the other; and needs both tests to pass and or needs one, and or joins looser than and; not in front of a question turns it round, and `is not more than`, `is not less than`, `is not at least` and `is not at most` read as the comparison they mean (added 28 September 2026) |
| Events | `when the flag is tapped`, `when tapped` | starts a script; lines with no when block run on the flag |
| Messages | `broadcast go`, `when I receive go` | a broadcast starts every script that receives its message, and each runs to its end, in the order they are written, before the line after the broadcast; a message that keeps starting the script that sends it is stopped with a problem after twenty times over (added 28 September 2026) |
| Sensors and switches | `switch heater on`, `switch pump off`, `turn lamp on`, `wait 1`, and a sensor's name in a question, `if temp is less than 18` | a switch turns a named thing on or off; a sensor is a name the world gives a number, which a program asks about and cannot set; each beat a `wait` waits is a minute, and each minute every sensor follows its readings or changes by its drift and by what each switch that is on adds, so a heater the program switches on warms the room it reads (added 28 September 2026) |
| Your own blocks | `define hooray` and then `hooray`, `define box width height` and then `box 4 2` | names a few lines and runs them where the name is used; the names after the block's own name are its inputs, filled in order from the numbers after it, and a name outside the block keeps its own number; a block with one input may be given a sum, `tree n / 2`, so a block can use itself with a smaller number, and a block that uses itself more than twenty deep is stopped with a problem on its line |

A line that cannot be read is reported with its number and a sentence a grown-up can act on, such as
`"jmup" is not a block we know` or `a repeat needs the lines it holds written under it, one step
further in`, and the rest of the program still runs.

A program runs in a world: a grid of squares with a start, a heading, rocks that cannot be entered,
gems, a flag and painted squares. The maze, the turtle, the stage and the printer that paints pixel
rows are four settings of the same world, and each drawing turns its own settings into one with a
function the checker and the runner call too (`mazeOf`, `turtleOf`, `printerOf` and `setupOf` in
`art/coding.ts`). A listing on its own runs on open ground ninety nine squares across, so a question
about how far a program moves or what a name holds needs no grid drawn.

`run` returns frames, one for everything the program did, each with the line that did it, the path a
move took square by square, the lines the pen drew, a repeat's round, which way an if went, and the
whole state afterwards. A move into a rock or off the grid ends the run with a bump frame on the line
that caused it; a program that has not stopped after two thousand frames ends with a limit, which is
how a repeat until that never comes true is caught. The same program in the same world always gives
the same frames, which a test asserts.

What a run comes to is read by `outcome`: where the robot stopped (`col`, `row`, `face`), how far it
moved, how many turns, gems, notes and claps, what a name holds at the end or after a given step
(`value(n)`, `after(2).n`), how often a line ran (`ran(3)`), the shape the pen drew, how many squares
of a colour were painted in a row, the move in a dance's fourth frame, and how many times the lamp
flashed and whether a given flash was long (`flashes`, `flash(2)`), what a list holds at the end (`list(cargo)`, `length(cargo)`, `item(2).cargo`),
how many straight sides the pen drew, counting a side drawn twice once (`sides`), and how many degrees
the turtle turned in all and which way it faces (`turned`, `heading`). A run in a world with sensors
also keeps what each sensor read at the start and after every minute (`minutes` on the run), and
`outcome` reads it as the minutes waited (`minutes`), a reading or a switch after a given minute
(`minute(5).temp`, `minute(5).heater`), the lowest and highest reading (`lowest(temp)`,
`highest(temp)`), whether the reading, once it is inside a band, stays inside it (`stays(temp, 17,
22)`, yes or no), how many times a switch changed or came on (`switched(heater)`,
`switched(heater, on)`), and how a switch was left (`on(heater)`). What a program is for is
read by `meets`: reach the flag, pick up every gem, both, draw a closed shape or a square, paint a
target picture, or draw exactly a target drawing, each line once, so going round a square twice is
not a square.

We left some things out on purpose. Scripts triggered by the same event run one after another rather
than at once, because children this age struggle to follow two scripts running together and a
deterministic order is what a checker needs. The same reason decides what a broadcast does: the
scripts that receive it run to their end before the sender carries on, which is Scratch's
"broadcast and wait". A plain broadcast in Scratch lets the sender run on at the same time, and a
question about what such a program prints can have two answers depending on timing; we preferred one
answer to the fuller model.

Sensors are part of the world, not of the program, because a program reads a thermometer and does not
decide what it reads. A drawing that runs a program (the listing, the trace table and the flowchart)
takes them in its `sense` setting, one sensor a line: `temp starts 15 changes -1 heater 2 least 0
most 40` is a number that starts at 15, falls by 1 a minute and rises by 2 more while the heater is
on, and stays between 0 and 40; `daylight reads 9 7 5 3 1` follows its readings minute by minute and
keeps the last, and the switches do not change it. A sensor cannot be called `light`, since that is
the lamp's block. Time passes only on `wait`, as in Scratch, where a loop with no wait runs at once,
so a thermostat is a loop that asks, switches and waits a minute. Each frame keeps the sensors'
readings in its state beside the names, and what is switched on in `on`, so a thermometer, a tank or a
lamp drawn from a frame shows what the program saw at that step, and a trace table whose value column
is named after a sensor fills with its readings. Lists arrived with grade five (28 September 2026) and
hold whole numbers only, and there is still no arithmetic beyond one operation in a number. A
variable is always a whole number.

A random number keeps the run repeatable. `run` draws it from a seeded generator, so the same program
in the same world still gives the same frames, and a checker never takes one run's draw as a key: a
question about a program that draws random numbers asks what could happen, which `everyRun` works
out by trying every number each draw could give, each way with its chance. `overAll` reads that as
the least and most a name could hold, how many different values, how many of the equally likely ways
give a value, the likeliest value and whether every value is as likely as the others (`least(value(n))`,
`most(...)`, `kinds(...)`, `outcomes`, `ways(value(total)=7)`, `likeliest(...)`, `fair(...)`), and
`coding.runs` binds `could(...)` and `never(...)` to the one option of a choice that could or could
not happen. It refuses any other question about such a program, since its answer would depend on
the draw.

## The building blocks

Nineteen drawings, all on the art shelf under Coding, all derived into the notation by
`lang/parts.ts` with no hand-written registry entry except the codepad's, which is named because it
is where a child answers.

| Block | On screen, the child | On paper, the child |
|---|---|---|
| `blocks`: a program as blocks that click together | watches the running block ring as the program runs; drags them in a build task | reads them, draws the missing block in a dashed gap, finds the one marked with a bug |
| `program`: the same program as numbered lines | watches the running line light up | reads it aloud, fills a blank line, finds the line with the bug |
| `blocktray`: lettered blocks to choose from | picks a block to add | writes the letter of the block that goes in the gap |
| `codepad`: numbered slots and a tray | drags or taps blocks in, reorders, nests, changes numbers, undoes, runs | draws or writes one block a slot; the key writes a working program in pen |
| `maze`: the robot with rocks, gems and a flag | taps a square to guess, then runs or steps the program and watches the robot walk | traces the dotted path, draws the robot where it stops, numbers the stops |
| `turtle`: a turtle with a pen and a target | watches the line draw as the turtle walks | draws the line on the squares, compares it with the pale target |
| `pixels`: a picture from a program of colours | watches the rows paint one line at a time | colours the squares from the code, which shows a swatch for every colour |
| `stage`: the rabbit, the crab or the robot on a stage | taps the flag or the character to start a script | draws where the character ends up, or reads what it says |
| `dance`: a dance as a strip of frames | watches the robot dance it, with a beat when sound is on | draws the move in the empty frame, counts the claps |
| `tune`: chime bars and a program of notes | hears it played while the bars light in turn | numbers the bars in the order the code strikes them |
| `variable`: a box with a name and the numbers it held | watches the number change line by line | writes the number the box holds at the end |
| `listbox`: a list's name and its numbered cells | watches the cells fill and change | writes the number in the empty cell, crosses off the cells a search has looked at |
| `fork`: a decision as a path that splits at a sign | watches the path light the way the test goes | traces the way the program goes for a given number |
| `flowchart`: the program as a flowchart | follows the arrows from start to stop | writes the missing step in the empty shape, puts the shapes in order |
| `tracetable`: a table with a row a step | watches the rows fill as the program runs | fills in the empty rows with a pencil |
| `lamps`: lamps worth 8, 4, 2 and 1 | taps lamps on and off and reads the sum | colours the lit lamps, adds them up |
| `sortcards`: cards with towers to sort | taps a card to compare it with its neighbour and swap | writes the order after one pass, counts the swaps |
| `sortnet`: a sorting network | steps the numbers down one bridge at a time | walks each number down to the bottom and writes where it comes out |
| `cups`: cups hiding numbers in order | lifts cups and sees half of them crossed out | writes which cup to lift next, counts the lifts |

The blocks are the centre of it. A block is two squares tall, so a program lines up with the squared
paper, and it has a notch on top and a tab below that fit the block above and below it. Moves are
blue, the pen and paint pink, sounds and dances green, repeats and ifs orange, when blocks and a
child's own blocks yellow with a rounded top, and names white with a heavier edge. Every block has
a picture as well as words, an arrow, a curved arrow for a turn, a pencil, a note, a pair of hands,
so a child who cannot yet read `down` can still tell it from `right`, and with `words=false` a
block is only its picture and its number. A number sits in a white oval, which on screen is the part
a child changes. A repeat or an if is a C that holds the blocks inside it; an otherwise is a bar
across the middle of the C.

A program printed as text is the listing with `text` set: the same lines, from `textOf` in
`engine/coding.ts`, which writes each block's words with one space between them and two spaces a
level, and reads back as the same program line for line (a test runs both and compares the frames).
It has no chips and no brackets, only line numbers in a gutter and a faint guide down each level, so
the spaces carry what a repeat or an if holds, as they do in a text language. We chose this over a
second language because grade six reads text and still answers with blocks or a prediction: there is
no text editor or text runner, and the words a child reads in the text are the words on the blocks
they build with. A text editor would be a new capability with its own design, and nothing here
depends on one.

The listing is the same program as numbered lines in the mono face, with a coloured chip at the start
of each line in the block's colour, so a child moving from blocks to lines sees the same program.
The lines a repeat or an if holds are set further in and bracketed down the side. The listing can
point at the running line with an arrow and a highlighter band, mark the line with a bug with a wavy
underline and a ladybird, leave a line blank to write in, and loop a line in the teacher's pen.

The maze is the robot's world, drawn on a numbered grid of two-square cells so a child can put a
finger on a square. It can be written as a map of rows, `["S . # .", ". * . F"]`, or with rocks, gems
and the flag placed by column and row so a question can move them. Its robot is seen from above, a
round body with its visor and eyes at the front and its aerial at the back, so which way it faces can
be read in black and white. The path it walked is drawn from the run, with a head on each move and,
with `trail=steps`, a number at each stop; `trail=dots` prints a dotted path to trace, and
`robot=false` leaves the square empty for the child to draw in. A burst marks where it met a rock or
the edge. The turtle is the same world with the pen down, drawn with a turtle and an optional pale
target shape, and the stage is the same world one square deep with curtains, a floor of numbered
squares and a green flag.

Pixels, dance and tune are the blocks for making things. A pixel program is one line a row, read
from the left, and a repeat paints a row again, so spotting the rows that repeat is the same skill as
spotting where a program needs a repeat. The dance and the tune are programs whose frames are beats
and notes; the dance strip draws the robot in the pose of every beat, and the tune numbers each
chime bar in the order it is struck.

The list box, added for grade five, is the variable's tag in front of a row of cells numbered from 1,
each holding one number from running its program; `blank` leaves a cell for a child, `mark` rings
one and `crossed` crosses off the cells a search has already looked at. A `for each` line is drawn
as an orange C like a repeat, with a column of cells beside the loop's arrow, and a line that makes
or changes a list carries three cells under a name's tag.

The flowchart, added for grades five and six (28 September 2026), draws any program the interpreter
reads from the same `code` setting the listing takes, so a program shown as blocks, as text and as a
flowchart is one list of lines drawn three ways. Each script is a column from an oval that says how it
starts (start, or its when block) to a stop oval, and a block of one's own is a column from its define
to an end oval. A step is a box, a `say` a slanted box for what the program puts out, a call of one's
own block a box with double sides, and an if a diamond whose yes way carries on down and whose no way
goes out to the right and comes back in below. A repeat is drawn as a loop with its question first:
"done 3 times?", "at flag?" or "done every crate in cargo?", with no going down through the lines it
holds and back up the left to ask again, and yes leaving by the right; a repeat for ever has no
question and no way out, so its column has no stop. Shapes take the block's own colours on screen and
are white on paper, and `blank` leaves the shape for one line empty and dashed.

The variable, the fork and the trace table are for grades three and four. The variable is a box
with its name on a tag, the number it holds inside and the numbers it held before crossed out along a
strip, because a name holds one number at a time and the old one is gone; its numbers come from
running its program. The fork draws a decision as a path splitting at a signpost, with the yes way
and the no way, and lights the way the program's own test takes for a given number. The trace table
has a row for every frame of a run, filled by running the program, with `filled` saying how many rows
to write in for the child.

The lamps, the sorting cards, the sorting network and the cups are the algorithm blocks. They are not
programs on a grid, and their answers (the sum of the lit lamps, where a number leaves the network,
how many lifts halving needs) are worked out by small functions beside the drawings, which the
checker calls the same way it calls `run`.

## On the lesson page

In the root app (28 September 2026) a program a sheet shows plays under its scene, in a child's sheet,
a grown-up's journal and Explore's preview alike. `sceneTarget` in `engine/ui/coding.ts` chooses what
a scene offers: a build for a `coding.builds` check, otherwise the drawing `coding.runs` names, the
first drawing that runs a program, the first of the four algorithm toys, or a readable listing that
is the only one in the scene, which is how a program of names and random numbers with no world beside
it is watched. A flowchart is a listing too, and a listing and a flowchart of the same program are
one program drawn twice, so the first of them plays and the other is lit with it; two listings of
different programs are two programs, so neither plays. A listing beside a world is lit only when its
lines are the world's program.

Under the scene sit Run, Step and Start again (`engine/ui/code-controls.tsx`), each at least 44
pixels. The player in `engine/ui/code-runner.ts` plays the frames of `run` a frame at a time and draws
every drawing the program touches again from the shelf at each frame, the way the build already
redrew its world: the maze's robot and trail, the turtle's line, the stage, a pixel row, a tune's
bars, a dance's strip, a fork, a trace table's rows, a listing's running line, a name's box and a
list's cells, which are ringed item by item as a `for each` walks them. What each drawing shows at a
frame is `settingsAt` in `coding.ts`, which a test covers without a browser. A box or a list is
touched when the program gives its name a value and the drawing's own program is the first lines of
the one playing, such as a list's own line beside the program that walks it. Under
`prefers-reduced-motion` Run draws the last frame at once and Step still moves one frame at a time.
What a `say` line says is shown in a speech bubble from the shelf, and a name says the number it
holds, so `say roll` shows the roll. Nothing a child is asked to write in the drawing is filled for
them unless the sheet is read: a blank stays blank, a trace table fills no further than the rows it
gave, and a step does not read out the words of a listing's blank line. The lamps, the sorting cards,
the cups and the sorting network have a button for each lamp, pair, cup or the next bridge instead. A
program that reads sensors draws what it read at each frame: a thermometer's `value` or a jug's
`level` follows the sensor whose first reading the drawing is drawn at, so a scene says which sensor a
drawing shows by drawing it at the start, and the `switched` drawing shows the heater, the lamp or
whatever else the program switches, on or off. A step also says the minute, each sensor's reading and
what is on.
None of it records anything, the question's own Check is what is marked, and Start again, a scene
drawn again after a try, or a print puts every drawing back as the sheet drew it; the controls do not
print.

Each Run draws fresh random numbers. The drawings run their own settings with the checker's
generator, so the player hands them the program with each number written in where it was drawn,
`set roll to 4` for `set roll to random 1 to 6`, and the end says which numbers came up. A program
that draws on one line more than once cannot be written that way and plays the checker's own draw.
The checker's proofs over every run (`everyRun`, `overAll`) are unchanged.

In a question, playing the program would give the answer away when the question asks what the
program does, so there Run and Step, and a toy's buttons, are offered only once the question is
answered, right or shown after the last try. `asksWhatItDoes` in `engine/ui/coding.ts` decides it: the
item's check is `coding.runs`, which works out what the drawing's program comes to, or the item has no
check and every answer is a number or a pick while the scene holds something to play. Until then a
line under the scene says to work it out first. Once the question is done the controls appear, and
a run that reaches its end says the child's answer first ("Your answer was 7.") and then what the
program did. A look scene, a worked example, a sheet being read and a build keep Run as before, and
a hint or a reply never sends a child to Run or Step, which `check:voice` refuses in every hint and
rule line (`press-run` in `school/voice.ts`).

The history below describes the scratchpad's page, which the root replaces; prediction, stage event
buttons, sprites that glide between squares and sound have not moved to the root yet.

`wakeCoding` in `src/coding/lesson.ts` runs after the lesson page has drawn a lesson on screen. It
finds the question cards and the look scenes whose drawings run a program and gives each one
controls under the scene: Run, Step and Start again, a line that says what is happening in words,
and a Sound switch on the cards whose programs make a sound, because the lesson page has none of its
own. A live card spans the width of the page and draws its squares at 24 pixels, which makes a block
and a slot 48 pixels tall. The change to `src/pages/lessons.ts` is one import and one call, and the
page's URL contract is unchanged; print, paper output and the answer key draw exactly what they drew
before.

The runner plays the frames of a run. For the maze, the turtle and the stage it draws the world once
without its robot and moves a sprite of the same drawing over it, a spring from
`src/engine/spring.ts` for each square of a move and for each turn, so a move of three is three small
steps a child can count; a bump pushes the robot a little towards the rock and springs it back. The
frames are laid on a timeline from `src/engine/timeline.ts`, a track for each, with a cue as each
glide lands or as each beat, note or row begins, and the page draws the world again at each cue so the
trail, the gems and the bubbles are the drawing's own. Under `prefers-reduced-motion` the timeline is
collapsed, as the engine does for its games: Run lands on the end at once and Step moves one frame at
a time with no motion. Every step is said in words, "Step 3 of 7. Line 2: down 2. The robot is on
column 4, row 3", and the end says what happened, including the line a bump came from.

The lamp world is watched on the row it prints (17 September 2026). A program whose lines are
`light <colour>` lights one square along a `pixels` row for each line, left to right, rather than
painting a whole row a line, so the lamp rocks' programs run on the same drawing that prints them; a
program of printer lines is unchanged. Two things follow from a repeat that never ends. The run is
two thousand frames long, because that is where the interpreter's step limit stops it, so the lamp's
run is the frames up to the one that fills its row, nine frames for a row of six: the drawing paints
that and the runner plays exactly that, both from `lampRun` in `engine/parts/coding/pixels.ts`, so
what a child watches fill is what the sheet prints. And the end is said as what the lamp shows, "The
row is full: 6 lights, and the program goes on in the same order", rather than as the step limit,
which is the interpreter's business and not the child's. For the lamp program to be the one that
runs, the row's own node carries it, as a maze node carries the program its listing prints.

A listing is lit only when the runner can read it. A scene may draw a plan rather than a program, as
the three-star question of the grade one lamp lesson draws `repeat for ever` over a line of dots, and
lighting its first line as though it were running says something untrue about a drawing that is not a
program. So `partsOf` takes the one listing beside a world only when its lines parse without a
problem, and leaves a plan, a fragment or anything else the language cannot read drawn as it is.

A card that asks where the robot stops also takes a guess. Tapping a square, or moving a ring with
the arrow keys and pressing Enter, marks the guess in pencil, and when the run ends the line under the
scene says whether it was right.

The block editor turns a codepad into the place a child builds. The pad is drawn again after every
change with the child's blocks in its slots, set in by depth with an orange bar down the side of
what a repeat or an if holds, so the screen and the printed pad are the same picture. Over each tray
block and each slot sits a transparent button at least 44 pixels square. A child can drag a block
from the tray into a slot, drag a block to another slot, or drag it off the pad to take it out; the
drag uses the engine's gesture recogniser and the block springs into its slot when it lands. Every
drag has a tap and a key: tapping a tray block adds it after the chosen slot, tapping a slot chooses
it, and a row of buttons under the pad moves the chosen block up or down, in or out of the block
above, changes its number, takes it out, undoes and clears. On a focused slot the arrow keys move the
choice, Alt or Shift with an arrow moves the block, left and right move it out and in, plus and minus
change its number, Delete takes it out and Control Z undoes. A block cannot be put further in than
one step inside a repeat or an if above it, and the editor tidies depths after every move so the
program is always one the interpreter can read. With `once` set, the tray is a set of cards to put
in order: each is used once, and its number cannot change.

In the root editor (`engine/ui/program.tsx` and `blocks.ts`, 28 September 2026) any number on a
block can be changed, not only the first: a block with more than one number shows a button for each,
the chosen one is changed with Fewer and More or typed into a number field, and on a focused slot `[`
and `]` choose the number and plus and minus change it. Each number's limits come from what it means,
read from the words before it: a turn in degrees from 1 to 359, a move from 1 to the world's longer
side, a repeat from 1 to 99, a place in a list from 1 to 99, a beat count from 1 to 20, and any other
number, a list's item or the number a name is set to, from -99 to 999, which is what a list's cell has
room for. The checker's `usesTray` accepts any number on a tray block's shape, so these limits only
keep the pad to programs that make sense. The octave in a note, `E4`, is part of the note's name and
not a number to change. The build plays through the same player as a shown program, so a list or a
name's box in its scene changes as the child's program runs, and Step plays it a frame at a time
without recording a try.

Run plays the child's program in the scene's world, lights the running slot, and then asks the same
question the checker asks, with the same function: did the program do the job. The line under the
scene says either what it achieved ("That works: it picked up every gem and reached the flag. First
time.") or what went wrong and where ("Not yet: it bumped on block 3. Change that block and run it
again."). With the answer key on, the pad starts with the program the checker proved, so a grown-up
can run it, and the card shows the answer the page would record.

The lamps, the sorting cards, the cups and the sorting network are playable too, without a
program: tapping a lamp switches it and the line under it adds up the lamps that are lit, tapping a
card compares it with its neighbour and swaps them when the bigger is first, tapping a cup lifts it
and crosses out the half it rules out, and Next bridge walks the numbers down the network one bridge
at a time and says which way each pair went.

## How programs become answers

Whether a program does its task is `done` in `engine/coding.ts`, beside `meets`, and it is the one
rule: the verifier's `coding.builds` proves a task and its key with it, and the child's sheet marks a
program a child built with it. It asks `meets`, or the target drawing, of every way the program can
run (`everyRun`); a program that draws no random number has one way. A program with random numbers is
right only when it reaches the goal whatever they come to, and the one draw the child watched is not
what is marked. A program with more ways than `everyRun` will try is judged on the seeded run. Every
build key in the corpus passes it at every level (checked 29 September 2026).

There are two kinds of coding question, and each has a checker in `src/coding/prove.ts`.

A question about a given program asks what it comes to: where the robot stops, how many squares it
moves, what n holds, which line is the bug, what shape it drew. Its item names the drawing that runs
the program and binds each answer to an outcome:

```
check coding.runs of=g col=col row=row
check coding.runs of=t goal=target pick=wrong
check coding.runs of=v answer="after(2).n"
```

For every variant the verifier instantiates the scene, the checker runs the program in it and returns
its answers, and the verifier takes them as the key. If the item also states an answer with an
expression, the two have to agree, and a variant where they do not is an error that names both
numbers. An answer bound to a choice is matched to the option whose words it names, so the outcome
`square` picks the option "A square". `wrong` and `fix` need a goal: the checker tries every single
change to every line, a different number, the other direction or the line taken out, and requires
that all the changes that make the program do its job are on one line, which is then the answer, and
for `fix` that they agree on one number. A setting can name a parameter in braces, `"row({r}).red"`,
filled for each variant.

A flowchart runs as its program does, so `coding.runs of=f` asks it anything a listing can be asked,
and `blank` binds the one answer to the words of the shape the chart leaves empty, which is how "which
box is missing" is proved (a listing's `blank` binds to its blank line the same way). A flowchart in
the same scene as the drawing that runs has to draw that drawing's program, as a listing beside it
does.

```
flowchart f code=["set n to 1", "repeat {a}", "  double n", "say n"] blank=3
choice pick options=["double n", "add 1 to n", "say n"]
check coding.runs of=f n="value(n)" pick=blank
```

A question about control with feedback gives the listing its sensors and asks what the run comes to:

```
program p code=["repeat 20", "  if temp is less than 18", "    switch heater on", "  if temp is more than 21", "    switch heater off", "  wait 1"] sense=["temp starts 15 changes -1 heater 2"]
check coding.runs of=p temp="minute(7).temp" times="switched(heater, on)" stays="stays(temp, 17, 22)"
```

Here the room reads 22 after seven minutes, the heater comes on twice in twenty minutes, and once the
room is between 17 and 22 it stays there.

A question about test cases is proved by `coding.tests`. The scene shows a program and says what it
is meant to do; `bug` is the other version, written as the lines that differ, and a test catches the
bug when the two versions come to different things for that input: what they say, what each name and
list holds and where they stop, or only the outcome `out` names when it is set. The checker runs both
versions on every input it is given, which are a choice's options (each option names one or more
numbers, "11 and 12") or `try`, a range or a list of numbers, so the answer is proved rather than
stated.

```
program p code=["if age is less than 12", "  say child", "otherwise", "  say adult"]
choice pick options=["5 and 13", "11 and 12", "3 and 20"]
check coding.tests of=p input=age bug="1: if age is less than 11" try=0..20 pick=catches n=catching
```

`catches` binds the one option with an input that catches the bug, here 11 and 12, since only an
age of 11 is a child to one version and an adult to the other; `misses` the one option with none;
`catching` counts the inputs of `try` that catch it and `smallest` gives the least of them. For
coverage, `covers` binds the one option whose inputs between them take every if both ways, `fewest`
the fewest inputs of `try` that do, and `branches` how many ways there are (two for each if). A choice
where two options would be right is refused, as it is for `coding.runs`.

A build task asks the child to make a program. Its scene has a world with no program and a codepad
with a tray and a number of slots, and its item says what the program is for:

```
codepad answer tray=["forward 1", "turn left", "repeat 2"] lines=3 key=["repeat 4", "  forward {n}", "  turn left"]
check coding.builds of=t goal=target
```

For every variant the checker proves the task can be done: the pad's `key`, if the item gives one,
has to use only the tray's blocks, fit the slots and do the job when run, and without a key the
prover in `solve.ts` searches, first for a straight program by walking the states the robot can reach
and then for one repeat round a short body. It also refuses a task whose goal is met before any block
is placed. The key shows the proved program on the grown-ups' sheet and in pen in the pad, written
on one line with a comma between blocks; a comma before a number stays inside its block, since no
block starts with a number, so a list's numbers come back whole. Eight of
the fifty nine items are build tasks and forty two are proved by `coding.runs`; the other nine have
answers an expression states directly or are marked by a grown-up.

Both checkers needed the verifier to do something it did not do before, which is to call a checker
once for each variant with that variant's scene. We added two optional parts to the checker contract
in `lang/checkers.ts`, `provides`, the answers a checker works out itself, and `variant`, the call
with each concrete scene, and changed `lang/verify.ts` to instantiate the scene before checking the
answers and to count provided answers as declared, so feedback rules can mention them and inputs are
still matched to answers. Existing checkers are unaffected.

A child's arranged program is a new answer kind. In `engine/answer.ts`:

```ts
/** One block of a program a child arranged: the words on it, and how many blocks it sits inside. */
export interface ProgramLine {
    text: string;
    depth: number;
}

export type Given =
    ...
    /** Blocks arranged into a program, top to bottom, which the lesson ran to mark it. */
    | { k: "program"; lines: ProgramLine[] }
    ...
```

with its entry in `GIVEN`, which refuses anything but lines of text with a whole depth of nought or
more. The event that records it is the existing `answered` event, with `given` set to the program,
`right` set by running it against the task, and `tries` counting the runs before the answer, which is
the evidence of a child changing a block and running again. We considered a separate event for every
press of Run and rejected it for now: it would be the fullest record of tinkering, but it multiplies
the events a sitting writes, and `tries` carries most of what a parent would read from it. A
program written on paper is marked by a grown-up running it on the printed grid, and recorded with
the existing `marked` event, either with the program typed in as the same `program` answer or as
`unmarked`. The scratchpad does not record events yet; with the answer key on, a build card shows the
`answered` data it would write, typed against `Given`.

## The scope and sequence

The track has nine units, numbered across all four grades as [tracks.md](tracks.md) asks: 1
Following and giving instructions, 2 Repeating, 3 Making things with a program, 4 Finding the
mistake, 5 Deciding, 6 When something happens, 7 Names that hold numbers, 8 Sorting, searching and
binary, and 9 Blocks of your own.

Grade one reads and writes short programs of arrow blocks on a grid, puts steps and cards in order,
colours a picture from a program, starts a program with the flag, finds the one card that sends the
robot the wrong way, reads a lamp's flashes against a key as a message, and works out a lamp's
lights far ahead from a repeat that never ends. Grade two writes the steps for a snack exactly
enough for a robot, in an order where each step has what it needs, then turns: forward and turn with
a heading, then repeat, drawing shapes with the turtle, fixing a repeat with the wrong count, a
dance and a tune written with repeats, lamps that count in binary, and two scripts started by two
events. Grade three nests a repeat inside a turtle's staircase, traces someone else's program in a
table, meets decisions as a fork and as a robot that feels for walls, sorts cards two at a time,
halves a row of cups, and puts a repeat into a picture. Grade four uses a repeat inside a repeat, a
name that changes and a trace table to follow it, writes a program for someone else, debugs by
comparing with a target, walks a sorting network, keeps going until the flag with an if inside the
loop, and, as a stretch the standards leave for later, names a block of its own and gives such a
block a number. Grade five, pitched against CSTA 1B and 2, key stages two and three, and Japan's
elementary programming, keeps numbers in a list and walks it with a repeat, keeps a running total,
draws any regular polygon by turning 360 divided by the sides, joins tests with and and or, asks what
a program with random numbers could do and whether its die is fair, gives a block of its own two
inputs, compares searching one by one with halving, and debugs all of these, and every one of its
lessons has a build task, proved by `coding.builds`, in which the child writes such a program from
a tray and runs it (added 28 September 2026). Grade six, pitched
against CSTA 2, key stage three and Japan's programming education, reads programs printed as text,
simulates cooling, a tank filling and an orbit a small step at a time, nests a decision inside a
decision, compares two sorts by counting their questions and swaps, draws a fractal with a block
that uses itself, counts the steps two programs take for the same task, and ends with puzzles on
all of these.

| # | Grade | Unit | Lesson | Format | Blocks | On screen |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | Following instructions on a grid | teach | blocks, maze | run, guess |
| 2 | 1 | 1 | One step at a time | teach | blocks, maze | step, guess |
| 3 | 1 | 1 | Saying it in the right order | teach | blocktray, maze, codepad | put cards in order, run |
| 16 | 1 | 1 | Arrows to the gem | teach | maze, blocks, codepad | build and run |
| 33 | 1 | 2 | A pattern that never ends (17 September 2026) | teach | program, pixels, lighthouse | the lights run in a row |
| 17 | 1 | 3 | Colour by code | teach | pixels | rows paint in turn |
| 18 | 1 | 6 | When the flag is tapped | teach | blocks, stage | tap the flag |
| 32 | 1 | 6 | A message in flashes (17 September 2026) | teach | program, table, lighthouse | read the flashes against the key |
| 19 | 1 | 4 | One card is wrong | teach | blocks, maze | run, find the bump |
| 4 | 2 | 1 | Turning as well as moving | teach | blocks, maze, codepad | run, build with turns |
| 34 | 2 | 1 | Instructions for a snack (17 September 2026) | teach | program, sequence, kitchen counter | put the steps in order |
| 5 | 2 | 2 | Doing it again: repeat | teach | blocks, grid, maze, codepad | build with a repeat |
| 6 | 2 | 3 | Drawing with a program | teach | blocks, turtle, codepad | draw, build a square |
| 7 | 2 | 4 | Finding the mistake | worked | blocks, turtle | run against the target |
| 20 | 2 | 3 | A dance in a loop | teach | blocks, dance | the robot dances |
| 21 | 2 | 3 | A tune from a program | teach | blocks, tune | the tune plays |
| 22 | 2 | 8 | Lamps that count | teach | lamps | switch lamps |
| 23 | 2 | 6 | Two ways to start | teach | blocks, stage | tap the flag or the crab |
| 8 | 3 | 2 | Repeat with a count | teach | program, turtle | run |
| 9 | 3 | 3 | A square, a rectangle, a staircase | teach | turtle, program, codepad | build a rectangle |
| 10 | 3 | 1 | Reading a program someone else wrote | teach | program, tracetable, maze | run, guess |
| 11 | 3 | 5 | A program that makes a decision | teach | program, fork | the path lights |
| 24 | 3 | 8 | Sorting cards two at a time | teach | sortcards | compare and swap |
| 25 | 3 | 8 | Finding a number in the fewest lifts | teach | cups | lift cups |
| 26 | 3 | 5 | A robot that feels for walls | teach | blocks, maze | run |
| 27 | 3 | 3 | A picture with a repeat | teach | program, pixels | rows paint in turn |
| 12 | 4 | 2 | A repeat inside a repeat | teach | program, grid, turtle | run |
| 13 | 4 | 7 | A number that changes | teach | program, variable | the box changes |
| 14 | 4 | 1 | Writing a program for someone else | teach | turtle, codepad | build the steps |
| 15 | 4 | 4 | Debugging puzzles | puzzles | blocks, program, turtle | run against the target |
| 28 | 4 | 8 | A sorting network | teach | sortnet | walk it a bridge at a time |
| 29 | 4 | 9 | A block of your own | teach | blocks, dance, maze | the robot dances |
| 35 | 4 | 9 | A block with a number (17 September 2026) | teach | program, turtle | the turtle shows the square to draw |
| 30 | 4 | 7 | Trace it in a table | teach | program, tracetable | the table fills |
| 31 | 4 | 5 | Keep going until | teach | blocks, maze, codepad | build a program that feels its way |
| 36 | 5 | 1 | A list a program keeps (28 September 2026) | teach | program, listbox, maze, codepad | build moves from the list's items |
| 37 | 5 | 2 | A repeat that goes through a list | teach | program, maze, turtle, listbox, codepad | build a spiral from a list |
| 38 | 5 | 3 | A running total | teach | program, variable, tracetable, maze, codepad | order the cards of a count |
| 39 | 5 | 4 | Polygons from a turtle | teach | program, turtle, codepad | build any regular polygon |
| 40 | 5 | 5 | Conditions joined with and and or | teach | program, fork, maze, codepad | build a count with and |
| 41 | 5 | 6 | Random numbers and a fair die | teach | program, maze, codepad | order cards that work for every roll |
| 42 | 5 | 7 | A block of your own with two inputs | teach | program, maze, turtle, variable, codepad | build the block and its two calls |
| 43 | 5 | 8 | Searching a list, one by one and by halving | teach | program, listbox, cups, maze, codepad | lift cups, build a search |
| 44 | 5 | 9 | Debugging puzzles | puzzles | program, turtle, codepad | run against the target, fold into a list |
| 45 | 6 | 1 | Reading a program written as text (28 September 2026) | teach | program as text, blocks, maze, turtle, codepad | build the text's program in blocks |
| 46 | 6 | 2 | A program that cools the cocoa | teach | program as text, variable, tracetable, thermometer, turtle, codepad | build the cooling graph |
| 47 | 6 | 3 | A decision inside a decision | teach | program as text, listbox, maze, codepad | build a rover that decides twice |
| 48 | 6 | 4 | Simulating a tank filling | teach | program as text, variable, tracetable, linegraph | the table fills minute by minute |
| 49 | 6 | 5 | Two sorts compared by counting their steps | teach | program as text, sortcards | compare and swap |
| 50 | 6 | 6 | A block that uses itself | teach | program as text, turtle, codepad | the turtle draws the tree |
| 51 | 6 | 7 | An orbit, step by step | teach | program as text, turtle, tracetable | the orbit is drawn a step at a time |
| 52 | 6 | 8 | The fewest steps for the same task | teach | program as text, maze, codepad | build in the fewest blocks |
| 53 | 6 | 9 | Coding puzzles | puzzles | program as text, turtle, codepad | run against the target |
| 54 | 5 | 5 | The same steps three ways (29 September 2026) | teach | flowchart, program, maze, codepad | build the program a flowchart draws |
| 55 | 5 | 8 | When something happens: events and messages | teach | program, stage, flowchart, maze, codepad | build two scripts joined by a message |
| 56 | 6 | 3 | A program that watches and switches | teach | program as text with sensors, flowchart, thermometer, table | read the heater's minutes from the program |
| 57 | 6 | 8 | Which inputs would catch the bug: test cases | teach | program as text, lander, rocket | choose the inputs that catch a planted bug |

That is nine lessons in each grade, grade three's ninth being the thinking lesson moved in from
logic (`thinking-in-words`), and two more in each of grades five and six from the gaps the audit of
those grades found (`.docs/grades-5-6.md`, "The gap lessons"): flowcharts, events and messages,
sensors with feedback, and test cases. Every lesson but Instructions for a snack, which is about exact steps
written in words, has at least one scene that runs or can be played with on screen, eight have a
build task, and all of them print on squared paper in black and white.

## What changed in the fifteen

All fifteen keep their ids and their place in the track, and each was rewritten on the new blocks.
Lessons one and two now pair picture blocks with the maze, and the look scene runs; lesson three
adds a set of cards to put in order so the robot reaches the flag. Lesson four is now about turning,
with forward and turn blocks, a robot whose heading can be seen, and a build task with turns. Lesson
five ends with a build task whose slots are too few for the long way, which is a reason to want a
repeat. Lesson six draws with forward and turn and ends by building a square in three blocks. Lesson
seven's exercises are proved to have one bug each, and its try is the three-sided square the 2026
standards use as their example. Lesson eight's staircase and lesson nine's shapes run on the rebuilt
turtle, and lesson nine ends by building a rectangle with a repeat of two. Lesson ten traces a
stranger's program in a trace table. Lesson eleven draws its decision as a fork in a path. Lessons
twelve and thirteen use the listing and the variable box, and their answers are now worked out by
running the program. Lesson fourteen keeps the program a grown-up marks and adds one the machine
marks. Lesson fifteen's three puzzles are proved: the wrong count, the nested count and the one wrong
line.

Units moved where the new unit list asked: "A number that changes" is now unit 7, names, and
"Writing a program for someone else" unit 1. The old robot grid drawing, `codegrid`, is gone, with
its registry entry, its renderer and layout cases and its shelf line, because the maze does
everything it did and more; `inequality` remains in one item, where the threshold is still fixed at 6
for the reason tracks.md records.

## The order to build the rest

1. Record the `answered` event for real when the kids app records anything, with `tries`, and show a
   parent the runs before a right answer as the evidence of trying again.
2. A free play page where a child builds anything in a maze, a stage, a dance or a tune with no task,
   and can save it and show it, which is the making the research argues for and the lessons only
   start.
3. Let a child draw their own character for the stage with the drawing pad, which ScratchJr's usage
   suggests matters more than anything else about the stage.
4. Done for the interpreter (28 September 2026): a child's own block reads its inputs, `define box
   width height`, and grade five's lessons run it. The grade four lesson A block with a number (17
   September 2026) still teaches the idea on paper, with `define square size` in listings that are
   drawn and not run. A listing is drawn line by line and
   never run, so it prints as written. The grade one lesson A pattern that never ends wrote `repeat
   for ever` and a lamp's `light red` the same way until the two blocks landed on 17 September 2026;
   the interpreter now reads both, so its programs run and are watched.
5. Done for the interpreter (`engine/coding.ts`, 16 September 2026), and for the runner, the toys and
   the editor's numbers (`engine/ui/`, 28 September 2026); prediction, stage events, drag in the
   editor and sound are still the scratchpad's.

## Open questions

Whether a build task's key program should be required rather than optional. The prover finds a
program for every task written so far, but its repeat search is bounded, and an author writing a
harder task would get "no program found" when one exists.

Whether the unified games engine should take over the runner's frame loop. The runner uses the
engine's ticker, springs and timeline and nothing else; if the merged engine's fixed step loop and
layered field make a runner cheaper to maintain, the runner should move onto them rather than keep a
parallel path.

Whether a child's program should also be kept when it is not an answer, so they can come back to a
dance or a picture. That is a product decision about what a child owns, and the data model does not
have a place for it yet.

Whether a goal should judge a program that never ends. `meets` asks that a run stopped at `end`, so a
program built on `repeat for ever` is never done, however right its lights are: it stops at the step
limit, which is what any endless program does. That is the honest answer for a goal that asks where
the robot finished, and it is why the grade one lamp lesson asks its questions about a printed
program rather than as a build task. A build task on `repeat for ever` would need a goal of another
kind: one that reads the cycle the run produced within the frame limit, such as the first n lights
matching a given sequence, or the repeat's body drawing one round of a pattern, and counts the limit
frame as the end rather than as a failure. Nothing needs it today, and the shape above is what it
would take. It is a proposal, not planned work.

## Sources

Standards and curricula:

- CSTA and WestEd, 2026 CSTA PK-12 Computer Science Standards, https://csteachers.org/2026-csta-pk-12-computer-science-standards/: the grade by grade standards and their boundaries.
- CSTA, K-12 Computer Science Standards, revised 2017, https://csteachers.org/wp-content/uploads/2025/03/csta-k-12-computer-science-standards-revised.pdf: levels 1A and 1B.
- Department for Education, National curriculum in England: computing programmes of study, 2013, https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study: key stages one and two.
- ACM, Code.org, CSTA and others, K-12 Computer Science Framework, 2016, https://k12cs.org/: grade band statements.
- Code.org, CS Fundamentals, https://code.org/educate/csf: course sequence, direction blocks, the four bug types, graph paper programming.
- National Centre for Computing Education, pedagogy principles and the Teach Computing curriculum, https://teachcomputing.org/pedagogy: unplug, unpack, repack, and the unit sequence by year.
- University of Canterbury, CS Unplugged, https://www.csunplugged.org/en/topics/: Kidbots, binary numbers, searching, sorting networks, colour by numbers.
- Barefoot Computing, computational thinking concepts and approaches, https://www.barefootcomputing.org/: the six concepts and five approaches.

Research:

- Raspberry Pi Foundation, The Big Book of Computing Pedagogy, 2021: PRIMM, semantic waves, and Grover's summary of misconceptions.
- Sentance, Waite and Kallia, Teaching computer programming with PRIMM, 2019 (abstract only).
- Lee and others, Computational thinking for youth in practice, 2011 (abstract only): use, modify, create.
- Waite, Pedagogy in teaching computer science in schools, Royal Society, 2017.
- Brackmann and others, 2017; del Olmo-Muñoz and others, 2020; Hermans and Aivaloglou, 2017; Chen and others, 2023; Huang and Looi, 2021 (abstracts only): unplugged and plugged work.
- Relkin, de Ruiter and Bers, Learning to code and the acquisition of computational thinking, 2021; and TechCheck, 2020.
- Flannery and others, Designing ScratchJr, 2013; Blake-West and Bers, ScratchJr design in practice, 2023; Leidl, Bers and Mihm, ScratchJr user analytics, 2017; Unahalekhaka and Bers, 2021 and 2022; Govind, Relkin and Bers, 2020; Strawhacker and Bers, 2015; Bers, Coding as another language, 2019. All at https://sites.bc.edu/devtech/.
- Resnick and others, Scratch: programming for all, 2009; Resnick and Silverman, 2005; Resnick, 2007; Brennan and Resnick, 2012.
- Papert, Mindstorms, 1980.
- Moreno-León, Robles and Román-González, Dr. Scratch, 2015.
- Rigal, 1994 and 1996 (abstracts only): left and right.
- Angeli and Valanides, 2020; Rich and others, 2019; Zapata-Cáceres and others, 2020 (abstracts only).
