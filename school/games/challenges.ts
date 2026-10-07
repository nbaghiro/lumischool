import { rallyChallenge, isRallyConfiguration, openRallyConfiguration } from "./rally-challenges";
import { golfChallenge, isGolfConfiguration, openGolfConfiguration } from "./golf-challenges";
import { fishChallenge, isFishConfiguration, openFishConfiguration } from "./fish-challenges";
import {
    isSwingsConfiguration,
    openSwingsConfiguration,
    swingsChallenge,
} from "./swings-challenges";
import { clearChallenge, isClearConfiguration, openClearConfiguration } from "./clear-challenges";
import {
    actionKind,
    actionChallenge,
    isActionConfiguration,
    openActionConfiguration,
} from "./action-challenges";
import {
    yardChallenge,
    isYardConfiguration,
    openYardConfiguration,
    yardWay,
} from "./yard-challenges";
import {
    remainingChallenge,
    remainingKind,
    isRemainingConfiguration,
    openRemainingConfiguration,
} from "./remaining-challenges";
import {
    workshopChallenge,
    isWorkshopConfiguration,
    openWorkshopConfiguration,
} from "./workshop-challenges";
import {
    rabbitChallenge,
    isRabbitConfiguration,
    openRabbitConfiguration,
} from "./rabbit-challenges";
import { tableChallenge, isTableConfiguration, openTableConfiguration } from "./table-challenges";
import {
    isTrainConfiguration,
    openTrainConfiguration,
    trainChallenge,
    trainWay,
} from "./train-challenges";
import { configurationKey } from "../../engine/motion/configuration";
import { slingChallenge, isSlingConfiguration, openSlingConfiguration } from "./sling-challenges";
import { machineChallenge, isMachineConfiguration, machineSolve } from "./rule-challenges";
import { startMachine } from "./rule";
import {
    gameRulesVersion,
    GAME_CHALLENGE_VERSIONS,
    type GameValue,
    type GameChallenge,
} from "../../engine/answer";
import type { ActionGame, Game, TurnGame } from "./game";
import type { Round } from "./games";
import { certified, type Variation } from "../../engine/motion/generator";
import { isPourConfiguration, openPourConfiguration, pourChallenge } from "./pour-challenges";
import { fetchChallenge, isFetchConfiguration, openFetchConfiguration } from "./fetch-challenges";
import { FETCH_LEVELS } from "./fetch";
import {
    isStandConfiguration,
    openStandConfiguration,
    standCertified,
    standChallenge,
} from "./lemonade-challenges";
import { STAND_LEVELS } from "./lemonade";
import { isPoolConfiguration, openPoolConfiguration, poolChallenge } from "./pool-challenges";
import {
    curlChallenge,
    curlLevelOf,
    isCurlConfiguration,
    openCurlConfiguration,
} from "./curling-challenges";
import { POOL_LEVELS } from "./pool";
import { isPinConfiguration, openPinConfiguration, pinChallenge } from "./pinball-challenges";
import {
    isRescueConfiguration,
    openRescueConfiguration,
    rescueChallenge,
    vary as varyRescue,
} from "./rescue-challenges";
import { RESCUE_LEVELS } from "./rescue";
import {
    dollCertified,
    dollChallenge,
    isDollConfiguration,
    openDollConfiguration,
    vary as varyDoll,
} from "./dollhouse-challenges";
import { DOLL_LEVELS } from "./dollhouse";
import {
    gardenCertified,
    gardenChallenge,
    isGardenConfiguration,
    levelFor as gardenLevelFor,
    openGardenConfiguration,
} from "./garden-challenges";
import {
    climbCertified,
    climbChallenge,
    isClimbConfiguration,
    openClimbConfiguration,
} from "./climb-challenges";
import { CLIMB_LEVELS, variantOf as climbVariant } from "./climb";
import {
    dominoCertified,
    dominoChallenge,
    isDominoConfiguration,
    levelOf as dominoLevel,
    openDominoConfiguration,
} from "./machine-challenges";
import {
    bridgeCertified,
    bridgeChallenge,
    isBridgeConfiguration,
    levelOf as bridgeLevel,
    openBridgeConfiguration,
} from "./bridgebuild-challenges";
import {
    feedChallenge,
    isFeedConfiguration,
    openFeedConfiguration,
    vary as varyFeed,
} from "./feedpup-challenges";
import { FEED_LEVELS } from "./feedpup";

