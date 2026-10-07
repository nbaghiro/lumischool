import { router } from "expo-router";
import type {
    BottomTabBarProps,
    BottomTabHeaderProps,
} from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { portraitFor, type GrownupKind } from "../../engine/parts/apps/grownup";
import { me, type Me } from "./api";
import { DRAWINGS } from "./art";
import { usePlaying } from "./chrome";
import { signOut } from "./mode";
import { ORIGIN } from "./origin";
import { Bar } from "./postcard";
import { COLOR, FONT, TOUCH } from "./ui";

export type TabIcon =
    | "icon-home"
    | "icon-lessons"
    | "icon-map"
    | "icon-calendar"
    | "icon-games"
    | "icon-paint"
    | "icon-journal";

/**
 * Each tab's name and its drawing from the web's own icon set, by the route that holds the tab. The
 * name is fixed here because a page sets the screen's title to its own heading.
 */
const PLACE: Record<string, { name: string; icon: TabIcon }> = {
    index: { name: "Home", icon: "icon-home" },
    lessons: { name: "Lessons", icon: "icon-lessons" },
    map: { name: "Map", icon: "icon-map" },
    calendar: { name: "Calendar", icon: "icon-calendar" },
    games: { name: "Games", icon: "icon-games" },
    painting: { name: "Painting", icon: "icon-paint" },
};

/** The icon's size on the bar; the drawings are made at 24 px with room round them for the strokes. */
const ICON_SIZE = 28;

/** One place on the bar: its name and its drawing from the web's own icon set. */
export interface Place {
    key: string;
    name: string;
    icon: TabIcon;
}

/**
 * The places, as the web's bar sets them out: the hand-drawn icon over the place's name, the place you
 * are on in a white pill ringed in ink, the others lying on the desk. A game has the whole phone.
 */
