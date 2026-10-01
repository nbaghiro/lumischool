import { Match, Switch, type JSX } from "solid-js";
import { createHeld } from "../../engine/ui/held";
import * as shared from "./shared";
import type { PaintingGateway } from "../../engine/ui/painting-repository";
import { PaintingGallery } from "../../engine/ui/painting-gallery";
import type { PaintingLayout } from "../../engine/ui/painting";
import { useLook } from "../../engine/ui/page";
import { isParent } from "../../school/family/access";
import { Link, search, useReady } from "../../engine/ui/router";
import { signInFor } from "./routes";
import { settingIn } from "../../engine/answer";
import * as api from "../../engine/ui/api";

/** The four arrangements being tried, at `/painting?v1` to `?v4`; plain `/painting` is the page as
 *  it stands. */
const LAYOUTS: Record<string, PaintingLayout> = {
    v1: "box",
    v2: "hand",
    v3: "pages",
    v4: "table",
};

/** A grown-up's pictures, kept by the API under the family. */
const gateway: PaintingGateway = {
    list: api.paintingList,
    load: api.paintingLoad,
    save: api.paintingSave,
    remove: api.paintingDelete,
};

export function Painting(): JSX.Element {
    const look = useLook();
    const layout = (): PaintingLayout => {
        const asked = new URLSearchParams(search());
        for (const [key, name] of Object.entries(LAYOUTS)) if (asked.has(key)) return name;
        return "now";
    };
    look({ wide: true, stage: true, stageBackdrop: true, place: "meadow" });
    const [me] = createHeld(() => shared.me.read(), [shared.me]);
    const [family] = createHeld(() => shared.family.read(), [shared.family]);
    const [settings] = createHeld(
        () => shared.events(undefined, { kinds: ["setting-changed"] }).read(),
        [],
    );
    /** The family's easel from the log, undefined until it is read. */
    const preferences = (): unknown => {
        const got = settings();
        return got && !("error" in got)
            ? (settingIn(got.list, "painting", null) ?? null)
            : undefined;
    };
    const keep = (state: unknown): void => {
        void api.append([
            {
                id: api.newId(),
                kid_id: null,
                kind: "setting-changed",
                at: api.nowAt(),
                data: { key: "painting", of: null, value: state },
            },
        ]);
    };
    useReady(() => me.latest !== undefined);
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
                            gateway={gateway}
                            storageKey={`lumischool.painting.v1.${parent.family.id}.${parent.user.id}`}
                            identityKey={`${parent.family.id}.${parent.user.id}`}
                            preferences={preferences}
                            onPreferences={keep}
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