function identity(game: string, phase: number, value: unknown): string {
    const text = configurationKey(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${game}:${phase}:${gameRulesVersion(game)}:${(hash >>> 0).toString(16)}`;
}

type Configuration = GameChallenge["configuration"];

/**
 * A game's variations on the generator kit: the layout the kit generates and reads back, how it is
 * stored, how hard it is, and the game it opens. The stored shape is what a challenge's identity is
 * hashed from, so it must not change for a layout that has not.
 */
interface Family<T> {
    variation: Variation<T>;
    store(layout: T): Configuration;
    rating(layout: T, phase: number): { reasoning: number; motor: number };
    open(game: Game, layout: T, phase: number): Game | null;
}

/** A family with its layout's type hidden, so every game's can sit in one record. */
interface Variations {
    generate(
        seed: number,
        phase: number,
    ): { configuration: Configuration; method: string; reasoning: number; motor: number };
    open(game: Game, configuration: Configuration, phase: number): Game | null;
}

function family<T>(f: Family<T>): Variations {
    return {
        generate(seed, phase) {
            // the generators certify their own pools, so the seed given is the layout kept
            const layout = certified(f.variation, seed, phase, 1);
            return {
                configuration: f.store(layout),
                method: f.variation.method,
                ...f.rating(layout, phase),
            };
        },
        open(game, configuration, phase) {
            const layout = f.variation.read(configuration, phase);
            return layout === null ? null : f.open(game, layout, phase);
        },
    };
}

const action = (game: Game): ActionGame<unknown> | null => (game.group === "action" ? game : null);
const turn = (game: Game): TurnGame | null => (game.group === "action" ? null : game);

/** An action game started from a layout, with one level's words replaced where the layout names them. */
function started(
    game: Game,
    start: () => unknown,
    phase?: number,
    words?: { title?: string; goal: string },
): Game | null {
    const g = action(game);
    if (!g) return null;
    return {
        ...g,
        ...(words && phase !== undefined
            ? { levels: g.levels.map((level, i) => (i === phase ? { ...level, ...words } : level)) }
            : {}),
        start,
    };
}

/** A turn game whose level plays a layout's round. */
function rounded(game: Game, phase: number, round: () => Round): Game | null {
    const g = turn(game);
    if (!g) return null;
    return {
        ...g,
        levels: g.levels.map((level, i) => (i === phase ? { ...level, round } : level)),
    };
}

const typed =
    <T>(guard: (value: unknown, phase: number) => value is T) =>
    (value: unknown, phase: number): T | null =>
        guard(value, phase) ? value : null;

const sampled = "sampled-complete-controls-replay";

const rally = family({
    variation: {
        method: sampled,
        generate: rallyChallenge,
        read: typed(isRallyConfiguration),
    },
    store: (v) => ({ phase: v.phase, variant: v.variant, course: serializable(v.course) }),
    rating: (_v, phase) => ({ reasoning: 2, motor: phase + 2 }),
    open: (game, v) => started(game, () => openRallyConfiguration(v)),
});

const clear = family({
    variation: {
        method: "steady-tap-physics-ride",
        generate: clearChallenge,
        read: typed(isClearConfiguration),
    },
    store: (v) => ({ phase: v.phase, variant: v.variant, course: serializable(v.course) }),
    rating: (_v, phase) => ({ reasoning: phase + 2, motor: 2 }),
    open: (game, v) => started(game, () => openClearConfiguration(v)),
});

const bridge = family({
    variation: {
        method: "hold-search-and-swing-replay",
        generate: swingsChallenge,
        read: typed(isSwingsConfiguration),
    },
    store: (v) => ({ phase: v.phase, variant: v.variant, level: serializable(v.level) }),
    rating: (_v, phase) => ({ reasoning: phase + 1, motor: 3 }),
    open: (game, v, phase) =>
        started(game, () => openSwingsConfiguration(v), phase, {
            title: v.level.title,
            goal: v.level.goal,
        }),
});

const fish = family({
    variation: { method: sampled, generate: fishChallenge, read: typed(isFishConfiguration) },
    store: (v) => ({ phase: v.phase, seed: v.seed, level: serializable(v.level) }),
    rating: (_v, phase) => ({ reasoning: phase + 1, motor: 3 }),
    open: (game, v, phase) =>
        started(game, () => openFishConfiguration(v), phase, {
            title: v.level.title,
            goal: v.level.goal,
        }),
});

const golf = family({
    variation: {
        method: sampled,
        generate: golfChallenge,
        read: (value, phase) =>
            isGolfConfiguration(value) && value.phase === phase ? value : null,
    },
    store: (v) => ({ phase: v.phase, course: serializable(v.course) }),
    rating: (_v, phase) => ({ reasoning: phase + 1, motor: 2 }),
    open: (game, v) => started(game, () => openGolfConfiguration(v)),
});

const pour = family({
    variation: {
        method: "exhaustive-position-graph",
        generate: pourChallenge,
        read: typed(isPourConfiguration),
    },
    store: (v) => ({ jugs: v.jugs.map((j) => ({ ...j })), target: v.target, unit: v.unit }),
    rating: (_v, phase) => ({ reasoning: [1, 2, 3, 4, 4, 3][phase] ?? 1, motor: 1 }),
    open: (game, v, phase) => started(game, () => openPourConfiguration(v, phase)),
});

const sling = family({
    variation: {
        method: "sampled-complete-physics-replay",
        generate: slingChallenge,
        read: (value) => (isSlingConfiguration(value) ? value : null),
    },
    store: (v) => ({ phase: v.phase, level: serializable(v.level) }),
    rating: (_v, phase) => ({ reasoning: 1, motor: phase + 2 }),
    open: (game, v, phase) => {
        if (v.phase !== phase) throw new Error("Wrong slingshot phase");
        return started(game, () => openSlingConfiguration(v));
    },
});

const rule = family({
    variation: {
        method: "order-search-and-tap-replay",
        generate: machineChallenge,
        read: typed(isMachineConfiguration),
        solve: (v) => machineSolve(v.level),
    },
    store: (v) => ({ phase: v.phase, variant: v.variant, level: serializable(v.level) }),
    rating: (_v, phase) => ({ reasoning: phase < 3 ? 2 : 3, motor: 2 }),
    open: (game, v, phase) => {
        if (v.phase !== phase) throw new Error("Wrong machine phase");
        return started(game, () => startMachine(v.level, phase));
    },
});

const workshop = family({
    variation: {
        method: sampled,
        generate: workshopChallenge,
        read: (value) => (isWorkshopConfiguration(value) ? value : null),
    },
    store: (v) => ({ phase: v.phase, kind: v.kind, level: serializable(v.level) }),
    rating: (_v, phase) => ({ reasoning: phase + 1, motor: 2 }),
    open: (game, v, phase) => {
        if (v.phase !== phase || `${v.kind}-workshop` !== game.id)
            throw new Error("Wrong workshop phase");
        return started(game, () => openWorkshopConfiguration(v));
    },
});

const jump = family({
    variation: {
        method: "route-graph-and-controls-replay",
        generate: rabbitChallenge,
        read: (value, phase) =>
            typeof value === "object" &&
            value !== null &&
            "level" in value &&
            isRabbitConfiguration(value.level, phase)
                ? value.level
                : null,
    },
    store: (level) => ({ level: serializable(level) }),
    rating: () => ({ reasoning: 2, motor: 2 }),
    open: (game, level, phase) =>
        started(game, () => openRabbitConfiguration(level, phase), phase, {
            title: level.title,
            goal: level.goal,
        }),
});

const shunt = family({
    variation: {
        method: "sampled-complete-controls-replay",
        generate: yardChallenge,
        read: (value, phase) => (isYardConfiguration(value, phase) ? value : null),
        solve: (c) => yardWay(openYardConfiguration(c)),
    },
    store: (c) => ({ phase: c.phase, queue: c.queue }),
    rating: (_c, phase) => ({ reasoning: phase < 2 ? 1 : phase < 4 ? 3 : 2, motor: 2 }),
    open: (game, c) => started(game, () => openYardConfiguration(c)),
});

const shut = family({
    variation: {
        method: "seeded-graph-and-fair-dice-audit",
        generate: (seed: number, phase: number) => tableChallenge(seed, "shut", phase),
        read: (value, phase) => (isTableConfiguration(value, "shut", phase) ? value : null),
    },
    store: (v) => ({ kind: v.kind, value: serializable(v.value) }),
    rating: () => ({ reasoning: 3, motor: 1 }),
    open: (game, v, phase) => rounded(game, phase, () => openTableConfiguration(v)),
});

const spell = family({
    variation: {
        method: "sampled-complete-controls-replay",
        generate: trainChallenge,
        read: (value, phase) => (isTrainConfiguration(value, phase) ? value : null),
        solve: (c) => trainWay(openTrainConfiguration(c)),
    },
    store: (c) => ({ phase: c.phase, word: serializable(c.word) }),
    rating: (c, phase) => ({
        reasoning: c.word.sounds.length > 3 ? 2 : 1,
        motor: phase < 2 ? 2 : 3,
    }),
    open: (game, c) => started(game, () => openTrainConfiguration(c)),
});

const moving = (kind: NonNullable<ReturnType<typeof actionKind>>) =>
    family({
        variation: {
            method: sampled,
            generate: (seed: number, phase: number) => actionChallenge(seed, kind, phase),
            read: (value, phase) =>
                isActionConfiguration(value) && value.kind === kind && value.phase === phase
                    ? value
                    : null,
        },
        store: (v) => ({ kind: v.kind, phase: v.phase, level: serializable(v.level) }),
        rating: (_v, phase) => ({
            reasoning: 1,
            motor: kind === "plane" ? 3 : kind === "row" && phase >= 4 ? 3 : 2,
        }),
        open: (game, v, phase) =>
            actionKind(game.id) === kind
                ? started(game, () => openActionConfiguration(v), phase, {
                      title: v.level.title,
                      goal: v.level.goal,
                  })
                : null,
    });

const remaining = (kind: NonNullable<ReturnType<typeof remainingKind>>) =>
    family({
        variation: {
            method: sampled,
            generate: (seed: number, phase: number) => remainingChallenge(seed, kind, phase),
            read: (value, phase) =>
                isRemainingConfiguration(value) && value.kind === kind && value.phase === phase
                    ? value
                    : null,
        },
        store: (v) => {
            const data = serializable(v);
            if (!data || typeof data !== "object" || Array.isArray(data))
                throw new Error("Invalid action configuration");
            return data;
        },
        // Initial ratings describe the authored task and tolerance; they are not ability scores.
        rating: (v, phase) =>
            v.kind === "cake"
                ? {
                      reasoning:
                          v.level.given || v.level.gone ? 3 : v.level.names.length > 3 ? 2 : 1,
                      motor: v.level.within >= 0.8 ? 1 : v.level.within >= 0.6 ? 2 : 3,
                  }
                : {
                      reasoning: kind === "snake" ? 1 : phase < 2 ? 2 : 3,
                      motor: kind === "snake" || kind === "rafts" ? 3 : 2,
                  },
        open: (game, v, phase) =>
            remainingKind(game.id) === kind
                ? started(game, () => openRemainingConfiguration(v), phase, {
                      title: v.level.title,
                      goal: v.level.goal,
                  })
                : null,
    });

// the pups' fetch keeps the id its building game had, so its challenges are filed under "blocks"
const blocks = family({
    variation: {
        method: "throw-search-and-physics-replay",
        generate: fetchChallenge,
        read: typed(isFetchConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({
        reasoning: phase < 2 ? 1 : phase < 4 ? 2 : 3,
        motor: (FETCH_LEVELS[phase]?.preview ?? 0) >= 1 ? 1 : 2,
    }),
    open: (game, c, phase) => started(game, () => openFetchConfiguration(c), phase),
});

// the lemonade stand keeps the id of the market stall it replaced, so its challenges are filed under "wardrobe"
const wardrobe = family({
    variation: {
        method: "serve-plan-and-controls-replay",
        generate: standChallenge,
        read: (value, phase) => (isStandConfiguration(value, phase) ? value : null),
        solve: (c) => standCertified(c),
    },
    store: (c) => ({ phase: c.phase, n: c.n }),
    rating: (_c, phase) => ({
        reasoning: phase < 2 ? 1 : phase < 4 ? 2 : 3,
        motor: phase < 3 ? 1 : 2,
    }),
    open: (game, c, phase) => {
        const L = STAND_LEVELS[phase];
        return L
            ? started(game, () => openStandConfiguration(c), phase, {
                  title: L.title,
                  goal: L.goal,
              })
            : null;
    },
});

const pool = family({
    variation: {
        method: "shot-search-and-physics-replay",
        generate: poolChallenge,
        read: typed(isPoolConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({
        reasoning: phase < 2 ? 1 : phase < 5 ? 2 : 3,
        motor: (POOL_LEVELS[phase]?.preview ?? 0) === 2 ? 1 : 2,
    }),
    open: (game, c, phase) => started(game, () => openPoolConfiguration(c), phase),
});

const curling = family({
    variation: {
        method: "throw-search-and-ice-replay",
        generate: curlChallenge,
        read: typed(isCurlConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({
        reasoning: phase < 3 ? 1 : phase < 7 ? 2 : 3,
        motor: phase < 3 ? 1 : 2,
    }),
    open: (game, c, phase) => {
        const L = curlLevelOf(c);
        return started(game, () => openCurlConfiguration(c), phase, {
            title: L.title,
            goal: L.goal,
        });
    },
});

const pinball = family({
    variation: {
        method: "flip-search-and-physics-replay",
        generate: pinChallenge,
        read: typed(isPinConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 3 ? 1 : phase < 6 ? 2 : 3, motor: 2 }),
    open: (game, c, phase) => started(game, () => openPinConfiguration(c), phase),
});

const rescue = family({
    variation: {
        method: "mission-driver-and-physics-replay",
        generate: rescueChallenge,
        read: typed(isRescueConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({
        reasoning: phase < 3 ? 1 : phase < 6 ? 2 : 3,
        motor: (RESCUE_LEVELS[phase]?.preview ?? 0) >= 1 ? 1 : 2,
    }),
    open: (game, c, phase) => {
        const L = RESCUE_LEVELS[phase];
        return L
            ? started(game, () => openRescueConfiguration(c), phase, {
                  title: L.title,
                  goal: varyRescue(L, c.variant).goal,
              })
            : null;
    },
});

const dollhouse = family({
    variation: {
        method: "plan-and-hands-replay",
        generate: dollChallenge,
        read: typed(isDollConfiguration),
        solve: (c) => dollCertified(c),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 3 ? 1 : phase < 6 ? 2 : 3, motor: 1 }),
    open: (game, c, phase) => {
        const L = DOLL_LEVELS[phase];
        return L
            ? started(game, () => openDollConfiguration(c), phase, {
                  title: L.title,
                  goal: varyDoll(L, c.variant).goal,
              })
            : null;
    },
});

const climb = family({
    variation: {
        method: "route-pilot-keys-and-touch-replay",
        generate: climbChallenge,
        read: typed(isClimbConfiguration),
        solve: (c) => climbCertified(c),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({
        reasoning: phase < 3 ? 1 : phase < 6 ? 2 : 3,
        motor: phase < 3 ? 2 : 3,
    }),
    open: (game, c, phase) => {
        const L = CLIMB_LEVELS[phase];
        return L && climbVariant(L, c.variant)
            ? started(game, () => openClimbConfiguration(c), phase)
            : null;
    },
});

const garden = family({
    variation: {
        method: "plan-and-hands-replay",
        generate: gardenChallenge,
        read: typed(isGardenConfiguration),
        solve: (c) => gardenCertified(c),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 3 ? 1 : phase < 6 ? 2 : 3, motor: 1 }),
    open: (game, c, phase) => {
        const L = gardenLevelFor(c);
        return started(game, () => openGardenConfiguration(c), phase, {
            title: L.title,
            goal: L.goal,
        });
    },
});

const machine = family({
    variation: {
        method: "plan-and-hands-physics-replay",
        generate: dominoChallenge,
        read: (value, phase) => (isDominoConfiguration(value, phase) ? value : null),
        solve: (c) => dominoCertified(c),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 2 ? 1 : phase < 6 ? 2 : 3, motor: 2 }),
    open: (game, c, phase) => {
        const L = dominoLevel(c);
        return started(game, () => openDominoConfiguration(c), phase, {
            title: L.title,
            goal: L.goal,
        });
    },
});

const bridgebuild = family({
    variation: {
        method: "plan-and-hands-truss-replay",
        generate: bridgeChallenge,
        read: (value, phase) => (isBridgeConfiguration(value, phase) ? value : null),
        solve: (c) => bridgeCertified(c),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 2 ? 1 : phase < 6 ? 2 : 3, motor: 2 }),
    open: (game, c, phase) => {
        const L = bridgeLevel(c);
        return started(game, () => openBridgeConfiguration(c), phase, {
            title: L.title,
            goal: L.goal,
        });
    },
});

const feedpup = family({
    variation: {
        method: "cut-search-and-physics-replay",
        generate: feedChallenge,
        read: typed(isFeedConfiguration),
    },
    store: (c) => ({ phase: c.phase, variant: c.variant }),
    rating: (_c, phase) => ({ reasoning: phase < 2 ? 1 : phase < 5 ? 2 : 3, motor: 2 }),
    open: (game, c, phase) => {
        const L = FEED_LEVELS[phase];
        return started(
            game,
            () => openFeedConfiguration(c),
            phase,
            L ? { goal: varyFeed(L, c.variant).goal } : undefined,
        );
    },
});

/** Every game whose levels have variations, by the game's id. */
const VARIATIONS: Partial<Record<string, Variations>> = {
    machine,
    bridgebuild,
    feedpup,
    garden,
    climb,
    dollhouse,
    rally,
    pinball,
    pool,
    curling,
    rescue,
    blocks,
    wardrobe,
    clear,
    bridge,
    fish,
    golf,
    pour,
    sling,
    rule,
    "cargo-workshop": workshop,
    jump,
    shunt,
    spell,
    shut,
    straight: moving("row"),
    road: moving("road"),
    plane: moving("plane"),
    share: remaining("cake"),
    weigh: remaining("seesaw"),
    snake: remaining("snake"),
    pay: remaining("shove"),
    herd: remaining("rafts"),
};

export const supportsVariations = (game: Game): boolean => VARIATIONS[game.id] !== undefined;

export function challengeFor(
    game: Game,
    phase: number,
    seed: number,
    generated = false,
): GameChallenge {
    const level = game.levels[phase];
    if (!level || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
        throw new Error("Invalid challenge selection");
    let configuration: Configuration = { phase, title: level.title };
    let source: GameChallenge["source"] = "authored";
    let method = "authored-regression";
    let reasoning = game.group === "action" ? 1 : 2;
    let motor = game.group === "action" ? 2 : 1;
    const variations = generated ? VARIATIONS[game.id] : undefined;
    if (variations) {
        ({ configuration, method, reasoning, motor } = variations.generate(seed, phase));
        source = "generated";
    } else if (game.group === "action") {
        // Snapshot the deterministic initial data, including generated fish/cards and world
        // definitions. Runtime functions stay in the versioned rules, never in persisted JSON.
        const initial: unknown = JSON.parse(JSON.stringify(game.start(phase, 1)));
        configuration = { ...configuration, initial: serializable(initial) };
    } else {
        const round = game.levels[phase]?.round();
        if (!round) throw new Error("Missing round");
        configuration = { ...configuration, values: round.values, goal: round.goal };
    }
    return {
        id: identity(game.id, phase, configuration),
        game: game.id,
        phase,
        seed: source === "authored" ? 1 : seed,
        source,
        generatorVersion: source === "generated" ? GAME_CHALLENGE_VERSIONS.generator : "authored-1",
        rulesVersion: gameRulesVersion(game.id),
        configuration,
        difficulty: {
            version: GAME_CHALLENGE_VERSIONS.difficulty,
            band: Math.max(reasoning, motor),
            reasoning,
            motor,
            content: phase + 1,
        },
        validation: { method, version: "1" },
    };
}

export function nextChallenge(
    game: Game,
    phase: number,
    seed: number,
    recent: readonly string[],
): GameChallenge {
    const candidateFor = (value: number): GameChallenge => {
        try {
            const candidate = challengeFor(game, phase, value, true);
            openChallenge(game, candidate);
            return candidate;
        } catch {
            // A newly authored phase may not have a certified pool yet. Keep it playable.
            return challengeFor(game, phase, value);
        }
    };
    let candidate = candidateFor(seed);
    for (let i = 0; i < 24 && recent.includes(candidate.id); i++)
        candidate = candidateFor((seed + Math.imul(i + 1, 2654435761)) >>> 0);
    const last = recent.at(-1);
    for (let i = 0; i < 24 && candidate.id === last; i++)
        candidate = candidateFor((seed + i + 1) >>> 0);
    return candidate;
}

export function openChallenge(game: Game, challenge: GameChallenge): Game {
    if (challenge.game !== game.id || challenge.rulesVersion !== gameRulesVersion(game.id))
        throw new Error("This saved challenge uses an unsupported game version.");
    if (challenge.id !== identity(game.id, challenge.phase, challenge.configuration))
        throw new Error("Challenge identity does not match its configuration.");
    if (
        challenge.source === "generated" &&
        challenge.generatorVersion !== GAME_CHALLENGE_VERSIONS.generator
    )
        throw new Error("Unsupported generator version.");
    if (challenge.source === "authored") {
        const current = challengeFor(game, challenge.phase, challenge.seed);
        if (current.id !== challenge.id) throw new Error("This authored challenge has changed.");
        if (game.group === "action")
            return { ...game, start: (level) => game.start(level, challenge.seed) };
        return game;
    }
    const opened = VARIATIONS[game.id]?.open(game, challenge.configuration, challenge.phase);
    if (!opened) throw new Error("This generated challenge is not supported.");
    return opened;
}

function serializable(value: unknown): GameValue {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(serializable);
    if (value && typeof value === "object")
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, v]) => v !== undefined)
                .map(([key, v]) => [key, serializable(v)]),
        );
    throw new Error("Challenge configuration must be serializable");
}
