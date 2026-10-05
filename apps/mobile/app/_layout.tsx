import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useMode } from "../mode";
import { load } from "../store";
import { FACES } from "../art";
import { useFirstPageDrawn } from "../chrome";
import { Splash } from "../splash";
import { StackHeader } from "../tabs";
import { COLOR } from "../ui";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** The longest the opening splash waits for the first page before it steps aside anyway. */
const OPENING_LONGEST_MS = 15_000;

export default function Root(): ReactNode {
    const mode = useMode();
    // a face that fails to load leaves the system's in its place rather than no app
    const [faces, failed] = useFonts(FACES);
    const ready = mode.kind !== "loading" && (faces || failed !== null);

    useEffect(() => {
        void load();
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
            () => undefined,
        );
    }, []);

    // the system's splash goes on the first frame and ours, with the plane, carries on in its place
    // until the first page is drawn, so there is one splash from the icon to the page
    useEffect(() => {
        SplashScreen.hideAsync().catch(() => undefined);
    }, []);
    const drawn = useFirstPageDrawn();
    const [late, setLate] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setLate(true), OPENING_LONGEST_MS);
        return () => clearTimeout(timer);
    }, []);
    const signedIn = mode.kind === "parent" || mode.kind === "child";
    const opening =
        mode.kind === "parent"
            ? "Opening your family"
            : mode.kind === "child"
              ? "Opening the children's view"
              : undefined;

    if (!ready) return <Splash />;

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLOR.paper },
                    headerTintColor: COLOR.pen,
                    headerTitleStyle: { color: COLOR.ink },
                }}
            >
                <Stack.Protected guard={mode.kind === "parent"}>
                    <Stack.Screen name="(parent)" />
                    <Stack.Screen
                        name="page"
                        options={{ headerShown: true, header: () => <StackHeader /> }}
                    />
                    <Stack.Screen name="switch-family" />
                    <Stack.Screen name="open-child" />
                    <Stack.Screen name="unlock" options={{ presentation: "modal" }} />
                </Stack.Protected>
                <Stack.Protected guard={mode.kind !== "child"}>
                    <Stack.Screen name="sign-in" />
                    <Stack.Screen name="start" />
                    <Stack.Screen name="code" />
                    <Stack.Screen name="choose" />
                </Stack.Protected>
                <Stack.Protected guard={mode.kind === "signed-out"}>
                    <Stack.Screen name="kid" options={{ animation: "none" }} />
                </Stack.Protected>
                <Stack.Protected guard={mode.kind === "child"}>
                    <Stack.Screen name="child" options={{ gestureEnabled: false }} />
                </Stack.Protected>
            </Stack>
            <Splash caption={opening} done={!signedIn || drawn || late} />
        </SafeAreaProvider>
    );
}
