// The site, at `/` for a visitor who is signed out and at `/home` for everyone (.docs/auth.md, "Hosts"):
// the sample child's map edge to edge under a sheet taped onto it, and the sections below. The words
// are the site's own and the sample child's, from the data the build wrote (data.ts), read once the
// page has opened, and every picture is drawn from the visitor's pack (sample.ts) when it comes near
// the window.

import "../../engine/ui/form.css";
import {
    createEffect,
    createResource,
    createSignal,
    For,
    lazy,
    onCleanup,
    onMount,
    Show,
    type JSX,
} from "solid-js";
import type { MapView, Size } from "../../engine/space";
import { idle, onDemand } from "../../engine/ui/art";
import { MapBackdrop, OPENING, type Ground } from "../../engine/ui/backdrop";
import { atFrom, hashOf, type OverlayAt } from "../../engine/ui/hash";
import { PHONE_OPENING } from "../../engine/ui/snapshot";
import { SITE } from "../../engine/ui/snapshots/site";
import { Mark } from "../../engine/ui/mark";
import { matches, Near, scrolledPast, whileNear } from "../../engine/ui/viewport";
import type { Sample } from "../../school/worlds/sample";
import type { Roll, SamplePicture } from "./sample";

/** The sample child's map at the opening, worked out from the site's data once the map's box is near and the page idle, drawn by the same component as the map section below (ground.ts). */
const opening = async (): Promise<Ground> => (await import("./ground")).ground();

/**
 * The site's data (data.ts) and the pictures drawn from it and the visitor's pack (sample.ts), each
 * loaded once, when the page is first idle, so nothing the page loads first carries the sample child,
 * and the page loaded again once if the server no longer has them.
 */
let data: Promise<typeof import("./data")> | null = null;
const siteData = (): Promise<typeof import("./data")> =>
    (data ??= idle()
        .then(() => onDemand(() => import("./data")))
        .catch((error: unknown) => {
            data = null;
            throw error;
        }));
let drawn: Promise<typeof import("./sample")> | null = null;
const pictures = (): Promise<typeof import("./sample")> =>
    (drawn ??= siteData()
        .then(() => onDemand(() => import("./sample")))
        .catch((error: unknown) => {
            drawn = null;
            throw error;
        }));

// the look a visitor takes over the page, and the map, the worlds and the roll it draws, come with
// the first See the map, not with the page
const Overlay = lazy(() => import("../../engine/ui/overlay").then((m) => ({ default: m.Overlay })));
const warmMap = (): void => {
    void import("./ground").then((m) => m.warmLook()).catch(() => undefined);
    void import("../../engine/ui/overlay").catch(() => undefined);
};

/**
 * Where the look is, as the address after the `#` says (engine/ui/hash.ts), so back, Escape and a
 * shared link work: `#/map` the sample child's map, `#/map/<world>` a world of it. The page has no
 * router, so it reads the address itself, on every move of the history.
 */
const [hash, setHash] = createSignal(location.hash);
addEventListener("popstate", () => setHash(location.hash));
// The page's #map section is distinct from the explicit #/map overlay route.
const looking = (): OverlayAt | null => (hash() === "#map" ? null : atFrom(hash()));
/** The entry the look pushed, so closing it goes back to the page's own rather than past it. */
const LOOK = { look: true };
const pushedLook = (): boolean => {
    const st: unknown = history.state;
    return typeof st === "object" && st !== null && "look" in st;
};
function look(at: OverlayAt | null): void {
    const here = `${location.pathname}${location.search}`;
    if (at === null) {
        if (pushedLook()) history.back();
        else history.replaceState(null, "", here);
    } else if (pushedLook()) history.replaceState(LOOK, "", `${here}${hashOf(at)}`);
    else history.pushState(LOOK, "", `${here}${hashOf(at)}`);
    setHash(location.hash);
}

/** Draws one picture of the sample child into the box it is given. */
const picture =
    (p: SamplePicture) =>
    async (host: HTMLElement): Promise<void> =>
        (await pictures()).drawSample(host, p);

