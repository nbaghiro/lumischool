# Grades five and six: the audit against school curricula

Status: written 29 September 2026, after the audit of 28 and 29 September and the fixes that followed
it. The detailed findings, lesson by lesson, with every quoted curriculum line, are kept with the
working notes in `.scratchpad/grades56/audit/` (one file a subject, each with a "Fixed" section); this
document is the summary a reader needs to judge the lessons, and the list of what is still open. The
plan the lessons were written to is [grades-5-6.md](grades-5-6.md).

## The short version

The grade five and six lessons were sound as lessons and not yet a replacement for school. Every
answer key in maths and physics was worked by hand and almost all were right, but several dozen places
showed a child something wrong, from a template printed raw to a moon on whose surface nobody would
see the Earth rise, and the depth fell short where it matters most: a fifth-grade child never wrote a
program, never read a whole book, and never met photosynthesis, which all three countries we compared
teach at this age. The fixes corrected every wrong key and fact the audit found, raised the lessons it
judged below the bar, and added forty-eight lessons, eight a term, for the topics real schools teach at
these grades that no lesson covered. What remains open is listed at the end: a few decisions for the
owner, the subjects we do not teach at all, and the total time a family's year takes.

## How the audit was done

The lessons were written first and checked against the official curricula afterwards, so this audit is
the first place the lessons are tied to those documents line by line. Nine parts ran in parallel, one
for each subject group, one for the drawings, and one for the subjects and hours schools teach. Each
part read every question at every level with its answer, worked the keys by hand, scored each lesson
on the 24-point lesson standard used for grades one to four, and mapped each lesson to Japan, China
and Russia, quoting the official text where it could be fetched and marking a mapping "recalled" where
it could not. England's national curriculum, the US Common Core and NGSS, and CSTA were used where they
help, as [audit.md](audit.md) did for grades one to four.

Three cautions apply to the sources. China's 2022 standards are scanned PDFs with no text layer, so
they were read from the page images and a quoted character may be slightly off. The CRICED English
guide to Japanese mathematics translates the 2008 course of study, so the 2017 Japanese text governs
wherever the two differ. The Russian federal work programmes on edsoo.ru were read in their 2023 and
2025 editions; Russia has no federal programme for the natural-science course some schools teach in
grades five and six.

## Where our grades five and six stand

Grade five here is Japan's fifth grade, China's third learning stage and England's Year 6. Russian
children start school later and Russian primary school ends after its fourth grade, so the Russian
comparison for our grades five and six is its grades five and six by content, and in science its
grades seven to nine, since physics starts in grade seven and chemistry in grade eight.

In maths we are on grade with Japan and China for decimals, volume, angle sums, circles, fractions,
ratio and proportion, and ahead of all three on probability trees and on solving equations with a
balance. Before the gap lessons we were behind on the fraction as the result of a division, nets and
surface area, symmetry and congruence, estimating an irregular area, and collecting data and choosing a
graph; each is now a lesson.

In physics we are on grade with Japan for the pendulum, the electromagnet, levers, electricity and the
moon's phases, and two to four years ahead of Russia's sequence almost everywhere. Chemistry is two to
four years ahead of Russia and roughly at England's early secondary level. Both were missing parallel
circuits, refraction, heat by radiation, energy resources, thermal expansion, springs, acids on metals,
the Earth's layers and the air living things change; each is now a lesson.

In reading and writing the lessons map on grade to theme, comparing accounts, word roots, claim and
evidence, and the colon, semicolon and passive, but the passages were short, grammar was never named,
and there were no whole books and almost no literature. The fixes named the grammar and lengthened the
passages to 100 to 160 words; the gap lessons add six whole public-domain books read across a term
each, myths and fables, poems learned by heart, a dictation, and a report from three sources.

In coding we are on or ahead of China's algorithms strand, England's early secondary searching and
sorting, and CSTA, and ahead of Russia, where informatics is compulsory only from grade seven. The gap
was that a grade five child never wrote a program; every grade five coding lesson now has a build task,
and the gap lessons add flowcharts, events and messages, sensors with feedback, and test cases.

In art, music and nature the facts and keys needed the most correction. Russian music theory reaches
six-eight time, key signatures and named intervals in its primary grades, so our music theory is ahead
of Japan and China and behind Russia. Photosynthesis, cells and the microscope, and seed germination
were missing from the whole catalogue; each is now a lesson, as are listening to named works, singing a
round, pentatonic music, folk design, sculpture and looking at real paintings.

## What the audit found wrong, and what was done

| Subject | Found | Done |
|---|---|---|
| Maths, grade 5 | a template shown raw to the child (a core bug), a large number printed wrongly, a triangle whose stated side it could not have, a picture that never changed, eight "find the mistake" questions that named the mistake | the placeholder parser fixed in the core with a verifier check against leftover braces; the pictures corrected; the mistakes now shown and the reason asked; four lessons raised, to between 19 and 23 |
| Maths, grade 6 | a dot plot that did not add up, a seal pup weighing −2 kg, stretch questions answered by the question before them | corrected; six lessons raised to between 20 and 23 |
| Physics | a still sledge drawn with an unbalanced force, a planet drawing called to scale, "only iron" becomes a magnet, a 28-day moon cycle in grade 4 | corrected, the sledge in the drawing and the checker together; four lessons raised to between 22 and 24 |
| Chemistry | reaction amounts that could not react, a balloon on scales that would read light, a false basalt claim, heating curves that broke their own rule, a salt fact wrong in grade 3 | seventeen facts corrected and sourced; grade 3 moved to alum; seven lessons raised to 20 or 21 |
| Reading and writing | ambiguous keys, twelve two-star questions answerable without the text, repeated questions, grammar never named | corrected; grammar named; passages lengthened; ten lessons raised to between 17 and 22 |
| Coding | eight keys with no right answer or two, a program shown in a question that could be run to read the answer off | keys corrected; a build task in every grade 5 lesson; Run offered only after the child has answered; one rule for random builds in the verifier and on the page |
| Art, music, nature | a lead sheet in the wrong key, a wrong example of A B A B form, a river "fastest in the hills", pea heights presented as inherited, a disputed Yellowstone story presented as settled | corrected; twenty lessons raised to between 22 and 24 |
| The worlds | the Earth rising over the moon for someone on its surface, and the aurora under the midnight sun, both errors of the plan | the moon's moment moved to orbit, where Apollo 8 saw it; the aurora kept to the observatory's winter nights |
| Drawings | a scale plan whose squares counted double, a non-standard switch symbol, a grid half a square off the paper, labels that collided in print | corrected, with every lesson using each drawing re-verified; no key changed |

