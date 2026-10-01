// A child's grade on their card: the move up offered once they have finished their year's review, and
// a move up or back at any time. It is never made for a family (.docs/grades-5-6.md, "Moving up a year").

import { createSignal, Show, type JSX } from "solid-js";
import { gradeName } from "../../engine/grade";
import type { LessonFacts } from "../../engine/pack";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Button } from "../../engine/ui/form";
import { Say } from "../../engine/ui/say";
import { mayMoveTo, yearReviewOf } from "../../school/family/family";
import { offeredGrades } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import * as shared from "./shared";

const local = onThisComputer(location.hostname);

export function MoveGrade(props: {
    kid: Kid;
    record: GrownRecord;
    lessons: readonly LessonFacts[];
}): JSX.Element {
    const [asked, setAsked] = createSignal<number | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal<{ text: string; ok: boolean } | null>(null);
    const offered = (): number[] => offeredGrades(props.lessons);
    const up = (): number | null =>
        mayMoveTo(props.kid.grade, props.kid.grade + 1, offered()) ? props.kid.grade + 1 : null;
    const back = (): number | null =>
        mayMoveTo(props.kid.grade, props.kid.grade - 1, offered()) ? props.kid.grade - 1 : null;
    const reviewed = (): boolean => {
        const review = yearReviewOf(props.lessons, props.kid.grade);
        const own = props.record.years.find((y) => y.grade === props.kid.grade);
        return review !== null && own?.progress.done[review] !== undefined;
    };
    const move = async (grade: number): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        setSaid(null);
        const r = await api.moveKid(props.kid.id, grade);
        setBusy(false);
        if ("error" in r) {
            setSaid({ text: failureText(r, local), ok: false });
            return;
        }
        setAsked(null);
        setSaid({ text: `${props.kid.name} is in ${gradeName(grade)} from today.`, ok: true });
        void shared.family.refresh();
        void shared.record.of(props.kid.id).refresh();
    };
    return (
        <div class="gh-grade">
            <Show
                when={asked()}
                fallback={
                    <>
                        <Show when={reviewed() && up()}>
                            {(next) => (
                                <p class="gh-quiet">
                                    {`${props.kid.name} has finished the ${gradeName(props.kid.grade)} year review, so ${gradeName(next())} can begin whenever you choose.`}
                                </p>
                            )}
                        </Show>
                        <p class="gh-small">
                            {`${props.kid.name} is in ${gradeName(props.kid.grade)}. A move plans the new grade's lessons from today, and everything already done stays.`}
                        </p>
                        <div class="acts">
                            <Show when={up()}>
                                {(next) => (
                                    <Button second={!reviewed()} onClick={() => setAsked(next())}>
                                        {`Move up to ${gradeName(next())}`}
                                    </Button>
                                )}
                            </Show>
                            <Show when={back()}>
                                {(before) => (
                                    <Button second onClick={() => setAsked(before())}>
                                        {`Back to ${gradeName(before())}`}
                                    </Button>
                                )}
                            </Show>
                        </div>
                    </>
                }
            >
                {(grade) => (
                    <>
                        <p class="gh-quiet">
                            {`Move ${props.kid.name} to ${gradeName(grade())} from today? The days already planned stay as they were, and the calendar starts a new school year.`}
                        </p>
                        <div class="acts">
                            <Button busy={busy()} onClick={() => void move(grade())}>
                                {`Yes, move to ${gradeName(grade())}`}
                            </Button>
                            <Button second disabled={busy()} onClick={() => setAsked(null)}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </Show>
            <Show when={said()}>
                {(s) => <Say tone={s().ok ? "success" : "error"} text={s().text} />}
            </Show>
        </div>
    );
}
