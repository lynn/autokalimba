import { Button } from "./Button";
import { KalimbaContext, SettingsContext } from "./global";
import { useContext, useEffect } from "preact/hooks";
import { Settings } from "./Settings";

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

	return (
		<div
			className="flex flex-col bg-pink h-full items-start justify-between p-8 gap-4 select-none"
			style={{
				filter: `hue-rotate(${settings.hue.value}deg)`,
			}}
			onPointerUp={(e) => kalimba.pointerUp(e.pointerId)}
			onPointerLeave={(e) => kalimba.pointerUp(e.pointerId)}
		>
			<Settings />
			<div className="flex w-full items-end justify-between">
				<div className="grid grid-cols-3 gap-1">
					<Button label={sharps > 1 ? "C♯" : "D♭"} targetName="db" />
					<Button label={"F"} targetName="f" />
					<Button label={"A"} targetName="a" />
					<Button label={sharps > 2 ? "G♯" : "A♭"} targetName="ab" />
					<Button label={"C"} targetName="c" />
					<Button label={"E"} targetName="e" />
					<Button label={sharps > 3 ? "D♯" : "E♭"} targetName="eb" />
					<Button label={"G"} targetName="g" />
					<Button label={"B"} targetName="b" />
					<Button label={sharps > 4 ? "A♯" : "B♭"} targetName="bb" />
					<Button label={"D"} targetName="d" />
					<Button label={sharps > 0 ? "F♯" : "G♭"} targetName="gb" />
				</div>

				<div className="grid grid-cols-3 gap-1">
					<Button label="Δ9" targetName="Δ9" />
					<Button label="Δ" targetName="Δ" />
					<Button label="6" targetName="6" />

					<Button label="m9" targetName="m9" />
					<Button label="m7" targetName="m7" />
					<Button label="m6" targetName="m6" />

					<Button label="7sus4" targetName="7s" />
					<Button label="7" targetName="7" />
					<Button label="ø" targetName="ø" />

					<Button label="7♭9" targetName="7b9" />
					<Button label="7♯5" targetName="7#5" />
					<Button label="dim" targetName="o" />

					<Button label="13sus" targetName="13s" />
					<Button label="13" targetName="13" />
					<Button label="II/" targetName="II/" />
				</div>
			</div>
		</div>
	);
}
