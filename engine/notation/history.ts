// The checkers that prove a history question for every variant from the record of dated events and
// sources in chronicle.ts and from the drawing in the scene, so a date in a picture, the question
// and the key cannot disagree. See .docs/history.md, "How a history question is proved or marked".
import { num, str, type Value } from "../expr";
import { CONTINENTS, PLACES } from "../parts/travel/worldmap";
import { TOWN, squareOf, standsIn } from "../parts/travel/townmap";
import type { Opt } from "../scene";
import { DOCUMENTS, entryFor, spanOf, type Entry } from "./chronicle";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

type Got = { number: number } | { word: string } | { problem: string };
type Params = Record<string, unknown>;
type Ask = (p: Params, arg: string, scene: SceneInstance) => Got;
interface Read {
    c: Concrete;
    p: Params;
}
const NODES = new WeakMap<Params, Read[]>();
/** The nodes `of` named, in its order, which every ask can read beside the first node's settings. */
const nodesIn = (p: Params): Read[] => NODES.get(p) ?? [];

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");
const n = (x: unknown): number => (typeof x === "number" ? x : Number(x));
const words = (x: unknown): string[] =>
    Array.isArray(x) ? x.map((w) => (typeof w === "string" ? w : String(w))) : [];
const numbers = (x: unknown): number[] => (Array.isArray(x) ? x.map(n) : []);

/** The options a choice or a word box offers, or null for a node that offers none. */
function optionsOf(c: Concrete | undefined): Opt[] | null {
    if (c?.type !== "choice" && c?.type !== "word-input") return null;
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
}

/** A result as the answer the item's input takes: a number for a box, or the one option whose words say it. */
function bind(scene: SceneInstance, name: string, got: Got): { v: Value } | { problem: string } {
    if ("problem" in got) return got;
    const options = optionsOf(node(scene, name));
    if (options) {
        const want = "word" in got ? plain(got.word) : String(got.number);
        const hits = options.filter((o) => plain(o.label) === want || plain(o.value) === want);
        const [hit] = hits;
        if (hits.length !== 1 || !hit)
            return {
                problem: `the record comes to "${want}", and ${hits.length ? "more than one" : "none"} of ${name}'s options (${options.map((o) => o.label).join(", ")}) says that`,
            };
        return { v: hit.kind === "num" ? num(Number(hit.value)) : str(hit.value) };
    }
    if ("word" in got)
        return {
            problem: `${name} is a box for a number, and the record comes to the words "${got.word}"`,
        };
    return Number.isInteger(got.number)
        ? { v: num(got.number) }
        : { problem: `the record comes to ${got.number}, which is not a whole number` };
}

/**
 * One checker over drawings of one kind: `of` names one node, or several separated by spaces, and
 * every other setting binds an answer to something the checker works out from them.
 */
function checker(
    doc: string,
    types: readonly string[],
    asks: Record<string, Ask>,
    read?: (nodes: Read[]) => string[],
): CodeChecker {
    return {
        doc,
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of"),
        solutions: (settings) => [
            `worked out for each variant from ${settings.of ?? "the drawing"} and the dated record`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const ids = (settings.of ?? "").split(/\s+/).filter(Boolean);
            const nodes: Read[] = [];
            for (const id of ids) {
                const c = node(scene, id);
                if (!c) problems.push(`there is no ${id} in the scene`);
                else if (!types.includes(c.type))
                    problems.push(
                        `${id} is a ${c.type}, and this checker reads ${types.join(" or ")}`,
                    );
                else nodes.push({ c, p: { ...c.v, ...partParams(c.type, c.v) } });
            }
            if (problems.length || !nodes.length)
                return { answers, problems: problems.length ? problems : ["of= names no node"] };
            if (read) problems.push(...read(nodes));
            const [first] = nodes;
            const p: Params = nodes.length === 1 && first ? { ...first.p } : {};
            NODES.set(p, nodes);
            for (const [name, want] of Object.entries(settings)) {
                if (name === "of") continue;
                const m = /^([a-z-]+)(?:\((.*)\))?$/.exec(want.trim());
                const [, what = "", arg = ""] = m ?? [];
                const ask = asks[what];
                if (!m || !ask) {
                    problems.push(
                        `${name}=${want} is not something this checker works out; it knows ${Object.keys(asks).join(", ")}`,
                    );
                    continue;
                }
                const got = bind(scene, name, ask(p, arg.trim(), scene));
                if ("problem" in got) problems.push(got.problem);
                else answers[name] = got.v;
            }
            return { answers, problems };
        },
    };
}

