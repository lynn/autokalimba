import type { Signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useContext, useState } from "preact/hooks";
import {
	type FilterType,
	fmDecayMax,
	KalimbaContext,
	SettingsContext,
	type Waveform,
} from "./global";
import { instrumentNames } from "./instrument";

interface SliderProps {
	label: string;
	value: Signal<number>;
	min: number;
	max: number;
	step: number;
	/**
	 * Format the value for display next to the slider.
	 */
	format?: (value: number) => string;
	/**
	 * Move the slider on a logarithmic scale (for frequencies). `min` must be
	 * positive.
	 */
	log?: boolean;
}

function Slider({ label, value, min, max, step, format, log }: SliderProps) {
	// A logarithmic slider runs from 0 to 1, mapped onto min..max.
	const ratio = max / min;
	const toSlider = (x: number) => (log ? Math.log(x / min) / Math.log(ratio) : x);
	const fromSlider = (x: number) =>
		log ? Math.round((min * ratio ** x) / step) * step : x;
	return (
		<label className="flex flex-row items-center gap-2 whitespace-nowrap">
			<input
				type="range"
				min={log ? 0 : min}
				max={log ? 1 : max}
				step={log ? 0.001 : step}
				value={toSlider(value.value)}
				onInput={(e) => {
					value.value = fromSlider(Number(e.currentTarget.value));
				}}
			/>
			<span>
				{label}
				{format && <span className="text-black/60"> {format(value.value)}</span>}
			</span>
		</label>
	);
}

interface ChoiceProps<T extends string> {
	label: string;
	value: Signal<T>;
	options: readonly T[];
}

function Choice<T extends string>({ label, value, options }: ChoiceProps<T>) {
	return (
		<label className="flex flex-row items-center gap-2 whitespace-nowrap">
			<select
				className="bg-white/60 rounded px-1"
				value={value.value}
				onChange={(e) => {
					value.value = e.currentTarget.value as T;
				}}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
			{label}
		</label>
	);
}

function Section({
	title,
	children,
}: { title: string; children: ComponentChildren }) {
	return (
		<fieldset className="flex flex-col gap-1 border-t border-black/30 pt-1">
			<legend className="font-bold pr-2">{title}</legend>
			{children}
		</fieldset>
	);
}

const seconds = (x: number) => `${x.toFixed(2)}s`;
const percent = (x: number) => `${Math.round(x * 100)}%`;
const hertz = (x: number) =>
	x >= 1000 ? `${(x / 1000).toFixed(1)}kHz` : `${Math.round(x)}Hz`;
const octaves = (x: number) => `${x > 0 ? "+" : ""}${x.toFixed(1)}oct`;

const waveforms: readonly Waveform[] = [
	"chime",
	"sine",
	"triangle",
	"square",
	"sawtooth",
	"fm",
];
const filterTypes: readonly FilterType[] = ["lowpass", "highpass", "bandpass"];