/**
 * Whether this browser is signed in, shared by everything on the page that changes with it. The hint
 * the browser keeps answers when the client loads, and the API is asked only when there is a hint.
 */
const [inside, setInside] = createSignal(false);
void import("../../engine/ui/api").then(async ({ me, signedIn }) => {
    setInside(signedIn() !== null);
    setInside((await me()) !== null);
});

/**
 * The bar: the mark, the sections of the page, and the way in, which is signing in or starting a
 * family for a visitor and the family's own page for a parent who is signed in.
 */
function Bar(): JSX.Element {
    const moved = scrolledPast(4);
    return (
        <header class="site-bar" classList={{ moved: moved() }}>
            <div class="site-wrap site-bar-in">
                <Mark href="/home" />
                <nav class="site-secnav" aria-label="Sections of this page">
                    <a href="#day">A lesson</a>
                    <a href="#map">The map</a>
                    <a href="#you">For parents</a>
                    <a href="#subjects">Subjects</a>
                </nav>
                <div class="site-ways">
                    <Show
                        when={inside()}
                        fallback={
                            <>
                                <a class="site-in" href="/sign-in">
                                    Sign in
                                </a>
                                <a class="btn site-start" href="/start">
                                    Start a family
                                </a>
                            </>
                        }
                    >
                        <a class="btn" href="/" aria-label="Open your family's page">
                            <span class="site-family-wide">Open your family's page</span>
                            <span class="site-family-narrow" aria-hidden="true">
                                Your family
                            </span>
                        </a>
                    </Show>
                </div>
            </div>
        </header>
    );
}

const phoneStills = SITE.filter((snapshot) => snapshot.across === OPENING.wide.across).map(
    (snapshot) => ({ ...snapshot, across: PHONE_OPENING.across }),
);

function Opening(props: { sample: Sample | undefined }): JSX.Element {
    const [sheet, setSheet] = createSignal<HTMLElement>();
    // The phone leaves room for the harbour below the sheet.
    const narrow = matches("(max-width: 700px)");
    return (
        <section class="site-opening" id="top">
            <MapBackdrop
                sample
                class="site-map"
                aim={narrow() ? PHONE_OPENING : OPENING.wide}
                ground={opening}
                stills={narrow() ? phoneStills : SITE}
                keepOff={() => {
                    const over = sheet();
                    return over ? [over] : [];
                }}
                fade
                onDrawn={() => void siteData().then((d) => d.openingDrawn())}
            />
            <div class="site-wrap site-over">
                <div class="site-sheet" ref={setSheet}>
                    <span class="site-tape" aria-hidden="true" />
                    <span class="site-tape r" aria-hidden="true" />
                    <p class="kicker">{props.sample?.eyebrow ?? "Ages 5 to 10"}</p>
                    <h1>School at home, one world at a time</h1>
                    <p class="lead">
                        Each term your child moves on to a new world. Every question is checked
                        before they see it.
                    </p>
                    <p class="acts">
                        <a class="btn" href="#start">
                            Read a lesson
                        </a>
                        <a
                            class="btn second"
                            href={hashOf({ world: null, lesson: null })}
                            onPointerEnter={warmMap}
                            onFocus={warmMap}
                            onClick={(e) => {
                                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                                e.preventDefault();
                                look({ world: null, lesson: null });
                            }}
                        >
                            See the map
                        </a>
                    </p>
                    <p class="under">
                        In development. This page collects nothing, and there is no price yet.
                    </p>
                </div>
            </div>
            <p class="site-wrap site-cap note">{props.sample?.caption}</p>
        </section>
    );
}

