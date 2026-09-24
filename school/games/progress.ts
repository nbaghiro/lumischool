import { configurationKey } from "../../engine/motion/configuration";
import { gameRulesVersion, GAME_CHALLENGE_VERSIONS, type GameAttempt } from "../../engine/answer";

export function gameProgress(attempts: readonly GameAttempt[]) {
    const unique = [...new Map(attempts.map((attempt) => [attempt.id, attempt])).values()];
    const groups = new Map<string, GameAttempt[]>();
    for (const attempt of unique) {
        const key = `${attempt.challenge.game}:${attempt.challenge.phase}`;
        const group = groups.get(key) ?? [];
        group.push(attempt);
        groups.set(key, group);
    }
    return [...groups.values()].map((group) => {
        group.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
        const latest = group[0];
        if (!latest) throw new Error("A progress group needs an attempt");
        const band = latest.challenge.difficulty.band;
        const recent = group
            .filter(
                (a) =>
                    a.challenge.source === "generated" &&
                    a.challenge.rulesVersion === gameRulesVersion(a.challenge.game) &&
                    a.challenge.difficulty.version === GAME_CHALLENGE_VERSIONS.difficulty &&
                    a.challenge.generatorVersion === GAME_CHALLENGE_VERSIONS.generator &&
                    a.challenge.difficulty.band === band,
            )
            .slice(0, 5);
        const distinct = new Set(
            recent
                .filter((a) => a.outcome === "completed" && a.assistance === 0 && a.retries <= 2)
                .map((a) => configurationKey(a.challenge.configuration)),
        );
        return {
            game: latest.challenge.game,
            phase: latest.challenge.phase,
            attempts: group.length,
            completed: group.filter((a) => a.outcome === "completed").length,
            distinct: new Set(
                group
                    .filter((a) => a.outcome === "completed")
                    .map((a) => configurationKey(a.challenge.configuration)),
            ).size,
            band,
            recommendNext: distinct.size >= 3,
        };
    });
}
