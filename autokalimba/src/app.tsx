import { useState } from "preact/hooks";
import "./app.css";
import { signal } from "@preact/signals";

const hue = signal(0);

export function App() {
	return (
		<div
			className="flex flex-col bg-pink h-full"
			style={{
				filter: `hue-rotate(${hue.value}deg)`,
			}}
		>
			<input
				type="range"
				min="-180"
				max="180"
				value={hue}
				onInput={(e) => {
					hue.value = Number(e.currentTarget.value);
				}}
			/>
		</div>
	);
}
