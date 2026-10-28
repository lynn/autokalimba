import { effect, type Signal, signal } from "@preact/signals";
import {
	type Instrument,
	type InstrumentName,
	instruments,
	OscillatorInstrument,
	SampleInstrument,
	type SampleInstrumentDescription,
} from "./instrument";
import type { Note, Sample } from "./note";
import type { Settings } from "./global";
import { chords, specialChord } from "./chord";
import { StenoKeyboard } from "./steno";

interface TargetDescription {
	type: "bass" | "bass-split" | "split-last" | "chord";
	semitones: number[];
}

interface Target {
	description: TargetDescription;
	active: Signal<boolean>;
	/**
	 * Notes currently playing from this target.
	 */
	notes: Note[];
	/**
	 * For chord targets: the random voicing shift it was played with (see
	 * `Settings.voicingSpread`).
	 */
	voicingShift: number;
	/**
	 * Random detune for each note, in cents (see `Settings.detune`).
	 */
	detunes: number[];
}

const noteNames: string[] = "a bb b c db d eb e f gb g ab".split(" ");

const bassTargetDescriptions: [string, TargetDescription][] = noteNames.flatMap(
	(name, i) => [
		[name, { type: "bass", semitones: [i] }],
		[`${name}-split`, { type: "bass-split", semitones: [i] }],
	],
);

// The portrait layout's piano keyboard has a second C at the top.
bassTargetDescriptions.push(
	["c-high", { type: "bass", semitones: [3] }],
	["c-high-split", { type: "bass-split", semitones: [3] }],
);

const chordTargetDescriptions: [string, TargetDescription][] = chords.map(
	(chord) => [chord.name, { type: "chord", semitones: chord.semitones }],
);

const scaleDegreeTargetDescriptions: [string, TargetDescription][] = Array.from(
	{ length: 12 },
	(_, i) => [`s-${i}`, { type: "chord", semitones: [i] }],
);

const targetDescriptions: [string, TargetDescription][] = [
	...bassTargetDescriptions,
	...chordTargetDescriptions,
	...scaleDegreeTargetDescriptions,
	["split-last", { type: "split-last", semitones: [] }],
	// Its semitones follow `Settings.specialChord`.
	["special", { type: "chord", semitones: [] }],
];

type TargetName = string;

const qwerty: Record<string, TargetName> = {
	"2": "db",
	"3": "f",
	"4": "a",
	w: "ab",
	e: "c",
	r: "e",
	s: "eb",
	d: "g",
	f: "b",
	x: "bb",
	c: "d",
	v: "gb",
	y: "Δ9",
	u: "m9",
	i: "7s",
	o: "7♭9",
	p: "13s",
	h: "Δ",
	j: "m7",
	k: "7",
	l: "7♯5",
	";": "13",
	n: "6",
	m: "m6",
	",": "ø",
	".": "dim",
	"/": "special",
};

type DisplayLayout = "touch" | "keyboard" | "steno";

/**
 * The autokalimba.
 *
 * The basic architecture is that multiple "inputs" (such as a button on the
 * page, or a keyboard key) can activate a "target" (such as the E♭ bass note or
 * the maj7 chord).
 *
 * Each target then has an `active` signal, which tells buttons to light up, and
 * associated `notes`, which can be controlled in "aftertouch" by wiggling the
 * pointer that activated the target.
 */
export class Kalimba {
	/**
	 * A map from `pointerId` (pointers pressing buttons on the autokalimba) to
	 * target names they are activating.
	 */
	private pointers: Map<number, TargetName> = new Map();

	/**
	 * A map from key names to target names, e.g. `"y": "Δ9"`
	 */
	readonly keyboardLayout: Record<string, TargetName> = qwerty;

	/**
	 * Which layout to use for displaying the buttons.
	 */
	readonly displayLayout: Signal<DisplayLayout> = signal("touch");

	/**
	 * Map from target names to target state.
	 */
	private targets: Map<TargetName, Target> = new Map(
		targetDescriptions.map(([name, description]) => [
			name,
			{
				description,
				active: signal(false),
				notes: [],
				voicingShift: 0,
				detunes: [],
			},
		]),
	);

