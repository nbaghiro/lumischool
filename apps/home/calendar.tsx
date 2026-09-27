import "./calendar.css";
import { For, Show, type JSX } from "solid-js";
import { Button } from "../../engine/ui/form";
import { saidOf, type Change } from "../../school/family/calendar";
import * as acts from "../../school/family/calendar";
import { titleOf, trackTitle, writing, type Write } from "./cards";
import type { Loaded } from "./log";
import { dayMark, plural } from "./grown";

export function Changes(props: { loaded: Loaded; onWrite: Write }): JSX.Element {
    const l = (): Loaded => props.loaded;
    const names = {
        kid: (id: string | null): string =>
            id ? (l().view.kids.find((k) => k.id === id)?.name ?? "a child") : "everyone",
        lesson: (id: string): string => titleOf(l(), id),
        track: trackTitle,
        day: dayMark,
    };
    const latest = (): Change[] => [...l().cal.changes].reverse().slice(0, 8);
    const last = (): Change | undefined =>
        [...l().cal.changes].reverse().find((c) => c.op.op !== "track");
    /**
     * Every event one change was written as: a family day is a day off for everyone and a day added
     * for each child, so putting it back puts all of them back.
     */
    const group = (c: Change): { id: string; kid: string | null }[] => [
        ...l()
            .cal.changes.filter((x) => x.at === c.at && x.actor === c.actor)
            .map((x) => ({ id: x.id, kid: x.kid })),
        ...l()
            .cal.added.filter((a) => a.at === c.at)
            .map((a) => ({ id: a.id, kid: a.kid })),
    ];
    return (
        <section class="gc-log" aria-labelledby="gc-log-title">
            <p class="kicker">{`${plural(l().cal.changes.length, "change")} in the plan`}</p>
            <h2 id="gc-log-title" class="gc-title">
                What the calendar has recorded
            </h2>
            <p class="note">
                Your recent changes stay here. Put a change back to restore the plan before it.
                Finished work stays in your child’s record.
            </p>
            <Show when={last()}>
                {(c) => (
                    <div class="acts">
                        <Button
                            second
                            onClick={() =>
                                void props.onWrite(
                                    acts.putBack(writing(), group(c())),
                                    `Put back: ${saidOf(c(), names)}`,
                                )
                            }
                        >
                            Put the last change back
                        </Button>
                    </div>
                )}
            </Show>
            <ol class="gc-log-list">
                <For each={latest()}>
                    {(c) => (
                        <li>
                            <span class="gc-log-when">{dayMark(c.on)}</span>
                            <span>{saidOf(c, names)}</span>
                        </li>
                    )}
                </For>
            </ol>
        </section>
    );
}