function Facts(props: { sample: Sample | undefined }): JSX.Element {
    return (
        <div class="site-facts">
            <div class="site-wrap site-facts-in">
                <For each={props.sample?.facts ?? []}>
                    {(f) => (
                        <div class="site-fact">
                            <span class="n">{f.n}</span>
                            <span class="k">{f.k}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}

function Head(props: { num: string; kicker: string; title: string; lead?: string }): JSX.Element {
    return (
        <div class="site-head">
            <p class="kicker">
                <span class="num">{props.num}</span> <span>{props.kicker}</span>
            </p>
            <h2>{props.title}</h2>
            <Show when={props.lead}>
                <p class="lead">{props.lead}</p>
            </Show>
        </div>
    );
}

function Day(props: { sample: Sample | undefined }): JSX.Element {
    const day = () => props.sample?.day;
    const versions = () => Array.from({ length: day()?.versions ?? 0 }, (_, i) => i);
    return (
        <section class="site-sec" id="day">
            <div class="site-wrap">
                <Head
                    num="01"
                    kicker={day()?.kicker ?? "A day"}
                    title="Each day's lesson sits on the path"
                    lead="The world is drawn around the page, never on it."
                />
                <SampleRoll caption={day()?.caption} />
                <div class="site-day-foot">
                    <figure class="site-fig">
                        <div class="site-versions">
                            <For each={versions()}>
                                {(at) => (
                                    <Near
                                        class="site-version paper"
                                        draw={picture({ is: "version", at })}
                                    />
                                )}
                            </For>
                        </div>
                        <figcaption>{day()?.versionsCaption}</figcaption>
                    </figure>
                    <figure class="site-fig site-day-print">
                        <Near class="site-print paper" draw={picture({ is: "print" })} />
                        <figcaption>
                            The same lesson, printed. The world stays on the screen.
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
}

/** The stops of the first year and the whole run, beside the map that walks to whichever is in the middle. */
/** The map's and the roll's components, loaded with their own code when their section comes near. */
const Overworld = lazy(() =>
    import("../../engine/ui/overworld").then((m) => ({ default: m.Overworld })),
);
const WorldRoll = lazy(() => import("../../engine/ui/world").then((m) => ({ default: m.World })));

/** Today's sheets, as the page drew them. */
function todays(r: Roll): HTMLElement[] {
    const row = r.view.layout.rows.find((x) => x.day.state === "today");
    return (row?.day.lessons ?? []).flatMap((id) => {
        const el = r.sheets(id);
        return el ? [el] : [];
    });
}

/** Paper kept between the frame's edge and a drawing it holds, in the roll's units beside the sheet and in px above it. */
const ROOM = 16;
const ROOM_ABOVE = 12;

/** The share of the frame's foot that fades out, as site.css masks it, which is not framing anything. */
const FADE = 0.14;

/** What the picture is drawn at before it has been measured: about two thirds, which is what the harbour's landmark and guide take at a laptop's width. */
const FIRST = 2 / 3;

/**
 * The smallest the sheet is ever drawn, as a share of its own size: on a phone, where the frame is
 * barely wider than the sheet and the words matter more than the world, and on anything wider, where
 * the world round the sheet is what the picture is for.
 */
const SMALLEST = { phone: 0.8, wide: 0.5 };

/**
 * A day of the sample child's as a still picture, through the same component the children's view
 * draws its roll with: today's sheet in the middle, with the world that stands beside it, the
 * landmark today's lesson lights and the guide, inside the frame round it. Nothing in it takes the
 * pointer, the wheel or a finger, so the page scrolls over it as over any picture, and the roll's own
 * buttons and the world's name are not drawn (site.css).
 *
 * Two things are measured off the picture itself once the roll has drawn, since only the drawing
 * knows where a world's things stand: `--k`, the scale that brings what stands beside today's sheet
 * inside the frame, down to a floor that keeps the sheet readable, and `--lift`, how far the roll is
 * drawn up the frame. The frame's edge never falls inside a drawing: beside the sheet it is stepped
 * out past one or in before it, and above the sheet the lift stops short of anything it would cut,
 * today's date included. The roll is drawn again, landing afresh on today, whenever either changes or
 * the frame changes width.
 */
function SampleRoll(props: { caption: string | undefined }): JSX.Element {
    const [host, setHost] = createSignal<HTMLDivElement>();
    const [near, setNear] = createSignal(false);
    const narrow = matches("(max-width: 700px)");
    let version = 0;
    let owned: Roll | undefined;
    createEffect(() => {
        if (near()) return;
        version++;
        owned?.dispose();
        owned = undefined;
    });
    onCleanup(() => {
        version++;
        owned?.dispose();
    });
    const [roll] = createResource(
        () => (near() ? { host: host(), narrow: narrow() } : undefined),
        async (o) => {
            const request = ++version;
            const result = o.host ? await (await pictures()).roll(o.host, o.narrow) : undefined;
            if (request !== version) {
                result?.dispose();
                return undefined;
            }
            owned?.dispose();
            owned = result;
            return result;
        },
    );
    /** The frame's inner width, in px, once it has held still for a moment. */
    const [width, setWidth] = createSignal(0);
    const [scale, setScale] = createSignal(1);
    const [lift, setLift] = createSignal(0);
    createEffect(() => setScale(narrow() ? 1 : FIRST));

    /** What the picture is drawn at, from where the world's things stand in it as it is drawn now. */
    const fit = (frame: HTMLElement, r: Roll, again: () => boolean): void => {
        const sheet = todays(r)[0];
        if (!sheet) return;
        const f = frame.getBoundingClientRect();
        const left = f.left + frame.clientLeft,
            top = f.top + frame.clientTop,
            w = frame.clientWidth,
            h = frame.clientHeight;
        const s = sheet.getBoundingClientRect(),
            k = scale();
        const middle = (s.left + s.right) / 2;
        /** What stands beside today's sheet, as how far its near and far edges are from the sheet's, in the roll's units. */
        const beside: { near: number; far: number }[] = [];
        /** What the frame's top edge could cut, in px down the frame with the roll not lifted at all. */
        const above: { top: number; bottom: number }[] = [];
        const down = (y: number): number => y - top + lift();
        for (const el of frame.querySelectorAll(".l-art > *, .l-flags > *, .l-over > *")) {
            const d = el.getBoundingClientRect();
            if (d.width < 2 || d.height < 2) continue;
            if (d.right > left && d.left < left + w)
                above.push({ top: down(d.top), bottom: down(d.bottom) });
            // what only stands down in the frame's foot, which fades out, is not framed by its edges
            if (d.bottom < top || d.top > top + h - FADE * h) continue;
            const onLeft = (d.left + d.right) / 2 < middle;
            const far = (onLeft ? s.left - d.left : d.right - s.right) / k;
            if (far <= 0) continue;
            beside.push({ near: (onLeft ? s.left - d.right : d.left - s.right) / k, far });
        }

        const unit = r.view.layout.o.sheet;
        const floor = narrow() ? SMALLEST.phone : SMALLEST.wide;
        /** The most world the frame can hold beside the sheet before the sheet is smaller than the floor. */
        const most = Math.max(0, (w / floor - unit) / 2);
        const cuts = (band: number): boolean =>
            beside.some((x) => x.near + 1 < band && band < x.far - 1);
        const want = beside.length
            ? Math.max(...beside.map((x) => x.far)) + ROOM
            : (w / k - unit) / 2;
        let band = Math.min(want, most);
        if (cuts(band)) {
            // no room for all of it: back in to the last gap between what stands beside the sheet
            const gaps = beside
                .map((x) => x.near - ROOM)
                .filter((b) => b >= 0 && b <= most && !cuts(b));
            band = gaps.length ? Math.max(...gaps) : 0;
        }
        const k2 = Math.min(1, w / (unit + 2 * band));
        if (Math.abs(k2 - k) > 0.005 && again()) {
            setScale(k2);
            return;
        }

        // the world above the sheet is as deep as the world beside it, and never cuts what it would show
        const gap = Math.min(s.left - left, left + w - s.right);
        let up = down(s.top) - gap;
        for (let pass = 0; pass < 6; pass++) {
            const over = above.filter((d) => d.top < up - 1 && up < d.bottom + 1);
            if (!over.length) break;
            up = Math.min(...over.map((d) => d.top - ROOM_ABOVE));
        }
        setLift(Math.max(0, Math.round(up)));
    };

    onMount(() => {
        const el = host();
        if (!el) return;
        onCleanup(whileNear(el, setNear));
        let settling = 0;
        const sized = new ResizeObserver(() => {
            clearTimeout(settling);
            settling = window.setTimeout(() => setWidth(el.clientWidth), width() ? 200 : 0);
        });
        sized.observe(el);
        onCleanup(() => {
            sized.disconnect();
            clearTimeout(settling);
        });
    });
    createEffect(() => {
        const frame = host(),
            r = roll();
        if (!frame || !r || !width()) return;
        let raf = 0,
            measured: Element | null = null,
            passes = 0;
        const drawn = new MutationObserver(() => {
            const wd = frame.querySelector(".wd.ready");
            if (!wd || wd === measured) return;
            measured = wd;
            // the roll's camera is applied on its view's next frame
            raf = requestAnimationFrame(() => {
                raf = requestAnimationFrame(() => fit(frame, r, () => passes++ < 3));
            });
        });
        drawn.observe(frame, { subtree: true, attributes: true, attributeFilter: ["class"] });
        onCleanup(() => {
            drawn.disconnect();
            cancelAnimationFrame(raf);
        });
    });

    return (
        <figure class="site-fig">
            <div
                ref={setHost}
                class="site-roll paper"
                style={{ "--k": String(scale()), "--lift": `${lift()}px` }}
                aria-hidden="true"
                inert
            >
                <Show when={near() && width() > 0 && roll()} keyed>
                    {(r) => (
                        <For each={[`${width()}:${scale()}`]}>
                            {() => (
                                <WorldRoll
                                    view={r.view}
                                    sheet={(s) => r.sheets(s.lesson)}
                                    wheel={false}
                                    class="site-roll-world"
                                    title="A day in a sample child's world"
                                />
                            )}
                        </For>
                    )}
                </Show>
            </div>
            <figcaption>{props.caption}</figcaption>
        </figure>
    );
}

/**
 * The sample child's map at the stop the reader has scrolled to: the same map the children's view
 * draws, with the visitor's limits, which let them look everywhere and go nowhere yet. A thin band
 * across the middle of what the reader can see, below the map when the map is on top, picks the stop.
 */
function JourneyMap(props: {
    stops: HTMLElement[];
    at: number;
    chose: (stop: number) => void;
}): JSX.Element {
    const [host, setHost] = createSignal<HTMLDivElement>();
    const [near, setNear] = createSignal(false);
    const wide = matches("(min-width: 1081px)");
    const [stops] = createResource(
        () => ({ near: near(), quiet: !wide() }),
        async ({ near, quiet }) => (near ? (await pictures()).stops(quiet) : undefined),
    );
    onMount(() => {
        const el = host();
        if (!el) return;
        onCleanup(whileNear(el, setNear));
    });
    onMount(() => {
        let watching: IntersectionObserver | null = null;
        const watch = (): void => {
            watching?.disconnect();
            watching = new IntersectionObserver(
                (seen) => {
                    for (const e of seen) {
                        const i = props.stops.findIndex((stop) => stop === e.target);
                        if (e.isIntersecting && i >= 0) props.chose(i);
                    }
                },
                { rootMargin: wide() ? "-46% 0px -46% 0px" : "-66% 0px -30% 0px" },
            );
            for (const stop of props.stops) watching.observe(stop);
        };
        watch();
        const list = matchMedia("(min-width: 1081px)");
        list.addEventListener("change", watch);
        onCleanup(() => {
            watching?.disconnect();
            list.removeEventListener("change", watch);
        });
    });
    const stop = (): { view: MapView; at: number | "all" } | undefined => stops()?.[props.at];
    return (
        <div ref={setHost} class="site-window paper">
            <Show when={near() && stop()}>
                {(st) => (
                    <Show
                        when={!wide()}
                        fallback={
                            <Overworld
                                view={st().view}
                                focus={st().at}
                                hud={false}
                                class="site-journey-world"
                                title="A sample child's map"
                            />
                        }
                    >
                        <Show when={st()} keyed>
                            {(current) => (
                                <Overworld
                                    view={current.view}
                                    focus={current.at}
                                    still
                                    hud={false}
                                    class="site-journey-world"
                                    title="A sample child's map"
                                />
                            )}
                        </Show>
                    </Show>
                )}
            </Show>
        </div>
    );
}

/**
 * One place of the sample child's map alone, still, framed on its picture with room above it for
 * the stamp that overlaps its corner (sample.ts `pictureCamera`): a card's world on a grown-up's map,
 * so a world the child has not reached is still drawn, or the journal's on the child's own. Drawn
 * once its box comes near; the card's heading names the world, so the map's names are not drawn
 * (site.css).
 */
function MapPicture(props: {
    class: string;
    of: { is: "card"; at: number } | { is: "journal" };
    title: string;
}): JSX.Element {
    const [host, setHost] = createSignal<HTMLDivElement>();
    const [near, setNear] = createSignal(false);
    const [drawn] = createResource(near, async (on) => {
        if (!on) return undefined;
        const m = await pictures();
        const p = await m.pictures();
        const world = props.of.is === "card" ? p.cards[props.of.at] : p.journal;
        return world === undefined
            ? undefined
            : { view: props.of.is === "card" ? p.grown : p.own, world, camera: m.pictureCamera };
    });
    onMount(() => {
        const el = host();
        if (el) onCleanup(whileNear(el, setNear));
    });
    const vp = (): Size => ({ w: host()?.clientWidth || 1, h: host()?.clientHeight || 1 });
    return (
        <div ref={setHost} class={`${props.class} paper`} aria-hidden="true" inert>
            <Show when={near() && drawn()}>
                {(d) => (
                    <Overworld
                        view={d().view}
                        aim={{ place: d().world, across: 0 }}
                        aimCamera={(aimed) => d().camera(aimed, vp())}
                        hud={false}
                        class="site-pic-map"
                        title={props.title}
                    />
                )}
            </Show>
        </div>
    );
}

function Journey(props: { sample: Sample | undefined }): JSX.Element {
    const [at, setAt] = createSignal(0);
    return (
        <section class="site-sec field" id="map">
            <div class="site-wrap">
                <Head
                    num="02"
                    kicker="The map"
                    title="A new world each term"
                    lead="Your child walks from one world to the next. Nothing on the way is locked."
                />
                <Show when={props.sample}>
                    {(s) => {
                        const stops: HTMLElement[] = [];
                        return (
                            <div class="site-journey">
                                <div class="site-steps">
                                    <For each={s().steps}>
                                        {(step, i) => (
                                            <article
                                                ref={(el) => {
                                                    stops[i()] = el;
                                                }}
                                                class="site-step"
                                                classList={{ on: at() === i() }}
                                            >
                                                <p class="kicker">{step.kicker}</p>
                                                <h3>{step.title}</h3>
                                                <For each={step.lines}>
                                                    {(line) => <p>{line}</p>}
                                                </For>
                                                <Show when={step.note}>
                                                    <p class="note">{step.note}</p>
                                                </Show>
                                            </article>
                                        )}
                                    </For>
                                </div>
                                <div class="site-journey-map">
                                    <JourneyMap stops={stops} at={at()} chose={setAt} />
                                </div>
                            </div>
                        );
                    }}
                </Show>
            </div>
        </section>
    );
}

function Parents(props: { sample: Sample | undefined }): JSX.Element {
    return (
        <section class="site-sec" id="you">
            <div class="site-wrap">
                <Head
                    num="03"
                    kicker="For parents"
                    title="Every mark comes from a finished lesson"
                    lead="You see the same map, with the lesson and the day behind each stamp."
                />
                <div class="site-cards">
                    <For each={props.sample?.cards ?? []}>
                        {(card, i) => (
                            <article
                                class={`site-card ${card.tone}`}
                                style={{ "--accent": `var(--${card.accent})` }}
                            >
                                <MapPicture
                                    class="site-pic"
                                    of={{ is: "card", at: i() }}
                                    title={`${card.title} on the sample child's map`}
                                />
                                <p class="kicker">{card.kicker}</p>
                                <h3>{card.title}</h3>
                                <p class="state">{card.state}</p>
                                <ul class="site-notes">
                                    <For each={card.notes}>{(note) => <li>{note}</li>}</For>
                                </ul>
                            </article>
                        )}
                    </For>
                </div>
                <ul class="site-never" aria-label="What the map never does">
                    <li>No streaks</li>
                    <li>No timers</li>
                    <li>Nothing to buy</li>
                    <li>Nothing taken away</li>
                    <li>No locked lessons</li>
                </ul>
                <p class="note site-change">
                    You choose each term's world, its guide and its weather. The lessons and the
                    paper stay the same.
                </p>
            </div>
        </section>
    );
}

function Subjects(props: { sample: Sample | undefined }): JSX.Element {
    const subjects = () => props.sample?.subjects;
    return (
        <section class="site-sec field" id="subjects">
            <div class="site-wrap">
                <Head
                    num="04"
                    kicker="Subjects"
                    title={subjects()?.head ?? "Many subjects, in the same worlds"}
                    lead={subjects()?.lead}
                />
                <div class="site-subjects">
                    <For each={subjects()?.tiles ?? []}>
                        {(tile, i) => (
                            <article class="site-subject">
                                <Near class="art" draw={picture({ is: "subject", at: i() })} />
                                <div class="row">
                                    <h3>{tile.name}</h3>
                                    <span class="count">{tile.count}</span>
                                </div>
                                <p class="note">{tile.note}</p>
                            </article>
                        )}
                    </For>
                </div>
                <Show when={subjects()?.rest}>
                    <p class="note site-rest">{subjects()?.rest}</p>
                </Show>
            </div>
        </section>
    );
}

function Start(props: { sample: Sample | undefined }): JSX.Element {
    return (
        <section class="site-sec" id="start">
            <div class="site-wrap">
                <Head num="05" kicker="Start" title="Read a lesson" />
                <Show when={props.sample}>
                    {(s) => (
                        <div class="site-lessons">
                            <For each={s().lessons}>
                                {(lesson, i) => (
                                    <article class="site-lesson">
                                        <Near
                                            class="site-mount paper"
                                            draw={picture({ is: "lesson", at: i() })}
                                        />
                                        <p class="kicker">{lesson.tag}</p>
                                        <h3>{lesson.title}</h3>
                                    </article>
                                )}
                            </For>
                            <article class="site-lesson">
                                <MapPicture
                                    class="site-pic"
                                    of={{ is: "journal" }}
                                    title="The sample child's journal"
                                />
                                <p class="kicker">The journal</p>
                                <h3>{s().journal}</h3>
                            </article>
                        </div>
                    )}
                </Show>
            </div>
        </section>
    );
}

export function Page(): JSX.Element {
    onMount(() => {
        let closed = false;
        onCleanup(() => {
            closed = true;
        });
        void siteData()
            .then((m) => m.afterOpening())
            .then(idle)
            .then(() => {
                if (!closed)
                    void import("./ground").then((m) => m.warmLook()).catch(() => undefined);
            })
            .catch(() => undefined);
    });
    const [sample] = createResource(async () => (await (await siteData()).siteData()).words);
    const words = (): Sample | undefined => (sample.state === "ready" ? sample() : undefined);
    return (
        <>
            <a class="site-skip" href="#main">
                Skip to the main content
            </a>
            <Bar />
            <main id="main">
                <Opening sample={words()} />
                <Facts sample={words()} />
                <Day sample={words()} />
                <Journey sample={words()} />
                <Parents sample={words()} />
                <Subjects sample={words()} />
                <Start sample={words()} />
            </main>
            <footer class="site-wrap site-foot">
                <Mark href="/home" />
                <p class="note">
                    lumischool.ai · lessons for families teaching at home. In development.
                </p>
            </footer>
            <Show when={looking() !== null}>
                <Overlay
                    at={looking()}
                    kicker="A sample child's map"
                    source={() => import("./ground").then((m) => m.look())}
                    go={look}
                />
            </Show>
        </>
    );
}
