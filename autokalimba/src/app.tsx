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
			className="flex flex-col bg-pink h-full items-start p-4 gap-4 select-none"
			style={{
				filter: `hue-rotate(${settings.hue.value}deg)`,
			}}
			onPointerUp={(e) => {
				kalimba.pointerUp(e.pointerId);
			}}
		>
			<Settings />
			<div className="grid grid-cols-3 gap-1">
				<Button label={sharps > 1 ? "C♯" : "D♭"} semitone={-8} keyboard="1" />
				<Button label={"F"} semitone={-4} keyboard="2" />
				<Button label={"A"} semitone={0} keyboard="3" />
				<Button label={sharps > 2 ? "G♯" : "A♭"} semitone={-1} keyboard="q" />
				<Button label={"C"} semitone={3} keyboard="w" />
				<Button label={"E"} semitone={7} keyboard="e" />
				<Button label={sharps > 3 ? "D♯" : "E♭"} semitone={-6} keyboard="a" />
				<Button label={"G"} semitone={-2} keyboard="s" />
				<Button label={"B"} semitone={2} keyboard="d" />
				<Button label={sharps > 4 ? "A♯" : "B♭"} semitone={1} keyboard="z" />
				<Button label={"D"} semitone={5} keyboard="x" />
				<Button label={sharps > 0 ? "F♯" : "G♭"} semitone={9} keyboard="c" />
			</div>
		</div>
	);
}
