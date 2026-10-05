// The controls written on a sign-in postcard, as engine/ui/form.css draws them on a phone: a field as a
// ruled line written on in the hand, the tick, the buttons, links underlined in the pen, the code and
// the PIN in boxes over one input, the time zone offered rather than asked, and what went wrong said
// on the card. Keep it in step with form.css.

import { useEffect, useMemo, useState, type ReactNode, type Ref } from "react";
import {
    AccessibilityInfo,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { emailOf } from "../../school/family/login";
import { COLOR, FONT, Snug, TOUCH, type Setting } from "./ui";
import { ZONES } from "./zones";

/** A card's form: its controls one under another, with room between for a focus ring. */
export function Form(props: { children: ReactNode }): ReactNode {
    return <View style={s.form}>{props.children}</View>;
}

/** What is wrong with an address as typed, in the web's words, or nothing. */
export function wrongEmail(address: string): string | undefined {
    if (address === "") return "Type your email address.";
    return emailOf(address) === null
        ? "That does not look like an email address. Check it and try again."
        : undefined;
}

/** A field: its name in the mono above a line written on in the hand, and what is wrong with it. */
export function Field(
    props: Omit<TextInputProps, "style"> & {
        label: string;
        error?: string;
        /** The label wraps the input, as the children's username does, with no gap under it. */
        tight?: boolean;
        inputRef?: Ref<TextInput>;
    },
): ReactNode {
    const { label, error, tight, inputRef, onFocus, onBlur, ...input } = props;
    const [focused, setFocused] = useState(false);
    const wrong = error !== undefined && error !== "";
    return (
        <View style={[s.field, tight === true ? null : s.fieldGap]}>
            <Snug setting={SET.label}>{label}</Snug>
            <View style={[s.line, focused ? s.lineFocused : null, wrong ? s.lineWrong : null]}>
                <TextInput
                    ref={inputRef}
                    testID={label}
                    accessibilityLabel={label}
                    accessibilityHint={wrong ? error : undefined}
                    spellCheck={false}
                    autoCorrect={false}
                    placeholderTextColor={COLOR.inkSoft}
                    selectionColor={COLOR.pen}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    style={s.input}
                    {...input}
                />
                <View
                    style={[s.rule, focused ? s.ruleFocused : null, wrong ? s.ruleWrong : null]}
                />
            </View>
            {wrong ? <FieldError text={error} /> : null}
        </View>
    );
}

function FieldError(props: { text: string }): ReactNode {
    return (
        <View style={s.error}>
            <View style={s.errorDot} />
            <View style={s.errorWords}>
                <Snug setting={SET.error}>{props.text}</Snug>
            </View>
        </View>
    );
}

/** A tick with its words; the whole row is the target. */
export function Check(props: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): ReactNode {
    return (
        <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: props.checked }}
            accessibilityLabel={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={s.check}
        >
            <View style={[s.checkBox, props.checked ? s.checkBoxOn : null]}>
                {props.checked ? <View style={s.checkMark} /> : null}
            </View>
            <View style={s.checkWords}>
                <Snug setting={SET.check}>{props.label}</Snug>
            </View>
        </Pressable>
    );
}

/**
 * A button, the card's main one unless `second`. While `busy` it stays where it is but does nothing,
 * and the caller words it for what is happening, as the web does.
 */
export function Button(props: {
    label: string;
    onPress: () => void;
    busy?: boolean;
    wide?: boolean;
    second?: boolean;
    /** The form's own button, which stands a little lower and as wide as the controls over it. */
    form?: boolean;
}): ReactNode {
    const busy = props.busy === true;
    const second = props.second === true;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.label}
            accessibilityState={{ busy }}
            onPress={() => {
                if (!busy) props.onPress();
            }}
            style={({ pressed }) => [
                s.button,
                props.wide === true ? s.wide : s.narrow,
                props.form === true ? s.formButton : null,
                second ? s.second : null,
                pressed && !busy ? s.buttonPressed : null,
                busy ? s.busy : null,
            ]}
        >
            {({ pressed }) => (
                <Text
                    style={[
                        s.buttonText,
                        second ? s.secondText : null,
                        second && pressed && !busy ? s.secondPressedText : null,
                    ]}
                >
                    {props.label}
                </Text>
            )}
        </Pressable>
    );
}

// The underline a link carries: 1.5 px thick, 3 px under the baseline (form.css `.link`). Andika's
// ascent is 2500 of its 2048 units and its descent 800, so at 14.5 px on an 18.85 px line the baseline
// stands 15.44 px down the line.
const UNDERLINE_TOP = 15.44 + 3;

