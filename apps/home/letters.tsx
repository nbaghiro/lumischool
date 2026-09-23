import { createEffect, createResource, createSignal, For, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { Button } from "../../engine/ui/form";
import { addDays } from "../../school/record/record";
import { signInFor } from "./routes";
import type { Letters as LetterView } from "../../server/api";
import "./letters.css";

export function Letters(): JSX.Element {
    const look = useLook();
    createEffect(() => look({ place: "harbour", wide: true }));
    const [week, setWeek] = createSignal(
        new URLSearchParams(location.search).get("week") ?? undefined,
    );
    const [data, { refetch }] = createResource(
        () => week() ?? "latest",
        (w) => api.letters(w === "latest" ? undefined : w),
    );
    const value = () => data.latest;
    const view = (): LetterView | null => {
        const v = value();
        return v && !("error" in v) ? v : null;
    };
    const [said, say] = createSignal("");
    const [saving, setSaving] = createSignal(false);
    const [mode, setMode] = createSignal<LetterView["mode"]>("off");
    createEffect(() => {
        const v = view();
        if (v) setMode(v.mode);
    });
    const save = async () => {
        setSaving(true);
        try {
            const failure = await api.setLetters(mode());
            say(
                failure
                    ? "We could not save this choice. Please try again."
                    : "Your email choice is saved.",
            );
            if (!failure) await refetch();
        } finally {
            setSaving(false);
        }
    };
    return (
        <Show
            when={value()}
            fallback={<Waiting kicker="From your family's week" title="Opening your letter" />}
        >
            <Show
                when={view()}
                fallback={
                    <Postcard
                        kicker="For your family"
                        title="Your weekly letter"
                        lead="Sign in as a parent to read your family's letter. If you are already signed in, the letter may not be ready yet."
                    >
                        <a href={signInFor("/letters")}>Sign in</a>
                    </Postcard>
                }
            >
                {(v) => (
                    <Postcard
                        wide
                        kicker={`${v().letter.from} to ${v().letter.to}`}
                        title="A letter from your week"
                        lead="What happened, what needs a little help, and what comes next."
                    >
                        <nav class="letter-actions" aria-label="Letter weeks">
                            <Button second onClick={() => setWeek(addDays(v().letter.to, -7))}>
                                Earlier week
                            </Button>
                            <Button second onClick={() => setWeek(undefined)}>
                                Latest week
                            </Button>
                            <Button second onClick={() => window.print()}>
                                Print this letter
                            </Button>
                        </nav>
                        <p class="note">
                            Reconstructed from your current records. Late work and marking can
                            update earlier weeks. Plans are shown as they stood at the end of that
                            week.
                        </p>
                        <Show
                            when={v().letter.children.length}
                            fallback={
                                <p>
                                    Your letters will appear here when your family has a child with
                                    active consent.
                                </p>
                            }
                        >
                            <For each={v().letter.children}>
                                {(child) => (
                                    <article class="weekly-paper">
                                        <div class="weekly-letterhead">
                                            <img
                                                src="/icon-192.png"
                                                alt=""
                                                width="52"
                                                height="52"
                                            />
                                            <span>From the paper bird</span>
                                            <time>{v().letter.to}</time>
                                        </div>
                                        <h2>Dear {child.name}'s grown-ups,</h2>
                                        <For each={child.sections}>
                                            {(s) => (
                                                <section>
                                                    <h3>{s.heading}</h3>
                                                    <p>{s.text}</p>
                                                    <Show when={s.lesson}>
                                                        {(lesson) => (
                                                            <a
                                                                href={`/map?lesson=${encodeURIComponent(lesson())}`}
                                                            >
                                                                Open the lesson
                                                            </a>
                                                        )}
                                                    </Show>
                                                    <Show
                                                        when={
                                                            s.heading === "A little help from you"
                                                        }
                                                    >
                                                        <a href="/calendar">Open your calendar</a>
                                                    </Show>
                                                </section>
                                            )}
                                        </For>
                                        <p class="weekly-sign">
                                            With a little room to learn,
                                            <br />
                                            the paper bird
                                        </p>
                                    </article>
                                )}
                            </For>
                        </Show>
                        <section class="letter-preferences">
                            <h2>Bring the letter to your inbox</h2>
                            <p>
                                One email for this family, on Monday morning in your family's time
                                zone. Each parent chooses for themselves.
                            </p>
                            <p id="letter-mode-label">What would you like to receive?</p>
                            <select
                                id="letter-mode"
                                aria-labelledby="letter-mode-label"
                                value={mode()}
                                onChange={(e) => {
                                    const m = e.currentTarget.value;
                                    if (m === "off" || m === "private" || m === "detailed")
                                        setMode(m);
                                }}
                            >
                                <option value="off">No weekly emails</option>
                                <option value="private">A private link</option>
                                <option value="detailed">The full letter</option>
                            </select>
                            <p class="note">
                                Choosing the full letter sends your children's names and learning
                                summaries through Resend and your email provider. Email can be
                                forwarded and stays in your inbox after changes in the app.
                                Private-link emails keep those details inside lumischool.
                            </p>
                            <Button disabled={saving()} onClick={() => void save()}>
                                {saving() ? "Saving…" : "Save my email choice"}
                            </Button>
                            <output>{said()}</output>
                        </section>
                    </Postcard>
                )}
            </Show>
        </Show>
    );
}
