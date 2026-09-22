// What a world is made of, as data.
//
// A world is the place a stretch of the year happens in. It themes everything around the paper and
// nothing on it: the sheet a child answers on is white squared paper in full colour in every world,
// because that is what prints and what every drawing was tuned against. So a world is a description
// of the ground, the sky, the way between days, the things that stand beside the path and the guide
// who lives there, and it names its drawings by id rather than holding them, so the same world can
// be drawn on screen, listed for a parent and checked in a test.
//
// Everything a new world needs is here as data: where its horizon drawings stand, what is up in its
// sky, which of its landmarks reach into which lessons. A new world costs code only when it asks for
// a ground or a path nobody has drawn yet, and those are listed as kinds in engine/space.ts with the
// rest of what a page draws of a world.
//
// Colours are markers from the palette and nothing else. A world cannot bring a colour of its own,
// which is the first of the rules in check.ts that stop a world making a question harder to read.
import type { Marker } from "../../engine/paper";
import type { Weather, WorldPicture } from "../../engine/space";

/**
 * A landmark or creature that belongs beside a particular kind of lesson: the market stall beside the
 * day about money, the clock tower beside the day about quarter past. `when` names what the lesson
 * holds: `art:clock` for a drawing its questions use, `skill:money` for a skill they work (a prefix
 * is enough), `subject:physics` for its track. `says` is the line written beside it, which a child
 * reads, so it is short.
 */
export interface Reach {
    art: string;
    when: string[];
    says: string;
}

/**
 * Where a world stands in the school. A term world is one term of one year (grade 0 is the
 * kindergarten year and 5 the fifth); a choice is a world a family may put in one of `terms` instead
 * of that term's own; a track place is somewhere a track's lessons bring a child to in any year, the
 * way the park holds the music lessons. `land` is for the map (.docs/overworld.md): the ground the
 * world needs under it, and the worlds it stands beside, the first of them the one it is placed by.
 */
export type Site = (
    | { kind: "term"; grade: number; term: number }
    | { kind: "choice"; terms: { grade: number; term: number }[] }
    | { kind: "track"; hosts: Hosts }
) & { land: { terrain: string; near: string[] } };

/**
 * The lessons that walk a track place's path: every lesson of these subjects, and these lessons by
 * id besides. `needs` says, for a grown-up and for .docs/overworld.md, what the corpus has yet to
 * write for it, so an empty path is honest rather than filled.
 */
export interface Hosts {
    subjects: string[];
    lessons?: string[];
    /** What its lessons are, in a word or two, where no one subject names them: "sound, light and crystals". */
    label?: string;
    needs?: string;
}

/**
 * A world whole: the half of it that is drawn, declared in engine/space.ts as `WorldPicture` so the
 * pages can draw it without reaching in here, and the half a grown-up reads and chooses from.
 */
export interface World extends Omit<WorldPicture, "motion"> {
    /** One sentence for the grown-up choosing it. */
    about: string;
    /** A few words for the feel of the place, shown to the grown-up beside the name. */
    mood: string;
    /** The line the guide says on arrival. At most eight words, which check.ts holds it to. */
    arrive: string;
    /** The landmarks and creatures that reach into lessons, checked in order for each day. */
    reaches: Reach[];
    /**
     * The creature in the ring of a finished day's stamp on the world's trail, one it offers; the first
     * of its creatures where it names none.
     */
    stamp?: string;
    /** What a grown-up may choose from for this world. Anything outside these is refused. */
    offers: Offers;
    /** Drawings this world would like and does not have, so nobody mistakes the gap for a choice. */
    wants: Want[];
    /** Where it stands, for a world outside the twelve of the run; the twelve stand where DEFAULT_YEARS puts them. */
    site?: Site;
    /** For a world whose year has no lessons yet: what it waits for, in a sentence for a grown-up. */
    needs?: string;
}

export interface Offers {
    landmarks: string[];
    creatures: string[];
    grounds: Marker[];
    guides: string[];
    weather: Weather[];
}

export interface Want {
    what: string;
    why: string;
}

/**
 * What a grown-up changed about one world. Every field is optional: a missing field is the world's
 * own choice, so a family that changed nothing stores nothing, and a world that improves after the
 * family chose it still improves for them.
 */
export interface Tweak {
    guide?: string;
    ground?: Marker;
    weather?: Weather;
    landmarks?: string[];
    creatures?: string[];
    /** Whether the creatures move. Reduced motion wins over this whatever it says. */
    motion?: boolean;
}

/**
 * A child's worlds: the whole of what a family stores for theming. It is small on purpose. It names
 * worlds and drawings by id and holds no colour, no picture and no position, so it cannot break a
 * layout, and a change to a world's art reaches every family that uses it.
 */
export interface WorldChoice {
    v: 1;
    /** The child's display name, which the product already stores, written on the journal. */
    child: string;
    /** Which world each term is in, by grade, only where the family changed the year's own order. */
    terms: Record<string, string[]>;
    /** What was changed, per world id. */
    tweaks: Record<string, Tweak>;
}

/** A world with a family's changes applied and checked: what is actually drawn. */
export interface Applied extends World {
    motion: boolean;
}
