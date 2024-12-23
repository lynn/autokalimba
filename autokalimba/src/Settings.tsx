import { SettingsContext } from "./global";
import { useContext } from "preact/hooks";

export function Settings() {
	const settings = useContext(SettingsContext);

	return (
		<div className="flex flex-col gap-4">
			<label className="flex flex-row items-center gap-4">
				Hue:
				<input
					type="range"
					min="-180"
					max="180"
					value={settings.hue}
					onInput={(e) => {
						settings.hue.value = Number(e.currentTarget.value);
					}}
				/>
			</label>
			<label className="flex flex-row items-center gap-4">
				Sharps:
				<input
					type="range"
					min="0"
					max="5"
					value={settings.sharps}
					onInput={(e) => {
						settings.sharps.value = Number(e.currentTarget.value);
					}}
				/>
			</label>
		</div>
	);
}
