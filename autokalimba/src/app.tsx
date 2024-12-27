import { Button } from "./Button";
import { KalimbaContext, SettingsContext } from "./global";
import { useContext, useEffect } from "preact/hooks";
import { Settings } from "./Settings";
import { chords } from "./chord";

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

	const horizontalChords = settings.horizontalChords.value;

	return (
		<div
			className="flex flex-col bg-pink h-full items-start justify-between gap-4 select-none max-h-svh"
			style={{
				filter: `hue-rotate(${settings.hue.value}deg)`,
			}}
			onPointerUp={(e) => kalimba.pointerUp(e.pointerId)}
			onPointerLeave={(e) => kalimba.pointerUp(e.pointerId)}
		>
			{/* <Settings /> */}
			<div className="flex w-full h-full justify-between">
				<div className="absolute max-h-[32em] h-full left-4 bottom-2 pt-4 grid grid-cols-3 grid-rows-5 gap-1">
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
				</div>

				<div
					className={`absolute max-h-[32em] h-full right-4 bottom-2 pt-4 ${
						horizontalChords
							? "grid grid-flow-col grid-rows-5 grid-cols-5 gap-1"
							: "grid grid-cols-3 grid-rows-5 gap-1"
					}`}
				>
					{horizontalChords && <div className="col-span-5 row-span-2" />}
					{chords.map((chord) => (
						<Button
							bass={false}
							label={chord.name}
							targetName={chord.name}
							key={chord.name}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
