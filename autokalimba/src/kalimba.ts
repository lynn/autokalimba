import { type Signal, signal } from "@preact/signals";
import { type InstrumentDescription, instruments } from "./instrument";
import type { Note, SampleBuffer } from "./note";
import { OscillatorNote, SampleNote } from "./note";

interface TargetDescription {
	type: "bass" | "chord";
	notes: number[];
}

interface Target {
	description: TargetDescription;
	active: Signal<boolean>;
	notes: Note[];
}

const targetDescriptions: [string, TargetDescription][] = [
	["a", { type: "bass", notes: [0] }],
	["bb", { type: "bass", notes: [1] }],
	["b", { type: "bass", notes: [2] }],
	["c", { type: "bass", notes: [3] }],
	["db", { type: "bass", notes: [4] }],
	["d", { type: "bass", notes: [5] }],
	["eb", { type: "bass", notes: [6] }],
	["e", { type: "bass", notes: [-5] }],
	["f", { type: "bass", notes: [-4] }],
	["gb", { type: "bass", notes: [-3] }],
	["g", { type: "bass", notes: [-2] }],
	["ab", { type: "bass", notes: [-1] }],
	["Δ9", { type: "chord", notes: [7, 11, 14, 16] }],
	["m9", { type: "chord", notes: [7, 10, 14, 15] }],
	["7s", { type: "chord", notes: [7, 10, 12, 17] }],
	["7b9", { type: "chord", notes: [7, 10, 13, 16] }],
	["13s", { type: "chord", notes: [10, 14, 17, 21] }],
	["Δ", { type: "chord", notes: [7, 11, 12, 16] }],
	["m7", { type: "chord", notes: [7, 10, 12, 15] }],
	["7", { type: "chord", notes: [7, 10, 12, 16] }],
	["7#5", { type: "chord", notes: [8, 10, 12, 16] }],
	["13", { type: "chord", notes: [10, 14, 16, 21] }],
	["6", { type: "chord", notes: [7, 9, 12, 16] }],
	["m6", { type: "chord", notes: [7, 9, 12, 15] }],
	["ø", { type: "chord", notes: [6, 10, 12, 15] }],
	["o", { type: "chord", notes: [6, 9, 12, 15] }],
	["II/", { type: "chord", notes: [9, 14, 12, 18] }],
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
	o: "7b9",
	p: "13s",
	h: "Δ",
	j: "m7",
	k: "7",
	l: "7#5",
	";": "13",
	n: "6",
	m: "m6",
	",": "ø",
	".": "o",
	"/": "II/",
};

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
	private keyboardLayout: Record<string, TargetName> = qwerty;

	/**
	 * Map from target names to target state.
	 */
	private targets: Map<TargetName, Target> = new Map(
		targetDescriptions.map(([name, description]) => [
			name,
			{ description, active: signal(false), notes: [] },
		]),
	);

	/**
	 * Sample buffers loaded for the current instrument.
	 */
	private sampleBuffers: SampleBuffer[] = [];

	/**
	 * A callback used to create a note.
	 */
	private makeNote: () => Note = () => new OscillatorNote(this.ctx);

	/**
	 * AudioNode into which all autokalimba audio is mixed.
	 */
	private mix: AudioNode;

	public strumDelay = 0.06;
	public strumStyle: undefined | "random" | "up" | "down" | "timed" = "random";

	constructor(private ctx: AudioContext) {
		this.mix = ctx.createGain();
		// Default values except threshold and knee
		const compressor = new DynamicsCompressorNode(ctx, {
			threshold: -20,
			knee: 20,
			ratio: 12,
			attack: 0.003,
			release: 0.25,
		});
		this.mix.connect(compressor);
		compressor.connect(ctx.destination);
		this.loadInstrument(instruments.Rhodes);
	}

	/**
	 * Load all the samples for the given instrument. When the promise resolves,
	 * the kalimba is ready to be played.
	 */
	async loadInstrument(description: InstrumentDescription): Promise<void> {
		const sampleBuffers: SampleBuffer[] = [];
		await Promise.all(
			description.samples.map(async (sample, i) => {
				const response = await fetch(`instruments/${sample.name}`);
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				this.ctx.decodeAudioData(arrayBuffer, (buffer) => {
					sampleBuffers[i] = {
						buffer,
						frequency: sample.frequency,
						only: sample.only,
					};
				});
			}),
		);

		this.sampleBuffers = sampleBuffers;
		this.makeNote = () => new SampleNote(this.ctx, this.sampleBuffers);
	}

	private noteDelay(baseDelay: number): number {
		if (this.strumStyle === undefined) {
			return 0;
		}

		if (this.strumStyle === "random") {
			return this.strumDelay * Math.random();
		}

		const factor = this.strumStyle === "up" ? baseDelay : 1 - baseDelay;
		const slightlyRandom = 1 + (Math.random() - 0.5) * 0.23;
		return this.strumDelay * factor * slightlyRandom;
	}

	private playBassNote(semitones: number): Note {
		const frequency = 220 * 2 ** (semitones / 12);
		const note = this.makeNote();
		note.start(frequency, 0.5, 0, true, this.mix);
		return note;
	}

	private playChordNote(semitones: number, delay: number): Note {
		const frequency = 220 * 2 ** (semitones / 12);
		const note = this.makeNote();
		note.start(frequency, 0.2, delay, false, this.mix);
		return note;
	}

	/**
	 * Initiate playback for the given target. Return whether initiation was
	 * successful (i.e. a target by this name exists and was not yet active).
	 */
	private startTarget(targetName: string): boolean {
		const target = this.targets.get(targetName);
		if (!target || target.active.value) {
			return false;
		}

		const notes = target.description.notes.map((st, i, sts) =>
			target.description.type === "bass"
				? this.playBassNote(st)
				: this.playChordNote(st, this.noteDelay(i / sts.length)),
		);

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
		target.notes = [];
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
	pointerDown(pointerId: number, targetName: string) {
		if (this.startTarget(targetName)) {
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
		if (this.keysHeld.has(e.key)) return;

		const targetName = this.keyboardLayout[e.key];

		if (targetName) {
			e.preventDefault();
			if (this.startTarget(targetName)) {
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
