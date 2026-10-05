// The sign-in screens as the web draws them on a phone (engine/ui/page.css, postcard.css): the bar with
// the mark and the Grown-ups and Kids choice, the map under the card's column and the strip below it,
// each step's postcard taped over it, and the footnotes. The sizes are the web's CSS pixels at a
// phone's width, and the pictures are the web's own (art.ts). Keep it in step with those files.

import { router } from "expo-router";
import type { ReactNode } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DRAWINGS, MAPS, MARGIN, MADE_AT, type Art } from "./art";
import { COLOR, FONT, Snug, TOUCH, type Setting } from "./ui";

export type MapName = keyof typeof MAPS;
export type StampName = keyof typeof DRAWINGS & `stamp-${string}`;

/** The footnotes under a grown-up's step and under the children's card (apps/home/sign-in.tsx, kid-sign-in.tsx). */
export const GROWN_FOOT = [
    "No passwords. A code works for ten minutes.",
    "Children use a username and kids’ PIN set by their grown-up. No email address needed.",
];
export const KID_FOOT = [
    "A grown-up sets up your username and kids’ PIN. You do not need an email address.",
];

/** Which card the bar's choice shows as chosen; null leaves the choice out, as /start does. */
export type Who = "grown-ups" | "kids" | null;

/** A drawing in a box of the web's size, its picture reaching `MARGIN` past it as the web lets it. */
function Drawn(props: { art: Art; width: number; height: number }): ReactNode {
    const { art } = props;
    return (
        <View style={{ width: props.width, height: props.height }} pointerEvents="none">
            <Image
                source={art.source}
                style={{
                    position: "absolute",
                    left: -MARGIN,
                    top: -MARGIN,
                    width: art.width,
                    height: art.height,
                }}
                accessibilityIgnoresInvertColors
            />
        </View>
    );
}

/**
 * The bar: the mark on the left and, while nobody is signed in, who is signing in on the right, or
 * what a signed-in screen puts there.
 */
