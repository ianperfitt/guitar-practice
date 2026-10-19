import { expect, test } from '@playwright/test';
import type { Card } from '../lib/practice';

const ALLOWED_PAIRS = [
  ['F7', 'B♭7'],
  ['F7alt', 'B♭7'],
  ['B♭7', 'F7'],
  ['B°', 'F7'],
  ['F7', 'D7'],
  ['D7', 'C7'],
  ['C7', 'F7'],
  ['C7alt', 'F7'],
];

test('real API deck pairs two chords with a library exercise and preserves controls and library', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('1');
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['F7', 'B♭7']);
  await expect(page.locator('.pair-guidance')).toContainText('Explore the scale over each chord');
  await page.locator('.chord-pair .chord').nth(1).click();
  await expect(page.locator('.chord-pair .chord').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('100');
  await page.screenshot({
    path: `../.playwright/${test.info().project.name}-practice.png`,
    fullPage: true,
  });
  await page.getByLabel('TEMPO', { exact: true }).fill('137');
  await page.getByLabel('TEMPO', { exact: true }).press('Tab');
  await expect(page.locator('.card-bottom')).toContainText('137');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await expect(
    page.getByRole('img', {
      name: 'Guitar fretboard. Frets 8 through 12, strings 1 through 3 highlighted.',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Blues Scale', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['F7alt', 'B♭7']);
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Exercise library/ }).click();
  await expect(page.locator('.library-card')).toHaveCount(16);
  const titles = await page.locator('.library-card h3').allTextContents();
  await page.getByLabel('Search exercises').fill('HWHT');
  await expect(page.locator('.library-card')).toHaveCount(1);
  await page.locator('.library-card').click();
  await expect(page.getByRole('heading', { name: 'HWHT Enclosure', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Target Note Bends', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await page.getByRole('button', { name: 'Shuffle deck', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shuffle deck', exact: true })).toBeEnabled();
  const pair = await page.locator('.chord-pair .chord > span').allTextContents();
  expect(pair).toHaveLength(2);
  expect(ALLOWED_PAIRS).toContainEqual(pair);
  await expect(page.locator('.card-bottom')).toContainText('137');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  await expect(page.getByLabel('STRING RANGE', { exact: true })).toHaveValue('random');
  await page.getByRole('button', { name: /Exercise library/ }).click();
  await page.getByLabel('Search exercises').fill('');
  await expect(page.locator('.library-card')).toHaveCount(16);
  expect((await page.locator('.library-card h3').allTextContents()).sort()).toEqual(titles.sort());
  await page.reload();
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('137');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  expect(errors).toEqual([]);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
});

