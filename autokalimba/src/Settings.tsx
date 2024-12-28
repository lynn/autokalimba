import { KalimbaContext, SettingsContext } from "./global";
import { useContext } from "preact/hooks";

export function Settings() {
	const settings = useContext(SettingsContext);
	const kalimba = useContext(KalimbaContext);

	return (
		<div className="flex flex-col gap-2 p-2">
			<label className="flex flex-row items-center gap-2">
				<input
					type="range"
					min="-180"
					max="180"
					value={settings.hue}
					onInput={(e) => {
						settings.hue.value = Number(e.currentTarget.value);
					}}
				/>
				Hue
			</label>
			<label className="flex flex-row items-center gap-2">
				<input
					type="range"
					min="0"
					max="5"
					value={settings.sharps}
					onInput={(e) => {
						settings.sharps.value = Number(e.currentTarget.value);
					}}
				/>
				Sharps
			</label>
			<label className="flex flex-row items-center gap-2">
				<input
					type="checkbox"
					checked={settings.splitKeys}
					onInput={(e) => {
						settings.splitKeys.value = e.currentTarget.checked;
					}}
				/>
				Split keys
			</label>
			<button
				class="cursor-pointer border-black border px-4 py-2 rounded-full"
				type="button"
				onClick={() => kalimba.stenoKeyboard.connect()}
			>
				Connect steno keyboard
			</button>
			({kalimba.stenoKeyboard.isConnected() ? "Connected" : "Disconnected"})
		</div>
	);
}