/** A button that reads as a link, in the pen and underlined. */
export function Link(props: { label: string; onPress: () => void; hint?: string }): ReactNode {
    return (
        <Pressable
            accessibilityRole="link"
            accessibilityLabel={props.hint ?? props.label}
            onPress={props.onPress}
            style={({ pressed }) => [s.link, pressed ? s.linkPressed : null]}
        >
            <View>
                <Snug setting={SET.link}>{props.label}</Snug>
                <View style={s.underline} />
            </View>
        </Pressable>
    );
}

/** A line of soft small text, with a link at its end when it leads somewhere. */
export function Note(props: {
    text: string;
    link?: { label: string; onPress: () => void };
}): ReactNode {
    if (props.link === undefined) return <Snug setting={SET.note}>{props.text}</Snug>;
    return (
        <View style={s.noteRow}>
            <Snug setting={SET.note}>{`${props.text} `}</Snug>
            <Link label={props.link.label} onPress={props.link.onPress} />
        </View>
    );
}

/** The links under a card's last button, side by side while they fit. */
export function Acts(props: { children: ReactNode }): ReactNode {
    return <View style={s.acts}>{props.children}</View>;
}

/** Only the digits of what was typed or pasted, up to `count`. */
const digitsOf = (raw: string, count: number): string => raw.replace(/\D/g, "").slice(0, count);

/**
 * The code in eight boxes, four and four, or a PIN in four. It is one input under the boxes, so the
 * phone offers the code from its messages, a screen reader hears one field, and a pasted code with its
 * space or dash lands whole. A PIN's digits show as dots. `onFull` hears the last digit arrive.
 */
export function Boxes(props: {
    count: 4 | 8;
    label: string;
    value: string;
    onChange: (digits: string) => void;
    onFull?: (digits: string) => void;
    wrong?: boolean;
    code?: boolean;
    inputRef?: Ref<TextInput>;
}): ReactNode {
    const [focused, setFocused] = useState(false);
    const cells = Array.from({ length: props.count }, (_, i) => i);
    const now = Math.min(props.value.length, props.count - 1);
    const code = props.code === true;
    return (
        <View style={s.code}>
            <View style={[s.boxes, focused ? s.boxesFocused : null]}>
                {cells.map((i) => {
                    const digit = props.value[i];
                    const shown = digit === undefined ? "" : code ? digit : "•";
                    return (
                        <View
                            key={i}
                            style={[
                                s.cell,
                                shown === "" ? s.cellEmpty : null,
                                shown !== "" && props.wrong === true ? s.cellWrong : null,
                                focused && i === now ? s.cellNow : null,
                            ]}
                        >
                            <Text style={s.cellText}>{shown}</Text>
                        </View>
                    );
                })}
            </View>
            <TextInput
                ref={props.inputRef}
                testID={props.label}
                accessibilityLabel={props.label}
                value={props.value}
                onChangeText={(raw) => {
                    const digits = digitsOf(raw, props.count);
                    if (digits === props.value) return;
                    props.onChange(digits);
                    if (digits.length === props.count) props.onFull?.(digits);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                textContentType={code ? "oneTimeCode" : "none"}
                autoComplete={code ? "one-time-code" : "off"}
                importantForAutofill={code ? "yes" : "no"}
                secureTextEntry={!code}
                caretHidden
                contextMenuHidden={!code}
                selectionColor="transparent"
                style={s.codeInput}
            />
        </View>
    );
}

/** A line on the card, read out as it appears, with the one thing that answers it if there is one. */
export function Say(props: {
    text: string;
    tone?: "error" | "info";
    action?: { label: string; run: () => void };
}): ReactNode {
    const [dismissed, setDismissed] = useState<string | null>(null);
    useEffect(() => {
        AccessibilityInfo.announceForAccessibility(props.text);
    }, [props.text]);
    if (dismissed === props.text) return null;
    const info = props.tone === "info";
    const dismissible = props.action === undefined;
    return (
        <View
            accessibilityLiveRegion={info ? "polite" : "assertive"}
            style={[s.say, info ? s.sayInfo : s.sayError, dismissible ? s.sayDismissible : null]}
        >
            <Snug setting={SET.say}>{props.text}</Snug>
            {dismissible ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss message"
                    onPress={() => setDismissed(props.text)}
                    style={s.dismiss}
                >
                    <Text style={s.dismissText}>×</Text>
                </Pressable>
            ) : null}
            {props.action === undefined ? null : (
                <View style={s.sayActs}>
                    <Button label={props.action.label} second onPress={props.action.run} />
                </View>
            )}
        </View>
    );
}

/** The phone's own time zone, which is nearly everyone's family's zone. */
export function detectedZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

const cityOf = (zone: string): string => (zone.split("/").pop() ?? zone).replaceAll("_", " ");

/** Every zone a family can choose, with `current` first when the list does not have it. */
const zonesWith = (current: string): readonly string[] =>
    ZONES.includes(current) ? ZONES : [current, ...ZONES];

/**
 * The time zone as a line with a Change link, which opens the list of zones in a sheet. A family's
 * school days are days in one zone.
 */
export function TimeZone(props: { value: string; onChange: (zone: string) => void }): ReactNode {
    const [open, setOpen] = useState(false);
    return (
        <View style={s.zone}>
            <Snug setting={SET.zone}>
                {"Days are in "}
                <Text style={s.zoneBold}>{`${cityOf(props.value)} time`}</Text>.
            </Snug>
            <Link label="Change" hint="Change the time zone" onPress={() => setOpen(true)} />
            <Modal
                visible={open}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setOpen(false)}
            >
                <SafeAreaProvider>
                    <Zones
                        value={props.value}
                        onPick={(zone) => {
                            props.onChange(zone);
                            setOpen(false);
                        }}
                        onClose={() => setOpen(false)}
                    />
                </SafeAreaProvider>
            </Modal>
        </View>
    );
}

