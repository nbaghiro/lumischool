import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Start, ToApp } from "../../../engine/host";
import * as api from "../api";
import { usePlaying } from "../chrome";
import { leftChild, said } from "../mode";
import { Boxes, Button, Form, Link, Say } from "../form";
import { AuthPage, Bar, Postcard } from "../postcard";
import { credentials } from "../store";
import { Places, type Place } from "../tabs";
import { COLOR, FONT, TOUCH } from "../ui";
import { WebHost } from "../web-host";

/** How long a grown-up holds "For grown-ups" before the PIN pad opens (.docs/auth.md). */
const HOLD_MS = 2000;

type Tab = "map" | "today" | "games" | "painting";

/** The child's places, as the web's children's bar has them, with Today out of the map's own tools. */
const PLACES: readonly (Place & { key: Tab })[] = [
    { key: "map", name: "Map", icon: "icon-map" },
    { key: "today", name: "Today", icon: "icon-journal" },
    { key: "games", name: "Games", icon: "icon-games" },
    { key: "painting", name: "Painting", icon: "icon-paint" },
];

/** What each tab's splash says while its page opens. */
const OPENING: Record<Tab, (name: string) => string> = {
    map: (name) => `Opening ${name}'s map`,
    today: () => "Opening today's page",
    games: () => "Opening the games",
    painting: () => "Opening the easel",
};

const isTab = (key: string): key is Tab => PLACES.some((p) => p.key === key);

/** Where each tab's page opens, for the child the view is for (engine/host.ts, Start). */
function startOf(tab: Tab, kid: string): Pick<Start, "enter" | "place" | "kid"> {
    if (tab === "today") return { enter: { world: "", box: null }, place: null, kid };
    return { enter: null, place: tab, kid };
}

/**
 * The children's view: the app's bar with the child's name on it, and under it their map, today's
 * sheets, the games and the easel, each the children's own web page. A view of several children asks
 * who is learning first, on the web's own page.
 */
export default function Child(): ReactNode {
    const safe = useSafeAreaInsets();
    const playing = usePlaying();
    const [chosen, setChosen] = useState<ToApp["child"] | null>(null);
    const [tab, setTab] = useState<Tab>("map");
    const [opened, setOpened] = useState<ReadonlySet<Tab>>(new Set(["map"]));
    // a page opened again: Today after the child left its roll, the map after a sitting was sent
    const [again, setAgain] = useState<Record<Tab, number>>({
        map: 0,
        today: 0,
        games: 0,
        painting: 0,
    });
    const [menu, setMenu] = useState(false);
    const [asking, setAsking] = useState(false);
    const several = credentials().kids.length > 1;

    const pick = (next: Tab): void => {
        setTab(next);
        setOpened((o) => new Set([...o, next]));
    };
    const reopen = (t: Tab): void => setAgain((a) => ({ ...a, [t]: a[t] + 1 }));
    const switchChild = (): void => {
        setChosen(null);
        setTab("map");
        setOpened(new Set(["map"]));
    };

    return (
        <View style={s.fill}>
            {playing ? null : (
                <View style={{ paddingTop: safe.top, backgroundColor: COLOR.paper }}>
                    <Bar
                        who={null}
                        right={
                            chosen === null ? (
                                <Gate onOpen={() => setAsking(true)} />
                            ) : (
                                <NameTag name={chosen.name} onPress={() => setMenu(true)} />
                            )
                        }
                    />
                </View>
            )}
            {chosen === null ? (
                <WebHost
                    key="who"
                    path="/kids"
                    as="kid"
                    fullScreen={false}
                    titled={false}
                    start={{ enter: null, place: "who", kid: null }}
                    opening="Opening the children's view"
                    onChild={setChosen}
                />
            ) : (
                PLACES.filter((p) => opened.has(p.key)).map((p) => (
                    <View key={p.key} style={p.key === tab ? s.fill : s.hidden}>
                        <WebHost
                            key={`${chosen.kid}-${p.key}-${again[p.key]}`}
                            path="/kids"
                            as="kid"
                            fullScreen={false}
                            titled={false}
                            start={startOf(p.key, chosen.kid)}
                            opening={OPENING[p.key](chosen.name)}
                            onOut={() => {
                                pick("map");
                                if (p.key !== "map") reopen(p.key);
                            }}
                            onFinished={() => reopen("map")}
                        />
                    </View>
                ))
            )}
            {chosen === null ? null : (
                <Places
                    places={PLACES}
                    current={tab}
                    onPick={(key) => {
                        if (isTab(key)) pick(key);
                    }}
                />
            )}
            <Modal
                visible={menu}
                transparent
                animationType="fade"
                onRequestClose={() => setMenu(false)}
            >
                <View style={s.scrim}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        accessibilityRole="button"
                        accessibilityLabel="Close the menu"
                        onPress={() => setMenu(false)}
                    />
                    <View style={[s.menu, { marginTop: safe.top + 62 }]}>
                        {several ? (
                            <Pressable
                                accessibilityRole="menuitem"
                                onPress={() => {
                                    setMenu(false);
                                    switchChild();
                                }}
                                style={({ pressed }) => [s.item, pressed ? s.itemPressed : null]}
                            >
                                <Text style={s.itemText}>Switch child</Text>
                            </Pressable>
                        ) : null}
                        <Gate
                            item
                            onOpen={() => {
                                setMenu(false);
                                setAsking(true);
                            }}
                        />
                    </View>
                </View>
            </Modal>
            <Modal
                visible={asking}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setAsking(false)}
            >
                {/* a modal is a window of its own, with its own safe area */}
                <SafeAreaProvider>
                    <Leave onCancel={() => setAsking(false)} />
                </SafeAreaProvider>
            </Modal>
        </View>
    );
}

