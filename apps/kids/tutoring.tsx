import { createResource, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { nextTeaching } from "../../school/tutoring";
import {
    readTeachingMaterial,
    teachingObject,
    teachingPreferences,
    type TeachingMaterial,
} from "../../engine/teaching";
import { TeachingSession } from "../../engine/ui/teaching-session";
import { teachingAccess, teachingGateway, teachingMaterialFor } from "../../engine/ui/kid";
import { CloseX, Dialog } from "../../engine/ui/dialog";
import type { Kid } from "../../server/db/schema";

/** Keeps the worksheet mounted beneath the teaching surface, including all unfinished answers. */
export function LessonTeaching(props: {
    kid: Kid;
    lesson: string;
    guide: string;
    reference?: { material: string; version: string; hash: string };
    onReady?: (open: (() => void) | null) => void;
}): JSX.Element {
    const reference = props.reference;
    const settings = teachingObject(props.kid.settings) ? props.kid.settings : {};
    const teaching = teachingObject(settings.teaching) ? settings.teaching : {};
    if (!reference || !teachingObject(teaching.tutoring) || teaching.tutoring.enabled !== true)
        return null;
    // The material comes from the server, so the child's app carries no curriculum of its own.
    const [ready] = createResource(async (): Promise<TeachingMaterial | null> => {
        const access = await teachingAccess(props.kid.id);
        if (!access.ok || !teachingObject(access.body) || access.body.enabled !== true) return null;
        const answer = await teachingMaterialFor(props.kid.id, reference.material);
        if (!answer.ok || !teachingObject(answer.body)) return null;
        const material = readTeachingMaterial(answer.body.material);
        if (!material || material.version !== reference.version) return null;
        const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(material)),
        );
        const hash = Array.from(new Uint8Array(digest), (b) =>
            b.toString(16).padStart(2, "0"),
        ).join("");
        return hash === reference.hash ? material : null;
    });
    const [open, setOpen] = createSignal(false);
    const [compact, setCompact] = createSignal(false);
    const preferences = teachingPreferences(teaching.tutoring);
    let entry: HTMLDivElement | undefined;
    let observer: IntersectionObserver | undefined;
    let guided = false;
    const observe = () => {
        if (!entry || preferences.entry !== "guided" || guided) return;
        observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting) && !guided) {
                    guided = true;
                    setOpen(true);
                    observer?.disconnect();
                }
            },
            { threshold: 0.8 },
        );
        observer.observe(entry);
    };
    onMount(observe);
    onCleanup(() => observer?.disconnect());
    onCleanup(() => props.onReady?.(null));
    return (
        <Show when={ready()}>
            {(value) => {
                const material = value();
                props.onReady?.(() => {
                    setCompact(true);
                    setOpen(true);
                });
                return (
                    <div
                        class="lesson-teaching-entry"
                        ref={(el) => {
                            entry = el;
                            queueMicrotask(observe);
                        }}
                    >
                        <button
                            class="teaching-link"
                            onClick={() => {
                                setCompact(false);
                                setOpen(true);
                            }}
                        >
                            Teach me
                        </button>
                        <button
                            class="teaching-link"
                            onClick={() => {
                                setCompact(true);
                                setOpen(true);
                            }}
                        >
                            Help me understand
                        </button>
                        <Show when={open()}>
                            <Portal>
                                <Dialog two onClose={() => setOpen(false)}>
                                    <div class="teaching-dialog">
                                        <CloseX onClose={() => setOpen(false)} />
                                        <TeachingSession
                                            material={material}
                                            preferences={preferences}
                                            gateway={teachingGateway(props.kid.id, props.lesson)}
                                            identity={`${props.kid.family_id}.${props.kid.id}.${props.lesson}`}
                                            compact={compact()}
                                            wayOut={false}
                                            next={nextTeaching}
                                            onClose={() => setOpen(false)}
                                        />
                                    </div>
                                </Dialog>
                            </Portal>
                        </Show>
                    </div>
                );
            }}
        </Show>
    );
}