// Years. A year below nought is that many years BC, and there is no year nought.

/** The years from one year to a later one, counting across year one with no year nought. */
export const yearsBetween = (a: number, b: number): number => {
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return hi - lo - (lo < 0 && hi > 0 ? 1 : 0);
};

/** The century a year is in, counted from 1 on either side of year one: 1666 is the 17th, 500 BC the 5th BC. */
export const centuryOf = (y: number): number => Math.floor((Math.abs(y) - 1) / 100) + 1;

const ordinal = (k: number): string => {
    const t = k % 100;
    const end = t >= 11 && t <= 13 ? "th" : (["th", "st", "nd", "rd"][k % 10] ?? "th");
    return `${k}${end}`;
};
export const centuryName = (y: number): string =>
    `${ordinal(centuryOf(y))} century${y < 0 ? " BC" : ""}`;

// Events: a timeline's flags, a sequence's rows, a choice's options or object cards, each looked up
// in the record by the words it is written in.

interface Named {
    label: string;
    entry: Entry;
}

const labelsOf = (c: Concrete, p: Params): string[] => {
    if (c.type === "timeline") return words(p.labels);
    if (c.type === "objectcard") return [String(p.name)];
    const x = c.type === "sequence" ? c.v.items : c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null && "label" in o ? [o.label] : []))
        : [];
};

/** Every event the nodes name, in the order they are drawn, or what stops one being read. */
function eventsOf(nodes: Read[]): { events: Named[]; problems: string[] } {
    const events: Named[] = [];
    const problems: string[] = [];
    for (const { c, p } of nodes) {
        const drawn =
            c.type === "timeline" ? numbers(p.years) : c.type === "objectcard" ? [n(p.year)] : [];
        labelsOf(c, p).forEach((label, i) => {
            const entry = entryFor(label);
            if (!entry) {
                problems.push(
                    `"${label}" is not in the dated record (engine/notation/chronicle.ts), so its date has no source`,
                );
                return;
            }
            const at = drawn[i];
            const [lo, hi] = spanOf(entry);
            if (at !== undefined && (at < lo || at > hi))
                problems.push(
                    `${c.id} puts "${label}" at ${at}, and the record gives ${lo === hi ? lo : `${lo} to ${hi}`}`,
                );
            events.push({ label, entry });
        });
    }
    return { events, problems };
}

const eventsIn = (p: Params): Named[] => eventsOf(nodesIn(p)).events;

function at(events: Named[], arg: string): Named | string {
    const i = Number(arg);
    const e = Number.isInteger(i) ? events[i] : undefined;
    return e ?? `there is no event ${arg}: the drawing names ${events.length}`;
}

/** The one year an event can be asked about, or why it cannot. */
function exact(e: Named): number | string {
    const [lo, hi] = spanOf(e.entry);
    if (e.entry.about || lo !== hi)
        return `"${e.label}" is dated ${e.entry.about ? "about " : ""}${lo === hi ? lo : `${lo} to ${hi}`}, and a question may not ask for it exactly`;
    return lo;
}

