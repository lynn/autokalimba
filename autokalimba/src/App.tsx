import type { ComponentChildren } from "preact";
import { Button } from "./Button";
import { KalimbaContext, SettingsContext } from "./global";
import { useContext, useEffect } from "preact/hooks";
import { Settings } from "./Settings";
import { chords } from "./chord";

interface PadProps {
	cols: number;
	rows: number;
	/**
	 * Fill the grid column by column instead of row by row.
	 */
	columnFlow?: boolean;
	children: ComponentChildren;
}

/**
 * A grid of buttons that fills as much of its half of the screen as it can
 * while keeping the buttons square.
 */
function Pad({ cols, rows, columnFlow, children }: PadProps) {
	return (
		<div className="flex-1 min-w-0 min-h-0 flex items-end justify-center [container-type:size]">
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

	// Between the two pads: the settings button and the bass range slider.
	// It's a column in landscape and a row in portrait.
	const middle = (
		<div className="flex landscape:flex-col portrait:flex-row items-center gap-2 landscape:w-12 portrait:h-12 shrink-0">
			<Settings />
			<input
				type="range"
				aria-label="Lowest bass note"
				className="flex-1 min-w-0 min-h-0 landscape:[writing-mode:vertical-lr] landscape:[direction:rtl]"
				min={-12}
				max={12}
				value={settings.lowestBassNote.value}
				onInput={(e) => {
					settings.lowestBassNote.value = Number(e.currentTarget.value);
				}}
			/>
		</div>
	);

	return (
		<div
			className="flex landscape:flex-row portrait:flex-col bg-pink h-dvh w-full gap-2 p-2 select-none overflow-hidden"
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
			{kalimba.displayLayout.value === "steno" ? (
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
			) : (
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
					{horizontalChords ? (
						<Pad cols={5} rows={5} columnFlow>
								<div className="col-span-5 row-span-2" />
								{chords.map((chord) => (
									<Button
										bass={false}
										label={chord.name}
										targetName={chord.name}
										key={chord.name}
									/>
								))}
						</Pad>
					) : (
						<Pad cols={3} rows={5}>
							{chords.map((chord) => (
								<Button
									bass={false}
									label={chord.name}
									targetName={chord.name}
									key={chord.name}
								/>
							))}
						</Pad>
					)}
				</>
			)}
		</div>
	);
}
