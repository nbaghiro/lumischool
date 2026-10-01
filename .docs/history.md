# History

Status: decided on whose history, 29 September 2026; written 30 September 2026, as the section
"What is built" says: 42 world strand lessons and a national unit a grade for each of the five
countries, 72 lessons in all, with the checker, the dated record and eight new drawings. This
document plans a history and social studies track for grades one to six, hosted at the old tower: what
schools in Japan, China and Russia teach under that heading at each grade, with England and the US
beside them; the owner's decision on whose history; the principles the track
would follow; how a history question is proved by the verifier or marked by a grown-up; a scope and
sequence for each grade; the drawings it needs; where it sits in the code and on the map; what it
costs; and the order to build it in. It takes over from the sketch under "History, for the old tower" in
[tracks.md](tracks.md), which planned twelve lessons for grades two to five.

The short version is that history is the largest subject we do not teach and the one closest to the
platform. Japan gives social studies about three periods a week at grades five and six and Russia
gives history three hours a week (the subjects audit, `.scratchpad/grades56/audit/subjects.md`,
section 1, quoted), and both start it earlier. Most of what a child of five to twelve learns in
history can be proved the way maths is: the order of events,
the years between two dates, which century a year is in, what could not have been in a picture of a
given year, which of two sources was written by someone who was there. What cannot be proved (why
something happened, what it was like to live then) is marked by a grown-up, as a written piece is
now. We plan 48 lessons, six a grade at grades one and two and nine a grade at grades three to six,
built from a shared world strand told through everyday life, with a national unit each year from a
set the family chooses (Britain, the USA, Japan, Russia and China to start).

## What the old tower already has

The old tower (`school/worlds/tower.ts`) is a built world: a round stone tower on a crag whose courses
are laid in the order things happened, with a sundial, a chest, a lantern, a bridge and a signpost, an
owl, a fox and rabbits, and a flag that flies from the top again as its moment. It is a track place,
`site.kind: "track"`, whose `hosts.subjects` already names `history`, with a `needs` sentence asking
for timelines, then and now, old maps, reading old writing and how a place changed. Its themed
visits, `old-tower:g1:v1` to `old-tower:g6:v1` in `school/worlds/journeys.ts`, exist with no lessons.
Until it has lessons it stands once, on the first year's land, and is not on a child's map
([overworld.md](overworld.md)).

The thing that held a history strand back is fixed. Adding a strand used to move other lessons
between terms, because the year builder placed a strand lesson by how far it was through its strand;
since 28 September 2026 `hostsOf` in `school/year.ts` places each lesson in the term its own unit
names, so a history lesson with a unit lands in its term and moves nothing else
([tracks.md](tracks.md), "History, for the old tower").

## What schools teach

