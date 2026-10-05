// One round of a game inside a lesson, in the box the lesson gives it: a still picture until it is
// played, then the same runtime the Games page plays, with a goal line and a restart over the field and
// the field itself as the control. See .docs/game-cards.md.
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { gameById } from "../../school/games/catalogue";
import { supportsVariations } from "../../school/games/challenges";
import type { RoundEnd } from "../../school/games/game";
import type { Hum } from "../sound/kit";
import type { Cue } from "../motion/cues";
import { gameSound } from "./game-sound";
import { play } from "./game-play";
import { boardFor, gpuView, ShelfArt } from "./game-surface";
import { StillView } from "./still-view";
import type { Runtime, Shell } from "./game-host";
import { Icon } from "./icon";
import { RoundEndCard } from "./round-end";
import { actionsOf, type EndAction } from "./round-end-rules";
import {
    claim,
    goalOf,
    next,
    release,
    resultOf,
    roundOf,
    showsButtons,
    type CardResult,
    type CardState,
    type Live,
} from "./game-card-rules";
import "./games.css";
import "./game-card.css";

export interface GameCardProps {
    /** The game's id, as `?g=` names it. */
    game: string;
    level: number;
    /** How many of the level's asks the round plays, for a game whose levels hold several. */
    asks?: number;
    /** A seed picks one generated variation; left out, the level plays as authored. */
    seed?: number;
    /** The lesson's own goal line, in place of the level's. */
    goal?: string;
    /** Sounds play only where the page has them on. */
    sound?: boolean;
    onResult?: (result: CardResult) => void;
}

