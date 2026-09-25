// A world's roll for reading (world.tsx), with its sheets drawn as the roll comes near them, from
// wherever the page reads them, and let go of again; until its paper lands a sheet is a card with the
// lesson's title and its first drawing. What each sheet measured is kept, so the roll is laid out
// round it once and nothing moves under the reader. The grown-ups' map (apps/home/map.tsx) and the
// overlay (overlay.tsx) read a world this way; a child's own roll is the child's page's (apps/kids).

import "./reading.css";
import type { SheetView, WorldView } from "../space";
import {
    createEffect,
    createMemo,
    createSignal,
    getOwner,
    For,
    on,
    onCleanup,
    runWithOwner,
    Show,
    type JSX,
} from "solid-js";
import type { Measured } from "./lesson";
import { nearPaper } from "./paper";
import { PaperStatus } from "./paper-status";
import { entryLessons } from "./reading-source";
import { matches, Near } from "./viewport";
import { World } from "./world";
import { Select } from "./select";

/** A sheet's height on the roll while it is a card rather than the lesson, in the roll's units. */
export const CARD = 620;

export interface ReadingSource {
    description?: string;
    alternate?: string;
    variants?: readonly { value: number; label: string }[];
    variant?: number;
    neighbours?: readonly { world: string; label: string }[];
    /** The roll, laid out round the heights the sheets measured; `CARD` stands in until one is drawn. */
    world(o: { narrow: boolean; height: (lesson: string) => number | null }): WorldView;
    /** A lesson's sheet, drawn and measured for the roll to lay, or null while it cannot be read. */
    sheet(lesson: string, o: { narrow: boolean; measureIn: HTMLElement }): Promise<Measured | null>;
    /** What a sheet's card says until its paper lands: the corner's label and note, and its first drawing. */
    card(lesson: string): {
        label: string;
        note: string;
        picture?: (host: HTMLElement) => Promise<void>;
    };
}

