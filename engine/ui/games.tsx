import { Chips } from "./chips";
import { Icon } from "./icon";
import { Postcard } from "./postcard";
import { isChord, toolsFrom, TOOLS, type Tool } from "./game-tools";
import {
    createEffect,
    createSignal,
    For,
    onCleanup,
    onMount,
    Show,
    untrack,
    type JSX,
} from "solid-js";
import { GAMES, gameById } from "../../school/games/catalogue";
import { isGameChallenge, type GameAttempt, type GameChallenge } from "../answer";
import {
    challengeFor,
    nextChallenge,
    openChallenge,
    supportsVariations,
} from "../../school/games/challenges";
import type { Game } from "../../school/games/game";
import type { Drawing } from "../parts/drawing";
import type { Cue } from "../motion/cues";
import type { Hum } from "../sound/kit";
import { gameSound } from "./game-sound";
import { loadDrawings } from "./drawings";
import { render } from "./svg";
import { play } from "./game-play";
import { GameView } from "./game-view";
import { INK, SceneView } from "./scene-view";
import { StillView } from "./still-view";
import type { Board, Runtime, Shell } from "./game-host";
import "./games.css";

interface ViewOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    still: () => boolean;
}

/**
 * The GPU's view, or null where the browser has no WebGL2. The hidden copy of every sprite's box is
 * kept with `probe=1`, and always for a browser driven by tests.
 */
function gpuView(o: ViewOptions & { inkAt?: number }): GameView | null {
    try {
        return new GameView({
            ...o,
            probe: new URLSearchParams(location.search).get("probe") === "1" || navigator.webdriver,
        });
    } catch {
        return null;
    }
}

/** A turn game's board: the scene drawn by the GPU, or a still picture of it without WebGL2. */
function boardFor(o: ViewOptions & { onFrame: (t: number) => void }): Board & { stop?(): void } {
    const view = gpuView({ ...o, inkAt: INK });
    return view
        ? new SceneView({ ...o, view })
        : new SceneView({ ...o, still: () => true, view: new StillView(o) });
}

