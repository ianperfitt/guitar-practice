package com.guitarpractice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PracticeApiTest {
    @LocalServerPort int port;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> post(String json) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/decks"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void emptyRequestDefaultsToOneHundredBpm() throws Exception {
        var response = post("{}");
        assertThat(response.statusCode()).isEqualTo(200);
        var deck = JsonMapper.builder().build().readTree(response.body());
        assertThat(deck.size()).isEqualTo(16);
        for (var card : deck) {
            assertThat(card.get("bpm").asInt()).isEqualTo(100);
            assertThat(card.get("stringStart").asInt()).isBetween(1, 4);
            assertThat(card.get("stringEnd").asInt()).isEqualTo(card.get("stringStart").asInt() + 2);
            assertThat(card.get("chords").size()).isEqualTo(2);
            assertThat(card.get("targetNotes").size()).isEqualTo(2);
            for (int i = 0; i < 2; i++) {
                var options = new ArrayList<String>();
                card.get("chords").get(i).get("targetNoteOptions").forEach(option -> {
                    options.add(option.get("name").asText());
                    assertThat(option.get("degree").asText()).isNotBlank();
                });
                assertThat(options).contains(card.get("targetNotes").get(i).asText());
            }
            assertThat(card.get("chords").get(0).get("name").asText())
                .isNotEqualTo(card.get("chords").get(1).get("name").asText());
            assertThat(card.get("exercise").get("id").asText()).isNotBlank();
        }
    }

    @Test void selectedStringRangeAppliesToEveryShuffledCard() throws Exception {
        var response = post("{\"stringStart\":4,\"shuffle\":true}");
        assertThat(response.statusCode()).isEqualTo(200);
        var deck = JsonMapper.builder().build().readTree(response.body());
        assertThat(deck.size()).isEqualTo(16);
        for (var card : deck) {
            assertThat(card.get("stringStart").asInt()).isEqualTo(4);
            assertThat(card.get("stringEnd").asInt()).isEqualTo(6);
        }
    }

    @Test void rejectsOutOfRangeInputAndMalformedRequests() throws Exception {
        assertThat(post("{\"fretStart\":9}").statusCode()).isEqualTo(400);
        assertThat(post("{\"bpm\":0}").statusCode()).isEqualTo(400);
        assertThat(post("{\"stringStart\":0}").statusCode()).isEqualTo(400);
        assertThat(post("{\"stringStart\":5}").statusCode()).isEqualTo(400);
        assertThat(post("not json").statusCode()).isEqualTo(400);
    }
}