/** -1 when a is wholly before b, 1 when wholly after, or why the record cannot tell. */
function compare(a: Named, b: Named): number | string {
    const [alo, ahi] = spanOf(a.entry);
    const [blo, bhi] = spanOf(b.entry);
    // two spans that meet at one year, as one age ending where the next begins, are still in order
    if (ahi < blo || (ahi === blo && alo < ahi && blo < bhi)) return -1;
    if (bhi < alo || (bhi === alo && blo < bhi && alo < ahi)) return 1;
    return `"${a.label}" and "${b.label}" overlap in the record, so neither is before the other`;
}

/** The events from earliest to latest, or why they cannot be put in order. */
function ordered(events: Named[]): Named[] | string {
    for (let i = 0; i < events.length; i++)
        for (let j = i + 1; j < events.length; j++) {
            const a = events[i],
                b = events[j];
            if (!a || !b) continue;
            const k = compare(a, b);
            if (typeof k === "string") return k;
        }
    return [...events].sort((a, b) => spanOf(a.entry)[0] - spanOf(b.entry)[0]);
}

const withEvent =
    (f: (e: Named, all: Named[], p: Params) => Got): Ask =>
    (p, arg) => {
        const all = eventsIn(p);
        const e = at(all, arg);
        return typeof e === "string" ? { problem: e } : f(e, all, p);
    };

const withYear = (f: (y: number) => Got): Ask =>
    withEvent((e) => {
        const y = exact(e);
        return typeof y === "string" ? { problem: y } : f(y);
    });

/** For a century, a span or an "about" date will do when all of it lies in one century. */
const withCentury = (f: (y: number) => Got): Ask =>
    withEvent((e) => {
        const [lo, hi] = spanOf(e.entry);
        return centuryOf(lo) === centuryOf(hi) && Math.sign(lo) === Math.sign(hi)
            ? f(lo)
            : { problem: `"${e.label}" runs from ${lo} to ${hi}, across two centuries` };
    });

const DATE_ASKS: Record<string, Ask> = {
    year: withYear((y) => ({ number: Math.abs(y) })),
    era: withYear((y) => ({ word: y < 0 ? "BC" : "AD" })),
    "year-name": withYear((y) => ({ word: y < 0 ? `${-y} BC` : `AD ${y}` })),
    century: withCentury((y) => ({ number: centuryOf(y) })),
    "century-name": withCentury((y) => ({ word: centuryName(y) })),
    decade: withYear((y) => ({ number: y - (((y % 10) + 10) % 10) })),
    "decade-name": withYear((y) => ({ word: `${y - (((y % 10) + 10) % 10)}s` })),
    label: withEvent((e) => ({ word: e.label })),
    between: (p, arg) => {
        const all = eventsIn(p);
        const [a = "", b = ""] = arg.split(/\s+/);
        const x = at(all, a),
            y = at(all, b);
        if (typeof x === "string") return { problem: x };
        if (typeof y === "string") return { problem: y };
        const ya = exact(x),
            yb = exact(y);
        if (typeof ya === "string") return { problem: ya };
        if (typeof yb === "string") return { problem: yb };
        return { number: yearsBetween(ya, yb) };
    },
    before: (p, arg) => {
        const all = eventsIn(p);
        const [a = "", b = ""] = arg.split(/\s+/);
        const x = at(all, a),
            y = at(all, b);
        if (typeof x === "string") return { problem: x };
        if (typeof y === "string") return { problem: y };
        const k = compare(x, y);
        return typeof k === "string" ? { problem: k } : { word: k < 0 ? "yes" : "no" };
    },
    rank: withEvent((e, all) => {
        const o = ordered(all);
        return typeof o === "string" ? { problem: o } : { number: o.indexOf(e) + 1 };
    }),
    first: (p) => {
        const o = ordered(eventsIn(p));
        return typeof o === "string" ? { problem: o } : { word: o[0]?.label ?? "" };
    },
    last: (p) => {
        const o = ordered(eventsIn(p));
        return typeof o === "string" ? { problem: o } : { word: o[o.length - 1]?.label ?? "" };
    },
    after: (p, arg) => {
        const year = Number(arg);
        if (!Number.isInteger(year)) return { problem: `after(${arg}) needs a year` };
        const later: Named[] = [];
        for (const e of eventsIn(p)) {
            const [lo, hi] = spanOf(e.entry);
            if (lo > year) later.push(e);
            else if (hi > year)
                return {
                    problem: `"${e.label}" is dated ${lo} to ${hi}, which runs across ${year}`,
                };
        }
        const [one] = later;
        return later.length === 1 && one
            ? { word: one.label }
            : { problem: `${later.length} of the events come after ${year}, not one` };
    },
    blank: (p) => {
        const tl = nodesIn(p).find((x) => x.c.type === "timeline");
        const i = tl ? Math.round(n(tl.p.blank)) : -1;
        const label = tl ? words(tl.p.labels)[i] : undefined;
        return label ? { word: label } : { problem: "the timeline leaves no label blank" };
    },
};