export function Bar(props: { who: Who; right?: ReactNode }): ReactNode {
    const pick = (kids: boolean): void => {
        if (kids === (props.who === "kids")) return;
        if (kids) router.push("/kid");
        else if (router.canGoBack()) router.back();
        else router.replace("/sign-in");
    };
    return (
        <View style={s.bar}>
            <View accessibilityRole="image" accessibilityLabel="lumischool">
                <Drawn art={DRAWINGS.mark} width={MARK.width} height={MARK.height} />
            </View>
            {props.who === null ? (
                <View style={s.right}>{props.right}</View>
            ) : (
                <View style={s.choices} accessibilityLabel="Who is signing in?">
                    {(["grown-ups", "kids"] as const).map((who) => {
                        const on = props.who === who;
                        return (
                            <Pressable
                                key={who}
                                accessibilityRole="button"
                                accessibilityState={{ selected: on }}
                                onPress={() => pick(who === "kids")}
                                style={[s.choice, on ? s.choiceOn : null]}
                            >
                                <Text style={[s.choiceText, on ? s.choiceTextOn : null]}>
                                    {who === "kids" ? "Kids" : "Grown-ups"}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

/** The mark's box in the bar at a phone's width (mark.css under 420 px). */
const MARK = { width: 144.8, height: 44 };

/**
 * A sign-in screen: the bar, then the cards over the map, which runs from the top of the cards'
 * column to the foot of the strip under them and fades into the desk there, then the footnotes.
 */
export function AuthPage(props: {
    map: MapName;
    who: Who;
    foot: readonly string[];
    /** What the bar holds on the right on a signed-in screen, such as a way back. */
    right?: ReactNode;
    children: ReactNode;
}): ReactNode {
    const safe = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const map = MAPS[props.map];
    const mapHeight = (map.height * width) / MADE_AT;
    // the strip of map a phone shows under the cards: clamp(300px, 84vw, 380px) in page.css
    const strip = Math.min(380, Math.max(300, width * 0.84));
    return (
        <View style={[s.page, { paddingTop: safe.top }]}>
            <ScrollView
                style={s.page}
                contentContainerStyle={{ paddingBottom: safe.bottom }}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                <Bar who={props.who} right={props.right} />
                <View style={{ minHeight: mapHeight }}>
                    <Image
                        source={map.source}
                        style={[s.map, { width, height: mapHeight }]}
                        accessibilityIgnoresInvertColors
                    />
                    <View style={s.main}>{props.children}</View>
                    <View style={{ height: strip }} />
                </View>
                <View style={s.foot}>
                    {props.foot.map((line) => (
                        <Snug key={line} setting={SET.foot}>
                            {line}
                        </Snug>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

/** A card's stamp, standing a little askew in the card's corner. */
function Stamp(props: { name: StampName; width: number; height: number }): ReactNode {
    return (
        <View style={s.stamp}>
            <Drawn art={DRAWINGS[props.name]} width={props.width} height={props.height} />
        </View>
    );
}

function Tape(props: { right?: boolean }): ReactNode {
    return (
        <View style={[s.tape, props.right === true ? s.tapeRight : s.tapeLeft]}>
            <Drawn art={DRAWINGS.tape} width={92} height={28} />
        </View>
    );
}

/**
 * A postcard as a phone shows it: the message, then under a pencil rule the address side, then the
 * links, with the stamp in the top corner. A `note` is untaped and has no address.
 */
export function Postcard(props: {
    kicker: string;
    title: string;
    lead?: string;
    stamp?: StampName;
    address?: ReactNode;
    links?: ReactNode;
    note?: boolean;
    children?: ReactNode;
}): ReactNode {
    return (
        <View style={s.card}>
            {props.note === true ? null : (
                <>
                    <Tape />
                    <Tape right />
                </>
            )}
            <View style={s.msg}>
                <Snug setting={SET.kicker}>{props.kicker}</Snug>
                <Snug setting={SET.title} heading>
                    {props.title}
                </Snug>
                {props.lead === undefined ? null : <Snug setting={SET.lead}>{props.lead}</Snug>}
                {props.children}
            </View>
            {props.address === undefined ? null : (
                <>
                    <View style={s.rule} />
                    <View style={s.addr}>{props.address}</View>
                </>
            )}
            {/* the grid keeps the links' row, and the gap above it, when there are none */}
            <View>{props.links}</View>
            {props.stamp === undefined ? null : (
                <View style={s.corner} pointerEvents="none">
                    <Stamp name={props.stamp} width={62} height={78} />
                </View>
            )}
        </View>
    );
}

/** A line written on the card by hand, in the teacher's blue. */
export function Ps(props: { children: string }): ReactNode {
    return <Snug setting={SET.ps}>{props.children}</Snug>;
}

/** Who the card is addressed to, on the address side. */
export function To(props: { who: string }): ReactNode {
    return (
        <View>
            <Snug setting={SET.label}>To</Snug>
            <View style={s.toWho}>
                <Snug setting={SET.who}>{props.who}</Snug>
            </View>
        </View>
    );
}

/** The cards that choose a family, under the note that asks which. */
export function Stack(props: { children: ReactNode }): ReactNode {
    return <View style={s.stack}>{props.children}</View>;
}

/** A card addressed to one family, to choose it: its name, what the person is there, and a stamp. */
export function Addressed(props: {
    name: string;
    line: string;
    stamp: StampName;
    busy: boolean;
    onChoose: () => void;
}): ReactNode {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${props.name}. ${props.line}`}
            accessibilityState={{ busy: props.busy }}
            onPress={() => {
                if (!props.busy) props.onChoose();
            }}
            style={s.choiceCard}
        >
            <View style={s.choiceWords}>
                <Snug setting={SET.name}>{props.name}</Snug>
                <Snug setting={SET.line}>{props.line}</Snug>
            </View>
            <View style={s.choiceCorner}>
                <Stamp name={props.stamp} width={58} height={72} />
            </View>
        </Pressable>
    );
}

// color-mix(in srgb, var(--ink) 22%, var(--card)), the pencil rule
const RULE = "#cecfd1";
// color-mix(in srgb, var(--ink) 30%, var(--card)), the line a card is addressed on
const ADDRESS_LINE = "#bdbec0";

/** The type on a card, as postcard.css and page.css set it. */
const SET = {
    kicker: {
        font: FONT.mono,
        size: 11,
        line: 14.3,
        color: COLOR.inkSoft,
        letterSpacing: 1.54,
        upper: true,
    },
    title: { font: FONT.title, size: 22, line: 22, color: COLOR.ink, letterSpacing: -0.33 },
    lead: { font: FONT.read, size: 15.5, line: 23.25, color: COLOR.inkSoft },
    ps: { font: FONT.note, size: 16, line: 23.2, color: COLOR.pen },
    label: {
        font: FONT.mono,
        size: 10.5,
        line: 12.6,
        color: COLOR.inkSoft,
        letterSpacing: 1.26,
        upper: true,
    },
    who: { font: FONT.hand, size: 19, line: 22.8, color: COLOR.ink },
    name: { font: FONT.name, size: 28, line: 30.8, color: COLOR.ink },
    line: { font: FONT.read, size: 15.5, line: 21.7, color: COLOR.ink },
    foot: { font: FONT.read, size: 14, line: 22.4, color: COLOR.inkSoft, center: true },
} as const satisfies Record<string, Setting>;

const s = StyleSheet.create({
    page: { flex: 1, backgroundColor: COLOR.paper },
    bar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 62,
        paddingHorizontal: 12,
        backgroundColor: COLOR.paper,
        zIndex: 3,
    },
    choices: { flexDirection: "row", gap: 6, marginLeft: "auto" },
    right: { marginLeft: "auto" },
    choice: {
        minHeight: TOUCH,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 10,
        backgroundColor: COLOR.card,
    },
    choiceOn: { backgroundColor: COLOR.ink },
    choiceText: { fontFamily: FONT.readBold, fontSize: 14.5, color: COLOR.ink },
    choiceTextOn: { color: COLOR.card },
    map: { position: "absolute", top: 0, left: 0 },
    main: { paddingTop: 40, paddingHorizontal: 16 },
    foot: { alignItems: "center", gap: 2, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 18 },
    // `scale: 0.97` from the top centre, as page.css lowers an auth card on a phone
    card: {
        gap: 16,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: COLOR.card,
        borderRadius: 5,
        boxShadow: "0 1px 2px rgba(34, 38, 46, 0.18), 0 18px 36px -20px rgba(34, 38, 46, 0.42)",
        transform: [{ scale: 0.97 }],
        transformOrigin: "50% 0%",
    },
    tape: {
        position: "absolute",
        top: -14,
        width: 92,
        height: 28,
        opacity: 0.62,
        mixBlendMode: "multiply",
    },
    tapeLeft: { left: -20, transform: [{ rotate: "-7deg" }] },
    tapeRight: { right: -20, transform: [{ rotate: "6deg" }] },
    msg: { gap: 10, paddingRight: 86 },
    rule: { height: 1.5, borderRadius: 1, backgroundColor: RULE },
    addr: { gap: 10 },
    corner: { position: "absolute", top: 14, right: 14 },
    stamp: { transform: [{ rotate: "3deg" }] },
    toWho: {
        paddingTop: 6,
        paddingHorizontal: 2,
        paddingBottom: 4,
        borderBottomWidth: 1.5,
        borderBottomColor: ADDRESS_LINE,
    },
    stack: { gap: 14, marginTop: 22 },
    choiceCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 22,
        minHeight: 120,
        paddingVertical: 16,
        paddingHorizontal: 18,
        backgroundColor: COLOR.card,
        borderRadius: 5,
        boxShadow: "0 1px 2px rgba(34, 38, 46, 0.18), 0 18px 34px -22px rgba(34, 38, 46, 0.45)",
    },
    choiceWords: { flex: 1, gap: 4 },
    choiceCorner: { width: 72, alignItems: "center" },
});