	/**
	 * AudioNode into which all autokalimba audio is mixed.
	 */
	private mix: AudioNode;

	private synth: Instrument;

	/**
	 * Sampled instruments, once their samples have loaded.
	 */
	private sampled: Map<InstrumentName, Instrument> = new Map();

	/**
	 * Sampled instruments whose samples are loading or loaded.
	 */
	private requested: Set<InstrumentName> = new Set();

	/**
	 * The instrument chosen in the settings. (Until a sampled instrument has
	 * loaded, the synth plays instead.)
	 */
	private get instrument(): Instrument {
		return this.sampled.get(this.settings.instrument.value) ?? this.synth;
	}

	/**
	 * Semitone offset (from A) of the last bass key played.
	 */
	private bassSemitones = 0;

	/**
	 * Semitone offsets (from `bassSemitones`) for the last chord key played.
	 */
	private chordSemitones: number[] = [];

	/**
	 * When the last bass note was played, for the "timed" strum style.
	 */
	private lastBassTime = Date.now();

	readonly stenoKeyboard: StenoKeyboard;

	constructor(
		private ctx: AudioContext,
		private settings: Settings,
	) {
		this.mix = ctx.createGain();
		// Default values except threshold and knee
		const compressor = new DynamicsCompressorNode(ctx, {
			threshold: -20,
			knee: 20,
			ratio: 12,
			attack: 0.003,
			release: 0.25,
		});
		this.connectPhat(this.mix, compressor);
		compressor.connect(ctx.destination);
		this.synth = new OscillatorInstrument(ctx, settings.synth, this.mix);
		// Load samples for the chosen instrument whenever the choice changes.
		effect(() => {
			const name = this.settings.instrument.value;
			if (name === "Synth" || !(name in instruments)) return;
			if (this.requested.has(name)) return;
			this.requested.add(name);
			this.loadInstrument(instruments[name]).then(
				(instrument) => this.sampled.set(name, instrument),
				(error) => {
					console.error(`Couldn't load ${name}:`, error);
					this.requested.delete(name);
				},
			);
		});

		this.stenoKeyboard = new StenoKeyboard(
			this.pointerDown.bind(this),
			this.pointerUp.bind(this),
		);
	}