The audit also found gaps in the platform that affect every grade, and they were closed in the core
rather than lesson by lesson: programs shown in a question could not be run on the page at all; long
printed lessons ran past five pages in every grade, so a printed lesson now splits into sittings of at
most five pages; question text could not nest one expression inside another; worked lessons could not
end with a remember line.

## What was added for the gaps

The owner chose to grow grades five and six from 28 to 36 lessons a term, so no existing lesson was
retired. The forty-eight gap lessons are listed with their worlds and curriculum lines in
[grades-5-6.md](grades-5-6.md), "The gap lessons". Eleven are maths, twelve reading and writing,
eleven physics and chemistry, eight nature and coding, and six art and music. Each grown-ups note
quotes the official curriculum line the lesson meets, with the country, grade and code, so a family
can see which school standard a lesson answers to. They needed new core pieces, each built once and
documented: a book format read in sittings, with its evidence proved against the book's own text; a
list for grown-up marking shared by writing, sculpture, recitation and singing; a dictation marked word
by word; flowcharts drawn from the program model, sensors and messages in the interpreter, and a
checker for test cases; a nature checker that reads the microscope and seed-test drawings; and about
thirty new drawings.

## What is still open

These are the owner's decisions, and nothing has been built for them.

- The six book texts keep their authors' em-dashes: the owner decided to keep the authors'
  punctuation, and CLAUDE.md states the exception for quoted book text.
- History and social studies are planned in [history.md](history.md) but not written. The owner has
  decided whose history: a shared world strand told through everyday life, and a national unit each
  year from a set the family chooses.
- A foreign language, physical education, home economics and moral education are taught in all three
  countries and not by us. Together with history these take about a third of the school week. The site
  says plainly what we do not cover, and that history and social studies come next.
- The time a year takes. On the only estimates in the code, a family's default year is roughly 80 to
  120 hours of lessons, against 650 to 760 taught hours in these schools. Lesson length has never been
  measured, and this needs measuring before any claim about replacing school is made.
- Science takes about 35 per cent of our grades five and six, against about 10 per cent in Japan and
  China. The audit suggested trading some physics and chemistry lessons for the missing subjects; the
  owner chose instead to add lessons and keep science.

The remaining smaller items, each with its file, are in `.scratchpad/grades56/FOLLOWUPS.md`, which the
closing pass works through before the owner's review.

## Sources

The official documents the audit read, by country.

- Japan. MEXT, Course of Study for Elementary School (2017), mathematics and science commentaries:
  https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_004.pdf,
  https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387018_004.pdf,
  https://www.mext.go.jp/content/20230120-mxt_kyoiku02-100002604_01.pdf,
  https://www.mext.go.jp/content/20230120-mxt_kyoiku02-100002604_02.pdf,
  https://www.mext.go.jp/content/1413522_001.pdf; Japanese (国語):
  https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2018/09/05/1384661_4_3_2.pdf;
  programming education guide: https://www.mext.go.jp/content/20200218-mxt_jogai02-100003171_002.pdf;
  standard class hours, School Education Act enforcement regulations, table 1:
  https://laws.e-gov.go.jp/law/322M40000080011. CRICED's English guide to the 2008 mathematics course:
  https://www.criced.tsukuba.ac.jp/math/apec/ICME12/Lesson_Study_set/Elementary_School_Teaching_Guide-Mathematics-EN.pdf
- China. Ministry of Education, Compulsory Education Curriculum Plan and Standards (2022), index:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html; mathematics:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582346895190.pdf; science:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582355009892.pdf; Chinese:
  https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582344386456.pdf; information technology:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582361024968.pdf; arts:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582364678888.pdf; the curriculum plan:
  http://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582343217634.pdf
- Russia. Federal work programmes, edsoo.ru (https://edsoo.ru/rabochie-programmy/): mathematics 1-4
  and 5-9, physics 7-9, chemistry 8-9, biology 5-9, geography 5-9, informatics 7-9 and the 5-6
  programming course, Russian language 5-9, literature 5-9, music 1-4 and 5-8, fine art 5-7, the world
  around us 1-4. The federal curriculum for basic general education (hours):
  http://publication.pravo.gov.ru/document/0001202307140040
- England. National curriculum programmes of study for mathematics, science, English, computing, art
  and design, music and geography, and the framework for key stages 1 to 4, on gov.uk.
- United States. Common Core State Standards for Mathematics and for English Language Arts, with
  Appendix A on text complexity; NGSS (https://www.nextgenscience.org); CSTA K-12 standards
  (https://csteachers.org/wp-content/uploads/2025/06/2017-csta-k-12-standards-progression-chart.pdf).
