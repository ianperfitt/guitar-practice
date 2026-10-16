# Guitar Practice

A focused guitar practice app built with **Spring Boot 4 (Java 21+)** and **Next.js 16 / React 19 / TypeScript**.

## Run locally

Requirements: Java 21 or newer, Maven 3.6.3 or newer, and Node.js 20.9 or newer.

From the repository root:

```bash
npm --prefix frontend install
npm run dev
```

Open **http://localhost:3000**. The command starts both the Next.js frontend on port 3000 and the Spring Boot backend on port 8080. Press Ctrl+C to stop both.

Or run the services in separate terminals:

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

### Running from VS Code

Open the repository root (`guitar-practice`) as the workspace folder. The root `pom.xml` imports the backend Maven module; workspace settings enable full Java project support and Maven dependency resolution.

1. Install the recommended **Extension Pack for Java** if prompted.
2. If you previously saw `SpringApplication cannot be resolved`, open the Command Palette and run **Java: Clean Java Language Server Workspace**, then confirm the restart. Wait for the Maven import and Java build to finish; the first import may download dependencies.
3. In **Run and Debug**, select **Guitar Practice: Backend** and press F5. This uses the backend project's full Maven classpath.
4. Run `npm run dev:frontend` in a terminal and open http://localhost:3000.

The Java launch configuration starts only the backend. Alternatively, `npm run dev` starts both services without the IDE debugger. Use one backend launch method at a time to avoid a port 8080 conflict.

VS Code's [Java project documentation](https://code.visualstudio.com/docs/java/java-project) describes project importing, dependency resolution, and the language server workspace reset.

## Practice

- Every card combines **two distinct chords + one exercise from the exercise library**. All 16 named exercises are included. Shuffle selects only from the eight allowed ordered chord pairs and refreshes the exercise order without dropping or duplicating exercises.
- Choose a **target note for each chord** using its dropdown. Options show the note name and chord degree: root, third, fifth, and seventh where applicable. Altered chords offer both altered fifths; B° offers its three triad tones. Each card keeps its choices while you browse or adjust tempo and fret range. Shuffling independently randomizes both targets; a page reload starts with roots.
- Tempo defaults to **100 BPM** and can be edited from 20–300 BPM. Tempo changes apply to all cards, including the audible four-beat metronome.
- Each card shows a five-fret **inclusive** range, always within frets 1–12. Valid positions are 1–5 through 8–12. Choose random positions per card or fix one position for the whole deck.
- Choose a **string range** of three consecutive strings: 1–3, 2–4, 3–5, or 4–6. String 1 is the thinnest string. The fretboard highlights the selected strings within your fret window. Choose **Random position** (the default) to sample a range per card and refresh it when shuffling, or select a fixed range for the whole deck. Fixed ranges stay saved until you choose Shuffle Deck.
- Browse freely with Previous/Next or the keyboard arrow keys. Navigation loops through the deck. **Shuffle Deck always randomizes both fret and string ranges**, switching both dropdowns to Random position and assigning fresh windows to every card, while keeping your tempo.
- The library supports search and direct selection of any exercise.
- Tempo, fret, and string-range preferences are saved in browser local storage. No account or database is needed.

### Interpreting the original table

The standalone rows of `1`s are retained as annotations on the preceding exercise, rather than separate cards. No musical meaning is assigned to those numbers. Target Note Bends retains the empty B° annotation (shown as a dash). HWHT Enclosure retains “Whole–Half or Half–Whole” on B°. Bold chord names preserve the emphasis from the table. Chord labels use F7alt, B♭7, B°, and C7alt.

Up & Down Scale and Blues Scale have no supplied chord progression in the library. Every practice card, including scales, uses exactly one of these ordered pairs:

- F7 → B♭7
- F7alt → B♭7
- B♭7 → F7
- B° → F7
- F7 → D7
- D7 → C7
- C7 → F7
- C7alt → F7

Pair order is preserved. The selected exercise supplies any chord-specific annotations. Descriptive practice prompts are supplementary copy.

## API

Next.js forwards `/api/*` to Spring Boot, so the browser uses a single origin.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/exercises` | Returns the 16 canonical exercises and chord annotations. |
| POST | `/api/decks` | Returns cards containing one library exercise, two distinct chords, tempo, and valid fret and string ranges. |

Example request:

```bash
curl -X POST http://localhost:8080/api/decks \
  -H 'Content-Type: application/json' \
  -d '{"bpm":100,"fretStart":null,"stringStart":null,"shuffle":true}'
```

An empty `{}` defaults to 100 BPM, random positions, and shuffling. `fretStart` is null for random positions or an integer from 1–8; the end fret is always `fretStart + 4`. `shuffle: false` returns the original exercise order and cycles through the eight ordered pairs above. Each card has an `exercise` containing the original library data and a separate `chords` array containing exactly two selected chords. Each chord includes `targetNoteOptions` with note names and degrees. The card’s `targetNotes` contains one selected note name per chord in the same order. Unshuffled cards start on roots; shuffling samples both targets independently alongside the chord pair. Invalid input returns HTTP 400. Decks are generated per request and never shared between users.

`stringStart` is null (or omitted) for a random range per card, or an integer from 1–4 for a fixed range. Random ranges are resampled on each deck request, including Shuffle Deck. Each card returns `stringStart` and `stringEnd`; the end string is always `stringStart + 2`, so all ranges stay within strings 1–6.

## Checks

```bash
npm test
npm run build
```

Backend tests check catalog fidelity, only the eight allowed ordered pairs (including scales), shuffle completeness, inclusive fret boundaries, tempo settings, and HTTP validation. TypeScript is checked separately and by the Next.js production build.

The frontend targets Chrome on desktop and uses Tailwind CSS 4 with PostCSS. Component utilities live in the JSX; shared colors, fonts, animations, base styles, and layout variants live in `frontend/app/globals.css`. The `wide`, `compact`, and `narrow` variants adjust spacing for different desktop window sizes.

Prettier uses two-space indentation, a 100-character print width, and the Tailwind plugin to sort utility classes, including grouped classes passed to `cn`. Format the frontend or check formatting with:

```bash
npm --prefix frontend run format
npm --prefix frontend run format:check
```

VS Code recommends Prettier and Tailwind CSS IntelliSense. With these extensions installed, it formats source files on save and provides completions for utility classes and `cn` calls.

Browser tests run in desktop Chrome against the real running backend and frontend. With both running and Google Chrome installed:

```bash
npm --prefix frontend run test:e2e
```

## Production

```bash
mvn -f backend/pom.xml package
java -jar backend/target/guitar-practice-0.0.1-SNAPSHOT.jar
```

In another terminal:

```bash
npm run build
npm --prefix frontend start
```

If Spring Boot runs elsewhere, set `API_URL` to its origin **before building** Next.js (for example, `API_URL=https://api.example.com npm run build`). Spring Boot's port can be changed using `PORT`. Keep the backend on a private network when deploying behind the Next.js server.