export function Settings() {
	const settings = useContext(SettingsContext);
	const kalimba = useContext(KalimbaContext);
	const [open, setOpen] = useState(false);
	const synth = settings.synth;

	return (
		<>
			<button
				class="cursor-pointer border-black border w-10 h-10 shrink-0 rounded-full text-xl leading-none"
				type="button"
				aria-label="Settings"
				title="Settings"
				onClick={() => setOpen(true)}
			>
				⚙
			</button>
			{open && (
				<div
					className="fixed z-10 inset-2 sm:right-auto flex flex-col gap-2 p-3 rounded-lg bg-white/90 backdrop-blur overflow-y-auto overscroll-contain shadow-lg touch-pan-y"
					onPointerDown={(e) => e.stopPropagation()}
				>
					<button
						class="cursor-pointer border-black border px-4 py-1 rounded-full self-start"
						type="button"
						onClick={() => setOpen(false)}
					>
						Close settings
					</button>
					<Slider label="Hue" value={settings.hue} min={-180} max={180} step={1} />
					<Slider label="Sharps" value={settings.sharps} min={0} max={5} step={1} />
					<label className="flex flex-row items-center gap-2">
						<input
							type="checkbox"
							checked={settings.splitKeys.value}
							onInput={(e) => {
								settings.splitKeys.value = e.currentTarget.checked;
							}}
						/>
						Split keys
					</label>
					<Slider label="Detune" value={settings.detune} min={0} max={30} step={1} format={(x) => (x ? `±${x}¢` : "off")} />
					<Choice
						label="Instrument"
						value={settings.instrument}
						options={instrumentNames}
					/>
					{settings.instrument.value === "Synth" && (
						<>
							<Section title="Oscillator">
								<Choice label="Waveform" value={synth.waveform} options={waveforms} />
								{synth.waveform.value === "fm" && (
									<>
										<Slider label="FM ratio" value={synth.fmRatio} min={0.5} max={8} step={0.5} format={(x) => `${x}×`} />
										<Slider label="FM index" value={synth.fmIndex} min={0} max={10} step={0.1} format={(x) => x.toFixed(1)} />
										<Slider label="FM decay" value={synth.fmDecay} min={0.05} max={fmDecayMax} step={0.05} format={(x) => (x >= fmDecayMax ? "∞" : seconds(x))} />
									</>
								)}
							</Section>
							<Section title="Vibrato">
								<Slider label="Delay" value={synth.vibratoDelay} min={0} max={2} step={0.01} format={seconds} />
								<Slider label="Speed" value={synth.vibratoSpeed} min={0.5} max={12} step={0.1} format={(x) => `${x.toFixed(1)}Hz`} />
								<Slider label="Width" value={synth.vibratoWidth} min={0} max={100} step={1} format={(x) => (x ? `${x}¢` : "off")} />
							</Section>
							<Section title="Amp envelope">
								<Slider label="Attack" value={synth.attack} min={0} max={2} step={0.01} format={seconds} />
								<Slider label="Decay" value={synth.decay} min={0} max={4} step={0.01} format={seconds} />
								<Slider label="Sustain" value={synth.sustain} min={0} max={1} step={0.01} format={percent} />
								<Slider label="Release" value={synth.release} min={0} max={4} step={0.01} format={seconds} />
							</Section>
							<Section title="Filter">
								<Choice label="Type" value={synth.filterType} options={filterTypes} />
								<Slider label="Cutoff" value={synth.filterCutoff} min={50} max={12000} step={10} format={hertz} log />
								<Slider label="Resonance" value={synth.filterResonance} min={0.1} max={20} step={0.1} format={(x) => x.toFixed(1)} />
								<Slider label="Env amount" value={synth.filterEnvAmount} min={-4} max={6} step={0.1} format={octaves} />
								<Slider label="Attack" value={synth.filterAttack} min={0} max={2} step={0.01} format={seconds} />
								<Slider label="Decay" value={synth.filterDecay} min={0} max={4} step={0.01} format={seconds} />
								<Slider label="Sustain" value={synth.filterSustain} min={0} max={1} step={0.01} format={percent} />
								<Slider label="Release" value={synth.filterRelease} min={0} max={4} step={0.01} format={seconds} />
							</Section>
							<Section title="Delay">
								<Slider label="Time" value={synth.delayTime} min={0.01} max={2} step={0.01} format={seconds} />
								<Slider label="Feedback" value={synth.delayFeedback} min={0} max={0.9} step={0.01} format={percent} />
								<Slider label="Mix" value={synth.delayMix} min={0} max={1} step={0.01} format={percent} />
							</Section>
						</>
					)}
					<button
						class="cursor-pointer border-black border px-4 py-2 rounded-full"
						type="button"
						onClick={() => kalimba.stenoKeyboard.connect()}
					>
						Connect steno keyboard
					</button>
					({kalimba.stenoKeyboard.isConnected() ? "Connected" : "Disconnected"})
				</div>
			)}
		</>
	);
}