test('selected chords retain exercise-specific notes and empty annotations', async ({ page }) => {
  // Fix the sampled pair so the annotation checks do not depend on randomness.
  await page.route('**/api/decks', async (route) => {
    const response = await route.fetch();
    const deck = await response.json();
    for (const card of deck) {
      if (['hwht-enclosure', 'target-note-bends'].includes(card.exercise.id)) {
        card.chords = ['B°', 'F7'].map((name) =>
          card.exercise.chords.find((chord: { name: string }) => chord.name === name),
        );
        card.targetNotes = card.chords.map(
          (chord: { targetNoteOptions: { name: string }[] }) => chord.targetNoteOptions[0].name,
        );
      }
    }
    await route.fulfill({ response, json: deck });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exercise library', exact: true }).click();
  await page.getByLabel('Search exercises').fill('HWHT');
  await page.locator('.library-card').click();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['B°', 'F7']);
  await page.getByRole('button', { name: 'B° 1', exact: true }).click();
  await expect(page.locator('.chord-note')).toHaveText('Whole–Half or Half–Whole');
  await page.screenshot({
    path: `../.playwright/${test.info().project.name}-annotated-pair.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Target Note Bends', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'B° —', exact: true })).toBeVisible();
  await expect(page.locator('.chord-note')).toHaveCount(0);
});

test('target notes are independent, remain on each card, and refresh from the shuffled deck', async ({
  page,
}) => {
  await page.goto('/');
  const firstTarget = page.getByRole('combobox', { name: 'Target note for F7', exact: true });
  const secondTarget = page.getByRole('combobox', { name: 'Target note for B♭7', exact: true });
  await expect(firstTarget).toHaveValue('F');
  await expect(secondTarget).toHaveValue('B♭');
  await expect(firstTarget.locator('option')).toHaveText(['F · Root', 'A · 3', 'C · 5', 'E♭ · ♭7']);
  await firstTarget.selectOption('A');
  await secondTarget.selectOption('D');
  await expect(firstTarget).toHaveValue('A');
  await expect(secondTarget).toHaveValue('D');
  await expect(page.locator('.chord').nth(1)).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Target note for F7alt', exact: true }),
  ).toHaveValue('F');
  await expect(secondTarget).toHaveValue('B♭');
  await page.getByRole('button', { name: 'Previous card', exact: true }).click();
  await expect(firstTarget).toHaveValue('A');
  await expect(secondTarget).toHaveValue('D');
  await page.getByLabel('TEMPO', { exact: true }).fill('125');
  await page.getByLabel('TEMPO', { exact: true }).press('Tab');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await expect(firstTarget).toHaveValue('A');
  await expect(secondTarget).toHaveValue('D');
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('4');
  await expect(firstTarget).toHaveValue('A');
  await expect(secondTarget).toHaveValue('D');

  const [response] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith('/api/decks') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  const deck = await response.json();
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.chord-pair select').nth(i)).toHaveValue(deck[0].targetNotes[i]);
  }
  await expect(page.locator('.card-bottom')).toContainText('125');
});

test('fixed string ranges persist across the deck and reload until the deck is shuffled', async ({
  page,
}) => {
  // Existing fixed string preferences migrate without losing tempo or fret settings.
  await page.addInitScript(() => {
    if (!localStorage.getItem('guitar-practice-settings-v1')) {
      localStorage.setItem(
        'guitar-practice-settings-v1',
        JSON.stringify({ bpm: 120, fretMode: '8', stringStart: 1 }),
      );
    }
  });
  await page.goto('/');
  const strings = page.getByLabel('STRING RANGE', { exact: true });
  await expect(strings).toHaveValue('1');
  await expect(page.locator('.fretboard [data-string] text')).toHaveText([
    '6',
    '5',
    '4',
    '3',
    '2',
    '1',
  ]);
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('120');
  await expect(strings.locator('option')).toHaveText([
    'Random position',
    'Strings 1–3',
    'Strings 2–4',
    'Strings 3–5',
    'Strings 4–6',
  ]);
  for (const start of [1, 2, 3, 4]) {
    await strings.selectOption(String(start));
    await expect(
      page.getByRole('img', {
        name: `Guitar fretboard. Frets 8 through 12, strings ${start} through ${start + 2} highlighted.`,
      }),
    ).toBeVisible();
    await expect(page.locator('.fretboard [data-selected="true"]')).toHaveCount(3);
    const selected = await page
      .locator('.fretboard [data-selected="true"]')
      .evaluateAll((elements) =>
        elements.map((element) => Number(element.getAttribute('data-string'))),
      );
    expect(selected).toEqual([start + 2, start + 1, start]);
  }
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.locator('.card-bottom')).toContainText('Strings 4–6');
  await page.getByRole('button', { name: 'Exercise library', exact: true }).click();
  for (const card of await page.locator('.library-card').all()) {
    await expect(card).toContainText('Strings 4–6');
  }
  await page.getByRole('button', { name: 'Practice deck', exact: true }).click();
  await page.reload();
  await expect(strings).toHaveValue('4');
  await expect(page.locator('.card-bottom')).toContainText('Strings 4–6');
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith('/api/decks') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  expect(response.request().postDataJSON().stringStart).toBeNull();
  expect(response.request().postDataJSON().fretStart).toBeNull();
  for (const card of await response.json()) {
    expect(card.stringStart).toBeGreaterThanOrEqual(1);
    expect(card.stringStart).toBeLessThanOrEqual(4);
    expect(card.stringEnd).toBe(card.stringStart + 2);
  }
  await expect(strings).toBeEnabled();
  await expect(strings).toHaveValue('random');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  await page.reload();
  await expect(strings).toHaveValue('random');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  await page.screenshot({
    path: `../.playwright/${test.info().project.name}-string-range.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});

test('shuffle always randomizes fret and string positions, including fixed selections', async ({
  page,
}) => {
  await page.goto('/');
  const strings = page.getByLabel('STRING RANGE', { exact: true });
  await expect(strings).toHaveValue('random');
  await strings.selectOption('4');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await expect(page.locator('.card-bottom')).toContainText('Strings 4–6');
  await expect(page.locator('.fretboard [data-selected="true"]')).toHaveCount(3);

  for (let shuffle = 0; shuffle < 2; shuffle++) {
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/decks') && response.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
    ]);
    expect(response.request().postDataJSON().stringStart).toBeNull();
    expect(response.request().postDataJSON().fretStart).toBeNull();
    const deck = await response.json();
    for (const card of deck) {
      expect(card.stringStart).toBeGreaterThanOrEqual(1);
      expect(card.stringStart).toBeLessThanOrEqual(4);
      expect(card.stringEnd).toBe(card.stringStart + 2);
      expect(card.fretStart).toBeGreaterThanOrEqual(1);
      expect(card.fretStart).toBeLessThanOrEqual(8);
      expect(card.fretEnd).toBe(card.fretStart + 4);
    }
    await expect(strings).toHaveValue('random');
    await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
    await expect(
      page.getByRole('img', {
        name: `Guitar fretboard. Frets ${deck[0].fretStart} through ${deck[0].fretEnd}, strings ${deck[0].stringStart} through ${deck[0].stringEnd} highlighted.`,
      }),
    ).toBeVisible();
    await expect(page.locator('.card-position')).toContainText(
      `Strings ${deck[0].stringStart}–${deck[0].stringEnd} selected`,
    );
    await expect(page.locator('.fretboard [data-selected="true"] text')).toHaveText([
      String(deck[0].stringEnd),
      String(deck[0].stringStart + 1),
      String(deck[0].stringStart),
    ]);
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
    await expect(page.locator('.card-bottom')).toContainText(
      `Strings ${deck[1].stringStart}–${deck[1].stringEnd}`,
    );
  }
  await page.reload();
  await expect(strings).toHaveValue('random');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  await expect(page.locator('.fretboard [data-selected="true"]')).toHaveCount(3);
});

test('keeping chords shuffles only ranges across the deck and saves the preference', async ({
  page,
}) => {
  await page.goto('/');
  const keepChords = page.getByRole('checkbox', { name: 'Keep chords when shuffling' });
  await expect(keepChords).not.toBeChecked();
  const shuffle = page.getByRole('button', { name: 'Shuffle deck', exact: true });
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.shuffle === true,
    ),
    shuffle.click(),
  ]);
  const deck: Card[] = await response.json();
  await expect(shuffle).toBeEnabled();
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('4');
  await page.getByLabel('TEMPO', { exact: true }).fill('125');
  await page.getByLabel('TEMPO', { exact: true }).press('Tab');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
  }
  for (let i = 0; i < 2; i++) {
    const note = deck[3].chords[i].targetNoteOptions[1].name;
    await page.locator('.chord-pair select').nth(i).selectOption(note);
    deck[3].targetNotes[i] = note;
  }
  await keepChords.check();
  await shuffle.click();
  await expect(page.locator('.chord').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('random');
  await expect(page.getByLabel('STRING RANGE', { exact: true })).toHaveValue('random');

  // Every card keeps its shuffled pairing and targets, including edited targets on card four.
  for (let i = 0; i < deck.length; i++) {
    const expected = deck[(i + 3) % deck.length];
    await expect(
      page.getByRole('heading', { name: expected.exercise.title, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.chord-pair .chord > span')).toHaveText(
      expected.chords.map((chord) => chord.name),
    );
    for (let chord = 0; chord < 2; chord++) {
      await expect(page.locator('.chord-pair select').nth(chord)).toHaveValue(
        expected.targetNotes[chord],
      );
    }
    await expect(page.locator('.card-bottom')).toContainText('125');
    const range = await page.locator('.fretboard').getAttribute('aria-label');
    const [fretStart, fretEnd, stringStart, stringEnd] = range!.match(/\d+/g)!.map(Number);
    expect(fretStart).toBeGreaterThanOrEqual(1);
    expect(fretStart).toBeLessThan(8);
    expect(fretEnd).toBe(fretStart + 4);
    expect(stringStart).toBeGreaterThanOrEqual(1);
    expect(stringStart).toBeLessThan(4);
    expect(stringEnd).toBe(stringStart + 2);
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
  }

  const previousRange = await page.locator('.fretboard').getAttribute('aria-label');
  await shuffle.click();
  await expect(page.locator('.fretboard')).not.toHaveAttribute('aria-label', previousRange!);
  await expect(
    page.getByRole('heading', { name: deck[3].exercise.title, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(keepChords).toBeChecked();
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('125');
  await keepChords.uncheck();
  const [freshResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith('/api/decks') && response.request().method() === 'POST',
    ),
    shuffle.click(),
  ]);
  expect(freshResponse.request().postDataJSON().shuffle).toBe(true);
  const freshDeck: Card[] = await freshResponse.json();
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(
    freshDeck[0].chords.map((chord) => chord.name),
  );
  await page.reload();
  await expect(keepChords).not.toBeChecked();
});

test('song selection controls chords through shuffle, chord locking, and reload', async ({
  page,
}) => {
  await page.goto('/');
  const song = page.getByRole('combobox', { name: 'SONG', exact: true });
  await expect(song).toHaveValue('billies-bounce');
  await expect(song.locator('option')).toHaveText([
    "Billie's Bounce",
    'Hornful Soul',
    "Bag's Groove",
    'All Blues',
  ]);
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('4');
  await page.getByRole('checkbox', { name: 'Keep chords when shuffling' }).check();
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.songId === 'all-blues',
    ),
    song.selectOption('all-blues'),
  ]);
  const deck: Card[] = await response.json();
  expect(deck).toHaveLength(16);
  for (const card of deck) {
    expect(card.chords).toHaveLength(2);
    expect(card.chords[0].name).not.toBe(card.chords[1].name);
    for (const chord of card.chords) expect(['G7', 'C7', 'Dalt', 'D#alt']).toContain(chord.name);
    expect(card.fretStart).toBe(8);
    expect(card.stringStart).toBe(4);
  }
  await expect(song).toHaveValue('all-blues');
  await expect(page.locator('#song-chords')).toHaveText('Chords: G7 · C7 · Dalt · D#alt');
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['G7', 'C7']);
  await expect(
    page.getByRole('combobox', { name: 'Target note for G7', exact: true }).locator('option'),
  ).toHaveText(['G · Root', 'B · 3', 'D · 5', 'F · ♭7']);
  await page.getByRole('button', { name: 'Shuffle deck', exact: true }).click();
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['G7', 'C7']);
  await page.reload();
  await expect(song).toHaveValue('all-blues');
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['G7', 'C7']);
  await page.getByRole('checkbox', { name: 'Keep chords when shuffling' }).uncheck();
  const [shuffledResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.shuffle === true,
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  expect(shuffledResponse.request().postDataJSON().songId).toBe('all-blues');
  for (const card of (await shuffledResponse.json()) as Card[]) {
    for (const chord of card.chords) expect(['G7', 'C7', 'Dalt', 'D#alt']).toContain(chord.name);
  }
  for (const id of ['hornful-soul', 'bags-groove', 'billies-bounce']) {
    await song.selectOption(id);
    await expect(song).toBeEnabled();
    await expect(song).toHaveValue(id);
    await expect(page.locator('.chord-pair .chord > span')).toHaveText(['F7', 'B♭7']);
  }
});

test('deck navigation loops freely, and help and metronome work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Metronome', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Metronome', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.beat-dots .lit')).toHaveCount(1);
  await page.getByRole('button', { name: 'Metronome', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Metronome', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  for (let i = 0; i < 16; i++)
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next card', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous card', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Octaves (Up & Down Scale)', exact: true }),
  ).toBeVisible();
});
