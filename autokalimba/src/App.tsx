import type { ComponentChildren } from "preact";
import { Button } from "./Button";
import { KalimbaContext, SettingsContext } from "./global";
import { useContext, useEffect, useState } from "preact/hooks";
import { Piano } from "./Piano";
import { Settings } from "./Settings";
import { chords } from "./chord";

interface PadProps {
	cols: number;
	rows: number;
	/**
	 * Fill the grid column by column instead of row by row.
	 */
	columnFlow?: boolean;
	/**
	 * Classes for positioning the grid within the pad, and margins.
	 */
	className?: string;
	children: ComponentChildren;
}

/**
 * A grid of buttons that fills as much of its half of the screen as it can
 * while keeping the buttons square.
 */
function Pad({
	cols,
	rows,
	columnFlow,
	className = "flex-1 items-end justify-center",
	children,
}: PadProps) {
	return (
		<div
			className={`min-w-0 min-h-0 flex [container-type:size] ${className}`}
		>
			<div
				className={`grid gap-1 ${columnFlow ? "grid-flow-col" : ""}`}
				style={{
					gridTemplateColumns: `repeat(${cols}, 1fr)`,
					gridTemplateRows: `repeat(${rows}, 1fr)`,
					width: `min(100cqw, 100cqh * ${cols / rows})`,
					height: `min(100cqh, 100cqw * ${rows / cols})`,
				}}
			>
				{children}
			</div>
		</div>
	);
}

