import { type MutableRef, useContext, useEffect, useRef } from "preact/hooks";
import { KalimbaContext } from "./global";
import { useSignal } from "@preact/signals";
export function Button({
	label,
	semitone,
	keyboard,
}: { label: string; semitone: number; keyboard: string }) {
	const kalimba = useContext(KalimbaContext);
	const active = useSignal(false);
	const buttonRef: MutableRef<HTMLButtonElement | null> = useRef(null);
	useEffect(() => {
		kalimba.registerKeyboard(keyboard, buttonRef, active);
	}, [kalimba, keyboard, active]);
	return (
		<button
			ref={buttonRef}
			type="button"
			className={`w-20 h-20 frcc text-4xl rounded-2xl
                text-white ${active.value ? "bg-orange-400" : "bg-gray-400"} active:bg-orange-400
                cursor-pointer select-none`}
			onPointerDown={(e) => {
				kalimba.pointerDown(e.pointerId, [220 * 2 ** (semitone / 12)]);
			}}
		>
			{label}
		</button>
	);
}
