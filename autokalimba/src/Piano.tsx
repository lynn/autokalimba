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
					? "bg-gray-700"
					: "bg-gray-900"
				: split
					? "bg-gray-200"
					: "bg-white";
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
			className={`flex flex-col items-stretch relative overflow-hidden w-full h-full rounded-b-md [container-type:inline-size] ${
				black ? "text-white shadow-md" : "text-black border border-gray-400"
			}`}
		>
			{part(targetName, false)}
			{settings.splitKeys.value && part(`${targetName}-split`, true)}
			<div className="absolute bottom-[0.3em] w-full text-center pointer-events-none text-[45cqw] leading-none">
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
 * Bass keys laid out as a piano keyboard from C to C.
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
	const whiteWidth = 100 / white.length;
	const blackWidth = whiteWidth * 0.62;
	return (
		<div className="relative w-full h-full">
			<div className="flex flex-row w-full h-full">
				{white.map(([label, targetName]) => (
					<div key={targetName} className="flex-1 min-w-0 h-full">
						<PianoKey label={label} targetName={targetName} black={false} />
					</div>
				))}
			</div>
			{black.map(([after, label, targetName]) => (
				<div
					key={targetName}
					className="absolute top-0 h-[60%]"
					style={{
						left: `${(after + 1) * whiteWidth - blackWidth / 2}%`,
						width: `${blackWidth}%`,
					}}
				>
					<PianoKey label={label} targetName={targetName} black={true} />
				</div>
			))}
		</div>
	);
}