function usePortrait(): boolean {
	const query = "(orientation: portrait)";
	const [portrait, setPortrait] = useState(
		() => window.matchMedia(query).matches,
	);
	useEffect(() => {
		const media = window.matchMedia(query);
		const onChange = () => setPortrait(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);
	return portrait;
}

export function App() {
	const settings = useContext(SettingsContext);
	const kalimba = useContext(KalimbaContext);
	const sharps = settings.sharps.value;

	useEffect(() => {
		document.body.addEventListener("keydown", (e) => {
			kalimba.keyDown(e);
		});
		document.body.addEventListener("keyup", (e) => {
			kalimba.keyUp(e);
		});
	}, [kalimba]);

	const db = sharps > 1 ? "C♯" : "D♭";
	const ab = sharps > 2 ? "G♯" : "A♭";
	const eb = sharps > 3 ? "D♯" : "E♭";
	const bb = sharps > 4 ? "A♯" : "B♭";
	const gb = sharps > 0 ? "F♯" : "G♭";

	const horizontalChords = kalimba.displayLayout.value === "keyboard";
	const portrait = usePortrait();

	const chordButtons = chords.map((chord) => (
		<Button
			bass={false}
			label={chord.name}
			targetName={chord.name}
			key={chord.name}
		/>
	));

	const chordPad = (className?: string) =>
		horizontalChords ? (
			<Pad cols={5} rows={5} columnFlow className={className}>
				<div className="col-span-5 row-span-2" />
				{chordButtons}
			</Pad>
		) : (
			<Pad cols={3} rows={5} className={className}>
				{chordButtons}
			</Pad>
		);

	// Between the two pads: the settings button and the bass range slider.
	// It's a column in landscape and a row in portrait.
	const middle = (
		<div
			className={`flex items-center gap-2 shrink-0 ${
				portrait ? "flex-row h-12" : "flex-col w-12"
			}`}
		>
			<Settings />
			<input
				type="range"
				aria-label="Lowest bass note"
				className="flex-1 min-w-0 min-h-0"
				style={
					portrait ? {} : { writingMode: "vertical-lr", direction: "rtl" }
				}
				min={-12}
				max={12}
				value={settings.lowestBassNote.value}
				onInput={(e) => {
					settings.lowestBassNote.value = Number(e.currentTarget.value);
				}}
			/>
		</div>
	);

	const layout = kalimba.displayLayout.value;

	let content: ComponentChildren;
	if (layout === "steno") {
		content = (
			<>
				<Pad cols={6} rows={4}>
					<Button bass={true} label={ab} targetName="ab" />
					<Button bass={true} label={bb} targetName="bb" />
					<Button bass={true} label={"C"} targetName="c" />
					<Button bass={true} label={"D"} targetName="d" />
					<Button bass={true} label={"E"} targetName="e" />
					<Button bass={true} label={"*"} targetName="split-last" />
					<Button bass={true} label={db} targetName="db" />
					<Button bass={true} label={eb} targetName="eb" />
					<Button bass={true} label={"F"} targetName="f" />
					<Button bass={true} label={"G"} targetName="g" />
					<Button bass={true} label={"A"} targetName="a" />
					<Button bass={true} label={"*"} targetName="split-last" />
					<div className="col-span-6" />
					<div className="col-span-4" />
					<Button bass={true} label={"B"} targetName="b" />
					<Button bass={true} label={gb} targetName="gb" />
				</Pad>
				{middle}
				<Pad cols={6} rows={4}>
					<Button bass={true} label={"*"} targetName="split-last" />
					<Button bass={false} label={"4"} targetName={"s-5"} />
					<Button bass={false} label={"5"} targetName={"s-7"} />
					<Button bass={false} label={"6"} targetName={"s-9"} />
					<Button bass={false} label={"7"} targetName={"s-11"} />
					<Button bass={false} label={"♯8"} targetName={"s-1"} />
					<Button bass={true} label={"*"} targetName="split-last" />
					<Button bass={false} label={"♭7"} targetName={"s-10"} />
					<Button bass={false} label={"1"} targetName={"s-0"} />
					<Button bass={false} label={"2"} targetName={"s-2"} />
					<Button bass={false} label={"3"} targetName={"s-4"} />
					<Button bass={false} label={"♯4"} targetName={"s-6"} />
					<div className="col-span-6" />
					<Button bass={false} label={"♭3"} targetName={"s-3"} />
					<Button bass={false} label={"♭6"} targetName={"s-8"} />
				</Pad>
			</>
		);
	} else if (portrait) {
		// Chords in a grid at the top (leaving a margin on the left), and the
		// bass notes as a piano keyboard at the bottom (leaving one on the right).
		content = (
			<>
				{chordPad("flex-[3] items-start justify-end pl-[12%]")}
				{middle}
				<div className="flex-[2] min-h-0 flex items-end pr-[12%] [container-type:size]">
					<div
						className="w-full"
						style={{ height: "min(100cqh, 100cqw * 0.75)" }}
					>
						<Piano db={db} eb={eb} gb={gb} ab={ab} bb={bb} />
					</div>
				</div>
			</>
		);
	} else {
		content = (
			<>
				{/* An empty top row keeps the bass buttons the same size as the chord buttons. */}
				<Pad cols={3} rows={5}>
					<div className="col-span-3" />
					<Button bass={true} label={db} targetName="db" />
					<Button bass={true} label={"F"} targetName="f" />
					<Button bass={true} label={"A"} targetName="a" />
					<Button bass={true} label={ab} targetName="ab" />
					<Button bass={true} label={"C"} targetName="c" />
					<Button bass={true} label={"E"} targetName="e" />
					<Button bass={true} label={eb} targetName="eb" />
					<Button bass={true} label={"G"} targetName="g" />
					<Button bass={true} label={"B"} targetName="b" />
					<Button bass={true} label={bb} targetName="bb" />
					<Button bass={true} label={"D"} targetName="d" />
					<Button bass={true} label={gb} targetName="gb" />
				</Pad>
				{middle}
				{chordPad()}
			</>
		);
	}

	return (
		<div
			className={`flex ${portrait ? "flex-col" : "flex-row"} bg-pink h-dvh w-full gap-2 p-2 select-none overflow-hidden`}
			style={{
				filter: `hue-rotate(${settings.hue.value}deg)`,
				paddingTop: "max(0.5rem, env(safe-area-inset-top))",
				paddingRight: "max(0.5rem, env(safe-area-inset-right))",
				paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
				paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
			}}
			onPointerUp={(e) => kalimba.pointerUp(e.pointerId)}
			onPointerLeave={(e) => kalimba.pointerUp(e.pointerId)}
		>
			{content}
		</div>
	);
}
