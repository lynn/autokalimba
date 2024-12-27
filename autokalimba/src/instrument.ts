import { SampleNote, OscillatorNote } from "./note";
import type { Note, Sample, Patch } from "./note";

export interface SampleInstrumentDescription {
	lo: number;
	hi: number;
	samples: { name: string; frequency: number; only?: "bass" | "chords" }[];
}

export const instruments: Record<string, SampleInstrumentDescription> = {
	// Piano: {
	// 	lo: 250,
	// 	hi: 650,
	// 	samples: [
	// 		{ name: "piano-cs3.wav", frequency: 138.59 },
	// 		{ name: "piano-f4.wav", frequency: 698.46 / 2 },
	// 	],
	// },
	Rhodes: {
		lo: 250 * 2,
		hi: 650 * 2,
		samples: [
			// { name: "r-a2.wav", frequency: 110 },
			// { name: "r-ds3.wav", frequency: 110 * Math.sqrt(2) },
			// { name: "r-a3.wav", frequency: 220 },
			// { name: "r-ds4.wav", frequency: 220 * Math.sqrt(2) },
			// { name: "r-a4.wav", frequency: 440 },
			// { name: "r-ds5.wav", frequency: 440 * Math.sqrt(2) },
			// { name: "r-a5.wav", frequency: 880 },
			{ name: "n-a3.wav", frequency: 220, only: "bass" },
			{ name: "n-d5.wav", frequency: 587.3, only: "chords" },
		],
	},
};

export interface Instrument {
	remapFrequency(frequency: number): number;
	makeNote(ctx: AudioContext, frequency: number, isBass: boolean): Note;
}

export class OscillatorInstrument implements Instrument {
	constructor(private patch: Patch) {}

	remapFrequency(frequency: number): number {
		let f = frequency;
		if (f < 300) f *= 2;
		return f * (0.02 * (Math.random() - 0.5) + 1);
	}

	makeNote(ctx: AudioContext, _frequency: number, _isBass: boolean): Note {
		return new OscillatorNote(ctx, this.patch);
	}
}

export class SampleInstrument implements Instrument {
	constructor(
		private description: SampleInstrumentDescription,
		private sampleBuffers: Sample[],
	) {}

	public makeNote(ctx: AudioContext, frequency: number, isBass: boolean): Note {
		const sample = this.chooseSample(frequency, isBass);
		return new SampleNote(ctx, sample);
	}

	private chooseSample(frequency: number, isBass: boolean): Sample {
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
		return closestBuffer;
	}

	remapFrequency(frequency: number): number {
		if (frequency < this.description.lo) return 2 * frequency;
		if (frequency > this.description.hi) return 0.5 * frequency;
		return frequency * (0.02 * (Math.random() - 0.5) + 1);
	}
}
