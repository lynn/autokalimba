export interface Chord {
	name: string;
	semitones: number[];
}

export const chords: Chord[] = [
	{ name: "Δ9", semitones: [7, 11, 14, 16] },
	{ name: "Δ", semitones: [7, 11, 12, 16] },
	{ name: "6", semitones: [7, 9, 12, 16] },
	{ name: "m9", semitones: [7, 10, 12, 15] },
	{ name: "m7", semitones: [7, 10, 14, 15] },
	{ name: "m6", semitones: [7, 9, 12, 15] },
	{ name: "7s", semitones: [7, 10, 12, 17] },
	{ name: "7", semitones: [7, 10, 12, 16] },
	{ name: "ø", semitones: [6, 10, 12, 15] },
	{ name: "7♭9", semitones: [7, 10, 13, 16] },
	{ name: "7♯5", semitones: [8, 10, 12, 16] },
	{ name: "dim", semitones: [6, 9, 12, 15] },
	{ name: "13s", semitones: [10, 14, 17, 21] },
	{ name: "13", semitones: [10, 14, 16, 21] },
	{ name: "II/", semitones: [9, 14, 12, 18] },
];