// A street then and now: which thing could not have been there in the sign's year.

/** A thing's first year must be at least this far from the street's year to be sure either way. */
const MARGIN = 10;

function streetThings(p: Params): { name: string; entry: Entry }[] | string {
    const out: { name: string; entry: Entry }[] = [];
    for (const name of words(p.things)) {
        const entry = entryFor(name);
        if (!entry)
            return `"${name}" is not in the dated record, so when it first appeared has no source`;
        out.push({ name, entry });
    }
    return out;
}

const tooNew = (entry: Entry, year: number): boolean | string => {
    const [lo, hi] = spanOf(entry);
    if (lo - year >= MARGIN) return true;
    if (year - hi >= MARGIN) return false;
    return `a street in ${year} is too close to when it first appeared (${lo === hi ? lo : `${lo} to ${hi}`}) to be sure`;
};

const STREET_ASKS: Record<string, Ask> = {
    "could-not": (p) => {
        const things = streetThings(p);
        if (typeof things === "string") return { problem: things };
        const year = Math.round(n(p.year));
        const out: string[] = [];
        for (const t of things) {
            const k = tooNew(t.entry, year);
            if (typeof k === "string") return { problem: `the ${t.name}: ${k}` };
            if (k) out.push(t.name);
        }
        const [one] = out;
        return out.length === 1 && one
            ? { word: one }
            : {
                  problem: `${out.length ? out.join(" and ") : "nothing"} could not have been there in ${year}, not one thing`,
              };
    },
    "how-many-new": (p) => {
        const things = streetThings(p);
        if (typeof things === "string") return { problem: things };
        const year = Math.round(n(p.year));
        let count = 0;
        for (const t of things) {
            const k = tooNew(t.entry, year);
            if (typeof k === "string") return { problem: `the ${t.name}: ${k}` };
            if (k) count++;
        }
        return { number: count };
    },
    "could-be": (p, arg, scene) => {
        const things = streetThings(p);
        if (typeof things === "string") return { problem: things };
        const years = (optionsOf(node(scene, arg)) ?? []).map((o) => Number(o.value));
        if (!years.length) return { problem: `could-be(${arg}) names a choice of years` };
        const fit: number[] = [];
        for (const y of years) {
            let ok = true;
            for (const t of things) {
                const k = tooNew(t.entry, y);
                if (typeof k === "string") return { problem: `in ${y}, the ${t.name}: ${k}` };
                if (k) ok = false;
            }
            if (ok) fit.push(y);
        }
        const [one] = fit;
        return fit.length === 1 && one !== undefined
            ? { number: one }
            : { problem: `${fit.length} of the years fit everything in the street, not one` };
    },
    newest: (p) => {
        const things = streetThings(p);
        if (typeof things === "string") return { problem: things };
        const o = ordered(things.map((t) => ({ label: t.name, entry: t.entry })));
        return typeof o === "string" ? { problem: o } : { word: o[o.length - 1]?.label ?? "" };
    },
    oldest: (p) => {
        const things = streetThings(p);
        if (typeof things === "string") return { problem: things };
        const o = ordered(things.map((t) => ({ label: t.name, entry: t.entry })));
        return typeof o === "string" ? { problem: o } : { word: o[0]?.label ?? "" };
    },
};

