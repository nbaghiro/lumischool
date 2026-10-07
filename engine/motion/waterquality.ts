// How healthy the water in a tank is, by degrees: oxygen and cleanness, each from nought to one,
// easing towards where the tank's life puts them rather than jumping there, so a change shows on the
// meter over a few seconds. Plants and a running filter give oxygen, crowding takes it, snails and the
// filter clean, and food left uneaten clouds the water as a haze that they slowly clear. Nothing here
// ends badly: a tank put right comes back. Seconds, litres and flakes.

export interface Quality {
    oxygen: number;
    clean: number;
    /** Food left uneaten in the water, in flakes' worth, which clouds it until it is cleared. */
    haze: number;
}

/** What lives in a tank and what is switched on, which sets where its water is going. */
export interface TankLife {
    litres: number;
    /** The fish, each counted by the litres it needs, so a big fish crowds a tank more than a small one. */
    needs: number;
    plants: number;
    snails: number;
    filter: boolean;
}

/** Where a meter turns from worrying to fine, for either reading. */
export const FINE = 0.6;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** How crowded a tank is: one when its fish need all its water, more when they need more. */
export const crowding = (life: TankLife): number =>
    life.litres > 0 ? life.needs / life.litres : 0;

/** Where oxygen and cleanness settle for this life and this much haze. */
export function settled(life: TankLife, haze: number): { oxygen: number; clean: number } {
    const over = Math.max(0, crowding(life) - 1);
    const empty = life.litres <= 0;
    return {
        oxygen: empty
            ? 0
            : clamp01(
                  0.45 + 0.1 * Math.min(4, life.plants) + (life.filter ? 0.25 : 0) - 0.6 * over,
              ),
        clean: empty
            ? 0
            : clamp01(
                  0.8 +
                      0.05 * Math.min(2, life.snails) +
                      (life.filter ? 0.15 : 0) -
                      0.45 * over -
                      0.12 * haze,
              ),
    };
}

/** How many flakes' worth of haze a second the snails and the filter clear. */
export const clearing = (life: TankLife): number =>
    0.05 + 0.25 * Math.min(2, life.snails) + (life.filter ? 0.35 : 0);

/** One step of `dt` seconds: the haze clears a little and both readings ease towards where they settle. */
export function stepQuality(q: Quality, life: TankLife, dt: number, rate = 0.6): void {
    q.haze = Math.max(0, q.haze - clearing(life) * dt);
    const to = settled(life, q.haze),
        k = 1 - Math.exp(-rate * dt);
    q.oxygen += (to.oxygen - q.oxygen) * k;
    q.clean += (to.clean - q.clean) * k;
}

/** Whether both readings are fine. */
export const healthy = (q: Quality): boolean => q.oxygen >= FINE && q.clean >= FINE;
