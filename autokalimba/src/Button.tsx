import { useContext } from "preact/hooks";
import { KalimbaContext } from "./global";

export function Button({
	label,
	semitone,
	keyboard,
}: { label: string; semitone: number; keyboard: string }) {
	const kalimba = useContext(KalimbaContext);

	return (
		<button
			type="button"
			className="w-20 h-20 frcc text-4xl rounded-2xl
                text-white bg-gray-400 active:bg-orange-500
                cursor-pointer select-none"
			onPointerDown={(e) => {
				kalimba.pointerDown(e.pointerId, [220 * 2 ** (semitone / 12), 110]);
			}}
		>
			{label}
		</button>
	);
}
