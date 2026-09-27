import { createResource, Match, Switch, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { parentPaintingGateway } from "../../engine/ui/painting-repository";
import { PaintingGallery } from "../../engine/ui/painting-gallery";
import type { PaintingLayout } from "../../engine/ui/painting";
import { useLook } from "../../engine/ui/page";
import { isParent } from "../../school/family/access";
import { Link, search } from "../../engine/ui/router";
import { signInFor } from "./routes";

/** The four arrangements being tried, at `/painting?v1` to `?v4`; plain `/painting` is the page as
 *  it stands. */
const LAYOUTS: Record<string, PaintingLayout> = {
    v1: "box",
    v2: "hand",
    v3: "pages",
    v4: "table",
};

export function Painting(): JSX.Element {
    const look = useLook();
    const layout = (): PaintingLayout => {
        const asked = new URLSearchParams(search());
        for (const [key, name] of Object.entries(LAYOUTS)) if (asked.has(key)) return name;
        return "now";
    };
    look({ wide: true, stage: true, stageBackdrop: true, place: "meadow" });
    const [me] = createResource(() => api.me({ ask: true }));
    const [family] = createResource(() => api.familyRows({ ask: true }));
    return (
        <Switch fallback={<output>Opening the painting table…</output>}>
            <Match when={me() && "error" in (me() ?? {})}>
                <p>
                    Open your parent account to paint.{" "}
                    <Link href={signInFor("/painting")}>Sign in</Link>
                </p>
            </Match>
            <Match when={me()}>
                {(value) => {
                    const parent = value();
                    if ("error" in parent) return null;
                    if (!isParent(parent.members))
                        return (
                            <p>Painting is available to parents while we try out the experience.</p>
                        );
                    return (
                        <PaintingGallery
                            layout={layout()}
                            gateway={parentPaintingGateway}
                            storageKey={`lumischool.painting.v1.${parent.family.id}.${parent.user.id}`}
                            identityKey={`${parent.family.id}.${parent.user.id}`}
                            children={(() => {
                                const value = family();
                                return value && !("error" in value) ? value.kids : [];
                            })()}
                        />
                    );
                }}
            </Match>
        </Switch>
    );
}
