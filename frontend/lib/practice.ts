export type TargetNote = { name: string; degree: string };

export const SONGS = [
  {
    id: 'billies-bounce',
    name: "Billie's Bounce",
    chords: ['F7', 'F7alt', 'B♭7', 'B°', 'D7', 'C7', 'C7alt'],
  },
  {
    id: 'hornful-soul',
    name: 'Hornful Soul',
    chords: ['F7', 'F7alt', 'B♭7', 'B°', 'D7', 'C7', 'C7alt'],
  },
  {
    id: 'bags-groove',
    name: "Bag's Groove",
    chords: ['F7', 'F7alt', 'B♭7', 'B°', 'D7', 'C7', 'C7alt'],
  },
  { id: 'all-blues', name: 'All Blues', chords: ['G7', 'C7', 'Dalt', 'D#alt'] },
] as const;

export type SongId = (typeof SONGS)[number]['id'];

export type Chord = {
  name: string;
  annotation: string;
  note: string;
  emphasized: boolean;
  targetNoteOptions: TargetNote[];
};

export type Exercise = {
  id: string;
  title: string;
  category: string;
  guidance: string;
  chords: Chord[];
};

export type Card = {
  exercise: Exercise;
  chords: Chord[];
  targetNotes: string[];
  bpm: number;
  fretStart: number;
  fretEnd: number;
  stringStart: number;
  stringEnd: number;
};
