import { Platform } from "react-native";
import type { WearableProvider } from "./types";
import { NoopProvider } from "./noop";

export * from "./types";
export * from "./taxonomy";

let _provider: WearableProvider | null = null;

export function getWearableProvider(): WearableProvider {
  if (_provider) return _provider;
  if (Platform.OS === "ios") {
    _provider = require("./ios").getIOSProvider();
  } else if (Platform.OS === "android") {
    _provider = require("./android").getAndroidProvider();
  } else {
    _provider = new NoopProvider();
  }
  return _provider!;
}
