export type TargetNote = { name: string; degree: string };

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
