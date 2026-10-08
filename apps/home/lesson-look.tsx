// One lesson with answers and parent notes, lifted into a dialog over the
// still picture of the world the lesson is met in. Explore opens it over the catalogue with the
// level and the print beside Close; the calendar opens it over a day with that lesson's place in
// the plan under the row. It lives here rather than in `engine/ui/` because it reads the world a
// lesson belongs to (`./where`) and names the subject on the sheet's corner (`school/tracks`),
// neither of which `engine/ui/` may reach. Nothing here records anything.

import "./lesson-look.css";
import { createEffect, createMemo, createResource, onCleanup, Show, type JSX } from "solid-js";
import type { LessonFacts, Level, PackLesson } from "../../engine/pack";
import * as api from "../../engine/ui/api";
import { Dialog } from "../../engine/ui/dialog";
import { LessonSheet } from "../../engine/ui/lesson";
import type { SceneDrawer } from "../../engine/ui/scene";
import { matches } from "../../engine/ui/viewport";
import { subjectFacts } from "../../school/tracks";

/** A lesson's own file and its drawings, which the look shows and a caller's print takes. */
export interface LessonPaper {
    lesson: PackLesson;
    draw: SceneDrawer;
}

/** The sheet's width in the roll's units: a phone takes what the window leaves, a desk takes 820. */
export const sheetWidth = (narrow: boolean): number =>
    narrow ? Math.min(innerWidth - 32, 480) : 820;

export function LessonLook(props: {
    /** The lesson's title, which the top row says even for one the pack no longer holds. */
    title: string;
    /** What stands over the title, and what a screen reader calls the region: what the look is, or whose day this lesson sits in. */
    kicker: string;
    /** The lesson in the pack, or null for one the family's pack no longer holds. */
    facts: LessonFacts | null;
    /** The pack the lesson's file and its drawings are read from. */
    pack: string;
    /** Every lesson of that pack, among which the world behind the sheet is found. */
    lessons: readonly LessonFacts[];
    level: Level;
    /** What stands beside Close: Explore's level and print, and nothing on the calendar. */
    tools?: JSX.Element;
    /** What stands under the top row: on the calendar, this lesson's place in the plan. */
    plan?: JSX.Element;
    /** What the sheet was read from, so a caller's print takes the sheet being looked at. */
    onPaper?: (paper: LessonPaper | null) => void;
    onClose: () => void;
}): JSX.Element {
    const narrow = matches("(max-width: 700px)");
    // The slots are made once, as the look opens. They hold the caller's own state, a print menu or
    // a day being typed, which a second reading would throw away.
    const tools = props.tools;
    const plan = props.plan;
    // keyed on the file rather than on the facts, so a re-read of the family's log that leaves the
    // lesson as it was does not fetch the sheet again and draw it a second time
    const file = createMemo(() => props.facts?.file ?? null);
    const [paper] = createResource(file, async (f): Promise<LessonPaper | null> => {
        const read = await api.packLesson(props.pack, f);
        if ("error" in read) return null;
        const m = await import("../../engine/ui/scene");
        return { lesson: read, draw: await m.scenes(m.scenesIn(read)) };
    });
    createEffect(() => props.onPaper?.(paper() ?? null));
    onCleanup(() => props.onPaper?.(null));

    /**
     * Draws the world the lesson is met in behind the sheet, as a still picture that covers the whole
     * dialog and stays put while the sheet scrolls over it.
     */
    const worldBehind = (host: HTMLElement): void => {
        const f = props.facts;
        if (!f) return;
        void import("./where")
            .then(async (m) => {
                const world = m.worldOfLesson(props.lessons, f.id);
                if (!world) return;
                await m.paintWorld(world, host, host.clientWidth || 1100);
                const picture = host.firstElementChild;
                if (!(picture instanceof HTMLElement)) return;
                const pw = parseFloat(picture.style.width),
                    ph = parseFloat(picture.style.height);
                const top = host.parentElement?.querySelector<HTMLElement>(".look-top");
                const below = host.parentElement?.querySelector<HTMLElement>(".look-paper");
                const cover = (): void => {
                    const w = host.clientWidth,
                        h = host.clientHeight;
                    if (!w || !h || !pw || !ph) return;
                    const k = Math.max(w / pw, h / ph);
                    // a phone's sheet takes the width, so the world shows in the gap between the row and
                    // the sheet, its horizon on the sheet's top edge: the row is two lines deep there,
                    // and how deep is measured rather than assumed
                    const sheetTop =
                        (top?.offsetHeight ?? 0) +
                        (below ? parseFloat(getComputedStyle(below).paddingTop) || 0 : 0);
                    const y = narrow() ? Math.min(0, sheetTop - 0.6 * ph * k) : (h - ph * k) / 2;
                    picture.style.transform = `translate(${(w - pw * k) / 2}px, ${y}px) scale(${k})`;
                };
                cover();
                const watch = new ResizeObserver(cover);
                watch.observe(host);
                if (top) watch.observe(top);
            })
            .catch(() => undefined);
    };

    const missing = (): string =>
        props.facts === null
            ? "This lesson is not in the family's pack any more."
            : paper.loading
              ? "The sheet is opening."
              : "The sheet could not be read. Close this and try again.";

    return (
        <Dialog two onClose={props.onClose}>
            <section class="look" aria-label={props.kicker}>
                <div class="look-world" ref={worldBehind} />
                <div class="look-scroll" tabindex={-1} data-focus>
                    <header class="look-top">
                        <p class="look-words">
                            <span class="kicker">{props.kicker}</span>
                            <b>{props.title}</b>
                        </p>
                        <Show when={tools}>
                            <div class="look-tools">{tools}</div>
                        </Show>
                        <button
                            type="button"
                            class="look-close"
                            aria-label="Close"
                            onClick={props.onClose}
                        >
                            <span aria-hidden="true">×</span>
                        </button>
                    </header>
                    <Show when={plan}>
                        <div class="look-plan">{plan}</div>
                    </Show>
                    <div class="look-paper">
                        <Show when={paper()} fallback={<p class="look-note">{missing()}</p>}>
                            {(sheet) => (
                                <LessonSheet
                                    lesson={sheet().lesson}
                                    level={props.level}
                                    strip={{
                                        label: subjectFacts(sheet().lesson.subject).title,
                                        date: null,
                                    }}
                                    width={sheetWidth(narrow())}
                                    narrow={narrow()}
                                    limits={{ sheets: "look", key: true }}
                                    draw={sheet().draw}
                                />
                            )}
                        </Show>
                    </div>
                </div>
            </section>
        </Dialog>
    );
}
