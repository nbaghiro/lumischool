import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    AccessibilityInfo,
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { BRAND, DRAWINGS, MARGIN } from "./art";
import { COLOR, FONT } from "./ui";

/** The logo's width, which app.json's splash sets too, so the system's splash hands over without a jump. */
export const LOCKUP_WIDTH = 240;
const LOCKUP_HEIGHT = (LOCKUP_WIDTH * BRAND.lockup.height) / BRAND.lockup.width;

/** The plane's path under the logo, and its size: half the map's Fly button's. */
const RUN = 220;
const PLANE = { width: 66, height: 44 };
/** The way's dashes, as the map draws a way not yet walked: 6 points of ink and 5 of gap. */
const DASHES = Array.from({ length: Math.floor(RUN / 11) }, (_, i) => i);
/** One glide along the path, and the fade once the page is drawn, in milliseconds. */
const GLIDE_MS = 2200;
const FADE_MS = 220;

/**
 * The app's splash and its one loading screen: the squared book as the ground, the logo where the
 * system's splash put it, and the paper plane gliding along a dashed way under it, with what is
 * opening under that. It stands over a page until `done`, then fades. Under reduced motion the plane
 * rests at the way's end.
 */
export function Splash(props: { caption?: string; done?: boolean }): ReactNode {
    const done = props.done === true;
    const screen = useWindowDimensions();
    const fade = useRef(new Animated.Value(1)).current;
    const glide = useRef(new Animated.Value(1)).current;
    const [gone, setGone] = useState(false);

    useEffect(() => {
        let flight: Animated.CompositeAnimation | null = null;
        void AccessibilityInfo.isReduceMotionEnabled().then((still) => {
            if (still) return;
            glide.setValue(0);
            flight = Animated.loop(
                Animated.timing(glide, {
                    toValue: 1,
                    duration: GLIDE_MS,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            );
            flight.start();
        });
        return () => flight?.stop();
    }, [glide]);

    useEffect(() => {
        if (!done) {
            setGone(false);
            fade.setValue(1);
            return;
        }
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
            ({ finished }) => {
                if (finished) setGone(true);
            },
        );
    }, [done, fade]);

    if (gone) return null;
    const art = DRAWINGS.plane;
    const scale = PLANE.width / (art.width - 2 * MARGIN);
    // along the way, a little rise and fall as a glider makes, and in and out of sight at the ends
    const x = glide.interpolate({ inputRange: [0, 1], outputRange: [-RUN / 2, RUN / 2] });
    const y = glide.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [4, -4, 2, -3, 4],
    });
    const seen = glide.interpolate({
        inputRange: [0, 0.12, 0.88, 1],
        outputRange: [0, 1, 1, 0],
    });
    return (
        <Animated.View
            style={[StyleSheet.absoluteFill, s.ground, { opacity: fade }]}
            pointerEvents={done ? "none" : "auto"}
            accessibilityRole="progressbar"
            accessibilityLabel={props.caption ?? "lumischool"}
        >
            {/* a repeated picture needs its size in points on iOS, not a fill */}
            <Image
                source={BRAND.paper.source}
                resizeMode="repeat"
                style={[s.paper, { width: screen.width, height: screen.height }]}
            />
            <View style={s.middle}>
                <Image
                    source={BRAND.lockup.source}
                    style={{ width: LOCKUP_WIDTH, height: LOCKUP_HEIGHT }}
                    accessibilityIgnoresInvertColors
                />
                <View style={s.below}>
                    <View style={s.way}>
                        {/* drawn as marks, since React Native leaves a one-sided dashed border solid */}
                        <View style={s.dashes}>
                            {DASHES.map((d) => (
                                <View key={d} style={s.dash} />
                            ))}
                        </View>
                        <Animated.View
                            style={[
                                s.plane,
                                {
                                    opacity: seen,
                                    transform: [{ translateX: x }, { translateY: y }],
                                },
                            ]}
                        >
                            <Image
                                source={art.source}
                                style={{
                                    width: art.width * scale,
                                    height: art.height * scale,
                                    margin: -MARGIN * scale,
                                }}
                                accessibilityIgnoresInvertColors
                            />
                        </Animated.View>
                    </View>
                    {props.caption === undefined ? null : (
                        <Text style={s.caption}>{`${props.caption}…`}</Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    ground: { backgroundColor: COLOR.paper, overflow: "hidden" },
    paper: { position: "absolute", top: 0, left: 0 },
    middle: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    // under the logo, without moving it off the middle the system's splash put it in
    below: {
        position: "absolute",
        top: "50%",
        marginTop: LOCKUP_HEIGHT / 2 + 24,
        alignItems: "center",
        gap: 14,
    },
    way: { width: RUN + PLANE.width, height: PLANE.height, justifyContent: "center" },
    dashes: {
        position: "absolute",
        left: PLANE.width / 2,
        right: PLANE.width / 2,
        top: PLANE.height / 2 + 6,
        flexDirection: "row",
        justifyContent: "space-between",
        opacity: 0.45,
    },
    dash: { width: 6, height: 1.5, borderRadius: 1, backgroundColor: COLOR.pen },
    plane: { position: "absolute", left: RUN / 2, width: PLANE.width, height: PLANE.height },
    caption: { fontFamily: FONT.read, fontSize: 16, lineHeight: 22, color: COLOR.inkSoft },
});