export function GameCard(props: GameCardProps): JSX.Element {
    const found = gameById(props.game);
    if (!found) return <p class="gc-missing">This game is not on the shelf: {props.game}</p>;
    let round = roundOf(found, props.level, props.seed, props.asks);
    let game = round.game;
    let seed = props.seed ?? 1;
    const [challengeId, setChallengeId] = createSignal(round.challenge.id);
    const [end, setEnd] = createSignal<RoundEnd | null>(null);
    const [state, setState] = createSignal<CardState>("poster");
    const [ready, setReady] = createSignal(false);
    let root: HTMLElement | undefined;
    let board: HTMLDivElement | undefined;
    let runtime: Runtime | undefined;
    let ending: (() => void) | undefined;
    let tries = 0;
    let audio: AudioContext | undefined;
    const sound = gameSound(() => audio);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");

    // a round's account: reported once, when it is won or when it is left after a move
    let account = { activeMs: 0, assistance: 0, moved: false, reported: false };
    let since = 0;
    const tally = (): void => {
        const now = performance.now();
        if (state() === "live" && account.moved) account.activeMs += Math.min(1000, now - since);
        since = now;
    };
    const report = (won: boolean): void => {
        tally();
        if (account.reported || (!won && !account.moved)) return;
        account.reported = true;
        props.onResult?.(
            resultOf({
                challenge: round.challenge,
                won,
                tries,
                activeMs: account.activeMs,
                assistance: account.assistance,
            }),
        );
    };

    const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
        const element = root?.querySelector<T>(`[data-game="${id}"]`);
        if (!element) throw new Error(`Missing game control: ${id}`);
        return element;
    };

    /** Stops what is on the board, and mounts the round again: as a still picture, or played. */
    const mount = (live: boolean): void => {
        ending?.();
        if (!board) return;
        const host = board;
        let ended = false;
        host.replaceChildren();
        setEnd(null);
        const art = new ShelfArt({
            ended: () => ended,
            loaded: (ref) => {
                tabletop?.loaded(ref);
                runtime?.redraw();
            },
            failed: () => {},
        });
        const still = (): boolean => !live || motion.matches;
        const gl = game.group === "action" && live ? gpuView({ host, art, still }) : null;
        const picture = game.group === "action" && !live ? new StillView({ host, art }) : null;
        const field = gl ?? picture;
        const tabletop =
            game.group === "action"
                ? null
                : boardFor({
                      host,
                      art,
                      still,
                      gpu: live,
                      onFrame: (t) => runtime?.frame?.(t),
                  });
        const shell: Shell = {
            $,
            art,
            still,
            paused: () => !live,
            hear: (cue: Cue, how) => {
                if (props.sound && audio && live) sound.hear(game.sounds, cue, how);
            },
            hum: (hums: readonly Hum[]) => {
                if (props.sound && audio && live) sound.hum(hums);
                else sound.hush();
            },
            guide: () => {},
            keys: () => {},
            feedback: () => {},
            rows: () => {},
            tuning: () => {},
            card: { keep: game.card?.keep ?? 30 },
            ended: (e) => {
                if (!live || (e?.won === end()?.won && e?.words === end()?.words)) return;
                setEnd(e);
                if (e && !e.won) report(false);
            },
            // a card's box is its whole room, so a long lesson page never shrinks a turn game's board
            room: () => ({
                w: Math.max(160, host.clientWidth),
                h: Math.max(120, host.clientHeight),
                side: true,
            }),
            observe: (kind) => {
                if (!live) return;
                tally();
                if (kind === "won") {
                    if (state() === "live") setState(next(state(), "won"));
                    report(true);
                } else if (kind === "assist") account.assistance++;
                else account.moved = true;
            },
        };
        setReady(false);
        try {
            if (game.group === "action") {
                if (field) runtime = play(shell, { game, field }, round.level);
            } else if (tabletop) runtime = play(shell, { game, board: tabletop }, round.level);
        } catch {
            runtime = undefined;
        }
        const settle = async (): Promise<void> => {
            for (let i = 0; i < 4; i++) {
                await Promise.all(art.loads.splice(0));
                runtime?.redraw();
                if (!art.loads.length) return;
            }
        };
        void Promise.race([settle(), new Promise<void>((done) => setTimeout(done, 4000))]).then(
            () => {
                if (!ended) setReady(true);
            },
        );
        ending = () => {
            ended = true;
            runtime?.stop();
            runtime = undefined;
            if (tabletop?.stop) tabletop.stop();
            else tabletop?.clear();
            gl?.stop();
            picture?.clear();
            sound.hush();
        };
    };

    const card: Live = {
        still: () => {
            report(false);
            setState(next(state(), "still"));
            mount(false);
        },
    };

    const start = (event: "play" | "restart"): void => {
        if (state() === "live" || state() === "won") report(false);
        claim(card);
        tries++;
        account = { activeMs: 0, assistance: 0, moved: false, reported: false };
        since = performance.now();
        if (props.sound && !audio) audio = new AudioContext();
        setState(next(state(), event));
        mount(true);
        board?.focus({ preventScroll: true });
    };

    /** A different variation of the same level, played from the start. */
    const another = (): void => {
        const was = round.challenge.id;
        for (let i = 0; i < 24 && round.challenge.id === was; i++) {
            seed = (seed + 1 + Math.imul(i, 2654435761)) >>> 0;
            round = roundOf(found, props.level, seed, props.asks);
        }
        game = round.game;
        setChallengeId(round.challenge.id);
        start("restart");
    };
    const act = (a: EndAction): void => {
        if (a === "another") another();
        else start("restart");
    };

    onMount(() => {
        mount(false);
        const resize = new ResizeObserver(() => runtime?.resize());
        if (board) resize.observe(board);
        const keys = (e: KeyboardEvent): void => {
            // on the picture, Enter belongs to the Play button, and on a round's end to its card
            if (state() !== "poster" && !end()) runtime?.key(e);
        };
        root?.addEventListener("keydown", keys);
        root?.addEventListener("keyup", keys);
        const away = (): void => runtime?.release?.();
        window.addEventListener("blur", away);
        // a live field is a GPU canvas, which a printer may draw blank, so a page about to print gets the still picture
        const printing = (): void => {
            if (state() === "live" || state() === "won") card.still();
        };
        window.addEventListener("beforeprint", printing);
        const paper = matchMedia("print");
        const toPaper = (e: MediaQueryListEvent): void => {
            if (e.matches) printing();
        };
        paper.addEventListener("change", toPaper);
        onCleanup(() => {
            report(false);
            release(card);
            ending?.();
            resize.disconnect();
            root?.removeEventListener("keydown", keys);
            root?.removeEventListener("keyup", keys);
            window.removeEventListener("blur", away);
            window.removeEventListener("beforeprint", printing);
            paper.removeEventListener("change", toPaper);
            void audio?.close();
        });
    });

    return (
        <section
            ref={(el) => {
                root = el;
            }}
            class="game-room gc"
            classList={{ "gc-buttons": showsButtons(game) }}
            data-card-game={game.id}
            data-card-state={state()}
            data-card-ready={ready()}
            data-challenge={challengeId()}
            aria-label={`${game.title}: ${goalOf(game, round.level, props.goal)}`}
        >
            <header class="gc-top">
                <p class="gc-goal" data-game="goal">
                    {goalOf(game, round.level, props.goal)}
                </p>
                <button
                    class="game-icon"
                    type="button"
                    aria-label="Start again"
                    title="Start again"
                    data-card="restart"
                    onClick={() => start("restart")}
                >
                    <Icon name="restart" />
                </button>
            </header>
            <div class="gc-stage">
                <div
                    ref={(el) => {
                        board = el;
                    }}
                    data-game="board"
                    class="board gc-board"
                    role="application"
                    tabIndex={-1}
                    aria-label={`${game.title} play area`}
                />
                <Show when={state() === "poster"}>
                    <button
                        class="gc-play"
                        type="button"
                        aria-label={`Play ${game.title}`}
                        title={`Play ${game.title}`}
                        data-card="play"
                        onClick={() => start("play")}
                    >
                        <Icon name="play" />
                    </button>
                </Show>
                <Show when={state() === "poster" ? null : end()}>
                    {(e) => (
                        <RoundEndCard
                            compact
                            won={e().won}
                            words={e().words}
                            actions={actionsOf({
                                won: e().won,
                                variations: supportsVariations(found),
                                next: false,
                                watch: false,
                            })}
                            onAct={act}
                        />
                    )}
                </Show>
            </div>
            <div class="gc-hands">
                <div data-game="tray" class="tray" />
                <div data-game="pad" class="pad" />
                <button
                    class="game-icon"
                    type="button"
                    data-game="undo"
                    aria-label="Undo last move"
                    title="Undo last move"
                    onClick={() => runtime?.undo?.()}
                >
                    <Icon name="undo" />
                </button>
            </div>
            <div hidden>
                <p data-game="reads" aria-live="polite" />
                <button type="button" data-game="checkpoint" aria-label="Back to the checkpoint" />
                <div data-game="panel-2" />
            </div>
        </section>
    );
}

export default GameCard;
