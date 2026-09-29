import { createResource, createSignal, For, Show, type JSX } from "solid-js";
import {
    DEFAULT_TEACHING,
    teachingPreferences,
    type TeachingPreferences,
} from "../../engine/teaching";
import { TEACHING_MATERIALS } from "../../school/tutoring-materials";
import { nextTeaching } from "../../school/tutoring";
import { TeachingSession, type TeachingGateway } from "../../engine/ui/teaching-session";
import { AdaptiveSession, type HelpGateway } from "../../engine/ui/adaptive-session";
import { groundFor } from "../../school/adaptive";
import { askedIn } from "../../school/lessons";
import type { PackQuestion } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import { Select } from "../../engine/ui/select";
import { Button, Check } from "../../engine/ui/form";
import { call } from "../../engine/ui/wire";
import { useLook } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import * as api from "../../engine/ui/api";
import { createHeld } from "../../engine/ui/held";
import * as shared from "./shared";
import { isParent } from "../../school/family/access";
import { Link, useReady } from "../../engine/ui/router";

interface OpenPreview {
    run: number;
    material: string;
    preferences: TeachingPreferences;
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const previewKey = (identity: string): string => `lumischool.teaching.preview.${identity}`;
function openPreview(identity: string): OpenPreview | null {
    try {
        const raw: unknown = JSON.parse(sessionStorage.getItem(previewKey(identity)) ?? "null");
        if (!isRecord(raw)) return null;
        const { run, material, preferences } = raw;
        if (typeof run !== "number" || run <= 0 || typeof material !== "string") return null;
        return { run, material, preferences: teachingPreferences(preferences) };
    } catch {
        return null;
    }
}
const gateway: TeachingGateway = {
    start: (id, material, preferences) =>
        call(
            "POST",
            "/api/tutoring/start",
            { id, material, preferences },
            {},
            AbortSignal.timeout(12000),
        ),
    load: (id) => call("GET", `/api/tutoring/${id}`, undefined, {}, AbortSignal.timeout(12000)),
    turn: (id, command) =>
        call("POST", `/api/tutoring/${id}/turn`, command, {}, AbortSignal.timeout(12000)),
    audio: async (id, revision, signal) => {
        const response = await fetch(`/api/tutoring/${id}/audio`, {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ revision }),
        });
        return response.ok && response.status !== 204 ? response.blob() : null;
    },
};
/** Lessons whose questions the tutor can teach today, which the preview offers beside the bundles. */
const QUESTION_LESSONS = ["g1-counting-to-twenty", "g1-adding-to-twenty"];

const helpGateway = (lesson: string, n: number, variant: string): HelpGateway => ({
    start: (id, tries) =>
        call(
            "POST",
            "/api/tutoring/help/start",
            { id, lesson, n, variant, tries },
            {},
            AbortSignal.timeout(12000),
        ),
    load: (id) =>
        call("GET", `/api/tutoring/help/${id}`, undefined, {}, AbortSignal.timeout(12000)),
    turn: (id, operationId, expectedRevision, answer, tries) =>
        call(
            "POST",
            `/api/tutoring/help/${id}/turn`,
            { operationId, expectedRevision, answer, tries },
            {},
            AbortSignal.timeout(12000),
        ),
});

/** The first question of a lesson the tutor has ground for, with what the board needs to draw it. */
async function teachableIn(
    lessonId: string,
): Promise<{ question: PackQuestion; scene: Scene; skills: string[]; title: string } | null> {
    const view = await shared.pack.read();
    if ("error" in view) return null;
    const facts = view.index.lessons.find((l) => l.id === lessonId);
    if (!facts) return null;
    const lesson = await api.packLesson(view.pack, facts.file);
    if ("error" in lesson) return null;
    for (const asked of askedIn(lesson, "medium")) {
        const scene = asked.question.scene;
        if (scene && groundFor(asked.item.skills, asked.question))
            return {
                question: asked.question,
                scene,
                skills: asked.item.skills,
                title: lesson.title,
            };
    }
    return null;
}

