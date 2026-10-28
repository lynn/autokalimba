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

/**
 * Attack/decay/sustain/release envelope. Times are in seconds, `sustain` is a
 * level between 0 and 1.
 */
export interface Envelope {
	attack: number;
	decay: number;
	sustain: number;
	release: number;
}

/**
 * A synthesizer patch.
 */
export interface Patch {
	/**
	 * The oscillator waveform, or a custom periodic wave.
	 */
	wave: OscillatorType | PeriodicWave;
	amp: Envelope;
	filter: {
		type: BiquadFilterType;
		/**
		 * Cutoff frequency when the filter envelope is at zero, in Hz.
		 */
		cutoff: number;
		resonance: number;
		/**
		 * How far the envelope moves the cutoff at its peak, in octaves.
		 */
		envAmount: number;
		envelope: Envelope;
	};
	/**
	 * If set, frequency-modulate the oscillator (which should be a sine) with a
	 * second sine oscillator.
	 */
	fm?: {
		/**
		 * Modulator frequency as a multiple of the note's frequency.
		 */
		ratio: number;
		/**
		 * Modulation index: peak frequency deviation as a multiple of the
		 * modulator's frequency. Higher is brighter.
		 */
		index: number;
		/**
		 * How long the index takes to die down, in seconds, or `Infinity` to
		 * keep it constant.
		 */
		decay: number;
	};
	vibrato: {
		/**
		 * Time from the start of the note until the vibrato starts, in seconds.
		 */
		delay: number;
		/**
		 * Vibrato frequency, in Hz.
		 */
		speed: number;
		/**
		 * Vibrato depth, in cents.
		 */
		width: number;
	};
}

/**
 * Schedule the attack, decay and sustain stages of an envelope on `param`,
 * moving from `base` to `base + amount` and settling at
 * `base + amount * sustain`.
 */
function envelopeStart(
	param: AudioParam,
	envelope: Envelope,
	start: number,
	base: number,
	amount: number,
) {
	param.setValueAtTime(base, start);
	param.linearRampToValueAtTime(base + amount, start + envelope.attack);
	param.setTargetAtTime(
		base + amount * envelope.sustain,
		start + envelope.attack,
		envelope.decay / 4,
	);
}

/**
 * Schedule the release stage of an envelope on `param`, moving to `base`.
 */
function envelopeRelease(
	param: AudioParam,
	envelope: Envelope,
	time: number,
	base: number,
) {
	param.cancelScheduledValues(time);
	param.setValueAtTime(param.value, time);
	param.setTargetAtTime(base, time, envelope.release / 4);
}

export class OscillatorNote implements Note {
	private oscillator: OscillatorNode;
	private filter: BiquadFilterNode;
	private gain: GainNode;
	private modulator: OscillatorNode | undefined;
	private modulatorGain: GainNode | undefined;
	private lfo: OscillatorNode | undefined;
	private startTime = 0;

	constructor(
		private ctx: AudioContext,
		private patch: Patch,
	) {
		this.oscillator = ctx.createOscillator();
		this.filter = ctx.createBiquadFilter();
		this.gain = ctx.createGain();
	}

	start(
		frequency: number,
		volume: number,
		delay: number,
		destination: AudioNode,
	): void {
		const { ctx, oscillator, filter, gain, patch } = this;
		this.startTime = ctx.currentTime + delay;

		if (patch.wave instanceof PeriodicWave) {
			oscillator.setPeriodicWave(patch.wave);
		} else {
			oscillator.type = patch.wave;
		}
		oscillator.frequency.value = frequency / 2;

		const vibrato = this.startVibrato();
		if (patch.fm) this.startModulator(frequency / 2, vibrato);

		filter.type = patch.filter.type;
		filter.frequency.value = patch.filter.cutoff;
		filter.Q.value = patch.filter.resonance;
		// Envelope the detune (in cents) so that the cutoff sweeps exponentially.
		envelopeStart(
			filter.detune,
			patch.filter.envelope,
			this.startTime,
			0,
			patch.filter.envAmount * 1200,
		);

		const pan = ctx.createStereoPanner();
		pan.pan.value = Math.random() * 0.6 - 0.3;

		gain.gain.value = 0;
		envelopeStart(gain.gain, patch.amp, this.startTime, 0, volume);

		oscillator.connect(filter);
		filter.connect(pan);
		pan.connect(gain);
		gain.connect(destination);
		oscillator.start(this.startTime);
	}

	/**
	 * Connect an LFO to the oscillator's detune, fading in after the vibrato
	 * delay. Return its output (in cents), or `undefined` if there's no
	 * vibrato.
	 */
	private startVibrato(): AudioNode | undefined {
		const { ctx, patch } = this;
		const { delay, speed, width } = patch.vibrato;
		if (width <= 0 || speed <= 0) return undefined;

		this.lfo = ctx.createOscillator();
		this.lfo.frequency.value = speed;
		const depth = ctx.createGain();
		const fadeIn = this.startTime + delay;
		depth.gain.setValueAtTime(0, fadeIn);
		depth.gain.linearRampToValueAtTime(width, fadeIn + 0.25);
		this.lfo.connect(depth);
		depth.connect(this.oscillator.detune);
		this.lfo.start(this.startTime);
		return depth;
	}

	/**
	 * Connect a sine modulator to the oscillator's frequency, for FM.
	 */
	private startModulator(frequency: number, vibrato: AudioNode | undefined) {
		const { ctx, patch } = this;
		if (!patch.fm) return;
		const { ratio, index, decay } = patch.fm;

		this.modulator = ctx.createOscillator();
		this.modulator.frequency.value = frequency * ratio;
		// Keep the modulator in tune with the carrier as it wobbles.
		vibrato?.connect(this.modulator.detune);

		this.modulatorGain = ctx.createGain();
		const deviation = index * frequency * ratio;
		this.modulatorGain.gain.setValueAtTime(deviation, this.startTime);
		if (Number.isFinite(decay)) {
			this.modulatorGain.gain.setTargetAtTime(0, this.startTime, decay / 4);
		}
		this.modulator.connect(this.modulatorGain);
		this.modulatorGain.connect(this.oscillator.frequency);
		this.modulator.start(this.startTime);
	}

	setFrequency(frequency: number): void {
		const now = this.ctx.currentTime;
		this.oscillator.frequency.setValueAtTime(frequency / 2, now);
		if (this.modulator && this.patch.fm) {
			this.modulator.frequency.setValueAtTime(
				(frequency / 2) * this.patch.fm.ratio,
				now,
			);
		}
	}

	stop(): void {
		// A strummed note might not have started yet.
		const time = Math.max(this.ctx.currentTime, this.startTime);
		const { amp, filter } = this.patch;
		envelopeRelease(this.gain.gain, amp, time, 0);
		envelopeRelease(this.filter.detune, filter.envelope, time, 0);
		const end = time + amp.release * 1.5 + 0.05;
		this.oscillator.stop(end);
		this.modulator?.stop(end);
		this.lfo?.stop(end);
	}
}
