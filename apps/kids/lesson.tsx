// Today's lessons on a child's roll: each lesson from the family's pack set on a sheet by
// engine/ui/lesson.tsx and measured before the roll is laid out round it, and answered through
// school/lessons.ts, which checks each try and says what the sitting records. The first
// answer or hint begins the sitting, I have finished ends it, a piece a grown-up reads is recorded as
// handed in, and every event goes into the child's queue (engine/ui/kid.ts), which sends it when it can. A sitting begun on another visit and not
// ended is picked up where it stood, its questions done and its hints opened as they were, and the
// sheet says where its first question still to do is, so the roll can land there. A lesson the page
// could not read stays a card on the roll.

import type { SceneDrawer } from "../../engine/ui/scene";
import { render } from "solid-js/web";
import type { Envelope, Timing } from "../../engine/answer";
import * as client from "../../engine/ui/kid";
import {
    LessonSheet,
    longDay,
    pastSheet,
    sheetState,
    type Help,
    type Reply as SheetReply,
    type SheetActs,
    type SheetState,
} from "../../engine/ui/lesson";
import { type Left, type Level, type PackLesson } from "../../engine/pack";
import {
    answered,
    askedIn,
    began,
    checkArranged,
    checkProgram,
    checkTyped,
    easierOf,
    ended,
    handIn,
    handedIn,
    helpAsked,
    hintOpened,
    hinted,
    leftIn,
    leftOf,
    levelIn,
    LINES,
    pinned,
    pointOf,
    SHEET_LEVEL,
    tried,
    turnsOf,
    FRESH,
    type Ask,
    type Asked,
    type Checked,
    type Reply,
    type Turn,
} from "../../school/lessons";
import type { Kid } from "../../server/db/schema";
import { helpOf, policyOf } from "./teaching";
import type { Loaded } from "./views";

/** A screen sitting begun on another visit and not ended, and where it left each question. */
export interface Resume {
    sitting: string;
    turns: Map<number, Turn>;
}

/**
 * For each of the lessons, the sitting to pick up again, if the record holds one begun and not ended
 * on the same lesson as the pack now has it: where each question stood is read off that lesson's own
 * events. A lesson whose file has changed since starts fresh, since its questions may have.
 */
export async function resumesFor(
    c: Loaded,
    lessons: readonly PackLesson[],
): Promise<Map<string, Resume>> {
    const out = new Map<string, Resume>();
    await Promise.all(
        lessons.map(async (lesson) => {
            const hash = levelIn(lesson, SHEET_LEVEL).hash;
            const open = c.record.unfinished
                .filter((u) => u.lesson === lesson.id && u.lessonHash === hash)
                .at(-1);
            if (!open) return;
            const st = await client.state(c.kid.id, lesson.id);
            if ("error" in st) return;
            out.set(lesson.id, { sitting: open.sitting, turns: turnsOf(st.events, open.sitting) });
        }),
    );
    return out;
}

/**
 * One sitting of one lesson: begun with the first answer or hint, ended when the child says so. One
 * picked up again keeps its id and records no second beginning, and its minutes count from this page.
 */
class Sitting {
    readonly id: string;
    private readonly kid: Kid;
    private readonly lesson: PackLesson;
    private readonly level: Level;
    private readonly pack: string;
    private beganAt: number;
    private over = false;
    constructor(kid: Kid, lesson: PackLesson, level: Level, pack: string, resume: string | null) {
        this.kid = kid;
        this.lesson = lesson;
        this.level = level;
        this.pack = pack;
        this.id = resume ?? crypto.randomUUID();
        this.beganAt = resume ? Date.now() : 0;
    }
    private record(doings: client.Doing[]): Promise<unknown> {
        const all = this.beganAt
            ? doings
            : [
                  {
                      kind: "sitting-began" as const,
                      data: began(this.id, this.lesson, this.level, this.pack),
                  },
                  ...doings,
              ];
        this.beganAt ||= Date.now();
        return client.record(this.kid.id, all);
    }
    answered(asked: Asked, turn: Turn, checked: Checked, timing: Timing): void {
        void this.record([
            { kind: "answered", data: answered(this.id, asked, turn, checked, timing) },
        ]);
    }
    handedIn(asked: Asked, turn: Turn, timing: Timing): void {
        void this.record([{ kind: "answered", data: handedIn(this.id, asked, turn, timing) }]);
    }
    hinted(asked: Asked, turn: Turn): void {
        void this.record([{ kind: "hint-opened", data: hintOpened(this.id, asked, turn) }]);
    }
    asked(asked: Asked, ask: Ask, material: string | null): void {
        void this.record([{ kind: "help-asked", data: helpAsked(this.id, asked, ask, material) }]);
    }
    /** Ends the sitting as finished, once the end is in the queue. One that never began, with nothing answered, records nothing. */
    async finished(): Promise<boolean> {
        if (!this.beganAt || this.over) return false;
        this.over = true;
        await this.record([
            { kind: "sitting-ended", data: ended(this.id, true, this.beganAt, Date.now()) },
        ]);
        return true;
    }
}

