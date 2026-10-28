import { effect } from "@preact/signals";
import { SampleNote, OscillatorNote } from "./note";
import type { Envelope, Note, Sample, Patch } from "./note";
import { fmDecayMax, type SynthSettings } from "./global";

export interface SampleInstrumentDescription {
	lo: number;
	hi: number;
	samples: { name: string; frequency: number; only?: "bass" | "chords" }[];
}

/**
 * Sampled instruments. "Classic Rhodes", "Guitar" and "Piano" are ported from
 * the original autokalimba.
 */
export const instruments = {
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
	"Classic Rhodes": {
		lo: 250,
		hi: 650,
		samples: [
			{ name: "rhodes-low.wav", frequency: 110, only: "bass" },
			{ name: "rhodes-high.wav", frequency: 329, only: "chords" },
		],
	},
	Guitar: {
		lo: 250,
		hi: 650,
		samples: [{ name: "guitar.wav", frequency: 110 }],
	},
	Piano: {
		lo: 250,
		hi: 650,
		samples: [
			{ name: "piano-cs3.wav", frequency: 138.59 },
			{ name: "piano-f4.wav", frequency: 698.46 / 2 },
		],
	},
} satisfies Record<string, SampleInstrumentDescription>;

export type InstrumentName = "Synth" | keyof typeof instruments;

export const instrumentNames = [
	"Synth",
	...Object.keys(instruments),
] as InstrumentName[];

export interface Instrument {
	remapFrequency(frequency: number): number;
	makeNote(ctx: AudioContext, frequency: number, isBass: boolean): Note;
	/**
	 * If set, notes from this instrument are played into this node instead of
	 * straight into the kalimba's mix.
	 */
	readonly input?: AudioNode;
}

/**
 * Avoid zero-length envelope stages, which some browsers reject.
 */
const minTime = 0.002;

/**
 * A subtractive synthesizer, configured by `SynthSettings`. Each note is an
 * oscillator through an enveloped filter and an enveloped amplifier; all notes
 * go through a shared feedback delay.
 */
export class OscillatorInstrument implements Instrument {
	readonly input: GainNode;
	private chimeWave: PeriodicWave;

	constructor(
		ctx: AudioContext,
		private settings: SynthSettings,
		destination: AudioNode,
	) {
		this.chimeWave = ctx.createPeriodicWave(
			new Float32Array([0, 0, 0, 0, 0, 0]),
			new Float32Array([0, 1, 0.2, 0.2, 0, 0.05]),
		);

		this.input = ctx.createGain();
		const delay = ctx.createDelay(2);
		const feedback = ctx.createGain();
		const wet = ctx.createGain();
		this.input.connect(destination);
		this.input.connect(delay);
		delay.connect(feedback);
		feedback.connect(delay);
		delay.connect(wet);
		wet.connect(destination);

		effect(() => {
			const now = ctx.currentTime;
			delay.delayTime.setTargetAtTime(settings.delayTime.value, now, 0.05);
			feedback.gain.setTargetAtTime(settings.delayFeedback.value, now, 0.02);
			wet.gain.setTargetAtTime(settings.delayMix.value, now, 0.02);
		});
	}

	/**
	 * Read the current settings into a patch for a new note.
	 */
	private patch(): Patch {
		const s = this.settings;
		const envelope = (
			attack: number,
			decay: number,
			sustain: number,
			release: number,
		): Envelope => ({
			attack: Math.max(attack, minTime),
			decay: Math.max(decay, minTime),
			sustain,
			release: Math.max(release, minTime),
		});
		const waveform = s.waveform.value;
		return {
			wave:
				waveform === "chime"
					? this.chimeWave
					: waveform === "fm"
						? "sine"
						: waveform,
			fm:
				waveform === "fm"
					? {
							ratio: s.fmRatio.value,
							index: s.fmIndex.value,
							decay:
								s.fmDecay.value >= fmDecayMax
									? Number.POSITIVE_INFINITY
									: Math.max(s.fmDecay.value, minTime),
						}
					: undefined,
			vibrato: {
				delay: s.vibratoDelay.value,
				speed: s.vibratoSpeed.value,
				width: s.vibratoWidth.value,
			},
			amp: envelope(
				s.attack.value,
				s.decay.value,
				s.sustain.value,
				s.release.value,
			),
			filter: {
				type: s.filterType.value,
				cutoff: s.filterCutoff.value,
				resonance: s.filterResonance.value,
				envAmount: s.filterEnvAmount.value,
				envelope: envelope(
					s.filterAttack.value,
					s.filterDecay.value,
					s.filterSustain.value,
					s.filterRelease.value,
				),
			},
		};
	}

	remapFrequency(frequency: number): number {
		let f = frequency;
		if (f < 300) f *= 2;
		return f * (0.02 * (Math.random() - 0.5) + 1);
	}

	makeNote(ctx: AudioContext, _frequency: number, _isBass: boolean): Note {
		return new OscillatorNote(ctx, this.patch());
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
		return frequency * (0.012 * (Math.random() - 0.5) + 1);
	}
}
