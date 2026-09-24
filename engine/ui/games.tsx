import { Icon } from "./icon";
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
import { loadDrawings } from "./drawings";
import { render } from "./svg";
import { Field, Stage } from "./stage";
import { action } from "./game-action";
import { turn } from "./game-turn";
import type { Runtime, Shell } from "./game-host";
import "./games.css";

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
    const hear = (cue: Cue): void => {
        if (!sound() || !audio || paused()) return;
        const hz: Record<Cue, number> = {
            lift: 330,
            place: 440,
            back: 294,
            nope: 220,
            bump: 160,
            crash: 110,
            level: 660,
            ring: 880,
            splash: 260,
            win: 784,
        };
        const oscillator = audio.createOscillator(),
            gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = hz[cue];
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.16);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
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
            host?.querySelector<HTMLElement>(".sheet:not([hidden])") ??
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
                override get(ref: string): Drawing<unknown> | undefined {
                    const found = super.get(ref);
                    if (!found && !this.pending.has(ref)) {
                        this.pending.add(ref);
                        void loadDrawings([ref])
                            .then((shelf) => {
                                if (ended) return;
                                const drawing = shelf.drawing(ref);
                                if (drawing) {
                                    this.set(ref, drawing);
                                    stage.loaded(ref);
                                    runtime?.redraw();
                                }
                            })
                            .catch(() => {
                                if (!ended)
                                    fail("A drawing could not load. Please try Start again.");
                            });
                    }
                    return found;
                }
            }
            const art = new Art();
            const board = $("board");
            board.replaceChildren();
            const stage = new Stage({
                host: board,
                art,
                still: quiet,
                onFrame: (t) => runtime?.frame?.(t),
            });
            const field = new Field({ host: board, art, still: quiet });
            stage.sheet.hidden = true;
            field.el.hidden = true;
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
                runtime =
                    opened.group === "action"
                        ? action(shell, field, opened, v)
                        : turn(shell, stage, opened, v, []);
            } catch (error) {
                fail(error instanceof Error ? error.message : "The game could not open.");
            }
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
                const surface = board.querySelector<HTMLElement>(
                    ".field:not([hidden]), .sheet:not([hidden])",
                );
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
                stage.clear();
                field.clear();
                resize.disconnect();
                window.removeEventListener("keydown", keys);
                window.removeEventListener("keyup", keys);
            });
        });
    });
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
                        <header class="game-heading">
                            <p class="game-kicker">A little room to play</p>
                            <h1>Games</h1>
                            <p>Explore, experiment, and try another way. Pick something to play.</p>
                        </header>
                        <div class="game-library">
                            <For each={GAMES.filter((g) => g.listed !== false)}>
                                {(g) => (
                                    <button
                                        class="game-card"
                                        data-game-id={g.id}
                                        onClick={() => select(g)}
                                    >
                                        <Cover game={g} />
                                        <strong>{g.title}</strong>
                                        <span>
                                            {g.levels.length} levels ·{" "}
                                            {g.group === "action"
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
                        data-game-ready={!begun()}
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
                                <Show when={feedback().won}>
                                    <div class="game-feedback game-finished">
                                        <Cover game={g()} />
                                        <span data-game="aside">{feedback().text}</span>
                                    </div>
                                </Show>
                                <button data-game="another" hidden onClick={another}>
                                    {supportsVariations(g()) ? "Play another" : "Play again"}
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
