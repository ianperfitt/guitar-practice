package com.guitarpractice;

import java.util.List;
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
        for (int i = 0; i < 100; i++) {
            var deck = service.deck(100, null, true);
            assertThat(deck).hasSize(16);
            assertThat(deck.stream().map(PracticeService.Card::exercise)).containsExactlyInAnyOrderElementsOf(service.exercises());
            assertThat(deck).allSatisfy(card -> {
                assertThat(card.chords()).hasSize(2);
                var pair = card.chords().stream().map(PracticeService.Chord::name).toList();
                assertThat(ALLOWED_PAIRS).contains(pair);
                var pool = card.exercise().chords().isEmpty() ? service.exercises().get(2).chords() : card.exercise().chords();
                assertThat(card.chords()).isSubsetOf(pool);
                assertThat(card.bpm()).isEqualTo(100);
                assertThat(card.fretStart()).isBetween(1, 8);
                assertThat(card.fretEnd()).isBetween(5, 12);
                assertThat(card.fretEnd() - card.fretStart() + 1).isEqualTo(5);
            });
        }
    }

    @Test void unshuffledDeckKeepsLibraryOrderAndCyclesThroughAllEightPairsInOrder() {
        var deck = service.deck(100, 1, false);
        assertThat(deck.stream().map(PracticeService.Card::exercise)).containsExactlyElementsOf(service.exercises());
        for (int i = 0; i < deck.size(); i++) {
            assertThat(deck.get(i).chords().stream().map(PracticeService.Chord::name))
                .containsExactlyElementsOf(ALLOWED_PAIRS.get(i % ALLOWED_PAIRS.size()));
        }
    }

    @Test void fixedRangeAndTempoApplyToAllCards() {
        assertThat(service.deck(140, 8, false)).allSatisfy(card -> {
            assertThat(card.bpm()).isEqualTo(140);
            assertThat(card.fretStart()).isEqualTo(8);
            assertThat(card.fretEnd()).isEqualTo(12);
        });
    }

    @Test void invalidRangesAndTemposAreRejected() {
        assertThatThrownBy(() -> service.deck(0, 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 9, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deck(100, 0, true)).isInstanceOf(IllegalArgumentException.class);
    }
}