// Sources: whether a source card's maker was there, read from the record of that source.

function checkCards(nodes: Read[]): string[] {
    const problems: string[] = [];
    for (const { c, p } of nodes) {
        const title = String(p.title);
        const d = DOCUMENTS.find((x) => x.title === title);
        if (!d) {
            problems.push(`${c.id}'s source "${title}" is not in the record of sources`);
            continue;
        }
        for (const k of ["who", "when", "where"] as const)
            if (String(p[k]) !== d[k])
                problems.push(`${c.id} says ${k} "${String(p[k])}", and the record says "${d[k]}"`);
        if (Math.round(n(p.there)) !== d.there)
            problems.push(
                `${c.id} says the maker ${d.there ? "was not" : "was"} there, and the record says otherwise`,
            );
    }
    return problems;
}

const cardsIn = (p: Params): Params[] => nodesIn(p).map((x) => x.p);
const recordOf = (p: Params) => DOCUMENTS.find((d) => d.title === String(p.title));

const SOURCE_ASKS: Record<string, Ask> = {
    hand: (p) => {
        const d = recordOf(p);
        return d
            ? { word: d.there ? "First-hand" : "Second-hand" }
            : { problem: "the source is not in the record" };
    },
    there: (p) => {
        const d = recordOf(p);
        return d
            ? { word: d.there ? "yes" : "no" }
            : { problem: "the source is not in the record" };
    },
    "the-first-hand": (p) => {
        const there = cardsIn(p).filter((x) => recordOf(x)?.there === 1);
        const [one] = there;
        return there.length === 1 && one
            ? { word: String(one.title) }
            : {
                  problem: `${there.length} of the sources were made by someone who was there, not one`,
              };
    },
    "the-second-hand": (p) => {
        const not = cardsIn(p).filter((x) => recordOf(x)?.there === 0);
        const [one] = not;
        return not.length === 1 && one
            ? { word: String(one.title) }
            : {
                  problem: `${not.length} of the sources were made by someone who was not there, not one`,
              };
    },
    "first-hand-count": (p) => ({
        number: cardsIn(p).filter((x) => recordOf(x)?.there === 1).length,
    }),
};

// The town's map, the world map, a family tree and a council's vote.

const townPlace = (arg: string) => TOWN.find((t) => t.name === plain(arg));