/**
 * Today's sheet for a child: what it shows, which is the same state the journal draws a finished day
 * from, and what the child may do to it, which is school's checking and this app's own sitting. The
 * actions are built over that state, so every try is checked against the boards and pads the sheet
 * itself drew.
 */
function sheetFor(
    kid: Kid,
    lesson: PackLesson,
    level: Level,
    pack: string,
    resume: Resume | null,
    guide: string,
    onFinished: (lesson: string) => void,
): { state: SheetState; acts: SheetActs } {
    const asked = new Map(askedIn(lesson, level).map((a) => [a.question.n, a]));
    const turns = new Map<number, Turn>(resume?.turns ?? []);
    const policy = policyOf(kid);
    const help = helpOf(kid);
    const sitting = new Sitting(kid, lesson, level, pack, resume?.sitting ?? null);
    const turnOf = (n: number): Turn => turns.get(n) ?? FRESH;
    // what the sheet reads, kept until the turn it was read from is replaced, since a turn is never
    // changed in place and the sheet asks for the same question many times while it draws
    const read = new Map<number, { turn: Turn; left: Left }>();
    const leftAt = (n: number): Left | undefined => {
        const a = asked.get(n);
        if (!a) return undefined;
        const turn = turnOf(n);
        const had = read.get(n);
        if (had?.turn === turn) return had.left;
        const left = leftOf(a, turn, policy);
        read.set(n, { turn, left });
        return left;
    };
    /** A try checked and recorded, and what the sheet makes of it. */
    const took = (
        a: Asked,
        next: { turn: Turn; reply: Reply },
        checked: Checked,
        timing: Timing,
    ): SheetReply => {
        turns.set(a.question.n, { ...next.turn, given: checked.given });
        sitting.answered(a, next.turn, checked, timing);
        return {
            state: next.reply.state,
            say: next.reply.say,
            point: next.reply.point,
            right: next.turn.right,
            done: next.turn.done,
        };
    };
    /** What the guide can do for a question: the same guide the world has, and the question's own materials. */
    const helpAt = (n: number): Help | null => {
        const a = asked.get(n);
        if (!help.on || !a) return null;
        const easier = easierOf(lesson, level, a);
        return {
            guide,
            voice: help.voice,
            point: pointOf(a.question),
            easier: easier && {
                kind: easier.kind,
                question: easier.kind === "worked" ? easier.question : easier.asked.question,
            },
            pinned: turnOf(n).pinned,
        };
    };
    const acts: SheetActs = {
        typed: (n, typed, timing) => {
            const a = asked.get(n);
            const checked = a && checkTyped(a.question, typed);
            const next = a && checked && tried(turnOf(n), a.question, checked, "typed");
            return a && checked && next ? took(a, next, checked, timing) : null;
        },
        arranged: (n, part, places, measures, timing) => {
            const a = asked.get(n);
            const checked = a && checkArranged(a.question, part, places, measures);
            const next = a && checked && tried(turnOf(n), a.question, checked, "arranged");
            return a && checked && next ? took(a, next, checked, timing) : null;
        },
        program: (n, lines, works, timing) => {
            const a = asked.get(n);
            const checked = a && checkProgram(lines, works);
            const next = a && checked && tried(turnOf(n), a.question, checked, "program");
            return a && checked && next ? took(a, next, checked, timing) : null;
        },
        handIn: (n, timing) => {
            const a = asked.get(n);
            const next = a?.way === "grown-up" ? handIn(turnOf(n)) : null;
            if (!a || !next) return false;
            turns.set(n, next);
            sitting.handedIn(a, next, timing);
            return true;
        },
        hint: (n) => {
            const a = asked.get(n);
            const next = a && hinted(turnOf(n), a.question);
            if (!a || !next) return null;
            turns.set(n, next.turn);
            sitting.hinted(a, next.turn);
            return next.hint;
        },
        asked: (n, ask, material) => {
            const a = asked.get(n);
            if (a) sitting.asked(a, ask, material);
        },
        pin: (n) => {
            const a = asked.get(n);
            const next = a && pinned(turnOf(n));
            if (!a || !next) return false;
            turns.set(n, next);
            sitting.asked(a, "grown-up", null);
            return true;
        },
        empty: LINES.empty,
        lines: {
            noHint: LINES["no-hint"],
            noEasier: LINES["no-easier"],
            handoff: LINES.handoff,
            pinned: LINES.pinned,
        },
        finished: () => {
            void sitting.finished().then((ended) => {
                if (ended) onFinished(lesson.id);
            });
        },
    };
    return { state: sheetState({ at: leftAt, help: helpAt }), acts };
}

