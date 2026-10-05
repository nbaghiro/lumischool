import { useState, type ReactNode } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    PixelRatio,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type ColorValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FACES } from "./art";

/** The desk colours of engine/ui/palette.css, which this app keeps in step with by hand. */
export const COLOR = {
    paper: "#f4f6f8",
    card: "#ffffff",
    grid: "#dce3ea",
    ink: "#22262e",
    inkSoft: "#5b6270",
    pen: "#2a4bbf",
    glow: "#ffd64a",
    glowInk: "#5a4300",
    berry: "#f39cbf",
    margin: "#e8a1a8",
    ok: "#23845a",
} as const;

/**
 * What each face is for: the reading face, the labels' mono, and the hand at the web's axes, one file
 * for each weight and set of axes the web sets (tools/scripts/mobile-art.ts), since React Native picks
 * no variation axes.
 */
export const FONT = {
    read: "Andika-Regular",
    readBold: "Andika-Bold",
    mono: "SplineSansMono-Medium",
    monoBold: "SplineSansMono-Bold",
    /** 700, informal 70, bounce 20: a card's title. */
    title: "ShantellSans-Title",
    /** 600, informal 50: what is written in a field, and who a card is to. */
    hand: "ShantellSans-Hand",
    /** 600, informal 70: the note written on a card in the pen. */
    note: "ShantellSans-Note",
    /** 700, informal 70: a family's name on the card that chooses it. */
    name: "ShantellSans-Name",
} as const satisfies Record<string, keyof typeof FACES>;

/** Each face's ascent and descent in ems, from its `hhea` table. */
const FACE_METRICS: Record<(typeof FONT)[keyof typeof FONT], { ascent: number; descent: number }> =
    {
        "Andika-Regular": { ascent: 2500 / 2048, descent: 800 / 2048 },
        "Andika-Bold": { ascent: 2500 / 2048, descent: 800 / 2048 },
        "SplineSansMono-Medium": { ascent: 1927 / 2000, descent: 473 / 2000 },
        "SplineSansMono-Bold": { ascent: 1927 / 2000, descent: 473 / 2000 },
        "ShantellSans-Title": { ascent: 1020 / 1000, descent: 320 / 1000 },
        "ShantellSans-Hand": { ascent: 1020 / 1000, descent: 320 / 1000 },
        "ShantellSans-Note": { ascent: 1020 / 1000, descent: 320 / 1000 },
        "ShantellSans-Name": { ascent: 1020 / 1000, descent: 320 / 1000 },
    };

/** The height a face sets one line at on its own, which Android rounds up to whole pixels at each end. */
function natural(font: keyof typeof FACE_METRICS, size: number): number {
    const { ascent, descent } = FACE_METRICS[font];
    if (Platform.OS !== "android") return (ascent + descent) * size;
    const r = PixelRatio.get();
    return (Math.ceil(ascent * size * r) + Math.ceil(descent * size * r)) / r;
}

export interface Setting {
    font: (typeof FONT)[keyof typeof FONT];
    size: number;
    /** The line's height in CSS pixels, which may be less than the face's own. */
    line: number;
    color: ColorValue;
    letterSpacing?: number;
    upper?: boolean;
    center?: boolean;
}

/**
 * Text set as CSS sets it: each line's box is `line` tall with the glyphs centred in it, and what
 * reaches past a short line is drawn, not cut. React Native cuts the glyphs of a line shorter than its
 * face, so each line is its own text, pulled together by negative margins, once the first layout has
 * said where the lines break. Only a string can be broken; anything else is set as one line.
 */