/** The child's name on a tag, as Who labels each child's stamp, which opens the view's menu. */
function NameTag(props: { name: string; onPress: () => void }): ReactNode {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${props.name}, menu`}
            onPress={props.onPress}
            style={({ pressed }) => [s.tag, pressed ? s.tagPressed : null]}
        >
            <Text style={s.tagText}>{props.name}</Text>
        </Pressable>
    );
}

/**
 * The way out for a grown-up, held for two seconds so a child does not spend the PIN's tries by
 * tapping it; a tap only says to hold it.
 */
function Gate(props: { onOpen: () => void; item?: boolean }): ReactNode {
    const [hint, setHint] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
        () => () => {
            if (timer.current !== null) clearTimeout(timer.current);
        },
        [],
    );
    const showHint = (): void => {
        setHint(true);
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => setHint(false), 2500);
    };
    const item = props.item === true;
    return (
        <Pressable
            accessibilityRole={item ? "menuitem" : "button"}
            accessibilityLabel="For grown-ups. Press and hold."
            delayLongPress={HOLD_MS}
            onLongPress={props.onOpen}
            onPress={showHint}
            style={({ pressed }) => [
                item ? s.item : s.gate,
                pressed ? (item ? s.itemHeld : s.held) : null,
            ]}
        >
            <Text style={item ? s.itemText : s.gateText}>
                {hint ? "Hold for two seconds" : "For grown-ups"}
            </Text>
            {item && !hint ? <Text style={s.itemNote}>Hold for two seconds</Text> : null}
        </Pressable>
    );
}

function Leave(props: { onCancel: () => void }): ReactNode {
    const [pin, setPin] = useState("");
    const [problem, setProblem] = useState<api.Problem | null>(null);
    const [busy, setBusy] = useState(false);

    const leave = async (digits: string): Promise<void> => {
        if (busy) return;
        setBusy(true);
        const r = await api.leaveChildren(digits);
        setBusy(false);
        setPin("");
        if (r.ok) await leftChild(r.value);
        else setProblem(r.problem);
    };

    const withoutPin = async (): Promise<void> => {
        setBusy(true);
        await api.kidSignOut();
        setBusy(false);
        await leftChild(null);
    };

    const noPin = problem?.error === "no-pin";

    return (
        <AuthPage map="unlock" who={null} foot={[]}>
            <Postcard
                kicker="For grown-ups"
                title="Leave the children's view"
                lead="Type the parent PIN to leave the children's view on this device."
            >
                <Form>
                    <Boxes
                        count={4}
                        label="Parent PIN"
                        value={pin}
                        onChange={setPin}
                        onFull={(digits) => void leave(digits)}
                    />
                    <Button
                        label="Leave the children's view"
                        form
                        busy={busy}
                        onPress={() => void (noPin ? withoutPin() : leave(pin))}
                    />
                    {problem === null ? null : (
                        <Say
                            text={
                                noPin
                                    ? "This family has no parent PIN yet, so the view can be left without one. A grown-up sets one on the family's page."
                                    : said(problem)
                            }
                        />
                    )}
                </Form>
                <Link label="Back to the children's view" onPress={props.onCancel} />
            </Postcard>
        </AuthPage>
    );
}

const s = StyleSheet.create({
    fill: { flex: 1, backgroundColor: COLOR.paper },
    hidden: { display: "none" },
    tag: {
        minHeight: TOUCH,
        justifyContent: "center",
        paddingHorizontal: 14,
        backgroundColor: COLOR.card,
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 10,
        transform: [{ rotate: "-2deg" }],
    },
    tagPressed: { backgroundColor: COLOR.paper },
    tagText: { fontFamily: FONT.name, fontSize: 20, color: COLOR.ink },
    gate: {
        minHeight: TOUCH,
        justifyContent: "center",
        paddingHorizontal: 14,
        backgroundColor: COLOR.card,
        borderWidth: 1.5,
        borderColor: COLOR.ink,
        borderRadius: 10,
    },
    held: { backgroundColor: COLOR.glow },
    gateText: { fontFamily: FONT.readBold, fontSize: 14.5, color: COLOR.ink },
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
    item: { minHeight: TOUCH + 8, justifyContent: "center", paddingHorizontal: 16 },
    itemPressed: { backgroundColor: COLOR.paper },
    itemHeld: { backgroundColor: COLOR.glow },
    itemText: { fontFamily: FONT.readBold, fontSize: 16, color: COLOR.ink },
    itemNote: { fontFamily: FONT.read, fontSize: 13, color: COLOR.inkSoft },
});
