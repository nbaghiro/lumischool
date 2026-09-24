import { configurationKey } from "../../engine/motion/configuration";
import { finding } from "./activities";
import { bind, type Round } from "./games";
import { rule, type RuleVersion } from "./rule";

export function ruleConfigurations(phase: number): RuleVersion[] {
    const v = finding.versions[phase]?.v;
    if (!v) return [];
    return v.cards.map((_, answer) => ({ ...v, answer }));
}

export function ruleChallenge(seed: number, phase: number): RuleVersion {
    const configurations = ruleConfigurations(phase);
    const chosen = configurations[(seed >>> 0) % configurations.length];
    if (!chosen) throw new Error("Unknown machine phase");
    return chosen;
}

export function isRuleConfiguration(value: unknown, phase: number): value is RuleVersion {
    return ruleConfigurations(phase).some((v) => configurationKey(v) === configurationKey(value));
}

export function openRuleConfiguration(v: RuleVersion): Round {
    return bind(rule, { ...finding, versions: [{ v, values: JSON.stringify(v) }] }, 0);
}