Japan (社会, social studies). Taught from grade three, after 生活科 (life environment studies) in grades
one and two, which covers the child's school, family and neighbourhood (recalled). The Course of Study
moves outwards a grade at a time: grade three the child's own town and city, its shops, farms and
factories and how it has changed; grade four the prefecture, its water, waste, disasters, traditions
and the people who built it (recalled); grade five Japan's land and climate, its farming, fishing and
industry, information and the environment; grade six politics and the constitution, the history of
Japan from the first rice farmers to the post-war years told through people and cultural heritage,
and Japan in the world (subjects.md, from the MEXT page it read, which may be the 2008 edition, and
recalled). At grades five and six it is 100 and 105 periods of 45 minutes a year, about three a week
(subjects.md, quoted from the law's hours table).

China. History and geography are subjects from grade seven (义务教育课程方案 2022, as subjects.md read
it, quoted). Below that, 道德与法治 (morality and law), two periods a week at grades five and six in
Hunan's example (quoted), carries the social content: the child's home and school, the homeland's land
and peoples, traditional culture, and at grade five units on China's history from ancient inventions
to the modern era (recalled from the textbook series, to be checked against the 2022 standard for
道德与法治, which has not been fetched).

Russia. In grades one to four, «Окружающий мир» (the world around us) has a strand «Человек и
общество»: family, the native land, Moscow, and in grade four pages of the country's history
(recalled). From grade five history is its own subject, three hours a week in grades five and six in
variant one of the federal curriculum (subjects.md, quoted): grade five the ancient world (the first
people, Egypt, Mesopotamia, India, China, Greece and Rome), grade six the middle ages and the history
of Russia from Rus to the end of the fifteenth century (recalled; the federal work programme for
history has not been fetched). Geography is a subject from grade five, one hour a week, and
обществознание (civics) in grade nine only in the edition subjects.md read.

England. History is compulsory from key stage 1 (the national curriculum framework, quoted in
subjects.md). At key stage 1: changes within living memory, events beyond living memory that are
significant nationally or globally, the lives of significant individuals, and significant places and
events in the child's own locality. At key stage 2: from the Stone Age to the Iron Age, the Roman
Empire and Britain, the Anglo-Saxons, Scots and Vikings, a local study, a theme beyond 1066, the
earliest civilisations (Sumer, the Indus valley, ancient Egypt, the Shang dynasty), ancient Greece,
and one non-European society around the year 900 (early Islamic Baghdad, the Maya, or Benin). All
recalled, to be quoted from the programme of study.

The United States. Social studies grows outwards from the child in most states: self and family,
school and community, the local region, the state, the United States to about 1800 at grade five, and
the ancient world at grade six (recalled, from California's History-Social Science Framework and
the C3 Framework; California's Education Code 51210 lists social sciences for grades one to six,
quoted in subjects.md).

What they share, at our ages:

| Our grade | What all or most teach |
|---|---|
| 1 and 2 | The child's own past and family, then and now, school and home long ago, a few people and events beyond living memory, the calendar and the order of things |
| 3 and 4 | The local place and how it changed, maps of it, the region; the earliest people and civilisations (England and, a year later, Russia) |
| 5 | The country's land and how people live from it (Japan); the ancient world (Russia); a society around the year 900 (England) |
| 6 | The country's history and how it is governed (Japan); the middle ages and the country's own early history (Russia); modern history in China from grade seven |

Every one of them weights the child's own country heavily, which is where the decision below comes
from.

## Whose history

Decided by the owner on 29 September 2026: a shared world strand told through everyday life, and a
national unit each year from a set the family chooses. The set starts with Britain, the USA, Japan,
Russia and China.

The world strand is most of each year and the same for every family. Each period is shown in several
places at once through the things every family knows: homes, food, work, school, travel, writing,
money and rules, so a lesson on the year 1000 visits Baghdad, Kaifeng, Kyoto, Kyiv and Benin rather
than one kingdom. It carries the methods (timelines, sources, maps, then and now), avoids telling one
nation's story in a product used in many countries, and fits the worlds, which are not any real
country.

The national unit is one lesson a grade, from grade one, written for each country in the set and
closest to what that country's schools teach at that grade. The family chooses the country, the
tower shows the unit for it, and a family whose country is not yet in the set has the world strand
alone, with the grade's lesson count one lower. The set grows one country at a time, each with an
adviser who knows that country's curriculum.

### How a family's national unit is chosen

A parent chooses the country on the account page, under the family's details, from the set above or
none. The choice is a `setting-changed` event with the key `nation`, written against the family
rather than a child, and the latest one wins ([db.md](db.md), "The log"). Until a family chooses,
it has no national unit: its children read the world strand, which every child is shown whatever the
setting. A national unit is a history lesson whose header names its country, `nation=britain`
([notation.md](notation.md), "Subjects and variants"), and `forChild` in `school/year.ts` shows it
only to the children of a family whose setting names the same country, in the year, the plan, the
calendar and at the tower. Explore shows every country's units with the country beside each, and can
be narrowed to one. Changing the country changes which unit is planned from then on; work already
done in another country's unit stays in the record.

The two options set aside were the world strand alone, which misses what schools weight most at
these ages, the child's own country, and a strand for each country, which costs about 48 lessons a
country and puts every year inside national accounts that schools in different countries tell
differently. The coins drawing is of quarters, dimes, nickels and pennies, and money questions are in
dollars, so a product with no national choice reads as American by default; the national units carry
their own coins, and the world strand uses coins of the period it shows.

## What is built

Written on 30 September 2026. The files are `content/curriculum/lessons/history-01-...` to
`history-42-...` for the world strand, and `history-g<grade>-<country>-...` for the national units,
with their items in `content/curriculum/items/history-*.lumi`. Each lesson carries its `unit=`, so it
lands in its term: units 2 and 3, 5 and 6, 8 and 9 at grades one and two, and 1 to 9 at grades three
to six. The national unit is unit 9 at every grade and carries `nation=`.

| Grade | World strand | National unit (one for each of Britain, the USA, Japan, Russia, China) |
|---|---|---|
| 1 | My own timeline; toys old and new; a street then and now; when my grandparents were small; getting about | Our flag, our capital, our festival |
| 2 | A hundred years in tens; the first flight, 1903; two great fires; two lives that changed what we know (Mary Anning, Marie Curie); reading an old picture | A life that changed things: Florence Nightingale, Rosa Parks, Ino Tadataka, Yuri Gagarin, Yuan Longping |
| 3 | Stone, bronze and iron; the first farmers; layers in the ground; the first cities; the first writing; before and after year one; our place long ago; an old map and a new one | Our country long ago: Skara Brae and Stonehenge, Cahokia and Mesa Verde, tools at home, the Golden Ring's towns, China's first farmers |
| 4 | Ancient Greece; Rome; Ashoka and the digits; China's first empire; the Silk Road; money; alphabets, characters and kana; a source and who made it | Pages of our history: Roman Britain, a new nation, keeping safe from earthquakes, pages of Russia's history, inventions that changed the world |
| 5 | The world in the year 1000; castles and walled cities; books copied and printed; continents and capitals; where our food comes from; how a town is run; ships and maps; two accounts of one voyage | Our country in its time: Alfred to the Domesday Book, life in the colonies, Japan's land, birch-bark letters, great works of water and stone |
| 6 | Mills, canals and railways; a day in 1850 and 1950; inventions in order; the twentieth century through families; a connected world; the race to space; laws and votes; countries working together | How our country is governed |

The national units share their items: each item takes `n` (0 the United Kingdom, 1 the United
States, 2 Japan, 3 Russia, 4 China) and each country's lesson pins its own, so one set of questions
serves five countries and a new country is a new column of data. Each national lesson also reviews
three of the grade's world questions, which is what gives its levels room to differ.

The record is `engine/notation/chronicle.ts`: every event, object and invention a lesson names, with
its year or span, whether it is known only roughly, and where the date was read, and every source a
source card shows, with who made it, when, where and whether they were there. The checkers are in
`engine/notation/history.ts` (`history.dates`, `history.street`, `history.sources`, `history.town`,
`history.world`, `history.family`, `history.vote`), with tests in
`engine/notation/__tests__/history.test.ts`. A lesson that names an event the record does not hold,
or draws a year the record disagrees with, does not compile; a date given as a span or as "about" is
never asked exactly, and events whose spans overlap are never put in order.

The new drawings, each with its catalogue entry and shelf grouping: `thenandnow` (a street at a
year, with things whose first dates the record holds), `familytree`, `objectcard` (a museum label
whose objects include the coins through time), `worldmap` (continents, oceans, cities and three
voyages), `townmap` (a made-up market town at any year), `council` (a vote by hands or ballot box),
`toys`, and `flags` (the five countries' flags). The timeline gained years before year one, written
BC and AD, with no change to its defaults. The period clothes, the old page and older ship rigs were
not drawn; the lessons use the shelf's people, passages and letters instead.

Grown-ups mark what the machine cannot prove: a grandparent's questions, a family's own source, a
letter home, a walk for clues, a museum card for an old thing at home. These use `writing.by-eye`
and `art.by-eye` with their notice lists.

## Principles

- A date is data. Every event, object and source a lesson names comes from one table, with its year
  or its range and where the date comes from, and the verifier refuses an event without a source. A
  date historians disagree on is given as a range or as "about", and no question asks for it exactly.
- A source is data too. A letter, a diary, a map, a coin or a newspaper is recorded with who made it,
  when, where, and whether they were there, so "which of these was written by someone who saw it" is
  proved from the record, as a physics answer is proved from its drawing.
- History is people's lives first. Kings and battles appear where a child needs them to follow what
  happened, but a lesson's picture is a street, a kitchen, a school or a harbour at a stated time.
- No verdicts on contested questions. A child is asked what a source says, who wrote it and why two
  accounts differ, never which side was right in a dispute that is still argued. Wars are told
  through the families who lived through them, and the grown-ups note says which lessons touch them.
- The same squared paper, the same drawings and the same difficulty model as every subject: a way in,
  a core, a two-star reason and a three-star question with no method on the page.
- Judgement stays with a person. Why something happened, what a person then might have felt, and a
  child's own account of their family's past are marked by a grown-up, never by a model
  ([ai.md](ai.md)), and a family's own history stays in the family's record.

## How a history question is proved or marked

A checker, `history.*`, in `engine/notation/history.ts` beside `physics.ts` and `chemistry.ts`, reads
the table of events, objects and sources and answers:

- `order`: the order of a set of events, and `before` and `after`.
- `between`: the years from one date to another, across year one with no year nought, which is where
  history meets negative numbers.
- `century`: the century a year falls in, and the decade.
- `could-not`: which thing in a picture of a given year could not have been there, from each object's
  first date (a bicycle in 1750, a telephone in 1850).
- `first-hand`: which of a set of sources was made by someone who was there, from the record.
- `older` and `newer`: which of two objects or pictures is older, from their dates.
- `where`: which square of an old map a place is in, and which way it lies, through the checks the
  map lessons already use.

What cannot be proved is marked by a grown-up with the `notice` list that the gap lessons of grades
five and six also need ([grades-5-6.md](grades-5-6.md), "What the platform needs"): a paragraph on why
the city was rebuilt in stone, a diary entry written as a child in 1850, questions put to a
grandparent and their answers. The grown-up's response is a `responded` event with the points of
the list they saw.

## Scope and sequence

Six lessons a grade at grades one and two, two a term, and nine a grade at grades three to six,
three a term: 48 lessons. Each carries a `unit=` in its term's units, so it stands in that term's
world as well as at the tower, and the tower's path at each grade is that grade's history lessons in
order. One lesson a grade, from grade one, is the national unit, and the grade's lesson count stays
the same whichever country in the set the family chooses.

### Grade one: my past and my family's

| Term | Lessons |
|---|---|
| 1 | My own timeline: yesterday, today, tomorrow, and my life in years; toys old and new, put in order |
| 2 | Homes then and now, from two pictures of one street; school when my grandparents were small, with three generations of a family as a tree and questions to ask a grown-up |
| 3 | Getting about: horse, train, car and plane in the order they came; the national unit: my country's flag, its capital and a festival it keeps |

### Grade two: beyond living memory

| Term | Lessons |
|---|---|
| 1 | A hundred years in steps of ten on a timeline; the first flight, 1903 |
| 2 | A great fire and the city rebuilt, London in 1666 beside Edo in 1657; two lives that changed what we know, such as Mary Anning's fossils |
| 3 | Reading an old picture: what is the same and what is different; the national unit: a person from my country's past who changed how people live |

### Grade three: the first people and the first cities

| Term | Lessons |
|---|---|
| 1 | Stone, bronze and iron: tools in the order they came; the first farmers; how we know, from layers in the ground |
| 2 | The first cities and the first writing: Sumer, Egypt, the Indus valley and Shang China; counting years before and after year one; centuries |
| 3 | Our own place long ago, a local study with a grown-up; an old map of a town beside a new one; the national unit |

### Grade four: the ancient world

| Term | Lessons |
|---|---|
| 1 | Ancient Greece: a city that voted, the games, and the stories it told; Rome: roads, an empire and what it left behind; India under Ashoka, and the digits we still write |
| 2 | China's first empire: the Qin, the wall, the Han and paper; the Silk Road and what travelled along it; money from shells to coins to paper |
| 3 | Writing systems: alphabets, characters and kana; a source and who made it, and whether they were there; the national unit |

### Grade five: around the year 1000, and how people live from the land

| Term | Lessons |
|---|---|
| 1 | The world in the year 1000: Baghdad's House of Wisdom, Song Kaifeng, Heian Kyoto, Kyiv and Benin; castles and walled cities (the old city); books copied by hand and books printed, from Bi Sheng's type to Gutenberg's |
| 2 | Continents, countries and capitals on a world map; where our food comes from: farming, fishing and trade, as Japan's grade five teaches it; how a town is run: a council, its rules and its budget |
| 3 | Ships and the maps they drew, from Zheng He to the first voyage round the world; reading two accounts of one voyage; the national unit |

### Grade six: machines, the modern world and how a country is governed

| Term | Lessons |
|---|---|
| 1 | Mills, canals and railways: the machines that changed work (the canal town and the waterfall gorge); a day in a family's life in 1850 and in 1950; inventions put in order and what each replaced |
| 2 | The twentieth century through families: two wars and what they did to homes and children, told from diaries and letters; a world connected by the telephone, the radio and the first computers; the race to space, from 1957 to the moon in 1969 |
| 3 | How laws are made and what a vote is; countries working together, and the United Nations; the national unit |

The grade five and six lessons meet the fifth and sixth year's worlds where the worlds give them a
place: the old city's walls and library for castles and books, the canal town's lock and mill and the
waterfall gorge's wheel for the machines, and the moon for the race to space. Human geography
(countries, farming, trade) comes in at grade five because Japan teaches it there and no subject of
ours does; physical geography stays where it is, in nature, physics, chemistry and maths.

## The drawings

On the shelf already: the timeline, the sequence strip, the story map, the comic, the picture cards,
the grid map, the compass, the map key, the map scale and title, the canal map, the signpost, the
round tower, the city walls, the temple, the library, the hall, the great clock and the clock tower,
the cottage, the houses and the street, the barn, the windmill and the water wheel, the printing
press, the train, the carriage and the ship, the canal lock, the rocket, the lander, the flag and the
footprints, the strata, the fossil and the dig, the chest, the calendar, the sundial and the year
wheel, the book, the passage, the letter page, the postcard, the envelope and the stamp, and the
people.

New, each with its catalogue entry, shelf grouping and description in the change that adds it:

| Drawing | What it draws, and the settings a question varies | Lessons |
|---|---|---|
| Then and now | one street at a chosen year (1850, 1900, 1950, today), each thing in it carrying the year it first appeared, so `could-not` is proved from the drawing | then and now, reading an old picture, a day in 1850 |
| An old page | a page of old handwriting or print with its date, for reading an old letter or a diary; tracks.md noted it missing | sources, diaries, the twentieth century |
| Object card | a museum label: the object, what it was for, when and where it was found | the first people, money, the Silk Road |
| Family tree | three or four generations with years of birth, any box left blank | a family tree, a family's day |
| World map | the continents and oceans, and the countries with their capitals, any name left blank | continents and countries, the year 1000, ships |
| Period clothes | the people kit dressed for a chosen period, so a figure's clothes date a picture | then and now, every period |
| Coins through time | a shell, a bronze coin, a coin with a hole, a paper note, with dates, in place of the dollar coins | money, the national units |
| Vote and council | a ballot box and a count, and a council at its table | how a town is run, how laws are made |
| Source card | who made it, when, where, and whether they were there; shared with the grade six research report | sources, two accounts |

Two drawings gain a setting whose default leaves them as they are: the timeline's years may be before
year one, written BC and AD (its `from` stops at 0 today), and the ship gains older rigs for the
voyages.

## Where it sits

- In the code: `history` is in `TRACK_IDS` in `school/tracks.ts` at one day a week from grade one
  in `DEFAULT_TRACKS` (30 September 2026), a lesson header says `subject=history` and a national
  unit adds `nation=`, and the checker registers as the other subjects' do. A lesson
  with no drawing to point at raises the `WORDS_ONLY` ratchet with its reason, as reading does.
- On the map: the tower's `needs` sentence goes in the change that lands its first lessons, its
  reaches are rewritten against the history skills (`history.order` for the courses of stone, the
  chest for coins through time, the signpost for old maps, the sundial for calendars), and its themed
  visits are chosen from the lessons. The term worlds gain history reaches where they have a landmark
  for it, all in one world change with one tile rebuild.
- On the grid: history is a strand like nature, on top of the 28 lessons a term of grades one to four
  and the 36 of grades five and six, so a term becomes 30 at grades one and two, 31 at three and four,
  and 39 at five and six. [curriculum.md](curriculum.md) ("The grid") left history outside the grid
  for this reason, as a decision about the product rather than about counts.

## What it costs

- Writing: 48 lessons and the table of events, objects and sources behind them, with a source for
  every date; nine new drawings and two settings first; and six national unit lessons for each
  country in the set, one a grade, with an adviser for each.
- Time: two or three more lessons a term for a family doing everything. The default plan gives
  history a day a week from grade one if the owner wants it on by default, which the test that no day
  has more than two subjects has to allow.
- The index: 48 more lessons at about 128 bytes each, about 6,100 bytes, which with the gap lessons
  of grades five and six takes it to about 76,800 of a 75,000 budget, so the budget is raised with its
  reason or the index is trimmed, as [grades-5-6.md](grades-5-6.md) already proposes measuring.
- Review: history is where a wrong fact does the most harm to trust, so every lesson is read against
  its sources by a second reader before it lands, as the batch process already requires.

## The order to build it in

1. The owner's decision on whose history: made, the world strand and a national unit a year.
2. The table of events, objects and sources, and the `history.*` checker with its tests.
3. The drawings and the timeline's years before year one.
4. Grades one and two, then three and four, then five and six, a grade's lessons in one batch, each
   quoting the lines marked recalled above before it lands.
5. The tower's reaches, its themed visits and the term worlds' history reaches, in one world change
   with one tile rebuild.
6. The national units, one country at a time, from Britain, the USA, Japan, Russia and China.

## Decisions for the owner

- Six and nine lessons a grade, as proposed, or fewer to start.
- Whether history is on by default in the plan from grade one.

## Sources

Quoted through the subjects audit, `.scratchpad/grades56/audit/subjects.md`, which read these:

- Japan, 学校教育法施行規則 別表第一, the hours table: https://laws.e-gov.go.jp/law/322M40000080011
- Japan, 小学校学習指導要領 社会, the MEXT page, which may be the 2008 edition:
  https://www.mext.go.jp/a_menu/shotou/new-cs/youryou/syo/sya.htm
- China, 义务教育课程方案（2022年版）: http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582343217634.pdf,
  and Hunan's example timetable:
  http://jyt.hunan.gov.cn/jyt/sjyt/xxgk/tzgg/202210/t20221025_1081738.html
- Russia, ФОП ООО, section 167, variant one:
  https://sudact.ru/law/prikaz-minprosveshcheniia-rossii-ot-18052023-n-370/federalnaia-obrazovatelnaia-programma-osnovnogo-obshchego/iv/167/
- England, the national curriculum framework:
  https://www.gov.uk/government/publications/national-curriculum-in-england-framework-for-key-stages-1-to-4/the-national-curriculum-in-england-framework-for-key-stages-1-to-4
- California Education Code 51210:
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=51210

To be fetched and quoted before the lessons are written:

- Japan, 小学校学習指導要領（平成29年告示）解説 社会編, and 生活科 for grades one and two.
- China, 义务教育道德与法治课程标准（2022年版）.
- Russia, the federal work programmes «Окружающий мир» 1-4 and «История» 5-9 on edsoo.ru.
- England, the history programmes of study for key stages 1 and 2.
- The United States, the C3 Framework for Social Studies State Standards, and California's
  History-Social Science Framework.

Read for the lessons on 30 September 2026:

- England, the history programmes of study for key stages 1 and 2, and the geography programme, on
  gov.uk: the lines quoted in the grown-ups notes were checked against the page.
- Japan, 学習指導要領 社会 on the MEXT page above, which is the 2008 edition; every quotation says so.
  The 2017 edition was not read.
- Russia, the federal work programme for history, grades 5 to 9 (edsoo.ru, the 2023 edition):
  https://edsoo.ru/wp-content/uploads/2023/09/frp_istoriya_5-9-klassy-1.pdf
- China, the 2022 standard for 道德与法治 was not read; where a note names the 统编版 textbook it
  says it is recalled.
- Dates: the Smithsonian National Air and Space Museum (the 1903 Wright Flyer), the Natural History
  Museum (Mary Anning), the United Nations (its founding), and otherwise Wikipedia, read as a quick
  check. Each entry in `engine/notation/chronicle.ts` says which, and whether the date was read or
  recalled; the Wikipedia dates are still to be confirmed against Britannica, which refused automated
  reading, and the recalled ones (22 of about 200, marked) are to be checked first.
