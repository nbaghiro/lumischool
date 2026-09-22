// A child's journal on the grown-ups' home (.docs/parent-app.md, "The journal, for grown-ups"): the
// child's roll in their own world, opened inside their card. Each sheet on it is the grown-up's card
// for the lesson: the day's own paper as the child left it, with the answers they gave and the hints
// they opened, and under it how it went, the star a sheet that came back right has, the author's line
// for a mistake that came up more than once, and the way to read the sheet or mark one that came back
// on paper. Two or three stand side by side on a wide screen, one at a time on a phone (home.tsx
// decides which).
//
// The paper is drawn as the roll comes near it, from the same `Left` questions the child's own world
// draws (school/lessons.ts folds them, engine/ui/lesson.tsx draws them), so a parent and a child read
// one sheet from one piece of code. What is no longer near is let go of, what each card measured is
// kept for ever so nothing moves under the grown-up, and what a card was read from is kept so paper
// that comes near again is not asked for twice.

import {
    createMemo,
    createResource,
    createSignal,
    getOwner,
    onCleanup,
    runWithOwner,
    Show,
    type JSX,
} from "solid-js";
import type { Envelope, EventKind } from "../../engine/answer";
import type { LessonFacts, PackLesson } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import type { SceneDrawer } from "../../engine/ui/scene";
import type { SheetView } from "../../engine/space";
import * as api from "../../engine/ui/api";
import { still } from "../../engine/ui/art";
import { pastSheet } from "../../engine/ui/lesson";
import { go } from "../../engine/ui/router";
import { Near } from "../../engine/ui/viewport";
import { World } from "../../engine/ui/world";
import { cameBackRight, sheetSays, type SheetBack } from "../../school/family/sheets";
import { leftIn } from "../../school/lessons";
import { subjectFacts } from "../../school/tracks";
import type { GrownRecord, PackView } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { dayShort } from "./grown";
import { CARD, rollFor, SHEET } from "./roll";

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));
/** Every scene of a pack lesson, for the drawer. */
const scenesIn = (lesson: PackLesson): Promise<Scene[]> =>
    import("../../engine/ui/scene").then((m) => m.scenesIn(lesson));

/** What a finished sheet is read back from: a sitting, what it ended as, and every try and hint in it. */
const LOOK_KINDS: EventKind[] = ["sitting-began", "sitting-ended", "answered", "hint-opened"];

/** A day's paper drawn into its card, and how to let it go. */
interface Paper {
    el: HTMLElement;
    dispose: () => void;
}

