import { useContext, useMemo } from "preact/hooks";
import { KalimbaContext, SettingsContext } from "./global";

export interface ButtonProps {
	label: string;
	targetName: string;
	bass: boolean;
}

export function Button({ label, targetName, bass }: ButtonProps) {
	const kalimba = useContext(KalimbaContext);
	const invertedLayout = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(kalimba.keyboardLayout).map(([k, v]) => [v, k]),
			),
		[kalimba],
	);

	const settings = useContext(SettingsContext);
	const bg = kalimba.isActive(targetName)
		? "bg-blue-400"
		: targetName.startsWith("s-")
			? "bg-gradient-to-br from-gray-500 to-gray-600 bg-fixed"
			: "bg-gradient-to-br from-gray-400 to-gray-500 bg-fixed";
	const bgSplit = kalimba.isActive(`${targetName}-split`)
		? "bg-blue-400"
		: "bg-gradient-to-br from-gray-500 to-gray-600 bg-fixed";
	return (
		<div
			className="flex flex-col justify-center items-stretch rounded-lg relative text-white overflow-hidden w-full h-full min-w-0 min-h-0 [container-type:size]"
		>
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
			{kalimba.displayLayout.value === "keyboard" && (
				<div className="absolute top-[6cqmin] left-[8cqmin] text-black/50 text-[16cqmin] leading-none">
					{invertedLayout[targetName]}
				</div>
			)}

			<div
				className="absolute w-full text-center pointer-events-none text-[38cqmin] leading-none"
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
