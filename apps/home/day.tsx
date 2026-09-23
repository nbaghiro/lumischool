// Printing a whole day (.docs/parents.md, "Sunday evening, the parent prints"): every sheet the day
// needs, for the children a grown-up chooses, in one job rather than one press per lesson. The
// children's pages print with nothing filled in, and the grown-up's own copies, with the answers and
// the notes, print as a second job, so a child never finds the answers in what they were handed.
// Each child's sheet is recorded as `sheet-printed` the way a child's card records one, so the
// calendar still says what was printed.

import { Select } from "../../engine/ui/select";
import "./day.css";
import type { SceneDrawer } from "../../engine/ui/scene";
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    on,
    Show,
    type JSX,
} from "solid-js";
import type { Draft } from "../../engine/answer";
import type { LessonFacts, PackLesson } from "../../engine/pack";
import * as api from "../../engine/ui/api";
import { grownRecord } from "../../engine/ui/grown";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { LessonSheet } from "../../engine/ui/lesson";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { go } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { matches } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import { askedIn, levelIn } from "../../school/lessons";
import { familyName, gradeName } from "../../school/family/names";
import { dayIn, addDays } from "../../school/record/record";
import { subjectFacts } from "../../school/tracks";
import type { FamilyView, GrownRecord, Me, PackView } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { familyChanged, knowFamily } from "./bar";
import { dayLong, paperFor, plannedOn, plural } from "./grown";
import { signInFor } from "./routes";

const local = onThisComputer(location.hostname);

/** The drawer of a pack's scenes, with the drawings the sheets' scenes name loaded first. */
const drawer = (sheets: readonly Sheet[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) =>
        m.scenes(sheets.flatMap((s) => m.scenesIn(s.lesson))),
    );

/** How many days ahead a grown-up may print: this evening for tomorrow, and a weekend's worth over. */
const AHEAD = 9;

/** The level a child's sheet is printed at, as a child's card prints it. */
const LEVEL = "medium";

interface Loaded {
    me: Me;
    view: FamilyView;
    pack: PackView;
    records: GrownRecord[];
}

/** A sheet the day needs: whose it is, which lesson, and the lesson's file once it is read. */
interface Sheet {
    kid: Kid;
    facts: LessonFacts;
    lesson: PackLesson;
}

async function load(): Promise<Loaded | Failure | null> {
    const [me, view, pack] = await Promise.all([
        api.me({ ask: true }),
        api.familyRows({ ask: true }),
        api.pack(),
    ]);
    if ("error" in me) {
        if (me.error === "signed-out")
            go(signInFor(`${location.pathname}${location.search}`), { replace: true });
        if (me.error === "put-away") location.replace("/sign-in?locked=1");
        return me;
    }
    if ("error" in view) return view;
    if ("error" in pack) return pack;
    knowFamily(me, view);
    const read = await Promise.all(view.kids.map((k) => grownRecord(k.id)));
    const failed = read.find((r): r is Failure => "error" in r);
    if (failed) return failed;
    return { me, view, pack, records: read.filter((r): r is GrownRecord => !("error" in r)) };
}

export function PrintDay(): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({
            stage: true,
            wide: true,
        }),
    );
    const [loaded, { refetch }] = createResource(load);
    createEffect(on(familyChanged, () => void refetch(), { defer: true }));
    const got = (): Loaded | null => {
        const l = loaded.latest;
        return l && !("error" in l) ? l : null;
    };
    const failed = (): Failure | null => {
        const l = loaded.latest;
        return l && "error" in l ? l : null;
    };
    return (
        <Show
            when={loaded.latest}
            fallback={<Waiting kicker="For grown-ups" title="Opening the day" />}
        >
            <Show when={failed()}>
                {(f) => (
                    <Postcard note kicker="For grown-ups" title="The day did not load">
                        <Say
                            text={failureText(f(), local)}
                            action={{ label: "Try again", run: () => void refetch() }}
                        />
                    </Postcard>
                )}
            </Show>
            <Show when={got()}>{(l) => <Day loaded={l()} />}</Show>
        </Show>
    );
}

