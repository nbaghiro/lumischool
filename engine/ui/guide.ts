// Draws a guide design into its own SVG at a size a page chooses. The design always draws in the
// same 60 by 60 box; this decides how big that box is, how much of the frame round it to show, and
// how many boil frames to stack. Its idle is played by animate.ts with the guide family's motion,
// on the layers the design tags, or not at all.
import "./guide.css";
import { rng } from "../ink/pen";
import { PRINT } from "../paper";
import {
    POSE_LABEL,
    type Detail,
    type GuideAnchors,
    type GuideCtx,
    type GuideDesign,
    type GuideState,
} from "../parts/guide/design";
import { DEFAULTS } from "../parts/drawing";
import { firefly } from "../parts/guide/firefly";
import { bird } from "../parts/guide/guide.bird";
import { dot } from "../parts/guide/guide.dot";
import { glow } from "../parts/guide/guide.glow";
import { hand } from "../parts/guide/guide.hand";
import { snail } from "../parts/guide/guide.snail";
import { stub } from "../parts/guide/guide.stub";
import { GuidePen } from "../parts/guide/kit";
import { animate, type Group, type Playing } from "./animate";
import { readTokens } from "./read-tokens";
import { el, svgSurface } from "./svg";

/** The guide designs, in the order the shelf shows them. */
export const GUIDES: readonly GuideDesign[] = [firefly, glow, hand, stub, bird, snail, dot];

/** A guide's design by its id (GUIDE_IDS in school/worlds/art.ts), the firefly for an id that is none. */
export const designOf = (id: string): GuideDesign => GUIDES.find((g) => g.id === id) ?? firefly;

/**
 * A guide's idle, played by the player with the guide family's motion on the layers its design tags.
 * The motion is passed rather than resolved by id, since guide.firefly on the shelf is the
 * placeholder, whose own line is a bob.
 */
export const guideIdle = (
    on: Group,
    svg: SVGSVGElement,
    d: GuideDesign,
    key?: string | number,
): Playing =>
    on.play(svg, {
        id: `guide.${d.id}`,
        key,
        motion: { anim: DEFAULTS.guide.thing, from: "family", reads: false, still: null },
    });

export interface GuideRenderOptions {
    /** Element whose custom properties give the colours. */
    host?: Element;
    output?: "screen" | "paper";
    /** Screen pixels per guide unit. 1 draws the guide at 3 by 3 squares, which is 60 px at 1x. */
    k?: number;
    /** Visible area in guide units. The box is 0..60; the default leaves room for marks around it. */
    frame?: [number, number, number, number];
    detail?: Detail;
    boil?: boolean;
    seed?: number;
    /** Draw something behind the guide in the same units, for example the thing it points at. */
    under?: (c: GuideCtx<Element>) => void;
}

export interface RenderedGuide {
    svg: SVGSVGElement;
    anchors: GuideAnchors;
}

export const DEFAULT_FRAME: [number, number, number, number] = [-6, -6, 72, 72];

export const detailFor = (k: number): Detail => (k < 1.4 ? "tiny" : k > 3 ? "hero" : "inline");

export function renderGuide(
    d: GuideDesign,
    s: GuideState,
    o: GuideRenderOptions = {},
): RenderedGuide {
    const k = o.k ?? 1;
    const [fx, fy, fw, fh] = o.frame ?? DEFAULT_FRAME;
    const detail = o.detail ?? detailFor(k);
    const paper = o.output === "paper";
    const t = paper ? PRINT : readTokens(o.host);
    const svg = el("svg", {
        viewBox: `${fx} ${fy} ${fw} ${fh}`,
        width: fw * k,
        height: fh * k,
        class: "guide",
        "data-guide": d.id,
        "data-pose": s.pose,
        role: "img",
        "aria-label": `${d.name}, ${POSE_LABEL[s.pose].toLowerCase()}`,
    });
    // Lines and wobble grow with the square root of the scale: a bigger drawing by the same hand,
    // rather than a small drawing blown up. Small drawings get a little extra weight to survive.
    const wob = Math.sqrt(k) / k;
    const line = wob * (detail === "tiny" ? 1.2 : 1);
    const base = o.seed ?? d.seed;
    const ink = svgSurface(`guide.${d.id}`);
    const ctx = (seed: number, frame: number, g: Element): GuideCtx<Element> => ({
        pen: new GuidePen(ink, { seed, t, paper, roughness: 1 }, line, wob),
        ink,
        g,
        t,
        paper,
        detail,
        line,
        wob,
        frame,
        rand: rng(seed),
    });
    if (o.under) o.under(ctx(base + 101, 0, el("g", {}, svg)));
    const frames = o.boil && !paper ? 3 : 1;
    const wrap = frames > 1 ? el("g", { class: "boil boiling" }, svg) : svg;
    // The first frame gives the anchors; the others are the same drawing from other seeds.
    const anchors = d.draw(ctx(base, 0, el("g", {}, wrap)), s);
    for (let f = 1; f < frames; f++) d.draw(ctx(base + f * 7919, f, el("g", {}, wrap)), s);
    return { svg, anchors };
}

/** The player the guides in bars and boxes idle on, calmly, as the sign-in designs have it: one group for the page. */
let calmGroup: Group | null = null;
const calm = (): Group => (calmGroup ??= animate({ intensity: "calm", settle: 16, most: 18 }));

/**
 * A guide in a box, at the box's width, facing left or right into the page as the site's mark has
 * it: its own parts moving on the player, its three-seed boil and a slow float (guide.css), all of
 * which stop when `still`. It needs nothing but the design, so a page's logo is drawn before its
 * heavier pictures.
 */
export function guide(
    host: HTMLElement,
    id: string,
    o: { faces: "left" | "right"; still: boolean },
): void {
    host.classList.add("ag-guide");
    // a guide faces where it looks, and the bird's drawing turns to look left of its middle
    const design = designOf(id);
    const g = renderGuide(
        design,
        { pose: "idle", aim: o.faces === "right" ? [106, 34] : [-46, 34] },
        { host, k: 1, frame: DEFAULT_FRAME, seed: 3307, boil: !o.still },
    );
    g.svg.removeAttribute("role");
    g.svg.removeAttribute("aria-label");
    if (!o.still) guideIdle(calm(), g.svg, design);
    const float = document.createElement("div");
    float.className = "ag-float";
    float.append(g.svg);
    host.replaceChildren(float);
}
