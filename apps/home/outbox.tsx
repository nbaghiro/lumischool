// The local outbox: on a developer's computer no email is sent, so the codes the server would have
// emailed are read here. It exists only where the API runs locally, and the app has this screen only
// on this computer (routes.ts).

import { createEffect, createResource, For, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Button } from "../../engine/ui/form";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import type { Outbox as Box } from "../../server/api";

export function Outbox(): JSX.Element {
    const look = useLook();
    createEffect(() => look({ place: "harbour" }));
    const [box, { refetch }] = createResource(
        async (): Promise<Box | "none"> =>
            (await api.outbox(new URLSearchParams(location.search).has("previews"))) ?? "none",
    );
    const found = (): Box | null => {
        const b = box.latest;
        return b && b !== "none" ? b : null;
    };
    return (
        <Show when={box.latest} fallback={<Waiting title="Opening the outbox" />}>
            <Show
                when={found()}
                fallback={
                    <Postcard
                        note
                        kicker="On this computer only"
                        title="There is no outbox here"
                        lead="The outbox exists only while the lumischool server runs on a developer's own computer."
                    />
                }
            >
                {(b) => (
                    <Postcard
                        wide
                        kicker="On this computer only"
                        title="The outbox"
                        lead="What lumischool would have emailed, newest first. Nothing here left this computer."
                        links={
                            <div class="acts">
                                <a href="/outbox?previews">Browse fictional email designs</a>
                                <Button second onClick={() => void refetch()}>
                                    Look again
                                </Button>
                            </div>
                        }
                    >
                        <Show
                            when={b().emails.length}
                            fallback={<p class="note">Nothing has been sent yet.</p>}
                        >
                            <ul class="mails">
                                <For each={b().emails}>
                                    {(e) => (
                                        <li class="mail">
                                            <strong>{e.subject}</strong>
                                            <span class="note">
                                                To {e.to}, at {new Date(e.at).toLocaleTimeString()}
                                            </span>
                                            <pre>{e.text}</pre>
                                            <Show when={e.html}>
                                                <iframe
                                                    title={`${e.subject} design`}
                                                    srcdoc={e.html}
                                                    sandbox=""
                                                    referrerpolicy="no-referrer"
                                                    style={{
                                                        width: "100%",
                                                        height: "760px",
                                                        border: "1px solid #dce3ea",
                                                    }}
                                                />
                                            </Show>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </Show>
                    </Postcard>
                )}
            </Show>
        </Show>
    );
}
