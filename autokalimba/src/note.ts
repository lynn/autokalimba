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

export interface SampleBuffer {
	buffer: AudioBuffer;
	frequency: number;
	only?: "bass" | "chords";
}

export class SampleNote implements Note {
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

export class OscillatorNote implements Note {
	private oscillator: OscillatorNode;
	private gainNode: GainNode;

	constructor(private ctx: AudioContext) {
		this.oscillator = ctx.createOscillator();
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
		this.oscillator.type = "triangle";
		this.oscillator.connect(this.gainNode);
		this.gainNode.connect(destination);
		this.oscillator.frequency.value = frequency;
		this.oscillator.start(this.ctx.currentTime + delay);
        console.log(this.oscillator);
	}

	setFrequency(frequency: number): void {
		this.oscillator.frequency.value = frequency;
	}

	stop(): void {
		this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime + 0.05, 0.01);
		this.oscillator.stop(this.ctx.currentTime + 0.2);
	}
}
