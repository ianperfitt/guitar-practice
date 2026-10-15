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

- All 16 named exercises from the supplied table are included. Shuffle randomizes the entire deck without dropping or duplicating exercises.
- Tempo defaults to **100 BPM** and can be edited from 20–300 BPM. Tempo changes apply to all cards, including the audible four-beat metronome.
- Each card shows a five-fret **inclusive** range, always within frets 1–12. Valid positions are 1–5 through 8–12. Choose random positions per card or fix one position for the whole deck.
- Browse with Previous/Next or the keyboard arrow keys. Use **Mark practiced & next** to track the 16 exercises in a session. Shuffling starts a fresh session.
- The library supports search and direct selection of any exercise.
- Tempo and position preferences are saved in browser local storage. Session completion resets on reload. No account or database is needed.

### Interpreting the original table

The standalone rows of `1`s are retained as annotations on the preceding exercise, rather than separate cards. No musical meaning is assigned to those numbers. Target Note Bends retains the empty Bdim annotation (shown as a dash). HWHT Enclosure retains “Whole–Half or Half–Whole” on Bdim. Bold chord names preserve the emphasis from the table. Bflat 7 is displayed as B♭7.

Up & Down Scale and Blues Scale have no supplied chord progression, so their cards show scale guidance instead. Descriptive practice prompts are supplementary copy; exercise names and chord data come from the supplied table.

## API

Next.js forwards `/api/*` to Spring Boot, so the browser uses a single origin.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/exercises` | Returns the 16 canonical exercises and chord annotations. |
| POST | `/api/decks` | Returns cards with tempo, valid fret ranges, and optional shuffling. |

Example request:

```bash
curl -X POST http://localhost:8080/api/decks \
  -H 'Content-Type: application/json' \
  -d '{"bpm":100,"fretStart":null,"shuffle":true}'
```

An empty `{}` defaults to 100 BPM, random positions, and shuffling. `fretStart` is null for random positions or an integer from 1–8; the end fret is always `fretStart + 4`. `shuffle: false` returns the original order. Invalid input returns HTTP 400. Decks are generated per request and never shared between users.

## Checks

```bash
npm test
npm run build
```

Backend tests check catalog fidelity, shuffle completeness, inclusive fret boundaries, tempo settings, and HTTP validation. TypeScript is checked separately and by the Next.js production build.

Browser tests use the real running backend and frontend. With both running and Google Chrome installed:

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
