import { type MutableRef, useContext, useEffect, useRef } from "preact/hooks";
import { KalimbaContext } from "./global";

export function Button({
	label,
	targetName,
}: { label: string; targetName: string }) {
	const kalimba = useContext(KalimbaContext);
	const buttonRef: MutableRef<HTMLButtonElement | null> = useRef(null);
	const active = kalimba.isActive(targetName);
	return (
		<button
			ref={buttonRef}
			type="button"
			className={`w-20 h-20 frcc text-4xl rounded-2xl
                text-white ${active ? "bg-orange-400" : "bg-gray-400"} active:bg-orange-400
                cursor-pointer select-none touch-none`}
			onPointerDown={(e) => {
				kalimba.pointerDown(e.pointerId, targetName);
			}}
			onTouchStart={(e) => {
				// Prevent selecting them with long taps:
				e.preventDefault();
			}}
		>
			<span
				style={
					label.length >= 4
						? { transform: "scaleX(0.8)", letterSpacing: "-2px" }
						: {}
				}
			>
				{label}
			</span>
		</button>
	);
}
