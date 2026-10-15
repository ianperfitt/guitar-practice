package com.guitarpractice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
            assertThat(card.get("chords").size()).isEqualTo(2);
            assertThat(card.get("chords").get(0).get("name").asText())
                .isNotEqualTo(card.get("chords").get(1).get("name").asText());
            assertThat(card.get("exercise").get("id").asText()).isNotBlank();
        }
    }

    @Test void rejectsOutOfRangeInputAndMalformedRequests() throws Exception {
        assertThat(post("{\"fretStart\":9}").statusCode()).isEqualTo(400);
        assertThat(post("{\"bpm\":0}").statusCode()).isEqualTo(400);
        assertThat(post("not json").statusCode()).isEqualTo(400);
    }
}
