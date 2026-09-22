# The piano, as a class teaches it

Status: proposed, September 2026. Extends [sound.md](sound.md), which built the keyboard, the staff, the beat track, the judges and guided playing, and planned ten music lessons. Built in the scratchpad with this document: the `hand`, `grandstaff` and `dynamics` drawings and new settings on `piano` and `notes` in `src/art/music.ts`, four new sections on `music.html`, and four lessons. The guitar and the ukulele are in [guitar.md](guitar.md).

## Summary

We read how children of five to ten are taught the piano in the method books families and teachers use most (Faber Piano Adventures, Alfred, John Thompson, Suzuki, Piano Safari) and in the early grades of three examining boards (Trinity, the Royal Conservatory of Music and ABRSM), and set what our piano does against it. The keyboard, the staff and the guided playing we have are sound, and they cover a narrow slice: the white keys and middle C, the treble staff from middle C to G, counting a bar, five fingers of the right hand, and scales and intervals shown on the page. What every method teaches in its first year and we did not have is finger numbers on both hands, the left hand and the bass staff, the grand staff read from landmark notes, steps and skips as a way of reading, rests, dotted notes and three beats in a bar, and loud and soft. After that come articulation, moving between hand positions, the first chords and accompaniment, a little pedal, and the three habits every syllabus tests beside pieces: sight reading, playing back by ear, and making something up.

We built the first of these: the drawings a first year needs, four sections on the music page that play them, and four lessons (finger numbers and C position, steps and skips, loud and soft, and the grand staff and its landmarks). The rest of the extension is designed below, with the order to build it.

## How early piano is taught

This section rests on about ninety pages of publishers' descriptions, syllabus documents and teachers' writing, listed at the end. ABRSM's own site and Bastien's publisher refused automated reading, so ABRSM's scale and aural details come from a teacher's reviews and Bastien is not described.

### The method books

