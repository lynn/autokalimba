export interface InstrumentDescription {
	lo: number;
	hi: number;
	samples: { name: string; frequency: number; only?: "bass" | "chords" }[];
}

export const instruments: Record<string, InstrumentDescription> = {
	Piano: {
		lo: 250,
		hi: 650,
		samples: [
			{ name: "piano-cs3.wav", frequency: 138.59 },
			{ name: "piano-f4.wav", frequency: 698.46 / 2 },
		],
	},
	Rhodes: {
		lo: 250,
		hi: 650,
		samples: [
			{ name: "rhodes-low.wav", frequency: 110, only: "bass" },
			{ name: "rhodes-high.wav", frequency: 329, only: "chords" },
		],
	},
};
