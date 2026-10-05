import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    AccessibilityInfo,
    AppState,
    BackHandler,
    Keyboard,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import {
    toApp,
    write,
    type Handlers,
    type Start,
    type ToApp,
    type ToPage,
} from "../../engine/host";
import { currentBuild, handoffUrl, headersFor } from "./api";
import { firstPageDrawn, usePlaying } from "./chrome";
import { beforeLoad, feel, hold, hush, print, receive, share, speak } from "./bridge";
import { enterChild, leftChild, settled, signOut } from "./mode";
import { APP_TOKEN, ORIGIN } from "./origin";
import { credentials } from "./store";
import { BarButton } from "./tabs";
import { COLOR, TOUCH } from "./ui";
import { Splash } from "./splash";

/** How long the loader stays once the page says it is drawn, so the page's own label can take its place. */
const HANDOVER_MS = 450;

/** Where a link to another app's page goes in the app, for a grown-up's web view. */
function openFromParent(path: string): void {
    if (path === "/kids" || path.startsWith("/kids/") || path.startsWith("/kids?")) return;
    if (path === "/sign-in" || path.startsWith("/sign-in?")) {
        void signOut();
        return;
    }
    if (path === "/open-child") {
        router.push("/open-child");
        return;
    }
    if (path === "/") router.navigate("/");
    else if (path === "/explore" || path.startsWith("/explore/") || path.startsWith("/explore?")) {
        router.navigate({ pathname: "/lessons", params: { to: path } });
    } else if (path === "/map") router.navigate("/map");
    else if (path === "/calendar") router.navigate("/calendar");
    else router.push({ pathname: "/page", params: { to: path } });
}