function Day(props: { loaded: Loaded }): JSX.Element {
    const l = (): Loaded => props.loaded;
    const zone = (): string => l().me.family.time_zone;
    const today = (): string => dayIn(new Date().toISOString(), zone());
    const facts = createMemo(() => new Map(l().pack.index.lessons.map((f) => [f.id, f])));
    const factsOf = (id: string): LessonFacts | undefined => facts().get(id);
    const recordOf = (kid: Kid): GrownRecord | undefined =>
        l().records.find((r) => r.kid.id === kid.id);
    /** What the plan has for a child on a day, in the tracks' order. */
    const forKid = (kid: Kid, on: string): LessonFacts[] => {
        const r = recordOf(kid);
        return r ? plannedOn(r, on, factsOf).map((p) => p.lesson) : [];
    };
    /** The days worth offering: today and the days ahead the plan has anything on. */
    const days = createMemo(() => {
        const out: string[] = [];
        for (let i = 0; i < AHEAD; i++) {
            const on = addDays(today(), i);
            if (i === 0 || l().view.kids.some((k) => forKid(k, on).length)) out.push(on);
        }
        return out;
    });
    const [on, setOn] = createSignal(today());
    const [who, setWho] = createSignal<string[]>(l().view.kids.map((k) => k.id));
    const [said, setSaid] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [key, setKey] = createSignal(false);
    const chosen = (): Kid[] => l().view.kids.filter((k) => who().includes(k.id));
    const flip = (kid: Kid): void => {
        setSaid("");
        setWho(who().includes(kid.id) ? who().filter((id) => id !== kid.id) : [...who(), kid.id]);
    };
    /** Every sheet the chosen children need on the chosen day, in the children's own order. */
    const wanted = createMemo(() =>
        chosen().flatMap((kid) => forKid(kid, on()).map((f) => ({ kid, facts: f }))),
    );
    const [sheets] = createResource(
        () => ({ pack: l().pack.pack, want: wanted() }),
        async ({ pack, want }): Promise<{ sheets: Sheet[]; failure: Failure | null }> => {
            const read = await Promise.all(want.map((w) => api.packLesson(pack, w.facts.file)));
            const out: Sheet[] = [];
            let failure: Failure | null = null;
            read.forEach((lesson, i) => {
                const w = want[i];
                if (!w) return;
                if ("error" in lesson) failure ??= lesson;
                else out.push({ kid: w.kid, facts: w.facts, lesson });
            });
            return { sheets: out, failure };
        },
    );
    const ready = (): Sheet[] => sheets.latest?.sheets ?? [];
    const [draw] = createResource(() => sheets.latest?.sheets, drawer);
    const narrow = matches("(max-width: 700px)");
    const width = (): number => (narrow() ? Math.min(innerWidth - 32, 480) : 820);
    const names = (kids: readonly Kid[]): string =>
        kids.length < 2
            ? (kids[0]?.name ?? "nobody")
            : `${kids
                  .slice(0, -1)
                  .map((k) => k.name)
                  .join(", ")} and ${kids[kids.length - 1]?.name ?? ""}`;
    const line = (): string => {
        if (!chosen().length) return "Nobody is chosen, so there is nothing to print.";
        if (!wanted().length) return `Nothing is planned for ${names(chosen())} on that day.`;
        return `${names(chosen())}: ${plural(wanted().length, "sheet")} for ${dayLong(on())}.`;
    };
    /** The sheets are drawn a frame after the page has them, so the print waits for one. */
    const soon = (run: () => void): void => {
        requestAnimationFrame(() => requestAnimationFrame(run));
    };
    const printChild = async (): Promise<void> => {
        if (busy() || !ready().length) return;
        setBusy(true);
        setSaid("");
        const drafts: Draft[] = ready().map(({ kid, lesson }) => ({
            id: api.newId(),
            kid_id: kid.id,
            kind: "sheet-printed",
            at: api.nowAt(),
            data: {
                sheet: api.newId(),
                lesson: lesson.id,
                lessonHash: levelIn(lesson, LEVEL).hash,
                pack: l().pack.pack,
                paper: paperFor(zone()),
                questions: askedIn(lesson, LEVEL)
                    .filter((a) => a.way !== "worked")
                    .map((a) => a.ref),
                grownUps: false,
            },
        }));
        const wrote = await api.append(drafts);
        setBusy(false);
        if ("error" in wrote) {
            setSaid(`Nothing was printed. ${failureText(wrote, local)}`);
            return;
        }
        setKey(false);
        setSaid(
            `${plural(drafts.length, "sheet")} for ${names(chosen())}, ${dayLong(on())}. What comes back can be marked from the home.`,
        );
        soon(() => print());
    };
    const printMine = (): void => {
        if (busy() || !ready().length) return;
        setSaid("");
        setKey(true);
        soon(() => print());
    };
    return (
        <div class="gd">
            <section class="gd-controls" aria-label={`${familyName(l().view.family.name)} print`}>
                <fieldset class="gd-part">
                    <legend>For</legend>
                    <div class="gd-row">
                        <For each={l().view.kids}>
                            {(kid) => (
                                <button
                                    type="button"
                                    class="btn second pick"
                                    aria-pressed={who().includes(kid.id)}
                                    aria-label={`${kid.name}, ${gradeName(kid.grade)}`}
                                    onClick={() => flip(kid)}
                                >
                                    {kid.name}
                                </button>
                            )}
                        </For>
                    </div>
                </fieldset>
                <fieldset class="gd-part">
                    <legend>Day</legend>
                    <Select
                        class="gd-day"
                        aria-label="The day to print"
                        value={on()}
                        onChange={(e) => {
                            setSaid("");
                            setOn(e.currentTarget.value);
                        }}
                    >
                        <For each={days()}>
                            {(d) => (
                                <option value={d}>
                                    {d === today() ? `Today, ${dayLong(d)}` : dayLong(d)}
                                </option>
                            )}
                        </For>
                    </Select>
                </fieldset>
                <Show when={ready().length}>
                    <div class="acts">
                        <Button busy={busy()} onClick={() => void printChild()}>
                            {busy() ? "Printing" : "Print sheets"}
                        </Button>
                        <Button second busy={busy()} onClick={printMine}>
                            Print my copies
                        </Button>
                    </div>
                </Show>
                <p class="gd-line">{line()}</p>
                <Show when={sheets.latest?.failure}>
                    {(f) => (
                        <Say
                            text={`Some of the day's lessons did not load. ${failureText(f(), local)}`}
                        />
                    )}
                </Show>
                <Show when={said()}>
                    <Say calm focus text={said()} />
                </Show>
            </section>
            <div class="gd-sheets" data-key={key() ? "yes" : "no"}>
                <For each={ready()}>
                    {(s) => (
                        <section class="gd-sheet" aria-label={`${s.kid.name}, ${s.facts.title}`}>
                            <p class="gd-whose">
                                {`${s.kid.name} · ${dayLong(on())}${key() ? " · your copy" : ""}`}
                            </p>
                            <Show when={draw.latest}>
                                {(d) => (
                                    <LessonSheet
                                        lesson={s.lesson}
                                        level={LEVEL}
                                        strip={{
                                            label: subjectFacts(s.facts.subject).title,
                                            date: null,
                                        }}
                                        width={width()}
                                        narrow={narrow()}
                                        limits={{ sheets: "look", key: key() }}
                                        draw={d()}
                                    />
                                )}
                            </Show>
                        </section>
                    )}
                </For>
            </div>
        </div>
    );
}
