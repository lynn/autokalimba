import { Instrument } from "./instrument";

/**
 * A note sounding from the kalimba.
 */
export interface Note {
	/**
	 * Start playing the note. This can only be called once.
	 */
	start(
		frequency: number,
		gain: number,
		delay: number,
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

export interface Sample {
	buffer: AudioBuffer;
	frequency: number;
	only?: "bass" | "chords";
}

export class SampleNote implements Note {
	private bufferSource: AudioBufferSourceNode;
	private gainNode: GainNode;

	constructor(
		private ctx: AudioContext,
		private chosenSample: Sample,
	) {
		this.bufferSource = ctx.createBufferSource();
		this.gainNode = ctx.createGain();
	}

	start(
		frequency: number,
		gain: number,
		delay: number,
		destination: AudioNode,
	): void {
		this.gainNode.gain.value = gain;
		// const sample = this.instrument.chooseSample(frequency, isBass);
		// this.chosenSample = sample;
		this.bufferSource.buffer = this.chosenSample.buffer;
		this.bufferSource.connect(this.gainNode);
		this.gainNode.connect(destination);
		this.bufferSource.playbackRate.value =
			frequency / this.chosenSample.frequency;
		this.bufferSource.start(this.ctx.currentTime + delay);
	}

	setFrequency(frequency: number): void {
		this.bufferSource.playbackRate.value =
			frequency / this.chosenSample.frequency;
	}

	stop(): void {
		this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime + 0.05, 0.01);
		this.bufferSource.stop(this.ctx.currentTime + 0.2);
	}
}

export interface PatchEcho {
	minDelay: number;
	maxDelay: number;
	volumeFactor: number;
	pitchFactor: number;
}

/**
 * A synthesizer patch.
 */
export interface Patch {
	attack: number;
	decay: number;
	echoes?: PatchEcho[];
}

export class OscillatorNote implements Note {
	private oscillators: OscillatorNode[] = [];
	private wave: PeriodicWave;

	constructor(
		private ctx: AudioContext,
		private patch: Patch,
	) {
		this.wave = ctx.createPeriodicWave(
			new Float32Array([0, 0, 0, 0, 0, 0]),
			new Float32Array([0, 1, 0.2, 0.2, 0, 0.05]),
		);
		this.wave = ctx.createPeriodicWave(
			new Float32Array([0, 0, 0, 0, 0, 0]),
			new Float32Array([0, 1, 1 / 2, 1 / 3, 1 / 4, 1 / 5]),
		);
	}

	chime(
		frequency: number,
		volume: number,
		delay: number,
		destination: AudioNode,
	): void {
		const now = this.ctx.currentTime;
		const oscillator = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		this.oscillators.push(oscillator);

		oscillator.setPeriodicWave(this.wave);
		const pan = this.ctx.createStereoPanner();
		pan.pan.setValueAtTime(Math.random() * 0.6 - 0.3, now);
		pan.connect(gain);

		const attackTime = now + delay;
		const decayTime = now + delay + this.patch.attack;
		oscillator.connect(pan);
		gain.connect(destination);
		gain.gain.value = 0;
		gain.gain.setTargetAtTime(volume, attackTime, this.patch.attack);
		gain.gain.setTargetAtTime(0, decayTime, this.patch.decay);

		oscillator.frequency.setValueAtTime(frequency / 2, this.ctx.currentTime);
		oscillator.start(now + delay);
	}

	start(
		frequency: number,
		volume: number,
		delay: number,
		destination: AudioNode,
	): void {
		this.chime(frequency, volume, delay, destination);
		for (const echo of this.patch.echoes ?? []) {
			const time =
				delay + echo.minDelay + Math.random() * (echo.maxDelay - echo.minDelay);
			this.chime(
				frequency * echo.pitchFactor,
				volume * echo.volumeFactor,
				time,
				destination,
			);
		}
	}

	setFrequency(frequency: number): void {
		for (const oscillator of this.oscillators) {
			oscillator.frequency.setValueAtTime(frequency / 2, this.ctx.currentTime);
		}
	}

	stop(): void {
		for (const oscillator of this.oscillators) {
			oscillator.stop(this.ctx.currentTime + 5.1);
		}
	}
}