	/**
	 * Connect `input` to `output` through the "phat" bass boost (see
	 * `Settings.phat`): a low shelf and low-mid bump, plus saturated bass for
	 * harmonics that small speakers can play.
	 */
	private connectPhat(input: AudioNode, output: AudioNode) {
		const ctx = this.ctx;
		const shelf = new BiquadFilterNode(ctx, { type: "lowshelf", frequency: 180 });
		const bump = new BiquadFilterNode(ctx, {
			type: "peaking",
			frequency: 350,
			Q: 0.9,
		});
		input.connect(shelf);
		shelf.connect(bump);
		bump.connect(output);

		const bassOnly = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 200 });
		const curve = new Float32Array(1024);
		for (let i = 0; i < curve.length; i++) {
			const x = (i / (curve.length - 1)) * 2 - 1;
			curve[i] = Math.tanh(4 * x) / Math.tanh(4);
		}
		const saturate = new WaveShaperNode(ctx, { curve, oversample: "2x" });
		const harmonicsOnly = new BiquadFilterNode(ctx, {
			type: "highpass",
			frequency: 250,
		});
		const harmonics = ctx.createGain();
		input.connect(bassOnly);
		bassOnly.connect(saturate);
		saturate.connect(harmonicsOnly);
		harmonicsOnly.connect(harmonics);
		harmonics.connect(output);

		effect(() => {
			const phat = this.settings.phat.value;
			const now = ctx.currentTime;
			shelf.gain.setTargetAtTime(12 * phat, now, 0.02);
			bump.gain.setTargetAtTime(4 * phat, now, 0.02);
			harmonics.gain.setTargetAtTime(0.6 * phat, now, 0.02);
		});
	}

	/**
	 * Load all the samples for the given instrument. When the promise resolves,
	 * the kalimba is ready to be played.
	 */
	async loadInstrument(
		description: SampleInstrumentDescription,
	): Promise<Instrument> {
		const sampleBuffers: Sample[] = await Promise.all(
			description.samples.map(async (sample) => {
				const response = await fetch(`instruments/${sample.name}`);
				const arrayBuffer = await response.arrayBuffer();
				const buffer = await this.ctx.decodeAudioData(arrayBuffer);
				return { buffer, frequency: sample.frequency, only: sample.only };
			}),
		);
		return new SampleInstrument(description, sampleBuffers);
	}

	/**
	 * The destination for new notes.
	 */
	private output(): AudioNode {
		return this.instrument.input ?? this.mix;
	}

	/**
	 * The delay before the `i`th lowest of `n` chord notes, as in the
	 * original autokalimba.
	 */
	private noteDelay(i: number, n: number): number {
		const style = this.settings.strumStyle.value;
		const strum = this.settings.strumDelay.value;
		const tinyRandom = 1 + (Math.random() - 0.5) * 0.23;
		switch (style) {
			case "timed":
				return ((Date.now() - this.lastBassTime) / 1e3) * [0, 1, 2, 1][i % 4];
			case "random":
				return strum * Math.random();
			case "up":
				return ((strum * i) / n) * tinyRandom;
			case "down":
				return ((strum * (n - 1 - i)) / n) * tinyRandom;
			default:
				return 0;
		}
	}

	/**
	 * The frequency of a bass note `semitones` above A, put in the octave
	 * starting `lowest` semitones above A110.
	 */
	private wrapBass(semitones: number, lowest: number): number {
		const offset = (semitones - lowest) % 12;
		return 110 * 2 ** ((lowest + ((offset + 12) % 12)) / 12);
	}

	/**
	 * The frequency of a chord note: as in the original autokalimba, it's
	 * built on the last bass note played (in the octave chosen by the slider),
	 * then moved by an octave if it's outside the instrument's range.
	 *
	 * `voicingShift` pretends the slider was moved by that many semitones (see
	 * `Settings.voicingSpread`), and `detune` is in cents.
	 */
	private chordFrequency(
		semitones: number,
		detune: number,
		voicingShift: number,
	): number {
		const lowest = this.settings.lowestBassNote.value + voicingShift;
		const bass = this.wrapBass(this.bassSemitones, lowest);
		const frequency = bass * 2 ** (semitones / 12);
		return (
			this.instrument.remapFrequency(frequency) *
			(this.instrument.octave ?? 1) *
			2 ** (detune / 1200)
		);
	}

	/**
	 * A random voicing shift in semitones, within the spread set in the
	 * settings.
	 */
	private randomVoicingShift(): number {
		const spread = this.settings.voicingSpread.value;
		return Math.floor(Math.random() * (2 * spread + 1)) - spread;
	}

	/**
	 * A random detune in cents, within the spread set in the settings.
	 */
	private randomDetune(): number {
		return (Math.random() - 0.5) * 2 * this.settings.detune.value;
	}

	private adjustChordNotes() {
		for (const target of this.targets.values()) {
			if (target.description.type === "chord" && target.notes.length) {
				target.description.semitones.map((semitones, i) => {
					target.notes[i].setFrequency(
						this.chordFrequency(
							semitones,
							target.detunes[i],
							target.voicingShift,
						),
					);
				});
			}
		}
	}

	private adjustBassNotes() {
		for (const target of this.targets.values()) {
			if (target.description.type === "bass-split" && target.notes.length) {
				target.description.semitones.map((semitones, i) => {
					target.notes[i].setFrequency(
						this.bassFrequency(semitones, "bass-split"),
					);
				});
			}
		}
	}

	private splitBassOffset(): number {
		return this.chordSemitones.some((x) => x % 12 === 6 || x % 12 === 8)
			? -6
			: -5;
	}

	private bassFrequency(
		rootSemitones: number,
		type: "bass" | "bass-split",
	): number {
		const splitOffset = type === "bass-split" ? this.splitBassOffset() : 0;
		return (
			this.wrapBass(
				rootSemitones + splitOffset,
				this.settings.lowestBassNote.value,
			) * (this.instrument.octave ?? 1)
		);
	}

	private playBassNote(semitones: number, type: "bass" | "bass-split"): Note {
		this.bassSemitones = semitones;
		this.lastBassTime = Date.now();
		this.adjustChordNotes();
		const frequency = this.bassFrequency(semitones, type);
		const note = this.instrument.makeNote(this.ctx, frequency, true);
		note.start(frequency, 0.5, 0, this.output());
		return note;
	}

	private playChord(
		semitones: number[],
		detunes: number[],
		voicingShift: number,
	): Note[] {
		this.chordSemitones = semitones;
		this.adjustBassNotes();
		const frequencies = semitones.map((st, i) =>
			this.chordFrequency(st, detunes[i], voicingShift),
		);
		// Strum from the lowest note up.
		const sorted = [...frequencies].sort((a, b) => a - b);
		return frequencies.map((frequency) => {
			const delay = this.noteDelay(
				sorted.indexOf(frequency),
				frequencies.length,
			);
			const note = this.instrument.makeNote(this.ctx, frequency, false);
			note.start(frequency, 0.2, delay, this.output());
			return note;
		});
	}

	/**
	 * Initiate playback for the given target. Return whether initiation was
	 * successful (i.e. a target by this name exists and was not yet active).
	 */
	private startTarget(targetName: string): boolean {
		// Browsers keep audio suspended until the user interacts with the page.
		if (this.ctx.state === "suspended") this.ctx.resume();

		const target = this.targets.get(targetName);
		if (!target || target.active.value) {
			console.warn("Unknown target:", targetName);
			return false;
		}

		if (targetName === "special") {
			target.description.semitones = specialChord(
				this.settings.specialChord.value,
			).semitones;
		}
		const { type, semitones } = target.description;
		target.detunes = semitones.map(() => this.randomDetune());
		target.voicingShift = this.randomVoicingShift();
		const notes =
			type === "split-last"
				? [this.playBassNote(this.bassSemitones, "bass-split")]
				: type === "bass" || type === "bass-split"
					? [this.playBassNote(semitones[0], type)]
					: this.playChord(semitones, target.detunes, target.voicingShift);
		target.active.value = true;
		target.notes = notes;
		return true;
	}

	/**
	 * Stop all notes sounding from the given target.
	 */
	private stopTarget(targetName: string) {
		const target = this.targets.get(targetName);
		if (!target) return;

		for (const note of target.notes) {
			note.stop();
		}
		target.active.value = false;
	}

	/**
	 * Is the given target being activated? (This decides whether to light up a
	 * button, so that the buttons still light up when you use the keyboard.)
	 */
	isActive(targetName: string): boolean {
		const target = this.targets.get(targetName);
		return target ? target.active.value : false;
	}

	/**
	 * Called when a pointer hits a target on the autokalimba.
	 */
	pointerDown(
		pointerId: number,
		targetName: string,
		displayLayout: DisplayLayout = "touch",
	) {
		if (this.startTarget(targetName)) {
			this.displayLayout.value = displayLayout;
			this.pointers.set(pointerId, targetName);
		}
	}

	/**
	 * Called when a pointer is released.
	 */
	pointerUp(pointerId: number) {
		const targetName = this.pointers.get(pointerId);
		this.pointers.delete(pointerId);
		if (!targetName) return;
		this.stopTarget(targetName);
	}

	private keysHeld: Set<string> = new Set();

	/**
	 * Called when a key on the keyboard is pressed.
	 */
	keyDown(e: KeyboardEvent) {
		if (e.repeat) return;
		if (this.stenoKeyboard.isConnected()) return;
		if (this.keysHeld.has(e.key)) return;

		const targetName = this.keyboardLayout[e.key];

		if (targetName) {
			e.preventDefault();
			if (this.startTarget(targetName)) {
				this.displayLayout.value = "keyboard";
				this.keysHeld.add(e.key);
			}
		}
	}

	/**
	 * Called when a key on the keyboard is released.
	 */
	keyUp(e: KeyboardEvent) {
		if (!this.keysHeld.delete(e.key)) return;
		const targetName = this.keyboardLayout[e.key];

		if (targetName) {
			e.preventDefault();
			this.stopTarget(targetName);
		}
	}
}