type GameKind = "all" | "move" | "think";
const KINDS: readonly { value: GameKind; label: string }[] = [
    { value: "all", label: "Every game" },
    { value: "move", label: "Move and explore" },
    { value: "think", label: "Think and tinker" },
];
const GRADES: readonly { value: number | null; label: string }[] = [
    { value: null, label: "Any" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
];
const kindOf = (g: Game): GameKind => (g.group === "action" ? "move" : "think");

function Cover(props: { game: Game }): JSX.Element {
    let host: HTMLSpanElement | undefined;
    onMount(() => {
        let stopped = false;
        onCleanup(() => {
            stopped = true;
        });
        void loadDrawings([props.game.cover.art]).then((shelf) => {
            const drawing = shelf.drawing(props.game.cover.art);
            if (stopped || !drawing || !host) return;
            const defaults = typeof drawing.params === "object" ? drawing.params : {};
            const image = render(
                drawing,
                { ...defaults, ...props.game.cover.params },
                { seed: 2711 },
            );
            host.replaceChildren(image.svg);
        });
    });
    return (
        <span
            class="game-cover"
            ref={(el) => {
                host = el;
            }}
            aria-hidden="true"
        />
    );
}

export function Games(props: {
    onPlaying?: (playing: boolean) => void;
    storageKey?: string;
    onAttempt?: (attempt: GameAttempt) => void;
}): JSX.Element {
    const params = new URLSearchParams(location.search);
    const [chosen, choose] = createSignal<Game | undefined>(gameById(params.get("g")));
    const saved = new Map<string, GameChallenge>();
    const storage = (): string => props.storageKey ?? "games.practice";
    const stored = (game: Game): GameChallenge | undefined => {
        const cached = saved.get(game.id);
        if (cached) return cached;
        try {
            const value: unknown = JSON.parse(
                localStorage.getItem(`${storage()}.${game.id}`) ??
                    localStorage.getItem(storage()) ??
                    "null",
            );
            if (isGameChallenge(value) && value.game === game.id) {
                openChallenge(game, value);
                saved.set(game.id, value);
                return value;
            }
        } catch {
            /* An old configuration is replaced by its authored phase. */
        }
        return undefined;
    };
    const phaseFor = (game: Game | undefined, explicit?: number | null): number => {
        if (!game) return 0;
        const phase = explicit ?? stored(game)?.phase ?? 0;
        return Math.min(game.levels.length - 1, Math.max(0, Math.floor(phase)) || 0);
    };
    const [level, setLevel] = createSignal(
        phaseFor(chosen(), params.has("v") ? Number(params.get("v")) : undefined),
    );
    const seed = (): number => crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
    const remembered = (game: Game, phase: number): GameChallenge => {
        const value = stored(game);
        return value?.phase === phase ? value : challengeFor(game, phase, seed());
    };
    const initial = chosen();
    const [challenge, setChallenge] = createSignal<GameChallenge | undefined>(
        initial ? remembered(initial, level()) : undefined,
    );
    const [completed, setCompleted] = createSignal(false);
    const [feedback, setFeedback] = createSignal({ text: "", won: false });
    const [activeTitle, setActiveTitle] = createSignal("");
    const recent: string[] = [];
    let retries = 0;
    const [run, setRun] = createSignal(0);
    const another = (): void => {
        const game = chosen();
        if (!game) return;
        const previous = challenge();
        if (previous) recent.push(previous.id);
        if (recent.length > 12) recent.shift();
        setChallenge(nextChallenge(game, level(), seed(), recent));
        retries = 0;
        setRun(run() + 1);
        begin(false);
        pause(false);
    };
    const [paused, pause] = createSignal(false);
    const [begun, begin] = createSignal(false);
    const [drawn, setDrawn] = createSignal(true);
    let menu: HTMLDialogElement | undefined;
    const [sound, setSound] = createSignal(false);
    const [quiet, setQuiet] = createSignal(false);
    const [text, setText] = createSignal(false);
    const [failure, fail] = createSignal("");
    let room: HTMLElement | undefined;
    let libraryScroll = 0;
    let lastGame = "";
    let host: HTMLDivElement | undefined;
    let runtime: Runtime | undefined;
    let audio: AudioContext | undefined;
    const player = gameSound(() => audio);
    const hear = (cue: Cue, how?: { strength?: number; pitch?: number; pan?: number }): void => {
        if (!sound() || !audio || paused()) return;
        player.hear(chosen()?.sounds, cue, how);
    };
    const hum = (hums: readonly Hum[]): void => {
        if (sound() && audio && !paused()) player.hum(hums);
        else player.hush();
    };
    const select = (g: Game | undefined, selected?: number): void => {
        const v = phaseFor(g, selected);
        const previous = chosen();
        if (!previous && g) libraryScroll = scrollY;
        if (previous) lastGame = previous.id;
        choose(g);
        setLevel(v);
        retries = 0;
        setChallenge(g ? remembered(g, v) : undefined);
        pause(false);
        begin(false);
        fail("");
        const url = new URL(location.href);
        url.search = g ? new URLSearchParams({ g: g.id, v: String(v) }).toString() : "";
        if (previous?.id === g?.id) history.replaceState(null, "", url);
        else history.pushState(null, "", url);
        if (!g)
            queueMicrotask(() => {
                room?.querySelector<HTMLElement>(`[data-game-id="${lastGame}"]`)?.focus({
                    preventScroll: true,
                });
                scrollTo(0, libraryScroll);
            });
    };
    createEffect(() => props.onPlaying?.(Boolean(chosen())));
    createEffect(() => {
        const c = challenge();
        if (c) {
            saved.set(c.game, c);
            try {
                localStorage.setItem(`${storage()}.${c.game}`, JSON.stringify(c));
            } catch {
                /* Remember for this visit when device storage is unavailable. */
            }
        }
    });
    createEffect(() => {
        if (paused() && chosen()) menu?.showModal();
        else menu?.close();
    });
    const focusArena = (): void => {
        (
            host?.querySelector<HTMLElement>(".scene:not([hidden])") ??
            host?.querySelector<HTMLElement>(".board")
        )?.focus({ preventScroll: true });
    };
    const resume = (): void => {
        pause(false);
        focusArena();
    };
    onCleanup(() => {
        props.onPlaying?.(false);
        if (audio) void audio.close();
    });
    onMount(() => {
        // the developer's tools load only when asked for, so the page a family opens does not carry them
        let toolsOff: (() => void) | null = null;
        let loading = false;
        // the page can be replaced while the tools load, as when the sign-in check answers
        let gone = false;
        const openTools = (which: readonly Tool[]): void => {
            if (toolsOff || loading) return;
            loading = true;
            void import("./game-tools-panel").then((m) => {
                loading = false;
                if (!toolsOff && !gone)
                    toolsOff = m.mountTools(document.body, {
                        probe: () => runtime?.probe?.() ?? null,
                        open: which,
                    });
            });
        };
        const asked = toolsFrom(location.search);
        if (asked.length) openTools(asked);
        const chord = (e: KeyboardEvent): void => {
            if (!isChord(e)) return;
            e.preventDefault();
            if (toolsOff) {
                toolsOff();
                toolsOff = null;
            } else openTools(TOOLS.map((t) => t.id));
        };
        window.addEventListener("keydown", chord);
        onCleanup(() => {
            gone = true;
            window.removeEventListener("keydown", chord);
            toolsOff?.();
        });
        const fitPage = (): void => {
            if (room)
                room.style.setProperty(
                    "--game-page-top",
                    `${Math.max(0, room.getBoundingClientRect().top + scrollY)}px`,
                );
        };
        const layout = new ResizeObserver(fitPage);
        if (room) layout.observe(room);
        const bar = room?.closest(".page")?.querySelector(".page-top");
        if (bar) layout.observe(bar);
        onCleanup(() => layout.disconnect());
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        setQuiet(media.matches);
        const motion = () => setQuiet(media.matches);
        const blur = () => {
            runtime?.release?.();
            if (begun() && chosen()) pause(true);
        };
        const back = () => {
            const query = new URLSearchParams(location.search);
            const game = gameById(query.get("g"));
            choose(game);
            const phase = phaseFor(game, query.has("v") ? Number(query.get("v")) : undefined);
            setLevel(phase);
            setChallenge(game ? remembered(game, phase) : undefined);
            pause(false);
            begin(false);
        };
        window.addEventListener("popstate", back);
        const visibility = () => {
            if (document.hidden) blur();
        };
        media.addEventListener("change", motion);
        window.addEventListener("blur", blur);
        document.addEventListener("visibilitychange", visibility);
        onCleanup(() => {
            window.removeEventListener("popstate", back);
            media.removeEventListener("change", motion);
            window.removeEventListener("blur", blur);
            document.removeEventListener("visibilitychange", visibility);
        });
    });
    createEffect(() => {
        paused();
        runtime?.release?.();
    });
    createEffect(() => {
        quiet();
        runtime?.redraw();
    });
    createEffect(() => {
        const game = chosen(),
            version = level();
        run();
        const selectedChallenge = challenge();
        if (!game || !host || !selectedChallenge) return;
        const root = host;
        return untrack(() => {
            let ended = false;
            begin(false);
            setCompleted(false);
            setFeedback({ text: "", won: false });
            const opened = openChallenge(game, selectedChallenge);
            setActiveTitle(opened.levels[version]?.title ?? "");
            const attempt: GameAttempt = {
                id: crypto.randomUUID(),
                challenge: selectedChallenge,
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                outcome: "interrupted",
                moves: 0,
                assistance: 0,
                retries,
                activeMs: 0,
                input: "unknown",
                reducedMotion: quiet(),
                objectives: { completed: 0, total: 1 },
            };
            let emitted = false;
            let played = false;
            let lastTime = performance.now();
            const account = (): void => {
                const now = performance.now();
                if (!paused() && begun() && !emitted) {
                    played = true;
                    attempt.activeMs += Math.min(1000, Math.max(0, now - lastTime));
                }
                lastTime = now;
            };
            const finish = (won: boolean): void => {
                account();
                if (emitted || (!played && !won)) return;
                emitted = true;
                attempt.completedAt = new Date().toISOString();
                attempt.activeMs = Math.round(attempt.activeMs);
                attempt.outcome = won ? "completed" : "interrupted";
                if (won) attempt.objectives.completed = attempt.objectives.total;
                props.onAttempt?.(attempt);
            };
            const accounting = setInterval(account, 200);
            const leaving = (): void => finish(false);
            window.addEventListener("pagehide", leaving);
            onCleanup(() => {
                clearInterval(accounting);
                window.removeEventListener("pagehide", leaving);
                finish(false);
            });
            const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
                const element = root.querySelector<T>(`[data-game="${id}"]`);
                if (!element) throw new Error(`Missing game control: ${id}`);
                return element;
            };
            class Art extends Map<string, Drawing<unknown>> {
                pending = new Set<string>();
                /** The loads not yet waited on, so the player can say it is ready only once its drawings are in. */
                loads: Promise<unknown>[] = [];
                override get(ref: string): Drawing<unknown> | undefined {
                    const found = super.get(ref);
                    if (!found && !this.pending.has(ref)) {
                        this.pending.add(ref);
                        const load = loadDrawings([ref])
                            .then((shelf) => {
                                if (ended) return;
                                const drawing = shelf.drawing(ref);
                                if (drawing) {
                                    this.set(ref, drawing);
                                    tabletop?.loaded(ref);
                                    runtime?.redraw();
                                }
                            })
                            .catch(() => {
                                if (!ended)
                                    fail("A drawing could not load. Please try Start again.");
                            });
                        this.loads.push(load);
                    }
                    return found;
                }
            }
            const art = new Art();
            const board = $("board");
            board.replaceChildren();
            const field =
                opened.group === "action" ? gpuView({ host: board, art, still: quiet }) : null;
            if (opened.group === "action" && !field)
                fail("This game needs a newer browser, one that can draw with WebGL2.");
            const tabletop =
                opened.group === "action"
                    ? null
                    : boardFor({
                          host: board,
                          art,
                          still: quiet,
                          onFrame: (t) => runtime?.frame?.(t),
                      });
            if (field) field.el.hidden = true;
            if (tabletop) tabletop.sheet.hidden = true;
            const shell: Shell = {
                $,
                art,
                feedback: (text, won = false) => {
                    setFeedback((previous) =>
                        previous.text === text && previous.won === won ? previous : { text, won },
                    );
                },
                progress: (completed, total) => {
                    if (!emitted) attempt.objectives = { completed, total };
                },
                observe: (kind, input) => {
                    if (emitted) return;
                    if (kind === "won") {
                        setCompleted(true);
                        finish(true);
                    } else if (kind === "assist") attempt.assistance++;
                    else {
                        begin(true);
                        played = true;
                        attempt.moves++;
                        if (input)
                            attempt.input =
                                attempt.input === "unknown" || attempt.input === input
                                    ? input
                                    : "mixed";
                    }
                },
                still: quiet,
                paused,
                hear,
                hum,
                guide: () => {},
                rows: () => {},
                tuning: () => {},
                keys: (words) => {
                    $("keys").textContent = words;
                },
                room: () => ({
                    w: Math.max(240, board.clientWidth),
                    h: Math.max(180, board.clientHeight),
                    side: false,
                }),
            };
            try {
                const v = Math.min(version, game.levels.length - 1);
                if (opened.group === "action") {
                    if (field) runtime = play(shell, { game: opened, field }, v);
                } else if (tabletop) runtime = play(shell, { game: opened, board: tabletop }, v);
            } catch (error) {
                fail(error instanceof Error ? error.message : "The game could not open.");
            }
            // the player is ready once the level's drawings have loaded and the GPU's view has them in
            // its pages, so the first thing a child sees is the whole scene; a slow network waits no
            // more than a few seconds
            setDrawn(false);
            const settle = async (): Promise<void> => {
                for (let round = 0; round < 4; round++) {
                    await Promise.all(art.loads.splice(0));
                    runtime?.redraw();
                    await (field ?? tabletop)?.ready?.();
                    if (!art.loads.length) return;
                }
            };
            void Promise.race([settle(), new Promise<void>((done) => setTimeout(done, 4000))]).then(
                () => {
                    if (!ended) setDrawn(true);
                },
            );
            queueMicrotask(() => {
                if (!ended && !paused()) focusArena();
            });
            const keys = (e: KeyboardEvent) => {
                if (e.key === "Escape" && e.type === "keydown" && !paused()) {
                    e.preventDefault();
                    pause(true);
                    return;
                }
                if (
                    paused() ||
                    e.target instanceof HTMLSelectElement ||
                    e.target instanceof HTMLInputElement
                )
                    return;
                // The card's opening Enter event belongs to the library, not the new arena.
                if (
                    e.target instanceof Node &&
                    !root.contains(e.target) &&
                    e.target !== document.body
                )
                    return;
                if (
                    !root.contains(document.activeElement) &&
                    document.activeElement !== document.body
                )
                    return;
                runtime?.key(e);
            };
            window.addEventListener("keydown", keys);
            window.addEventListener("keyup", keys);
            const resize = new ResizeObserver(() => {
                runtime?.resize();
                const surface = board.querySelector<HTMLElement>(".field:not([hidden])");
                if (surface)
                    root.style.setProperty(
                        "--game-view-width",
                        surface.getBoundingClientRect().width + "px",
                    );
            });
            resize.observe(board);
            onCleanup(() => {
                ended = true;
                runtime?.stop();
                runtime = undefined;
                if (tabletop?.stop) tabletop.stop();
                else tabletop?.clear();
                field?.stop();
                resize.disconnect();
                window.removeEventListener("keydown", keys);
                window.removeEventListener("keyup", keys);
            });
        });
    });
    const [kind, setKind] = createSignal<GameKind>("all");
    const [grade, setGrade] = createSignal<number | null>(null);
    const [query, setQuery] = createSignal("");
    const shown = (): Game[] => {
        const words = query().trim().toLowerCase();
        const k = kind();
        const n = grade();
        return GAMES.filter(
            (g) =>
                g.listed !== false &&
                (k === "all" || kindOf(g) === k) &&
                (n === null || g.levels.some((l) => l.grades[0] <= n && n <= l.grades[1])) &&
                (words === "" || g.title.toLowerCase().includes(words)),
        );
    };
    return (
        <section
            ref={(el) => {
                room = el;
            }}
            class="game-room"
            classList={{ playing: Boolean(chosen()) }}
            aria-label="Games"
        >
            <Show
                when={chosen()}
                fallback={
                    <>
                        <div class="game-heading">
                            <Postcard
                                note
                                taped
                                focus={false}
                                kicker="A little room to play"
                                title="Games"
                                lead="Explore, experiment, and try another way. Pick something to play."
                            >
                                <div class="game-filters">
                                    <Chips
                                        legend="Kind"
                                        name="game-kind"
                                        options={KINDS}
                                        value={kind()}
                                        onChange={setKind}
                                    />
                                    <Chips
                                        legend="Grade"
                                        name="game-grade"
                                        options={GRADES}
                                        value={grade()}
                                        onChange={setGrade}
                                    />
                                    <label class="game-search">
                                        <span class="game-search-label">Find</span>
                                        <input
                                            type="search"
                                            placeholder="golf, river"
                                            autocomplete="off"
                                            value={query()}
                                            onInput={(e) => setQuery(e.currentTarget.value)}
                                        />
                                    </label>
                                </div>
                            </Postcard>
                        </div>
                        <Show when={shown().length === 0}>
                            <p class="game-none">
                                No game matches these. Try another grade or kind.
                            </p>
                        </Show>
                        <div class="game-library">
                            <For each={shown()}>
                                {(g) => (
                                    <button
                                        class="game-card"
                                        data-game-id={g.id}
                                        onClick={() => select(g)}
                                    >
                                        <span class="postcard-tape" aria-hidden="true" />
                                        <Cover game={g} />
                                        <strong>{g.title}</strong>
                                        <span>
                                            {g.levels.length} levels ·{" "}
                                            {kindOf(g) === "move"
                                                ? "Move and explore"
                                                : "Think and tinker"}
                                        </span>
                                    </button>
                                )}
                            </For>
                        </div>
                    </>
                }
            >
                {(g) => (
                    <div
                        class="game-player"
                        data-challenge={challenge()?.id}
                        data-challenge-source={challenge()?.source}
                        data-game-ready={!begun() && drawn()}
                        classList={{ tabletop: g().group !== "action" }}
                        ref={(el) => {
                            host = el;
                        }}
                    >
                        <header class="game-toolbar">
                            <button
                                class="game-icon"
                                aria-label="All games"
                                title="All games"
                                onClick={() => select(undefined)}
                            >
                                <Icon name="back" />
                            </button>
                            <h1>{g().title}</h1>
                            <div class="game-feedback-slot">
                                <Show when={feedback().text && !feedback().won}>
                                    <div class="game-feedback" title={feedback().text}>
                                        <Cover game={g()} />
                                        <span data-game="aside">{feedback().text}</span>
                                    </div>
                                </Show>
                                <Show when={feedback().won}>
                                    <div class="game-feedback game-finished">
                                        <Cover game={g()} />
                                        <span data-game="aside">{feedback().text}</span>
                                    </div>
                                </Show>
                                <button data-game="another" hidden onClick={another}>
                                    {supportsVariations(g()) ? "Play another" : "Play again"}
                                </button>
                                <button data-game="watch" hidden onClick={() => runtime?.watch?.()}>
                                    Watch it again
                                </button>
                                <Show when={completed()}>
                                    <button
                                        onClick={() => {
                                            retries++;
                                            setRun(run() + 1);
                                        }}
                                    >
                                        Try again
                                    </button>
                                </Show>
                            </div>
                            <span class="game-challenge">{activeTitle()}</span>
                            <button
                                class="game-icon"
                                aria-label="Pause &amp; help"
                                title="Pause &amp; help"
                                onClick={() => pause(true)}
                            >
                                <Icon name="pause" />
                            </button>
                        </header>
                        <output class="game-feedback-live">{feedback().text}</output>
                        <Show when={failure()}>
                            <p role="alert">{failure()}</p>
                        </Show>
                        <div class="game-stage-wrap">
                            <div class="arena" inert={paused()}>
                                <div
                                    data-game="board"
                                    class="board"
                                    role="application"
                                    tabIndex={-1}
                                    aria-label={`${g().title} play area`}
                                />
                            </div>
                        </div>
                        <div class="hands" inert={paused()}>
                            <div data-game="tray" class="tray" />
                            <div data-game="pad" class="pad" />
                            <div class="game-actions">
                                <button
                                    class="game-icon"
                                    data-game="undo"
                                    aria-label="Undo last move"
                                    title="Undo last move"
                                    onClick={() => runtime?.undo?.()}
                                >
                                    <Icon name="undo" />
                                </button>
                                <button
                                    class="game-icon"
                                    data-game="checkpoint"
                                    hidden
                                    aria-label="Back to the checkpoint"
                                    title="Back to the checkpoint"
                                    onClick={() => runtime?.toCheckpoint?.()}
                                >
                                    <Icon name="restart" />
                                </button>
                            </div>
                        </div>
                        <dialog
                            class="game-menu"
                            aria-label={`${g().title}: play and settings`}
                            ref={(el) => {
                                menu = el;
                                // The native backdrop targets the dialog, outside its content box.
                                const dismiss = (e: PointerEvent) => {
                                    if (e.target !== el || e.button !== 0) return;
                                    const box = el.getBoundingClientRect();
                                    if (
                                        e.clientX < box.left ||
                                        e.clientX > box.right ||
                                        e.clientY < box.top ||
                                        e.clientY > box.bottom
                                    )
                                        resume();
                                };
                                el.addEventListener("pointerdown", dismiss);
                                onCleanup(() => el.removeEventListener("pointerdown", dismiss));
                                if (paused())
                                    queueMicrotask(() => {
                                        if (el.isConnected && !el.open) el.showModal();
                                    });
                            }}
                            onCancel={(e) => {
                                e.preventDefault();
                                resume();
                            }}
                        >
                            <header class="game-menu-heading">
                                <div class="game-stamp">
                                    <Cover game={g()} />
                                </div>
                                <div>
                                    <p class="game-kicker">
                                        {begun() ? "A little breather" : "A little room to play"}
                                    </p>
                                    <h2>{g().title}</h2>
                                </div>
                            </header>
                            <details class="game-help game-challenges">
                                <summary>Choose a challenge</summary>
                                <fieldset
                                    class="game-challenge-cards"
                                    aria-label="Choose a challenge"
                                >
                                    <For each={g().levels}>
                                        {(l, i) => (
                                            <button
                                                class="game-challenge-card"
                                                data-game-phase={i()}
                                                aria-pressed={level() === i()}
                                                onClick={() => select(g(), i())}
                                            >
                                                {l.title}
                                            </button>
                                        )}
                                    </For>
                                </fieldset>
                            </details>
                            <Show when={supportsVariations(g())}>
                                <button class="game-new-layout" onClick={another}>
                                    New arrangement
                                </button>
                            </Show>
                            <details class="game-help">
                                <summary>How to play</summary>
                                <p data-game="goal" class="game-goal" />
                                <p data-game="keys" class="game-keys" />
                            </details>
                            <details class="game-help">
                                <summary>Sound &amp; accessibility</summary>
                                <div class="game-options">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={sound()}
                                            onChange={(e) => {
                                                audio ??= new AudioContext();
                                                void audio.resume();
                                                setSound(e.currentTarget.checked);
                                                if (!e.currentTarget.checked) player.hush();
                                            }}
                                        />
                                        Sound
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={quiet()}
                                            onChange={(e) => setQuiet(e.currentTarget.checked)}
                                        />
                                        Reduced motion
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={text()}
                                            onChange={(e) => setText(e.currentTarget.checked)}
                                        />
                                        Describe the scene
                                    </label>
                                </div>
                            </details>
                            <div class="game-actions game-menu-actions">
                                <button
                                    class="game-primary"
                                    aria-label="Continue playing"
                                    onClick={resume}
                                >
                                    <Icon name="play" /> Continue
                                </button>
                                <button
                                    class="game-icon"
                                    aria-label="Start again"
                                    title="Start again"
                                    data-game="again"
                                    onClick={() => {
                                        retries++;
                                        setRun(run() + 1);
                                        resume();
                                    }}
                                >
                                    <Icon name="restart" />
                                </button>
                            </div>
                        </dialog>
                        <p data-game="reads" hidden={!text()} aria-live="polite" />
                        <div hidden>
                            <input data-game="spoken" type="checkbox" checked={text()} />
                            <input data-game="panels" type="checkbox" />
                            <section data-game="panel-2" />
                        </div>
                    </div>
                )}
            </Show>
        </section>
    );
}
