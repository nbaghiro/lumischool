# Leftover work

Three streams were paused on 17 September 2026 so that work could focus on the apps. Each finished
the item it had in hand before stopping, and each document here lists what is left in batches, with
the files, what each batch waits on, the steps, the checks and what done means, so that anyone can
pick a batch up without the conversation that produced it.

| Document | Stream | Left |
|---|---|---|
| [art-shelf.md](art-shelf.md) | Moving the shelf's drawings from the scratchpad into `engine/parts/`, and the new drawings and settings the catalog waits on | 3 batches (4.13 to 4.15), the moves themselves; 4.1 landed on 18 September 2026, 4.3 and 4.5 on 19 September, and 4.12 on 20 September |
| [catalog.md](catalog.md) | Balancing the lesson catalog to the grid of 336 lessons | None: 336 lessons on the tree and the closing pass done |
| [levels.md](levels.md) | Easy, medium and hard for every lesson, read and checked as the catalog grows | None: the closing pass done; the owner's list waits on the owner |

Updated on 18 September 2026 at the close of the catalog: the catalog and levels streams are
finished (catalog batches 1 to 7 and levels 4.1 to 4.4), and so are the art shelf's new drawings for
the catalog (4.2, 4.4 and 4.6 to 4.11) and its coding batches (4.16 to 4.18). What the art shelf has
left is the moves (4.1, 4.3 and 4.12 to 4.15) and the unused-drawings cleanup (4.5), and 4.1, 4.3,
4.5 and 4.12 have landed since. The reds open at the close, each with its owner, are under catalog.md's batch 7.

## The order across the three

Most batches can be taken in any order, and the documents say which must run one after another
within a stream. Across streams, the order is:

- Catalog batch 1 (landing batch 27) comes before levels 4.1, which checks that landing, and the
  levels lead reads each later catalog batch (levels 4.2) before it lands.
- Catalog batch 3 waits on art-shelf 4.2 (the magnet with a chain) and 4.4 (the ramp with a cup).
  Catalog batches 4 and 5 wait on the new drawings in art-shelf 4.6 to 4.11, and catalog batch 6
  waits on the drawing changes the art-shelf lead confirms.
- Levels 4.3, the closing pass, comes after catalog batch 7.
- Art-shelf 4.16 (the lamp world's two new blocks) can come before or after catalog batch 1, which
  lands the grade 1 pattern lesson as a paper listing; once 4.16 is in, that lesson can carry a
  program a child runs.

## What the three share

The scripts, staged files, notes, baselines and backups are in `.scratchpad/leftover/`, which is
ignored by git and by both dev servers. Its folders are `catalog-balance/`, `lesson-levels/` and
`parts-move/` for the three streams, `parts-plan/` for the art shelf's plan and its proofs,
`map-life/` for the tools the art shelf's motion scripts reuse, and `work/CHECKS.md` for the rules
every heavy check follows: one shared lock, a time limit on every check, a release on exit, and no
heavy check while the load average is over about 20. Some scripts link back into the tree through
`parts-move/new/`, so that folder is not to be copied elsewhere with its links resolved.

The documents name the people who ran each stream: the art-shelf lead, the catalog lead, the levels
lead, the map lead and the coordinator. Whoever picks up a document takes its lead's role. The map
and app streams were still running when these were written, so a step that asks the map lead for
a line asks whoever is running the map's plan at the time.
