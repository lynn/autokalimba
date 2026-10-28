import { useContext } from "preact/hooks";
import { KalimbaContext, SettingsContext } from "./global";

interface PianoKeyProps {
	label: string;
	targetName: string;
	black: boolean;
}

/**
 * A bass key on the piano keyboard. Like `Button`, its lower part plays the
 * split (fifth in the bass) note when split keys are enabled.
 */
function PianoKey({ label, targetName, black }: PianoKeyProps) {
	const kalimba = useContext(KalimbaContext);
	const settings = useContext(SettingsContext);
	const color = (name: string, split: boolean) =>
		kalimba.isActive(name)
			? "bg-blue-400"
			: black
				? split
					? "bg-gray-600"
					: "bg-gray-800"
				: split
					? "bg-gray-300"
					: "bg-gray-100";
	const part = (name: string, split: boolean) => (
		<button
			className={`${split ? "flex-[1]" : "flex-[2]"} cursor-pointer select-none touch-none ${color(name, split)}`}
			type="button"
			onPointerDown={(e) => {
				kalimba.pointerDown(e.pointerId, name);
			}}
			onTouchStart={(e) => {
				// Prevent selecting them with long taps:
				e.preventDefault();
			}}
		/>
	);
	return (
		<div
			className={`flex flex-col items-stretch relative overflow-hidden w-full h-full rounded-md shadow-[0_2px_0_rgb(0_0_0/0.35)] [container-type:size] ${
				black ? "text-white" : "text-black"
			}`}
		>
			{part(targetName, false)}
			{settings.splitKeys.value && part(`${targetName}-split`, true)}
			<div className="absolute top-[22%] w-full text-center pointer-events-none text-[45cqmin] leading-none">
				{label}
			</div>
		</div>
	);
}

interface PianoProps {
	/**
	 * Labels for C♯/D♭, E♭, G♭, A♭ and B♭, which depend on the "sharps" setting.
	 */
	db: string;
	eb: string;
	gb: string;
	ab: string;
	bb: string;
}

/**
 * Bass keys laid out as a piano keyboard from C to C, in the style of a
 * TB-303: two rows of equal buttons, with the black keys on the top row
 * offset by half a key.
 */
export function Piano({ db, eb, gb, ab, bb }: PianoProps) {
	const white: [string, string][] = [
		["C", "c"],
		["D", "d"],
		["E", "e"],
		["F", "f"],
		["G", "g"],
		["A", "a"],
		["B", "b"],
		["C", "c-high"],
	];
	// Black keys, by the index of the white key they sit to the right of.
	const black: [number, string, string][] = [
		[0, db, "db"],
		[1, eb, "eb"],
		[3, gb, "gb"],
		[4, ab, "ab"],
		[5, bb, "bb"],
	];
	// Each key spans two of the grid's half-key columns.
	return (
		<div
			className="grid w-full h-full gap-y-1"
			style={{
				gridTemplateColumns: `repeat(${white.length * 2}, 1fr)`,
				gridTemplateRows: "repeat(2, 1fr)",
			}}
		>
			{black.map(([after, label, targetName]) => (
				<div
					key={targetName}
					className="p-[3px] min-w-0 min-h-0"
					style={{ gridRow: 1, gridColumn: `${after * 2 + 2} / span 2` }}
				>
					<PianoKey label={label} targetName={targetName} black={true} />
				</div>
			))}
			{white.map(([label, targetName], i) => (
				<div
					key={targetName}
					className="p-[3px] min-w-0 min-h-0"
					style={{ gridRow: 2, gridColumn: `${i * 2 + 1} / span 2` }}
				>
					<PianoKey label={label} targetName={targetName} black={false} />
				</div>
			))}
		</div>
	);
}
