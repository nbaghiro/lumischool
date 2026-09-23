// The grown-ups' Explore: every lesson in the family's pack, found by grade, subject and the words of
// its title, each opening to its sheet as a child would have it, at any level the lesson declares,
// with the answers and the notes for grown-ups, ready to print. Which level a sheet is at is said on
// the grown-up's card and never on the sheet. Nothing here records anything or changes a plan.

import "./explore.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    lazy,
    onCleanup,
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
import { Part, useLook, Waiting } from "../../engine/ui/page";
import { Corner, Postcard } from "../../engine/ui/postcard";
import { go, Link, path, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { matches, Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import { gradeName } from "../../school/family/names";
import { subjectFacts } from "../../school/tracks";
import type { PackView } from "../../server/api";
import {
    besideIn,
    filtersFrom,
    found,
    foundLine,
    GRADES,
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
import { lessonIn, mapHref, signInFor } from "./routes";

const local = onThisComputer(location.hostname);

/** How the catalogue names a lesson's kind. */
const FORMAT_WORDS: Record<string, string> = {
    teach: "Taught",
    worked: "Worked examples",
    puzzles: "Puzzles",
    review: "Review",
};

/** The family's pack, read once for both screens; a session that has ended goes to sign in and back. */
let packOnce: Promise<PackView | Failure> | null = null;
async function family(): Promise<PackView | Failure | null> {
    const p = await (packOnce ??= api.pack());
    if (!("error" in p)) return p;
    packOnce = null;
    if (p.error === "put-away") {
        location.replace("/sign-in?locked=1");
        return null;
    }
    if (p.error !== "signed-out") return p;
    go(signInFor(`${location.pathname}${location.search}`), { replace: true });
    return null;
}

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));

/** Where the catalogue was last narrowed to, so a lesson's way back returns there. */
let lastSearch = "";

// the overlay, the worlds and the map come with the first look a grown-up takes, not with the page
const Overlay = lazy(() => import("../../engine/ui/overlay").then((m) => ({ default: m.Overlay })));

/** The entry the overlay pushed, so closing it goes back to the page's own rather than past it. */
const LOOK = { look: true };
const pushedLook = (): boolean => {
    const st: unknown = history.state;
    return typeof st === "object" && st !== null && "look" in st;
};

/** Looks at a lesson as a child sees it, over this page: the address after the `#` opens the overlay. */
function look(at: OverlayAt | null): void {
    const here = `${location.pathname}${location.search}`;
    if (at === null) {
        if (pushedLook()) history.back();
        else go(here, { replace: true });
        return;
    }
    const to = `${here}${hashOf(at)}`;
    go(to, { replace: pushedLook() });
    history.replaceState(LOOK, "", to);
}

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
        <Postcard note kicker="Explore" title="The lessons did not load">
            <Say
                text={failureText(props.failure, local)}
                action={{ label: "Try again", run: props.again }}
            />
        </Postcard>
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
    const [pack, { refetch }] = createResource(family);
    const loaded = (): PackView | null => {
        const p = pack.latest;
        return p && !("error" in p) ? p : null;
    };
    const failed = (): Failure | null => {
        const p = pack.latest;
        return p && "error" in p ? p : null;
    };
    return (
        <Show
            when={pack.latest}
            fallback={<Waiting kicker="Explore" title="Opening every lesson" />}
        >
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
    const change = (f: Partial<Filters>): void => {
        const next = { ...filters(), ...f };
        setFilters(next);
        lastSearch = searchOf(next);
        history.replaceState(null, "", `/explore${lastSearch}`);
    };
    let typing = 0;
    const typed = (v: string): void => {
        setWords(v);
        clearTimeout(typing);
        typing = window.setTimeout(() => change({ words: v }), 180);
    };
    lastSearch = searchOf(filters());
    return (
        <div class="explore">
            <Postcard
                wide
                kicker="Explore"
                title="Every lesson"
                lead="Every lesson in every subject, from grade 1 to grade 4."
                corner={<Corner place="harbour" seed={913} />}
            >
                <div class="explore-filters">
                    <Seg
                        legend="Grade"
                        name="grade"
                        options={[
                            { value: null, label: "Every grade" },
                            ...GRADES.map((g) => ({ value: g, label: gradeName(g) })),
                        ]}
                        value={filters().grade}
                        onChange={(grade) => change({ grade })}
                    />
                    <Seg
                        legend="Subject"
                        name="subject"
                        options={[
                            { value: null, label: "Every subject" },
                            ...subjects.map((s) => ({ value: s, label: subjectFacts(s).title })),
                        ]}
                        value={filters().subject}
                        onChange={(subject) => change({ subject })}
                    />
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
            </Postcard>
            <For each={shelves}>
                {(shelf) => (
                    <section
                        class="explore-grade"
                        aria-label={gradeName(shelf.grade)}
                        hidden={!count(shelf.subjects.flatMap((s) => s.lessons))}
                    >
                        <header class="explore-grade-head">
                            <h2>{gradeName(shelf.grade)}</h2>
                            <p class="kicker">
                                {plural(count(shelf.subjects.flatMap((s) => s.lessons)), "lesson")}
                            </p>
                        </header>
                        <For each={shelf.subjects}>
                            {(s) => (
                                <div
                                    class="explore-subject"
                                    hidden={!count(s.lessons)}
                                    style={{ "--m": `var(--${subjectFacts(s.subject).marker})` }}
                                >
                                    <h3>{subjectFacts(s.subject).title}</h3>
                                    <ul class="explore-tiles">
                                        <For each={s.lessons}>
                                            {(l) => (
                                                <li hidden={!shown().has(l.id)}>
                                                    <Tile lesson={l} digest={props.pack.pack} />
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </div>
                            )}
                        </For>
                    </section>
                )}
            </For>
        </div>
    );
}

/** A lesson in the catalogue: its first drawing, drawn once it comes near, its title and its kind. */
function Tile(props: { lesson: LessonFacts; digest: string }): JSX.Element {
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
        <Link href={lessonPath(l.id)} class="explore-tile">
            <Near class="explore-pic on-paper" draw={draw} />
            <span class="explore-tile-title">{l.title}</span>
            <span class="explore-tile-sub">{sub}</span>
        </Link>
    );
}

/** One lesson, read at a level with its answers, and printed as it is shown. */
export function ExploreLesson(): JSX.Element {
    pageLook(useLook());
    const [pack, { refetch }] = createResource(family);
    const failed = (): Failure | null => {
        const p = pack.latest;
        return p && "error" in p ? p : null;
    };
    const loaded = (): PackView | null => {
        const p = pack.latest;
        return p && !("error" in p) ? p : null;
    };
    const facts = (): LessonFacts | null => {
        const id = lessonIn(path());
        return loaded()?.index.lessons.find((l) => l.id === id) ?? null;
    };
    return (
        <Show when={pack.latest} fallback={<Waiting kicker="Explore" title="Opening the lesson" />}>
            <Show when={failed()}>
                {(f) => <NotLoaded failure={f()} again={() => void refetch()} />}
            </Show>
            <Show when={loaded()}>
                {(p) => (
                    <Show
                        when={facts()}
                        keyed
                        fallback={
                            <Postcard note kicker="Explore" title="There is no such lesson">
                                <p class="note">The address may be from an older set of lessons.</p>
                                <div class="acts">
                                    <Link href={`/explore${lastSearch}`}>Every lesson</Link>
                                </div>
                            </Postcard>
                        }
                    >
                        {(f) => <Reading pack={p()} facts={f} />}
                    </Show>
                )}
            </Show>
        </Show>
    );
}

function Reading(props: { pack: PackView; facts: LessonFacts }): JSX.Element {
    const f = props.facts;
    const declared = levelsOf(f);
    const [level, setLevel] = createSignal<Level>(levelFrom(location.search, declared));
    // a child's card on the home prints today's sheet from here, as the child has it
    const printing = new URLSearchParams(location.search).has("print");
    const [key, setKey] = createSignal(!printing);
    const [lesson, { refetch }] = createResource(async (): Promise<PackLesson | Failure> =>
        api.packLesson(props.pack.pack, f.file),
    );
    const narrow = matches("(max-width: 700px)");
    const width = (): number => (narrow() ? Math.min(innerWidth - 32, 480) : 820);
    const { before, after } = besideIn(props.pack.index.lessons, f.id);
    const subject = subjectFacts(f.subject).title;
    const choose = (l: Level): void => {
        setLevel(l);
        history.replaceState(null, "", lessonPath(f.id, l));
    };
    // the page's title names the lesson, which a printout carries in its header
    const was = document.title;
    createEffect(() => {
        document.title = `${f.title} · lumischool`;
    });
    onCleanup(() => {
        document.title = was;
    });
    const read = (): PackLesson | null => {
        const l = lesson.latest;
        return l && !("error" in l) ? l : null;
    };
    const [draw] = createResource(read, (l) =>
        import("../../engine/ui/scene").then((m) => m.scenes(m.scenesIn(l))),
    );
    const failed = (): Failure | null => {
        const l = lesson.latest;
        return l && "error" in l ? l : null;
    };
    const looking = createMemo(() => atFrom(hashNow(search)));
    let printed = !printing;
    const printOnce = (): void => {
        if (printed) return;
        printed = true;
        history.replaceState(null, "", lessonPath(f.id, level()));
        // the sheet's drawings are on the page a frame after it is
        requestAnimationFrame(() => requestAnimationFrame(() => print()));
    };
    return (
        <div class="explore explore-lesson">
            <Postcard
                wide
                kicker={[subject, gradeName(f.grade), f.unit === null ? "" : `Unit ${f.unit}`]
                    .filter(Boolean)
                    .join(" · ")}
                title={f.title}
                lead={f.goal ?? undefined}
                corner={<Corner place="harbour" seed={917} />}
            >
                <Show when={declared.length > 1}>
                    <Part title="Read it at">
                        <Seg
                            legend="The level"
                            quiet
                            name="level"
                            options={declared.map((l) => ({ value: l, label: LEVEL_WORDS[l] }))}
                            value={level()}
                            onChange={choose}
                        />
                        <p class="note">
                            The level is yours to see. The child's sheet never says which one it is.
                        </p>
                    </Part>
                </Show>
                <Part title="Print it">
                    <Check
                        label="Show the answers and the notes for grown-ups"
                        checked={key()}
                        onChange={setKey}
                    />
                    <div class="acts">
                        <Button onClick={() => print()}>Print this sheet</Button>
                    </div>
                    <p class="note">
                        {key()
                            ? "It prints as you see it, with the answers, for you."
                            : "It prints as a child's sheet, with nothing filled in."}
                    </p>
                </Part>
                <nav
                    class="explore-np"
                    aria-label="This lesson in the app, and the lessons either side"
                >
                    <a
                        href={hashOf({ world: null, lesson: f.id })}
                        class="link"
                        onClick={(e) => {
                            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                            e.preventDefault();
                            look({ world: null, lesson: f.id });
                        }}
                    >
                        See it as a child sees it
                    </a>
                    <Link href={mapHref({ lesson: f.id })}>Open on the map</Link>
                    <Show when={before}>
                        {(b) => <Link href={lessonPath(b().id)}>{`Before it: ${b().title}`}</Link>}
                    </Show>
                    <Show when={after}>
                        {(a) => <Link href={lessonPath(a().id)}>{`After it: ${a().title}`}</Link>}
                    </Show>
                    <Link href={`/explore${lastSearch}`}>Every lesson</Link>
                </nav>
            </Postcard>
            {/* the look is read as a plain value rather than through Show's accessor, which throws
                once the look has gone while the overlay is still being taken down */}
            <Show when={looking() !== null}>
                <Overlay
                    at={looking()}
                    kicker="As a child sees it"
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
            <div class="explore-sheet" data-level={level()}>
                <Show when={failed()}>
                    {(fl) => <NotLoaded failure={fl()} again={() => void refetch()} />}
                </Show>
                <Show when={read()}>
                    {(l) => (
                        <Show when={draw()}>
                            {(d) => (
                                <LessonSheet
                                    lesson={l()}
                                    level={level()}
                                    strip={{ label: subject, date: null }}
                                    width={width()}
                                    narrow={narrow()}
                                    limits={{ sheets: "look", key: key() }}
                                    draw={d()}
                                    ref={printOnce}
                                />
                            )}
                        </Show>
                    )}
                </Show>
            </div>
        </div>
    );
}