Faber Piano Adventures has a pre-reading course for ages five and six, My First Piano Adventure, and a main course from Primer to Level 5 for ages six to eleven, though its Primer page says seven to eleven ([Faber levels](https://pianoadventures.com/piano-adventures/); [Primer](https://pianoadventures.com/piano-books/basic-piano-adventures/primer/)). The first book teaches high and low, the white keys by name and pieces on the black keys, with audio of children singing as a practice partner; the second moves to the staff by steps; the third adds skips ([Book A](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-a/); [Book B](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-b/); [Book C](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-c/)). Primer brings the grand staff, the C five-finger scale and steps and skips, and already uses the damper pedal for colour ([Primer lesson book](https://pianoadventures.com/product/piano-adventures-primer-level-lesson-book-2nd-edition/)); its first staff note, middle C, is played with fingers 1, 2 and 3 of either hand so no finger gets tied to a key ([Faber blog](https://pianoadventures.com/blog/2017/05/09/all-three-on-middle-c/)). Level 1 has the whole grand staff, tonic and dominant and intervals to the fifth; Level 2A the five-finger positions in C, G, D and A, major and minor, and the first quavers; Level 2B scales and the chords I, IV and V7 in C, G and F ([Level 1](https://pianoadventures.com/product/piano-adventures-level-1-lesson-book-2nd-edition/); [2A](https://pianoadventures.com/blog/2016/01/31/level-2a-pattern-recognition-and-five-finger-scales/); [2B](https://pianoadventures.com/blog/2016/01/30/level-2b-the-power-of-primary-chords/)).

Alfred's Basic Piano Library sets out Lesson Book 1A page by page: sitting, hand position and finger numbers on the first pages; the black keys, used so that no finger number is tied to a key; then the white keys as letter notes and middle C position with 4/4, 3/4, the dotted minim and mf; then the grand staff, intervals from the second to the fifth, legato, slurs and ties, G position, staccato, and crescendo and diminuendo by the last pages ([Alfred's Basic overview](https://www.alfred.com/pages/alfreds-basic-piano-course-overview)). Its Premier course, for six to twelve, reads by landmark notes and intervals and says in its own FAQ that it is "not a position approach to reading" ([Premier FAQ](https://www.alfred.com/pages/premier-piano-course-faqs)). Music for Little Mozarts is for four to six ([Alfred](https://www.alfred.com/pages/music-for-little-mozarts)).

John Thompson's course made the middle C approach popular, with both thumbs sharing middle C for the first half of the first book ([Wikipedia, Piano pedagogy](https://en.wikipedia.org/wiki/Piano_pedagogy); [Color In My Piano](https://colorinmypiano.com/2015/01/22/un-method-books-for-piano-students/)). Suzuki starts at three or four, teaches by ear before reading, puts a parent at every lesson and relies on daily listening; its first book opens with its own Twinkle variations and then folk songs ([International Suzuki Association](https://internationalsuzuki.org/method.htm); [Wikipedia](https://en.wikipedia.org/wiki/Suzuki_method); [Book 1 contents](https://www.alfred.com/products/suzuki-piano-school-international-edition-piano-book-volume-1-00-0473sx)). Piano Safari teaches pieces by rote alongside reading, uses treble G and bass C as its landmarks on a full staff from the start, reads repeated notes and seconds, then thirds, and gives technique through seven animal exercises ([Piano Safari, intervallic reading](https://pianosafari.com/field-notes/foundations-of-music-literacy-intervallic-reading); [part 2](https://pianosafari.com/field-notes/foundations-of-music-literacy-intervallic-reading-part-2); [technique](https://pianosafari.com/field-notes/foundations-of-piano-technique)).

### The graded syllabi

Trinity's piano syllabus is the most specific we could read in full ([Trinity syllabus](https://www.trinitycollege.com/resource/?id=9079)). At Initial grade a child plays three pieces, the C major and A minor scales for one octave hands separately at crotchet 60, and broken triads, and chooses two of four supporting tests: sight reading, aural, improvisation and musical knowledge. The aural test at Initial asks the child to clap the pulse with an accent on the strong beat, say whether a melody was loud or soft and legato or staccato, and pick the highest or lowest of its first three notes; it never asks for singing. Initial improvisation is four bars over the examiner's tonic and dominant in C major, as a march or a lullaby. Grade 1 adds F and G major and D and E minor at crotchet 70 and broken chords; Grade 2 has two-octave scales hands together at crotchet 80.

The Royal Conservatory's Preparatory A asks for legato and staccato five-finger patterns in C, G and D major and A minor; Preparatory B has the first one-octave scales, which is the first time the thumb passes under; Levels 1 and 2 go to two octaves ([RCM syllabus 2022](https://rcmusic-production-strapi-media.s3.ca-central-1.amazonaws.com/piano_syllabus_2022_edition_9c6a49bb96.pdf)). Its ear tests are clapback of two bars, major or minor chords, playback of four or five notes from the first notes of a scale, and at Level 1 the major and minor thirds. Its sight reading at Preparatory A is two four-note melodies, one for each hand, moving by step.

ABRSM's Performance Grades ask for four pieces from three lists, played as one performance, allow duets up to Grade 3, and allow chords to be spread for small hands ([ABRSM 2027 and 2028 syllabus](https://www.abrsm.org/sites/default/files/2026-06/Piano%20Performance%20Grades%20Syllabus%202027%20%26%202028.pdf)). A teacher's review of its scale requirements since 2021 says Grade 1 has C major hands together for one octave and no broken chords ([Pianodao](https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/)), and its aural tests include singing, which that teacher argues shuts some children out ([Pianodao](https://pianodao.com/2022/07/02/singing-in-aural-tests-why-its-a-problem/)).

### Three ways of teaching reading

The methods disagree most about reading. The middle C approach starts both thumbs on middle C and reads outward from it; the intervallic or landmark approach, from Frances Clark's Time to Begin in 1955, learns a few notes by sight and reads everything else as steps and skips from them; the multi-key approach, from Robert Pace in 1954, moves the hand between keys from early on ([Piano pedagogy](https://en.wikipedia.org/wiki/Piano_pedagogy); [Frances Clark](https://en.wikipedia.org/wiki/Frances_Clark_(pianist))). Most current books mix them. The criticism of the middle C position is that finger numbers stand in for note names and a child becomes afraid to move ([Teach Piano Today](https://www.teachpianotoday.com/2012/01/19/beyond-middle-c-leaving-the-comfort-zone/)). The landmarks differ between sources too: Piano Safari uses treble G and bass C, and a widely used teacher's sequence starts with bass F, the Cs and treble G ([Piano Pantry](https://pianopantry.com/note-reading-progressions/)).

We read by landmark and interval. Our first keyboard lesson already starts from middle C, which every approach names; the grand staff lesson adds bass F and treble G, which are the notes the two clefs are drawn around, and every question after that asks for a step or a skip from one of them. The drawing that makes it possible is the grand staff at one square to the space, where middle C falls exactly half way between the staves.

## The ten topics, and when each is taught

Posture, hand shape and finger numbers come first in every method, in the first lesson ([Alfred 1A](https://www.alfred.com/pages/alfreds-basic-piano-course-overview)). The bench is set so the forearm is level with the keys, about 20 to 21 inches for a young child, with feet on the floor or a box ([Hoffman Academy](https://www.hoffmanacademy.com/blog/developing-good-piano-posture); [Teach Piano Today](https://www.teachpianotoday.com/2013/06/12/dont-fall-behind-a-piano-teachers-guide-to-the-bench/)); the hand keeps the curve it makes resting on a knee; the thumb is 1 on both hands and the little finger 5. Faber marks a young beginner's left hand with a hair tie to tell left from right ([Faber blog](https://pianoadventures.com/blog/2021/09/09/starting-young-beginners-remotely/)).

Five-finger positions come in the first year: middle C position, then C position, then G position, and later D and A ([Alfred](https://www.alfred.com/pages/alfreds-basic-piano-course-overview); [Faber 2A](https://pianoadventures.com/blog/2016/01/31/level-2a-pattern-recognition-and-five-finger-scales/)). Passing the thumb under arrives with the first one-octave scales, which is RCM Preparatory B and Trinity Initial, around the age of eight ([RCM](https://rcmusic-production-strapi-media.s3.ca-central-1.amazonaws.com/piano_syllabus_2022_edition_9c6a49bb96.pdf); [Trinity](https://www.trinitycollege.com/resource/?id=9079)).

Reading moves from pre-staff notation (letters in the note heads, or finger numbers over black keys) to the staff by steps and then skips, to the grand staff and its landmarks, to intervals up to the fifth, and to ledger lines, which Trinity asks about up to two at Grade 1 and three at Grade 2.

Rhythm starts with crotchets, minims and semibreves and their rests; 4/4, 3/4 and the dotted minim come in Alfred's first book, and quavers are held back until Faber's Level 2A, though the Kodály approach starts with them as walking and running ([Kodály method](https://en.wikipedia.org/wiki/Kod%C3%A1ly_method)). Counting is done in numbers, in ta and ti-ti, or in word rhythms.

Dynamics start with p and f in the first weeks, then mf, then crescendo and diminuendo by the end of the first book. Articulation starts with legato, slurs and ties and then staccato; Piano Safari starts with non-legato.

Scales, chords and accompaniment: five-finger patterns from the first year; tonic and dominant at Faber Level 1; the primary chords I, IV and V7 at Level 2B; broken and blocked triads at RCM Preparatory A; one-octave scales at seven or eight and two octaves from nine.

Pedalling appears early for colour, in Faber's Primer, and legato pedalling, which teachers call one of the hardest things to time, comes much later; Trinity's sight reading does not ask for pedalling until Grade 5 ([Color In My Piano](https://colorinmypiano.com/2011/03/01/forum-qa-how-do-you-teach-legato-pedaling/); [Hoffman Academy on pedals](https://www.hoffmanacademy.com/blog/what-are-piano-pedals-for)).

Sight reading is a short exercise every day ([Faber sightreading](https://pianoadventures.com/product/piano-adventures-primer-level-sightreading-book/)). Ear training starts with singing and high and low; the exams use clapback and playback. Improvising starts at five on the black keys over a teacher's accompaniment ([Teach Piano Today](https://www.teachpianotoday.com/2014/08/10/by-the-end-of-this-post-youll-be-teaching-improv-to-piano-students-as-young-as-five/)).

Repertoire at these levels is mostly the method authors' own pieces, folk tunes and simplified classical themes, then minuets and dances by Leopold Mozart, Haydn, Mozart and Beethoven and studies by Czerny and Gurlitt at RCM Levels 1 and 2 ([RCM](https://rcmusic-production-strapi-media.s3.ca-central-1.amazonaws.com/piano_syllabus_2022_edition_9c6a49bb96.pdf)).

Practice for a beginner is ten to fifteen minutes a day, growing to thirty ([Faber, for parents](https://pianoadventures.com/piano-books/basic-faqs/parents/); [Hoffman Academy](https://www.hoffmanacademy.com/blog/what-should-practice-time-look-like)); a new piece is played three to five times, or "your age" times; hard places are repeated until they come out right three or four times in a row ([Piano Safari](https://pianosafari.com/field-notes/turning-practice-into-progress-tips-for-elementary-level-piano-students)); and a parent helps until about eleven ([Teach Piano Today](https://www.teachpianotoday.com/2016/01/19/what-your-piano-parents-need-to-know-about-practice/)). Lessons are thirty or forty-five minutes.

## A consensus sequence, five to ten

The ages are approximate and the level comparisons are ours, from the publishers' age ranges and from which method books the RCM lists draw on.

| Age | Where a child is | What is taught |
|---|---|---|
| 5 | My First Piano Adventure, Little Mozarts, Alfred Prep | sitting and the curved hand; finger numbers; left and right; high and low; the black key groups; p and f; crotchet, minim and semibreve with a steady beat; pre-staff reading; black key pieces and improvising; singing |
| 6 | Faber Primer, Alfred 1A, Premier 1A | the staff by steps then skips; middle C, treble G, bass F and C as landmarks; C position; 4/4, 3/4 and the dotted minim; mf; intervals to the fifth; legato, slurs and ties; G position; a daily line of sight reading |
| 7 | Faber Level 1, RCM Preparatory A, Trinity Initial | the whole grand staff; C and G positions and moving between them; tonic and dominant; staccato; five-finger patterns and one-octave C major and A minor hands separately; clapback and short playback; four bars improvised over I and V |
| 8 | Faber 2A and 2B, RCM Preparatory B, Grade 1 | quavers; positions in C, G, D and A, major and minor; I, IV and V7; one-octave scales with the thumb under; broken chords; two ledger lines; major and minor thirds by ear; minuets and dances |
| 9 to 10 | Faber 3, RCM Levels 1 and 2, Grade 2 | two-octave scales; arpeggios; chromatic scales; triads and inversions; studies; the perfect fifth by ear; four bars of sight reading hands together; legato pedalling |

## What our piano does today, against that

| Topic | What a first-year class teaches | What we had | What was missing |
|---|---|---|---|
| Posture and hand | bench height, curved hand, finger numbers 1 to 5 on both hands | nothing drawn; a finger number written on the key being guided | the hands and their numbers; numbers on a printed keyboard; the left hand |
| Positions | middle C, C and G positions, moving between them | a right-hand five-finger guide from C | the left hand; G position; moving between positions |
| Reading | pre-staff, steps and skips, grand staff, landmarks, intervals to the fifth, ledger lines | the treble staff with letters; naming a note from middle C to G | the bass staff and the grand staff; landmarks; steps and skips as reading |
| Rhythm | crotchet, minim, semibreve, rests, 3/4, the dotted minim | counting a bar; the rhythm bar; judged tapping | rests and dots on the pitched staff; a time signature; bar lines |
| Dynamics and articulation | p, mf, f, crescendo, diminuendo; legato, staccato, slurs | a velocity in the piano voice, not written anywhere | the marks, and playing them |
| Scales and chords | five-finger patterns, I and V, triads, first scales | scales, keys and intervals on the page; chords can be drawn pressed | I and V as accompaniment; the thumb under |
| Pedal | colour at first, legato later | nothing | the mark and a pedal to press |
| Sight reading, ear, improvising | a daily line; clapback and playback; black key improvising | "make something up", kept for a grown-up; guided phrase echo | a daily sight reading habit; playback as an exercise; black key improvising with an accompaniment |
| Repertoire | folk tunes, classical themes, the method's own pieces | one five-note phrase | public domain tunes and our own pieces at each stage |
| Practice | ten to fifteen minutes a day, repetitions, a chart, a parent's help | nothing | a practice chart the grown-up keeps |

## The extension

### Built now

Drawings, all on the Music shelf with at least two takes each and placeable by the notation:

- `hand`: hands seen from above with the pianist's numbers, thumb 1 to little finger 5, or the guitarist's, pointer 1 to little finger 4, and one finger that can be ringed. Drawing the two numberings side by side is deliberate, since a child who plays both meets both.
- `grandstaff`: the two staves braced, one square to the space, middle C on its own line half way between, with the three landmarks marked by a band and a letter when asked.
- `dynamics`: p, mp, mf, f, ff and the two hairpins, with what each means written under it.
- `piano` gains `fingers`, a row of finger numbers over the keys the way a method book prints them, so a printed keyboard carries a hand position.
- `notes` gains `meter`, which draws a time signature and a bar line after every bar, dotted notes for 1.5 and 3 beats, and rests.

Interactions on `music.html`, in the piano view:

- Hands and finger numbers: the right or left hand, C or G position, the hand drawn with its numbers, a question about which finger plays a note, and the guided phrase played with the finger written on each key.
- The grand staff and its landmarks: a note ringed on the grand staff, named with letter chips or played on a two-octave keyboard, where the exact key is judged because the grand staff says which C.
- Loud and soft: the marks drawn with their meanings, and the same phrase played p, mf and f, where the piano voice's velocity changes the timbre as well as the level.
- Three beats in a bar: two bars of three with a dotted minim, played after a count in of three.

Lessons, in `content/lessons/` with their items in `content/items/`:

| Lesson | Grade | What it asks | Items | Tier |
|---|---|---|---|---|
| `music-piano-fingers`, Finger numbers and C position | 1 | numbering the fingers from the thumb, and C position on both hands | which finger is ringed (four versions); play C, D, E with fingers 1, 2, 3; play G down to C with the left hand | proved; two are played |
| `music-piano-steps-skips`, Steps and skips | 2 | line to space is a step, line to line a skip | a step or a skip, twice; how many steps from C to F; play C, E, G | proved; one is played |
| `music-piano-loud-soft`, Loud and soft | 2 | reading p, mp, mf, f and ff and the two hairpins | which mark is soft, which is loudest, what the opening sign means | proved for the reading; the playing is a grown-up's to judge |
| `music-piano-grand-staff`, The grand staff and three landmarks | 3 | bass F, middle C and treble G, and reading from them | which landmark is ringed; a step up from G; a skip down from F; play bass F | proved; one is played |
| `music-the-left-hand-and-the-bass-staff`, The left hand and the bass staff | 3 | the bass staff read down from middle C with bass F as the landmark, and the left hand | which staff is the bass; name a bass note; which hand; steps down from middle C; play G with the left hand; play C G C G | proved; two are played |
| `music-rests-and-three-time`, Rests and three-time | 3 | bars of three, the rest counted in silence, the dotted minim | how long the rest is; which staff is in three; does it add up; the dot; which count is silent; clap two bars with a rest | proved; the clap is judged by `music.rhythm`, the child's own bar by a grown-up |

Every item passes the verifier with no warnings, and every lesson prints to exactly as many pages as it lays out sheets.

### Designed and not built

The rest of the first two years, in the order a class meets it:

- High and low is `music-high-and-low` and the black key groups `music-the-black-keys` (16 September 2026).
- The left hand and the bass staff is `music-the-left-hand-and-the-bass-staff` (16 September 2026), read from middle C and bass F; the guided left-hand phrase still waits.
- Rests and the dotted minim in 3/4 is `music-rests-and-three-time` (16 September 2026), using the `meter` setting.
- Legato and staccato: slurs and dots on `notes`, and a guided phrase that asks for short or joined notes, which is judged by how long each key is held. The performance already records when a key was let go, so this is a tolerance on durations beside the tolerance on onsets.
- Moving between positions: C position to G position in one piece, with `handPositions` in `src/sound/guide.ts` saying where the hand moves.
- Tonic and dominant as an accompaniment: the left hand holding C and G under a right-hand tune, which needs a chord step in the guide for the left hand and a phrase for the right.
- The thumb under, for the first one-octave scale. `withFingers` in `src/sound/guide.ts` says plainly that it is not fingering and that the scale lesson needs its own answer; `music-scales-and-keys` (17 September 2026) is that lesson on paper, and the guided scale with the thumb under still waits.
- The pedal: a drawn pedal and its mark, and a piano voice that holds its strings while the pedal is down. The struck voice's damper is already a parameter, so the sound is a small change; the lesson is grade three at the earliest.
- Playback: the page plays three or four notes and the child plays them back, with the keys lighting as they sound so it stays answerable at zero volume. That is the guided phrase with the keys hidden until the child has tried, and it is the same exercise as RCM's playback and Trinity's aural tests.
- Black key improvising: the five black keys lit, a steady accompaniment played by the page, and nothing marked. It is the third tier, kept for the grown-up.
- A daily line of sight reading: one four-note phrase a day from a generator over the landmarks, judged by pitch with no clock.
- A practice chart: a week of days with ticks and minutes, drawn for the grown-up to print and fill in, and shown in the parent's view as the record of practice, which is evidence the product does not otherwise have.
- The posture picture: a child at the keyboard from the side, with the forearm level and the feet supported. It is a drawing of a person, which the shelf has few of, and it should be drawn by hand rather than in code.

### What each promises

The tiers in [sound.md](sound.md) hold unchanged. Naming, counting, ordering and playing a named pitch are proved with no tolerance, which covers finger numbers, landmarks, steps and skips, reading the marks and counting a bar. Playing in time is proved against a stated window. Anything about how something sounded, loud or soft as played, legato or staccato as played until the duration tolerance exists, and anything made up, is a grown-up's judgement and the page says so.

## Repertoire

Public domain melodies we can use, with their origin: Twinkle, Twinkle (the tune published in 1761, the words 1806), Mary Had a Little Lamb (1830), Hot Cross Buns (a street cry), Jingle Bells (1857), the Ode to Joy (Beethoven, 1822 to 1824), Au clair de la lune (eighteenth century), London Bridge (seventeenth century), Frère Jacques, Lightly Row (the tune of Hänschen klein), Long, Long Ago (Bayly, 1833), Go Tell Aunt Rhody (a tune from Rousseau, 1752), Old MacDonald, Yankee Doodle, Simple Gifts (1848), Aura Lee, Brahms's Lullaby (1868), Für Elise, the Minuet in G attributed to Petzold (about 1720), and Chopsticks (1877) ([sources](#sources)).

Not public domain, and not used: Heart and Soul (1938); A Lover's Concerto (1965), the pop song built on the Petzold minuet; Suzuki's own Twinkle variations and Allegro; every method book's original pieces; and the pop arrangements in the exam lists. Happy Birthday has been public domain in the United States since 2016 and in the EU since 2017, and Kumbaya's status is unsettled, so we leave both out.

Our own pieces, as the lessons need them: the five-note phrase the guided keyboard already plays, and short pieces written for a position and a skill (a four-bar piece in C position for each hand, a waltz in 3/4 with a dotted minim, a piece that crosses from C to G position). They are ours to write, and every piece on a page says whether it is traditional or ours.

## Order to build the rest

1. Guided playing inside a lesson, so a played question is answered where it is asked. This is the same first step as in [guitar.md](guitar.md).
2. The left hand and the bass staff, which is the largest gap in the first year.
3. High and low and the black keys, which completes grade one.
4. Rests and 3/4, then legato and staccato with a tolerance on durations.
5. Playback, since it is the guided phrase with the keys hidden, and it is what every exam's ear test asks.
6. Moving between positions, then tonic and dominant as an accompaniment.
7. The practice chart for the grown-up.
8. The thumb under and the first scale (the lesson is `music-scales-and-keys`; the guided scale still waits), the pedal, and black key improvising.

## Sources

Faber: [levels](https://pianoadventures.com/piano-adventures/), [My First Piano Adventure](https://pianoadventures.com/piano-books/my-first-piano-adventure/), [Basic Piano Adventures](https://pianoadventures.com/piano-books/basic-piano-adventures/), [Primer](https://pianoadventures.com/piano-books/basic-piano-adventures/primer/), [Book A](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-a/), [Book B](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-b/), [Book C](https://pianoadventures.com/product/my-first-piano-adventure-lesson-book-c/), [Primer lesson book](https://pianoadventures.com/product/piano-adventures-primer-level-lesson-book-2nd-edition/), [Primer sightreading](https://pianoadventures.com/product/piano-adventures-primer-level-sightreading-book/), [Level 1](https://pianoadventures.com/product/piano-adventures-level-1-lesson-book-2nd-edition/), [Level 2A](https://pianoadventures.com/blog/2016/01/31/level-2a-pattern-recognition-and-five-finger-scales/), [Level 2B](https://pianoadventures.com/blog/2016/01/30/level-2b-the-power-of-primary-chords/), [middle C with three fingers](https://pianoadventures.com/blog/2017/05/09/all-three-on-middle-c/), [the young beginner](https://pianoadventures.com/blog/2016/02/04/the-young-beginner-keys-for-connecting/), [starting young beginners](https://pianoadventures.com/blog/2021/09/09/starting-young-beginners-remotely/), [for parents](https://pianoadventures.com/piano-books/basic-faqs/parents/), [for teachers](https://pianoadventures.com/piano-books/basic-faqs/teaching/).

Alfred: [Basic Piano Library overview](https://www.alfred.com/pages/alfreds-basic-piano-course-overview), [Prep Course](https://www.alfred.com/pages/alfreds-basic-piano-prep-course-overview), [Premier FAQ](https://www.alfred.com/pages/premier-piano-course-faqs), [Premier](https://www.alfred.com/premier-piano-course/), [Music for Little Mozarts](https://www.alfred.com/pages/music-for-little-mozarts), [Suzuki Book 1](https://www.alfred.com/products/suzuki-piano-school-international-edition-piano-book-volume-1-00-0473sx). Hal Leonard: [Thompson's Easiest Piano Course](https://www.halleonard.com/product/414014/), [Student Piano Library](https://www.halleonard.com/series/HLSPL).

Suzuki and Piano Safari: [International Suzuki Association](https://internationalsuzuki.org/method.htm), [Suzuki method](https://en.wikipedia.org/wiki/Suzuki_method), Piano Safari on [intervallic reading](https://pianosafari.com/field-notes/foundations-of-music-literacy-intervallic-reading), [its sequence](https://pianosafari.com/field-notes/foundations-of-music-literacy-intervallic-reading-part-2), [rote teaching](https://pianosafari.com/field-notes/the-rationale-for-rote-teaching), [technique](https://pianosafari.com/field-notes/foundations-of-piano-technique), [improvisation](https://pianosafari.com/field-notes/foundations-of-creativity-improvisation) and [practice](https://pianosafari.com/field-notes/turning-practice-into-progress-tips-for-elementary-level-piano-students).

Syllabi: [Trinity piano syllabus](https://www.trinitycollege.com/resource/?id=9079); [RCM piano syllabus 2022](https://rcmusic-production-strapi-media.s3.ca-central-1.amazonaws.com/piano_syllabus_2022_edition_9c6a49bb96.pdf); [ABRSM Performance Grades 2027 and 2028](https://www.abrsm.org/sites/default/files/2026-06/Piano%20Performance%20Grades%20Syllabus%202027%20%26%202028.pdf); Pianodao on [ABRSM scales](https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/), [the 2027 lists](https://pianodao.com/2026/06/04/abrsm-piano-syllabus-2027-28/) and [singing in aural tests](https://pianodao.com/2022/07/02/singing-in-aural-tests-why-its-a-problem/).

Reading and teaching: [Piano pedagogy](https://en.wikipedia.org/wiki/Piano_pedagogy), [Frances Clark](https://en.wikipedia.org/wiki/Frances_Clark_(pianist)), [Kodály method](https://en.wikipedia.org/wiki/Kod%C3%A1ly_method), [Piano Pantry's reading progressions](https://pianopantry.com/note-reading-progressions/), Teach Piano Today on [leaving middle C](https://www.teachpianotoday.com/2012/01/19/beyond-middle-c-leaving-the-comfort-zone/), [the bench](https://www.teachpianotoday.com/2013/06/12/dont-fall-behind-a-piano-teachers-guide-to-the-bench/), [improvising at five](https://www.teachpianotoday.com/2014/08/10/by-the-end-of-this-post-youll-be-teaching-improv-to-piano-students-as-young-as-five/) and [practice](https://www.teachpianotoday.com/2016/01/19/what-your-piano-parents-need-to-know-about-practice/); Hoffman Academy on [posture](https://www.hoffmanacademy.com/blog/developing-good-piano-posture), [practice](https://www.hoffmanacademy.com/blog/what-should-practice-time-look-like), [pedals](https://www.hoffmanacademy.com/blog/what-are-piano-pedals-for) and [the age to start](https://www.hoffmanacademy.com/blog/music-notes-best-age-to-start-piano); Color In My Piano on [method books](https://colorinmypiano.com/2015/01/22/un-method-books-for-piano-students/), [five-finger patterns](https://colorinmypiano.com/2013/02/19/teaching-5-finger-patterns-with-a-free-worksheet/) and [legato pedalling](https://colorinmypiano.com/2011/03/01/forum-qa-how-do-you-teach-legato-pedaling/).

Repertoire: [Twinkle](https://en.wikipedia.org/wiki/Twinkle,_Twinkle,_Little_Star), [Mary Had a Little Lamb](https://en.wikipedia.org/wiki/Mary_Had_a_Little_Lamb), [Hot Cross Buns](https://en.wikipedia.org/wiki/Hot_Cross_Buns_(song)), [Jingle Bells](https://en.wikipedia.org/wiki/Jingle_Bells), [Beethoven's Ninth](https://en.wikipedia.org/wiki/Symphony_No._9_(Beethoven)), [Au clair de la lune](https://en.wikipedia.org/wiki/Au_clair_de_la_lune), [London Bridge](https://en.wikipedia.org/wiki/London_Bridge_Is_Falling_Down), [Frère Jacques](https://en.wikipedia.org/wiki/Fr%C3%A8re_Jacques), [Hänschen klein](https://en.wikipedia.org/wiki/H%C3%A4nschen_klein), [Long, Long Ago](https://en.wikipedia.org/wiki/Long,_Long_Ago), [Go Tell Aunt Rhody](https://en.wikipedia.org/wiki/Go_Tell_Aunt_Rhody), [Simple Gifts](https://en.wikipedia.org/wiki/Simple_Gifts), [Brahms's Lullaby](https://en.wikipedia.org/wiki/Brahms%27_Lullaby), [the Minuet in G](https://en.wikipedia.org/wiki/Minuet_in_G_major_(Petzold)), [Chopsticks](https://en.wikipedia.org/wiki/Chopsticks_(music)), [Happy Birthday](https://en.wikipedia.org/wiki/Happy_Birthday_to_You), [Heart and Soul](https://en.wikipedia.org/wiki/Heart_and_Soul_(1938_song)), [Kumbaya](https://en.wikipedia.org/wiki/Kum_ba_yah).
