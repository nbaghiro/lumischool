// The grown-ups' map (.docs/parent-app.md, "The map, for grown-ups"): the school as written, edge to
// edge under the bar, every world of every year open to go into, and inside a world its roll of
// every lesson it holds, each sheet drawn as written with the answers and the notes for grown-ups as
// the roll comes near it (engine/ui/reading.tsx). Nothing here reads a child's record or records
// anything. Where the grown-up is goes in the address (school.ts, `whereIn`), so back and a shared
// link both work.

import "./map.css";
import {
    createMemo,
    createResource,
    createSignal,
    lazy,
    Match,
    Suspense,
    Switch,
    type JSX,
} from "solid-js";
import * as api from "../../engine/ui/api";
import { onDemand, still } from "../../engine/ui/art";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Overworld } from "../../engine/ui/overworld";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { go, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import { KIDS, signInFor } from "./routes";
import {
    inWorld,
    mapHref,
    placeOf,
    readingOf,
    schoolOf,
    whereIn,
    worldAt,
    type School,
} from "./school";

const local = onThisComputer(location.hostname);

// the roll's code comes with the first world a grown-up goes into, not with the map
const Reading = lazy(() =>
    onDemand(() => import("../../engine/ui/reading")).then((m) => ({ default: m.Reading })),
);

/** The school as written, or why it could not be read; null once the grown-up has been sent to sign in. */
async function read(): Promise<School | Failure | null> {
    const p = await api.pack();
    if ("error" in p) {
        if (p.error === "put-away") {
            location.replace(KIDS);
            return null;
        }
        if (p.error === "signed-out") {
            go(signInFor(`${location.pathname}${location.search}`), { replace: true });
            return null;
        }
        return p;
    }
    return schoolOf(p, still());
}

export function GrownMap(): JSX.Element {
    // wide as every other grown-ups' screen, so the bar keeps its width between Home and the map
    useLook()({ stage: true, wide: true });
    const [school, { refetch }] = createResource(read);
    const loaded = (): School | null => {
        const s = school.latest;
        return s && !("error" in s) ? s : null;
    };
    const failed = (): Failure | null => {
        const s = school.latest;
        return s && "error" in s ? s : null;
    };
    const where = createMemo(() => whereIn(search()), undefined, {
        equals: (a, b) => a.world === b.world && a.lesson === b.lesson,
    });
    // `box` is where the view being left put the world on the screen, so the one opening picks the
    // movement up there: the dive into a world and the way back out are one movement (world.tsx)
    const [box, setBox] = createSignal<DOMRect | undefined>();
    const [back, setBack] = createSignal<{ place: number; from: DOMRect } | undefined>();
    const [placeBack, setPlaceBack] = createSignal<number | undefined>();
    return (
        <div class="mp">
            <Switch>
                <Match when={failed()}>
                    {(f) => (
                        <Postcard note kicker="The map" title="The map did not load">
                            <Say
                                text={failureText(f(), local)}
                                action={{ label: "Try again", run: () => void refetch() }}
                            />
                        </Postcard>
                    )}
                </Match>
                <Match when={loaded()}>
                    {(s) => {
                        const at = createMemo(() => inWorld(s(), where()), undefined, {
                            equals: (a, b) => a.world === b.world && a.lesson === b.lesson,
                        });
                        return (
                            <Switch>
                                <Match when={at().world} keyed>
                                    {(world) => (
                                        <Suspense
                                            fallback={<p class="mp-note">The world is opening.</p>}
                                        >
                                            <Reading
                                                source={readingOf(s(), world, {
                                                    level: "medium",
                                                    key: true,
                                                })}
                                                from={box()}
                                                lesson={at().lesson}
                                                class="mp-world"
                                                title={`${s().worldOf(world).name}, as written`}
                                                onOut={(out) => {
                                                    const place = placeOf(s().map, world);
                                                    setBox(undefined);
                                                    setPlaceBack(place ?? undefined);
                                                    setBack(
                                                        place !== null && out
                                                            ? { place, from: out }
                                                            : undefined,
                                                    );
                                                    // out replaces the world's entry, so back from
                                                    // the map leaves it rather than returning to
                                                    // the world
                                                    go(mapHref(), { replace: true });
                                                }}
                                            />
                                        </Suspense>
                                    )}
                                </Match>
                                <Match when={!at().world}>
                                    <Overworld
                                        view={s().map}
                                        focus={placeBack() ?? "all"}
                                        arrive={back()}
                                        class="mp-map"
                                        title="The map of every world"
                                        onGoIn={(place, out) => {
                                            const world = worldAt(s().map, place);
                                            if (!world) return;
                                            setBack(undefined);
                                            setBox(out ?? undefined);
                                            go(mapHref({ world }));
                                        }}
                                    />
                                </Match>
                            </Switch>
                        );
                    }}
                </Match>
                <Match when={school.loading}>
                    <Waiting kicker="The map" title="Opening the map" />
                </Match>
            </Switch>
        </div>
    );
}
