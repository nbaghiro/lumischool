import { rallyChallenge, isRallyConfiguration, openRallyConfiguration } from "./rally-challenges";
import { golfChallenge, isGolfConfiguration, openGolfConfiguration } from "./golf-challenges";
import {
    actionKind,
    actionChallenge,
    isActionConfiguration,
    openActionConfiguration,
} from "./action-challenges";
import { yardChallenge, isYardConfiguration, openYardConfiguration } from "./yard-challenges";
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
import { configurationKey } from "../../engine/motion/configuration";
import { slingChallenge, isSlingConfiguration, openSlingConfiguration } from "./sling-challenges";
import { ruleChallenge, isRuleConfiguration, openRuleConfiguration } from "./rule-challenges";
import {
    gameRulesVersion,
    GAME_CHALLENGE_VERSIONS,
    type GameValue,
    type GameChallenge,
} from "../../engine/answer";
import type { Game } from "./game";
import { isPourConfiguration, openPourConfiguration, pourChallenge } from "./pour-challenges";

function identity(game: string, phase: number, value: unknown): string {
    const text = configurationKey(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${game}:${phase}:${gameRulesVersion(game)}:${(hash >>> 0).toString(16)}`;
}

export function supportsVariations(game: Game): boolean {
    return (
        Boolean(actionKind(game.id)) ||
        Boolean(remainingKind(game.id)) ||
        [
            "golf",
            "rally",
            "shunt",
            "pour",
            "sling",
            "rule",
            "jump",
            "marble-workshop",
            "cargo-workshop",
            "race",
            "spell",
            "shut",
        ].includes(game.id)
    );
}

export function challengeFor(
    game: Game,
    phase: number,
    seed: number,
    generated = false,
): GameChallenge {
    const level = game.levels[phase];
    if (!level || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
        throw new Error("Invalid challenge selection");
    let configuration: GameChallenge["configuration"] = { phase, title: level.title };
    let source: GameChallenge["source"] = "authored";
    let method = "authored-regression";
    let reasoning = game.group === "action" ? 1 : 2;
    let motor = game.group === "action" ? 2 : 1;
    if (generated && game.id === "rally") {
        const v = rallyChallenge(seed, phase);
        configuration = { phase: v.phase, variant: v.variant, course: serializable(v.course) };
        source = "generated";
        method = "sampled-complete-controls-replay";
        reasoning = 2;
        motor = phase + 2;
    } else if (generated && game.id === "golf") {
        const v = golfChallenge(seed, phase);
        configuration = { phase: v.phase, course: serializable(v.course) };
        source = "generated";
        method = "sampled-complete-controls-replay";
        reasoning = phase + 1;
        motor = 2;
    } else if (generated && game.id === "pour") {
        const v = pourChallenge(seed, phase);
        configuration = { jugs: v.jugs.map((j) => ({ ...j })), target: v.target, unit: v.unit };
        source = "generated";
        method = "exhaustive-position-graph";
        reasoning = [1, 2, 3, 4, 4, 3][phase] ?? 1;
        motor = 1;
    } else if (generated && game.id === "sling") {
        const v = slingChallenge(seed, phase);
        configuration = { phase: v.phase, level: serializable(v.level) };
        source = "generated";
        method = "sampled-complete-physics-replay";
        reasoning = 1;
        motor = phase + 2;
    } else if (generated && game.id === "rule") {
        const v = ruleChallenge(seed, phase);
        configuration = {
            cards: v.cards.map((card) => serializable(card)),
            answer: v.answer,
            inputs: v.inputs,
        };
        source = "generated";
        method = "exhaustive-position-graph-and-information-audit";
        reasoning = phase < 3 ? 2 : 3;
    } else if (generated && (game.id === "marble-workshop" || game.id === "cargo-workshop")) {
        const v = workshopChallenge(
            seed,
            game.id === "marble-workshop" ? "marble" : "cargo",
            phase,
        );
        configuration = { phase: v.phase, kind: v.kind, level: serializable(v.level) };
        source = "generated";
        method = "sampled-complete-controls-replay";
        reasoning = phase + 1;
        motor = 2;
    } else if (generated && game.id === "jump") {
        configuration = { level: serializable(rabbitChallenge(seed, phase)) };
        source = "generated";
        method = "route-graph-and-controls-replay";
        reasoning = 2;
        motor = 2;
    } else if (generated && ["race", "spell", "shut"].includes(game.id)) {
        const v = tableChallenge(seed, game.id, phase);
        configuration = { kind: v.kind, value: serializable(v.value) };
        source = "generated";
        method =
            game.id === "shut" ? "seeded-graph-and-fair-dice-audit" : "exhaustive-position-graph";
        reasoning = game.id === "spell" ? 1 : 3;
        motor = 1;
    } else if (generated && game.id === "shunt") {
        const v = yardChallenge(seed, phase);
        configuration = { train: v.train, order: v.order, siding: v.siding, windows: v.windows };
        source = "generated";
        method = "exhaustive-graph-and-controls-replay";
        reasoning = phase < 2 ? 2 : phase < 4 ? 3 : 4;
        motor = 2;
    } else if (generated && actionKind(game.id)) {
        const kind = actionKind(game.id);
        if (!kind) throw new Error("Unknown action family");
        const v = actionChallenge(seed, kind, phase);
        configuration = { kind: v.kind, phase: v.phase, level: serializable(v.level) };
        source = "generated";
        method = "sampled-complete-controls-replay";
        reasoning = 1;
        motor = kind === "plane" ? 3 : kind === "row" && phase >= 4 ? 3 : 2;
    } else if (generated && remainingKind(game.id)) {
        const kind = remainingKind(game.id);
        if (!kind) throw new Error("Unknown action family");
        const v = remainingChallenge(seed, kind, phase);
        const data = serializable(v);
        if (!data || typeof data !== "object" || Array.isArray(data))
            throw new Error("Invalid action configuration");
        configuration = data;
        source = "generated";
        method = "sampled-complete-controls-replay";
        // Initial ratings describe the authored task and tolerance; they are not ability scores.
        reasoning = kind === "snake" ? 1 : phase < 2 ? 2 : 3;
        motor = kind === "snake" || kind === "rafts" ? 3 : 2;
        if (v.kind === "cake") {
            reasoning = v.level.given || v.level.gone ? 3 : v.level.names.length > 3 ? 2 : 1;
            motor = v.level.within >= 0.8 ? 1 : v.level.within >= 0.6 ? 2 : 3;
        }
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
    if (
        game.id === "rally" &&
        game.group === "action" &&
        isRallyConfiguration(challenge.configuration, challenge.phase)
    ) {
        const configuration = challenge.configuration;
        return { ...game, start: () => openRallyConfiguration(configuration) };
    }
    if (
        game.id === "golf" &&
        game.group === "action" &&
        isGolfConfiguration(challenge.configuration) &&
        challenge.phase === challenge.configuration.phase
    ) {
        const configuration = challenge.configuration;
        return { ...game, start: () => openGolfConfiguration(configuration) };
    }
    if (
        game.group === "action" &&
        isActionConfiguration(challenge.configuration) &&
        actionKind(game.id) === challenge.configuration.kind &&
        challenge.phase === challenge.configuration.phase
    ) {
        const configuration = challenge.configuration;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, title: configuration.level.title, goal: configuration.level.goal }
                    : level,
            ),
            start: () => openActionConfiguration(configuration),
        };
    }
    if (
        game.id === "shunt" &&
        game.group === "action" &&
        isYardConfiguration(challenge.configuration, challenge.phase)
    ) {
        const configuration = challenge.configuration;
        return { ...game, start: () => openYardConfiguration(configuration, challenge.phase) };
    }
    if (
        game.group === "action" &&
        isRemainingConfiguration(challenge.configuration) &&
        remainingKind(game.id) === challenge.configuration.kind &&
        challenge.phase === challenge.configuration.phase
    ) {
        const configuration = challenge.configuration;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, title: configuration.level.title, goal: configuration.level.goal }
                    : level,
            ),
            start: () => openRemainingConfiguration(configuration),
        };
    }
    if (
        game.group === "action" &&
        ["cargo-workshop", "marble-workshop"].includes(game.id) &&
        isWorkshopConfiguration(challenge.configuration)
    ) {
        const configuration = challenge.configuration;
        if (configuration.phase !== challenge.phase || `${configuration.kind}-workshop` !== game.id)
            throw new Error("Wrong workshop phase");
        return { ...game, start: () => openWorkshopConfiguration(configuration) };
    }
    if (
        game.id === "jump" &&
        game.group === "action" &&
        isRabbitConfiguration(challenge.configuration.level, challenge.phase)
    ) {
        const configuration = challenge.configuration.level;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, title: configuration.title, goal: configuration.goal }
                    : level,
            ),
            start: () => openRabbitConfiguration(configuration, challenge.phase),
        };
    }
    if (
        game.group !== "action" &&
        isTableConfiguration(challenge.configuration, game.id, challenge.phase)
    ) {
        const configuration = challenge.configuration;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, round: () => openTableConfiguration(configuration) }
                    : level,
            ),
        };
    }
    if (
        game.id === "sling" &&
        game.group === "action" &&
        isSlingConfiguration(challenge.configuration)
    ) {
        const configuration = challenge.configuration;
        if (configuration.phase !== challenge.phase) throw new Error("Wrong slingshot phase");
        return { ...game, start: () => openSlingConfiguration(configuration) };
    }
    if (
        game.id === "rule" &&
        game.group !== "action" &&
        isRuleConfiguration(challenge.configuration, challenge.phase)
    ) {
        const configuration = challenge.configuration;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, round: () => openRuleConfiguration(configuration) }
                    : level,
            ),
        };
    }
    if (
        game.id === "pour" &&
        game.group !== "action" &&
        isPourConfiguration(challenge.configuration, challenge.phase)
    ) {
        const configuration = challenge.configuration;
        return {
            ...game,
            levels: game.levels.map((level, i) =>
                i === challenge.phase
                    ? { ...level, round: () => openPourConfiguration(configuration) }
                    : level,
            ),
        };
    }
    throw new Error("This generated challenge is not supported.");
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