const TOWN_ASKS: Record<string, Ask> = {
    square: (_p, arg) => {
        const t = townPlace(arg);
        return t ? { word: squareOf(t) } : { problem: `the town has no ${arg}` };
    },
    stands: (p, arg) => {
        const t = townPlace(arg);
        return t
            ? { word: standsIn(t, Math.round(n(p.year))) ? "yes" : "no" }
            : { problem: `the town has no ${arg}` };
    },
    in: (p, arg) => {
        const sq = arg.toUpperCase();
        const t = TOWN.find((x) => squareOf(x) === sq && standsIn(x, Math.round(n(p.year))));
        return t
            ? { word: t.name }
            : { problem: `nothing stands in ${sq} in ${Math.round(n(p.year))}` };
    },
    count: (p) => ({ number: TOWN.filter((t) => standsIn(t, Math.round(n(p.year)))).length }),
    "new-since": (p, arg) => {
        const then = Number(arg),
            now = Math.round(n(p.year));
        if (!Number.isInteger(then)) return { problem: `new-since(${arg}) needs a year` };
        return { number: TOWN.filter((t) => standsIn(t, now) && !standsIn(t, then)).length };
    },
    "gone-since": (p, arg) => {
        const then = Number(arg),
            now = Math.round(n(p.year));
        const gone = TOWN.filter((t) => standsIn(t, then) && !standsIn(t, now));
        const [one] = gone;
        return gone.length === 1 && one
            ? { word: one.name }
            : { problem: `${gone.length} places went between ${then} and ${now}, not one` };
    },
    first: (_p, arg) => {
        const [a = "", b = ""] = arg.split(/\s*,\s*/);
        const x = townPlace(a),
            y = townPlace(b);
        if (!x || !y)
            return { problem: `first(${arg}) names two places of the town, with a comma between` };
        if (x.from === y.from)
            return { problem: `${x.name} and ${y.name} were built in the same year` };
        return { word: x.from < y.from ? x.name : y.name };
    },
    "years-standing": (p, arg) => {
        const t = townPlace(arg),
            year = Math.round(n(p.year));
        if (!t) return { problem: `the town has no ${arg}` };
        return standsIn(t, year)
            ? { number: year - t.from }
            : { problem: `the ${t.name} does not stand in ${year}` };
    },
    built: (_p, arg) => {
        const t = townPlace(arg);
        return t ? { number: t.from } : { problem: `the town has no ${arg}` };
    },
};

const WORLD_ASKS: Record<string, Ask> = {
    on: (p, arg) => {
        const name = words(p.places)[Number(arg)];
        const place = name ? PLACES[name] : undefined;
        return place ? { word: place.on } : { problem: `there is no place ${arg} on the map` };
    },
    blank: (p) => {
        const c = CONTINENTS[Math.round(n(p.blank))];
        return c ? { word: c } : { problem: "the map leaves no continent blank" };
    },
    letter: (_p, arg) => {
        const i = CONTINENTS.findIndex((c) => plain(c) === plain(arg));
        return i < 0
            ? { problem: `${arg} is not one of the seven continents` }
            : { word: "ABCDEFG".charAt(i) };
    },
    continent: (_p, arg) => {
        const i = "ABCDEFG".indexOf(arg.toUpperCase());
        const c = CONTINENTS[i];
        return c ? { word: c } : { problem: `continent(${arg}) takes a letter from A to G` };
    },
    count: (p, arg) => ({ number: words(p.places).filter((x) => PLACES[x]?.on === arg).length }),
};

const FAMILY_ASKS: Record<string, Ask> = {
    year: (p, arg) => {
        const y = numbers(p.years)[Number(arg)];
        return y ? { number: y } : { problem: `there is no year for person ${arg}` };
    },
    age: (p, arg) => {
        const [a = "", b = ""] = arg.split(/\s+/);
        const ys = numbers(p.years),
            ya = ys[Number(a)],
            yb = ys[Number(b)];
        if (!ya || !yb) return { problem: `age(${arg}) needs two people with years` };
        return yb >= ya
            ? { number: yb - ya }
            : { problem: `person ${b} was born before person ${a}` };
    },
    oldest: (p) => {
        const ys = numbers(p.years),
            ns = words(p.names);
        const best = Math.min(...ys.filter((y) => y > 0));
        const who = ns.filter((_x, i) => ys[i] === best);
        const [one] = who;
        return who.length === 1 && one
            ? { word: one }
            : { problem: "two people share the earliest year" };
    },
};

const COUNCIL_ASKS: Record<string, Ask> = {
    for: (p) => ({ number: numbers(p.hands).filter((h) => Math.round(h) === 1).length }),
    against: (p) => ({ number: numbers(p.hands).filter((h) => Math.round(h) === 0).length }),
    passes: (p) => {
        const hs = numbers(p.hands),
            yes = hs.filter((h) => Math.round(h) === 1).length;
        if (yes * 2 === hs.length)
            return { problem: "the vote is a tie, which the council's rules would have to settle" };
        return { word: yes * 2 > hs.length ? "yes" : "no" };
    },
    needed: (p) => ({ number: Math.floor(numbers(p.hands).length / 2) + 1 }),
    more: (p) => {
        const hs = numbers(p.hands),
            yes = hs.filter((h) => Math.round(h) === 1).length;
        return { number: Math.max(0, Math.floor(hs.length / 2) + 1 - yes) };
    },
};