export function Reading(props: {
    source: ReadingSource;
    /** Where the view being left put the world on the screen, so the roll grows out of it (world.tsx). */
    from?: DOMRect;
    /** A lesson the roll opens at, at its day, rather than at the world's arrival. */
    lesson?: string | null;
    /** The heading a screen reader finds the roll by. */
    title: string;
    class?: string;
    /** Out of the roll, with the box the map opens the place in, or null when it cut. */
    onOut: (at: DOMRect | null) => void;
    onAlternate?: () => void;
    onVariant?: (grade: number) => void;
    onWorld?: (world: string) => void;
    onApproachWorld?: (world: string) => void;
}): JSX.Element {
    const narrow = matches("(max-width: 700px)");
    // bumped whenever paper lands or goes, so the roll lays out again round what it measured
    const [drew, setDrew] = createSignal(0);
    let measure: HTMLDivElement | undefined;
    const paper = nearPaper({
        draw: (lesson) =>
            props.source.sheet(lesson, { narrow: narrow(), measureIn: measure ?? document.body }),
        drawn: () => setDrew((n) => n + 1),
    });
    onCleanup(() => paper.forget());
    const view = createMemo(() => {
        drew();
        return props.source.world({
            narrow: narrow(),
            height: (lesson) => paper.height(lesson),
        });
    });
    const entry = createMemo(() => entryLessons(view(), props.lesson));
    const [entered, setEntered] = createSignal(false);
    let nearby: readonly string[] = [];
    const wanted = (): string[] => [...new Set([...entry(), ...nearby])];
    const failed = (): boolean => {
        drew();
        return entry().some((id) => paper.failed(id));
    };
    const waiting = (): boolean => {
        drew();
        return !entered() && entry().some((id) => !paper.sheet(id));
    };
    createEffect(
        on(
            () => [narrow(), props.lesson, props.source],
            () => {
                paper.forget();
                setEntered(false);
                paper.lookBack(wanted());
            },
        ),
    );
    createEffect(() => {
        if (!waiting()) setEntered(true);
    });
    /** The day on the roll that holds the lesson it opens at, by the id the roll opens at. */
    const day = (): string | undefined => {
        const lesson = props.lesson;
        if (!lesson) return undefined;
        return view().layout.rows.find((r) => r.day.lessons.includes(lesson))?.day.id;
    };
    // the roll asks for a sheet's card more than once, so each is made once and belongs to the roll
    // rather than to whichever of its reads asked first; the paper goes into the card that is already
    // drawn, so the element the reader is on stays the element on the page
    const owner = getOwner();
    const made = new Map<string, { el: HTMLElement; slot: HTMLElement }>();
    const card = (s: SheetView): HTMLElement | null => {
        let had = made.get(s.lesson);
        if (!had) {
            const words = props.source.card(s.lesson);
            const loading = (): boolean => {
                drew();
                return paper.loading(s.lesson);
            };
            const failed = (): boolean => {
                drew();
                return paper.failed(s.lesson);
            };
            let slot: HTMLElement | undefined;
            const el = runWithOwner(owner, () => (
                <article
                    class="j-sheet squared wd-sheet rd-sheet"
                    style={{ width: `${view().layout.o.sheet}px`, "min-height": `${CARD}px` }}
                    data-lesson={s.lesson}
                    aria-busy={loading()}
                    aria-label={s.title}
                >
                    <div
                        class="rd-paper"
                        ref={(node) => {
                            slot = node;
                        }}
                    />
                    <div class="rd-first">
                        <div class="j-strip">
                            <span class="label">{words.label}</span>
                            <span class="date hand">{words.note}</span>
                        </div>
                        <h2 class="rd-title hand">{s.title}</h2>
                        <Show when={words.picture}>
                            {(draw) => <Near class="rd-pic" draw={draw()} />}
                        </Show>
                    </div>
                    <Show when={loading() || failed()}>
                        <div class="rd-lesson-status">
                            <span>
                                {failed() ? "This lesson couldn’t load." : "Loading this lesson…"}
                            </span>
                            <Show when={failed()}>
                                <button
                                    type="button"
                                    class="btn second"
                                    onClick={() => paper.lookBack(wanted())}
                                >
                                    Try again
                                </button>
                            </Show>
                        </div>
                    </Show>
                    <div class="j-cover" aria-hidden="true">
                        <span class="label">{words.label}</span>
                        <span class="t hand">{s.title}</span>
                    </div>
                </article>
            ));
            if (!(el instanceof HTMLElement) || !slot) return null;
            had = { el, slot };
            made.set(s.lesson, had);
        }
        const p = paper.sheet(s.lesson);
        const h = paper.height(s.lesson);
        had.el.style.width = `${view().layout.o.sheet}px`;
        if (h !== null) had.el.style.minHeight = `${h}px`;
        if (p && !had.slot.contains(p.el)) {
            had.slot.replaceChildren(p.el);
            had.el.classList.add("rd-read");
        } else if (!p && had.el.classList.contains("rd-read")) {
            had.slot.replaceChildren();
            had.el.classList.remove("rd-read");
        }
        return had.el;
    };
    return (
        <>
            <div
                class="rd-measure"
                ref={(el) => {
                    measure = el;
                }}
            />
            <World
                view={view()}
                from={props.from}
                sheet={card}
                lookBack={(near) => {
                    nearby = near;
                    paper.lookBack(wanted());
                }}
                waiting={waiting()}
                open={day()}
                land={props.lesson ? { lesson: props.lesson, y: 0 } : undefined}
                class={`${props.class ?? ""}${waiting() ? " rd-loading" : ""}`}
                title={props.title}
                onOut={(at) => props.onOut(at)}
            />
            <Show
                when={
                    !waiting() &&
                    (props.source.neighbours?.length ||
                        props.source.variants?.length ||
                        props.source.description ||
                        props.source.alternate)
                }
            >
                <nav class="rd-neighbours" aria-label="World browsing">
                    <Show when={props.source.description}>
                        <span class="rd-purpose">{props.source.description}</span>
                    </Show>
                    <Show when={props.onVariant && props.source.variants?.length}>
                        <Select
                            aria-label="Lessons to browse"
                            value={props.source.variant}
                            onChange={(event) =>
                                props.onVariant?.(Number(event.currentTarget.value))
                            }
                        >
                            <For each={props.source.variants}>
                                {(v) => (
                                    <option
                                        value={v.value}
                                        selected={v.value === props.source.variant}
                                    >
                                        {v.label}
                                    </option>
                                )}
                            </For>
                        </Select>
                    </Show>
                    <Show when={props.onAlternate && props.source.alternate}>
                        <button type="button" onClick={() => props.onAlternate?.()}>
                            {props.source.alternate}
                        </button>
                    </Show>
                    <For each={props.source.neighbours}>
                        {(place) => (
                            <button
                                type="button"
                                onPointerEnter={() => props.onApproachWorld?.(place.world)}
                                onFocus={() => props.onApproachWorld?.(place.world)}
                                onClick={() => props.onWorld?.(place.world)}
                            >
                                {place.label}
                            </button>
                        )}
                    </For>
                </nav>
            </Show>
            <PaperStatus
                waiting={waiting()}
                failed={failed()}
                retry={() => paper.lookBack(wanted())}
            />
        </>
    );
}
