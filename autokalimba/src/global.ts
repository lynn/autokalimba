import { effect, signal, type Signal } from "@preact/signals";
import { Kalimba } from "./kalimba";
import type { InstrumentName } from "./instrument";
import { createContext } from "preact";

export type StrumStyle = "random" | "up" | "down" | "timed";

export type Waveform =
	| "chime"
	| "sine"
	| "triangle"
	| "square"
	| "sawtooth"
	| "fm";

export type FilterType = "lowpass" | "highpass" | "bandpass";

/**
 * Settings for the synthesizer (`OscillatorInstrument`). All times are in
 * seconds; levels are between 0 and 1.
 */
export const synthSettings = {
	waveform: signal<Waveform>("chime"),
	/**
	 * FM modulator frequency, as a multiple of the note frequency.
	 */
	fmRatio: signal(1),
	/**
	 * FM modulation index (brightness).
	 */
	fmIndex: signal(2),
	/**
	 * How long the FM index takes to die down, in seconds. The maximum value
	 * (`fmDecayMax`) means it never does.
	 */
	fmDecay: signal(1),
	/**
	 * How much the FM modulator modulates itself, from 0 (a sine) towards 1
	 * (nearly a sawtooth).
	 */
	fmFeedback: signal(0),
	/**
	 * Time before the vibrato starts, in seconds.
	 */
	vibratoDelay: signal(0.3),
	/**
	 * Vibrato rate, in Hz.
	 */
	vibratoSpeed: signal(5),
	/**
	 * Vibrato depth, in cents. 0 turns vibrato off.
	 */
	vibratoWidth: signal(0),
	attack: signal(0.01),
	decay: signal(1.2),
	sustain: signal(0.2),
	release: signal(0.3),
	filterType: signal<FilterType>("lowpass"),
	/**
	 * Filter cutoff frequency when the filter envelope is at zero, in Hz.
	 */
	filterCutoff: signal(1200),
	/**
	 * Filter resonance (Q).
	 */
	filterResonance: signal(1),
	/**
	 * How far the filter envelope moves the cutoff at its peak, in octaves.
	 */
	filterEnvAmount: signal(2),
	filterAttack: signal(0.01),
	filterDecay: signal(0.6),
	filterSustain: signal(0.2),
	filterRelease: signal(0.3),
	delayTime: signal(0.35),
	delayFeedback: signal(0.35),
	/**
	 * Volume of the delayed signal mixed into the output.
	 */
	delayMix: signal(0.3),
};

export type SynthSettings = typeof synthSettings;

export const fmDecayMax = 8;

export const settings = {
	hue: signal(0),
	sharps: signal(0),
	splitKeys: signal(true),
	instrument: signal<InstrumentName>("Synth"),
	/**
	 * Maximum delay for strummed notes, in seconds.
	 */
	strumDelay: signal(0.04),
	/**
	 * Determines how chords are strummed.
	 */
	strumStyle: signal<StrumStyle>("random"),
	/**
	 * Lowest note reachable by the bass keys, in semitones from A110. Chords
	 * are voiced on top of the bass note, so this also moves their voicing.
	 */
	lowestBassNote: signal(-3),
	/**
	 * Each chord note is detuned by a random amount up to this many cents,
	 * for a less perfect, chorus-like sound.
	 */
	detune: signal(0),
	/**
	 * Name of the chord on the configurable last chord button (see
	 * `specialChords`).
	 */
	specialChord: signal("II/"),
	/**
	 * Bass boost, from 0 (off) to 1, for small speakers.
	 */
	phat: signal(0),
	/**
	 * Voice each chord as if the bass range slider (`lowestBassNote`) were
	 * moved by a random number of semitones, up to this many either way. The
	 * bass notes themselves don't move.
	 */
	voicingSpread: signal(0),
	synth: synthSettings,
};

export type Settings = typeof settings;

/**
 * Load settings from localStorage, and save them there whenever they change.
 */
function persist(prefix: string, group: Record<string, unknown>) {
	for (const [name, value] of Object.entries(group)) {
		const key = `${prefix}-${name}`;
		if (!(value instanceof Object && "peek" in value)) {
			persist(key, value as Record<string, unknown>);
			continue;
		}
		const s = value as Signal<unknown>;
		try {
			const stored = window.localStorage.getItem(key);
			if (stored !== null) s.value = JSON.parse(stored);
		} catch {
			// Ignore missing or broken storage.
		}
		effect(() => {
			const json = JSON.stringify(s.value);
			try {
				window.localStorage.setItem(key, json);
			} catch {
				// Ignore missing or broken storage.
			}
		});
	}
}

persist("autokalimba-beta", settings);

export const SettingsContext = createContext(settings);

const ctx = new AudioContext({
	latencyHint: "interactive",
});

export const KalimbaContext = createContext(new Kalimba(ctx, settings));