export function Tutoring(): JSX.Element {
    const look = useLook();
    // The board is the place, not a card over the map, so the page carries no backdrop here.
    look({ wide: true, stage: true });
    const [me] = createHeld(() => shared.me.read(), [shared.me]);
    useReady(() => me.latest !== undefined);
    return (
        <Show when={me()} fallback={<p>Opening the teaching table…</p>}>
            {(value) => {
                const m = value();
                return "error" in m ? (
                    <p>
                        <Link href="/sign-in?next=/tutoring">Sign in to try teaching</Link>
                    </p>
                ) : isParent(m.members) ? (
                    <Preview identity={`${m.family.id}.${m.user.id}`} />
                ) : (
                    <p>This preview is for parents.</p>
                );
            }}
        </Show>
    );
}
function Preview(props: { identity: string }): JSX.Element {
    const first = TEACHING_MATERIALS[0];
    if (!first) return null;
    // A reload lands back on the lesson that was open, which is where the session itself resumes.
    const opened = openPreview(props.identity);
    const [material, setMaterial] = createSignal(
        TEACHING_MATERIALS.find((m) => m.id === opened?.material) ?? first,
    );
    const [preferences, setPreferences] = createSignal<TeachingPreferences>(
        teachingPreferences(opened?.preferences ?? DEFAULT_TEACHING),
    );
    const [run, setRun] = createSignal(opened ? opened.run : 0);
    const [question, setQuestion] = createSignal<string>("");
    const [asked] = createResource(question, async (lessonId: string) => {
        const found = await teachableIn(lessonId);
        if (!found) return null;
        const { scenes } = await import("../../engine/ui/scene");
        return { ...found, draw: await scenes([found.scene]) };
    });
    const [family] = createHeld(() => shared.family.read(), [shared.family]);
    const [child, setChild] = createSignal("");
    const [saved, setSaved] = createSignal("");
    const children = () => {
        const f = family();
        return f && !("error" in f) ? f.kids : [];
    };
    const savePreferences = async () => {
        const result = await call("POST", "/api/tutoring/preferences", {
            kid: child(),
            preferences: { ...preferences(), enabled: true },
        });
        setSaved(
            result.ok
                ? "Preferences saved. Child tutoring remains behind the rollout switch."
                : "Could not save preferences. Please try again.",
        );
    };
    const preference = (key: keyof TeachingPreferences, value: string | boolean) =>
        setPreferences((p) => teachingPreferences({ ...p, [key]: value }));
    const remember = (run: number) => {
        try {
            if (run) {
                const open: OpenPreview = {
                    run,
                    material: material().id,
                    preferences: preferences(),
                };
                sessionStorage.setItem(previewKey(props.identity), JSON.stringify(open));
            } else sessionStorage.removeItem(previewKey(props.identity));
        } catch {
            /* a browser that keeps nothing still runs the preview */
        }
    };
    const startRun = () =>
        setRun((r) => {
            const next = r + 1;
            remember(next);
            return next;
        });
    const endRun = () => {
        remember(0);
        setRun(0);
    };
    return (
        <main class="teaching-preview">
            <Postcard
                head
                focus={false}
                kicker="The teaching preview"
                title="A little help, together"
                lead="Try a lesson the way a child meets it, with the tutor beside them."
            />
            <details class="teaching-settings" open={!run()}>
                <summary>{run() ? "Change lesson or tutor" : "Choose a lesson and tutor"}</summary>
                <div class="teaching-settings-fields">
                    <label>
                        Lesson
                        <Select
                            value={question() ? `question:${question()}` : material().id}
                            onChange={(e) => {
                                const value = e.currentTarget.value;
                                endRun();
                                if (value.startsWith("question:")) {
                                    setQuestion(value.slice("question:".length));
                                    return;
                                }
                                setQuestion("");
                                const m = TEACHING_MATERIALS.find((m) => m.id === value);
                                if (m) setMaterial(m);
                            }}
                        >
                            <For each={TEACHING_MATERIALS}>
                                {(m) => <option value={m.id}>{m.title}</option>}
                            </For>
                            <For each={QUESTION_LESSONS}>
                                {(id) => (
                                    <option value={`question:${id}`}>
                                        A question the tutor teaches ({id})
                                    </option>
                                )}
                            </For>
                        </Select>
                    </label>
                    <label>
                        Tutor
                        <Select
                            value={preferences().guide}
                            onChange={(e) => preference("guide", e.currentTarget.value)}
                        >
                            <option value="world">World guide</option>
                            <option value="bird">Paper bird</option>
                            <option value="snail">Snail</option>
                            <option value="none">No character</option>
                        </Select>
                    </label>
                    <label>
                        Lesson entry
                        <Select
                            value={preferences().entry}
                            onChange={(e) => preference("entry", e.currentTarget.value)}
                        >
                            <option value="worksheet">Worksheet</option>
                            <option value="guided">Guided teaching</option>
                        </Select>
                    </label>
                    <label>
                        Reading pace
                        <Select
                            value={preferences().pace}
                            onChange={(e) => preference("pace", e.currentTarget.value)}
                        >
                            <option value="normal">Normal</option>
                            <option value="slow">Slow</option>
                        </Select>
                    </label>
                    <label>
                        Words
                        <Select
                            value={preferences().delivery}
                            onChange={(e) => preference("delivery", e.currentTarget.value)}
                        >
                            <option value="concise">A little at a time</option>
                            <option value="steps">More steps</option>
                        </Select>
                    </label>
                    <label>
                        Read aloud
                        <Select
                            value={preferences().audio}
                            onChange={(e) => preference("audio", e.currentTarget.value)}
                        >
                            <option value="off">Off</option>
                            <option value="device">Device voice</option>
                            <option value="gemini">Tutor voice</option>
                        </Select>
                    </label>
                    <Check
                        label="Adaptive help"
                        checked={preferences().adaptive}
                        onChange={(on) => preference("adaptive", on)}
                    />
                    <Button onClick={startRun}>Start a fresh lesson</Button>
                </div>
                <div class="teaching-settings-fields">
                    <label>
                        Child preferences
                        <Select value={child()} onChange={(e) => setChild(e.currentTarget.value)}>
                            <option value="">Choose a child</option>
                            <For each={children()}>
                                {(kid) => <option value={kid.id}>{kid.name}</option>}
                            </For>
                        </Select>
                    </label>
                    <Button second disabled={!child()} onClick={() => void savePreferences()}>
                        Save preferences
                    </Button>
                    <output>{saved()}</output>
                </div>
            </details>
            <Show
                keyed
                when={run()}
                fallback={<p>Choose a lesson and start when you are ready.</p>}
            >
                {(run) =>
                    question() ? (
                        <Show when={asked()} fallback={<p>Opening the question…</p>}>
                            {(q) => (
                                <AdaptiveSession
                                    title={q().title}
                                    scene={q().scene}
                                    draw={q().draw}
                                    preferences={preferences()}
                                    authored={q().question.hints[0] ?? q().question.ask}
                                    ringOf={(ref) =>
                                        ref
                                            ? (groundFor(q().skills, q().question)
                                                  ?.ringable(q().question)
                                                  .find((r) => r.ref === ref)?.spans ?? [])
                                            : []
                                    }
                                    tries={[]}
                                    gateway={helpGateway(
                                        question(),
                                        q().question.n,
                                        q().question.variant,
                                    )}
                                    onClose={endRun}
                                />
                            )}
                        </Show>
                    ) : (
                        <TeachingSession
                            material={material()}
                            preferences={preferences()}
                            gateway={gateway}
                            identity={`${props.identity}.${run}`}
                            next={nextTeaching}
                            onClose={endRun}
                        />
                    )
                }
            </Show>
        </main>
    );
}
