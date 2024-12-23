import { signal } from "@preact/signals";
import { Kalimba } from "./kalimba";
import { createContext } from "preact";

const ctx = new AudioContext({
	latencyHint: "interactive",
});

export const KalimbaContext = createContext(new Kalimba(ctx));

export const SettingsContext = createContext({
	hue: signal(0),
	sharps: signal(0),
});
