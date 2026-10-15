package com.guitarpractice;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;

@Service
public class PracticeService {
    public record Chord(String name, String annotation, String note, boolean emphasized) {}
    public record Exercise(String id, String title, String category, String guidance, List<Chord> chords) {}
    public record Card(Exercise exercise, List<Chord> chords, int bpm, int fretStart, int fretEnd) {}

    private static final List<List<String>> CHORD_PAIRS = List.of(
        List.of("F7", "B♭7"),
        List.of("F7alt", "B♭7"),
        List.of("B♭7", "F7"),
        List.of("B°", "F7"),
        List.of("F7", "D7"),
        List.of("D7", "C7"),
        List.of("C7", "F7"),
        List.of("C7alt", "F7")
    );

    private static final List<Chord> DEFAULT_CHORDS = chords(false, false);

    private static final List<Exercise> EXERCISES = List.of(
        exercise("up-down-scale", "Up & Down Scale", "Scales", "Get comfortable in your position. Play the scale ascending and descending, keeping every note even and connected.", false, false, true),
        exercise("blues-scale", "Blues Scale", "Scales", "Find your blues voice. Move through the blues scale and give each note a little room to breathe.", false, false, true),
        exercise("tht-enclosure", "THT Enclosure", "Enclosures", "Work your THT enclosure through the progression. Land clearly on each target note.", false, false, false),
        exercise("hht-enclosure", "HHT Enclosure", "Enclosures", "Work your HHT enclosure through the progression. Keep the approach notes even and your resolution clear.", false, false, false),
        exercise("hwt-enclosure", "HWT Enclosure", "Enclosures", "Work your HWT enclosure through the progression. Stay in position and connect each target note.", false, false, false),
        exercise("hwht-enclosure", "HWHT Enclosure", "Enclosures", "Work your HWHT enclosure through the progression. On B°, explore whole–half or half–whole.", true, false, false),
        exercise("target-note-bends", "Target Note Bends", "Expression", "Bend into your target notes. Listen closely to the pitch and let the chord guide your ear.", false, true, false),
        exercise("triad", "Triad", "Triads", "Outline each chord with its triad. Find clean voicings within your five-fret position.", false, false, false),
        exercise("triad-octave", "Triad + Octave", "Triads", "Play each triad and extend it to the octave. Connect the shapes without leaving your position.", false, false, false),
        exercise("common-chords", "Common Chords", "Chords", "Explore familiar chord shapes through the progression. Aim for a relaxed hand and a clear sound.", false, false, false),
        exercise("passing-tones", "Passing Tones", "Expression", "Connect chord tones with passing tones. Let each phrase lead naturally into the next chord.", false, false, false),
        exercise("triad-pivots", "Triad Pivots", "Triads", "Pivot between triad shapes through the changes. Listen for smooth connections between voices.", false, false, false),
        exercise("vertical-triad-walk", "Vertical Triad Chord Walk", "Chord walks", "Walk triads vertically across the strings. Keep your shapes inside the selected fret range.", false, false, false),
        exercise("vertical-common-walk", "Vertical Common Chord Walk", "Chord walks", "Move common chord shapes vertically across the strings, keeping each transition connected.", false, false, false),
        exercise("horizontal-common-walk", "Horizontal Common Chord Walk (Drop 1, 2, 3)", "Chord walks", "Explore drop 1, 2, and 3 voicings horizontally. Look for the closest available shape in your position.", false, false, false),
        exercise("octaves", "Octaves (Up & Down Scale)", "Scales", "Play the scale in octaves, ascending and descending. Keep both notes balanced and mute unused strings.", false, false, false)
    );

    private static Exercise exercise(String id, String title, String category, String guidance,
                                     boolean hwht, boolean bends, boolean scaleOnly) {
        return new Exercise(id, title, category, guidance, scaleOnly ? List.of() : chords(hwht, bends));
    }

    private static List<Chord> chords(boolean hwht, boolean bends) {
        return List.of(
            new Chord("F7", "1", "", hwht),
            new Chord("F7alt", "1", "", true),
            new Chord("B♭7", "1", "", hwht),
            new Chord("B°", bends ? "" : "1", hwht ? "Whole–Half or Half–Whole" : "", hwht),
            new Chord("D7", "1", "", hwht),
            new Chord("C7", "1", "", false),
            new Chord("C7alt", "1", "", false)
        );
    }

    public List<Exercise> exercises() { return EXERCISES; }

    public List<Card> deck(int bpm, Integer fretStart, boolean shuffle) {
        if (bpm < 20 || bpm > 300) throw new IllegalArgumentException("BPM must be between 20 and 300.");
        if (fretStart != null && (fretStart < 1 || fretStart > 8)) {
            throw new IllegalArgumentException("Start fret must be between 1 and 8.");
        }
        List<Exercise> order = new ArrayList<>(EXERCISES);
        if (shuffle) Collections.shuffle(order);
        return IntStream.range(0, order.size()).mapToObj(index -> {
            var exercise = order.get(index);
            // Scale-only exercises use the same chord pool as the rest of the library.
            var pool = exercise.chords().isEmpty() ? DEFAULT_CHORDS : exercise.chords();
            var pair = CHORD_PAIRS.get(shuffle ? ThreadLocalRandom.current().nextInt(CHORD_PAIRS.size())
                                             : index % CHORD_PAIRS.size());
            var chords = pair.stream().map(name -> pool.stream()
                .filter(chord -> chord.name().equals(name)).findFirst().orElseThrow()).toList();
            int start = fretStart == null ? ThreadLocalRandom.current().nextInt(1, 9) : fretStart;
            return new Card(exercise, chords, bpm, start, start + 4);
        }).toList();
    }
}
