import { signal, type Signal } from "@preact/signals";
import { instruments, type InstrumentDescription } from "./instrument";

/**
 * A note sounding from the kalimba.
 */
interface Note {
	/**
	 * Start playing the note. This can only be called once.
	 */
	start(
		frequency: number,
		gain: number,
		delay: number,
		isBass: boolean,
		destination: AudioNode,
	): void;
	/**
	 * Set the frequency of the note as it's playing.
	 */
	setFrequency(frequency: number): void;
	/**
	 * Stop playing the note. This can only be called once.
	 */
	stop(): void;
}

interface SampleBuffer {
	buffer: AudioBuffer;
	frequency: number;
	only?: "bass" | "chords";
}

class SampleNote implements Note {
	private bufferSource: AudioBufferSourceNode;
	private gainNode: GainNode;
	private chosenSampleBuffer?: SampleBuffer;

	constructor(
		private ctx: AudioContext,
		private sampleBuffers: SampleBuffer[],
	) {
		this.bufferSource = ctx.createBufferSource();
		this.gainNode = ctx.createGain();
	}

	start(
		frequency: number,
		gain: number,
		delay: number,
		isBass: boolean,
		destination: AudioNode,
	): void {
		this.gainNode.gain.value = gain;

		let closestBuffer = this.sampleBuffers[0];
		let closestDifference = Number.POSITIVE_INFINITY;
		for (const b of this.sampleBuffers) {
			const difference = Math.abs(frequency - b.frequency);
			if (b.only === "bass" && !isBass) continue;
			if (b.only === "chords" && isBass) continue;
			if (difference < closestDifference) {
				closestBuffer = b;
				closestDifference = difference;
			}
		}

		this.chosenSampleBuffer = closestBuffer;
		this.bufferSource.buffer = closestBuffer.buffer;
		this.bufferSource.connect(this.gainNode);
		// this.bufferSource.gainNode = gainNode;
		// gain.connect(mix);
		this.gainNode.connect(destination);
		this.bufferSource.playbackRate.value = frequency / closestBuffer.frequency;
		// this.bufferSource.autokalimbaSampleBaseFreq = closestBuffer.frequency;
		this.bufferSource.start(this.ctx.currentTime + delay);
	}

	setFrequency(frequency: number): void {
		if (this.chosenSampleBuffer) {
			this.bufferSource.playbackRate.value =
				frequency / this.chosenSampleBuffer.frequency;
		}
	}

	stop(): void {
		this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime + 0.05, 0.01);
		this.bufferSource.stop(this.ctx.currentTime + 0.2);
	}
}

interface TargetDescription {
	type: "bass" | "chord";
	semitones: number[];
}

interface Target {
	description: TargetDescription;
	active: Signal<boolean>;
	notes: Note[];
}

const targetDescriptions: [string, TargetDescription][] = [
	["a", { type: "bass", semitones: [0] }],
	["bb", { type: "bass", semitones: [1] }],
	["b", { type: "bass", semitones: [2] }],
	["c", { type: "bass", semitones: [3] }],
	["db", { type: "bass", semitones: [4] }],
	["d", { type: "bass", semitones: [5] }],
	["eb", { type: "bass", semitones: [6] }],
	["e", { type: "bass", semitones: [-5] }],
	["f", { type: "bass", semitones: [-4] }],
	["gb", { type: "bass", semitones: [-3] }],
	["g", { type: "bass", semitones: [-2] }],
	["ab", { type: "bass", semitones: [-1] }],
	["Δ9", { type: "chord", semitones: [7, 11, 14, 16] }],
	["m9", { type: "chord", semitones: [7, 10, 14, 15] }],
	["7s", { type: "chord", semitones: [7, 10, 12, 17] }],
	["7b9", { type: "chord", semitones: [7, 10, 13, 16] }],
	["13s", { type: "chord", semitones: [10, 14, 17, 21] }],
	["Δ", { type: "chord", semitones: [7, 11, 12, 16] }],
	["m7", { type: "chord", semitones: [7, 10, 12, 15] }],
	["7", { type: "chord", semitones: [7, 10, 12, 16] }],
	["7#5", { type: "chord", semitones: [8, 10, 12, 16] }],
	["13", { type: "chord", semitones: [10, 14, 16, 21] }],
	["6", { type: "chord", semitones: [7, 9, 12, 16] }],
	["m6", { type: "chord", semitones: [7, 9, 12, 15] }],
	["ø", { type: "chord", semitones: [6, 10, 12, 15] }],
	["o", { type: "chord", semitones: [6, 9, 12, 15] }],
	["II/", { type: "chord", semitones: [9, 14, 12, 18] }],
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

export class Kalimba {
	private pointers: Map<number, TargetName> = new Map();
	private sampleBuffers: SampleBuffer[] = [];
	private mix: AudioNode;
	private targets: Map<TargetName, Target> = new Map(
		targetDescriptions.map(([name, description]) => [
			name,
			{ description, active: signal(false), notes: [] },
		]),
	);

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

	async loadInstrument(description: InstrumentDescription): Promise<void> {
		this.sampleBuffers = [];
		await Promise.all(
			description.samples.map(async (sample, i) => {
				const r = await fetch(`instruments/${sample.name}`);
				const blob = await r.blob();
				const arrayBuffer = await blob.arrayBuffer();
				this.ctx.decodeAudioData(arrayBuffer, (buffer) => {
					this.sampleBuffers[i] = {
						buffer,
						frequency: sample.frequency,
						only: sample.only,
					};
				});
			}),
		);
	}

	startTarget(targetName: string) {
		const target = this.targets.get(targetName);
		if (!target) return;

		const notes = target.description.semitones.map((st) => {
			const frequency = 220 * 2 ** (st / 12);
			const note = new SampleNote(this.ctx, this.sampleBuffers);
			note.start(frequency, 0.2, 0, true, this.mix);
			return note;
		});

		target.active.value = true;
		target.notes = notes;
	}

	stopTarget(targetName: string) {
		const target = this.targets.get(targetName);
		if (!target) return;

		for (const note of target.notes) {
			note.stop();
		}
		target.active.value = false;
		target.notes = [];
	}

	isActive(targetName: string): boolean {
		const target = this.targets.get(targetName);
		return target ? target.active.value : false;
	}

	pointerDown(pointerId: number, targetName: string) {
		if (!this.sampleBuffers.length) return;
		this.pointers.set(pointerId, targetName);
		this.startTarget(targetName);
	}

	pointerUp(pointerId: number) {
		const targetName = this.pointers.get(pointerId);
		this.pointers.delete(pointerId);
		if (!targetName) return;
		this.stopTarget(targetName);
	}

	keyDown(e: KeyboardEvent) {
		const targetName = qwerty[e.key];

		if (targetName) {
			e.preventDefault();
			this.startTarget(targetName);
		}
	}

	keyUp(e: KeyboardEvent) {
		const targetName = qwerty[e.key];

		if (targetName) {
			e.preventDefault();
			this.stopTarget(targetName);
		}
	}
}
