package com.guitarpractice;

import java.util.List;
import java.util.Map;
import java.util.HashSet;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PracticeServiceTest {
    private final PracticeService service = new PracticeService();
    private static final List<List<String>> ALLOWED_PAIRS = List.of(
        List.of("F7", "B♭7"), List.of("F7alt", "B♭7"),
        List.of("B♭7", "F7"), List.of("B°", "F7"),
        List.of("F7", "D7"), List.of("D7", "C7"),
        List.of("C7", "F7"), List.of("C7alt", "F7")
    );

    @Test void catalogPreservesAllSixteenExercisesAndAnnotations() {
        assertThat(service.exercises()).hasSize(16);
        assertThat(service.exercises().stream().map(PracticeService.Exercise::id)).doesNotHaveDuplicates();
        assertThat(service.exercises().getFirst().chords()).isEmpty();
        assertThat(service.exercises().get(1).chords()).isEmpty();
        var hwht = service.exercises().get(5).chords();
        assertThat(hwht).hasSize(7);
        assertThat(hwht.get(3).note()).isEqualTo("Whole–Half or Half–Whole");
        assertThat(service.exercises().get(6).chords().get(3).annotation()).isEmpty();
    }

    @Test void randomDecksUseOnlyAllowedOrderedPairsWithEveryLibraryExercise() {
        var sampledF7Targets = new HashSet<String>();
        for (int i = 0; i < 100; i++) {
            var deck = service.deck(100, null, 1, true);
            assertThat(deck).hasSize(16);
            assertThat(deck.stream().map(PracticeService.Card::exercise)).containsExactlyInAnyOrderElementsOf(service.exercises());
            assertThat(deck).allSatisfy(card -> {
                assertThat(card.chords()).hasSize(2);
                var pair = card.chords().stream().map(PracticeService.Chord::name).toList();
                assertThat(ALLOWED_PAIRS).contains(pair);
                var pool = card.exercise().chords().isEmpty() ? service.exercises().get(2).chords() : card.exercise().chords();
                assertThat(card.chords()).isSubsetOf(pool);
                assertThat(card.targetNotes()).hasSize(2);
                for (int chordIndex = 0; chordIndex < card.chords().size(); chordIndex++) {
                    var chord = card.chords().get(chordIndex);
                    var target = card.targetNotes().get(chordIndex);
                    assertThat(chord.targetNoteOptions().stream().map(PracticeService.TargetNote::name))
                        .contains(target);
                    if (chord.name().equals("F7")) sampledF7Targets.add(target);
                }
                assertThat(card.bpm()).isEqualTo(100);
                assertThat(card.fretStart()).isBetween(1, 8);
                assertThat(card.fretEnd()).isBetween(5, 12);
                assertThat(card.fretEnd() - card.fretStart() + 1).isEqualTo(5);
            });
        }
        assertThat(sampledF7Targets).containsExactlyInAnyOrder("F", "A", "C", "E♭");
    }

    @Test void targetNoteOptionsMatchChordTonesIncludingAlteredAndDiminishedFifths() {
        var expected = Map.of(
            "F7", List.of("F", "A", "C", "E♭"),
            "F7alt", List.of("F", "A", "C♭", "C♯", "E♭"),
            "B♭7", List.of("B♭", "D", "F", "A♭"),
            "B°", List.of("B", "D", "F"),
            "D7", List.of("D", "F♯", "A", "C"),
            "C7", List.of("C", "E", "G", "B♭"),
            "C7alt", List.of("C", "E", "G♭", "G♯", "B♭")
        );
        assertThat(service.exercises().get(2).chords()).allSatisfy(chord -> {
            assertThat(chord.targetNoteOptions().stream().map(PracticeService.TargetNote::name))
                .containsExactlyElementsOf(expected.get(chord.name()));
            assertThat(chord.targetNoteOptions()).allSatisfy(note -> assertThat(note.degree()).isNotBlank());
        });
    }

    @Test void unshuffledDeckKeepsLibraryOrderAndCyclesThroughAllEightPairsInOrder() {
        var deck = service.deck(100, 1, 1, false);
        assertThat(deck.stream().map(PracticeService.Card::exercise)).containsExactlyElementsOf(service.exercises());
        for (int i = 0; i < deck.size(); i++) {
            assertThat(deck.get(i).chords().stream().map(PracticeService.Chord::name))
                .containsExactlyElementsOf(ALLOWED_PAIRS.get(i % ALLOWED_PAIRS.size()));
            for (int chordIndex = 0; chordIndex < 2; chordIndex++) {
                assertThat(deck.get(i).targetNotes().get(chordIndex))
                    .isEqualTo(deck.get(i).chords().get(chordIndex).targetNoteOptions().getFirst().name());
            }
        }
    }

    @Test void fixedRangeAndTempoApplyToAllCards() {
        assertThat(service.deck(140, 8, 4, false)).allSatisfy(card -> {
            assertThat(card.bpm()).isEqualTo(140);
            assertThat(card.fretStart()).isEqualTo(8);
            assertThat(card.fretEnd()).isEqualTo(12);
            assertThat(card.stringStart()).isEqualTo(4);
            assertThat(card.stringEnd()).isEqualTo(6);
        });
    }

    @Test void stringRangesAlwaysHaveThreeConsecutiveStringsAndSurviveShuffling() {
        for (int start = 1; start <= 4; start++) {
            int expectedStart = start;
            for (boolean shuffle : List.of(false, true)) {
                assertThat(service.deck(100, null, start, shuffle)).allSatisfy(card -> {
                    assertThat(card.stringStart()).isEqualTo(expectedStart);
                    assertThat(card.stringEnd()).isEqualTo(expectedStart + 2).isBetween(3, 6);
                });
            }
        }
    }

    @Test void randomStringRangesSampleAllFourWindowsWithOrWithoutShuffling() {
        for (boolean shuffle : List.of(false, true)) {
            var sampledStarts = new HashSet<Integer>();
            for (int i = 0; i < 100; i++) {
                assertThat(service.deck(100, 8, null, shuffle)).allSatisfy(card -> {
                    assertThat(card.stringStart()).isBetween(1, 4);
                    assertThat(card.stringEnd()).isEqualTo(card.stringStart() + 2).isBetween(3, 6);
                    assertThat(card.fretStart()).isEqualTo(8);
                    sampledStarts.add(card.stringStart());
                });
            }
            assertThat(sampledStarts).containsExactlyInAnyOrder(1, 2, 3, 4);
        }
    }

    @Test void invalidRangesAndTemposAreRejected() {
        assertThatThrownBy(() -> service.deck(0, 1, 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 9, 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 0, 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 1, 0, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 1, 5, true)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void originalSongsKeepTheExistingOrderedPairs() {
        for (var song : List.of("billies-bounce", "hornful-soul", "bags-groove")) {
            var deck = service.deck(100, 1, 1, false, song);
            for (int i = 0; i < deck.size(); i++) {
                assertThat(deck.get(i).chords().stream().map(PracticeService.Chord::name))
                    .containsExactlyElementsOf(ALLOWED_PAIRS.get(i % ALLOWED_PAIRS.size()));
            }
        }
    }

    @Test void allBluesUsesOnlyItsFourChordsAndValidTargets() {
        var expectedNotes = Map.of(
            "G7", List.of("G", "B", "D", "F"),
            "C7", List.of("C", "E", "G", "B♭"),
            "Dalt", List.of("D", "F♯", "A♭", "A♯", "C"),
            "D#alt", List.of("D♯", "F𝄪", "A", "B", "C♯")
        );
        for (boolean shuffle : List.of(false, true)) {
            var deck = service.deck(135, 8, 4, shuffle, "all-blues");
            assertThat(deck.stream().map(PracticeService.Card::exercise))
                .containsExactlyInAnyOrderElementsOf(service.exercises());
            assertThat(deck).allSatisfy(card -> {
                assertThat(card.chords().stream().map(PracticeService.Chord::name))
                    .hasSize(2).doesNotHaveDuplicates().isSubsetOf(expectedNotes.keySet());
                for (int i = 0; i < 2; i++) {
                    var chord = card.chords().get(i);
                    assertThat(chord.targetNoteOptions().stream().map(PracticeService.TargetNote::name))
                        .containsExactlyElementsOf(expectedNotes.get(chord.name()))
                        .contains(card.targetNotes().get(i));
                }
                assertThat(card.bpm()).isEqualTo(135);
                assertThat(card.fretStart()).isEqualTo(8);
                assertThat(card.stringStart()).isEqualTo(4);
            });
        }
        var orderedDeck = service.deck(100, 1, 1, false, "all-blues");
        assertThat(orderedDeck.stream().flatMap(card -> card.chords().stream()).map(PracticeService.Chord::name))
            .containsAll(expectedNotes.keySet());
        assertThatThrownBy(() -> service.deck(100, 1, 1, true, "unknown"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Unknown song");
    }

    @Test void allBluesUsesOnlyItsFiveOrderedPairs() {
        var allowedPairs = List.of(
            List.of("G7", "C7"), List.of("C7", "G7"), List.of("G7", "Dalt"),
            List.of("Dalt", "D#alt"), List.of("D#alt", "G7")
        );
        var orderedDeck = service.deck(100, 1, 1, false, "all-blues");
        for (int i = 0; i < orderedDeck.size(); i++) {
            assertThat(orderedDeck.get(i).chords().stream().map(PracticeService.Chord::name))
                .containsExactlyElementsOf(allowedPairs.get(i % allowedPairs.size()));
        }
        var sampledPairs = new HashSet<List<String>>();
        for (int i = 0; i < 100; i++) {
            var deck = service.deck(100, null, null, true, "all-blues");
            assertThat(deck).allSatisfy(card -> {
                var pair = card.chords().stream().map(PracticeService.Chord::name).toList();
                assertThat(allowedPairs).contains(pair);
                sampledPairs.add(pair);
            });
        }
        assertThat(sampledPairs).containsExactlyInAnyOrderElementsOf(allowedPairs);
    }
}
