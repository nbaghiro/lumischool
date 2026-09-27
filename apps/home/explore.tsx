// The grown-ups' Explore: every lesson in the family's pack, found by grade, subject and the words of
// its title. A lesson opens as a child meets it, in its own world on the world's own paper, over the
// catalogue rather than on a page of its own: `/explore/<id>` is this screen with that preview open,
// so the address is still shareable and the way back is the way a parent came. The level a sheet is
// read at is said over the stage and never on the sheet, and the printed sheet is the grown-up's,
// with the answers and the notes when they ask for them. Nothing here records anything.

import "./explore.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    lazy,
    on,
    onCleanup,
    onMount,
    Show,
    type JSX,
} from "solid-js";
import type { LessonFacts, Level, PackLesson } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import * as api from "../../engine/ui/api";
import { still } from "../../engine/ui/art";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Check } from "../../engine/ui/fields";
import { Button } from "../../engine/ui/form";
import { atFrom, hashNow, hashOf, type OverlayAt } from "../../engine/ui/hash";
import { LessonSheet } from "../../engine/ui/lesson";
import { useLook } from "../../engine/ui/page";
import { Waiting } from "../../engine/ui/waiting";
import { Postcard } from "../../engine/ui/postcard";
import { go, Link, path, search, useReady } from "../../engine/ui/router";
import { after, createHeld, type Maybe } from "../../engine/ui/held";
import { matches, Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import { gradeName } from "../../school/family/names";
import { subjectFacts } from "../../school/tracks";
import type { PackView } from "../../server/api";
import {
    filtersFrom,
    found,
    foundLine,
    LEVEL_WORDS,
    lessonPath,
    levelFrom,
    levelsOf,
    searchOf,
    shelvesOf,
    subjectsOf,
    EVERYTHING,
    type Filters,
} from "./catalogue";
import { lessonIn, signInFor } from "./routes";
import * as shared from "./shared";

const local = onThisComputer(location.hostname);

/** How the catalogue names a lesson's kind. */
const FORMAT_WORDS: Record<string, string> = {
    teach: "Taught",
    worked: "Worked examples",
    puzzles: "Puzzles",
    review: "Review",
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

// the overlay, the worlds and the map come with the first look a grown-up takes, not with the page
const Overlay = lazy(() => import("../../engine/ui/overlay").then((m) => ({ default: m.Overlay })));

/** The entry a look pushed, so closing it goes back over that entry rather than past the catalogue. */
const LOOK = { look: true };
const pushedLook = (): boolean => {
    const st: unknown = history.state;
    return typeof st === "object" && st !== null && "look" in st;
};

/** The look's own code and the school it reads, started when a parent's hand is on a tile. */
const warmSchool = (pack: PackView): void => {
    void import("../../engine/ui/overlay").catch(() => undefined);
    void import("./school").then((m) => m.schoolOnce(pack, still())).catch(() => undefined);
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

/** A row of choices, one at a time, each a button at least 44 pixels high. */
function Seg<V extends string | number | null>(props: {
    legend: string;
    /** The legend is for a screen reader only, where a heading above already says it. */
    quiet?: boolean;
    name: string;
    options: readonly { value: V; label: string }[];
    value: V;
    onChange: (v: V) => void;
}): JSX.Element {
    return (
        <fieldset class="explore-seg">
            <legend classList={{ sr: !!props.quiet }}>{props.legend}</legend>
            <For each={props.options}>
                {(o) => (
                    <label class="explore-seg-option">
                        <input
                            type="radio"
                            name={props.name}
                            checked={o.value === props.value}
                            onChange={() => props.onChange(o.value)}
                        />
                        <span>{o.label}</span>
                    </label>
                )}
            </For>
        </fieldset>
    );
}

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
 * Every lesson is laid out once, and narrowing hides what does not match, so a picture drawn stays
 * drawn while the grown-up types.
 */
function Catalogue(props: { pack: PackView }): JSX.Element {
    const lessons = props.pack.index.lessons;
    const subjects = subjectsOf(lessons);
    const shelves = shelvesOf(found(lessons, EVERYTHING), subjects);
    const [filters, setFilters] = createSignal<Filters>(filtersFrom(location.search, subjects));
    const [words, setWords] = createSignal(filters().words);
    const shown = createMemo(() => new Set(found(lessons, filters()).map((l) => l.id)));
    const count = (ls: readonly LessonFacts[]): number =>
        ls.reduce((n, l) => n + (shown().has(l.id) ? 1 : 0), 0);
    const narrow = matches("(max-width: 700px)");
    // a grade a parent has closed; narrowing reopens one that has matches, so nothing is hidden by a
    // filter and a fold at once
    const [closed, setClosed] = createSignal<ReadonlySet<number>>(new Set());
    const change = (f: Partial<Filters>): void => {
        const next = { ...filters(), ...f };
        setFilters(next);
        setClosed((was) => {
            const open = new Set(was);
            for (const shelf of shelves)
                if (count(shelf.subjects.flatMap((s) => s.lessons))) open.delete(shelf.grade);
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
        typing = window.setTimeout(() => change({ words: v }), 180);
    };
    lastSearch = searchOf(filters());

    // The preview over the catalogue: `/explore/<id>` is a lesson, kept as a path so it can be
    // shared, bookmarked and opened in a tab of its own, and a parent who wanders from it into the
    // worlds moves after the `#` (engine/ui/hash.ts) over the catalogue's own address.
    const asked = (): string | null => lessonIn(path());
    const lessonOf = (id: string | null): LessonFacts | null =>
        id === null ? null : (lessons.find((l) => l.id === id) ?? null);
    const at = (): OverlayAt | null => {
        const wandered = atFrom(hashNow(search));
        if (wandered) return wandered;
        const f = lessonOf(asked());
        return f ? { world: null, lesson: f.id } : null;
    };
    /** The lesson the preview opened at, whether the address names it alone or on its world's roll. */
    const previewed = (): LessonFacts | null => lessonOf(at()?.lesson ?? null);
    /** An address naming a lesson this pack has not got, which the catalogue says over itself. */
    const noSuch = (): boolean => asked() !== null && lessonOf(asked()) === null;
    const declared = (): Level[] => {
        const f = previewed();
        return f ? levelsOf(f) : ["medium"];
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
    /** Where the preview looks, in the address: a lesson at its own path, the worlds after the `#`. */
    const look = (to: OverlayAt | null): void => {
        const here = `/explore${lastSearch}`;
        if (to === null) {
            // going back over the entry the look pushed leaves the catalogue where it was read
            if (pushedLook()) history.back();
            else go(here, { replace: true });
            return;
        }
        const address =
            !to.world && to.lesson ? lessonPath(to.lesson, level()) : `${here}${hashOf(to)}`;
        // one entry for the whole look, so back closes it from wherever a parent has wandered to
        go(address, { replace: pushedLook(), state: LOOK });
    };
    const choose = (l: Level): void => {
        if (l === level()) return;
        setLevel(l);
        const here = at();
        if (here && !here.world && here.lesson)
            go(lessonPath(here.lesson, l), { replace: true, state: LOOK });
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
    const [wanted, setWanted] = createSignal(asChild);
    const [printing, setPrinting] = createSignal(asChild);
    /** The lesson's own file and drawings, read when a print is in prospect rather than with the look. */
    const [paper] = createResource(
        () => (wanted() ? previewed() : null),
        async (f): Promise<{ lesson: PackLesson; draw: SceneDrawer } | null> => {
            const read = await api.packLesson(props.pack.pack, f.file);
            if ("error" in read) return null;
            const m = await import("../../engine/ui/scene");
            return { lesson: read, draw: await m.scenes(m.scenesIn(read)) };
        },
    );
    const width = (): number => (narrow() ? Math.min(innerWidth - 32, 480) : 820);
    let dropped = false;
    /** Prints the sheet the frame after its drawings are on the page. */
    const printNow = (): void => {
        if (asChild && !dropped) {
            dropped = true;
            const f = previewed();
            if (f) go(lessonPath(f.id, level()), { replace: true, state: LOOK });
        }
        requestAnimationFrame(() => requestAnimationFrame(() => print()));
    };
    /** Asks for a print: the layer goes up and prints itself, or prints again if it is already up. */
    const printSheet = (): void => {
        setWanted(true);
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

    /** What the preview puts beside Close: the level the sheets are written at, and the print. */
    const Tools = (): JSX.Element => (
        <Show when={previewed()}>
            {/* on a phone the tools fold behind one control, as the catalogue's own filter does, so
                the sheet keeps the screen; a hand on them reads the file a print will want */}
            <details
                class="explore-tools"
                open={!narrow()}
                onPointerEnter={() => setWanted(true)}
                onFocusIn={() => setWanted(true)}
            >
                <summary>Level and print</summary>
                <div class="explore-tools-of">
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
                    <Check
                        label="Print the answers and the notes for grown-ups"
                        checked={key()}
                        onChange={setKey}
                    />
                    <Button second onClick={printSheet}>
                        Print this sheet
                    </Button>
                    <p class="note explore-tools-note">
                        {key()
                            ? "It prints with the answers and the notes, for you."
                            : "It prints as a child's sheet, with nothing filled in."}
                    </p>
                </div>
            </details>
        </Show>
    );

    return (
        <div class="explore">
            <Show when={noSuch()}>
                <Postcard note kicker="Explore" title="There is no such lesson">
                    <p class="note">
                        The address may be from an older set of lessons. Every lesson the family has
                        is below.
                    </p>
                </Postcard>
            </Show>
            <div class="explore-row">
                <span class="postcard-tape" aria-hidden="true" />
                <span class="postcard-tape r" aria-hidden="true" />
                <h1>Every lesson</h1>
                {/* one set of chips: open beside the name at a desk, behind Filter on a phone */}
                <details class="explore-row-filter" open={!narrow()}>
                    <summary>Filter</summary>
                    <Seg
                        legend="Subject"
                        name="subject"
                        quiet
                        options={[
                            { value: null, label: "Every subject" },
                            ...subjects.map((s) => ({ value: s, label: subjectFacts(s).title })),
                        ]}
                        value={filters().subject}
                        onChange={(subject) => change({ subject })}
                    />
                </details>
                <div class="explore-find">
                    <label class="field explore-search">
                        <span class="field-label">Search the titles</span>
                        <input
                            type="search"
                            autocomplete="off"
                            placeholder="making ten, magnets, a story"
                            value={words()}
                            onInput={(e) => typed(e.currentTarget.value)}
                        />
                    </label>
                    <p class="explore-said" aria-live="polite">
                        {foundLine(shown().size, lessons.length)}
                    </p>
                </div>
            </div>
            <For each={shelves}>
                {(shelf) => {
                    const lessonsHere = (): number =>
                        count(shelf.subjects.flatMap((s) => s.lessons));
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
                                        <div
                                            class="explore-subject"
                                            hidden={!count(s.lessons)}
                                            style={{
                                                "--m": `var(--${subjectFacts(s.subject).marker})`,
                                            }}
                                        >
                                            <h3>{subjectFacts(s.subject).title}</h3>
                                            <ul class="explore-tiles">
                                                <For each={s.lessons}>
                                                    {(l) => (
                                                        <li hidden={!shown().has(l.id)}>
                                                            <Tile
                                                                lesson={l}
                                                                digest={props.pack.pack}
                                                                warm={() => warmSchool(props.pack)}
                                                                open={() =>
                                                                    look({
                                                                        world: null,
                                                                        lesson: l.id,
                                                                    })
                                                                }
                                                            />
                                                        </li>
                                                    )}
                                                </For>
                                            </ul>
                                        </div>
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
            {/* the look is read as a plain value rather than through Show's accessor, which throws
                once the look has gone while the overlay is still being taken down */}
            <Show when={at() !== null}>
                <Overlay
                    at={at()}
                    kicker="As a child sees it"
                    heading={previewed()?.title}
                    level={level()}
                    tools={<Tools />}
                    source={() =>
                        import("./school").then(async (m) =>
                            m.overlayOf(await m.schoolOnce(props.pack, still()), {
                                level: level(),
                            }),
                        )
                    }
                    go={look}
                />
            </Show>
            {/* what a print takes: the lesson's own sheet, at the level and with or without the
                answers, off the screen until the printer has it, so nothing else goes on the paper */}
            <Show when={printing() && paper()}>
                {(sheet) => (
                    <div class="explore-print" data-level={level()} aria-hidden="true">
                        <LessonSheet
                            lesson={sheet().lesson}
                            level={level()}
                            strip={{
                                label: subjectFacts(sheet().lesson.subject).title,
                                date: null,
                            }}
                            width={width()}
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
    const sub = [FORMAT_WORDS[l.format] ?? l.format, l.unit === null ? "" : `Unit ${l.unit}`]
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
