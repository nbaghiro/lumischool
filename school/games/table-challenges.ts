import { configurationKey } from "../../engine/motion/configuration";
import { bind, type Round } from "./games";
import { shut, SHUT, type ShutVersion } from "./shut";

export function shutConfigurations(phase: number): ShutVersion[] {
    const base = SHUT.versions[phase]?.v;
    if (!base) return [];
    return Array.from({ length: 8 }, (_, seed) => ({ ...base, seed: seed + 1 }));
}
export type TableConfiguration = { kind: "shut"; value: ShutVersion };
export function tableConfigurations(kind: string, phase: number): TableConfiguration[] {
    if (kind === "shut") return shutConfigurations(phase).map((value) => ({ kind, value }));
    return [];
}
export function tableChallenge(seed: number, kind: string, phase: number): TableConfiguration {
    const pool = tableConfigurations(kind, phase),
        c = pool[(seed >>> 0) % pool.length];
    if (!c) throw new Error("Unknown tabletop phase");
    return c;
}
export function isTableConfiguration(
    value: unknown,
    kind: string,
    phase: number,
): value is TableConfiguration {
    return tableConfigurations(kind, phase).some(
        (v) => configurationKey(value) === configurationKey(v),
    );
}
export function openTableConfiguration(c: TableConfiguration): Round {
    return bind(
        shut,
        { ...SHUT, versions: [{ v: c.value, values: configurationKey(c.value) }] },
        0,
    );
}
