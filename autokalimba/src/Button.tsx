import { useContext } from "preact/hooks";
import { KalimbaContext, SettingsContext } from "./global";

export interface ButtonProps {
	label: string;
	targetName: string;
	bass: boolean;
}

export function Button({ label, targetName, bass }: ButtonProps) {
	const kalimba = useContext(KalimbaContext);
	const settings = useContext(SettingsContext);
	const bg = kalimba.isActive(targetName)
		? "bg-orange-400"
		: "bg-gradient-to-br from-gray-400 to-gray-500 bg-fixed";
	const bgSplit = kalimba.isActive(`${targetName}-split`)
		? "bg-orange-400"
		: "bg-gradient-to-br from-gray-500 to-gray-600 bg-fixed";
	return (
		<div className="aspect-square flex flex-col justify-center items-stretch text-3xl rounded-lg relative text-white overflow-hidden">
			<button
				className={`flex-[2] cursor-pointer select-none touch-none ${bg}`}
				type="button"
				onPointerDown={(e) => {
					kalimba.pointerDown(e.pointerId, targetName);
				}}
				onTouchStart={(e) => {
					// Prevent selecting them with long taps:
					e.preventDefault();
				}}
			/>
			{bass && settings.splitKeys.value && (
				<button
					className={`flex-[1] cursor-pointer select-none touch-none ${bgSplit}`}
					type="button"
					onPointerDown={(e) => {
						kalimba.pointerDown(e.pointerId, `${targetName}-split`);
					}}
					onTouchStart={(e) => {
						// Prevent selecting them with long taps:
						e.preventDefault();
					}}
				/>
			)}
			<div
				className="absolute w-full text-center pointer-events-none"
				style={
					label.length >= 1
						? { transform: "scaleX(1)", letterSpacing: "-2px" }
						: {}
				}
			>
				{label}
			</div>
		</div>
	);
}
