// The grown-ups' Explore: every lesson in the family's pack, found by grade, subject and the words of
// its title. A lesson opens in the shared look (lesson-look.tsx), which the calendar opens too: a
// child's sheet alone, on squared paper in a dialog over the catalogue, rather than on a page of its
// own or on its world's roll, so there is no map or other lesson to wander into. `/explore/<id>` is
// this screen with that preview open, so the address is still shareable and the way back is the way a
// parent came. What Explore puts in the look's tools is its own: the level a sheet is
// read at, said over the stage and never on the sheet, and the print, which is the grown-up's sheet
// with the answers and the notes when they ask for them. Nothing here records anything.

import "./explore.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createEffect,
    createMemo,
    createSignal,
    For,
    on,
    onCleanup,
    onMount,
    Show,
    type JSX,
} from "solid-js";
import { gradeName } from "../../engine/grade";
import type { LessonFacts, Level } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Button, Check, Search } from "../../engine/ui/form";
import { Seg } from "../../engine/ui/fields";
import { LessonSheet } from "../../engine/ui/lesson";
import { hosted, printHosted } from "../../engine/ui/native";
import { useLook } from "../../engine/ui/page";
import { Waiting } from "../../engine/ui/waiting";
import { Postcard } from "../../engine/ui/postcard";
import { go, Link, path, useReady } from "../../engine/ui/router";
import { after, createHeld, type Maybe } from "../../engine/ui/held";
import type { Source } from "../../engine/ui/paged";
import { createPaged, ListEnd, readOnLastFocus } from "../../engine/ui/paged-list";
import { matches, Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import {
    filtersFrom,
    found,
    searchOf,
    shelfPage,
    variantOf,
    type Filters,
    type Shelf,
} from "../../school/catalogue";
import { variantName } from "../../school/family/names";
import { subjectFacts } from "../../school/tracks";
import type { PackView } from "../../server/api";
import {
    foundLine,
    LEVEL_WORDS,
    lessonPath,
    levelFrom,
    searchedLine,
    shelfCount,
    shelvesOf,
    subjectsOf,
} from "./catalogue";
import { LessonLook, sheetWidth, type LessonPaper } from "./lesson-look";
import { lessonIn, signInFor } from "./routes";
import * as shared from "./shared";
import { appPaper } from "./grown";

const local = onThisComputer(location.hostname);

/** How the catalogue names a lesson's kind. */
const FORMAT_WORDS: Record<string, string> = {
    teach: "Taught",
    worked: "Worked examples",
    puzzles: "Puzzles",
    review: "Review",
    book: "A whole book",
};

/** The family's pack, shared with every screen; a session that has ended goes to sign in and back. */
function family(): Maybe<PackView | Failure | null> {
    return after(shared.pack.read(), (p) => {
        if (!("error" in p)) return p;
        if (p.error === "put-away") {
            location.replace("/sign-in?locked=1");
            return null;
        }
        if (p.error !== "signed-out") return p;
        go(signInFor(`${location.pathname}${location.search}`), { replace: true });
        return null;
    });
}

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));

/** Where the catalogue was last narrowed to, so a lesson's way back returns there. */
let lastSearch = "";

/** The entry a look pushed, so closing it goes back over that entry rather than past the catalogue. */
const LOOK = { look: true };
const pushedLook = (): boolean => {
    const st: unknown = history.state;
    return typeof st === "object" && st !== null && "look" in st;
};

/** The drawer's own code, started when a parent's hand is on a tile, before the tap that opens it. */
const warmDrawer = (): void => {
    void import("../../engine/ui/scene").catch(() => undefined);
};

// wide like every other grown-ups' screen, so the bar and the cards keep their width and the map
// keeps its fade when a parent moves between tabs; the harbour lies between the meadow (Home) and
// the railway (Calendar) along the road, so the three tabs are three steps along it
const pageLook = (look: ReturnType<typeof useLook>): void =>
    look({
        place: "harbour",
        wide: true,
    });