export function Snug(props: {
    setting: Setting;
    children: ReactNode;
    /** A heading, such as a card's title, which a screen reader can move between. */
    heading?: boolean;
}): ReactNode {
    const { font, size, line, color, letterSpacing, upper, center } = props.setting;
    const [broken, setBroken] = useState<{ text: string; lines: string[] } | null>(null);
    // the phone's own text size grows the line with the type, as a browser's zoom would
    const scale = PixelRatio.getFontScale();
    const style = {
        fontFamily: font,
        fontSize: size,
        color,
        letterSpacing,
        textTransform: upper === true ? ("uppercase" as const) : undefined,
        textAlign: center === true ? ("center" as const) : undefined,
        includeFontPadding: false,
        marginVertical: (line * scale - natural(font, size * scale)) / 2,
    };
    const text = typeof props.children === "string" ? props.children : null;
    const role = props.heading === true ? "header" : undefined;
    if (text !== null && broken !== null && broken.text === text)
        return (
            <View accessible accessibilityRole={role} accessibilityLabel={text}>
                {broken.lines.map((l, i) => (
                    <Text key={i} style={style}>
                        {l.trimEnd()}
                    </Text>
                ))}
            </View>
        );
    return (
        <Text
            style={style}
            accessibilityRole={role}
            onTextLayout={(e) => {
                const lines = e.nativeEvent.lines;
                if (text !== null && lines.length > 1)
                    setBroken({ text, lines: lines.map((l) => l.text) });
            }}
        >
            {props.children}
        </Text>
    );
}

/** The smallest a touch target may be (CLAUDE.md). */
export const TOUCH = 44;

export function Screen(props: { children: ReactNode }): ReactNode {
    return (
        <SafeAreaView style={s.screen} edges={["top", "bottom", "left", "right"]}>
            <KeyboardAvoidingView
                style={s.fill}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                    <View style={s.column}>{props.children}</View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function Lead(props: { children: ReactNode }): ReactNode {
    return <Text style={s.lead}>{props.children}</Text>;
}

export function Button(props: {
    label: string;
    onPress: () => void;
    busy?: boolean;
    quiet?: boolean;
}): ReactNode {
    const busy = props.busy === true;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.label}
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={props.onPress}
            style={({ pressed }) => [
                s.button,
                props.quiet === true ? s.quiet : null,
                pressed ? s.pressed : null,
            ]}
        >
            {busy ? (
                <ActivityIndicator color={props.quiet === true ? COLOR.pen : COLOR.card} />
            ) : (
                <Text style={props.quiet === true ? s.quietText : s.buttonText}>{props.label}</Text>
            )}
        </Pressable>
    );
}

/** A line under a form: what went wrong, or a calm note. */
export function Line(props: { text: string | null; calm?: boolean }): ReactNode {
    if (props.text === null || props.text === "") return null;
    return (
        <Text
            accessibilityLiveRegion="polite"
            style={[s.line, props.calm === true ? s.calm : s.problem]}
        >
            {props.text}
        </Text>
    );
}

/** One row of a native list, such as More's. */
export function Row(props: { label: string; onPress: () => void; note?: string }): ReactNode {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.label}
            onPress={props.onPress}
            style={({ pressed }) => [s.row, pressed ? s.pressed : null]}
        >
            <Text style={s.rowText}>{props.label}</Text>
            {props.note === undefined ? null : <Text style={s.rowNote}>{props.note}</Text>}
        </Pressable>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLOR.paper },
    fill: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
    column: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 16 },
    lead: { fontSize: 17, lineHeight: 24, color: COLOR.inkSoft },
    button: {
        minHeight: TOUCH + 4,
        borderRadius: 24,
        backgroundColor: COLOR.pen,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    quiet: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLOR.pen },
    pressed: { opacity: 0.7 },
    buttonText: { color: COLOR.card, fontSize: 18, fontWeight: "600" },
    quietText: { color: COLOR.pen, fontSize: 18, fontWeight: "600" },
    line: { fontSize: 16, lineHeight: 22 },
    problem: { color: "#a3333f" },
    calm: { color: COLOR.ok },
    row: {
        minHeight: TOUCH + 12,
        paddingHorizontal: 20,
        justifyContent: "center",
        backgroundColor: COLOR.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLOR.grid,
    },
    rowText: { fontSize: 18, color: COLOR.ink },
    rowNote: { fontSize: 14, color: COLOR.inkSoft, marginTop: 2 },
});