export function Places(props: {
    places: readonly Place[];
    current: string;
    onPick: (key: string) => void;
}): ReactNode {
    const safe = useSafeAreaInsets();
    const playing = usePlaying();
    if (playing) return null;
    return (
        <View style={[s.bar, { paddingBottom: Math.max(safe.bottom - 6, 8) }]}>
            {props.places.map((place) => {
                const on = place.key === props.current;
                return (
                    <Pressable
                        key={place.key}
                        accessibilityRole="tab"
                        accessibilityLabel={place.name}
                        accessibilityState={{ selected: on }}
                        onPress={() => props.onPick(place.key)}
                        style={[s.place, on ? s.on : null]}
                    >
                        <Image
                            source={DRAWINGS[place.icon].source}
                            style={s.icon}
                            accessibilityIgnoresInvertColors
                        />
                        <Text
                            style={[s.name, on ? s.nameOn : null]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {place.name}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

/** The grown-ups' tabs, drawn as `Places`. */
export function TabBar(props: BottomTabBarProps): ReactNode {
    const { state, navigation } = props;
    const current = state.routes[state.index]?.key ?? "";
    const places = state.routes.map((route) => ({
        key: route.key,
        name: PLACE[route.name]?.name ?? route.name,
        icon: PLACE[route.name]?.icon ?? "icon-home",
    }));
    return (
        <Places
            places={places}
            current={current}
            onPick={(key) => {
                const route = state.routes.find((r) => r.key === key);
                if (route === undefined || key === current) return;
                const event = navigation.emit({
                    type: "tabPress",
                    target: key,
                    canPreventDefault: true,
                });
                if (!event.defaultPrevented) navigation.navigate(route.name);
            }}
        />
    );
}

/** The web's bar over every grown-up's screen: the mark, a way back when the page has one, and the grown-up's stamp. */
export function TabHeader(props: BottomTabHeaderProps): ReactNode {
    const safe = useSafeAreaInsets();
    const playing = usePlaying();
    if (playing) return null;
    const right = props.options.headerRight;
    return (
        <View style={{ paddingTop: safe.top, backgroundColor: COLOR.paper }}>
            <Bar
                who={null}
                right={
                    <View style={s.right}>
                        {right === undefined ? null : right({ canGoBack: true })}
                        <Person />
                    </View>
                }
            />
        </View>
    );
}

/** Each portrait's stamp as the art script pictures it, so a new portrait without its picture is a type error. */
const STAMP: Record<GrownupKind, keyof typeof DRAWINGS> = {
    short: "grownup-short",
    long: "grownup-long",
    curly: "grownup-curly",
    bun: "grownup-bun",
    braids: "grownup-braids",
    glasses: "grownup-glasses",
    beard: "grownup-beard",
    headscarf: "grownup-headscarf",
    cap: "grownup-cap",
    grey: "grownup-grey",
};

/** The grown-up read once for the bar, and read again after a menu action that changes them. */
let known: Me | null = null;

/**
 * The grown-up's own stamp at the end of the bar, and the menu under it, as the web's bar has them:
 * who is signed in, their account, the other families, a child's view on this phone, and Sign out.
 */
function Person(): ReactNode {
    const [person, setPerson] = useState<Me | null>(known);
    const [open, setOpen] = useState(false);
    const safe = useSafeAreaInsets();
    useEffect(() => {
        let live = true;
        void me().then((r) => {
            if (!r.ok || !live) return;
            known = r.value;
            setPerson(r.value);
        });
        return () => {
            live = false;
        };
    }, []);
    const kind = person === null ? null : portraitFor(person.id, person.picture);
    const stamp = DRAWINGS[STAMP[kind ?? "short"]];
    const go = (to: () => void): void => {
        setOpen(false);
        to();
    };
    const leave = (): void =>
        Alert.alert("Sign out?", "You will need a new code from your email to sign in again.", [
            { text: "Stay", style: "cancel" },
            {
                text: "Sign out",
                style: "destructive",
                onPress: () => {
                    known = null;
                    void signOut();
                },
            },
        ]);
    const items: { label: string; act: () => void }[] = [
        {
            label: "Your account",
            act: () =>
                router.push({ pathname: "/page", params: { to: "/account", title: "Account" } }),
        },
        ...(person !== null && person.families.length > 1
            ? [{ label: "Switch family", act: () => router.push("/switch-family") }]
            : []),
        { label: "Open a child's view", act: () => router.push("/open-child") },
        // the site's pages, which the stores ask an app to link, open in the phone's browser
        { label: "Help and support", act: () => void Linking.openURL(`${ORIGIN}/support`) },
        { label: "Privacy", act: () => void Linking.openURL(`${ORIGIN}/privacy`) },
        { label: "Sign out", act: leave },
    ];
    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                    person === null ? "You" : `${person.name ?? person.email}, your account`
                }
                onPress={() => setOpen(true)}
                style={s.stamp}
            >
                <Image
                    source={stamp.source}
                    style={s.stampPicture}
                    accessibilityIgnoresInvertColors
                />
            </Pressable>
            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <View style={s.scrim}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        accessibilityRole="button"
                        accessibilityLabel="Close the menu"
                        onPress={() => setOpen(false)}
                    />
                    <View style={[s.menu, { marginTop: safe.top + 62 }]}>
                        {person === null ? null : (
                            <View style={s.who}>
                                <Text style={s.label}>SIGNED IN AS</Text>
                                <Text style={s.whoName} numberOfLines={1}>
                                    {person.name ?? person.email}
                                </Text>
                                <Text style={s.whoMail} numberOfLines={1}>
                                    {person.family.name} family
                                </Text>
                            </View>
                        )}
                        {items.map((item) => (
                            <Pressable
                                key={item.label}
                                accessibilityRole="menuitem"
                                onPress={() => go(item.act)}
                                style={({ pressed }) => [s.item, pressed ? s.itemPressed : null]}
                            >
                                <Text style={s.itemText}>{item.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </Modal>
        </>
    );
}

/** The web's bar over a page pushed on top of the tabs, such as the account, with a way back. */
export function StackHeader(): ReactNode {
    const safe = useSafeAreaInsets();
    return (
        <View style={{ paddingTop: safe.top, backgroundColor: COLOR.paper }}>
            <Bar who={null} right={<BarButton label="Back" onPress={() => router.back()} />} />
        </View>
    );
}

/** A pill in the bar, as the web's bar draws its buttons. */
export function BarButton(props: { label: string; onPress: () => void }): ReactNode {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.label}
            onPress={props.onPress}
            style={s.button}
        >
            <Text style={s.buttonText}>{props.label}</Text>
        </Pressable>
    );
}

const s = StyleSheet.create({
    bar: {
        flexDirection: "row",
        gap: 2,
        paddingTop: 6,
        paddingHorizontal: 4,
        backgroundColor: COLOR.paper,
        borderTopWidth: 1.5,
        borderTopColor: COLOR.grid,
    },
    place: {
        flex: 1,
        minHeight: TOUCH + 10,
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        paddingVertical: 4,
        paddingHorizontal: 2,
        borderWidth: 1.5,
        borderColor: "transparent",
        borderRadius: 14,
    },
    on: { backgroundColor: COLOR.card, borderColor: COLOR.ink },
    icon: { width: ICON_SIZE * 1.5, height: ICON_SIZE * 1.5, margin: -ICON_SIZE * 0.25 },
    name: { fontFamily: FONT.readBold, fontSize: 12, color: COLOR.inkSoft },
    nameOn: { color: COLOR.ink },
    right: { flexDirection: "row", alignItems: "center", gap: 10 },
    button: {
        minHeight: TOUCH,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 10,
        backgroundColor: COLOR.card,
    },
    buttonText: { fontFamily: FONT.readBold, fontSize: 14.5, color: COLOR.ink },
    stamp: { width: TOUCH + 4, height: TOUCH + 4, alignItems: "center", justifyContent: "center" },
    stampPicture: { width: 54, height: 54 },
    scrim: { flex: 1, backgroundColor: "rgba(34, 38, 46, 0.18)", alignItems: "flex-end" },
    menu: {
        marginRight: 12,
        minWidth: 240,
        paddingVertical: 6,
        backgroundColor: COLOR.card,
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 12,
        shadowColor: COLOR.ink,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    who: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1.5,
        borderBottomColor: COLOR.grid,
        marginBottom: 4,
    },
    label: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.6, color: COLOR.inkSoft },
    whoName: { fontFamily: FONT.title, fontSize: 20, color: COLOR.ink, marginTop: 4 },
    whoMail: { fontFamily: FONT.read, fontSize: 14, color: COLOR.inkSoft, marginTop: 2 },
    item: { minHeight: TOUCH, justifyContent: "center", paddingHorizontal: 16 },
    itemPressed: { backgroundColor: COLOR.paper },
    itemText: { fontFamily: FONT.readBold, fontSize: 16, color: COLOR.ink },
});