/**
 * A past day's lesson as the child left it, for the page to lay in the world it was done in: the
 * day's own events folded by school/lessons.ts and the sheet drawn by engine/ui/lesson.tsx. The
 * grown-ups' journal draws the same sheet the same way, from the events a grown-up may read.
 */
export function pastSheetOf(o: {
    kid: Kid;
    lesson: PackLesson;
    events: readonly Envelope[];
    date: string;
    width: number;
    narrow: boolean;
    draw: SceneDrawer;
    measureIn: HTMLElement;
}): { el: HTMLElement; height: number; dispose: () => void } | null {
    const { left, level, was } = leftIn(o.lesson, o.events);
    return pastSheet({
        lesson: o.lesson,
        level,
        left,
        was,
        child: o.kid.name,
        date: o.date,
        width: o.width,
        narrow: o.narrow,
        draw: o.draw,
        measureIn: o.measureIn,
    });
}

/** The sheets a page drew for today's lessons: each laid where the roll puts it, at the height it was measured. */
export interface Sheets {
    sheet(lesson: string): HTMLElement | null;
    height(lesson: string): number | null;
    /** How far down a sheet picked up again its first question still to do is, in the roll's units, or null. */
    landing(lesson: string): number | null;
    /** Draws the sheets of any of these lessons not drawn yet, picking up a sitting where the record has one. */
    draw(lessons: readonly PackLesson[], resumes: ReadonlyMap<string, Resume>): void;
    dispose(): void;
}

/**
 * Today's lessons drawn on their sheets and measured in `measureIn`, in a layer the page keeps out of
 * sight. The layer is removed and the sheets are handed on detached, for the roll to place. A sheet
 * once drawn is kept as the child left it, so one finished stays finished when the roll is drawn
 * again round it, and `draw` adds the sheets of lessons that arrive later.
 */
export function todaysSheets(o: {
    kid: Kid;
    pack: string;
    date: string;
    width: number;
    narrow: boolean;
    draw: SceneDrawer;
    measureIn: HTMLElement;
    /** The guide of the world the child is in, by its design's id, who is their help on the sheets. */
    guide: string;
    onFinished: (lesson: string) => void;
}): Sheets {
    const built = new Map<
        string,
        { el: HTMLElement; height: number; landing: number | null; dispose: () => void }
    >();
    const draw = (lessons: readonly PackLesson[], resumes: ReadonlyMap<string, Resume>): void => {
        const layer = document.createElement("div");
        layer.className = "ls-measure";
        o.measureIn.append(layer);
        for (const lesson of lessons) {
            if (built.has(lesson.id)) continue;
            // one sheet's state and actions, made outside the JSX: a prop's expression is read
            // again on every access, and a second one would be a second sitting
            const { state, acts } = sheetFor(
                o.kid,
                lesson,
                SHEET_LEVEL,
                o.pack,
                resumes.get(lesson.id) ?? null,
                o.guide,
                o.onFinished,
            );
            let el: HTMLElement | undefined;
            const dispose = render(
                () => (
                    <LessonSheet
                        lesson={lesson}
                        level={SHEET_LEVEL}
                        strip={{ label: "Today", date: longDay(o.date) }}
                        width={o.width}
                        narrow={o.narrow}
                        limits={{ sheets: "open", state, acts, child: o.kid.name }}
                        draw={o.draw}
                        ref={(node) => {
                            el = node;
                        }}
                    />
                ),
                layer,
            );
            if (!el) continue;
            // the first question still to do, measured from the sheet's top, for a sitting picked up again
            const next = resumes.has(lesson.id)
                ? el.querySelector<HTMLElement>(".ls-q:not(.done)")
                : null;
            const landing = next
                ? next.getBoundingClientRect().top - el.getBoundingClientRect().top
                : null;
            built.set(lesson.id, { el, height: el.offsetHeight, landing, dispose });
            el.remove();
        }
        layer.remove();
    };
    return {
        sheet: (id) => built.get(id)?.el ?? null,
        height: (id) => built.get(id)?.height ?? null,
        landing: (id) => built.get(id)?.landing ?? null,
        draw,
        dispose: () => {
            for (const b of built.values()) b.dispose();
            built.clear();
        },
    };
}