export function Journal(props: {
    kid: Kid;
    record: GrownRecord;
    pack: PackView;
    parent: boolean;
    facts: (id: string) => LessonFacts | undefined;
    onMark: (sheet: SheetBack) => void;
    onRead: (sheet: SheetBack) => void;
}): JSX.Element {
    const [roll] = createResource(
        () => ({ kid: props.kid, record: props.record }),
        ({ kid, record }) =>
            rollFor({ kid, record, lessons: props.pack.index.lessons, still: still() }),
    );
    const read = new Map<string, { lesson: PackLesson; events: readonly Envelope[] }>();
    const paper = new Map<string, Paper>();
    const heights = new Map<string, number>();
    const asking = new Set<string>();
    // bumped whenever paper is drawn or let go of, so the roll lays out again round what it measured
    const [drew, setDrew] = createSignal(0);
    let measure: HTMLDivElement | undefined;
    /** The slot in a card that a day's paper goes into, by the lesson, while that card is drawn. */
    const slots = new Map<string, HTMLElement>();
    /**
     * A day's paper into the card that is already drawn, rather than a card drawn again round it: the
     * element a grown-up is reaching for stays the element they press, and what the card measures is
     * kept so its place is held when the paper goes again.
     */
    const lay = (lesson: string, p: Paper): void => {
        const slot = slots.get(lesson);
        const el = made.get(lesson)?.el;
        if (!slot || !el) return;
        slot.replaceChildren(p.el);
        slot.style.minHeight = "";
        el.classList.add("gj-read");
        // measured where it stands, since the card is in the roll by now and taking it out to measure
        // would take it off the page; a transform on an ancestor does not change what it measures
        const h = el.offsetHeight;
        if (h) heights.set(lesson, h);
    };
    const drop = (lesson: string, p: Paper): void => {
        const slot = slots.get(lesson);
        const had = heights.get(lesson);
        if (slot) {
            // the card holds the place the roll gave it, so nothing under it moves when the paper goes
            if (had) slot.style.minHeight = `${had - CARD}px`;
            slot.replaceChildren();
        }
        made.get(lesson)?.el.classList.remove("gj-read");
        p.el.remove();
        p.dispose();
    };
    onCleanup(() => {
        for (const [id, p] of paper) drop(id, p);
        paper.clear();
    });
    // a card's column is a phone's width or a little more, so the roll is laid out as a phone's
    const view = createMemo(() => {
        drew();
        return roll.latest?.view(true, (id) => heights.get(id) ?? CARD) ?? null;
    });
    const lessonPath = (id: string): string => `/explore/${encodeURIComponent(id)}`;
    const picture = (lesson: LessonFacts) => async (host: HTMLElement) => {
        if (!lesson.first) return;
        const scene = await api.packScene(props.pack.pack, lesson.first);
        if ("error" in scene) return;
        const svg = (await drawer([scene.scene]))(host, scene.scene, { seed: 11 });
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        host.replaceChildren(svg);
    };
    /** The day a lesson was done, which the sheet's corner reads. */
    const dayOf = (lesson: string): string =>
        props.record.back.find((b) => b.lesson === lesson)?.on ?? props.record.today;
    /** One day's paper, drawn from what was read of it and measured with the card it goes in. */
    const drawPast = (lesson: string, draw: SceneDrawer): [string, Paper][] => {
        const had = read.get(lesson);
        const host = measure;
        if (!had || !host) return [];
        const { left, level, was } = leftIn(had.lesson, had.events);
        const sheet = pastSheet({
            lesson: had.lesson,
            level,
            left,
            was,
            child: props.kid.name,
            date: dayOf(lesson),
            // the paper's own corner carries the subject and the day, so the card needs no second strip
            label: subjectFacts(props.facts(lesson)?.subject ?? "maths").title,
            width: SHEET,
            narrow: true,
            draw,
            measureIn: host,
        });
        return sheet ? [[lesson, { el: sheet.el, dispose: sheet.dispose }]] : [];
    };
    /**
     * The days whose paper the roll has come near: what is no longer near is let go of, and what is
     * new is read from the pack and the child's own log, one lesson's sittings at a time.
     */
    const lookBack = async (near: readonly string[]): Promise<void> => {
        const kid = props.kid;
        const keep = new Set(near);
        let went = false;
        for (const [id, p] of paper) {
            if (keep.has(id)) continue;
            drop(id, p);
            paper.delete(id);
            went = true;
        }
        if (went) setDrew((n) => n + 1);
        const ids = near.filter((id) => !paper.has(id) && !asking.has(id));
        if (!ids.length) return;
        for (const id of ids) asking.add(id);
        const want = ids.filter((id) => !read.has(id));
        await Promise.all(
            want.map(async (id) => {
                const facts = props.facts(id);
                if (!facts) return;
                const [lesson, events] = await Promise.all([
                    api.packLesson(props.pack.pack, facts.file),
                    api.events(kid.id, { kinds: LOOK_KINDS, lesson: id }),
                ]);
                if ("error" in lesson || !events) return;
                read.set(id, { lesson, events });
            }),
        );
        const scenes = await Promise.all(
            ids.flatMap((id) => {
                const had = read.get(id);
                return had ? [scenesIn(had.lesson)] : [];
            }),
        );
        const draw = await drawer(scenes.flat());
        for (const id of ids) asking.delete(id);
        if (kid !== props.kid) return;
        const drawn = ids.flatMap((id) => drawPast(id, draw));
        for (const [id, p] of drawn) {
            paper.set(id, p);
            lay(id, p);
        }
        if (drawn.length) setDrew((n) => n + 1);
    };
    // the roll asks for a sheet's card more than once, so each is made once for the record it shows,
    // and belongs to the journal rather than to whichever of the roll's reads asked for it first
    const owner = getOwner();
    const made = new Map<string, { key: string; el: HTMLElement }>();
    const card = (s: SheetView): HTMLElement | null => {
        const back =
            s.state === "done"
                ? props.record.back.find((b) => b.lesson === s.lesson && b.on === s.on)
                : undefined;
        const sheet = paper.get(s.lesson);
        const key = `${s.state}|${s.on ?? ""}|${back ? `${back.marked}${back.asked}` : ""}`;
        const had = made.get(s.lesson);
        if (had?.key === key) return had.el;
        const lesson = props.facts(s.lesson);
        const today = s.state === "today";
        const repeated = back?.mistakes.find((m) => m.times > 1);
        const el = runWithOwner(owner, () => (
            <article
                class="j-sheet squared wd-sheet gj-sheet"
                classList={{ "gj-read": !!sheet }}
                style={{ width: `${SHEET}px`, "min-height": `${CARD}px` }}
                data-lesson={s.lesson}
                aria-label={`${s.title}, ${today ? "today" : s.on ? dayShort(s.on) : s.state}`}
            >
                {/* the day's own paper goes in here as the roll comes near it, and what it measured
                    holds the card's place when it goes again */}
                <div
                    class="gj-paper"
                    ref={(el) => {
                        slots.set(s.lesson, el);
                        if (sheet) el.append(sheet.el);
                    }}
                />
                <div class="gj-first">
                    <div class="j-strip">
                        <span class="label">{subjectFacts(lesson?.subject ?? "maths").title}</span>
                        <span class="date hand">
                            {today ? "Today" : s.on ? dayShort(s.on) : "Next"}
                        </span>
                    </div>
                    <h2 class="gj-title hand">{s.title}</h2>
                    <Show when={lesson}>
                        {(l) => <Near class="gj-pic on-paper" draw={picture(l())} />}
                    </Show>
                </div>
                <Show when={back}>
                    {(b) => (
                        <div class="gj-how">
                            <p>
                                {`${sheetSays(b())}${b().mode === "paper" && b().marked ? ", on paper" : ""}${cameBackRight(b()) ? ", and it has its star" : ""}.`}
                                <Show when={cameBackRight(b())}>
                                    <span class="gj-star" aria-hidden="true">
                                        {" ★"}
                                    </span>
                                </Show>
                            </p>
                            <Show when={repeated}>
                                {(m) => (
                                    <p class="gj-line">{`“${m().rule}” came up ${m().times} times.`}</p>
                                )}
                            </Show>
                        </div>
                    )}
                </Show>
                <div class="gj-acts">
                    <Show
                        when={back}
                        fallback={
                            <button
                                type="button"
                                class="btn second gj-act"
                                aria-label={`Read ${s.title}`}
                                onClick={() => go(lessonPath(s.lesson))}
                            >
                                {today ? "Open it" : "Read it"}
                            </button>
                        }
                    >
                        {(b) => (
                            <Show
                                when={props.parent && b().mode === "paper" && !b().marked}
                                fallback={
                                    <button
                                        type="button"
                                        class="btn second gj-act"
                                        aria-label={`How ${s.title} went`}
                                        onClick={() => props.onRead(b())}
                                    >
                                        How it went
                                    </button>
                                }
                            >
                                <button
                                    type="button"
                                    class="btn gj-act"
                                    aria-label={`Mark ${s.title}`}
                                    onClick={() => props.onMark(b())}
                                >
                                    Mark it
                                </button>
                            </Show>
                        )}
                    </Show>
                </div>
                <div class="j-cover" aria-hidden="true">
                    <span class="label">{today ? "Today" : "Done"}</span>
                    <span class="t hand">{s.title}</span>
                </div>
            </article>
        ));
        if (!(el instanceof HTMLElement)) return null;
        made.set(s.lesson, { key, el });
        return el;
    };
    return (
        <>
            <div
                class="ls-measure"
                ref={(el) => {
                    measure = el;
                }}
            />
            <Show
                when={view()}
                fallback={<p class="gh-quiet gj-wait">{`Opening ${props.kid.name}'s journal.`}</p>}
            >
                {(v) => (
                    <World
                        view={v()}
                        sheet={card}
                        lookBack={(near) => void lookBack(near)}
                        wheel={false}
                        class="gj-world"
                        title={`${props.kid.name}'s journal`}
                    />
                )}
            </Show>
        </>
    );
}
