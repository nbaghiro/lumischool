import Constants from "expo-constants";
import { Platform } from "react-native";

const extra: unknown = Constants.expoConfig?.extra;

function configured(key: "origin" | "devOrigin"): string | undefined {
    if (typeof extra !== "object" || extra === null || !(key in extra)) return undefined;
    const value: unknown = Object.getOwnPropertyDescriptor(extra, key)?.value;
    return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The origin every page and API call goes to. `EXPO_PUBLIC_LUMISCHOOL_ORIGIN` wins, then app.json's
 * `extra`, whose `devOrigin` is the root's dev server on 8500 (.docs/local.md).
 */
export const ORIGIN = (
    process.env.EXPO_PUBLIC_LUMISCHOOL_ORIGIN ||
    configured(__DEV__ ? "devOrigin" : "origin") ||
    "https://lumischool.ai"
).replace(/\/+$/, "");

/** The token `deviceName` in server/auth.ts reads, with the kind of device it names. */
const DEVICE = Platform.OS === "ios" ? (Platform.isPad ? "iPad" : "iPhone") : "Android";

export const APP_TOKEN = "lumischoolApp/1";
export const USER_AGENT = `${APP_TOKEN} (${DEVICE})`;