/** Whether a load may happen inside this web view: this origin's pages, and a child's only theirs. */
function allowed(url: string, child: boolean): boolean {
    if (url === "about:blank") return true;
    if (!url.startsWith(`${ORIGIN}/`)) return false;
    if (!child) return true;
    const path = url.slice(ORIGIN.length);
    return path === "/kids" || /^\/(?:kids|api|assets)[/?#]/.test(path);
}

interface Props {
    /** The page to open, as a path on the origin. Changing it later moves the page there. */
    path: string;
    as: "adult" | "kid";
    /** Whether the web view reaches the screen's edges, so the page has to keep off the safe area. */
    fullScreen: boolean;
    /** Whether the screen's native header takes the page's title, and its back while the page has one. */
    titled: boolean;
    /** What the loader says while the page opens, such as "Opening your family". */
    opening?: string;
    /** In a child's view, what the page shows first and for which child (engine/host.ts, Start). */
    start?: Pick<Start, "enter" | "place" | "kid">;
    /** The page says which child the view is for, chosen on Who or the only one it holds. */
    onChild?: (c: ToApp["child"]) => void;
    /** The child left a world's roll, or finished a sitting and its answers were sent. */
    onOut?: () => void;
    onFinished?: () => void;
}

/** A page of ours in a web view, signed in with the app's credentials and joined to it by the bridge. */
export function WebHost(props: Props): ReactNode {
    const web = useRef<WebView>(null);
    const ready = useRef(false);
    const canGoBack = useRef(false);
    const lastPath = useRef(props.path);
    const loadedBuild = useRef<string | null>(null);
    const [opened, setOpened] = useState({ path: props.path, n: 0 });
    const [unsent, setUnsent] = useState<ToApp["unsent"]>({ count: 0, offline: false });
    const [trouble, setTrouble] = useState<string | null>(null);
    const [keyboard, setKeyboard] = useState(0);
    const safe = useSafeAreaInsets();
    const playing = usePlaying();
    const child = props.as === "kid";

    const send = useCallback(<K extends keyof ToPage>(kind: K, body: ToPage[K]) => {
        if (ready.current) web.current?.injectJavaScript(receive(write<ToPage, K>(kind, body)));
    }, []);

    /** Opens the page again from the handoff, which is the only load that carries the headers. */
    // whether this page has a game on screen, so the hold is let go if the page goes away mid-game
    const holding = useRef(false);
    const letGo = useCallback(() => {
        if (!holding.current) return;
        holding.current = false;
        hold({ portrait: null });
    }, []);
    useEffect(() => letGo, [letGo]);

    // the loader over the page until the page is drawn, plus a beat for its own label to take over
    const [drawn, setDrawn] = useState(false);
    const drawing = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showDrawn = useCallback(() => {
        if (drawing.current !== null) return;
        drawing.current = setTimeout(() => {
            setDrawn(true);
            firstPageDrawn();
        }, HANDOVER_MS);
    }, []);
    useEffect(
        () => () => {
            if (drawing.current !== null) clearTimeout(drawing.current);
        },
        [],
    );

    // a page that could not load lets the opening splash go, so its message and Try again show
    useEffect(() => {
        if (trouble !== null) firstPageDrawn();
    }, [trouble]);

    const reopen = useCallback(() => {
        if (drawing.current !== null) clearTimeout(drawing.current);
        drawing.current = null;
        setDrawn(false);
        ready.current = false;
        setTrouble(null);
        setOpened((o) => ({ path: lastPath.current, n: o.n + 1 }));
    }, []);

    const source = useMemo(
        () => ({ uri: handoffUrl(opened.path), headers: headersFor(props.as) }),
        // read once per opening, since the web view keeps the handoff's cookies for later loads
        [opened, props.as],
    );

    const insets = useMemo(
        () =>
            props.fullScreen
                ? { top: safe.top, bottom: safe.bottom, keyboard }
                : { top: 0, bottom: 0, keyboard },
        [props.fullScreen, safe.top, safe.bottom, keyboard],
    );

    const insetsRef = useRef(insets);
    useEffect(() => {
        insetsRef.current = insets;
        send("insets", insets);
    }, [insets, send]);

    useEffect(() => {
        if (props.path === lastPath.current) return;
        lastPath.current = props.path;
        if (ready.current) send("go", { path: props.path, replace: false });
        else reopen();
    }, [props.path, send, reopen]);

    useEffect(() => {
        const shown = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => setKeyboard(e.endCoordinates.height),
        );
        const hidden = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboard(0),
        );
        const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) =>
            send("reducedMotion", { on }),
        );
        const state = AppState.addEventListener("change", (s) => {
            const active = s === "active";
            send("appState", { active });
            if (!active) return;
            void currentBuild().then((now) => {
                if (now !== null && loadedBuild.current !== null && now !== loadedBuild.current) {
                    reopen();
                }
            });
        });
        return () => {
            shown.remove();
            hidden.remove();
            motion.remove();
            state.remove();
        };
    }, [send, reopen]);

    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener("hardwareBackPress", () => {
                if (!canGoBack.current) return false;
                send("back", {});
                return true;
            });
            return () => sub.remove();
        }, [send]),
    );

    const navigation = useNavigation();
    const titled = props.titled;
    const handlers = useMemo<Handlers<ToApp>>(
        () => ({
            ready: () => {
                ready.current = true;
                // a child's view has no routes; its first screen is its own map-style loader
                if (child) showDrawn();
                send("insets", insetsRef.current);
                send("appState", { active: AppState.currentState === "active" });
                void AccessibilityInfo.isReduceMotionEnabled().then((on) =>
                    send("reducedMotion", { on }),
                );
            },
            route: (r) => {
                showDrawn();
                canGoBack.current = r.canGoBack;
                lastPath.current = r.path;
                if (!titled) return;
                navigation.setOptions({
                    title: r.title,
                    headerRight: r.canGoBack
                        ? () => <BarButton label="Back" onPress={() => send("back", {})} />
                        : undefined,
                });
            },
            open: (o) => {
                if (!child) openFromParent(o.path);
            },
            childMode: (c) => {
                if (!child) void enterChild(c.credential, []);
            },
            parentMode: () => {
                if (child) void leftChild(null);
            },
            child: (c) => props.onChild?.(c),
            out: () => props.onOut?.(),
            finished: () => props.onFinished?.(),
            told: feel,
            speak,
            hush,
            print: (p) => {
                void print(p).then((ok) => send("printed", { id: p.id, ok }));
            },
            share: (s) => {
                void share(s);
            },
            playing: (p) => {
                holding.current = p.portrait !== null;
                hold(p);
            },
            unsent: setUnsent,
            failed: (f) => setTrouble(f.message),
        }),
        [child, navigation, titled, send, props, showDrawn],
    );

    const onMessage = (e: WebViewMessageEvent): void => {
        toApp(e.nativeEvent.data, handlers);
    };

    const onShouldStart = (req: ShouldStartLoadRequest): boolean => {
        if (allowed(req.url, child)) return true;
        if (!child && /^https?:\/\//.test(req.url)) void Linking.openURL(req.url);
        return false;
    };

    // a game has the whole phone, so the page keeps clear of the clock and the home bar itself
    const room = playing && !props.fullScreen;
    return (
        <View
            style={[
                s.host,
                room
                    ? {
                          paddingTop: safe.top,
                          paddingBottom: safe.bottom,
                          paddingLeft: safe.left,
                          paddingRight: safe.right,
                      }
                    : null,
            ]}
        >
            <WebView
                key={opened.n}
                ref={web}
                source={source}
                style={s.web}
                applicationNameForUserAgent={APP_TOKEN}
                injectedJavaScriptBeforeContentLoaded={beforeLoad(
                    {
                        app: child ? "kids" : "home",
                        enter: props.start?.enter ?? null,
                        place: props.start?.place ?? null,
                        kid: props.start?.kid ?? null,
                    },
                    child ? credentials().kid : null,
                )}
                onMessage={onMessage}
                onShouldStartLoadWithRequest={onShouldStart}
                onLoadStart={letGo}
                onLoadEnd={() => {
                    void currentBuild().then((b) => {
                        loadedBuild.current = b;
                    });
                }}
                onError={() => setTrouble("The page did not load. Check the connection.")}
                onHttpError={(e) => {
                    const { statusCode, url } = e.nativeEvent;
                    if (statusCode !== 401 || !url.includes("/api/native/web")) return;
                    if (child) void leftChild(null);
                    else settled({ error: "signed-out", status: statusCode });
                }}
                onContentProcessDidTerminate={reopen}
                onRenderProcessGone={reopen}
                pullToRefreshEnabled={false}
                bounces={false}
                overScrollMode="never"
                textZoom={100}
                hideKeyboardAccessoryView
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                setSupportMultipleWindows={false}
                javaScriptCanOpenWindowsAutomatically={false}
                allowsBackForwardNavigationGestures={false}
                webviewDebuggingEnabled={__DEV__}
            />
            <Splash caption={props.opening ?? "Opening"} done={drawn || trouble !== null} />
            {unsent.count > 0 || unsent.offline ? (
                <Text style={s.unsent} accessibilityLiveRegion="polite">
                    {unsentLine(unsent)}
                </Text>
            ) : null}
            {trouble === null ? null : (
                <View style={s.trouble}>
                    <Text style={s.troubleText} accessibilityLiveRegion="assertive">
                        {trouble}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                        onPress={reopen}
                        style={s.again}
                    >
                        <Text style={s.againText}>Try again</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

function unsentLine(u: ToApp["unsent"]): string {
    const waiting =
        u.count === 0
            ? ""
            : u.count === 1
              ? " One answer is waiting to send."
              : ` ${u.count} answers are waiting to send.`;
    return u.offline ? `No connection.${waiting}` : waiting.trim();
}

const s = StyleSheet.create({
    host: { flex: 1, backgroundColor: COLOR.paper },
    web: { flex: 1, backgroundColor: COLOR.paper },
    unsent: {
        backgroundColor: COLOR.glow,
        color: COLOR.glowInk,
        fontSize: 15,
        paddingHorizontal: 16,
        paddingVertical: 10,
        textAlign: "center",
    },
    trouble: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 24,
        backgroundColor: COLOR.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLOR.grid,
        padding: 16,
        gap: 12,
    },
    troubleText: { fontSize: 16, color: COLOR.ink },
    again: {
        minHeight: TOUCH,
        borderRadius: 22,
        backgroundColor: COLOR.pen,
        alignItems: "center",
        justifyContent: "center",
    },
    againText: { color: COLOR.card, fontSize: 17, fontWeight: "600" },
});
