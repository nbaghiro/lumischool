// A child's worlds as the grown-ups' pages read them: the family's choice as the server folds it
// (school/family/chosen.ts). It reads the worlds, so a page loads it once it needs it.

import { savedChoice } from "../../school/family/chosen";
import { readChoice } from "../../school/worlds/choice";
import type { WorldChoice } from "../../school/worlds/types";
import { DEFAULT_YEARS, yearOf } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";

type Read = Pick<GrownRecord, "worlds" | "years">;

/** The family's choice for a child, each term's world and each world's tweaks as they stood. */
export const choiceFor = (kid: Pick<Kid, "name">, r: Read): WorldChoice =>
    readChoice(
        savedChoice(r.worlds, yearOf, [
            ...Object.keys(DEFAULT_YEARS).map(Number),
            ...r.years.map((y) => y.grade),
        ]),
        kid.name,
    ).choice;
