import { signal } from "@preact/signals";
import { Kalimba } from "./kalimba";
import { createContext } from "preact";

export type StrumStyle = undefined | "random" | "up" | "down" | "timed";

export const settings = {
	hue: signal(0),
	sharps: signal(0),
	horizontalChords: signal(false),
	splitKeys: signal(true),
	/**
	 * Maximum delay for strummed notes, in seconds.
	 */
	strumDelay: signal(0.1),
	/**
	 * Determines how chords are strummed.
	 */
	strumStyle: signal<StrumStyle>("random"),
	/**
	 * Lowest note reachable by the bass keys, in semitones from A.
	 */
	lowestBassNote: signal(0),
};

export type Settings = typeof settings;

export const SettingsContext = createContext(settings);

const ctx = new AudioContext({
	latencyHint: "interactive",
});

export const KalimbaContext = createContext(new Kalimba(ctx, settings));
