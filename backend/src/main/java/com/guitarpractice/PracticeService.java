package com.guitarpractice;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;

@Service
public class PracticeService {
    public record TargetNote(String name, String degree) {}
    public record Chord(String name, String annotation, String note, boolean emphasized,
                        List<TargetNote> targetNoteOptions) {}
    public record Exercise(String id, String title, String category, String guidance, List<Chord> chords) {}
    public record Card(Exercise exercise, List<Chord> chords, List<String> targetNotes,
                       int bpm, int fretStart, int fretEnd, int stringStart, int stringEnd) {}

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
    private static final List<List<String>> ALL_BLUES_PAIRS = List.of(
        List.of("G7", "C7"),
        List.of("C7", "G7"),
        List.of("G7", "Dalt"),
        List.of("Dalt", "D#alt"),
        List.of("D#alt", "G7")
    );

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
            chord("F7", "1", "", hwht),
            chord("F7alt", "1", "", true),
            chord("B♭7", "1", "", hwht),
            chord("B°", bends ? "" : "1", hwht ? "Whole–Half or Half–Whole" : "", hwht),
            chord("D7", "1", "", hwht),
            chord("C7", "1", "", false),
            chord("C7alt", "1", "", false)
        );
    }

    private static Chord chord(String name, String annotation, String note, boolean emphasized) {
        var options = switch (name) {
            case "F7" -> List.of(target("F", "1"), target("A", "3"), target("C", "5"), target("E♭", "♭7"));
            case "F7alt" -> List.of(target("F", "1"), target("A", "3"), target("C♭", "♭5"), target("C♯", "♯5"), target("E♭", "♭7"));
            case "B♭7" -> List.of(target("B♭", "1"), target("D", "3"), target("F", "5"), target("A♭", "♭7"));
            case "B°" -> List.of(target("B", "1"), target("D", "♭3"), target("F", "♭5"));
            case "D7" -> List.of(target("D", "1"), target("F♯", "3"), target("A", "5"), target("C", "♭7"));
            case "C7" -> List.of(target("C", "1"), target("E", "3"), target("G", "5"), target("B♭", "♭7"));
            case "C7alt" -> List.of(target("C", "1"), target("E", "3"), target("G♭", "♭5"), target("G♯", "♯5"), target("B♭", "♭7"));
            case "G7" -> List.of(target("G", "1"), target("B", "3"), target("D", "5"), target("F", "♭7"));
            case "Dalt" -> List.of(target("D", "1"), target("F♯", "3"), target("A♭", "♭5"), target("A♯", "♯5"), target("C", "♭7"));
            case "D#alt" -> List.of(target("D♯", "1"), target("F𝄪", "3"), target("A", "♭5"), target("B", "♯5"), target("C♯", "♭7"));
            default -> throw new IllegalArgumentException("Unknown chord: " + name);
        };
        return new Chord(name, annotation, note, emphasized, options);
    }

    private static TargetNote target(String name, String degree) { return new TargetNote(name, degree); }

    public List<Exercise> exercises() { return EXERCISES; }

    public List<Card> deck(int bpm, Integer fretStart, Integer stringStart, boolean shuffle) {
        return deck(bpm, fretStart, stringStart, shuffle, null);
    }

    public List<Card> deck(int bpm, Integer fretStart, Integer stringStart, boolean shuffle, String songId) {
        var pairs = switch (songId == null ? "billies-bounce" : songId) {
            case "billies-bounce", "hornful-soul", "bags-groove" -> CHORD_PAIRS;
            case "all-blues" -> ALL_BLUES_PAIRS;
            default -> throw new IllegalArgumentException("Unknown song: " + songId);
        };
        if (bpm < 20 || bpm > 300) throw new IllegalArgumentException("BPM must be between 20 and 300.");
        if (fretStart != null && (fretStart < 1 || fretStart > 8)) {
            throw new IllegalArgumentException("Start fret must be between 1 and 8.");
        }
        if (stringStart != null && (stringStart < 1 || stringStart > 4)) {
            throw new IllegalArgumentException("Start string must be between 1 and 4.");
        }
        List<Exercise> order = new ArrayList<>(EXERCISES);
        if (shuffle) Collections.shuffle(order);
        return IntStream.range(0, order.size()).mapToObj(index -> {
            var exercise = order.get(index);
            // Scale-only exercises use the same chord pool as the rest of the library.
            var pool = exercise.chords().isEmpty() ? DEFAULT_CHORDS : exercise.chords();
            var pair = pairs.get(shuffle ? ThreadLocalRandom.current().nextInt(pairs.size())
                                        : index % pairs.size());
            var chords = pair.stream().map(name -> pool.stream()
                .filter(chord -> chord.name().equals(name)).findFirst()
                .orElseGet(() -> chord(name, "", "", false))).toList();
            var targets = chords.stream().map(chord -> {
                var options = chord.targetNoteOptions();
                return options.get(shuffle ? ThreadLocalRandom.current().nextInt(options.size()) : 0).name();
            }).toList();
            int start = fretStart == null ? ThreadLocalRandom.current().nextInt(1, 9) : fretStart;
            int firstString = stringStart == null ? ThreadLocalRandom.current().nextInt(1, 5) : stringStart;
            return new Card(exercise, chords, targets, bpm, start, start + 4, firstString, firstString + 2);
        }).toList();
    }
}