/** What a screen shows when the pack did not come. */
function NotLoaded(props: { failure: Failure; again: () => void }): JSX.Element {
    return (
        <Waiting
            title="The lessons did not load"
            pending={false}
            detail={failureText(props.failure, local)}
            retry={props.again}
        />
    );
}

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? "" : "s"}`;

/** The catalogue: every lesson, narrowed by grade, subject and words, set out by grade and subject. */
export function Explore(): JSX.Element {
    pageLook(useLook());
    const [pack, { refetch }] = createHeld(family, [shared.pack]);
    useReady(() => pack.latest !== undefined);
    const loaded = (): PackView | null => {
        const p = pack.latest;
        return p && !("error" in p) ? p : null;
    };
    const failed = (): Failure | null => {
        const p = pack.latest;
        return p && "error" in p ? p : null;
    };
    return (
        <Show when={pack.latest} fallback={<Waiting title="Opening every lesson" />}>
            <Show when={failed()}>
                {(f) => <NotLoaded failure={f()} again={() => void refetch()} />}
            </Show>
            <Show when={loaded()}>{(p) => <Catalogue pack={p()} />}</Show>
        </Show>
    );
}

/**
 * Each shelf, a grade's lessons in one subject, is its own paged list over the index already loaded,
 * and every shelf starts again when the filters change. The counts are worked out over the whole
 * index, so a search finds across every grade, a folded one and a shelf not yet read included.
 */
function Catalogue(props: { pack: PackView }): JSX.Element {
    // every grade with lessons, including one not yet offered, so a grown-up can look ahead
    const lessons = props.pack.index.lessons;
    const grades = [...new Set(lessons.map((l) => l.grade))].sort((a, b) => a - b);
    const subjects = subjectsOf(lessons);
    const shelves = shelvesOf(lessons, subjects);
    // a language's or a country's lessons, which a child is shown only once it is chosen for them
    const variants = [...new Set(lessons.flatMap((l) => variantOf(l) ?? []))];
    /** The versions a subject's lessons come in: the countries of history, the languages of language. */
    const versionsOf = (subject: string | null): string[] =>
        subject === null
            ? []
            : [
                  ...new Set(
                      lessons.flatMap((l) => (l.subject === subject ? (variantOf(l) ?? []) : [])),
                  ),
              ];
    // an address naming a version without its subject keeps no filter the page would not show
    const fromAddress = filtersFrom(location.search, subjects, grades, variants);
    const [filters, setFilters] = createSignal<Filters>(
        versionsOf(fromAddress.subject).includes(fromAddress.variant ?? "")
            ? fromAddress
            : { ...fromAddress, variant: null },
    );
    const [words, setWords] = createSignal(filters().words);
    const versionsHere = createMemo(() => versionsOf(filters().subject));
    const matched = createMemo(() => found(lessons, filters()));
    /** How many lessons match on each shelf, keyed `grade subject`, and in each grade, keyed `grade`. */
    const counts = createMemo(() => {
        const n = new Map<string, number>();
        for (const l of matched())
            for (const k of [`${l.grade}`, `${l.grade} ${l.subject}`])
                n.set(k, (n.get(k) ?? 0) + 1);
        return n;
    });
    const count = (grade: number, subject?: string): number =>
        counts().get(subject === undefined ? `${grade}` : `${grade} ${subject}`) ?? 0;
    const narrow = matches("(max-width: 700px)");
    // a grade a parent has closed; narrowing reopens one that has matches, so nothing is hidden by a
    // filter and a fold at once
    const [closed, setClosed] = createSignal<ReadonlySet<number>>(new Set());
    /** The subjects a parent has folded inside an open grade, keyed `grade subject`. */
    const [folded, setFolded] = createSignal<ReadonlySet<string>>(new Set());
    const change = (f: Partial<Filters>): void => {
        const next = { ...filters(), ...f };
        setFilters(next);
        setClosed((was) => {
            const open = new Set(was);
            for (const shelf of shelves) if (count(shelf.grade)) open.delete(shelf.grade);
            return open;
        });
        setFolded((was) => {
            const open = new Set(was);
            for (const shelf of shelves)
                for (const s of shelf.subjects)
                    if (count(shelf.grade, s.subject)) open.delete(`${shelf.grade} ${s.subject}`);
            return open;
        });
        lastSearch = searchOf(next);
        // while a preview is open the address is the lesson's; the catalogue's is where Close returns
        if (lessonIn(path()) === null) go(`/explore${lastSearch}`, { replace: true });
    };
    let typing = 0;
    const typed = (v: string): void => {
        setWords(v);
        clearTimeout(typing);
        typing = window.setTimeout(() => change({ words: v }), 250);
    };
    const widen = (f: Partial<Filters>): void => {
        clearTimeout(typing);
        if (f.words !== undefined) setWords(f.words);
        change(f);
    };
    lastSearch = searchOf(filters());

    // The preview over the catalogue: `/explore/<id>` is a lesson, kept as a path so it can be
    // shared, bookmarked and opened in a tab of its own.
    const asked = (): string | null => lessonIn(path());
    const lessonOf = (id: string | null): LessonFacts | null =>
        id === null ? null : (lessons.find((l) => l.id === id) ?? null);
    /** The lesson the preview is open at, or null while there is none. */
    const previewed = (): LessonFacts | null => lessonOf(asked());
    /** An address naming a lesson this pack has not got, which the catalogue says over itself. */
    const noSuch = (): boolean => asked() !== null && lessonOf(asked()) === null;
    const declared = (): Level[] => {
        const f = previewed();
        return f ? f.levels : ["medium"];
    };
    const [level, setLevel] = createSignal<Level>(levelFrom(location.search, declared()));
    // a shared address carries the level it was read at, so each lesson opens at its own
    createEffect(
        on(
            path,
            () => {
                if (asked() !== null) setLevel(levelFrom(location.search, declared()));
            },
            { defer: true },
        ),
    );
    /** Opens the preview at a lesson, or closes it (null), through the address. */
    const look = (lesson: string | null): void => {
        if (lesson === null) {
            // going back over the entry the look pushed leaves the catalogue where it was read
            if (pushedLook()) history.back();
            else go(`/explore${lastSearch}`, { replace: true });
            return;
        }
        go(lessonPath(lesson, level()), { replace: pushedLook(), state: LOOK });
    };
    const choose = (l: Level): void => {
        if (l === level()) return;
        setLevel(l);
        const f = previewed();
        if (f) go(lessonPath(f.id, l), { replace: true, state: LOOK });
    };
    // an address opened straight at a lesson puts the catalogue under it, so back closes the preview
    // instead of leaving the app
    onMount(() => {
        if (asked() === null || pushedLook()) return;
        const deep = `${location.pathname}${location.search}${location.hash}`;
        history.replaceState(null, "", `/explore${lastSearch}`);
        history.pushState(LOOK, "", deep);
    });

    // a child's card on the family's home prints today's sheet from here, as the child has it
    // (home.tsx), so that address comes with the answers off and prints itself once
    const asChild = new URLSearchParams(location.search).has("print");
    const [key, setKey] = createSignal(!asChild);
    const [squared, setSquared] = createSignal(true);
    const [printing, setPrinting] = createSignal(asChild);
    /** What the look read the sheet from, which a print takes, so both draw the same sheet once. */
    const [paper, setPaper] = createSignal<LessonPaper | null>(null);
    let dropped = false;
    /** Prints the sheet the frame after its drawings are on the page. */
    const printNow = (): void => {
        if (asChild && !dropped) {
            dropped = true;
            const f = previewed();
            if (f) go(lessonPath(f.id, level()), { replace: true, state: LOOK });
        }
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                if (hosted() && printRoot) void printInApp(printRoot);
                else print();
            }),
        );
    };
    let printRoot: HTMLDivElement | undefined;
    /** The app prints on its own, and a card's sheet is recorded once it says it printed. */
    const printInApp = async (root: HTMLElement): Promise<void> => {
        const draft = shared.printing.take();
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const paper =
            draft?.kind === "sheet-printed"
                ? draft.data.paper === "Letter"
                    ? "letter"
                    : "a4"
                : appPaper(zone);
        const ok = await printHosted(root, paper);
        setPrinting(false);
        if (ok && draft) await api.append([draft]);
    };
    /** Asks for a print: the layer goes up and prints itself, or prints again if it is already up. */
    const printSheet = (): void => {
        if (printing()) printNow();
        else setPrinting(true);
    };
    // the sheet stays up until the browser says the print is over, so what was printed can be read
    const printDone = (): void => {
        setPrinting(false);
    };
    addEventListener("afterprint", printDone);
    onCleanup(() => removeEventListener("afterprint", printDone));
    // the page's title names the lesson the preview is at, which a printout carries in its header
    const titleWas = document.title;
    createEffect(() => {
        const f = previewed();
        document.title = f ? `${f.title} · lumischool` : titleWas;
    });
    onCleanup(() => {
        document.title = titleWas;
    });

    /** What the preview puts beside Close: the level the sheet is read at, and the print behind one control. */
    const Tools = (): JSX.Element => (
        <>
            <Show when={declared().length > 1}>
                <Seg
                    legend="The level"
                    quiet
                    name="level"
                    options={declared().map((l) => ({ value: l, label: LEVEL_WORDS[l] }))}
                    value={level()}
                    onChange={choose}
                />
            </Show>
            <details class="explore-print-menu">
                <summary>Print</summary>
                <div class="explore-print-menu-of">
                    <Check
                        label="Print on squared paper"
                        checked={squared()}
                        onChange={setSquared}
                    />
                    <Check
                        label="Print the answers and the notes for grown-ups"
                        checked={key()}
                        onChange={setKey}
                    />
                    <p class="note">
                        {key()
                            ? "It prints with the answers and the notes, for you."
                            : "It prints as a child's sheet, with nothing filled in."}
                    </p>
                    <Button onClick={printSheet}>Print this sheet</Button>
                </div>
            </details>
        </>
    );

    return (
        <div class="explore">
            <Show when={noSuch()}>
                <Postcard note kicker="Lessons" title="There is no such lesson">
                    <p class="note">
                        The address may be from an older set of lessons. Every lesson the family has
                        is below.
                    </p>
                </Postcard>
            </Show>
            <Postcard head focus={false} kicker="The lessons as written" title="Every lesson">
                <Search
                    label="Search the titles"
                    placeholder="making ten, magnets, a story"
                    value={words()}
                    onInput={typed}
                    found={foundLine(matched().length, lessons.length)}
                />
                <div class="explore-tags">
                    <Seg
                        legend="Subject"
                        name="subject"
                        quiet
                        options={[
                            { value: null, label: "All" },
                            ...subjects.map((s) => ({ value: s, label: subjectFacts(s).title })),
                        ]}
                        value={filters().subject}
                        onChange={(subject) => {
                            const kept = versionsOf(subject).includes(filters().variant ?? "");
                            change({ subject, variant: kept ? filters().variant : null });
                        }}
                    />
                    {/* a subject's versions, only once there are two to choose between: a quiet line
                        under the subjects, where pressing the chosen one again shows them all */}
                    <Show when={versionsHere().length > 1}>
                        <fieldset class="explore-versions">
                            <legend class="sr">
                                {filters().subject === "language" ? "Language" : "Country"}
                            </legend>
                            <span class="kicker" aria-hidden="true">
                                {filters().subject === "language" ? "Language" : "Country"}
                            </span>
                            <For each={versionsHere()}>
                                {(v) => (
                                    <button
                                        type="button"
                                        aria-pressed={filters().variant === v}
                                        onClick={() =>
                                            change({ variant: filters().variant === v ? null : v })
                                        }
                                    >
                                        {variantName(v)}
                                    </button>
                                )}
                            </For>
                        </fieldset>
                    </Show>
                </div>
            </Postcard>
            <Show when={!matched().length}>
                <Postcard note kicker="Lessons" title="Nothing found">
                    <p class="note">{searchedLine(filters())}</p>
                    <div class="explore-widen">
                        <Show when={filters().words.trim()}>
                            <Button second onClick={() => widen({ words: "" })}>
                                Clear the search
                            </Button>
                        </Show>
                        <Show when={filters().subject !== null}>
                            <Button second onClick={() => widen({ subject: null })}>
                                Every subject
                            </Button>
                        </Show>
                        <Show when={filters().grade !== null}>
                            <Button second onClick={() => widen({ grade: null })}>
                                Every grade
                            </Button>
                        </Show>
                        <Show when={filters().variant !== null}>
                            <Button second onClick={() => widen({ variant: null })}>
                                {filters().subject === "language"
                                    ? "Every language"
                                    : "Every country"}
                            </Button>
                        </Show>
                    </div>
                </Postcard>
            </Show>
            <For each={shelves}>
                {(shelf) => {
                    const lessonsHere = (): number => count(shelf.grade);
                    const open = (): boolean => !closed().has(shelf.grade);
                    const toggle = (): void => {
                        setClosed((was) => {
                            const next = new Set(was);
                            if (!next.delete(shelf.grade)) next.add(shelf.grade);
                            return next;
                        });
                    };
                    return (
                        <section
                            class="explore-grade"
                            aria-label={gradeName(shelf.grade)}
                            hidden={!lessonsHere()}
                        >
                            <span class="postcard-tape" aria-hidden="true" />
                            <span class="postcard-tape r" aria-hidden="true" />
                            {/* the heading is the control, so the whole row folds the grade away */}
                            <h2 class="explore-grade-head">
                                <button
                                    type="button"
                                    aria-expanded={open()}
                                    aria-label={`${gradeName(shelf.grade)}, ${plural(lessonsHere(), "lesson")}`}
                                    onClick={toggle}
                                >
                                    <span class="explore-grade-name">{gradeName(shelf.grade)}</span>
                                    <span class="kicker">{plural(lessonsHere(), "lesson")}</span>
                                    <span class="explore-fold" aria-hidden="true" />
                                </button>
                            </h2>
                            <Show when={open()}>
                                <For each={shelf.subjects}>
                                    {(s) => (
                                        <ShelfList
                                            lessons={lessons}
                                            shelf={{ grade: shelf.grade, subject: s.subject }}
                                            filters={filters}
                                            matches={count(shelf.grade, s.subject)}
                                            of={s.lessons.length}
                                            shown={!folded().has(`${shelf.grade} ${s.subject}`)}
                                            fold={() =>
                                                setFolded((was) => {
                                                    const next = new Set(was);
                                                    const k = `${shelf.grade} ${s.subject}`;
                                                    if (!next.delete(k)) next.add(k);
                                                    return next;
                                                })
                                            }
                                            digest={props.pack.pack}
                                            open={look}
                                        />
                                    )}
                                </For>
                            </Show>
                        </section>
                    );
                }}
            </For>
            {/* the teaching preview is not a filter, so it waits at the foot for a parent who has read */}
            <p class="explore-foot">
                <Link href="/tutoring">Try the teaching preview</Link>
            </p>
            <Show when={previewed()} keyed>
                {(f) => (
                    <LessonLook
                        title={f.title}
                        kicker="As a child sees it"
                        facts={f}
                        pack={props.pack.pack}
                        lessons={props.pack.index.lessons}
                        level={level()}
                        tools={<Tools />}
                        onPaper={setPaper}
                        onClose={() => look(null)}
                    />
                )}
            </Show>
            {/* what a print takes: the lesson's own sheet, at the level and with or without the
                answers, off the screen until the printer has it, so nothing else goes on the paper */}
            <Show when={printing() && paper()}>
                {(sheet) => (
                    <div
                        ref={(el) => {
                            printRoot = el;
                        }}
                        class="explore-print"
                        classList={{ "ls-squared": squared() }}
                        data-level={level()}
                        aria-hidden="true"
                    >
                        <LessonSheet
                            lesson={sheet().lesson}
                            level={level()}
                            strip={{
                                label: subjectFacts(sheet().lesson.subject).title,
                                date: null,
                            }}
                            width={sheetWidth(narrow())}
                            narrow={narrow()}
                            limits={{ sheets: "look", key: key() }}
                            draw={sheet().draw}
                            ref={printNow}
                        />
                    </div>
                )}
            </Show>
        </div>
    );
}

/** How many tiles a shelf reads at a time: two rows at a desk, three on a phone. */
const PAGE = 6;

/**
 * One shelf, a grade's lessons in one subject, read a page at a time from the index already loaded as
 * the parent scrolls, with nothing to press. Its first page waits until the shelf comes near, so a
 * shelf far down the catalogue costs nothing.
 */
function ShelfList(props: {
    lessons: readonly LessonFacts[];
    shelf: Shelf;
    filters: () => Filters;
    /** How many of the shelf's lessons the filters let through, and how many it holds. */
    matches: number;
    of: number;
    /** False while the parent has folded this subject away. */
    shown: boolean;
    fold: () => void;
    digest: string;
    open: (lesson: string) => void;
}): JSX.Element {
    const title = subjectFacts(props.shelf.subject).title;
    const source: Source<LessonFacts, Filters> = (f, after, limit) => {
        const page = shelfPage(props.lessons, props.shelf, f, after, limit);
        return Promise.resolve("problem" in page ? { error: "bad-request", status: 400 } : page);
    };
    const paged = createPaged(source, props.filters, { limit: PAGE, lazy: true });
    return (
        <div
            class="explore-subject"
            hidden={!props.matches}
            style={{ "--m": `var(--${subjectFacts(props.shelf.subject).marker})` }}
        >
            <h3>
                <button type="button" aria-expanded={props.shown} onClick={() => props.fold()}>
                    {title}
                    <span class="explore-subject-count">
                        {shelfCount(props.matches, props.of, !!props.filters().words.trim())}
                    </span>
                    <span class="explore-fold" aria-hidden="true" />
                </button>
            </h3>
            {/* a folded subject reads no more pages, since its end is not on the page to come near */}
            <Show when={props.shown}>
                <ul class="explore-tiles" onFocusIn={readOnLastFocus(paged)}>
                    <For each={paged.state().items}>
                        {(l) => (
                            <li>
                                <Tile
                                    lesson={l}
                                    digest={props.digest}
                                    warm={warmDrawer}
                                    open={() => props.open(l.id)}
                                />
                            </li>
                        )}
                    </For>
                </ul>
                <ListEnd
                    paged={paged}
                    arrived={(n) =>
                        `${plural(n, "more lesson")} in ${gradeName(props.shelf.grade)} ${title}`
                    }
                    local={local}
                />
            </Show>
        </div>
    );
}

/** A lesson in the catalogue: its first drawing, drawn once it comes near, its title and its kind. */
function Tile(props: {
    lesson: LessonFacts;
    digest: string;
    /** Starts what the preview needs while a hand is on the tile, before the tap that opens it. */
    warm: () => void;
    /** Opens the preview over the catalogue. A click with a modifier is left to the browser, for a tab of its own. */
    open: () => void;
}): JSX.Element {
    const l = props.lesson;
    const tag = variantOf(l);
    const sub = [
        FORMAT_WORDS[l.format] ?? l.format,
        l.unit === null ? "" : `Unit ${l.unit}`,
        tag === null ? "" : variantName(tag),
    ]
        .filter(Boolean)
        .join(" · ");
    const draw = async (host: HTMLElement): Promise<void> => {
        if (!l.first) return;
        const scene = await api.packScene(props.digest, l.first);
        if ("error" in scene) return;
        const svg = (await drawer([scene.scene]))(host, scene.scene, { seed: 7 });
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.width = "100%";
        svg.style.height = "100%";
        host.replaceChildren(svg);
    };
    return (
        <a
            href={lessonPath(l.id)}
            class="explore-tile"
            onPointerEnter={() => props.warm()}
            onFocus={() => props.warm()}
            onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                props.open();
            }}
        >
            <Near class="explore-pic on-paper" draw={draw} />
            <span class="explore-tile-title">{l.title}</span>
            <span class="explore-tile-sub">{sub}</span>
        </a>
    );
}
