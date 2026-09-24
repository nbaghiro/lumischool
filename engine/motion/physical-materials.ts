import type { Material } from "./bodies";

/** Physical values only: games and artwork choose their own presentation for these materials. */
export type PhysicalMaterial = "timber" | "stone";
export const PHYSICAL_MATERIALS: Readonly<Record<PhysicalMaterial, Readonly<Required<Material>>>> =
    Object.freeze({
        timber: Object.freeze({ density: 1, friction: 0.7, restitution: 0.05 }),
        stone: Object.freeze({ density: 3, friction: 0.6, restitution: 0.08 }),
    });