function Zones(props: {
    value: string;
    onPick: (zone: string) => void;
    onClose: () => void;
}): ReactNode {
    const safe = useSafeAreaInsets();
    const [find, setFind] = useState("");
    const all = useMemo(() => zonesWith(props.value), [props.value]);
    const shown = useMemo(() => {
        const words = find.trim().toLowerCase().replaceAll(" ", "_");
        return words === "" ? all : all.filter((z) => z.toLowerCase().includes(words));
    }, [all, find]);
    return (
        <View style={[s.sheet, { paddingTop: safe.top, paddingBottom: safe.bottom }]}>
            <View style={s.sheetHead}>
                <View style={s.sheetFind}>
                    <Field
                        label="Your time zone"
                        value={find}
                        onChangeText={setFind}
                        placeholder={cityOf(props.value)}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                </View>
                <Link label="Close" hint="Close the time zones" onPress={props.onClose} />
            </View>
            <FlatList
                data={shown}
                keyExtractor={(z) => z}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={30}
                renderItem={({ item }) => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: item === props.value }}
                        onPress={() => props.onPick(item)}
                        style={({ pressed }) => [s.zoneRow, pressed ? s.zoneRowPressed : null]}
                    >
                        <Text style={[s.zoneName, item === props.value ? s.zoneChosen : null]}>
                            {item.replaceAll("_", " ")}
                        </Text>
                    </Pressable>
                )}
            />
        </View>
    );
}

// color-mix() values from form.css, worked out in sRGB: the tick's box (ink 45% on the card), an empty
// box (ink 30% on the card), the box being typed in (pen 40% on the card), a wrong mark (berry 80% on
// ink), and what went wrong (the margin 75% on ink, and 18% of that on the card)
const TICK_EDGE = "#9c9da1";
const EMPTY_EDGE = "#bdbec0";
const NOW_SHADE = "#aab7e5";
const WRONG_EDGE = "#c984a2";
const ERROR_EDGE = "#b78289";
const ERROR_GROUND = "#f2e9ea";
const INFO_GROUND = "#fff8de";

/** The type of the controls, as form.css sets it. */
const SET = {
    label: {
        font: FONT.mono,
        size: 10.5,
        line: 12.6,
        color: COLOR.inkSoft,
        letterSpacing: 1.26,
        upper: true,
    },
    error: { font: FONT.readBold, size: 14, line: 22.4, color: COLOR.ink },
    check: { font: FONT.read, size: 14.5, line: 19.575, color: COLOR.ink },
    link: { font: FONT.readBold, size: 14.5, line: 18.85, color: COLOR.pen },
    note: { font: FONT.read, size: 14, line: 21, color: COLOR.inkSoft },
    say: { font: FONT.read, size: 15, line: 22.5, color: COLOR.ink },
    zone: { font: FONT.read, size: 14, line: 22.4, color: COLOR.inkSoft },
} as const satisfies Record<string, Setting>;

