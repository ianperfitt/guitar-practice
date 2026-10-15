package com.guitarpractice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PracticeController {
    private final PracticeService service;
    public PracticeController(PracticeService service) { this.service = service; }

    public record DeckRequest(@Min(20) @Max(300) Integer bpm,
                              @Min(1) @Max(8) Integer fretStart, Boolean shuffle) {}
    public record ApiError(String message) {}

    @GetMapping("/exercises")
    public List<PracticeService.Exercise> exercises() { return service.exercises(); }

    @PostMapping("/decks")
    public List<PracticeService.Card> deck(@Valid @RequestBody DeckRequest request) {
        return service.deck(request.bpm() == null ? 100 : request.bpm(), request.fretStart(),
                            request.shuffle() == null || request.shuffle());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError invalidArgument(IllegalArgumentException exception) {
        return new ApiError(exception.getMessage());
    }
}
