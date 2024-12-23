import { Signal } from "@preact/signals";
import { instruments, type InstrumentDescription } from "./instrument";
import { MutableRef } from "preact/hooks";

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

interface ControllableButton {
	ref: MutableRef<HTMLButtonElement | null>;
	active: Signal<boolean>;
}

export class Kalimba {
	private pointers: Map<number, Note[]> = new Map();
	private sampleBuffers: SampleBuffer[] = [];
	private mix: AudioNode;
	private keyboard: Map<string, ControllableButton> = new Map();

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

	pointerDown(pointerId: number, frequencies: number[]) {
		if (!this.sampleBuffers.length) return;
		this.pointers.set(
			pointerId,
			frequencies.map((frequency) => {
				const note = new SampleNote(this.ctx, this.sampleBuffers);
				note.start(frequency, 0.2, 0, true, this.mix);
				return note;
			}),
		);
	}

	pointerUp(pointerId: number) {
		const notes = this.pointers.get(pointerId);
		if (notes) {
			for (const note of notes) {
				note.stop();
			}
		}
		this.pointers.delete(pointerId);
	}

	registerKeyboard(
		key: string,
		ref: MutableRef<HTMLButtonElement | null>,
		active: Signal<boolean>,
	) {
		this.keyboard.set(key, { ref, active });
	}

	keyDown(e: KeyboardEvent) {
		const button = this.keyboard.get(e.key);

		if (button) {
			e.preventDefault();
			button.ref.current?.dispatchEvent(
				new PointerEvent("pointerdown", {
					pointerId: e.key.charCodeAt(0) + 1000,
				}),
			);
			button.active.value = true;
		}
	}

	keyUp(e: KeyboardEvent) {
		const button = this.keyboard.get(e.key);

		if (button) {
			e.preventDefault();
			this.pointerUp(e.key.charCodeAt(0) + 1000);
			button.active.value = false;
		}
	}
}