const s = StyleSheet.create({
    form: { gap: 12 },
    formButton: { marginTop: 10, alignSelf: "stretch" },
    field: { minWidth: 0 },
    fieldGap: { gap: 2 },
    // the ruled line is drawn rather than a bottom border, which iOS joins badly to the rounded top
    line: {
        height: TOUCH,
        marginTop: 4,
        backgroundColor: "rgba(220, 227, 234, 0.22)",
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    lineFocused: {
        outlineColor: COLOR.pen,
        outlineStyle: "dashed",
        outlineWidth: 2,
        outlineOffset: 4,
    },
    lineWrong: { backgroundColor: "rgba(243, 156, 191, 0.14)" },
    input: {
        flex: 1,
        paddingTop: 8,
        paddingHorizontal: 2,
        paddingBottom: 6,
        fontFamily: FONT.hand,
        fontSize: 19,
        color: COLOR.pen,
    },
    rule: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        backgroundColor: COLOR.inkSoft,
    },
    ruleFocused: { backgroundColor: COLOR.pen },
    ruleWrong: { backgroundColor: WRONG_EDGE },
    error: { flexDirection: "row", alignItems: "flex-start" },
    errorWords: { flex: 1 },
    errorDot: {
        width: 10,
        height: 10,
        marginTop: 7,
        marginRight: 8,
        borderRadius: 5,
        backgroundColor: COLOR.berry,
    },
    check: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: TOUCH },
    checkBox: {
        width: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: TICK_EDGE,
        borderRadius: 6,
        backgroundColor: COLOR.card,
    },
    checkWords: { flex: 1 },
    checkBoxOn: { borderColor: COLOR.pen, backgroundColor: COLOR.pen },
    checkMark: {
        width: 10,
        height: 5,
        marginTop: -3,
        borderLeftWidth: 2.5,
        borderBottomWidth: 2.5,
        borderColor: COLOR.card,
        transform: [{ rotate: "-45deg" }],
    },
    button: {
        minHeight: 48,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 10,
        backgroundColor: COLOR.ink,
    },
    wide: { alignSelf: "stretch" },
    narrow: { alignSelf: "flex-start" },
    second: { backgroundColor: COLOR.card },
    buttonPressed: { backgroundColor: COLOR.pen, borderColor: COLOR.pen },
    busy: { opacity: 0.55 },
    buttonText: { fontFamily: FONT.readBold, fontSize: 16, color: COLOR.card },
    secondText: { color: COLOR.ink },
    secondPressedText: { color: COLOR.card },
    link: {
        minHeight: TOUCH,
        paddingHorizontal: 2,
        justifyContent: "center",
        alignSelf: "flex-start",
    },
    linkPressed: { opacity: 0.7 },
    underline: {
        position: "absolute",
        left: 0,
        right: 0,
        top: UNDERLINE_TOP,
        height: 1.5,
        backgroundColor: COLOR.pen,
    },
    noteRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    acts: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        rowGap: 10,
        columnGap: 14,
    },
    code: { alignSelf: "flex-start", marginTop: 2, marginBottom: 4 },
    // two rows of four 36 px boxes, 4 px apart across and 8 px down, as form.css has under 460 px
    boxes: { flexDirection: "row", flexWrap: "wrap", width: 156, rowGap: 8, columnGap: 4 },
    boxesFocused: {
        borderRadius: 10,
        outlineColor: COLOR.pen,
        outlineStyle: "dashed",
        outlineWidth: 2,
        outlineOffset: 6,
    },
    cell: {
        width: 36,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLOR.card,
        borderWidth: 1.5,
        borderColor: COLOR.inkSoft,
        borderRadius: 8,
    },
    cellEmpty: { borderColor: EMPTY_EDGE },
    cellWrong: { borderColor: WRONG_EDGE },
    cellNow: { borderColor: COLOR.pen, boxShadow: `inset 0 -4px 0 ${NOW_SHADE}` },
    cellText: { fontFamily: FONT.monoBold, fontSize: 24, color: COLOR.ink },
    codeInput: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        color: "transparent",
        backgroundColor: "transparent",
        fontSize: 16,
    },
    say: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderLeftWidth: 4 },
    sayError: { backgroundColor: ERROR_GROUND, borderLeftColor: ERROR_EDGE },
    sayInfo: { backgroundColor: INFO_GROUND, borderLeftColor: COLOR.glow },
    sayDismissible: { paddingRight: 54, minHeight: TOUCH },
    dismiss: {
        position: "absolute",
        top: 0,
        right: 2,
        width: TOUCH,
        height: TOUCH,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    dismissText: { fontFamily: FONT.read, fontSize: 24, color: COLOR.ink },
    sayActs: { flexDirection: "row", marginTop: 6 },
    zone: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 10,
        rowGap: 2,
    },
    zoneBold: { fontFamily: FONT.readBold, color: COLOR.ink },
    sheet: { flex: 1, backgroundColor: COLOR.paper },
    sheetHead: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 14,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    sheetFind: { flex: 1 },
    zoneRow: {
        minHeight: TOUCH,
        justifyContent: "center",
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLOR.grid,
        backgroundColor: COLOR.card,
    },
    zoneRowPressed: { backgroundColor: COLOR.grid },
    zoneName: { fontFamily: FONT.read, fontSize: 17, color: COLOR.ink },
    zoneChosen: { fontFamily: FONT.readBold, color: COLOR.pen },
});