const readEvents = (nodes: Read[]): string[] => eventsOf(nodes).problems;
export const HISTORY: Record<string, CodeChecker> = {
    "history.dates": checker(
        "Works out a question about dates from the events a timeline, a sequence, a choice or object cards name (`of` one node or several), each looked up in the dated record in chronicle.ts, which refuses an event it does not hold or a drawn year that disagrees with it: `year(0)` the year of the first event named (written without BC), `era(0)` BC or AD, `year-name(0)` the year as it is written (55 BC, AD 43), `century(0)` and `century-name(0)` its century (17th century, 5th century BC), `decade(0)` and `decade-name(0)` (the 1960s), `between(0 2)` the years from one to another across year one with no year nought, `before(0 1)` yes or no, `rank(2)` where an event comes when all are put in order from the earliest, `first` and `last` the earliest and latest, `after(1960)` the one event wholly after a year, `label(1)` an event's words, and `blank` the timeline's empty label. A date the record gives as about or as a span is never asked exactly, and events whose spans overlap are never put in order.",
        ["timeline", "sequence", "choice", "objectcard"],
        DATE_ASKS,
        readEvents,
    ),
    "history.street": checker(
        "Works out which things in a street then and now (`of` a thenandnow drawing) could have been there in the year on its sign, from the year the record says each first appeared: `could-not` the one thing that could not have been there, `how-many-new` how many could not, `could-be(pick)` the one year among a choice's options that every thing in the street fits, and `newest` and `oldest`. A thing that first appeared within ten years of the street's year is refused as too close to be sure.",
        ["thenandnow"],
        STREET_ASKS,
    ),
    "history.sources": checker(
        "Works out from the record of sources whether a source card's maker was there (`of` one card or several), and refuses a card whose who, when, where or were-they-there rows disagree with the record: `hand` First-hand or Second-hand, `there` yes or no, `the-first-hand` and `the-second-hand` the title of the one card among several that is, and `first-hand-count` how many are.",
        ["sourcecard"],
        SOURCE_ASKS,
        checkCards,
    ),
    "history.town": checker(
        "Works out a question about the town's map (`of` a townmap), from the year each place was built and went: `square(church)` the square it is in, `stands(mill)` yes or no in the map's year, `in(C2)` what stands in a square, `count` how many places stand, `new-since(1850)` how many stand now that did not then, `gone-since(1850)` the one place that went, `built(school)` the year it was built, `first(school, station)` which of two was built first, and `years-standing(church)` how many years it had stood by the map's year.",
        ["townmap"],
        TOWN_ASKS,
    ),
    "history.world": checker(
        "Works out a question about the world map (`of` a worldmap): `on(1)` the continent the second place marked is on, `blank` the continent left unnamed, `letter(Africa)` the letter a continent has, `continent(C)` the continent a letter names, and `count(Asia)` how many marked places are on a continent.",
        ["worldmap"],
        WORLD_ASKS,
    ),
    "history.family": checker(
        "Works out a question about a family tree (`of` a familytree): `year(4)` the year a person was born, `age(0 6)` how old the first was when the second was born, and `oldest` the name of the one born first.",
        ["familytree"],
        FAMILY_ASKS,
    ),
    "history.vote": checker(
        "Works out a council's vote from the hands up (`of` a council): `for` and `against`, `passes` yes or no when more are for than against (a tie is refused), `needed` the fewest votes that are more than half, and `more` how many more hands it needed.",
        ["council"],
        COUNCIL_ASKS,
    ),
};
